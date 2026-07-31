// Receita de Hoje. O que precisa ser inquebrável: a roda não pode prometer
// receita impossível, o desfecho tem que ser gravado (é a métrica-norte da
// feature) e a lista de mercado não pode cobrar o que o casal já disse que tem.
import { describe, it, expect } from 'vitest';
import request from 'supertest';

process.env.ADMIN_KEY = process.env.ADMIN_KEY || 'chave-de-teste';

import { app } from '../server.js';
import { db } from '../db.js';
import { compararDespensa, normalizar, rotuloFalta } from '../receita/ingredientes.js';
import { girar, girosRestantes, pesar, refeicaoDe, sortearPonderado } from '../receita/roleta.js';
import { cadenciaAposFeedback, diaPreferidoDeCompra, estimarCadencia, fatorDeRitmo, listaDoDia, mediana } from '../receita/lista.js';
import { RECEITAS } from '../receita/catalogo.js';

let seq = 0;
async function login(email) {
  await request(app).post('/api/auth/magic-link').send({ email });
  const token = db._rawLoginToken(email);
  const res = await request(app).get(`/api/auth/magic?t=${token}`);
  return res.headers['set-cookie'][0].split(';')[0];
}
async function newSpace() {
  const email = `cozinha${seq++}@b.com`;
  const cookie = await login(email);
  const res = await request(app).post('/api/couples').set('Cookie', cookie)
    .send({ name: 'Nós', milestoneDate: '2024-01-01', seed: false });
  return { cookie, email, couple: res.body.couple };
}
const premium = (coupleId) => db.saveSubscription(coupleId, {
  status: 'active', provider: 'stripe', currentPeriodEnd: '2099-01-01T00:00:00.000Z',
});

/* ── Catálogo: as regras de conteúdo valem para todas ── */
describe('catálogo curado', () => {
  it('toda receita cabe na cabeça de quem está com fome: ≤8 ingredientes', () => {
    for (const r of RECEITAS) {
      expect(r.ingredientes.length, r.id).toBeLessThanOrEqual(8);
      expect(r.passos.length, r.id).toBeGreaterThan(2);
      expect(r.ingredientes.every((i) => i.medida), r.id).toBe(true);
    }
  });

  // O prato de sábado é bem-vindo, desde que não se disfarce de jantar de
  // quarta: quem passa de 45 min precisa das marcas que a roda usa pra
  // empurrar a receita pro fim de semana.
  it('prato longo não se vende como rápido', () => {
    for (const r of RECEITAS.filter((x) => x.tempoMin > 45)) {
      expect(r.tags, r.id).not.toContain('rapido');
      expect(r.dificuldade, r.id).toBeGreaterThanOrEqual(2);
    }
  });

  // A promessa da feature é a quarta às 20h. Se o catálogo virar um livro de
  // fim de semana, a roda deixa de responder o caso que importa.
  it('a maioria ainda resolve uma quarta-feira em 30 min', () => {
    const rapidas = RECEITAS.filter((r) => r.tempoMin <= 30);
    expect(rapidas.length).toBeGreaterThan(RECEITAS.length / 2);
  });

  it('usa medida de casa, não gramatura de precisão', () => {
    const medidas = RECEITAS.flatMap((r) => r.ingredientes.map((i) => i.medida)).join(' ');
    expect(medidas).toMatch(/xícara|colher|a gosto|unidade|fatia|dente/);
  });
});

/* ── Ingredientes ── */
describe('match de ingredientes', () => {
  it('normaliza plural, acento e sinônimo de mercado', () => {
    expect(normalizar('Cebolas')).toBe('cebola');
    expect(normalizar('Limões')).toBe('limao');
    expect(normalizar('macaxeira')).toBe('mandioca');
    expect(normalizar('Peito de frango')).toBe('frango');
    expect(normalizar('arroz')).toBe('arroz');
  });

  it('não conta sal como falta e não confunde composto com simples', () => {
    const semSal = compararDespensa([{ nome: 'sal' }, { nome: 'ovo' }], [{ name: 'ovo' }]);
    expect(semSal.temTudo).toBe(true);
    const composto = compararDespensa([{ nome: 'leite condensado' }], [{ name: 'leite' }]);
    expect(composto.temTudo).toBe(false);
    expect(rotuloFalta(composto)).toBe('falta: leite condensado');
  });
});

