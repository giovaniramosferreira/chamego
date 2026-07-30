import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, apiUpload } from '../../../lib/api.js';
import { AppHeader, Card, Row, Sheet, Fab, Field, Btn, Chip, Spinner, EmptyState } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const todayISO = () => new Date().toLocaleDateString('en-CA');
const fmtDate = (iso) => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const daysUntil = (iso) => Math.ceil((new Date(`${iso}T00:00:00`).getTime() - Date.now()) / 86_400_000);

export default function CapsulaTab() {
  const nav = useNavigate();
  const [caps, setCaps] = useState(null);
  const [sheet, setSheet] = useState(false);

  const load = () => api('/api/time-capsules').then((d) => setCaps(d.capsules));
  useEffect(() => { load(); }, []);

  const ready = (caps || []).filter((c) => !c.sealed && !c.opened_at);
  const sealed = (caps || []).filter((c) => c.sealed);
  const opened = (caps || []).filter((c) => c.opened_at);

  return (
    <div>
      <AppHeader back={() => nav('/app/momentos')} title="Cápsula do tempo" />

      {caps === null ? (
        <div className="py-10 text-center"><Spinner /></div>
      ) : caps.length === 0 ? (
        <EmptyState icon="clock" title="Nenhuma cápsula ainda" actions={<Btn onClick={() => setSheet(true)} className="!px-5 !py-2.5 !text-sm">Criar primeira cápsula</Btn>}>
          Guarde uma mensagem, foto ou áudio para abrir em uma data especial no futuro.
        </EmptyState>
      ) : (
        <>
          {ready.map((c) => (
            <Card key={c.id} className="mb-3 text-center bg-accent-soft/50">
              <span className="mx-auto mb-2 w-12 h-12 rounded-full bg-surface grid place-items-center text-accent"><Icon name="gift" size={22} /></span>
              <p className="font-display text-lg">Pronta para abrir 🎉</p>
              <p className="text-sm text-ink-2 mb-3">{c.title}</p>
              <Btn className="!px-5 !py-2.5 !text-sm" onClick={() => nav(`/app/capsula/${c.id}`)}>Abrir agora →</Btn>
            </Card>
          ))}
          {sealed.length > 0 && (
            <>
              <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2 mt-2">Guardadas para o futuro</p>
              {sealed.map((c) => (
                <Card key={c.id} className="mb-3 flex items-center gap-3">
                  <span className="flex-none w-10 h-10 rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name="lock" size={18} /></span>
                  <div className="flex-1">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-sm text-ink-2">Abre em {fmtDate(c.open_date)}</p>
                  </div>
                  <span className="text-xs font-semibold text-ink-3">faltam {Math.max(0, daysUntil(c.open_date))}d</span>
                </Card>
              ))}
            </>
          )}
          {opened.length > 0 && (
            <>
              <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2 mt-2">Já abertas</p>
              <Card className="!p-0">
                {opened.map((c) => <Row key={c.id} icon="heart" title={c.title} sub={`Aberta · ${fmtDate(c.open_date)}`} onClick={() => nav(`/app/capsula/${c.id}`)} />)}
              </Card>
            </>
          )}
        </>
      )}

      <Fab onClick={() => setSheet(true)} label="Nova cápsula" />
      {sheet && <CapsulaSheet onClose={() => setSheet(false)} onSaved={() => { setSheet(false); load(); }} />}
    </div>
  );
}

