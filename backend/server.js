import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { verifyGoogleToken, createSession, sessionFromRequest, normalizeEmail, SESSION_COOKIE, SESSION_MAX_AGE_MS } from './auth.js';
import { sendMagicLink, sendInvite, sendPartnerJoined } from './mailer.js';
import { buildIcs } from './ics.js';
import { startNotifier } from './notifier.js';
import { availablePlans, billingEnabled, createCheckout, createPortal, handleWebhook, TRIAL_DAYS } from './billing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const uploadStorage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().slice(0, 5);
    cb(null, `${crypto.randomBytes(12).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});
// Cápsulas: imagem ou áudio, até 25MB (áudio pesa mais).
const uploadMedia = multer({
  storage: uploadStorage,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, /^(image|audio)\//.test(file.mimetype)),
});

// O webhook precisa do corpo cru: a assinatura do provedor não fecha sobre
// JSON reserializado. Por isso vem antes do express.json().
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const result = await handleWebhook(req.body, req.headers['stripe-signature']);
    res.json(result);
  } catch (e) {
    console.error('webhook error', e.message);
    res.status(e.status || 400).json({ error: 'Webhook inválido' });
  }
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

app.post('/api/me/avatar', requireAuth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie uma imagem' });
  db.upsertUser({ email: req.user.email });
  const user = db.setUserPicture(req.user.email, `/uploads/${req.file.filename}`);
  res.json({ picture: user.picture });
});

/* ── Escopo do casal ─────────────────────────────────────────────────────── */

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

/* ── Espaço do casal ─────────────────────────────────────────────────────── */

// A data do contador é opcional: quem não lembra segue em frente e define depois.
// `seed` é a resposta do onboarding — o espaço nasce com conteúdo, nunca vazio.
app.post('/api/couples', requireAuth, (req, res) => {
  const { name, milestoneDate, milestoneLabel, seed } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Informe o nome do espaço' });
  const date = milestoneDate ? String(milestoneDate) : '';
  if (date && !isDate(date)) return res.status(400).json({ error: 'Data inválida' });
  db.upsertUser({ email: req.user.email });
  let couple;
  try {
    couple = db.createCouple({ name: name.trim().slice(0, 80), milestoneDate: date, milestoneLabel: milestoneLabel || '', creatorEmail: req.user.email });
  } catch {
    return res.status(409).json({ error: 'Você já tem um espaço' });
  }
  if (seed !== false) db.seedCouple(couple.id, req.user.email, String(seed || 'rotina'), date);
  res.json({ couple: db.getCoupleByUser(req.user.email) });
});

// Exportar tudo e apagar tudo — o que os Termos prometem, agora existe.
app.get('/api/export', withCouple, (req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename="chamego-${req.couple.id}.json"`);
  res.json(db.exportCouple(req.couple.id));
});
app.post('/api/couples/:id/leave', withCouple, (req, res) => {
  if (req.couple.id !== Number(req.params.id)) return res.status(404).json({ error: 'Espaço não encontrado' });
  db.leaveCouple(req.couple.id, req.user.email);
  res.json({ ok: true });
});
app.delete('/api/couples/:id', withCouple, (req, res) => {
  if (req.couple.id !== Number(req.params.id)) return res.status(404).json({ error: 'Espaço não encontrado' });
  if (String(req.body?.confirm || '').trim().toLowerCase() !== 'excluir') {
    return res.status(400).json({ error: 'Digite EXCLUIR para confirmar' });
  }
  db.deleteCouple(req.couple.id);
  res.json({ ok: true });
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

app.post('/api/couples/:id/invites', requireAuth, async (req, res) => {
  const couple = db.getCoupleByUser(req.user.email);
  if (!couple || couple.id !== Number(req.params.id)) return res.status(404).json({ error: 'Espaço não encontrado' });
  if (couple.members.length >= 2) return res.status(409).json({ error: 'O espaço já tem os dois' });
  const invite = db.createInvite(couple.id, req.user.email);
  const base = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  const url = `${base}/convite/${invite.code}`;
  // Com email, o convite chega sozinho — ninguém precisa copiar link nenhum.
  let emailed = false;
  const to = normalizeEmail(req.body?.email);
  if (to && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    try {
      const me = db.getUser(req.user.email);
      emailed = await sendInvite({ to, fromName: me?.name || req.user.email, coupleName: couple.name, url, code: invite.code });
    } catch (e) {
      console.error('invite email error', e);
    }
  }
  res.json({ invite: { code: invite.code, url }, emailed });
});

app.get('/api/invites/:code', (req, res) => {
  const inv = db.getInvite(req.params.code);
  if (!inv) return res.status(404).json({ error: 'Convite não encontrado' });
  if (inv.status !== 'pending') return res.status(410).json({ error: 'Este convite já foi usado' });
  res.json(invitePreview(inv));
});

app.post('/api/invites/:code/accept', requireAuth, async (req, res) => {
  const inv = db.getInvite(req.params.code);
  if (!inv) return res.status(404).json({ error: 'Convite não encontrado' });
  if (inv.status !== 'pending') return res.status(410).json({ error: 'Este convite já foi usado' });
  db.upsertUser({ email: req.user.email });
  if (db.getCoupleByUser(req.user.email)) return res.status(409).json({ error: 'Você já tem um espaço' });
  if (!db.acceptInvite(inv.code, req.user.email)) return res.status(410).json({ error: 'Este convite já foi usado' });
  const couple = db.getCoupleByUser(req.user.email);
  // Quem convidou fica sabendo sem precisar ficar conferindo o app.
  try {
    const me = db.getUser(req.user.email);
    const base = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
    await sendPartnerJoined({ to: inv.created_by, partnerName: me?.name || req.user.email, coupleName: couple.name, url: `${base}/app` });
  } catch (e) {
    console.error('partner joined email error', e);
  }
  res.json({ couple });
});

/* ── Conteúdo das abas ───────────────────────────────────────────────────── */

/* ── O que é grátis e o que é pago ────────────────────────────────────────
   O grátis precisa ser um app inteiro e útil para sempre: agenda, listas,
   momentos, check-in, chat e convite não têm trava. O pago é o que acumula
   (fotos, cápsulas, álbuns) e o conteúdo dos packs.
   Exportar os próprios dados é direito, não recurso: nunca entra no pago. */
const FREE_LIMITS = { photos: 30, capsules: 3, albums: 1 };

function isPremium(coupleId) {
  return db.getSubscription(coupleId).entitlements.includes('premium');
}

// Devolve 402 com `upgrade: true` — o app abre o paywall a partir disso.
function withinLimit(req, res, key) {
  if (isPremium(req.couple.id)) return true;
  const used = db.usage(req.couple.id)[key];
  if (used < FREE_LIMITS[key]) return true;
  db.track('limite_atingido', { coupleId: req.couple.id, email: req.user.email, props: { limite: key } });
  const msg = {
    photos: `O plano grátis guarda ${FREE_LIMITS.photos} fotos. No Chamego Juntos são ilimitadas.`,
    capsules: `O plano grátis tem ${FREE_LIMITS.capsules} cápsulas. No Chamego Juntos são ilimitadas.`,
    albums: `O plano grátis tem ${FREE_LIMITS.albums} álbum. No Chamego Juntos são ilimitados.`,
  }[key];
  res.status(402).json({ error: msg, upgrade: true, limite: key, usado: used, maximo: FREE_LIMITS[key] });
  return false;
}

// Trava premium: bloqueia se a subscription do casal não tem o entitlement.
// Reutilizável quando novas rotas premium chegarem (F2+). Hoje o quiz premium
// faz a checagem inline por depender do quiz específico.
function hasEntitlement(coupleId, name) {
  return db.getSubscription(coupleId).entitlements.includes(name);
}

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

/* Momentos — 1 foto por momento */
app.get('/api/moments', withCouple, (req, res) => res.json({ moments: db.listMoments(req.couple.id) }));
app.post('/api/moments', requireAuth, requireCouple, upload.single('photo'), (req, res) => {
  if (req.file && !withinLimit(req, res, 'photos')) return;
  const { text, date } = req.body || {};
  const d = isDate(date) ? date : new Date().toISOString().slice(0, 10);
  const urls = req.file ? [`/uploads/${req.file.filename}`] : [];
  if (!text?.trim() && !urls.length) return res.status(400).json({ error: 'Escreva algo ou adicione uma foto' });
  res.json({ moment: db.createMoment(req.couple.id, req.user.email, { text: text || '', date: d }, urls) });
});
app.patch('/api/moments/:id', requireAuth, requireCouple, upload.single('photo'), (req, res) => {
  // Trocar foto não consome cota nova (sai uma, entra uma); adicionar consome.
  const trocando = req.file && db.listMoments(req.couple.id).find((m) => m.id === Number(req.params.id))?.photos.length;
  if (req.file && !trocando && !withinLimit(req, res, 'photos')) return;
  const { text, date, removePhoto } = req.body || {};
  const newPhotoUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
  const moment = db.updateMoment(req.couple.id, Number(req.params.id), { text, date },
    { newPhotoUrl, removePhoto: removePhoto === 'true' || removePhoto === true });
  if (!moment) return res.status(404).json({ error: 'Momento não encontrado' });
  res.json({ moment });
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
// Leitura do chat: alimenta o badge de não lidas na tab bar.
app.post('/api/messages/read', withCouple, (req, res) => {
  res.json({ unread: db.markMessagesRead(req.couple.id, req.user.email, req.body?.lastId) });
});

// Estado leve pro shell do app (badge do chat e pendências de hoje).
app.get('/api/badges', withCouple, (req, res) => {
  const today = new Date().toLocaleDateString('en-CA');
  const checkin = db.todayCheckins(req.couple.id).some((c) => c.user_email === req.user.email);
  res.json({
    unread: db.unreadCount(req.couple.id, req.user.email),
    eventsToday: db.eventsOnDate(req.couple.id, today).length,
    checkinDone: checkin,
  });
});

// Busca única sobre tudo do casal — cresce junto com o conteúdo.
app.get('/api/search', withCouple, (req, res) => {
  res.json({ results: db.search(req.couple.id, req.query.q, req.user.email) });
});

/* ── Backends do prototipo completo ─────────────────────────────────────── */
app.get('/api/plans', withCouple, (req, res) => res.json({ plans: db.listPlans(req.couple.id) }));
app.get('/api/plans/:id', withCouple, (req, res) => {
  const plan = db.getPlan(req.couple.id, Number(req.params.id));
  if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });
  res.json({ plan });
});
app.post('/api/plans', withCouple, (req, res) => {
  if (!req.body?.title?.trim()) return res.status(400).json({ error: 'Dê um nome ao plano' });
  res.json({ plan: db.createPlan(req.couple.id, req.user.email, req.body) });
});
app.patch('/api/plans/:id', withCouple, (req, res) => {
  const plan = db.updatePlan(req.couple.id, Number(req.params.id), req.body || {});
  if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });
  res.json({ plan });
});
app.delete('/api/plans/:id', withCouple, (req, res) => {
  if (!db.deletePlan(req.couple.id, Number(req.params.id))) return res.status(404).json({ error: 'Plano não encontrado' });
  res.json({ ok: true });
});
app.post('/api/plans/:id/steps', withCouple, (req, res) => {
  if (!req.body?.title?.trim()) return res.status(400).json({ error: 'Descreva a etapa' });
  const plan = db.addPlanStep(req.couple.id, Number(req.params.id), req.body.title.trim());
  if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });
  res.json({ plan });
});
app.post('/api/plans/:id/attachments', requireAuth, requireCouple, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie uma imagem' });
  const plan = db.addPlanAttachment(req.couple.id, Number(req.params.id), `/uploads/${req.file.filename}`);
  if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });
  res.json({ plan });
});
app.delete('/api/plan-attachments/:id', withCouple, (req, res) => {
  const plan = db.deletePlanAttachment(req.couple.id, Number(req.params.id));
  if (!plan) return res.status(404).json({ error: 'Anexo não encontrado' });
  res.json({ plan });
});
app.patch('/api/plan-steps/:id', withCouple, (req, res) => {
  const plan = db.updatePlanStep(req.couple.id, Number(req.params.id), req.body || {});
  if (!plan) return res.status(404).json({ error: 'Etapa não encontrada' });
  res.json({ plan });
});
app.delete('/api/plan-steps/:id', withCouple, (req, res) => {
  const plan = db.deletePlanStep(req.couple.id, Number(req.params.id));
  if (!plan) return res.status(404).json({ error: 'Etapa não encontrada' });
  res.json({ plan });
});

