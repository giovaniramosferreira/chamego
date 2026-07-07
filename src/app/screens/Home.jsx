import { useState } from 'react';
import I from '../icons';
import { useGo } from '../nav';
import { BigHeader, StateSwitch, EmptyState, Row, Chev, Chip, FeatCard } from '../ui';

function HomeRoot() {
  const go = useGo();
  const [est, setEst] = useState('conectado'); // vazio | sozinho | conectado
  const switcher = <StateSwitch options={['vazio', 'sozinho', 'conectado']} value={est} onChange={setEst} />;

  if (est === 'vazio') {
    return (
      <div className="screen-scroll">
        <BigHeader title="Bem-vindo(a) 👋" initials="M" />
        <div style={{ padding: '0 0 6px' }}>{switcher}</div>
        <EmptyState icon="together" title="Vamos começar" text="Crie seu primeiro evento, sua primeira lista ou registre um momento para ver tudo ganhar vida aqui.">
          <button className="btn btn-primary mb-sm" style={{ marginTop: '.6rem' }} onClick={() => go('event-create')}>Criar primeiro evento</button>
          <button className="btn btn-ghost" onClick={() => go('invite-partner')}>Convidar meu par</button>
        </EmptyState>
      </div>
    );
  }

  const solo = est === 'sozinho';
  return (
    <div className="screen-scroll">
      <BigHeader
        title={solo ? 'Boa tarde, Mariana' : 'Boa tarde, Mari & João'}
        sub={solo ? 'Você está usando o Chamego sozinha por enquanto.' : null}
        initials="M"
      />
      <div style={{ paddingBottom: 6 }}>{switcher}</div>

      {solo && (
        <div className="card mb-md" style={{ display: 'flex', alignItems: 'center', gap: '.9rem' }}>
          <div className="r-icon" style={{ background: 'var(--accent-soft)' }}><I name="together" size={17} stroke="var(--accent-press)" /></div>
          <div style={{ flex: 1 }}>
            <div className="r-title">Convide seu par</div>
            <div className="r-sub">Compartilhe o espaço quando quiser</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => go('invite-partner')}>Convidar</button>
        </div>
      )}

      <FeatCard icon="calendar" title="Resumo da semana pronto" sub={solo ? 'Sua semana em destaques' : 'Como foi a semana de vocês'} go="resumo-semanal" />

      <div className="card mb-md" style={{ textAlign: 'center' }}>
        <div className="section-title" style={{ marginTop: 0 }}>Juntos há</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.6rem', color: 'var(--accent)' }}>
          743 <span style={{ fontSize: '1.2rem', color: 'var(--ink-2)', fontFamily: 'var(--font-sans)' }}>dias</span>
        </div>
        <div className="muted" style={{ fontSize: '.85rem' }}>desde 22 de junho de 2024</div>
      </div>

      <div className="section-title">Próximo evento</div>
      <div className="event-item" style={{ paddingTop: 0 }}>
        <div className="e-time">19:30</div><div className="e-bar" />
        <div className="e-body" style={{ cursor: 'pointer' }} onClick={() => go('event-detail')}>
          <div className="e-title">Jantar de aniversário 🎂</div>
          <div className="e-sub">Sex, 5 de julho · Restaurante Oliva</div>
        </div>
      </div>

      <div className="section-title">Tarefas pendentes</div>
      <div className="row-list mb-md">
        <Row lead={<div className="checkbox" />} title="Comprar presente da Mari" sub="Compras · até sexta" go="list-detail" />
        <Row lead={<div className="checkbox" />} title="Levar roupa na lavanderia" sub="Casa · João" go="list-detail" />
      </div>

      <div className="section-title">Último check-in</div>
      <div className="card mb-md" style={{ display: 'flex', alignItems: 'center', gap: '.9rem', cursor: 'pointer' }} onClick={() => go('checkin')}>
        <div style={{ fontSize: '1.8rem' }}>😊</div>
        <div style={{ flex: 1 }}><div className="r-title">Você disse: bem, feliz</div><div className="r-sub">Hoje, 08:14</div></div>
        <Chev />
      </div>

      <div className="section-title">Um carinho pra hoje</div>
      <div className="card mb-md" style={{ display: 'flex', alignItems: 'center', gap: '.9rem', cursor: 'pointer' }} onClick={() => go('lembretes-root')}>
        <div className="r-icon"><I name="bell" size={17} stroke="var(--accent-press)" /></div>
        <div style={{ flex: 1 }}><div className="r-title">Faz 3 dias sem check-in</div><div className="r-sub">Um empurrãozinho leve, sem cobrança</div></div>
        <Chev />
      </div>

      <div className="section-title">Atalhos</div>
      <div className="chip-row mb-md">
        <Chip on go="date-hub"><I name="star" size={13} /> Planejar date</Chip>
        <Chip on go="list-detail"><I name="plus" size={13} /> Adicionar tarefa</Chip>
        <Chip on go="moment-add"><I name="image" size={13} /> Registrar momento</Chip>
        <Chip on go="agenda-root"><I name="calendar" size={13} /> Próximas datas</Chip>
      </div>
    </div>
  );
}

export default {
  'home-root': { component: HomeRoot, tab: 'home' },
};
