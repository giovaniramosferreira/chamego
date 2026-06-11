import { useState, useEffect, useRef } from 'react';
import { getClaims, removeClaim } from '../lib/claims';

/**
 * Login do Criador: botão Google + link mágico por email.
 * Os tokens de Reivindicação do navegador viajam junto do login,
 * então as páginas criadas aqui são vinculadas automaticamente.
 */
export default function AuthCard({ onLogin }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);

  // Google Identity Services
  useEffect(() => {
    let cancelled = false;

    async function initGoogle() {
      const config = await fetch('/api/config').then(r => r.json()).catch(() => null);
      if (cancelled || !config?.googleClientId) return;

      if (!document.getElementById('gsi-script')) {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.id = 'gsi-script';
        s.async = true;
        document.head.appendChild(s);
        await new Promise(resolve => { s.onload = resolve; });
      } else if (!window.google?.accounts) {
        await new Promise(resolve => {
          document.getElementById('gsi-script').addEventListener('load', resolve, { once: true });
        });
      }
      if (cancelled || !window.google?.accounts || !googleBtnRef.current) return;

      window.google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: async ({ credential }) => {
          try {
            const res = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential, claims: getClaims() }),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error || 'Não conseguimos entrar com o Google.');
              return;
            }
            (data.claimed || []).forEach(removeClaim);
            onLogin?.(data);
          } catch {
            setError('Falha de conexão no login.');
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 280,
      });
    }

    initGoogle();
    return () => { cancelled = true; };
  }, [onLogin]);

  async function handleMagicLink() {
    if (!email.trim()) return;
    setIsSending(true);
    setError('');
    try {
      const res = await fetch('/api/auth/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), claims: getClaims() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data.error || 'Não conseguimos enviar o email.');
      }
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-4xl">💌</span>
        <h2 className="font-display text-2xl text-ink-900">Confira seu email</h2>
        <p className="text-sm text-ink-600">
          Enviamos um link de acesso para <strong>{email.trim()}</strong>.
          Ele vale por 15 minutos.
        </p>
        <button
          onClick={() => setSent(false)}
          className="text-sm text-ink-400 underline underline-offset-4 min-h-[44px] cursor-pointer"
        >
          Usar outro email
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <div ref={googleBtnRef} className="min-h-[44px]" />

      <div className="flex items-center gap-3 w-full">
        <span className="flex-1 border-t border-ink-900/10" />
        <span className="text-xs text-ink-400">ou</span>
        <span className="flex-1 border-t border-ink-900/10" />
      </div>

      <div className="flex flex-col gap-2 w-full">
        <label htmlFor="auth-email" className="text-sm text-ink-600">
          Receber link de acesso por email
        </label>
        <input
          id="auth-email"
          type="email"
          inputMode="email"
          className="input-base"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleMagicLink()}
        />
        <button
          onClick={handleMagicLink}
          disabled={isSending || !email.trim()}
          className="btn-primary w-full"
        >
          {isSending ? 'Enviando…' : 'Enviar link mágico'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-wine-700">{error}</p>
      )}
    </div>
  );
}
