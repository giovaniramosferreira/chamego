import { useCallback, useEffect, useRef, useState } from 'react';
import { api, apiUpload } from '../lib/api.js';
import { useSession } from '../lib/session-context.js';
import I from './icons';
import { useGo } from './nav';
import { AppHeader, BigHeader, EmptyState, Row, Chip, Field, Chk } from './ui';

export const REAL_APP_API_PATHS = [
  '/api/me', '/api/events', '/api/lists', '/api/moments', '/api/connection',
  '/api/messages', '/api/plans', '/api/gifts', '/api/date-ideas',
  '/api/weekly-summary', '/api/reminders', '/api/achievements',
  '/api/quizzes', '/api/time-capsules', '/api/albums',
  '/api/intimacy/prompts', '/api/subscription',
];

const todayISO = () => new Date().toLocaleDateString('en-CA');
const fmtDate = (iso) => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const firstName = (user) => (user?.name || user?.email || 'Você').split(/[\s@]/)[0];
const initials = (name) => (name || 'C')[0]?.toUpperCase() || 'C';

function useApiData(loader) {
  const loaderRef = useRef(loader);
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => { loaderRef.current = loader; }, [loader]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        const data = await loaderRef.current();
        if (active) setState({ loading: false, error: '', data });
      } catch (e) {
        if (active) setState({ loading: false, error: e.message || 'Erro ao carregar', data: null });
      }
    }
    queueMicrotask(run);
    return () => { active = false; };
  }, [reloadKey]);

  return { ...state, reload };
}

function Loading() {
  return <div className="card mb-md muted">Carregando...</div>;
}

function ErrorBox({ error, onRetry }) {
  return (
    <div className="empty-state">
      <div className="e-icon"><I name="close" size={22} /></div>
      <h3>Algo não carregou</h3>
      <p>{error}</p>
      <button className="btn btn-primary" onClick={onRetry}>Tentar de novo</button>
    </div>
  );
}

function DataGate({ state, empty, children }) {
  if (state.loading) return <Loading />;
  if (state.error) return <ErrorBox error={state.error} onRetry={state.reload} />;
  if (empty?.(state.data)) return children(state.data, true);
  return children(state.data, false);
}

function HomeRoot() {
  const go = useGo();
  const { user, couple, partner } = useSession();
  const [now] = useState(() => Date.now());
  const state = useApiData(async () => {
    const [events, lists, connection, summary, reminders] = await Promise.all([
      api('/api/events'), api('/api/lists'), api('/api/connection'), api('/api/weekly-summary'), api('/api/reminders'),
    ]);
    return { events: events.events, lists: lists.lists, connection, summary: summary.summary, reminders: reminders.reminders };
  }, []);
  const days = couple?.milestone_date ? Math.max(0, Math.floor((now - new Date(`${couple.milestone_date}T00:00:00`).getTime()) / 86400000)) : 0;

  return (
    <div className="screen-scroll">
      <BigHeader title={`Boa vinda, ${partner ? couple.name : firstName(user)}`} sub={partner ? null : 'Você está usando o Chamego sozinho(a) por enquanto.'} initials={initials(user?.name || user?.email)} />
      {!partner && (
        <div className="card mb-md" style={{ display: 'flex', gap: '.9rem', alignItems: 'center' }}>
          <div className="r-icon"><I name="together" /></div>
          <div style={{ flex: 1 }}><div className="r-title">Convide seu par</div><div className="r-sub">Compartilhe o espaço quando quiser</div></div>
          <button className="btn btn-primary btn-sm" onClick={() => go('config-hub')}>Convidar</button>
        </div>
      )}
      <div className="card mb-md" style={{ textAlign: 'center' }}>
        <div className="section-title" style={{ marginTop: 0 }}>{couple?.milestone_label || 'Juntos há'}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.6rem', color: 'var(--accent)' }}>{days}<span style={{ fontSize: '1.1rem', color: 'var(--ink-2)' }}> dias</span></div>
        <div className="muted" style={{ fontSize: '.85rem' }}>desde {fmtDate(couple?.milestone_date)}</div>
      </div>
      <DataGate state={state}>{({ events, lists, connection, summary, reminders }) => (
        <>
          <div className="stat-grid mb-md">
            <div className="stat-cell"><div className="s-num">{summary.eventsCount}</div><div className="s-lab">eventos</div></div>
            <div className="stat-cell"><div className="s-num">{summary.listsCount}</div><div className="s-lab">listas</div></div>
            <div className="stat-cell"><div className="s-num">{summary.momentsCount}</div><div className="s-lab">momentos</div></div>
            <div className="stat-cell"><div className="s-num">{summary.activeGoals}</div><div className="s-lab">metas</div></div>
          </div>
          <div className="section-title">Próximo evento</div>
          {events.find(e => e.date >= todayISO()) ? (
            <Row icon="calendar" title={events.find(e => e.date >= todayISO()).title} sub={fmtDate(events.find(e => e.date >= todayISO()).date)} go="agenda-root" right="chev" />
          ) : <Row icon="calendar" title="Nenhum evento marcado" sub="Crie o próximo compromisso" go="event-create" right="chev" />}
          <div className="section-title">Listas recentes</div>
          <div className="row-list mb-md">
            {lists.slice(0, 2).map(l => <Row key={l.id} icon={l.icon || 'list'} title={l.title} sub={`${l.done} de ${l.total} concluídos`} go="list-detail" right="chev" />)}
            {!lists.length && <Row icon="list" title="Nenhuma lista ainda" sub="Crie uma lista compartilhada" go="lista-create" right="chev" />}
          </div>
          <div className="section-title">Conexão</div>
          <Row icon="heart" title={connection.myCheckin ? `Check-in: ${connection.myCheckin.mood}` : 'Fazer check-in de hoje'} sub={reminders[0]?.title} go="checkin" right="chev" />
        </>
      )}</DataGate>
    </div>
  );
}

