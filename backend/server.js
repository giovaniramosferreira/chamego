import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { generateCupido, generateDatePitch } from './ai.js';
import { buildRoteiro, autocomplete, photoStream } from './places.js';

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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
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

// Endpoint to fetch page by slug
app.get('/api/pages/:slug', (req, res) => {
  const { slug } = req.params;
  const page = db.getPageBySlug(slug);
  if (!page) {
    return res.status(404).json({ error: 'Page not found' });
  }
  res.json({ ...page.data, status: page.status });
});

// Endpoint to draft orders
app.post('/api/orders', (req, res) => {
  const { slug, data, email, status } = req.body;
  if (!slug || !data) {
    return res.status(400).json({ error: 'Missing slug or data' });
  }

  // Build the page data payload (stored in SQLite data column)
  const pageData = {
    titulo: data.titulo || '',
    dataInicio: data.dataInicio || '',
    mensagem: data.mensagem || '',
    musicaTitulo: data.musicaTitulo || '',
    musicaUrl: data.musicaUrl || '',
    fotos: data.fotos || [],
    emojis: data.emojis || ['❤️'],
    animacao: data.animacao || 'emoji',
    template: data.template || 'classic',
    conquistas: data.conquistas || [],
    palavraSecreta: data.palavraSecreta || '',
    palavraSecretaDica: data.palavraSecretaDica || '',
    opcoesRoleta: data.opcoesRoleta || [],
    audioUrl: data.audioUrl || '',
    cupidoComentario: data.cupidoComentario || '',
    dataNasc1: data.dataNasc1 || '',
    dataNasc2: data.dataNasc2 || '',
    signo1: data.signo1 || null,
    signo2: data.signo2 || null,
    horoscopoTexto: data.horoscopoTexto || '',
    cidade: data.cidade || '',
    bairro: data.bairro || '',
    sugestaoDates: data.sugestaoDates || ''
  };

  try {
    const saved = db.savePage({ slug, email: email || '', status: status || 'draft', data: pageData });
    res.json({ success: true, page: saved });
  // eslint-disable-next-line no-unused-vars
  } catch (_err) {
    res.status(500).json({ error: 'Database save failed' });
  }
});


// Google Places — autocomplete
app.get('/api/places/autocomplete', async (req, res) => {
  res.json({ suggestions: await autocomplete(String(req.query.q || '')) });
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


// Em produção o Express serve o build do Vite (SPA) — mesmo origin do /api
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api|uploads).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Uploads folder: ${uploadsDir}`);
});
