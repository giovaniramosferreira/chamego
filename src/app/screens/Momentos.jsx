import { useState } from 'react';
import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, BigHeader, StateSwitch, EmptyState, Row, Tgl, Chip, Field, Fab } from '../ui';
import janela from '../../assets/app/janela.png';
import encontro from '../../assets/app/encontro.png';
import abraco from '../../assets/app/abraco.png';
import onibus from '../../assets/app/onibus.png';

function MomentosRoot() {
  const go = useGo();
  const [est, setEst] = useState('conteudo');
  const switcher = <div style={{ paddingBottom: 6 }}><StateSwitch options={['vazio', 'conteudo']} value={est} onChange={setEst} /></div>;

  if (est === 'vazio') {
    return (
      <div className="screen-scroll">
        <BigHeader title="Momentos" />
        {switcher}
        <EmptyState icon="image" title="A linha do tempo está vazia" text="Registre uma foto, uma nota ou um momento especial para começar a guardar a história de vocês.">
          <button className="btn btn-primary" style={{ marginTop: '.6rem' }} onClick={() => go('moment-add')}>Adicionar primeiro momento</button>
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      <div className="screen-scroll">
        <BigHeader title="Momentos" />
        {switcher}
        <div className="chip-row mb-md">
          <Chip on>Timeline</Chip>
          <Chip go="album-root">Álbuns</Chip>
          <Chip go="capsula-root">Cápsula do tempo</Chip>
          <Chip go="diario">Diário</Chip>
        </div>

        <div className="timeline-item">
          <div className="t-rail" />
          <div className="t-body" style={{ cursor: 'pointer' }} onClick={() => go('moment-detail')}>
            <div className="t-date">Hoje</div>
            <div className="t-text">Café da manhã na varanda, do jeitinho que a gente gosta ☕</div>
            <img src={janela} alt="" />
          </div>
        </div>
        <div className="timeline-item">
          <div className="t-rail" />
          <div className="t-body" style={{ cursor: 'pointer' }} onClick={() => go('moment-detail')}>
            <div className="t-date">28 de junho</div>
            <div className="t-text">Show que a gente esperava há meses. Perfeito.</div>
            <div className="photo-grid">
              <div><img src={encontro} alt="" /></div>
              <div><img src={abraco} alt="" /></div>
              <div><img src={onibus} alt="" /></div>
            </div>
          </div>
        </div>
        <div className="timeline-item">
          <div className="t-rail" />
          <div className="t-body">
            <div className="t-date">22 de junho · marco</div>
            <div className="t-text">2 anos juntos. Escrevemos uma cartinha um pro outro 💛</div>
          </div>
        </div>
      </div>
      <Fab go="moment-add" />
    </>
  );
}

function MomentDetail() {
  return (
    <div className="screen-scroll">
      <AppHeader back actions={[{ icon: 'edit' }]} />
      <img src={janela} style={{ width: '100%', borderRadius: 'var(--r-img)', marginBottom: '1rem' }} alt="" />
      <p className="muted mb-sm">Hoje, 08:20 · categoria: dia a dia</p>
      <p style={{ fontSize: '1.05rem', marginBottom: '1.2rem' }}>Café da manhã na varanda, do jeitinho que a gente gosta ☕ — um domingo pra guardar.</p>
      <div className="chip-row mb-lg">
        <Chip on>😍 4</Chip><Chip>😂 1</Chip><Chip><I name="heart" size={12} /></Chip>
      </div>
      <div className="section-title" style={{ marginTop: 0 }}>Comentários</div>
      <div className="card">
        <div style={{ fontSize: '.9rem', marginBottom: '.6rem' }}><strong>João:</strong> Foi um domingo perfeito 🥰</div>
        <input type="text" placeholder="Comentar..." style={{ width: '100%', padding: '.6em .9em', borderRadius: 99, background: 'var(--bg-tint)', border: 'none', font: 'inherit' }} />
      </div>
    </div>
  );
}

function MomentAdd() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader close title="Novo momento" />
      <div style={{ border: '1.5px dashed var(--line-2)', borderRadius: 'var(--r-img)', padding: '2.2rem 1rem', textAlign: 'center', marginBottom: '1.2rem', color: 'var(--ink-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><I name="camera" size={26} /></div>
        <p style={{ marginTop: '.6rem', fontSize: '.9rem' }}>Toque para adicionar fotos</p>
      </div>
      <Field label="Escreva sobre esse momento"><textarea placeholder="O que aconteceu?" /></Field>
      <Field label="Categoria">
        <div className="chip-row"><Chip on>Dia a dia</Chip><Chip>Viagem</Chip><Chip>Marco</Chip><Chip>Data especial</Chip></div>
      </Field>
      <div className="row-list mb-lg">
        <Row icon="star" title="Marcar como favorito" right={<Tgl />} />
      </div>
      <button className="btn btn-primary btn-block" onClick={() => go('momentos-root')}>Publicar momento</button>
    </div>
  );
}

function Diario() {
  return (
    <div className="screen-scroll">
      <AppHeader back title="Diário a dois" />
      <p className="muted mb-lg">Um espaço para escreverem juntos, sem pressa.</p>
      <div className="card mb-md">
        <div className="r-title mb-sm">1 de julho</div>
        <p style={{ fontSize: '.94rem', color: 'var(--ink-2)' }}>"Hoje percebi como é bom ter alguém pra dividir até os dias bobos. Te amo por isso." — Mari</p>
      </div>
      <div className="card mb-lg">
        <div className="r-title mb-sm">28 de junho</div>
        <p style={{ fontSize: '.94rem', color: 'var(--ink-2)' }}>"Show incrível. Já quero marcar o próximo." — João</p>
      </div>
      <button className="btn btn-primary btn-block"><I name="edit" size={16} /> Escrever no diário</button>
    </div>
  );
}

export default {
  'momentos-root': { component: MomentosRoot, tab: 'momentos' },
  'moment-detail': { component: MomentDetail, hideTabs: true },
  'moment-add': { component: MomentAdd, hideTabs: true },
  'diario': { component: Diario, hideTabs: true },
};
