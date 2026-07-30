// Wrapper fino de fetch: JSON, erros com mensagem do servidor.
// Falha de rede vira um evento — o app mostra uma faixa de "sem conexão"
// em vez de fingir que a lista está vazia.
const CONNECTION_EVENT = 'chamego:connection';

function announce(online) {
  window.dispatchEvent(new CustomEvent(CONNECTION_EVENT, { detail: { online } }));
}

// Um fetch pode falhar sem a internet ter caído: o iOS cancela requisições
// quando a aba vai pro fundo ou volta do cache, e isso chegava aqui como
// "sem conexão". Antes de acusar queda, confirmamos com uma sonda barata.
let sonda = null;
function servidorResponde() {
  if (!sonda) {
    sonda = fetch('/api/health', { cache: 'no-store' })
      .then((r) => r.ok)
      .catch(() => false)
      // Solta assim que responde: guardar o resultado faria a próxima falha
      // ser julgada por uma sonda velha.
      .finally(() => { sonda = null; });
  }
  return sonda;
}

export function onConnectionChange(handler) {
  const fn = (e) => handler(e.detail.online);
  window.addEventListener(CONNECTION_EVENT, fn);
  return () => window.removeEventListener(CONNECTION_EVENT, fn);
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
    await avisarSeCaiu();
    throw networkError(e);
  }
  announce(true);
  return parse(res);
}

// Só acusa queda depois de confirmar. Com a aba escondida nem tenta: a
// requisição foi cancelada pelo sistema, não pela rede.
async function avisarSeCaiu() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  announce(await servidorResponde());
}

// Upload multipart (fotos, avatar). Não define Content-Type: o browser
// injeta o boundary do FormData automaticamente.
export async function apiUpload(path, formData, method = 'POST') {
  let res;
  try {
    res = await fetch(path, { method, body: formData });
  } catch (e) {
    await avisarSeCaiu();
    throw networkError(e);
  }
  announce(true);
  return parse(res);
}
