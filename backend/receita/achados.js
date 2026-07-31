// Link de receita → rascunho de receita. O casal manda a URL daquele post que
// viu no Instagram ou no blog, a IA lê e devolve algo no formato do catálogo.
//
// Três decisões de produto aqui:
//
// 1. O que sai daqui é RASCUNHO, nunca receita. Vai para uma lista de achados
//    e só entra na roda depois que alguém olhou e aprovou. Página de receita é
//    cheia de história da avó, propaganda e ingrediente que não existe no
//    mercado brasileiro — modelo nenhum acerta sempre, e receita errada é
//    descoberta na cozinha, com fome.
// 2. O servidor busca uma URL que o usuário digitou. Isso é uma porta aberta
//    para dentro da rede se ninguém trancar: endereço privado, redirect para
//    localhost, metadados da nuvem. Cada salto é conferido, aqui embaixo.
// 3. Sem chave de IA a feature não finge que funciona: avisa que está fora.
import dns from 'node:dns/promises';
import net from 'node:net';

const MODELO = 'claude-haiku-4-5-20251001';
const MAX_HTML = 800_000;     // além disso é página de portal, não de receita
const MAX_TEXTO = 24_000;     // o que vai pro modelo
const TIMEOUT_MS = 12_000;
const MAX_SALTOS = 3;
const MAX_INGREDIENTES = 20;
const MAX_PASSOS = 20;

// Vocabulário do catálogo. O que vier fora disso é descartado em vez de
// inventar tag nova — a roda pesa por essas palavras e só por elas.
const TAGS = ['jantar', 'almoco', 'cafe', 'madrugada', 'rapido', 'comfort', 'leve', 'sopa', 'forno', 'sobras', 'barato'];
const CONTEM = ['gluten', 'ovo', 'lactose', 'carne', 'peixe'];

export function iaDisponivel() {
  return !!process.env.ANTHROPIC_API_KEY;
}

/* ── A tranca ────────────────────────────────────────────────────────────── */

export function ipPrivado(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;     // metadados de nuvem moram aqui
    if (a === 100 && b >= 64 && b <= 127) return true;
    return a >= 224;                              // multicast e reservados
  }
  const s = String(ip).toLowerCase();
  if (s.startsWith('::ffff:')) return ipPrivado(s.slice(7));
  if (s === '::1' || s === '::') return true;
  return s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe80');
}

export function validarUrl(bruta) {
  let url;
  try {
    url = new URL(String(bruta || '').trim());
  } catch {
    throw new Error('Isso não parece um link. Cole o endereço completo da receita.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Só dá pra ler link que começa com http ou https.');
  }
  if (net.isIP(url.hostname) && ipPrivado(url.hostname)) {
    throw new Error('Esse endereço é da rede interna — não dá pra ler daqui.');
  }
  return url;
}

async function destinoPermitido(url) {
  if (net.isIP(url.hostname)) return !ipPrivado(url.hostname);
  try {
    const enderecos = await dns.lookup(url.hostname, { all: true });
    return enderecos.length > 0 && enderecos.every((e) => !ipPrivado(e.address));
  } catch {
    return false;
  }
}

/* ── Buscar a página ─────────────────────────────────────────────────────── */

// Redirect na mão: `fetch` seguindo sozinho pularia a conferência de cada salto,
// e é exatamente por um redirect que se chega no que não devia.
async function buscarPagina(url) {
  let atual = url;
  for (let salto = 0; salto <= MAX_SALTOS; salto++) {
    if (!(await destinoPermitido(atual))) {
      throw new Error('Esse endereço é da rede interna — não dá pra ler daqui.');
    }
    const res = await fetch(atual, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'ChamegoBot/1.0 (+https://chamego.online)', accept: 'text/html,*/*' },
    });

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      atual = validarUrl(new URL(res.headers.get('location'), atual).toString());
      continue;
    }
    if (!res.ok) throw new Error(`A página respondeu ${res.status}. Confere o link?`);

    const tipo = res.headers.get('content-type') || '';
    if (!tipo.includes('html') && !tipo.includes('text') && !tipo.includes('json')) {
      throw new Error('Esse link não é uma página de receita.');
    }
    const html = (await res.text()).slice(0, MAX_HTML);
    return { html, urlFinal: atual.toString() };
  }
  throw new Error('O link redireciona demais. Cole o endereço final da receita.');
}

const ENTIDADES = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&#39;': "'", '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í',
  '&oacute;': 'ó', '&uacute;': 'ú', '&ccedil;': 'ç', '&atilde;': 'ã', '&otilde;': 'õ',
};

// Muita página de receita traz a receita estruturada em JSON-LD. Quando existe,
// ela vale mais que o texto inteiro — e vai primeiro por isso.
export function textoDaPagina(html) {
  const fonte = String(html || '');
  const blocos = [...fonte.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1].trim())
    .filter((b) => /receita|recipe|ingredient/i.test(b))
    .slice(0, 2)
    .map((b) => b.slice(0, 8_000));

  const texto = fonte
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTIDADES[e.toLowerCase()] ?? ' ')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

  return [...blocos, texto].join('\n\n').slice(0, MAX_TEXTO);
}

/* ── O rascunho ──────────────────────────────────────────────────────────── */

