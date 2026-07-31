// Lista de mercado que se religa sozinha. A ideia: já se sabe mais ou menos de
// quanto em quanto tempo cada coisa acaba — e o app vai aprendendo o ritmo da
// casa. Três decisões separam "assistente" de "app que cobra":
//   1. Começa com um palpite por item (lista vazia no dia 1 mata a feature) e
//      migra pro ritmo aprendido conforme a evidência chega.
//   2. "Ainda temos" não é só adiar: é ensinar. O intervalo do item aumenta.
//      Sem isso, o app repete o mesmo erro toda semana e a pessoa desliga.
//   3. Mediana, não média: uma compra atípica (viagem, mês apertado) não pode
//      reprogramar o ritmo.

// Palpite inicial em dias, para uma casa brasileira média. Ponto de partida
// honesto até o ritmo do casal aparecer.
export const CADENCIA_PADRAO = {
  pao: 3, leite: 4, banana: 5, alface: 6, tomate: 7, frango: 7, iogurte: 7,
  presunto: 8, queijo: 10, 'carne moida': 10, batata: 12, ovo: 12, cebola: 14,
  cenoura: 14, macarrao: 20, cafe: 20, manteiga: 25, feijao: 25, arroz: 30,
  alho: 30, farinha: 40, acucar: 40, oleo: 45, sal: 90,
  // Ingredientes dos pratos que o casal marcou como favoritos: sem palpite
  // aqui, todos cairiam no padrão de 14 dias e a lista erraria feio no que
  // eles mais compram.
  vagem: 7, bife: 8, salsicha: 10, 'pao de hamburguer': 10, 'pao de hot dog': 10,
  mussarela: 12, salmao: 14, bacon: 12, 'creme de leite': 30, kimchi: 30,
  'batata palha': 30, 'massa de lasanha': 45, 'farinha de rosca': 60,
  // Casa também acaba, e a lista é a mesma.
  'papel higienico': 21, detergente: 20, esponja: 20, 'sabao em po': 30,
  amaciante: 40, desinfetante: 45, 'saco de lixo': 30, 'papel toalha': 25,
};

const PADRAO_DESCONHECIDO = 14;
const OBSERVACOES_PARA_CONFIAR = 4;
const DIA = 86_400_000;

export function mediana(valores) {
  if (!valores.length) return 0;
  const ord = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ord.length / 2);
  return ord.length % 2 ? ord[meio] : (ord[meio - 1] + ord[meio]) / 2;
}

const emDias = (a, b) => (new Date(b).getTime() - new Date(a).getTime()) / DIA;
const eventosDe = (item, tipo) => (item.eventos || [])
  .filter((e) => e.tipo === tipo)
  .map((e) => new Date(e.em))
  .sort((a, b) => a - b);

function intervalosDeCompra(item) {
  const datas = eventosDe(item, 'comprou');
  const out = [];
  for (let i = 1; i < datas.length; i++) out.push(emDias(datas[i - 1], datas[i]));
  return out.filter((d) => d > 0.5 && d < 180);
}

// Quanto durou cada compra até alguém marcar "acabou" — o sinal mais direto.
function duracoesDeUso(item) {
  const ord = [...(item.eventos || [])].sort((a, b) => new Date(a.em) - new Date(b.em));
  const out = [];
  let compra = null;
  for (const e of ord) {
    if (e.tipo === 'comprou') compra = e.em;
    else if (e.tipo === 'acabou' && compra) {
      const d = emDias(compra, e.em);
      if (d > 0.5 && d < 180) out.push(d);
      compra = null;
    }
  }
  return out;
}

const ultimo = (item, tipo) => {
  const datas = eventosDe(item, tipo);
  return datas.length ? datas[datas.length - 1] : null;
};

// Qual sinal veio depois. Comparar por data empata quando os dois eventos caem
// no mesmo segundo (o banco guarda segundos), e aí o "acabou" que o casal
// acabou de marcar seria ignorado. A ordem da lista de eventos é a verdade.
function sinalMaisRecente(item) {
  const eventos = (item.eventos || []);
  for (let i = eventos.length - 1; i >= 0; i--) {
    if (eventos[i].tipo === 'acabou' || eventos[i].tipo === 'comprou') return eventos[i].tipo;
  }
  return null;
}

// Estima de quanto em quanto tempo o item acaba, misturando palpite e
// evidência na proporção da confiança.
export function estimarCadencia(item) {
  const padrao = CADENCIA_PADRAO[item.canonico] ?? PADRAO_DESCONHECIDO;

  // Ajuste vindo de "ainda temos"/"acabou" vale mais que qualquer inferência.
  if (item.cadencia_dias) return { dias: item.cadencia_dias, confianca: 1, fonte: 'ajustado' };

  const consumo = duracoesDeUso(item);
  const compras = intervalosDeCompra(item);
  const amostra = consumo.length ? consumo : compras;
  const fonte = consumo.length ? 'consumo' : compras.length ? 'compras' : 'padrao';
  if (!amostra.length) return { dias: padrao, confianca: 0, fonte: 'padrao' };

  const aprendido = mediana(amostra);
  const confianca = Math.min(1, amostra.length / OBSERVACOES_PARA_CONFIAR);
  return { dias: Math.round(aprendido * confianca + padrao * (1 - confianca)), confianca, fonte };
}

