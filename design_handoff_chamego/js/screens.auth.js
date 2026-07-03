/* ============================================================
   Chamego App — Autenticação, Onboarding, Setup do casal
   ============================================================ */

/* ---------- Splash ---------- */
registerScreen('splash', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:0 20px;text-align:center;gap:1.2rem">
      <div style="width:84px;height:84px;border-radius:26px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px var(--accent-line)">
        ${icon('heart', 38)}
      </div>
      <div class="auth-brand" style="margin:0">
        <div class="logo">chamego<span class="dot">.</span></div>
      </div>
      <p class="muted" style="max-width:24ch">a vida a dois, organizada com carinho</p>
      <button class="btn btn-primary" style="margin-top:1.5rem" data-go="welcome">Continuar</button>
    </div>`
});

/* ---------- Boas-vindas ---------- */
registerScreen('welcome', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll auth-body">
      <div class="onb-illustration"><img src="images/abraco.png" alt=""/></div>
      <h1 style="font-family:var(--font-display);font-size:1.9rem;margin-bottom:.5rem">Um espaço só de <span class="display-em">vocês dois</span></h1>
      <p class="muted mb-lg">Organize rotina, compromissos, listas e memórias em um lugar privado — e feito para durar.</p>
      <button class="btn btn-primary btn-block mb-sm" data-go="signup">Criar conta</button>
      <button class="btn btn-ghost btn-block" data-go="login">Já tenho conta</button>
    </div>`
});

/* ---------- Login ---------- */
registerScreen('login', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll auth-body">
      ${appHeader({ back: true })}
      <div class="auth-brand"><div class="logo">chamego<span class="dot">.</span></div></div>
      <button class="btn btn-social mb-sm">${icon('apple',18)} Continuar com Apple</button>
      <button class="btn btn-social">${icon('google',18)} Continuar com Google</button>
      <div class="divider-or">ou</div>
      <div class="field"><label>E-mail</label><input type="email" placeholder="voce@email.com"/></div>
      <div class="field"><label>Senha</label><input type="password" placeholder="••••••••"/></div>
      <p style="text-align:right;margin-bottom:1.2rem"><a class="link-accent" style="font-size:.85rem" data-go="forgot">Esqueci minha senha</a></p>
      <button class="btn btn-primary btn-block" data-go="onb-goal">Entrar</button>
      <p class="center-note">Não tem conta? <a class="link-accent" data-go="signup">Criar agora</a></p>
    </div>`
});

/* ---------- Cadastro ---------- */
registerScreen('signup', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll auth-body">
      ${appHeader({ back: true })}
      <div class="auth-brand"><div class="logo">chamego<span class="dot">.</span></div></div>
      <button class="btn btn-social mb-sm">${icon('apple',18)} Continuar com Apple</button>
      <button class="btn btn-social">${icon('google',18)} Continuar com Google</button>
      <div class="divider-or">ou crie com e-mail</div>
      <div class="field"><label>Nome</label><input type="text" placeholder="Seu nome"/></div>
      <div class="field"><label>E-mail</label><input type="email" placeholder="voce@email.com"/></div>
      <div class="field"><label>Senha</label><input type="password" placeholder="Mínimo 8 caracteres"/></div>
      <button class="btn btn-primary btn-block" data-go="terms">Criar conta</button>
      <p class="center-note">Já tem conta? <a class="link-accent" data-go="login">Entrar</a></p>
    </div>`
});

/* ---------- Esqueci a senha ---------- */
registerScreen('forgot', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll auth-body">
      ${appHeader({ back: true, title: 'Recuperar senha' })}
      <p class="muted mb-lg">Envie o código de recuperação para o seu e-mail cadastrado.</p>
      <div class="field"><label>E-mail</label><input type="email" placeholder="voce@email.com"/></div>
      <button class="btn btn-primary btn-block" data-go="reset">Enviar código</button>
    </div>`
});

registerScreen('reset', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll auth-body">
      ${appHeader({ back: true, title: 'Nova senha' })}
      <p class="muted mb-lg">Digite o código enviado e escolha uma nova senha.</p>
      <div class="field"><label>Código de 6 dígitos</label><input type="text" placeholder="000000"/></div>
      <div class="field"><label>Nova senha</label><input type="password" placeholder="Mínimo 8 caracteres"/></div>
      <button class="btn btn-primary btn-block" data-go="login">Redefinir e entrar</button>
    </div>`
});

