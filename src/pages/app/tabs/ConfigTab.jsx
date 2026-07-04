import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { Btn, Field, AppHeader, Row, RowList } from '../../../ui/kit.jsx';

export default function ConfigTab() {
  const navigate = useNavigate();
  const { user, couple, partner, refresh, logout } = useSession();
  const [name, setName] = useState(user.name || '');
  const [coupleName, setCoupleName] = useState(couple.name);
  const [date, setDate] = useState(couple.milestone_date);
  const [saved, setSaved] = useState(false);
  const [invite, setInvite] = useState(null);

  async function save(e) {
    e.preventDefault();
    if (name !== user.name) await api('/api/me', { method: 'PATCH', body: { name } });
    if (coupleName !== couple.name || date !== couple.milestone_date) {
      await api(`/api/couples/${couple.id}`, { method: 'PATCH', body: { name: coupleName, milestoneDate: date } });
    }
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function newInvite() {
    const { invite: inv } = await api(`/api/couples/${couple.id}/invites`, { method: 'POST' });
    setInvite(inv);
    await navigator.clipboard.writeText(inv.url).catch(() => {});
  }

  async function sair() {
    await logout();
    navigate('/');
  }

  return (
    <div className="pt-3">
      <AppHeader back={() => navigate('/app')} title="Configurações" />

      <form onSubmit={save}>
        <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mt-4 mb-2">Você</p>
        <Field label="Seu nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como seu par te chama?" />
        <p className="text-sm text-ink-3 -mt-2 mb-4">{user.email}</p>

        <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mt-4 mb-2">Espaço do casal</p>
        <Field label="Nome do espaço" value={coupleName} onChange={(e) => setCoupleName(e.target.value)} />
        <Field label="Data do contador" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Btn block type="submit">{saved ? 'Salvo ✓' : 'Salvar'}</Btn>
      </form>

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mt-8 mb-2">Parceiro(a)</p>
      <RowList className="mb-6">
        {partner ? (
          <Row icon="together" title={partner.name || partner.email} sub="Conectado(a) ao espaço" right={<span />} />
        ) : (
          <Row icon="link" title={invite ? 'Link copiado!' : 'Gerar convite pro seu par'}
            sub={invite ? `Código: ${invite.code}` : 'Cria um link e código novos'} onClick={newInvite} />
        )}
      </RowList>

      <Btn block variant="ghost" onClick={sair}>Sair da conta</Btn>
      <p className="text-center text-xs text-ink-3 mt-6 pb-4">Chamego · feito com carinho</p>
    </div>
  );
}
