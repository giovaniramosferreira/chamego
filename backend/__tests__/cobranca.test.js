// Cobrança: o que separa grátis de pago, quem pode conceder acesso e o que
// acontece quando a assinatura acaba. Nada aqui chama a API do Stripe — o que
// testamos é a nossa regra, que é onde o dinheiro pode vazar.
import { describe, it, expect, beforeAll } from 'vitest';
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
  const email = `pago${seq++}@b.com`;
  const cookie = await login(email);
  const res = await request(app).post('/api/couples').set('Cookie', cookie)
    .send({ name: 'Nós', milestoneDate: '2024-01-01', seed: false });
  return { cookie, email, couple: res.body.couple };
}
const png = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000100ffff03000006000557bfabd40000000049454e44ae426082',
  'hex',
);
const criarCapsula = (cookie, titulo) => request(app).post('/api/time-capsules').set('Cookie', cookie)
  .field('title', titulo).field('openDate', '2030-01-01').field('message', 'oi');

describe('o que é grátis continua grátis', () => {
  it('agenda, listas, momentos sem foto, check-in e chat não têm trava', async () => {
    const { cookie } = await newSpace();
    expect((await request(app).post('/api/events').set('Cookie', cookie).send({ title: 'Date', date: '2030-01-01' })).status).toBe(200);
    const lista = await request(app).post('/api/lists').set('Cookie', cookie).send({ title: 'Mercado' });
    expect(lista.status).toBe(200);
    expect((await request(app).post(`/api/lists/${lista.body.list.id}/items`).set('Cookie', cookie).send({ text: 'Café' })).status).toBe(200);
    expect((await request(app).post('/api/moments').set('Cookie', cookie).field('text', 'Que dia bom')).status).toBe(200);
    expect((await request(app).post('/api/checkins').set('Cookie', cookie).send({ mood: 'bem' })).status).toBe(200);
    expect((await request(app).post('/api/messages').set('Cookie', cookie).send({ text: 'oi' })).status).toBe(200);
  });

  it('exportar os próprios dados nunca é recurso pago', async () => {
    const { cookie } = await newSpace();
    expect((await request(app).get('/api/export').set('Cookie', cookie)).status).toBe(200);
  });
});

describe('limites do plano grátis', () => {
  it('trava a 2ª cápsula além do limite e devolve 402 com upgrade', async () => {
    const { cookie, couple } = await newSpace();
    for (let i = 0; i < 3; i++) expect((await criarCapsula(cookie, `Carta ${i}`)).status).toBe(200);
    const barrada = await criarCapsula(cookie, 'Quarta');
    expect(barrada.status).toBe(402);
    expect(barrada.body.upgrade).toBe(true);
    expect(barrada.body.maximo).toBe(3);

    // com o teste grátis ligado, passa
    await request(app).post('/api/subscription/trial').set('Cookie', cookie).send({});
    expect((await criarCapsula(cookie, 'Quarta')).status).toBe(200);
    expect(db.getSubscription(couple.id).plan).toBe('premium');
  });

  it('álbum: um no grátis, ilimitado no pago', async () => {
    const { cookie, couple } = await newSpace();
    expect((await request(app).post('/api/albums').set('Cookie', cookie).send({ title: 'Verão' })).status).toBe(200);
    expect((await request(app).post('/api/albums').set('Cookie', cookie).send({ title: 'Inverno' })).status).toBe(402);

    db.saveSubscription(couple.id, { status: 'active', provider: 'stripe', currentPeriodEnd: '2099-01-01T00:00:00.000Z' });
    expect((await request(app).post('/api/albums').set('Cookie', cookie).send({ title: 'Inverno' })).status).toBe(200);
  });

  it('conta as fotos guardadas e mostra o uso na assinatura', async () => {
    const { cookie } = await newSpace();
    await request(app).post('/api/moments').set('Cookie', cookie).field('text', 'com foto').attach('photo', png, 'f.png');
    const res = await request(app).get('/api/subscription').set('Cookie', cookie);
    expect(res.body.usage.photos).toBe(1);
    expect(res.body.limits.photos).toBe(30);
    expect(res.body.subscription.plan).toBe('free');
  });
});

