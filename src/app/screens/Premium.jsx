import I from '../icons';
import { useGo } from '../nav';
import { AppHeader, Row, Chip, Field } from '../ui';

function PacksStore() {
  const go = useGo();
  const packs = [
    ['Conversas profundas', '40 perguntas guiadas', 'linear-gradient(160deg,#bd6a4b,#8c4630)'],
    ['Date nights', '20 roteiros de encontro', 'linear-gradient(160deg,#7a8a6f,#4d5a45)'],
    ['Casa organizada', 'Rotinas prontas', 'linear-gradient(160deg,#c9a86a,#8a6f3f)'],
    ['Longa distância', 'Rituais de conexão', 'linear-gradient(160deg,#8c2f4a,#5c1e30)'],
  ];
  return (
    <div className="screen-scroll">
      <AppHeader back title="Loja de packs" />
      <div className="pack-grid mb-lg">
        {packs.map(([title, sub, bg]) => (
          <div key={title} className="pack-card" style={{ background: bg }} onClick={() => go('pack-detail')}>
            <div><div className="p-title">{title}</div><div className="p-sub">{sub}</div></div>
          </div>
        ))}
      </div>
      <div className="section-title" style={{ marginTop: 0 }}>Seus packs ativos</div>
      <div className="row-list">
        <Row icon="chat" title="Conversas profundas" sub="Ativo · comprado em jan/2026" />
      </div>
    </div>
  );
}

function PackDetail() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader back />
      <div className="pack-card mb-md" style={{ height: 180, background: 'linear-gradient(160deg,#bd6a4b,#8c4630)' }}>
        <div><div className="p-title" style={{ fontSize: '1.4rem' }}>Conversas profundas</div><div className="p-sub">40 perguntas guiadas pra se conhecerem ainda mais</div></div>
      </div>
      <div className="row-list mb-md">
        <Row title="1. Qual memória de infância mais te define?" />
        <Row title="2. O que você mudaria na nossa rotina?" />
        <Row locked title="3. Pergunta bloqueada" />
      </div>
      <button className="btn btn-primary btn-block mb-sm" onClick={() => go('checkout')}>Comprar avulso — R$ 14,90</button>
      <button className="btn btn-ghost btn-block" onClick={() => go('paywall')}>Ou assine o Premium e desbloqueie todos</button>
    </div>
  );
}

function Paywall() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader close />
      <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
        <div className="e-icon" style={{ margin: '0 auto .8rem' }}><I name="gift" size={26} /></div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem' }}>Chamego <span className="display-em">Premium</span></h1>
        <p className="muted">Desbloqueie todos os packs e recursos avançados.</p>
      </div>

      <div className="plan-card premium mb-md">
        <div className="p-badge">7 dias grátis</div>
        <div className="r-title">Premium</div>
        <div className="p-price">R$ 19,90<span style={{ fontSize: '.9rem', color: 'var(--ink-2)', fontFamily: 'var(--font-sans)' }}>/mês</span></div>
        <ul className="plan-list">
          <li><I name="check" /> Todos os packs inclusos</li>
          <li><I name="check" /> Fotos e momentos ilimitados</li>
          <li><I name="check" /> Diário e perguntas guiadas completas</li>
          <li><I name="check" /> Temas e personalização extra</li>
        </ul>
        <button className="btn btn-primary btn-block" style={{ marginTop: '1rem' }} onClick={() => go('checkout')}>Iniciar teste grátis</button>
      </div>

      <div className="plan-card">
        <div className="r-title">Gratuito</div>
        <div className="p-price">R$ 0</div>
        <ul className="plan-list">
          <li><I name="check" /> Agenda, listas e momentos básicos</li>
          <li><I name="check" /> Check-in diário</li>
          <li><I name="check" /> 1 pack incluso</li>
        </ul>
      </div>
      <p className="center-note">Cancele quando quiser, sem multa.</p>
    </div>
  );
}

function Checkout() {
  const go = useGo();
  return (
    <div className="screen-scroll">
      <AppHeader back title="Finalizar" />
      <div className="card mb-md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><div className="r-title">Chamego Premium</div><div className="r-sub">7 dias grátis, depois R$ 19,90/mês</div></div>
        <Chip on>Trial</Chip>
      </div>
      <Field label="Número do cartão"><input type="text" placeholder="0000 0000 0000 0000" /></Field>
      <div style={{ display: 'flex', gap: '.8rem' }}>
        <div style={{ flex: 1 }}><Field label="Validade"><input type="text" placeholder="MM/AA" /></Field></div>
        <div style={{ flex: 1 }}><Field label="CVV"><input type="text" placeholder="123" /></Field></div>
      </div>
      <button className="btn btn-primary btn-block" onClick={() => go('checkout-confirm')}>Confirmar assinatura</button>
      <p className="center-note">Pagamento processado com segurança.</p>
    </div>
  );
}

function CheckoutConfirm() {
  const go = useGo();
  return (
    <div className="screen-scroll" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: '14%' }}>
      <div className="e-icon" style={{ width: 76, height: 76, marginBottom: '1.2rem' }}><I name="heart" size={30} /></div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '.4rem' }}>Premium ativado 🎉</h3>
      <p className="muted mb-lg" style={{ maxWidth: '26ch' }}>Seu teste grátis de 7 dias começou. Aproveitem juntos.</p>
      <button className="btn btn-primary btn-block" onClick={() => go('subscription-manage')}>Ver minha assinatura</button>
    </div>
  );
}

function SubscriptionManage() {
  return (
    <div className="screen-scroll">
      <AppHeader back title="Assinatura" />
      <div className="card mb-md">
        <Chip on className="mb-sm">Trial ativo</Chip>
        <div className="r-title" style={{ fontSize: '1.1rem' }}>Chamego Premium</div>
        <div className="r-sub">Renova em 7 dias · R$ 19,90/mês</div>
      </div>
      <div className="row-list mb-lg">
        <Row title="Forma de pagamento" sub="Cartão terminado em 4242" right="chev" />
        <Row title="Histórico de packs" right="chev" />
      </div>
      <button className="btn btn-ghost btn-block" style={{ color: '#b23b3b' }}>Cancelar assinatura</button>
    </div>
  );
}

export default {
  'packs-store': { component: PacksStore, hideTabs: true },
  'pack-detail': { component: PackDetail, hideTabs: true },
  'paywall': { component: Paywall, hideTabs: true },
  'checkout': { component: Checkout, hideTabs: true },
  'checkout-confirm': { component: CheckoutConfirm, hideTabs: true },
  'subscription-manage': { component: SubscriptionManage, hideTabs: true },
};