app.get('/api/gifts', withCouple, (req, res) => res.json({ gifts: db.listGifts(req.couple.id, req.user.email) }));
app.get('/api/gifts/:id', withCouple, (req, res) => {
  const gift = db.getGift(req.couple.id, Number(req.params.id), req.user.email);
  if (!gift) return res.status(404).json({ error: 'Não encontrado' });
  res.json({ gift });
});
app.post('/api/gifts', withCouple, (req, res) => {
  if (!req.body?.title?.trim()) return res.status(400).json({ error: 'Dê um nome à data ou presente' });
  res.json({ gift: db.createGift(req.couple.id, req.user.email, req.body) });
});
app.patch('/api/gifts/:id', withCouple, (req, res) => {
  const gift = db.updateGift(req.couple.id, Number(req.params.id), req.body || {});
  if (!gift) return res.status(404).json({ error: 'Não encontrado' });
  res.json({ gift });
});
app.delete('/api/gifts/:id', withCouple, (req, res) => {
  if (!db.deleteGift(req.couple.id, Number(req.params.id))) return res.status(404).json({ error: 'Não encontrado' });
  res.json({ ok: true });
});

app.get('/api/date-ideas', withCouple, (req, res) => res.json({ ideas: db.listDateIdeas(req.couple.id, req.user.email) }));
app.post('/api/date-ideas/saved', withCouple, (req, res) => {
  if (!req.body?.ideaId) return res.status(400).json({ error: 'Ideia ausente' });
  const saved = db.saveDateIdea(req.couple.id, req.user.email, req.body.ideaId);
  if (!saved) return res.status(404).json({ error: 'Ideia não encontrada' });
  res.json({ saved });
});
app.delete('/api/date-ideas/saved/:ideaId', withCouple, (req, res) => {
  db.unsaveDateIdea(req.couple.id, req.params.ideaId);
  res.json({ ok: true });
});

