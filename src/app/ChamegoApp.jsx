import { useParams, useNavigate } from 'react-router-dom';
import I from './icons';
import './app.css';

import auth from './screens/Auth';
import home from './screens/Home';
import agenda from './screens/Agenda';
import listas from './screens/Listas';
import momentos from './screens/Momentos';
import voces from './screens/Voces';
import config from './screens/Config';
import premium from './screens/Premium';
import resumo from './screens/Resumo';
import dateHub from './screens/DateHub';
import quiz from './screens/Quiz';
import capsula from './screens/Capsula';
import conquistas from './screens/Conquistas';
import planos from './screens/Planos';
import lembretes from './screens/Lembretes';
import album from './screens/Album';
import presentes from './screens/Presentes';
import intimidade from './screens/Intimidade';

const REGISTRY = {
  ...auth, ...home, ...agenda, ...listas, ...momentos, ...voces, ...config,
  ...premium, ...resumo, ...dateHub, ...quiz, ...capsula, ...conquistas,
  ...planos, ...lembretes, ...album, ...presentes, ...intimidade,
};

const TABS = [
  { id: 'home', label: 'Início', icon: 'home' },
  { id: 'agenda', label: 'Agenda', icon: 'calendar' },
  { id: 'listas', label: 'Listas', icon: 'list' },
  { id: 'momentos', label: 'Momentos', icon: 'moments' },
  { id: 'voces', label: 'Vocês', icon: 'together' },
];

function TabBar({ active, hidden }) {
  const navigate = useNavigate();
  return (
    <div className={`tab-bar${hidden ? ' hidden' : ''}`}>
      {TABS.map(t => (
        <div key={t.id} className={`tab-item${t.id === active ? ' active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => navigate(`/prototipo/${t.id}-root`)}>
          <I name={t.icon} size={22} />
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ChamegoApp() {
  const { screenId = 'splash' } = useParams();
  const def = REGISTRY[screenId] || REGISTRY['splash'];
  const Screen = def.component;
  return (
    <div className="capp" data-palette="terracota">
      <div className="capp-stage">
        <div className="capp-frame">
          <div className="screen-viewport">
            <div className={`screen${def.hideTabs ? ' no-tabbar' : ''}`} key={screenId}>
              <Screen />
            </div>
          </div>
          <TabBar active={def.tab} hidden={!!def.hideTabs} />
        </div>
      </div>
    </div>
  );
}
