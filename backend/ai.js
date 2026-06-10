// AI module — all text generation for Chamego
// Model: claude-haiku-4-5-20251001
// Content is generated once at page-creation time.

const MODEL = 'claude-haiku-4-5-20251001';

// ─────────────────────────────────────────────
// Internal: raw Claude HTTP call
// ─────────────────────────────────────────────
async function callClaude(prompt, maxTokens = 1024) {
  if (!process.env.ANTHROPIC_API_KEY) return '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error('Claude error', res.status, await res.text());
      return '';
    }
    const data = await res.json();
    return data.content?.[0]?.text || '';
  } catch (e) {
    console.error('Claude network', e.message);
    return '';
  }
}

// ─────────────────────────────────────────────
// Helpers moved from server.js
// ─────────────────────────────────────────────
export function getZodiacSign(dateString) {
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

export function getSimulatedHoroscope(nome1, signo1, nome2, signo2) {
  const intros = [
    `A sinastria de ${nome1} (${signo1.symbol}) e ${nome2} (${signo2.symbol}) revela um alinhamento estelar de rara sintonia. A energia de ${signo1.name} traz calor e ação, enquanto a sensibilidade de ${signo2.name} oferece profundidade e aconchego. Juntos, vocês criam um ecossistema afetivo equilibrado, onde o diálogo flui naturalmente e os abraços funcionam como um recarregador de almas.`,
    `O mapa astral de vocês mostra que o encontro entre ${nome1} (regido pelo signo de ${signo1.name}) e ${nome2} (regido por ${signo2.name}) acendeu uma constelação inteira de cumplicidade. Vocês possuem ritmos que se complementam perfeitamente; a determinação de um serve de base para os sonhos do outro, formando uma parceria inabalável no dia a dia.`,
  ];

  const pontosFortes = [
    `Os pontos fortes desse amor residem no companheirismo e na capacidade única de transformar pequenos momentos em memórias inesquecíveis. Vocês dividem o peso da vida com leveza e multiplicam a alegria com risos fáceis. Há uma sintonia tão fina que vocês se entendem sem precisar de palavras.`,
    `Destacam-se a empatia mútua e o apoio inabalável em cada projeto pessoal. Existe uma admiração protetora que envolve o relacionamento de vocês, fortalecendo a união e blindando o casal contra as intempéries do mundo exterior.`,
  ];

  const conselhos = [
    `Conselho dos astros: Continuem cultivando a paciência e a admiração diária. O universo conspira a favor desse amor brilhante; continuem caminhando de mãos dadas sob a luz das estrelas. ✨🌌`,
    `Bênção estelar: Lembrem-se sempre de celebrar a sorte do reencontro de vocês nesta jornada. Que a luz cósmica que os une hoje continue guiando seus passos por todos os ciclos que virão. 🔮🌙`,
  ];

  const selectedIntro = intros[Math.floor(Math.random() * intros.length)];
  const selectedPonto = pontosFortes[Math.floor(Math.random() * pontosFortes.length)];
  const selectedConselho = conselhos[Math.floor(Math.random() * conselhos.length)];

  return `${selectedIntro}\n\n${selectedPonto}\n\n${selectedConselho}`;
}

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────
export function splitNames(titulo) {
  if (!titulo) return ['Parceiro 1', 'Parceiro 2'];
  const parts = titulo.split(/\s+(?:&|e)\s+/i);
  return parts.length >= 2 ? [parts[0].trim(), parts[1].trim()] : [titulo, 'Parceiro 2'];
}

// ─────────────────────────────────────────────
// Prompt builders (verbatim from server.js)
// ─────────────────────────────────────────────
function promptSinastria({ nome1, nome2, signo1, signo2, dataInicio }) {
  return `Você é um astrólogo celestial romântico. Escreva uma análise de sinastria cósmica de casal que seja um texto super gostosinho de ler, poético, afetuoso e romântico.

Nomes dos dois: "${nome1}" e "${nome2}"
Data de início: "${dataInicio}"
Dados de astrologia:
- ${nome1}: Signo de ${signo1.name} ${signo1.symbol} (data de nascimento correspondente)
- ${nome2}: Signo de ${signo2.name} ${signo2.symbol} (data de nascimento correspondente)

Instruções importantes:
1. Responda em português do Brasil.
2. Escreva de 3 a 4 parágrafos curtos e poéticos.
3. Descreva a compatibilidade cósmica entre os signos de ${signo1.name} e ${signo2.name}.
4. Destaque explicitamente pelo menos 2 pontos fortes da relação (como cumplicidade, bom humor, apoio recíproco ou comunicação profunda).
5. Termine com um conselho carinhoso dos astros para o casal.`;
}

function promptCarta({ titulo, nome1, nome2, dataInicio, mensagem, conquistas }) {
  const start = new Date(dataInicio);
  const now = new Date();
  const diffMs = now - start;
  const totalDays = isNaN(diffMs) || diffMs < 0 ? 0 : Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);

  const conquistasText = conquistas && conquistas.length > 0
    ? conquistas.map((c, i) => `${i + 1}. ${c.titulo}: ${c.descricao}`).join('\n')
    : 'Nenhuma conquista registrada ainda';

  return `Você é um poeta romântico brasileiro extremamente talentoso. Escreva uma carta de amor profundamente emocionante e personalizada para o casal "${titulo}".

DADOS DO CASAL:
- Nomes: ${nome1 || 'Pessoa 1'} e ${nome2 || 'Pessoa 2'}
- Juntos desde: ${dataInicio} (${years} anos e ${months} meses, ${totalDays} dias)
- Mensagem pessoal que um escreveu para o outro: "${mensagem || 'Não informada'}"
- Conquistas juntos: ${conquistasText}

REGRAS:
1. A carta deve ter 4-5 parágrafos, ser profundamente emotiva mas não piegas
2. Mencione detalhes específicos fornecidos (conquistas, tempo juntos, etc.)
3. Use metáforas bonitas e linguagem poética brasileira contemporânea
4. Comece com "Queridos ${nome1 || 'amor'} e ${nome2 || 'amor'},"
5. Termine com uma assinatura criativa como "Com todo amor do universo, ✨💌"
6. Escreva APENAS a carta, sem explicações ou comentários extras
7. A carta deve ser em português brasileiro informal e carinhoso`;
}