function AgendaRoot() {
  const go = useGo();
  const state = useApiData(() => api('/api/events'), []);
  return (
    <div className="screen-scroll">
      <BigHeader title="Agenda" />
      <button className="btn btn-primary btn-block mb-md" onClick={() => go('event-create')}><I name="plus" size={15} stroke="#fff" /> Novo evento</button>
      <DataGate state={state} empty={(d) => !d.events.length}>{(data, empty) => empty ? (
        <EmptyState icon="calendar" title="Nada marcado" text="Adicione o próximo compromisso de vocês."><button className="btn btn-primary" onClick={() => go('event-create')}>Criar evento</button></EmptyState>
      ) : (
        <div className="row-list">
          {data.events.map(e => <Row key={e.id} icon="calendar" title={e.title} sub={`${fmtDate(e.date)}${e.time ? ` · ${e.time}` : ''}${e.location ? ` · ${e.location}` : ''}`} go="event-detail" right="chev" />)}
        </div>
      )}</DataGate>
      <FeatLinks />
    </div>
  );
}

function EventCreate() {
  const go = useGo();
  const [f, setF] = useState({ title: '', date: todayISO(), time: '', location: '', notes: '' });
  const [saving, setSaving] = useState(false);
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try { await api('/api/events', { method: 'POST', body: f }); go('agenda-root'); } finally { setSaving(false); }
  }
  return (
    <div className="screen-scroll">
      <AppHeader close title="Novo evento" />
      <form onSubmit={save}>
        <Field label="Título"><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} required /></Field>
        <Field label="Data"><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} required /></Field>
        <Field label="Hora"><input type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} /></Field>
        <Field label="Local"><input value={f.location} onChange={e => setF({ ...f, location: e.target.value })} /></Field>
        <Field label="Notas"><textarea value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></Field>
        <button className="btn btn-primary btn-block" disabled={saving}>{saving ? 'Salvando...' : 'Salvar evento'}</button>
      </form>
    </div>
  );
}

function EventDetail() {
  const state = useApiData(() => api('/api/events'), []);
  return <DetailList title="Evento" state={state} pick={(d) => d.events[0]} fields={(e) => e ? [[e.title, `${fmtDate(e.date)} ${e.time || ''}`], ['Local', e.location || 'Sem local'], ['Notas', e.notes || 'Sem notas']] : []} />;
}

function ListasRoot() {
  const go = useGo();
  const state = useApiData(() => api('/api/lists'), []);
  return (
    <div className="screen-scroll">
      <BigHeader title="Listas" />
      <button className="btn btn-primary btn-block mb-md" onClick={() => go('lista-create')}><I name="plus" size={15} stroke="#fff" /> Nova lista</button>
      <Row icon="target" title="Planos e sonhos" sub="Metas grandes com etapas" go="planos-root" right="chev" />
      <DataGate state={state} empty={(d) => !d.lists.length}>{(data, empty) => empty ? (
        <EmptyState icon="list" title="Sem listas ainda" text="Crie compras, tarefas ou wishlist."><button className="btn btn-primary" onClick={() => go('lista-create')}>Criar lista</button></EmptyState>
      ) : (
        <div className="row-list mb-md">{data.lists.map(l => <Row key={l.id} icon={l.icon || 'list'} title={l.title} sub={`${l.done} de ${l.total} concluídos · ${l.kind}`} go="list-detail" right="chev" />)}</div>
      )}</DataGate>
    </div>
  );
}

