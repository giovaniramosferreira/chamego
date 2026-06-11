import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import { getClaims, removeClaim } from '../lib/claims';

const STATUS_LABEL = {
  published: { text: 'No ar', cls: 'bg-green-100 text-green-800' },
  unpublished: { text: 'Fora do ar', cls: 'bg-ink-900/10 text-ink-600' },
};

export default function MinhasPaginas() {
  const [searchParams] = useSearchParams();
  const linkInvalido = searchParams.get('erro') === 'link-invalido';

  const [user, setUser] = useState(null);
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busySlug, setBusySlug] = useState('');
  const [confirmSlug, setConfirmSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneSaved, setPhoneSaved] = useState(false);

  const loadPages = useCallback(async () => {
    const res = await fetch('/api/my-pages');
    if (res.ok) setPages((await res.json()).pages);
  }, []);

  // Sessão + reivindicação de tokens que sobraram neste navegador
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) return;
        const me = await res.json();
        setUser(me);
        setPhone(me.phone || '');
        for (const c of getClaims()) {
          const r = await fetch(`/api/pages/${c.slug}/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claimToken: c.token }),
          });
          if (r.ok) removeClaim(c.slug);
        }
        await loadPages();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadPages]);

  async function handleLogin(me) {
    setUser(me);
    setIsLoading(true);
    await loadPages();
    setIsLoading(false);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setPages([]);
  }

  async function togglePublish(slug, action) {
    setBusySlug(slug);
    setConfirmSlug('');
    try {
      const res = await fetch(`/api/pages/${slug}/${action}`, { method: 'POST' });
      if (res.ok) await loadPages();
    } finally {
      setBusySlug('');
    }
  }

  async function savePhone() {
    const res = await fetch('/api/auth/phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    if (res.ok) {
      setPhoneSaved(true);
      setTimeout(() => setPhoneSaved(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <header className="py-5 px-5 border-b border-ink-900/10 bg-cream-50 flex items-center justify-between">
        <Link to="/" className="font-display italic text-wine-700 text-xl">Chamego</Link>
        {user && (
          <button onClick={handleLogout} className="text-sm text-ink-400 underline underline-offset-4 min-h-[44px] cursor-pointer">
            Sair
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center px-5 py-10">
        <div className="card max-w-md w-full p-8 flex flex-col gap-6">
          <div>
            <p className="eyebrow mb-2">Sua conta</p>
            <h1 className="font-display text-3xl text-ink-900">Minhas Páginas</h1>
            {user && <p className="text-sm text-ink-600 mt-1">{user.email}</p>}
          </div>

          {linkInvalido && !user && (
            <div className="card p-4 bg-wine-100 border-wine-700/20">
              <p className="text-sm text-wine-700">
                Esse link expirou ou já foi usado. Peça um novo abaixo.
              </p>
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-ink-400 animate-pulse text-center py-8">Carregando…</p>
          ) : !user ? (
            <AuthCard onLogin={handleLogin} />
          ) : (
            <>
              {pages.length === 0 ? (
                <div className="text-center py-6 flex flex-col gap-4">
                  <p className="text-sm text-ink-600">
                    Nenhuma página vinculada a esta conta ainda.
                  </p>
                  <p className="text-xs text-ink-400">
                    Criou uma página e ela não aparece aqui? Fale com a gente no WhatsApp que resolvemos.
                  </p>
                  <Link to="/criar" className="btn-primary">Criar nossa página</Link>
                </div>
              ) : (
                <ul className="flex flex-col gap-4">
                  {pages.map((p) => {
                    const badge = STATUS_LABEL[p.status] || { text: p.status, cls: 'bg-ink-900/10 text-ink-600' };
                    return (
                      <li key={p.slug} className="card p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-display text-lg text-ink-900 truncate">{p.titulo || p.slug}</p>
                            <a href={`/p/${p.slug}`} className="text-xs text-ink-400 underline underline-offset-2 truncate block">
                              /p/{p.slug}
                            </a>
                          </div>
                          <span className={`rounded-full text-[11px] font-semibold px-2 py-0.5 flex-shrink-0 ${badge.cls}`}>
                            {badge.text}
                          </span>
                        </div>

                        {confirmSlug === p.slug ? (
                          <div className="flex flex-col gap-2">
                            <p className="text-xs text-ink-600">
                              O link vai sair do ar (dá pra republicar quando quiser). Confirma?
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => togglePublish(p.slug, 'unpublish')}
                                className="btn-primary flex-1 text-sm"
                              >
                                Sim, tirar do ar
                              </button>
                              <button onClick={() => setConfirmSlug('')} className="btn-ghost flex-1 text-sm">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : p.status === 'published' ? (
                          <button
                            onClick={() => setConfirmSlug(p.slug)}
                            disabled={busySlug === p.slug}
                            className="btn-ghost text-sm self-start"
                          >
                            Tirar do ar
                          </button>
                        ) : p.status === 'unpublished' ? (
                          <button
                            onClick={() => togglePublish(p.slug, 'republish')}
                            disabled={busySlug === p.slug}
                            className="btn-primary text-sm self-start"
                          >
                            {busySlug === p.slug ? 'Republicando…' : 'Republicar'}
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Celular opcional — contato, nunca login */}
              <div className="flex flex-col gap-2 pt-4 border-t border-ink-900/10">
                <label htmlFor="phone" className="text-sm text-ink-600">
                  Celular <span className="text-ink-400">(opcional) — para contato</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    className="input-base flex-1"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <button onClick={savePhone} className="btn-ghost flex-shrink-0 text-sm">
                    {phoneSaved ? 'Salvo ✓' : 'Salvar'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-ink-400">
        © 2026 Chamego
      </footer>
    </div>
  );
}
