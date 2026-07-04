import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../db.js';

async function login(email = 'a@b.com') {
  await request(app).post('/api/auth/magic-link').send({ email });
  const token = db._rawLoginToken(email);
  const res = await request(app).get(`/api/auth/magic?t=${token}`);
  const cookie = res.headers['set-cookie'][0].split(';')[0];
  return cookie;
}

describe('auth', () => {
  it('magic-link: valida email e cria token', async () => {
    const bad = await request(app).post('/api/auth/magic-link').send({ email: 'nao-eh-email' });
    expect(bad.status).toBe(400);
    const ok = await request(app).post('/api/auth/magic-link').send({ email: 'novo@b.com' });
    expect(ok.body.sent).toBe(true);
    expect(db._rawLoginToken('novo@b.com')).toBeTruthy();
  });

  it('magic-link: rate limit de 1 por minuto por email', async () => {
    await request(app).post('/api/auth/magic-link').send({ email: 'rate@b.com' });
    const again = await request(app).post('/api/auth/magic-link').send({ email: 'rate@b.com' });
    expect(again.status).toBe(429);
  });

  it('clique no link loga (cookie) e redireciona para /app', async () => {
    await request(app).post('/api/auth/magic-link').send({ email: 'c@b.com' });
    const token = db._rawLoginToken('c@b.com');
    const res = await request(app).get(`/api/auth/magic?t=${token}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/app');
    expect(res.headers['set-cookie'][0]).toContain('chamego_session=');
  });

  it('link inválido redireciona com erro', async () => {
    const res = await request(app).get('/api/auth/magic?t=lixo');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/entrar?erro=link-invalido');
  });

  it('GET /api/me: 401 sem sessão, dados com sessão', async () => {
    expect((await request(app).get('/api/me')).status).toBe(401);
    const cookie = await login('me@b.com');
    const res = await request(app).get('/api/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@b.com');
    expect(res.body.couple).toBeNull();
  });

  it('logout limpa a sessão', async () => {
    const cookie = await login('out@b.com');
    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(res.body.ok).toBe(true);
    expect(res.headers['set-cookie'][0]).toMatch(/chamego_session=;/);
  });
});