/* ── Roda ── */
describe('roda ponderada', () => {
  const quarta20h = new Date('2026-07-29T20:00:00');
  const receita = (id, extra = {}) => ({
    id, titulo: id, tempoMin: 25, dificuldade: 1, custo: 10, tags: [],
    ingredientes: [{ nome: 'ovo' }], ...extra,
  });

  it('lê a refeição pela hora', () => {
    expect(refeicaoDe(new Date('2026-07-29T07:00:00'))).toBe('cafe');
    expect(refeicaoDe(new Date('2026-07-29T20:00:00'))).toBe('jantar');
    expect(refeicaoDe(new Date('2026-07-29T02:00:00'))).toBe('madrugada');
  });

  it('quarta 20h prefere rápida; ter tudo em casa pesa mais que tudo', () => {
    const rapida = pesar(receita('r', { tempoMin: 20, tags: ['jantar'] }), { agora: quarta20h });
    const longa = pesar(receita('l', { tempoMin: 70, tags: ['jantar'] }), { agora: quarta20h });
    expect(rapida.peso).toBeGreaterThan(longa.peso * 3);

    const comTudo = pesar(receita('c'), { agora: quarta20h, despensa: [{ name: 'ovo' }] });
    const semNada = pesar(receita('c'), { agora: quarta20h, despensa: [{ name: 'alface' }] });
    expect(comTudo.peso).toBeGreaterThan(semNada.peso * 5);
  });

  it('não repete o que cozinharam ontem e respeita restrição como filtro', () => {
    const ontem = new Date(quarta20h.getTime() - 86_400_000).toISOString();
    const repetida = pesar(receita('x'), {
      agora: quarta20h, historico: [{ receita_id: 'x', desfecho: 'cozinhou', criado_em: ontem }],
    });
    expect(repetida.peso).toBeLessThan(0.3);

    const vegetariano = pesar(receita('p', { contem: ['carne'] }), { agora: quarta20h, restricoes: ['carne'] });
    expect(vegetariano.peso).toBe(0);
  });

  it('sorteio respeita a proporção e devolve uma receita só', () => {
    expect(sortearPonderado([{ item: 'a', peso: 1 }, { item: 'b', peso: 3 }], () => 0.1)).toBe('a');
    expect(sortearPonderado([{ item: 'a', peso: 0 }], () => 0.5)).toBeNull();
    const res = girar([receita('a'), receita('b', { tempoMin: 90 })], { agora: quarta20h }, () => 0.01);
    expect(res.receita.id).toBe('a');
    expect(res.pesos).toHaveLength(2);
  });

  it('escassez: 3 giros no grátis, ilimitado no pago', () => {
    expect(girosRestantes(0, false)).toBe(3);
    expect(girosRestantes(3, false)).toBe(0);
    expect(girosRestantes(99, true)).toBe(Infinity);
  });
});

