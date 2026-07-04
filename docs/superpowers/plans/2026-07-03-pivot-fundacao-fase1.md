# Pivot Chamego — Fundação (Fase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivotar o Chamego para app de organização a dois: landing nova + auth sem senha + onboarding + espaço do casal + convite do parceiro + shell das 5 abas com Início funcional.

**Architecture:** Monolito existente adaptado — Express + better-sqlite3 servem API e build do Vite; frontend React 19 + React Router + Tailwind recriando o design do `design_handoff_chamego/`. Código do produto antigo preservado no branch `legacy-presente-digital`.

**Tech Stack:** React 19, Vite, Tailwind CSS 3, React Router 6, Express 4, better-sqlite3, nodemailer, vitest + supertest.

**Spec:** `docs/superpowers/specs/2026-07-03-pivot-app-organizacao-fundacao-design.md`

**Referência de design (leitura obrigatória antes das tasks de frontend):**
- `design_handoff_chamego/README.md` — visão geral
- `design_handoff_chamego/chamego.css` — tokens (paleta terracota, tipografia, raios)
- `design_handoff_chamego/app.css` — componentes do app (tab bar, rows, chips, cards)
- `design_handoff_chamego/js/core.js` — ícones SVG (objeto `ICONS`) e headers
- `design_handoff_chamego/js/screens.auth.js` e `screens.home.js` — layout das telas

**Atenção:** a copy de `design_handoff_chamego/Chamego.html` é do produto ANTIGO
(página de amor, R$29, QR Code). Use a ESTRUTURA visual (hero, steps, scenes,
quotes, FAQ, CTA) mas a copy nova definida na Task 14.

**Convenções:**
- Backend testa com vitest + supertest, padrão dos testes existentes (`NODE_ENV=test` usa SQLite `:memory:`).
- Frontend não tem infra de teste unitário: gates são `npx eslint .` + `npm run build` + verificação manual no dev server (`npm run dev`, backend :3001 + vite :5173).
- Usuário é identificado por email (chave primária em `users`) — padrão herdado do código atual.
- Commits frequentes, mensagens em português, prefixos `feat:`/`chore:`/`docs:`.

---

### Task 1: Branch legacy + limpeza da main

**Files:**
- Delete: `src/pages/CreatorWizard.jsx`, `src/pages/CheckoutPage.jsx`, `src/pages/CouplePage.jsx`, `src/pages/MinhasPaginas.jsx`, `src/pages/LandingPage.jsx`
- Delete: `src/components/` (todos), `src/lib/claims.js`, `src/assets/hero.jpg`, `src/assets/scenes/`
- Delete: `backend/ai.js`, `backend/payments.js`, `backend/places.js`
- Delete: `backend/__tests__/` (todos — testes do produto antigo)
- Modify: `src/App.jsx` (placeholder temporário)

- [ ] **Step 1: Criar branch de preservação**

```bash
git branch legacy-presente-digital
git push -u origin legacy-presente-digital
```

Expected: branch criado apontando pro estado atual da main.

- [ ] **Step 2: Remover frontend antigo**

```bash
git rm -r src/pages src/components src/lib/claims.js src/assets/hero.jpg src/assets/scenes
mkdir -p src/pages src/components
```

- [ ] **Step 3: Remover módulos e testes de backend do produto antigo**

```bash
git rm backend/ai.js backend/payments.js backend/places.js
git rm -r backend/__tests__
mkdir -p backend/__tests__
```

- [ ] **Step 4: App.jsx placeholder (build não pode quebrar)**

Substituir `src/App.jsx` inteiro por:

```jsx
export default function App() {
  return <p>chamego — em obras</p>;
}
```

- [ ] **Step 5: server.js mínimo temporário**

Substituir `backend/server.js` inteiro por (as rotas novas entram nas Tasks 3–5):

```js
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Em produção o Express serve o build do Vite (SPA) — mesmo origin do /api
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));
}

export { app };
```

Nota: `cors` e `multer` saem das imports (uploads voltam em fase futura). Não
remover os pacotes do package.json — multer volta na fase de Momentos.

- [ ] **Step 6: Verificar gates**

```bash
npx eslint . && npm run build && npm test
```

Expected: eslint OK, build OK, vitest "no test files found" (aceitável — testes novos chegam na Task 2; se `vitest run` retornar exit code 1 por falta de arquivos, adicionar `--passWithNoTests` ao script `test` do package.json).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: pivot — remove produto presente digital (preservado em legacy-presente-digital)"
```

---

### Task 2: Schema novo do banco (db.js)

**Files:**
- Rewrite: `backend/db.js`
- Test: `backend/__tests__/db.test.js`

O `db.js` novo mantém o padrão existente: `createDb(file)` retorna objeto de
métodos; export `db` singleton usa `:memory:` em teste. Tabelas antigas
(`pages`, `payments`) saem; `users` e `login_tokens` são recriadas no formato
novo; entram `couples`, `couple_members`, `invites`.

- [ ] **Step 1: Escrever testes que falham**

Criar `backend/__tests__/db.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, generateInviteCode } from '../db.js';

let db;
beforeEach(() => { db = createDb(':memory:'); });

describe('users', () => {
  it('upsert cria e atualiza sem apagar campos', () => {
    db.upsertUser({ email: 'a@b.com', name: 'Ana' });
    db.upsertUser({ email: 'a@b.com', picture: 'p.jpg' });
    const u = db.getUser('a@b.com');
    expect(u.name).toBe('Ana');
    expect(u.picture).toBe('p.jpg');
  });

  it('updateUser grava onboarding (json) e aceite de termos', () => {
    db.upsertUser({ email: 'a@b.com' });
    db.updateUser('a@b.com', { onboarding: { goal: 'rotina', stage: 'namorando', alone: 'sozinho' } });
    db.updateUser('a@b.com', { termsAccepted: true, name: 'Ana Paula' });
    const u = db.getUser('a@b.com');
    expect(JSON.parse(u.onboarding).goal).toBe('rotina');
    expect(u.terms_accepted_at).toBeTruthy();
    expect(u.name).toBe('Ana Paula');
  });
});

describe('couples', () => {
  it('createCouple cria espaço com criador como membro', () => {
    db.upsertUser({ email: 'a@b.com' });
    const c = db.createCouple({ name: 'Mari & João', milestoneDate: '2024-06-22', milestoneLabel: 'Início do namoro', creatorEmail: 'a@b.com' });
    expect(c.id).toBeTruthy();
    const mine = db.getCoupleByUser('a@b.com');
    expect(mine.name).toBe('Mari & João');
    expect(mine.members).toHaveLength(1);
    expect(mine.members[0].role).toBe('creator');
  });

  it('um usuário só pode ter um espaço', () => {
    db.upsertUser({ email: 'a@b.com' });
    db.createCouple({ name: 'X', milestoneDate: '2024-01-01', milestoneLabel: 'x', creatorEmail: 'a@b.com' });
    expect(() => db.createCouple({ name: 'Y', milestoneDate: '2024-01-01', milestoneLabel: 'y', creatorEmail: 'a@b.com' })).toThrow();
  });

  it('updateCouple só afeta o espaço do membro', () => {
    db.upsertUser({ email: 'a@b.com' });
    const c = db.createCouple({ name: 'X', milestoneDate: '2024-01-01', milestoneLabel: 'x', creatorEmail: 'a@b.com' });
    expect(db.updateCouple(c.id, 'a@b.com', { name: 'Novo Nome' })).toBe(true);
    expect(db.updateCouple(c.id, 'outro@b.com', { name: 'Hack' })).toBe(false);
    expect(db.getCoupleByUser('a@b.com').name).toBe('Novo Nome');
  });
});

describe('invites', () => {
  function setup() {
    db.upsertUser({ email: 'a@b.com' });
    db.upsertUser({ email: 'p@b.com' });
    return db.createCouple({ name: 'X', milestoneDate: '2024-01-01', milestoneLabel: 'x', creatorEmail: 'a@b.com' });
  }

  it('cria convite pendente e busca por código', () => {
    const c = setup();
    const inv = db.createInvite(c.id, 'a@b.com');
    expect(inv.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const found = db.getInvite(inv.code);
    expect(found.status).toBe('pending');
    expect(found.couple_id).toBe(c.id);
  });

  it('gerar novo convite revoga o pendente anterior', () => {
    const c = setup();
    const first = db.createInvite(c.id, 'a@b.com');
    const second = db.createInvite(c.id, 'a@b.com');
    expect(db.getInvite(first.code).status).toBe('revoked');
    expect(db.getInvite(second.code).status).toBe('pending');
  });

  it('aceitar convite vincula o parceiro ao espaço', () => {
    const c = setup();
    const inv = db.createInvite(c.id, 'a@b.com');
    expect(db.acceptInvite(inv.code, 'p@b.com')).toBe(true);
    const couple = db.getCoupleByUser('p@b.com');
    expect(couple.id).toBe(c.id);
    expect(couple.members).toHaveLength(2);
    expect(db.getInvite(inv.code).status).toBe('accepted');
  });

  it('convite aceito, revogado ou de quem já tem espaço falha', () => {
    const c = setup();
    const inv = db.createInvite(c.id, 'a@b.com');
    db.acceptInvite(inv.code, 'p@b.com');
    expect(db.acceptInvite(inv.code, 'q@b.com')).toBe(false); // já aceito
    db.upsertUser({ email: 'q@b.com' });
    db.createCouple({ name: 'Z', milestoneDate: '2024-01-01', milestoneLabel: 'z', creatorEmail: 'q@b.com' });
    const inv2 = db.createInvite(c.id, 'a@b.com');
    expect(db.acceptInvite(inv2.code, 'q@b.com')).toBe(false); // já tem espaço
  });
});

describe('login tokens', () => {
  it('token é de uso único e expira', () => {
    db.createLoginToken({ token: 't1', email: 'a@b.com', expiresAt: new Date(Date.now() + 60000).toISOString().replace('T', ' ').slice(0, 19) });
    expect(db.consumeLoginToken('t1')).toEqual({ email: 'a@b.com' });
    expect(db.consumeLoginToken('t1')).toBeNull();
    db.createLoginToken({ token: 't2', email: 'a@b.com', expiresAt: '2000-01-01 00:00:00' });
    expect(db.consumeLoginToken('t2')).toBeNull();
  });
});

describe('generateInviteCode', () => {
  it('gera 6 chars sem ambíguos (0,O,1,I,L)', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateInviteCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npm test
```

Expected: FAIL — `createCouple is not a function` etc.

- [ ] **Step 3: Reescrever backend/db.js**

Substituir o arquivo inteiro por:

```js
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

export function createDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      name TEXT DEFAULT '',
      picture TEXT DEFAULT '',
      onboarding TEXT DEFAULT '{}',
      terms_accepted_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS couples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      photo_url TEXT DEFAULT '',
      milestone_date TEXT NOT NULL,
      milestone_label TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS couple_members (
      couple_id INTEGER NOT NULL REFERENCES couples(id),
      user_email TEXT NOT NULL UNIQUE REFERENCES users(email),
      role TEXT NOT NULL CHECK (role IN ('creator','partner')),
      joined_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invites (
      code TEXT PRIMARY KEY,
      couple_id INTEGER NOT NULL REFERENCES couples(id),
      created_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
      accepted_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS login_tokens (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT
    );
  `);

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
```

Nota: banco de produção antigo tem tabelas `pages`/`payments` — ficam órfãs no
arquivo, sem migração (decisão da spec: banco novo nasce do schema novo; em
produção o pivot usa `DATA_DIR` novo ou apaga o arquivo antigo manualmente).

- [ ] **Step 4: Rodar testes**

```bash
npm test
```

Expected: PASS todos.

- [ ] **Step 5: Commit**

```bash
git add backend/db.js backend/__tests__/db.test.js
git commit -m "feat: schema novo — users, couples, couple_members, invites, login_tokens"
```

---

### Task 3: Endpoints de auth (Google + Link Mágico + sessão)

**Files:**
- Modify: `backend/server.js`
- Modify: `backend/mailer.js` (texto do email)
- Test: `backend/__tests__/auth.test.js`

`backend/auth.js` fica como está (verifyGoogleToken, createSession,
sessionFromRequest, normalizeEmail, SESSION_COOKIE, SESSION_MAX_AGE_MS).

- [ ] **Step 1: Escrever testes que falham**

Criar `backend/__tests__/auth.test.js`:

```js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../db.js';

async function login(email = 'a@b.com') {
  await request(app).post('/api/auth/magic-link').send({ email });
  const token = db._rawLoginToken(email);
  const res = await request(app).get(`/api/auth/magic?t=${token}`);
  const cookie = res.headers['set-cookie'][0].split(';')[0];
  return cookie;
}

describe('auth', () => {
  it('magic-link: valida email e cria token', async () => {
    const bad = await request(app).post('/api/auth/magic-link').send({ email: 'nao-eh-email' });
    expect(bad.status).toBe(400);
    const ok = await request(app).post('/api/auth/magic-link').send({ email: 'novo@b.com' });
    expect(ok.body.sent).toBe(true);
    expect(db._rawLoginToken('novo@b.com')).toBeTruthy();
  });

  it('magic-link: rate limit de 1 por minuto por email', async () => {
    await request(app).post('/api/auth/magic-link').send({ email: 'rate@b.com' });
    const again = await request(app).post('/api/auth/magic-link').send({ email: 'rate@b.com' });
    expect(again.status).toBe(429);
  });

  it('clique no link loga (cookie) e redireciona para /app', async () => {
    await request(app).post('/api/auth/magic-link').send({ email: 'c@b.com' });
    const token = db._rawLoginToken('c@b.com');
    const res = await request(app).get(`/api/auth/magic?t=${token}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/app');
    expect(res.headers['set-cookie'][0]).toContain('chamego_session=');
  });

  it('link inválido redireciona com erro', async () => {
    const res = await request(app).get('/api/auth/magic?t=lixo');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/entrar?erro=link-invalido');
  });

  it('GET /api/me: 401 sem sessão, dados com sessão', async () => {
    expect((await request(app).get('/api/me')).status).toBe(401);
    const cookie = await login('me@b.com');
    const res = await request(app).get('/api/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@b.com');
    expect(res.body.couple).toBeNull();
  });

  it('logout limpa a sessão', async () => {
    const cookie = await login('out@b.com');
    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(res.body.ok).toBe(true);
    expect(res.headers['set-cookie'][0]).toMatch(/chamego_session=;/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npm test
```

Expected: FAIL — 404 nos endpoints.

- [ ] **Step 3: Implementar endpoints no server.js**

Substituir `backend/server.js` inteiro por:

```js
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { verifyGoogleToken, createSession, sessionFromRequest, normalizeEmail, SESSION_COOKIE, SESSION_MAX_AGE_MS } from './auth.js';
import { sendMagicLink } from './mailer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

app.get('/api/config', (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || '' });
});

/* ── Sessão ──────────────────────────────────────────────────────────────── */

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_MS,
  });
}

function requireAuth(req, res, next) {
  const user = sessionFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Faça login para continuar' });
  req.user = user;
  next();
}

/* ── Auth: Google + Link Mágico ──────────────────────────────────────────── */

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: 'Credencial ausente' });
  const g = await verifyGoogleToken(credential);
  if (!g) return res.status(401).json({ error: 'Login Google inválido' });
  db.upsertUser(g);
  setSessionCookie(res, createSession(g));
  res.json({ email: g.email, name: g.name, picture: g.picture });
});

