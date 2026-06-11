import { it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../db.js';

it('página expirada retorna 410', async () => {
  db.savePage({ slug: 'casal-expirado', data: { titulo: 'A & B', dataExpiracao: '2020-01-01' }, status: 'draft' });
  db.publishPage('casal-expirado');
  const res = await request(app).get('/api/pages/casal-expirado');
  expect(res.status).toBe(410);
  expect(res.body.expired).toBe(true);
});

it('página com expiração futura abre normal', async () => {
  db.savePage({ slug: 'casal-vivo', data: { titulo: 'A & B', dataExpiracao: '2099-01-01' }, status: 'draft' });
  db.publishPage('casal-vivo');
  const res = await request(app).get('/api/pages/casal-vivo');
  expect(res.status).toBe(200);
});
