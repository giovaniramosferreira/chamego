import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { Btn, Card, Logo, Row, RowList } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

function daysTogether(iso) {
  const ms = Date.now() - new Date(`${iso}T00:00:00`).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
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

  const [next, setNext] = useState(null);
  const [conn, setConn] = useState(null);
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    api('/api/events').then((d) => setNext((d.events || []).find((e) => e.date >= today) || false)).catch(() => setNext(false));
    api('/api/connection').then(setConn).catch(() => {});
  }, []);
  const needsCheckin = conn && !conn.myCheckin;

  return (
    <div>
      <div className="flex items-center justify-between pt-5 pb-2">
        <Logo className="text-xl" />
        <Link to="/app/config" aria-label="Configurações"
          className="w-9 h-9 rounded-full overflow-hidden bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)] grid place-items-center text-accent-press font-semibold text-sm">
          {user.picture ? <img src={user.picture} alt="" className="w-full h-full object-cover" /> : (firstName[0]?.toUpperCase() || '♥')}
        </Link>
      </div>
      <h1 className="font-display text-[1.7rem] leading-tight mb-1">
        {greeting()}, {solo ? firstName : couple.name}
      </h1>
      {solo && <p className="text-ink-2 text-sm mb-4">Você está usando o Chamego sozinho(a) por enquanto.</p>}

      {solo && (
        <Card className="mb-4 flex items-center gap-3.5">
          <span className="flex-none w-9 h-9 rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name="together" size={17} /></span>
          <span className="flex-1">
            <span className="block font-medium text-[.95rem]">Convide seu par</span>
            <span className="block text-sm text-ink-2">Compartilhe o espaço quando quiser</span>
          </span>
          <Btn to="/app/config" className="!px-4 !py-2 !text-sm">Convidar</Btn>
        </Card>
      )}

      <Card className="mb-4 text-center">
        <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-1">{couple.milestone_label || 'Juntos há'}</p>
        <p className="font-display text-[2.6rem] text-accent leading-none my-1">
          {daysTogether(couple.milestone_date)} <span className="font-sans text-lg text-ink-2">dias</span>
        </p>
        <p className="text-sm text-ink-2">desde {formatDate(couple.milestone_date)}</p>
      </Card>

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mt-6 mb-2">Do dia de vocês</p>
      <RowList>
        {next ? (
          <Row icon="calendar" title={next.title}
            sub={`${eventDateLabel(next.date)}${next.time ? ` · ${next.time}` : ''}${next.location ? ` · ${next.location}` : ''}`}
            onClick={() => nav('/app/agenda')} />
        ) : (
          <Row icon="calendar" title="Nenhum evento marcado" sub="Adicione o próximo date de vocês" onClick={() => nav('/app/agenda')} />
        )}
        <Row icon="heart"
          title={needsCheckin ? 'Faça seu check-in de hoje' : 'Check-in de hoje feito 💛'}
          sub={needsCheckin ? 'Como você está?' : 'Veja como está seu par'}
          onClick={() => nav('/app/voces')} />
      </RowList>
    </div>
  );
}