const lastMagicRequest = new Map(); // email -> timestamp (rate limit simples)
app.post('/api/auth/magic-link', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email inválido' });
  const last = lastMagicRequest.get(email) || 0;
  if (Date.now() - last < 60_000) return res.status(429).json({ error: 'Aguarde um minuto antes de pedir outro link' });
  lastMagicRequest.set(email, Date.now());
  try {
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    db.createLoginToken({ token, email, expiresAt });
    const base = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
    await sendMagicLink(email, `${base}/api/auth/magic?t=${token}`);
    res.json({ sent: true });
  } catch (e) {
    console.error('magic link error', e);
    res.status(502).json({ error: 'Não conseguimos enviar o email agora. Tente de novo.' });
  }
});

app.get('/api/auth/magic', (req, res) => {
  const data = db.consumeLoginToken(String(req.query.t || ''));
  if (!data) return res.redirect('/entrar?erro=link-invalido');
  db.upsertUser({ email: data.email });
  setSessionCookie(res, createSession({ email: data.email }));
  res.redirect('/app');
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

/* ── Perfil ──────────────────────────────────────────────────────────────── */

app.get('/api/me', requireAuth, (req, res) => {
  const user = db.getUser(req.user.email) || db.upsertUser({ email: req.user.email });
  const couple = db.getCoupleByUser(req.user.email);
  const partner = couple ? (couple.members.find(m => m.email !== req.user.email) || null) : null;
  let onboarding = {};
  try { onboarding = JSON.parse(user.onboarding); } catch { /* corrompido = vazio */ }
  res.json({
    user: {
      email: user.email,
      name: user.name,
      picture: user.picture,
      onboarding,
      termsAcceptedAt: user.terms_accepted_at,
    },
    couple,
    partner,
  });
});

// SPA em produção
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));
}

export { app };
```

- [ ] **Step 4: Atualizar texto do email no mailer.js**

Em `backend/mailer.js`, trocar apenas a linha do parágrafo dentro de
`magicLinkHtml` que diz:

```
        Clique no botão abaixo para entrar e gerenciar a página de vocês.
```

por:

```
        Clique no botão abaixo para entrar no espaço de vocês.
```

- [ ] **Step 5: Rodar testes**

```bash
npm test
```

Expected: PASS (db + auth).

- [ ] **Step 6: Commit**

```bash
git add backend/server.js backend/mailer.js backend/__tests__/auth.test.js
git commit -m "feat: auth sem senha — Google + link mágico, sessão e /api/me"
```

---

### Task 4: PATCH /api/me (onboarding, termos, nome)

**Files:**
- Modify: `backend/server.js` (adicionar rota após GET /api/me)
- Test: `backend/__tests__/me.test.js`

- [ ] **Step 1: Escrever testes que falham**

Criar `backend/__tests__/me.test.js`:

```js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../db.js';

async function login(email) {
  await request(app).post('/api/auth/magic-link').send({ email });
  const token = db._rawLoginToken(email);
  const res = await request(app).get(`/api/auth/magic?t=${token}`);
  return res.headers['set-cookie'][0].split(';')[0];
}

