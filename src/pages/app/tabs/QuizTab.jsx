import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { useSubscription, track } from '../../../lib/subscription.js';
import { AppHeader, Card, Row, Btn, Chip, Spinner, EmptyState, ChoiceCard, ProgressDots, PaywallSheet } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const CATEGORIES = ['Todos', 'Rotina', 'Diversão', 'Intimidade', 'Viagens'];

export default function QuizTab() {
  const nav = useNavigate();
  const sub = useSubscription();
  const [quizzes, setQuizzes] = useState(null);
  const [cat, setCat] = useState('Todos');
  const [paywall, setPaywall] = useState(false);

  useEffect(() => { api('/api/quizzes').then((d) => setQuizzes(d.quizzes)); }, []);

  const shown = useMemo(() => (quizzes || []).filter((q) => cat === 'Todos' || q.category === cat), [quizzes, cat]);

  function open(q) {
    if (q.premium && !sub.has('premium')) { track('paywall_visto', 'quiz'); setPaywall(true); return; }
    nav(`/app/quiz/${q.id}`);
  }
  const stateSub = (q) => q.answered && q.partnerAnswered ? 'Concluído · ver resultado'
    : q.answered ? 'Aguardando seu par responder'
    : `${q.questions.length} perguntas`;

  return (
    <div>
      <AppHeader back={() => nav('/app/voces')} title="Quizzes" />

      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-5 px-5 [scrollbar-width:none]">
        {CATEGORIES.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
      </div>

      {quizzes === null ? (
        <div className="py-10 text-center"><Spinner /></div>
      ) : shown.length === 0 ? (
        <EmptyState icon="chat" title="Nenhum quiz por aqui">Novos quizzes leves aparecem por tema. Escolha outra categoria.</EmptyState>
      ) : (
        <Card className="!p-0">
          {shown.map((q) => (
            <Row key={q.id} icon={q.premium && !sub.has('premium') ? 'lock' : 'heart'} title={q.title} sub={q.premium && !sub.has('premium') ? 'Premium' : stateSub(q)}
              onClick={() => open(q)} right={q.premium && !sub.has('premium') ? <Icon name="lock" size={15} className="text-ink-3" /> : undefined} />
          ))}
        </Card>
      )}

      {paywall && <PaywallSheet title="Trilhas Premium" perks={['Quizzes por tema', 'Sonhos & futuro', 'Intimidade & conexão', 'Novos quizzes toda semana']} origem="quiz" onClose={() => setPaywall(false)} />}
    </div>
  );
}

export function QuizPlay() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useSession();
  const [quiz, setQuiz] = useState(null);
  const [phase, setPhase] = useState('loading'); // loading | play | waiting | result | error
  const [result, setResult] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const q = (await api('/api/quizzes')).quizzes.find((x) => x.id === id);
        if (!q) { setPhase('error'); return; }
        setQuiz(q);
        if (q.answered) {
          const { result: r } = await api(`/api/quizzes/${id}/result`);
          setResult(r);
          setPhase(r.answeredBy >= 2 ? 'result' : 'waiting');
        } else {
          setPhase('play');
        }
      } catch { setPhase('error'); }
    })();
  }, [id]);

  function choose(option) {
    const q = quiz.questions[step];
    const next = [...answers.filter((a) => a.questionId !== q.id), { questionId: q.id, option }];
    setAnswers(next);
    if (step + 1 < quiz.questions.length) { setStep(step + 1); return; }
    submit(next);
  }
  async function submit(finalAnswers) {
    setPhase('loading');
    const { result: r } = await api(`/api/quizzes/${id}/answers`, { method: 'POST', body: { answers: finalAnswers } });
    setResult(r);
    setPhase(r.answeredBy >= 2 ? 'result' : 'waiting');
  }

  if (phase === 'loading' || !quiz) return <div className="py-10 text-center"><Spinner /></div>;
  if (phase === 'error') return <div><AppHeader back={() => nav('/app/quiz')} title="Quiz" /><p className="text-ink-2 py-8 text-center">Quiz não encontrado.</p></div>;

  if (phase === 'play') {
    const q = quiz.questions[step];
    const chosen = answers.find((a) => a.questionId === q.id)?.option;
    return (
      <div>
        <AppHeader back={() => (step > 0 ? setStep(step - 1) : nav('/app/quiz'))} title={quiz.title} />
        <ProgressDots step={step} total={quiz.questions.length} />
        <p className="text-sm text-ink-3 text-center mb-4">Pergunta {step + 1} de {quiz.questions.length}</p>
        <Card className="mb-5"><p className="font-display text-xl leading-snug">{q.text}</p></Card>
        {q.options.map((o) => <ChoiceCard key={o} icon="heart" title={o} selected={chosen === o} onClick={() => choose(o)} />)}
      </div>
    );
  }

  if (phase === 'waiting') {
    return (
      <div className="flex flex-col items-center text-center pt-16">
        <AppHeader back={() => nav('/app/quiz')} />
        <span className="w-[72px] h-[72px] rounded-full bg-accent-soft grid place-items-center text-accent mb-5"><Icon name="clock" size={30} /></span>
        <h2 className="font-display text-2xl mb-2">Respostas enviadas!</h2>
        <p className="text-ink-2 max-w-[30ch] mb-6">Avisamos quando seu par terminar. Aí liberamos o comparativo de vocês.</p>
        <Btn variant="ghost" block onClick={() => nav('/app/voces/chat')}>Cutucar seu par 😄</Btn>
      </div>
    );
  }

  // result
  return <QuizResult quiz={quiz} result={result} myEmail={user.email} onBack={() => nav('/app/quiz')} />;
}

