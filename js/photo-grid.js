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

  function mount(el) {
    var cellCount = parseInt(el.getAttribute('data-cells'), 10) || 12;
    var minMs = parseInt(el.getAttribute('data-min'), 10) || 450;
    var maxMs = Math.max(minMs, parseInt(el.getAttribute('data-max'), 10) || 900);
    var manifest = el.getAttribute('data-src');
    if (!manifest) return null;

    var photos = [];          // [{ src, alt }]
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
    function sync() { if (running()) startTimers(); else stopTimers(); }

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
        cells.push({ el: div, layers: [a, b], top: 1, current: null, last: null, next: null, ready: false, timer: null });
      }
      el.appendChild(frag);
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
        destroyed = true; stopTimers();
        if (io) io.disconnect();
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