describe('PATCH /api/me', () => {
  it('exige login', async () => {
    expect((await request(app).patch('/api/me').send({ name: 'X' })).status).toBe(401);
  });

  it('grava nome, onboarding e aceite de termos', async () => {
    const cookie = await login('patch@b.com');
    const res = await request(app).patch('/api/me').set('Cookie', cookie)
      .send({ name: 'Mariana', onboarding: { goal: 'conexao', stage: 'namorando', alone: 'convidar' }, acceptTerms: true });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Mariana');
    expect(res.body.user.onboarding.goal).toBe('conexao');
    expect(res.body.user.termsAcceptedAt).toBeTruthy();
  });

  it('onboarding só aceita chaves conhecidas', async () => {
    const cookie = await login('patch2@b.com');
    const res = await request(app).patch('/api/me').set('Cookie', cookie)
      .send({ onboarding: { goal: 'rotina', hack: 'xss' } });
    expect(res.body.user.onboarding).toEqual({ goal: 'rotina' });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npm test
```

Expected: FAIL — 404 no PATCH.

- [ ] **Step 3: Implementar rota**

Em `backend/server.js`, logo após o `app.get('/api/me', ...)`, adicionar:

```js
const ONBOARDING_KEYS = ['goal', 'stage', 'alone'];
app.patch('/api/me', requireAuth, (req, res) => {
  const { name, onboarding, acceptTerms } = req.body || {};
  db.upsertUser({ email: req.user.email });
  const patch = {};
  if (typeof name === 'string' && name.trim()) patch.name = name.trim();
  if (onboarding && typeof onboarding === 'object') {
    let current = {};
    try { current = JSON.parse(db.getUser(req.user.email)?.onboarding || '{}'); } catch { /* vazio */ }
    for (const k of ONBOARDING_KEYS) {
      if (typeof onboarding[k] === 'string') current[k] = onboarding[k].slice(0, 30);
    }
    patch.onboarding = current;
  }
  if (acceptTerms === true) patch.termsAccepted = true;
  const user = db.updateUser(req.user.email, patch);
  let ob = {};
  try { ob = JSON.parse(user.onboarding); } catch { /* vazio */ }
  res.json({ user: { email: user.email, name: user.name, picture: user.picture, onboarding: ob, termsAcceptedAt: user.terms_accepted_at } });
});
```

- [ ] **Step 4: Rodar testes**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/server.js backend/__tests__/me.test.js
git commit -m "feat: PATCH /api/me — nome, onboarding e aceite de termos"
```

---

### Task 5: Endpoints de espaço do casal e convites

**Files:**
- Modify: `backend/server.js` (adicionar rotas após PATCH /api/me)
- Test: `backend/__tests__/couples.test.js`

- [ ] **Step 1: Escrever testes que falham**

Criar `backend/__tests__/couples.test.js`:

```js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { db } from '../db.js';

async function login(email) {
  await request(app).post('/api/auth/magic-link').send({ email });
  const token = db._rawLoginToken(email);
  const res = await request(app).get(`/api/auth/magic?t=${token}`);
  return res.headers['set-cookie'][0].split(';')[0];
}

describe('espaço do casal', () => {
  it('cria espaço e aparece no /api/me', async () => {
    const cookie = await login('cria@b.com');
    const res = await request(app).post('/api/couples').set('Cookie', cookie)
      .send({ name: 'Mari & João', milestoneDate: '2024-06-22', milestoneLabel: 'Início do namoro' });
    expect(res.status).toBe(200);
    expect(res.body.couple.name).toBe('Mari & João');
    const me = await request(app).get('/api/me').set('Cookie', cookie);
    expect(me.body.couple.id).toBe(res.body.couple.id);
  });

  it('valida campos e impede segundo espaço', async () => {
    const cookie = await login('dupla@b.com');
    expect((await request(app).post('/api/couples').set('Cookie', cookie).send({ name: '' })).status).toBe(400);
    await request(app).post('/api/couples').set('Cookie', cookie).send({ name: 'A', milestoneDate: '2024-01-01' });
    const again = await request(app).post('/api/couples').set('Cookie', cookie).send({ name: 'B', milestoneDate: '2024-01-01' });
    expect(again.status).toBe(409);
  });

  it('edita espaço (só membro)', async () => {
    const cookie = await login('edita@b.com');
    const { body } = await request(app).post('/api/couples').set('Cookie', cookie).send({ name: 'A', milestoneDate: '2024-01-01' });
    const res = await request(app).patch(`/api/couples/${body.couple.id}`).set('Cookie', cookie).send({ name: 'Novo' });
    expect(res.body.couple.name).toBe('Novo');
    const stranger = await login('estranho@b.com');
    expect((await request(app).patch(`/api/couples/${body.couple.id}`).set('Cookie', stranger).send({ name: 'Hack' })).status).toBe(404);
  });
});

describe('convites', () => {
  let seq = 0;
  async function coupleWithInvite() {
    const cookie = await login(`dono${seq++}@b.com`);
    const { body } = await request(app).post('/api/couples').set('Cookie', cookie).send({ name: 'Nós', milestoneDate: '2024-01-01' });
    const inv = await request(app).post(`/api/couples/${body.couple.id}/invites`).set('Cookie', cookie);
    return { cookie, coupleId: body.couple.id, code: inv.body.invite.code };
  }

  it('gera convite (só membro) e preview público funciona', async () => {
    const { code } = await coupleWithInvite();
    const preview = await request(app).get(`/api/invites/${code}`);
    expect(preview.status).toBe(200);
    expect(preview.body.coupleName).toBe('Nós');
    expect(preview.body.invitedBy).toBeTruthy();
  });

  it('parceiro aceita e vira membro', async () => {
    const { code, coupleId } = await coupleWithInvite();
    const partner = await login('par@b.com');
    const res = await request(app).post(`/api/invites/${code}/accept`).set('Cookie', partner);
    expect(res.status).toBe(200);
    const me = await request(app).get('/api/me').set('Cookie', partner);
    expect(me.body.couple.id).toBe(coupleId);
    expect(me.body.partner).toBeTruthy();
  });

  it('quem já tem espaço não aceita convite', async () => {
    const { code } = await coupleWithInvite();
    const busy = await login('ocupado@b.com');
    await request(app).post('/api/couples').set('Cookie', busy).send({ name: 'Outro', milestoneDate: '2024-01-01' });
    const res = await request(app).post(`/api/invites/${code}/accept`).set('Cookie', busy);
    expect(res.status).toBe(409);
  });

  it('convite inexistente ou usado dá 404/410', async () => {
    expect((await request(app).get('/api/invites/XXXXXX')).status).toBe(404);
    const { code } = await coupleWithInvite();
    const p1 = await login('p1@b.com');
    await request(app).post(`/api/invites/${code}/accept`).set('Cookie', p1);
    const p2 = await login('p2@b.com');
    expect((await request(app).post(`/api/invites/${code}/accept`).set('Cookie', p2)).status).toBe(410);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npm test
```

Expected: FAIL — 404 nas rotas.

- [ ] **Step 3: Implementar rotas**

Em `backend/server.js`, após o `app.patch('/api/me', ...)`, adicionar:

```js
/* ── Espaço do casal ─────────────────────────────────────────────────────── */

app.post('/api/couples', requireAuth, (req, res) => {
  const { name, milestoneDate, milestoneLabel } = req.body || {};
  if (!name?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(milestoneDate || '')) {
    return res.status(400).json({ error: 'Informe o nome do espaço e a data' });
  }
  db.upsertUser({ email: req.user.email });
  try {
    db.createCouple({ name: name.trim().slice(0, 80), milestoneDate, milestoneLabel: milestoneLabel || '', creatorEmail: req.user.email });
  } catch {
    return res.status(409).json({ error: 'Você já tem um espaço' });
  }
  res.json({ couple: db.getCoupleByUser(req.user.email) });
});

app.patch('/api/couples/:id', requireAuth, (req, res) => {
  const { name, milestoneDate, milestoneLabel } = req.body || {};
  if (milestoneDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(milestoneDate)) {
    return res.status(400).json({ error: 'Data inválida' });
  }
  const ok = db.updateCouple(Number(req.params.id), req.user.email, { name, milestoneDate, milestoneLabel });
  if (!ok) return res.status(404).json({ error: 'Espaço não encontrado' });
  res.json({ couple: db.getCoupleByUser(req.user.email) });
});

/* ── Convites ────────────────────────────────────────────────────────────── */

function invitePreview(inv) {
  const creator = db.getUser(inv.created_by);
  // o convite pertence ao espaço do criador
  const couple = db.getCoupleByUser(inv.created_by);
  return { code: inv.code, coupleName: couple?.name || '', invitedBy: creator?.name || inv.created_by };
}

app.post('/api/couples/:id/invites', requireAuth, (req, res) => {
  const couple = db.getCoupleByUser(req.user.email);
  if (!couple || couple.id !== Number(req.params.id)) return res.status(404).json({ error: 'Espaço não encontrado' });
  if (couple.members.length >= 2) return res.status(409).json({ error: 'O espaço já tem os dois' });
  const invite = db.createInvite(couple.id, req.user.email);
  const base = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  res.json({ invite: { code: invite.code, url: `${base}/convite/${invite.code}` } });
});

app.get('/api/invites/:code', (req, res) => {
  const inv = db.getInvite(req.params.code);
  if (!inv) return res.status(404).json({ error: 'Convite não encontrado' });
  if (inv.status !== 'pending') return res.status(410).json({ error: 'Este convite já foi usado' });
  res.json(invitePreview(inv));
});

app.post('/api/invites/:code/accept', requireAuth, (req, res) => {
  const inv = db.getInvite(req.params.code);
  if (!inv) return res.status(404).json({ error: 'Convite não encontrado' });
  if (inv.status !== 'pending') return res.status(410).json({ error: 'Este convite já foi usado' });
  db.upsertUser({ email: req.user.email });
  if (db.getCoupleByUser(req.user.email)) return res.status(409).json({ error: 'Você já tem um espaço' });
  if (!db.acceptInvite(inv.code, req.user.email)) return res.status(410).json({ error: 'Este convite já foi usado' });
  res.json({ couple: db.getCoupleByUser(req.user.email) });
});
```

- [ ] **Step 4: Rodar testes**

```bash
npm test
```

Expected: PASS todos.

- [ ] **Step 5: Commit**

```bash
git add backend/server.js backend/__tests__/couples.test.js
git commit -m "feat: espaço do casal e convites — criar, editar, convidar, aceitar"
```

---

### Task 6: Design tokens + fontes + ícones + componentes base

**Files:**
- Modify: `index.html` (fontes, title, meta)
- Rewrite: `src/index.css`
- Rewrite: `tailwind.config.js`
- Create: `src/ui/icons.jsx`
- Create: `src/ui/kit.jsx`

- [ ] **Step 1: index.html com fontes novas**

Substituir `index.html` inteiro por:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#f6f0e7" />
    <title>Chamego — a vida a dois, organizada com carinho</title>
    <meta name="description" content="Agenda, listas, memórias e conexão num espaço privado do casal. Organize a vida a dois com carinho." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Copiar assets do handoff**

```bash
cp design_handoff_chamego/favicon.svg public/favicon.svg
cp design_handoff_chamego/images/abraco.png design_handoff_chamego/images/encontro.png design_handoff_chamego/images/janela.png design_handoff_chamego/images/onibus.png src/assets/
```

- [ ] **Step 3: index.css com variáveis do design**

Substituir `src/index.css` inteiro por:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #f6f0e7;
  --surface: #fffdf8;
  --bg-tint: #efe6d8;
  --accent: #bd6a4b;
  --accent-press: #a5573b;
  --accent-ink: #fff8f2;
  --ink: #2b2521;
  --ink-2: #6f645b;
  --ink-3: #a89d93;
  --line: color-mix(in srgb, var(--ink) 11%, transparent);
  --line-2: color-mix(in srgb, var(--ink) 18%, transparent);
  --accent-soft: color-mix(in srgb, var(--accent) 13%, var(--surface));
  --accent-line: color-mix(in srgb, var(--accent) 30%, transparent);
  --ease: cubic-bezier(.22, .61, .36, 1);
}

body {
  background: var(--bg);
  color: var(--ink);
  font-family: 'Hanken Grotesk', ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

::selection { background: var(--accent); color: var(--accent-ink); }

/* Transição entre telas do app (fade + slide sutil do handoff) */
.screen-enter {
  animation: screenIn .3s var(--ease);
}
@keyframes screenIn {
  from { opacity: 0; transform: translateX(14px); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .screen-enter { animation: none; }
}
```

- [ ] **Step 4: tailwind.config.js com tokens novos**

Substituir `tailwind.config.js` inteiro por:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        tint: 'var(--bg-tint)',
        accent: { DEFAULT: 'var(--accent)', press: 'var(--accent-press)', soft: 'var(--accent-soft)', ink: 'var(--accent-ink)' },
        ink: { DEFAULT: 'var(--ink)', 2: 'var(--ink-2)', 3: 'var(--ink-3)' },
      },
      borderColor: { line: 'var(--line)', 'line-2': 'var(--line-2)', 'accent-line': 'var(--accent-line)' },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '22px', btn: '13px', img: '24px' },
      transitionTimingFunction: { brand: 'cubic-bezier(.22,.61,.36,1)' },
    },
  },
  plugins: [],
};
```

- [ ] **Step 5: Ícones portados do handoff**

Criar `src/ui/icons.jsx` — portar TODOS os paths do objeto `ICONS` de
`design_handoff_chamego/js/core.js:8-48` (copiar os valores literalmente,
convertendo atributos para camelCase JSX):

```jsx
// Line icons 24x24, stroke 1.8 — portados de design_handoff_chamego/js/core.js
const PATHS = {
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1.4" /><circle cx="3.5" cy="12" r="1.4" /><circle cx="3.5" cy="18" r="1.4" /></>,
  moments: <><rect x="3" y="4" width="18" height="15" rx="2" /><circle cx="8.5" cy="10" r="1.7" /><path d="M21 16l-5-5-6 6-2-2-4 4" /></>,
  together: <><circle cx="9" cy="9" r="3.2" /><circle cx="16" cy="10.5" r="2.6" /><path d="M3.5 19c.6-3 2.6-4.6 5.5-4.6s4.9 1.6 5.5 4.6M14.5 19c.4-2 1.6-3.4 3.2-3.9" /></>,
  back: <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />,
  close: <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />,
  bell: <><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
  plus: <path d="M12 5v14M5 12h14" strokeLinecap="round" />,
  check: <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />,
  chevronR: <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
  heart: <path d="M12 20s-7-4.4-9.4-8.7C1 8 2.6 5 5.6 5c1.9 0 3.2 1.1 4 2.3.8-1.2 2.1-2.3 4-2.3 3 0 4.6 3 3 6.3C19 15.6 12 20 12 20z" />,
  image: <><rect x="3" y="4" width="18" height="15" rx="2" /><circle cx="8.5" cy="10" r="1.7" /><path d="M21 16l-5-5-6 6-2-2-4 4" /></>,
  chat: <path d="M4 5h16v11H9l-4 3.5V16H4z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.5a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2L10 21h4l.6-2.5c.7-.3 1.4-.7 2-1.2l2.3.9 2-3.4-2-1.6c.07-.4.1-.8.1-1.2z" /></>,
  user: <><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c1-4 4-5.8 7.5-5.8s6.5 1.8 7.5 5.8" /></>,
  link: <><path d="M9 15l6-6" /><path d="M13 6l1-1a4 4 0 0 1 5.7 5.7l-1.5 1.5" /><path d="M11 18l-1 1A4 4 0 0 1 4.3 13.3l1.5-1.5" /></>,
  whatsapp: <path d="M6 18l-2 1 .6-2.4A7.5 7.5 0 1 1 9.5 19a7.4 7.4 0 0 1-3.5-.9z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 6.5l9 6 9-6" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  camera: <><path d="M4 8h3l2-2h6l2 2h3v11H4z" /><circle cx="12" cy="13.5" r="3.4" /></>,
  edit: <path d="M4 20l1-4L16 5l3 3L8 19l-4 1z" />,
  trash: <path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20l-4.8-4.8" strokeLinecap="round" /></>,
  star: <path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.9l-5.6 3.1 1.4-6.2L3 9.5l6.4-.6z" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3z" /></>,
  shield: <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z" />,
  logout: <path d="M15 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h9M10 12h11m0 0-4-4m4 4-4 4" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  pin: <><path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10z" /><circle cx="12" cy="11" r="2.2" /></>,
  google: <><path d="M21 12.2c0-.7-.1-1.4-.2-2H12v3.9h5c-.2 1.2-.9 2.1-1.9 2.8v2.3h3.1c1.8-1.7 2.8-4.1 2.8-7z" /><path d="M12 21c2.4 0 4.5-.8 6-2.2l-3.1-2.3c-.8.6-1.9.9-2.9.9-2.3 0-4.2-1.5-4.9-3.6H3.9v2.3A9 9 0 0 0 12 21z" /><path d="M7.1 13.8a5.4 5.4 0 0 1 0-3.6V7.9H3.9a9 9 0 0 0 0 8.2z" /><path d="M12 6.6c1.3 0 2.5.5 3.4 1.3l2.5-2.5A8.7 8.7 0 0 0 12 3a9 9 0 0 0-8.1 4.9l3.2 2.3c.7-2.1 2.6-3.6 4.9-3.6z" /></>,
};

export default function Icon({ name, size = 20, className = '', stroke }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke || 'currentColor'}
      strokeWidth="1.8" className={className} aria-hidden="true">
      {PATHS[name] || null}
    </svg>
  );
}
```

- [ ] **Step 6: Kit de componentes base**

Criar `src/ui/kit.jsx`:

```jsx
import { Link } from 'react-router-dom';
import Icon from './icons.jsx';

const BTN_BASE = 'inline-flex items-center justify-center gap-2 rounded-btn font-semibold text-base px-6 py-3.5 transition-all duration-200 ease-brand disabled:opacity-50 disabled:pointer-events-none';
const BTN_STYLES = {
  primary: `${BTN_BASE} bg-accent text-accent-ink shadow hover:bg-accent-press hover:-translate-y-0.5 active:translate-y-0`,
  ghost: `${BTN_BASE} text-ink shadow-[inset_0_0_0_1px_var(--line-2)] hover:shadow-[inset_0_0_0_1px_var(--ink)]`,
};

export function Btn({ variant = 'primary', block = false, to, className = '', children, ...props }) {
  const cls = `${BTN_STYLES[variant]} ${block ? 'w-full' : ''} ${className}`;
  if (to) return <Link to={to} className={cls} {...props}>{children}</Link>;
  return <button className={cls} {...props}>{children}</button>;
}

export function Field({ label, ...props }) {
  return (
    <label className="block mb-4">
      {label && <span className="block text-sm font-medium text-ink-2 mb-1.5">{label}</span>}
      <input className="w-full rounded-btn bg-surface px-4 py-3 text-ink placeholder:text-ink-3 shadow-[inset_0_0_0_1px_var(--line-2)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)] outline-none transition-shadow"
        {...props} />
    </label>
  );
}

export function SelectField({ label, children, ...props }) {
  return (
    <label className="block mb-4">
      {label && <span className="block text-sm font-medium text-ink-2 mb-1.5">{label}</span>}
      <select className="w-full rounded-btn bg-surface px-4 py-3 text-ink shadow-[inset_0_0_0_1px_var(--line-2)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)] outline-none appearance-none" {...props}>
        {children}
      </select>
    </label>
  );
}

export function Card({ className = '', children, ...props }) {
  return <div className={`bg-surface rounded-card p-5 shadow-[0_1px_2px_rgba(43,37,33,.04),0_1px_0_var(--line)] ${className}`} {...props}>{children}</div>;
}

export function Row({ icon, title, sub, right, onClick, className = '' }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left bg-surface border-b border-line last:border-0 ${onClick ? 'hover:bg-accent-soft/40 transition-colors' : ''} ${className}`}>
      {icon && <span className="flex-none w-9 h-9 rounded-full bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)] grid place-items-center text-accent-press"><Icon name={icon} size={17} /></span>}
      <span className="flex-1 min-w-0">
        <span className="block font-medium text-[.95rem] text-ink">{title}</span>
        {sub && <span className="block text-sm text-ink-2">{sub}</span>}
      </span>
      {right ?? <Icon name="chevronR" size={14} className="text-ink-3" />}
    </Tag>
  );
}

export function RowList({ children, className = '' }) {
  return <div className={`rounded-card overflow-hidden shadow-[0_1px_2px_rgba(43,37,33,.04),0_1px_0_var(--line)] ${className}`}>{children}</div>;
}

export function Chip({ children, active = false, onClick, className = '' }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${active ? 'bg-accent-soft text-accent-press shadow-[inset_0_0_0_1px_var(--accent-line)]' : 'bg-surface text-ink-2 shadow-[inset_0_0_0_1px_var(--line-2)]'} ${className}`}>
      {children}
    </button>
  );
}

export function ChoiceCard({ icon, title, sub, selected, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3.5 rounded-card px-4 py-4 mb-2.5 text-left bg-surface transition-all ${selected ? 'shadow-[inset_0_0_0_1.5px_var(--accent)]' : 'shadow-[inset_0_0_0_1px_var(--line-2)] hover:shadow-[inset_0_0_0_1px_var(--ink)]'}`}>
      <span className="flex-none w-9 h-9 rounded-full bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)] grid place-items-center text-accent-press"><Icon name={icon} size={18} /></span>
      <span className="flex-1">
        <span className="block font-medium text-ink">{title}</span>
        {sub && <span className="block text-sm text-ink-2">{sub}</span>}
      </span>
      <span className={`flex-none w-5 h-5 rounded-full transition-all ${selected ? 'border-[6px] border-accent' : 'border border-line-2'}`} />
    </button>
  );
}