function CapsulaSheet({ onClose, onSaved }) {
  const [form, setForm] = useState({ type: 'message', title: '', message: '', openDate: '', scope: 'couple', recurrence: 'none' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.openDate) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('openDate', form.openDate);
      fd.append('message', form.message);
      fd.append('scope', form.scope);
      fd.append('recurrence', form.recurrence);
      if (file) fd.append('media', file);
      await apiUpload('/api/time-capsules', fd);
      onSaved();
    } catch (err) {
      // Limite do plano: o paywall global já apareceu, aqui é só não estourar.
      if (!err.upgrade) throw err;
      onClose();
    } finally { setSaving(false); }
  }
  const TYPES = [['message', 'Mensagem', 'edit'], ['photo', 'Foto', 'image'], ['audio', 'Áudio', 'mic']];
  return (
    <Sheet title="Nova cápsula" onClose={onClose}>
      <form onSubmit={save}>
        <Field label="Título" placeholder="Nossa carta de fim de ano" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus required />
        <p className="text-sm font-medium text-ink-2 mb-2">Tipo de conteúdo</p>
        <div className="flex gap-2 mb-4">
          {TYPES.map(([t, l, ic]) => <Chip key={t} active={form.type === t} onClick={() => { setForm({ ...form, type: t }); setFile(null); }}><Icon name={ic} size={13} /> {l}</Chip>)}
        </div>
        {form.type === 'message' ? (
          <label className="block mb-4"><span className="block text-sm font-medium text-ink-2 mb-1.5">Sua mensagem</span>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Escreva algo para o futuro de vocês…"
              className="w-full rounded-btn bg-surface px-4 py-3 text-ink placeholder:text-ink-3 shadow-[inset_0_0_0_1px_var(--line-2)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)] outline-none min-h-[90px]" /></label>
        ) : (
          <label className="block mb-4"><span className="block text-sm font-medium text-ink-2 mb-1.5">{form.type === 'photo' ? 'Foto' : 'Áudio'}</span>
            <input ref={fileRef} type="file" accept={form.type === 'photo' ? 'image/*' : 'audio/*'} onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-ink-2 file:mr-3 file:rounded-btn file:border-0 file:bg-accent-soft file:px-4 file:py-2 file:text-accent-press" /></label>
        )}
        <p className="text-sm font-medium text-ink-2 mb-2">Quem guarda</p>
        <div className="flex gap-2 mb-4">
          <Chip active={form.scope === 'couple'} onClick={() => setForm({ ...form, scope: 'couple' })}>Nós dois</Chip>
          <Chip active={form.scope === 'self'} onClick={() => setForm({ ...form, scope: 'self' })}>Só eu</Chip>
        </div>
        <Field label="Abrir em" type="date" value={form.openDate} min={todayISO()} onChange={(e) => setForm({ ...form, openDate: e.target.value })} required />
        <button type="button" onClick={() => setForm({ ...form, recurrence: form.recurrence === 'yearly' ? 'none' : 'yearly' })} className="w-full flex items-center justify-between rounded-card bg-surface px-4 py-3 mb-4 shadow-[inset_0_0_0_1px_var(--line-2)]">
          <span className="flex items-center gap-2.5"><Icon name="clock" size={18} className="text-accent-press" /> Repetir todo ano</span>
          <span className={`w-11 h-6 rounded-full transition-colors relative ${form.recurrence === 'yearly' ? 'bg-accent' : 'bg-[var(--line-2)]'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${form.recurrence === 'yearly' ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>
        <div className="flex items-center gap-2.5 rounded-card bg-accent-soft/60 px-4 py-3 mb-5 text-sm text-accent-press">
          <Icon name="lock" size={18} /> Depois de selada, fica trancada até a data — nem você lê antes.
        </div>
        <Btn type="submit" block disabled={saving || !form.title.trim() || !form.openDate}>{saving ? <Spinner /> : 'Selar cápsula'}</Btn>
      </form>
    </Sheet>
  );
}

export function CapsulaDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [cap, setCap] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => { api(`/api/time-capsules/${id}`).then((d) => setCap(d.capsule)).catch((e) => setErr(e.message)); }, [id]);

  async function open() {
    const { capsule } = await api(`/api/time-capsules/${id}`, { method: 'PATCH' });
    setCap(capsule);
  }

  if (err) return <div><AppHeader back={() => nav('/app/capsula')} title="Cápsula" /><p className="text-ink-2 py-8 text-center">{err}</p></div>;
  if (!cap) return <div className="py-10 text-center"><Spinner /></div>;

  if (cap.sealed) {
    return (
      <div className="text-center pt-12">
        <AppHeader back={() => nav('/app/capsula')} />
        <span className="mx-auto mb-4 w-[76px] h-[76px] rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name="lock" size={30} /></span>
        <h2 className="font-display text-2xl mb-1">{cap.title}</h2>
        <p className="text-ink-2 max-w-[30ch] mx-auto">Selada até {fmtDate(cap.open_date)}. Faltam {Math.max(0, daysUntil(cap.open_date))} dias.</p>
      </div>
    );
  }

  const revealed = !!cap.opened_at;
  return (
    <div className="text-center pt-8">
      <AppHeader back={() => nav('/app/capsula')} />
      <span className="mx-auto mb-4 w-[76px] h-[76px] rounded-full bg-accent-soft grid place-items-center text-accent"><Icon name="gift" size={30} /></span>
      <h2 className="font-display text-2xl mb-1">{cap.title}</h2>
      <p className="text-ink-2 mb-6">Guardada para {fmtDate(cap.open_date)}</p>
      {!revealed ? (
        <Btn onClick={open}>Abrir cápsula</Btn>
      ) : (
        <>
          {cap.message && <Card className="text-left mb-4"><p className="text-lg leading-snug">{cap.message}</p></Card>}
          {cap.media_url && cap.media_type === 'photo' && <img src={cap.media_url} alt="" className="w-full rounded-card mb-4" />}
          {cap.media_url && cap.media_type === 'audio' && <audio controls src={cap.media_url} className="w-full mb-4" />}
          <Btn variant="ghost" block onClick={() => nav('/app/momentos')}>Salvar nos momentos</Btn>
        </>
      )}
    </div>
  );
}
