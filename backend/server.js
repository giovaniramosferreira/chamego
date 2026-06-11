import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { generateCupido, generateDatePitch, generatePageContent } from './ai.js';
import { buildRoteiro, autocomplete, photoStream } from './places.js';
import { createPixPayment, getPayment, getPricing, PRICE } from './payments.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors({
  origin: '*', // For local development simplicity
}));

app.use(express.json());


// Ensure uploads folder exists
const uploadsDir = path.join(process.env.DATA_DIR || __dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded images statically
app.use('/uploads', express.static(uploadsDir));

// Configure Multer for local disk storage (Photos)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'photo-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB — fotos de iPhone passam de 10MB
});

// Configure Multer for local disk storage (Audio)
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, 'audio-' + uniqueSuffix + ext);
  }
});

const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Test endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Preço e desconto vigentes (DISCOUNT_PERCENT no servidor)
app.get('/api/config', (req, res) => {
  res.json(getPricing());
});

// Endpoint to fetch page by slug (published only)
app.get('/api/pages/:slug', (req, res) => {
  const page = db.getPageBySlug(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Página não encontrada' });
  if (page.status !== 'published') return res.status(403).json({ status: 'draft', error: 'Página aguardando pagamento' });
  const exp = page.data?.dataExpiracao;
  if (exp && new Date(`${exp}T23:59:59`) < new Date()) {
    return res.status(410).json({ expired: true, error: 'Este presente se autodestruiu' });
  }
  res.json({ ...page.data, status: page.status });
});

// Endpoint to create a draft with AI-generated content
app.post('/api/drafts', async (req, res) => {
  try {
    const { data, email } = req.body;
    if (!data?.titulo || !data?.dataInicio) return res.status(400).json({ error: 'Faltam título ou data de início' });
    const existing = data.slug ? db.getPageBySlug(data.slug) : null;
    const slug = existing && existing.status === 'draft' ? data.slug : db.uniqueSlug(data.titulo);
    const ai = await generatePageContent(data);
    const page = db.savePage({ slug, email: email || '', status: 'draft', data: { ...data, ...ai, slug } });
    res.json({ slug, page });
  } catch (e) {
    console.error('draft error', e);
    res.status(500).json({ error: 'Erro ao salvar rascunho' });
  }
});


// Google Places — autocomplete
app.get('/api/places/autocomplete', async (req, res) => {
  try {
    res.json({ suggestions: await autocomplete(String(req.query.q || '')) });
  } catch (e) {
    console.error('autocomplete error', e);
    res.status(502).json({ suggestions: [] });
  }
});

// Google Places — roteiro dia/noite com frases românticas
app.post('/api/places/roteiro', async (req, res) => {
  try {
    const { cidade, bairro } = req.body;
    if (!cidade || !bairro) return res.status(400).json({ error: 'Informe cidade e bairro' });
    const roteiro = await buildRoteiro({ cidade, bairro });
    for (const sec of ['dia', 'noite']) {
      await Promise.all(roteiro[sec].map(async c => { c.frase = await generateDatePitch(c); }));
    }
    res.json(roteiro);
  } catch (e) {
    console.error('roteiro error', e);
    res.status(502).json({ error: 'Falha ao buscar lugares' });
  }
});

// Google Places — proxy de fotos (evita expor API key no browser)
app.get('/api/places/photo', async (req, res) => {
  try {
    const name = String(req.query.name || '');
    if (!/^places\/[^/]+\/photos\/[^/]+$/.test(name)) return res.status(400).end();
    const upstream = await photoStream(name);
    if (!upstream.ok) return res.status(404).end();
    res.set('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch { res.status(502).end(); }
});

// Endpoint to upload multiple files and return their URLs
app.post('/api/uploads/page-photo', upload.array('photos', 8), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const fileUrls = req.files.map(file => `/uploads/${file.filename}`);
    res.json({ urls: fileUrls });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Endpoint to upload a single audio file and return its URL + transcription + Cupid commentary
app.post('/api/uploads/page-audio', uploadAudio.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }
    
    const titulo = req.body.titulo || '';
    const mensagem = req.body.mensagem || '';
    const audioPath = req.file.path;
    const fileUrl = `/uploads/${req.file.filename}`;
    
    console.log(`Backend Audio Upload Received: "${req.file.filename}"`);
    console.log(`Couple data: Title="${titulo}"`);
    
    let transcription = '';
    
    // 1. Transcription step (OpenAI Whisper)
    if (process.env.OPENAI_API_KEY) {
      console.log('OPENAI_API_KEY found, transcribing via OpenAI Whisper API...');
      try {
        const fileBuffer = fs.readFileSync(audioPath);
        const fileBlob = new Blob([fileBuffer], { type: req.file.mimetype });
        
        const whisperFormData = new FormData();
        whisperFormData.append('file', fileBlob, req.file.originalname || 'audio.webm');
        whisperFormData.append('model', 'whisper-1');
        
        const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: whisperFormData
        });
        
        if (whisperRes.ok) {
          const whisperData = await whisperRes.json();
          transcription = whisperData.text || '';
          console.log(`OpenAI Whisper Transcription: "${transcription}"`);
        } else {
          const errMsg = await whisperRes.text();
          console.error(`Whisper API error status ${whisperRes.status}: ${errMsg}`);
        }
      } catch (err) {
        console.error('Whisper API call failed:', err);
      }
    }
    
    if (!transcription) {
      console.log('No transcription key/result. Generating simulated transcription...');
      transcription = `Oi! Aqui é o casal ${titulo || 'de namorados'}. Gravamos este áudio especial para contar um pouco da nossa história. Passar esse tempo juntos tem sido maravilhoso, cheio de carinho, cumplicidade e aventuras fofas. Queremos muito que a nossa caminhada continue cheia de alegrias e que o nosso amor cresça cada dia mais e mais para sempre!`;
    }
    
    // 2. Cupido commentary via ai.js module
    const cupidoComentario = await generateCupido({ transcription, titulo, mensagem });
    
    res.json({ 
      url: fileUrl, 
      transcription, 
      cupidoComentario 
    });
  } catch (error) {
    console.error('Audio upload error:', error);
    res.status(500).json({ error: 'Failed to upload and process audio file' });
  }
});


