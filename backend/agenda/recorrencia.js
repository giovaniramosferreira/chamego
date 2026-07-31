// Aluguel todo dia 5, faxina toda terça, aniversário da sogra todo ano, parcela
// 3 de 12. É tudo a mesma coisa: uma data âncora e uma frequência.
//
// A decisão que segura este arquivo: **ocorrência não vira linha no banco.**
// Guardar 120 linhas pro aluguel de dez anos é lixo que ninguém apaga e que
// quebra na hora de mudar a regra. O que se guarda é o evento (uma linha) e o
// que já aconteceu com ele (paguei, fiz). O resto se calcula na hora.
//
// A âncora manda em tudo: `weekly` herda o dia da semana da data, `monthly` o
// dia do mês. Assim é impossível existir "repete dia 5" numa data que cai no
// dia 7 — um jeito inteiro de errar que simplesmente não existe aqui.

export const FREQUENCIAS = ['', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'];

export const ROTULO_FREQ = {
  '': 'Não repete',
  daily: 'Todo dia',
  weekly: 'Toda semana',
  biweekly: 'A cada 15 dias',
  monthly: 'Todo mês',
  yearly: 'Todo ano',
};

const DIA = 86_400_000;

// Datas viajam como 'YYYY-MM-DD' e são comparadas como texto no banco inteiro.
// Trabalhar com os três números evita o fuso estragar a conta de virada de dia.
function partes(iso) {
  const [a, m, d] = String(iso).split('-').map(Number);
  return { a, m, d };
}
const paraIso = (a, m, d) => `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const ehValida = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''));
const utc = (iso) => { const { a, m, d } = partes(iso); return Date.UTC(a, m - 1, d); };
const diaDaSemana = (iso) => new Date(utc(iso)).getUTCDay();
const somaDias = (iso, n) => new Date(utc(iso) + n * DIA).toISOString().slice(0, 10);
const ultimoDiaDoMes = (a, m) => new Date(Date.UTC(a, m, 0)).getUTCDate();

// Dia 31 em fevereiro não existe. Cai no último dia do mês em vez de vazar pro
// mês seguinte — é o que a conta de luz faz na vida real.
function mesmoDiaNoMes(a, m, dia) {
  return paraIso(a, m, Math.min(dia, ultimoDiaDoMes(a, m)));
}

/**
 * As datas de um evento dentro de uma janela [de, ate], inclusive.
 * Sem frequência, a resposta é a própria data — se ela couber na janela.
 */
export function ocorrenciasEntre(evento, de, ate) {
  const inicio = evento.date;
  if (!ehValida(inicio) || !ehValida(de) || !ehValida(ate) || ate < de) return [];

  const freq = FREQUENCIAS.includes(evento.recurrence) ? evento.recurrence : '';
  const fim = evento.until && ehValida(evento.until) && evento.until < ate ? evento.until : ate;
  if (!freq) return inicio >= de && inicio <= ate ? [inicio] : [];
  if (inicio > fim) return [];

  const datas = [];
  const limite = limiteDeParcelas(evento);

  if (freq === 'daily' || freq === 'weekly' || freq === 'biweekly') {
    const passo = freq === 'daily' ? 1 : freq === 'weekly' ? 7 : 14;
    // Pula direto pra primeira ocorrência dentro da janela: um evento diário de
    // 2010 não pode custar 5 mil voltas de laço.
    const desde = de > inicio ? de : inicio;
    const saltos = Math.ceil((utc(desde) - utc(inicio)) / (passo * DIA));
    let n = Math.max(0, saltos);
    for (; ; n++) {
      if (limite !== null && n >= limite) break;
      const data = somaDias(inicio, n * passo);
      if (data > fim) break;
      if (data >= de) datas.push(data);
      if (datas.length > 400) break; // janela absurda: para em vez de travar
    }
    return datas;
  }

  const { a: anoBase, m: mesBase, d: diaBase } = partes(inicio);

  if (freq === 'monthly') {
    const primeiro = partes(de > inicio ? de : inicio);
    let n = (primeiro.a - anoBase) * 12 + (primeiro.m - mesBase);
    if (n < 0) n = 0;
    for (; ; n++) {
      if (limite !== null && n >= limite) break;
      const total = mesBase - 1 + n;
      const data = mesmoDiaNoMes(anoBase + Math.floor(total / 12), (total % 12) + 1, diaBase);
      if (data > fim) break;
      if (data >= de && data >= inicio) datas.push(data);
      if (datas.length > 400) break;
    }
    return datas;
  }

  // yearly: 29 de fevereiro cai no dia 28 nos anos comuns.
  const primeiroAno = Math.max(anoBase, partes(de).a);
  for (let ano = primeiroAno; ; ano++) {
    const n = ano - anoBase;
    if (limite !== null && n >= limite) break;
    const data = mesmoDiaNoMes(ano, mesBase, diaBase);
    if (data > fim) break;
    if (data >= de && data >= inicio) datas.push(data);
    if (ano - primeiroAno > 200) break;
  }
  return datas;
}

// Parcelamento é recorrência com fim contado: 12x acaba na décima segunda.
function limiteDeParcelas(evento) {
  const n = Number(evento.installments);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/** Qual parcela é esta data — `null` quando o evento não é parcelado. */
export function parcelaDe(evento, data) {
  const total = limiteDeParcelas(evento);
  if (!total || !evento.recurrence) return null;
  const anteriores = ocorrenciasEntre(evento, evento.date, data);
  const n = anteriores.length;
  return n > 0 && n <= total ? { n, de: total } : null;
}

/** A próxima data a partir de `hoje` (inclusive), ou null se já acabou. */
export function proximaOcorrencia(evento, hoje, janelaDias = 800) {
  const [primeira] = ocorrenciasEntre(evento, hoje, somaDias(hoje, janelaDias));
  return primeira || null;
}

// Frase curta pra interface: "Todo mês · dia 5", "Toda semana · terça".
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export function descreverRecorrencia(evento) {
  const freq = FREQUENCIAS.includes(evento.recurrence) ? evento.recurrence : '';
  if (!freq) return '';
  const { d } = partes(evento.date);
  const base = ROTULO_FREQ[freq];
  const detalhe = freq === 'weekly' || freq === 'biweekly' ? DIAS[diaDaSemana(evento.date)]
    : freq === 'monthly' ? `dia ${d}`
      : '';
  const parcelas = limiteDeParcelas(evento);
  const sufixo = parcelas ? ` · ${parcelas}x` : '';
  return detalhe ? `${base} · ${detalhe}${sufixo}` : `${base}${sufixo}`;
}
