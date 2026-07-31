import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useDataRefresh } from '../../../lib/refresh.js';
import { useSession } from '../../../lib/session-context.js';
import { useToast } from '../../../lib/toast-context.js';
import { formatarBRL, paraCampo, paraCentavos } from '../../../lib/dinheiro.js';
import { FREQUENCIAS, TIPOS, podeMarcar, tipoDe } from '../../../lib/tipos-agenda.js';
import { Card, Sheet, Field, Btn, Chip, Spinner, EmptyState, TopBar } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const todayISO = () => new Date().toLocaleDateString('en-CA');
const daysUntil = (iso) => Math.ceil((new Date(`${iso}T00:00:00`).getTime() - Date.now()) / 86_400_000);
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const somaDias = (data, n) => {
  const [a, m, d] = data.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d) + n * 86_400_000).toISOString().slice(0, 10);
};

function monthGrid(year, month) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: first }, () => null);
  for (let d = 1; d <= days; d++) cells.push(iso(year, month, d));
  return cells;
}

function fmtLong(data) {
  const t = todayISO();
  const tomorrow = new Date(Date.now() + 86_400_000).toLocaleDateString('en-CA');
  if (data === t) return 'Hoje';
  if (data === tomorrow) return 'Amanhã';
  return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

/* ── O formulário que muda de pergunta conforme o tipo ────────────────────── */

function EventForm({ initial, onSave, onClose, saving, parceiro, meuEmail }) {
  const [f, setF] = useState(() => ({
    title: '', date: todayISO(), time: '', location: '', notes: '', shared: true,
    kind: 'evento', recurrence: '', until: '', installments: '',
    valor: '', payee: '', estimated: false, assignee: '',
    ...initial,
  }));
  const tipo = tipoDe(f.kind);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // Escolher o tipo já responde a pergunta mais chata (de quanto em quanto
  // tempo isso acontece) com o padrão que quase sempre é o certo.
  function escolherTipo(key) {
    const novo = tipoDe(key);
    setF((atual) => ({
      ...atual,
      kind: key,
      recurrence: atual.tocouRepeticao ? atual.recurrence : novo.repetePadrao,
    }));
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <p className="text-sm font-medium text-ink-2 mb-1.5">O que é?</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {TIPOS.map((t) => (
          <Chip key={t.key} active={f.kind === t.key} onClick={() => escolherTipo(t.key)}>
            {t.label}
          </Chip>
        ))}
      </div>

      <Field label="O quê?" placeholder={tipo.exemplo} value={f.title} onChange={set('title')} autoFocus required />

      <div className="grid grid-cols-2 gap-3">
        <Field label={f.recurrence ? 'Começa em' : 'Data'} type="date" value={f.date} onChange={set('date')} required />
        <Field label="Hora (opcional)" type="time" value={f.time} onChange={set('time')} />
      </div>

      <p className="text-sm font-medium text-ink-2 mb-1.5">Repete?</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {FREQUENCIAS.map((r) => (
          <Chip key={r.key} active={f.recurrence === r.key}
            onClick={() => setF({ ...f, recurrence: r.key, tocouRepeticao: true })}>
            {r.label}
          </Chip>
        ))}
      </div>

      {tipo.valor && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor" inputMode="decimal" placeholder="1.800,00" value={f.valor} onChange={set('valor')} />
            <Field label="Pra quem?" placeholder="Imobiliária" value={f.payee} onChange={set('payee')} />
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Chip active={!f.estimated} onClick={() => setF({ ...f, estimated: false })}>Valor certo</Chip>
            <Chip active={f.estimated} onClick={() => setF({ ...f, estimated: true })}>É estimativa</Chip>
          </div>
          {tipo.parcelas && f.recurrence && (
            <Field label="Parcelas (opcional)" type="number" min="1" max="360" placeholder="12x — deixe vazio se não acaba"
              value={f.installments} onChange={set('installments')} />
          )}
        </>
      )}

      {tipo.responsavel && parceiro && (
        <>
          <p className="text-sm font-medium text-ink-2 mb-1.5">De quem é?</p>
          <div className="flex flex-wrap gap-2 mb-4">
            <Chip active={!f.assignee} onClick={() => setF({ ...f, assignee: '' })}>Dos dois</Chip>
            <Chip active={f.assignee === meuEmail} onClick={() => setF({ ...f, assignee: meuEmail })}>Você</Chip>
            <Chip active={f.assignee === parceiro.email} onClick={() => setF({ ...f, assignee: parceiro.email })}>
              {parceiro.name?.split(' ')[0] || 'Seu par'}
            </Chip>
          </div>
        </>
      )}

      <Field label="Onde? (opcional)" placeholder="Restaurante Oliva" value={f.location} onChange={set('location')} />
      <Field label="Notas (opcional)" placeholder="Levar o presente" value={f.notes} onChange={set('notes')} />

      <div className="flex gap-2 mb-5">
        <Chip active={f.shared} onClick={() => setF({ ...f, shared: true })}>💞 Compartilhado</Chip>
        <Chip active={!f.shared} onClick={() => setF({ ...f, shared: false })}>🙋 Só você</Chip>
      </div>

      <Btn type="submit" block disabled={saving || !f.title.trim()}>{saving ? <Spinner /> : 'Salvar'}</Btn>
      {initial?.id && <button type="button" onClick={onClose} className="w-full mt-3 text-sm text-ink-2">Cancelar</button>}
    </form>
  );
}

