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