function ListaCreate() {
  const go = useGo();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('shared');
  async function save(e) {
    e.preventDefault();
    await api('/api/lists', { method: 'POST', body: { title, kind, icon: kind === 'wishlist' ? 'star' : 'list' } });
    go('listas-root');
  }
  return (
    <div className="screen-scroll">
      <AppHeader close title="Nova lista" />
      <form onSubmit={save}>
        <Field label="Nome"><input value={title} onChange={e => setTitle(e.target.value)} required /></Field>
        <div className="chip-row mb-md">{['shared', 'individual', 'wishlist'].map(k => <Chip key={k} on={kind === k} onClick={() => setKind(k)}>{k}</Chip>)}</div>
        <button className="btn btn-primary btn-block">Criar lista</button>
      </form>
    </div>
  );
}

function ListDetail() {
  const state = useApiData(async () => {
    const { lists } = await api('/api/lists');
    if (!lists[0]) return { list: null };
    return api(`/api/lists/${lists[0].id}`);
  }, []);
  return (
    <div className="screen-scroll">
      <AppHeader back title="Lista" />
      <DataGate state={state} empty={(d) => !d.list}>{(data, empty) => empty ? <EmptyState icon="list" title="Nenhuma lista" text="Crie uma lista primeiro." /> : <ListItems list={data.list} />}</DataGate>
    </div>
  );
}

function ListItems({ list }) {
  const [text, setText] = useState('');
  const [items, setItems] = useState(list.items || []);
  async function add(e) {
    e.preventDefault();
    const out = await api(`/api/lists/${list.id}/items`, { method: 'POST', body: { text } });
    setItems(out.list.items); setText('');
  }
  async function toggle(item) {
    const out = await api(`/api/items/${item.id}`, { method: 'PATCH', body: { done: !item.done } });
    setItems(out.list.items);
  }
  return (
    <>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>{list.title}</h2>
      <div className="row-list mb-md">{items.map(i => <Row key={i.id} lead={<Chk checked={!!i.done} onClick={() => toggle(i)} />} title={i.text} done={!!i.done} />)}</div>
      <form onSubmit={add} className="card">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Novo item" style={{ width: '100%', marginBottom: 10 }} />
        <button className="btn btn-primary btn-block">Adicionar</button>
      </form>
    </>
  );
}

function MomentosRoot() {
  const go = useGo();
  const state = useApiData(() => api('/api/moments'), []);
  return (
    <div className="screen-scroll">
      <BigHeader title="Momentos" />
      <div className="chip-row mb-md"><Chip on>Timeline</Chip><Chip go="album-root">Álbuns</Chip><Chip go="capsula-root">Cápsulas</Chip></div>
      <button className="btn btn-primary btn-block mb-md" onClick={() => go('moment-add')}><I name="plus" size={15} stroke="#fff" /> Novo momento</button>
      <DataGate state={state} empty={(d) => !d.moments.length}>{(data, empty) => empty ? <EmptyState icon="image" title="Linha do tempo vazia" text="Registre uma foto ou frase." /> : (
        data.moments.map(m => <div key={m.id} className="timeline-item"><div className="t-rail" /><div className="t-body"><div className="t-date">{fmtDate(m.date)}</div><div className="t-text">{m.text}</div>{m.photos?.[0] && <img src={m.photos[0]} alt="" />}</div></div>)
      )}</DataGate>
    </div>
  );
}

function MomentAdd() {
  const go = useGo();
  const [text, setText] = useState('');
  const [date, setDate] = useState(todayISO());
  const [file, setFile] = useState(null);
  async function save(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('text', text); fd.append('date', date);
    if (file) fd.append('photo', file);
    await apiUpload('/api/moments', fd);
    go('momentos-root');
  }
  return (
    <div className="screen-scroll">
      <AppHeader close title="Novo momento" />
      <form onSubmit={save}>
        <Field label="Texto"><textarea value={text} onChange={e => setText(e.target.value)} /></Field>
        <Field label="Data"><input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Foto"><input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} /></Field>
        <button className="btn btn-primary btn-block">Publicar momento</button>
      </form>
    </div>
  );
}

