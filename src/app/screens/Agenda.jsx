import { useState } from 'react';
import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, BigHeader, StateSwitch, Row, Tgl, Chip, FeatCard, Field } from '../ui';

function CalGrid({ monthDays, todayIdx, markedIdx, onDay }) {
  const dows = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  return (
    <div className="cal-grid">
      {dows.map((d, i) => <div key={`d${i}`} className="cal-dow">{d}</div>)}
      {monthDays.map((n, i) => (
        <div
          key={i}
          className={`cal-cell ${i === todayIdx ? 'today' : ''} ${!n ? 'muted' : ''}`}
          onClick={n ? onDay : undefined}
          style={n ? { cursor: 'pointer' } : undefined}
        >
          <span>{n || ''}</span>
          {markedIdx.includes(i) && <span className="dot" />}
        </div>
      ))}
    </div>
  );
}

function AgendaRoot() {
  const go = useGo();
  const [view, setView] = useState('mes');
  const days = [null, null, ...Array.from({ length: 31 }, (_, i) => i + 1)];
  return (
    <div className="screen-scroll">
      <BigHeader title="Agenda" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <StateSwitch options={['mes', 'semana', 'dia']} value={view} onChange={setView} />
        <button className="icon-btn" onClick={() => go('event-create')}><I name="plus" size={16} /></button>
      </div>

      <FeatCard icon="star" title="Ideias pra vocês" sub="Sugestões de date sob medida" go="date-hub" />

      {view === 'mes' && (
        <div className="card mb-md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.8rem' }}>
            <button className="icon-btn"><I name="back" size={14} /></button>
            <div style={{ fontWeight: 700 }}>Julho 2026</div>
            <button className="icon-btn" style={{ transform: 'scaleX(-1)' }}><I name="back" size={14} /></button>
          </div>
          <CalGrid monthDays={days} todayIdx={5} markedIdx={[7, 12, 20]} onDay={() => setView('dia')} />
        </div>
      )}

      {view === 'semana' && (
        <div className="week-strip mb-md">
          {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((n, i) => (
            <div key={n} className={`week-day ${i === 4 ? 'sel' : ''}`}>
              <div className="wd-name">{n}</div><div className="wd-num">{i + 1}</div>
            </div>
          ))}
        </div>
      )}

      {view === 'dia' && (
        <div className="card mb-md" style={{ textAlign: 'center' }}>
          <div className="section-title" style={{ marginTop: 0 }}>Hoje</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>Sexta, 3 de julho</div>
        </div>
      )}

      <div className="section-title">Próximos eventos</div>
      <div className="event-item">
        <div className="e-time">19:30</div><div className="e-bar" />
        <div className="e-body" style={{ cursor: 'pointer' }} onClick={() => go('event-detail')}>
          <div className="e-title">Jantar de aniversário 🎂</div><div className="e-sub">Hoje · Restaurante Oliva</div>
        </div>
      </div>
      <div className="event-item">
        <div className="e-time">09:00</div><div className="e-bar" style={{ background: 'var(--ink-3)' }} />
        <div className="e-body" style={{ cursor: 'pointer' }} onClick={() => go('event-detail')}>
          <div className="e-title">Consulta médica (individual)</div><div className="e-sub">Amanhã · só você</div>
        </div>
      </div>
      <div className="event-item">
        <div className="e-time">Todo dia</div><div className="e-bar" />
        <div className="e-body" style={{ cursor: 'pointer' }} onClick={() => go('event-detail')}>
          <div className="e-title">1 ano de namoro 💍</div><div className="e-sub">22 de agosto · data especial</div>
        </div>
      </div>

      <div className="section-title">Objetivo de dates</div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
          <div className="r-title">2 de 2 dates este mês</div>
          <Chip on>Meta batida ✓</Chip>
        </div>
        <div className="pbar"><span style={{ width: '100%' }} /></div>
        <button className="btn btn-ghost btn-block btn-sm" style={{ marginTop: '.9rem' }} onClick={() => go('date-hub')}>Planejar próximo date</button>
      </div>

      <div className="section-title">Presentes & datas especiais</div>
      <div className="row-list">
        <Row icon="gift" title="Aniversário do João" sub="17 de julho" go="presentes-root" right={<div className="countdown-pill">10 dias</div>} />
        <Row icon="heart" title="Wishlist e surpresas" sub="Planeje sem esquecer" go="presentes-root" right="chev" />
      </div>
    </div>
  );
}

