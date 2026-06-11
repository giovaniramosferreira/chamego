import { it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

it('cria rascunho com slug bonito e conteúdo IA (fallback)', async () => {
  const res = await request(app).post('/api/drafts').send({
    data: { titulo: 'Ana & Léo', dataInicio: '2023-01-10', mensagem: 'te amo' },
  });
  expect(res.status).toBe(200);
  expect(res.body.slug).toBe('ana-e-leo');
  expect(res.body.page.data.cartaDeAmor.length).toBeGreaterThan(50);
});

it('rascunho não abre como página pública', async () => {
  const res = await request(app).get('/api/pages/ana-e-leo');
  expect(res.status).toBe(403);
  expect(res.body.status).toBe('draft');
});