function VocesRoot() {
  const state = useApiData(() => api('/api/connection'), []);
  return (
    <div className="screen-scroll">
      <BigHeader title="Vocês" />
      <Row icon="chat" title="Chat privado" sub="Mensagens do casal" go="chat" right="chev" />
      <DataGate state={state}>{(d) => (
        <>
          <div className="stat-grid mb-md">
            <div className="stat-cell"><div className="s-num">{d.stats.streak}</div><div className="s-lab">check-ins</div></div>
            <div className="stat-cell"><div className="s-num">{d.stats.activeGoals}</div><div className="s-lab">metas</div></div>
          </div>
          <div className="row-list">
            <Row icon="heart" title="Check-in de hoje" sub={d.myCheckin ? d.myCheckin.mood : 'Como você está?'} go="checkin" right="chev" />
            <Row icon="target" title="Metas do casal" sub={`${d.goals.length} registradas`} go="metas" right="chev" />
            <Row icon="chat" title="Pergunta guiada" sub={d.question} go="perguntas" right="chev" />
            <Row icon="heart" title="Quiz de compatibilidade" go="quiz-root" right="chev" />
            <Row icon="star" title="Conquistas" go="conquistas-root" right="chev" />
            <Row icon="bell" title="Lembretes" go="lembretes-root" right="chev" />
          </div>
        </>
      )}</DataGate>
    </div>
  );
}

function Checkin() {
  const go = useGo();
  const [mood, setMood] = useState('bem');
  const [note, setNote] = useState('');
  async function save() { await api('/api/checkins', { method: 'POST', body: { mood, note } }); go('voces-root'); }
  return <FormScreen title="Como você está?" onSave={save}><div className="chip-row mb-md">{['otimo', 'bem', 'neutro', 'cansado', 'apaixonado'].map(m => <Chip key={m} on={mood === m} onClick={() => setMood(m)}>{m}</Chip>)}</div><Field label="Nota"><textarea value={note} onChange={e => setNote(e.target.value)} /></Field></FormScreen>;
}

function Metas() {
  const state = useApiData(() => api('/api/connection'), []);
  return <SimpleRows title="Metas do casal" state={state} rows={(d) => d.goals.map(g => ({ icon: 'target', title: g.title, sub: g.done ? 'Concluída' : 'Em andamento' }))} />;
}

function Perguntas() {
  const state = useApiData(() => api('/api/connection'), []);
  return <SimpleRows title="Pergunta da semana" state={state} rows={(d) => [{ icon: 'chat', title: d.question, sub: 'Respondam juntos no chat' }]} />;
}

function Chat() {
  const { user } = useSession();
  const state = useApiData(() => api('/api/messages'), []);
  const [text, setText] = useState('');
  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await api('/api/messages', { method: 'POST', body: { text: text.trim() } });
    setText('');
    state.reload();
  }
  return (
    <>
      <AppHeader back title="Chat privado" />
      <div className="screen-scroll" style={{ paddingTop: 8 }}>
        <DataGate state={state}>{(d) => d.messages.length ? d.messages.map(m => <div key={m.id} className={`bubble ${m.sender_email === user.email ? 'me' : 'them'}`}>{m.text}</div>) : <EmptyState icon="chat" title="Chat vazio" text="Envie a primeira mensagem." />}</DataGate>
      </div>
      <form className="chat-input" onSubmit={send}><input value={text} onChange={e => setText(e.target.value)} placeholder="Mensagem..." /><button className="send"><I name="send" size={16} stroke="#fff" /></button></form>
    </>
  );
}

function ConfigHub() {
  const { user, couple, partner, logout, refresh } = useSession();
  const [invite, setInvite] = useState(null);
  async function makeInvite() {
    const out = await api(`/api/couples/${couple.id}/invites`, { method: 'POST' });
    setInvite(out.invite);
  }
  async function exit() { await logout(); location.href = '/'; }
  return (
    <div className="screen-scroll">
      <AppHeader back title="Configurações" />
      <Row icon="user" title={user.name || user.email} sub={user.email} go="profile" right="chev" />
      <Row icon="together" title="Perfil do casal" sub={couple.name} go="couple-profile" right="chev" />
      <Row icon="user" title="Parceiro(a)" sub={partner ? (partner.name || partner.email) : 'Ainda não conectado'} right={partner ? <Chip on>Ativo</Chip> : 'chev'} onClick={partner ? undefined : makeInvite} />
      {invite && <div className="card mb-md"><div className="r-title">Convite gerado</div><div className="r-sub">{invite.url}</div></div>}
      <Row icon="gift" title="Assinatura" go="subscription-manage" right="chev" />
      <button className="btn btn-primary btn-block mb-sm" onClick={refresh}>Sincronizar</button>
      <button className="btn btn-ghost btn-block" onClick={exit}>Sair da conta</button>
    </div>
  );
}

function Profile() {
  const { user, refresh } = useSession();
  const go = useGo();
  const [name, setName] = useState(user.name || '');
  async function save(e) { e.preventDefault(); await api('/api/me', { method: 'PATCH', body: { name } }); await refresh(); go('config-hub'); }
  return <FormScreen title="Meu perfil" onSubmit={save} submit="Salvar"><Field label="Nome"><input value={name} onChange={e => setName(e.target.value)} /></Field><Field label="Email"><input value={user.email} readOnly /></Field></FormScreen>;
}

