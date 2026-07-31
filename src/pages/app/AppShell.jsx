import { useEffect, useState } from 'react';
import { NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Icon from '../../ui/icons.jsx';
import { registrarAberturaPwa } from '../../lib/pwa.js';
import QuickAdd from '../../components/QuickAdd.jsx';
import ConnectionBanner from '../../components/ConnectionBanner.jsx';
import UpgradeGate from '../../components/UpgradeGate.jsx';
import InicioTab from './tabs/InicioTab.jsx';
import ConfigTab from './tabs/ConfigTab.jsx';
import AgendaTab from './tabs/AgendaTab.jsx';
import ListasTab from './tabs/ListasTab.jsx';
import ListaDetail from './tabs/ListaDetail.jsx';
import MomentosTab from './tabs/MomentosTab.jsx';
import VocesTab from './tabs/VocesTab.jsx';
import MaisTab from './tabs/MaisTab.jsx';
import PlanoTab from './tabs/PlanoTab.jsx';
import CozinhaTab from './tabs/CozinhaTab.jsx';
import ReceitaDetail from './tabs/ReceitaDetail.jsx';
import DespensaTab from './tabs/DespensaTab.jsx';
import AchadosTab from './tabs/AchadosTab.jsx';
import ChatScreen from './tabs/ChatScreen.jsx';
import PlanosTab, { PlanoDetail } from './tabs/PlanosTab.jsx';
import PresentesTab, { PresenteDetail } from './tabs/PresentesTab.jsx';
import QuizTab, { QuizPlay } from './tabs/QuizTab.jsx';
import CapsulaTab, { CapsulaDetail } from './tabs/CapsulaTab.jsx';
import ConquistasTab from './tabs/ConquistasTab.jsx';
import LembretesTab from './tabs/LembretesTab.jsx';
import ResumoTab from './tabs/ResumoTab.jsx';
import IntimidadeTab from './tabs/IntimidadeTab.jsx';
import AlbunsTab, { AlbumDetail } from './tabs/AlbunsTab.jsx';
import DateIdeasTab, { DateIdeaDetail } from './tabs/DateIdeasTab.jsx';

// Quatro abas e o "+" no centro. "Vocês" saiu da barra e virou a foto de
// perfil no topo do Início: é onde a mão procura o outro, e libera o centro
// pro botão que mais se usa.
const TABS = [
  { path: '/app', icon: 'home', label: 'Início', end: true },
  { path: '/app/agenda', icon: 'calendar', label: 'Agenda' },
  { path: '/app/listas', icon: 'list', label: 'Listas' },
  { path: '/app/momentos', icon: 'moments', label: 'Momentos' },
];

// Qual tipo o "+" sugere depende de onde a pessoa está.
function contextFromPath(pathname) {
  if (pathname.startsWith('/app/agenda')) return 'agenda';
  if (pathname.startsWith('/app/listas')) return 'listas';
  if (pathname.startsWith('/app/momentos')) return 'momentos';
  if (pathname.startsWith('/app/voces')) return 'voces';
  return 'inicio';
}

function Aba({ tab }) {
  return (
    <NavLink to={tab.path} end={tab.end}
      className={({ isActive }) => `flex-1 flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium transition-colors ${isActive ? 'text-accent' : 'text-ink-3'}`}>
      <Icon name={tab.icon} size={22} />
      <span>{tab.label}</span>
    </NavLink>
  );
}

export default function AppShell() {
  const location = useLocation();
  // Chat e modo cozinha são telas de foco: a tab bar sai da frente.
  const hideNav = location.pathname === '/app/voces/chat'
    || (location.pathname.startsWith('/app/cozinha/') && location.search.includes('modo=cozinha'));
  const [adding, setAdding] = useState(false);

  // Quem entrou pelo ícone da tela de início conta uma vez por dia.
  useEffect(() => { registrarAberturaPwa(); }, []);

  return (
    <div className="min-h-screen bg-bg flex justify-center">
      <ConnectionBanner />
      <UpgradeGate />
      <div className="w-full max-w-[430px] flex flex-col min-h-screen">
        <main className={`flex-1 px-5 screen-enter ${hideNav ? '' : 'pb-28'}`}>
          <Routes>
            <Route index element={<InicioTab />} />
            <Route path="agenda" element={<AgendaTab />} />
            <Route path="listas" element={<ListasTab />} />
            <Route path="listas/:id" element={<ListaDetail />} />
            <Route path="momentos" element={<MomentosTab />} />
            <Route path="voces" element={<VocesTab />} />
            <Route path="voces/chat" element={<ChatScreen />} />
            <Route path="mais" element={<MaisTab />} />
            <Route path="plano" element={<PlanoTab />} />
            <Route path="cozinha" element={<CozinhaTab />} />
            <Route path="cozinha/:id" element={<ReceitaDetail />} />
            <Route path="despensa" element={<DespensaTab />} />
            <Route path="achados" element={<AchadosTab />} />
            <Route path="planos" element={<PlanosTab />} />
            <Route path="planos/:id" element={<PlanoDetail />} />
            <Route path="presentes" element={<PresentesTab />} />
            <Route path="presentes/:id" element={<PresenteDetail />} />
            <Route path="quiz" element={<QuizTab />} />
            <Route path="quiz/:id" element={<QuizPlay />} />
            <Route path="capsula" element={<CapsulaTab />} />
            <Route path="capsula/:id" element={<CapsulaDetail />} />
            <Route path="conquistas" element={<ConquistasTab />} />
            <Route path="lembretes" element={<LembretesTab />} />
            <Route path="resumo" element={<ResumoTab />} />
            <Route path="intimidade" element={<IntimidadeTab />} />
            <Route path="albuns" element={<AlbunsTab />} />
            <Route path="albuns/:id" element={<AlbumDetail />} />
            <Route path="date-ideas" element={<DateIdeasTab />} />
            <Route path="date-ideas/:id" element={<DateIdeaDetail />} />
            <Route path="config" element={<ConfigTab />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </main>

        {/* Duas abas, o "+", mais duas abas. O botão é o centro de gravidade do
            polegar — e um "+" só pro app inteiro significa não ter que acertar
            a aba antes de registrar. Nas telas de dentro (Planos, Álbuns…) quem
            manda é a ação da própria tela: nada de dois botões redondos juntos. */}
        <nav className={`${hideNav ? 'hidden' : ''} fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface border-t border-line flex items-end px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2`}>
          {TABS.slice(0, 2).map((t) => <Aba key={t.path} tab={t} />)}

          <div className="flex-1 flex justify-center">
            <button onClick={() => setAdding(true)} aria-label="Adicionar"
              className="-mt-7 w-14 h-14 rounded-full bg-accent text-accent-ink shadow-[0_6px_18px_rgba(189,106,75,.45)] grid place-items-center hover:bg-accent-press active:scale-95 transition-all">
              <Icon name="plus" size={24} />
            </button>
          </div>

          {TABS.slice(2).map((t) => <Aba key={t.path} tab={t} />)}
        </nav>
      </div>

      {adding && <QuickAdd onClose={() => setAdding(false)} context={contextFromPath(location.pathname)} />}
    </div>
  );
}
