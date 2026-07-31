import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { useToast } from '../../../lib/toast-context.js';
import { Card, RowList, Row, Sheet, Field, Btn, Spinner, LockedRow, TopBar } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

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
      {/* A engrenagem vem pra cá porque a foto de perfil agora abre esta tela.
          Sem isso, Configurações ficaria dois toques mais longe do que era. */}
      <TopBar className="flex items-center justify-between pt-6 pb-3">
        <h1 className="font-display text-[1.9rem]">Vocês</h1>
        <button onClick={() => nav('/app/config')} aria-label="Configurações"
          className="w-9 h-9 rounded-full grid place-items-center text-ink-2 hover:bg-accent-soft/50">
          <Icon name="settings" size={19} />
        </button>
      </TopBar>

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

      {/* 2. O dia a dia da dupla */}
      <RowList className="mb-4 mt-1">
        <Row icon="target" title="Planos & metas" sub="Sonhos grandes e metas de vocês" onClick={() => nav('/app/planos')} />
        <Row icon="gift" title="Datas & presentes" sub="Aniversários, datas e ideias" onClick={() => nav('/app/presentes')} />
        {partner
          ? <Row icon="chat" title="Chat privado" sub="Conversem só entre vocês" onClick={() => nav('/app/voces/chat')} />
          : <LockedRow icon="chat" title="Chat privado" reason="Libera quando seu par entrar" onClick={() => nav('/app/config')} />}
      </RowList>

      {/* 3. Descobrir: o que existia sem porta de entrada volta a ter uma */}
      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Descobrir</p>
      <RowList className="mb-4">
        {partner
          ? <Row icon="heart" title="Quiz do casal" sub="Vejam o quanto combinam" onClick={() => nav('/app/quiz')} />
          : <LockedRow icon="heart" title="Quiz do casal" reason="Precisa dos dois respondendo" onClick={() => nav('/app/config')} />}
        <Row icon="star" title="Conquistas" sub="Os marcos de vocês" onClick={() => nav('/app/conquistas')} />
        <Row icon="calendar" title="Resumo da semana" sub="A semana em números e destaques" onClick={() => nav('/app/resumo')} />
        <Row icon="bell" title="Lembretes de carinho" sub="Sugestões leves, sem cobrança" onClick={() => nav('/app/lembretes')} />
        {partner
          ? <Row icon="shield" title="Conexão" sub="Conversas guiadas, espaço privado" onClick={() => nav('/app/intimidade')} />
          : <LockedRow icon="shield" title="Conexão" reason="Conversas guiadas a dois" onClick={() => nav('/app/config')} />}
        <Row icon="globe" title="Tudo do Chamego" sub="Ver todos os recursos" onClick={() => nav('/app/mais')} />
      </RowList>

      {checkin && <CheckinSheet current={data?.myCheckin} onClose={() => setCheckin(false)} onDone={() => { setCheckin(false); load(); }} />}
    </div>
  );
}

function CheckinSheet({ current, onClose, onDone }) {
  const { toast } = useToast();
  const [mood, setMood] = useState(current?.mood || '');
  const [note, setNote] = useState(current?.note || '');
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!mood) return;
    setSaving(true);
    try {
      await api('/api/checkins', { method: 'POST', body: { mood, note } });
      toast('Check-in de hoje registrado 💛');
      onDone();
    } catch (e) {
      toast(e.message, { tone: 'error' });
    } finally { setSaving(false); }
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
