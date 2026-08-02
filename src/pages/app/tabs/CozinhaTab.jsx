import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useToast } from '../../../lib/toast-context.js';
import { AppHeader, Card, Btn, Row, RowList, Spinner } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';
import Roleta from '../../../components/Roleta.jsx';

// "O que a gente come hoje?" em menos de 10 segundos, por duas portas: sorteio
// e foto do que tem em casa. A resposta é UMA receita — a lista é justamente o
// problema que a feature mata.
function legendaAchados(a) {
  if (!a) return 'Cole o link de uma receita';
  if (a.pendentes) return `${a.pendentes} esperando vocês decidirem`;
  if (a.salvas) return `${a.salvas} ${a.salvas === 1 ? 'receita de vocês' : 'receitas de vocês'} na roda`;
  return 'Cole o link de uma receita';
}

export default function CozinhaTab() {
  const nav = useNavigate();
  const { toast } = useToast();
  const [estado, setEstado] = useState(null);
  const [girando, setGirando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [recusadas, setRecusadas] = useState([]);
  const [indiceFatia, setIndiceFatia] = useState(null);

  const carregar = useCallback(() => {
    api('/api/cozinha').then(setEstado).catch(() => setEstado(null));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function girar() {
    setGirando(true);
    setIndiceFatia(null);
    setResultado(null);
    try {
      const res = await api('/api/cozinha/girar', { method: 'POST', body: { recusadas } });
      // A roda para na fatia derivada do id: o suspense é de interface.
      setIndiceFatia(Math.abs([...res.receita.id].reduce((a, c) => a + c.charCodeAt(0), 0)) % 8);
      setTimeout(() => {
        setResultado(res);
        setGirando(false);
        setEstado((e) => (e ? { ...e, girosRestantes: res.girosRestantes } : e));
      }, 2300);
    } catch (e) {
      setGirando(false);
      if (!e.upgrade) toast(e.message, { tone: 'error' });
    }
  }

  async function girarDeNovo() {
    if (!resultado) return;
    await api(`/api/cozinha/spins/${resultado.spinId}/desfecho`, { method: 'POST', body: { desfecho: 'girou_de_novo' } }).catch(() => {});
    setRecusadas((r) => [...r, resultado.receita.id]);
    girar();
  }

  function bora() {
    nav(`/app/cozinha/${resultado.receita.id}?spin=${resultado.spinId}`);
  }

  if (estado === null) return <div className="py-20 text-center"><Spinner /></div>;

  const semGiros = estado.girosRestantes === 0;

  return (
    <div className="pt-3">
      <AppHeader back={() => nav('/app/listas')} title="O que a gente come hoje?" />

      {/* Sugestão do par vem antes de tudo: comer é combinado, não solo. */}
      {estado.parSugeriu && !resultado && (
        <Card className="mb-4">
          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-1">Seu par sorteou</p>
          <p className="font-display text-xl mb-1">{estado.parSugeriu.receita.titulo}</p>
          <p className="text-sm text-ink-2 mb-3">
            {estado.parSugeriu.receita.tempoMin} min · {estado.parSugeriu.receita.rotuloFalta}
          </p>
          <div className="flex gap-2">
            <Btn className="!px-4 !py-2 !text-sm"
              onClick={() => nav(`/app/cozinha/${estado.parSugeriu.receita.id}?spin=${estado.parSugeriu.spinId}`)}>
              Topo
            </Btn>
            <Btn variant="ghost" className="!px-4 !py-2 !text-sm" onClick={girar}>Outra</Btn>
          </div>
        </Card>
      )}

      {!resultado ? (
        <>
          <div className="py-4">
            <Roleta girando={girando} paradaEm={indiceFatia} onGirar={girar} disabled={semGiros} />
          </div>
          <p className="text-center text-ink-2 text-[.95rem] mb-1">
            {girando ? 'girando…' : 'Toque na roda. Uma receita, sem escolher.'}
          </p>
          <p className="text-center text-sm text-ink-3 mb-5">
            {estado.girosRestantes === Infinity || estado.girosRestantes < 0
              ? 'giros ilimitados'
              : `${estado.girosRestantes} de ${estado.girosGratisDia} giros hoje`}
          </p>
          {!girando && <Btn block onClick={girar} disabled={semGiros}>Me surpreende</Btn>}
        </>
      ) : (
        <Card className="mb-4">
          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-1">Hoje é isso</p>
          <h2 className="font-display text-2xl leading-tight mb-2">{resultado.receita.titulo}</h2>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-2 mb-2">
            <span className="flex items-center gap-1"><Icon name="clock" size={14} /> {resultado.receita.tempoMin} min</span>
            <span>{resultado.receita.ingredientes.length} ingredientes</span>
            <span>~R$ {resultado.receita.custo}</span>
          </div>
          <p className={`text-sm mb-4 ${resultado.receita.temTudo ? 'text-accent-press' : 'text-ink-2'}`}>
            {resultado.receita.rotuloFalta}
          </p>
          <div className="flex gap-2">
            <Btn onClick={bora} className="!px-5">Bora</Btn>
            <Btn variant="ghost" onClick={girarDeNovo} disabled={estado.girosRestantes === 0}>Gira de novo</Btn>
          </div>
          {resultado.motivos?.length > 0 && (
            <p className="text-xs text-ink-3 mt-3">por que essa: {resultado.motivos.slice(0, 2).join(' · ')}</p>
          )}
        </Card>
      )}

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mt-6 mb-2">Ou pelo que tem em casa</p>
      <RowList className="mb-4">
        <Row icon="camera" title="Fotografar compras"
          sub={estado.visaoDisponivel ? 'A gente lê os itens e vocês confirmam' : 'Modo manual: digite o que tem'}
          onClick={() => nav('/app/despensa?foto=1')} />
        <Row icon="list" title="Despensa de vocês"
          sub={`${estado.despensa} ${estado.despensa === 1 ? 'item' : 'itens'} — melhora o sorteio`}
          onClick={() => nav('/app/despensa')} />
        {/* Link de receita vira rascunho aqui. O subtítulo conta o estado real:
            rascunho esperando decisão é a única coisa que pede a pessoa de volta. */}
        <Row icon="link" title="Receitinhas achadas" sub={legendaAchados(estado.achados)}
          onClick={() => nav('/app/achados')} />
      </RowList>

      {estado.metrica?.total > 2 && (
        <p className="text-center text-xs text-ink-3 pb-2">
          vocês cozinharam {estado.metrica.cozinhou} de {estado.metrica.total} sugestões
        </p>
      )}
    </div>
  );
}