app.get('/api/weekly-summary', withCouple, (req, res) => res.json({ summary: db.weeklySummary(req.couple.id) }));
app.get('/api/weekly-report', withCouple, (req, res) => res.json({ report: db.weeklyReport(req.couple.id, Number(req.query.week) || 0) }));
app.get('/api/weekly-report/history', withCouple, (req, res) => res.json({ history: db.weeklyHistory(req.couple.id) }));
app.get('/api/reminders', withCouple, (req, res) => res.json({ reminders: db.listReminders(req.couple.id), prefs: db.reminderPrefs(req.couple.id) }));
app.patch('/api/reminders/prefs', withCouple, (req, res) => res.json({ prefs: db.setReminderPrefs(req.couple.id, req.body || {}) }));
app.get('/api/achievements', withCouple, (req, res) => res.json({ achievements: db.listAchievements(req.couple.id) }));

app.get('/api/quizzes', withCouple, (req, res) => res.json({ quizzes: db.listQuizzes(req.couple.id, req.user.email) }));
app.get('/api/quizzes/:id/result', withCouple, (req, res) => res.json({ result: db.quizResult(req.couple.id, req.params.id) }));
app.post('/api/quizzes/:id/answers', withCouple, (req, res) => {
  const quiz = db.getQuiz(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz não encontrado' });
  if (quiz.premium && !hasEntitlement(req.couple.id, 'premium')) {
    return res.status(402).json({ error: 'Esse quiz é Premium', upgrade: true });
  }
  const result = db.saveQuizAnswers(req.couple.id, req.user.email, req.params.id, req.body?.answers || []);
  if (!result) return res.status(404).json({ error: 'Quiz não encontrado' });
  res.json({ result });
});

app.get('/api/time-capsules', withCouple, (req, res) => res.json({ capsules: db.listTimeCapsules(req.couple.id) }));
app.get('/api/time-capsules/:id', withCouple, (req, res) => {
  const capsule = db.getTimeCapsule(req.couple.id, Number(req.params.id));
  if (!capsule) return res.status(404).json({ error: 'Cápsula não encontrada' });
  res.json({ capsule });
});
app.post('/api/time-capsules', requireAuth, requireCouple, uploadMedia.single('media'), (req, res) => {
  if (!withinLimit(req, res, 'capsules')) return;
  const { title, openDate, message, recurrence, scope } = req.body || {};
  if (!title?.trim() || !isDate(openDate)) return res.status(400).json({ error: 'Informe título e data de abertura' });
  const mediaUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const mediaType = req.file ? (/^audio\//.test(req.file.mimetype) ? 'audio' : 'photo') : null;
  res.json({ capsule: db.createTimeCapsule(req.couple.id, req.user.email, { title, openDate, message, recurrence, scope, mediaUrl, mediaType }) });
});
// Abrir cápsula (marca opened_at, só quando chegou a data).
app.patch('/api/time-capsules/:id', withCouple, (req, res) => {
  const result = db.openTimeCapsule(req.couple.id, Number(req.params.id));
  if (!result) return res.status(404).json({ error: 'Cápsula não encontrada' });
  if (result.error === 'sealed') return res.status(409).json({ error: 'Ainda selada até a data' });
  res.json({ capsule: result });
});

app.get('/api/albums', withCouple, (req, res) => res.json({ albums: db.listAlbums(req.couple.id) }));
app.get('/api/albums/:id', withCouple, (req, res) => {
  const album = db.getAlbum(req.couple.id, Number(req.params.id));
  if (!album) return res.status(404).json({ error: 'Álbum não encontrado' });
  res.json({ album });
});
app.post('/api/albums', withCouple, (req, res) => {
  if (!withinLimit(req, res, 'albums')) return;
  if (!req.body?.title?.trim()) return res.status(400).json({ error: 'Dê um nome ao álbum' });
  res.json({ album: db.createAlbum(req.couple.id, req.user.email, req.body) });
});
app.patch('/api/albums/:id', withCouple, (req, res) => {
  const album = db.updateAlbum(req.couple.id, Number(req.params.id), req.body || {});
  if (!album) return res.status(404).json({ error: 'Álbum não encontrado' });
  res.json({ album });
});
app.delete('/api/albums/:id', withCouple, (req, res) => {
  if (!db.deleteAlbum(req.couple.id, Number(req.params.id))) return res.status(404).json({ error: 'Álbum não encontrado' });
  res.json({ ok: true });
});

app.get('/api/intimacy/prompts', withCouple, (req, res) => res.json({ prompts: db.listIntimacyPrompts(), hasPin: db.intimacyHasPin(req.couple.id) }));
app.get('/api/intimacy/sessions', withCouple, (req, res) => res.json({ sessions: db.listIntimacySessions(req.couple.id) }));
app.get('/api/intimacy/prompts/:id/partner', withCouple, (req, res) => res.json({ response: db.partnerIntimacyResponse(req.couple.id, req.params.id, req.user.email) }));
app.post('/api/intimacy/sessions', withCouple, (req, res) => {
  const prompt = db.getIntimacyPrompt(req.body?.promptId);
  if (!prompt) return res.status(404).json({ error: 'Pergunta guiada não encontrada' });
  if (prompt.premium && !hasEntitlement(req.couple.id, 'premium')) return res.status(402).json({ error: 'Essa trilha é Premium', upgrade: true });
  const session = db.createIntimacySession(req.couple.id, req.user.email, req.body || {});
  res.json({ session, partner: db.partnerIntimacyResponse(req.couple.id, prompt.id, req.user.email) });
});
app.delete('/api/intimacy/sessions/:id', withCouple, (req, res) => {
  if (!db.deleteIntimacySession(req.couple.id, Number(req.params.id))) return res.status(404).json({ error: 'Sessão não encontrada' });
  res.json({ ok: true });
});
app.delete('/api/intimacy/sessions', withCouple, (req, res) => { db.clearIntimacySessions(req.couple.id); res.json({ ok: true }); });
app.patch('/api/intimacy/pin', withCouple, (req, res) => res.json(db.setIntimacyPin(req.couple.id, req.body?.pin ?? null)));
app.post('/api/intimacy/unlock', withCouple, (req, res) => {
  if (!db.verifyIntimacyPin(req.couple.id, req.body?.pin)) return res.status(401).json({ error: 'Código incorreto' });
  res.json({ ok: true });
});

/* ── Calendário: o Chamego dentro do calendário que já é usado ───────────── */

// Um evento avulso (download no navegador, com sessão).
app.get('/api/events/:id/ics', withCouple, (req, res) => {
  const ev = db.listEvents(req.couple.id).find((e) => e.id === Number(req.params.id));
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado' });
  res.type('text/calendar').setHeader('Content-Disposition', `attachment; filename="${ev.date}-evento.ics"`);
  res.send(buildIcs([ev], { name: req.couple.name }));
});

// Assinatura do calendário: URL secreta por espaço, sem cookie (o app de
// calendário não tem sessão). Só eventos compartilhados entram no feed.
app.get('/api/calendar/token', withCouple, (req, res) => {
  const base = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  const token = db.calendarToken(req.couple.id);
  res.json({ url: `${base}/api/calendar/${token}.ics` });
});
app.get('/api/calendar/:token', (req, res) => {
  const couple = db.coupleByCalendarToken(String(req.params.token || '').replace(/\.ics$/, ''));
  if (!couple) return res.status(404).json({ error: 'Calendário não encontrado' });
  const events = db.listEvents(couple.id).filter((e) => e.shared);
  res.type('text/calendar').send(buildIcs(events, { name: `Chamego · ${couple.name}` }));
});

/* ── Assinatura e cobrança ───────────────────────────────────────────────── */

app.get('/api/subscription', withCouple, (req, res) => {
  const sub = db.getSubscription(req.couple.id);
  res.json({
    subscription: {
      plan: sub.plan,
      status: sub.status,
      entitlements: sub.entitlements,
      trialing: sub.trialing,
      trialEndsAt: sub.trial_ends_at,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      trialUsed: !!sub.trial_ends_at,
      managed: !!sub.customer_id,
    },
    usage: db.usage(req.couple.id),
    limits: FREE_LIMITS,
    plans: availablePlans(),
    billingEnabled: billingEnabled(),
    trialDays: TRIAL_DAYS,
  });
});

// Teste grátis sem cartão: uma vez por espaço.
app.post('/api/subscription/trial', withCouple, (req, res) => {
  const result = db.startTrial(req.couple.id, TRIAL_DAYS);
  if (!result.started) return res.status(409).json({ error: 'Este espaço já usou o período de teste' });
  db.track('teste_iniciado', { coupleId: req.couple.id, email: req.user.email });
  res.json({ subscription: db.getSubscription(req.couple.id) });
});

app.post('/api/billing/checkout', withCouple, async (req, res) => {
  try {
    db.track('checkout_iniciado', { coupleId: req.couple.id, email: req.user.email, props: { plan: req.body?.plan } });
    res.json(await createCheckout({ coupleId: req.couple.id, email: req.user.email, plan: req.body?.plan }));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/billing/portal', withCouple, async (req, res) => {
  try {
    res.json(await createPortal({ coupleId: req.couple.id }));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Ferramenta de operação (suporte, cortesia, imprensa) — exige ADMIN_KEY.
// Era esta rota, aberta a qualquer pessoa logada, que dava premium de graça.
app.patch('/api/subscription', withCouple, (req, res) => {
  const key = process.env.ADMIN_KEY;
  if (!key || req.headers['x-admin-key'] !== key) return res.status(403).json({ error: 'Não autorizado' });
  const dias = Number(req.body?.days) || 365;
  const status = req.body?.plan === 'premium' ? 'active' : 'free';
  res.json({
    subscription: db.saveSubscription(req.couple.id, {
      status,
      provider: 'cortesia',
      currentPeriodEnd: status === 'active' ? new Date(Date.now() + dias * 86_400_000).toISOString() : null,
    }),
  });
});

// Funil de venda (espaços, conexão do par, testes, assinantes) — ADMIN_KEY.
app.get('/api/admin/metrics', (req, res) => {
  const key = process.env.ADMIN_KEY;
  if (!key || req.headers['x-admin-key'] !== key) return res.status(403).json({ error: 'Não autorizado' });
  res.json(db.funnel(Number(req.query.days) || 30));
});

// Eventos de funil vindos da interface (lista fechada, sem dado livre).
const CLIENT_EVENTS = ['paywall_visto', 'plano_visto', 'convite_compartilhado', 'instalou_app'];
app.post('/api/track', requireAuth, (req, res) => {
  const name = String(req.body?.name || '');
  if (!CLIENT_EVENTS.includes(name)) return res.status(400).json({ error: 'Evento desconhecido' });
  const couple = db.getCoupleByUser(req.user.email);
  db.track(name, { coupleId: couple?.id || null, email: req.user.email, props: { origem: String(req.body?.origem || '').slice(0, 40) } });
  res.json({ ok: true });
});

// SPA em produção
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));
  startNotifier();
}

export { app };
