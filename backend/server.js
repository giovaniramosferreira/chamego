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
import { availableGifts, availablePlans, billingEnabled, createCheckout, createGiftCheckout, createPortal, handleWebhook, TRIAL_DAYS } from './billing.js';
import { RECEITAS, RECEITAS_POR_ID, INGREDIENTES_CONHECIDOS } from './receita/catalogo.js';
import { girar, girosRestantes, GIROS_GRATIS_DIA } from './receita/roleta.js';
import { compararDespensa, normalizar, rotuloFalta } from './receita/ingredientes.js';
import { cadenciaAposFeedback, listaDoDia, melhorMomentoDeAvisar } from './receita/lista.js';
import { extrairIngredientes, visaoDisponivel } from './receita/visao.js';
import { extrairDoLink, iaDisponivel } from './receita/achados.js';
import { descreverRecorrencia, ocorrenciasEntre, parcelaDe } from './agenda/recorrencia.js';

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
// Data do servidor em ISO local. A agenda é lida no fuso de quem mora na casa.
const hojeISO = () => new Date().toLocaleDateString('en-CA');
const somaDiasIso = (iso, n) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d) + n * 86_400_000).toISOString().slice(0, 10);
};

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

// A agenda virada pra fora é uma lista de OCORRÊNCIAS, não de eventos: o
// aluguel é uma linha no banco e doze no ano. Quem consome (Início, calendário,
// contas) sempre pergunta por uma janela de datas.
function ocorrenciasDe(coupleId, de, ate) {
  const eventos = db.listEvents(coupleId);
  const feitas = new Map(db.ocorrenciasFeitas(coupleId, de, ate).map((o) => [`${o.event_id}:${o.date}`, o]));
  const saida = [];

  for (const ev of eventos) {
    for (const data of ocorrenciasEntre(ev, de, ate)) {
      const feita = feitas.get(`${ev.id}:${data}`);
      saida.push({
        eventId: ev.id,
        date: data,
        title: ev.title,
        time: ev.time,
        location: ev.location,
        notes: ev.notes,
        kind: ev.kind || 'evento',
        shared: !!ev.shared,
        assignee: ev.assignee || '',
        amount: ev.amount ?? null,
        payee: ev.payee || '',
        estimated: !!ev.estimated,
        recurrence: ev.recurrence || '',
        recorrencia: descreverRecorrencia(ev),
        parcela: parcelaDe(ev, data),
        // Repetido só na primeira ocorrência da série? Não: a data é a
        // identidade aqui, e é ela que o casal marca como feita.
        done: !!feita,
        doneBy: feita?.done_by || null,
        paidAmount: feita?.amount ?? null,
      });
    }
  }
  return saida.sort((a, b) => a.date.localeCompare(b.date)
    || (a.time === '' ? 1 : 0) - (b.time === '' ? 1 : 0)
    || a.time.localeCompare(b.time));
}

app.get('/api/agenda', withCouple, (req, res) => {
  const de = isDate(req.query.de) ? req.query.de : hojeISO();
  const ate = isDate(req.query.ate) ? req.query.ate : somaDiasIso(de, 60);
  if (ate < de) return res.status(400).json({ error: 'Janela de datas inválida' });
  res.json({ ocorrencias: ocorrenciasDe(req.couple.id, de, ate) });
});

