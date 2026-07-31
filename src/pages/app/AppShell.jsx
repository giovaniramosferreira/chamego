import { useCallback, useEffect, useState } from 'react';
import { NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Icon from '../../ui/icons.jsx';
import { Badge } from '../../ui/kit.jsx';
import { api } from '../../lib/api.js';
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

const TABS = [
  { path: '/app', icon: 'home', label: 'Início', end: true },
  { path: '/app/agenda', icon: 'calendar', label: 'Agenda' },
  { path: '/app/listas', icon: 'list', label: 'Listas' },
  { path: '/app/momentos', icon: 'moments', label: 'Momentos' },
  { path: '/app/voces', icon: 'together', label: 'Vocês' },
];

// Qual tipo o "+" sugere depende de onde a pessoa está.
function contextFromPath(pathname) {
  if (pathname.startsWith('/app/agenda')) return 'agenda';
  if (pathname.startsWith('/app/listas')) return 'listas';
  if (pathname.startsWith('/app/momentos')) return 'momentos';
  if (pathname.startsWith('/app/voces')) return 'voces';
  return 'inicio';
}

export default function AppShell() {
  const location = useLocation();
  // Chat e modo cozinha são telas de foco: a tab bar sai da frente.
  const hideNav = location.pathname === '/app/voces/chat'
    || (location.pathname.startsWith('/app/cozinha/') && location.search.includes('modo=cozinha'));
  const isTab = TABS.some((t) => t.path === location.pathname);
  const [adding, setAdding] = useState(false);
  const [badges, setBadges] = useState({ unread: 0 });

  const loadBadges = useCallback(() => {
    api('/api/badges').then(setBadges).catch(() => {});
  }, []);

  // Mensagem nova precisa aparecer sem abrir o chat. Mas o pulso só bate com
  // o app à vista: request no ar quando a tela apaga morre junto com ela, e
  // o app lia isso como internet caída.
  useEffect(() => {
    const visible = () => document.visibilityState === 'visible';
    const tick = () => { if (visible()) loadBadges(); };
    tick();
    const t = setInterval(tick, 20_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [loadBadges, location.pathname]);

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
            <Route path="voces/chat" element={<ChatScreen onRead={loadBadges} />} />
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

        {/* Um "+" só pro app inteiro: não é preciso acertar a aba antes de
            registrar. Nas telas de dentro (Planos, Álbuns…) quem manda é a
            ação da própria tela — nada de dois botões redondos na mesma tela. */}
        {isTab && (
          <div className="fixed bottom-[76px] left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5 z-30 flex justify-end pointer-events-none">
            <button onClick={() => setAdding(true)} aria-label="Adicionar"
              className="pointer-events-auto w-14 h-14 rounded-full bg-accent text-accent-ink shadow-[0_6px_18px_rgba(189,106,75,.45)] grid place-items-center hover:bg-accent-press active:scale-95 transition-all">
              <Icon name="plus" size={24} />
            </button>
          </div>
        )}

        <nav className={`${hideNav ? 'hidden' : ''} fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface border-t border-line flex justify-around px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2`}>
          {TABS.map((t) => (
            <NavLink key={t.path} to={t.path} end={t.end}
              className={({ isActive }) => `relative flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium transition-colors ${isActive ? 'text-accent' : 'text-ink-3'}`}>
              <Icon name={t.icon} size={22} />
              {t.path === '/app/voces' && badges.unread > 0 && (
                <Badge count={badges.unread} className="absolute top-0 right-1.5" />
              )}
              <span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {adding && <QuickAdd onClose={() => setAdding(false)} context={contextFromPath(location.pathname)} />}
    </div>
  );
}