/* ── Fluxo pelas rotas ── */
describe('girar pelo app', () => {
  it('devolve uma receita, marca o giro e diz o que falta', async () => {
    const { cookie } = await newSpace();
    await request(app).post('/api/despensa').set('Cookie', cookie).send({ itens: ['ovo', 'queijo'] });

    const res = await request(app).post('/api/cozinha/girar').set('Cookie', cookie).send({});
    expect(res.status).toBe(200);
    expect(res.body.receita.titulo).toBeTruthy();
    expect(res.body.receita.rotuloFalta).toBeTruthy();
    expect(res.body.girosRestantes).toBe(2);
    expect(res.body.spinId).toBeTruthy();
  });

  it('respeita o limite diário do grátis e libera no premium', async () => {
    const { cookie, couple } = await newSpace();
    for (let i = 0; i < 3; i++) {
      expect((await request(app).post('/api/cozinha/girar').set('Cookie', cookie).send({})).status).toBe(200);
    }
    const barrado = await request(app).post('/api/cozinha/girar').set('Cookie', cookie).send({});
    expect(barrado.status).toBe(402);
    expect(barrado.body.upgrade).toBe(true);

    premium(couple.id);
    expect((await request(app).post('/api/cozinha/girar').set('Cookie', cookie).send({})).status).toBe(200);
  });

  it('receita recusada não volta no mesmo giro', async () => {
    const { cookie, couple } = await newSpace();
    premium(couple.id);
    const primeiro = (await request(app).post('/api/cozinha/girar').set('Cookie', cookie).send({})).body;
    for (let i = 0; i < 6; i++) {
      const outro = await request(app).post('/api/cozinha/girar').set('Cookie', cookie)
        .send({ recusadas: [primeiro.receita.id] });
      expect(outro.body.receita.id).not.toBe(primeiro.receita.id);
    }
  });

  it('desfecho é gravado e alimenta a métrica-norte', async () => {
    const { cookie, couple } = await newSpace();
    premium(couple.id);
    const a = (await request(app).post('/api/cozinha/girar').set('Cookie', cookie).send({})).body;
    await request(app).post(`/api/cozinha/spins/${a.spinId}/desfecho`).set('Cookie', cookie).send({ desfecho: 'pulou' });

    const b = (await request(app).post('/api/cozinha/girar').set('Cookie', cookie).send({})).body;
    const fim = await request(app).post('/api/cozinha/cozinhei').set('Cookie', cookie)
      .send({ receitaId: b.receita.id, spinId: b.spinId });
    expect(fim.status).toBe(200);
    expect(fim.body.sugestaoMomento).toContain('Fizemos');

    const metrica = db.taxaDeCozinhada(couple.id);
    expect(metrica).toEqual({ total: 2, cozinhou: 1, taxa: 0.5 });
    expect((await request(app).get('/api/cozinha').set('Cookie', cookie)).body.metrica.cozinhou).toBe(1);
  });

  it('desfecho inválido é recusado e giro de outro casal não é tocado', async () => {
    const a = await newSpace();
    const spin = (await request(app).post('/api/cozinha/girar').set('Cookie', a.cookie).send({})).body;
    expect((await request(app).post(`/api/cozinha/spins/${spin.spinId}/desfecho`).set('Cookie', a.cookie)
      .send({ desfecho: 'inventado' })).status).toBe(400);
    const b = await newSpace();
    expect((await request(app).post(`/api/cozinha/spins/${spin.spinId}/desfecho`).set('Cookie', b.cookie)
      .send({ desfecho: 'cozinhou' })).status).toBe(404);
  });

  it('o par vê a sugestão que ainda está de pé', async () => {
    const criador = await newSpace();
    const invite = (await request(app).post(`/api/couples/${criador.couple.id}/invites`).set('Cookie', criador.cookie)).body.invite;
    const par = await login('par-cozinha@b.com');
    await request(app).post(`/api/invites/${invite.code}/accept`).set('Cookie', par);

    const meu = (await request(app).post('/api/cozinha/girar').set('Cookie', criador.cookie).send({})).body;
    const visao = await request(app).get('/api/cozinha').set('Cookie', par);
    expect(visao.body.parSugeriu.receita.id).toBe(meu.receita.id);
    // e quem sorteou não vê a própria sugestão como "do par"
    expect((await request(app).get('/api/cozinha').set('Cookie', criador.cookie)).body.parSugeriu).toBe(null);
  });
});

