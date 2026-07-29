import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { PAGO, PLANO_NOME } from '../lib/plan.js';
import { Btn, Card, Field, Logo, Spinner } from '../ui/kit.jsx';
import Icon from '../ui/icons.jsx';

// Presentear não exige conta: quem dá o presente costuma ser a mãe, a amiga,
// o padrinho. Só o resgate acontece dentro do app.
export default function PresentePage() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const [opcoes, setOpcoes] = useState(null);
  const [meses, setMeses] = useState(12);
  const [de, setDe] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const [presente, setPresente] = useState(null);

  useEffect(() => {
    api('/api/gift').then((d) => {
      setOpcoes(d);
      if (d.options?.length) setMeses(d.options[d.options.length - 1].months);
    }).catch(() => setOpcoes({ options: [], billingEnabled: false }));
  }, []);

  // Link do presente: /presente/CODIGO mostra o que o casal vai receber.
  useEffect(() => {
    if (!code) return;
    api(`/api/gift/${code}`).then((d) => setPresente(d.gift)).catch((e) => setErro(e.message));
  }, [code]);

  async function comprar() {
    setBusy(true);
    setErro('');
    try {
      const { url } = await api('/api/gift/checkout', { method: 'POST', body: { months: meses, buyerName: de, message: mensagem } });
      window.location.assign(url);
    } catch (e) {
      setErro(e.message);
      setBusy(false);
    }
  }

  if (code) {
    return (
      <Página>
        {erro && (
          <>
            <Emblema icone="close" />
            <h1 className="font-display text-3xl mb-2">Presente indisponível</h1>
            <p className="text-ink-2 mb-6">{erro}</p>
            <Btn to="/">Conhecer o Chamego</Btn>
          </>
        )}
        {presente && (
          <>
            <Emblema icone="gift" />
            <h1 className="font-display text-3xl mb-2">
              {presente.from ? `${presente.from} deu um presente pra vocês` : 'Vocês ganharam um presente'}
            </h1>
            <p className="text-ink-2 mb-6">
              {presente.months === 12 ? '1 ano' : `${presente.months} meses`} de {PLANO_NOME} no espaço de vocês.
            </p>
            {presente.message && (
              <Card className="mb-6 text-left"><p className="font-display italic text-lg">“{presente.message}”</p></Card>
            )}
            <Card className="mb-6">
              <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">Código do presente</p>
              <p className="font-display text-2xl text-accent tracking-[.12em]">{presente.code}</p>
            </Card>
            {presente.status === 'redeemed' ? (
              <p className="text-ink-2">Este presente já foi resgatado. Aproveitem 💛</p>
            ) : (
              <>
                <Btn block to={`/app/plano?presente=${presente.code}`}>Resgatar no nosso espaço</Btn>
                <p className="text-ink-3 text-sm mt-3">Entre (ou crie o espaço) e o presente entra na hora.</p>
              </>
            )}
          </>
        )}
        {!presente && !erro && <p className="text-ink-3">Abrindo o presente…</p>}
      </Página>
    );
  }

  return (
    <Página>
      <Emblema icone="gift" />
      <h1 className="font-display text-3xl md:text-4xl mb-2">Dê o Chamego de presente</h1>
      <p className="text-ink-2 mb-8 max-w-[38ch]">
        Um espaço privado pra organizar e guardar a vida a dois. Você paga, o casal resgata com um código —
        sem precisar criar conta agora.
      </p>

      {params.get('compra') === 'ok' && (
        <Card className="mb-6 text-left">
          <p className="font-medium mb-1">Presente confirmado 💛</p>
          <p className="text-sm text-ink-2">Enviamos o código pro seu email. É ele que o casal usa pra resgatar.</p>
        </Card>
      )}
      {params.get('compra') === 'cancelado' && (
        <Card className="mb-6 text-left text-sm text-ink-2">Compra cancelada — nada foi cobrado.</Card>
      )}

      <Card className="mb-6 text-left">
        <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-3">O que eles ganham</p>
        {PAGO.map((p) => (
          <div key={p} className="flex items-center gap-2.5 text-[.95rem] mb-2 last:mb-0">
            <span className="flex-none w-6 h-6 rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name="check" size={14} /></span>
            <span>{p}</span>
          </div>
        ))}
      </Card>

      {opcoes === null ? (
        <Spinner />
      ) : opcoes.options.length === 0 ? (
        <Card className="text-sm text-ink-2">
          O presente abre em breve. Enquanto isso, o casal pode começar grátis —{' '}
          <Link to="/entrar" className="text-accent underline">criar o espaço</Link>.
        </Card>
      ) : (
        <div className="w-full text-left">
          <p className="text-sm font-medium text-ink-2 mb-2">Por quanto tempo?</p>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {opcoes.options.map((o) => (
              <button type="button" key={o.months} onClick={() => setMeses(o.months)}
                className={`rounded-card py-3 px-2 text-center transition-all ${meses === o.months ? 'bg-accent-soft shadow-[inset_0_0_0_1.5px_var(--accent)]' : 'bg-surface shadow-[inset_0_0_0_1px_var(--line-2)]'}`}>
                <span className="block font-medium text-[.95rem]">{o.label}</span>
                <span className="block text-sm text-ink-2">{o.amount}</span>
              </button>
            ))}
          </div>
          <Field label="De quem é o presente? (opcional)" placeholder="Ex.: Tia Lu" value={de} onChange={(e) => setDe(e.target.value)} />
          <Field label="Um recado pro casal (opcional)" placeholder="Que venham muitos dias 💛" value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
          <Btn block onClick={comprar} disabled={busy}>{busy ? <Spinner /> : 'Presentear agora'}</Btn>
          {erro && <p className="text-accent-press text-sm mt-3 text-center">{erro}</p>}
          <p className="text-center text-xs text-ink-3 mt-3">
            Pagamento único, sem renovação automática. O código não expira.
          </p>
        </div>
      )}
    </Página>
  );
}

function Página({ children }) {
  return (
    <div className="min-h-screen bg-bg flex justify-center">
      <div className="w-full max-w-[520px] px-6 py-10 flex flex-col items-center text-center screen-enter">
        <Link to="/" className="mb-8"><Logo className="text-2xl" /></Link>
        {children}
        <p className="mt-auto pt-10 text-sm text-ink-3">
          <Link to="/" className="underline">O que é o Chamego?</Link>
        </p>
      </div>
    </div>
  );
}

function Emblema({ icone }) {
  return (
    <span className="w-16 h-16 rounded-full bg-accent-soft grid place-items-center text-accent mb-4">
      <Icon name={icone} size={28} />
    </span>
  );
}
