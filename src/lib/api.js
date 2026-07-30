// Wrapper fino de fetch: JSON, erros com mensagem do servidor.
// Falha de rede vira um evento — o app mostra uma faixa de "sem conexão"
// em vez de fingir que a lista está vazia.
const CONNECTION_EVENT = 'chamego:connection';

function announce(online) {
  window.dispatchEvent(new CustomEvent(CONNECTION_EVENT, { detail: { online } }));
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
    announce(false);
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
    announce(false);
    throw networkError(e);
  }
  announce(true);
  return parse(res);
}
