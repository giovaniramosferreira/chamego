import { useState } from 'react';
import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, JSwitch, JLoading, JErro, JPendente, JPremium, EmptyState, Row, Tgl, Chip, Field } from '../ui';

function ResumoSemanal() {
  const go = useGo();
  const [j, setJ] = useState('conectado');
  const solo = j === 'sozinho';

  let body;
  if (j === 'loading') body = <JLoading />;
  else if (j === 'erro') body = <JErro onRetry={() => setJ('loading')} />;
  else if (j === 'pendente') body = <JPendente msg="Quando seu par entrar, o resumo passa a mostrar a semana de vocês dois." />;
  else if (j === 'vazio') body = (
    <EmptyState icon="calendar" title="Semana sem dados suficientes" text="Registre check-ins, eventos ou momentos ao longo da semana para gerar o resumo.">
      <button className="btn btn-ghost" style={{ marginTop: '.4rem' }} onClick={() => go('checkin')}>Fazer um check-in</button>
    </EmptyState>
  );
  else if (j === 'premium') body = (
    <JPremium
      title="Insights avançados"
      sub="Comparativos entre semanas, tendências de humor e destaques especiais são exclusivos do Premium."
      perks={['Comparativo histórico de semanas', 'Tendências de humor do casal', 'Destaques e marcos automáticos']}
    />
  );
  else body = (
    <>
      <div className="feat-hero mb-md">
        <div className="fh-kicker">30 jun – 6 jul</div>
        <div className="fh-title">{solo ? 'Sua semana' : 'A semana de vocês'}</div>
        <div className="fh-sub">{solo ? 'Resumo pessoal · convide seu par para o resumo de casal.' : 'Uma semana leve, com um date e boa constância nos check-ins.'}</div>
      </div>
      <div className="stat-grid mb-md">
        <div className="stat-cell"><div className="s-num">6</div><div className="s-lab">check-ins{solo ? '' : ' · vocês dois'}</div></div>
        <div className="stat-cell"><div className="s-num">4</div><div className="s-lab">eventos concluídos</div></div>
        <div className="stat-cell"><div className="s-num">9</div><div className="s-lab">tarefas fechadas</div></div>
        <div className="stat-cell"><div className="s-num">3</div><div className="s-lab">momentos registrados</div></div>
      </div>
      <div className="section-title" style={{ marginTop: 0 }}>Destaques da semana</div>
      <div className="card mb-md">
        <div className="insight"><div className="ic"><I name="heart" /></div><div className="tx">Humor predominante foi <strong>tranquilo</strong>, com dois dias mais animados no fim de semana.</div></div>
        <div className="insight"><div className="ic"><I name="star" /></div><div className="tx">{solo ? 'Você manteve' : 'Vocês mantiveram'} a meta de 1 date — jantar no Oliva na sexta.</div></div>
        <div className="insight"><div className="ic"><I name="check" /></div><div className="tx">A lista de compras foi zerada dois dias antes do previsto.</div></div>
      </div>
      {solo && (
        <div className="card mb-md" style={{ display: 'flex', alignItems: 'center', gap: '.9rem' }}>
          <div className="r-icon"><I name="together" size={17} stroke="var(--accent-press)" /></div>
          <div style={{ flex: 1 }}><div className="r-title">Convide seu par</div><div className="r-sub">Transforme em resumo de casal</div></div>
          <button className="btn btn-primary btn-sm" onClick={() => go('invite-partner')}>Convidar</button>
        </div>
      )}
      <div className="section-title">Pra próxima semana</div>
      <div className="row-list mb-md">
        <Row icon="star" title="Planejar o próximo date" sub="Que tal algo ao ar livre?" go="date-hub" right="chev" />
        <Row icon="chat" title="Responder a pergunta da semana" go="perguntas" right="chev" />
      </div>
      <div className="chip-row mb-md" style={{ padding: '0 2px' }}>
        <Chip on go="chat"><I name="send" size={13} /> Compartilhar</Chip>
        <Chip on go="momentos-root"><I name="star" size={13} /> Salvar como marco</Chip>
        <Chip onClick={() => setJ('premium')}><I name="lock" size={13} /> Insights avançados</Chip>
      </div>
      <button className="btn btn-ghost btn-block" onClick={() => go('resumo-historico')}>Ver resumos anteriores</button>
    </>
  );

  return (
    <div className="screen-scroll">
      <AppHeader back title="Resumo semanal" actions={[{ icon: 'settings', go: 'resumo-config' }]} />
      <JSwitch value={j} onChange={setJ} />
      {body}
    </div>
  );
}

function ResumoHistorico() {
  const rows = [
    ['30 jun – 6 jul', 'Uma semana leve, 1 date'],
    ['23 – 29 jun', 'Semana corrida, poucos check-ins'],
    ['16 – 22 jun', '2 anos juntos 💛'],
    ['9 – 15 jun', 'Foco na organização da casa'],
  ];
  return (
    <div className="screen-scroll">
      <AppHeader back title="Resumos anteriores" />
      <div className="row-list mb-md">
        {rows.map(([a, b]) => <Row key={a} icon="calendar" title={a} sub={b} go="resumo-semanal" right="chev" />)}
      </div>
      <p className="center-note">Resumos ficam salvos por 12 meses no plano gratuito.</p>
    </div>
  );
}

function ResumoConfig() {
  return (
    <div className="screen-scroll">
      <AppHeader back title="Entrega do resumo" />
      <Field label="Quando gerar">
        <div className="chip-row"><Chip on>Domingo à noite</Chip><Chip>Segunda de manhã</Chip><Chip>Sexta</Chip></div>
      </Field>
      <div className="row-list mb-md">
        <Row title="Notificar quando estiver pronto" right={<Tgl initial />} />
        <Row title="Incluir sugestões de próximos passos" right={<Tgl initial />} />
        <Row locked title="Comparativo entre semanas" sub="Premium" go="paywall" />
      </div>
    </div>
  );
}

export default {
  'resumo-semanal': { component: ResumoSemanal, hideTabs: true },
  'resumo-historico': { component: ResumoHistorico, hideTabs: true },
  'resumo-config': { component: ResumoConfig, hideTabs: true },
};