/* ── A agenda ─────────────────────────────────────────────────────────────── */

export default function AgendaTab() {
  const nav = useNavigate();
  const { user, partner } = useSession();
  const { toast } = useToast();
  const [ocorrencias, setOcorrencias] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [dates, setDates] = useState([]);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selected, setSelected] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [saving, setSaving] = useState(false);
  const [calUrl, setCalUrl] = useState('');

  // A janela cobre o mês que está na tela e os próximos meses da lista, porque
  // repetição não existe como linha: ela é calculada dentro de um intervalo.
  // `hoje` é fixado uma vez na montagem: recalcular a cada render deixaria a
  // janela instável na virada da meia-noite, no meio de uma interação.
  const [hoje] = useState(todayISO);
  const janela = useMemo(() => {
    const doMes = iso(cursor.y, cursor.m, 1);
    const fimDoMes = iso(cursor.y, cursor.m, new Date(cursor.y, cursor.m + 1, 0).getDate());
    const daquiATresMeses = somaDias(hoje, 92);
    return { de: doMes < hoje ? doMes : hoje, ate: fimDoMes > daquiATresMeses ? fimDoMes : daquiATresMeses };
  }, [cursor, hoje]);

  const load = useCallback(() => {
    api(`/api/agenda?de=${janela.de}&ate=${janela.ate}`)
      .then((d) => setOcorrencias(d.ocorrencias)).catch(() => setOcorrencias([]));
    // O evento cru é o que o formulário edita — a ocorrência é só uma data dele.
    api('/api/events').then((d) => setEventos(d.events || [])).catch(() => {});
    // Datas importantes moram aqui também: uma data é uma data, no calendário.
    api('/api/gifts').then((d) => setDates((d.gifts || []).filter((g) => g.kind !== 'wishlist' && g.date))).catch(() => {});
  }, [janela]);
  useEffect(() => { load(); }, [load]);
  useDataRefresh(load);

  const dateEntries = useMemo(() => dates.map((g) => ({
    eventId: `gift-${g.id}`, giftId: g.id, kind: 'data', title: g.title, date: g.date, time: '', shared: true,
  })), [dates]);

  const all = useMemo(() => [...(ocorrencias || []), ...dateEntries]
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.time).localeCompare(String(b.time))), [ocorrencias, dateEntries]);

  const byDate = useMemo(() => {
    const map = {};
    all.forEach((e) => { (map[e.date] ||= []).push(e); });
    return map;
  }, [all]);

  const lista = useMemo(() => {
    if (selected) return byDate[selected] || [];
    const t = todayISO();
    return all.filter((e) => e.date >= t).slice(0, 15);
  }, [all, selected, byDate]);

  // Contas em aberto do mês na tela: o número que faz a pessoa abrir a aba.
  const totalAberto = useMemo(() => (ocorrencias || [])
    .filter((o) => o.kind === 'conta' && !o.done && o.amount && o.date.slice(0, 7) === iso(cursor.y, cursor.m, 1).slice(0, 7))
    .reduce((t, o) => t + o.amount, 0), [ocorrencias, cursor]);

  async function save(f) {
    setSaving(true);
    try {
      const body = {
        title: f.title.trim(), date: f.date, time: f.time || '', location: f.location, notes: f.notes,
        shared: f.shared, kind: f.kind, recurrence: f.recurrence, until: f.until || '',
        installments: f.installments === '' ? null : Number(f.installments),
        amount: tipoDe(f.kind).valor ? paraCentavos(f.valor) : null,
        payee: f.payee || '', estimated: !!f.estimated, assignee: f.assignee || '',
      };
      if (sheet?.id) await api(`/api/events/${sheet.id}`, { method: 'PATCH', body });
      else await api('/api/events', { method: 'POST', body });
      load();
      setSheet(null);
      toast(sheet?.id ? 'Atualizado ✓' : 'Na agenda ✓');
    } catch (e) {
      toast(e.message, { tone: 'error' });
    } finally { setSaving(false); }
  }

  // Marcar vale só pra esta data. O aluguel de fevereiro continua em aberto
  // depois de pagar o de janeiro — que é o ponto inteiro de ter ocorrência.
  async function alternar(o) {
    const proximo = !o.done;
    setOcorrencias((lista) => (lista || []).map((x) => (x.eventId === o.eventId && x.date === o.date ? { ...x, done: proximo } : x)));
    try {
      await api(`/api/agenda/${o.eventId}/${o.date}`, { method: 'POST', body: { done: proximo } });
      load();
    } catch (e) {
      toast(e.message, { tone: 'error' });
      load();
    }
  }

  function abrir(o) {
    if (o.kind === 'data') return nav(`/app/presentes/${o.giftId}`);
    const ev = eventos.find((e) => e.id === o.eventId);
    if (!ev) return;
    setSheet({ ...ev, shared: !!ev.shared, estimated: !!ev.estimated, valor: paraCampo(ev.amount), installments: ev.installments ?? '' });
  }

  async function remove(ev) {
    setSheet(null);
    try {
      await api(`/api/events/${ev.id}`, { method: 'DELETE' });
      toast(`“${ev.title}” excluído`);
      load();
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
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
      <TopBar className="flex items-end justify-between pt-6 pb-3">
        <h1 className="font-display text-[1.9rem]">Agenda</h1>
        <button onClick={subscribe} className="flex items-center gap-1.5 text-sm text-accent font-medium py-2" aria-label="Assinar calendário">
          <Icon name="link" size={15} /> No meu calendário
        </button>
      </TopBar>

      <Card className="mb-3 !p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => shift(-1)} aria-label="Mês anterior" className="w-8 h-8 rounded-full grid place-items-center text-ink-2 hover:bg-accent-soft/50"><Icon name="back" size={16} /></button>
          <span className="font-semibold capitalize">{MONTHS[cursor.m]} {cursor.y}</span>
          <button onClick={() => shift(1)} aria-label="Próximo mês" className="w-8 h-8 rounded-full grid place-items-center text-ink-2 hover:bg-accent-soft/50 [transform:scaleX(-1)]"><Icon name="back" size={16} /></button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {DOW.map((d, i) => <div key={i} className="text-[.7rem] font-semibold text-ink-3">{d}</div>)}
          {cells.map((data, i) => {
            if (!data) return <div key={i} />;
            const day = Number(data.slice(-2));
            const isToday = data === todayISO();
            const isSel = data === selected;
            const doDia = byDate[data] || [];
            const temConta = doDia.some((e) => e.kind === 'conta' && !e.done);
            return (
              <button key={i} onClick={() => setSelected(isSel ? null : data)}
                className={`relative mx-auto w-9 h-9 rounded-full grid place-items-center text-sm transition-colors
                  ${isSel ? 'bg-accent text-accent-ink' : isToday ? 'bg-accent-soft text-accent-press font-semibold' : 'text-ink hover:bg-accent-soft/50'}`}>
                {day}
                {/* Conta em aberto ganha marcador próprio: é o que não pode passar batido. */}
                {doDia.length ? <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSel ? 'bg-accent-ink' : temConta ? 'bg-red-700/70' : 'bg-accent'}`} /> : null}
              </button>
            );
          })}
        </div>
      </Card>

      {totalAberto > 0 && (
        <button onClick={() => nav(`/app/contas?mes=${iso(cursor.y, cursor.m, 1).slice(0, 7)}`)}
          className="w-full mb-5 flex items-center gap-3 bg-surface rounded-card p-4 shadow-[0_1px_2px_rgba(43,37,33,.04),0_1px_0_var(--line)] text-left">
          <span className="flex-none w-9 h-9 rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name="money" size={17} /></span>
          <span className="flex-1">
            <span className="block text-sm text-ink-2">Contas em aberto neste mês</span>
            <span className="block font-display text-xl">{formatarBRL(totalAberto)}</span>
          </span>
          <Icon name="chevronR" size={14} className="text-ink-3" />
        </button>
      )}

      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3">
          {selected ? fmtLong(selected) : 'Próximos'}
        </p>
        {selected && <button onClick={() => setSelected(null)} className="text-sm text-accent">ver todos</button>}
      </div>

      {ocorrencias === null ? (
        <div className="py-10 text-center"><Spinner /></div>
      ) : lista.length === 0 ? (
        <EmptyState icon="calendar" title="Nada por aqui ainda" actions={<Btn onClick={() => setSheet({ date: selected || todayISO() })} className="!px-5 !py-2.5 !text-sm">Criar</Btn>}>
          {selected ? 'Nada marcado neste dia.' : 'Conta que vence, faxina de terça, consulta, aniversário — tudo cabe aqui.'}
        </EmptyState>
      ) : (
        <div className="space-y-2.5">
          {lista.map((o) => (
            <Ocorrencia key={`${o.eventId}-${o.date}`} o={o} mostrarData={!selected}
              user={user} partner={partner} onAbrir={() => abrir(o)} onAlternar={() => alternar(o)} />
          ))}
        </div>
      )}

      {sheet && (
        <Sheet title={sheet.id ? 'Editar' : 'Novo na agenda'} onClose={() => setSheet(null)}>
          <EventForm initial={sheet.id ? sheet : { date: selected || todayISO() }} onSave={save}
            onClose={() => setSheet(null)} saving={saving} parceiro={partner} meuEmail={user.email} />
          {sheet.id && (
            <div className="flex flex-col gap-1 mt-3">
              <a href={`/api/events/${sheet.id}/ics`} className="w-full flex items-center justify-center gap-1.5 text-sm text-accent py-2">
                <Icon name="calendar" size={15} /> Adicionar ao meu calendário
              </a>
              <button onClick={() => remove(sheet)} className="w-full flex items-center justify-center gap-1.5 text-sm text-red-700/80 py-2">
                <Icon name="trash" size={15} /> Excluir {sheet.recurrence ? 'e toda a repetição' : ''}
              </button>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}

function Ocorrencia({ o, mostrarData, user, partner, onAbrir, onAlternar }) {
  const tipo = tipoDe(o.kind);
  const marcavel = o.kind !== 'data' && podeMarcar(o.kind);
  const atrasada = !o.done && o.date < todayISO();
  const dono = o.assignee === user.email ? 'você'
    : o.assignee && o.assignee === partner?.email ? (partner.name?.split(' ')[0] || 'seu par') : '';

  return (
    <div className="flex gap-3 items-stretch">
      <div className="flex-none w-16 pt-0.5 text-right">
        <div className={`text-sm font-semibold ${atrasada ? 'text-red-700/80' : 'text-accent'}`}>
          {o.kind === 'data' ? `${Math.max(0, daysUntil(o.date))}d` : (o.time || '—')}
        </div>
        {mostrarData && <div className="text-[.7rem] text-ink-3 first-letter:uppercase">{fmtLong(o.date)}</div>}
      </div>
      <div className={`w-0.5 rounded ${atrasada ? 'bg-red-700/40' : 'bg-[var(--accent-line)]'}`} />
      <Card className={`flex-1 !p-3.5 ${o.done ? 'opacity-55' : ''}`}>
        <div className="flex items-start gap-2.5">
          {marcavel && (
            <button onClick={onAlternar} aria-label={tipo.acaoLabel}
              className={`flex-none mt-0.5 w-5 h-5 rounded-full grid place-items-center transition-colors
                ${o.done ? 'bg-accent text-accent-ink' : 'shadow-[inset_0_0_0_1.5px_var(--line-2)] text-transparent'}`}>
              <Icon name="check" size={12} />
            </button>
          )}
          <button onClick={onAbrir} className="flex-1 text-left min-w-0">
            <div className={`font-medium text-[.95rem] flex items-center gap-1.5 ${o.done ? 'line-through' : ''}`}>
              {o.kind !== 'evento' && <Icon name={o.kind === 'data' ? 'gift' : tipo.icon} size={14} className="text-accent-press flex-none" />}
              <span className="truncate">{o.title}</span>
              {!o.shared && <span className="flex-none text-[.65rem] px-1.5 py-0.5 rounded-full bg-tint text-ink-2">só você</span>}
            </div>

            {o.amount != null && (
              <div className="text-sm mt-0.5">
                <span className={o.done ? 'text-ink-2' : 'font-semibold'}>
                  {o.estimated && !o.done ? '~' : ''}{formatarBRL(o.done ? (o.paidAmount ?? o.amount) : o.amount)}
                </span>
                {o.payee && <span className="text-ink-2"> · {o.payee}</span>}
                {o.parcela && <span className="text-ink-2"> · {o.parcela.n}/{o.parcela.de}</span>}
              </div>
            )}
            {(o.location || o.notes) && <div className="text-sm text-ink-2 mt-0.5">{[o.location, o.notes].filter(Boolean).join(' · ')}</div>}

            <div className="text-[.7rem] text-ink-3 mt-1 flex flex-wrap gap-x-2">
              {o.kind === 'data' ? <span>data importante</span> : o.recorrencia && <span>{o.recorrencia}</span>}
              {dono && <span>de {dono}</span>}
              {atrasada && <span className="text-red-700/80">{o.kind === 'conta' ? 'venceu' : 'atrasado'}</span>}
            </div>
          </button>
        </div>
      </Card>
    </div>
  );
}
