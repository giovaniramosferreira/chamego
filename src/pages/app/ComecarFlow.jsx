import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../../lib/session-context.js';
import TermosStep from './steps/TermosStep.jsx';
import OnboardingSteps from './steps/OnboardingSteps.jsx';
import EspacoSteps from './steps/EspacoSteps.jsx';

// Ordem do fluxo: termos → onboarding (3 telas) → espaço (nome, data, convite).
// Retomada: quem já aceitou termos cai direto no onboarding, e assim por diante.
export default function ComecarFlow() {
  const { user, couple } = useSession();
  const [stage, setStage] = useState(() => {
    if (!user.termsAcceptedAt) return 'termos';
    if (!user.onboarding?.goal) return 'onboarding';
    if (!couple) return 'espaco';
    return 'pronto';
  });

  if (stage === 'pronto') return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-bg flex justify-center">
      <div className="w-full max-w-[430px] px-6 py-6 screen-enter">
        {stage === 'termos' && <TermosStep onDone={() => setStage(!user.onboarding?.goal ? 'onboarding' : !couple ? 'espaco' : 'pronto')} />}
        {stage === 'onboarding' && <OnboardingSteps onDone={() => setStage(!couple ? 'espaco' : 'pronto')} />}
        {stage === 'espaco' && <EspacoSteps onDone={() => setStage('pronto')} />}
      </div>
    </div>
  );
}
