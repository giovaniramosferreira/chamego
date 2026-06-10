import { describe, it, expect, beforeEach } from 'vitest';
import { createDb } from '../db.js';

describe('db', () => {
  let db;
  beforeEach(() => { db = createDb(':memory:'); });

  it('salva e lê rascunho por slug', () => {
    db.savePage({ slug: 'a-e-b', data: { titulo: 'A & B' }, status: 'draft' });
    const p = db.getPageBySlug('a-e-b');
    expect(p.status).toBe('draft');
    expect(p.data.titulo).toBe('A & B');
  });

  it('publica página', () => {
    db.savePage({ slug: 'a-e-b', data: {}, status: 'draft' });
    db.publishPage('a-e-b');
    expect(db.getPageBySlug('a-e-b').status).toBe('published');
  });

  it('gera slug único com colisão', () => {
    db.savePage({ slug: 'a-e-b', data: {}, status: 'draft' });
    expect(db.uniqueSlug('A & B')).toBe('a-e-b-2');
  });

  it('registra pagamento e acha por id', () => {
    db.savePayment({ id: '123', slug: 'a-e-b', status: 'pending', amount: 19.9 });
    expect(db.getPayment('123').slug).toBe('a-e-b');
  });
});
