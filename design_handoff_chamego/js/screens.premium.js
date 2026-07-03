/* ============================================================
   Chamego App — Packs, Paywall, Checkout, Assinatura
   ============================================================ */
registerScreen('packs-store', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ back: true, title: 'Loja de packs' })}
      <div class="pack-grid mb-lg">
        <div class="pack-card" style="background:linear-gradient(160deg,#bd6a4b,#8c4630)" data-go="pack-detail">
          <div><div class="p-title">Conversas profundas</div><div class="p-sub">40 perguntas guiadas</div></div>
        </div>
        <div class="pack-card" style="background:linear-gradient(160deg,#7a8a6f,#4d5a45)" data-go="pack-detail">
          <div><div class="p-title">Date nights</div><div class="p-sub">20 roteiros de encontro</div></div>
        </div>
        <div class="pack-card" style="background:linear-gradient(160deg,#c9a86a,#8a6f3f)" data-go="pack-detail">
          <div><div class="p-title">Casa organizada</div><div class="p-sub">Rotinas prontas</div></div>
        </div>
        <div class="pack-card" style="background:linear-gradient(160deg,#8c2f4a,#5c1e30)" data-go="pack-detail">
          <div><div class="p-title">Longa distância</div><div class="p-sub">Rituais de conexão</div></div>
        </div>
      </div>
      <div class="section-title" style="margin-top:0">Seus packs ativos</div>
      <div class="row-list">
        <div class="row"><div class="r-icon">${icon('chat')}</div><div class="r-body"><div class="r-title">Conversas profundas</div><div class="r-sub">Ativo · comprado em jan/2026</div></div></div>
      </div>
    </div>`
});

registerScreen('pack-detail', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ back: true })}
      <div class="pack-card mb-md" style="height:180px;background:linear-gradient(160deg,#bd6a4b,#8c4630)">
        <div><div class="p-title" style="font-size:1.4rem">Conversas profundas</div><div class="p-sub">40 perguntas guiadas pra se conhecerem ainda mais</div></div>
      </div>
      <div class="row-list mb-md">
        <div class="row"><div class="r-body"><div class="r-title">1. Qual memória de infância mais te define?</div></div></div>
        <div class="row"><div class="r-body"><div class="r-title">2. O que você mudaria na nossa rotina?</div></div></div>
        <div class="row locked"><div class="r-body"><div class="r-title">3. Pergunta bloqueada</div></div></div>
      </div>
      <button class="btn btn-primary btn-block mb-sm" data-go="checkout">Comprar avulso — R$ 14,90</button>
      <button class="btn btn-ghost btn-block" data-go="paywall">Ou assine o Premium e desbloqueie todos</button>
    </div>`
});

registerScreen('paywall', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ close: true })}
      <div style="text-align:center;margin-bottom:1.4rem">
        <div class="e-icon" style="margin:0 auto .8rem">${icon('gift',26)}</div>
        <h1 style="font-family:var(--font-display);font-size:1.7rem">Chamego <span class="display-em">Premium</span></h1>
        <p class="muted">Desbloqueie todos os packs e recursos avançados.</p>
      </div>

      <div class="plan-card premium mb-md">
        <div class="p-badge">7 dias grátis</div>
        <div class="r-title">Premium</div>
        <div class="p-price">R$ 19,90<span style="font-size:.9rem;color:var(--ink-2);font-family:var(--font-sans)">/mês</span></div>
        <ul class="plan-list">
          <li>${icon('check')} Todos os packs inclusos</li>
          <li>${icon('check')} Fotos e momentos ilimitados</li>
          <li>${icon('check')} Diário e perguntas guiadas completas</li>
          <li>${icon('check')} Temas e personalização extra</li>
        </ul>
        <button class="btn btn-primary btn-block" style="margin-top:1rem" data-go="checkout">Iniciar teste grátis</button>
      </div>

      <div class="plan-card">
        <div class="r-title">Gratuito</div>
        <div class="p-price">R$ 0</div>
        <ul class="plan-list">
          <li>${icon('check')} Agenda, listas e momentos básicos</li>
          <li>${icon('check')} Check-in diário</li>
          <li>${icon('check')} 1 pack incluso</li>
        </ul>
      </div>
      <p class="center-note">Cancele quando quiser, sem multa.</p>
    </div>`
});

registerScreen('checkout', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ back: true, title: 'Finalizar' })}
      <div class="card mb-md" style="display:flex;justify-content:space-between;align-items:center">
        <div><div class="r-title">Chamego Premium</div><div class="r-sub">7 dias grátis, depois R$ 19,90/mês</div></div>
        <div class="chip on">Trial</div>
      </div>
      <div class="field"><label>Número do cartão</label><input type="text" placeholder="0000 0000 0000 0000"/></div>
      <div style="display:flex;gap:.8rem">
        <div class="field" style="flex:1"><label>Validade</label><input type="text" placeholder="MM/AA"/></div>
        <div class="field" style="flex:1"><label>CVV</label><input type="text" placeholder="123"/></div>
      </div>
      <button class="btn btn-primary btn-block" data-go="checkout-confirm">Confirmar assinatura</button>
      <p class="center-note">Pagamento processado com segurança.</p>
    </div>`
});

registerScreen('checkout-confirm', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll" style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:14%">
      <div class="e-icon" style="width:76px;height:76px;margin-bottom:1.2rem">${icon('heart',30)}</div>
      <h3 style="font-family:var(--font-display);font-size:1.5rem;margin-bottom:.4rem">Premium ativado 🎉</h3>
      <p class="muted mb-lg" style="max-width:26ch">Seu teste grátis de 7 dias começou. Aproveitem juntos.</p>
      <button class="btn btn-primary btn-block" data-go="subscription-manage">Ver minha assinatura</button>
    </div>`
});

registerScreen('subscription-manage', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ back: true, title: 'Assinatura' })}
      <div class="card mb-md">
        <div class="chip on mb-sm">Trial ativo</div>
        <div class="r-title" style="font-size:1.1rem">Chamego Premium</div>
        <div class="r-sub">Renova em 7 dias · R$ 19,90/mês</div>
      </div>
      <div class="row-list mb-lg">
        <div class="row"><div class="r-body"><div class="r-title">Forma de pagamento</div><div class="r-sub">Cartão terminado em 4242</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row"><div class="r-body"><div class="r-title">Histórico de packs</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
      </div>
      <button class="btn btn-ghost btn-block" style="color:#b23b3b">Cancelar assinatura</button>
    </div>`
});
