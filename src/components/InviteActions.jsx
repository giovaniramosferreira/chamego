import { useState } from 'react';
import { api } from '../lib/api.js';
import { useToast } from '../lib/toast-context.js';
import { Btn, Field, Row, RowList, Spinner } from '../ui/kit.jsx';

// Convidar em um toque, do mesmo jeito em qualquer tela: compartilhamento
// nativo do celular, email direto ou o código pra ditar. Antes o caminho era
// Início → Configurações → rolar → gerar → copiar.
export default function InviteActions({ invite, coupleName, coupleId, onGenerated }) {
  const { toast } = useToast();
  const [current, setCurrent] = useState(invite || null);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);

  const shareText = `Criei um espaço pra nós dois no Chamego 💛${coupleName ? ` (${coupleName})` : ''}`;

  async function ensureInvite() {
    if (current) return current;
    setBusy(true);
    try {
      const { invite: inv } = await api(`/api/couples/${coupleId}/invites`, { method: 'POST' });
      setCurrent(inv);
      onGenerated?.(inv);
      return inv;
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const inv = await ensureInvite();
    const data = { title: 'Chamego', text: shareText, url: inv.url };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch { /* pessoa cancelou o menu de compartilhar */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${inv.url}`)}`, '_blank');
  }

  async function copy() {
    const inv = await ensureInvite();
    await navigator.clipboard.writeText(inv.url).catch(() => {});
    toast('Link do convite copiado ✓');
  }

  async function sendEmail(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      const { invite: inv, emailed } = await api(`/api/couples/${coupleId}/invites`, { method: 'POST', body: { email: email.trim() } });
      setCurrent(inv);
      onGenerated?.(inv);
      setEmail('');
      toast(emailed ? 'Convite enviado por email 💌' : 'Convite criado — envie o link para seu par.');
    } catch (err) {
      toast(err.message, { tone: 'error' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <Btn block onClick={share} disabled={busy}>{busy ? <Spinner /> : 'Compartilhar convite'}</Btn>

      {coupleId && (
        <form onSubmit={sendEmail} className="mt-4">
          <Field label="Ou mande direto pro email dele(a)" type="email" placeholder="par@email.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <Btn block variant="ghost" type="submit" disabled={sending || !email.trim()}>
            {sending ? <Spinner /> : 'Enviar convite por email'}
          </Btn>
        </form>
      )}

      <RowList className="mt-4">
        <Row icon="link" title="Copiar link do convite"
          sub={current ? current.url.replace(/^https?:\/\//, '') : 'Gera um link novo'} onClick={copy} />
        {current && (
          <Row icon="shield" title="Código de pareamento" sub={`Dite ou digite: ${current.code}`} right={<span />} />
        )}
      </RowList>

      <p className="text-ink-3 text-sm text-center mt-4">Assim que seu par aceitar, o espaço se conecta sozinho — e você recebe um email.</p>
    </div>
  );
}
