import { useState } from 'react';
import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, JSwitch, JLoading, JErro, JPendente, JPremium, EmptyState, Row, Chip, Field } from '../ui';

function CapsulaRoot() {
  const go = useGo();
  const [j, setJ] = useState('conectado');
  const solo = j === 'sozinho';

  let body;
  if (j === 'loading') body = <JLoading />;
  else if (j === 'erro') body = <JErro onRetry={() => setJ('loading')} />;
  else if (j === 'pendente') body = <JPendente msg="Cápsulas individuais já funcionam. As cápsulas conjuntas aparecem quando seu par entrar." />;
  else if (j === 'vazio') body = (
    <EmptyState icon="clock" title="Nenhuma cápsula ainda" text="Guarde uma mensagem, foto ou áudio para abrir em uma data especial no futuro.">
      <button className="btn btn-primary" style={{ marginTop: '.4rem' }} onClick={() => go('capsula-create')}>Criar primeira cápsula</button>
    </EmptyState>
  );
  else if (j === 'premium') body = (
    <JPremium
      title="Cápsulas avançadas"
      sub="Áudio, vídeo, temas especiais e cápsulas que se repetem todo ano."
      perks={['Áudio e vídeo', 'Temas para datas especiais', 'Cápsulas recorrentes']}
    />
  );
  else body = (
    <>
      <div className="capsule open mb-md">
        <div className="c-lock"><I name="gift" size={20} /></div>
        <div className="c-title">Pronta para abrir 🎉</div>
        <div className="c-date">Carta de 1 ano de namoro · programada por vocês</div>
        <div className="c-countdown" style={{ cursor: 'pointer' }} onClick={() => go('capsula-open')}>Abrir agora →</div>
      </div>
      <div className="section-title" style={{ marginTop: 0 }}>Guardadas para o futuro</div>
      <div className="capsule mb-md">
        <div className="c-lock"><I name="lock" size={20} /></div>
        <div className="c-title">{solo ? 'Uma carta pra mim mesma' : 'Nossa carta de fim de ano'}</div>
        <div className="c-date">Abre em 31 de dezembro de 2026</div>
        <div className="c-countdown">faltam 177 dias</div>
      </div>
      <div className="capsule mb-md">
        <div className="c-lock"><I name="lock" size={20} /></div>
        <div className="c-title">Foto do apê novo</div>
        <div className="c-date">Abre quando batermos a meta "morar juntos"</div>
        <div className="c-countdown">por evento</div>
      </div>
      <button className="btn btn-primary btn-block" onClick={() => go('capsula-create')}><I name="plus" size={15} stroke="#fff" /> Nova cápsula</button>
      <button className="btn btn-ghost btn-block" style={{ marginTop: '.6rem' }} onClick={() => go('capsula-historico')}>Cápsulas já abertas</button>
    </>
  );

  return (
    <div className="screen-scroll">
      <AppHeader back title="Cápsula do tempo" />
      <JSwitch value={j} onChange={setJ} />
      {body}
    </div>
  );
}

function CapsulaCreate() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader close title="Nova cápsula" />
      <Field label="Tipo de conteúdo">
        <div className="chip-row">
          <Chip on><I name="edit" size={12} /> Mensagem</Chip>
          <Chip><I name="image" size={12} /> Foto</Chip>
          <Chip><I name="mic" size={12} /> Áudio</Chip>
        </div>
      </Field>
      <Field label="Sua mensagem"><textarea placeholder="Escreva algo para o futuro de vocês..." /></Field>
      <Field label="Quem guarda">
        <div className="chip-row"><Chip on>Nós dois</Chip><Chip>Só eu</Chip></div>
      </Field>
      <Field label="Abrir em"><input type="date" defaultValue="2026-12-31" /></Field>
      <div className="secret-banner mb-lg"><I name="lock" size={18} /> Depois de confirmada, a cápsula fica selada até a data — nem você pode ler antes.</div>
      <button className="btn btn-primary btn-block" onClick={() => go('capsula-root')}>Selar cápsula</button>
    </div>
  );
}

function CapsulaOpen() {
  const go = useGo();
  return (
    <div className="screen-scroll" style={{ textAlign: 'center', paddingTop: '8%' }}>
      <AppHeader back />
      <div className="e-icon" style={{ width: 76, height: 76, margin: '0 auto 1.2rem' }}><I name="gift" size={30} /></div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '.3rem' }}>1 ano de namoro 💛</h3>
      <p className="muted" style={{ maxWidth: '30ch', margin: '0 auto 1.6rem' }}>Guardada há 365 dias · escrita por Mari & João</p>
      <div className="prompt-card" style={{ textAlign: 'left' }}>
        <p style={{ fontSize: '1.1rem' }}>"Se a gente está lendo isso, é porque chegamos até aqui juntos. Espero que o ano tenha sido tão bom quanto a gente sonhou naquela noite na varanda."</p>
      </div>
      <button className="btn btn-primary btn-block" style={{ marginTop: '1.4rem' }} onClick={() => go('momentos-root')}>Salvar nos momentos</button>
    </div>
  );
}

function CapsulaHistorico() {
  return (
    <div className="screen-scroll">
      <AppHeader back title="Cápsulas abertas" />
      <div className="row-list mb-md">
        <Row icon="heart" title="1 ano de namoro" sub="Aberta em 22 jun 2025" go="capsula-open" right="chev" />
        <Row icon="image" title="Primeira viagem juntos" sub="Aberta em 3 jan 2025" go="capsula-open" right="chev" />
      </div>
    </div>
  );
}

export default {
  'capsula-root': { component: CapsulaRoot, hideTabs: true },
  'capsula-create': { component: CapsulaCreate, hideTabs: true },
  'capsula-open': { component: CapsulaOpen, hideTabs: true },
  'capsula-historico': { component: CapsulaHistorico, hideTabs: true },
};
