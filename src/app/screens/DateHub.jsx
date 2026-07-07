import { useState } from 'react';
import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, JSwitch, JLoading, JErro, JPendente, JPremium, EmptyState, Row, Chip } from '../ui';

function DateHub() {
  const go = useGo();
  const [j, setJ] = useState('conectado');
  const solo = j === 'sozinho';

  let body;
  if (j === 'loading') body = <JLoading />;
  else if (j === 'erro') body = <JErro onRetry={() => setJ('loading')} />;
  else if (j === 'pendente') body = <JPendente msg="Você já pode salvar ideias sozinho(a). Quando seu par entrar, dá pra reagir e combinar juntos." />;
  else if (j === 'vazio') body = (
    <EmptyState icon="search" title="Nenhuma ideia com esses filtros" text="Tente afrouxar o orçamento ou a duração para ver mais sugestões.">
      <button className="btn btn-ghost" style={{ marginTop: '.4rem' }} onClick={() => setJ('conectado')}>Limpar filtros</button>
    </EmptyState>
  );
  else if (j === 'premium') body = (
    <JPremium
      title="Packs de experiências"
      sub="Roteiros temáticos completos: aniversário, viagem, surpresa, reconexão e mais."
      perks={['Packs sazonais e temáticos', 'Roteiros passo a passo', 'Novas ideias toda semana']}
    />
  );
  else {
    const ideas = [
      ['image', 'Piquenique ao pôr do sol', 'Ar livre · R$ · 2h'],
      ['star', 'Noite de jogos em casa', 'Em casa · grátis · flexível'],
      ['heart', 'Reviver o primeiro encontro', 'Nostalgia · R$$ · 3h'],
      ['globe', 'Rota gastronômica no bairro', 'Fora · R$$ · 2h'],
    ];
    body = (
      <>
        <div className="section-title" style={{ marginTop: 0 }}>Ajuste pra vocês</div>
        <div className="card mb-md" style={{ display: 'grid', gap: '.9rem' }}>
          <div><div className="r-title mb-sm" style={{ fontSize: '.85rem' }}>Orçamento</div><div className="chip-row"><Chip on>Grátis</Chip><Chip>R$</Chip><Chip on>R$$</Chip><Chip>R$$$</Chip></div></div>
          <div><div className="r-title mb-sm" style={{ fontSize: '.85rem' }}>Duração</div><div className="chip-row"><Chip>1h</Chip><Chip on>2–3h</Chip><Chip>Dia todo</Chip></div></div>
          <div><div className="r-title mb-sm" style={{ fontSize: '.85rem' }}>Onde</div><div className="chip-row"><Chip on>Em casa</Chip><Chip on>Fora</Chip></div></div>
          <div><div className="r-title mb-sm" style={{ fontSize: '.85rem' }}>Clima</div><div className="chip-row"><Chip on>Relax</Chip><Chip>Animado</Chip><Chip>Romântico</Chip></div></div>
        </div>
        <button className="btn btn-primary btn-block mb-md" onClick={() => setJ('loading')}><I name="star" size={15} /> Gerar sugestões</button>
        <div className="section-title" style={{ marginTop: 0 }}>{solo ? 'Sugestões pra você' : 'Sugestões pra vocês'}</div>
        <div className="row-list mb-md">
          {ideas.map(([ic, t, s]) => <Row key={t} icon={ic} title={t} sub={s} go="date-detail" right="chev" />)}
        </div>
        <div className="row locked mb-md" style={{ borderRadius: 'var(--r-card)', overflow: 'hidden', cursor: 'pointer' }} onClick={() => go('paywall')}>
          <div className="lock-badge"><I name="lock" size={13} stroke="#fff" /></div>
          <div className="r-icon"><I name="gift" /></div>
          <div className="r-body"><div className="r-title">Pack: Surpresa de aniversário</div><div className="r-sub">Roteiro completo · Premium</div></div>
        </div>
        <button className="btn btn-ghost btn-block" onClick={() => go('date-saved')}>Ver ideias salvas</button>
      </>
    );
  }

  return (
    <div className="screen-scroll">
      <AppHeader back title="Ideias pra vocês" />
      <JSwitch value={j} onChange={setJ} />
      {body}
    </div>
  );
}

function DateDetail() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader back actions={[{ icon: 'heart' }]} />
      <div className="feat-hero mb-md">
        <div className="fh-kicker">Ao ar livre · R$ · 2h</div>
        <div className="fh-title">Piquenique ao pôr do sol</div>
        <div className="fh-sub">Uma cesta simples, um bom lugar e o fim de tarde. Baixa produção, alto retorno.</div>
      </div>
      <div className="section-title" style={{ marginTop: 0 }}>O que levar</div>
      <div className="row-list mb-md">
        <Row lead={<div className="checkbox" />} title="Cesta ou canga" />
        <Row lead={<div className="checkbox" />} title="Petiscos e uma bebida" />
        <Row lead={<div className="checkbox" />} title="Uma playlist pronta" />
      </div>
      <div className="section-title">O que seu par achou</div>
      <div className="chip-row mb-md">
        <Chip on><I name="heart" size={12} /> Curti</Chip><Chip>Interesse</Chip><Chip>Depois vemos</Chip>
      </div>
      <button className="btn btn-primary btn-block mb-sm" onClick={() => go('event-create')}>Adicionar à agenda</button>
      <button className="btn btn-ghost btn-block" onClick={() => go('chat')}>Enviar pro João</button>
    </div>
  );
}

function DateSaved() {
  return (
    <div className="screen-scroll">
      <AppHeader back title="Ideias salvas" />
      <div className="row-list mb-md">
        <Row icon="image" title="Piquenique ao pôr do sol" sub="Salvo por você" go="date-detail" right={<Chip on><I name="heart" size={12} /></Chip>} />
        <Row icon="heart" title="Reviver o primeiro encontro" sub="João curtiu também" go="date-detail" right={<Chip on>💛</Chip>} />
      </div>
    </div>
  );
}

export default {
  'date-hub': { component: DateHub, hideTabs: true },
  'date-detail': { component: DateDetail, hideTabs: true },
  'date-saved': { component: DateSaved, hideTabs: true },
};
