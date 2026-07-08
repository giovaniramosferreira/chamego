import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { Card, RowList, Row, Sheet, Field, Btn, Spinner } from '../../../ui/kit.jsx';

const MOODS = [['😀', 'ótimo'], ['🙂', 'bem'], ['😐', 'neutro'], ['😔', 'pra baixo'], ['😴', 'cansado'], ['🥰', 'apaixonado']];
const moodEmoji = (m) => MOODS.find((x) => x[1] === m)?.[0] || '💛';

export default function VocesTab() {
  const nav = useNavigate();
  const { partner } = useSession();
  const [data, setData] = useState(null);
  const [checkin, setCheckin] = useState(false);

  const load = () => api('/api/connection').then(setData).catch(() => setData({}));
  useEffect(() => { load(); }, []);

  return (
    <div>
      <h1 className="font-display text-[1.9rem] pt-6 pb-3">Vocês</h1>

      {/* 1. Check-in de hoje */}
      <Card className="!p-0 mb-3">
        <Row icon="heart" title="Check-in de hoje"
          sub={data?.myCheckin ? `Você: ${moodEmoji(data.myCheckin.mood)} ${data.myCheckin.mood}` : 'Como você está hoje?'}
          onClick={() => setCheckin(true)} />
      </Card>
      {partner && data?.partnerCheckin && (
        <Card className="mb-4 flex items-center gap-3">
          <span className="text-2xl">{moodEmoji(data.partnerCheckin.mood)}</span>
          <div className="text-sm">
            <span className="font-medium">{partner.name || 'Seu par'}</span> está <span className="text-accent-press">{data.partnerCheckin.mood}</span> hoje
            {data.partnerCheckin.note && <div className="text-ink-2">"{data.partnerCheckin.note}"</div>}
          </div>
        </Card>
      )}

      {/* 2-4. Blocos do casal */}
      <RowList className="mb-4 mt-1">
        <Row icon="target" title="Planos & metas" sub="Sonhos grandes e metas de vocês" onClick={() => nav('/app/planos')} />
        <Row icon="gift" title="Datas & presentes" sub="Aniversários, datas e ideias" onClick={() => nav('/app/presentes')} />
        <Row icon="chat" title="Chat privado" sub={partner ? 'Conversem só entre vocês' : 'Convide seu par para conversar'}
          onClick={() => (partner ? nav('/app/voces/chat') : nav('/app/config'))} />
      </RowList>

      {checkin && <CheckinSheet current={data?.myCheckin} onClose={() => setCheckin(false)} onDone={() => { setCheckin(false); load(); }} />}
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
          <button type="button" key={label} onClick={() => setMood(label)}
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