/* ── Despensa e foto ── */
describe('despensa', () => {
  it('aceita vários itens de uma vez e normaliza', async () => {
    const { cookie, couple } = await newSpace();
    await request(app).post('/api/despensa').set('Cookie', cookie).send({ itens: ['Ovos', 'cebolas', 'ovo'] });
    const itens = db.listPantry(couple.id);
    // "Ovos" e "ovo" são o mesmo item: não duplica
    expect(itens.map((i) => i.canonico).sort()).toEqual(['cebola', 'ovo']);
    expect(itens[0].eventos.length).toBeGreaterThan(0); // entrar já conta como "comprou"
  });

  it('limite do grátis é aplicado e o premium não tem', async () => {
    const { cookie, couple } = await newSpace();
    const muitos = Array.from({ length: 16 }, (_, i) => `item${i}`);
    const barrado = await request(app).post('/api/despensa').set('Cookie', cookie).send({ itens: muitos });
    expect(barrado.status).toBe(402);
    expect(barrado.body.limite).toBe('despensa');

    premium(couple.id);
    expect((await request(app).post('/api/despensa').set('Cookie', cookie).send({ itens: muitos })).status).toBe(200);
  });

  it('foto sem IA cai no modo manual, sem quebrar', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { cookie } = await newSpace();
    const png = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000100ffff03000006000557bfabd40000000049454e44ae426082',
      'hex',
    );
    const res = await request(app).post('/api/cozinha/foto').set('Cookie', cookie).attach('foto', png, 'g.png');
    expect(res.status).toBe(200);
    expect(res.body.visaoDisponivel).toBe(false);
    expect(res.body.modoManual).toBe(true);
    expect(res.body.sessaoId).toBeTruthy();
  });

  it('confirmação é o que entra na despensa — e devolve três ângulos', async () => {
    const { cookie, couple } = await newSpace();
    const sessao = db.createPhotoSession(couple.id, [{ nome: 'ovo', confianca: 0.9 }, { nome: 'jacaré', confianca: 0.2 }]);
    const res = await request(app).post(`/api/cozinha/foto/${sessao.id}/confirmar`).set('Cookie', cookie)
      .send({ itens: ['ovo', 'macarrão', 'bacon'] });

    expect(res.body.itens.map((i) => i.canonico).sort()).toEqual(['bacon', 'macarrao', 'ovo']);
    // o item duvidoso desmarcado não entrou
    expect(res.body.itens.some((i) => i.canonico === 'jacare')).toBe(false);
    expect(res.body.opcoes.length).toBeGreaterThanOrEqual(2);
    expect(new Set(res.body.opcoes.map((o) => o.receita.id)).size).toBe(res.body.opcoes.length);
    expect(res.body.opcoes[0].angulo).toBe('A mais rápida');
  });
});

