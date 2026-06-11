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
  `);
  return {
    savePage({ slug, data, status = 'draft', email = '' }) {
      // No upsert o status não é sobrescrito: re-salvar dados de uma página já
      // publicada não pode despublicá-la (publicação só via publishPage).
      sqlite.prepare(`INSERT INTO pages (slug, data, status, email) VALUES (?, ?, ?, ?)
        ON CONFLICT(slug) DO UPDATE SET data=excluded.data, email=excluded.email, updated_at=datetime('now')`)
        .run(slug, JSON.stringify(data), status, email);
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
      sqlite.prepare(`UPDATE pages SET status='published', updated_at=datetime('now') WHERE slug=?`).run(slug);
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
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
export const db = createDb(process.env.NODE_ENV === 'test' ? ':memory:' : path.join(DATA_DIR, 'chamego.db'));
