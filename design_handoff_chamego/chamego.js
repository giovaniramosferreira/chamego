// Chamego — interações sutis
(function () {
  'use strict';

  /* ---------- header on scroll ---------- */
  var head = document.querySelector('.site-head');
  var sticky = document.querySelector('.sticky-cta');
  function onScroll() {
    var y = window.scrollY;
    head.classList.toggle('scrolled', y > 24);
    if (sticky) sticky.classList.toggle('show', y > 620);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- typewriter no hero ---------- */
  var typeEl = document.querySelector('.hero-type .txt');
  if (typeEl) {
    var phrases = [
      'do nosso primeiro café.',
      'da distância que virou saudade boa.',
      'de cada bom dia há 743 dias.',
      'do dia em que você disse sim.'
    ];
    var pi = 0, ci = 0, deleting = false;
    function tick() {
      var full = phrases[pi];
      if (!deleting) {
        ci++;
        typeEl.textContent = full.slice(0, ci);
        if (ci === full.length) { deleting = true; return setTimeout(tick, 2100); }
        setTimeout(tick, 52);
      } else {
        ci--;
        typeEl.textContent = full.slice(0, ci);
        if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; return setTimeout(tick, 320); }
        setTimeout(tick, 26);
      }
    }
    setTimeout(tick, 900);
  }

  /* ---------- scroll reveal ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(function (el, i) {
    io.observe(el);
  });

  /* ---------- contador de dias (demo) ---------- */
  var counter = document.querySelector('[data-counter]');
  if (counter) {
    var target = 743, cur = 0, dur = 1400, started = false;
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !started) {
          started = true;
          var t0 = performance.now();
          (function step(now) {
            var p = Math.min((now - t0) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            counter.textContent = Math.round(eased * target);
            if (p < 1) requestAnimationFrame(step);
          })(t0);
        }
      });
    }, { threshold: 0.5 });
    cio.observe(counter);
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    q.addEventListener('click', function () {
      var open = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (o) {
        if (o !== item) { o.classList.remove('open'); o.querySelector('.faq-a').style.maxHeight = null; }
      });
      item.classList.toggle('open', !open);
      a.style.maxHeight = open ? null : a.scrollHeight + 'px';
    });
  });

  /* ---------- smooth anchor + nav fechar ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length > 1) {
        var t = document.querySelector(id);
        if (t) { e.preventDefault(); window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' }); }
      }
    });
  });
})();
