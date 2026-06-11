import { it, expect, vi, beforeEach } from 'vitest';
import { buildRoteiro } from '../places.js';

const fakePlace = (name) => ({
  displayName: { text: name }, rating: 4.7, priceLevel: 'PRICE_LEVEL_MODERATE',
  googleMapsUri: 'https://maps.google.com/?cid=1',
  photos: [{ name: 'places/abc/photos/xyz' }], formattedAddress: 'Rua X, 1',
});

beforeEach(() => {
  process.env.GOOGLE_MAPS_API_KEY = 'test-key';
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ places: [fakePlace('Café Lindo')] }) }));
});

it('monta roteiro com seções dia e noite', async () => {
  const r = await buildRoteiro({ cidade: 'São Paulo', bairro: 'Pinheiros' });
  expect(r.dia.length).toBeGreaterThan(0);
  expect(r.noite.length).toBeGreaterThan(0);
  expect(r.dia[0]).toMatchObject({ nome: 'Café Lindo', nota: 4.7 });
  expect(r.dia[0].fotoUrl).toContain('/api/places/photo?name=');
});