// Cozinharam mais que o normal nesta semana? Os ingredientes acabam antes.
// Fator limitado para não virar oscilação.
export function fatorDeRitmo(cozinhadasUltimos7, mediaSemanal) {
  if (!mediaSemanal) return 1;
  const razao = cozinhadasUltimos7 / mediaSemanal;
  if (!Number.isFinite(razao) || razao <= 0) return 1;
  return Math.min(1.6, Math.max(0.6, 1 / razao));
}

// Dia da semana em que essa casa faz mercado (0 = domingo), se houver hábito.
export function diaPreferidoDeCompra(itens) {
  const contagem = new Map();
  for (const item of itens) {
    for (const d of eventosDe(item, 'comprou')) {
      contagem.set(d.getDay(), (contagem.get(d.getDay()) || 0) + 1);
    }
  }
  if (!contagem.size) return null;
  const [dia, n] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0];
  const total = [...contagem.values()].reduce((s, v) => s + v, 0);
  // Só vale como hábito se concentrar de verdade; senão compram a esmo.
  return n / total >= 0.4 && total >= 3 ? dia : null;
}

// A lista de hoje. Sem item vencendo, ninguém aparece — lista vazia é resposta
// válida e é o que impede a feature de virar chateação diária.
export function listaDoDia(itens, { hoje, antecedencia = 2, cozinhadasUltimos7 = 0, mediaSemanal = 0 }) {
  const fator = fatorDeRitmo(cozinhadasUltimos7, mediaSemanal);
  const saida = [];

  for (const item of itens) {
    if (item.silenciado) continue;

    const base = estimarCadencia(item);
    const cadencia = { ...base, dias: Math.max(1, Math.round(base.dias * fator)) };
    const acabou = ultimo(item, 'acabou');
    const comprou = ultimo(item, 'comprou');

    // Marcaram que acabou depois da última compra: entra sem discussão.
    if (acabou && sinalMaisRecente(item) === 'acabou') {
      saida.push({
        id: item.id,
        nome: item.name,
        urgencia: 'acabou',
        emDias: -Math.round(emDias(acabou, hoje)),
        motivo: 'vocês marcaram que acabou',
        cadencia,
      });
      continue;
    }
    if (!comprou) continue; // nunca compraram e nada acabou: não há o que prever

    const previsto = new Date(comprou.getTime() + cadencia.dias * DIA);
    const faltam = Math.round(emDias(hoje, previsto));
    if (faltam > antecedencia) continue;

    const comoSoube = cadencia.fonte === 'padrao'
      ? `costuma durar ~${cadencia.dias} dias`
      : `pelo ritmo de vocês, dura ~${cadencia.dias} dias`;

    saida.push({
      id: item.id,
      nome: item.name,
      urgencia: faltam <= 0 ? 'acabando' : 'logo',
      emDias: faltam,
      motivo: faltam <= 0 ? `${comoSoube} — última compra há ${Math.round(emDias(comprou, hoje))}` : comoSoube,
      cadencia,
    });
  }

  const ordem = { acabou: 0, acabando: 1, logo: 2 };
  return saida.sort((a, b) => ordem[a.urgencia] - ordem[b.urgencia] || a.emDias - b.emDias);
}

// O que o casal responde na lista é o professor do algoritmo: "ainda temos"
// alonga a cadência (erramos pra baixo); "acabou" antes do previsto encurta.
export function cadenciaAposFeedback(item, feedback) {
  const atual = estimarCadencia(item).dias;
  if (feedback === 'ainda-tenho') return Math.min(120, Math.round(atual * 1.25));
  if (feedback === 'acabou') {
    const comprou = ultimo(item, 'comprou');
    const duracao = comprou ? emDias(comprou, new Date()) : null;
    if (duracao && duracao < atual * 0.7) return Math.max(1, Math.round((atual + duracao) / 2));
  }
  return item.cadencia_dias || null;
}

// Quando avisar: se o casal tem dia de mercado, a lista fica pronta na véspera
// à noite — é quando se decide. Sem hábito claro, avisa quando algo acabou.
export function melhorMomentoDeAvisar(itens, hoje) {
  const dia = diaPreferidoDeCompra(itens);
  const lista = listaDoDia(itens, { hoje });
  const urgente = lista.some((i) => i.urgencia === 'acabou' || i.urgencia === 'acabando');

  if (dia === null) return { avisarHoje: urgente, motivo: urgente ? 'tem item acabando' : 'nada urgente' };
  const vespera = (dia + 6) % 7;
  if (hoje.getDay() === vespera && lista.length > 0) {
    return { avisarHoje: true, motivo: 'véspera do dia de mercado de vocês' };
  }
  return { avisarHoje: urgente, motivo: urgente ? 'tem item acabando' : 'fora do dia de mercado' };
}
