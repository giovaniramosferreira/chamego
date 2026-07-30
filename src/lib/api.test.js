import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// api.js é um módulo com estado (offline sim/não), então cada teste importa
// uma cópia limpa depois de montar um window/document de mentira.
async function loadApi({ visibility = 'visible' } = {}) {
  globalThis.window = new EventTarget();
  globalThis.document = {
    visibilityState: visibility,
    addEventListener() {},
    removeEventListener() {},
  };
  vi.resetModules();
  return import('./api.js');
}

function collect(mod) {
  const events = [];
  mod.onConnectionChange((online) => events.push(online));
  return events;
}

beforeEach(() => {
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  delete globalThis.window;
  delete globalThis.document;
});

describe('detecção de conexão', () => {
  it('não acusa queda quando o servidor ainda responde', async () => {
    const mod = await loadApi();
    const events = collect(mod);
    // O request morreu (aba suspensa, troca de rede), mas o servidor está de pé.
    globalThis.fetch
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockResolvedValueOnce({ ok: true });

    await expect(mod.api('/api/badges')).rejects.toThrow(/Sem conexão/);
    await vi.waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    // Sonda com URL única: cache e service worker não respondem por ela.
    expect(globalThis.fetch.mock.calls[1][0]).toMatch(/^\/api\/health\?t=\d+$/);
    expect(events).toEqual([]);
    expect(mod.isOffline()).toBe(false);
  });

  it('acusa queda quando nem o /api/health responde', async () => {
    const mod = await loadApi();
    const events = collect(mod);
    globalThis.fetch.mockRejectedValue(new TypeError('Load failed'));

    await expect(mod.api('/api/badges')).rejects.toThrow(/Sem conexão/);
    await vi.waitFor(() => expect(events).toEqual([false]));
    expect(mod.isOffline()).toBe(true);
  });

  it('some sozinha quando a rede volta', async () => {
    const mod = await loadApi();
    const events = collect(mod);
    globalThis.fetch.mockRejectedValue(new TypeError('Load failed'));
    await expect(mod.api('/api/badges')).rejects.toThrow(/Sem conexão/);
    await vi.waitFor(() => expect(mod.isOffline()).toBe(true));

    globalThis.fetch.mockResolvedValue({ ok: true });
    await mod.probeConnection();
    expect(mod.isOffline()).toBe(false);
    expect(events).toEqual([false, true]);
  });

  it('com o app no fundo, request morto não vira aviso', async () => {
    const mod = await loadApi({ visibility: 'hidden' });
    const events = collect(mod);
    globalThis.fetch.mockRejectedValue(new TypeError('Load failed'));

    await expect(mod.api('/api/badges')).rejects.toThrow(/Sem conexão/);
    // Nenhuma sondagem, nenhum aviso: quem voltar pra tela é que checa.
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(events).toEqual([]);
  });

  it('não repete o aviso a cada request que falha', async () => {
    const mod = await loadApi();
    const events = collect(mod);
    globalThis.fetch.mockRejectedValue(new TypeError('Load failed'));

    await expect(mod.api('/api/a')).rejects.toThrow();
    await vi.waitFor(() => expect(events).toEqual([false]));
    await expect(mod.api('/api/b')).rejects.toThrow();
    await vi.waitFor(() => expect(events).toEqual([false]));
  });
});