// Marcar/desmarcar uma ocorrência: "paguei o aluguel deste mês", "fiz a faxina
// desta terça". Só esta data — nunca a série inteira.
app.post('/api/agenda/:eventId/:date', withCouple, (req, res) => {
  const { eventId, date } = req.params;
  if (!isDate(date)) return res.status(400).json({ error: 'Data inválida' });
  const ev = db.listEvents(req.couple.id).find((e) => e.id === Number(eventId));
  if (!ev) return res.status(404).json({ error: 'Evento não encontrado' });
  if (!ocorrenciasEntre(ev, date, date).length) {
    return res.status(400).json({ error: 'Esse evento não acontece nessa data' });
  }

  if (req.body?.done === false) {
    db.desmarcarOcorrencia(req.couple.id, Number(eventId), date);
  } else {
    // Pagou diferente do previsto? Vale o que foi pago, não o que se estimou.
    const valor = req.body?.amount === undefined || req.body?.amount === null || req.body?.amount === ''
      ? (ev.amount ?? null) : Number(req.body.amount);
    db.marcarOcorrencia(req.couple.id, Number(eventId), date, { email: req.user.email, amount: valor });
  }
  res.json({ ocorrencias: ocorrenciasDe(req.couple.id, date, date) });
});

// Fechamento do mês: o que vence, o que já foi pago e pra onde o dinheiro vai.
app.get('/api/contas', withCouple, (req, res) => {
  const mes = /^\d{4}-\d{2}$/.test(String(req.query.mes || '')) ? req.query.mes : hojeISO().slice(0, 7);
  const de = `${mes}-01`;
  const ate = `${mes}-${String(new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate()).padStart(2, '0')}`;
  const contas = ocorrenciasDe(req.couple.id, de, ate).filter((o) => o.kind === 'conta' && o.amount !== null);

  const soma = (lista) => lista.reduce((t, o) => t + (o.done ? (o.paidAmount ?? o.amount) : o.amount), 0);
  const pagas = contas.filter((o) => o.done);
  const abertas = contas.filter((o) => !o.done);

  // Pra onde vai o dinheiro: aluguel, diarista, parcela. Ordenado pelo que pesa.
  const porDestino = [...contas.reduce((mapa, o) => {
    const chave = o.payee || 'Sem destino';
    const atual = mapa.get(chave) || { destino: chave, total: 0, pago: 0, quantos: 0 };
    atual.total += o.done ? (o.paidAmount ?? o.amount) : o.amount;
    if (o.done) atual.pago += o.paidAmount ?? o.amount;
    atual.quantos++;
    return mapa.set(chave, atual);
  }, new Map()).values()].sort((a, b) => b.total - a.total);

  res.json({
    mes,
    total: soma(contas),
    pago: soma(pagas),
    aberto: soma(abertas),
    // Estimativa contamina o total: a interface precisa poder dizer "~".
    temEstimativa: contas.some((o) => o.estimated),
    contas,
    porDestino,
  });
});