function promptScore({ nome1, nome2, signo1, signo2, dataInicio, conquistas, mensagem }) {
  const diffMs = new Date() - new Date(dataInicio);
  const totalDays = isNaN(diffMs) || diffMs < 0 ? 0 : Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return `Você é um astrólogo e analista de relacionamentos. Analise o casal ${nome1} (${signo1?.name || 'desconhecido'}) e ${nome2} (${signo2?.name || 'desconhecido'}) e retorne APENAS um JSON válido (sem markdown, sem explicações) com a seguinte estrutura:

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
}

// ─────────────────────────────────────────────
// Fallbacks
// ─────────────────────────────────────────────
function fallbackCarta({ nome1, nome2, dataInicio, mensagem, conquistas }) {
  const start = new Date(dataInicio);
  const now = new Date();
  const diffMs = now - start;
  const totalDays = isNaN(diffMs) || diffMs < 0 ? 0 : Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);

  return `Queridos ${nome1 || 'amor'} e ${nome2 || 'amor'},

Existem histórias que a gente lê e se emociona. E existem histórias que a gente vive e transborda. A de vocês é do segundo tipo — daquelas que fazem o coração acelerar só de lembrar como tudo começou, há ${totalDays} dias atrás, quando o universo decidiu que era hora de juntar duas almas que já se procuravam há tempo demais.

${totalDays} dias. São ${years > 0 ? years + ' anos e ' + months + ' meses' : months + ' meses'} de manhãs divididas, de cafés compartilhados, de abraços que curam o dia ruim e de sorrisos que iluminam até as noites mais escuras. ${conquistas && conquistas.length > 0 ? 'Vocês já conquistaram tanto juntos — ' + conquistas.map(c => c.titulo).join(', ') + ' — e cada passo dado lado a lado só confirma: vocês são melhores juntos do que separados.' : 'E cada dia juntos é uma nova conquista, um novo capítulo dessa história linda.'}

${mensagem ? `Quando um de vocês escreveu "${mensagem.substring(0, 100)}...", ficou claro que esse amor não é feito de grandes declarações públicas, mas de verdades sussurradas no ouvido, de mãos dadas debaixo da mesa e de olhares que dizem "eu escolho você, de novo e de novo".` : 'O amor de vocês tem aquela rara qualidade de ser, ao mesmo tempo, um porto seguro e uma grande aventura. É a certeza de ter para onde voltar e a coragem de explorar o mundo juntos.'}

Que vocês continuem escrevendo essa história com a mesma paixão do primeiro beijo e a sabedoria de quem já atravessou tempestades e saiu de mãos dadas do outro lado. O melhor ainda está por vir — e eu tenho certeza que vocês vão viver cada segundo como se fosse o primeiro dia.

Com todo amor do universo, ✨💌`;
}

function fallbackScore({ nome1, nome2, dataInicio }) {
  const diffMs = new Date() - new Date(dataInicio);
  const totalDays = isNaN(diffMs) || diffMs < 0 ? 0 : Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const seed = (nome1 || '').length + (nome2 || '').length + totalDays;
  const scoreGeral = 82 + (seed % 15);
  return {
    scoreGeral: Math.min(scoreGeral, 97),
    scoreAmor: Math.min(78 + (seed * 3 % 20), 98),
    scoreCompanheirismo: Math.min(80 + (seed * 7 % 18), 99),
    scoreComunicacao: Math.min(75 + (seed * 11 % 22), 96),
    scoreAventura: Math.min(70 + (seed * 13 % 25), 95),
    frase: `${nome1 || 'Vocês'} e ${nome2 || ''} formam uma constelação de amor rara e preciosa que brilha mais a cada dia. ✨`,
  };
}

function parseScore(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  // eslint-disable-next-line no-unused-vars
  } catch (_e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      // eslint-disable-next-line no-unused-vars
      } catch (_e2) {
        return null;
      }
    }
    return null;
  }
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Generate all AI-powered content for a page in a single call.
 * Called once at page-creation time.
 */
export async function generatePageContent(input) {
  const { titulo, dataInicio, dataNasc1, dataNasc2, mensagem, conquistas } = input;
  const [nome1, nome2] = splitNames(titulo);
  const signo1 = dataNasc1 ? getZodiacSign(dataNasc1) : null;
  const signo2 = dataNasc2 ? getZodiacSign(dataNasc2) : null;

  const [horoscopo, carta, scoreJson] = await Promise.all([
    signo1 && signo2 ? callClaude(promptSinastria({ nome1, nome2, signo1, signo2, dataInicio })) : Promise.resolve(''),
    callClaude(promptCarta({ titulo, nome1, nome2, dataInicio, mensagem, conquistas }), 1200),
    callClaude(promptScore({ nome1, nome2, signo1, signo2, dataInicio, conquistas, mensagem }), 400),
  ]);

  return {
    signo1,
    signo2,
    horoscopoTexto: signo1 && signo2
      ? (horoscopo || getSimulatedHoroscope(nome1, signo1, nome2, signo2))
      : '',
    cartaDeAmor: carta || fallbackCarta({ nome1, nome2, dataInicio, mensagem, conquistas }),
    compatibilidade: parseScore(scoreJson) || fallbackScore({ nome1, nome2, dataInicio }),
  };
}

/**
 * Generate Cupido commentary from audio transcription.
 */
export async function generateCupido({ transcription, titulo, mensagem }) {
  const prompt = `Você é o Cupido, um observador romântico celestial e bem-humorado. Escreva considerações poéticas, divertidas e românticas de um Cupido que olha de fora e vê que belo casal eles formam.

Use a transcrição do áudio gravado por um deles:
"${transcription}"

Dados do casal:
Nomes do casal: "${titulo}"
Mensagem especial cadastrada: "${mensagem}"

Instruções de estilo:
- Responda em português do Brasil.
- Adote um tom de Cupido (lúdico, caloroso, sábio e romântico).
- Seja sucinto: escreva no máximo 2 a 3 parágrafos curtos.
- Comece com uma introdução charmosa e termine com uma bênção amorosa do Cupido.`;

  const result = await callClaude(prompt);
  if (result) return result;

  // Fallback: 4 templates (random pick)
  const templates = [
    `Cupido diz: Analisando a energia vocal e a sintonia do áudio de ${titulo || 'vocês'}, fica evidente que estamos diante de um encontro de almas. Há uma cumplicidade implícita nas risadas de fundo e na cadência das palavras. Este amor tem a base sólida do respeito e a leveza de quem sabe rir dos próprios tropeços. Um casal verdadeiramente inspirador, daqueles que a gente olha de fora e abre um sorriso sem perceber! 💘`,
    `O veredito do Cupido: Ao ouvir o relato amoroso de ${titulo || 'vocês'}, o diagnóstico celestial é claro: sintonia em altíssima vibração! A forma calorosa como se referem um ao outro e o carinho perceptível na voz revelam uma intimidade profunda, daquelas construídas com muito afeto diário, paciência e paixão. É um privilégio ver duas pessoas que se complementam de forma tão harmônica. Que esse amor continue transbordando! ✨👼`,
    `Cupido em observação: A gravação de ${titulo || 'vocês'} transborda aquela química pura e genuína que não se fabrica. É um amor que vibra na simplicidade dos pequenos gestos e na segurança de saber que tem para onde voltar. A voz revela carinho, orgulho e, acima de tudo, uma amizade profunda que serve de alicerce para o romance. Que sorte a de vocês de terem se encontrado nesta vida! 💖`,
    `Sentença do Cupido: Se o amor tivesse uma melodia, ela soaria como o áudio de ${titulo || 'vocês'}. Há um compasso perfeito entre o carinho de um e o porto seguro do outro. Olhando de fora, vê-se um casal que caminha no mesmo ritmo, compartilhando sonhos e dividindo as cargas com suavidade. Que belo e raro espetáculo é testemunhar uma parceria assim! 🥂💑`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate a short romantic pitch for a date-spot card.
 * place: { nome: string, categoria: string }
 */
export async function generateDatePitch(place) {
  const prompt = `Escreva UMA frase romântica curta (máx 20 palavras, português do Brasil) convidando um casal para ${place.categoria} em "${place.nome}". Responda só a frase.`;

  const result = await callClaude(prompt, 100);
  if (result) return result.trim();

  // Fallback map by categoria
  const fallbacks = {
    'Café da manhã': 'Comecem o dia juntinhos com um café especial.',
    'Passeio': 'Um passeio de mãos dadas para colecionar memórias.',
    'Jantar': 'Uma noite à luz de velas só de vocês.',
    'Drinks': 'Um brinde ao amor de vocês.',
  };
  return fallbacks[place.categoria] || 'Um momento a dois inesquecível.';
}
