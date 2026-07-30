import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, apiUpload } from '../../../lib/api.js';
import { useToast } from '../../../lib/toast-context.js';
import { AppHeader, Card, Btn, Sheet, Field, Spinner } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// Modo cozinha: um passo por tela, timer quando o passo tem espera e tela acesa.
// Mão suja não faz gesto extra — e é aqui que nasce o "cozinhamos", que é a
// única métrica que diz se a feature resolve o problema.
export default function ReceitaDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const spinId = params.get('spin');

  const [receita, setReceita] = useState(null);
  const [erro, setErro] = useState('');
  const modo = params.get('modo') === 'cozinha' ? 'cozinhando' : 'resumo';
  const [passo, setPasso] = useState(0);
  const [restante, setRestante] = useState(null);
  const [fim, setFim] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [momento, setMomento] = useState('');
  const wakeLock = useRef(null);

  useEffect(() => {
    api(`/api/cozinha/receitas/${id}`).then((d) => setReceita(d.receita)).catch((e) => setErro(e.message));
  }, [id]);

  // Tela acesa só durante o modo cozinha, e liberada ao sair.
  const soltarTela = useCallback(() => {
    wakeLock.current?.release?.().catch(() => {});
    wakeLock.current = null;
  }, []);
  useEffect(() => {
    if (modo !== 'cozinhando') { soltarTela(); return; }
    navigator.wakeLock?.request('screen').then((l) => { wakeLock.current = l; }).catch(() => {});
    return soltarTela;
  }, [modo, soltarTela]);

  // Timer do passo atual: um tique por segundo; ao zerar, vibra e some.
  useEffect(() => {
    if (restante === null) return;
    const t = setTimeout(() => {
      setRestante((r) => {
        if (r === null) return null;
        if (r > 1) return r - 1;
        // Vibra em vez de tocar: cozinha é barulhenta e o celular fica na bancada.
        navigator.vibrate?.([200, 100, 200]);
        toast('Tempo! Pode ir pro próximo passo.');
        return null;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [restante, toast]);

  async function marcarDesfecho(desfecho) {
    if (!spinId) return;
    await api(`/api/cozinha/spins/${spinId}/desfecho`, { method: 'POST', body: { desfecho } }).catch(() => {});
  }

  async function cozinhamos() {
    setSalvando(true);
    try {
      const { sugestaoMomento } = await api('/api/cozinha/cozinhei', { method: 'POST', body: { receitaId: id, spinId } });
      setMomento(sugestaoMomento);
      setFim(true);
    } catch (e) {
      toast(e.message, { tone: 'error' });
    } finally { setSalvando(false); }
  }

  async function guardarMomento() {
    const fd = new FormData();
    fd.append('text', momento);
    fd.append('date', new Date().toLocaleDateString('en-CA'));
    try {
      await apiUpload('/api/moments', fd);
      toast('Momento guardado 💛');
    } catch (e) {
      if (!e.upgrade) toast(e.message, { tone: 'error' });
    }
    nav('/app/momentos');
  }

  if (erro) return <div className="pt-3"><AppHeader back={() => nav('/app/cozinha')} title="Receita" /><p className="text-ink-2 py-8 text-center">{erro}</p></div>;
  if (!receita) return <div className="py-20 text-center"><Spinner /></div>;

  if (modo === 'resumo') {
    return (
      <div className="pt-3">
        <AppHeader back={() => { marcarDesfecho('pulou'); nav('/app/cozinha'); }} title={receita.titulo} />

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-2 mb-3">
          <span className="flex items-center gap-1"><Icon name="clock" size={14} /> {receita.tempoMin} min</span>
          <span>{receita.porcoes} porções</span>
          <span>~R$ {receita.custo}</span>
        </div>
        <p className={`text-sm mb-4 ${receita.temTudo ? 'text-accent-press' : 'text-ink-2'}`}>{receita.rotuloFalta}</p>

        {receita.falta?.length > 0 && (
          <Card className="mb-4 !p-4">
            <p className="text-sm text-ink-2 mb-2">Falta comprar:</p>
            <p className="text-[.95rem] mb-3">{receita.falta.join(', ')}</p>
            <Btn variant="ghost" className="!px-4 !py-2 !text-sm" onClick={async () => {
              // Vai direto pra lista de mercado do casal — sem copiar e colar.
              try {
                const { lists } = await api('/api/lists');
                const mercado = lists.find((l) => /mercado|compras/i.test(l.title)) || lists[0];
                const alvo = mercado || (await api('/api/lists', { method: 'POST', body: { title: 'Mercado', icon: 'shopping' } })).list;
                for (const nome of receita.falta) {
                  await api(`/api/lists/${alvo.id}/items`, { method: 'POST', body: { text: nome } });
                }
                toast(`Adicionado em ${alvo.title} ✓`, { action: { label: 'Ver lista', onClick: () => nav(`/app/listas/${alvo.id}`) } });
              } catch (e) {
                toast(e.message, { tone: 'error' });
              }
            }}>Jogar na lista de mercado</Btn>
          </Card>
        )}

        <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Ingredientes</p>
        <Card className="mb-5">
          {receita.ingredientes.map((ing) => (
            <div key={ing.nome} className="flex items-baseline justify-between gap-3 py-1.5 border-b border-line last:border-0">
              <span className="text-[.95rem]">{ing.nome}{ing.opcional && <span className="text-ink-3"> (opcional)</span>}</span>
              <span className="text-sm text-ink-2 flex-none">{ing.medida}</span>
            </div>
          ))}
        </Card>

        {receita.contem?.length > 0 && (
          <p className="text-xs text-ink-3 mb-4">Contém: {receita.contem.join(', ')}.</p>
        )}

        <Btn block onClick={() => { setPasso(0); nav(`?spin=${spinId ?? ''}&modo=cozinha`, { replace: true }); }}>
          Começar a cozinhar
        </Btn>
      </div>
    );
  }

  const atual = receita.passos[passo];
  const ultimo = passo === receita.passos.length - 1;

  return (
    <div className="pt-3 min-h-screen flex flex-col">
      <AppHeader
        back={() => { if (!fim) marcarDesfecho('abandonou'); nav(`?spin=${spinId ?? ''}`, { replace: true }); }}
        title={`Passo ${passo + 1} de ${receita.passos.length}`} />

      <div className="flex gap-1 mb-6">
        {receita.passos.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= passo ? 'bg-accent' : 'bg-ink-3/25'}`} />
        ))}
      </div>

      {/* Um passo por tela, centralizado e em corpo grande: pra ler de longe,
          com as mãos ocupadas. */}
      <div className="flex-1 flex items-center">
        <p className="font-display text-[1.7rem] leading-snug">{atual.texto}</p>
      </div>

      {atual.timerSeg > 0 && (
        <Card className="mb-4 text-center">
          {restante === null ? (
            <Btn onClick={() => setRestante(atual.timerSeg)}>
              <Icon name="clock" size={17} /> Marcar {Math.round(atual.timerSeg / 60)} min
            </Btn>
          ) : (
            <>
              <p className="font-display text-4xl text-accent">{mmss(restante)}</p>
              <button onClick={() => setRestante(null)} className="text-sm text-ink-3 mt-2">cancelar</button>
            </>
          )}
        </Card>
      )}

      <div className="pb-[max(env(safe-area-inset-bottom),20px)] flex gap-2">
        {passo > 0 && (
          <Btn variant="ghost" onClick={() => { setRestante(null); setPasso(passo - 1); }}>Voltar</Btn>
        )}
        {!ultimo ? (
          <Btn block onClick={() => { setRestante(null); setPasso(passo + 1); }}>Feito, próximo</Btn>
        ) : (
          <Btn block onClick={cozinhamos} disabled={salvando}>{salvando ? <Spinner /> : 'Cozinhamos isso 🍳'}</Btn>
        )}
      </div>

      {fim && (
        <Sheet title="Ficou pronto 💛" onClose={() => nav('/app/cozinha')}>
          <p className="text-ink-2 text-[.95rem] mb-4">
            Guardado na conta de vocês. Quer virar momento na linha do tempo?
          </p>
          <Field label="O que aconteceu" value={momento} onChange={(e) => setMomento(e.target.value)} />
          <Btn block onClick={guardarMomento}>Guardar como momento</Btn>
          <button onClick={() => nav('/app/cozinha')} className="w-full text-center text-sm text-ink-3 mt-3">
            Agora não
          </button>
        </Sheet>
      )}
    </div>
  );
}
