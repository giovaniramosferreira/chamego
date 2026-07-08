import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { AppHeader, Card, Sheet, Btn, Chip, Spinner, EmptyState } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const ROUTE = { checkin: '/app/voces', agenda: '/app/agenda', planos: '/app/planos', momentos: '/app/momentos', chat: '/app/voces/chat' };
const FREQ = [['raramente', 'Raramente'], ['equilibrio', 'Equilíbrio'], ['bastante', 'Bastante']];
const TYPES = [['checkin', 'Check-ins e humor'], ['dates', 'Datas importantes'], ['goals', 'Metas paradas'], ['routine', 'Rotina carregada']];

export default function LembretesTab() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [dismissed, setDismissed] = useState([]);
  const [config, setConfig] = useState(false);

  const load = () => api('/api/reminders').then(setData);
  useEffect(() => { load(); }, []);

  if (data === null) return <div><AppHeader back={() => nav('/app/voces')} title="Lembretes de carinho" /><div className="py-10 text-center"><Spinner /></div></div>;

  const shown = data.reminders.filter((r) => !dismissed.includes(r.id));
  const today = shown.filter((r) => r.when === 'today');
  const later = shown.filter((r) => r.when !== 'today');

  const group = (title, rows) => rows.length > 0 && (
    <>
      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">{title}</p>
      <Card className="!p-0 mb-4">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center border-b border-line last:border-0">
            <button onClick={() => nav(ROUTE[r.action] || '/app/voces')} className="flex-1 flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-accent-soft/40 transition-colors">
              <span className="flex-none w-9 h-9 rounded-full bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)] grid place-items-center text-accent-press"><Icon name={r.icon} size={17} /></span>
              <span className="flex-1 min-w-0"><span className="block font-medium text-[.95rem]">{r.title}</span>{r.sub && <span className="block text-sm text-ink-2">{r.sub}</span>}</span>
            </button>
            <button onClick={() => setDismissed([...dismissed, r.id])} aria-label="Dispensar" className="text-ink-3 hover:text-accent-press px-3 py-3.5"><Icon name="close" size={16} /></button>
          </div>
        ))}
      </Card>
    </>
  );

  return (
    <div>
      <AppHeader back={() => nav('/app/voces')} title="Lembretes de carinho"
        right={<button onClick={() => setConfig(true)} aria-label="Preferências" className="text-ink-3 hover:text-accent-press p-1"><Icon name="settings" size={18} /></button>} />
      <p className="text-sm text-ink-2 mb-4">Sugestões leves, nunca cobranças. Você decide o que fazer com cada uma.</p>

      {shown.length === 0 ? (
        <EmptyState icon="bell" title="Tudo em dia por aqui">Continue usando o app — mandamos lembretes leves quando fizer sentido.</EmptyState>
      ) : (
        <>
          {group('Pra hoje', today)}
          {group('Quando der', later)}
        </>
      )}

      {config && <ConfigSheet prefs={data.prefs} onClose={() => setConfig(false)} onSaved={(prefs) => { setData({ ...data, prefs }); load(); }} />}
    </div>
  );
}

function ConfigSheet({ prefs, onClose, onSaved }) {
  const [freq, setFreq] = useState(prefs.frequency);
  const [types, setTypes] = useState(prefs.types);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try { const { prefs: p } = await api('/api/reminders/prefs', { method: 'PATCH', body: { frequency: freq, types } }); onSaved(p); onClose(); }
    finally { setSaving(false); }
  }
  return (
    <Sheet title="Preferências" onClose={onClose}>
      <p className="text-sm font-medium text-ink-2 mb-2">Frequência</p>
      <div className="flex gap-2 mb-4">{FREQ.map(([v, l]) => <Chip key={v} active={freq === v} onClick={() => setFreq(v)}>{l}</Chip>)}</div>
      <p className="text-sm font-medium text-ink-2 mb-2">Tipos de lembrete</p>
      <Card className="!p-0 mb-4">
        {TYPES.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTypes({ ...types, [k]: !types[k] })} className="w-full flex items-center justify-between px-4 py-3 border-b border-line last:border-0">
            <span className="text-[.95rem]">{l}</span>
            <span className={`w-11 h-6 rounded-full transition-colors relative ${types[k] ? 'bg-accent' : 'bg-[var(--line-2)]'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${types[k] ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>
        ))}
      </Card>
      <div className="flex items-center gap-2.5 rounded-card bg-accent-soft/60 px-4 py-3 mb-5 text-sm text-accent-press">
        <Icon name="shield" size={18} /> Limitamos os lembretes para nunca virarem excesso ou cobrança.
      </div>
      <Btn block disabled={saving} onClick={save}>{saving ? <Spinner /> : 'Salvar preferências'}</Btn>
    </Sheet>
  );
}
