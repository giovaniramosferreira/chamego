// Comparar ingrediente de receita com o que o casal tem em casa parece trivial
// e não é. "Cebolas" é "cebola"; "leite condensado" NÃO é "leite"; e ninguém
// considera que faltou sal. Errar aqui quebra a promessa central da feature
// ("vocês têm tudo" / "falta cebola") — e promessa quebrada mata a confiança.

// Itens que toda casa tem e que ninguém considera "compra". Contá-los como
// falta faria toda receita parecer inviável.
export const BASICOS = ['sal', 'pimenta', 'pimenta do reino', 'azeite', 'oleo', 'agua', 'acucar', 'vinagre'];

// Sinônimos do supermercado brasileiro; o lado direito é o canônico.
// ATENÇÃO: as chaves são consultadas DEPOIS de tirar acento e cedilha —
// escreva "mucarela", não "muçarela", ou o sinônimo nunca casa.
const SINONIMOS = {
  aipim: 'mandioca',
  macaxeira: 'mandioca',
  'tomate italiano': 'tomate',
  'tomate cereja': 'tomate',
  'peito de frango': 'frango',
  'file de frango': 'frango',
  sobrecoxa: 'frango',
  'macarrao espaguete': 'macarrao',
  espaguete: 'macarrao',
  penne: 'macarrao',
  parafuso: 'macarrao',
  'queijo mussarela': 'mussarela',
  mucarela: 'mussarela',
  'queijo mucarela': 'mussarela',
  'requeijao cremoso': 'requeijao',
  'cebolinha verde': 'cebolinha',
  salsinha: 'salsa',
  'batata inglesa': 'batata',
  'ovo de galinha': 'ovo',
  ovos: 'ovo',
};

const ACENTOS = /[̀-ͯ]/g;

// Plural → singular nos casos que aparecem em comida brasileira.
function singular(palavra) {
  const regras = [
    [/ões$/, 'ao'], [/ães$/, 'ao'], [/aes$/, 'ao'], [/oes$/, 'ao'],
    [/ais$/, 'al'], [/eis$/, 'el'], [/ois$/, 'ol'], [/is$/, 'il'],
    [/ns$/, 'm'], [/res$/, 'r'], [/zes$/, 'z'],
    [/([^aeiou])es$/, '$1e'], // tomates → tomate
    [/s$/, ''],               // cebolas → cebola
  ];
  for (const [re, sub] of regras) {
    if (re.test(palavra)) {
      const cand = palavra.replace(re, sub);
      // Palavras curtas ("gás", "arroz") não são plural: não encurtar demais.
      if (cand.length >= 3) return cand;
    }
  }
  return palavra;
}

// Forma canônica: minúsculas, sem acento, sem ruído de embalagem, singular,
// com sinônimo resolvido.
export function normalizar(nome) {
  let s = String(nome ?? '')
    .normalize('NFD').replace(ACENTOS, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  s = s
    .replace(/\b(pacote|pote|lata|caixa|sache|unidade|pedaco|fatia|dente)s?\s+de\s+/g, '')
    .replace(/\b(integral|desnatado|semidesnatado|light|zero|organico|congelado|fresco|seco|em po|granulado)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (SINONIMOS[s]) return SINONIMOS[s];
  const canonico = s.split(' ').map(singular).join(' ').replace(/\s+/g, ' ').trim();
  return SINONIMOS[canonico] ?? canonico;
}

export function ehBasico(nome) {
  const n = normalizar(nome);
  return BASICOS.some((b) => normalizar(b) === n);
}

// Compara receita × despensa. Básicos contam como presentes; opcional que
// falta não impede o "vocês têm tudo"; a comparação é por nome canônico
// inteiro — "leite condensado" nunca casa com "leite".
export function compararDespensa(ingredientes, despensa, { assumirBasicos = true } = {}) {
  const disponiveis = new Set((despensa || []).map((d) => normalizar(d.name ?? d.nome)));
  const tem = [];
  const falta = [];
  const faltaEssencial = [];
  let contados = 0;
  let presentes = 0;

  for (const ing of ingredientes || []) {
    const canonico = normalizar(ing.nome);
    const basico = assumirBasicos && ehBasico(canonico);
    const presente = disponiveis.has(canonico) || basico;

    if (presente) tem.push(ing.nome);
    else {
      falta.push(ing.nome);
      if (!ing.opcional) faltaEssencial.push(ing.nome);
    }
    if (!ing.opcional && !basico) {
      contados++;
      if (presente) presentes++;
    }
  }

  return {
    tem,
    falta,
    faltaEssencial,
    cobertura: contados === 0 ? 1 : presentes / contados,
    temTudo: faltaEssencial.length === 0,
  };
}

// Rótulo pronto pra interface: honesto e curto.
export function rotuloFalta(c) {
  if (c.temTudo) return 'vocês têm tudo';
  const n = c.faltaEssencial;
  if (n.length === 1) return `falta: ${n[0]}`;
  if (n.length === 2) return `faltam: ${n[0]} e ${n[1]}`;
  return `faltam: ${n.slice(0, 2).join(', ')} +${n.length - 2}`;
}
