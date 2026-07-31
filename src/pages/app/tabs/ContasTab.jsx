import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useDataRefresh } from '../../../lib/refresh.js';
import { useToast } from '../../../lib/toast-context.js';
import { formatarBRL, paraCentavos } from '../../../lib/dinheiro.js';
import { AppHeader, Card, Btn, Field, Sheet, Spinner, EmptyState } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mesAtual = () => new Date().toLocaleDateString('en-CA').slice(0, 7);
const nomeDoMes = (mes) => `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;
const hojeISO = () => new Date().toLocaleDateString('en-CA');

function deslocarMes(mes, n) {
  const d = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// O mês de vocês em dinheiro. Existe porque digitar valor sem nunca ver a soma
// é digitar à toa — e porque "quanto sai esse mês" é a pergunta que se faz na
// cozinha, não olhando doze linhas de calendário.
export default function ContasTab() {
  const nav = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [mes, setMes] = useState(() => (/^\d{4}-\d{2}$/.test(params.get('mes') || '') ? params.get('mes') : mesAtual()));
  const [dados, setDados] = useState(null);
  const [pagando, setPagando] = useState(null);
  const [valorPago, setValorPago] = useState('');

  const carregar = useCallback(() => {
    api(`/api/contas?mes=${mes}`).then(setDados).catch(() => setDados(null));
  }, [mes]);
  useEffect(() => { carregar(); }, [carregar]);
  useDataRefresh(carregar);

  async function marcar(conta, amount) {
    try {
      await api(`/api/agenda/${conta.eventId}/${conta.date}`, { method: 'POST', body: { done: true, amount } });
      setPagando(null);
      carregar();
      toast('Pago ✓');
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
  }

  async function desmarcar(conta) {
    try {
      await api(`/api/agenda/${conta.eventId}/${conta.date}`, { method: 'POST', body: { done: false } });
      carregar();
    } catch (e) {
      toast(e.message, { tone: 'error' });
    }
  }

  // Estimativa vira valor de verdade na hora de pagar: a conta de luz nunca
  // vem igual ao palpite, e obrigar a editar o evento seria absurdo.
  function abrirPagamento(conta) {
    if (conta.estimated) {
      setValorPago(((conta.amount ?? 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setPagando(conta);
    } else {
      marcar(conta, conta.amount);
    }
  }

  if (dados === null) return <div className="py-20 text-center"><Spinner /></div>;

  const { contas = [], porDestino = [] } = dados;
  const abertas = contas.filter((c) => !c.done);
  const pagas = contas.filter((c) => c.done);
  const vencidas = abertas.filter((c) => c.date < hojeISO());

  return (
    <div className="pt-3">
      <AppHeader back={() => nav('/app/agenda')} title="Contas do mês" />

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMes(deslocarMes(mes, -1))} aria-label="Mês anterior"
          className="w-9 h-9 rounded-full grid place-items-center text-ink-2 hover:bg-accent-soft/50"><Icon name="back" size={16} /></button>
        <span className="font-semibold first-letter:uppercase">{nomeDoMes(mes)}</span>
        <button onClick={() => setMes(deslocarMes(mes, 1))} aria-label="Próximo mês"
          className="w-9 h-9 rounded-full grid place-items-center text-ink-2 hover:bg-accent-soft/50 [transform:scaleX(-1)]"><Icon name="back" size={16} /></button>
      </div>

      {contas.length === 0 ? (
        <EmptyState icon="money" title="Nenhuma conta neste mês"
          actions={<Btn onClick={() => nav('/app/agenda')} className="!px-5 !py-2.5 !text-sm">Ir pra agenda</Btn>}>
          Lance aluguel, diarista ou parcela na agenda como “Conta”, com valor e
          repetição — o fechamento do mês aparece aqui sozinho.
        </EmptyState>
      ) : (
        <>
          <Card className="mb-4 text-center">
            <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-1">
              Sai neste mês{dados.temEstimativa ? ' (com estimativa)' : ''}
            </p>
            <p className="font-display text-[2.2rem] text-accent leading-none my-1">
              {dados.temEstimativa ? '~' : ''}{formatarBRL(dados.total)}
            </p>
            <div className="flex justify-center gap-4 text-sm text-ink-2 mt-2">
              <span>{formatarBRL(dados.pago)} pago</span>
              <span className="text-line">·</span>
              <span className={dados.aberto > 0 ? 'font-medium text-ink' : ''}>{formatarBRL(dados.aberto)} em aberto</span>
            </div>
            {vencidas.length > 0 && (
              <p className="text-sm text-red-700/80 mt-2">
                {vencidas.length === 1 ? '1 conta venceu' : `${vencidas.length} contas venceram`} e continua{vencidas.length === 1 ? '' : 'm'} em aberto
              </p>
            )}
          </Card>

          {abertas.length > 0 && (
            <>
              <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">A pagar</p>
              <div className="space-y-2.5 mb-5">
                {abertas.map((c) => <Linha key={`${c.eventId}-${c.date}`} c={c} onAcao={() => abrirPagamento(c)} />)}
              </div>
            </>
          )}

          {porDestino.length > 1 && (
            <>
              <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Pra onde vai</p>
              <Card className="mb-5 !p-4">
                {porDestino.map((d) => (
                  <div key={d.destino} className="flex items-center gap-3 py-1.5">
                    <span className="flex-1 text-[.95rem] truncate">{d.destino}</span>
                    {d.quantos > 1 && <span className="text-xs text-ink-3">{d.quantos}x</span>}
                    <span className="font-medium tabular-nums">{formatarBRL(d.total)}</span>
                  </div>
                ))}
              </Card>
            </>
          )}

          {pagas.length > 0 && (
            <>
              <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Já pago</p>
              <div className="space-y-2.5 pb-4">
                {pagas.map((c) => <Linha key={`${c.eventId}-${c.date}`} c={c} paga onAcao={() => desmarcar(c)} />)}
              </div>
            </>
          )}
        </>
      )}

      {pagando && (
        <Sheet title="Quanto foi?" onClose={() => setPagando(null)}>
          <p className="text-sm text-ink-2 mb-4">
            {pagando.title} era estimativa de {formatarBRL(pagando.amount)}. O que entra na conta do mês
            é o que vocês pagaram de verdade.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); marcar(pagando, paraCentavos(valorPago) ?? pagando.amount); }}>
            <Field label="Valor pago" inputMode="decimal" value={valorPago} onChange={(e) => setValorPago(e.target.value)} autoFocus />
            <Btn type="submit" block>Marcar como paga</Btn>
          </form>
        </Sheet>
      )}
    </div>
  );
}

function Linha({ c, paga = false, onAcao }) {
  const vencida = !paga && c.date < hojeISO();
  const dia = Number(c.date.slice(-2));
  return (
    <div className="flex gap-3 items-stretch">
      <div className="flex-none w-10 pt-0.5 text-right">
        <div className={`text-sm font-semibold ${vencida ? 'text-red-700/80' : 'text-accent'}`}>{dia}</div>
      </div>
      <div className={`w-0.5 rounded ${vencida ? 'bg-red-700/40' : 'bg-[var(--accent-line)]'}`} />
      <Card className={`flex-1 !p-3.5 flex items-center gap-3 ${paga ? 'opacity-60' : ''}`}>
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-[.95rem] truncate ${paga ? 'line-through' : ''}`}>{c.title}</div>
          <div className="text-sm text-ink-2">
            {c.estimated && !paga ? '~' : ''}{formatarBRL(paga ? (c.paidAmount ?? c.amount) : c.amount)}
            {c.payee && ` · ${c.payee}`}
            {c.parcela && ` · ${c.parcela.n}/${c.parcela.de}`}
          </div>
          {vencida && <div className="text-[.7rem] text-red-700/80 mt-0.5">venceu</div>}
        </div>
        <button onClick={onAcao} aria-label={paga ? 'Desmarcar' : 'Marcar como paga'}
          className={`flex-none w-7 h-7 rounded-full grid place-items-center transition-colors
            ${paga ? 'bg-accent text-accent-ink' : 'shadow-[inset_0_0_0_1.5px_var(--line-2)] text-transparent hover:text-ink-3'}`}>
          <Icon name="check" size={14} />
        </button>
      </Card>
    </div>
  );
}
