(function () {
  'use strict';

  // Footer year
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Mobile menu
  var toggle = document.querySelector('.nav-toggle');
  var list = document.getElementById('site-nav');
  if (toggle && list) {
    var setOpen = function (open) {
      list.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    list.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  // Tools strip: drifts left to right on its own; the visitor can scroll it by hand at any time
  var marquee = document.querySelector('.marquee');
  if (marquee) {
    var inner = marquee.querySelector('.marquee-inner');
    var track = marquee.querySelector('.marquee-track');
    var pauseBtn = marquee.querySelector('.marquee-pause');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var viewport = marquee.querySelector('.marquee-viewport');
    var manualPause = false;
    if (inner && track && viewport && !reduce) {
      var copy = track.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.setAttribute('inert', '');
      inner.appendChild(copy);

      // The strip drifts left-to-right by itself, and the visitor can take over at any time
      // (scrollbar, swipe, mouse wheel, arrow keys). It pauses while they do, then carries on.
      var pos = 0, last = 0, lastSet = null, idleUntil = 0, hovering = false, started = false;
      var SPEED = 45; // pixels per second
      var half = function () { return inner.scrollWidth / 2; };
      var touch = function () { idleUntil = performance.now() + 3000; };
      viewport.addEventListener('scroll', function () {
        // a scroll we didn't make ourselves = the visitor is moving it
        if (lastSet === null || Math.abs(viewport.scrollLeft - lastSet) > 2) { touch(); pos = viewport.scrollLeft; }
      }, { passive: true });
      ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (ev) { viewport.addEventListener(ev, touch, { passive: true }); });
      viewport.addEventListener('pointerenter', function (e) { hovering = e.pointerType === 'mouse'; });
      viewport.addEventListener('pointerleave', function () { hovering = false; });
      var tick = function (now) {
        var dt = Math.min((now - last) / 1000, 0.1); last = now;
        var h = half();
        if (h > 0) {
          if (!started) { pos = h; started = true; viewport.scrollLeft = pos; lastSet = viewport.scrollLeft; }
          if (!manualPause && !hovering && now > idleUntil && !document.hidden) {
            pos -= SPEED * dt;
            if (pos <= 0) pos += h; // the second copy is identical, so this jump is invisible
            viewport.scrollLeft = pos;
            lastSet = viewport.scrollLeft;
          }
        }
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(function (t) { last = t; tick(t); });
    }
    if (pauseBtn) {
      if (reduce) {
        pauseBtn.hidden = true;
      } else {
        pauseBtn.addEventListener('click', function () {
          manualPause = !manualPause;
          marquee.classList.toggle('is-paused', manualPause);
          pauseBtn.setAttribute('aria-pressed', String(manualPause));
          pauseBtn.textContent = manualPause ? 'Resume scrolling' : 'Pause scrolling';
        });
      }
    }
  }

  // Gentle reveal on scroll (CSS keeps everything visible if this doesn't run)
  var items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  items.forEach(function (el) { io.observe(el); });
})();
