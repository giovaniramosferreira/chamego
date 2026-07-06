import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { verifyGoogleToken, createSession, sessionFromRequest, normalizeEmail, SESSION_COOKIE, SESSION_MAX_AGE_MS } from './auth.js';
import { sendMagicLink } from './mailer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().slice(0, 5);
      cb(null, `${crypto.randomBytes(12).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d' }));

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

/* ── Conteúdo das abas ───────────────────────────────────────────────────── */

// Deriva o espaço do casal a partir da sessão; todo conteúdo é escopado por ele.
function requireCouple(req, res, next) {
  const couple = db.getCoupleByUser(req.user.email);
  if (!couple) return res.status(409).json({ error: 'Crie seu espaço primeiro' });
  req.couple = couple;
  next();
}
const withCouple = [requireAuth, requireCouple];

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
const isTime = (v) => v === '' || v === undefined || /^\d{2}:\d{2}$/.test(v);

/* Agenda */
app.get('/api/events', withCouple, (req, res) => {
  res.json({ events: db.listEvents(req.couple.id) });
});
app.post('/api/events', withCouple, (req, res) => {
  const { title, date, time, notes, location, shared } = req.body || {};
  if (!title?.trim() || !isDate(date) || !isTime(time)) return res.status(400).json({ error: 'Informe título e data válida' });
  res.json({ event: db.createEvent(req.couple.id, req.user.email, { title: title.trim(), date, time: time || '', notes, location, shared: shared !== false }) });
});
app.patch('/api/events/:id', withCouple, (req, res) => {
  if (req.body?.date !== undefined && !isDate(req.body.date)) return res.status(400).json({ error: 'Data inválida' });
  if (req.body?.time !== undefined && !isTime(req.body.time)) return res.status(400).json({ error: 'Hora inválida' });
  const ev = db.updateEvent(req.couple.id, Number(req.params.id), req.body || {});
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json({ event: ev });
});
app.delete('/api/events/:id', withCouple, (req, res) => {
  if (!db.deleteEvent(req.couple.id, Number(req.params.id))) return res.status(404).json({ error: 'Evento não encontrado' });
  res.json({ ok: true });
});

/* Listas */
app.get('/api/lists', withCouple, (req, res) => res.json({ lists: db.listLists(req.couple.id) }));
app.post('/api/lists', withCouple, (req, res) => {
  const { title, icon, kind } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'Dê um nome à lista' });
  res.json({ list: db.createList(req.couple.id, req.user.email, { title: title.trim(), icon, kind }) });
});
app.get('/api/lists/:id', withCouple, (req, res) => {
  const list = db.getList(req.couple.id, Number(req.params.id));
  if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
  res.json({ list });
});
app.patch('/api/lists/:id', withCouple, (req, res) => {
  const list = db.updateList(req.couple.id, Number(req.params.id), req.body || {});
  if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
  res.json({ list });
});
app.delete('/api/lists/:id', withCouple, (req, res) => {
  if (!db.deleteList(req.couple.id, Number(req.params.id))) return res.status(404).json({ error: 'Lista não encontrada' });
  res.json({ ok: true });
});
app.post('/api/lists/:id/items', withCouple, (req, res) => {
  if (!req.body?.text?.trim()) return res.status(400).json({ error: 'Item vazio' });
  const list = db.addItem(req.couple.id, Number(req.params.id), req.body.text.trim());
  if (!list) return res.status(404).json({ error: 'Lista não encontrada' });
  res.json({ list });
});
app.patch('/api/items/:id', withCouple, (req, res) => {
  const list = db.updateItem(req.couple.id, Number(req.params.id), req.body || {});
  if (!list) return res.status(404).json({ error: 'Item não encontrado' });
  res.json({ list });
});
app.delete('/api/items/:id', withCouple, (req, res) => {
  const list = db.deleteItem(req.couple.id, Number(req.params.id));
  if (!list) return res.status(404).json({ error: 'Item não encontrado' });
  res.json({ list });
});

/* Momentos */
app.get('/api/moments', withCouple, (req, res) => res.json({ moments: db.listMoments(req.couple.id) }));
app.post('/api/moments', requireAuth, requireCouple, upload.array('photos', 6), (req, res) => {
  const { text, date } = req.body || {};
  const d = isDate(date) ? date : new Date().toISOString().slice(0, 10);
  const urls = (req.files || []).map(f => `/uploads/${f.filename}`);
  if (!text?.trim() && !urls.length) return res.status(400).json({ error: 'Escreva algo ou adicione uma foto' });
  res.json({ moment: db.createMoment(req.couple.id, req.user.email, { text: text || '', date: d }, urls) });
});
app.delete('/api/moments/:id', withCouple, (req, res) => {
  if (!db.deleteMoment(req.couple.id, Number(req.params.id))) return res.status(404).json({ error: 'Momento não encontrado' });
  res.json({ ok: true });
});

/* Vocês */
const GUIDED_QUESTIONS = [
  'Qual foi o melhor momento da nossa semana?',
  'O que você quer que a gente faça mais vezes?',
  'Uma coisa pequena que eu fiz e te deixou feliz?',
  'Onde você sonha viajar comigo?',
  'Qual música te lembra da gente?',
  'O que te deixou orgulhoso(a) de nós ultimamente?',
  'Uma memória nossa que você guarda com carinho?',
  'Como eu posso te apoiar melhor essa semana?',
];
function guidedQuestion() {
  const week = Math.floor(Date.now() / (7 * 86_400_000));
  return GUIDED_QUESTIONS[week % GUIDED_QUESTIONS.length];
}
app.get('/api/connection', withCouple, (req, res) => {
  const today = db.todayCheckins(req.couple.id);
  res.json({
    stats: {
      streak: db.checkinStreak(req.couple.id),
      activeGoals: db.activeGoalsCount(req.couple.id),
    },
    myCheckin: today.find(c => c.user_email === req.user.email) || null,
    partnerCheckin: today.find(c => c.user_email !== req.user.email) || null,
    goals: db.listGoals(req.couple.id),
    question: guidedQuestion(),
  });
});
app.post('/api/checkins', withCouple, (req, res) => {
  if (!req.body?.mood) return res.status(400).json({ error: 'Escolha como você está' });
  res.json({ checkin: db.upsertCheckin(req.couple.id, req.user.email, { mood: req.body.mood, note: req.body.note }) });
});
app.post('/api/goals', withCouple, (req, res) => {
  if (!req.body?.title?.trim()) return res.status(400).json({ error: 'Descreva a meta' });
  res.json({ goal: db.createGoal(req.couple.id, req.user.email, req.body.title.trim()) });
});
app.patch('/api/goals/:id', withCouple, (req, res) => {
  const goal = db.updateGoal(req.couple.id, Number(req.params.id), req.body || {});
  if (!goal) return res.status(404).json({ error: 'Meta não encontrada' });
  res.json({ goal });
});
app.delete('/api/goals/:id', withCouple, (req, res) => {
  if (!db.deleteGoal(req.couple.id, Number(req.params.id))) return res.status(404).json({ error: 'Meta não encontrada' });
  res.json({ ok: true });
});
app.get('/api/messages', withCouple, (req, res) => {
  res.json({ messages: db.listMessages(req.couple.id, Number(req.query.since) || 0) });
});
app.post('/api/messages', withCouple, (req, res) => {
  if (!req.body?.text?.trim()) return res.status(400).json({ error: 'Mensagem vazia' });
  res.json({ message: db.createMessage(req.couple.id, req.user.email, req.body.text.trim()) });
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
