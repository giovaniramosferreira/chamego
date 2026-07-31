import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useDataRefresh } from '../../../lib/refresh.js';
import { useSession } from '../../../lib/session-context.js';
import { useToast } from '../../../lib/toast-context.js';
import { heroDoMomento } from '../../../lib/hero.js';
import { Badge, Btn, Card, Logo, Row, RowList, Spinner, TopBar } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';
import InstallPrompt from '../../../components/InstallPrompt.jsx';
import DiscoveryCard from '../../../components/DiscoveryCard.jsx';
import InviteActions from '../../../components/InviteActions.jsx';
import ShareCounter from '../../../components/ShareCounter.jsx';

const MOODS = { ótimo: '😀', bem: '🙂', neutro: '😐', 'pra baixo': '😔', cansado: '😴', apaixonado: '🥰' };

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
  const { toast } = useToast();
  const solo = !partner;
  const firstName = (user.name || user.email).split(/[\s@]/)[0];
  const partnerName = partner?.name?.split(' ')[0] || 'Seu par';

  const [data, setData] = useState(null);
  const load = useCallback(() => {
    const today = new Date().toLocaleDateString('en-CA');
    // Ocorrências, não eventos: o aluguel é uma linha no banco e doze no ano,
    // e "Pra hoje" precisa enxergar a do mês — não a data de origem lá atrás.
    const emDuasSemanas = new Date(Date.now() + 14 * 86_400_000).toLocaleDateString('en-CA');
    Promise.all([
      api(`/api/agenda?de=${today}&ate=${emDuasSemanas}`).catch(() => ({ ocorrencias: [] })),
      api('/api/lists').catch(() => ({ lists: [] })),
      api('/api/connection').catch(() => ({})),
      // O badge de não lidas mora aqui desde que "Vocês" saiu da barra: ele
      // pendura na foto de perfil, que é a nova porta do chat.
      api('/api/badges').catch(() => ({ unread: 0 })),
    ]).then(([ag, ls, conn, bg]) => setData({
      // O que já foi resolvido (conta paga, faxina feita) não é "pra hoje".
      events: (ag.ocorrencias || [])
        .filter((o) => !o.done)
        .map((o) => ({ ...o, id: `${o.eventId}-${o.date}` }))
        .slice(0, 2),
      pending: (ls.lists || []).filter((l) => l.kind !== 'wishlist' && l.total > l.done).slice(0, 2),
      checkedIn: !!conn.myCheckin,
      partnerCheckin: conn.partnerCheckin || null,
      unread: bg.unread || 0,
    }));
  }, []);
  useEffect(() => { load(); }, [load]);
  useDataRefresh(load);

  const hero = useMemo(() => (data ? heroDoMomento({
    agora: new Date(),
    eventos: data.events,
    pendencias: data.pending,
    checkinFeito: data.checkedIn,
  }) : null), [data]);

  // O que virou hero sai da lista de baixo. Sem isso o Início mostra a mesma
  // coisa duas vezes em telas de rolagem curta — e aí a promoção não promove
  // nada, só ocupa espaço.
  const hoje = new Date().toLocaleDateString('en-CA');
  const eventos = (data?.events || []).filter((e) => {
    if (hero?.chave === 'compromisso') return e.id !== hero.refId;
    if (hero?.chave === 'dia') return e.date !== hoje;
    return true;
  });
  const pendencias = (data?.pending || [])
    .filter((l) => !(hero?.chave === `lista-${l.id}`));

  // Cutucão: um toque manda o carinho pro chat, sem abrir tela nenhuma.
  async function nudge() {
    try {
      await api('/api/messages', { method: 'POST', body: { text: 'Passei aqui só pra dizer que tô pensando em você 💛' } });
      toast('Cutucão enviado 💛', { action: { label: 'Abrir chat', onClick: () => nav('/app/voces/chat') } });
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
  }

  return (
    <div>
      <TopBar className="flex items-center justify-between pt-5 pb-2">
        <Logo className="text-xl" />
        <div className="flex items-center gap-1">
          <Link to="/app/mais" aria-label="Tudo do Chamego"
            className="w-9 h-9 rounded-full grid place-items-center text-ink-2 hover:bg-accent-soft/50">
            <Icon name="globe" size={19} />
          </Link>
          {/* A foto de perfil é a porta de "Vocês": check-in, chat e o resto do
              que é da dupla. Saiu da barra de abas pra o "+" ficar no centro. */}
          <Link to="/app/voces" aria-label="Vocês" className="relative">
            <span className="block w-9 h-9 rounded-full overflow-hidden bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)] grid place-items-center text-accent-press font-semibold text-sm">
              {user.picture ? <img src={user.picture} alt="" className="w-full h-full object-cover" /> : (firstName[0]?.toUpperCase() || '♥')}
            </span>
            {data?.unread > 0 && <Badge count={data.unread} className="absolute -top-1 -right-1" />}
          </Link>
        </div>
      </TopBar>
      <h1 className="font-display text-2xl leading-tight mb-4 pt-1">{greeting()}, {solo ? firstName : couple.name}</h1>

      {/* O topo muda com a hora: às 20h a pergunta é o jantar, de manhã é o
          dia que vem. O que sobe pra cá sai da lista de baixo — promover não
          é repetir. */}
      {hero && (
        <Card className="mb-4">
          <div className="flex items-start gap-3.5">
            <span className="flex-none w-9 h-9 rounded-full bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)] grid place-items-center text-accent-press">
              <Icon name={hero.icone} size={17} />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl leading-tight mb-0.5">{hero.titulo}</h2>
              <p className="text-sm text-ink-2">{hero.texto}</p>
            </div>
          </div>
          <Btn block className="mt-4" onClick={() => nav(hero.to)}>{hero.cta}</Btn>
        </Card>
      )}

      <InstallPrompt />

      {solo && <ConviteCard couple={couple} />}

      {/* Ver o outro é o que faz voltar todo dia — vem antes das pendências. */}
      {partner && data?.partnerCheckin && (
        <Card className="mb-4 flex items-center gap-3.5">
          <span className="flex-none w-11 h-11 rounded-full overflow-hidden bg-accent-soft grid place-items-center text-xl">
            {partner.picture ? <img src={partner.picture} alt="" className="w-full h-full object-cover" /> : (MOODS[data.partnerCheckin.mood] || '💛')}
          </span>
          <span className="flex-1 text-sm">
            <span className="font-medium">{partnerName}</span> está{' '}
            <span className="text-accent-press">{data.partnerCheckin.mood}</span> hoje {MOODS[data.partnerCheckin.mood] || ''}
            {data.partnerCheckin.note && <span className="block text-ink-2">“{data.partnerCheckin.note}”</span>}
          </span>
          <Btn onClick={() => nav('/app/voces/chat')} className="!px-4 !py-2 !text-sm">Responder</Btn>
        </Card>
      )}
      {partner && data && !data.partnerCheckin && (
        <Card className="mb-4 flex items-center gap-3.5">
          <span className="flex-none w-9 h-9 rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name="heart" size={17} /></span>
          <span className="flex-1 text-sm"><span className="font-medium">{partnerName}</span> ainda não fez o check-in de hoje</span>
          <Btn variant="ghost" onClick={nudge} className="!px-4 !py-2 !text-sm">Cutucar</Btn>
        </Card>
      )}

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Pra hoje</p>
      {data === null ? (
        <div className="py-8 text-center"><Spinner /></div>
      ) : (
        <RowList className="mb-4">
          {eventos.length > 0 ? eventos.map((e) => (
            <Row key={e.id} icon="calendar" title={e.title}
              sub={`${eventDateLabel(e.date)}${e.time ? ` · ${e.time}` : ''}${e.location ? ` · ${e.location}` : ''}`}
              onClick={() => nav('/app/agenda')} />
          )) : !hero && (
            <Row icon="calendar" title="Nenhum evento marcado" sub="Adicione o próximo date de vocês" onClick={() => nav('/app/agenda')} />
          )}
          {pendencias.map((l) => (
            <Row key={l.id} icon={l.icon || 'list'} title={l.title} sub={`${l.total - l.done} ${l.total - l.done === 1 ? 'item pendente' : 'itens pendentes'}`} onClick={() => nav(`/app/listas/${l.id}`)} />
          ))}
          {/* O que já foi resolvido some: o Início nunca repete tarefa feita. */}
          {!data.checkedIn && hero?.chave !== 'checkin' && (
            <Row icon="heart" title="Faça seu check-in de hoje" sub="Como você está?" onClick={() => nav('/app/voces')} />
          )}
        </RowList>
      )}

      <DiscoveryCard />

      {couple.milestone_date ? (
        <Card className="text-center">
          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-1">{couple.milestone_label || 'Juntos há'}</p>
          <p className="font-display text-[2.4rem] text-accent leading-none my-1">{daysTogether(couple.milestone_date)} <span className="font-sans text-lg text-ink-2">dias</span></p>
          <p className="text-sm text-ink-2">desde {formatDate(couple.milestone_date)}</p>
          <ShareCounter couple={couple} />
        </Card>
      ) : (
        <Card className="!p-0">
          <Row icon="clock" title="Definir a data de vocês" sub="Vira o contador de dias juntos" onClick={() => nav('/app/config')} />
        </Card>
      )}
    </div>
  );
}

// Convite direto do Início: compartilhar sem passar pelas Configurações.
function ConviteCard({ couple }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="mb-4">
      <div className="flex items-center gap-3.5">
        <span className="flex-none w-9 h-9 rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name="together" size={17} /></span>
        <span className="flex-1">
          <span className="block font-medium text-[.95rem]">Convide seu par</span>
          <span className="block text-sm text-ink-2">Chat, check-in do casal e quiz liberam quando ele(a) entrar</span>
        </span>
        <Btn onClick={() => setOpen(!open)} className="!px-4 !py-2 !text-sm">{open ? 'Fechar' : 'Convidar'}</Btn>
      </div>
      {open && <div className="mt-4"><InviteActions coupleId={couple.id} coupleName={couple.name} /></div>}
    </Card>
  );
}
