import { it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../db.js';

beforeEach(() => {
  process.env.ADMIN_TOKEN = 'segredo-teste';
});

it('sem token correto: 404 (endpoint invisível)', async () => {
  expect((await request(app).get('/api/admin/overview')).status).toBe(404);
  expect((await request(app).get('/api/admin/overview?token=errado')).status).toBe(404);
  delete process.env.ADMIN_TOKEN;
  expect((await request(app).get('/api/admin/overview?token=segredo-teste')).status).toBe(404);
});

it('com token: lista páginas, pagamentos e totais', async () => {
  db.savePage({ slug: 'admin-pub', data: { titulo: 'A & B' }, status: 'draft' });
  db.publishPage('admin-pub');
  db.savePage({ slug: 'admin-draft', data: { titulo: 'C & D' }, status: 'draft' });
  db.savePayment({ id: 'adm-1', slug: 'admin-pub', status: 'approved', amount: 9.95 });

  const res = await request(app).get('/api/admin/overview?token=segredo-teste');
  expect(res.status).toBe(200);
  expect(res.body.totais.paginas).toBeGreaterThanOrEqual(2);
  expect(res.body.totais.pagamentosAprovados).toBeGreaterThanOrEqual(1);
  expect(res.body.totais.receita).toBeGreaterThanOrEqual(9.95);
  const pub = res.body.paginas.find(p => p.slug === 'admin-pub');
  expect(pub).toMatchObject({ titulo: 'A & B', status: 'published' });
});