export function EmptyState({ icon, title, children, actions }) {
  return (
    <div className="flex flex-col items-center text-center px-6 pt-16 pb-10">
      <span className="w-16 h-16 rounded-full bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)] grid place-items-center text-accent mb-4"><Icon name={icon} size={26} /></span>
      <h3 className="font-display text-xl mb-1.5">{title}</h3>
      <p className="text-ink-2 text-[.95rem] max-w-[30ch] mb-5">{children}</p>
      {actions}
    </div>
  );
}

export function AppHeader({ back, title, right }) {
  return (
    <div className="flex items-center gap-3 py-3 min-h-[52px]">
      {back && (
        <button onClick={back} aria-label="Voltar" className="w-9 h-9 rounded-full grid place-items-center bg-surface shadow-[inset_0_0_0_1px_var(--line)] text-ink">
          <Icon name="back" size={18} />
        </button>
      )}
      <div className="flex-1 font-display text-lg">{title || ''}</div>
      {right}
    </div>
  );
}

export function ProgressDots({ step, total }) {
  return (
    <div className="flex gap-1.5 mb-5">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-accent' : 'w-1.5 bg-ink-3/40'}`} />
      ))}
    </div>
  );
}

export function Logo({ className = '' }) {
  return <span className={`font-display italic tracking-tight ${className}`}>chamego<span className="text-accent">.</span></span>;
}
```

- [ ] **Step 7: Gates**

```bash
npx eslint . && npm run build
```

Expected: OK.

- [ ] **Step 8: Commit**

```bash
git add index.html src/index.css tailwind.config.js src/ui public/favicon.svg src/assets
git commit -m "feat: design system novo — tokens terracota, Fraunces + Hanken Grotesk, ícones e kit base"
```

---

### Task 7: API client, sessão e roteador com guards

**Files:**
- Create: `src/lib/api.js`
- Create: `src/lib/session.jsx`
- Rewrite: `src/App.jsx`
- Create: placeholders de páginas (substituídos nas Tasks 8–14)

- [ ] **Step 1: API client**

Criar `src/lib/api.js`:

```js
// Wrapper fino de fetch: JSON, erros com mensagem do servidor.
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Algo deu errado. Tente de novo.');
    err.status = res.status;
    throw err;
  }
  return data;
}
```

- [ ] **Step 2: Provider de sessão**

Criar `src/lib/session.jsx`:

```jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, couple: null, partner: null });

  const refresh = useCallback(async () => {
    try {
      const me = await api('/api/me');
      setState({ loading: false, ...me });
    } catch {
      setState({ loading: false, user: null, couple: null, partner: null });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' });
    setState({ loading: false, user: null, couple: null, partner: null });
  }, []);

  return (
    <SessionContext.Provider value={{ ...state, refresh, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
```

- [ ] **Step 3: App.jsx com rotas e guards**

Substituir `src/App.jsx` por:

```jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SessionProvider, useSession } from './lib/session.jsx';
import LandingPage from './pages/LandingPage.jsx';
import EntrarPage from './pages/EntrarPage.jsx';
import ConvitePage from './pages/ConvitePage.jsx';
import ComecarFlow from './pages/app/ComecarFlow.jsx';
import AppShell from './pages/app/AppShell.jsx';

function RequireAuth({ children }) {
  const { loading, user } = useSession();
  const location = useLocation();
  if (loading) return <div className="min-h-screen grid place-items-center text-ink-3">…</div>;
  if (!user) return <Navigate to={`/entrar?next=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
}

// Fluxo obrigatório antes do app: termos → onboarding → espaço do casal
function RequireReady({ children }) {
  const { user, couple } = useSession();
  const pending = !user.termsAcceptedAt || !user.onboarding?.goal || !couple;
  if (pending) return <Navigate to="/app/comecar" replace />;
  return children;
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/entrar" element={<EntrarPage />} />
          <Route path="/convite/:code" element={<ConvitePage />} />
          <Route path="/app/comecar/*" element={<RequireAuth><ComecarFlow /></RequireAuth>} />
          <Route path="/app/*" element={<RequireAuth><RequireReady><AppShell /></RequireReady></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
```

- [ ] **Step 4: Placeholders temporários pras páginas ainda não construídas**

Criar arquivos mínimos que as próximas tasks substituem (evita build quebrado):

`src/pages/LandingPage.jsx`:
```jsx
export default function LandingPage() { return <p>landing — Task 14</p>; }
```
`src/pages/EntrarPage.jsx`:
```jsx
export default function EntrarPage() { return <p>entrar — Task 8</p>; }
```
`src/pages/ConvitePage.jsx`:
```jsx
export default function ConvitePage() { return <p>convite — Task 11</p>; }
```
`src/pages/app/ComecarFlow.jsx`:
```jsx
export default function ComecarFlow() { return <p>começar — Task 9</p>; }
```
`src/pages/app/AppShell.jsx`:
```jsx
export default function AppShell() { return <p>app — Task 12</p>; }
```

- [ ] **Step 5: Gates**

```bash
npx eslint . && npm run build && npm test
```

Expected: tudo OK.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: roteador novo com guards de auth e prontidão + provider de sessão"
```

---

### Task 8: Telas de entrada (welcome/login/link enviado)

**Files:**
- Rewrite: `src/pages/EntrarPage.jsx`

Design de referência: `design_handoff_chamego/js/screens.auth.js` telas
`splash`, `welcome`, `login`. Uma página única com três modos: apresentação
(welcome), login e confirmação de envio. Google Identity Services carregado
dinamicamente quando `googleClientId` existe. Sem telas de senha (auth é
Google + Link Mágico). Botão Apple do protótipo fica fora da fase 1.

- [ ] **Step 1: Implementar EntrarPage**

Substituir `src/pages/EntrarPage.jsx` por:

```jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useSession } from '../lib/session.jsx';
import { Btn, Field, Logo } from '../ui/kit.jsx';
import Icon from '../ui/icons.jsx';
import abraco from '../assets/abraco.png';

export default function EntrarPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/app';
  const erro = params.get('erro');
  const { user, loading, refresh } = useSession();

  const [mode, setMode] = useState('welcome'); // welcome | login | enviado
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(erro === 'link-invalido' ? 'Esse link expirou ou já foi usado. Peça outro.' : '');
  const googleBtn = useRef(null);

  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [loading, user, navigate, next]);

  // Google Identity Services — só quando o backend tem client id
  useEffect(() => {
    if (mode !== 'login') return;
    let cancelled = false;
    (async () => {
      const { googleClientId } = await api('/api/config');
      if (!googleClientId || cancelled) return;
      if (!document.getElementById('gsi-script')) {
        await new Promise((ok) => {
          const s = document.createElement('script');
          s.src = 'https://accounts.google.com/gsi/client';
          s.id = 'gsi-script';
          s.onload = ok;
          document.head.appendChild(s);
        });
      }
      if (cancelled || !window.google || !googleBtn.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          try {
            await api('/api/auth/google', { method: 'POST', body: { credential } });
            await refresh();
            navigate(next, { replace: true });
          } catch (e) {
            setError(e.message);
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtn.current, { theme: 'outline', size: 'large', width: 320, text: 'continue_with' });
    })();
    return () => { cancelled = true; };
  }, [mode, navigate, next, refresh]);

  async function sendLink(e) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await api('/api/auth/magic-link', { method: 'POST', body: { email } });
      setMode('enviado');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center">
      <div className="w-full max-w-[430px] flex-1 flex flex-col px-6 py-8 screen-enter">
        {mode === 'welcome' && (
          <div className="flex-1 flex flex-col justify-center text-center">
            <img src={abraco} alt="" className="rounded-img mb-8 max-h-[300px] object-cover" />
            <h1 className="font-display text-3xl mb-2">Um espaço só de <em className="text-accent">vocês dois</em></h1>
            <p className="text-ink-2 mb-8">Organize rotina, compromissos, listas e memórias em um lugar privado — e feito para durar.</p>
            <Btn block onClick={() => setMode('login')} className="mb-2.5">Criar conta</Btn>
            <Btn block variant="ghost" onClick={() => setMode('login')}>Já tenho conta</Btn>
          </div>
        )}

        {mode === 'login' && (
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-center mb-8"><Logo className="text-3xl" /></div>
            <div ref={googleBtn} className="flex justify-center mb-4 empty:hidden" />
            <div className="flex items-center gap-3 text-ink-3 text-sm my-4">
              <span className="flex-1 h-px bg-line" />ou continue com e-mail<span className="flex-1 h-px bg-line" />
            </div>
            <form onSubmit={sendLink}>
              <Field label="E-mail" type="email" required placeholder="voce@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
              <Btn block type="submit" disabled={sending}>{sending ? 'Enviando…' : 'Receber link de acesso'}</Btn>
            </form>
            {error && <p className="text-accent-press text-sm mt-3 text-center">{error}</p>}
            <p className="text-ink-3 text-sm text-center mt-6">Sem senha: enviamos um link de uso único pro seu e-mail. Conta nova nasce no primeiro acesso.</p>
          </div>
        )}

        {mode === 'enviado' && (
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <span className="w-16 h-16 rounded-full bg-accent-soft grid place-items-center text-accent mb-4"><Icon name="mail" size={26} /></span>
            <h2 className="font-display text-2xl mb-2">Confira seu e-mail</h2>
            <p className="text-ink-2 max-w-[30ch] mb-6">Enviamos um link de acesso para <strong className="text-ink">{email}</strong>. Ele vale por 15 minutos.</p>
            <button className="text-accent font-medium text-sm" onClick={() => setMode('login')}>Usar outro e-mail</button>
          </div>
        )}
      </div>
    </div>
  );
}
```

Nota sobre a linha `bg-line` acima: `--line` é cor com transparência via
color-mix; se o Tailwind não gerar `bg-line` (está só em borderColor no config),
trocar por `bg-ink-3/30`.

- [ ] **Step 2: Gates + verificação manual**

```bash
npx eslint . && npm run build
npm run dev
```

Manual: abrir `http://localhost:5173/entrar` — welcome → login → digitar email
→ "Confira seu e-mail"; console do backend loga o link mágico (SMTP ausente);
abrir o link → redireciona pra `/app/comecar` (placeholder).

- [ ] **Step 3: Commit**

```bash
git add src/pages/EntrarPage.jsx
git commit -m "feat: tela de entrada — welcome, login Google + link mágico"
```

---

### Task 9: Fluxo Começar — termos + onboarding

**Files:**
- Rewrite: `src/pages/app/ComecarFlow.jsx`
- Create: `src/pages/app/steps/TermosStep.jsx`
- Create: `src/pages/app/steps/OnboardingSteps.jsx`
- Create: `src/pages/app/steps/EspacoSteps.jsx` (placeholder; Task 10 implementa)

O fluxo Começar é uma máquina de passos: termos → objetivo → estágio →
sozinho/convidar → nome do espaço → data → convite. Esta task faz o container +
termos + onboarding; Task 10 faz espaço + convite.

- [ ] **Step 1: Container do fluxo**

Substituir `src/pages/app/ComecarFlow.jsx` por:

```jsx
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../../lib/session.jsx';
import TermosStep from './steps/TermosStep.jsx';
import OnboardingSteps from './steps/OnboardingSteps.jsx';
import EspacoSteps from './steps/EspacoSteps.jsx';

// Ordem do fluxo: termos → onboarding (3 telas) → espaço (nome, data, convite).
// Retomada: quem já aceitou termos cai direto no onboarding, e assim por diante.
export default function ComecarFlow() {
  const { user, couple } = useSession();
  const [stage, setStage] = useState(() => {
    if (!user.termsAcceptedAt) return 'termos';
    if (!user.onboarding?.goal) return 'onboarding';
    if (!couple) return 'espaco';
    return 'pronto';
  });

  if (stage === 'pronto') return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-bg flex justify-center">
      <div className="w-full max-w-[430px] px-6 py-6 screen-enter">
        {stage === 'termos' && <TermosStep onDone={() => setStage('onboarding')} />}
        {stage === 'onboarding' && <OnboardingSteps onDone={() => setStage('espaco')} />}
        {stage === 'espaco' && <EspacoSteps onDone={() => setStage('pronto')} />}
      </div>
    </div>
  );
}
```

Placeholder `src/pages/app/steps/EspacoSteps.jsx` (Task 10 substitui):
```jsx
export default function EspacoSteps() { return <p>espaço — Task 10</p>; }
```

- [ ] **Step 2: Termos**

Criar `src/pages/app/steps/TermosStep.jsx`:

```jsx
import { useState } from 'react';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session.jsx';
import { Btn, Card, AppHeader } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

export default function TermosStep({ onDone }) {
  const { refresh } = useSession();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  async function accept() {
    setSaving(true);
    try {
      await api('/api/me', { method: 'PATCH', body: { acceptTerms: true } });
      await refresh();
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AppHeader title="Termos e privacidade" />
      <Card className="mb-6 text-[.9rem] text-ink-2 leading-relaxed max-h-[320px] overflow-y-auto">
        <p className="mb-3"><strong className="text-ink">Seu espaço é privado.</strong> Tudo que vocês registram no Chamego — fotos, listas, conversas — é visível apenas para o casal, nunca para terceiros.</p>
        <p className="mb-3">Você pode exportar ou excluir seus dados a qualquer momento, nas Configurações.</p>
        <p>Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade do Chamego.</p>
      </Card>
      <button onClick={() => setChecked(!checked)} className="w-full flex items-center gap-3 bg-surface rounded-card px-4 py-3.5 mb-6 text-left shadow-[inset_0_0_0_1px_var(--line-2)]">
        <span className={`flex-none w-5 h-5 rounded grid place-items-center transition-colors ${checked ? 'bg-accent text-accent-ink' : 'shadow-[inset_0_0_0_1.5px_var(--line-2)]'}`}>
          {checked && <Icon name="check" size={12} />}
        </span>
        <span className="text-[.92rem] font-medium">Li e aceito os termos e a política de privacidade</span>
      </button>
      <Btn block disabled={!checked || saving} onClick={accept}>Continuar</Btn>
    </div>
  );
}
```

- [ ] **Step 3: Onboarding (3 passos)**

Criar `src/pages/app/steps/OnboardingSteps.jsx`:

```jsx
import { useState } from 'react';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session.jsx';
import { Btn, ChoiceCard, AppHeader, ProgressDots } from '../../../ui/kit.jsx';

const STEPS = [
  {
    key: 'goal',
    title: 'O que você mais busca agora?',
    sub: 'Vamos usar isso pra personalizar seu início.',
    options: [
      { value: 'rotina', icon: 'list', title: 'Organizar a rotina', sub: 'Tarefas, compras e casa' },
      { value: 'conexao', icon: 'heart', title: 'Fortalecer a conexão', sub: 'Check-ins e momentos' },
      { value: 'datas', icon: 'calendar', title: 'Lembrar datas importantes', sub: 'Aniversários e eventos' },
      { value: 'planejar', icon: 'together', title: 'Planejar a vida a dois', sub: 'Metas e objetivos' },
    ],
  },
  {
    key: 'stage',
    title: 'Em que fase vocês estão?',
    sub: 'Isso ajusta as sugestões que aparecem pra vocês.',
    options: [
      { value: 'morando', icon: 'home', title: 'Morando juntos' },
      { value: 'namorando', icon: 'heart', title: 'Namorando' },
      { value: 'noivos', icon: 'star', title: 'Noivos' },
      { value: 'distancia', icon: 'pin', title: 'À distância' },
      { value: 'outro', icon: 'together', title: 'Outro' },
    ],
  },
  {
    key: 'alone',
    title: 'Como quer começar?',
    sub: 'Você pode usar sozinho(a) agora e convidar seu par depois — sem pressa.',
    options: [
      { value: 'sozinho', icon: 'user', title: 'Usar sozinho(a) por enquanto', sub: 'Convido meu par mais tarde' },
      { value: 'convidar', icon: 'together', title: 'Convidar meu par agora', sub: 'Criamos o espaço juntos' },
    ],
  },
];

export default function OnboardingSteps({ onDone }) {
  const { refresh } = useSession();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const step = STEPS[i];
  const selected = answers[step.key];

  async function next() {
    if (i < STEPS.length - 1) return setI(i + 1);
    setSaving(true);
    try {
      await api('/api/me', { method: 'PATCH', body: { onboarding: answers } });
      await refresh();
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AppHeader back={i > 0 ? () => setI(i - 1) : undefined} />
      <ProgressDots step={i} total={STEPS.length} />
      <h1 className="font-display text-[1.7rem] leading-tight mb-1.5">{step.title}</h1>
      <p className="text-ink-2 mb-6">{step.sub}</p>
      {step.options.map((o) => (
        <ChoiceCard key={o.value} icon={o.icon} title={o.title} sub={o.sub}
          selected={selected === o.value}
          onClick={() => setAnswers({ ...answers, [step.key]: o.value })} />
      ))}
      <Btn block className="mt-5" disabled={!selected || saving} onClick={next}>Continuar</Btn>
    </div>
  );
}
```

- [ ] **Step 4: Gates + manual**

```bash
npx eslint . && npm run build
```

Manual: logar via link mágico → `/app/comecar` mostra termos → aceitar →
3 passos de onboarding → placeholder do espaço.

- [ ] **Step 5: Commit**

```bash
git add src/pages/app
git commit -m "feat: fluxo começar — termos e onboarding em 3 passos"
```

---

### Task 10: Fluxo Começar — espaço do casal + convite

**Files:**
- Rewrite: `src/pages/app/steps/EspacoSteps.jsx`

Design: `screens.auth.js` telas `couple-name`, `couple-date`, `invite-partner`.
Sem upload de foto na fase 1 (círculo com câmera do protótipo fica de fora).
Envio de convite por email também fica fora (link + WhatsApp + código cobrem
o fluxo); entra em fase futura.

- [ ] **Step 1: Implementar EspacoSteps**

Substituir `src/pages/app/steps/EspacoSteps.jsx` por:

```jsx
import { useState } from 'react';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session.jsx';
import { Btn, Field, SelectField, AppHeader, Row, RowList } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const LABELS = ['Primeiro encontro', 'Início do namoro', 'Noivado', 'Casamento', 'Outro'];

export default function EspacoSteps({ onDone }) {
  const { refresh } = useSession();
  const [step, setStep] = useState('nome'); // nome | data | convite
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [label, setLabel] = useState(LABELS[0]);
  const [invite, setInvite] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function createSpace(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { couple } = await api('/api/couples', { method: 'POST', body: { name, milestoneDate: date, milestoneLabel: label } });
      const { invite: inv } = await api(`/api/couples/${couple.id}/invites`, { method: 'POST' });
      setInvite(inv);
      setStep('convite');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(invite.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function finish() {
    await refresh();
    onDone();
  }

  if (step === 'nome') {
    return (
      <div>
        <AppHeader title="Seu espaço" />
        <p className="text-ink-2 mb-6">Dê um nome carinhoso ao espaço de vocês.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep('data'); }}>
          <Field label="Nome do casal ou espaço" required placeholder="Ex.: Mari & João"
            value={name} onChange={(e) => setName(e.target.value)} />
          <Btn block type="submit" disabled={!name.trim()}>Continuar</Btn>
        </form>
      </div>
    );
  }

  if (step === 'data') {
    return (
      <div>
        <AppHeader back={() => setStep('nome')} title="Data importante" />
        <p className="text-ink-2 mb-6">Escolha a data que vai virar o contador de dias juntos.</p>
        <form onSubmit={createSpace}>
          <Field label="Data" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          <SelectField label="O que essa data representa?" value={label} onChange={(e) => setLabel(e.target.value)}>
            {LABELS.map((l) => <option key={l}>{l}</option>)}
          </SelectField>
          <Btn block type="submit" disabled={!date || saving}>{saving ? 'Criando…' : 'Continuar'}</Btn>
          {error && <p className="text-accent-press text-sm mt-3 text-center">{error}</p>}
        </form>
      </div>
    );
  }

  const shareText = encodeURIComponent(`Criei um espaço pra nós dois no Chamego 💛 Entra aqui: ${invite.url}`);
  return (
    <div>
      <AppHeader title="Convide seu par" />
      <p className="text-ink-2 mb-5">Envie o convite agora ou pule e convide depois nas configurações.</p>
      <RowList className="mb-5">
        <Row icon="link" title={copied ? 'Link copiado!' : 'Copiar link do convite'} sub={invite.url.replace(/^https?:\/\//, '')} onClick={copyLink} />
        <Row icon="whatsapp" title="Enviar pelo WhatsApp" onClick={() => window.open(`https://wa.me/?text=${shareText}`, '_blank')} />
        <Row icon="shield" title="Usar código de pareamento" sub={`Código: ${invite.code}`} right={<span />} />
      </RowList>
      <Btn block variant="ghost" onClick={finish}>Continuar por enquanto</Btn>
      <p className="text-ink-3 text-sm text-center mt-4 flex items-center justify-center gap-1.5">
        <Icon name="clock" size={14} /> Assim que seu par aceitar, o espaço se conecta sozinho.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Gates + manual**

```bash
npx eslint . && npm run build && npm test
```

Manual: completar fluxo → nome → data → tela de convite com link/código reais
→ Continuar → `/app` (placeholder AppShell).

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/steps/EspacoSteps.jsx
git commit -m "feat: criação do espaço do casal com convite (link, WhatsApp, código)"
```

---

### Task 11: Página de aceite do convite (/convite/:code)

**Files:**
- Rewrite: `src/pages/ConvitePage.jsx`

- [ ] **Step 1: Implementar ConvitePage**

Substituir `src/pages/ConvitePage.jsx` por:

```jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useSession } from '../lib/session.jsx';
import { Btn, Logo } from '../ui/kit.jsx';
import Icon from '../ui/icons.jsx';

export default function ConvitePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { loading, user, couple, refresh } = useSession();
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    api(`/api/invites/${code}`).then(setPreview).catch((e) => setError(e.message));
  }, [code]);

  async function accept() {
    setAccepting(true);
    setError('');
    try {
      await api(`/api/invites/${code}/accept`, { method: 'POST' });
      await refresh();
      navigate('/app', { replace: true });
    } catch (e) {
      setError(e.message);
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex justify-center">
      <div className="w-full max-w-[430px] px-6 py-10 flex flex-col items-center text-center screen-enter">
        <Logo className="text-2xl mb-10" />
        {error && !preview && (
          <>
            <span className="w-16 h-16 rounded-full bg-accent-soft grid place-items-center text-accent mb-4"><Icon name="close" size={24} /></span>
            <h1 className="font-display text-2xl mb-2">Convite indisponível</h1>
            <p className="text-ink-2 mb-6">{error}</p>
            <Btn to="/">Conhecer o Chamego</Btn>
          </>
        )}
        {preview && (
          <>
            <span className="w-16 h-16 rounded-full bg-accent-soft grid place-items-center text-accent mb-4"><Icon name="heart" size={28} /></span>
            <h1 className="font-display text-2xl mb-2">
              {preview.invitedBy} convidou você para o espaço <em className="text-accent">{preview.coupleName}</em>
            </h1>
            <p className="text-ink-2 max-w-[32ch] mb-8">Um lugar privado pra vocês organizarem a vida a dois: agenda, listas e memórias.</p>
            {loading ? null : user ? (
              couple ? (
                <p className="text-ink-2">Você já tem um espaço no Chamego. Pra aceitar este convite, fale com seu par — cada pessoa participa de um espaço só.</p>
              ) : (
                <>
                  <Btn block onClick={accept} disabled={accepting}>{accepting ? 'Entrando…' : 'Aceitar convite'}</Btn>
                  {error && <p className="text-accent-press text-sm mt-3">{error}</p>}
                </>
              )
            ) : (
              <>
                <Btn block to={`/entrar?next=${encodeURIComponent(`/convite/${code}`)}`}>Entrar para aceitar</Btn>
                <p className="text-ink-3 text-sm mt-3">Rapidinho: só o seu e-mail, sem senha.</p>
              </>
            )}
          </>
        )}
        {!preview && !error && <p className="text-ink-3">Carregando convite…</p>}
        <p className="mt-auto pt-10 text-sm text-ink-3">
          <Link to="/" className="underline">O que é o Chamego?</Link>
        </p>
      </div>
    </div>
  );
}
```

Nota: quem aceita convite pula o fluxo Começar de espaço (já tem espaço), mas
termos + onboarding continuam obrigatórios — o guard `RequireReady` manda pro
`/app/comecar`, que detecta `couple` existente e pula direto pra `pronto` após
termos/onboarding. Comportamento correto por construção do `ComecarFlow`.

- [ ] **Step 2: Gates + manual**

```bash
npx eslint . && npm run build
```

Manual (2 navegadores/aba anônima): criar espaço no navegador A, copiar link
`/convite/CODIGO`, abrir no navegador B → preview → entrar com outro email →
aceitar → termos/onboarding → `/app`. No navegador A, `/api/me` passa a trazer
partner.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ConvitePage.jsx
git commit -m "feat: página de aceite do convite com preview e login embutido"
```

