import { it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../db.js';

beforeEach(() => {
  process.env.MP_ACCESS_TOKEN = 'TEST-token';
  db.savePage({ slug: 'casal-pix', data: { titulo: 'C & P' }, status: 'draft' });
});

it('cria pagamento pix e retorna qr', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({
    id: 555, status: 'pending',
    point_of_interaction: { transaction_data: { qr_code: 'copia-cola', qr_code_base64: 'aGVsbG8=' } },
  }) }));
  const res = await request(app).post('/api/payments').send({ slug: 'casal-pix', email: 'a@b.c' });
  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ paymentId: '555', qrCode: 'copia-cola', qrCodeBase64: 'aGVsbG8=' });
});

it('webhook aprovado publica página', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({
    id: 555, status: 'approved', external_reference: 'casal-pix',
  }) }));
  const res = await request(app).post('/api/webhooks/mercadopago').send({ type: 'payment', data: { id: 555 } });
  expect(res.status).toBe(200);
  expect(db.getPageBySlug('casal-pix').status).toBe('published');
});
