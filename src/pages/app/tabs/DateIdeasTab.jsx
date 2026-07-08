import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useSubscription } from '../../../lib/subscription.js';
import { AppHeader, Card, Btn, Chip, Spinner, EmptyState, PaywallSheet } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const BUDGET = { zero: 'grátis', baixo: 'R$', medio: 'R$$', alto: 'R$$$' };
const WHERE = { casa: 'Em casa', fora: 'Fora' };
const VIBE_ICON = { relax: 'heart', animado: 'star', romantico: 'heart', aventura: 'globe' };
const meta = (i) => `${WHERE[i.where]} · ${BUDGET[i.budget]} · ${i.duration}`;

export default function DateIdeasTab() {
  const nav = useNavigate();
  const sub = useSubscription();
  const [ideas, setIdeas] = useState(null);
  const [where, setWhere] = useState('todos');
  const [budget, setBudget] = useState('todos');
  const [savedOnly, setSavedOnly] = useState(false);
  const [paywall, setPaywall] = useState(false);

  const load = () => api('/api/date-ideas').then((d) => setIdeas(d.ideas));
  useEffect(() => { load(); }, []);

  const free = (ideas || []).filter((i) => !i.premium);
  const shown = useMemo(() => free.filter((i) =>
    (where === 'todos' || i.where === where) &&
    (budget === 'todos' || i.budget === budget) &&
    (!savedOnly || i.saved)
  ), [free, where, budget, savedOnly]);
  const premiumPacks = (ideas || []).filter((i) => i.premium);

  async function toggleSave(i, e) {
    e?.stopPropagation();
    if (i.saved) await api(`/api/date-ideas/saved/${i.id}`, { method: 'DELETE' });
    else await api('/api/date-ideas/saved', { method: 'POST', body: { ideaId: i.id } });
    load();
  }

  return (
    <div>
      <AppHeader back={() => nav('/app/agenda')} title="Ideias pra vocês" />

      <div className="flex gap-2 overflow-x-auto pb-1 mb-2 -mx-5 px-5 [scrollbar-width:none]">
        <Chip active={where === 'todos' && budget === 'todos' && !savedOnly} onClick={() => { setWhere('todos'); setBudget('todos'); setSavedOnly(false); }}>Todas</Chip>
        <Chip active={savedOnly} onClick={() => setSavedOnly(!savedOnly)}>Salvas</Chip>
        {Object.entries(WHERE).map(([k, l]) => <Chip key={k} active={where === k} onClick={() => setWhere(where === k ? 'todos' : k)}>{l}</Chip>)}
        {Object.entries(BUDGET).map(([k, l]) => <Chip key={k} active={budget === k} onClick={() => setBudget(budget === k ? 'todos' : k)}>{l}</Chip>)}
      </div>

      {ideas === null ? (
        <div className="py-10 text-center"><Spinner /></div>
      ) : (
        <>
          {shown.length === 0 ? (
            <EmptyState icon="search" title="Nada com esses filtros" actions={<Btn variant="ghost" onClick={() => { setWhere('todos'); setBudget('todos'); setSavedOnly(false); }} className="!px-5 !py-2.5 !text-sm">Limpar filtros</Btn>}>
              Afrouxe o orçamento ou o lugar para ver mais.
            </EmptyState>
          ) : (
            <Card className="!p-0 mb-4">
              {shown.map((i) => (
                <div key={i.id} className="flex items-center border-b border-line last:border-0">
                  <button type="button" onClick={() => nav(`/app/date-ideas/${i.id}`)} className="flex-1 flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-accent-soft/40 transition-colors">
                    <span className="flex-none w-9 h-9 rounded-full bg-accent-soft shadow-[inset_0_0_0_1px_var(--accent-line)] grid place-items-center text-accent-press"><Icon name={VIBE_ICON[i.vibe] || 'star'} size={17} /></span>
                    <span className="flex-1 min-w-0"><span className="block font-medium text-[.95rem]">{i.title}</span><span className="block text-sm text-ink-2">{meta(i)}{i.savedByPartner ? ' · par curtiu 💛' : ''}</span></span>
                  </button>
                  <button type="button" onClick={() => toggleSave(i)} aria-label="Salvar" className={`px-3 py-3.5 ${i.saved ? 'text-accent-press' : 'text-ink-3'}`}><Icon name="heart" size={18} /></button>
                </div>
              ))}
            </Card>
          )}

          {premiumPacks.length > 0 && !sub.has('premium') && (
            <button onClick={() => setPaywall(true)} className="w-full flex items-center gap-3 rounded-card bg-surface p-4 shadow-[inset_0_0_0_1px_var(--line-2)]">
              <span className="flex-none w-10 h-10 rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name="lock" size={18} /></span>
              <span className="flex-1 text-left"><span className="block font-medium">Packs de experiências</span><span className="block text-sm text-ink-2">Roteiros completos · Premium</span></span>
            </button>
          )}
        </>
      )}

      {paywall && <PaywallSheet title="Packs de experiências" perks={['Roteiros passo a passo', 'Packs sazonais e temáticos', 'Novas ideias toda semana']} onClose={() => setPaywall(false)} onActivate={async () => { await sub.activatePremium(); load(); }} />}
    </div>
  );
}

export function DateIdeaDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [idea, setIdea] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api('/api/date-ideas').then((d) => { const i = d.ideas.find((x) => x.id === id); if (!i) setErr('Ideia não encontrada'); else setIdea(i); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);

  async function toggleSave() {
    if (idea.saved) await api(`/api/date-ideas/saved/${idea.id}`, { method: 'DELETE' });
    else await api('/api/date-ideas/saved', { method: 'POST', body: { ideaId: idea.id } });
    load();
  }

  if (err) return <div><AppHeader back={() => nav('/app/date-ideas')} title="Ideia" /><p className="text-ink-2 py-8 text-center">{err}</p></div>;
  if (!idea) return <div className="py-10 text-center"><Spinner /></div>;

  return (
    <div>
      <AppHeader back={() => nav('/app/date-ideas')} title="Ideia"
        right={<button onClick={toggleSave} aria-label="Salvar" className={`p-1 ${idea.saved ? 'text-accent-press' : 'text-ink-3'}`}><Icon name="heart" size={20} /></button>} />

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-accent-press mb-1">{meta(idea)}</p>
      <h1 className="font-display text-2xl mb-2">{idea.title}</h1>
      <p className="text-ink-2 mb-5">{idea.desc}</p>

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">O que levar</p>
      <Card className="!p-0 mb-4">
        {idea.checklist.map((c, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
            <span className="flex-none w-5 h-5 rounded-full shadow-[inset_0_0_0_1.5px_var(--line-2)]" />
            <span className="text-[.95rem]">{c}</span>
          </div>
        ))}
      </Card>

      {idea.savedByPartner && (
        <div className="flex items-center gap-2.5 rounded-card bg-accent-soft/60 px-4 py-3 mb-4 text-sm text-accent-press">
          <Icon name="heart" size={18} /> Seu par salvou essa ideia 💛
        </div>
      )}

      <Btn block className="mb-2" onClick={() => nav('/app/agenda')}>Adicionar à agenda</Btn>
      <Btn variant="ghost" block onClick={() => nav('/app/voces/chat')}>Enviar pro seu par</Btn>
    </div>
  );
}
