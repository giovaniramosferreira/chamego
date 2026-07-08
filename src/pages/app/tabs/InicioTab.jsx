import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { Btn, Card, Logo, Row, RowList, Spinner } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

function daysTogether(iso) {
  return Math.max(0, Math.floor((Date.now() - new Date(`${iso}T00:00:00`).getTime()) / 86_400_000));
}
function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
function eventDateLabel(iso) {
  const today = new Date().toLocaleDateString('en-CA');
  const tomorrow = new Date(Date.now() + 86_400_000).toLocaleDateString('en-CA');
  if (iso === today) return 'Hoje';
  if (iso === tomorrow) return 'Amanhã';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

export default function InicioTab() {
  const nav = useNavigate();
  const { user, couple, partner } = useSession();
  const solo = !partner;
  const firstName = (user.name || user.email).split(/[\s@]/)[0];

  const [data, setData] = useState(null); // { events, lists, checkedIn }
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    Promise.all([
      api('/api/events').catch(() => ({ events: [] })),
      api('/api/lists').catch(() => ({ lists: [] })),
      api('/api/connection').catch(() => ({})),
    ]).then(([ev, ls, conn]) => setData({
      events: (ev.events || []).filter((e) => e.date >= today).slice(0, 2),
      pending: (ls.lists || []).filter((l) => l.kind !== 'wishlist' && l.total > l.done).slice(0, 2),
      checkedIn: !!conn.myCheckin,
    }));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between pt-5 pb-2">
        <Logo className="text-xl" />
        <Link to="/app/config" aria-label="Configurações"
          className="w-9 h-9 rounded-full overflow-hidden bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)] grid place-items-center text-accent-press font-semibold text-sm">
          {user.picture ? <img src={user.picture} alt="" className="w-full h-full object-cover" /> : (firstName[0]?.toUpperCase() || '♥')}
        </Link>
      </div>
      <h1 className="font-display text-2xl leading-tight mb-4">{greeting()}, {solo ? firstName : couple.name}</h1>

      {solo && (
        <Card className="mb-4 flex items-center gap-3.5">
          <span className="flex-none w-9 h-9 rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name="together" size={17} /></span>
          <span className="flex-1"><span className="block font-medium text-[.95rem]">Convide seu par</span><span className="block text-sm text-ink-2">Compartilhe o espaço quando quiser</span></span>
          <Btn to="/app/config" className="!px-4 !py-2 !text-sm">Convidar</Btn>
        </Card>
      )}

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Pra hoje</p>
      {data === null ? (
        <div className="py-8 text-center"><Spinner /></div>
      ) : (
        <RowList className="mb-4">
          {data.events.length > 0 ? data.events.map((e) => (
            <Row key={e.id} icon="calendar" title={e.title}
              sub={`${eventDateLabel(e.date)}${e.time ? ` · ${e.time}` : ''}${e.location ? ` · ${e.location}` : ''}`}
              onClick={() => nav('/app/agenda')} />
          )) : (
            <Row icon="calendar" title="Nenhum evento marcado" sub="Adicione o próximo date de vocês" onClick={() => nav('/app/agenda')} />
          )}
          {data.pending.map((l) => (
            <Row key={l.id} icon={l.icon || 'list'} title={l.title} sub={`${l.total - l.done} ${l.total - l.done === 1 ? 'item pendente' : 'itens pendentes'}`} onClick={() => nav(`/app/listas/${l.id}`)} />
          ))}
          <Row icon="heart"
            title={data.checkedIn ? 'Check-in de hoje feito 💛' : 'Faça seu check-in de hoje'}
            sub={data.checkedIn ? 'Veja como está seu par' : 'Como você está?'}
            onClick={() => nav('/app/voces')} />
        </RowList>
      )}

      <Card className="text-center">
        <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-1">{couple.milestone_label || 'Juntos há'}</p>
        <p className="font-display text-[2.4rem] text-accent leading-none my-1">{daysTogether(couple.milestone_date)} <span className="font-sans text-lg text-ink-2">dias</span></p>
        <p className="text-sm text-ink-2">desde {formatDate(couple.milestone_date)}</p>
      </Card>
    </div>
  );
}
