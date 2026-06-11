import { it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../db.js';

beforeEach(() => {
  process.env.COUPON_CODE = 'amigosdogigio';
});

it('cupom válido publica sem pagar (case/espacos ignorados)', async () => {
  db.savePage({ slug: 'casal-cupom', data: { titulo: 'C' }, status: 'draft' });
  const res = await request(app)
    .post('/api/coupons/redeem')
    .send({ slug: 'casal-cupom', code: '  AmigosDoGigio ' });
  expect(res.status).toBe(200);
  expect(res.body.published).toBe(true);
  expect(db.getPageBySlug('casal-cupom').status).toBe('published');
  expect(db.getPayment('coupon-casal-cupom').amount).toBe(0);
});

it('cupom errado falha', async () => {
  db.savePage({ slug: 'casal-cupom-2', data: { titulo: 'C' }, status: 'draft' });
  const res = await request(app)
    .post('/api/coupons/redeem')
    .send({ slug: 'casal-cupom-2', code: 'outro' });
  expect(res.status).toBe(400);
  expect(db.getPageBySlug('casal-cupom-2').status).toBe('draft');
});

it('sem COUPON_CODE configurado, qualquer cupom falha', async () => {
  delete process.env.COUPON_CODE;
  db.savePage({ slug: 'casal-cupom-3', data: { titulo: 'C' }, status: 'draft' });
  const res = await request(app)
    .post('/api/coupons/redeem')
    .send({ slug: 'casal-cupom-3', code: 'amigosdogigio' });
  expect(res.status).toBe(400);
});

it('rascunho inexistente retorna 404', async () => {
  const res = await request(app)
    .post('/api/coupons/redeem')
    .send({ slug: 'nao-existe', code: 'amigosdogigio' });
  expect(res.status).toBe(404);
});
