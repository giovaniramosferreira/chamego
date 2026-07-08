import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useSession } from '../../../lib/session-context.js';
import { Card, Row, Sheet, Fab, Field, Btn, Chip, Spinner, EmptyState } from '../../../ui/kit.jsx';
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
  const [events, setEvents] = useState(null);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selected, setSelected] = useState(null);
  const [sheet, setSheet] = useState(null); // null | {} (new) | event (edit)
  const [saving, setSaving] = useState(false);

  const [dates, setDates] = useState([]);
  const load = () => api('/api/events').then((d) => setEvents(d.events));
  useEffect(() => {
    load();
    const t = todayISO();
    api('/api/gifts').then((d) => setDates(
      (d.gifts || []).filter((g) => g.kind !== 'wishlist' && g.date && g.date >= t).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
    )).catch(() => {});
  }, []);

  const byDate = useMemo(() => {
    const map = {};
    (events || []).forEach((e) => { (map[e.date] ||= []).push(e); });
    return map;
  }, [events]);

  const upcoming = useMemo(() => {
    const t = todayISO();
    const list = (events || []).filter((e) => e.date >= t);
    return selected ? (byDate[selected] || []) : list.slice(0, 12);
  }, [events, selected, byDate]);

  async function save(f) {
    setSaving(true);
    try {
      const body = { title: f.title.trim(), date: f.date, time: f.time || '', location: f.location, notes: f.notes, shared: f.shared };
      if (sheet?.id) await api(`/api/events/${sheet.id}`, { method: 'PATCH', body });
      else await api('/api/events', { method: 'POST', body });
      await load();
      setSheet(null);
    } finally { setSaving(false); }
  }
  async function remove(id) {
    if (!confirm('Excluir este evento?')) return;
    await api(`/api/events/${id}`, { method: 'DELETE' });
    setSheet(null);
    load();
  }

  const cells = monthGrid(cursor.y, cursor.m);
  const shift = (n) => setCursor(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <div>
      <div className="flex items-end justify-between pt-6 pb-3">
        <h1 className="font-display text-[1.9rem]">Agenda</h1>
      </div>

      {dates.length > 0 && (
        <>
          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Datas importantes</p>
          <Card className="!p-0 mb-4">
            {dates.map((g) => {
              const d = daysUntil(g.date);
              return <Row key={g.id} icon="gift" title={g.title} sub={new Date(`${g.date}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                onClick={() => nav(`/app/presentes/${g.id}`)}
                right={<span className="text-xs font-semibold text-accent-press bg-accent-soft rounded-full px-2.5 py-1">{d <= 0 ? 'hoje' : `${d}d`}</span>} />;
            })}
          </Card>
        </>
      )}

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
          {selected ? fmtLong(selected) : 'Próximos eventos'}
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
            <button key={e.id} onClick={() => setSheet(e)} className="w-full text-left flex gap-3 items-stretch">
              <div className="flex-none w-16 pt-0.5 text-right">
                <div className="text-sm font-semibold text-accent">{e.time || '—'}</div>
                {!selected && <div className="text-[.7rem] text-ink-3 capitalize">{fmtLong(e.date)}</div>}
              </div>
              <div className="w-0.5 rounded bg-[var(--accent-line)]" />
              <Card className="flex-1 !p-3.5">
                <div className="font-medium text-[.95rem] flex items-center gap-1.5">
                  {e.title}
                  {!e.shared && <span className="text-[.65rem] px-1.5 py-0.5 rounded-full bg-tint text-ink-2">só você</span>}
                </div>
                {(e.location || e.notes) && <div className="text-sm text-ink-2 mt-0.5">{[e.location, e.notes].filter(Boolean).join(' · ')}</div>}
                <div className="text-[.7rem] text-ink-3 mt-1">{e.created_by === user.email ? 'você' : 'seu par'}</div>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Fab onClick={() => setSheet({})} label="Novo evento" />

      {sheet && (
        <Sheet title={sheet.id ? 'Editar evento' : 'Novo evento'} onClose={() => setSheet(null)}>
          <EventForm initial={sheet.id ? sheet : { date: selected || todayISO() }} onSave={save} onClose={() => setSheet(null)} saving={saving} />
          {sheet.id && (
            <button onClick={() => remove(sheet.id)} className="w-full mt-3 flex items-center justify-center gap-1.5 text-sm text-red-700/80 py-2">
              <Icon name="trash" size={15} /> Excluir evento
            </button>
          )}
        </Sheet>
      )}
    </div>
  );
}
