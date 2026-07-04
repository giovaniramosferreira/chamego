import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useSession } from '../lib/session-context.js';
import { Btn, Logo } from '../ui/kit.jsx';
import Icon from '../ui/icons.jsx';

export default function ConvitePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { loading, user, couple, refresh } = useSession();
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api(`/api/invites/${code}`)
      .then((p) => { if (!cancelled) setPreview(p); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [code]);

  async function accept() {
    setAccepting(true);
    setError('');
    try {
      await api(`/api/invites/${code}/accept`, { method: 'POST' });
      await refresh();
      navigate('/app', { replace: true });
    } catch (e) {
      setError(e.message);
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex justify-center">
      <div className="w-full max-w-[430px] px-6 py-10 flex flex-col items-center text-center screen-enter">
        <Logo className="text-2xl mb-10" />
        {error && !preview && (
          <>
            <span className="w-16 h-16 rounded-full bg-accent-soft grid place-items-center text-accent mb-4"><Icon name="close" size={24} /></span>
            <h1 className="font-display text-2xl mb-2">Convite indisponível</h1>
            <p className="text-ink-2 mb-6">{error}</p>
            <Btn to="/">Conhecer o Chamego</Btn>
          </>
        )}
        {preview && (
          <>
            <span className="w-16 h-16 rounded-full bg-accent-soft grid place-items-center text-accent mb-4"><Icon name="heart" size={28} /></span>
            <h1 className="font-display text-2xl mb-2">
              {preview.invitedBy} convidou você para o espaço <em className="text-accent">{preview.coupleName}</em>
            </h1>
            <p className="text-ink-2 max-w-[32ch] mb-8">Um lugar privado pra vocês organizarem a vida a dois: agenda, listas e memórias.</p>
            {loading ? null : user ? (
              couple ? (
                <p className="text-ink-2">Você já tem um espaço no Chamego. Pra aceitar este convite, fale com seu par — cada pessoa participa de um espaço só.</p>
              ) : (
                <>
                  <Btn block onClick={accept} disabled={accepting}>{accepting ? 'Entrando…' : 'Aceitar convite'}</Btn>
                  {error && <p className="text-accent-press text-sm mt-3">{error}</p>}
                </>
              )
            ) : (
              <>
                <Btn block to={`/entrar?next=${encodeURIComponent(`/convite/${code}`)}`}>Entrar para aceitar</Btn>
                <p className="text-ink-3 text-sm mt-3">Rapidinho: só o seu e-mail, sem senha.</p>
              </>
            )}
          </>
        )}
        {!preview && !error && <p className="text-ink-3">Carregando convite…</p>}
        <p className="mt-auto pt-10 text-sm text-ink-3">
          <Link to="/" className="underline">O que é o Chamego?</Link>
        </p>
      </div>
    </div>
  );
}
