import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { AppHeader, Card, Row, Spinner } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const d = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
const range = (s, e) => `${d(s)} – ${d(e)}`;

export default function ResumoTab() {
  const nav = useNavigate();
  const [week, setWeek] = useState(0);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => { api(`/api/weekly-report?week=${week}`).then((r) => setReport(r.report)); }, [week]);
  useEffect(() => { api('/api/weekly-report/history').then((h) => setHistory(h.history)); }, []);

  const stat = (n, label) => (
    <div className="bg-surface rounded-card p-4 text-center shadow-[0_1px_2px_rgba(43,37,33,.04),0_1px_0_var(--line)]">
      <div className="font-display text-2xl text-accent-press">{n}</div>
      <div className="text-xs text-ink-2 mt-0.5">{label}</div>
    </div>
  );

  return (
    <div>
      <AppHeader back={() => nav('/app/voces')} title="Resumo semanal" />

      {report === null ? (
        <div className="py-10 text-center"><Spinner /></div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setWeek(week + 1)} className="text-ink-3 hover:text-accent-press p-1"><Icon name="back" size={18} /></button>
            <div className="text-center">
              <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3">{range(report.start, report.end)}</p>
              <p className="font-display text-xl">{week === 0 ? 'A semana de vocês' : 'Semana anterior'}</p>
            </div>
            <button onClick={() => setWeek(Math.max(0, week - 1))} disabled={week === 0} className="text-ink-3 hover:text-accent-press p-1 disabled:opacity-30"><Icon name="chevronR" size={18} /></button>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {stat(report.checkins, 'check-ins')}
            {stat(report.events, 'eventos')}
            {stat(report.tasksClosed, 'tarefas')}
            {stat(report.moments, 'momentos')}
          </div>

          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Destaques da semana</p>
          <Card className="mb-4 space-y-3">
            {report.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex-none w-8 h-8 rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name={h.icon} size={16} /></span>
                <p className="text-[.95rem] leading-snug flex-1">{h.text}</p>
              </div>
            ))}
          </Card>

          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Pra próxima semana</p>
          <Card className="!p-0 mb-4">
            <Row icon="star" title="Planejar o próximo date" sub="Que tal algo ao ar livre?" onClick={() => nav('/app/agenda')} />
            <Row icon="chat" title="Responder a pergunta da semana" onClick={() => nav('/app/voces')} />
          </Card>

          {history.length > 0 && (
            <>
              <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Resumos anteriores</p>
              <Card className="!p-0">
                {history.slice(1).map((h, i) => (
                  <Row key={h.start} icon="calendar" title={range(h.start, h.end)}
                    sub={`${h.checkins} check-ins · ${h.events} eventos`} onClick={() => setWeek(i + 1)} />
                ))}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
