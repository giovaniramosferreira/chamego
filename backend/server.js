import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors({
  origin: '*', // For local development simplicity
}));

app.use(express.json());

// Helper to calculate Zodiac Sign from birth date
function getZodiacSign(dateString) {
  if (!dateString) return { name: '', symbol: '' };
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.getMonth() + 1; // 1-indexed
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return { name: 'Áries', symbol: '♈' };
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return { name: 'Touro', symbol: '♉' };
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return { name: 'Gêmeos', symbol: '♊' };
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return { name: 'Câncer', symbol: '♋' };
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return { name: 'Leão', symbol: '♌' };
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return { name: 'Virgem', symbol: '♍' };
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return { name: 'Libra', symbol: '♎' };
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return { name: 'Escorpião', symbol: '♏' };
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return { name: 'Sagitário', symbol: '♐' };
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return { name: 'Capricórnio', symbol: '♑' };
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return { name: 'Aquário', symbol: '♒' };
  return { name: 'Peixes', symbol: '♓' };
}

// Local simulated romantic horoscope compatibilities generator
function getSimulatedHoroscope(nome1, signo1, nome2, signo2) {
  const intros = [
    `A sinastria de ${nome1} (${signo1.symbol}) e ${nome2} (${signo2.symbol}) revela um alinhamento estelar de rara sintonia. A energia de ${signo1.name} traz calor e ação, enquanto a sensibilidade de ${signo2.name} oferece profundidade e aconchego. Juntos, vocês criam um ecossistema afetivo equilibrado, onde o diálogo flui naturalmente e os abraços funcionam como um recarregador de almas.`,
    `O mapa astral de vocês mostra que o encontro entre ${nome1} (regido pelo signo de ${signo1.name}) e ${nome2} (regido por ${signo2.name}) acendeu uma constelação inteira de cumplicidade. Vocês possuem ritmos que se complementam perfeitamente; a determinação de um serve de base para os sonhos do outro, formando uma parceria inabalável no dia a dia.`
  ];
  
  const pontosFortes = [
    `Os pontos fortes desse amor residem no companheirismo e na capacidade única de transformar pequenos momentos em memórias inesquecíveis. Vocês dividem o peso da vida com leveza e multiplicam a alegria com risos fáceis. Há uma sintonia tão fina que vocês se entendem sem precisar de palavras.`,
    `Destacam-se a empatia mútua e o apoio inabalável em cada projeto pessoal. Existe uma admiração protetora que envolve o relacionamento de vocês, fortalecendo a união e blindando o casal contra as intempéries do mundo exterior.`
  ];
  
  const conselhos = [
    `Conselho dos astros: Continuem cultivando a paciência e a admiração diária. O universo conspira a favor desse amor brilhante; continuem caminhando de mãos dadas sob a luz das estrelas. ✨🌌`,
    `Bênção estelar: Lembrem-se sempre de celebrar a sorte do reencontro de vocês nesta jornada. Que a luz cósmica que os une hoje continue guiando seus passos por todos os ciclos que virão. 🔮🌙`
  ];
  
  const selectedIntro = intros[Math.floor(Math.random() * intros.length)];
  const selectedPonto = pontosFortes[Math.floor(Math.random() * pontosFortes.length)];
  const selectedConselho = conselhos[Math.floor(Math.random() * conselhos.length)];
  
  return `${selectedIntro}\n\n${selectedPonto}\n\n${selectedConselho}`;
}

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