---

### Task 12: Shell do app — tab bar, Início real, abas vazias

**Files:**
- Rewrite: `src/pages/app/AppShell.jsx`
- Create: `src/pages/app/tabs/InicioTab.jsx`
- Create: `src/pages/app/tabs/PlaceholderTab.jsx`
- Create: `src/pages/app/tabs/ConfigTab.jsx` (placeholder; Task 13 implementa)

Design: `screens.home.js` (estados sozinho/conectado derivados de dados reais),
`core.js` `TABS`, `app.css` tab bar.

- [ ] **Step 1: AppShell com tab bar**

Substituir `src/pages/app/AppShell.jsx` por:

```jsx
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import Icon from '../../ui/icons.jsx';
import InicioTab from './tabs/InicioTab.jsx';
import PlaceholderTab from './tabs/PlaceholderTab.jsx';
import ConfigTab from './tabs/ConfigTab.jsx';

const TABS = [
  { path: '/app', icon: 'home', label: 'Início', end: true },
  { path: '/app/agenda', icon: 'calendar', label: 'Agenda' },
  { path: '/app/listas', icon: 'list', label: 'Listas' },
  { path: '/app/momentos', icon: 'moments', label: 'Momentos' },
  { path: '/app/voces', icon: 'together', label: 'Vocês' },
];

export default function AppShell() {
  return (
    <div className="min-h-screen bg-bg flex justify-center">
      <div className="w-full max-w-[430px] flex flex-col min-h-screen">
        <main className="flex-1 px-5 pb-24 screen-enter">
          <Routes>
            <Route index element={<InicioTab />} />
            <Route path="agenda" element={<PlaceholderTab icon="calendar" title="Agenda" text="Eventos, lembretes e a meta de dates de vocês vão morar aqui." />} />
            <Route path="listas" element={<PlaceholderTab icon="list" title="Listas" text="Compras, casa, desejos — listas compartilhadas chegam em breve." />} />
            <Route path="momentos" element={<PlaceholderTab icon="moments" title="Momentos" text="A linha do tempo das memórias de vocês vai crescer aqui." />} />
            <Route path="voces" element={<PlaceholderTab icon="together" title="Vocês" text="Check-ins, metas e o chat do casal estão a caminho." />} />
            <Route path="config" element={<ConfigTab />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </main>
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/90 backdrop-blur border-t border-line flex justify-around px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
          {TABS.map((t) => (
            <NavLink key={t.path} to={t.path} end={t.end}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium transition-colors ${isActive ? 'text-accent' : 'text-ink-3'}`}>
              <Icon name={t.icon} size={22} />
              <span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
