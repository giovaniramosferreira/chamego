import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useToast } from '../../../lib/toast-context.js';
import { AppHeader, Card, Btn, Field, EmptyState, Spinner } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

// Aquele link de receita que alguém manda no meio da conversa e some. Aqui ele
// vira rascunho: a IA lê a página, e o casal decide depois, com calma, o que
// merece entrar na roda. O rascunho é honesto sobre o que é — por isso a tela
// mostra os ingredientes antes de qualquer botão de aprovar.
export default function AchadosTab() {
  const nav = useNavigate();
  const { toast } = useToast();
  const [dados, setDados] = useState(null);
  const [url, setUrl] = useState('');
  const [lendo, setLendo] = useState(false);

  const carregar = useCallback(() => {
    api('/api/cozinha/achados').then(setDados).catch(() => setDados(null));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function ler(e) {
    e.preventDefault();
    const link = url.trim();
    if (!link || lendo) return;
    setLendo(true);
    try {
      const { repetido } = await api('/api/cozinha/achados', { method: 'POST', body: { url: link } });
      setUrl('');
      toast(repetido ? 'Esse link já estava aqui.' : 'Achei a receita. Dá uma olhada antes de aprovar.');
      carregar();
    } catch (err) {
      // 402 abre o paywall sozinho: aqui só o que a pessoa precisa ler.
      if (!err.upgrade) toast(err.message, { tone: 'error' });
    } finally {
      setLendo(false);
    }
  }

  async function decidir(id, status) {
    try {
      await api(`/api/cozinha/achados/${id}`, { method: 'PATCH', body: { status } });
      carregar();
      if (status === 'salva') toast('Entrou na roda de vocês.');
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  }

  if (dados === null) return <div className="py-20 text-center"><Spinner /></div>;

  const { pendentes = [], salvas = [] } = dados;

  return (
    <div className="pt-3">
      <AppHeader back={() => nav('/app/cozinha')} title="Receitinhas achadas" />

      <Card className="mb-5">
        <form onSubmit={ler}>
          <Field label="Link da receita" type="url" inputMode="url" placeholder="cole o link do post ou do blog"
            value={url} onChange={(e) => setUrl(e.target.value)} disabled={lendo} />
          <Btn block className="mt-3" disabled={lendo || !url.trim()}>
            {lendo ? 'Lendo a página…' : 'Ler receita'}
          </Btn>
        </form>
        <p className="text-xs text-ink-3 mt-3">
          A IA lê e monta um rascunho. Nada entra na roda sem vocês aprovarem — página de
          receita erra ingrediente, e erro de ingrediente só aparece na cozinha.
        </p>
      </Card>

      {pendentes.length > 0 && (
        <>
          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Pra decidir</p>
          {pendentes.map((a) => (
            <Achado key={a.id} achado={a} onVer={() => nav(`/app/cozinha/${a.receita.id}`)}
              acoes={(
                <>
                  <Btn className="!px-4 !py-2 !text-sm" onClick={() => decidir(a.id, 'salva')}>Guardar</Btn>
                  <Btn variant="ghost" className="!px-4 !py-2 !text-sm" onClick={() => decidir(a.id, 'descartada')}>
                    Descartar
                  </Btn>
                </>
              )} />
          ))}
        </>
      )}

      {salvas.length > 0 && (
        <>
          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mt-6 mb-2">Receitas de vocês</p>
          {salvas.map((a) => (
            <Achado key={a.id} achado={a} onVer={() => nav(`/app/cozinha/${a.receita.id}`)}
              acoes={(
                <>
                  <Btn className="!px-4 !py-2 !text-sm" onClick={() => nav(`/app/cozinha/${a.receita.id}`)}>Cozinhar</Btn>
                  <Btn variant="ghost" className="!px-4 !py-2 !text-sm" onClick={() => decidir(a.id, 'pendente')}>
                    Tirar da roda
                  </Btn>
                </>
              )} />
          ))}
        </>
      )}

      {!pendentes.length && !salvas.length && (
        <EmptyState icon="link" title="Nenhuma receita achada ainda">
          Cole o link daquela receita que vocês viram por aí. Ela fica esperando aqui
          até alguém aprovar.
        </EmptyState>
      )}
    </div>
  );
}

function Achado({ achado, onVer, acoes }) {
  const { receita } = achado;
  const essenciais = receita.ingredientes.filter((i) => !i.opcional).map((i) => i.nome);
  let dominio = '';
  try { dominio = new URL(achado.url).hostname.replace(/^www\./, ''); } catch { /* link estranho: sem origem */ }

  return (
    <Card className="mb-3">
      <button onClick={onVer} className="text-left w-full">
        <h3 className="font-display text-xl leading-tight mb-1">{receita.titulo}</h3>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-2 mb-2">
          <span className="flex items-center gap-1"><Icon name="clock" size={14} /> {receita.tempoMin} min</span>
          <span>{receita.ingredientes.length} ingredientes</span>
          <span>{receita.passos} passos</span>
        </div>
        {/* Os ingredientes na cara: é olhando pra eles que se percebe que a IA
            entendeu a receita errada. */}
        <p className="text-sm text-ink-2 mb-2">{essenciais.join(', ')}</p>
        {dominio && <p className="text-xs text-ink-3 mb-3">de {dominio}</p>}
      </button>
      <div className="flex gap-2">{acoes}</div>
    </Card>
  );
}
