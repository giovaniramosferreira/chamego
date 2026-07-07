import { useState } from 'react';
import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, JSwitch, JLoading, JErro, JPendente, JPremium, EmptyState, Row, Tgl, Chk, Chip, Field } from '../ui';

function PresentesRoot() {
  const go = useGo();
  const [j, setJ] = useState('conectado');

  let body;
  if (j === 'loading') body = <JLoading />;
  else if (j === 'erro') body = <JErro onRetry={() => setJ('loading')} />;
  else if (j === 'pendente') body = <JPendente msg="Wishlist e datas já funcionam pra você. A troca com seu par abre quando ele entrar." />;
  else if (j === 'vazio') body = (
    <EmptyState icon="gift" title="Nenhuma data cadastrada" text="Cadastre aniversários e datas importantes para nunca mais improvisar na última hora.">
      <button className="btn btn-primary" style={{ marginTop: '.4rem' }} onClick={() => go('presente-add')}>Adicionar data</button>
    </EmptyState>
  );
  else if (j === 'premium') body = (
    <JPremium
      title="Packs sazonais"
      sub="Ideias e templates de presente para as datas mais fortes do ano."
      perks={['Namorados, Natal e aniversários', 'Templates de surpresa', 'Sugestões por orçamento']}
    />
  );
  else body = (
    <>
      <div className="section-title" style={{ marginTop: 0 }}>Próximas datas</div>
      <div className="row-list mb-md">
        <Row icon="gift" title="Aniversário do João" sub="17 de julho" go="presente-item" right={<div className="countdown-pill">10 dias</div>} />
        <Row icon="heart" title="Aniversário de namoro" sub="22 de agosto" go="presente-item" right={<div className="countdown-pill">46 dias</div>} />
        <Row icon="star" title="Natal" sub="25 de dezembro" go="presente-item" right={<div className="countdown-pill">171 dias</div>} />
      </div>
      <div className="secret-banner mb-md"><I name="lock" size={18} /> A área de surpresa fica invisível pro seu par até você revelar.</div>
      <div className="section-title">Wishlist</div>
      <div className="row-list mb-md">
        <Row icon="shopping" title="Fone bluetooth" sub="Visível · minha lista" />
        <Row icon="image" title="Quadro pra sala" sub="Visível · nossa casa" />
      </div>
      <div className="row locked mb-md" style={{ borderRadius: 'var(--r-card)', overflow: 'hidden', cursor: 'pointer' }} onClick={() => go('paywall')}>
        <div className="lock-badge"><I name="lock" size={13} stroke="#fff" /></div>
        <div className="r-icon"><I name="gift" /></div>
        <div className="r-body"><div className="r-title">Pack: Ideias de aniversário</div><div className="r-sub">Premium sazonal</div></div>
      </div>
      <button className="btn btn-primary btn-block" onClick={() => go('presente-add')}><I name="plus" size={15} stroke="#fff" /> Nova data ou item</button>
    </>
  );

  return (
    <div className="screen-scroll">
      <AppHeader back title="Presentes & datas" />
      <JSwitch value={j} onChange={setJ} />
      {body}
    </div>
  );
}

function PresenteItem() {
  return (
    <div className="screen-scroll">
      <AppHeader back actions={[{ icon: 'edit' }]} />
      <div className="feat-hero mb-md">
        <div className="fh-kicker">Faltam 10 dias</div>
        <div className="fh-title">Aniversário do João 🎂</div>
        <div className="fh-sub">17 de julho · lembramos você com antecedência</div>
      </div>
      <div className="secret-banner mb-md"><I name="lock" size={18} /> Modo surpresa ativo — o João não vê nada desta tela.</div>
      <div className="section-title" style={{ marginTop: 0 }}>Ideias de presente</div>
      <div className="row-list mb-md">
        <Row lead={<Chk checked />} title="Fone que ele comentou" sub="R$ 350 · decidido" />
        <Row lead={<div className="checkbox" />} title="Jantar surpresa no Oliva" sub="Reservar mesa" />
        <Row lead={<div className="checkbox" />} title="Carta escrita à mão" />
      </div>
      <div className="section-title">Planejamento</div>
      <div className="card mb-md">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
          <div className="r-title" style={{ fontSize: '.92rem' }}>Orçamento</div>
          <Chip on>R$ 500</Chip>
        </div>
        <div className="pbar"><span style={{ width: '70%' }} /></div>
        <div className="muted" style={{ fontSize: '.8rem', marginTop: '.5rem' }}>R$ 350 planejado de R$ 500</div>
      </div>
      <button className="btn btn-primary btn-block"><I name="plus" size={15} stroke="#fff" /> Adicionar ideia</button>
    </div>
  );
}

function PresenteAdd() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader close title="Nova data ou item" />
      <Field label="O que é?">
        <div className="chip-row"><Chip on>Data especial</Chip><Chip>Item de wishlist</Chip></div>
      </Field>
      <Field label="Título"><input type="text" placeholder="Ex.: Aniversário do João" /></Field>
      <Field label="Data"><input type="date" /></Field>
      <Field label="Avisar com antecedência">
        <div className="chip-row"><Chip>3 dias</Chip><Chip on>1 semana</Chip><Chip>1 mês</Chip></div>
      </Field>
      <div className="row-list mb-lg">
        <Row icon="lock" title="Modo surpresa" sub="Esconder do meu par" right={<Tgl initial />} />
      </div>
      <button className="btn btn-primary btn-block" onClick={() => go('presentes-root')}>Salvar</button>
    </div>
  );
}

export default {
  'presentes-root': { component: PresentesRoot, hideTabs: true },
  'presente-item': { component: PresenteItem, hideTabs: true },
  'presente-add': { component: PresenteAdd, hideTabs: true },
};
