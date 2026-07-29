import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useSubscription, track } from '../../../lib/subscription.js';
import { GRATIS, PAGO, PLANO_NOME } from '../../../lib/plan.js';
import { useToast } from '../../../lib/toast-context.js';
import { AppHeader, Card, Btn, Field, Spinner, Row, RowList } from '../../../ui/kit.jsx';
import Icon from '../../../ui/icons.jsx';

const fmtData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) : '');

export default function PlanoTab() {
  const nav = useNavigate();
  const { toast } = useToast();
  const sub = useSubscription();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState('');
  // Código vindo do link do presente (/presente/CODIGO → aqui já preenchido).
  const [codigo, setCodigo] = useState(params.get('presente') || '');

  useEffect(() => { track('plano_visto', params.get('origem') || 'config'); }, [params]);

  useEffect(() => {
    if (params.get('checkout') === 'ok') toast('Bem-vindos ao Chamego Juntos 💛');
    if (params.get('checkout') === 'cancelado') toast('Checkout cancelado — tudo continua como estava.');
  }, [params, toast]);

  async function assinar(plano) {
    setBusy(plano);
    try {
      const { url } = await api('/api/billing/checkout', { method: 'POST', body: { plan: plano } });
      window.location.assign(url);
    } catch (e) {
      toast(e.message, { tone: 'error' });
      setBusy('');
    }
  }

  async function iniciarTeste() {
    setBusy('trial');
    try {
      await api('/api/subscription/trial', { method: 'POST' });
      await sub.reload();
      toast(`Teste de ${sub.trialDays} dias liberado 💛`);
    } catch (e) {
      toast(e.message, { tone: 'error' });
    } finally { setBusy(''); }
  }

  async function resgatar(e) {
    e?.preventDefault();
    if (!codigo.trim()) return;
    setBusy('presente');
    try {
      const { months } = await api(`/api/gift/${codigo.trim()}/redeem`, { method: 'POST' });
      await sub.reload();
      setCodigo('');
      toast(`Presente de ${months === 12 ? '1 ano' : `${months} meses`} resgatado 💛`);
    } catch (e2) {
      toast(e2.message, { tone: 'error' });
    } finally { setBusy(''); }
  }

  async function gerenciar() {
    setBusy('portal');
    try {
      const { url } = await api('/api/billing/portal', { method: 'POST' });
      window.location.assign(url);
    } catch (e) {
      toast(e.message, { tone: 'error' });
      setBusy('');
    }
  }

  if (sub.loading) return <div className="py-20 text-center"><Spinner /></div>;

  const premium = sub.has('premium');
  const usoFoto = sub.usage.photos ?? 0;

  return (
    <div className="pt-3">
      <AppHeader back={() => nav('/app/config')} title="Plano de vocês" />

      {/* Estado atual, sempre honesto sobre o que acontece e quando */}
      <Card className="mb-4 text-center">
        <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-1">Plano atual</p>
        <p className="font-display text-2xl text-accent">{premium ? PLANO_NOME : 'Chamego Grátis'}</p>
        {sub.trialing && <p className="text-sm text-ink-2 mt-1">Teste grátis até {fmtData(sub.trialEndsAt)}</p>}
        {sub.gifted && <p className="text-sm text-ink-2 mt-1">Presente ativo até {fmtData(sub.giftUntil)} 💛</p>}
        {!sub.trialing && premium && sub.cancelAtPeriodEnd && (
          <p className="text-sm text-ink-2 mt-1">Ativo até {fmtData(sub.currentPeriodEnd)} — depois volta pro grátis, sem perder nada.</p>
        )}
        {!sub.trialing && premium && !sub.cancelAtPeriodEnd && sub.currentPeriodEnd && (
          <p className="text-sm text-ink-2 mt-1">Renova em {fmtData(sub.currentPeriodEnd)}</p>
        )}
        {!premium && (
          <p className="text-sm text-ink-2 mt-1">
            {usoFoto} de {sub.limits.photos} fotos usadas · {sub.usage.capsules ?? 0} de {sub.limits.capsules} cápsulas
          </p>
        )}
      </Card>

      {!premium && (
        <>
          <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mb-2">{PLANO_NOME}</p>
          <Card className="mb-4">
            {PAGO.map((p) => (
              <div key={p} className="flex items-center gap-2.5 text-[.95rem] mb-2 last:mb-0">
                <span className="flex-none w-6 h-6 rounded-full bg-accent-soft grid place-items-center text-accent-press"><Icon name="check" size={14} /></span>
                <span>{p}</span>
              </div>
            ))}
          </Card>

          {sub.billingEnabled ? (
            <div className="space-y-2.5 mb-4">
              {sub.plans.map((p) => (
                <Btn key={p.id} block variant={p.id === 'anual' ? 'primary' : 'ghost'} disabled={!!busy} onClick={() => assinar(p.id)}>
                  {busy === p.id ? <Spinner /> : `${p.label} · ${p.amount}`}
                </Btn>
              ))}
              <p className="text-center text-xs text-ink-3">
                Cobrança por espaço do casal — uma assinatura serve pros dois. Cancele quando quiser.
              </p>
            </div>
          ) : (
            <Card className="mb-4 text-center text-sm text-ink-2">
              A assinatura abre em breve. Enquanto isso, aproveite o teste grátis.
            </Card>
          )}

          {!sub.trialUsed && (
            <Btn block variant="ghost" disabled={!!busy} onClick={iniciarTeste}>
              {busy === 'trial' ? <Spinner /> : `Testar ${sub.trialDays} dias grátis, sem cartão`}
            </Btn>
          )}
        </>
      )}

      {premium && sub.managed && (
        <Btn block variant="ghost" disabled={!!busy} onClick={gerenciar}>
          {busy === 'portal' ? <Spinner /> : 'Gerenciar assinatura, cartão e recibos'}
        </Btn>
      )}

      {/* Presente: resgatar e presentear moram no mesmo lugar. */}
      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mt-8 mb-2">Presente</p>
      <form onSubmit={resgatar} className="mb-2">
        <Field label="Tem um código de presente?" placeholder="ABCDE-FGHIJ" value={codigo}
          onChange={(ev) => setCodigo(ev.target.value.toUpperCase())} />
        <Btn block variant="ghost" type="submit" disabled={busy === 'presente' || !codigo.trim()}>
          {busy === 'presente' ? <Spinner /> : 'Resgatar presente'}
        </Btn>
      </form>
      <RowList className="mb-6">
        <Row icon="gift" title="Presentear outro casal" sub="Alguém paga, o casal resgata com um código"
          onClick={() => nav('/presente')} />
      </RowList>

      <p className="text-xs font-semibold tracking-[.15em] uppercase text-ink-3 mt-8 mb-2">No grátis, pra sempre</p>
      <Card className="mb-4">
        {GRATIS.map((p) => (
          <div key={p} className="flex items-center gap-2.5 text-[.95rem] text-ink-2 mb-2 last:mb-0">
            <span className="flex-none w-6 h-6 rounded-full bg-tint grid place-items-center text-ink-3"><Icon name="check" size={14} /></span>
            <span>{p}</span>
          </div>
        ))}
      </Card>

      <RowList className="mb-6">
        <Row icon="shield" title="Termos e reembolso" sub="7 dias de arrependimento, como manda o CDC" onClick={() => nav('/termos')} />
      </RowList>

      <p className="text-center text-xs text-ink-3 pb-4">
        Cancelar não apaga nada: o conteúdo continua seu, só os recursos pagos deixam de abrir.
      </p>
    </div>
  );
}
