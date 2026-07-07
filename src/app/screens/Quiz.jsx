import { useState } from 'react';
import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, JSwitch, JLoading, JErro, JPremium, EmptyState, Row, Chip, Choice, ProgressDots } from '../ui';

function QuizRoot() {
  const go = useGo();
  const [j, setJ] = useState('conectado');

  let body;
  if (j === 'loading') body = <JLoading />;
  else if (j === 'erro') body = <JErro onRetry={() => setJ('loading')} />;
  else if (j === 'sozinho' || j === 'pendente') body = (
    <EmptyState icon="chat" title="Quiz é coisa de dois" text="Você pode responder agora, mas o comparativo só aparece quando seu par também responder.">
      <button className="btn btn-primary" style={{ marginTop: '.4rem' }} onClick={() => go('quiz-play')}>Responder mesmo assim</button>
      <button className="btn btn-ghost" onClick={() => go('invite-partner')}>Convidar meu par</button>
    </EmptyState>
  );
  else if (j === 'vazio') body = (
    <EmptyState icon="chat" title="Nenhum quiz por aqui" text="Novos quizzes leves aparecem toda semana. Volte em breve." />
  );
  else if (j === 'premium') body = (
    <JPremium
      title="Trilhas temáticas"
      sub="Quizzes exclusivos sobre rotina, sonhos, finanças, viagens e intimidade."
      perks={['Trilhas por tema', 'Resultados mais detalhados', 'Novos quizzes semanais']}
    />
  );
  else body = (
    <>
      <div className="section-title" style={{ marginTop: 0 }}>Disponíveis</div>
      <div className="row-list mb-md">
        <Row icon="heart" title="Como a gente se conhece?" sub="Concluído · 72% em sintonia" go="quiz-result" right="chev" />
        <Row icon="clock" title="Nossa rotina ideal" sub="Aguardando o João responder" go="quiz-wait" right="chev" />
        <Row icon="star" title="Fim de semana perfeito" sub="10 perguntas · 3 min" go="quiz-play" right="chev" />
        <Row locked icon="gift" title="Trilha: Sonhos & futuro" sub="Premium" go="paywall" />
      </div>
      <div className="section-title">Histórico por tema</div>
      <div className="chip-row"><Chip on>Rotina</Chip><Chip>Diversão</Chip><Chip>Intimidade</Chip><Chip>Viagens</Chip></div>
    </>
  );

  return (
    <div className="screen-scroll">
      <AppHeader back title="Quizzes" />
      <JSwitch value={j} onChange={setJ} />
      {body}
    </div>
  );
}

function QuizPlay() {
  const go = useGo();
  const [sel, setSel] = useState(-1);
  const opts = ['Sair pra algum lugar novo', 'Maratona no sofá', 'Cozinhar algo juntos', 'Cada um no seu canto, lado a lado'];
  return (
    <div className="screen-scroll">
      <AppHeader close title="Fim de semana perfeito" />
      <ProgressDots step={1} total={5} />
      <p className="muted mb-md" style={{ textAlign: 'center' }}>Pergunta 2 de 5</p>
      <div className="prompt-card mb-lg"><p>Sexta à noite, sem compromisso. O que é o ideal?</p></div>
      <div className="mb-lg">
        {opts.map((o, i) => <Choice key={i} title={o} sel={sel === i} onClick={() => setSel(i)} />)}
      </div>
      <button className="btn btn-primary btn-block" onClick={() => go('quiz-wait')}>Próxima</button>
    </div>
  );
}

function QuizWait() {
  const go = useGo();
  return (
    <div className="screen-scroll" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: '16%' }}>
      <AppHeader close />
      <div className="e-icon" style={{ width: 72, height: 72, marginBottom: '1.2rem' }}><I name="clock" size={28} /></div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '.4rem' }}>Respostas enviadas!</h3>
      <p className="muted mb-lg" style={{ maxWidth: '28ch' }}>Avisamos você assim que o João terminar. Aí liberamos o comparativo de vocês.</p>
      <button className="btn btn-ghost btn-block" onClick={() => go('chat')}>Cutucar o João 😄</button>
    </div>
  );
}

function QuizResult() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader back title="Resultado" />
      <div className="card mb-md" style={{ textAlign: 'center' }}>
        <div className="match-ring" style={{ '--pct': '72%' }}><div className="mr-num">72%</div></div>
        <div className="r-title" style={{ fontSize: '1.1rem' }}>Vocês estão em sintonia</div>
        <div className="muted" style={{ fontSize: '.88rem' }}>Concordaram em 7 de 10 respostas</div>
      </div>
      <div className="section-title" style={{ marginTop: 0 }}>Onde combinam</div>
      <div className="card mb-md">
        <div className="cmp"><div className="who">✓</div><div><div className="r-title" style={{ fontSize: '.92rem' }}>Preferem fim de semana tranquilo</div><div className="r-sub">Ambos escolheram "relaxar em casa"</div></div></div>
        <div className="cmp"><div className="who">✓</div><div><div className="r-title" style={{ fontSize: '.92rem' }}>Valorizam cozinhar juntos</div></div></div>
      </div>
      <div className="section-title">Pra conversar</div>
      <div className="card mb-md">
        <div className="cmp"><div className="who">M</div><div><div className="r-title" style={{ fontSize: '.92rem' }}>Você: viajar mais nos feriados</div></div></div>
        <div className="cmp"><div className="who">J</div><div><div className="r-title" style={{ fontSize: '.92rem' }}>João: guardar os feriados pra descansar</div></div></div>
      </div>
      <button className="btn btn-primary btn-block mb-sm" onClick={() => go('perguntas')}>Abrir conversa sobre isso</button>
      <button className="btn btn-ghost btn-block" onClick={() => go('quiz-root')}>Ver outros quizzes</button>
    </div>
  );
}

export default {
  'quiz-root': { component: QuizRoot, hideTabs: true },
  'quiz-play': { component: QuizPlay, hideTabs: true },
  'quiz-wait': { component: QuizWait, hideTabs: true },
  'quiz-result': { component: QuizResult, hideTabs: true },
};
