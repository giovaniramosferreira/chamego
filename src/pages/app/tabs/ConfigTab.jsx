import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiUpload } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { Btn, Field, AppHeader, Row, RowList, Spinner } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

export default function ConfigTab() {
  const navigate = useNavigate();
  const { user, couple, partner, refresh, logout } = useSession();
  const [name, setName] = useState(user.name || '');
  const [coupleName, setCoupleName] = useState(couple.name);
  const [date, setDate] = useState(couple.milestone_date);
  const [saved, setSaved] = useState(false);
  const [invite, setInvite] = useState(null);
  const [uploading, setUploading] = useState(false);
  const avatarRef = useRef(null);

  const firstLetter = (user.name || user.email)[0]?.toUpperCase() || '♥';

  async function uploadAvatar(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', f);
      await apiUpload('/api/me/avatar', fd);
      await refresh();
    } finally {
      setUploading(false);
      if (avatarRef.current) avatarRef.current.value = '';
    }
  }

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

      <div className="flex flex-col items-center mt-4 mb-2">
        <input ref={avatarRef} type="file" accept="image/*" hidden onChange={uploadAvatar} />
        <button type="button" onClick={() => avatarRef.current?.click()} className="relative" aria-label="Trocar foto de perfil">
          <span className="block w-24 h-24 rounded-full overflow-hidden bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)] grid place-items-center text-accent-press font-display text-3xl">
            {user.picture ? <img src={user.picture} alt="" className="w-full h-full object-cover" /> : firstLetter}
          </span>
          <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent text-accent-ink grid place-items-center shadow-[0_2px_6px_rgba(43,37,33,.25)]">
            {uploading ? <Spinner className="!w-4 !h-4 !border-accent-ink/40 !border-t-accent-ink" /> : <Icon name="camera" size={15} />}
          </span>
        </button>
        <span className="text-sm text-ink-3 mt-2">Toque para trocar a foto</span>
      </div>

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