function QuizResult({ quiz, result, myEmail, onBack }) {
  const mine = result.answers.find((a) => a.email === myEmail)?.answers || [];
  const theirs = result.answers.find((a) => a.email !== myEmail)?.answers || [];
  const byQ = (list, qid) => list.find((a) => a.questionId === qid)?.option;

  const rows = quiz.questions.map((q) => ({ q, mine: byQ(mine, q.id), theirs: byQ(theirs, q.id) }));
  const agree = rows.filter((r) => r.mine && r.theirs && r.mine === r.theirs);
  const differ = rows.filter((r) => r.mine && r.theirs && r.mine !== r.theirs);
  const total = rows.filter((r) => r.mine && r.theirs).length;
  const matchPct = total ? Math.round((agree.length / total) * 100) : 0;

  return (
    <div>
      <AppHeader back={onBack} title="Resultado" />
      <Card className="text-center mb-4">
        <div className="mx-auto mb-2 w-24 h-24 rounded-full grid place-items-center" style={{ background: `conic-gradient(var(--accent) ${matchPct * 3.6}deg, var(--accent-soft) 0)` }}>
          <div className="w-[76px] h-[76px] rounded-full bg-surface grid place-items-center font-display text-2xl text-accent-press">{matchPct}%</div>
        </div>
        <p className="font-medium text-lg">{matchPct >= 60 ? 'Vocês estão em sintonia' : 'Vale conversar mais'}</p>
        <p className="text-sm text-ink-2">Concordaram em {agree.length} de {total} respostas</p>
      </Card>

      {agree.length > 0 && (
        <>
          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Onde combinam</p>
          <Card className="!p-0 mb-4">
            {agree.map((r) => (
              <div key={r.q.id} className="flex items-start gap-3 px-4 py-3 border-b border-line last:border-0">
                <span className="flex-none w-6 h-6 rounded-full bg-accent-soft grid place-items-center text-accent-press mt-0.5"><Icon name="check" size={14} /></span>
                <div><p className="text-[.95rem] font-medium">{r.q.text}</p><p className="text-sm text-ink-2">Ambos: {r.mine}</p></div>
              </div>
            ))}
          </Card>
        </>
      )}
      {differ.length > 0 && (
        <>
          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Pra conversar</p>
          <Card className="!p-0 mb-4">
            {differ.map((r) => (
              <div key={r.q.id} className="px-4 py-3 border-b border-line last:border-0">
                <p className="text-[.95rem] font-medium mb-1">{r.q.text}</p>
                <p className="text-sm text-ink-2">Você: {r.mine}</p>
                <p className="text-sm text-ink-2">Seu par: {r.theirs}</p>
              </div>
            ))}
          </Card>
        </>
      )}
      <Btn block onClick={() => window.location.assign('/app/voces/chat')}>Abrir conversa sobre isso</Btn>
      <button onClick={onBack} className="w-full text-center text-sm text-ink-3 mt-3">Ver outros quizzes</button>
    </div>
  );
}