function CoupleProfile() {
  const { couple, refresh } = useSession();
  const go = useGo();
  const [name, setName] = useState(couple.name);
  const [date, setDate] = useState(couple.milestone_date);
  async function save(e) { e.preventDefault(); await api(`/api/couples/${couple.id}`, { method: 'PATCH', body: { name, milestoneDate: date } }); await refresh(); go('config-hub'); }
  return <FormScreen title="Perfil do casal" onSubmit={save} submit="Salvar"><Field label="Nome"><input value={name} onChange={e => setName(e.target.value)} /></Field><Field label="Data principal"><input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field></FormScreen>;
}

function PlansRoot() {
  const go = useGo();
  const state = useApiData(() => api('/api/plans'), []);
  return <ResourceList title="Planos e sonhos" state={state} items={(d) => d.plans} emptyIcon="target" emptyTitle="Nenhum plano ainda" create={() => go('plano-create')} render={(p) => <Row key={p.id} icon="target" title={p.title} sub={`${p.steps.filter(s => s.done).length} de ${p.steps.length} etapas · ${p.target_date ? fmtDate(p.target_date) : 'sem prazo'}`} go="plano-detail" right="chev" />} />;
}

function PlanoCreate() {
  const go = useGo();
  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [steps, setSteps] = useState('Definir combinados\nDar o primeiro passo');
  async function save(e) { e.preventDefault(); await api('/api/plans', { method: 'POST', body: { title, targetDate, steps: steps.split('\n').filter(Boolean) } }); go('planos-root'); }
  return <FormScreen title="Novo plano" onSubmit={save} submit="Criar plano"><Field label="Título"><input value={title} onChange={e => setTitle(e.target.value)} required /></Field><Field label="Prazo"><input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} /></Field><Field label="Etapas"><textarea value={steps} onChange={e => setSteps(e.target.value)} /></Field></FormScreen>;
}

function PlanoDetail() {
  const state = useApiData(() => api('/api/plans'), []);
  return <DetailList title="Plano" state={state} pick={(d) => d.plans[0]} fields={(p) => p ? [[p.title, p.category || 'Plano do casal'], ['Prazo', fmtDate(p.target_date)], ['Etapas', p.steps.map(s => `${s.done ? '✓' : '•'} ${s.title}`).join('\n')]] : []} />;
}

function PresentesRoot() {
  const go = useGo();
  const state = useApiData(() => api('/api/gifts'), []);
  return <ResourceList title="Presentes & datas" state={state} items={(d) => d.gifts} emptyIcon="gift" emptyTitle="Nenhuma data cadastrada" create={() => go('presente-add')} render={(g) => <Row key={g.id} icon="gift" title={g.title} sub={`${g.person || 'Pessoa'} · ${fmtDate(g.date)} · ${g.ideas.length} ideias`} go="presente-item" right="chev" />} />;
}

function PresenteAdd() {
  const go = useGo();
  const [f, setF] = useState({ title: '', person: '', date: '', budget: 0, ideas: '' });
  async function save(e) { e.preventDefault(); await api('/api/gifts', { method: 'POST', body: { ...f, ideas: f.ideas.split('\n').filter(Boolean) } }); go('presentes-root'); }
  return <FormScreen title="Nova data ou presente" onSubmit={save} submit="Salvar"><Field label="Título"><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} required /></Field><Field label="Pessoa"><input value={f.person} onChange={e => setF({ ...f, person: e.target.value })} /></Field><Field label="Data"><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field><Field label="Ideias"><textarea value={f.ideas} onChange={e => setF({ ...f, ideas: e.target.value })} /></Field></FormScreen>;
}

function PresenteItem() {
  const state = useApiData(() => api('/api/gifts'), []);
  return <DetailList title="Presente" state={state} pick={(d) => d.gifts[0]} fields={(g) => g ? [[g.title, fmtDate(g.date)], ['Pessoa', g.person], ['Ideias', g.ideas.join('\n')], ['Orçamento', `R$ ${g.budget || 0}`]] : []} />;
}

function DateHub() {
  const state = useApiData(() => api('/api/date-ideas'), []);
  async function save(id, reload) { await api('/api/date-ideas/saved', { method: 'POST', body: { ideaId: id } }); reload(); }
  return (
    <div className="screen-scroll">
      <AppHeader back title="Ideias pra vocês" />
      <DataGate state={state}>{(d) => <div className="row-list">{d.ideas.map(i => <Row key={i.id} icon="star" title={i.title} sub={`${i.vibe} · ${i.budget} · ${i.duration}`} right={<Chip on={i.saved} onClick={() => save(i.id, state.reload)}>{i.saved ? 'Salva' : 'Salvar'}</Chip>} />)}</div>}</DataGate>
    </div>
  );
}

