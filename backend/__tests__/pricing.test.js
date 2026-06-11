import { it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { getPricing } from '../payments.js';

beforeEach(() => { delete process.env.DISCOUNT_PERCENT; });

it('sem desconto: preço cheio', () => {
  expect(getPricing()).toEqual({ precoCheio: 19.9, descontoPercent: 0, precoFinal: 19.9 });
});

it('50% de desconto: 9,95', () => {
  process.env.DISCOUNT_PERCENT = '50';
  expect(getPricing().precoFinal).toBe(9.95);
});

it('valores inválidos viram 0; >100 vira 100', () => {
  process.env.DISCOUNT_PERCENT = 'abc';
  expect(getPricing().descontoPercent).toBe(0);
  process.env.DISCOUNT_PERCENT = '150';
  expect(getPricing()).toMatchObject({ descontoPercent: 100, precoFinal: 0 });
});

it('GET /api/config expõe o preço vigente', async () => {
  process.env.DISCOUNT_PERCENT = '50';
  const res = await request(app).get('/api/config');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ precoCheio: 19.9, descontoPercent: 50, precoFinal: 9.95 });
});
