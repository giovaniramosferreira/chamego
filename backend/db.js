import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Sem 0/O/1/I/L: código será digitado/dito em voz alta pelo casal.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function generateInviteCode() {
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    name TEXT DEFAULT '',
    picture TEXT DEFAULT '',
    onboarding TEXT DEFAULT '{}',
    terms_accepted_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS couples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    photo_url TEXT DEFAULT '',
    milestone_date TEXT NOT NULL,
    milestone_label TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS couple_members (
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    user_email TEXT NOT NULL UNIQUE REFERENCES users(email),
    role TEXT NOT NULL CHECK (role IN ('creator','partner')),
    joined_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS invites (
    code TEXT PRIMARY KEY,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    created_by TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
    accepted_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS login_tokens (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT
  )`,
];

export function createDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  for (const ddl of SCHEMA) sqlite.prepare(ddl).run();

  return {
    upsertUser({ email, name = '', picture = '' }) {
      sqlite.prepare(`INSERT INTO users (email, name, picture) VALUES (?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          name = CASE WHEN excluded.name != '' THEN excluded.name ELSE name END,
          picture = CASE WHEN excluded.picture != '' THEN excluded.picture ELSE picture END`)
        .run(email, name, picture);
      return this.getUser(email);
    },
    getUser(email) { return sqlite.prepare('SELECT * FROM users WHERE email = ?').get(email); },
    updateUser(email, { name, onboarding, termsAccepted }) {
      if (name !== undefined) sqlite.prepare('UPDATE users SET name=? WHERE email=?').run(String(name).slice(0, 80), email);
      if (onboarding !== undefined) sqlite.prepare('UPDATE users SET onboarding=? WHERE email=?').run(JSON.stringify(onboarding), email);
      if (termsAccepted) sqlite.prepare(`UPDATE users SET terms_accepted_at=datetime('now') WHERE email=? AND terms_accepted_at IS NULL`).run(email);
      return this.getUser(email);
    },

    createCouple({ name, milestoneDate, milestoneLabel = '', creatorEmail }) {
      const existing = sqlite.prepare('SELECT couple_id FROM couple_members WHERE user_email=?').get(creatorEmail);
      if (existing) throw new Error('Usuário já tem um espaço');
      const tx = sqlite.transaction(() => {
        const r = sqlite.prepare('INSERT INTO couples (name, milestone_date, milestone_label) VALUES (?, ?, ?)')
          .run(name, milestoneDate, milestoneLabel);
        sqlite.prepare(`INSERT INTO couple_members (couple_id, user_email, role) VALUES (?, ?, 'creator')`)
          .run(r.lastInsertRowid, creatorEmail);
        return r.lastInsertRowid;
      });
      const id = tx();
      return sqlite.prepare('SELECT * FROM couples WHERE id=?').get(id);
    },
    getCoupleByUser(email) {
      const m = sqlite.prepare('SELECT couple_id FROM couple_members WHERE user_email=?').get(email);
      if (!m) return null;
      const couple = sqlite.prepare('SELECT * FROM couples WHERE id=?').get(m.couple_id);
      couple.members = sqlite.prepare(`
        SELECT cm.user_email AS email, cm.role, u.name, u.picture
        FROM couple_members cm JOIN users u ON u.email = cm.user_email
        WHERE cm.couple_id=? ORDER BY cm.joined_at`).all(m.couple_id);
      return couple;
    },
    updateCouple(id, memberEmail, { name, milestoneDate, milestoneLabel }) {
      const m = sqlite.prepare('SELECT 1 FROM couple_members WHERE couple_id=? AND user_email=?').get(id, memberEmail);
      if (!m) return false;
      if (name !== undefined) sqlite.prepare('UPDATE couples SET name=? WHERE id=?').run(String(name).slice(0, 80), id);
      if (milestoneDate !== undefined) sqlite.prepare('UPDATE couples SET milestone_date=? WHERE id=?').run(milestoneDate, id);
      if (milestoneLabel !== undefined) sqlite.prepare('UPDATE couples SET milestone_label=? WHERE id=?').run(String(milestoneLabel).slice(0, 60), id);
      return true;
    },

    createInvite(coupleId, createdBy) {
      sqlite.prepare(`UPDATE invites SET status='revoked' WHERE couple_id=? AND status='pending'`).run(coupleId);
      // Retry em colisão de código (31^6 ≈ 887M combinações; colisão é rara)
      for (let i = 0; i < 5; i++) {
        const code = generateInviteCode();
        try {
          sqlite.prepare('INSERT INTO invites (code, couple_id, created_by) VALUES (?, ?, ?)').run(code, coupleId, createdBy);
          return this.getInvite(code);
        } catch { /* código já existe, tenta outro */ }
      }
      throw new Error('Não conseguimos gerar um código de convite');
    },
    getInvite(code) {
      return sqlite.prepare('SELECT * FROM invites WHERE code=?').get(String(code).toUpperCase());
    },
    acceptInvite(code, email) {
      const inv = this.getInvite(code);
      if (!inv || inv.status !== 'pending') return false;
      const already = sqlite.prepare('SELECT 1 FROM couple_members WHERE user_email=?').get(email);
      if (already) return false;
      const tx = sqlite.transaction(() => {
        sqlite.prepare(`INSERT INTO couple_members (couple_id, user_email, role) VALUES (?, ?, 'partner')`).run(inv.couple_id, email);
        sqlite.prepare(`UPDATE invites SET status='accepted', accepted_by=? WHERE code=?`).run(email, inv.code);
      });
      tx();
      return true;
    },

    createLoginToken({ token, email, expiresAt }) {
      sqlite.prepare('INSERT INTO login_tokens (token, email, expires_at) VALUES (?, ?, ?)').run(token, email, expiresAt);
    },
    consumeLoginToken(token) {
      // Uso único: marca used_at na mesma operação que valida.
      const row = sqlite.prepare(`SELECT * FROM login_tokens WHERE token=? AND used_at IS NULL AND expires_at > datetime('now')`).get(token);
      if (!row) return null;
      sqlite.prepare(`UPDATE login_tokens SET used_at=datetime('now') WHERE token=?`).run(token);
      return { email: row.email };
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
