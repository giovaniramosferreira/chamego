/* ============================================================
   Chamego App — Agenda
   ============================================================ */

function calGrid(monthDays, todayIdx, markedIdx) {
  const dows = ['D','S','T','Q','Q','S','S'];
  let html = dows.map(d => `<div class="cal-dow">${d}</div>`).join('');
  monthDays.forEach((n, i) => {
    const isToday = i === todayIdx;
    const marked = markedIdx.includes(i);
    html += `<div class="cal-cell ${isToday?'today':''} ${!n?'muted':''}" ${n?`data-go="agenda-day"`:''}>
      <span>${n||''}</span>${marked?'<span class="dot"></span>':''}
    </div>`;
  });
  return html;
}

registerScreen('agenda-root', {
  tab: 'agenda', refresh: true,
  render: (d) => {
    const view = d.view || 'mes';
    const days = [null,null,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31];
    return `<div class="screen-scroll">
      ${bigHeader({ title: 'Agenda' })}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        ${stateSwitch('view', ['mes','semana','dia'], view)}
        <div class="icon-btn" data-go="event-create">${icon('plus',16)}</div>
      </div>

      ${view === 'mes' ? `
        <div class="card mb-md">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.8rem">
            <div class="icon-btn">${icon('back',14)}</div>
            <div style="font-weight:700">Julho 2026</div>
            <div class="icon-btn" style="transform:scaleX(-1)">${icon('back',14)}</div>
          </div>
          <div class="cal-grid">${calGrid(days, 5, [7,12,20])}</div>
        </div>` : ''}

      ${view === 'semana' ? `
        <div class="week-strip mb-md">
          ${['SEG','TER','QUA','QUI','SEX','SÁB','DOM'].map((n,i)=>`
            <div class="week-day ${i===4?'sel':''}"><div class="wd-name">${n}</div><div class="wd-num">${i+1}</div></div>
          `).join('')}
        </div>` : ''}

      ${view === 'dia' ? `<div class="card mb-md" style="text-align:center"><div class="section-title" style="margin-top:0">Hoje</div><div style="font-family:var(--font-display);font-size:1.4rem">Sexta, 3 de julho</div></div>` : ''}

      <div class="section-title">Próximos eventos</div>
      <div class="event-item"><div class="e-time">19:30</div><div class="e-bar"></div>
        <div class="e-body" data-go="event-detail"><div class="e-title">Jantar de aniversário 🎂</div><div class="e-sub">Hoje · Restaurante Oliva</div></div></div>
      <div class="event-item"><div class="e-time">09:00</div><div class="e-bar" style="background:var(--ink-3)"></div>
        <div class="e-body" data-go="event-detail"><div class="e-title">Consulta médica (individual)</div><div class="e-sub">Amanhã · só você</div></div></div>
      <div class="event-item"><div class="e-time">Todo dia</div><div class="e-bar"></div>
        <div class="e-body" data-go="event-detail"><div class="e-title">1 ano de namoro 💍</div><div class="e-sub">22 de agosto · data especial</div></div></div>

      <div class="section-title">Objetivo de dates</div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem">
          <div class="r-title">2 de 2 dates este mês</div>
          <div class="chip on">Meta batida ✓</div>
        </div>
        <div style="height:8px;border-radius:99px;background:var(--bg-tint);overflow:hidden">
          <div style="height:100%;width:100%;background:var(--accent);border-radius:99px"></div>
        </div>
        <button class="btn btn-ghost btn-block btn-sm" style="margin-top:.9rem" data-go="date-planner">Planejar próximo date</button>
      </div>
    </div>`;
  }
});