// Endpoint to generate horoscope compatibility using Claude or local simulator
app.post('/api/horoscope/generate', async (req, res) => {
  try {
    const { titulo, dataInicio, dataNasc1, dataNasc2 } = req.body;
    if (!dataNasc1 || !dataNasc2) {
      return res.status(400).json({ error: 'Missing birth dates' });
    }
    
    const signo1 = getZodiacSign(dataNasc1);
    const signo2 = getZodiacSign(dataNasc2);
    
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
    
    let horoscopoTexto = '';
    
    // Call Anthropic Claude API if key is present
    if (process.env.ANTHROPIC_API_KEY) {
      console.log('ANTHROPIC_API_KEY found, requesting celestial sinastry from Claude...');
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
                content: `Você é um astrólogo celestial romântico. Escreva uma análise de sinastria cósmica de casal que seja um texto super gostosinho de ler, poético, afetuoso e romântico.
                
Nomes dos dois: "${nome1}" e "${nome2}"
Data de início: "${dataInicio}"
Dados de astrologia:
- ${nome1}: Signo de ${signo1.name} ${signo1.symbol} (data de nascimento: ${dataNasc1})
- ${nome2}: Signo de ${signo2.name} ${signo2.symbol} (data de nascimento: ${dataNasc2})

Instruções importantes:
1. Responda em português do Brasil.
2. Escreva de 3 a 4 parágrafos curtos e poéticos.
3. Descreva a compatibilidade cósmica entre os signos de ${signo1.name} e ${signo2.name}.
4. Destaque explicitamente pelo menos 2 pontos fortes da relação (como cumplicidade, bom humor, apoio recíproco ou comunicação profunda).
5. Termine com um conselho carinhoso dos astros para o casal.`
              }
            ]
          })
        });
        
        if (claudeRes.ok) {
          const claudeData = await claudeRes.json();
          horoscopoTexto = claudeData.content[0].text || '';
          console.log(`Claude Horoscope Result: "${horoscopoTexto.substring(0, 50)}..."`);
        } else {
          const errText = await claudeRes.text();
          console.error('Claude API horoscope generation error:', errText);
        }
      } catch (err) {
        console.error('Claude API call failed:', err);
      }
    }
    
    if (!horoscopoTexto) {
      console.log('Using simulated horoscope compatibility fallback...');
      horoscopoTexto = getSimulatedHoroscope(nome1, signo1, nome2, signo2);
    }
    
    res.json({
      signo1,
      signo2,
      horoscopoTexto
    });
  } catch (error) {
    console.error('Horoscope generation endpoint error:', error);
    res.status(500).json({ error: 'Failed to generate horoscope compatibility' });
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
    
    let cupidoComentario = '';
    
    // 2. Claude API commentary generation
    if (process.env.ANTHROPIC_API_KEY) {
      console.log('ANTHROPIC_API_KEY found, sending transcription to Claude console...');
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
                content: `Você é o Cupido, um observador romântico celestial e bem-humorado. Escreva considerações poéticas, divertidas e românticas de um Cupido que olha de fora e vê que belo casal eles formam.
                
Use a transcrição do áudio gravado por um deles:
"${transcription}"

Dados do casal:
Nomes do casal: "${titulo}"
Mensagem especial cadastrada: "${mensagem}"

Instruções de estilo:
- Responda em português do Brasil.
- Adote um tom de Cupido (lúdico, caloroso, sábio e romântico).
- Seja sucinto: escreva no máximo 2 a 3 parágrafos curtos.
- Comece com uma introdução charmosa e termine com uma bênção amorosa do Cupido.`
              }
            ]
          })
        });
        
        if (claudeRes.ok) {
          const claudeData = await claudeRes.json();
          cupidoComentario = claudeData.content[0].text || '';
          console.log(`Claude Cupid Commentary: "${cupidoComentario}"`);
        } else {
          const errMsg = await claudeRes.text();
          console.error(`Claude API error status ${claudeRes.status}: ${errMsg}`);
        }
      } catch (err) {
        console.error('Claude API call failed:', err);
      }
    }
    
    if (!cupidoComentario) {
      console.log('No Claude response. Generating simulated Cupid commentary...');
      const templates = [
        `Cupido diz: Analisando a energia vocal e a sintonia do áudio de ${titulo || 'vocês'}, fica evidente que estamos diante de um encontro de almas. Há uma cumplicidade implícita nas risadas de fundo e na cadência das palavras. Este amor tem a base sólida do respeito e a leveza de quem sabe rir dos próprios tropeços. Um casal verdadeiramente inspirador, daqueles que a gente olha de fora e abre um sorriso sem perceber! 💘`,
        `O veredito do Cupido: Ao ouvir o relato amoroso de ${titulo || 'vocês'}, o diagnóstico celestial é claro: sintonia em altíssima vibração! A forma calorosa como se referem um ao outro e o carinho perceptível na voz revelam uma intimidade profunda, daquelas construídas com muito afeto diário, paciência e paixão. É um privilégio ver duas pessoas que se complementam de forma tão harmônica. Que esse amor continue transbordando! ✨👼`,
        `Cupido em observação: A gravação de ${titulo || 'vocês'} transborda aquela química pura e genuína que não se fabrica. É um amor que vibra na simplicidade dos pequenos gestos e na segurança de saber que tem para onde voltar. A voz revela carinho, orgulho e, acima de tudo, uma amizade profunda que serve de alicerce para o romance. Que sorte a de vocês de terem se encontrado nesta vida! 💖`,
        `Sentença do Cupido: Se o amor tivesse uma melodia, ela soaria como o áudio de ${titulo || 'vocês'}. Há um compasso perfeito entre o carinho de um e o porto seguro do outro. Olhando de fora, vê-se um casal que caminha no mesmo ritmo, compartilhando sonhos e dividindo as cargas com suavidade. Que belo e raro espetáculo é testemunhar uma parceria assim! 🥂💑`
      ];
      cupidoComentario = templates[Math.floor(Math.random() * templates.length)];
    }
    
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

