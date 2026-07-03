/* ============================================================
   Chamego App — Vocês (check-in, metas, perguntas, chat)
   ============================================================ */
registerScreen('voces-root', {
  tab: 'voces', refresh: true,
  render: () => `
    <div class="screen-scroll">
      ${bigHeader({ title: 'Vocês' })}
      <div class="card mb-md" data-go="chat" style="display:flex;align-items:center;gap:.9rem">
        <div class="r-icon">${icon('chat',17,'stroke="var(--accent-press)"')}</div>
        <div style="flex:1"><div class="r-title">Chat privado</div><div class="r-sub">João: "Chego às 19h 💛"</div></div>
        <div class="r-chev">${icon('chevronR',14)}</div>
      </div>

      <div class="section-title" style="margin-top:0">Painel de conexão</div>
      <div class="card mb-md">
        <div style="display:flex;justify-content:space-between;text-align:center">
          <div><div style="font-family:var(--font-display);font-size:1.5rem;color:var(--accent)">743</div><div class="muted" style="font-size:.75rem">dias juntos</div></div>
          <div><div style="font-family:var(--font-display);font-size:1.5rem;color:var(--accent)">12</div><div class="muted" style="font-size:.75rem">check-ins seguidos</div></div>
          <div><div style="font-family:var(--font-display);font-size:1.5rem;color:var(--accent)">3</div><div class="muted" style="font-size:.75rem">metas ativas</div></div>
        </div>
      </div>

      <div class="row-list mb-md">
        <div class="row" data-go="checkin"><div class="r-icon">${icon('heart')}</div><div class="r-body"><div class="r-title">Check-in de hoje</div><div class="r-sub">Como você está?</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row" data-go="metas"><div class="r-icon">${icon('target')}</div><div class="r-body"><div class="r-title">Metas do casal</div><div class="r-sub">3 em andamento</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row" data-go="perguntas"><div class="r-icon">${icon('chat')}</div><div class="r-body"><div class="r-title">Pergunta guiada do dia</div><div class="r-sub">Uma nova toda semana</div></div><div class="r-chev">${icon('chevronR',14)}</div></div>
        <div class="row locked" data-go="paywall"><div class="lock-badge">${icon('lock',13,'stroke="#fff"')}</div><div class="r-icon">${icon('gift')}</div><div class="r-body"><div class="r-title">Packs de conexão</div><div class="r-sub">Dinâmicas premium</div></div></div>
      </div>
    </div>`
});

registerScreen('checkin', {
  hideTabs: true, refresh: true,
  render: (d) => `
    <div class="screen-scroll">
      ${appHeader({ back: true, title: 'Como você está?' })}
      <p class="muted mb-md">Um check-in rápido, só pra registrar o seu dia.</p>
      <div class="mood-row">
        ${['😞','😕','😐','🙂','😄'].map((m,i)=>`<div class="mood-opt ${d.mood==i?'sel':''}" data-setstate="mood:${i}">${m}</div>`).join('')}
      </div>
      <div class="field"><label>Quer contar mais alguma coisa?</label><textarea placeholder="Opcional"></textarea></div>
      <button class="btn btn-primary btn-block mb-lg" data-go="voces-root" data-fresh>Salvar check-in</button>

      <div class="section-title" style="margin-top:0">Como está a semana de vocês</div>
      <div class="card">
        <div style="display:flex;gap:6px;justify-content:space-between">
          ${['S','T','Q','Q','S','S','D'].map((n,i)=>`
            <div style="text-align:center;flex:1">
              <div style="font-size:1.1rem">${['🙂','😄','😐','🙂','😄','😊','—'][i]}</div>
              <div class="muted" style="font-size:.68rem;margin-top:2px">${n}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>`
});

registerScreen('metas', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll" style="position:relative">
      ${appHeader({ back: true, title: 'Metas do casal' })}
      <div class="row-list mb-lg">
        <div class="row"><div class="r-icon">${icon('target')}</div><div class="r-body"><div class="r-title">Economizar pra viagem</div><div class="r-sub">R$ 2.400 de R$ 5.000</div></div></div>
        <div class="row"><div class="r-icon">${icon('heart')}</div><div class="r-body"><div class="r-title">Um date por semana</div><div class="r-sub">Meta ativa · 4 semanas seguidas</div></div></div>
        <div class="row"><div class="r-icon">${icon('home')}</div><div class="r-body"><div class="r-title">Organizar o apê até dezembro</div><div class="r-sub">2 de 6 etapas concluídas</div></div></div>
      </div>
      <div class="fab" data-go="metas">${icon('plus',24,'stroke="#fff"')}</div>
    </div>`
});

registerScreen('perguntas', {
  hideTabs: true,
  render: () => `
    <div class="screen-scroll">
      ${appHeader({ back: true, title: 'Pergunta da semana' })}
      <div class="card mb-lg" style="text-align:center;padding:2rem 1.4rem">
        <p style="font-family:var(--font-display);font-style:italic;font-size:1.35rem;color:var(--ink)">"Qual foi o momento em que você se sentiu mais cuidado(a) por mim este mês?"</p>
      </div>
      <div class="field"><label>Sua resposta</label><textarea placeholder="Escreva com calma..."></textarea></div>
      <button class="btn btn-primary btn-block mb-lg">Enviar resposta</button>
      <div class="section-title" style="margin-top:0">Resposta do João</div>
      <div class="card">"Quando você ficou até tarde me ajudando com a apresentação. Não esqueço."</div>
    </div>`
});

registerScreen('chat', {
  hideTabs: true,
  render: () => `
    <div style="display:flex;flex-direction:column;height:100%">
      ${appHeader({ back: true, title: 'João', actions:[{icon:'search'}] })}
      <div class="screen-scroll" style="flex:1;padding-top:6px">
        <div class="bubble them">Chego às 19h, separa o vinho 🍷</div>
        <div class="bubble-time">14:02</div>
        <div class="bubble me">Combinado! Já coloquei na geladeira 😄</div>
        <div class="bubble-time">14:05</div>
        <div class="bubble them">Vi que você adicionou a lista de compras, obrigado 💛</div>
        <div class="bubble-time">14:06</div>
        <div class="chip" style="margin:.4rem 0">📌 Mensagem fixada: "Consulta médica sexta 9h"</div>
        <div class="bubble me">Vou levar o bolo também</div>
        <div class="bubble-time">Agora</div>
      </div>
      <div class="chat-input">
        <div class="icon-btn">${icon('camera',16)}</div>
        <input type="text" placeholder="Mensagem..."/>
        <div class="send">${icon('send',16,'stroke="#fff"')}</div>
      </div>
    </div>`
});
