import { it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

it('busca de música retorna resultados mapeados', async () => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({
    results: [
      { trackId: 1, trackName: 'Perfect', artistName: 'Ed Sheeran', artworkUrl60: 'http://a/1.jpg', previewUrl: 'http://p/1.m4a', extra: 'x' },
      { trackId: 2, trackName: 'Sem Preview', artistName: 'X', artworkUrl60: '', previewUrl: null },
    ],
  }) }));
  const res = await request(app).get('/api/music/search?q=perfect');
  expect(res.status).toBe(200);
  expect(res.body.results).toHaveLength(1);
  expect(res.body.results[0]).toEqual({
    trackId: 1, trackName: 'Perfect', artistName: 'Ed Sheeran',
    artworkUrl60: 'http://a/1.jpg', previewUrl: 'http://p/1.m4a',
  });
});

it('query curta retorna vazio sem chamar a Apple', async () => {
  global.fetch = vi.fn();
  const res = await request(app).get('/api/music/search?q=a');
  expect(res.status).toBe(200);
  expect(res.body.results).toEqual([]);
  expect(global.fetch).not.toHaveBeenCalled();
});
