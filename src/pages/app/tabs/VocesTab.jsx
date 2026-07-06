import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { Card, RowList, Row, Sheet, Field, Btn, Spinner } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const MOODS = [['😀', 'ótimo'], ['🙂', 'bem'], ['😐', 'neutro'], ['😔', 'pra baixo'], ['😴', 'cansado'], ['🥰', 'apaixonado']];

function daysTogether(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(`${iso}T00:00:00`).getTime()) / 86_400_000));
}

export default function VocesTab() {
  const nav = useNavigate();
  const { couple, partner } = useSession();
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null); // 'checkin' | 'goals'

  const load = () => api('/api/connection').then(setData);
  useEffect(() => { load(); }, []);

  const stat = (n, label) => (
    <div className="flex-1 text-center">
      <div className="font-display text-2xl text-accent leading-none">{n}</div>
      <div className="text-[.7rem] text-ink-2 mt-1">{label}</div>
    </div>
  );

  return (
    <div>
      <h1 className="font-display text-[1.9rem] pt-6 pb-3">Vocês</h1>

      <Card className="!p-0 mb-4">
        <Row icon="chat" title="Chat privado"
          sub={partner ? 'Converse com seu par' : 'Convide seu par para conversar'}
          onClick={() => partner ? nav('/app/voces/chat') : nav('/app/config')} />
      </Card>

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Painel de conexão</p>
      <Card className="mb-4">
        <div className="flex justify-between">
          {stat(daysTogether(couple?.milestone_date), 'dias juntos')}
          {stat(data?.stats.streak ?? '—', 'check-ins seguidos')}
          {stat(data?.stats.activeGoals ?? '—', 'metas ativas')}
        </div>
      </Card>

      <RowList className="mb-4">
        <Row icon="heart"
          title="Check-in de hoje"
          sub={data?.myCheckin ? `Você: ${MOODS.find((m) => m[1] === data.myCheckin.mood)?.[0] || ''} ${data.myCheckin.mood}` : 'Como você está?'}
          onClick={() => setModal('checkin')} />
        <Row icon="star" title="Metas do casal"
          sub={data ? `${data.stats.activeGoals} em andamento` : '…'}
          onClick={() => setModal('goals')} />
        <Row icon="chat" title="Pergunta guiada da semana" sub={data?.question || '…'} onClick={() => setModal('question')} />
      </RowList>

      {partner && data?.partnerCheckin && (
        <Card className="flex items-center gap-3">
          <span className="text-2xl">{MOODS.find((m) => m[1] === data.partnerCheckin.mood)?.[0] || '💛'}</span>
          <div className="text-sm">
            <span className="font-medium">{partner.name || 'Seu par'}</span> está <span className="text-accent-press">{data.partnerCheckin.mood}</span> hoje
            {data.partnerCheckin.note && <div className="text-ink-2">"{data.partnerCheckin.note}"</div>}
          </div>
        </Card>
      )}

      {modal === 'checkin' && <CheckinSheet current={data?.myCheckin} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal === 'goals' && <GoalsSheet goals={data?.goals || []} onClose={() => setModal(null)} onChange={load} />}
      {modal === 'question' && (
        <Sheet title="Pergunta da semana" onClose={() => setModal(null)}>
          <p className="font-display text-2xl leading-snug mb-2">{data?.question}</p>
          <p className="text-ink-2 text-sm mb-5">Uma pergunta nova toda semana pra puxar assunto. Respondam juntos no chat 💛</p>
          <Btn block onClick={() => { setModal(null); nav('/app/voces/chat'); }}>Abrir o chat</Btn>
        </Sheet>
      )}
    </div>
  );
}

function CheckinSheet({ current, onClose, onDone }) {
  const [mood, setMood] = useState(current?.mood || '');
  const [note, setNote] = useState(current?.note || '');
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!mood) return;
    setSaving(true);
    try { await api('/api/checkins', { method: 'POST', body: { mood, note } }); onDone(); }
    finally { setSaving(false); }
  }
  return (
    <Sheet title="Check-in de hoje" onClose={onClose}>
      <p className="text-sm text-ink-2 mb-3">Como você está?</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {MOODS.map(([emoji, label]) => (
          <button key={label} onClick={() => setMood(label)}
            className={`flex flex-col items-center gap-1 rounded-card py-3 transition-all ${mood === label ? 'bg-accent-soft shadow-[inset_0_0_0_1.5px_var(--accent)]' : 'bg-surface shadow-[inset_0_0_0_1px_var(--line-2)]'}`}>
            <span className="text-2xl">{emoji}</span>
            <span className="text-xs capitalize">{label}</span>
          </button>
        ))}
      </div>
      <Field label="Quer contar algo? (opcional)" placeholder="Dia corrido mas pensando em você" value={note} onChange={(e) => setNote(e.target.value)} />
      <Btn block disabled={saving || !mood} onClick={save}>{saving ? <Spinner /> : 'Salvar check-in'}</Btn>
    </Sheet>
  );
}

function GoalsSheet({ goals, onClose, onChange }) {
  const [items, setItems] = useState(goals);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try { const { goal } = await api('/api/goals', { method: 'POST', body: { title: title.trim() } }); setItems([goal, ...items]); setTitle(''); onChange(); }
    finally { setBusy(false); }
  }
  async function toggle(g) {
    const { goal } = await api(`/api/goals/${g.id}`, { method: 'PATCH', body: { done: !g.done } });
    setItems(items.map((x) => (x.id === g.id ? goal : x))); onChange();
  }
  async function del(g) {
    await api(`/api/goals/${g.id}`, { method: 'DELETE' });
    setItems(items.filter((x) => x.id !== g.id)); onChange();
  }
  return (
    <Sheet title="Metas do casal" onClose={onClose}>
      <form onSubmit={add} className="flex gap-2 mb-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Viajar juntos em dezembro"
          className="flex-1 rounded-btn bg-surface px-4 py-3 outline-none shadow-[inset_0_0_0_1px_var(--line-2)] focus:shadow-[inset_0_0_0_1.5px_var(--accent)]" />
        <Btn type="submit" disabled={busy || !title.trim()} className="!px-4">{busy ? <Spinner /> : <Icon name="plus" size={18} />}</Btn>
      </form>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-center text-ink-2 text-sm py-4">Nenhuma meta ainda. Sonhem juntos 🌱</p>}
        {items.map((g) => (
          <div key={g.id} className="flex items-center gap-3 bg-surface rounded-card px-4 py-3 shadow-[inset_0_0_0_1px_var(--line)]">
            <button onClick={() => toggle(g)} className={`flex-none w-6 h-6 rounded-full grid place-items-center ${g.done ? 'bg-accent text-accent-ink' : 'shadow-[inset_0_0_0_1.5px_var(--line-2)]'}`}>
              {g.done ? <Icon name="check" size={14} /> : null}
            </button>
            <span className={`flex-1 text-[.95rem] ${g.done ? 'line-through text-ink-3' : ''}`}>{g.title}</span>
            <button onClick={() => del(g)} className="text-ink-3 hover:text-accent-press"><Icon name="close" size={16} /></button>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
