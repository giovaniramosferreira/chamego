import { NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Icon from '../../ui/icons.jsx';
import InicioTab from './tabs/InicioTab.jsx';
import ConfigTab from './tabs/ConfigTab.jsx';
import AgendaTab from './tabs/AgendaTab.jsx';
import ListasTab from './tabs/ListasTab.jsx';
import ListaDetail from './tabs/ListaDetail.jsx';
import MomentosTab from './tabs/MomentosTab.jsx';
import VocesTab from './tabs/VocesTab.jsx';
import ChatScreen from './tabs/ChatScreen.jsx';

const TABS = [
  { path: '/app', icon: 'home', label: 'Início', end: true },
  { path: '/app/agenda', icon: 'calendar', label: 'Agenda' },
  { path: '/app/listas', icon: 'list', label: 'Listas' },
  { path: '/app/momentos', icon: 'moments', label: 'Momentos' },
  { path: '/app/voces', icon: 'together', label: 'Vocês' },
];

export default function AppShell() {
  const location = useLocation();
  const hideNav = location.pathname === '/app/voces/chat';
  return (
    <div className="min-h-screen bg-bg flex justify-center">
      <div className="w-full max-w-[430px] flex flex-col min-h-screen">
        <main className={`flex-1 px-5 screen-enter ${hideNav ? '' : 'pb-24'}`}>
          <Routes>
            <Route index element={<InicioTab />} />
            <Route path="agenda" element={<AgendaTab />} />
            <Route path="listas" element={<ListasTab />} />
            <Route path="listas/:id" element={<ListaDetail />} />
            <Route path="momentos" element={<MomentosTab />} />
            <Route path="voces" element={<VocesTab />} />
            <Route path="voces/chat" element={<ChatScreen />} />
            <Route path="config" element={<ConfigTab />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </main>
        <nav className={`${hideNav ? 'hidden' : ''} fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/90 backdrop-blur border-t border-line flex justify-around px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2`}>
          {TABS.map((t) => (
            <NavLink key={t.path} to={t.path} end={t.end}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium transition-colors ${isActive ? 'text-accent' : 'text-ink-3'}`}>
              <Icon name={t.icon} size={22} />
              <span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