/* ── Lista de mercado que aprende ── */
describe('lista de mercado', () => {
  const HOJE = new Date('2026-07-29T20:00:00');
  const diasAtras = (n) => new Date(HOJE.getTime() - n * 86_400_000).toISOString();
  const item = (canonico, eventos, extra = {}) => ({ id: 1, name: canonico, canonico, eventos, ...extra });

  it('palpite no dia 1, ritmo depois', () => {
    expect(estimarCadencia(item('leite', []))).toEqual({ dias: 4, confianca: 0, fonte: 'padrao' });
    const compras = [24, 16, 8, 0].map((d) => ({ tipo: 'comprou', em: diasAtras(d) }));
    const c = estimarCadencia(item('leite', compras));
    expect(c.fonte).toBe('compras');
    expect(c.dias).toBeGreaterThan(4);
  });

  it('mediana ignora compra atípica e "acabou" vale mais que "comprou"', () => {
    expect(mediana([5, 6, 60, 5])).toBe(5.5);
    const eventos = [
      { tipo: 'comprou', em: diasAtras(30) }, { tipo: 'acabou', em: diasAtras(24) },
      { tipo: 'comprou', em: diasAtras(20) }, { tipo: 'acabou', em: diasAtras(14) },
      { tipo: 'comprou', em: diasAtras(10) }, { tipo: 'acabou', em: diasAtras(4) },
    ];
    const c = estimarCadencia(item('cafe', eventos));
    expect(c.fonte).toBe('consumo');
    expect(c.dias).toBeLessThan(20);
  });

  it('só entra na lista quem está no fim, com o motivo', () => {
    expect(listaDoDia([item('arroz', [{ tipo: 'comprou', em: diasAtras(2) }])], { hoje: HOJE })).toHaveLength(0);
    const lista = listaDoDia([item('leite', [{ tipo: 'comprou', em: diasAtras(6) }])], { hoje: HOJE });
    expect(lista[0].urgencia).toBe('acabando');
    expect(lista[0].motivo).toContain('costuma durar');
  });

  it('"ainda temos" ensina e para de cobrar', () => {
    const antes = item('arroz', [{ tipo: 'comprou', em: diasAtras(31) }]);
    expect(listaDoDia([antes], { hoje: HOJE })).toHaveLength(1);
    const depois = { ...antes, cadencia_dias: cadenciaAposFeedback(antes, 'ainda-tenho') };
    expect(estimarCadencia(depois).dias).toBeGreaterThan(estimarCadencia(antes).dias);
    expect(listaDoDia([depois], { hoje: HOJE })).toHaveLength(0);
  });

  it('cozinhar mais antecipa a lista; hábito de mercado só com concentração', () => {
    const itens = [item('ovo', [{ tipo: 'comprou', em: diasAtras(9) }])];
    expect(listaDoDia(itens, { hoje: HOJE, cozinhadasUltimos7: 3, mediaSemanal: 3 })).toHaveLength(0);
    expect(listaDoDia(itens, { hoje: HOJE, cozinhadasUltimos7: 6, mediaSemanal: 3 })).toHaveLength(1);
    expect(fatorDeRitmo(6, 3)).toBeCloseTo(0.6);

    const sabados = [1, 8, 15, 22].map((d) => ({ tipo: 'comprou', em: new Date(`2026-08-${String(d).padStart(2, '0')}T10:00:00`).toISOString() }));
    expect(diaPreferidoDeCompra([item('feira', sabados)])).toBe(6);
    expect(diaPreferidoDeCompra([item('leite', [{ tipo: 'comprou', em: diasAtras(1) }])])).toBeNull();
  });

  it('pelas rotas: acabou entra na hora, "ainda temos" sai da lista', async () => {
    const { cookie, couple } = await newSpace();
    await request(app).post('/api/despensa').set('Cookie', cookie).send({ itens: ['detergente'] });
    const id = db.listPantry(couple.id)[0].id;

    await request(app).post(`/api/despensa/${id}/feedback`).set('Cookie', cookie).send({ tipo: 'acabou' });
    let sug = (await request(app).get('/api/mercado/sugestoes').set('Cookie', cookie)).body.sugestoes;
    expect(sug[0].nome).toBe('detergente');
    expect(sug[0].urgencia).toBe('acabou');

    await request(app).post(`/api/despensa/${id}/feedback`).set('Cookie', cookie).send({ tipo: 'comprou' });
    sug = (await request(app).get('/api/mercado/sugestoes').set('Cookie', cookie)).body.sugestoes;
    expect(sug).toHaveLength(0);
  });

  it('"não compro mais" silencia pra sempre', async () => {
    const { cookie, couple } = await newSpace();
    await request(app).post('/api/despensa').set('Cookie', cookie).send({ itens: ['iogurte'] });
    const id = db.listPantry(couple.id)[0].id;
    await request(app).post(`/api/despensa/${id}/feedback`).set('Cookie', cookie).send({ tipo: 'nao-compro-mais' });
    expect(db.pantryItem(couple.id, id).silenciado).toBe(true);
    expect((await request(app).get('/api/mercado/sugestoes').set('Cookie', cookie)).body.sugestoes).toHaveLength(0);
  });
});

describe('isolamento entre casais', () => {
  it('despensa e receitas de um casal não vazam pro outro', async () => {
    const a = await newSpace();
    await request(app).post('/api/despensa').set('Cookie', a.cookie).send({ itens: ['caviar'] });
    const b = await newSpace();
    expect((await request(app).get('/api/despensa').set('Cookie', b.cookie)).body.itens).toHaveLength(0);
    const id = db.listPantry(a.couple.id)[0].id;
    expect((await request(app).delete(`/api/despensa/${id}`).set('Cookie', b.cookie)).status).toBe(404);
  });
});
