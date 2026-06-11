import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

export function slugify(titulo) {
  return titulo.toLowerCase()
    .replace(/\s*&\s*/g, '-e-')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '') || 'nosso-amor';
}

export function createDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS pages (
      slug TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      email TEXT DEFAULT '',
      claim_token TEXT DEFAULT '',
      owner_email TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      status TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      name TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      picture TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS login_tokens (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      claims TEXT DEFAULT '[]',
      expires_at TEXT NOT NULL,
      used_at TEXT
    );
  `);
  // Migração de bancos antigos sem as colunas de Reivindicação
  for (const col of ['claim_token', 'owner_email']) {
    try { sqlite.exec(`ALTER TABLE pages ADD COLUMN ${col} TEXT DEFAULT ''`); } catch { /* coluna já existe */ }
  }
  return {
    savePage({ slug, data, status = 'draft', email = '', claimToken = '' }) {
      // No upsert o status não é sobrescrito: re-salvar dados de uma página já
      // publicada não pode despublicá-la (publicação só via publishPage).
      // claim_token e owner_sub também não: só nascem no INSERT / via claimPage.
      sqlite.prepare(`INSERT INTO pages (slug, data, status, email, claim_token) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(slug) DO UPDATE SET data=excluded.data, email=excluded.email, updated_at=datetime('now')`)
        .run(slug, JSON.stringify(data), status, email, claimToken);
      return this.getPageBySlug(slug);
    },
    getPageBySlug(slug) {
      const row = sqlite.prepare('SELECT * FROM pages WHERE slug = ?').get(slug);
      if (!row) return null;
      try {
        return { ...row, data: JSON.parse(row.data) };
      } catch (e) {
        console.error(`Página ${slug} com data corrompido:`, e.message);
        return null;
      }
    },
    publishPage(slug) {
      // Não reverte Despublicação: webhook atrasado/reenviado do MP não pode
      // recolocar no ar uma página que o dono escondeu.
      sqlite.prepare(`UPDATE pages SET status='published', updated_at=datetime('now') WHERE slug=? AND status != 'unpublished'`).run(slug);
    },
    claimPage({ slug, claimToken, ownerEmail }) {
      // Token é a prova de posse; Rascunho não é reivindicável (claim só pós-pagamento).
      const r = sqlite.prepare(`UPDATE pages SET owner_email=?, updated_at=datetime('now')
        WHERE slug=? AND claim_token=? AND claim_token != '' AND status != 'draft'`)
        .run(ownerEmail, slug, claimToken);
      return r.changes > 0;
    },
    listPagesByOwner(email) {
      return sqlite.prepare(`SELECT slug, status, data, created_at FROM pages WHERE owner_email=? ORDER BY created_at DESC`).all(email)
        .map(r => {
          let titulo = '';
          try { titulo = JSON.parse(r.data).titulo || ''; } catch { /* ignora corrompido */ }
          return { slug: r.slug, titulo, status: r.status, criadaEm: r.created_at };
        });
    },
    unpublishPage(slug, ownerEmail) {
      const r = sqlite.prepare(`UPDATE pages SET status='unpublished', updated_at=datetime('now')
        WHERE slug=? AND owner_email=? AND owner_email != '' AND status='published'`).run(slug, ownerEmail);
      return r.changes > 0;
    },
    republishPage(slug, ownerEmail) {
      const r = sqlite.prepare(`UPDATE pages SET status='published', updated_at=datetime('now')
        WHERE slug=? AND owner_email=? AND owner_email != '' AND status='unpublished'`).run(slug, ownerEmail);
      return r.changes > 0;
    },
    upsertUser({ email, name = '', picture = '' }) {
      sqlite.prepare(`INSERT INTO users (email, name, picture) VALUES (?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET name=CASE WHEN excluded.name != '' THEN excluded.name ELSE name END,
          picture=CASE WHEN excluded.picture != '' THEN excluded.picture ELSE picture END`)
        .run(email, name, picture);
      return this.getUser(email);
    },
    getUser(email) { return sqlite.prepare('SELECT * FROM users WHERE email = ?').get(email); },
    setUserPhone(email, phone) {
      sqlite.prepare('UPDATE users SET phone=? WHERE email=?').run(phone, email);
    },
    createLoginToken({ token, email, claims = [], expiresAt }) {
      sqlite.prepare('INSERT INTO login_tokens (token, email, claims, expires_at) VALUES (?, ?, ?, ?)')
        .run(token, email, JSON.stringify(claims), expiresAt);
    },
    consumeLoginToken(token) {
      // Uso único: marca used_at na mesma operação que valida.
      const row = sqlite.prepare(`SELECT * FROM login_tokens WHERE token=? AND used_at IS NULL AND expires_at > datetime('now')`).get(token);
      if (!row) return null;
      sqlite.prepare(`UPDATE login_tokens SET used_at=datetime('now') WHERE token=?`).run(token);
      let claims = [];
      try { claims = JSON.parse(row.claims); } catch { /* ignora corrompido */ }
      return { email: row.email, claims };
    },
    uniqueSlug(titulo) {
      const base = slugify(titulo);
      let slug = base, n = 2;
      while (this.getPageBySlug(slug)) slug = `${base}-${n++}`;
      return slug;
    },
    savePayment({ id, slug, status, amount }) {
      sqlite.prepare(`INSERT INTO payments (id, slug, status, amount) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET status=excluded.status, updated_at=datetime('now')`)
        .run(String(id), slug, status, amount);
    },
    getPayment(id) { return sqlite.prepare('SELECT * FROM payments WHERE id = ?').get(String(id)); },
    listPages() {
      return sqlite.prepare('SELECT slug, status, email, created_at, updated_at, data FROM pages ORDER BY created_at DESC').all()
        .map(r => {
          let titulo = '', dataExpiracao = '';
          try { const d = JSON.parse(r.data); titulo = d.titulo || ''; dataExpiracao = d.dataExpiracao || ''; } catch { /* ignora corrompido */ }
          return { slug: r.slug, titulo, status: r.status, email: r.email, dataExpiracao, criadaEm: r.created_at, atualizadaEm: r.updated_at };
        });
    },
    listPayments() {
      return sqlite.prepare('SELECT * FROM payments ORDER BY created_at DESC').all();
    },
    // Só para testes: lê o último token de login pendente de um email
    _rawLoginToken(email) {
      return sqlite.prepare('SELECT token FROM login_tokens WHERE email=? AND used_at IS NULL ORDER BY rowid DESC').get(email)?.token;
    },
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
export const db = createDb(process.env.NODE_ENV === 'test' ? ':memory:' : path.join(DATA_DIR, 'chamego.db'));
