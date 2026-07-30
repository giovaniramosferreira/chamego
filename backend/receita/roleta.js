// A roda parece sorte e é decisão: o peso de cada receita sai do contexto real
// do casal (hora, dia, clima, despensa, o que já cozinharam). O sorteio recebe
// o gerador aleatório de fora, então cada regra é testável de forma exata.
import { compararDespensa } from './ingredientes.js';

const DIAS_SEM_REPETIR = 10;

export function refeicaoDe(agora) {
  const h = agora.getHours();
  if (h >= 5 && h < 11) return 'cafe';
  if (h >= 11 && h < 15) return 'almoco';
  if (h >= 15 && h < 23) return 'jantar';
  return 'madrugada';
}

// Peso de uma receita no contexto. Nunca zera por gosto (só por restrição
// alimentar ou recusa na sessão): zerar por preferência deixa a roda
// previsível, e previsibilidade é o oposto da feature.
export function pesar(receita, ctx) {
  const motivos = [];
  const restricoes = ctx.restricoes || [];

  if ((receita.contem || []).some((c) => restricoes.includes(c))) {
    return { receita, peso: 0, motivos: ['restrição alimentar'] };
  }
  if ((ctx.recusadas || []).includes(receita.id)) {
    return { receita, peso: 0, motivos: ['recusada agora'] };
  }

  let peso = 1;
  const mult = (fator, motivo) => { peso *= fator; motivos.push(motivo); };

  const refeicao = refeicaoDe(ctx.agora);
  if ((receita.tags || []).includes(refeicao)) mult(1.8, `combina com ${refeicao}`);
  if (refeicao === 'madrugada' && receita.tempoMin <= 15) mult(1.6, 'madrugada pede rápido');

  // Quarta-feira 20h é o caso de uso. Fim de semana aceita elaboração.
  const dow = ctx.agora.getDay();
  const diaUtil = dow >= 1 && dow <= 4;
  if (diaUtil && receita.tempoMin <= 30) mult(1.5, 'dia de semana, rápida');
  if (diaUtil && receita.tempoMin > 45) mult(0.4, 'longa demais pra dia de semana');
  if (!diaUtil && receita.dificuldade >= 2) mult(1.25, 'fim de semana aceita mais trabalho');
  if (dow === 0 && (receita.tags || []).includes('comfort')) mult(1.4, 'domingo de comfort food');

  // Clima: o corpo pede coisa diferente e ninguém digita isso.
  if (typeof ctx.tempC === 'number') {
    const tags = receita.tags || [];
    if (ctx.tempC <= 18 && (tags.includes('sopa') || tags.includes('forno'))) mult(1.7, 'frio pede sopa/forno');
    if (ctx.tempC >= 28 && tags.includes('leve')) mult(1.6, 'calor pede leve');
    if (ctx.tempC >= 28 && tags.includes('sopa')) mult(0.5, 'calor não pede sopa');
  }

  // Despensa: o que dá pra fazer agora vale muito mais.
  if (ctx.despensa && ctx.despensa.length) {
    const c = compararDespensa(receita.ingredientes, ctx.despensa);
    if (c.temTudo) mult(2.2, 'tem tudo em casa');
    else if (c.cobertura >= 0.7) mult(1.4, 'falta pouco');
    else if (c.cobertura < 0.4) mult(0.35, 'falta muita coisa');
  }

  // Histórico: não repetir o que acabaram de comer; lembrar do que deu certo.
  const doHistorico = (ctx.historico || [])
    .filter((g) => g.receita_id === receita.id)
    .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))[0];
  if (doHistorico) {
    const dias = (ctx.agora.getTime() - new Date(doHistorico.criado_em).getTime()) / 86_400_000;
    if (doHistorico.desfecho === 'cozinhou') {
      if (dias < DIAS_SEM_REPETIR) mult(0.15, `cozinharam há ${Math.round(dias)} dias`);
      else mult(1.3, 'deu certo antes');
    }
    if (doHistorico.desfecho === 'girou_de_novo' || doHistorico.desfecho === 'pulou') mult(0.4, 'recusada antes');
    if (doHistorico.desfecho === 'abandonou') mult(0.6, 'abandonada no meio');
  }

  return { receita, peso, motivos };
}

// Sorteio proporcional ao peso. `rng` entra de fora para o teste ser exato.
export function sortearPonderado(itens, rng) {
  const validos = itens.filter((i) => i.peso > 0);
  if (!validos.length) return null;
  const total = validos.reduce((s, i) => s + i.peso, 0);
  let alvo = rng() * total;
  for (const i of validos) {
    alvo -= i.peso;
    if (alvo <= 0) return i.item;
  }
  return validos[validos.length - 1].item;
}

// Uma receita. Não uma lista — a lista é o problema que estamos matando.
export function girar(receitas, ctx, rng = Math.random) {
  const pesados = receitas.map((r) => pesar(r, ctx));
  const escolhida = sortearPonderado(pesados.map((p) => ({ item: p, peso: p.peso })), rng);
  if (!escolhida) return null;
  return {
    receita: escolhida.receita,
    motivos: escolhida.motivos,
    // Guardar a distribuição explica o produto depois (e depura a roda).
    pesos: pesados.map((p) => ({ id: p.receita.id, peso: Number(p.peso.toFixed(3)) })),
  };
}

// A escassez é intencional: giro infinito recria o scroll infinito.
export const GIROS_GRATIS_DIA = 3;

export function girosRestantes(girosHoje, premium) {
  if (premium) return Infinity;
  return Math.max(0, GIROS_GRATIS_DIA - girosHoje);
}
