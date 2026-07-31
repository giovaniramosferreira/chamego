// A agenda que dá conta de conta de luz, faxina de terça e consulta médica.
// O que não pode quebrar: marcar uma ocorrência não pode marcar a série, o
// fechamento do mês tem que bater com o que foi pago de fato, e o valor de um
// casal não pode aparecer pro outro.
import { describe, it, expect } from 'vitest';
import request from 'supertest';

process.env.ADMIN_KEY = process.env.ADMIN_KEY || 'chave-de-teste';

import { app } from '../server.js';
import { db } from '../db.js';

let seq = 0;
async function login(email) {
  await request(app).post('/api/auth/magic-link').send({ email });
  const token = db._rawLoginToken(email);
  const res = await request(app).get(`/api/auth/magic?t=${token}`);
  return res.headers['set-cookie'][0].split(';')[0];
}
async function newSpace() {
  const email = `agenda${seq++}@b.com`;
  const cookie = await login(email);
  const res = await request(app).post('/api/couples').set('Cookie', cookie)
    .send({ name: 'Nós', milestoneDate: '2024-01-01', seed: false });
  return { cookie, email, couple: res.body.couple };
}
const criar = (cookie, dados) => request(app).post('/api/events').set('Cookie', cookie).send(dados);

const aluguel = {
  title: 'Aluguel', date: '2026-01-05', kind: 'conta',
  recurrence: 'monthly', amount: 180_000, payee: 'Imobiliária',
};

describe('eventos com tipo, repetição e valor', () => {
  it('guarda tudo o que a nova agenda pergunta', async () => {
    const { cookie } = await newSpace();
    const res = await criar(cookie, { ...aluguel, estimated: true, installments: 12 });
    expect(res.status).toBe(200);
    expect(res.body.event).toMatchObject({
      kind: 'conta', recurrence: 'monthly', amount: 180_000, payee: 'Imobiliária', estimated: 1, installments: 12,
    });
  });

  it('tipo e frequência inventados caem no padrão em vez de entrar', async () => {
    const { cookie } = await newSpace();
    const res = await criar(cookie, { title: 'X', date: '2026-01-05', kind: 'cripto', recurrence: 'a cada lua' });
    expect(res.body.event.kind).toBe('evento');
    expect(res.body.event.recurrence).toBe('');
  });

  // O updateEvent antigo só sabia mexer em cinco campos: editar a hora apagava
  // silenciosamente o resto. Este teste existe pra isso não voltar.
  it('editar um campo não apaga os outros', async () => {
    const { cookie } = await newSpace();
    const { body } = await criar(cookie, aluguel);
    const res = await request(app).patch(`/api/events/${body.event.id}`).set('Cookie', cookie)
      .send({ time: '09:00' });
    expect(res.body.event).toMatchObject({
      time: '09:00', kind: 'conta', recurrence: 'monthly', amount: 180_000, payee: 'Imobiliária',
    });
  });
});

describe('a agenda como lista de ocorrências', () => {
  it('um aluguel no banco vira doze linhas no ano', async () => {
    const { cookie } = await newSpace();
    await criar(cookie, aluguel);
    const res = await request(app).get('/api/agenda?de=2026-01-01&ate=2026-12-31').set('Cookie', cookie);
    expect(res.body.ocorrencias).toHaveLength(12);
    expect(res.body.ocorrencias[0]).toMatchObject({ date: '2026-01-05', recorrencia: 'Todo mês · dia 5', done: false });
  });

  it('vem em ordem de data, e sem hora fica por último no dia', async () => {
    const { cookie } = await newSpace();
    await criar(cookie, { title: 'Sem hora', date: '2026-03-10' });
    await criar(cookie, { title: 'Consulta', date: '2026-03-10', time: '09:00' });
    await criar(cookie, { title: 'Antes', date: '2026-03-09' });
    const res = await request(app).get('/api/agenda?de=2026-03-01&ate=2026-03-31').set('Cookie', cookie);
    expect(res.body.ocorrencias.map((o) => o.title)).toEqual(['Antes', 'Consulta', 'Sem hora']);
  });

  it('janela invertida é recusada', async () => {
    const { cookie } = await newSpace();
    const res = await request(app).get('/api/agenda?de=2026-05-01&ate=2026-04-01').set('Cookie', cookie);
    expect(res.status).toBe(400);
  });
});

