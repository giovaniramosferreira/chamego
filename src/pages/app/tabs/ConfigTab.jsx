import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, apiUpload } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { useToast } from '../../../lib/toast-context.js';
import { Btn, Field, SelectField, AppHeader, Row, RowList, Sheet, Spinner } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';
import InviteActions from '../../../components/InviteActions.jsx';

const STAGES = [
  ['', 'Prefiro não dizer'],
  ['namorando', 'Namorando'],
  ['morando', 'Morando juntos'],
  ['noivos', 'Noivos'],
  ['casados', 'Casados'],
  ['distancia', 'À distância'],
];

export default function ConfigTab() {
  const navigate = useNavigate();
  const { user, couple, partner, refresh, logout } = useSession();
  const { toast } = useToast();
  const [name, setName] = useState(user.name || '');
  const [stage, setStage] = useState(user.onboarding?.stage || '');
  const [coupleName, setCoupleName] = useState(couple.name);
  const [date, setDate] = useState(couple.milestone_date || '');
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [prefs, setPrefs] = useState(null);
  const [danger, setDanger] = useState(null); // null | 'sair' | 'excluir'
  const avatarRef = useRef(null);

  const firstLetter = (user.name || user.email)[0]?.toUpperCase() || '♥';

  useEffect(() => {
    api('/api/reminders').then((d) => setPrefs(d.prefs)).catch(() => {});
  }, []);

  async function uploadAvatar(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', f);
      await apiUpload('/api/me/avatar', fd);
      await refresh();
      toast('Foto atualizada ✓');
    } catch (err) {
      toast(err.message, { tone: 'error' });
    } finally {
      setUploading(false);
      if (avatarRef.current) avatarRef.current.value = '';
    }
  }

  async function save(e) {
    e.preventDefault();
    try {
      if (name !== user.name || stage !== (user.onboarding?.stage || '')) {
        await api('/api/me', { method: 'PATCH', body: { name, onboarding: { stage } } });
      }
      if (coupleName !== couple.name || date !== (couple.milestone_date || '')) {
        await api(`/api/couples/${couple.id}`, { method: 'PATCH', body: { name: coupleName, milestoneDate: date } });
      }
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  }

  async function toggleEmail(key) {
    const next = { ...prefs.email, [key]: !prefs.email[key] };
    setPrefs({ ...prefs, email: next });
    try {
      const { prefs: fresh } = await api('/api/reminders/prefs', { method: 'PATCH', body: { email: next } });
      setPrefs(fresh);
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
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
        <SelectField label="Fase de vocês (opcional)" value={stage} onChange={(e) => setStage(e.target.value)}>
          {STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </SelectField>

        <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mt-4 mb-2">Espaço do casal</p>
        <Field label="Nome do espaço" value={coupleName} onChange={(e) => setCoupleName(e.target.value)} />
        <Field label="Data do contador" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Btn block type="submit">{saved ? 'Salvo ✓' : 'Salvar'}</Btn>
      </form>

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mt-8 mb-2">Parceiro(a)</p>
      {partner ? (
        <RowList className="mb-6">
          <Row icon="together" title={partner.name || partner.email} sub="Conectado(a) ao espaço" right={<span />} />
        </RowList>
      ) : (
        <div className="mb-6">
          <InviteActions coupleId={couple.id} coupleName={couple.name} />
        </div>
      )}

      {/* Avisos: o app lembra por vocês — e dá pra desligar num toque. */}
      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Avisos por email</p>
      <RowList className="mb-6">
        <Row icon="calendar" title="Agenda de amanhã" sub="Na véspera, se tiver algo marcado"
          right={<Switch on={!!prefs?.email?.eventEve} onClick={() => toggleEmail('eventEve')} />} />
        <Row icon="star" title="Resumo da semana" sub="Domingo à noite, com os destaques"
          right={<Switch on={!!prefs?.email?.weekly} onClick={() => toggleEmail('weekly')} />} />
      </RowList>

      {/* O que os Termos prometem, agora existe de verdade. */}
      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Seus dados</p>
      <RowList className="mb-6">
        <Row icon="logout" title="Baixar tudo do nosso espaço" sub="Um arquivo com eventos, listas, momentos e conversas"
          onClick={() => { window.location.href = '/api/export'; }} />
        <Row icon="shield" title="Termos e privacidade" sub="O que fazemos com os dados de vocês"
          onClick={() => navigate('/termos')} />
        <Row icon="user" title="Sair do espaço" sub="Você sai; o conteúdo fica com seu par" onClick={() => setDanger('sair')} />
        <Row icon="trash" title="Excluir o espaço" sub="Apaga tudo, para os dois, sem volta" onClick={() => setDanger('excluir')} />
      </RowList>

      <Btn block variant="ghost" onClick={sair}>Sair da conta</Btn>
      <p className="text-center text-xs text-ink-3 mt-6 pb-4">
        Chamego · feito com carinho · <Link to="/termos" className="underline">termos</Link>
      </p>

      {danger && <DangerSheet mode={danger} couple={couple} onClose={() => setDanger(null)} onDone={() => navigate('/app/comecar')} />}
    </div>
  );
}

function Switch({ on, onClick }) {
  return (
    <button type="button" onClick={onClick} role="switch" aria-checked={on}
      className={`w-11 h-6 rounded-full transition-colors relative ${on ? 'bg-accent' : 'bg-tint shadow-[inset_0_0_0_1px_var(--line-2)]'}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

// Ações sem volta pedem uma confirmação de verdade — digitada, não um "ok".
function DangerSheet({ mode, couple, onClose, onDone }) {
  const { toast } = useToast();
  const { refresh } = useSession();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const excluir = mode === 'excluir';

  async function run() {
    setBusy(true);
    try {
      if (excluir) await api(`/api/couples/${couple.id}`, { method: 'DELETE', body: { confirm } });
      else await api(`/api/couples/${couple.id}/leave`, { method: 'POST' });
      await refresh();
      toast(excluir ? 'Espaço excluído.' : 'Você saiu do espaço.');
      onDone();
    } catch (e) {
      toast(e.message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={excluir ? 'Excluir o espaço' : 'Sair do espaço'} onClose={onClose}>
      <p className="text-[.95rem] text-ink-2 mb-4">
        {excluir
          ? 'Isso apaga eventos, listas, momentos, fotos e conversas para as duas pessoas. Não dá pra desfazer — baixe seus dados antes, se quiser guardar.'
          : 'Você sai deste espaço e volta a poder criar ou aceitar outro. O conteúdo continua com seu par.'}
      </p>
      {excluir && (
        <Field label="Digite EXCLUIR para confirmar" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="EXCLUIR" />
      )}
      <Btn block onClick={run} disabled={busy || (excluir && confirm.trim().toLowerCase() !== 'excluir')}>
        {busy ? <Spinner /> : (excluir ? 'Excluir para sempre' : 'Sair do espaço')}
      </Btn>
      <button onClick={onClose} className="w-full text-center text-sm text-ink-3 mt-3">Cancelar</button>
    </Sheet>
  );
}