/* ---------- Termos ---------- */
registerScreen('terms', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll auth-body">
      ${appHeader({ back: true, title: 'Termos e privacidade' })}
      <div class="card mb-lg" style="font-size:.88rem;color:var(--ink-2);line-height:1.7;max-height:320px;overflow-y:auto">
        <p class="mb-sm"><strong style="color:var(--ink)">Seu espaço é privado.</strong> Tudo que vocês registram no Chamego — fotos, listas, conversas — é visível apenas para o casal, nunca para terceiros.</p>
        <p class="mb-sm">Você pode exportar ou excluir seus dados a qualquer momento, nas Configurações.</p>
        <p>Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade do Chamego.</p>
      </div>
      <div class="row-list mb-lg">
        <div class="row" data-toggle style="cursor:pointer">
          <div class="checkbox" id="chk-terms">${icon('check',12)}</div>
          <div class="r-body"><div class="r-title" style="font-weight:500;font-size:.92rem">Li e aceito os termos e a política de privacidade</div></div>
        </div>
      </div>
      <button class="btn btn-primary btn-block" data-go="verify">Continuar</button>
    </div>`
});

registerScreen('verify', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll auth-body">
      ${appHeader({ back: true, title: 'Verifique seu e-mail' })}
      <div class="empty-state" style="padding-top:6%">
        <div class="e-icon">${icon('mail', 26)}</div>
        <h3>Enviamos um código</h3>
        <p>Confira sua caixa de entrada e digite os 6 dígitos abaixo.</p>
      </div>
      <div class="field"><input type="text" placeholder="000000" style="text-align:center;letter-spacing:.5em;font-size:1.2rem"/></div>
      <button class="btn btn-primary btn-block mb-sm" data-go="onb-goal">Confirmar</button>
      <p class="center-note">Não recebeu? <a class="link-accent">Reenviar código</a></p>
    </div>`
});

/* ============================================================
   Onboarding
   ============================================================ */
function onbProgress(step, total) {
  let dots = '';
  for (let i = 0; i < total; i++) dots += `<span class="${i===step?'on':''}"></span>`;
  return `<div class="progress-dots">${dots}</div>`;
}

function choiceCard(iconName, title, sub, selected, setKey, value) {
  return `<div class="choice ${selected?'sel':''}" data-setstate="${setKey}:${value}">
    <div class="c-icon">${icon(iconName,18)}</div>
    <div><div class="c-title">${title}</div>${sub?`<div class="c-sub">${sub}</div>`:''}</div>
    <div class="c-radio"></div>
  </div>`;
}

registerScreen('onb-goal', {
  hideTabs: true, refresh: true,
  render: (d) => `
    <div class="screen-scroll auth-body">
      ${appHeader({ back: true })}
      ${onbProgress(0,4)}
      <h1 style="font-family:var(--font-display);font-size:1.7rem;margin-bottom:.4rem">O que você mais busca agora?</h1>
      <p class="muted mb-lg">Vamos usar isso pra personalizar seu início.</p>
      ${choiceCard('list','Organizar a rotina','Tarefas, compras e casa', d.goal==='rotina', 'goal', 'rotina')}
      ${choiceCard('heart','Fortalecer a conexão','Check-ins e momentos', d.goal==='conexao', 'goal', 'conexao')}
      ${choiceCard('calendar','Lembrar datas importantes','Aniversários e eventos', d.goal==='datas', 'goal', 'datas')}
      ${choiceCard('together','Planejar a vida a dois','Metas e objetivos', d.goal==='planejar', 'goal', 'planejar')}
      <button class="btn btn-primary btn-block" style="margin-top:1.2rem" data-go="onb-stage">Continuar</button>
    </div>`
});

registerScreen('onb-stage', {
  hideTabs: true, refresh: true,
  render: (d) => `
    <div class="screen-scroll auth-body">
      ${appHeader({ back: true })}
      ${onbProgress(1,4)}
      <h1 style="font-family:var(--font-display);font-size:1.7rem;margin-bottom:.4rem">Em que fase vocês estão?</h1>
      <p class="muted mb-lg">Isso ajusta as sugestões que aparecem pra vocês.</p>
      ${choiceCard('home','Morando juntos','', d.stage==='morando', 'stage', 'morando')}
      ${choiceCard('heart','Namorando','', d.stage==='namorando', 'stage', 'namorando')}
      ${choiceCard('star','Noivos','', d.stage==='noivos', 'stage', 'noivos')}
      ${choiceCard('pin','À distância','', d.stage==='distancia', 'stage', 'distancia')}
      ${choiceCard('together','Outro','', d.stage==='outro', 'stage', 'outro')}
      <button class="btn btn-primary btn-block" style="margin-top:1.2rem" data-go="onb-alone">Continuar</button>
    </div>`
});

registerScreen('onb-alone', {
  hideTabs: true, refresh: true,
  render: (d) => `
    <div class="screen-scroll auth-body">
      ${appHeader({ back: true })}
      ${onbProgress(2,4)}
      <h1 style="font-family:var(--font-display);font-size:1.7rem;margin-bottom:.4rem">Como quer começar?</h1>
      <p class="muted mb-lg">Você pode usar sozinho(a) agora e convidar seu par depois — sem pressa.</p>
      ${choiceCard('user','Usar sozinho(a) por enquanto','Convido meu par mais tarde', d.alone==='sozinho', 'alone', 'sozinho')}
      ${choiceCard('together','Convidar meu par agora','Criamos o espaço juntos', d.alone==='convidar', 'alone', 'convidar')}
      <button class="btn btn-primary btn-block" style="margin-top:1.2rem" data-go="onb-perm">Continuar</button>
    </div>`
});