function DateDetail() { return DateHub(); }
function DateSaved() { return DateHub(); }

function ResumoSemanal() {
  const state = useApiData(() => api('/api/weekly-summary'), []);
  return <SimpleRows title="Resumo semanal" state={state} rows={(d) => Object.entries(d.summary).map(([k, v]) => ({ icon: 'star', title: labels[k] || k, sub: String(v) }))} />;
}

function LembretesRoot() {
  const state = useApiData(() => api('/api/reminders'), []);
  return <SimpleRows title="Lembretes de carinho" state={state} rows={(d) => d.reminders.map(r => ({ icon: r.icon, title: r.title, sub: 'Sugestão do Chamego' }))} />;
}

function ConquistasRoot() {
  const state = useApiData(() => api('/api/achievements'), []);
  return <SimpleRows title="Conquistas" state={state} rows={(d) => d.achievements.map(a => ({ icon: a.unlocked ? 'star' : 'lock', title: a.title, sub: a.unlocked ? 'Desbloqueada' : 'Em progresso' }))} />;
}

function QuizRoot() {
  const state = useApiData(() => api('/api/quizzes'), []);
  const go = useGo();
  return <ResourceList title="Quizzes" state={state} items={(d) => d.quizzes} emptyIcon="chat" emptyTitle="Nenhum quiz" create={null} render={(q) => <Row key={q.id} icon="chat" title={q.title} sub={q.answered ? 'Respondido' : `${q.questions.length} perguntas`} onClick={() => go('quiz-play')} right="chev" />} />;
}

function QuizPlay() {
  const state = useApiData(() => api('/api/quizzes'), []);
  const go = useGo();
  async function answer(quiz) {
    await api(`/api/quizzes/${quiz.id}/answers`, { method: 'POST', body: { answers: quiz.questions.map(q => ({ questionId: q.id, option: q.options[0] })) } });
    go('quiz-root');
  }
  return <div className="screen-scroll"><AppHeader back title="Responder quiz" /><DataGate state={state}>{(d) => d.quizzes[0] ? <><h2>{d.quizzes[0].title}</h2><div className="row-list mb-md">{d.quizzes[0].questions.map(q => <Row key={q.id} icon="chat" title={q.text} sub={q.options[0]} />)}</div><button className="btn btn-primary btn-block" onClick={() => answer(d.quizzes[0])}>Salvar respostas rápidas</button></> : <EmptyState icon="chat" title="Nenhum quiz" text="Volte depois." />}</DataGate></div>;
}

function QuizWait() { return QuizRoot(); }
function QuizResult() { return QuizRoot(); }

function CapsulaRoot() {
  const go = useGo();
  const state = useApiData(() => api('/api/time-capsules'), []);
  return <ResourceList title="Cápsula do tempo" state={state} items={(d) => d.capsules} emptyIcon="clock" emptyTitle="Nenhuma cápsula" create={() => go('capsula-create')} render={(c) => <Row key={c.id} icon="gift" title={c.title} sub={`Abre em ${fmtDate(c.open_date)}`} go="capsula-open" right="chev" />} />;
}

function CapsulaCreate() {
  const go = useGo();
  const [f, setF] = useState({ title: '', message: '', openDate: todayISO() });
  async function save(e) { e.preventDefault(); await api('/api/time-capsules', { method: 'POST', body: f }); go('capsula-root'); }
  return <FormScreen title="Nova cápsula" onSubmit={save} submit="Selar cápsula"><Field label="Título"><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} required /></Field><Field label="Mensagem"><textarea value={f.message} onChange={e => setF({ ...f, message: e.target.value })} /></Field><Field label="Abrir em"><input type="date" value={f.openDate} onChange={e => setF({ ...f, openDate: e.target.value })} /></Field></FormScreen>;
}

function CapsulaOpen() {
  const state = useApiData(() => api('/api/time-capsules'), []);
  return <DetailList title="Cápsula" state={state} pick={(d) => d.capsules[0]} fields={(c) => c ? [[c.title, `Abre em ${fmtDate(c.open_date)}`], ['Mensagem', c.message]] : []} />;
}
function CapsulaHistorico() { return CapsulaRoot(); }

