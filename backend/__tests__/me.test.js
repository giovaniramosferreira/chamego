import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../db.js';

async function login(email) {
  await request(app).post('/api/auth/magic-link').send({ email });
  const token = db._rawLoginToken(email);
  const res = await request(app).get(`/api/auth/magic?t=${token}`);
  return res.headers['set-cookie'][0].split(';')[0];
}

describe('PATCH /api/me', () => {
  it('exige login', async () => {
    expect((await request(app).patch('/api/me').send({ name: 'X' })).status).toBe(401);
  });

  it('grava nome, onboarding e aceite de termos', async () => {
    const cookie = await login('patch@b.com');
    const res = await request(app).patch('/api/me').set('Cookie', cookie)
      .send({ name: 'Mariana', onboarding: { goal: 'conexao', stage: 'namorando', alone: 'convidar' }, acceptTerms: true });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Mariana');
    expect(res.body.user.onboarding.goal).toBe('conexao');
    expect(res.body.user.termsAcceptedAt).toBeTruthy();
  });

  it('onboarding só aceita chaves conhecidas', async () => {
    const cookie = await login('patch2@b.com');
    const res = await request(app).patch('/api/me').set('Cookie', cookie)
      .send({ onboarding: { goal: 'rotina', hack: 'xss' } });
    expect(res.body.user.onboarding).toEqual({ goal: 'rotina' });
  });
});
