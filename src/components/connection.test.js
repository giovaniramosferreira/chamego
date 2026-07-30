// A faixa de "sem conexão" apareceu em produção com o app funcionando: o
// evento diz se está ONLINE e o componente tratava o valor como "está offline".
// Estes testes prendem a semântica do evento e o comportamento da sonda.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, onConnectionChange } from '../lib/api.js';

const eventos = [];
let parar;

beforeEach(() => {
  eventos.length = 0;
  // `window` mínimo: o wrapper de api só precisa de add/remove/dispatch.
  const alvo = new EventTarget();
  vi.stubGlobal('window', {
    addEventListener: alvo.addEventListener.bind(alvo),
    removeEventListener: alvo.removeEventListener.bind(alvo),
    dispatchEvent: alvo.dispatchEvent.bind(alvo),
  });
  vi.stubGlobal('document', { visibilityState: 'visible' });
  parar = onConnectionChange((online) => eventos.push(online));
});
afterEach(() => { parar?.(); vi.unstubAllGlobals(); });

describe('sinal de conexão', () => {
  it('chamada que dá certo anuncia ONLINE (true), não o contrário', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 })));
    await api('/api/me');
    expect(eventos).toEqual([true]);
  });

  it('erro do servidor não é queda de rede', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'nope' }), { status: 400 })));
    await expect(api('/api/me')).rejects.toThrow('nope');
    expect(eventos).toEqual([true]); // respondeu: a rede está de pé
  });

  it('falha de rede só vira "offline" depois da sonda confirmar', async () => {
    const chamadas = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      chamadas.push(String(url));
      throw new TypeError('Load failed');
    }));
    await expect(api('/api/me')).rejects.toMatchObject({ offline: true });
    expect(chamadas).toContain('/api/health'); // sondou antes de acusar
    expect(eventos).toEqual([false]);
  });

  it('requisição cancelada com o servidor de pé não acusa queda', async () => {
    // iOS cancela requisições ao mandar a aba pro fundo: falha uma, a sonda
    // responde, e o app continua dizendo que está online.
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url) === '/api/health') return new Response('{}', { status: 200 });
      throw new TypeError('Load failed');
    }));
    await expect(api('/api/me')).rejects.toMatchObject({ offline: true });
    expect(eventos).toEqual([true]);
  });

  it('com a aba escondida nem sonda: a falha é do sistema, não da rede', async () => {
    vi.stubGlobal('document', { visibilityState: 'hidden' });
    const spy = vi.fn(async () => { throw new TypeError('Load failed'); });
    vi.stubGlobal('fetch', spy);
    await expect(api('/api/me')).rejects.toMatchObject({ offline: true });
    expect(spy).toHaveBeenCalledTimes(1); // não chamou /api/health
    expect(eventos).toEqual([]);
  });
});
