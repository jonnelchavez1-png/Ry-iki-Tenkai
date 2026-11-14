/* Projects carousel (homepage, "More projects").
   Desktop shows four cards in one row with arrows that appear on hover; tablet and phone show fewer cards and
   a swipe. The row is a normal scrolling list (CSS scroll-snap), so swipe, trackpad and keyboard all work.
   Without JavaScript the cards still scroll sideways and every link works. */
(function () {
  'use strict';
  var root = document.querySelector('.pj-more');
  if (!root) return;
  var track = root.querySelector('[data-pj="track"]'), cards = [].slice.call(track.children),
      prevs = [].slice.call(root.querySelectorAll('[data-pj="prev"]')), nexts = [].slice.call(root.querySelectorAll('[data-pj="next"]')),
      count = root.querySelector('[data-pj="count"]'), dots = root.querySelector('[data-pj="dots"]'),
      reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)'), vis = 1, max = 0;
  if (cards.length < 2) return;

  function step() { return cards[1].offsetLeft - cards[0].offsetLeft; }
  function measure() {
    var st = step(), gap = st - cards[0].offsetWidth;
    vis = Math.max(1, Math.round((track.clientWidth + gap) / st));
    max = Math.max(0, cards.length - vis);
    if (dots.children.length !== max + 1) {
      dots.textContent = '';
      for (var i = 0; i <= max; i++) dots.appendChild(document.createElement('i'));
    }
  }
  function index() { return Math.max(0, Math.min(max, Math.round(track.scrollLeft / step()))); }
  function ui() {
    var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4, atStart = track.scrollLeft <= 2,
        i = atEnd ? max : index();
    count.textContent = vis > 1 ? (i + 1) + '–' + (i + vis) + ' of ' + cards.length : (i + 1) + ' / ' + cards.length;
    [].forEach.call(dots.children, function (d, k) { d.className = k === i ? 'on' : ''; });
    prevs.forEach(function (b) { b.disabled = atStart; });
    nexts.forEach(function (b) { b.disabled = atEnd; });
  }
  function go(d) {
    var i = Math.max(0, Math.min(max, index() + d));
    track.scrollTo({ left: i * step(), behavior: reduce && reduce.matches ? 'auto' : 'smooth' });
  }
  prevs.forEach(function (b) { b.addEventListener('click', function () { go(-1); }); });
  nexts.forEach(function (b) { b.addEventListener('click', function () { go(1); }); });
  var ticking = false;
  track.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; ui(); });
  }, { passive: true });
  function all() { measure(); ui(); }
  if ('ResizeObserver' in window) new ResizeObserver(all).observe(track); else window.addEventListener('resize', all);
  all();
})();
