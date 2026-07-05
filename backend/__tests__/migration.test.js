import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { createDb } from '../db.js';

// Reproduz o banco do produto ANTIGO em produção: tabela `users` sem as colunas
// `onboarding` e `terms_accepted_at`. CREATE TABLE IF NOT EXISTS não altera a
// tabela existente, então sem migração o UPDATE quebra (causa do HTTP 500).
let file;
afterEach(() => { if (file && fs.existsSync(file)) fs.rmSync(file, { force: true }); });

describe('migração de banco antigo', () => {
  it('adiciona onboarding e terms_accepted_at a uma tabela users legada', () => {
    file = path.join(os.tmpdir(), `chamego-mig-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    const raw = new Database(file);
    raw.prepare(`CREATE TABLE users (
      email TEXT PRIMARY KEY,
      name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      picture TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )`).run();
    raw.prepare(`INSERT INTO users (email, name) VALUES ('velho@b.com', 'Velho')`).run();
    raw.close();

    const db = createDb(file);
    db.upsertUser({ email: 'velho@b.com' });
    expect(() => db.updateUser('velho@b.com', { termsAccepted: true, onboarding: { goal: 'rotina' } })).not.toThrow();
    const u = db.getUser('velho@b.com');
    expect(u.terms_accepted_at).toBeTruthy();
    expect(JSON.parse(u.onboarding).goal).toBe('rotina');
    expect(u.name).toBe('Velho'); // dados antigos preservados
  });
});
