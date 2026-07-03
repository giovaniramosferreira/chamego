/* ============================================================
   Chamego App — Momentos
   ============================================================ */
registerScreen('momentos-root', {
  tab: 'momentos', refresh: true,
  render: (d) => {
    const st = d.est || 'conteudo';
    if (st === 'vazio') {
      return `<div class="screen-scroll">
        ${bigHeader({ title: 'Momentos' })}
        <div style="padding-bottom:6px">${stateSwitch('est', ['vazio','conteudo'], st)}</div>
        <div class="empty-state">
          <div class="e-icon">${icon('image',26)}</div>
          <h3>A linha do tempo está vazia</h3>
          <p>Registre uma foto, uma nota ou um momento especial para começar a guardar a história de vocês.</p>
          <button class="btn btn-primary" style="margin-top:.6rem" data-go="moment-add">Adicionar primeiro momento</button>
        </div>
      </div>`;
    }
    return `<div class="screen-scroll" style="position:relative">
      ${bigHeader({ title: 'Momentos' })}
      <div style="padding-bottom:6px">${stateSwitch('est', ['vazio','conteudo'], st)}</div>
      <div class="chip-row mb-md">
        <div class="chip on">Timeline</div><div class="chip" data-go="diario">Diário a dois</div><div class="chip">${icon('search',12)} Buscar</div>
      </div>

      <div class="timeline-item">
        <div class="t-rail"></div>
        <div class="t-body" data-go="moment-detail">
          <div class="t-date">Hoje</div>
          <div class="t-text">Café da manhã na varanda, do jeitinho que a gente gosta ☕</div>
          <img src="images/janela.png" alt=""/>
        </div>
      </div>
      <div class="timeline-item">
        <div class="t-rail"></div>
        <div class="t-body" data-go="moment-detail">
          <div class="t-date">28 de junho</div>
          <div class="t-text">Show que a gente esperava há meses. Perfeito.</div>
          <div class="photo-grid">
            <div><img src="images/encontro.png" alt=""/></div>
            <div><img src="images/abraco.png" alt=""/></div>
            <div><img src="images/onibus.png" alt=""/></div>
          </div>
        </div>
      </div>
      <div class="timeline-item">
        <div class="t-rail"></div>
        <div class="t-body">
          <div class="t-date">22 de junho · marco</div>
          <div class="t-text">2 anos juntos. Escrevemos uma cartinha um pro outro 💛</div>
        </div>
      </div>
      <div class="fab" data-go="moment-add">${icon('plus',24,'stroke="#fff"')}</div>
    </div>`;
  }
});

registerScreen('moment-detail', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ back: true, actions:[{icon:'edit'}] })}
      <img src="images/janela.png" style="width:100%;border-radius:var(--r-img);margin-bottom:1rem"/>
      <p class="muted mb-sm">Hoje, 08:20 · categoria: dia a dia</p>
      <p style="font-size:1.05rem;margin-bottom:1.2rem">Café da manhã na varanda, do jeitinho que a gente gosta ☕ — um domingo pra guardar.</p>
      <div class="chip-row mb-lg">
        <div class="chip on">😍 4</div><div class="chip">😂 1</div><div class="chip">${icon('heart',12)}</div>
      </div>
      <div class="section-title" style="margin-top:0">Comentários</div>
      <div class="card">
        <div style="font-size:.9rem;margin-bottom:.6rem"><strong>João:</strong> Foi um domingo perfeito 🥰</div>
        <input type="text" placeholder="Comentar..." style="width:100%;padding:.6em .9em;border-radius:99px;background:var(--bg-tint);border:none;font:inherit"/>
      </div>
    </div>`
});

registerScreen('moment-add', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ close: true, title: 'Novo momento' })}
      <div style="border:1.5px dashed var(--line-2);border-radius:var(--r-img);padding:2.2rem 1rem;text-align:center;margin-bottom:1.2rem;color:var(--ink-2)">
        ${icon('camera',26)}
        <p style="margin-top:.6rem;font-size:.9rem">Toque para adicionar fotos</p>
      </div>
      <div class="field"><label>Escreva sobre esse momento</label><textarea placeholder="O que aconteceu?"></textarea></div>
      <div class="field"><label>Categoria</label>
        <div class="chip-row"><div class="chip on">Dia a dia</div><div class="chip">Viagem</div><div class="chip">Marco</div><div class="chip">Data especial</div></div>
      </div>
      <div class="row-list mb-lg">
        <div class="row"><div class="r-icon">${icon('star')}</div><div class="r-body"><div class="r-title">Marcar como favorito</div></div><div class="tgl" data-toggle></div></div>
      </div>
      <button class="btn btn-primary btn-block" data-go="momentos-root" data-fresh>Publicar momento</button>
    </div>`
});

registerScreen('diario', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ back: true, title: 'Diário a dois' })}
      <p class="muted mb-lg">Um espaço para escreverem juntos, sem pressa.</p>
      <div class="card mb-md">
        <div class="r-title mb-sm">1 de julho</div>
        <p style="font-size:.94rem;color:var(--ink-2)">"Hoje percebi como é bom ter alguém pra dividir até os dias bobos. Te amo por isso." — Mari</p>
      </div>
      <div class="card mb-lg">
        <div class="r-title mb-sm">28 de junho</div>
        <p style="font-size:.94rem;color:var(--ink-2)">"Show incrível. Já quero marcar o próximo." — João</p>
      </div>
      <button class="btn btn-primary btn-block">${icon('edit',16)} Escrever no diário</button>
    </div>`
});
