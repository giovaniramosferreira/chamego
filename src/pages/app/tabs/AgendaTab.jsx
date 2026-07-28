import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useDataRefresh } from '../../../lib/refresh.js';
import { useSession } from '../../../lib/session-context.js';
import { useToast } from '../../../lib/toast-context.js';
import { Card, Sheet, Field, Btn, Chip, Spinner, EmptyState } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const todayISO = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
const daysUntil = (iso) => Math.ceil((new Date(`${iso}T00:00:00`).getTime() - Date.now()) / 86_400_000);

function monthGrid(year, month) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: first }, () => null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  return cells;
}

function fmtLong(iso) {
  const t = todayISO();
  const tomorrow = new Date(Date.now() + 86_400_000).toLocaleDateString('en-CA');
  if (iso === t) return 'Hoje';
  if (iso === tomorrow) return 'Amanhã';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function EventForm({ initial, onSave, onClose, saving }) {
  const [f, setF] = useState({ title: '', date: todayISO(), time: '', location: '', notes: '', shared: true, ...initial });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <Field label="O quê?" placeholder="Jantar de aniversário" value={f.title} onChange={set('title')} autoFocus required />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data" type="date" value={f.date} onChange={set('date')} required />
        <Field label="Hora (opcional)" type="time" value={f.time} onChange={set('time')} />
      </div>
      <Field label="Onde? (opcional)" placeholder="Restaurante Oliva" value={f.location} onChange={set('location')} />
      <Field label="Notas (opcional)" placeholder="Levar o presente" value={f.notes} onChange={set('notes')} />
      <div className="flex gap-2 mb-5">
        <Chip active={f.shared} onClick={() => setF({ ...f, shared: true })}>💞 Compartilhado</Chip>
        <Chip active={!f.shared} onClick={() => setF({ ...f, shared: false })}>🙋 Só você</Chip>
      </div>
      <Btn type="submit" block disabled={saving || !f.title.trim()}>{saving ? <Spinner /> : 'Salvar evento'}</Btn>
      {initial?.id && <button type="button" onClick={onClose} className="w-full mt-3 text-sm text-ink-2">Cancelar</button>}
    </form>
  );
}

