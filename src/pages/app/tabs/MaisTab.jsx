import { useNavigate } from 'react-router-dom';
import { useSession } from '../../../lib/session-context.js';
import { AppHeader, Row, RowList, LockedRow } from '../../../ui/kit.jsx';

// Tudo que o Chamego faz, num lugar só. As abas ficam enxutas; nada de
// recurso existir sem porta de entrada (o que acontecia com Quiz, Conquistas,
// Lembretes, Resumo, Conexão e Ideias de date).
const FEATURES = [
  {
    group: 'Organizar',
    items: [
      { to: '/app/planos', icon: 'target', title: 'Planos & metas', sub: 'Sonhos grandes com etapas' },
      { to: '/app/presentes', icon: 'gift', title: 'Datas & presentes', sub: 'Aniversários, wishlist e surpresas' },
      { to: '/app/date-ideas', icon: 'star', title: 'Ideias de date', sub: 'Catálogo por orçamento e clima' },
      { to: '/app/lembretes', icon: 'bell', title: 'Lembretes de carinho', sub: 'Sugestões leves, sem cobrança' },
    ],
  },
  {
    group: 'Comer',
    items: [
      { to: '/app/cozinha', icon: 'heart', title: 'O que a gente come hoje?', sub: 'Uma receita, sem escolher' },
      { to: '/app/despensa', icon: 'shopping', title: 'Despensa e mercado', sub: 'O que tem em casa e o que está acabando' },
    ],
  },
  {
    group: 'Guardar',
    items: [
      { to: '/app/albuns', icon: 'image', title: 'Álbuns', sub: 'As fotos de vocês agrupadas' },
      { to: '/app/capsula', icon: 'clock', title: 'Cápsula do tempo', sub: 'Mensagens seladas até uma data' },
    ],
  },
  {
    group: 'Cuidar da dupla',
    items: [
      { to: '/app/voces/chat', icon: 'chat', title: 'Chat privado', sub: 'Só entre vocês', needsPartner: true },
      { to: '/app/quiz', icon: 'heart', title: 'Quiz do casal', sub: 'Vejam o quanto combinam', needsPartner: true },
      { to: '/app/intimidade', icon: 'shield', title: 'Conexão', sub: 'Conversas guiadas, com trava por PIN', needsPartner: true },
      { to: '/app/conquistas', icon: 'star', title: 'Conquistas', sub: 'Os marcos de vocês' },
      { to: '/app/resumo', icon: 'calendar', title: 'Resumo da semana', sub: 'A semana em números e destaques' },
    ],
  },
];

export default function MaisTab() {
  const nav = useNavigate();
  const { partner } = useSession();

  return (
    <div className="pt-3">
      <AppHeader back={() => nav('/app')} title="Tudo do Chamego" />
      <p className="text-ink-2 text-[.95rem] mb-5">Cada recurso continua aqui — as abas ficam com o dia a dia.</p>

      {FEATURES.map((section) => (
        <div key={section.group} className="mb-5">
          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">{section.group}</p>
          <RowList>
            {section.items.map((f) => (
              f.needsPartner && !partner
                ? <LockedRow key={f.to} icon={f.icon} title={f.title} reason="Libera quando seu par entrar" onClick={() => nav('/app/config')} />
                : <Row key={f.to} icon={f.icon} title={f.title} sub={f.sub} onClick={() => nav(f.to)} />
            ))}
          </RowList>
        </div>
      ))}

      <RowList className="mb-6">
        <Row icon="star" title="Plano de vocês" sub="Grátis pra sempre + o que o Chamego Juntos abre" onClick={() => nav('/app/plano')} />
        <Row icon="settings" title="Configurações" sub="Perfil, espaço, avisos e dados" onClick={() => nav('/app/config')} />
      </RowList>
    </div>
  );
}