// Pagamento Pix — cria cobrança no Mercado Pago
app.post('/api/payments', async (req, res) => {
  try {
    const { slug, email } = req.body;
    const page = db.getPageBySlug(slug);
    if (!page) return res.status(404).json({ error: 'Rascunho não encontrado' });
    if (page.status === 'published') return res.json({ alreadyPublished: true });
    const p = await createPixPayment({ slug, email });
    db.savePayment({ id: p.id, slug, status: p.status, amount: getPricing().precoFinal });
    const tx = p.point_of_interaction?.transaction_data || {};
    res.json({ paymentId: String(p.id), qrCode: tx.qr_code, qrCodeBase64: tx.qr_code_base64 });
  } catch (e) { console.error(e); res.status(502).json({ error: 'Falha ao criar pagamento Pix' }); }
});

// Pagamento Pix — consulta status de um pagamento
app.get('/api/payments/:id/status', async (req, res) => {
  const local = db.getPayment(req.params.id);
  if (!local) return res.status(404).json({ error: 'Pagamento não encontrado' });
  if (local.status !== 'approved') {
    try {
      const p = await getPayment(req.params.id);
      db.savePayment({ id: p.id, slug: local.slug, status: p.status, amount: local.amount });
      if (p.status === 'approved') db.publishPage(local.slug);
      return res.json({ status: p.status, slug: local.slug });
    } catch { /* devolve estado local abaixo */ }
  }
  res.json({ status: db.getPayment(req.params.id).status, slug: local.slug });
});

// Webhook Mercado Pago — publica página quando pagamento for aprovado
app.post('/api/webhooks/mercadopago', async (req, res) => {
  try {
    const id = req.body?.data?.id || req.query['data.id'];
    if ((req.body?.type === 'payment' || req.query.type === 'payment') && id) {
      const p = await getPayment(id);
      if (p.external_reference) {
        db.savePayment({ id: p.id, slug: p.external_reference, status: p.status, amount: p.transaction_amount ?? PRICE });
        if (p.status === 'approved') db.publishPage(p.external_reference);
      }
    }
    res.sendStatus(200); // sempre 200 — MP reenvia em caso de erro
  } catch (e) { console.error('webhook', e); res.sendStatus(200); }
});

// Busca de músicas (iTunes Search) — proxy server-side: o navegador sofre
// CORS/rate-limit ao chamar a Apple direto, o servidor não.
app.get('/api/music/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ results: [] });
    const upstream = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=6&country=BR`);
    if (!upstream.ok) return res.status(502).json({ results: [], error: 'Busca indisponível agora' });
    const data = await upstream.json();
    const results = (data.results || []).map(s => ({
      trackId: s.trackId,
      trackName: s.trackName,
      artistName: s.artistName,
      artworkUrl60: s.artworkUrl60,
      previewUrl: s.previewUrl,
    })).filter(s => s.previewUrl);
    res.json({ results });
  } catch (e) {
    console.error('music search error', e);
    res.status(502).json({ results: [], error: 'Busca indisponível agora' });
  }
});

// Cupom promocional — publica sem pagamento. Ativo apenas enquanto a env
// COUPON_CODE existir; para desativar, basta remover a variável no Render.
app.post('/api/coupons/redeem', (req, res) => {
  const { slug, code } = req.body;
  const valid = process.env.COUPON_CODE
    && typeof code === 'string'
    && code.trim().toLowerCase() === process.env.COUPON_CODE.toLowerCase();
  if (!valid) return res.status(400).json({ error: 'Cupom inválido' });
  const page = db.getPageBySlug(slug);
  if (!page) return res.status(404).json({ error: 'Rascunho não encontrado' });
  if (page.status !== 'published') {
    db.savePayment({ id: `coupon-${slug}`, slug, status: 'approved', amount: 0 });
    db.publishPage(slug);
  }
  res.json({ published: true, slug });
});

// Em produção o Express serve o build do Vite (SPA) — mesmo origin do /api
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api|uploads).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

// Erros de upload (Multer) viram resposta amigável em vez de derrubar a conexão
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'Arquivo muito grande — máximo de 25MB por foto ou áudio.'
      : 'Falha no envio do arquivo. Tente novamente.';
    return res.status(400).json({ error: msg });
  }
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno' });
});

// Start server (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Uploads folder: ${uploadsDir}`);
  });
}

export { app };
