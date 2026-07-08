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
  `CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    created_by TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT '',
    target_date TEXT DEFAULT '',
    shared INTEGER NOT NULL DEFAULT 1,
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS plan_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL REFERENCES plans(id),
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS gifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    created_by TEXT NOT NULL,
    title TEXT NOT NULL,
    person TEXT DEFAULT '',
    date TEXT DEFAULT '',
    budget INTEGER DEFAULT 0,
    ideas TEXT DEFAULT '[]',
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS saved_date_ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    created_by TEXT NOT NULL,
    idea_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (couple_id, idea_id)
  )`,
  `CREATE TABLE IF NOT EXISTS quiz_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    user_email TEXT NOT NULL,
    quiz_id TEXT NOT NULL,
    answers TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE (couple_id, user_email, quiz_id)
  )`,
  `CREATE TABLE IF NOT EXISTS time_capsules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    created_by TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT DEFAULT '',
    open_date TEXT NOT NULL,
    opened_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    created_by TEXT NOT NULL,
    title TEXT NOT NULL,
    moment_ids TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS intimacy_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    created_by TEXT NOT NULL,
    prompt_id TEXT NOT NULL,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    couple_id INTEGER PRIMARY KEY REFERENCES couples(id),
    plan TEXT NOT NULL DEFAULT 'free',
    entitlements TEXT DEFAULT '["free"]',
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS plan_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL REFERENCES plans(id),
    url TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
];

const DATE_IDEAS = [
  { id: 'picnic-sunset', title: 'Piquenique ao pôr do sol', vibe: 'romantico', budget: 'baixo', duration: '2-3h', where: 'fora', premium: false, desc: 'Uma cesta simples, um bom lugar e o fim de tarde. Baixa produção, alto retorno.', checklist: ['Canga ou toalha', 'Petiscos e uma bebida', 'Playlist pronta'] },
  { id: 'home-games', title: 'Noite de jogos em casa', vibe: 'animado', budget: 'zero', duration: '2-3h', where: 'casa', premium: false, desc: 'Jogo de tabuleiro ou videogame, sem celular, muita risada.', checklist: ['Escolher o jogo', 'Bebida ou petisco', 'Celular longe'] },
  { id: 'first-date', title: 'Reviver o primeiro encontro', vibe: 'romantico', budget: 'medio', duration: 'dia', where: 'fora', premium: false, desc: 'Voltar ao lugar (ou recriar) o primeiro date de vocês.', checklist: ['Lugar especial', 'Uma foto antiga', 'Uma mensagem'] },
  { id: 'food-route', title: 'Rota gastronômica no bairro', vibe: 'animado', budget: 'medio', duration: '2-3h', where: 'fora', premium: false, desc: 'Entrada num lugar, prato principal em outro, sobremesa num terceiro.', checklist: ['Escolher 3 lugares', 'Ir a pé', 'Dividir tudo'] },
  { id: 'cook-together', title: 'Cozinhar algo novo juntos', vibe: 'relax', budget: 'baixo', duration: '2-3h', where: 'casa', premium: false, desc: 'Uma receita que nenhum dos dois fez ainda.', checklist: ['Escolher a receita', 'Comprar os ingredientes', 'Uma boa playlist'] },
  { id: 'stargazing', title: 'Observar as estrelas', vibe: 'romantico', budget: 'zero', duration: '1h', where: 'fora', premium: false, desc: 'Um lugar escuro, um cobertor e o céu.', checklist: ['Cobertor', 'App de estrelas', 'Chocolate quente'] },
  { id: 'bday-surprise', title: 'Surpresa de aniversário', vibe: 'romantico', budget: 'alto', duration: 'dia', where: 'fora', premium: true, desc: 'Roteiro completo de surpresa passo a passo.', checklist: ['Definir o tema', 'Reservar', 'Convidar quem importa'] },
  { id: 'weekend-trip', title: 'Bate-volta de fim de semana', vibe: 'aventura', budget: 'alto', duration: 'dia', where: 'fora', premium: true, desc: 'Uma cidade vizinha, um dia inteiro só de vocês.', checklist: ['Escolher destino', 'Combinar horário', 'Playlist da estrada'] },
];

const QUIZZES = [
  {
    id: 'fim-de-semana',
    title: 'Fim de semana perfeito',
    category: 'Diversão',
    premium: false,
    questions: [
      { id: 'q1', text: 'O que combina mais com a gente?', options: ['Casa e filme', 'Passeio ao ar livre', 'Restaurante novo'] },
      { id: 'q2', text: 'Qual cuidado faz mais diferenca?', options: ['Mensagem carinhosa', 'Ajuda pratica', 'Tempo de qualidade'] },
      { id: 'q3', text: 'Uma meta gostosa para este mes?', options: ['Um date', 'Uma viagem curta', 'Organizar a casa'] },
    ],
  },
  {
    id: 'nossa-rotina',
    title: 'Nossa rotina ideal',
    category: 'Rotina',
    premium: false,
    questions: [
      { id: 'q1', text: 'Manhã ideal a dois?', options: ['Café com calma', 'Treino junto', 'Dormir até tarde'] },
      { id: 'q2', text: 'Quem cuida melhor da casa?', options: ['Eu', 'Meu par', 'Dividimos'] },
      { id: 'q3', text: 'Fim de dia perfeito?', options: ['Série no sofá', 'Conversa longa', 'Cada um no seu canto'] },
      { id: 'q4', text: 'O que precisamos fazer mais?', options: ['Sair de casa', 'Descansar', 'Planejar o futuro'] },
    ],
  },
  {
    id: 'como-se-conhece',
    title: 'Como a gente se conhece?',
    category: 'Diversão',
    premium: false,
    questions: [
      { id: 'q1', text: 'Comida favorita do seu par?', options: ['Doce', 'Salgado', 'Apimentado'] },
      { id: 'q2', text: 'Como seu par relaxa?', options: ['Sozinho(a)', 'Com gente', 'Fazendo algo'] },
      { id: 'q3', text: 'Maior sonho do seu par?', options: ['Viajar', 'Casa própria', 'Carreira'] },
    ],
  },
  {
    id: 'sonhos-futuro',
    title: 'Sonhos & futuro',
    category: 'Viagens',
    premium: true,
    questions: [
      { id: 'q1', text: 'Próxima viagem dos sonhos?', options: ['Praia', 'Cidade grande', 'Natureza'] },
      { id: 'q2', text: 'Daqui a 5 anos?', options: ['Mesma cidade', 'Outro país', 'Interior'] },
      { id: 'q3', text: 'Prioridade do casal?', options: ['Experiências', 'Estabilidade', 'Aventura'] },
    ],
  },
  {
    id: 'intimidade-conexao',
    title: 'Intimidade & conexão',
    category: 'Intimidade',
    premium: true,
    questions: [
      { id: 'q1', text: 'Como você se sente mais amado(a)?', options: ['Toque', 'Palavras', 'Tempo junto'] },
      { id: 'q2', text: 'O que aproxima mais vocês?', options: ['Conversa profunda', 'Rir juntos', 'Silêncio confortável'] },
      { id: 'q3', text: 'Um gesto que faz diferença?', options: ['Abraço longo', 'Elogio', 'Surpresa'] },
    ],
  },
];

const INTIMACY_PROMPTS = [
  { id: 'conversa', tone: 'Conversa', text: 'O que em mim faz você se sentir em casa?', premium: false },
  { id: 'gratidao', tone: 'Carinho', text: 'Uma coisa pequena que você fez e me deixou feliz foi...', premium: false },
  { id: 'futuro', tone: 'Futuro', text: 'Quando penso no nosso futuro, eu queria construir...', premium: false },
  { id: 'reconexao', tone: 'Reconexão', text: 'Quando a rotina aperta, o que mais sinto falta da gente é...', premium: false },
  { id: 'desejo', tone: 'Desejo', text: 'Algo que me deixa mais próximo(a) de você é...', premium: true },
  { id: 'combinados', tone: 'Combinados', text: 'Um combinado nosso que eu queria rever com carinho é...', premium: true },
];

function parseJson(value, fallback) {
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

// Ideias de presente: aceita strings antigas ou objetos, sempre devolve {text,done,cost}.
function normalizeIdeas(ideas) {
  if (!Array.isArray(ideas)) return [];
  return ideas.slice(0, 20).map((i) => {
    if (typeof i === 'string') return { text: i.slice(0, 160), done: false, cost: 0 };
    return { text: String(i?.text || '').slice(0, 160), done: !!i?.done, cost: Number(i?.cost) || 0 };
  }).filter((i) => i.text);
}

// Intervalo (segunda–domingo) da semana deslocada por `offset` semanas no passado.
function weekRange(offset = 0) {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // segunda = 0
  const monday = new Date(now);
  monday.setDate(now.getDate() - day - offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
}

// Cápsula selada: esconde conteúdo até open_date. `sealed` diz se ainda está fechada.
function sealCapsule(c) {
  const today = new Date().toISOString().slice(0, 10);
  const sealed = c.open_date > today && !c.opened_at;
  if (sealed) return { ...c, message: '', media_url: null, sealed: true };
  return { ...c, sealed: false };
}

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
  // Colunas novas das features F1 (Planos, Presentes, Cápsula). Idempotente.
  const MIGRATIONS = [
    "ALTER TABLE plans ADD COLUMN notes TEXT DEFAULT ''",
    "ALTER TABLE gifts ADD COLUMN kind TEXT DEFAULT 'date'",
    'ALTER TABLE gifts ADD COLUMN secret INTEGER DEFAULT 0',
    'ALTER TABLE gifts ADD COLUMN reminder_lead INTEGER DEFAULT 7',
    'ALTER TABLE time_capsules ADD COLUMN media_url TEXT',
    'ALTER TABLE time_capsules ADD COLUMN media_type TEXT',
    "ALTER TABLE time_capsules ADD COLUMN recurrence TEXT DEFAULT 'none'",
    "ALTER TABLE time_capsules ADD COLUMN scope TEXT DEFAULT 'couple'",
    'ALTER TABLE couples ADD COLUMN reminder_prefs TEXT',
    'ALTER TABLE couples ADD COLUMN intimacy_pin TEXT',
    "ALTER TABLE albums ADD COLUMN caption TEXT DEFAULT ''",
  ];
  for (const ddl of MIGRATIONS) {
    try { sqlite.prepare(ddl).run(); } catch { /* coluna já existe */ }
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
    setUserPicture(email, url) {
      sqlite.prepare('UPDATE users SET picture=? WHERE email=?').run(url, email);
      return this.getUser(email);
    },
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
    updateMoment(coupleId, id, { text, date }, { newPhotoUrl, removePhoto } = {}) {
      const m = sqlite.prepare('SELECT * FROM moments WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!m) return null;
      const tx = sqlite.transaction(() => {
        if (text !== undefined) sqlite.prepare('UPDATE moments SET text=? WHERE id=?').run(String(text).slice(0, 1000), id);
        if (date !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(date)) sqlite.prepare('UPDATE moments SET date=? WHERE id=?').run(date, id);
        // 1 foto por momento: trocar ou remover apaga a anterior primeiro.
        if (newPhotoUrl || removePhoto) sqlite.prepare('DELETE FROM moment_photos WHERE moment_id=?').run(id);
        if (newPhotoUrl) sqlite.prepare('INSERT INTO moment_photos (moment_id, url, position) VALUES (?, ?, 0)').run(id, newPhotoUrl);
      });
      tx();
      const out = sqlite.prepare('SELECT * FROM moments WHERE id=?').get(id);
      out.photos = sqlite.prepare('SELECT url FROM moment_photos WHERE moment_id=? ORDER BY position, id').all(id).map(p => p.url);
      return out;
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

    /* ── Prototipo: planos, presentes, dates, conteudo guiado ── */
    listPlans(coupleId) {
      const plans = sqlite.prepare('SELECT * FROM plans WHERE couple_id=? ORDER BY done, created_at DESC').all(coupleId);
      for (const p of plans) p.steps = sqlite.prepare('SELECT * FROM plan_steps WHERE plan_id=? ORDER BY position, id').all(p.id);
      return plans;
    },
    getPlan(coupleId, id) {
      const plan = sqlite.prepare('SELECT * FROM plans WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!plan) return null;
      plan.steps = sqlite.prepare('SELECT * FROM plan_steps WHERE plan_id=? ORDER BY position, id').all(id);
      plan.attachments = sqlite.prepare('SELECT id, url FROM plan_attachments WHERE plan_id=? ORDER BY id').all(id);
      return plan;
    },
    createPlan(coupleId, email, { title, category = '', targetDate = '', shared = true, steps = [] }) {
      const tx = sqlite.transaction(() => {
        const r = sqlite.prepare(`INSERT INTO plans (couple_id, created_by, title, category, target_date, shared)
          VALUES (?, ?, ?, ?, ?, ?)`)
          .run(coupleId, email, String(title).slice(0, 120), String(category).slice(0, 40), String(targetDate).slice(0, 10), shared ? 1 : 0);
        steps.slice(0, 20).forEach((step, i) => sqlite.prepare('INSERT INTO plan_steps (plan_id, title, position) VALUES (?, ?, ?)')
          .run(r.lastInsertRowid, String(step).slice(0, 160), i));
        return r.lastInsertRowid;
      });
      return this.getPlan(coupleId, tx());
    },
    updatePlan(coupleId, id, patch) {
      const plan = this.getPlan(coupleId, id);
      if (!plan) return null;
      if (patch.title !== undefined) sqlite.prepare('UPDATE plans SET title=? WHERE id=?').run(String(patch.title).slice(0, 120), id);
      if (patch.category !== undefined) sqlite.prepare('UPDATE plans SET category=? WHERE id=?').run(String(patch.category).slice(0, 40), id);
      if (patch.targetDate !== undefined) sqlite.prepare('UPDATE plans SET target_date=? WHERE id=?').run(String(patch.targetDate).slice(0, 10), id);
      if (patch.shared !== undefined) sqlite.prepare('UPDATE plans SET shared=? WHERE id=?').run(patch.shared ? 1 : 0, id);
      if (patch.done !== undefined) sqlite.prepare('UPDATE plans SET done=? WHERE id=?').run(patch.done ? 1 : 0, id);
      if (patch.notes !== undefined) sqlite.prepare('UPDATE plans SET notes=? WHERE id=?').run(String(patch.notes).slice(0, 2000), id);
      return this.getPlan(coupleId, id);
    },
    updatePlanStep(coupleId, stepId, { title, done }) {
      const row = sqlite.prepare(`SELECT s.id, s.plan_id FROM plan_steps s
        JOIN plans p ON p.id=s.plan_id WHERE s.id=? AND p.couple_id=?`).get(stepId, coupleId);
      if (!row) return null;
      if (title !== undefined) sqlite.prepare('UPDATE plan_steps SET title=? WHERE id=?').run(String(title).slice(0, 160), stepId);
      if (done !== undefined) sqlite.prepare('UPDATE plan_steps SET done=? WHERE id=?').run(done ? 1 : 0, stepId);
      return this.getPlan(coupleId, row.plan_id);
    },
    addPlanStep(coupleId, planId, title) {
      const plan = sqlite.prepare('SELECT id FROM plans WHERE id=? AND couple_id=?').get(planId, coupleId);
      if (!plan) return null;
      const pos = (sqlite.prepare('SELECT MAX(position) m FROM plan_steps WHERE plan_id=?').get(planId)?.m ?? -1) + 1;
      sqlite.prepare('INSERT INTO plan_steps (plan_id, title, position) VALUES (?, ?, ?)').run(planId, String(title).slice(0, 160), pos);
      return this.getPlan(coupleId, planId);
    },
    deletePlanStep(coupleId, stepId) {
      const row = sqlite.prepare(`SELECT s.id, s.plan_id FROM plan_steps s
        JOIN plans p ON p.id=s.plan_id WHERE s.id=? AND p.couple_id=?`).get(stepId, coupleId);
      if (!row) return null;
      sqlite.prepare('DELETE FROM plan_steps WHERE id=?').run(stepId);
      return this.getPlan(coupleId, row.plan_id);
    },
    deletePlan(coupleId, id) {
      const plan = sqlite.prepare('SELECT id FROM plans WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!plan) return false;
      const tx = sqlite.transaction(() => {
        sqlite.prepare('DELETE FROM plan_steps WHERE plan_id=?').run(id);
        sqlite.prepare('DELETE FROM plan_attachments WHERE plan_id=?').run(id);
        sqlite.prepare('DELETE FROM plans WHERE id=?').run(id);
      });
      tx();
      return true;
    },
    addPlanAttachment(coupleId, planId, url) {
      const plan = sqlite.prepare('SELECT id FROM plans WHERE id=? AND couple_id=?').get(planId, coupleId);
      if (!plan) return null;
      sqlite.prepare('INSERT INTO plan_attachments (plan_id, url) VALUES (?, ?)').run(planId, url);
      return this.getPlan(coupleId, planId);
    },
    deletePlanAttachment(coupleId, attId) {
      const row = sqlite.prepare(`SELECT a.id, a.plan_id FROM plan_attachments a
        JOIN plans p ON p.id=a.plan_id WHERE a.id=? AND p.couple_id=?`).get(attId, coupleId);
      if (!row) return null;
      sqlite.prepare('DELETE FROM plan_attachments WHERE id=?').run(attId);
      return this.getPlan(coupleId, row.plan_id);
    },

    listGifts(coupleId, requesterEmail = null) {
      return sqlite.prepare('SELECT * FROM gifts WHERE couple_id=? ORDER BY date, created_at DESC').all(coupleId)
        .filter(g => !g.secret || !requesterEmail || g.created_by === requesterEmail) // modo surpresa: só o autor vê
        .map(g => ({ ...g, ideas: normalizeIdeas(parseJson(g.ideas, [])) }));
    },
    getGift(coupleId, id, requesterEmail = null) {
      const g = sqlite.prepare('SELECT * FROM gifts WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!g) return null;
      if (g.secret && requesterEmail && g.created_by !== requesterEmail) return null;
      return { ...g, ideas: normalizeIdeas(parseJson(g.ideas, [])) };
    },
    createGift(coupleId, email, { title, person = '', date = '', budget = 0, ideas = [], kind = 'date', secret = false, reminderLead = 7 }) {
      const k = kind === 'wishlist' ? 'wishlist' : 'date';
      const r = sqlite.prepare(`INSERT INTO gifts (couple_id, created_by, title, person, date, budget, ideas, kind, secret, reminder_lead)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(coupleId, email, String(title).slice(0, 120), String(person).slice(0, 80), String(date).slice(0, 10),
          Number(budget) || 0, JSON.stringify(normalizeIdeas(ideas)), k, secret ? 1 : 0, Number(reminderLead) || 7);
      return this.getGift(coupleId, r.lastInsertRowid, email);
    },
    updateGift(coupleId, id, patch) {
      const g = sqlite.prepare('SELECT * FROM gifts WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!g) return null;
      if (patch.title !== undefined) sqlite.prepare('UPDATE gifts SET title=? WHERE id=?').run(String(patch.title).slice(0, 120), id);
      if (patch.person !== undefined) sqlite.prepare('UPDATE gifts SET person=? WHERE id=?').run(String(patch.person).slice(0, 80), id);
      if (patch.date !== undefined) sqlite.prepare('UPDATE gifts SET date=? WHERE id=?').run(String(patch.date).slice(0, 10), id);
      if (patch.budget !== undefined) sqlite.prepare('UPDATE gifts SET budget=? WHERE id=?').run(Number(patch.budget) || 0, id);
      if (patch.done !== undefined) sqlite.prepare('UPDATE gifts SET done=? WHERE id=?').run(patch.done ? 1 : 0, id);
      if (patch.secret !== undefined) sqlite.prepare('UPDATE gifts SET secret=? WHERE id=?').run(patch.secret ? 1 : 0, id);
      if (patch.kind !== undefined) sqlite.prepare('UPDATE gifts SET kind=? WHERE id=?').run(patch.kind === 'wishlist' ? 'wishlist' : 'date', id);
      if (patch.reminderLead !== undefined) sqlite.prepare('UPDATE gifts SET reminder_lead=? WHERE id=?').run(Number(patch.reminderLead) || 7, id);
      if (patch.ideas !== undefined) sqlite.prepare('UPDATE gifts SET ideas=? WHERE id=?').run(JSON.stringify(normalizeIdeas(patch.ideas)), id);
      return this.getGift(coupleId, id, g.created_by);
    },
    deleteGift(coupleId, id) {
      return sqlite.prepare('DELETE FROM gifts WHERE id=? AND couple_id=?').run(id, coupleId).changes > 0;
    },

    listDateIdeas(coupleId, myEmail = null) {
      const rows = sqlite.prepare('SELECT idea_id, created_by FROM saved_date_ideas WHERE couple_id=?').all(coupleId);
      const by = new Map(rows.map(r => [r.idea_id, r.created_by]));
      return DATE_IDEAS.map(idea => {
        const savedBy = by.get(idea.id) || null;
        return { ...idea, saved: !!savedBy, savedByMe: savedBy === myEmail, savedByPartner: !!savedBy && savedBy !== myEmail };
      });
    },
    saveDateIdea(coupleId, email, ideaId) {
      if (!DATE_IDEAS.some(i => i.id === ideaId)) return null;
      sqlite.prepare(`INSERT INTO saved_date_ideas (couple_id, created_by, idea_id) VALUES (?, ?, ?)
        ON CONFLICT(couple_id, idea_id) DO NOTHING`).run(coupleId, email, String(ideaId));
      return sqlite.prepare('SELECT * FROM saved_date_ideas WHERE couple_id=? AND idea_id=?').get(coupleId, ideaId);
    },
    unsaveDateIdea(coupleId, ideaId) {
      return sqlite.prepare('DELETE FROM saved_date_ideas WHERE couple_id=? AND idea_id=?').run(coupleId, String(ideaId)).changes > 0;
    },

    weeklySummary(coupleId) {
      return {
        eventsCount: sqlite.prepare('SELECT COUNT(*) c FROM events WHERE couple_id=?').get(coupleId).c,
        listsCount: sqlite.prepare('SELECT COUNT(*) c FROM lists WHERE couple_id=?').get(coupleId).c,
        momentsCount: sqlite.prepare('SELECT COUNT(*) c FROM moments WHERE couple_id=?').get(coupleId).c,
        checkinsCount: sqlite.prepare('SELECT COUNT(*) c FROM checkins WHERE couple_id=?').get(coupleId).c,
        activeGoals: this.activeGoalsCount(coupleId),
      };
    },
    reminderPrefs(coupleId) {
      const row = sqlite.prepare('SELECT reminder_prefs FROM couples WHERE id=?').get(coupleId);
      return { frequency: 'equilibrio', types: { checkin: true, dates: true, goals: true, routine: false }, ...parseJson(row?.reminder_prefs, {}) };
    },
    setReminderPrefs(coupleId, patch) {
      const cur = this.reminderPrefs(coupleId);
      const next = { frequency: patch.frequency || cur.frequency, types: { ...cur.types, ...(patch.types || {}) } };
      sqlite.prepare('UPDATE couples SET reminder_prefs=? WHERE id=?').run(JSON.stringify(next), coupleId);
      return next;
    },
    listReminders(coupleId) {
      const summary = this.weeklySummary(coupleId);
      const streak = this.checkinStreak(coupleId);
      const prefs = this.reminderPrefs(coupleId);
      const t = prefs.types;
      const today = [];
      const later = [];
      if (t.checkin && streak === 0) today.push({ id: 'checkin', icon: 'heart', title: 'Faz um tempo sem check-in', sub: 'Que tal registrar como você está?', action: 'checkin', when: 'today' });
      if (t.dates && !summary.eventsCount) today.push({ id: 'event', icon: 'calendar', title: 'Nenhum evento marcado', sub: 'Combine o próximo date de vocês', action: 'agenda', when: 'today' });
      if (t.goals && summary.activeGoals > 0) later.push({ id: 'goal', icon: 'target', title: 'Vocês têm metas em aberto', sub: 'Retomar uma etapa', action: 'planos', when: 'later' });
      if (t.routine && summary.momentsCount === 0) later.push({ id: 'moment', icon: 'image', title: 'Guardem um momento', sub: 'Uma foto ou frase do dia', action: 'momentos', when: 'later' });
      later.push({ id: 'care', icon: 'chat', title: 'Responder a pergunta da semana', sub: 'Puxem assunto no chat', action: 'chat', when: 'later' });
      return [...today, ...later];
    },
    listAchievements(coupleId) {
      const s = this.weeklySummary(coupleId);
      const streak = this.checkinStreak(coupleId);
      const plans = sqlite.prepare('SELECT COUNT(*) c FROM plans WHERE couple_id=?').get(coupleId).c;
      const caps = sqlite.prepare('SELECT COUNT(*) c FROM time_capsules WHERE couple_id=?').get(coupleId).c;
      const doneItems = sqlite.prepare('SELECT COUNT(*) c FROM list_items i JOIN lists l ON l.id=i.list_id WHERE l.couple_id=? AND i.done=1').get(coupleId).c;
      const eventsAll = s.eventsCount;
      return [
        { id: 'first-checkin', icon: 'heart', title: 'Primeiro check-in', desc: 'Vocês registraram como estavam pela primeira vez.', unlocked: s.checkinsCount > 0 },
        { id: 'first-moment', icon: 'image', title: 'Primeiro momento', desc: 'A linha do tempo de vocês começou.', unlocked: s.momentsCount > 0 },
        { id: 'first-event', icon: 'calendar', title: 'Primeiro evento', desc: 'O primeiro compromisso entrou na agenda.', unlocked: eventsAll > 0 },
        { id: 'streak-7', icon: 'check', title: '7 check-ins seguidos', desc: 'Uma semana inteira de constância.', unlocked: streak >= 7 },
        { id: 'first-plan', icon: 'target', title: 'Primeiro plano', desc: 'Um sonho grande virou etapas.', unlocked: plans > 0 },
        { id: 'first-capsule', icon: 'gift', title: 'Primeira cápsula', desc: 'Guardaram algo para o futuro.', unlocked: caps > 0 },
        { id: 'ten-done', icon: 'list', title: '10 tarefas concluídas', desc: 'Organização a dois em movimento.', unlocked: doneItems >= 10, progress: { current: Math.min(doneItems, 10), total: 10 } },
        { id: 'five-dates', icon: 'star', title: '5 dates registrados', desc: 'Tempo de qualidade acontecendo.', unlocked: eventsAll >= 5, progress: { current: Math.min(eventsAll, 5), total: 5 } },
      ];
    },
    // Resumo semanal (semana seg–dom). weekOffset 0 = atual, 1 = anterior…
    weeklyReport(coupleId, weekOffset = 0) {
      const { start, end } = weekRange(weekOffset);
      const inRange = (table, col) => sqlite.prepare(`SELECT COUNT(*) c FROM ${table} WHERE couple_id=? AND ${col} BETWEEN ? AND ?`).get(coupleId, start, end).c;
      const events = inRange('events', 'date');
      const moments = inRange('moments', 'date');
      const checkins = inRange('checkins', 'date');
      const tasksClosed = sqlite.prepare(`SELECT COUNT(*) c FROM list_items i JOIN lists l ON l.id=i.list_id
        WHERE l.couple_id=? AND i.done=1 AND date(i.created_at) BETWEEN ? AND ?`).get(coupleId, start, end).c;
      const moodRow = sqlite.prepare(`SELECT mood, COUNT(*) c FROM checkins WHERE couple_id=? AND date BETWEEN ? AND ? GROUP BY mood ORDER BY c DESC LIMIT 1`).get(coupleId, start, end);
      const highlights = [];
      if (moodRow) highlights.push({ icon: 'heart', text: `Humor predominante da semana: ${moodRow.mood}.` });
      if (events > 0) highlights.push({ icon: 'star', text: `${events} ${events === 1 ? 'date/evento' : 'dates/eventos'} na agenda de vocês.` });
      if (tasksClosed > 0) highlights.push({ icon: 'check', text: `${tasksClosed} ${tasksClosed === 1 ? 'tarefa fechada' : 'tarefas fechadas'} nas listas.` });
      if (!highlights.length) highlights.push({ icon: 'calendar', text: 'Semana tranquila — registrem um check-in para o próximo resumo.' });
      return { start, end, events, moments, checkins, tasksClosed, activeGoals: this.activeGoalsCount(coupleId), highlights };
    },
    weeklyHistory(coupleId) {
      return Array.from({ length: 8 }, (_, i) => {
        const r = this.weeklyReport(coupleId, i);
        return { start: r.start, end: r.end, events: r.events, moments: r.moments, checkins: r.checkins };
      });
    },

    listQuizzes(coupleId, email) {
      return QUIZZES.map(q => {
        const mine = sqlite.prepare('SELECT answers FROM quiz_answers WHERE couple_id=? AND user_email=? AND quiz_id=?').get(coupleId, email, q.id);
        const partner = sqlite.prepare('SELECT 1 FROM quiz_answers WHERE couple_id=? AND user_email!=? AND quiz_id=?').get(coupleId, email, q.id);
        return { ...q, answered: !!mine, partnerAnswered: !!partner };
      });
    },
    getQuiz(id) {
      return QUIZZES.find(q => q.id === id) || null;
    },
    saveQuizAnswers(coupleId, email, quizId, answers) {
      const quiz = QUIZZES.find(q => q.id === quizId);
      if (!quiz) return null;
      sqlite.prepare(`INSERT INTO quiz_answers (couple_id, user_email, quiz_id, answers, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(couple_id, user_email, quiz_id) DO UPDATE SET answers=excluded.answers, updated_at=datetime('now')`)
        .run(coupleId, email, quizId, JSON.stringify(Array.isArray(answers) ? answers : []));
      const rows = sqlite.prepare('SELECT user_email, answers FROM quiz_answers WHERE couple_id=? AND quiz_id=?').all(coupleId, quizId);
      return { quizId, myAnswers: answers.length, answeredBy: rows.length, answers: rows.map(r => ({ email: r.user_email, answers: parseJson(r.answers, []) })) };
    },
    quizResult(coupleId, quizId) {
      const rows = sqlite.prepare('SELECT user_email, answers FROM quiz_answers WHERE couple_id=? AND quiz_id=?').all(coupleId, quizId);
      return { quizId, answeredBy: rows.length, answers: rows.map(r => ({ email: r.user_email, answers: parseJson(r.answers, []) })) };
    },

    listTimeCapsules(coupleId) {
      return sqlite.prepare('SELECT * FROM time_capsules WHERE couple_id=? ORDER BY open_date, created_at DESC').all(coupleId)
        .map(sealCapsule);
    },
    getTimeCapsule(coupleId, id) {
      const c = sqlite.prepare('SELECT * FROM time_capsules WHERE id=? AND couple_id=?').get(id, coupleId);
      return c ? sealCapsule(c) : null;
    },
    createTimeCapsule(coupleId, email, { title, message = '', openDate, mediaUrl = null, mediaType = null, recurrence = 'none', scope = 'couple' }) {
      const r = sqlite.prepare(`INSERT INTO time_capsules (couple_id, created_by, title, message, open_date, media_url, media_type, recurrence, scope)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(coupleId, email, String(title).slice(0, 120), String(message).slice(0, 2000), String(openDate).slice(0, 10),
          mediaUrl, mediaType, recurrence === 'yearly' ? 'yearly' : 'none', scope === 'self' ? 'self' : 'couple');
      return this.getTimeCapsule(coupleId, r.lastInsertRowid);
    },
    openTimeCapsule(coupleId, id) {
      const c = sqlite.prepare('SELECT * FROM time_capsules WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!c) return null;
      const today = new Date().toISOString().slice(0, 10);
      if (c.open_date > today) return { error: 'sealed' }; // ainda selada
      if (!c.opened_at) {
        sqlite.prepare(`UPDATE time_capsules SET opened_at=datetime('now') WHERE id=?`).run(id);
        // Recorrência anual: agenda a próxima ocorrência ao abrir.
        if (c.recurrence === 'yearly') {
          const next = `${Number(c.open_date.slice(0, 4)) + 1}${c.open_date.slice(4)}`;
          sqlite.prepare(`INSERT INTO time_capsules (couple_id, created_by, title, message, open_date, media_url, media_type, recurrence, scope)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'yearly', ?)`)
            .run(coupleId, c.created_by, c.title, c.message, next, c.media_url, c.media_type, c.scope);
        }
      }
      // Devolve conteúdo revelado (sem selar).
      const opened = sqlite.prepare('SELECT * FROM time_capsules WHERE id=?').get(id);
      return { ...opened, sealed: false };
    },

    listAlbums(coupleId) {
      const moments = this.listMoments(coupleId);
      const cover = (ids) => moments.find(m => ids.includes(m.id) && m.photos?.[0])?.photos[0] || null;
      return sqlite.prepare('SELECT * FROM albums WHERE couple_id=? ORDER BY created_at DESC').all(coupleId)
        .map(a => { const momentIds = parseJson(a.moment_ids, []); return { ...a, momentIds, cover: cover(momentIds), photoCount: momentIds.length }; });
    },
    getAlbum(coupleId, id) {
      const a = sqlite.prepare('SELECT * FROM albums WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!a) return null;
      const momentIds = parseJson(a.moment_ids, []);
      const moments = this.listMoments(coupleId).filter(m => momentIds.includes(m.id));
      return { ...a, momentIds, moments };
    },
    createAlbum(coupleId, email, { title, caption = '', momentIds }) {
      const ids = Array.isArray(momentIds) && momentIds.length ? momentIds : this.listMoments(coupleId).map(m => m.id);
      const r = sqlite.prepare('INSERT INTO albums (couple_id, created_by, title, caption, moment_ids) VALUES (?, ?, ?, ?, ?)')
        .run(coupleId, email, String(title).slice(0, 120), String(caption).slice(0, 500), JSON.stringify(ids.slice(0, 100)));
      return this.getAlbum(coupleId, r.lastInsertRowid);
    },
    updateAlbum(coupleId, id, patch) {
      const a = sqlite.prepare('SELECT id FROM albums WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!a) return null;
      if (patch.title !== undefined) sqlite.prepare('UPDATE albums SET title=? WHERE id=?').run(String(patch.title).slice(0, 120), id);
      if (patch.caption !== undefined) sqlite.prepare('UPDATE albums SET caption=? WHERE id=?').run(String(patch.caption).slice(0, 500), id);
      if (Array.isArray(patch.momentIds)) sqlite.prepare('UPDATE albums SET moment_ids=? WHERE id=?').run(JSON.stringify(patch.momentIds.slice(0, 100)), id);
      return this.getAlbum(coupleId, id);
    },
    deleteAlbum(coupleId, id) {
      return sqlite.prepare('DELETE FROM albums WHERE id=? AND couple_id=?').run(id, coupleId).changes > 0;
    },

    listIntimacyPrompts() {
      return INTIMACY_PROMPTS;
    },
    getIntimacyPrompt(id) {
      return INTIMACY_PROMPTS.find(p => p.id === id) || null;
    },
    createIntimacySession(coupleId, email, { promptId, note = '' }) {
      const prompt = INTIMACY_PROMPTS.find(p => p.id === promptId);
      if (!prompt) return null;
      const r = sqlite.prepare('INSERT INTO intimacy_sessions (couple_id, created_by, prompt_id, note) VALUES (?, ?, ?, ?)')
        .run(coupleId, email, promptId, String(note).slice(0, 1000));
      return sqlite.prepare('SELECT * FROM intimacy_sessions WHERE id=?').get(r.lastInsertRowid);
    },
    listIntimacySessions(coupleId) {
      const promptText = (id) => INTIMACY_PROMPTS.find(p => p.id === id)?.text || '';
      const promptTone = (id) => INTIMACY_PROMPTS.find(p => p.id === id)?.tone || '';
      return sqlite.prepare('SELECT * FROM intimacy_sessions WHERE couple_id=? ORDER BY id DESC').all(coupleId)
        .map(s => ({ ...s, prompt_text: promptText(s.prompt_id), tone: promptTone(s.prompt_id) }));
    },
    // Resposta do parceiro à mesma carta (prompt), se houver.
    partnerIntimacyResponse(coupleId, promptId, myEmail) {
      const row = sqlite.prepare(`SELECT * FROM intimacy_sessions WHERE couple_id=? AND prompt_id=? AND created_by!=?
        ORDER BY id DESC LIMIT 1`).get(coupleId, promptId, myEmail);
      return row || null;
    },
    deleteIntimacySession(coupleId, id) {
      return sqlite.prepare('DELETE FROM intimacy_sessions WHERE id=? AND couple_id=?').run(id, coupleId).changes > 0;
    },
    clearIntimacySessions(coupleId) {
      sqlite.prepare('DELETE FROM intimacy_sessions WHERE couple_id=?').run(coupleId);
      return true;
    },
    intimacyHasPin(coupleId) {
      const row = sqlite.prepare('SELECT intimacy_pin FROM couples WHERE id=?').get(coupleId);
      return !!row?.intimacy_pin;
    },
    setIntimacyPin(coupleId, pin) {
      const value = pin && /^\d{4}$/.test(String(pin)) ? String(pin) : null;
      sqlite.prepare('UPDATE couples SET intimacy_pin=? WHERE id=?').run(value, coupleId);
      return { hasPin: !!value };
    },
    verifyIntimacyPin(coupleId, pin) {
      const row = sqlite.prepare('SELECT intimacy_pin FROM couples WHERE id=?').get(coupleId);
      if (!row?.intimacy_pin) return true; // sem PIN, sem trava
      return String(pin) === row.intimacy_pin;
    },
    getSubscription(coupleId) {
      const row = sqlite.prepare('SELECT * FROM subscriptions WHERE couple_id=?').get(coupleId);
      if (row) return { ...row, entitlements: parseJson(row.entitlements, ['free']) };
      return { couple_id: coupleId, plan: 'free', entitlements: ['free'] };
    },
    setSubscription(coupleId, plan = 'free') {
      const entitlements = plan === 'premium' ? ['free', 'premium'] : ['free'];
      sqlite.prepare(`INSERT INTO subscriptions (couple_id, plan, entitlements, updated_at) VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(couple_id) DO UPDATE SET plan=excluded.plan, entitlements=excluded.entitlements, updated_at=datetime('now')`)
        .run(coupleId, String(plan), JSON.stringify(entitlements));
      return this.getSubscription(coupleId);
    },
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
export const db = createDb(process.env.NODE_ENV === 'test' ? ':memory:' : path.join(DATA_DIR, 'chamego.db'));