function EventDetail() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader back actions={[{ icon: 'edit', go: 'event-create' }]} />
      <Chip on className="mb-sm">Compartilhado</Chip>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', marginBottom: '.3rem' }}>Jantar de aniversário 🎂</h1>
      <p className="muted mb-lg">Sexta, 5 de julho · 19:30 — 22:00</p>

      <div className="row-list mb-md">
        <Row icon="pin" title="Restaurante Oliva" sub="Rua das Flores, 120" />
        <Row icon="repeat" title="Não se repete" />
        <Row icon="bell" title="Lembrete" sub="1 hora antes" />
        <Row icon="together" title="Visível para" sub="Mari & João" />
      </div>

      <div className="section-title">Comentários</div>
      <div className="card mb-md">
        <div style={{ display: 'flex', gap: '.6rem', marginBottom: '.7rem' }}>
          <div className="avatar" style={{ width: 28, height: 28, fontSize: '.7rem' }}>J</div>
          <div>
            <div style={{ fontSize: '.9rem' }}><strong>João:</strong> Já reservei a mesa perto da janela 😊</div>
            <div className="muted" style={{ fontSize: '.76rem' }}>ontem</div>
          </div>
        </div>
        <input type="text" placeholder="Escrever um comentário..." style={{ width: '100%', padding: '.6em .9em', borderRadius: 99, background: 'var(--bg-tint)', border: 'none', font: 'inherit' }} />
      </div>

      <button className="btn btn-ghost btn-block" style={{ color: '#b23b3b' }} onClick={() => go('agenda-root')}><I name="trash" size={16} /> Excluir evento</button>
    </div>
  );
}

function EventCreate() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader close title="Novo evento" />
      <Field label="Título"><input type="text" placeholder="Ex.: Jantar de aniversário" /></Field>
      <Field label="Data"><input type="date" defaultValue="2026-07-05" /></Field>
      <Field label="Horário"><input type="text" placeholder="19:30 — 22:00" /></Field>
      <Field label="Local"><input type="text" placeholder="Opcional" /></Field>
      <Field label="Repetição">
        <select defaultValue="Não se repete"><option>Não se repete</option><option>Toda semana</option><option>Todo mês</option><option>Todo ano</option></select>
      </Field>
      <Field label="Lembrete">
        <select defaultValue="1 hora antes"><option>1 hora antes</option><option>No dia</option><option>1 dia antes</option><option>Sem lembrete</option></select>
      </Field>
      <div className="row-list mb-lg">
        <Row icon="together" title="Compartilhar com meu par" right={<Tgl initial />} />
      </div>
      <button className="btn btn-primary btn-block" onClick={() => go('event-detail')}>Salvar evento</button>
    </div>
  );
}

function DatePlanner() {
  return (
    <div className="screen-scroll">
      <AppHeader back title="Date planner" />
      <p className="muted mb-lg">Ideias rápidas pra planejar o próximo encontro de vocês.</p>
      <div className="section-title" style={{ marginTop: 0 }}>Sugestões pra vocês</div>
      <div className="row-list mb-md">
        <Row icon="image" title="Piquenique no parque" sub="Ao ar livre · leve" go="event-create" right="chev" />
        <Row icon="star" title="Noite de jogos em casa" sub="Em casa · orçamento zero" go="event-create" right="chev" />
        <Row icon="heart" title="Reviver o primeiro encontro" sub="Nostalgia" go="event-create" right="chev" />
      </div>
      <div className="section-title">Meta de frequência</div>
      <div className="card">
        <div className="r-title mb-sm">Quantos dates por mês?</div>
        <div className="chip-row">
          <Chip>1</Chip><Chip on>2</Chip><Chip>3</Chip><Chip>4+</Chip>
        </div>
      </div>
    </div>
  );
}

export default {
  'agenda-root': { component: AgendaRoot, tab: 'agenda' },
  'event-detail': { component: EventDetail, hideTabs: true },
  'event-create': { component: EventCreate, hideTabs: true },
  'date-planner': { component: DatePlanner, hideTabs: true },
};