// =============================================
// 🤖 AI-Powered Love Letter Generator (Claude)
// =============================================
app.post('/api/ai/love-letter', async (req, res) => {
  try {
    const { titulo, nome1, nome2, dataInicio, mensagem, conquistas, horoscopoTexto, sugestaoDates, cupidoComentario } = req.body;

    if (!titulo) {
      return res.status(400).json({ error: 'Título do casal é obrigatório.' });
    }

    // Calculate time together
    const start = new Date(dataInicio);
    const now = new Date();
    const diffMs = now - start;
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);

    const conquistasText = conquistas && conquistas.length > 0
      ? conquistas.map((c, i) => `${i + 1}. ${c.titulo}: ${c.descricao}`).join('\n')
      : 'Nenhuma conquista registrada ainda';

    const prompt = `Você é um poeta romântico brasileiro extremamente talentoso. Escreva uma carta de amor profundamente emocionante e personalizada para o casal "${titulo}".

DADOS DO CASAL:
- Nomes: ${nome1 || 'Pessoa 1'} e ${nome2 || 'Pessoa 2'}
- Juntos desde: ${dataInicio} (${years} anos e ${months} meses, ${totalDays} dias)
- Mensagem pessoal que um escreveu para o outro: "${mensagem || 'Não informada'}"
- Conquistas juntos: ${conquistasText}
- Análise astrológica: ${horoscopoTexto ? horoscopoTexto.substring(0, 300) : 'Não disponível'}
- Sugestões de dates na região: ${sugestaoDates ? 'Sim, têm roteiro personalizado' : 'Não disponível'}
- Comentário do Cupido sobre o áudio do casal: ${cupidoComentario ? cupidoComentario.substring(0, 200) : 'Não disponível'}

REGRAS:
1. A carta deve ter 4-5 parágrafos, ser profundamente emotiva mas não piegas
2. Mencione detalhes específicos fornecidos (conquistas, tempo juntos, etc.)
3. Use metáforas bonitas e linguagem poética brasileira contemporânea
4. Comece com "Queridos ${nome1 || 'amor'} e ${nome2 || 'amor'}," 
5. Termine com uma assinatura criativa como "Com todo amor do universo, ✨💌"
6. Escreva APENAS a carta, sem explicações ou comentários extras
7. A carta deve ser em português brasileiro informal e carinhoso`;

    let cartaDeAmor = '';

    // Try Claude API
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (ANTHROPIC_API_KEY) {
      try {
        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1200,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (claudeRes.ok) {
          const claudeData = await claudeRes.json();
          cartaDeAmor = claudeData.content[0].text || '';
        } else {
          const errText = await claudeRes.text();
          console.error(`Claude Love Letter API error: ${claudeRes.status}: ${errText}`);
        }
      } catch (err) {
        console.error('Claude Love Letter network error:', err.message);
      }
    }

    // Fallback: generate a beautiful simulated letter
    if (!cartaDeAmor) {
      cartaDeAmor = `Queridos ${nome1 || 'amor'} e ${nome2 || 'amor'},

Existem histórias que a gente lê e se emociona. E existem histórias que a gente vive e transborda. A de vocês é do segundo tipo — daquelas que fazem o coração acelerar só de lembrar como tudo começou, há ${totalDays} dias atrás, quando o universo decidiu que era hora de juntar duas almas que já se procuravam há tempo demais.

${totalDays} dias. São ${years > 0 ? years + ' anos e ' + months + ' meses' : months + ' meses'} de manhãs divididas, de cafés compartilhados, de abraços que curam o dia ruim e de sorrisos que iluminam até as noites mais escuras. ${conquistas && conquistas.length > 0 ? 'Vocês já conquistaram tanto juntos — ' + conquistas.map(c => c.titulo).join(', ') + ' — e cada passo dado lado a lado só confirma: vocês são melhores juntos do que separados.' : 'E cada dia juntos é uma nova conquista, um novo capítulo dessa história linda.'}

${mensagem ? `Quando um de vocês escreveu "${mensagem.substring(0, 100)}...", ficou claro que esse amor não é feito de grandes declarações públicas, mas de verdades sussurradas no ouvido, de mãos dadas debaixo da mesa e de olhares que dizem "eu escolho você, de novo e de novo".` : 'O amor de vocês tem aquela rara qualidade de ser, ao mesmo tempo, um porto seguro e uma grande aventura. É a certeza de ter para onde voltar e a coragem de explorar o mundo juntos.'}

Que vocês continuem escrevendo essa história com a mesma paixão do primeiro beijo e a sabedoria de quem já atravessou tempestades e saiu de mãos dadas do outro lado. O melhor ainda está por vir — e eu tenho certeza que vocês vão viver cada segundo como se fosse o primeiro dia.

Com todo amor do universo, ✨💌`;
    }

    res.json({ cartaDeAmor });
  } catch (error) {
    console.error('Love letter generation error:', error);
    res.status(500).json({ error: 'Falha ao gerar carta de amor' });
  }
});

