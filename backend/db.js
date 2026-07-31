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

export function generateGiftCode() {
  let code = '';
  const bytes = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `${code.slice(0, 5)}-${code.slice(5)}`;
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
  // O que já aconteceu com uma ocorrência. A ocorrência em si não existe como
  // linha — ela é calculada a partir da regra do evento. Só o fato guardado
  // aqui é verdade: "esta parcela foi paga, neste dia, por esta pessoa, com
  // este valor". Guardar as 120 parcelas de dez anos seria lixo que ninguém
  // apaga e que quebra no dia em que a regra mudar.
  `CREATE TABLE IF NOT EXISTS event_occurrences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    event_id INTEGER NOT NULL REFERENCES events(id),
    date TEXT NOT NULL,
    done_at TEXT,
    done_by TEXT,
    amount INTEGER,
    UNIQUE (event_id, date)
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
  // Leitura do chat por pessoa — alimenta o badge de não lidas na tab bar.
  `CREATE TABLE IF NOT EXISTS message_reads (
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    user_email TEXT NOT NULL,
    last_read_id INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (couple_id, user_email)
  )`,
  // Presente: código comprado por alguém (ou emitido em parceria) e resgatado
  // por um Espaço do Casal. Vive fora de `subscriptions` porque quem paga não
  // é, necessariamente, quem usa.
  `CREATE TABLE IF NOT EXISTS gift_codes (
    code TEXT PRIMARY KEY,
    months INTEGER NOT NULL DEFAULT 12,
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','redeemed','void')),
    origin TEXT NOT NULL DEFAULT 'compra',
    buyer_email TEXT,
    buyer_name TEXT,
    message TEXT DEFAULT '',
    provider_session TEXT,
    redeemed_by_couple INTEGER,
    redeemed_by_email TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    redeemed_at TEXT
  )`,
  /* ── Receita de Hoje ──────────────────────────────────────────────────────
     Despensa do casal + histórico de giros + o que foi cozinhado. O
     `outcome` de `spins` é o dado mais importante da feature: é dele que sai a
     ponderação da roda e a prova de que ela resolve o "o que a gente come hoje". */
  `CREATE TABLE IF NOT EXISTS pantry_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    name TEXT NOT NULL,
    canonico TEXT NOT NULL,
    qtd TEXT DEFAULT '',
    cadencia_dias INTEGER,
    silenciado INTEGER NOT NULL DEFAULT 0,
    origem TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (couple_id, canonico)
  )`,
  // Histórico cru (comprou/acabou/ainda-tenho): o ritmo é derivado disso,
  // nunca escrito à mão — assim dá para recalcular quando a heurística mudar.
  `CREATE TABLE IF NOT EXISTS pantry_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES pantry_items(id),
    tipo TEXT NOT NULL CHECK (tipo IN ('comprou','acabou','ainda-tenho')),
    em TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS spins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    user_email TEXT NOT NULL,
    receita_id TEXT NOT NULL,
    contexto TEXT DEFAULT '{}',
    desfecho TEXT NOT NULL DEFAULT 'pendente'
      CHECK (desfecho IN ('pendente','cozinhou','pulou','girou_de_novo','abandonou')),
    criado_em TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS cooked_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    user_email TEXT NOT NULL,
    receita_id TEXT NOT NULL,
    nota INTEGER,
    notas TEXT DEFAULT '',
    criado_em TEXT DEFAULT (datetime('now'))
  )`,
  // Receita que veio de um link. Nasce 'pendente': é rascunho de IA e só vira
  // receita de verdade quando alguém do casal aprova. O UNIQUE na URL evita a
  // lista virar depósito do mesmo link mandado três vezes.
  `CREATE TABLE IF NOT EXISTS recipe_finds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    user_email TEXT NOT NULL,
    url TEXT NOT NULL,
    titulo TEXT NOT NULL DEFAULT '',
    dados TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pendente'
      CHECK (status IN ('pendente','salva','descartada')),
    criado_em TEXT DEFAULT (datetime('now')),
    UNIQUE (couple_id, url)
  )`,
  `CREATE TABLE IF NOT EXISTS photo_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    detectado TEXT DEFAULT '[]',
    confirmado TEXT DEFAULT '[]',
    criado_em TEXT DEFAULT (datetime('now'))
  )`,
  // Funil de venda: eventos próprios, sem depender de analytics de terceiros.
  `CREATE TABLE IF NOT EXISTS events_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    couple_id INTEGER,
    user_email TEXT,
    name TEXT NOT NULL,
    props TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  // Idempotência dos emails automáticos: uma linha por (casal, tipo, chave).
  `CREATE TABLE IF NOT EXISTS notifications_sent (
    couple_id INTEGER NOT NULL REFERENCES couples(id),
    kind TEXT NOT NULL,
    key TEXT NOT NULL,
    sent_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (couple_id, kind, key)
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

// Um evento aceita muito mais campo desde que a agenda passou a dar conta de
// conta, tarefa de casa e consulta. Normalizar num lugar só evita que criar e
// editar divirjam — foi assim que o `updateEvent` antigo esquecia metade.
const TIPOS_DE_EVENTO = ['evento', 'conta', 'casa', 'feira', 'saude', 'aniversario', 'meta'];
const FREQ_VALIDAS = ['', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'];

function camposDeEvento(d = {}) {
  const inteiroPositivo = (v) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  return {
    title: String(d.title ?? '').slice(0, 120),
    notes: String(d.notes ?? '').slice(0, 500),
    date: String(d.date ?? '').slice(0, 10),
    time: String(d.time ?? '').slice(0, 5),
    location: String(d.location ?? '').slice(0, 120),
    shared: d.shared === false || d.shared === 0 ? 0 : 1,
    kind: TIPOS_DE_EVENTO.includes(d.kind) ? d.kind : 'evento',
    recurrence: FREQ_VALIDAS.includes(d.recurrence) ? d.recurrence : '',
    until: /^\d{4}-\d{2}-\d{2}$/.test(String(d.until ?? '')) ? String(d.until) : '',
    installments: inteiroPositivo(d.installments),
    // Valor chega em centavos e sai em centavos. A interface é que põe a vírgula.
    amount: d.amount === null || d.amount === '' || d.amount === undefined ? null : inteiroPositivo(d.amount),
    payee: String(d.payee ?? '').slice(0, 60),
    estimated: d.estimated ? 1 : 0,
    assignee: String(d.assignee ?? '').slice(0, 120),
  };
}

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
    // Feed .ics do casal: token público (só leitura de eventos compartilhados).
    'ALTER TABLE couples ADD COLUMN calendar_token TEXT',
    // Cobrança: o estado da assinatura vem do provedor (Stripe), nunca do cliente.
    "ALTER TABLE subscriptions ADD COLUMN status TEXT DEFAULT 'free'",
    'ALTER TABLE subscriptions ADD COLUMN provider TEXT',
    'ALTER TABLE subscriptions ADD COLUMN customer_id TEXT',
    'ALTER TABLE subscriptions ADD COLUMN subscription_id TEXT',
    'ALTER TABLE subscriptions ADD COLUMN current_period_end TEXT',
    'ALTER TABLE subscriptions ADD COLUMN trial_ends_at TEXT',
    'ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end INTEGER DEFAULT 0',
    // Meses de presente vivem em coluna própria: assim o webhook do Stripe
    // pode reescrever o período pago sem apagar o que foi presenteado.
    'ALTER TABLE subscriptions ADD COLUMN gift_until TEXT',
    // A agenda deixou de ser só "data com título". Conta de luz, faxina de
    // terça, aniversário da sogra e consulta são o mesmo objeto com máscaras
    // diferentes — o tipo é que muda a pergunta que a tela faz.
    "ALTER TABLE events ADD COLUMN kind TEXT DEFAULT 'evento'",
    "ALTER TABLE events ADD COLUMN recurrence TEXT DEFAULT ''",
    "ALTER TABLE events ADD COLUMN until TEXT DEFAULT ''",
    'ALTER TABLE events ADD COLUMN installments INTEGER',
    // Dinheiro em centavos, inteiro: 0,1 + 0,2 em ponto flutuante não dá 0,3,
    // e conta de casal não pode ter centavo fantasma.
    'ALTER TABLE events ADD COLUMN amount INTEGER',
    "ALTER TABLE events ADD COLUMN payee TEXT DEFAULT ''",
    'ALTER TABLE events ADD COLUMN estimated INTEGER DEFAULT 0',
    "ALTER TABLE events ADD COLUMN assignee TEXT DEFAULT ''",
    // Lista com dono. É a mesma lista de sempre — o tema só decide o nome, o
    // tom e pra quem os itens novos vão parar por padrão.
    "ALTER TABLE lists ADD COLUMN theme TEXT DEFAULT ''",
    "ALTER TABLE list_items ADD COLUMN assignee TEXT DEFAULT ''",
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
    createEvent(coupleId, email, dados) {
      const c = camposDeEvento(dados);
      const r = sqlite.prepare(`INSERT INTO events
        (couple_id, created_by, title, notes, date, time, location, shared,
         kind, recurrence, until, installments, amount, payee, estimated, assignee)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(coupleId, email, c.title, c.notes, c.date, c.time, c.location, c.shared,
          c.kind, c.recurrence, c.until, c.installments, c.amount, c.payee, c.estimated, c.assignee);
      return sqlite.prepare('SELECT * FROM events WHERE id=?').get(r.lastInsertRowid);
    },
    updateEvent(coupleId, id, patch) {
      const ev = sqlite.prepare('SELECT * FROM events WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!ev) return null;
      const c = camposDeEvento({ ...ev, ...patch, shared: patch.shared ?? !!ev.shared });
      sqlite.prepare(`UPDATE events SET title=?, notes=?, date=?, time=?, location=?, shared=?,
        kind=?, recurrence=?, until=?, installments=?, amount=?, payee=?, estimated=?, assignee=? WHERE id=?`)
        .run(c.title, c.notes, c.date, c.time, c.location, c.shared,
          c.kind, c.recurrence, c.until, c.installments, c.amount, c.payee, c.estimated, c.assignee, id);
      return sqlite.prepare('SELECT * FROM events WHERE id=?').get(id);
    },
    deleteEvent(coupleId, id) {
      const tx = sqlite.transaction(() => {
        sqlite.prepare('DELETE FROM event_occurrences WHERE event_id=? AND couple_id=?').run(id, coupleId);
        return sqlite.prepare('DELETE FROM events WHERE id=? AND couple_id=?').run(id, coupleId).changes > 0;
      });
      return tx();
    },

    /* ── Ocorrências: o que já aconteceu com cada repetição ── */
    ocorrenciasFeitas(coupleId, de, ate) {
      return sqlite.prepare(`SELECT * FROM event_occurrences
        WHERE couple_id=? AND date>=? AND date<=?`).all(coupleId, de, ate);
    },
    // Marcar é criar a linha; desmarcar é apagá-la. Sem estado intermediário:
    // ou aconteceu, ou não há o que guardar.
    marcarOcorrencia(coupleId, eventId, date, { email, amount = null }) {
      sqlite.prepare(`INSERT INTO event_occurrences (couple_id, event_id, date, done_at, done_by, amount)
        VALUES (?, ?, ?, datetime('now'), ?, ?)
        ON CONFLICT (event_id, date) DO UPDATE SET done_at=datetime('now'), done_by=excluded.done_by, amount=excluded.amount`)
        .run(coupleId, eventId, date, email, amount);
      return sqlite.prepare('SELECT * FROM event_occurrences WHERE event_id=? AND date=?').get(eventId, date);
    },
    desmarcarOcorrencia(coupleId, eventId, date) {
      return sqlite.prepare('DELETE FROM event_occurrences WHERE couple_id=? AND event_id=? AND date=?')
        .run(coupleId, eventId, date).changes > 0;
    },

    /* ── Listas ── */
    // `mine` é o que faz a lista temática funcionar: sem contar o que é de
    // cada um, "pendências do maridão" seria só uma lista com outro nome.
    listLists(coupleId, email = '') {
      return sqlite.prepare(`
        SELECT l.*,
          (SELECT COUNT(*) FROM list_items i WHERE i.list_id=l.id) AS total,
          (SELECT COUNT(*) FROM list_items i WHERE i.list_id=l.id AND i.done=1) AS done,
          (SELECT COUNT(*) FROM list_items i WHERE i.list_id=l.id AND i.done=0 AND i.assignee=?) AS mine
        FROM lists l WHERE l.couple_id=? ORDER BY l.created_at DESC`).all(email, coupleId);
    },
    getList(coupleId, id) {
      const list = sqlite.prepare('SELECT * FROM lists WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!list) return null;
      list.items = sqlite.prepare('SELECT * FROM list_items WHERE list_id=? ORDER BY done, position, id').all(id);
      return list;
    },
    createList(coupleId, email, { title, icon = 'list', kind = 'shared', theme = '' }) {
      const k = ['shared', 'individual', 'wishlist'].includes(kind) ? kind : 'shared';
      const r = sqlite.prepare('INSERT INTO lists (couple_id, created_by, title, icon, kind, theme) VALUES (?, ?, ?, ?, ?, ?)')
        .run(coupleId, email, String(title).slice(0, 80), String(icon).slice(0, 20), k, String(theme || '').slice(0, 30));
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
    addItem(coupleId, listId, text, assignee = '') {
      const list = sqlite.prepare('SELECT 1 FROM lists WHERE id=? AND couple_id=?').get(listId, coupleId);
      if (!list) return null;
      const pos = (sqlite.prepare('SELECT MAX(position) m FROM list_items WHERE list_id=?').get(listId)?.m || 0) + 1;
      sqlite.prepare('INSERT INTO list_items (list_id, text, position, assignee) VALUES (?, ?, ?, ?)')
        .run(listId, String(text).slice(0, 200), pos, String(assignee || '').slice(0, 120));
      return this.getList(coupleId, listId);
    },
    updateItem(coupleId, itemId, { text, done, assignee }) {
      const row = sqlite.prepare(`SELECT li.id, li.list_id FROM list_items li
        JOIN lists l ON l.id=li.list_id WHERE li.id=? AND l.couple_id=?`).get(itemId, coupleId);
      if (!row) return null;
      if (text !== undefined) sqlite.prepare('UPDATE list_items SET text=? WHERE id=?').run(String(text).slice(0, 200), itemId);
      if (done !== undefined) sqlite.prepare('UPDATE list_items SET done=? WHERE id=?').run(done ? 1 : 0, itemId);
      // String vazia é "de ninguém em especial" — apagar o dono precisa ser
      // possível, então `''` é valor válido e não o mesmo que não informado.
      if (assignee !== undefined) sqlite.prepare('UPDATE list_items SET assignee=? WHERE id=?').run(String(assignee || '').slice(0, 120), itemId);
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
      const stored = parseJson(row?.reminder_prefs, {});
      return {
        ...stored,
        frequency: stored.frequency || 'equilibrio',
        types: { checkin: true, dates: true, goals: true, routine: false, ...(stored.types || {}) },
        // Emails automáticos: véspera de evento e resumo de domingo.
        email: { eventEve: true, weekly: true, ...(stored.email || {}) },
      };
    },
    setReminderPrefs(coupleId, patch) {
      const cur = this.reminderPrefs(coupleId);
      const next = {
        frequency: patch.frequency || cur.frequency,
        types: { ...cur.types, ...(patch.types || {}) },
        email: { ...cur.email, ...(patch.email || {}) },
      };
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
    /* ── Receita de Hoje: despensa, giros e cozinhadas ────────────────────── */
    listPantry(coupleId) {
      const itens = sqlite.prepare('SELECT * FROM pantry_items WHERE couple_id=? ORDER BY canonico').all(coupleId);
      for (const it of itens) {
        it.eventos = sqlite.prepare('SELECT tipo, em FROM pantry_events WHERE item_id=? ORDER BY em, id').all(it.id);
        it.silenciado = !!it.silenciado;
      }
      return itens;
    },
    addPantryItem(coupleId, { name, canonico, qtd = '', origem = 'manual', comprouAgora = true }) {
      const tx = sqlite.transaction(() => {
        sqlite.prepare(`INSERT INTO pantry_items (couple_id, name, canonico, qtd, origem)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(couple_id, canonico) DO UPDATE SET
            name=excluded.name, qtd=excluded.qtd, silenciado=0`)
          .run(coupleId, String(name).slice(0, 60), canonico, String(qtd).slice(0, 30), origem);
        const id = sqlite.prepare('SELECT id FROM pantry_items WHERE couple_id=? AND canonico=?').get(coupleId, canonico).id;
        // Entrar na despensa é, por padrão, um "comprou": é o evento que
        // começa a contar o ritmo daquele item.
        if (comprouAgora) sqlite.prepare(`INSERT INTO pantry_events (item_id, tipo) VALUES (?, 'comprou')`).run(id);
        return id;
      });
      const id = tx();
      return this.listPantry(coupleId).find((i) => i.id === id);
    },
    pantryItem(coupleId, id) {
      const it = sqlite.prepare('SELECT * FROM pantry_items WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!it) return null;
      it.eventos = sqlite.prepare('SELECT tipo, em FROM pantry_events WHERE item_id=? ORDER BY em, id').all(it.id);
      it.silenciado = !!it.silenciado;
      return it;
    },
    // Feedback da lista: registra o evento e guarda a cadência recalculada.
    pantryFeedback(coupleId, id, tipo, cadenciaDias) {
      const it = this.pantryItem(coupleId, id);
      if (!it) return null;
      if (tipo === 'nao-compro-mais') {
        sqlite.prepare('UPDATE pantry_items SET silenciado=1 WHERE id=?').run(id);
        return this.pantryItem(coupleId, id);
      }
      sqlite.prepare('INSERT INTO pantry_events (item_id, tipo) VALUES (?, ?)').run(id, tipo);
      if (cadenciaDias) sqlite.prepare('UPDATE pantry_items SET cadencia_dias=? WHERE id=?').run(cadenciaDias, id);
      return this.pantryItem(coupleId, id);
    },
    deletePantryItem(coupleId, id) {
      const it = sqlite.prepare('SELECT 1 FROM pantry_items WHERE id=? AND couple_id=?').get(id, coupleId);
      if (!it) return false;
      const tx = sqlite.transaction(() => {
        sqlite.prepare('DELETE FROM pantry_events WHERE item_id=?').run(id);
        sqlite.prepare('DELETE FROM pantry_items WHERE id=?').run(id);
      });
      tx();
      return true;
    },

    createSpin(coupleId, email, { receitaId, contexto }) {
      const r = sqlite.prepare('INSERT INTO spins (couple_id, user_email, receita_id, contexto) VALUES (?, ?, ?, ?)')
        .run(coupleId, email, receitaId, JSON.stringify(contexto || {}).slice(0, 4000));
      return sqlite.prepare('SELECT * FROM spins WHERE id=?').get(r.lastInsertRowid);
    },
    setSpinOutcome(coupleId, id, desfecho) {
      const ok = sqlite.prepare(`UPDATE spins SET desfecho=? WHERE id=? AND couple_id=? AND desfecho='pendente'`)
        .run(desfecho, id, coupleId).changes > 0;
      return ok ? sqlite.prepare('SELECT * FROM spins WHERE id=?').get(id) : null;
    },
    listSpins(coupleId, limite = 60) {
      return sqlite.prepare('SELECT * FROM spins WHERE couple_id=? ORDER BY id DESC LIMIT ?').all(coupleId, limite);
    },
    spinsHoje(coupleId, email) {
      return sqlite.prepare(`SELECT COUNT(*) c FROM spins
        WHERE couple_id=? AND user_email=? AND date(criado_em)=date('now','localtime')`).get(coupleId, email).c;
    },
    // Sugestão que o par mandou e ainda está de pé — vira convite no Início.
    spinPendenteDoPar(coupleId, email) {
      return sqlite.prepare(`SELECT * FROM spins WHERE couple_id=? AND user_email!=? AND desfecho='pendente'
        AND criado_em >= datetime('now','-6 hours') ORDER BY id DESC LIMIT 1`).get(coupleId, email) || null;
    },
    /* Receitinhas achadas: rascunhos vindos de link. */
    createFind(coupleId, email, { url, receita }) {
      const existente = sqlite.prepare('SELECT * FROM recipe_finds WHERE couple_id=? AND url=?').get(coupleId, url);
      if (existente) return { find: this._find(existente), repetido: true };
      const r = sqlite.prepare('INSERT INTO recipe_finds (couple_id, user_email, url, titulo, dados) VALUES (?, ?, ?, ?, ?)')
        .run(coupleId, email, url, receita.titulo, JSON.stringify(receita));
      return { find: this.find(coupleId, Number(r.lastInsertRowid)), repetido: false };
    },
    _find(linha) {
      if (!linha) return null;
      let dados = {};
      try { dados = JSON.parse(linha.dados); } catch { /* rascunho corrompido = vazio */ }
      // O id da receita carrega a origem: 'casal-7' nunca colide com o catálogo
      // e diz de onde ela veio sem precisar de outra coluna.
      return { ...linha, dados, receita: { ...dados, id: `casal-${linha.id}`, origem: 'casal' } };
    },
    find(coupleId, id) {
      return this._find(sqlite.prepare('SELECT * FROM recipe_finds WHERE couple_id=? AND id=?').get(coupleId, id));
    },
    // Pendentes primeiro: a lista existe pra ser curada, não pra ser arquivo.
    listFinds(coupleId, status = null) {
      const linhas = status
        ? sqlite.prepare('SELECT * FROM recipe_finds WHERE couple_id=? AND status=? ORDER BY id DESC').all(coupleId, status)
        : sqlite.prepare(`SELECT * FROM recipe_finds WHERE couple_id=? AND status!='descartada'
            ORDER BY (status='pendente') DESC, id DESC`).all(coupleId);
      return linhas.map((l) => this._find(l));
    },
    setFindStatus(coupleId, id, status) {
      const ok = sqlite.prepare('UPDATE recipe_finds SET status=? WHERE id=? AND couple_id=?')
        .run(status, id, coupleId).changes > 0;
      return ok ? this.find(coupleId, id) : null;
    },
    deleteFind(coupleId, id) {
      return sqlite.prepare('DELETE FROM recipe_finds WHERE id=? AND couple_id=?').run(id, coupleId).changes > 0;
    },
    findsHoje(coupleId) {
      return sqlite.prepare(`SELECT COUNT(*) c FROM recipe_finds
        WHERE couple_id=? AND date(criado_em)=date('now','localtime')`).get(coupleId).c;
    },
    // As receitas aprovadas do casal, no formato do catálogo — é isso que
    // entra na roda junto com as nossas.
    receitasDoCasal(coupleId) {
      return this.listFinds(coupleId, 'salva').map((f) => f.receita);
    },

    photoSessionsHoje(coupleId) {
      return sqlite.prepare(`SELECT COUNT(*) c FROM photo_sessions
        WHERE couple_id=? AND date(criado_em)=date('now','localtime')`).get(coupleId).c;
    },
    createPhotoSession(coupleId, detectado) {
      const r = sqlite.prepare('INSERT INTO photo_sessions (couple_id, detectado) VALUES (?, ?)')
        .run(coupleId, JSON.stringify(detectado || []));
      return sqlite.prepare('SELECT * FROM photo_sessions WHERE id=?').get(r.lastInsertRowid);
    },
    // O que a pessoa corrigiu é dado de ajuste do prompt de visão.
    confirmPhotoSession(coupleId, id, confirmado) {
      sqlite.prepare('UPDATE photo_sessions SET confirmado=? WHERE id=? AND couple_id=?')
        .run(JSON.stringify(confirmado || []), id, coupleId);
    },
    registrarCozinhada(coupleId, email, { receitaId, nota, notas }) {
      const r = sqlite.prepare('INSERT INTO cooked_log (couple_id, user_email, receita_id, nota, notas) VALUES (?, ?, ?, ?, ?)')
        .run(coupleId, email, receitaId, nota ? Number(nota) : null, String(notas || '').slice(0, 500));
      return sqlite.prepare('SELECT * FROM cooked_log WHERE id=?').get(r.lastInsertRowid);
    },
    cozinhadas(coupleId, limite = 30) {
      return sqlite.prepare('SELECT * FROM cooked_log WHERE couple_id=? ORDER BY id DESC LIMIT ?').all(coupleId, limite);
    },
    // Ritmo de cozinha: quantas nos últimos 7 dias e a média semanal do casal.
    ritmoDeCozinha(coupleId) {
      const ultimos7 = sqlite.prepare(`SELECT COUNT(*) c FROM cooked_log
        WHERE couple_id=? AND criado_em >= datetime('now','-7 days')`).get(coupleId).c;
      const total = sqlite.prepare('SELECT COUNT(*) c FROM cooked_log WHERE couple_id=?').get(coupleId).c;
      const primeira = sqlite.prepare('SELECT MIN(criado_em) m FROM cooked_log WHERE couple_id=?').get(coupleId)?.m;
      const semanas = primeira ? Math.max(1, (Date.now() - new Date(primeira).getTime()) / (7 * 86_400_000)) : 1;
      return { ultimos7, mediaSemanal: total / semanas };
    },
    // Métrica-norte da feature: sessões que terminam em "cozinhamos".
    taxaDeCozinhada(coupleId) {
      const total = sqlite.prepare(`SELECT COUNT(*) c FROM spins WHERE couple_id=? AND desfecho!='pendente'`).get(coupleId).c;
      const cozinhou = sqlite.prepare(`SELECT COUNT(*) c FROM spins WHERE couple_id=? AND desfecho='cozinhou'`).get(coupleId).c;
      return { total, cozinhou, taxa: total ? cozinhou / total : 0 };
    },

    /* ── Chat: leitura e não lidas (badge da tab bar) ── */
    markMessagesRead(coupleId, email, lastId) {
      const last = Number(lastId) || sqlite.prepare('SELECT MAX(id) m FROM messages WHERE couple_id=?').get(coupleId)?.m || 0;
      sqlite.prepare(`INSERT INTO message_reads (couple_id, user_email, last_read_id) VALUES (?, ?, ?)
        ON CONFLICT(couple_id, user_email) DO UPDATE SET last_read_id=MAX(last_read_id, excluded.last_read_id)`)
        .run(coupleId, email, last);
      return this.unreadCount(coupleId, email);
    },
    unreadCount(coupleId, email) {
      const read = sqlite.prepare('SELECT last_read_id FROM message_reads WHERE couple_id=? AND user_email=?').get(coupleId, email)?.last_read_id || 0;
      return sqlite.prepare('SELECT COUNT(*) c FROM messages WHERE couple_id=? AND sender_email!=? AND id>?').get(coupleId, email, read).c;
    },

    /* ── Busca global (Agenda, Listas, Momentos, Planos, Datas) ── */
    search(coupleId, term, email) {
      const needle = String(term || '').trim().slice(0, 60).toLowerCase();
      if (!needle) return [];
      const hit = (...fields) => fields.some((f) => String(f || '').toLowerCase().includes(needle));
      const out = [];
      for (const e of sqlite.prepare('SELECT * FROM events WHERE couple_id=? ORDER BY date').all(coupleId)) {
        if (hit(e.title, e.location, e.notes)) out.push({ type: 'evento', id: e.id, title: e.title, sub: e.date, icon: 'calendar', to: '/app/agenda' });
      }
      for (const l of sqlite.prepare('SELECT * FROM lists WHERE couple_id=?').all(coupleId)) {
        if (hit(l.title)) out.push({ type: 'lista', id: l.id, title: l.title, sub: 'Lista', icon: 'list', to: `/app/listas/${l.id}` });
      }
      for (const i of sqlite.prepare('SELECT i.*, l.title AS list_title FROM list_items i JOIN lists l ON l.id=i.list_id WHERE l.couple_id=?').all(coupleId)) {
        if (hit(i.text)) out.push({ type: 'item', id: i.id, title: i.text, sub: `em ${i.list_title}`, icon: 'check', to: `/app/listas/${i.list_id}` });
      }
      for (const m of sqlite.prepare('SELECT * FROM moments WHERE couple_id=? ORDER BY date DESC').all(coupleId)) {
        if (hit(m.text)) out.push({ type: 'momento', id: m.id, title: m.text.slice(0, 60), sub: m.date, icon: 'image', to: '/app/momentos' });
      }
      for (const p of sqlite.prepare('SELECT * FROM plans WHERE couple_id=?').all(coupleId)) {
        if (hit(p.title)) out.push({ type: 'plano', id: p.id, title: p.title, sub: 'Plano', icon: 'target', to: `/app/planos/${p.id}` });
      }
      for (const g of this.listGifts(coupleId, email)) {
        if (hit(g.title)) out.push({ type: 'data', id: g.id, title: g.title, sub: g.date || 'Wishlist', icon: 'gift', to: `/app/presentes/${g.id}` });
      }
      return out.slice(0, 20);
    },

    /* ── Primeiro dia: espaço nasce com conteúdo, nunca vazio ── */
    seedCouple(coupleId, email, goal, milestoneDate) {
      const created = { lists: 0, events: 0, plans: 0 };
      // Aniversário do marco: próxima ocorrência da data escolhida no Começar.
      if (/^\d{4}-\d{2}-\d{2}$/.test(milestoneDate || '')) {
        const today = new Date();
        const [, mm, dd] = milestoneDate.split('-');
        let year = today.getFullYear();
        if (`${year}-${mm}-${dd}` < today.toISOString().slice(0, 10)) year += 1;
        this.createEvent(coupleId, email, { title: 'Nosso aniversário 💛', date: `${year}-${mm}-${dd}`, notes: 'Criado do contador de dias — edite à vontade.' });
        created.events++;
      }
      const seeds = {
        rotina: () => {
          this.addItem(coupleId, this.createList(coupleId, email, { title: 'Mercado', icon: 'shopping' }).id, 'Café');
          const casa = this.createList(coupleId, email, { title: 'Casa da gente', icon: 'home' });
          this.addItem(coupleId, casa.id, 'Pagar as contas do mês');
          this.addItem(coupleId, casa.id, 'Faxina do fim de semana');
          created.lists += 2;
        },
        conexao: () => {
          const l = this.createList(coupleId, email, { title: 'Pra fazer juntos', icon: 'together' });
          this.addItem(coupleId, l.id, 'Cozinhar uma receita nova');
          this.addItem(coupleId, l.id, 'Maratonar aquela série');
          created.lists++;
        },
        datas: () => {
          const l = this.createList(coupleId, email, { title: 'Ideias de presente', icon: 'gift', kind: 'wishlist' });
          this.addItem(coupleId, l.id, 'Anotar o que ele(a) comentou que queria');
          created.lists++;
        },
        planejar: () => {
          this.createPlan(coupleId, email, { title: 'Nossa próxima viagem', category: 'viagem', steps: ['Escolher o destino', 'Definir as datas', 'Guardar um valor por mês'] });
          created.plans++;
        },
      };
      (seeds[goal] || seeds.rotina)();
      return created;
    },

    /* ── Feed de calendário (.ics) ── */
    calendarToken(coupleId) {
      const row = sqlite.prepare('SELECT calendar_token FROM couples WHERE id=?').get(coupleId);
      if (row?.calendar_token) return row.calendar_token;
      const token = crypto.randomBytes(18).toString('base64url');
      sqlite.prepare('UPDATE couples SET calendar_token=? WHERE id=?').run(token, coupleId);
      return token;
    },
    coupleByCalendarToken(token) {
      if (!token) return null;
      return sqlite.prepare('SELECT * FROM couples WHERE calendar_token=?').get(String(token)) || null;
    },

    /* ── Emails automáticos ── */
    allCouples() {
      return sqlite.prepare('SELECT * FROM couples').all().map((c) => ({
        ...c,
        members: sqlite.prepare(`SELECT cm.user_email AS email, u.name FROM couple_members cm
          JOIN users u ON u.email=cm.user_email WHERE cm.couple_id=?`).all(c.id),
      }));
    },
    eventsOnDate(coupleId, date) {
      return sqlite.prepare(`SELECT * FROM events WHERE couple_id=? AND date=? AND shared=1
        ORDER BY CASE WHEN time='' THEN 1 ELSE 0 END, time`).all(coupleId, date);
    },
    wasNotified(coupleId, kind, key) {
      return !!sqlite.prepare('SELECT 1 FROM notifications_sent WHERE couple_id=? AND kind=? AND key=?').get(coupleId, kind, key);
    },
    markNotified(coupleId, kind, key) {
      sqlite.prepare('INSERT OR IGNORE INTO notifications_sent (couple_id, kind, key) VALUES (?, ?, ?)').run(coupleId, kind, key);
    },

    /* ── Dados do casal: exportar, sair, excluir ── */
    exportCouple(coupleId) {
      const all = (sql) => sqlite.prepare(sql).all(coupleId);
      const lists = all('SELECT * FROM lists WHERE couple_id=?').map((l) => ({
        ...l, items: sqlite.prepare('SELECT * FROM list_items WHERE list_id=? ORDER BY position, id').all(l.id),
      }));
      const plans = all('SELECT * FROM plans WHERE couple_id=?').map((p) => ({
        ...p,
        steps: sqlite.prepare('SELECT * FROM plan_steps WHERE plan_id=? ORDER BY position, id').all(p.id),
        attachments: sqlite.prepare('SELECT url FROM plan_attachments WHERE plan_id=?').all(p.id).map((a) => a.url),
      }));
      return {
        exportedAt: new Date().toISOString(),
        couple: sqlite.prepare('SELECT id, name, milestone_date, milestone_label, created_at FROM couples WHERE id=?').get(coupleId),
        members: sqlite.prepare('SELECT cm.user_email, cm.role, cm.joined_at, u.name FROM couple_members cm JOIN users u ON u.email=cm.user_email WHERE cm.couple_id=?').all(coupleId),
        events: all('SELECT * FROM events WHERE couple_id=?'),
        lists,
        moments: this.listMoments(coupleId),
        checkins: all('SELECT * FROM checkins WHERE couple_id=?'),
        goals: all('SELECT * FROM goals WHERE couple_id=?'),
        messages: all('SELECT * FROM messages WHERE couple_id=?'),
        plans,
        gifts: this.listGifts(coupleId),
        timeCapsules: all('SELECT * FROM time_capsules WHERE couple_id=?'),
        albums: all('SELECT * FROM albums WHERE couple_id=?'),
        intimacySessions: all('SELECT * FROM intimacy_sessions WHERE couple_id=?'),
        savedDateIdeas: all('SELECT * FROM saved_date_ideas WHERE couple_id=?'),
      };
    },
    // Sair do espaço: a pessoa some do casal, o conteúdo fica com quem ficou.
    // Se era a última, o espaço inteiro é apagado (não sobra órfão).
    leaveCouple(coupleId, email) {
      const member = sqlite.prepare('SELECT 1 FROM couple_members WHERE couple_id=? AND user_email=?').get(coupleId, email);
      if (!member) return false;
      sqlite.prepare('DELETE FROM couple_members WHERE couple_id=? AND user_email=?').run(coupleId, email);
      const left = sqlite.prepare('SELECT COUNT(*) c FROM couple_members WHERE couple_id=?').get(coupleId).c;
      if (left === 0) this.deleteCouple(coupleId);
      return true;
    },
    deleteCouple(coupleId) {
      const tx = sqlite.transaction(() => {
        sqlite.prepare('DELETE FROM list_items WHERE list_id IN (SELECT id FROM lists WHERE couple_id=?)').run(coupleId);
        sqlite.prepare('DELETE FROM moment_photos WHERE moment_id IN (SELECT id FROM moments WHERE couple_id=?)').run(coupleId);
        sqlite.prepare('DELETE FROM plan_steps WHERE plan_id IN (SELECT id FROM plans WHERE couple_id=?)').run(coupleId);
        sqlite.prepare('DELETE FROM plan_attachments WHERE plan_id IN (SELECT id FROM plans WHERE couple_id=?)').run(coupleId);
        sqlite.prepare('DELETE FROM pantry_events WHERE item_id IN (SELECT id FROM pantry_items WHERE couple_id=?)').run(coupleId);
        sqlite.prepare('DELETE FROM pantry_items WHERE couple_id=?').run(coupleId);
        for (const t of ['events', 'lists', 'moments', 'checkins', 'goals', 'messages', 'plans', 'gifts',
          'saved_date_ideas', 'quiz_answers', 'time_capsules', 'albums', 'intimacy_sessions', 'subscriptions',
          'message_reads', 'notifications_sent', 'events_log', 'spins', 'cooked_log',
          'photo_sessions', 'invites', 'couple_members']) {
          sqlite.prepare(`DELETE FROM ${t} WHERE couple_id=?`).run(coupleId);
        }
        sqlite.prepare('DELETE FROM couples WHERE id=?').run(coupleId);
      });
      tx();
      return true;
    },

    /* ── Assinatura ──────────────────────────────────────────────────────
       Regra: o direito de uso é *derivado* do estado guardado (teste em
       andamento, período pago vigente). Nada de entitlement escrito à mão
       pelo cliente — quem escreve é o webhook do provedor. */
    getSubscription(coupleId) {
      const row = sqlite.prepare('SELECT * FROM subscriptions WHERE couple_id=?').get(coupleId);
      const now = new Date().toISOString();
      const base = {
        couple_id: coupleId,
        plan: 'free',
        status: 'free',
        provider: null,
        customer_id: null,
        subscription_id: null,
        current_period_end: null,
        trial_ends_at: null,
        cancel_at_period_end: 0,
        gift_until: null,
        ...(row || {}),
      };
      const trialing = !!base.trial_ends_at && base.trial_ends_at > now;
      // Teste vale só pela data dele — status 'trialing' vencido não libera nada.
      // "canceled" continua valendo até o fim do período já pago.
      const paid = ['active', 'past_due', 'canceled'].includes(base.status)
        && (!base.current_period_end || base.current_period_end > now);
      const gifted = !!base.gift_until && base.gift_until > now;
      const premium = trialing || paid || gifted;
      return {
        ...base,
        plan: premium ? 'premium' : 'free',
        trialing,
        gifted,
        entitlements: premium ? ['free', 'premium'] : ['free'],
      };
    },
    // Escrita vinda do provedor de pagamento (webhook) ou do início do teste.
    saveSubscription(coupleId, patch = {}) {
      const cur = sqlite.prepare('SELECT * FROM subscriptions WHERE couple_id=?').get(coupleId) || {};
      const next = {
        status: patch.status ?? cur.status ?? 'free',
        provider: patch.provider ?? cur.provider ?? null,
        customer_id: patch.customerId ?? cur.customer_id ?? null,
        subscription_id: patch.subscriptionId ?? cur.subscription_id ?? null,
        current_period_end: patch.currentPeriodEnd ?? cur.current_period_end ?? null,
        trial_ends_at: patch.trialEndsAt ?? cur.trial_ends_at ?? null,
        gift_until: patch.giftUntil ?? cur.gift_until ?? null,
        cancel_at_period_end: (patch.cancelAtPeriodEnd ?? cur.cancel_at_period_end) ? 1 : 0,
      };
      sqlite.prepare(`INSERT INTO subscriptions
          (couple_id, plan, entitlements, status, provider, customer_id, subscription_id, current_period_end, trial_ends_at, cancel_at_period_end, gift_until, updated_at)
        VALUES (?, 'free', '["free"]', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(couple_id) DO UPDATE SET
          status=excluded.status, provider=excluded.provider, customer_id=excluded.customer_id,
          subscription_id=excluded.subscription_id, current_period_end=excluded.current_period_end,
          trial_ends_at=excluded.trial_ends_at, cancel_at_period_end=excluded.cancel_at_period_end,
          gift_until=excluded.gift_until, updated_at=datetime('now')`)
        .run(coupleId, next.status, next.provider, next.customer_id, next.subscription_id,
          next.current_period_end, next.trial_ends_at, next.cancel_at_period_end, next.gift_until);
      return this.getSubscription(coupleId);
    },
    coupleByCustomerId(customerId) {
      return sqlite.prepare('SELECT couple_id FROM subscriptions WHERE customer_id=?').get(customerId)?.couple_id || null;
    },
    // Teste grátis: uma vez por espaço, sem cartão.
    startTrial(coupleId, days = 14) {
      const row = sqlite.prepare('SELECT trial_ends_at, status FROM subscriptions WHERE couple_id=?').get(coupleId);
      if (row?.trial_ends_at) return { started: false, reason: 'already_used', subscription: this.getSubscription(coupleId) };
      const ends = new Date(Date.now() + days * 86_400_000).toISOString();
      this.saveSubscription(coupleId, { status: 'trialing', provider: 'trial', trialEndsAt: ends });
      return { started: true, subscription: this.getSubscription(coupleId) };
    },

    /* ── Presente: quem paga não é quem usa ────────────────────────────────
       O código é criado quando o pagamento confirma (ou pela operação, em
       parcerias) e resgatado por um Espaço do Casal, que ganha N meses. */
    createGiftCode({ months = 12, origin = 'compra', buyerEmail = null, buyerName = null, message = '', session = null } = {}) {
      const m = Math.min(24, Math.max(1, Number(months) || 12));
      for (let i = 0; i < 5; i++) {
        const code = generateGiftCode();
        try {
          sqlite.prepare(`INSERT INTO gift_codes (code, months, origin, buyer_email, buyer_name, message, provider_session)
            VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(code, m, String(origin).slice(0, 20), buyerEmail, buyerName ? String(buyerName).slice(0, 80) : null,
              String(message).slice(0, 300), session);
          return this.getGiftCode(code);
        } catch { /* colisão de código, tenta outro */ }
      }
      throw new Error('Não conseguimos gerar o código do presente');
    },
    getGiftCode(code) {
      const clean = String(code || '').trim().toUpperCase();
      return sqlite.prepare('SELECT * FROM gift_codes WHERE code=?').get(clean)
        || sqlite.prepare('SELECT * FROM gift_codes WHERE REPLACE(code, \'-\', \'\')=?').get(clean.replace(/-/g, ''))
        || null;
    },
    giftBySession(sessionId) {
      return sqlite.prepare('SELECT * FROM gift_codes WHERE provider_session=?').get(sessionId) || null;
    },
    // Soma os meses ao crédito existente (presentes se acumulam) e nunca
    // encurta o que já estava valendo.
    redeemGiftCode(code, coupleId, email) {
      const gift = this.getGiftCode(code);
      if (!gift) return { ok: false, reason: 'not_found' };
      if (gift.status !== 'paid') return { ok: false, reason: gift.status === 'redeemed' ? 'already_redeemed' : 'void' };

      const sub = this.getSubscription(coupleId);
      const now = new Date();
      const base = sub.gift_until && new Date(sub.gift_until) > now ? new Date(sub.gift_until) : now;
      const until = new Date(base);
      until.setMonth(until.getMonth() + gift.months);

      const tx = sqlite.transaction(() => {
        sqlite.prepare(`UPDATE gift_codes SET status='redeemed', redeemed_by_couple=?, redeemed_by_email=?,
          redeemed_at=datetime('now') WHERE code=? AND status='paid'`).run(coupleId, email, gift.code);
        this.saveSubscription(coupleId, { giftUntil: until.toISOString() });
      });
      tx();
      return { ok: true, months: gift.months, until: until.toISOString(), subscription: this.getSubscription(coupleId) };
    },

    /* ── Uso vs limites do plano grátis ── */
    usage(coupleId) {
      const count = (sql) => sqlite.prepare(sql).get(coupleId).c;
      return {
        photos: count(`SELECT COUNT(*) c FROM moment_photos p
          JOIN moments m ON m.id=p.moment_id WHERE m.couple_id=?`),
        capsules: count('SELECT COUNT(*) c FROM time_capsules WHERE couple_id=?'),
        albums: count('SELECT COUNT(*) c FROM albums WHERE couple_id=?'),
      };
    },

    /* ── Funil (eventos próprios, sem analytics de terceiros) ── */
    track(name, { coupleId = null, email = null, props = {} } = {}) {
      sqlite.prepare('INSERT INTO events_log (couple_id, user_email, name, props) VALUES (?, ?, ?, ?)')
        .run(coupleId, email, String(name).slice(0, 60), JSON.stringify(props).slice(0, 1000));
    },
    funnel(days = 30) {
      const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 19).replace('T', ' ');
      const byName = sqlite.prepare(`SELECT name, COUNT(*) c, COUNT(DISTINCT couple_id) casais
        FROM events_log WHERE created_at >= ? GROUP BY name ORDER BY c DESC`).all(since);
      const espacos = sqlite.prepare('SELECT COUNT(*) c FROM couples').get().c;
      const conectados = sqlite.prepare(`SELECT COUNT(*) c FROM (
        SELECT couple_id FROM couple_members GROUP BY couple_id HAVING COUNT(*) > 1)`).get().c;
      const assinantes = sqlite.prepare(`SELECT COUNT(*) c FROM subscriptions
        WHERE status IN ('active','past_due') AND (current_period_end IS NULL OR current_period_end > datetime('now'))`).get().c;
      const emTeste = sqlite.prepare(`SELECT COUNT(*) c FROM subscriptions
        WHERE trial_ends_at > datetime('now') AND status='trialing'`).get().c;
      return { dias: days, espacos, conectados, emTeste, assinantes, eventos: byName };
    },
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
export const db = createDb(process.env.NODE_ENV === 'test' ? ':memory:' : path.join(DATA_DIR, 'chamego.db'));
