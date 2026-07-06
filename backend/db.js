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
  /* ── Conteúdo das abas (Agenda, Listas, Momentos, Vocês) ── */
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    created_by TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT DEFAULT '',
    date TEXT NOT NULL,
    time TEXT DEFAULT '',
    location TEXT DEFAULT '',
    shared INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    created_by TEXT NOT NULL,
    title TEXT NOT NULL,
    icon TEXT DEFAULT 'list',
    kind TEXT NOT NULL DEFAULT 'shared' CHECK (kind IN ('shared','individual','wishlist')),
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS list_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL REFERENCES lists(id),
    text TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS moments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    created_by TEXT NOT NULL,
    text TEXT DEFAULT '',
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS moment_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    moment_id INTEGER NOT NULL REFERENCES moments(id),
    url TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    user_email TEXT NOT NULL,
    date TEXT NOT NULL,
    mood TEXT NOT NULL,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (couple_id, user_email, date)
  )`,
  `CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    created_by TEXT NOT NULL,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    sender_email TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
];

export function createDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  for (const ddl of SCHEMA) sqlite.prepare(ddl).run();

  // Migração de bancos antigos: CREATE TABLE IF NOT EXISTS não altera uma tabela
  // que já existe, então colunas novas precisam ser adicionadas à mão. Em produção
  // a tabela `users` herdada do produto anterior não tinha estas colunas.
  for (const ddl of ["ADD COLUMN onboarding TEXT DEFAULT '{}'", 'ADD COLUMN terms_accepted_at TEXT']) {
    try { sqlite.prepare(`ALTER TABLE users ${ddl}`).run(); } catch { /* coluna já existe */ }
  }

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

    /* ── Agenda ── */
    listEvents(coupleId) {
      return sqlite.prepare(`SELECT * FROM events WHERE couple_id=? ORDER BY date, CASE WHEN time='' THEN 1 ELSE 0 END, time`).all(coupleId);
    },
    createEvent(coupleId, email, { title, notes = '', date, time = '', location = '', shared = true }) {
      const r = sqlite.prepare(`INSERT INTO events (couple_id, created_by, title, notes, date, time, location, shared)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(coupleId, email, String(title).slice(0, 120), String(notes).slice(0, 500), date, time, String(location).slice(0, 120), shared ? 1 : 0);
      return sqlite.prepare('SELECT * FROM events WHERE id=?').get(r.lastInsertRowid);
    },
    updateEvent(coupleId, id, patch) {
      const ev = sqlite.prepare('SELECT * FROM events WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!ev) return null;
      const fields = { title: 120, notes: 500, date: 10, time: 5, location: 120 };
      for (const [k, max] of Object.entries(fields)) {
        if (patch[k] !== undefined) sqlite.prepare(`UPDATE events SET ${k}=? WHERE id=?`).run(String(patch[k]).slice(0, max), id);
      }
      if (patch.shared !== undefined) sqlite.prepare('UPDATE events SET shared=? WHERE id=?').run(patch.shared ? 1 : 0, id);
      return sqlite.prepare('SELECT * FROM events WHERE id=?').get(id);
    },
    deleteEvent(coupleId, id) {
      return sqlite.prepare('DELETE FROM events WHERE id=? AND couple_id=?').run(id, coupleId).changes > 0;
    },

    /* ── Listas ── */
    listLists(coupleId) {
      return sqlite.prepare(`
        SELECT l.*,
          (SELECT COUNT(*) FROM list_items i WHERE i.list_id=l.id) AS total,
          (SELECT COUNT(*) FROM list_items i WHERE i.list_id=l.id AND i.done=1) AS done
        FROM lists l WHERE l.couple_id=? ORDER BY l.created_at DESC`).all(coupleId);
    },
    getList(coupleId, id) {
      const list = sqlite.prepare('SELECT * FROM lists WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!list) return null;
      list.items = sqlite.prepare('SELECT * FROM list_items WHERE list_id=? ORDER BY done, position, id').all(id);
      return list;
    },
    createList(coupleId, email, { title, icon = 'list', kind = 'shared' }) {
      const k = ['shared', 'individual', 'wishlist'].includes(kind) ? kind : 'shared';
      const r = sqlite.prepare('INSERT INTO lists (couple_id, created_by, title, icon, kind) VALUES (?, ?, ?, ?, ?)')
        .run(coupleId, email, String(title).slice(0, 80), String(icon).slice(0, 20), k);
      return this.getList(coupleId, r.lastInsertRowid);
    },
    updateList(coupleId, id, { title, icon }) {
      const list = sqlite.prepare('SELECT * FROM lists WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!list) return null;
      if (title !== undefined) sqlite.prepare('UPDATE lists SET title=? WHERE id=?').run(String(title).slice(0, 80), id);
      if (icon !== undefined) sqlite.prepare('UPDATE lists SET icon=? WHERE id=?').run(String(icon).slice(0, 20), id);
      return this.getList(coupleId, id);
    },
    deleteList(coupleId, id) {
      const list = sqlite.prepare('SELECT 1 FROM lists WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!list) return false;
      const tx = sqlite.transaction(() => {
        sqlite.prepare('DELETE FROM list_items WHERE list_id=?').run(id);
        sqlite.prepare('DELETE FROM lists WHERE id=?').run(id);
      });
      tx();
      return true;
    },
    addItem(coupleId, listId, text) {
      const list = sqlite.prepare('SELECT 1 FROM lists WHERE id=? AND couple_id=?').get(listId, coupleId);
      if (!list) return null;
      const pos = (sqlite.prepare('SELECT MAX(position) m FROM list_items WHERE list_id=?').get(listId)?.m || 0) + 1;
      sqlite.prepare('INSERT INTO list_items (list_id, text, position) VALUES (?, ?, ?)').run(listId, String(text).slice(0, 200), pos);
      return this.getList(coupleId, listId);
    },
    updateItem(coupleId, itemId, { text, done }) {
      const row = sqlite.prepare(`SELECT li.id, li.list_id FROM list_items li
        JOIN lists l ON l.id=li.list_id WHERE li.id=? AND l.couple_id=?`).get(itemId, coupleId);
      if (!row) return null;
      if (text !== undefined) sqlite.prepare('UPDATE list_items SET text=? WHERE id=?').run(String(text).slice(0, 200), itemId);
      if (done !== undefined) sqlite.prepare('UPDATE list_items SET done=? WHERE id=?').run(done ? 1 : 0, itemId);
      return this.getList(coupleId, row.list_id);
    },
    deleteItem(coupleId, itemId) {
      const row = sqlite.prepare(`SELECT li.id, li.list_id FROM list_items li
        JOIN lists l ON l.id=li.list_id WHERE li.id=? AND l.couple_id=?`).get(itemId, coupleId);
      if (!row) return null;
      sqlite.prepare('DELETE FROM list_items WHERE id=?').run(itemId);
      return this.getList(coupleId, row.list_id);
    },

    /* ── Momentos ── */
    listMoments(coupleId) {
      const rows = sqlite.prepare('SELECT * FROM moments WHERE couple_id=? ORDER BY date DESC, id DESC').all(coupleId);
      for (const m of rows) {
        m.photos = sqlite.prepare('SELECT url FROM moment_photos WHERE moment_id=? ORDER BY position, id').all(m.id).map(p => p.url);
      }
      return rows;
    },
    createMoment(coupleId, email, { text = '', date }, photoUrls = []) {
      const tx = sqlite.transaction(() => {
        const r = sqlite.prepare('INSERT INTO moments (couple_id, created_by, text, date) VALUES (?, ?, ?, ?)')
          .run(coupleId, email, String(text).slice(0, 1000), date);
        photoUrls.forEach((url, i) => sqlite.prepare('INSERT INTO moment_photos (moment_id, url, position) VALUES (?, ?, ?)').run(r.lastInsertRowid, url, i));
        return r.lastInsertRowid;
      });
      const id = tx();
      const m = sqlite.prepare('SELECT * FROM moments WHERE id=?').get(id);
      m.photos = sqlite.prepare('SELECT url FROM moment_photos WHERE moment_id=? ORDER BY position, id').all(id).map(p => p.url);
      return m;
    },
    deleteMoment(coupleId, id) {
      const m = sqlite.prepare('SELECT 1 FROM moments WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!m) return false;
      const tx = sqlite.transaction(() => {
        sqlite.prepare('DELETE FROM moment_photos WHERE moment_id=?').run(id);
        sqlite.prepare('DELETE FROM moments WHERE id=?').run(id);
      });
      tx();
      return true;
    },

    /* ── Vocês: check-in, metas, chat ── */
    upsertCheckin(coupleId, email, { mood, note = '' }) {
      const date = new Date().toISOString().slice(0, 10);
      sqlite.prepare(`INSERT INTO checkins (couple_id, user_email, date, mood, note) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(couple_id, user_email, date) DO UPDATE SET mood=excluded.mood, note=excluded.note`)
        .run(coupleId, email, date, String(mood).slice(0, 20), String(note).slice(0, 300));
      return sqlite.prepare('SELECT * FROM checkins WHERE couple_id=? AND user_email=? AND date=?').get(coupleId, email, date);
    },
    todayCheckins(coupleId) {
      const date = new Date().toISOString().slice(0, 10);
      return sqlite.prepare('SELECT * FROM checkins WHERE couple_id=? AND date=?').all(coupleId, date);
    },
    checkinStreak(coupleId) {
      const dates = sqlite.prepare('SELECT DISTINCT date FROM checkins WHERE couple_id=? ORDER BY date DESC').all(coupleId).map(r => r.date);
      if (!dates.length) return 0;
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      if (dates[0] !== today && dates[0] !== yesterday) return 0;
      let streak = 0;
      let cursor = new Date(`${dates[0]}T00:00:00`);
      for (const d of dates) {
        if (d === cursor.toISOString().slice(0, 10)) {
          streak++;
          cursor = new Date(cursor.getTime() - 86_400_000);
        } else break;
      }
      return streak;
    },
    listGoals(coupleId) {
      return sqlite.prepare('SELECT * FROM goals WHERE couple_id=? ORDER BY done, created_at DESC').all(coupleId);
    },
    createGoal(coupleId, email, title) {
      const r = sqlite.prepare('INSERT INTO goals (couple_id, created_by, title) VALUES (?, ?, ?)').run(coupleId, email, String(title).slice(0, 120));
      return sqlite.prepare('SELECT * FROM goals WHERE id=?').get(r.lastInsertRowid);
    },
    updateGoal(coupleId, id, { title, done }) {
      const g = sqlite.prepare('SELECT * FROM goals WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!g) return null;
      if (title !== undefined) sqlite.prepare('UPDATE goals SET title=? WHERE id=?').run(String(title).slice(0, 120), id);
      if (done !== undefined) sqlite.prepare('UPDATE goals SET done=? WHERE id=?').run(done ? 1 : 0, id);
      return sqlite.prepare('SELECT * FROM goals WHERE id=?').get(id);
    },
    deleteGoal(coupleId, id) {
      return sqlite.prepare('DELETE FROM goals WHERE id=? AND couple_id=?').run(id, coupleId).changes > 0;
    },
    activeGoalsCount(coupleId) {
      return sqlite.prepare('SELECT COUNT(*) c FROM goals WHERE couple_id=? AND done=0').get(coupleId).c;
    },
    listMessages(coupleId, sinceId = 0) {
      return sqlite.prepare('SELECT * FROM messages WHERE couple_id=? AND id>? ORDER BY id').all(coupleId, sinceId);
    },
    createMessage(coupleId, email, text) {
      const r = sqlite.prepare('INSERT INTO messages (couple_id, sender_email, text) VALUES (?, ?, ?)').run(coupleId, email, String(text).slice(0, 1000));
      return sqlite.prepare('SELECT * FROM messages WHERE id=?').get(r.lastInsertRowid);
    },
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
export const db = createDb(process.env.NODE_ENV === 'test' ? ':memory:' : path.join(DATA_DIR, 'chamego.db'));
