import { Link } from 'react-router-dom';
import { useSession } from '../../../lib/session-context.js';
import { Btn, Card, Logo } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

function daysTogether(iso) {
  const ms = Date.now() - new Date(`${iso}T00:00:00`).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function InicioTab() {
  const { user, couple, partner } = useSession();
  const solo = !partner;
  const firstName = (user.name || user.email).split(/[\s@]/)[0];

  return (
    <div>
      <div className="flex items-center justify-between pt-5 pb-2">
        <Logo className="text-xl" />
        <Link to="/app/config" aria-label="Configurações"
          className="w-9 h-9 rounded-full bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)] grid place-items-center text-accent-press font-semibold text-sm">
          {firstName[0]?.toUpperCase() || '♥'}
        </Link>
      </div>
      <h1 className="font-display text-[1.7rem] leading-tight mb-1">
        {greeting()}, {solo ? firstName : couple.name}
      </h1>
      {solo && <p className="text-ink-2 text-sm mb-4">Você está usando o Chamego sozinho(a) por enquanto.</p>}

      {solo && (
        <Card className="mb-4 flex items-center gap-3.5">
          <span className="flex-none w-9 h-9 rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name="together" size={17} /></span>
          <span className="flex-1">
            <span className="block font-medium text-[.95rem]">Convide seu par</span>
            <span className="block text-sm text-ink-2">Compartilhe o espaço quando quiser</span>
          </span>
          <Btn to="/app/config" className="!px-4 !py-2 !text-sm">Convidar</Btn>
        </Card>
      )}

      <Card className="mb-4 text-center">
        <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-1">{couple.milestone_label || 'Juntos há'}</p>
        <p className="font-display text-[2.6rem] text-accent leading-none my-1">
          {daysTogether(couple.milestone_date)} <span className="font-sans text-lg text-ink-2">dias</span>
        </p>
        <p className="text-sm text-ink-2">desde {formatDate(couple.milestone_date)}</p>
      </Card>

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mt-6 mb-2">Em breve por aqui</p>
      <Card className="text-ink-2 text-[.95rem]">
        Próximos eventos, tarefas pendentes e o check-in do dia vão aparecer neste
        painel conforme Agenda, Listas e Vocês forem chegando. ✦
      </Card>
    </div>
  );
}