```

Placeholder `src/pages/app/tabs/ConfigTab.jsx` (Task 13 substitui):
```jsx
export default function ConfigTab() { return <p>config — Task 13</p>; }
```

- [ ] **Step 2: PlaceholderTab (abas fase 2+)**

Criar `src/pages/app/tabs/PlaceholderTab.jsx`:

```jsx
import { EmptyState, Chip } from '../../../ui/kit.jsx';

export default function PlaceholderTab({ icon, title, text }) {
  return (
    <div className="pt-10">
      <h1 className="font-display text-2xl mb-2">{title}</h1>
      <EmptyState icon={icon} title="Em breve" actions={<Chip active>✦ chegando na próxima fase</Chip>}>
        {text}
      </EmptyState>
    </div>
  );
}
```

- [ ] **Step 3: InicioTab com dados reais**

Criar `src/pages/app/tabs/InicioTab.jsx`:

```jsx
import { Link } from 'react-router-dom';
import { useSession } from '../../../lib/session.jsx';
import { Btn, Card, Logo } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

function daysTogether(iso) {
  const ms = Date.now() - new Date(`${iso}T00:00:00`).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function InicioTab() {
  const { user, couple, partner } = useSession();
  const solo = !partner;
  const firstName = (user.name || user.email).split(/[\s@]/)[0];

  return (
    <div>
      <div className="flex items-center justify-between pt-5 pb-2">
        <Logo className="text-xl" />
        <Link to="/app/config" aria-label="Configurações"
          className="w-9 h-9 rounded-full bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)] grid place-items-center text-accent-press font-semibold text-sm">
          {firstName[0]?.toUpperCase() || '♥'}
        </Link>
      </div>
      <h1 className="font-display text-[1.7rem] leading-tight mb-1">
        {greeting()}, {solo ? firstName : couple.name}
      </h1>
      {solo && <p className="text-ink-2 text-sm mb-4">Você está usando o Chamego sozinho(a) por enquanto.</p>}

      {solo && (
        <Card className="mb-4 flex items-center gap-3.5">
          <span className="flex-none w-9 h-9 rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name="together" size={17} /></span>
          <span className="flex-1">
            <span className="block font-medium text-[.95rem]">Convide seu par</span>
            <span className="block text-sm text-ink-2">Compartilhe o espaço quando quiser</span>
          </span>
          <Btn to="/app/config" className="!px-4 !py-2 !text-sm">Convidar</Btn>
        </Card>
      )}

      <Card className="mb-4 text-center">
        <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-1">{couple.milestone_label || 'Juntos há'}</p>
        <p className="font-display text-[2.6rem] text-accent leading-none my-1">
          {daysTogether(couple.milestone_date)} <span className="font-sans text-lg text-ink-2">dias</span>
        </p>
        <p className="text-sm text-ink-2">desde {formatDate(couple.milestone_date)}</p>
      </Card>

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mt-6 mb-2">Em breve por aqui</p>
      <Card className="text-ink-2 text-[.95rem]">
        Próximos eventos, tarefas pendentes e o check-in do dia vão aparecer neste
        painel conforme Agenda, Listas e Vocês forem chegando. ✦
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Gates + manual**

```bash
npx eslint . && npm run build
```

Manual: `/app` mostra saudação + contador real de dias; estado sozinho mostra
card de convite; com parceiro conectado o título vira o nome do espaço e o
card some. Tab bar navega entre as 5 abas.

- [ ] **Step 5: Commit**

```bash
git add src/pages/app
git commit -m "feat: shell do app — tab bar 5 abas e Início com contador e estados reais"
```

---

### Task 13: Configurações

**Files:**
- Rewrite: `src/pages/app/tabs/ConfigTab.jsx`

Escopo mínimo da spec: editar nome do perfil, editar espaço (nome/data),
reexibir convite (se sozinho), sair.

- [ ] **Step 1: Implementar ConfigTab**

Substituir `src/pages/app/tabs/ConfigTab.jsx` por:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session.jsx';
import { Btn, Field, AppHeader, Row, RowList } from '../../../ui/kit.jsx';

export default function ConfigTab() {
  const navigate = useNavigate();
  const { user, couple, partner, refresh, logout } = useSession();
  const [name, setName] = useState(user.name || '');
  const [coupleName, setCoupleName] = useState(couple.name);
  const [date, setDate] = useState(couple.milestone_date);
  const [saved, setSaved] = useState(false);
  const [invite, setInvite] = useState(null);

  async function save(e) {
    e.preventDefault();
    if (name !== user.name) await api('/api/me', { method: 'PATCH', body: { name } });
    if (coupleName !== couple.name || date !== couple.milestone_date) {
      await api(`/api/couples/${couple.id}`, { method: 'PATCH', body: { name: coupleName, milestoneDate: date } });
    }
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function newInvite() {
    const { invite: inv } = await api(`/api/couples/${couple.id}/invites`, { method: 'POST' });
    setInvite(inv);
    await navigator.clipboard.writeText(inv.url).catch(() => {});
  }

  async function sair() {
    await logout();
    navigate('/');
  }

  return (
    <div className="pt-3">
      <AppHeader back={() => navigate('/app')} title="Configurações" />

      <form onSubmit={save}>
        <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mt-4 mb-2">Você</p>
        <Field label="Seu nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como seu par te chama?" />
        <p className="text-sm text-ink-3 -mt-2 mb-4">{user.email}</p>

        <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mt-4 mb-2">Espaço do casal</p>
        <Field label="Nome do espaço" value={coupleName} onChange={(e) => setCoupleName(e.target.value)} />
        <Field label="Data do contador" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Btn block type="submit">{saved ? 'Salvo ✓' : 'Salvar'}</Btn>
      </form>

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mt-8 mb-2">Parceiro(a)</p>
      <RowList className="mb-6">
        {partner ? (
          <Row icon="together" title={partner.name || partner.email} sub="Conectado(a) ao espaço" right={<span />} />
        ) : (
          <Row icon="link" title={invite ? 'Link copiado!' : 'Gerar convite pro seu par'}
            sub={invite ? `Código: ${invite.code}` : 'Cria um link e código novos'} onClick={newInvite} />
        )}
      </RowList>

      <Btn block variant="ghost" onClick={sair}>Sair da conta</Btn>
      <p className="text-center text-xs text-ink-3 mt-6 pb-4">Chamego · feito com carinho</p>
    </div>
  );
}
```

- [ ] **Step 2: Gates + manual**

```bash
npx eslint . && npm run build
```

Manual: editar nome/data → salvar → Início reflete; gerar convite copia link;
sair → volta pra landing.

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/tabs/ConfigTab.jsx
git commit -m "feat: configurações — perfil, espaço, convite e sair"
```

---

### Task 14: Landing page nova

**Files:**
- Rewrite: `src/pages/LandingPage.jsx`

Estrutura visual de `design_handoff_chamego/Chamego.html` + `chamego.css`
(hero central, steps numerados, scenes 2×2, quotes, FAQ, CTA final) com COPY
NOVA do produto de organização. CTAs levam a `/entrar`. Sem seção de preço na
fase 1 (produto ainda sem premium) — substituída por "grátis pra começar" nos
subtítulos dos CTAs.

- [ ] **Step 1: Implementar LandingPage**

Substituir `src/pages/LandingPage.jsx` por:

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../ui/kit.jsx';
import abraco from '../assets/abraco.png';
import encontro from '../assets/encontro.png';
import janela from '../assets/janela.png';
import onibus from '../assets/onibus.png';

const STEPS = [
  { num: '01', title: 'Criem o espaço', text: 'Escolham um nome carinhoso, a data que virou o começo de tudo e pronto: o cantinho de vocês existe.' },
  { num: '02', title: 'Convide seu par', text: 'Um link ou código de pareamento conecta os dois. Dá pra começar sozinho(a) e convidar depois, sem pressa.' },
  { num: '03', title: 'Organizem juntos', text: 'Agenda, listas e memórias compartilhadas — tudo que é de vocês dois, finalmente num lugar só.' },
];

const SCENES = [
  { img: encontro, idx: 'Agenda', title: 'Para nunca mais esquecer', text: 'Aniversários, consultas, jantares. Um calendário só do casal, com lembretes pros dois.' },
  { img: janela, idx: 'Listas', title: 'Para dividir a vida real', text: 'Mercado, casa, presentes, sonhos. Listas compartilhadas onde cada um faz a sua parte.' },
  { img: onibus, idx: 'Momentos', title: 'Para guardar o que importa', text: 'A linha do tempo das memórias de vocês: fotos, notas e datas que merecem ser lembradas.' },
  { img: abraco, idx: 'Vocês', title: 'Para cuidar da conexão', text: 'Check-ins de humor, metas a dois e um chat privado. Carinho também se organiza.' },
];

const QUOTES = [
  { text: '“A gente vivia esquecendo compromisso um do outro. Agora a agenda é nossa, não minha e dele.”', name: 'Mariana & Pedro', place: 'São Paulo' },
  { text: '“Namoro à distância: o contador de dias e o check-in diário deixaram tudo mais perto.”', name: 'Letícia & Bruno', place: 'Recife/Lisboa' },
  { text: '“Lista de mercado compartilhada salvou nosso sábado. Parece pouco. Não é.”', name: 'Camila & Jé', place: 'Belo Horizonte' },
  { text: '“Achei que era só mais um app. Virou o lugar onde a gente planeja a vida.”', name: 'João & Rafa', place: 'Curitiba' },
];

const FAQ = [
  { q: 'O Chamego é grátis?', a: 'Sim — criar o espaço, agenda, listas e momentos são grátis. Mais pra frente teremos packs premium opcionais, mas o essencial continua livre.' },
  { q: 'Preciso de senha?', a: 'Não. Você entra com sua conta Google ou recebe um link mágico no e-mail. Sem senha pra esquecer.' },
  { q: 'Meu par precisa baixar algo?', a: 'Não — o Chamego funciona no navegador do celular e do computador. Seu par entra pelo link do convite e pronto.' },
  { q: 'Quem vê o que a gente registra?', a: 'Só vocês dois. O espaço é privado por padrão: nada de feed, nada de terceiros.' },
  { q: 'E se eu quiser começar sozinho(a)?', a: 'Pode! Crie o espaço, use no seu ritmo e convide seu par quando fizer sentido.' },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-line last:border-b">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-6 py-5 text-left font-display text-lg">
        {q}
        <span className={`flex-none text-accent transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && <p className="pb-6 text-ink-2 max-w-[62ch]">{a}</p>}
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="font-sans">
      <header className={`fixed inset-x-0 top-0 z-50 transition-all ${scrolled ? 'bg-bg/80 backdrop-blur-md shadow-[0_1px_0_var(--line)]' : ''}`}>
        <div className="max-w-[1120px] mx-auto px-5 md:px-10 h-[72px] flex items-center justify-between">
          <Logo className="text-2xl" />
          <nav className="flex items-center gap-6">
            <a href="#como" className="hidden md:block text-[.95rem] text-ink-2 hover:text-ink font-medium">Como funciona</a>
            <a href="#areas" className="hidden md:block text-[.95rem] text-ink-2 hover:text-ink font-medium">O que tem</a>
            <a href="#faq" className="hidden md:block text-[.95rem] text-ink-2 hover:text-ink font-medium">Dúvidas</a>
            <Link to="/entrar" className="bg-accent text-accent-ink font-semibold rounded-btn px-4 py-2 text-[.95rem] hover:bg-accent-press transition-colors">Criar nosso espaço</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="pt-32 md:pt-44 pb-20 md:pb-28 text-center">
          <div className="max-w-[880px] mx-auto px-5">
            <p className="text-[.74rem] font-semibold tracking-[.2em] uppercase text-accent mb-5">Feito para a vida a dois</p>
            <h1 className="font-display font-normal tracking-tight leading-[1.04] text-[2.7rem] md:text-[4.5rem] mb-4">
              A vida de vocês,<br />organizada com <em className="text-accent">carinho</em>.
            </h1>
            <p className="text-lg text-ink-2 max-w-[50ch] mx-auto mb-8">
              Agenda, listas, memórias e conexão num espaço privado do casal.
              Menos "esqueci de te falar", mais tempo de qualidade juntos.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Link to="/entrar" className="bg-accent text-accent-ink font-semibold rounded-btn px-8 py-4 text-lg hover:bg-accent-press hover:-translate-y-0.5 transition-all shadow-lg">
                Criar nosso espaço →
              </Link>
              <p className="text-[.95rem] text-ink-2">Grátis pra começar · sem senha · pronto em 2 minutos</p>
            </div>
            <div className="mt-14 md:mt-20 relative max-w-[760px] mx-auto">
              <img src={abraco} alt="Casal abraçado" className="w-full max-h-[560px] object-cover rounded-img shadow-2xl" />
              <div className="absolute top-[6%] left-2 md:-left-4 bg-surface rounded-card px-4 py-3 shadow-xl flex items-center gap-3 text-sm font-medium">
                <span className="w-8 h-8 rounded-full bg-accent-soft grid place-items-center text-accent">♥</span>
                <span><span className="block text-[.7rem] uppercase tracking-wider text-ink-3 font-semibold">Juntos há</span>743 dias</span>
              </div>
              <div className="absolute bottom-[8%] right-2 md:-right-4 bg-surface rounded-card px-4 py-3 shadow-xl text-sm text-left">
                <span className="block text-[.7rem] uppercase tracking-wider text-ink-3 font-semibold">Próximo evento</span>
                <span className="font-semibold">Jantar de aniversário 🎂</span>
              </div>
            </div>
          </div>
        </section>

        <section id="como" className="py-20 md:py-28">
          <div className="max-w-[1120px] mx-auto px-5 md:px-10">
            <p className="text-[.74rem] font-semibold tracking-[.2em] uppercase text-accent mb-4">Como funciona</p>
            <h2 className="font-display text-3xl md:text-5xl leading-tight max-w-[20ch]">Três passos e o espaço está <em className="text-accent">no ar</em>.</h2>
            <div className="grid md:grid-cols-3 gap-8 md:gap-14 mt-14">
              {STEPS.map((s) => (
                <div key={s.num} className="pt-6 border-t border-line">
                  <span className="font-display italic text-5xl text-accent block mb-2">{s.num}</span>
                  <h3 className="font-display text-xl mb-2">{s.title}</h3>
                  <p className="text-ink-2">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="areas" className="py-20 md:py-28 bg-tint">
          <div className="max-w-[1120px] mx-auto px-5 md:px-10">
            <p className="text-[.74rem] font-semibold tracking-[.2em] uppercase text-accent mb-4">O que tem dentro</p>
            <h2 className="font-display text-3xl md:text-5xl leading-tight max-w-[22ch]">Tudo que é de vocês dois num <em className="text-accent">lugar só</em>.</h2>
            <div className="grid md:grid-cols-2 gap-6 mt-14">
              {SCENES.map((s) => (
                <article key={s.idx} className="bg-surface rounded-card overflow-hidden shadow hover:-translate-y-1 transition-transform">
                  <img src={s.img} alt="" className="w-full h-[210px] object-cover" />
                  <div className="p-6">
                    <span className="text-[.74rem] font-semibold tracking-[.18em] uppercase text-ink-3">{s.idx}</span>
                    <h3 className="font-display text-2xl mt-2 mb-1">{s.title}</h3>
                    <p className="text-ink-2">{s.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="max-w-[1120px] mx-auto px-5 md:px-10">
            <p className="text-[.74rem] font-semibold tracking-[.2em] uppercase text-accent mb-4">Quem já usa</p>
            <h2 className="font-display text-3xl md:text-5xl leading-tight max-w-[20ch]">Casais que pararam de se <em className="text-accent">desencontrar</em>.</h2>
            <div className="grid md:grid-cols-2 gap-6 mt-14">
              {QUOTES.map((q) => (
                <figure key={q.name} className="bg-surface rounded-card p-8 shadow flex flex-col gap-5">
                  <p className="font-display italic text-xl leading-relaxed">{q.text}</p>
                  <figcaption className="text-[.92rem] text-ink-2"><span className="font-semibold text-ink not-italic">{q.name}</span> · {q.place}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="py-20 md:py-28 bg-tint">
          <div className="max-w-[760px] mx-auto px-5">
            <div className="text-center mb-12">
              <p className="text-[.74rem] font-semibold tracking-[.2em] uppercase text-accent mb-4">Dúvidas</p>
              <h2 className="font-display text-3xl md:text-4xl">O que todo casal pergunta antes.</h2>
            </div>
            {FAQ.map((f) => <FaqItem key={f.q} {...f} />)}
          </div>
        </section>

        <section className="py-20 md:py-28 text-center">
          <div className="max-w-[760px] mx-auto px-5">
            <p className="text-[.74rem] font-semibold tracking-[.2em] uppercase text-accent mb-5">Comece agora</p>
            <h2 className="font-display text-4xl md:text-6xl leading-tight mb-8">A vida a dois merece um <em className="text-accent">chamego</em>.</h2>
            <Link to="/entrar" className="inline-block bg-accent text-accent-ink font-semibold rounded-btn px-8 py-4 text-lg hover:bg-accent-press transition-colors shadow-lg">
              Criar nosso espaço →
            </Link>
            <p className="text-[.92rem] text-ink-2 mt-4">Grátis · sem senha · privado por padrão</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-12">
        <div className="max-w-[1120px] mx-auto px-5 md:px-10 flex flex-wrap items-center justify-between gap-4">
          <Logo className="text-xl" />
          <nav className="flex gap-6 text-[.92rem] text-ink-2">
            <a href="#como" className="hover:text-ink">Como funciona</a>
            <a href="#areas" className="hover:text-ink">O que tem</a>
            <a href="#faq" className="hover:text-ink">Dúvidas</a>
          </nav>
          <span className="text-sm text-ink-3">© 2026 Chamego · feito com carinho</span>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Gates + manual**

```bash
npx eslint . && npm run build
```

Manual: `/` renderiza hero, steps, scenes, quotes, FAQ (abre/fecha), CTA final;
CTAs levam a `/entrar`; responsivo em 375px e desktop.

- [ ] **Step 3: Commit**

```bash
git add src/pages/LandingPage.jsx
git commit -m "feat: landing nova — app de organização a dois, copy adaptada do handoff"
```

---

### Task 15: Documentação + limpeza final

**Files:**
- Rewrite: `README.md`
- Rewrite: `CONTEXT.md`
- Modify: `render.yaml` (revisar envs)
- Modify: `.env.example`

- [ ] **Step 1: README novo**

Substituir `README.md` inteiro pelo conteúdo:

````markdown
# Chamego 💛

App para casais organizarem a vida a dois: agenda, listas, momentos (memórias)
e uma camada leve de conexão emocional — num espaço privado do casal.

> Pivot em julho/2026: o produto anterior (presente digital "Página do Casal")
> vive no branch `legacy-presente-digital`.

## Stack
- **Frontend:** React 19 + Vite + Tailwind CSS (mobile-first; Fraunces + Hanken Grotesk)
- **Backend:** Express (monolito — serve API + build do frontend), SQLite (better-sqlite3)
- **Auth:** sem senha — Google Identity Services + Link Mágico por email

## Rodando local
```bash
npm install
npm run dev   # backend (:3001) + vite (:5173)
```
Sem SMTP configurado, o link mágico é impresso no console do servidor.

## Variáveis de ambiente
| Var | Obrigatória | Para quê |
|---|---|---|
| `SESSION_SECRET` | produção | assina o cookie de sessão |
| `GOOGLE_CLIENT_ID` | recomendada | botão "Continuar com Google" |
| `SMTP_HOST/PORT/USER/PASS` | produção | envio do Link Mágico |
| `MAIL_FROM` | opcional | remetente dos emails |
| `PUBLIC_URL` | produção | base p/ links de convite e magic link |
| `DATA_DIR` | produção | disco persistente (SQLite) |

## Testes
```bash
npm test        # vitest (backend)
npx eslint .    # lint
npm run build   # build de produção
```

## Fluxo
Landing → Entrar (Google/Link Mágico) → Termos → Onboarding → Espaço do casal
→ Convite do parceiro → App (Início, Agenda, Listas, Momentos, Vocês).
Fase 1 entrega Início funcional; demais abas chegam nas fases 2–4.
````

- [ ] **Step 2: CONTEXT.md novo**

Substituir `CONTEXT.md` inteiro pelo conteúdo:

````markdown
# Chamego

App de organização da vida a dois. O casal cria um **Espaço do Casal** privado
com agenda, listas, momentos e camada de conexão ("Vocês"). Marca: **Chamego**.
Estética editorial terracota (Fraunces + Hanken Grotesk), mobile-first.
Grátis na fundação; packs premium são fase futura.

## Language

**Espaço do Casal**:
A unidade central do produto — container privado que reúne tudo do casal.
Cada usuário participa de no máximo um espaço.
_Avoid_: conta (é do usuário, não do casal), grupo

**Parceiro(a)**:
A segunda pessoa do espaço, conectada via Convite.
_Avoid_: destinatário (era do produto antigo), usuário (ambíguo)

**Convite**:
Link/código de pareamento que conecta o Parceiro ao Espaço do Casal.
Um convite pendente por espaço; gerar novo revoga o anterior.
_Avoid_: invite

**Código de Pareamento**:
Forma curta do Convite (6 caracteres, sem 0/O/1/I/L) para digitar ou ditar.

**Link Mágico**:
Email com link de uso único (15 min) que autentica sem senha.
_Avoid_: código OTP, senha

**Começar (fluxo)**:
Sequência obrigatória pós-primeiro-login: Termos → Onboarding → criação do
Espaço do Casal. Guardada pela rota `/app/comecar`.
_Avoid_: cadastro, wizard (termo do produto antigo)

**Onboarding**:
3 perguntas (objetivo, estágio do relacionamento, sozinho/convidar) que
personalizam o início. Persistido em `users.onboarding` (JSON).

**Contador de Dias**:
Dias desde a data-marco (`milestone_date`) do espaço — destaque do Início.

**As 5 abas**: Início, Agenda, Listas, Momentos, Vocês. Fase 1 entrega Início;
as outras têm estados "em breve".

## Relationships

- Um usuário (email) pertence a no máximo um **Espaço do Casal** (`couple_members.user_email UNIQUE`)
- O criador do espaço tem role `creator`; quem aceita o Convite, role `partner`
- **Convite** pertence ao espaço; aceitar exige login e não ter espaço próprio
- Fluxo **Começar** precede o app: sem termos + onboarding + espaço, `/app` redireciona

## Flagged decisions

- Pivot completo (jul/2026): presente digital aposentado, código no branch `legacy-presente-digital`
- Auth sem senha (Google + Link Mágico) — herdada do produto anterior
- Web mobile-first primeiro; app nativo é decisão futura
- Permissões (notificações/calendário/fotos) fora do onboarding — pedidas no primeiro uso real
````

- [ ] **Step 3: Revisar render.yaml e .env.example**

Ler `render.yaml` e `.env.example` atuais; remover referências a
`MP_ACCESS_TOKEN`, `GOOGLE_MAPS_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
`COUPON_CODE`, `ADMIN_TOKEN`, `DISCOUNT_PERCENT`; manter/adicionar
`SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS`, `MAIL_FROM`, `PUBLIC_URL`, `DATA_DIR`. Build/start commands não
mudam (`npm install && npm run build` / `node backend/server.js`).

- [ ] **Step 4: Gates finais completos**

```bash
npm test && npx eslint . && npm run build
```

Expected: tudo verde.

- [ ] **Step 5: Commit**

```bash
git add README.md CONTEXT.md render.yaml .env.example
git commit -m "docs: README, CONTEXT e deploy atualizados para o app de organização a dois"
```

---

## Verificação fim-a-fim (após todas as tasks)

1. `npm run dev`
2. `/` → landing nova → "Criar nosso espaço"
3. `/entrar` → email → link no console do backend → clicar
4. Termos → onboarding (3 passos) → nome do espaço → data → convite
5. Copiar link do convite; abrir em aba anônima → entrar com segundo email → aceitar
6. Navegador A: Início mostra nome do espaço (conectado); navegador B idem
7. Config: editar nome/data, sair
8. `npm test && npx eslint . && npm run build` verdes
