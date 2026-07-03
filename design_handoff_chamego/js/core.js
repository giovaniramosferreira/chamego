/* ============================================================
   Chamego App — núcleo: ícones, helpers de render, roteador
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- ícones (line icons, 24x24 viewBox) ---------------- */
  const ICONS = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.4"/><circle cx="3.5" cy="12" r="1.4"/><circle cx="3.5" cy="18" r="1.4"/>',
    moments: '<rect x="3" y="4" width="18" height="15" rx="2"/><circle cx="8.5" cy="10" r="1.7"/><path d="M21 16l-5-5-6 6-2-2-4 4"/>',
    together: '<circle cx="9" cy="9" r="3.2"/><circle cx="16" cy="10.5" r="2.6"/><path d="M3.5 19c.6-3 2.6-4.6 5.5-4.6s4.9 1.6 5.5 4.6M14.5 19c.4-2 1.6-3.4 3.2-3.9"/>',
    back: '<path d="M15 5l-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/>',
    close: '<path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/>',
    bell: '<path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
    plus: '<path d="M12 5v14M5 12h14" stroke-linecap="round"/>',
    check: '<path d="M4 12l5 5L20 6" stroke-linecap="round" stroke-linejoin="round"/>',
    chevronR: '<path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/>',
    heart: '<path d="M12 20s-7-4.4-9.4-8.7C1 8 2.6 5 5.6 5c1.9 0 3.2 1.1 4 2.3.8-1.2 2.1-2.3 4-2.3 3 0 4.6 3 3 6.3C19 15.6 12 20 12 20z"/>',
    image: '<rect x="3" y="4" width="18" height="15" rx="2"/><circle cx="8.5" cy="10" r="1.7"/><path d="M21 16l-5-5-6 6-2-2-4 4"/>',
    chat: '<path d="M4 5h16v11H9l-4 3.5V16H4z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.5a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.3-.9c.6.5 1.3.9 2 1.2L10 21h4l.6-2.5c.7-.3 1.4-.7 2-1.2l2.3.9 2-3.4-2-1.6c.07-.4.1-.8.1-1.2z"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1-4 4-5.8 7.5-5.8s6.5 1.8 7.5 5.8"/>',
    link: '<path d="M9 15l6-6"/><path d="M13 6l1-1a4 4 0 0 1 5.7 5.7l-1.5 1.5"/><path d="M11 18l-1 1A4 4 0 0 1 4.3 13.3l1.5-1.5"/>',
    whatsapp: '<path d="M6 18l-2 1 .6-2.4A7.5 7.5 0 1 1 9.5 19a7.4 7.4 0 0 1-3.5-.9z"/><path d="M8.7 8.7c0 3.6 2.9 6.4 6.4 6.6" opacity="0"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 6.5l9 6 9-6"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    camera: '<path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13.5" r="3.4"/>',
    edit: '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/>',
    trash: '<path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8" stroke-linecap="round"/>',
    star: '<path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.9l-5.6 3.1 1.4-6.2L3 9.5l6.4-.6z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3z"/>',
    shield: '<path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z"/>',
    gift: '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 9V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v3M12 4a2.4 2.4 0 0 0-4.2 1.6L12 9m0-5a2.4 2.4 0 0 1 4.2 1.6L12 9m0-5v17M3 9h18"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    send: '<path d="M4 12l16-8-6 16-2.5-6.5L4 12z"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>',
    logout: '<path d="M15 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h9M10 12h11m0 0-4-4m4 4-4 4"/>',
    repeat: '<path d="M4 7h13l-3-3m3 3-3 3M20 17H7l3 3m-3-3 3-3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    filter: '<path d="M4 5h16M7 12h10M10 19h4"/>',
    shopping: '<path d="M6 8h12l-1 12H7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    pin: '<path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>',
    apple: '<path d="M16.1 3c0 1-.4 2-1.1 2.7-.7.8-1.9 1.4-3 1.3-.1-1 .4-2 1-2.7.8-.8 2-1.4 3.1-1.3zM19.7 17.2c-.5 1.1-.7 1.6-1.4 2.6-.9 1.4-2.2 3.1-3.8 3.1-1.4 0-1.8-.9-3.7-.9-1.9 0-2.4.9-3.7.9-1.6 0-2.8-1.6-3.7-3-2.6-3.9-2.9-8.5-1.3-10.9 1.1-1.7 2.9-2.7 4.6-2.7 1.7 0 2.8 1 4.2 1 1.3 0 2.2-1 4.2-1 1.5 0 3.1.8 4.2 2.2-3.7 2-3.1 7.2.4 8.7z"/>',
    google: '<path d="M21 12.2c0-.7-.1-1.4-.2-2H12v3.9h5c-.2 1.2-.9 2.1-1.9 2.8v2.3h3.1c1.8-1.7 2.8-4.1 2.8-7z"/><path d="M12 21c2.4 0 4.5-.8 6-2.2l-3.1-2.3c-.8.6-1.9.9-2.9.9-2.3 0-4.2-1.5-4.9-3.6H3.9v2.3A9 9 0 0 0 12 21z"/><path d="M7.1 13.8a5.4 5.4 0 0 1 0-3.6V7.9H3.9a9 9 0 0 0 0 8.2z"/><path d="M12 6.6c1.3 0 2.5.5 3.4 1.3l2.5-2.5A8.7 8.7 0 0 0 12 3a9 9 0 0 0-8.1 4.9l3.2 2.3c.7-2.1 2.6-3.6 4.9-3.6z"/>',
  };
  function icon(name, size, extra) {
    size = size || 20;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ${extra||''}>${ICONS[name]||''}</svg>`;
  }
  window.icon = icon;

  /* ---------------- registro de telas ---------------- */
  const Screens = Object.create(null);
  function register(id, def) { Screens[id] = Object.assign({ id }, def); }
  window.Screens = Screens;
  window.registerScreen = register;

  /* ---------------- estado global de navegação ---------------- */
  const state = {
    stack: ['splash'],
    tab: null,
    data: {}, // dados voláteis do protótipo (estados alternáveis etc.)
  };
  window.appState = state;

  const viewport = () => document.getElementById('screen-viewport');
  const tabbarEl = () => document.getElementById('tab-bar');

  const TABS = [
    { id: 'home', label: 'Início', icon: 'home' },
    { id: 'agenda', label: 'Agenda', icon: 'calendar' },
    { id: 'listas', label: 'Listas', icon: 'list' },
    { id: 'momentos', label: 'Momentos', icon: 'moments' },
    { id: 'voces', label: 'Vocês', icon: 'together' },
  ];

  function renderTabBar() {
    const activeTab = Screens[current()] ? Screens[current()].tab : null;
    tabbarEl().innerHTML = TABS.map(t => `
      <div class="tab-item ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">
        ${icon(t.icon, 22)}
        <span>${t.label}</span>
      </div>
    `).join('');
  }

  function current() { return state.stack[state.stack.length - 1]; }

  function header(opts) {
    opts = opts || {};
    const left = opts.back
      ? `<div class="icon-btn" data-back>${icon('back', 18)}</div>`
      : (opts.close ? `<div class="icon-btn" data-close>${icon('close', 16)}</div>` : '');
    const rightHtml = (opts.actions || []).map(a =>
      `<div class="icon-btn" ${a.go ? `data-go="${a.go}"` : ''} ${a.attr||''}>${icon(a.icon, 17)}</div>`
    ).join('');
    return `
      <div class="app-header">
        ${left}
        <div class="h-title">${opts.title || ''}</div>
        <div class="h-actions">${rightHtml}</div>
      </div>`;
  }
  window.appHeader = header;

  function bigHeader(opts) {
    opts = opts || {};
    return `
      <div class="big-header">
        <div class="top-row">
          <div class="wordmark">chamego<span class="dot">.</span></div>
          <div style="display:flex;gap:8px;align-items:center">
            <div class="icon-btn" data-go="chat">${icon('chat', 16)}</div>
            <div class="icon-btn" data-go="config-hub">${icon('bell', 16)}</div>
            <div class="avatar" data-go="config-hub">${opts.initials || 'M'}</div>
          </div>
        </div>
        ${opts.title ? `<h1>${opts.title}</h1>` : ''}
        ${opts.sub ? `<p class="sub">${opts.sub}</p>` : ''}
      </div>`;
  }
  window.bigHeader = bigHeader;

  function stateSwitch(key, options, current) {
    return `<div class="state-switch" data-statekey="${key}">
      ${options.map(o => `<button class="${o===current?'on':''}" data-setstate="${key}:${o}">${o}</button>`).join('')}
    </div>`;
  }
  window.stateSwitch = stateSwitch;

  /* ---------------- render ---------------- */
  function render() {
    const id = current();
    const def = Screens[id];
    if (!def) { console.warn('Tela não encontrada:', id); return; }
    let el = viewport().querySelector(`[data-screen-el="${id}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'screen' + (def.hideTabs ? ' no-tabbar' : '');
      el.setAttribute('data-screen-el', id);
      el.setAttribute('data-screen-label', def.label || id);
      el.innerHTML = def.render(state.data[id] || {});
      viewport().appendChild(el);
      if (def.mount) def.mount(el, state.data[id] || {});
    } else if (def.refresh) {
      el.innerHTML = def.render(state.data[id] || {});
      if (def.mount) def.mount(el, state.data[id] || {});
    }
    viewport().querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    el.scrollTop = 0;
    const scrollEl = el.querySelector('.screen-scroll');
    if (scrollEl) scrollEl.scrollTop = 0;

    tabbarEl().classList.toggle('hidden', !!def.hideTabs);
    renderTabBar();
  }

  function navigate(id, opts) {
    opts = opts || {};
    if (opts.replaceStack) state.stack = [id];
    else state.stack.push(id);
    if (Screens[id] && Screens[id].refresh === undefined) Screens[id].refresh = !!opts.forceRefresh;
    if (opts.forceRefresh && Screens[id]) {
      const el = viewport().querySelector(`[data-screen-el="${id}"]`);
      if (el) el.remove();
    }
    render();
  }
  function goBack() {
    if (state.stack.length > 1) state.stack.pop();
    render();
  }
  function goTab(tabId) {
    state.stack = [tabId + '-root'];
    render();
  }
  window.go = navigate;
  window.goBack = goBack;
  window.goTab = goTab;

  function setState(key, value, screenId) {
    state.data[screenId] = state.data[screenId] || {};
    state.data[screenId][key] = value;
    const el = viewport().querySelector(`[data-screen-el="${screenId}"]`);
    if (el && Screens[screenId]) {
      el.innerHTML = Screens[screenId].render(state.data[screenId]);
      if (Screens[screenId].mount) Screens[screenId].mount(el, state.data[screenId]);
    }
  }
  window.setScreenState = setState;

  /* ---------------- delegação global de eventos ---------------- */
  document.addEventListener('click', function (e) {
    const goEl = e.target.closest('[data-go]');
    const backEl = e.target.closest('[data-back]');
    const closeEl = e.target.closest('[data-close]');
    const tabEl = e.target.closest('[data-tab]');
    const setEl = e.target.closest('[data-setstate]');
    const toggleEl = e.target.closest('[data-toggle]');

    if (setEl) {
      const screenEl = setEl.closest('.screen');
      const screenId = screenEl && screenEl.getAttribute('data-screen-el');
      const [key, value] = setEl.getAttribute('data-setstate').split(':');
      setState(key, value, screenId);
      return;
    }
    if (toggleEl) {
      const t = toggleEl.getAttribute('data-toggle');
      toggleEl.classList.toggle('on');
      const target = document.getElementById(t);
      if (target) target.classList.toggle('checked');
      return;
    }
    if (goEl) { navigate(goEl.getAttribute('data-go'), { forceRefresh: goEl.hasAttribute('data-fresh') }); return; }
    if (backEl) { goBack(); return; }
    if (closeEl) { goBack(); return; }
    if (tabEl) { goTab(tabEl.getAttribute('data-tab')); return; }
  });

  window.addEventListener('DOMContentLoaded', function () {
    render();
  });
})();
