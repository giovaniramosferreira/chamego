import { useState } from 'react';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { Btn, ChoiceCard, Logo } from '../../../ui/kit.jsx';

// Uma pergunta só — e ela precisa mudar alguma coisa: a resposta define o
// conteúdo com que o espaço nasce (ver `seedCouple` no backend). As outras
// perguntas do questionário antigo não personalizavam nada; a fase do
// relacionamento virou um campo opcional nas Configurações.
const GOALS = [
  { value: 'rotina', icon: 'list', title: 'Organizar a rotina', sub: 'Tarefas, compras e casa' },
  { value: 'conexao', icon: 'heart', title: 'Fortalecer a conexão', sub: 'Check-ins e momentos' },
  { value: 'datas', icon: 'calendar', title: 'Lembrar datas importantes', sub: 'Aniversários e eventos' },
  { value: 'planejar', icon: 'together', title: 'Planejar a vida a dois', sub: 'Metas e objetivos' },
];

export default function OnboardingSteps({ onDone }) {
  const { refresh } = useSession();
  const [goal, setGoal] = useState('');
  const [saving, setSaving] = useState(false);

  async function next() {
    setSaving(true);
    try {
      await api('/api/me', { method: 'PATCH', body: { onboarding: { goal } } });
      await refresh();
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="pt-6 pb-8"><Logo className="text-2xl" /></div>
      <h1 className="font-display text-[1.7rem] leading-tight mb-1.5">O que vocês mais querem agora?</h1>
      <p className="text-ink-2 mb-6">Seu espaço já começa com isso pronto — dá pra mudar tudo depois.</p>
      {GOALS.map((o) => (
        <ChoiceCard key={o.value} icon={o.icon} title={o.title} sub={o.sub}
          selected={goal === o.value} onClick={() => setGoal(o.value)} />
      ))}
      <Btn block className="mt-5" disabled={!goal || saving} onClick={next}>Continuar</Btn>
    </div>
  );
}
