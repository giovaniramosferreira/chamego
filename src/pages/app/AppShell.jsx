import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import Icon from '../../ui/icons.jsx';
import InicioTab from './tabs/InicioTab.jsx';
import PlaceholderTab from './tabs/PlaceholderTab.jsx';
import ConfigTab from './tabs/ConfigTab.jsx';

const TABS = [
  { path: '/app', icon: 'home', label: 'Início', end: true },
  { path: '/app/agenda', icon: 'calendar', label: 'Agenda' },
  { path: '/app/listas', icon: 'list', label: 'Listas' },
  { path: '/app/momentos', icon: 'moments', label: 'Momentos' },
  { path: '/app/voces', icon: 'together', label: 'Vocês' },
];

export default function AppShell() {
  return (
    <div className="min-h-screen bg-bg flex justify-center">
      <div className="w-full max-w-[430px] flex flex-col min-h-screen">
        <main className="flex-1 px-5 pb-24 screen-enter">
          <Routes>
            <Route index element={<InicioTab />} />
            <Route path="agenda" element={<PlaceholderTab icon="calendar" title="Agenda" text="Eventos, lembretes e a meta de dates de vocês vão morar aqui." />} />
            <Route path="listas" element={<PlaceholderTab icon="list" title="Listas" text="Compras, casa, desejos — listas compartilhadas chegam em breve." />} />
            <Route path="momentos" element={<PlaceholderTab icon="moments" title="Momentos" text="A linha do tempo das memórias de vocês vai crescer aqui." />} />
            <Route path="voces" element={<PlaceholderTab icon="together" title="Vocês" text="Check-ins, metas e o chat do casal estão a caminho." />} />
            <Route path="config" element={<ConfigTab />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </main>
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/90 backdrop-blur border-t border-line flex justify-around px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
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
