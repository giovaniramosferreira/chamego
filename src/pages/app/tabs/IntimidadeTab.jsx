import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useSubscription, track } from '../../../lib/subscription.js';
import { AppHeader, Card, Sheet, Btn, Spinner, EmptyState, PaywallSheet } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const GRAD = {
  Conversa: 'linear-gradient(160deg,#7a8a6f,#4d5a45)',
  Carinho: 'linear-gradient(160deg,#bd6a4b,#8c4630)',
  Futuro: 'linear-gradient(160deg,#c9a86a,#8a6f3f)',
  Reconexão: 'linear-gradient(160deg,#8c5a8c,#5c3a5c)',
  Desejo: 'linear-gradient(160deg,#8c2f4a,#5c1e30)',
  Combinados: 'linear-gradient(160deg,#5a6b8c,#33405c)',
};

export default function IntimidadeTab() {
  const nav = useNavigate();
  const sub = useSubscription();
  const [data, setData] = useState(null);       // { prompts, hasPin }
  const [unlocked, setUnlocked] = useState(false);
  const [carta, setCarta] = useState(null);     // prompt sendo respondido
  const [historico, setHistorico] = useState(false);
  const [pinSheet, setPinSheet] = useState(false);
  const [paywall, setPaywall] = useState(false);

  const load = () => api('/api/intimacy/prompts').then(setData);
  useEffect(() => { load(); }, []);

  if (data === null) return <div><AppHeader back={() => nav('/app/voces')} title="Conexão" /><div className="py-10 text-center"><Spinner /></div></div>;

  if (data.hasPin && !unlocked) return <PinLock onBack={() => nav('/app/voces')} onOk={() => setUnlocked(true)} />;

  function pick(p) {
    if (p.premium && !sub.has('premium')) { track('paywall_visto', 'intimidade'); setPaywall(true); return; }
    setCarta(p);
  }

  return (
    <div>
      <AppHeader back={() => nav('/app/voces')} title="Conexão"
        right={<button onClick={() => setPinSheet(true)} aria-label="Privacidade" className="text-ink-3 hover:text-accent-press p-1"><Icon name="lock" size={18} /></button>} />

      <div className="flex items-center gap-2.5 rounded-card bg-accent-soft/60 px-4 py-3 mb-4 text-sm text-accent-press">
        <Icon name="shield" size={18} /> Espaço privado e protegido. Delicado por padrão, vocês controlam o tom.
      </div>

      <button onClick={() => pick(data.prompts[0])} className="w-full text-left rounded-card p-5 mb-4 text-white" style={{ background: GRAD[data.prompts[0].tone] }}>
        <p className="text-xs font-semibold tracking-[.15em] uppercase opacity-80 mb-1">Carta do dia</p>
        <p className="font-display text-xl leading-snug">{data.prompts[0].text}</p>
      </button>

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Escolha um tom</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {data.prompts.map((p) => {
          const locked = p.premium && !sub.has('premium');
          return (
            <button key={p.id} onClick={() => pick(p)} className="relative rounded-card p-4 h-24 text-left text-white flex flex-col justify-end" style={{ background: GRAD[p.tone] }}>
              {locked && <span className="absolute top-2 right-2"><Icon name="lock" size={15} /></span>}
              <span className="font-display text-lg">{p.tone}</span>
              <span className="text-xs opacity-85">{locked ? 'trilha premium' : p.text.slice(0, 28) + '…'}</span>
            </button>
          );
        })}
      </div>

      <Btn variant="ghost" block onClick={() => setHistorico(true)}>Nossas sessões</Btn>

      {carta && <CartaSheet prompt={carta} onClose={() => setCarta(null)} />}
      {historico && <HistoricoSheet onClose={() => setHistorico(false)} />}
      {pinSheet && <PinSheet hasPin={data.hasPin} onClose={() => setPinSheet(false)} onSaved={() => { setPinSheet(false); load(); }} />}
      {paywall && <PaywallSheet title="Trilhas de conexão" perks={['Trilhas por tema', 'Rituais guiados', 'Novos conteúdos por pack']} origem="intimidade" onClose={() => setPaywall(false)} />}
    </div>
  );
}

function CartaSheet({ prompt, onClose }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [partner, setPartner] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { api(`/api/intimacy/prompts/${prompt.id}/partner`).then((d) => setPartner(d.response)); }, [prompt.id]);

  async function respond() {
    if (!note.trim()) return;
    setSaving(true);
    try { const d = await api('/api/intimacy/sessions', { method: 'POST', body: { promptId: prompt.id, note: note.trim() } }); setPartner(d.partner); setSaved(true); }
    finally { setSaving(false); }
  }
  return (
    <Sheet title={prompt.tone} onClose={onClose}>
      <div className="rounded-card p-4 mb-4 text-white" style={{ background: GRAD[prompt.tone] }}><p className="font-display text-lg leading-snug">{prompt.text}</p></div>
      {!saved ? (
        <>
          <label className="block mb-4"><span className="block text-sm font-medium text-ink-2 mb-1.5">Sua resposta</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sem pressa…"
              className="w-full rounded-btn bg-surface px-4 py-3 shadow-[inset_0_0_0_1px_var(--line-2)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)] outline-none min-h-[90px]" /></label>
          <Btn block disabled={saving || !note.trim()} onClick={respond}>{saving ? <Spinner /> : 'Responder'}</Btn>
        </>
      ) : (
        <p className="text-sm text-accent-press mb-4">Resposta guardada 💛</p>
      )}
      {partner && (
        <div className="mt-4">
          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Seu par respondeu</p>
          <Card>"{partner.note}"</Card>
        </div>
      )}
    </Sheet>
  );
}