describe('marcar uma ocorrência', () => {
  it('paga um mês sem pagar o ano inteiro', async () => {
    const { cookie } = await newSpace();
    const { body } = await criar(cookie, aluguel);

    await request(app).post(`/api/agenda/${body.event.id}/2026-02-05`).set('Cookie', cookie).send({});
    const res = await request(app).get('/api/agenda?de=2026-01-01&ate=2026-04-30').set('Cookie', cookie);
    const feitas = res.body.ocorrencias.filter((o) => o.done).map((o) => o.date);
    expect(feitas).toEqual(['2026-02-05']);
  });

  it('vale o que foi pago, não o que se estimou', async () => {
    const { cookie, email } = await newSpace();
    const { body } = await criar(cookie, { ...aluguel, estimated: true });
    const res = await request(app).post(`/api/agenda/${body.event.id}/2026-01-05`).set('Cookie', cookie)
      .send({ amount: 195_000 });
    expect(res.body.ocorrencias[0]).toMatchObject({ done: true, paidAmount: 195_000, doneBy: email });
  });

  it('desmarcar volta atrás', async () => {
    const { cookie } = await newSpace();
    const { body } = await criar(cookie, aluguel);
    await request(app).post(`/api/agenda/${body.event.id}/2026-01-05`).set('Cookie', cookie).send({});
    const res = await request(app).post(`/api/agenda/${body.event.id}/2026-01-05`).set('Cookie', cookie)
      .send({ done: false });
    expect(res.body.ocorrencias[0].done).toBe(false);
  });

  it('não dá pra marcar um dia em que o evento não acontece', async () => {
    const { cookie } = await newSpace();
    const { body } = await criar(cookie, aluguel);
    const res = await request(app).post(`/api/agenda/${body.event.id}/2026-01-07`).set('Cookie', cookie).send({});
    expect(res.status).toBe(400);
  });

  it('apagar o evento leva junto o histórico de ocorrências', async () => {
    const { cookie, couple } = await newSpace();
    const { body } = await criar(cookie, aluguel);
    await request(app).post(`/api/agenda/${body.event.id}/2026-01-05`).set('Cookie', cookie).send({});
    await request(app).delete(`/api/events/${body.event.id}`).set('Cookie', cookie);
    expect(db.ocorrenciasFeitas(couple.id, '2026-01-01', '2026-12-31')).toEqual([]);
  });
});

describe('fechamento do mês', () => {
  it('soma o mês, separa o que já foi pago e mostra pra onde o dinheiro vai', async () => {
    const { cookie } = await newSpace();
    const { body: a } = await criar(cookie, aluguel);
    await criar(cookie, { title: 'Diarista', date: '2026-01-08', kind: 'conta', recurrence: 'weekly', amount: 15_000, payee: 'Diarista' });
    // Tarefa de casa entra na agenda, mas não na conta do mês.
    await criar(cookie, { title: 'Lavar roupa', date: '2026-01-06', kind: 'casa', recurrence: 'weekly' });

    await request(app).post(`/api/agenda/${a.event.id}/2026-01-05`).set('Cookie', cookie).send({ amount: 185_000 });

    const res = await request(app).get('/api/contas?mes=2026-01').set('Cookie', cookie);
    // Janeiro de 2026: 5 quintas (8, 15, 22, 29) = 4 diaristas + 1 aluguel.
    expect(res.body.contas).toHaveLength(5);
    expect(res.body.pago).toBe(185_000);
    expect(res.body.aberto).toBe(4 * 15_000);
    expect(res.body.total).toBe(185_000 + 4 * 15_000);
    expect(res.body.porDestino[0]).toMatchObject({ destino: 'Imobiliária', total: 185_000, pago: 185_000 });
    expect(res.body.porDestino[1]).toMatchObject({ destino: 'Diarista', quantos: 4, pago: 0 });
  });

  it('conta sem valor não entra na soma', async () => {
    const { cookie } = await newSpace();
    await criar(cookie, { title: 'Conta sem valor', date: '2026-02-10', kind: 'conta' });
    const res = await request(app).get('/api/contas?mes=2026-02').set('Cookie', cookie);
    expect(res.body.contas).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('avisa quando o total tem estimativa dentro', async () => {
    const { cookie } = await newSpace();
    await criar(cookie, { title: 'Luz', date: '2026-02-10', kind: 'conta', amount: 20_000, estimated: true });
    const res = await request(app).get('/api/contas?mes=2026-02').set('Cookie', cookie);
    expect(res.body.temEstimativa).toBe(true);
  });
});

describe('escopo do casal', () => {
  it('a conta de um casal não aparece nem é marcável pelo outro', async () => {
    const casaA = await newSpace();
    const casaB = await newSpace();
    const { body } = await criar(casaA.cookie, aluguel);

    const listaB = await request(app).get('/api/agenda?de=2026-01-01&ate=2026-12-31').set('Cookie', casaB.cookie);
    expect(listaB.body.ocorrencias).toEqual([]);

    const marcarB = await request(app).post(`/api/agenda/${body.event.id}/2026-01-05`).set('Cookie', casaB.cookie).send({});
    expect(marcarB.status).toBe(404);

    const contasB = await request(app).get('/api/contas?mes=2026-01').set('Cookie', casaB.cookie);
    expect(contasB.body.total).toBe(0);
  });
});