export default function AgendaTab() {
  const nav = useNavigate();
  const { user } = useSession();
  const { toast, undoable } = useToast();
  const [events, setEvents] = useState(null);
  const [dates, setDates] = useState([]);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selected, setSelected] = useState(null);
  const [sheet, setSheet] = useState(null); // null | {} (new) | event (edit)
  const [saving, setSaving] = useState(false);
  const [calUrl, setCalUrl] = useState('');

  const load = useCallback(() => {
    api('/api/events').then((d) => setEvents(d.events)).catch(() => setEvents([]));
    // Datas importantes moram aqui também: uma data é uma data, no calendário.
    api('/api/gifts').then((d) => setDates(
      (d.gifts || []).filter((g) => g.kind !== 'wishlist' && g.date),
    )).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);
  useDataRefresh(load);

  // Datas viram itens do mesmo calendário (marcador + linha), sem bloco à parte.
  const dateEntries = useMemo(() => dates.map((g) => ({
    id: `gift-${g.id}`,
    kind: 'data',
    giftId: g.id,
    title: g.title,
    date: g.date,
    time: '',
    shared: 1,
  })), [dates]);

  const all = useMemo(() => [...(events || []), ...dateEntries]
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.time).localeCompare(String(b.time))), [events, dateEntries]);

  const byDate = useMemo(() => {
    const map = {};
    all.forEach((e) => { (map[e.date] ||= []).push(e); });
    return map;
  }, [all]);

  const upcoming = useMemo(() => {
    const t = todayISO();
    if (selected) return byDate[selected] || [];
    return all.filter((e) => e.date >= t).slice(0, 12);
  }, [all, selected, byDate]);

  async function save(f) {
    setSaving(true);
    try {
      const body = { title: f.title.trim(), date: f.date, time: f.time || '', location: f.location, notes: f.notes, shared: f.shared };
      if (sheet?.id) await api(`/api/events/${sheet.id}`, { method: 'PATCH', body });
      else await api('/api/events', { method: 'POST', body });
      load();
      setSheet(null);
      toast(sheet?.id ? 'Evento atualizado ✓' : 'Evento na agenda ✓');
    } catch (e) {
      toast(e.message, { tone: 'error' });
    } finally { setSaving(false); }
  }

  // Excluir some na hora e vai pro servidor depois — dá tempo de desfazer.
  function remove(ev) {
    setSheet(null);
    undoable({
      message: `“${ev.title}” excluído`,
      apply: () => setEvents((list) => (list || []).filter((e) => e.id !== ev.id)),
      revert: () => setEvents((list) => [...(list || []), ev].sort((a, b) => a.date.localeCompare(b.date))),
      commit: () => api(`/api/events/${ev.id}`, { method: 'DELETE' }),
    });
  }

  async function subscribe() {
    try {
      const { url } = calUrl ? { url: calUrl } : await api('/api/calendar/token');
      setCalUrl(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast('Link do calendário copiado — assine no Google/Apple Agenda.');
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
  }

  const cells = monthGrid(cursor.y, cursor.m);
  const shift = (n) => setCursor(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <div>
      <div className="flex items-end justify-between pt-6 pb-3">
        <h1 className="font-display text-[1.9rem]">Agenda</h1>
        <button onClick={subscribe} className="flex items-center gap-1.5 text-sm text-accent font-medium py-2" aria-label="Assinar calendário">
          <Icon name="link" size={15} /> No meu calendário
        </button>
      </div>

      <Card className="mb-5 !p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => shift(-1)} aria-label="Mês anterior" className="w-8 h-8 rounded-full grid place-items-center text-ink-2 hover:bg-accent-soft/50"><Icon name="back" size={16} /></button>
          <span className="font-semibold capitalize">{MONTHS[cursor.m]} {cursor.y}</span>
          <button onClick={() => shift(1)} aria-label="Próximo mês" className="w-8 h-8 rounded-full grid place-items-center text-ink-2 hover:bg-accent-soft/50 [transform:scaleX(-1)]"><Icon name="back" size={16} /></button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {DOW.map((d, i) => <div key={i} className="text-[.7rem] font-semibold text-ink-3">{d}</div>)}
          {cells.map((iso, i) => {
            if (!iso) return <div key={i} />;
            const day = Number(iso.slice(-2));
            const isToday = iso === todayISO();
            const isSel = iso === selected;
            const has = byDate[iso]?.length;
            return (
              <button key={i} onClick={() => setSelected(isSel ? null : iso)}
                className={`relative mx-auto w-9 h-9 rounded-full grid place-items-center text-sm transition-colors
                  ${isSel ? 'bg-accent text-accent-ink' : isToday ? 'bg-accent-soft text-accent-press font-semibold' : 'text-ink hover:bg-accent-soft/50'}`}>
                {day}
                {has ? <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSel ? 'bg-accent-ink' : 'bg-accent'}`} /> : null}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3">
          {selected ? fmtLong(selected) : 'Próximos'}
        </p>
        {selected && <button onClick={() => setSelected(null)} className="text-sm text-accent">ver todos</button>}
      </div>

      {events === null ? (
        <div className="py-10 text-center"><Spinner /></div>
      ) : upcoming.length === 0 ? (
        <EmptyState icon="calendar" title="Nada por aqui ainda" actions={<Btn onClick={() => setSheet({})} className="!px-5 !py-2.5 !text-sm">Criar evento</Btn>}>
          {selected ? 'Nenhum evento neste dia.' : 'Adicione o próximo date, aniversário ou lembrete de vocês.'}
        </EmptyState>
      ) : (
        <div className="space-y-2.5">
          {upcoming.map((e) => (
            <button key={e.id} onClick={() => (e.kind === 'data' ? nav(`/app/presentes/${e.giftId}`) : setSheet(e))} className="w-full text-left flex gap-3 items-stretch">
              <div className="flex-none w-16 pt-0.5 text-right">
                <div className="text-sm font-semibold text-accent">{e.kind === 'data' ? `${Math.max(0, daysUntil(e.date))}d` : (e.time || '—')}</div>
                {!selected && <div className="text-[.7rem] text-ink-3 capitalize">{fmtLong(e.date)}</div>}
              </div>
              <div className="w-0.5 rounded bg-[var(--accent-line)]" />
              <Card className="flex-1 !p-3.5">
                <div className="font-medium text-[.95rem] flex items-center gap-1.5">
                  {e.kind === 'data' && <Icon name="gift" size={14} className="text-accent-press" />}
                  {e.title}
                  {!e.shared && <span className="text-[.65rem] px-1.5 py-0.5 rounded-full bg-tint text-ink-2">só você</span>}
                </div>
                {(e.location || e.notes) && <div className="text-sm text-ink-2 mt-0.5">{[e.location, e.notes].filter(Boolean).join(' · ')}</div>}
                <div className="text-[.7rem] text-ink-3 mt-1">
                  {e.kind === 'data' ? 'data importante' : (e.created_by === user.email ? 'você' : 'seu par')}
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {sheet && (
        <Sheet title={sheet.id ? 'Editar evento' : 'Novo evento'} onClose={() => setSheet(null)}>
          <EventForm initial={sheet.id ? sheet : { date: selected || todayISO() }} onSave={save} onClose={() => setSheet(null)} saving={saving} />
          {sheet.id && (
            <div className="flex flex-col gap-1 mt-3">
              <a href={`/api/events/${sheet.id}/ics`} className="w-full flex items-center justify-center gap-1.5 text-sm text-accent py-2">
                <Icon name="calendar" size={15} /> Adicionar ao meu calendário
              </a>
              <button onClick={() => remove(sheet)} className="w-full flex items-center justify-center gap-1.5 text-sm text-red-700/80 py-2">
                <Icon name="trash" size={15} /> Excluir evento
              </button>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