function AlbumRoot() {
  const go = useGo();
  const state = useApiData(() => api('/api/albums'), []);
  return <ResourceList title="Álbuns" state={state} items={(d) => d.albums} emptyIcon="image" emptyTitle="Nenhum álbum" create={() => go('album-editor')} render={(a) => <Row key={a.id} icon="image" title={a.title} sub={`${a.momentIds?.length || 0} momentos`} go="album-editor" right="chev" />} />;
}

function AlbumEditor() {
  const go = useGo();
  const [title, setTitle] = useState('Nossa retrospectiva');
  async function save(e) { e.preventDefault(); await api('/api/albums', { method: 'POST', body: { title } }); go('album-root'); }
  return <FormScreen title="Revisar álbum" onSubmit={save} submit="Salvar álbum"><Field label="Título"><input value={title} onChange={e => setTitle(e.target.value)} /></Field><p className="muted mb-md">O álbum usa os momentos já registrados.</p></FormScreen>;
}

function IntimidadeRoot() {
  const state = useApiData(() => api('/api/intimacy/prompts'), []);
  return <SimpleRows title="Conexão" state={state} rows={(d) => d.prompts.map(p => ({ icon: 'heart', title: p.text, sub: p.tone }))} action="intimidade-carta" />;
}

function IntimidadeCarta() {
  const go = useGo();
  const state = useApiData(() => api('/api/intimacy/prompts'), []);
  const [note, setNote] = useState('');
  async function save(prompt) { await api('/api/intimacy/sessions', { method: 'POST', body: { promptId: prompt.id, note } }); go('intimidade-root'); }
  return <div className="screen-scroll"><AppHeader back title="Conversa" /><DataGate state={state}>{(d) => d.prompts[0] ? <><div className="prompt-card mb-md"><p>{d.prompts[0].text}</p></div><Field label="Nota"><textarea value={note} onChange={e => setNote(e.target.value)} /></Field><button className="btn btn-primary btn-block" onClick={() => save(d.prompts[0])}>Salvar sessão</button></> : <EmptyState icon="heart" title="Sem prompts" text="Volte depois." />}</DataGate></div>;
}
function IntimidadeLock() { return IntimidadeRoot(); }
function IntimidadeHistorico() { return IntimidadeRoot(); }

function Paywall() {
  const state = useApiData(() => api('/api/subscription'), []);
  async function premium() { await api('/api/subscription', { method: 'PATCH', body: { plan: 'premium' } }); state.reload(); }
  return <div className="screen-scroll"><AppHeader close title="Premium" /><DataGate state={state}>{(d) => <><div className="plan-card premium mb-md"><div className="r-title">Plano atual: {d.subscription.plan}</div><div className="r-sub">Entitlements: {d.subscription.entitlements.join(', ')}</div></div><button className="btn btn-primary btn-block" onClick={premium}>Ativar Premium</button></>}</DataGate></div>;
}
function PacksStore() { return Paywall(); }
function PackDetail() { return Paywall(); }
function Checkout() { return Paywall(); }
function CheckoutConfirm() { return Paywall(); }
function SubscriptionManage() { return Paywall(); }

function FeatLinks() {
  return <div className="chip-row mb-md"><Chip go="date-hub">Dates</Chip><Chip go="presentes-root">Presentes</Chip><Chip go="resumo-semanal">Resumo</Chip></div>;
}

function ResourceList({ title, state, items, emptyIcon, emptyTitle, create, render }) {
  return (
    <div className="screen-scroll">
      <AppHeader back title={title} />
      {create && <button className="btn btn-primary btn-block mb-md" onClick={create}><I name="plus" size={15} stroke="#fff" /> Criar</button>}
      <DataGate state={state} empty={(d) => !items(d).length}>{(data, empty) => empty ? <EmptyState icon={emptyIcon} title={emptyTitle} text="Nada cadastrado ainda." /> : <div className="row-list">{items(data).map(render)}</div>}</DataGate>
    </div>
  );
}

function SimpleRows({ title, state, rows, action }) {
  return <div className="screen-scroll"><AppHeader back title={title} /><DataGate state={state}>{(data) => <div className="row-list">{rows(data).map((r, i) => <Row key={i} icon={r.icon} title={r.title} sub={r.sub} go={action} right={action ? 'chev' : undefined} />)}</div>}</DataGate></div>;
}

function DetailList({ title, state, pick, fields }) {
  return <div className="screen-scroll"><AppHeader back title={title} /><DataGate state={state}>{(data) => { const item = pick(data); return item ? <div className="row-list">{fields(item).map(([t, s], i) => <Row key={i} title={t} sub={s} />)}</div> : <EmptyState icon="search" title="Nada encontrado" text="Crie um registro primeiro." />; }}</DataGate></div>;
}