registerScreen('event-detail', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ back: true, actions:[{icon:'edit', go:'event-create'}] })}
      <div class="chip on mb-sm">Compartilhado</div>
      <h1 style="font-family:var(--font-display);font-size:1.7rem;margin-bottom:.3rem">Jantar de aniversário 🎂</h1>
      <p class="muted mb-lg">Sexta, 5 de julho · 19:30 — 22:00</p>

      <div class="row-list mb-md">
        <div class="row"><div class="r-icon">${icon('pin')}</div><div class="r-body"><div class="r-title">Restaurante Oliva</div><div class="r-sub">Rua das Flores, 120</div></div></div>
        <div class="row"><div class="r-icon">${icon('repeat')}</div><div class="r-body"><div class="r-title">Não se repete</div></div></div>
        <div class="row"><div class="r-icon">${icon('bell')}</div><div class="r-body"><div class="r-title">Lembrete</div><div class="r-sub">1 hora antes</div></div></div>
        <div class="row"><div class="r-icon">${icon('together')}</div><div class="r-body"><div class="r-title">Visível para</div><div class="r-sub">Mari & João</div></div></div>
      </div>

      <div class="section-title">Comentários</div>
      <div class="card mb-md">
        <div style="display:flex;gap:.6rem;margin-bottom:.7rem">
          <div class="avatar" style="width:28px;height:28px;font-size:.7rem">J</div>
          <div><div style="font-size:.9rem"><strong>João:</strong> Já reservei a mesa perto da janela 😊</div><div class="muted" style="font-size:.76rem">ontem</div></div>
        </div>
        <input type="text" placeholder="Escrever um comentário..." style="width:100%;padding:.6em .9em;border-radius:99px;background:var(--bg-tint);border:none;font:inherit"/>
      </div>

      <button class="btn btn-ghost btn-block" style="color:#b23b3b">${icon('trash',16)} Excluir evento</button>
    </div>`
});

registerScreen('event-create', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ close: true, title: 'Novo evento' })}
      <div class="field"><label>Título</label><input type="text" placeholder="Ex.: Jantar de aniversário"/></div>
      <div class="field"><label>Data</label><input type="date" value="2026-07-05"/></div>
      <div class="field"><label>Horário</label><input type="text" placeholder="19:30 — 22:00"/></div>
      <div class="field"><label>Local</label><input type="text" placeholder="Opcional"/></div>
      <div class="field"><label>Repetição</label><select><option>Não se repete</option><option>Toda semana</option><option>Todo mês</option><option>Todo ano</option></select></div>
      <div class="field"><label>Lembrete</label><select><option>1 hora antes</option><option>No dia</option><option>1 dia antes</option><option>Sem lembrete</option></select></div>
      <div class="row-list mb-lg">
        <div class="row"><div class="r-icon">${icon('together')}</div><div class="r-body"><div class="r-title">Compartilhar com meu par</div></div><div class="tgl on" data-toggle></div></div>
      </div>
      <button class="btn btn-primary btn-block" data-go="event-detail">Salvar evento</button>
    </div>`
});

registerScreen('date-planner', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ back: true, title: 'Date planner' })}
      <p class="muted mb-lg">Ideias rápidas pra planejar o próximo encontro de vocês.</p>
      <div class="section-title" style="margin-top:0">Sugestões pra vocês</div>
      <div class="row-list mb-md">
        <div class="row" data-go="event-create"><div class="r-icon">${icon('image')}</div><div class="r-body"><div class="r-title">Piquenique no parque</div><div class="r-sub">Ao ar livre · leve</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row" data-go="event-create"><div class="r-icon">${icon('star')}</div><div class="r-body"><div class="r-title">Noite de jogos em casa</div><div class="r-sub">Em casa · orçamento zero</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row" data-go="event-create"><div class="r-icon">${icon('heart')}</div><div class="r-body"><div class="r-title">Reviver o primeiro encontro</div><div class="r-sub">Nostalgia</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
      </div>
      <div class="section-title">Meta de frequência</div>
      <div class="card">
        <div class="r-title mb-sm">Quantos dates por mês?</div>
        <div class="chip-row">
          <div class="chip">1</div><div class="chip on">2</div><div class="chip">3</div><div class="chip">4+</div>
        </div>
      </div>
    </div>`
});
