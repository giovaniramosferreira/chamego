import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { generateCupido } from './ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors({
  origin: '*', // For local development simplicity
}));

app.use(express.json());


function getSimulatedDateSuggestions(nome1, nome2, cidade, bairro) {
  const intro = `Cupido selecionou um roteiro perfeito para vocês aproveitarem o melhor de ${cidade} (${bairro}) de forma super romântica e aconchegante! ✨`;
  
  const cafe = `☕ Café da Manhã Romântico:
Comecem o dia com leveza na região de ${bairro}. Procurem aquela cafeteria charmosa com mesinhas ao ar livre e um clima acolhedor. O plano ideal é dividir um croissant fresquinho, pedir dois cafés especiais e curtir a manhã jogando conversa fora, planejando os sonhos de vocês enquanto curtem a brisa.`;

  const almoco = `🍝 Almoço Gostoso:
Para o almoço, busquem um bistrô intimista ou restaurante caseiro charmoso em ${cidade}. Saboreiem uma massa fresca ou um prato especial de forma tranquila, aproveitando o momento para se desconectar do mundo e focar somente na companhia e risadas um do outro.`;

  const jantar = `🕯️ Jantar Romântico:
O ápice do date em ${bairro} deve ser um restaurante aconchegante com iluminação suave (à luz de velas se possível) e música ambiente agradável. Peçam um bom prato, brindem ao amor de ${nome1} e ${nome2} e desfrutem de conversas profundas que fazem o tempo parar.`;

  return `${intro}\n\n${cafe}\n\n${almoco}\n\n${jantar}`;
}

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


// Endpoint to generate romantic date suggestions by region (City & Neighborhood) using Claude or local simulator
app.post('/api/dates/suggest', async (req, res) => {
  try {
    const { titulo, cidade, bairro } = req.body;
    if (!cidade || !bairro) {
      return res.status(400).json({ error: 'Missing city or neighborhood' });
    }
    
    let nome1 = 'Parceiro 1';
    let nome2 = 'Parceiro 2';
    if (titulo) {
      const parts = titulo.split(/\s+(?:&|e)\s+/i);
      if (parts.length >= 2) {
        nome1 = parts[0].trim();
        nome2 = parts[1].trim();
      } else {
        nome1 = titulo;
      }
    }
    
    let sugestaoDates = '';
    
    // Call Anthropic Claude API if key is present
    if (process.env.ANTHROPIC_API_KEY) {
      console.log('ANTHROPIC_API_KEY found, requesting regional date ideas from Claude...');
      try {
        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [
              {
                role: 'user',
                content: `Você é um cupido e consultor de encontros românticos especialista na região indicada. Sugira um roteiro de date romântico incrível e aconchegante para o casal "${nome1}" e "${nome2}" em:
Cidade: "${cidade}"
Bairro/Região: "${bairro}"

O roteiro DEVE conter sugestões reais (ou extremamente realistas, charmosas e locais) de lugares ou atividades para:
1. Bom café da manhã (Café da Manhã)
2. Almoço gostoso (Almoço)
3. Jantar romântico (Jantar)

Instruções de Estilo:
- Responda em português do Brasil.
- Adote um tom romântico, caloroso, lúdico e sofisticado (um texto bem gostosinho de ler).
- Descreva a atmosfera/clima sugerido de cada lugar de maneira poética e envolvente.
- Formate de maneira clara usando subtítulos ou marcadores simples para cada uma das 3 sugestões (Café da Manhã, Almoço, Jantar).
- Use emojis apropriados (☕, 🥐, 🍝, 🍷, 🕯️, ❤️).
- Escreva de 3 a 4 parágrafos curtos no total.`
              }
            ]
          })
        });
        
        if (claudeRes.ok) {
          const claudeData = await claudeRes.json();
          sugestaoDates = claudeData.content[0].text || '';
          console.log(`Claude Date Suggestions Result: "${sugestaoDates.substring(0, 50)}..."`);
        } else {
          const errText = await claudeRes.text();
          console.error('Claude API date suggestion error:', errText);
        }
      } catch (err) {
        console.error('Claude API call for dates failed:', err);
      }
    }
    
    if (!sugestaoDates) {
      console.log('Using simulated date suggestions fallback...');
      sugestaoDates = getSimulatedDateSuggestions(nome1, nome2, cidade, bairro);
    }
    
    res.json({ sugestaoDates });
  } catch (error) {
    console.error('Date suggestions endpoint error:', error);
    res.status(500).json({ error: 'Failed to generate date suggestions' });
  }
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