app.get('/api/events', withCouple, (req, res) => {
  res.json({ events: db.listEvents(req.couple.id) });
});
app.post('/api/events', withCouple, (req, res) => {
  const { title, date, time } = req.body || {};
  if (!title?.trim() || !isDate(date) || !isTime(time)) return res.status(400).json({ error: 'Informe título e data válida' });
  res.json({ event: db.createEvent(req.couple.id, req.user.email, { ...req.body, title: title.trim(), time: time || '' }) });
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
app.get('/api/lists', withCouple, (req, res) => res.json({ lists: db.listLists(req.couple.id, req.user.email) }));
app.post('/api/lists', withCouple, (req, res) => {
  const { title, icon, kind, theme } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'Dê um nome à lista' });
  res.json({ list: db.createList(req.couple.id, req.user.email, { title: title.trim(), icon, kind, theme }) });
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
  const list = db.addItem(req.couple.id, Number(req.params.id), req.body.text.trim(), req.body.assignee);
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

/* ── Receita de Hoje ─────────────────────────────────────────────────────────
   Duas portas para "o que a gente come hoje?": sorteio e foto do que tem em
   casa. Grátis: 3 giros e 1 foto por dia, despensa de até 15 itens. */

const DESPENSA_GRATIS = 15;
const FOTOS_GRATIS_DIA = 1;

// A receita sai daqui já sabendo o que falta na casa — a interface nunca
// promete algo que exige compra sem dizer.
function comCobertura(receita, despensa) {
  const c = compararDespensa(receita.ingredientes, despensa);
  return { ...receita, cobertura: c.cobertura, temTudo: c.temTudo, falta: c.faltaEssencial, rotuloFalta: rotuloFalta(c) };
}

// O catálogo da casa mais as receitas que o casal aprovou. Toda a cozinha passa
// por aqui: se uma receita de vocês não entrasse nesta lista, ela seria salva e
// nunca mais apareceria — que é o destino de toda lista de "salvos".
function receitasDe(coupleId) {
  return [...RECEITAS, ...db.receitasDoCasal(coupleId)];
}

function acharReceita(coupleId, id) {
  return RECEITAS_POR_ID[id] || db.receitasDoCasal(coupleId).find((r) => r.id === String(id)) || null;
}

function convitePendente(coupleId, spin, despensa) {
  if (!spin) return null;
  const receita = acharReceita(coupleId, spin.receita_id);
  return receita ? { spinId: spin.id, receita: comCobertura(receita, despensa) } : null;
}

app.get('/api/cozinha', withCouple, (req, res) => {
  const premium = isPremium(req.couple.id);
  const despensa = db.listPantry(req.couple.id);
  const parSugeriu = db.spinPendenteDoPar(req.couple.id, req.user.email);
  res.json({
    girosRestantes: girosRestantes(db.spinsHoje(req.couple.id, req.user.email), premium),
    girosGratisDia: GIROS_GRATIS_DIA,
    fotosRestantes: premium ? -1 : Math.max(0, FOTOS_GRATIS_DIA - db.photoSessionsHoje(req.couple.id)),
    visaoDisponivel: visaoDisponivel(),
    despensa: despensa.length,
    limiteDespensa: premium ? -1 : DESPENSA_GRATIS,
    premium,
    // Sugestão que o par sorteou e ainda está de pé: convite, não notificação.
    // A receita pode ter sido descartada da lista de achados desde o giro — aí
    // o convite simplesmente não existe mais.
    parSugeriu: convitePendente(req.couple.id, parSugeriu, despensa),
    achados: {
      pendentes: db.listFinds(req.couple.id, 'pendente').length,
      salvas: db.listFinds(req.couple.id, 'salva').length,
      iaDisponivel: iaDisponivel(),
    },
    metrica: db.taxaDeCozinhada(req.couple.id),
  });
});

// Gira e devolve UMA receita. A lista é justamente o problema que a feature mata.
app.post('/api/cozinha/girar', withCouple, (req, res) => {
  const premium = isPremium(req.couple.id);
  const usados = db.spinsHoje(req.couple.id, req.user.email);
  if (girosRestantes(usados, premium) <= 0) {
    db.track('limite_atingido', { coupleId: req.couple.id, email: req.user.email, props: { limite: 'giros' } });
    return res.status(402).json({
      error: `O plano grátis dá ${GIROS_GRATIS_DIA} giros por dia. No Chamego Juntos são ilimitados.`,
      upgrade: true, limite: 'giros',
    });
  }

  const despensa = db.listPantry(req.couple.id);
  const recusadas = Array.isArray(req.body?.recusadas) ? req.body.recusadas.slice(0, 20) : [];
  const resultado = girar(receitasDe(req.couple.id), {
    agora: new Date(),
    tempC: typeof req.body?.tempC === 'number' ? req.body.tempC : undefined,
    despensa,
    historico: db.listSpins(req.couple.id),
    restricoes: Array.isArray(req.body?.restricoes) ? req.body.restricoes : [],
    recusadas,
  });
  if (!resultado) return res.status(404).json({ error: 'Nada combina com as restrições de vocês' });

  const spin = db.createSpin(req.couple.id, req.user.email, {
    receitaId: resultado.receita.id,
    contexto: { motivos: resultado.motivos, pesos: resultado.pesos, hora: new Date().getHours() },
  });
  res.json({
    spinId: spin.id,
    receita: comCobertura(resultado.receita, despensa),
    motivos: resultado.motivos,
    girosRestantes: girosRestantes(usados + 1, premium),
  });
});

// Desfecho do giro. É o dado mais importante da feature: sem ele não se sabe
// se o produto resolve o problema.
app.post('/api/cozinha/spins/:id/desfecho', withCouple, (req, res) => {
  const desfechos = ['cozinhou', 'pulou', 'girou_de_novo', 'abandonou'];
  const desfecho = String(req.body?.desfecho || '');
  if (!desfechos.includes(desfecho)) return res.status(400).json({ error: 'Desfecho inválido' });
  const spin = db.setSpinOutcome(req.couple.id, Number(req.params.id), desfecho);
  if (!spin) return res.status(404).json({ error: 'Giro não encontrado' });
  res.json({ spin, metrica: db.taxaDeCozinhada(req.couple.id) });
});

app.get('/api/cozinha/receitas/:id', withCouple, (req, res) => {
  const receita = acharReceita(req.couple.id, req.params.id);
  if (!receita) return res.status(404).json({ error: 'Receita não encontrada' });
  res.json({ receita: comCobertura(receita, db.listPantry(req.couple.id)) });
});

// "Cozinhamos isso": fecha o giro, registra e devolve o gancho pro Momento.
app.post('/api/cozinha/cozinhei', withCouple, (req, res) => {
  const receita = acharReceita(req.couple.id, String(req.body?.receitaId || ''));
  if (!receita) return res.status(404).json({ error: 'Receita não encontrada' });
  if (req.body?.spinId) db.setSpinOutcome(req.couple.id, Number(req.body.spinId), 'cozinhou');
  const registro = db.registrarCozinhada(req.couple.id, req.user.email, {
    receitaId: receita.id, nota: req.body?.nota, notas: req.body?.notas,
  });
  db.track('cozinhou', { coupleId: req.couple.id, email: req.user.email, props: { receita: receita.id } });
  res.json({
    registro,
    metrica: db.taxaDeCozinhada(req.couple.id),
    sugestaoMomento: `Fizemos ${receita.titulo} hoje 🍳`,
  });
});

/* Receitinhas achadas: link → rascunho → curadoria → roda */

app.get('/api/cozinha/achados', withCouple, (req, res) => {
  const achados = db.listFinds(req.couple.id);
  res.json({
    pendentes: achados.filter((a) => a.status === 'pendente').map(paraTela),
    salvas: achados.filter((a) => a.status === 'salva').map(paraTela),
    iaDisponivel: iaDisponivel(),
    premium: isPremium(req.couple.id),
  });
});

// A lista mostra o suficiente pra decidir sem abrir: título, tempo e o que tem
// dentro. Os passos ficam pra tela da receita.
function paraTela(achado) {
  return {
    id: achado.id,
    url: achado.url,
    status: achado.status,
    criadoEm: achado.criado_em,
    receita: {
      id: achado.receita.id,
      titulo: achado.receita.titulo,
      tempoMin: achado.receita.tempoMin,
      porcoes: achado.receita.porcoes,
      ingredientes: achado.receita.ingredientes,
      passos: achado.receita.passos.length,
    },
  };
}

app.post('/api/cozinha/achados', withCouple, async (req, res) => {
  if (!isPremium(req.couple.id)) {
    db.track('limite_atingido', { coupleId: req.couple.id, email: req.user.email, props: { limite: 'achados' } });
    return res.status(402).json({
      error: 'Ler link de receita é do Chamego Juntos. A IA lê a página e deixa o rascunho pra vocês aprovarem.',
      upgrade: true, limite: 'achados',
    });
  }
  if (!iaDisponivel()) return res.status(503).json({ error: 'A leitura de link está fora do ar. Tenta mais tarde.' });

  const resultado = await extrairDoLink(req.body?.url);
  if (!resultado.ok) return res.status(422).json({ error: resultado.erro });

  const { find, repetido } = db.createFind(req.couple.id, req.user.email, {
    url: resultado.urlFinal, receita: resultado.receita,
  });
  db.track('achado_lido', { coupleId: req.couple.id, email: req.user.email, props: { repetido } });
  res.json({ achado: paraTela(find), repetido });
});

// Curadoria: o que entra na roda de vocês e o que não entra.
app.patch('/api/cozinha/achados/:id', withCouple, (req, res) => {
  const status = String(req.body?.status || '');
  if (!['salva', 'descartada', 'pendente'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }
  const achado = db.setFindStatus(req.couple.id, Number(req.params.id), status);
  if (!achado) return res.status(404).json({ error: 'Receita não encontrada' });
  if (status === 'salva') db.track('achado_salvo', { coupleId: req.couple.id, email: req.user.email });
  res.json({ achado: paraTela(achado) });
});

app.delete('/api/cozinha/achados/:id', withCouple, (req, res) => {
  if (!db.deleteFind(req.couple.id, Number(req.params.id))) {
    return res.status(404).json({ error: 'Receita não encontrada' });
  }
  res.json({ ok: true });
});

/* Despensa */
app.get('/api/despensa', withCouple, (req, res) => {
  res.json({
    itens: db.listPantry(req.couple.id),
    conhecidos: INGREDIENTES_CONHECIDOS,
    limite: isPremium(req.couple.id) ? -1 : DESPENSA_GRATIS,
  });
});

app.post('/api/despensa', withCouple, (req, res) => {
  const nomes = Array.isArray(req.body?.itens) ? req.body.itens : [req.body?.nome];
  const limpos = nomes.map((n) => String(n || '').trim()).filter(Boolean).slice(0, 30);
  if (!limpos.length) return res.status(400).json({ error: 'Diga o que entrou na despensa' });

  const premium = isPremium(req.couple.id);
  const atuais = db.listPantry(req.couple.id).length;
  if (!premium && atuais + limpos.length > DESPENSA_GRATIS) {
    db.track('limite_atingido', { coupleId: req.couple.id, email: req.user.email, props: { limite: 'despensa' } });
    return res.status(402).json({
      error: `A despensa grátis guarda ${DESPENSA_GRATIS} itens. No Chamego Juntos é ilimitada.`,
      upgrade: true, limite: 'despensa',
    });
  }
  for (const nome of limpos) {
    db.addPantryItem(req.couple.id, { name: nome, canonico: normalizar(nome), origem: req.body?.origem || 'manual' });
  }
  res.json({ itens: db.listPantry(req.couple.id) });
});

app.post('/api/despensa/:id/feedback', withCouple, (req, res) => {
  const tipos = ['comprou', 'acabou', 'ainda-tenho', 'nao-compro-mais'];
  const tipo = String(req.body?.tipo || '');
  if (!tipos.includes(tipo)) return res.status(400).json({ error: 'Resposta inválida' });
  const item = db.pantryItem(req.couple.id, Number(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  // A cadência é recalculada a partir da resposta: "ainda temos" ensina.
  const cadencia = tipo === 'nao-compro-mais' ? null : cadenciaAposFeedback(item, tipo);
  res.json({ item: db.pantryFeedback(req.couple.id, item.id, tipo, cadencia) });
});

app.delete('/api/despensa/:id', withCouple, (req, res) => {
  if (!db.deletePantryItem(req.couple.id, Number(req.params.id))) return res.status(404).json({ error: 'Item não encontrado' });
  res.json({ ok: true });
});

// Lista de mercado que se religa sozinha, com o motivo de cada item.
app.get('/api/mercado/sugestoes', withCouple, (req, res) => {
  const ritmo = db.ritmoDeCozinha(req.couple.id);
  const itens = db.listPantry(req.couple.id);
  const hoje = new Date();
  res.json({
    sugestoes: listaDoDia(itens, {
      hoje,
      cozinhadasUltimos7: ritmo.ultimos7,
      mediaSemanal: ritmo.mediaSemanal,
    }),
    aviso: melhorMomentoDeAvisar(itens, hoje),
  });
});

// Foto da geladeira → itens detectados. A confirmação é obrigatória e acontece
// na interface; aqui nada entra na despensa sozinho. O arquivo é apagado
// depois da extração: foto de geladeira é dado sensível.
app.post('/api/cozinha/foto', requireAuth, requireCouple, upload.single('foto'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Envie uma foto' });
  const apagar = () => fs.promises.unlink(req.file.path).catch(() => {});

  const premium = isPremium(req.couple.id);
  if (!premium && db.photoSessionsHoje(req.couple.id) >= FOTOS_GRATIS_DIA) {
    await apagar();
    db.track('limite_atingido', { coupleId: req.couple.id, email: req.user.email, props: { limite: 'fotos' } });
    return res.status(402).json({
      error: `O plano grátis lê ${FOTOS_GRATIS_DIA} foto por dia. No Chamego Juntos são ilimitadas.`,
      upgrade: true, limite: 'fotos',
    });
  }

  const { disponivel, itens, erro } = await extrairIngredientes(req.file.path, req.file.mimetype);
  await apagar();
  const sessao = db.createPhotoSession(req.couple.id, itens);
  res.json({
    sessaoId: sessao.id,
    detectado: itens,
    visaoDisponivel: disponivel,
    // Sem IA (ou se ela falhar) a tela de confirmação abre para digitar —
    // a feature não depende da visão para funcionar.
    modoManual: !disponivel || !!erro || itens.length === 0,
  });
});

// O que o casal corrigiu vira despensa e dado de ajuste do prompt de visão.
app.post('/api/cozinha/foto/:id/confirmar', withCouple, (req, res) => {
  const confirmados = (Array.isArray(req.body?.itens) ? req.body.itens : [])
    .map((n) => String(n || '').trim()).filter(Boolean).slice(0, 30);
  db.confirmPhotoSession(req.couple.id, Number(req.params.id), confirmados);

  const premium = isPremium(req.couple.id);
  const atuais = db.listPantry(req.couple.id).length;
  const cabe = premium ? confirmados : confirmados.slice(0, Math.max(0, DESPENSA_GRATIS - atuais));
  for (const nome of cabe) {
    db.addPantryItem(req.couple.id, { name: nome, canonico: normalizar(nome), origem: 'foto' });
  }
  const despensa = db.listPantry(req.couple.id);
  res.json({
    itens: despensa,
    ignorados: confirmados.length - cabe.length,
    // Três ângulos diferentes, como manda a spec: a mais rápida, a que
    // aproveita mais do que tem, e uma que ninguém pensaria.
    opcoes: tresAngulos(despensa, receitasDe(req.couple.id)),
  });
});

// Três receitas com ângulos distintos — nunca três variações da mesma ideia.
function tresAngulos(despensa, receitas) {
  const comDados = receitas.map((r) => comCobertura(r, despensa)).filter((r) => r.cobertura > 0.3);
  const porTempo = [...comDados].sort((a, b) => a.tempoMin - b.tempoMin);
  const porCobertura = [...comDados].sort((a, b) => b.cobertura - a.cobertura || a.tempoMin - b.tempoMin);
  const rapida = porTempo[0];
  const completa = porCobertura.find((r) => r.id !== rapida?.id);
  const inesperada = [...comDados]
    .sort((a, b) => b.dificuldade - a.dificuldade || b.tempoMin - a.tempoMin)
    .find((r) => r.id !== rapida?.id && r.id !== completa?.id);
  return [
    rapida && { angulo: 'A mais rápida', receita: rapida },
    completa && { angulo: 'Aproveita mais do que vocês têm', receita: completa },
    inesperada && { angulo: 'A inesperada', receita: inesperada },
  ].filter(Boolean);
}

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
      gifted: sub.gifted,
      giftUntil: sub.gift_until,
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

/* ── Presente ────────────────────────────────────────────────────────────
   Comprar não exige conta (quem presenteia costuma não ser usuário); resgatar
   exige espaço do casal. Os meses entram num crédito separado, então o webhook
   da assinatura nunca apaga o que foi presenteado. */

app.get('/api/gift', (req, res) => {
  res.json({ options: availableGifts(), billingEnabled: billingEnabled() });
});

app.post('/api/gift/checkout', async (req, res) => {
  try {
    res.json(await createGiftCheckout({
      months: Number(req.body?.months) || 12,
      buyerName: req.body?.buyerName || '',
      message: req.body?.message || '',
    }));
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// Prévia do código: mostra o que o casal vai receber antes de resgatar.
app.get('/api/gift/:code', (req, res) => {
  const gift = db.getGiftCode(req.params.code);
  if (!gift) return res.status(404).json({ error: 'Código não encontrado' });
  res.json({
    gift: {
      code: gift.code,
      months: gift.months,
      status: gift.status,
      from: gift.buyer_name || null,
      message: gift.message || '',
    },
  });
});

app.post('/api/gift/:code/redeem', withCouple, (req, res) => {
  const result = db.redeemGiftCode(req.params.code, req.couple.id, req.user.email);
  if (!result.ok) {
    const msg = {
      not_found: 'Código não encontrado. Confira as letras.',
      already_redeemed: 'Este presente já foi resgatado.',
      void: 'Este código não está mais válido.',
    }[result.reason];
    return res.status(result.reason === 'not_found' ? 404 : 409).json({ error: msg });
  }
  db.track('presente_resgatado', { coupleId: req.couple.id, email: req.user.email, props: { months: result.months } });
  res.json({ months: result.months, until: result.until, subscription: result.subscription });
});

// Códigos para parcerias e cortesias (cerimonialistas, fotógrafos, imprensa).
app.post('/api/admin/gift-codes', (req, res) => {
  const key = process.env.ADMIN_KEY;
  if (!key || req.headers['x-admin-key'] !== key) return res.status(403).json({ error: 'Não autorizado' });
  const quantidade = Math.min(50, Math.max(1, Number(req.body?.quantity) || 1));
  const codes = Array.from({ length: quantidade }, () => db.createGiftCode({
    months: Number(req.body?.months) || 3,
    origin: req.body?.origin || 'parceria',
    buyerName: req.body?.buyerName || null,
    message: req.body?.message || '',
  }).code);
  res.json({ codes });
});

// Funil de venda (espaços, conexão do par, testes, assinantes) — ADMIN_KEY.
app.get('/api/admin/metrics', (req, res) => {
  const key = process.env.ADMIN_KEY;
  if (!key || req.headers['x-admin-key'] !== key) return res.status(403).json({ error: 'Não autorizado' });
  res.json(db.funnel(Number(req.query.days) || 30));
});

// Eventos de funil vindos da interface (lista fechada, sem dado livre).
const CLIENT_EVENTS = ['paywall_visto', 'plano_visto', 'convite_compartilhado', 'instalou_app',
  'contador_compartilhado', 'presente_visto'];
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
  app.use(express.static(distDir, {
    setHeaders(res, caminho) {
      const arquivo = path.basename(caminho);
      // O service worker precisa ser buscado da rede a cada visita. Guardado
      // por engano, um deploy demora até um dia pra chegar em quem já
      // instalou o app — e é ele quem controla o cache de todo o resto.
      if (arquivo === 'sw.js' || arquivo === 'manifest.webmanifest' || arquivo === 'index.html') {
        res.setHeader('Cache-Control', 'no-cache');
        return;
      }
      // Arquivo de /assets leva hash no nome: muda o conteúdo, muda o nome.
      // Pode ser guardado pra sempre sem risco de servir versão velha.
      if (caminho.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));
  startNotifier();
}

export { app };
