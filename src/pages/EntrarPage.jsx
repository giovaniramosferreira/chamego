import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useSession } from '../lib/session-context.js';
import { Btn, Field, Logo } from '../ui/kit.jsx';
import Icon from '../ui/icons.jsx';
import abraco from '../assets/abraco.png';

export default function EntrarPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/app';
  const erro = params.get('erro');
  const { user, loading, refresh } = useSession();

  const [mode, setMode] = useState('welcome'); // welcome | login | enviado
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(erro === 'link-invalido' ? 'Esse link expirou ou já foi usado. Peça outro.' : '');
  const googleBtn = useRef(null);

  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [loading, user, navigate, next]);

  // Google Identity Services — só quando o backend tem client id
  useEffect(() => {
    if (mode !== 'login') return;
    let cancelled = false;
    (async () => {
      const { googleClientId } = await api('/api/config');
      if (!googleClientId || cancelled) return;
      if (!document.getElementById('gsi-script')) {
        await new Promise((ok) => {
          const s = document.createElement('script');
          s.src = 'https://accounts.google.com/gsi/client';
          s.id = 'gsi-script';
          s.onload = ok;
          document.head.appendChild(s);
        });
      }
      if (cancelled || !window.google || !googleBtn.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          try {
            await api('/api/auth/google', { method: 'POST', body: { credential } });
            await refresh();
            navigate(next, { replace: true });
          } catch (e) {
            setError(e.message);
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtn.current, { theme: 'outline', size: 'large', width: 320, text: 'continue_with' });
    })();
    return () => { cancelled = true; };
  }, [mode, navigate, next, refresh]);

  async function sendLink(e) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await api('/api/auth/magic-link', { method: 'POST', body: { email } });
      setMode('enviado');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center">
      <div className="w-full max-w-[430px] flex-1 flex flex-col px-6 py-8 screen-enter">
        {mode === 'welcome' && (
          <div className="flex-1 flex flex-col justify-center text-center">
            <img src={abraco} alt="" className="rounded-img mb-8 max-h-[300px] object-cover" />
            <h1 className="font-display text-3xl mb-2">Um espaço só de <em className="text-accent">vocês dois</em></h1>
            <p className="text-ink-2 mb-8">Organize rotina, compromissos, listas e memórias em um lugar privado — e feito para durar.</p>
            <Btn block onClick={() => setMode('login')} className="mb-2.5">Criar conta</Btn>
            <Btn block variant="ghost" onClick={() => setMode('login')}>Já tenho conta</Btn>
          </div>
        )}

        {mode === 'login' && (
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-center mb-8"><Logo className="text-3xl" /></div>
            <div ref={googleBtn} className="flex justify-center mb-4 empty:hidden" />
            <div className="flex items-center gap-3 text-ink-3 text-sm my-4">
              <span className="flex-1 h-px bg-ink-3/30" />ou continue com e-mail<span className="flex-1 h-px bg-ink-3/30" />
            </div>
            <form onSubmit={sendLink}>
              <Field label="E-mail" type="email" required placeholder="voce@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
              <Btn block type="submit" disabled={sending}>{sending ? 'Enviando…' : 'Receber link de acesso'}</Btn>
            </form>
            {error && <p className="text-accent-press text-sm mt-3 text-center">{error}</p>}
            <p className="text-ink-3 text-sm text-center mt-6">Sem senha: enviamos um link de uso único pro seu e-mail. Conta nova nasce no primeiro acesso.</p>
          </div>
        )}

        {mode === 'enviado' && (
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <span className="w-16 h-16 rounded-full bg-accent-soft grid place-items-center text-accent mb-4"><Icon name="mail" size={26} /></span>
            <h2 className="font-display text-2xl mb-2">Confira seu e-mail</h2>
            <p className="text-ink-2 max-w-[30ch] mb-6">Enviamos um link de acesso para <strong className="text-ink">{email}</strong>. Ele vale por 15 minutos.</p>
            <button className="text-accent font-medium text-sm" onClick={() => setMode('login')}>Usar outro e-mail</button>
          </div>
        )}
      </div>
    </div>
  );
}
