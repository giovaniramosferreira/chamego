import { useState } from 'react';
import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, JSwitch, JLoading, JErro, JPendente, JPremium, EmptyState, Row, Tgl, Chip, Field } from '../ui';

function LembretesRoot() {
  const go = useGo();
  const [j, setJ] = useState('conectado');
  const solo = j === 'sozinho';

  let body;
  if (j === 'loading') body = <JLoading />;
  else if (j === 'erro') body = <JErro onRetry={() => setJ('loading')} />;
  else if (j === 'pendente') body = <JPendente msg="Alguns lembretes já valem pra você. Os que envolvem o casal chegam quando seu par entrar." />;
  else if (j === 'vazio') body = (
    <EmptyState icon="bell" title="Tudo em dia por aqui" text="Nenhum contexto pra sugerir agora. Continue usando o app e enviaremos lembretes leves quando fizer sentido.">
      <button className="btn btn-ghost" style={{ marginTop: '.4rem' }} onClick={() => go('lembretes-config')}>Ajustar preferências</button>
    </EmptyState>
  );
  else if (j === 'premium') body = (
    <JPremium
      title="Lembretes personalizados"
      sub="Sugestões mais refinadas, baseadas no ritmo e no estilo de vocês."
      perks={['Personalização por perfil', 'Sugestões mais ricas', 'Tom e frequência sob medida']}
    />
  );
  else body = (
    <>
      <p className="muted mb-md">Sugestões leves, nunca cobranças. Você decide o que fazer com cada uma.</p>
      <div className="section-title" style={{ marginTop: 0 }}>Pra hoje</div>
      <div className="row-list mb-md">
        <Row icon="chat" title="Faz 3 dias sem check-in" sub="Que tal registrar como você está?" go="lembrete-detail" right="chev" />
        <Row icon="gift" title={solo ? 'Aniversário do João em 5 dias' : 'Aniversário de vocês em 5 dias'} sub="Comece a planejar algo" go="lembrete-detail" right="chev" />
      </div>
      <div className="section-title">Quando der</div>
      <div className="row-list mb-md">
        <Row icon="target" title='Meta "viagem" parada há 2 semanas' sub="Retomar uma etapa" go="lembrete-detail" right="chev" />
        <Row icon="heart" title="Responder a pergunta da semana" go="perguntas" right="chev" />
      </div>
      <button className="btn btn-ghost btn-block" onClick={() => go('lembretes-config')}>Ajustar frequência e tipos</button>
    </>
  );

  return (
    <div className="screen-scroll">
      <AppHeader back title="Lembretes de carinho" actions={[{ icon: 'settings', go: 'lembretes-config' }]} />
      <JSwitch value={j} onChange={setJ} />
      {body}
    </div>
  );
}

function LembreteDetail() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader back />
      <div className="feat-hero mb-md">
        <div className="fh-kicker">Sugestão de carinho</div>
        <div className="fh-title">Faz 3 dias sem check-in</div>
        <div className="fh-sub">Sem cobrança — só um empurrãozinho. Um check-in rápido ajuda vocês a se sentirem por perto.</div>
      </div>
      <div className="section-title" style={{ marginTop: 0 }}>Ações rápidas</div>
      <div className="row-list mb-md">
        <Row icon="heart" title="Fazer check-in agora" go="checkin" right="chev" />
        <Row icon="chat" title="Mandar uma mensagem" go="chat" right="chev" />
        <Row icon="star" title="Planejar um momento" go="date-hub" right="chev" />
      </div>
      <button className="btn btn-ghost btn-block" onClick={() => go('lembretes-root')}>Dispensar por hoje</button>
    </div>
  );
}

function LembretesConfig() {
  return (
    <div className="screen-scroll">
      <AppHeader back title="Preferências" />
      <Field label="Frequência">
        <div className="chip-row"><Chip>Raramente</Chip><Chip on>Equilíbrio</Chip><Chip>Bastante</Chip></div>
      </Field>
      <div className="section-title" style={{ marginTop: '.4rem' }}>Tipos de lembrete</div>
      <div className="row-list mb-md">
        <Row title="Check-ins e humor" right={<Tgl initial />} />
        <Row title="Datas importantes" right={<Tgl initial />} />
        <Row title="Metas paradas" right={<Tgl initial />} />
        <Row title="Rotina muito carregada" right={<Tgl />} />
      </div>
      <div className="secret-banner"><I name="shield" size={18} /> Limitamos os lembretes para nunca virarem excesso ou cobrança.</div>
    </div>
  );
}

export default {
  'lembretes-root': { component: LembretesRoot, hideTabs: true },
  'lembrete-detail': { component: LembreteDetail, hideTabs: true },
  'lembretes-config': { component: LembretesConfig, hideTabs: true },
};
