/* ============================================================
   Chamego App — Configurações
   ============================================================ */
registerScreen('config-hub', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ back: true, title: 'Configurações' })}
      <div class="card mb-lg" data-go="profile" style="display:flex;align-items:center;gap:.9rem">
        <div class="avatar" style="width:52px;height:52px;font-size:1.1rem">M</div>
        <div style="flex:1"><div class="r-title" style="font-size:1.05rem">Mariana Costa</div><div class="r-sub">mariana@email.com</div></div>
        <div class="r-chev">${icon('chevronR',14)}</div>
      </div>

      <div class="section-title" style="margin-top:0">Casal</div>
      <div class="row-list mb-md">
        <div class="row" data-go="couple-profile"><div class="r-icon">${icon('together')}</div><div class="r-body"><div class="r-title">Perfil do casal</div><div class="r-sub">Mari & João</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row" data-go="manage-partner"><div class="r-icon">${icon('user')}</div><div class="r-body"><div class="r-title">Gerenciar parceiro</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row" data-go="paywall"><div class="r-icon">${icon('gift')}</div><div class="r-body"><div class="r-title">Assinatura</div><div class="r-sub">Plano gratuito</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
      </div>

      <div class="section-title">Preferências</div>
      <div class="row-list mb-md">
        <div class="row" data-go="notif-settings"><div class="r-icon">${icon('bell')}</div><div class="r-body"><div class="r-title">Notificações</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row" data-go="privacy-settings"><div class="r-icon">${icon('shield')}</div><div class="r-body"><div class="r-title">Privacidade e permissões</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row" data-go="account-settings"><div class="r-icon">${icon('lock')}</div><div class="r-body"><div class="r-title">Conta, segurança e idioma</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
      </div>

      <div class="section-title">Suporte</div>
      <div class="row-list mb-lg">
        <div class="row"><div class="r-icon">${icon('chat')}</div><div class="r-body"><div class="r-title">Ajuda e suporte</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
      </div>
      <button class="btn btn-ghost btn-block" data-go="welcome" data-fresh>${icon('logout',16)} Sair da conta</button>
    </div>`
});

registerScreen('profile', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ back: true, title: 'Meu perfil' })}
      <div style="display:flex;justify-content:center;margin-bottom:1.2rem">
        <div style="width:88px;height:88px;border-radius:50%;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:2rem;color:var(--accent-press)">M</div>
      </div>
      <div class="field"><label>Nome</label><input type="text" value="Mariana Costa"/></div>
      <div class="field"><label>E-mail</label><input type="email" value="mariana@email.com"/></div>
      <div class="field"><label>Telefone</label><input type="tel" placeholder="Opcional"/></div>
      <button class="btn btn-primary btn-block">Salvar alterações</button>
    </div>`
});

registerScreen('couple-profile', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ back: true, title: 'Perfil do casal' })}
      <div class="field"><label>Nome do espaço</label><input type="text" value="Mari & João"/></div>
      <div class="field"><label>Data principal (contador)</label><input type="date" value="2024-06-22"/></div>
      <div class="row-list mb-md">
        <div class="row"><div class="r-icon">${icon('calendar')}</div><div class="r-body"><div class="r-title">Integração com calendário</div><div class="r-sub">Google Calendar conectado</div></div><div class="tgl on" data-toggle></div></div>
        <div class="row"><div class="r-icon">${icon('shield')}</div><div class="r-body"><div class="r-title">Compromissos individuais visíveis</div></div><div class="tgl on" data-toggle></div></div>
      </div>
      <button class="btn btn-primary btn-block">Salvar</button>
    </div>`
});

registerScreen('manage-partner', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ back: true, title: 'Gerenciar parceiro' })}
      <div class="card mb-lg" style="display:flex;align-items:center;gap:.9rem">
        <div class="avatar" style="width:46px;height:46px">J</div>
        <div style="flex:1"><div class="r-title">João Pereira</div><div class="r-sub">Conectado desde jan/2024</div></div>
        <div class="chip on">Ativo</div>
      </div>
      <div class="section-title" style="margin-top:0">Convites</div>
      <div class="row-list mb-lg">
        <div class="row" data-go="invite-partner"><div class="r-icon">${icon('link')}</div><div class="r-body"><div class="r-title">Gerar novo convite</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
      </div>
      <button class="btn btn-ghost btn-block" style="color:#b23b3b">${icon('close',16)} Desconectar parceiro</button>
    </div>`
});

registerScreen('notif-settings', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ back: true, title: 'Notificações' })}
      <div class="row-list mb-md">
        <div class="row"><div class="r-body"><div class="r-title">Eventos e lembretes</div></div><div class="tgl on" data-toggle></div></div>
        <div class="row"><div class="r-body"><div class="r-title">Tarefas atribuídas a mim</div></div><div class="tgl on" data-toggle></div></div>
        <div class="row"><div class="r-body"><div class="r-title">Mensagens do chat</div></div><div class="tgl on" data-toggle></div></div>
        <div class="row"><div class="r-body"><div class="r-title">Check-in diário</div></div><div class="tgl" data-toggle></div></div>
        <div class="row"><div class="r-body"><div class="r-title">Novidades e packs</div></div><div class="tgl" data-toggle></div></div>
      </div>
    </div>`
});

registerScreen('privacy-settings', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ back: true, title: 'Privacidade' })}
      <div class="row-list mb-md">
        <div class="row"><div class="r-icon">${icon('calendar')}</div><div class="r-body"><div class="r-title">Acesso ao calendário</div></div><div class="tgl on" data-toggle></div></div>
        <div class="row"><div class="r-icon">${icon('image')}</div><div class="r-body"><div class="r-title">Acesso a fotos</div></div><div class="tgl on" data-toggle></div></div>
        <div class="row"><div class="r-icon">${icon('bell')}</div><div class="r-body"><div class="r-title">Notificações do sistema</div></div><div class="tgl on" data-toggle></div></div>
      </div>
      <p class="muted" style="font-size:.85rem">Seus dados são visíveis apenas para você e seu par. Nada é compartilhado publicamente.</p>
    </div>`
});

registerScreen('account-settings', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ back: true, title: 'Conta e segurança' })}
      <div class="row-list mb-md">
        <div class="row"><div class="r-icon">${icon('lock')}</div><div class="r-body"><div class="r-title">Alterar senha</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row"><div class="r-icon">${icon('shield')}</div><div class="r-body"><div class="r-title">Verificação em duas etapas</div></div><div class="tgl" data-toggle></div></div>
        <div class="row"><div class="r-icon">${icon('globe')}</div><div class="r-body"><div class="r-title">Idioma</div><div class="r-sub">Português (Brasil)</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
      </div>
      <div class="row-list mb-lg">
        <div class="row"><div class="r-body"><div class="r-title" style="color:#b23b3b">Excluir minha conta</div><div class="r-sub">Remove todos os dados permanentemente</div></div></div>
      </div>
    </div>`
});