registerScreen('onb-perm', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll auth-body">
      ${appHeader({ back: true })}
      ${onbProgress(3,4)}
      <h1 style="font-family:var(--font-display);font-size:1.7rem;margin-bottom:.4rem">Só mais três permissões</h1>
      <p class="muted mb-lg">Você pode mudar isso quando quiser, nas configurações.</p>
      <div class="row-list mb-lg">
        <div class="row"><div class="r-icon">${icon('bell')}</div><div class="r-body"><div class="r-title">Notificações</div><div class="r-sub">Lembretes de eventos e tarefas</div></div><div class="tgl on" data-toggle></div></div>
        <div class="row"><div class="r-icon">${icon('calendar')}</div><div class="r-body"><div class="r-title">Calendário</div><div class="r-sub">Sincronizar com seu calendário</div></div><div class="tgl on" data-toggle></div></div>
        <div class="row"><div class="r-icon">${icon('image')}</div><div class="r-body"><div class="r-title">Fotos</div><div class="r-sub">Adicionar fotos aos momentos</div></div><div class="tgl on" data-toggle></div></div>
      </div>
      <button class="btn btn-primary btn-block" data-go="couple-name">Continuar</button>
    </div>`
});

/* ============================================================
   Criação do espaço do casal
   ============================================================ */
registerScreen('couple-name', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll auth-body">
      ${appHeader({ back: true, title: 'Seu espaço' })}
      <p class="muted mb-lg">Dê um nome carinhoso ao espaço de vocês.</p>
      <div style="display:flex;justify-content:center;margin-bottom:1.4rem">
        <div style="width:88px;height:88px;border-radius:50%;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px var(--accent-line);position:relative">
          ${icon('camera', 26)}
          <div style="position:absolute;bottom:-2px;right:-2px;width:28px;height:28px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.15)">${icon('plus',14,'stroke="#fff"')}</div>
        </div>
      </div>
      <div class="field"><label>Nome do casal ou espaço</label><input type="text" placeholder="Ex.: Mari & João"/></div>
      <button class="btn btn-primary btn-block" data-go="couple-date">Continuar</button>
    </div>`
});

registerScreen('couple-date', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll auth-body">
      ${appHeader({ back: true, title: 'Data importante' })}
      <p class="muted mb-lg">Escolha a data que vai virar o contador de dias juntos.</p>
      <div class="field"><label>Data</label><input type="date" value="2024-06-22"/></div>
      <div class="field"><label>O que essa data representa?</label>
        <select><option>Primeiro encontro</option><option>Início do namoro</option><option>Noivado</option><option>Casamento</option><option>Outro</option></select>
      </div>
      <button class="btn btn-primary btn-block" data-go="invite-partner">Continuar</button>
    </div>`
});

registerScreen('invite-partner', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll auth-body">
      ${appHeader({ back: true, title: 'Convide seu par' })}
      <p class="muted mb-lg">Envie o convite agora ou pule e convide depois nas configurações.</p>
      <div class="row-list mb-md">
        <div class="row" data-go="partner-pending"><div class="r-icon">${icon('link')}</div><div class="r-body"><div class="r-title">Copiar link do convite</div><div class="r-sub">chamego.app/convite/8f2a</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row" data-go="partner-pending"><div class="r-icon">${icon('whatsapp')}</div><div class="r-body"><div class="r-title">Enviar pelo WhatsApp</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row" data-go="partner-pending"><div class="r-icon">${icon('mail')}</div><div class="r-body"><div class="r-title">Enviar por e-mail</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row" data-go="partner-pending"><div class="r-icon">${icon('shield')}</div><div class="r-body"><div class="r-title">Usar código de pareamento</div><div class="r-sub">Código: 8F2A</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
      </div>
      <button class="btn btn-ghost btn-block" data-go="home-root" data-fresh>Pular por enquanto</button>
    </div>`
});

registerScreen('partner-pending', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll auth-body" style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:10%">
      ${appHeader({ back: true })}
      <div class="e-icon" style="width:76px;height:76px;margin-bottom:1rem">${icon('link',30)}</div>
      <h3 style="font-family:var(--font-display);font-size:1.4rem;margin-bottom:.4rem">Convite enviado</h3>
      <p class="muted mb-lg" style="max-width:26ch">Assim que seu par aceitar, o espaço de vocês se conecta automaticamente.</p>
      <div class="chip on mb-lg">Aguardando aceite</div>
      <button class="btn btn-primary btn-block" data-go="partner-connected">Simular aceite ✦</button>
      <button class="btn btn-ghost btn-block" style="margin-top:.6rem" data-go="home-root" data-fresh>Continuar sozinho por agora</button>
    </div>`
});

registerScreen('partner-connected', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll auth-body" style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:10%">
      <div class="e-icon" style="width:76px;height:76px;margin-bottom:1rem">${icon('heart',32)}</div>
      <h3 style="font-family:var(--font-display);font-size:1.4rem;margin-bottom:.4rem">Parceiro conectado!</h3>
      <p class="muted mb-lg" style="max-width:26ch">A partir de agora, tudo que vocês criarem aparece para os dois.</p>
      <button class="btn btn-primary btn-block" data-go="home-root" data-fresh>Ir para o início</button>
    </div>`
});
