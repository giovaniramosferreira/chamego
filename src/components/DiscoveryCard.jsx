import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useSession } from '../lib/session-context.js';
import { Card, Btn } from '../ui/kit.jsx';
import Icon from '../ui/icons.jsx';

const DISMISSED = 'chamego:discovery-dismissed';

// Um recurso por vez, escolhido pelo momento do casal: é assim que Quiz,
// Resumo, Conquistas e Conexão voltam a existir sem virar menu gigante.
// Domingo mostra o resumo; sem par, mostra o que dá pra fazer sozinho(a).
// A pergunta do jantar saiu daqui: ela virou o hero do Início, decidido pela
// hora em vez de sorteado na rotação. Nesta lista ela aparecia um dia em nove,
// justamente às 20h de quarta — e duas vezes na mesma tela nos outros dias.
function pick({ partner, weekday, hasMoments }) {
  const options = [
    { id: 'resumo', when: weekday === 0, icon: 'calendar', title: 'O resumo da semana saiu', text: 'Veja a semana de vocês em números e destaques.', to: '/app/resumo', cta: 'Ver resumo' },
    { id: 'quiz', when: !!partner, icon: 'heart', title: 'Quiz do casal', text: 'Respondam separados e vejam o quanto combinam.', to: '/app/quiz', cta: 'Jogar' },
    { id: 'intimidade', when: !!partner, icon: 'shield', title: 'Conversas guiadas', text: 'Uma carta por vez, no ritmo de vocês — com trava por PIN.', to: '/app/intimidade', cta: 'Abrir' },
    { id: 'conquistas', when: true, icon: 'star', title: 'Conquistas de vocês', text: 'Os marcos que vocês já desbloquearam por aqui.', to: '/app/conquistas', cta: 'Ver' },
    { id: 'albuns', when: hasMoments, icon: 'image', title: 'Juntem as fotos num álbum', text: 'Os momentos de vocês viram um álbum com capa e legenda.', to: '/app/albuns', cta: 'Criar álbum' },
    { id: 'dates', when: true, icon: 'star', title: 'Ideias de date', text: 'Filtre por orçamento e clima e marque na agenda.', to: '/app/date-ideas', cta: 'Ver ideias' },
    { id: 'capsula', when: true, icon: 'clock', title: 'Cápsula do tempo', text: 'Escreva algo que só abre numa data lá na frente.', to: '/app/capsula', cta: 'Escrever' },
    { id: 'lembretes', when: true, icon: 'bell', title: 'Lembretes de carinho', text: 'Sugestões leves a partir do que já existe no espaço.', to: '/app/lembretes', cta: 'Ver' },
  ].filter((o) => o.when);
  // Rotaciona por dia: cada dia sugere outra coisa, sem parecer aleatório.
  const day = Math.floor(Date.now() / 86_400_000);
  return options[day % options.length];
}

export default function DiscoveryCard() {
  const nav = useNavigate();
  const { partner } = useSession();
  const [hasMoments, setHasMoments] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED) === new Date().toDateString());

  useEffect(() => {
    api('/api/moments').then((d) => setHasMoments((d.moments || []).length > 0)).catch(() => {});
  }, []);

  const item = useMemo(() => pick({ partner, weekday: new Date().getDay(), hasMoments }), [partner, hasMoments]);

  if (dismissed || !item) return null;

  function hide() {
    localStorage.setItem(DISMISSED, new Date().toDateString());
    setDismissed(true);
  }

  return (
    <Card className="mb-4">
      <div className="flex items-start gap-3.5">
        <span className="flex-none w-9 h-9 rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name={item.icon} size={17} /></span>
        <div className="flex-1">
          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-1">Pra vocês</p>
          <p className="font-medium text-[.98rem]">{item.title}</p>
          <p className="text-sm text-ink-2 mt-0.5">{item.text}</p>
          <div className="flex items-center gap-3 mt-3">
            <Btn onClick={() => nav(item.to)} className="!px-4 !py-2 !text-sm">{item.cta}</Btn>
            <button onClick={hide} className="text-sm text-ink-3">Hoje não</button>
          </div>
        </div>
      </div>
    </Card>
  );
}