// =============================================
// 🤖 AI Compatibility Score (Claude)
// =============================================
app.post('/api/ai/compatibility', async (req, res) => {
  try {
    const { nome1, nome2, signo1, signo2, dataInicio, conquistas, mensagem } = req.body;

    const totalDays = Math.floor((new Date() - new Date(dataInicio)) / (1000 * 60 * 60 * 24));

    const prompt = `Você é um astrólogo e analista de relacionamentos. Analise o casal ${nome1} (${signo1?.name || 'desconhecido'}) e ${nome2} (${signo2?.name || 'desconhecido'}) e retorne APENAS um JSON válido (sem markdown, sem explicações) com a seguinte estrutura:

{
  "scoreGeral": <número de 75 a 99>,
  "scoreAmor": <número de 70 a 99>,
  "scoreCompanheirismo": <número de 75 a 99>,
  "scoreComunicacao": <número de 70 a 99>,
  "scoreAventura": <número de 65 a 99>,
  "frase": "<uma frase curta e poética sobre o casal, em português>"
}

CONTEXTO:
- Juntos há ${totalDays} dias
- ${conquistas && conquistas.length > 0 ? conquistas.length + ' conquistas registradas' : 'Início da jornada'}
- Mensagem pessoal: "${mensagem ? mensagem.substring(0, 100) : 'não informada'}"

Gere scores realistas mas otimistas que reflitam a compatibilidade astrológica entre ${signo1?.name || 'os signos'} e ${signo2?.name || 'dos dois'}. Retorne APENAS o JSON.`;

    let compatibility = null;

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (ANTHROPIC_API_KEY) {
      try {
        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 400,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (claudeRes.ok) {
          const claudeData = await claudeRes.json();
          const text = claudeData.content[0].text || '';
          try {
            compatibility = JSON.parse(text);
          // eslint-disable-next-line no-unused-vars
          } catch (_parseErr) {
            // Try extracting JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              compatibility = JSON.parse(jsonMatch[0]);
            }
          }
        }
      } catch (err) {
        console.error('Claude Compatibility error:', err.message);
      }
    }

    // Fallback: deterministic simulated scores
    if (!compatibility) {
      const seed = (nome1 || '').length + (nome2 || '').length + totalDays;
      const scoreGeral = 82 + (seed % 15);
      compatibility = {
        scoreGeral: Math.min(scoreGeral, 97),
        scoreAmor: Math.min(78 + (seed * 3 % 20), 98),
        scoreCompanheirismo: Math.min(80 + (seed * 7 % 18), 99),
        scoreComunicacao: Math.min(75 + (seed * 11 % 22), 96),
        scoreAventura: Math.min(70 + (seed * 13 % 25), 95),
        frase: `${nome1 || 'Vocês'} e ${nome2 || ''} formam uma constelação de amor rara e preciosa que brilha mais a cada dia. ✨`
      };
    }

    res.json(compatibility);
  } catch (error) {
    console.error('Compatibility generation error:', error);
    res.status(500).json({ error: 'Falha ao gerar análise de compatibilidade' });
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
