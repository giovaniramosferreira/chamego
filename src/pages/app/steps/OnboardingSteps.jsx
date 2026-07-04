import { useState } from 'react';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { Btn, ChoiceCard, AppHeader, ProgressDots } from '../../../ui/kit.jsx';

const STEPS = [
  {
    key: 'goal',
    title: 'O que você mais busca agora?',
    sub: 'Vamos usar isso pra personalizar seu início.',
    options: [
      { value: 'rotina', icon: 'list', title: 'Organizar a rotina', sub: 'Tarefas, compras e casa' },
      { value: 'conexao', icon: 'heart', title: 'Fortalecer a conexão', sub: 'Check-ins e momentos' },
      { value: 'datas', icon: 'calendar', title: 'Lembrar datas importantes', sub: 'Aniversários e eventos' },
      { value: 'planejar', icon: 'together', title: 'Planejar a vida a dois', sub: 'Metas e objetivos' },
    ],
  },
  {
    key: 'stage',
    title: 'Em que fase vocês estão?',
    sub: 'Isso ajusta as sugestões que aparecem pra vocês.',
    options: [
      { value: 'morando', icon: 'home', title: 'Morando juntos' },
      { value: 'namorando', icon: 'heart', title: 'Namorando' },
      { value: 'noivos', icon: 'star', title: 'Noivos' },
      { value: 'distancia', icon: 'pin', title: 'À distância' },
      { value: 'outro', icon: 'together', title: 'Outro' },
    ],
  },
  {
    key: 'alone',
    title: 'Como quer começar?',
    sub: 'Você pode usar sozinho(a) agora e convidar seu par depois — sem pressa.',
    options: [
      { value: 'sozinho', icon: 'user', title: 'Usar sozinho(a) por enquanto', sub: 'Convido meu par mais tarde' },
      { value: 'convidar', icon: 'together', title: 'Convidar meu par agora', sub: 'Criamos o espaço juntos' },
    ],
  },
];

export default function OnboardingSteps({ onDone }) {
  const { refresh } = useSession();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const step = STEPS[i];
  const selected = answers[step.key];

  async function next() {
    if (i < STEPS.length - 1) return setI(i + 1);
    setSaving(true);
    try {
      await api('/api/me', { method: 'PATCH', body: { onboarding: answers } });
      await refresh();
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AppHeader back={i > 0 ? () => setI(i - 1) : undefined} />
      <ProgressDots step={i} total={STEPS.length} />
      <h1 className="font-display text-[1.7rem] leading-tight mb-1.5">{step.title}</h1>
      <p className="text-ink-2 mb-6">{step.sub}</p>
      {step.options.map((o) => (
        <ChoiceCard key={o.value} icon={o.icon} title={o.title} sub={o.sub}
          selected={selected === o.value}
          onClick={() => setAnswers({ ...answers, [step.key]: o.value })} />
      ))}
      <Btn block className="mt-5" disabled={!selected || saving} onClick={next}>Continuar</Btn>
    </div>
  );
}
