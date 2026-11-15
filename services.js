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
})();
