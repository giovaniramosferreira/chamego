/* ============================================================
   Chamego App — Início (Home)
   ============================================================ */
registerScreen('home-root', {
  tab: 'home', refresh: true,
  render: (d) => {
    const st = d.est || 'conectado'; // vazio | sozinho | conectado
    const switcher = stateSwitch('est', ['vazio','sozinho','conectado'], st);
    if (st === 'vazio') {
      return `<div class="screen-scroll">
        ${bigHeader({ title: 'Bem-vindo(a) 👋', initials:'M' })}
        <div style="padding:0 0 6px">${switcher}</div>
        <div class="empty-state">
          <div class="e-icon">${icon('together',26)}</div>
          <h3>Vamos começar</h3>
          <p>Crie seu primeiro evento, sua primeira lista ou registre um momento para ver tudo ganhar vida aqui.</p>
          <button class="btn btn-primary mb-sm" style="margin-top:.6rem" data-go="event-create">Criar primeiro evento</button>
          <button class="btn btn-ghost" data-go="invite-partner">Convidar meu par</button>
        </div>
      </div>`;
    }
    const solo = st === 'sozinho';
    return `<div class="screen-scroll">
      ${bigHeader({ title: solo ? 'Boa tarde, Mariana' : 'Boa tarde, Mari & João', sub: solo ? 'Você está usando o Chamego sozinha por enquanto.' : null, initials:'M' })}
      <div style="padding-bottom:6px">${switcher}</div>

      ${solo ? `
      <div class="card mb-md" style="display:flex;align-items:center;gap:.9rem">
        <div class="r-icon" style="background:var(--accent-soft)">${icon('together',17,'stroke="var(--accent-press)"')}</div>
        <div style="flex:1">
          <div class="r-title">Convide seu par</div>
          <div class="r-sub">Compartilhe o espaço quando quiser</div>
        </div>
        <button class="btn btn-primary btn-sm" data-go="invite-partner">Convidar</button>
      </div>` : ''}

      <div class="card mb-md" style="text-align:center">
        <div class="section-title" style="margin-top:0">Juntos há</div>
        <div style="font-family:var(--font-display);font-size:2.6rem;color:var(--accent)">743 <span style="font-size:1.2rem;color:var(--ink-2);font-family:var(--font-sans)">dias</span></div>
        <div class="muted" style="font-size:.85rem">desde 22 de junho de 2024</div>
      </div>

      <div class="section-title">Próximo evento</div>
      <div class="event-item" style="padding-top:0">
        <div class="e-time">19:30</div><div class="e-bar"></div>
        <div class="e-body" data-go="event-detail">
          <div class="e-title">Jantar de aniversário 🎂</div>
          <div class="e-sub">Sex, 5 de julho · Restaurante Oliva</div>
        </div>
      </div>

      <div class="section-title">Tarefas pendentes</div>
      <div class="row-list mb-md">
        <div class="row" data-go="list-detail"><div class="checkbox"></div><div class="r-body"><div class="r-title">Comprar presente da Mari</div><div class="r-sub">Compras · até sexta</div></div></div>
        <div class="row" data-go="list-detail"><div class="checkbox"></div><div class="r-body"><div class="r-title">Levar roupa na lavanderia</div><div class="r-sub">Casa · João</div></div></div>
      </div>

      <div class="section-title">Último check-in</div>
      <div class="card mb-md" style="display:flex;align-items:center;gap:.9rem" data-go="checkin">
        <div style="font-size:1.8rem">😊</div>
        <div style="flex:1"><div class="r-title">Você disse: bem, feliz</div><div class="r-sub">Hoje, 08:14</div></div>
        <div class="r-chev">${icon('chevronR',14)}</div>
      </div>

      <div class="section-title">Atalhos</div>
      <div class="chip-row mb-md">
        <div class="chip on" data-go="date-planner">${icon('star',13)} Planejar date</div>
        <div class="chip on" data-go="list-detail">${icon('plus',13)} Adicionar tarefa</div>
        <div class="chip on" data-go="moment-add">${icon('image',13)} Registrar momento</div>
        <div class="chip on" data-go="agenda-root">${icon('calendar',13)} Próximas datas</div>
      </div>
    </div>`;
  }
});
