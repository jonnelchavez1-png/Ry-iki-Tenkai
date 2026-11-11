/*
  Infinite randomized photo grid.
  Markup:  <div class="photo-grid" data-photo-grid data-src="/assets/photo-grid/photos.json"></div>
  Options (data attributes, all optional):
    data-src    URL of a JSON list: [{ "src": "/assets/photo-grid/photo-01.webp", "alt": "optional" }, ...]
    data-cells  number of cells (default 12; keep it a multiple of 12 so every row is full at 6, 4 and 3 columns)
    data-min    shortest time a cell waits before switching, in ms (default 450)
    data-max    longest time a cell waits before switching, in ms (default 900)
  Crossfade length is the CSS variable --pg-fade in css/photo-grid.css. Keep it shorter than data-min.
  Each cell owns two stacked <img> layers. The next picture is preloaded and decoded on the hidden layer,
  then faded in over the visible one, so a cell is never blank. Cells run on their own timers.
  The grid pauses while off screen, in a background tab, or when the visitor prefers reduced motion.
*/
(function () {
  'use strict';

  var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  function rand(min, max) { return min + Math.random() * (max - min); }
  function noop() {}

  // Cinematic montage: every few seconds one photo is spotlighted on a large floating card, with a light streak.
  var HERO_HOLD = 2300;                // ms a spotlight stays up
  var HERO_GAP = [900, 1500];          // ms between spotlights (min, max)

  function mount(el) {
    var cellCount = parseInt(el.getAttribute('data-cells'), 10) || 12;
    var minMs = parseInt(el.getAttribute('data-min'), 10) || 450;
    var maxMs = Math.max(minMs, parseInt(el.getAttribute('data-max'), 10) || 900);
    var manifest = el.getAttribute('data-src');
    if (!manifest) return null;

    var heroOn = el.getAttribute('data-hero') !== 'off';   // data-hero="off" turns the spotlight cards off
    var photos = [];          // [{ src, alt, lg (optional larger file for the spotlight), focus (optional, e.g. "50% 30%") }]
    var hero = null, heroImg = null, streak = null, heroTimer = null, heroPhoto = null, heroSide = 0, heroGen = 0, heroRun = false;
    var ro = null;
    var cells = [];
    var shown = {};           // src -> true while displayed in, or reserved by, any cell
    var cache = {};           // src -> Image (decoded and kept so repeats cost no request)
    var bad = {};             // src -> true if it failed to load
    var started = false, destroyed = false;
    var inView = false;
    var io = null;

    function reduced() { return !!(reduceQuery && reduceQuery.matches); }
    function running() { return started && !destroyed && inView && !document.hidden && !reduced(); }

    function load(src) {
      if (cache[src]) return cache[src].promise;
      var img = new Image();
      var entry = { img: img };
      entry.promise = new Promise(function (resolve) {
        img.onload = function () { resolve(true); };
        img.onerror = function () { bad[src] = true; resolve(false); };
      });
      cache[src] = entry;
      img.decoding = 'async';
      img.src = src;
      return entry.promise;
    }

    // random photo that is not on screen, not reserved by another cell, and not this cell's last one
    function pick(cell) {
      var pool = [], i;
      for (i = 0; i < photos.length; i++) {
        var s = photos[i].src;
        if (!bad[s] && !shown[s] && s !== cell.last) pool.push(photos[i]);
      }
      if (!pool.length) {
        for (i = 0; i < photos.length; i++) {
          if (!bad[photos[i].src] && photos[i].src !== cell.current) pool.push(photos[i]);
        }
      }
      return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    }

    function release(src) { if (src) delete shown[src]; }

    function prepareNext(cell, tries) {
      var p = pick(cell);
      if (!p) { cell.next = null; return; }
      cell.next = p; cell.ready = false;
      shown[p.src] = true;
      load(p.src).then(function (ok) {
        if (destroyed || cell.next !== p) return;
        if (ok) { cell.ready = true; return; }
        release(p.src); cell.next = null;
        if ((tries || 0) < 5) prepareNext(cell, (tries || 0) + 1);
      });
    }

    function show(cell, photo, animate, done) {
      var inc = cell.layers[1 - cell.top];
      var out = cell.layers[cell.top];
      inc.className = 'pg-img is-enter';
      inc.alt = photo.alt || '';
      inc.style.objectPosition = photo.focus || '';   // keeps faces in view when the photo is cropped
      inc.src = photo.src;
      var ready = inc.decode ? inc.decode().catch(noop) : Promise.resolve();
      ready.then(function () {
        if (destroyed) return;
        void inc.offsetWidth; // commit opacity:0 so the fade actually runs
        inc.className = 'pg-img is-front' + (animate ? '' : ' no-fade');
        if (out.getAttribute('src')) out.className = 'pg-img is-back';
        cell.top = 1 - cell.top;
        if (done) done();
      });
    }

    function schedule(cell) {
      clearTimeout(cell.timer);
      cell.timer = setTimeout(function () { tick(cell); }, rand(minMs, maxMs));
    }

    function tick(cell) {
      cell.timer = null;
      if (!running()) return;
      if (!cell.next || !cell.ready) {          // nothing preloaded yet: try again shortly
        if (!cell.next) prepareNext(cell);
        cell.timer = setTimeout(function () { tick(cell); }, 120);
        return;
      }
      var photo = cell.next;
      var old = cell.current;
      cell.next = null; cell.ready = false;
      cell.last = old; cell.current = photo.src;
      show(cell, photo, true);
      release(old);
      prepareNext(cell);
      schedule(cell);
    }

    function startTimers() {
      for (var i = 0; i < cells.length; i++) schedule(cells[i]);
    }
    function stopTimers() {
      for (var i = 0; i < cells.length; i++) { clearTimeout(cells[i].timer); cells[i].timer = null; }
    }
    /* ---- spotlight card: a photo shown whole on a large tilted card, then it settles back ---- */
    function heroUrl(p) { return p.lg && !bad[p.lg] ? p.lg : p.src; }
    function pickHero() {
      var pool = [], i;
      for (i = 0; i < photos.length; i++) if (!bad[photos[i].src] && !shown[photos[i].src]) pool.push(photos[i]);
      return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    }
    function heroStop() {
      heroGen++; heroRun = false;
      clearTimeout(heroTimer); heroTimer = null;
      if (hero) { hero.classList.remove('is-on'); el.classList.remove('is-spot'); }
      if (heroPhoto) { release(heroPhoto.src); heroPhoto = null; }
    }
    function heroStart() {
      if (heroRun || !hero) return;
      heroRun = true;
      var g = ++heroGen;
      heroTimer = setTimeout(function () { heroNext(g); }, 800);
    }
    function heroNext(g) {
      if (g !== heroGen) return;
      var p = pickHero();
      if (!p) { heroTimer = setTimeout(function () { heroNext(g); }, 1000); return; }
      shown[p.src] = true;                         // no cell shows this photo while it is spotlighted
      var url = heroUrl(p);
      load(url).then(function (ok) {
        if (g !== heroGen) { release(p.src); return; }
        if (!ok) { release(p.src); heroTimer = setTimeout(function () { heroNext(g); }, 300); return; }
        heroPhoto = p; heroSide = 1 - heroSide;
        hero.className = 'pg-hero ' + (heroSide ? 'is-right' : 'is-left');
        heroImg.src = url;
        var ready = heroImg.decode ? heroImg.decode().catch(noop) : Promise.resolve();
        ready.then(function () {
          if (g !== heroGen) return;               // paused meanwhile; heroStop already released the photo
          var cs = getComputedStyle(el);           // card fits the photo's own shape, so nothing is cropped or letterboxed
          var ar = (heroImg.naturalWidth || 4) / (heroImg.naturalHeight || 3);
          var w = Math.min(el.clientWidth * (parseFloat(cs.getPropertyValue('--pg-hero-w')) || 0.46),
                           el.clientHeight * (parseFloat(cs.getPropertyValue('--pg-hero-h')) || 0.88) * ar);
          hero.style.width = w.toFixed(0) + 'px'; hero.style.height = (w / ar).toFixed(0) + 'px';
          void hero.offsetWidth;
          hero.classList.add('is-on'); el.classList.add('is-spot');
          streak.classList.remove('is-go'); void streak.offsetWidth; streak.classList.add('is-go');
          heroTimer = setTimeout(function () {
            if (g !== heroGen) return;
            hero.classList.remove('is-on'); el.classList.remove('is-spot');
            release(p.src); heroPhoto = null;
            heroTimer = setTimeout(function () { heroNext(g); }, rand(HERO_GAP[0], HERO_GAP[1]));
          }, HERO_HOLD);
        });
      });
    }

    /* ---- depth: outer columns turn slightly inward, so the grid reads like floating panels ---- */
    function tilt() {
      var cols = getComputedStyle(el).gridTemplateColumns.split(' ').length || 1;
      var rows = Math.ceil(cells.length / cols), spread = cols > 3 ? 13 : 9;
      cells.forEach(function (c, i) {
        var t = cols > 1 ? ((i % cols) / (cols - 1)) * 2 - 1 : 0;
        var u = rows > 1 ? (Math.floor(i / cols) / (rows - 1)) * 2 - 1 : 0;
        c.el.style.setProperty('--pg-ry', (-t * spread).toFixed(1) + 'deg');
        c.el.style.setProperty('--pg-rx', (u * 3).toFixed(1) + 'deg');
        c.el.style.setProperty('--pg-tz', ((1 - Math.abs(t)) * 24).toFixed(0) + 'px');
        c.el.style.setProperty('--pg-rz', c.rz.toFixed(2) + 'deg');
      });
    }

    function sync() {
      if (running()) { startTimers(); if (heroOn) heroStart(); }
      else { stopTimers(); heroStop(); }
    }

    function build() {
      el.textContent = '';
      var frag = document.createDocumentFragment();
      for (var i = 0; i < cellCount; i++) {
        var div = document.createElement('div');
        div.className = 'pg-cell';
        var a = document.createElement('img'), b = document.createElement('img');
        a.className = b.className = 'pg-img';
        a.alt = b.alt = ''; a.decoding = b.decoding = 'async'; a.draggable = b.draggable = false;
        div.appendChild(a); div.appendChild(b);
        frag.appendChild(div);
        cells.push({ el: div, layers: [a, b], top: 1, current: null, last: null, next: null, ready: false, timer: null, rz: rand(-1.1, 1.1) });
      }
      el.appendChild(frag);
      if (heroOn) {                // spotlight card and light streak sit on top of the grid (absolutely positioned)
        streak = document.createElement('div'); streak.className = 'pg-streak'; streak.setAttribute('aria-hidden', 'true');
        hero = document.createElement('div'); hero.className = 'pg-hero'; hero.setAttribute('aria-hidden', 'true');
        heroImg = document.createElement('img'); heroImg.alt = ''; heroImg.decoding = 'async'; heroImg.draggable = false;
        hero.appendChild(heroImg);
        el.appendChild(streak); el.appendChild(hero);
      }
      tilt();
    }

    function begin() {
      if (started || destroyed) return;
      started = true;
      // first picture for every cell: all different where there are enough photos
      cells.forEach(function (cell) {
        var p = pick(cell);
        if (!p) return;
        cell.current = p.src; shown[p.src] = true;
        load(p.src).then(function (ok) {
          if (destroyed) return;
          if (!ok) { release(p.src); cell.current = null; var q = pick(cell); if (!q) return; p = q; cell.current = q.src; shown[q.src] = true; load(q.src).then(function () { go(); }); return; }
          go();
        });
        function go() {
          if (destroyed) return;
          show(cell, p, true, function () {
            cell.el.classList.add('is-loaded');
            prepareNext(cell);
          });
        }
      });
      sync();
    }

    function onVisibility() { sync(); }
    function onMotion() { sync(); }

    function init(list) {
      photos = list.filter(function (p) { return p && typeof p.src === 'string'; });
      if (photos.length < 2) return;
      build();                    // empty cells reserve the space; photos load when the grid is near the viewport
      if ('ResizeObserver' in window) { ro = new ResizeObserver(tilt); ro.observe(el); }
      else window.addEventListener('resize', tilt);
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(function (entries) {
          inView = entries[entries.length - 1].isIntersecting;
          if (inView) begin();      // photos are only requested once the grid is near the viewport
          sync();
        }, { rootMargin: '200px 0px' });
        io.observe(el);
      } else {
        inView = true; begin();
      }
      document.addEventListener('visibilitychange', onVisibility);
      if (reduceQuery) {
        if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onMotion);
        else if (reduceQuery.addListener) reduceQuery.addListener(onMotion);
      }
    }

    fetch(manifest, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(init)
      .catch(function () { /* no manifest: leave the grid empty */ });

    return {
      destroy: function () {
        destroyed = true; stopTimers(); heroStop();
        if (io) io.disconnect();
        if (ro) ro.disconnect(); else window.removeEventListener('resize', tilt);
        document.removeEventListener('visibilitychange', onVisibility);
        if (reduceQuery) {
          if (reduceQuery.removeEventListener) reduceQuery.removeEventListener('change', onMotion);
          else if (reduceQuery.removeListener) reduceQuery.removeListener(onMotion);
        }
        cache = {}; shown = {};
        el.textContent = '';
      }
    };
  }

  window.PhotoGrid = { mount: mount };
  var nodes = document.querySelectorAll('[data-photo-grid]');
  for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
})();