function HistoricoSheet({ onClose }) {
  const [sessions, setSessions] = useState(null);
  const load = () => api('/api/intimacy/sessions').then((d) => setSessions(d.sessions));
  useEffect(() => { load(); }, []);
  async function del(id) { await api(`/api/intimacy/sessions/${id}`, { method: 'DELETE' }); load(); }
  async function clearAll() { if (!confirm('Apagar todo o histórico?')) return; await api('/api/intimacy/sessions', { method: 'DELETE' }); load(); }
  return (
    <Sheet title="Nossas sessões" onClose={onClose}>
      {sessions === null ? <div className="py-6 text-center"><Spinner /></div>
        : sessions.length === 0 ? <EmptyState icon="heart" title="Nenhuma sessão ainda">Escolham um tom para a primeira conversa.</EmptyState>
        : (
          <>
            <Card className="!p-0 mb-4">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-start gap-3 px-4 py-3 border-b border-line last:border-0">
                  <span className="flex-none w-8 h-8 rounded-full bg-accent-soft grid place-items-center text-accent-press mt-0.5"><Icon name="heart" size={15} /></span>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium">{s.tone}</p><p className="text-sm text-ink-2 truncate">"{s.note}"</p></div>
                  <button onClick={() => del(s.id)} aria-label="Apagar" className="text-ink-3 hover:text-accent-press p-1"><Icon name="trash" size={15} /></button>
                </div>
              ))}
            </Card>
            <button onClick={clearAll} className="w-full text-center text-sm text-[#b23b3b] py-2">Apagar histórico</button>
          </>
        )}
    </Sheet>
  );
}

function PinSheet({ hasPin, onClose, onSaved }) {
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  async function save(value) {
    setSaving(true);
    try { await api('/api/intimacy/pin', { method: 'PATCH', body: { pin: value } }); onSaved(); }
    finally { setSaving(false); }
  }
  return (
    <Sheet title="Área protegida" onClose={onClose}>
      <p className="text-sm text-ink-2 mb-4">{hasPin ? 'Trocar ou remover o código de 4 dígitos que protege esta área.' : 'Defina um código de 4 dígitos para proteger esta área. Opcional.'}</p>
      <input inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000"
        className="w-full text-center tracking-[.5em] text-2xl rounded-btn bg-surface px-4 py-3 mb-4 shadow-[inset_0_0_0_1px_var(--line-2)] outline-none" />
      <Btn block disabled={saving || pin.length !== 4} onClick={() => save(pin)}>{saving ? <Spinner /> : 'Definir código'}</Btn>
      {hasPin && <button onClick={() => save('')} className="w-full text-center text-sm text-ink-3 mt-3">Remover proteção</button>}
    </Sheet>
  );
}

function PinLock({ onBack, onOk }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  const press = (k) => { setErr(false); setPin((p) => (p + k).slice(0, 4)); };
  async function submit() {
    try { await api('/api/intimacy/unlock', { method: 'POST', body: { pin } }); onOk(); }
    catch { setErr(true); setPin(''); }
  }
  return (
    <div>
      <AppHeader back={onBack} />
      <div className="flex flex-col items-center text-center pt-8">
        <span className="w-16 h-16 rounded-full bg-accent-soft grid place-items-center text-accent-press mb-4"><Icon name="lock" size={28} /></span>
        <h2 className="font-display text-2xl mb-1">Área protegida</h2>
        <p className="text-ink-2 mb-5">Digite o código de vocês.</p>
        <div className="flex gap-3 mb-6">{[0, 1, 2, 3].map((i) => <span key={i} className={`w-3.5 h-3.5 rounded-full ${i < pin.length ? 'bg-accent' : 'bg-[var(--line-2)]'} ${err ? 'bg-[#b23b3b]' : ''}`} />)}</div>
        <div className="grid grid-cols-3 gap-3 w-56">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => <button key={k} onClick={() => press(String(k))} className="h-14 rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line-2)] font-display text-xl">{k}</button>)}
          <span />
          <button onClick={() => press('0')} className="h-14 rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line-2)] font-display text-xl">0</button>
          <button onClick={submit} disabled={pin.length !== 4} className="h-14 rounded-full bg-accent text-accent-ink grid place-items-center disabled:opacity-40"><Icon name="check" size={22} /></button>
        </div>
      </div>
    </div>
  );
}
