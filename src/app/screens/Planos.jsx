import { useState } from 'react';
import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, JSwitch, JLoading, JErro, JPremium, EmptyState, Row, Tgl, Chip, Field } from '../ui';

function PlanosRoot() {
  const go = useGo();
  const [j, setJ] = useState('conectado');
  const solo = j === 'sozinho';

  let body;
  if (j === 'loading') body = <JLoading />;
  else if (j === 'erro') body = <JErro onRetry={() => setJ('loading')} />;
  else if (j === 'pendente') body = (
    <EmptyState icon="clock" title="Convite pendente" text="Você já pode montar planos sozinho(a). Quando o João aceitar, vocês tocam juntos.">
      <button className="btn btn-primary" style={{ marginTop: '.4rem' }} onClick={() => go('plano-create')}>Criar um plano</button>
      <button className="btn btn-ghost" onClick={() => go('invite-partner')}>Reenviar convite</button>
    </EmptyState>
  );
  else if (j === 'vazio') body = (
    <EmptyState icon="target" title="Tirem um sonho do papel" text="Viagem, morar juntos, casamento — transforme um desejo grande em etapas concretas.">
      <button className="btn btn-primary" style={{ marginTop: '.4rem' }} onClick={() => go('plano-create')}>Criar primeiro plano</button>
    </EmptyState>
  );
  else if (j === 'premium') body = (
    <JPremium
      title="Templates de planos"
      sub="Modelos prontos que já vêm com etapas para acelerar a criação."
      perks={['Morar juntos', 'Casamento', 'Viagem dos sonhos', 'Comprar o apê']}
    />
  );
  else body = (
    <>
      <div className="row-list mb-md">
        <Row icon="globe" title="Viagem pra Portugal" sub="Set 2026 · 48% concluído" go="plano-detail" right="chev" />
        <Row icon="home" title={solo ? 'Meu apê ideal' : 'Morar juntos'} sub="Sem prazo · 2 de 8 etapas" go="plano-detail" right="chev" />
        <Row icon="heart" title="Reforma da cozinha" sub="Concluído 🎉" go="plano-detail" right="chev" />
      </div>
      <div className="section-title">Comece por um template</div>
      <div className="chip-row mb-md">
        <Chip on go="plano-create">Morar juntos</Chip>
        <Chip go="plano-create">Casamento</Chip>
        <Chip locked go="paywall"><I name="lock" size={12} /> Viagem</Chip>
        <Chip locked go="paywall"><I name="lock" size={12} /> Comprar apê</Chip>
      </div>
      <button className="btn btn-primary btn-block" onClick={() => go('plano-create')}><I name="plus" size={15} stroke="#fff" /> Novo plano</button>
    </>
  );

  return (
    <div className="screen-scroll">
      <AppHeader back title="Planos e sonhos" />
      <JSwitch value={j} onChange={setJ} />
      {body}
    </div>
  );
}

function PlanoDetail() {
  return (
    <div className="screen-scroll">
      <AppHeader back actions={[{ icon: 'edit' }]} />
      <div className="plan-head mb-md">
        <div className="ph-title">Viagem pra Portugal 🇵🇹</div>
        <div className="ph-meta">Meta: setembro 2026 · compartilhado com João</div>
        <div className="ph-bar"><span style={{ width: '48%' }} /></div>
        <div className="ph-meta" style={{ marginTop: '.5rem' }}>48% concluído · 4 de 9 etapas</div>
      </div>
      <div className="section-title" style={{ marginTop: 0 }}>Etapas</div>
      <div className="card mb-md">
        <div className="step done"><div className="st-dot done"><I name="check" size={12} /></div><div><div className="st-title">Definir período e cidades</div><div className="st-sub">Lisboa, Porto e Sintra</div></div></div>
        <div className="step done"><div className="st-dot done"><I name="check" size={12} /></div><div><div className="st-title">Passagens compradas</div><div className="st-sub">João · R$ 3.900</div></div></div>
        <div className="step"><div className="st-dot" /><div><div className="st-title">Reservar hospedagem</div><div className="st-sub">Prioridade alta · até agosto</div></div></div>
        <div className="step"><div className="st-dot" /><div><div className="st-title">Montar roteiro dia a dia</div><div className="st-sub">Mari</div></div></div>
        <div className="step"><div className="st-dot" /><div><div className="st-title">Renovar passaportes</div></div></div>
      </div>
      <div className="section-title">Notas & anexos</div>
      <div className="card mb-md"><div style={{ fontSize: '.92rem', color: 'var(--ink-2)' }}>💡 Lembrar de avisar o banco sobre gastos no exterior.</div></div>
      <button className="btn btn-primary btn-block"><I name="plus" size={15} stroke="#fff" /> Adicionar etapa</button>
    </div>
  );
}

function PlanoCreate() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader close title="Novo plano" />
      <Field label="Nome do plano"><input type="text" placeholder="Ex.: Viagem dos sonhos" /></Field>
      <Field label="Meta / objetivo"><textarea placeholder="O que vocês querem alcançar?" /></Field>
      <Field label="Prazo"><input type="date" /></Field>
      <Field label="Começar com">
        <div className="chip-row"><Chip on>Do zero</Chip><Chip>Template morar juntos</Chip><Chip>Template casamento</Chip></div>
      </Field>
      <div className="row-list mb-lg">
        <Row icon="together" title="Compartilhar com meu par" right={<Tgl initial />} />
      </div>
      <button className="btn btn-primary btn-block" onClick={() => go('plano-detail')}>Criar plano</button>
    </div>
  );
}

export default {
  'planos-root': { component: PlanosRoot, hideTabs: true },
  'plano-detail': { component: PlanoDetail, hideTabs: true },
  'plano-create': { component: PlanoCreate, hideTabs: true },
};
