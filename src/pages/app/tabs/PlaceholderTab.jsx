import { EmptyState, Chip } from '../../../ui/kit.jsx';

export default function PlaceholderTab({ icon, title, text }) {
  return (
    <div className="pt-10">
      <h1 className="font-display text-2xl mb-2">{title}</h1>
      <EmptyState icon={icon} title="Em breve" actions={<Chip active>✦ chegando na próxima fase</Chip>}>
        {text}
      </EmptyState>
    </div>
  );
}