function FormScreen({ title, onSubmit, onSave, submit = 'Salvar', children }) {
  const handler = onSubmit || ((e) => { e.preventDefault(); onSave?.(); });
  return <div className="screen-scroll"><AppHeader close title={title} /><form onSubmit={handler}>{children}<button className="btn btn-primary btn-block">{submit}</button></form></div>;
}

const labels = {
  eventsCount: 'Eventos',
  listsCount: 'Listas',
  momentsCount: 'Momentos',
  checkinsCount: 'Check-ins',
  activeGoals: 'Metas ativas',
};

export const REAL_APP_REGISTRY = {
  'home-root': { component: HomeRoot, tab: 'home' },
  'agenda-root': { component: AgendaRoot, tab: 'agenda' },
  'event-detail': { component: EventDetail, hideTabs: true },
  'event-create': { component: EventCreate, hideTabs: true },
  'listas-root': { component: ListasRoot, tab: 'listas' },
  'list-detail': { component: ListDetail, hideTabs: true },
  'add-item': { component: ListDetail, hideTabs: true },
  'lista-create': { component: ListaCreate, hideTabs: true },
  'momentos-root': { component: MomentosRoot, tab: 'momentos' },
  'moment-detail': { component: MomentosRoot, hideTabs: true },
  'moment-add': { component: MomentAdd, hideTabs: true },
  'diario': { component: MomentosRoot, hideTabs: true },
  'voces-root': { component: VocesRoot, tab: 'voces' },
  'checkin': { component: Checkin, hideTabs: true },
  'metas': { component: Metas, hideTabs: true },
  'perguntas': { component: Perguntas, hideTabs: true },
  'chat': { component: Chat, hideTabs: true },
  'config-hub': { component: ConfigHub, hideTabs: true },
  'profile': { component: Profile, hideTabs: true },
  'couple-profile': { component: CoupleProfile, hideTabs: true },
  'manage-partner': { component: ConfigHub, hideTabs: true },
  'notif-settings': { component: ConfigHub, hideTabs: true },
  'privacy-settings': { component: ConfigHub, hideTabs: true },
  'account-settings': { component: ConfigHub, hideTabs: true },
  'planos-root': { component: PlansRoot, hideTabs: true },
  'plano-detail': { component: PlanoDetail, hideTabs: true },
  'plano-create': { component: PlanoCreate, hideTabs: true },
  'presentes-root': { component: PresentesRoot, hideTabs: true },
  'presente-item': { component: PresenteItem, hideTabs: true },
  'presente-add': { component: PresenteAdd, hideTabs: true },
  'date-hub': { component: DateHub, hideTabs: true },
  'date-detail': { component: DateDetail, hideTabs: true },
  'date-saved': { component: DateSaved, hideTabs: true },
  'resumo-semanal': { component: ResumoSemanal, hideTabs: true },
  'resumo-historico': { component: ResumoSemanal, hideTabs: true },
  'resumo-config': { component: ResumoSemanal, hideTabs: true },
  'lembretes-root': { component: LembretesRoot, hideTabs: true },
  'lembrete-detail': { component: LembretesRoot, hideTabs: true },
  'lembretes-config': { component: LembretesRoot, hideTabs: true },
  'quiz-root': { component: QuizRoot, hideTabs: true },
  'quiz-play': { component: QuizPlay, hideTabs: true },
  'quiz-wait': { component: QuizWait, hideTabs: true },
  'quiz-result': { component: QuizResult, hideTabs: true },
  'conquistas-root': { component: ConquistasRoot, hideTabs: true },
  'conquista-detail': { component: ConquistasRoot, hideTabs: true },
  'capsula-root': { component: CapsulaRoot, hideTabs: true },
  'capsula-create': { component: CapsulaCreate, hideTabs: true },
  'capsula-open': { component: CapsulaOpen, hideTabs: true },
  'capsula-historico': { component: CapsulaHistorico, hideTabs: true },
  'album-root': { component: AlbumRoot, hideTabs: true },
  'album-editor': { component: AlbumEditor, hideTabs: true },
  'intimidade-root': { component: IntimidadeRoot, hideTabs: true },
  'intimidade-lock': { component: IntimidadeLock, hideTabs: true },
  'intimidade-carta': { component: IntimidadeCarta, hideTabs: true },
  'intimidade-historico': { component: IntimidadeHistorico, hideTabs: true },
  'packs-store': { component: PacksStore, hideTabs: true },
  'pack-detail': { component: PackDetail, hideTabs: true },
  'paywall': { component: Paywall, hideTabs: true },
  'checkout': { component: Checkout, hideTabs: true },
  'checkout-confirm': { component: CheckoutConfirm, hideTabs: true },
  'subscription-manage': { component: SubscriptionManage, hideTabs: true },
};