const PROMPT = `Você recebe o texto de uma página da internet que provavelmente é uma receita de comida.

Extraia a receita e devolva SÓ um JSON válido, sem texto antes ou depois.

Formato exato:
{"receita":{"titulo":"Lasanha de domingo","tempoMin":70,"porcoes":4,"dificuldade":2,"custo":45,
"tags":["jantar","forno"],"contem":["gluten","lactose"],
"ingredientes":[{"nome":"carne moída","medida":"500 g","opcional":false}],
"passos":[{"texto":"Refogue a cebola até dourar.","timerSeg":300}]}}

Regras rígidas:
- Se a página NÃO for uma receita de comida, devolva {"receita":null}. Não invente.
- Português do Brasil. Ingrediente com o nome que se usa no mercado brasileiro,
  no singular ("cebola", "carne moída", "queijo mussarela").
- "medida": medida de casa — xícara, colher, gramas, unidade, "a gosto".
- "opcional": true para o que dá pra fazer sem.
- "passos": um passo por ação, frase curta e direta, no imperativo. Sem história,
  sem introdução, sem "bom apetite". No máximo ${MAX_PASSOS} passos.
- "timerSeg": segundos SÓ quando o passo tem tempo de espera real (cozinhar,
  assar, descansar). Caso contrário, omita.
- "tempoMin": tempo total realista, em minutos. Não copie o tempo otimista da
  página se os passos mostram outra coisa.
- "tags": só destas: ${TAGS.join(', ')}.
- "contem": só destas, e só o que a receita realmente tem: ${CONTEM.join(', ')}.
- "custo": estimativa em reais para as porções indicadas. Se não souber, 0.`;

const texto = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const numero = (v, min, max, padrao) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : padrao;
};

/**
 * Põe o que veio do modelo na forma do catálogo. Pura de propósito: é aqui que
 * mora a garantia de que um rascunho nunca vira uma receita malformada dentro
 * do app, e isso precisa ser testável sem rede.
 * Devolve null quando não há receita aproveitável.
 */
export function sanitizarReceita(bruto) {
  const r = bruto?.receita ?? bruto;
  if (!r || typeof r !== 'object') return null;

  const titulo = texto(r.titulo, 80);
  const ingredientes = (Array.isArray(r.ingredientes) ? r.ingredientes : [])
    .map((ing) => ({
      nome: texto(ing?.nome, 60).toLowerCase(),
      medida: texto(ing?.medida, 40) || 'a gosto',
      opcional: !!ing?.opcional,
    }))
    .filter((ing) => ing.nome)
    .slice(0, MAX_INGREDIENTES);

  const passos = (Array.isArray(r.passos) ? r.passos : [])
    .map((p) => {
      const t = texto(p?.texto ?? p, 400);
      const seg = numero(p?.timerSeg, 1, 21_600, 0);
      return seg ? { texto: t, timerSeg: seg } : { texto: t };
    })
    .filter((p) => p.texto)
    .slice(0, MAX_PASSOS);

  if (!titulo || !ingredientes.length || passos.length < 2) return null;

  return {
    titulo,
    tempoMin: numero(r.tempoMin, 1, 600, 30),
    porcoes: numero(r.porcoes, 1, 12, 2),
    dificuldade: numero(r.dificuldade, 1, 3, 1),
    custo: numero(r.custo, 0, 1000, 0),
    tags: [...new Set((Array.isArray(r.tags) ? r.tags : []).map((t) => texto(t, 20).toLowerCase()))]
      .filter((t) => TAGS.includes(t)),
    contem: [...new Set((Array.isArray(r.contem) ? r.contem : []).map((c) => texto(c, 20).toLowerCase()))]
      .filter((c) => CONTEM.includes(c)),
    ingredientes,
    passos,
  };
}

function extrairJson(resposta) {
  const match = String(resposta || '').match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function pedirAoModelo(conteudo) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || MODELO,
      max_tokens: 2048,
      messages: [{ role: 'user', content: `${PROMPT}\n\n---\n\n${conteudo}` }],
    }),
  });
  if (!res.ok) {
    console.error('achados: HTTP', res.status, await res.text().catch(() => ''));
    return null;
  }
  const data = await res.json();
  return (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
}

/**
 * Link → rascunho de receita. Nunca lança por causa da IA: devolve
 * `{ ok:false, erro }` com uma frase que dá pra mostrar na tela.
 */
export async function extrairDoLink(urlBruta) {
  if (!iaDisponivel()) return { ok: false, erro: 'A leitura de link está fora do ar por aqui.' };

  let url;
  try {
    url = validarUrl(urlBruta);
  } catch (e) {
    return { ok: false, erro: e.message };
  }

  let pagina;
  try {
    pagina = await buscarPagina(url);
  } catch (e) {
    const fora = e.name === 'TimeoutError' || e.name === 'AbortError';
    return { ok: false, erro: fora ? 'A página demorou demais pra responder.' : e.message };
  }

  const conteudo = textoDaPagina(pagina.html);
  if (conteudo.length < 200) return { ok: false, erro: 'Não consegui ler o conteúdo dessa página.' };

  let resposta;
  try {
    resposta = await pedirAoModelo(conteudo);
  } catch (e) {
    console.error('achados error', e.message);
    return { ok: false, erro: 'A leitura falhou agora. Tenta de novo daqui a pouco.' };
  }

  const receita = sanitizarReceita(extrairJson(resposta));
  if (!receita) return { ok: false, erro: 'Não achei uma receita nessa página.' };
  return { ok: true, receita, urlFinal: pagina.urlFinal };
}
