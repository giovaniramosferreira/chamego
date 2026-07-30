// Wrapper fino de fetch: JSON, erros com mensagem do servidor.
// Falha de rede vira um evento — o app mostra uma faixa de "sem conexão"
// em vez de fingir que a lista está vazia.
const CONNECTION_EVENT = 'chamego:connection';

let offline = false;

// Só avisa quando o estado vira. Antes, todo request bem-sucedido disparava
// um evento e toda falha acusava queda — a faixa piscava à toa.
function announce(online) {
  if (offline === !online) return;
  offline = !online;
  window.dispatchEvent(new CustomEvent(CONNECTION_EVENT, { detail: { online } }));
}

export function isOffline() {
  return offline;
}

export function onConnectionChange(handler) {
  const fn = (e) => handler(e.detail.online);
  window.addEventListener(CONNECTION_EVENT, fn);
  return () => window.removeEventListener(CONNECTION_EVENT, fn);
}

// Um fetch que falhou não é prova de que a internet caiu. No iPhone, o
// request que estava no ar quando a tela apagou (ou a aba foi pro fundo)
// morre exatamente igual a uma queda de rede — e o app acusava "sem conexão"
// com a tela cheia de dados carregados. Antes de acusar, pergunta ao servidor.
let probing = null;

export function probeConnection() {
  if (probing) return probing;
  probing = fetch('/api/health', { method: 'GET', cache: 'no-store' })
    // Servidor respondeu, mesmo que com erro: a conexão existe.
    .then(() => announce(true))
    .catch(() => announce(false))
    .finally(() => { probing = null; });
  return probing;
}

// Falha de request: decide se vale acusar queda ou se foi só um request
// atropelado pelo sistema.
function reportFailure(err) {
  if (err?.name === 'AbortError') return;          // cancelado pelo próprio app
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    announce(false);                                // o sistema já sabe: é queda
    return;
  }
  // Aba no fundo: o request morreu junto com ela. Quem voltar pra tela
  // dispara a checagem de novo (ConnectionBanner cuida disso).
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  probeConnection();
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => announce(false));
  window.addEventListener('online', () => probeConnection());
}

const UPGRADE_EVENT = 'chamego:upgrade';

// Limite do plano grátis (402) não é erro de sistema: é uma conversa de venda.
// O app abre o paywall com a mensagem do servidor em vez de um alerta seco.
export function onUpgradeNeeded(handler) {
  const fn = (e) => handler(e.detail);
  window.addEventListener(UPGRADE_EVENT, fn);
  return () => window.removeEventListener(UPGRADE_EVENT, fn);
}

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Algo deu errado. Tente de novo.');
    err.status = res.status;
    if (res.status === 402 && data.upgrade) {
      err.upgrade = true;
      window.dispatchEvent(new CustomEvent(UPGRADE_EVENT, { detail: { message: data.error, limite: data.limite } }));
    }
    throw err;
  }
  return data;
}

// Erro de rede (offline, servidor fora) — diferente de erro do servidor.
function networkError(cause) {
  const err = new Error('Sem conexão agora. Verifique a internet.');
  err.offline = true;
  err.cause = cause;
  return err;
}

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    reportFailure(e);
    throw networkError(e);
  }
  announce(true);
  return parse(res);
}

// Upload multipart (fotos, avatar). Não define Content-Type: o browser
// injeta o boundary do FormData automaticamente.
export async function apiUpload(path, formData, method = 'POST') {
  let res;
  try {
    res = await fetch(path, { method, body: formData });
  } catch (e) {
    reportFailure(e);
    throw networkError(e);
  }
  announce(true);
  return parse(res);
}
