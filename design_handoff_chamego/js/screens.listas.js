/* ============================================================
   Chamego App — Listas
   ============================================================ */
registerScreen('listas-root', {
  tab: 'listas', refresh: true,
  render: (d) => {
    const st = d.est || 'conteudo';
    if (st === 'vazio') {
      return `<div class="screen-scroll">
        ${bigHeader({ title: 'Listas' })}
        <div style="padding-bottom:6px">${stateSwitch('est', ['vazio','conteudo'], st)}</div>
        <div class="empty-state">
          <div class="e-icon">${icon('list',26)}</div>
          <h3>Nenhuma lista ainda</h3>
          <p>Crie a primeira lista de compras ou tarefas da casa.</p>
          <button class="btn btn-primary" style="margin-top:.6rem" data-go="lista-create">Criar lista</button>
        </div>
      </div>`;
    }
    return `<div class="screen-scroll" style="position:relative">
      ${bigHeader({ title: 'Listas' })}
      <div style="padding-bottom:6px">${stateSwitch('est', ['vazio','conteudo'], st)}</div>
      <div class="chip-row mb-md">
        <div class="chip on">Todas</div><div class="chip">Compartilhadas</div><div class="chip">Minhas</div><div class="chip">Wishlist</div>
      </div>

      <div class="row-list mb-md">
        <div class="row" data-go="list-detail"><div class="r-icon">${icon('shopping')}</div>
          <div class="r-body"><div class="r-title">Compras da semana</div><div class="r-sub">4 de 7 concluídos · compartilhada</div></div>
          <div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row" data-go="list-detail"><div class="r-icon">${icon('home')}</div>
          <div class="r-body"><div class="r-title">Tarefas da casa</div><div class="r-sub">2 de 5 concluídos · compartilhada</div></div>
          <div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row" data-go="list-detail"><div class="r-icon">${icon('list')}</div>
          <div class="r-body"><div class="r-title">Preparar a viagem</div><div class="r-sub">0 de 9 concluídos · individual</div></div>
          <div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row" data-go="list-detail"><div class="r-icon">${icon('gift')}</div>
          <div class="r-body"><div class="r-title">Wishlist de presentes</div><div class="r-sub">6 itens salvos</div></div>
          <div class="r-chev">${icon('chevronR',14)}</div></div>
      </div>
      <div class="fab" data-go="lista-create">${icon('plus',24,'stroke="#fff"')}</div>
    </div>`;
  }
});

registerScreen('list-detail', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll" style="position:relative">
      ${appHeader({ back: true, title: 'Compras da semana', actions:[{icon:'edit'}] })}
      <div class="chip-row mb-md">
        <div class="chip on">${icon('together',12)} Compartilhada</div>
        <div class="chip">${icon('filter',12)} Prioridade</div>
      </div>
      <div class="row-list mb-md">
        <div class="row done"><div class="checkbox checked">${icon('check',12)}</div><div class="r-body"><div class="r-title">Leite e ovos</div></div></div>
        <div class="row done"><div class="checkbox checked">${icon('check',12)}</div><div class="r-body"><div class="r-title">Café</div></div></div>
        <div class="row" data-go="add-item"><div class="checkbox"></div>
          <div class="r-body"><div class="r-title">Fruta pra semana</div><div class="r-sub">Prioridade alta · até quarta</div></div>
          <div class="avatar" style="width:24px;height:24px;font-size:.65rem">M</div></div>
        <div class="row" data-go="add-item"><div class="checkbox"></div>
          <div class="r-body"><div class="r-title">Detergente e sabão</div><div class="r-sub">João</div></div>
          <div class="avatar" style="width:24px;height:24px;font-size:.65rem">J</div></div>
        <div class="row" data-go="add-item"><div class="checkbox"></div><div class="r-body"><div class="r-title">Vinho pro jantar de sexta</div><div class="r-sub">Repete toda semana</div></div></div>
      </div>

      <div class="section-title">Comentários</div>
      <div class="card">
        <div style="font-size:.9rem;margin-bottom:.5rem"><strong>Mari:</strong> Adicionei o vinho pro jantar 🍷</div>
        <input type="text" placeholder="Comentar..." style="width:100%;padding:.6em .9em;border-radius:99px;background:var(--bg-tint);border:none;font:inherit"/>
      </div>
      <div class="fab" data-go="add-item">${icon('plus',24,'stroke="#fff"')}</div>
    </div>`
});

registerScreen('add-item', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ close: true, title: 'Novo item' })}
      <div class="field"><label>O que é?</label><input type="text" placeholder="Ex.: Fruta pra semana"/></div>
      <div class="field"><label>Prioridade</label>
        <div class="chip-row"><div class="chip">Baixa</div><div class="chip on">Alta</div><div class="chip">Urgente</div></div>
      </div>
      <div class="field"><label>Prazo</label><input type="date"/></div>
      <div class="field"><label>Repetição</label><select><option>Não repete</option><option>Toda semana</option><option>Todo mês</option></select></div>
      <div class="field"><label>Atribuir a</label>
        <div class="chip-row"><div class="chip on">Qualquer um</div><div class="chip">Mari</div><div class="chip">João</div></div>
      </div>
      <button class="btn btn-primary btn-block" data-go="list-detail">Adicionar item</button>
    </div>`
});

registerScreen('lista-create', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ close: true, title: 'Nova lista' })}
      <div class="field"><label>Nome da lista</label><input type="text" placeholder="Ex.: Lista de compras"/></div>
      <div class="field"><label>Tipo</label>
        <div class="chip-row">
          <div class="chip on">Compras</div><div class="chip">Tarefas da casa</div><div class="chip">Wishlist</div><div class="chip">Personalizada</div>
        </div>
      </div>
      <div class="row-list mb-lg">
        <div class="row"><div class="r-icon">${icon('together')}</div><div class="r-body"><div class="r-title">Compartilhar com meu par</div></div><div class="tgl on" data-toggle></div></div>
      </div>
      <button class="btn btn-primary btn-block" data-go="listas-root" data-fresh>Criar lista</button>
    </div>`
});
