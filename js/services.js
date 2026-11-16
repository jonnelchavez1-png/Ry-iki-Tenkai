/* Services section: reveal, diagram replay, "More detail" toggles. Plain ES5. */
(function () {
  'use strict';
  var section = document.getElementById('services');
  if (!section) return;
  var cards = [].slice.call(section.querySelectorAll('.hs-card'));
  if (!cards.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  section.classList.add('hs-on');

  function show(c) { c.classList.add('hs-in', 'hs-play'); }
  if (reduce || !('IntersectionObserver' in window)) {
    cards.forEach(show);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var c = e.target;
        setTimeout(function () { show(c); }, Math.min(cards.indexOf(c) % 3, 2) * 90);
        io.unobserve(c);
      });
    }, { threshold: 0.2 });
    cards.forEach(function (c) { io.observe(c); });
  }

  function replay(c) {
    c.classList.remove('hs-play');
    void c.offsetWidth;
    setTimeout(function () { c.classList.add('hs-play'); }, 60);
  }

  cards.forEach(function (c) {
    var art = c.querySelector('.hs-art');
    if (art && !reduce) {
      art.addEventListener('mouseenter', function () {
        if (c.classList.contains('hs-in')) replay(c);
      });
    }
    var btn = c.querySelector('.hs-more');
    var det = c.querySelector('.hs-detail');
    if (!btn || !det) return;
    btn.addEventListener('click', function () {
      var open = det.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.firstElementChild.textContent = open ? 'Less detail' : 'More detail';
    });
  });
  /* Equal card size: every card except the wide one gets the height of the tallest closed card.
     Cards are measured with no min-height; the detail panel's current height is subtracted, so open or still-animating panels don't count. */
  var grid = section.querySelector('.hs-grid');
  var normal = cards.filter(function (c) { return !c.classList.contains('hs-wide'); });
  function equalize() {
    if (!grid) return;
    normal.forEach(function (c) { c.style.minHeight = ''; });
    var cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    if (cols < 2) return;
    var tallest = 0;
    normal.forEach(function (c) {
      var det = c.querySelector('.hs-detail');
      var h = c.offsetHeight - (det ? det.offsetHeight : 0);
      if (h > tallest) tallest = h;
    });
    normal.forEach(function (c) { c.style.minHeight = tallest + 'px'; });
  }
  var rt;
  function later() { clearTimeout(rt); rt = setTimeout(equalize, 120); }
  equalize();
  window.addEventListener('resize', later);
  window.addEventListener('load', equalize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(equalize);
})();
