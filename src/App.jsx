import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SessionProvider } from './lib/session.jsx';
import { useSession } from './lib/session-context.js';
import LandingPage from './pages/LandingPage.jsx';
import EntrarPage from './pages/EntrarPage.jsx';
import ConvitePage from './pages/ConvitePage.jsx';
import ComecarFlow from './pages/app/ComecarFlow.jsx';
import AppShell from './pages/app/AppShell.jsx';
import ChamegoApp from './app/ChamegoApp.jsx';

function RequireAuth({ children }) {
  const { loading, user } = useSession();
  const location = useLocation();
  if (loading) return <div className="min-h-screen grid place-items-center text-ink-3">…</div>;
  if (!user) return <Navigate to={`/entrar?next=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
}

// Fluxo obrigatório antes do app: termos → onboarding → espaço do casal
function RequireReady({ children }) {
  const { user, couple } = useSession();
  const pending = !user.termsAcceptedAt || !user.onboarding?.goal || !couple;
  if (pending) return <Navigate to="/app/comecar" replace />;
  return children;
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/entrar" element={<EntrarPage />} />
          <Route path="/convite/:code" element={<ConvitePage />} />
          <Route path="/app/comecar/*" element={<RequireAuth><ComecarFlow /></RequireAuth>} />
          <Route path="/app/*" element={<RequireAuth><RequireReady><AppShell /></RequireReady></RequireAuth>} />
          {/* Protótipo navegável do handoff Claude Design (dados mock, sem auth) */}
          <Route path="/prototipo" element={<ChamegoApp />} />
          <Route path="/prototipo/:screenId" element={<ChamegoApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
