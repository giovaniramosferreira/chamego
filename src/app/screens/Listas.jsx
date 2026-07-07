import { useState } from 'react';
import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, BigHeader, StateSwitch, EmptyState, Row, Tgl, Chk, Chip, FeatCard, Field, Fab } from '../ui';

function ListasRoot() {
  const go = useGo();
  const [est, setEst] = useState('conteudo');
  const switcher = <div style={{ paddingBottom: 6 }}><StateSwitch options={['vazio', 'conteudo']} value={est} onChange={setEst} /></div>;

  if (est === 'vazio') {
    return (
      <div className="screen-scroll">
        <BigHeader title="Listas" />
        {switcher}
        <EmptyState icon="list" title="Nenhuma lista ainda" text="Crie a primeira lista de compras ou tarefas da casa.">
          <button className="btn btn-primary" style={{ marginTop: '.6rem' }} onClick={() => go('lista-create')}>Criar lista</button>
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      <div className="screen-scroll">
        <BigHeader title="Listas" />
        {switcher}
        <div className="chip-row mb-md">
          <Chip on>Todas</Chip><Chip>Compartilhadas</Chip><Chip>Minhas</Chip><Chip>Wishlist</Chip>
        </div>

        <FeatCard icon="target" title="Planos e sonhos" sub="Viagem, morar juntos, casamento..." go="planos-root" bg="linear-gradient(150deg,#5a7d6b,#3c5648)" />

        <div className="row-list mb-md">
          <Row icon="shopping" title="Compras da semana" sub="4 de 7 concluídos · compartilhada" go="list-detail" right="chev" />
          <Row icon="home" title="Tarefas da casa" sub="2 de 5 concluídos · compartilhada" go="list-detail" right="chev" />
          <Row icon="list" title="Preparar a viagem" sub="0 de 9 concluídos · individual" go="list-detail" right="chev" />
          <Row icon="gift" title="Wishlist de presentes" sub="6 itens salvos" go="list-detail" right="chev" />
        </div>
      </div>
      <Fab go="lista-create" />
    </>
  );
}

function ListDetail() {
  const go = useGo();
  return (
    <>
      <div className="screen-scroll">
        <AppHeader back title="Compras da semana" actions={[{ icon: 'edit' }]} />
        <div className="chip-row mb-md">
          <Chip on><I name="together" size={12} /> Compartilhada</Chip>
          <Chip><I name="filter" size={12} /> Prioridade</Chip>
        </div>
        <div className="row-list mb-md">
          <Row done lead={<Chk checked />} title="Leite e ovos" />
          <Row done lead={<Chk checked />} title="Café" />
          <Row lead={<div className="checkbox" />} title="Fruta pra semana" sub="Prioridade alta · até quarta" go="add-item"
            right={<div className="avatar" style={{ width: 24, height: 24, fontSize: '.65rem' }}>M</div>} />
          <Row lead={<div className="checkbox" />} title="Detergente e sabão" sub="João" go="add-item"
            right={<div className="avatar" style={{ width: 24, height: 24, fontSize: '.65rem' }}>J</div>} />
          <Row lead={<div className="checkbox" />} title="Vinho pro jantar de sexta" sub="Repete toda semana" go="add-item" />
        </div>

        <div className="section-title">Comentários</div>
        <div className="card">
          <div style={{ fontSize: '.9rem', marginBottom: '.5rem' }}><strong>Mari:</strong> Adicionei o vinho pro jantar 🍷</div>
          <input type="text" placeholder="Comentar..." style={{ width: '100%', padding: '.6em .9em', borderRadius: 99, background: 'var(--bg-tint)', border: 'none', font: 'inherit' }} />
        </div>
      </div>
      <Fab go="add-item" />
    </>
  );
}

function AddItem() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader close title="Novo item" />
      <Field label="O que é?"><input type="text" placeholder="Ex.: Fruta pra semana" /></Field>
      <Field label="Prioridade">
        <div className="chip-row"><Chip>Baixa</Chip><Chip on>Alta</Chip><Chip>Urgente</Chip></div>
      </Field>
      <Field label="Prazo"><input type="date" /></Field>
      <Field label="Repetição">
        <select defaultValue="Não repete"><option>Não repete</option><option>Toda semana</option><option>Todo mês</option></select>
      </Field>
      <Field label="Atribuir a">
        <div className="chip-row"><Chip on>Qualquer um</Chip><Chip>Mari</Chip><Chip>João</Chip></div>
      </Field>
      <button className="btn btn-primary btn-block" onClick={() => go('list-detail')}>Adicionar item</button>
    </div>
  );
}

function ListaCreate() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader close title="Nova lista" />
      <Field label="Nome da lista"><input type="text" placeholder="Ex.: Lista de compras" /></Field>
      <Field label="Tipo">
        <div className="chip-row">
          <Chip on>Compras</Chip><Chip>Tarefas da casa</Chip><Chip>Wishlist</Chip><Chip>Personalizada</Chip>
        </div>
      </Field>
      <div className="row-list mb-lg">
        <Row icon="together" title="Compartilhar com meu par" right={<Tgl initial />} />
      </div>
      <button className="btn btn-primary btn-block" onClick={() => go('listas-root')}>Criar lista</button>
    </div>
  );
}

export default {
  'listas-root': { component: ListasRoot, tab: 'listas' },
  'list-detail': { component: ListDetail, hideTabs: true },
  'add-item': { component: AddItem, hideTabs: true },
  'lista-create': { component: ListaCreate, hideTabs: true },
};
