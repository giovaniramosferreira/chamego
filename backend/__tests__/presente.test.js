// Presente: quem paga não é quem usa. O que precisa ser inquebrável é o
// resgate — um código vale uma vez, soma meses e não pode ser adivinhado.
import { describe, it, expect } from 'vitest';
import request from 'supertest';

process.env.ADMIN_KEY = process.env.ADMIN_KEY || 'chave-de-teste';

import { app } from '../server.js';
import { db, generateGiftCode } from '../db.js';

let seq = 0;
async function login(email) {
  await request(app).post('/api/auth/magic-link').send({ email });
  const token = db._rawLoginToken(email);
  const res = await request(app).get(`/api/auth/magic?t=${token}`);
  return res.headers['set-cookie'][0].split(';')[0];
}
async function newSpace() {
  const email = `presente${seq++}@b.com`;
  const cookie = await login(email);
  const res = await request(app).post('/api/couples').set('Cookie', cookie)
    .send({ name: 'Nós', milestoneDate: '2024-01-01', seed: false });
  return { cookie, email, couple: res.body.couple };
}
const criarCodigo = (body = {}) => request(app).post('/api/admin/gift-codes')
  .set('x-admin-key', process.env.ADMIN_KEY).send({ months: 3, ...body });

describe('códigos de presente', () => {
  it('emite códigos de parceria só com ADMIN_KEY', async () => {
    expect((await request(app).post('/api/admin/gift-codes').send({ months: 3 })).status).toBe(403);
    const res = await criarCodigo({ quantity: 3, buyerName: 'Foto Studio' });
    expect(res.body.codes).toHaveLength(3);
    expect(res.body.codes[0]).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  });

  it('código é longo o bastante para não ser adivinhado', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateGiftCode()));
    expect(codes.size).toBe(200); // sem colisão em 200 sorteios
  });

  it('prévia mostra tempo, remetente e recado; código inexistente dá 404', async () => {
    const { codes } = (await criarCodigo({ months: 12, buyerName: 'Tia Lu', message: 'Que venham muitos dias' })).body;
    const res = await request(app).get(`/api/gift/${codes[0]}`);
    expect(res.body.gift).toMatchObject({ months: 12, status: 'paid', from: 'Tia Lu', message: 'Que venham muitos dias' });
    expect((await request(app).get('/api/gift/ABCDE-FGHIJ')).status).toBe(404);
  });
});

describe('resgate', () => {
  it('libera o premium e some do estoque', async () => {
    const { cookie, couple } = await newSpace();
    const { codes } = (await criarCodigo({ months: 3 })).body;

    expect(db.getSubscription(couple.id).plan).toBe('free');
    const res = await request(app).post(`/api/gift/${codes[0]}/redeem`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.months).toBe(3);

    const sub = db.getSubscription(couple.id);
    expect(sub.plan).toBe('premium');
    expect(sub.gifted).toBe(true);
    // ~3 meses à frente
    const dias = (new Date(sub.gift_until) - Date.now()) / 86_400_000;
    expect(dias).toBeGreaterThan(85);
    expect(dias).toBeLessThan(95);

    // e o limite do grátis deixa de barrar
    expect((await request(app).post('/api/albums').set('Cookie', cookie).send({ title: 'Um' })).status).toBe(200);
    expect((await request(app).post('/api/albums').set('Cookie', cookie).send({ title: 'Dois' })).status).toBe(200);
  });

  it('cada código vale uma vez, para qualquer casal', async () => {
    const a = await newSpace();
    const b = await newSpace();
    const { codes } = (await criarCodigo()).body;
    expect((await request(app).post(`/api/gift/${codes[0]}/redeem`).set('Cookie', a.cookie)).status).toBe(200);
    expect((await request(app).post(`/api/gift/${codes[0]}/redeem`).set('Cookie', a.cookie)).status).toBe(409);
    expect((await request(app).post(`/api/gift/${codes[0]}/redeem`).set('Cookie', b.cookie)).status).toBe(409);
    expect(db.getSubscription(b.couple.id).plan).toBe('free');
  });

  it('presentes se acumulam em vez de encurtar o que já valia', async () => {
    const { cookie, couple } = await newSpace();
    const um = (await criarCodigo({ months: 3 })).body.codes[0];
    const dois = (await criarCodigo({ months: 6 })).body.codes[0];
    await request(app).post(`/api/gift/${um}/redeem`).set('Cookie', cookie);
    await request(app).post(`/api/gift/${dois}/redeem`).set('Cookie', cookie);
    const dias = (new Date(db.getSubscription(couple.id).gift_until) - Date.now()) / 86_400_000;
    expect(dias).toBeGreaterThan(265); // ~9 meses
  });

  it('o webhook da assinatura não apaga os meses presenteados', async () => {
    const { cookie, couple } = await newSpace();
    const code = (await criarCodigo({ months: 12 })).body.codes[0];
    await request(app).post(`/api/gift/${code}/redeem`).set('Cookie', cookie);
    // assinatura paga entra e depois é cancelada e vence
    db.saveSubscription(couple.id, { status: 'active', provider: 'stripe', currentPeriodEnd: '2020-01-01T00:00:00.000Z' });
    expect(db.getSubscription(couple.id).plan).toBe('premium'); // segue pelo presente
    expect(db.getSubscription(couple.id).gifted).toBe(true);
  });

  it('sem espaço do casal não dá pra resgatar', async () => {
    const cookie = await login('semespaco-presente@b.com');
    const code = (await criarCodigo()).body.codes[0];
    expect((await request(app).post(`/api/gift/${code}/redeem`).set('Cookie', cookie)).status).toBe(409);
    expect((await request(app).get(`/api/gift/${code}`)).body.gift.status).toBe('paid'); // não consumiu
  });

  it('resgate aceita o código com ou sem hífen e em minúsculas', async () => {
    const { cookie } = await newSpace();
    const code = (await criarCodigo()).body.codes[0];
    const semHifen = code.replace('-', '').toLowerCase();
    expect((await request(app).post(`/api/gift/${semHifen}/redeem`).set('Cookie', cookie)).status).toBe(200);
  });
});

describe('compra do presente', () => {
  it('sem provedor configurado responde 503 e a página segue de pé', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect((await request(app).post('/api/gift/checkout').send({ months: 12 })).status).toBe(503);
    const res = await request(app).get('/api/gift');
    expect(res.status).toBe(200);
    expect(res.body.billingEnabled).toBe(false);
  });
});
