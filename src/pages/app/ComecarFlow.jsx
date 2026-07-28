import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useSession } from '../../lib/session-context.js';
import OnboardingSteps from './steps/OnboardingSteps.jsx';
import EspacoSteps from './steps/EspacoSteps.jsx';

// Antes eram 6 telas até ver o app (termos → 3 perguntas → nome → data →
// convite). Agora são duas paradas: uma pergunta — que muda o que o espaço
// nasce contendo — e o espaço em si. Os termos são aceitos no "continuar" do
// login e registrados aqui, na primeira entrada.
export default function ComecarFlow() {
  const { user, couple, refresh } = useSession();
  const [stage, setStage] = useState(() => {
    if (!user.onboarding?.goal) return 'onboarding';
    if (!couple) return 'espaco';
    return 'pronto';
  });

  useEffect(() => {
    if (user.termsAcceptedAt) return;
    api('/api/me', { method: 'PATCH', body: { acceptTerms: true } }).then(refresh).catch(() => { /* tenta de novo no próximo acesso */ });
  }, [user.termsAcceptedAt, refresh]);

  if (stage === 'pronto') return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-bg flex justify-center">
      <div className="w-full max-w-[430px] px-6 py-6 screen-enter">
        {stage === 'onboarding' && <OnboardingSteps onDone={() => setStage(!couple ? 'espaco' : 'pronto')} />}
        {stage === 'espaco' && <EspacoSteps goal={user.onboarding?.goal} onDone={() => setStage('pronto')} />}
      </div>
    </div>
  );
}