describe('quem pode conceder acesso', () => {
  it('ninguém libera premium sozinho pelo app', async () => {
    const { cookie } = await newSpace();
    const tentativa = await request(app).patch('/api/subscription').set('Cookie', cookie).send({ plan: 'premium' });
    expect(tentativa.status).toBe(403);
    expect((await request(app).get('/api/subscription').set('Cookie', cookie)).body.subscription.plan).toBe('free');
  });

  it('cortesia exige ADMIN_KEY e tem prazo', async () => {
    const { cookie } = await newSpace();
    const res = await request(app).patch('/api/subscription')
      .set('Cookie', cookie).set('x-admin-key', process.env.ADMIN_KEY).send({ plan: 'premium', days: 30 });
    expect(res.body.subscription.plan).toBe('premium');
    expect(new Date(res.body.subscription.current_period_end) > new Date()).toBe(true);
  });

  it('teste grátis vale uma vez por espaço', async () => {
    const { cookie } = await newSpace();
    expect((await request(app).post('/api/subscription/trial').set('Cookie', cookie)).status).toBe(200);
    expect((await request(app).post('/api/subscription/trial').set('Cookie', cookie)).status).toBe(409);
  });
});

describe('fim da assinatura', () => {
  it('período vencido volta pro grátis sem apagar conteúdo', async () => {
    const { cookie, couple } = await newSpace();
    await request(app).post('/api/albums').set('Cookie', cookie).send({ title: 'Um' });
    db.saveSubscription(couple.id, { status: 'active', provider: 'stripe', currentPeriodEnd: '2020-01-01T00:00:00.000Z' });

    expect(db.getSubscription(couple.id).plan).toBe('free');
    expect((await request(app).post('/api/albums').set('Cookie', cookie).send({ title: 'Dois' })).status).toBe(402);
    // o que já existe continua acessível
    expect((await request(app).get('/api/albums').set('Cookie', cookie)).body.albums).toHaveLength(1);
  });

  it('cancelado mas dentro do período pago continua premium', async () => {
    const { couple } = await newSpace();
    db.saveSubscription(couple.id, { status: 'canceled', provider: 'stripe', currentPeriodEnd: '2099-01-01T00:00:00.000Z', cancelAtPeriodEnd: true });
    expect(db.getSubscription(couple.id).plan).toBe('premium');
  });

  it('teste vencido não vale mais', async () => {
    const { couple } = await newSpace();
    db.saveSubscription(couple.id, { status: 'trialing', provider: 'trial', trialEndsAt: '2020-01-01T00:00:00.000Z' });
    expect(db.getSubscription(couple.id).plan).toBe('free');
  });
});

describe('webhook e funil', () => {
  it('webhook sem assinatura válida não muda nada', async () => {
    const { couple } = await newSpace();
    const res = await request(app).post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ type: 'checkout.session.completed', data: { object: { metadata: { couple_id: String(couple.id) } } } }));
    expect(res.status).toBeGreaterThanOrEqual(400); // 400 assinatura inválida, 503 sem segredo
    expect(db.getSubscription(couple.id).plan).toBe('free');
  });

  it('métricas do funil exigem ADMIN_KEY e contam espaços e testes', async () => {
    const { cookie } = await newSpace();
    await request(app).post('/api/subscription/trial').set('Cookie', cookie).send({});
    await request(app).post('/api/track').set('Cookie', cookie).send({ name: 'paywall_visto', origem: 'quiz' });
    expect((await request(app).post('/api/track').set('Cookie', cookie).send({ name: 'evento_inventado' })).status).toBe(400);

    expect((await request(app).get('/api/admin/metrics')).status).toBe(403);
    const m = await request(app).get('/api/admin/metrics').set('x-admin-key', process.env.ADMIN_KEY);
    expect(m.body.espacos).toBeGreaterThan(0);
    expect(m.body.emTeste).toBeGreaterThan(0);
    expect(m.body.eventos.find((e) => e.name === 'paywall_visto').c).toBeGreaterThan(0);
  });
});

describe('checkout', () => {
  beforeAll(() => { delete process.env.STRIPE_SECRET_KEY; });

  it('sem provedor configurado responde 503, sem quebrar o app', async () => {
    const { cookie } = await newSpace();
    const res = await request(app).post('/api/billing/checkout').set('Cookie', cookie).send({ plan: 'mensal' });
    expect(res.status).toBe(503);
    const info = await request(app).get('/api/subscription').set('Cookie', cookie);
    expect(info.body.billingEnabled).toBe(false);
    expect(info.status).toBe(200);
  });
});
