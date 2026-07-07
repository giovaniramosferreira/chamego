import { useState } from 'react';
import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, JSwitch, JLoading, JErro, JPendente, JPremium, EmptyState, Row, Field } from '../ui';
import janela from '../../assets/app/janela.png';
import encontro from '../../assets/app/encontro.png';
import abraco from '../../assets/app/abraco.png';
import onibus from '../../assets/app/onibus.png';

function AlbumRoot() {
  const go = useGo();
  const [j, setJ] = useState('conectado');

  let body;
  if (j === 'loading') body = <JLoading />;
  else if (j === 'erro') body = <JErro onRetry={() => setJ('loading')} />;
  else if (j === 'pendente') body = <JPendente msg="Você já pode montar álbuns. Quando seu par entrar, as memórias dele entram na história também." />;
  else if (j === 'vazio') body = (
    <EmptyState icon="image" title="Ainda sem histórias" text="Registre alguns momentos e o Chamego começa a sugerir álbuns automaticamente por período e viagem.">
      <button className="btn btn-primary" style={{ marginTop: '.4rem' }} onClick={() => go('moment-add')}>Registrar um momento</button>
    </EmptyState>
  );
  else if (j === 'premium') body = (
    <JPremium
      title="Retrospectivas & exportação"
      sub="Exportações especiais, temas de capa e retrospectivas anuais."
      perks={['Exportar em alta resolução', 'Temas e capas especiais', 'Retrospectiva "um ano atrás"']}
    />
  );
  else body = (
    <>
      <div className="section-title" style={{ marginTop: 0 }}>Sugestão pronta pra revisar</div>
      <div className="story-cover mb-md" style={{ cursor: 'pointer' }} onClick={() => go('album-editor')}>
        <img src={encontro} alt="" />
        <div><div className="sc-title">Nosso fim de semana no litoral</div><div className="sc-sub">28–30 jun · 14 fotos · gerado automaticamente</div></div>
      </div>
      <div className="section-title">Álbuns de vocês</div>
      <div className="row-list mb-md">
        <Row icon="image" title="2 anos juntos" sub="jun 2026 · 22 fotos" go="album-editor" right="chev" />
        <Row icon="globe" title="Viagem à serra" sub="abr 2026 · 31 fotos" go="album-editor" right="chev" />
      </div>
      <div className="row locked mb-md" style={{ borderRadius: 'var(--r-card)', overflow: 'hidden', cursor: 'pointer' }} onClick={() => go('paywall')}>
        <div className="lock-badge"><I name="lock" size={13} stroke="#fff" /></div>
        <div className="r-icon"><I name="star" /></div>
        <div className="r-body"><div className="r-title">Retrospectiva: um ano atrás hoje</div><div className="r-sub">Premium</div></div>
      </div>
    </>
  );

  return (
    <div className="screen-scroll">
      <AppHeader back title="Álbuns" />
      <JSwitch value={j} onChange={setJ} />
      {body}
    </div>
  );
}

function AlbumEditor() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader back title="Revisar álbum" actions={[{ icon: 'check' }]} />
      <div className="story-cover mb-md">
        <img src={encontro} alt="" />
        <div><div className="sc-title">Nosso fim de semana no litoral</div><div className="sc-sub">Toque para editar o título</div></div>
      </div>
      <Field label="Título"><input type="text" defaultValue="Nosso fim de semana no litoral" /></Field>
      <Field label="Legenda de abertura"><textarea placeholder="Como foi esse período?" defaultValue="Três dias, muito sol e a sensação de que a gente precisava disso." /></Field>
      <div className="section-title" style={{ marginTop: 0 }}>Fotos incluídas (14)</div>
      <div className="story-thumbs mb-md">
        <div><img src={janela} alt="" /></div>
        <div><img src={encontro} alt="" /></div>
        <div><img src={abraco} alt="" /></div>
        <div><img src={onibus} alt="" /></div>
        <div><img src={janela} alt="" /></div>
        <div><img src={abraco} alt="" /></div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tint)', color: 'var(--ink-2)', fontSize: '.8rem', fontWeight: 600 }}>+8</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-soft)', color: 'var(--accent-press)' }}><I name="plus" size={18} /></div>
      </div>
      <button className="btn btn-primary btn-block mb-sm" onClick={() => go('album-root')}>Salvar álbum</button>
      <button className="btn btn-ghost btn-block" onClick={() => go('chat')}>Compartilhar com o João</button>
    </div>
  );
}

export default {
  'album-root': { component: AlbumRoot, hideTabs: true },
  'album-editor': { component: AlbumEditor, hideTabs: true },
};
