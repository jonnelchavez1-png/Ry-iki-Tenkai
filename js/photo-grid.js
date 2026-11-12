/*
  Floating photo wall.
  Markup:  <div class="photo-grid" data-photo-grid data-src="/assets/photo-grid/photos.json"></div>
  Options (data attributes, all optional):
    data-src    URL of a JSON list: [{ "src": "photo.webp", "lg": "bigger.webp", "full": "viewer.webp", "alt": "optional" }, ...]
                src is used on the wall, full (or lg, or src) in the viewer.
    data-cells  photos floating at once on a wide screen (default 12; tablet shows about 2/3 of it, phone about 1/2)
    data-min    shortest wait between two replacements in ms (default 3000, values under 1500 are ignored)
    data-max    longest wait between two replacements in ms (default 6000)
  How it behaves:
    - Each photo is a card that keeps its own shape (never cropped) and floats on its own CSS animation
      (different speed, drift, tilt and zoom). Depth comes from three layers: far (small, soft), middle, near.
    - Replacements are staggered: one photo fades out, and a moment later a different photo fades in at a
      different free spot, while all the others keep floating. No photo is ever shown twice at once.
    - Photos in the foreground get a warm mat frame, corner marks and a soft glow that moves from photo to photo.
    - Tiny fireflies drift and blink behind the photos (count depends on screen size).
    - Click or tap a photo to open the viewer (previous / next, X, Esc, click outside, swipe). Photos can also be
      reached with Tab and opened with Enter or Space.
    - Everything pauses off screen, in a background tab, while the viewer is open, with the Pause button,
      and the wall stays still for visitors who prefer reduced motion. No animation loop: only CSS transforms.
*/
(function () {
  'use strict';

  var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  var FADE = [700, 1200];                 // ms for a photo to fade in or out
  var RECENT = 8;                         // a photo that just left is not brought back for this many replacements
  var MAX_LIT = 2;                        // photos glowing at the same time
  var DEPTHS = {                          // size = share of its slot, dur = float cycle in seconds, amp = drift in px,
    far:  { size: 0.56, op: 0.7,  dur: [16, 21], amp: 7,  z: 1, mix: 0.3, mat: 0, tilt: 5 },     // mat = frame width in px,
    mid:  { size: 0.78, op: 0.93, dur: [12, 16], amp: 11, z: 2, mix: 0.4, mat: 3, tilt: 4.5 },   // tilt = max rotation in degrees
    near: { size: 1.04, op: 1,    dur: [9, 12],  amp: 15, z: 3, mix: 0.3, mat: 5, tilt: 3.2 }
  };
  var MODES = {                           // chosen by CSS (--fw-mode); cols x rows are the spots photos can float in
    wide:  { cols: 5, rows: 3, share: 1,    k: 1,    calm: 1,   flies: 22 },
    mid:   { cols: 4, rows: 3, share: 0.67, k: 1,    calm: 1,   flies: 14 },
    small: { cols: 3, rows: 3, share: 0.5,  k: 1.15, calm: 0.6, flies: 8 }
  };
  var MATS = ['#f2e8d4', '#f4f2ee'];      // warm ivory and soft white frames

  function rand(a, b) { return a + Math.random() * (b - a); }
  function sign() { return Math.random() < 0.5 ? -1 : 1; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function noop() {}

  /* ---------- image helpers ---------- */
  var probes = {};
  function probe(url) {                   // loads once, keeps only the size (the browser keeps the file cached)
    if (!probes[url]) probes[url] = new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () { resolve({ ok: true, w: im.naturalWidth, h: im.naturalHeight }); };
      im.onerror = function () { resolve({ ok: false }); };
      im.src = url;
    });
    return probes[url];
  }
  function warm(url) { var im = new Image(); im.src = url; }

  /* ---------- viewer (lightbox) ---------- */
  function createViewer(photos, onState, fallback) {
    var dlg = null, img, count, idx = 0, opener = null, token = 0, sx = 0, sy = 0, lastSwipe = 0;

    function big(p) { return p.full || p.lg || p.src; }
    function inside(e) {                  // is the click on the picture itself (not on the empty space around it)?
      var r = img.getBoundingClientRect(), nw = img.naturalWidth || 4, nh = img.naturalHeight || 3;
      var s = Math.min(r.width / nw, r.height / nh), w = nw * s, h = nh * s;
      var l = r.left + (r.width - w) / 2, t = r.top + (r.height - h) / 2;
      return e.clientX >= l && e.clientX <= l + w && e.clientY >= t && e.clientY <= t + h;
    }
    function show(i) {
      var n = photos.length, t = ++token, p;
      idx = ((i % n) + n) % n; p = photos[idx];
      img.alt = p.alt || ('Photo ' + (idx + 1) + ' of ' + n);
      img.classList.remove('is-ready');   // the new photo fades in once it can be drawn
      img.src = p.src;                    // small version is already cached, so something shows instantly
      (img.decode ? img.decode().catch(noop) : Promise.resolve()).then(function () { if (t === token) img.classList.add('is-ready'); });
      count.textContent = (idx + 1) + ' / ' + n;
      var b = big(p);
      if (b !== p.src) {                  // then swap in the large one when it has arrived
        var im = new Image();
        im.onload = function () { if (t === token) img.src = b; };
        im.src = b;
      }
      warm(big(photos[(idx + 1) % n])); warm(big(photos[(idx - 1 + n) % n]));
    }
    function go(d) { show(idx + d); }
    function build() {
      dlg = document.createElement('dialog');
      dlg.className = 'fw-lb';
      dlg.setAttribute('aria-label', 'Photo viewer');
      dlg.innerHTML =
        '<button type="button" class="fw-lb-btn fw-lb-close" aria-label="Close viewer">&times;</button>' +
        '<button type="button" class="fw-lb-btn fw-lb-prev" aria-label="Previous photo">&#8249;</button>' +
        '<img class="fw-lb-img" alt="" draggable="false">' +
        '<button type="button" class="fw-lb-btn fw-lb-next" aria-label="Next photo">&#8250;</button>' +
        '<p class="fw-lb-count" aria-live="polite"></p>';
      document.body.appendChild(dlg);
      img = dlg.querySelector('.fw-lb-img'); count = dlg.querySelector('.fw-lb-count');
      dlg.addEventListener('click', function (e) {
        if (Date.now() - lastSwipe < 400) return;           // the end of a swipe is not a click
        var t = e.target;
        if (t.closest('.fw-lb-close')) dlg.close();
        else if (t.closest('.fw-lb-prev')) go(-1);
        else if (t.closest('.fw-lb-next')) go(1);
        else if (t !== img || !inside(e)) dlg.close();      // click outside the photo
      });
      dlg.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      });
      dlg.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; });
      dlg.addEventListener('pointerup', function (e) {
        var dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { lastSwipe = Date.now(); go(dx < 0 ? 1 : -1); }
      });
      dlg.addEventListener('close', function () {
        onState(false);
        img.removeAttribute('src'); img.classList.remove('is-ready');
        var back = opener && opener.isConnected ? opener : (fallback && fallback());
        if (back && back.focus) back.focus();
      });
    }
    return {
      open: function (i, from) {
        if (typeof dlg === 'undefined' || !dlg) build();
        if (typeof dlg.showModal !== 'function') return;
        opener = from || document.activeElement;
        show(i);
        if (!dlg.open) dlg.showModal();
        onState(true);
      },
      destroy: function () { if (dlg && dlg.parentNode) dlg.parentNode.removeChild(dlg); dlg = null; }
    };
  }

  /* ---------- the wall ---------- */
  function mount(el) {
    var count = parseInt(el.getAttribute('data-cells'), 10) || 12;
    var sMin = parseInt(el.getAttribute('data-min'), 10), sMax = parseInt(el.getAttribute('data-max'), 10);
    if (!(sMin >= 1500)) sMin = 3000;
    if (!(sMax >= sMin)) sMax = Math.max(sMin, 6000);
    var manifest = el.getAttribute('data-src');
    if (!manifest) return null;

    var photos = [], cards = [], anchors = [], used = {}, recent = [], bad = {}, timers = [];
    var mode = null, G = null, gen = 0, swapTimer = null;
    var started = false, destroyed = false, inView = false, userPaused = false, viewerOpen = false;
    var io = null, ro = null, viewer = null, ctrl = null, pauseBtn = null, fliesEl = null;

    function reduced() { return !!(reduceQuery && reduceQuery.matches); }
    function running() { return started && !destroyed && inView && !document.hidden && !reduced() && !userPaused && !viewerOpen; }
    function later(fn, ms) {              // timers that die with a rebuild
      var g = gen, t = setTimeout(function () {
        var i = timers.indexOf(t); if (i > -1) timers.splice(i, 1);
        if (g === gen && !destroyed) fn();
      }, ms);
      timers.push(t);
    }

    /* ----- spots photos can float in ----- */
    function buildAnchors() {
      anchors = [];
      for (var r = 0; r < G.rows; r++) for (var c = 0; c < G.cols; c++)
        anchors.push({ cx: (c + 0.5) / G.cols, cy: (r + 0.5) / G.rows, cw: 1 / G.cols, ch: 1 / G.rows, busy: false });
    }
    function freeAnchor(avoid, depth) {
      var free = anchors.filter(function (a) { return !a.busy && a !== avoid; });
      if (!free.length) free = anchors.filter(function (a) { return !a.busy; });
      if (!free.length) return null;
      if (depth === 'near') {             // composition: big foreground photos keep their distance from each other
        var nears = cards.filter(function (c) { return !c.leaving && c.depth === 'near'; });
        var taken0 = anchors.filter(function (a) { return a.busy; });
        var scored = free.map(function (a) {
          var best = 9;
          nears.forEach(function (c) { best = Math.min(best, Math.hypot((a.cx - c.anchor.cx) * 1.4, a.cy - c.anchor.cy)); });
          taken0.forEach(function (t) { best = Math.min(best, Math.hypot((a.cx - t.cx) * 1.4, a.cy - t.cy) * 1.6); });
          return { a: a, s: best + Math.random() * 0.15 };
        }).sort(function (x, y) { return y.s - x.s; });
        return scored[Math.floor(Math.random() * Math.min(2, scored.length))].a;
      }
      var taken = anchors.filter(function (a) { return a.busy; });   // everything else: favour the emptiest areas, so the wall stays balanced
      var spread = free.map(function (a) {
        var best = 9;
        taken.forEach(function (t) { best = Math.min(best, Math.hypot((a.cx - t.cx) * 1.4, a.cy - t.cy)); });
        return { a: a, s: best + Math.random() * 0.12 };
      }).sort(function (x, y) { return y.s - x.s; });
      return spread[Math.floor(Math.random() * Math.min(3, spread.length))].a;
    }

    /* ----- which photo next: never one that is on screen, and not one that just left ----- */
    function pickPhoto() {
      var pool = photos.filter(function (p) { return !bad[p.src] && !used[p.src] && recent.indexOf(p.src) < 0; });
      if (!pool.length) pool = photos.filter(function (p) { return !bad[p.src] && !used[p.src]; });
      return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    }
    function chooseDepth() {              // keeps a steady mix of far, middle and near photos
      var counts = { far: 0, mid: 0, near: 0 }, total = 0, best = 'mid', gap = -9, k;
      cards.forEach(function (c) { if (!c.leaving) { counts[c.depth]++; total++; } });
      for (k in DEPTHS) {
        var want = DEPTHS[k].mix - (total ? counts[k] / total : 0) + Math.random() * 0.2;
        if (want > gap) { gap = want; best = k; }
      }
      return best;
    }

    /* ----- one floating photo ----- */
    function createCard(p, a, ar, depth) {
      var d = DEPTHS[depth];
      var W = el.clientWidth, H = el.clientHeight;
      var mat = (depth === 'near' || (depth === 'mid' && Math.random() < 0.6) ? d.mat : 0) * (G.k > 1 ? 0.8 : 1);   // frame width in px
      var w = a.cw * W * d.size * G.k, maxH = a.ch * H * (0.9 + 0.35 * d.size) * G.k;
      var h = (w - 2 * mat) / ar + 2 * mat;                         // the card is as tall as the photo plus its frame: no stretching, no cropping
      if (h > maxH) { h = maxH; w = (h - 2 * mat) * ar + 2 * mat; } // tall photos get narrower instead
      var cx = (a.cx + rand(-0.2, 0.2) * a.cw) * W, cy = (a.cy + rand(-0.2, 0.2) * a.ch) * H;
      var drift = 8 + d.amp * G.calm;                               // room for the float and tilt, so photos stay inside
      var band = 44;                                                // clear strip at the bottom for the Pause button
      cx = clamp(cx, w / 2 + drift, W - w / 2 - drift);
      cy = clamp(cy, h / 2 + drift, H - h / 2 - drift - band);

      var card = document.createElement('div');
      card.className = 'fw-card' + (mat ? ' has-border' : '');
      card.setAttribute('data-depth', depth);
      card.setAttribute('data-idx', String(photos.indexOf(p)));
      card.setAttribute('role', 'button'); card.setAttribute('tabindex', '0'); card.setAttribute('aria-label', 'Open photo');
      var s = card.style, fade = rand(FADE[0], FADE[1]);
      var ang = rand(0, Math.PI * 2), mag = rand(24, 46) * (G.k > 1 ? 0.7 : 1), ang2 = ang + Math.PI + rand(-1, 1);
      var dur = rand(d.dur[0], d.dur[1]) / G.calm;
      s.left = (cx / W * 100).toFixed(2) + '%'; s.top = (cy / H * 100).toFixed(2) + '%';
      s.width = (w / W * 100).toFixed(2) + '%'; s.zIndex = d.z;
      s.setProperty('--mat', mat.toFixed(1) + 'px'); s.setProperty('--mat-color', MATS[Math.floor(Math.random() * MATS.length)]);
      s.setProperty('--rot', rand(-d.tilt, d.tilt).toFixed(2) + 'deg');
      s.setProperty('--op', d.op);
      s.setProperty('--fade', fade.toFixed(0) + 'ms');
      s.setProperty('--ex', (Math.cos(ang) * mag).toFixed(0) + 'px'); s.setProperty('--ey', (Math.sin(ang) * mag).toFixed(0) + 'px');
      s.setProperty('--lx', (Math.cos(ang2) * mag * 0.8).toFixed(0) + 'px'); s.setProperty('--ly', (Math.sin(ang2) * mag * 0.8).toFixed(0) + 'px');
      s.setProperty('--dx', (sign() * rand(0.5, 1) * d.amp * G.calm).toFixed(1) + 'px');
      s.setProperty('--dy', (sign() * rand(0.5, 1) * d.amp * G.calm).toFixed(1) + 'px');
      s.setProperty('--dr', (sign() * rand(0.6, 1.6) * G.calm).toFixed(2) + 'deg');
      s.setProperty('--s0', rand(0.96, 0.995).toFixed(3)); s.setProperty('--s1', rand(1.005, 1.05).toFixed(3));
      // sideways drift, up/down drift, tilt and zoom each run on their own clock, so the motion never lines up or repeats
      s.setProperty('--dur-x', dur.toFixed(1) + 's');        s.setProperty('--del-x', (-rand(0, dur)).toFixed(1) + 's');
      s.setProperty('--dur-y', (dur * 0.83).toFixed(1) + 's'); s.setProperty('--del-y', (-rand(0, dur)).toFixed(1) + 's');
      s.setProperty('--dur-r', (dur * 1.31).toFixed(1) + 's'); s.setProperty('--del-r', (-rand(0, dur)).toFixed(1) + 's');
      s.setProperty('--dur-s', (dur * 1.12).toFixed(1) + 's'); s.setProperty('--del-s', (-rand(0, dur)).toFixed(1) + 's');

      var fl = document.createElement('div'); fl.className = 'fw-float';
      var fr = document.createElement('div'); fr.className = 'fw-frame';
      var im = document.createElement('img'); im.alt = ''; im.decoding = 'async'; im.draggable = false; im.src = p.src;
      fr.appendChild(im); fl.appendChild(fr);
      if (mat) { var trim = document.createElement('div'); trim.className = 'fw-trim'; fl.appendChild(trim); }   // gold corner marks
      card.appendChild(fl);
      el.appendChild(card);

      var rec = { el: card, photo: p, anchor: a, depth: depth, leaving: false, lit: false, litAt: 0, born: Date.now() };
      cards.push(rec);
      var ready = im.decode ? im.decode().catch(noop) : Promise.resolve();
      ready.then(function () {
        if (rec.gone || destroyed) return;
        void card.offsetWidth;                                       // commit the hidden state so the fade runs
        card.classList.add('is-in');
      });
    }
    function enterOne(avoid) {
      var depth = chooseDepth(), a = freeAnchor(avoid, depth), p = pickPhoto(), g = gen;
      if (!a || !p) return;
      a.busy = true; used[p.src] = true;
      probe(p.src).then(function (r) {
        if (g !== gen || destroyed) return;
        if (!r.ok) { bad[p.src] = true; delete used[p.src]; a.busy = false; later(function () { enterOne(); }, 300); return; }
        createCard(p, a, r.w / r.h, depth);
      });
    }
    function remove(rec) {
      var i = cards.indexOf(rec); if (i > -1) cards.splice(i, 1);
      rec.gone = true;
      if (rec.el.parentNode) rec.el.parentNode.removeChild(rec.el);
      delete used[rec.photo.src]; rec.anchor.busy = false;
      recent.push(rec.photo.src); if (recent.length > RECENT) recent.shift();
    }
    function leave(rec) {
      if (rec.leaving) return;
      rec.leaving = true;
      rec.el.classList.remove('is-in'); rec.el.classList.add('is-out');
      later(function () { remove(rec); }, (parseFloat(rec.el.style.getPropertyValue('--fade')) || 900) * 1.4 + 80);
    }

    /* ----- the shuffle: one photo leaves, a different one arrives somewhere else a moment later ----- */
    function swap() {
      var active = cards.filter(function (c) { return !c.leaving; });
      if (active.length < G.target) { enterOne(); return; }
      var cand = active.filter(function (c) { return !c.el.matches(':hover') && !c.el.contains(document.activeElement); });
      rotateLit();
      if (!cand.length) return;
      cand.sort(function (x, y) { return x.born - y.born; });
      var rec = cand[Math.floor(Math.random() * Math.ceil(cand.length / 2))];   // favours photos that have been up longest
      leave(rec);
      later(function () { enterOne(rec.anchor); }, rand(350, 1000));
    }
    function rotateLit() {                // a soft glow moves slowly from photo to photo
      var lit = cards.filter(function (c) { return c.lit && !c.leaving; });
      if (lit.length >= MAX_LIT) {
        lit.sort(function (x, y) { return x.litAt - y.litAt; });
        lit[0].lit = false; lit[0].el.classList.remove('is-lit');
      }
      var cand = cards.filter(function (c) { return !c.leaving && !c.lit && c.depth !== 'far'; });
      if (!cand.length) return;
      var c = cand[Math.floor(Math.random() * cand.length)];
      c.lit = true; c.litAt = Date.now(); c.el.classList.add('is-lit');
    }
    function scheduleSwap() {
      clearTimeout(swapTimer);
      swapTimer = setTimeout(function () {
        swapTimer = null;
        if (!running()) return;
        swap(); scheduleSwap();
      }, rand(sMin, sMax));
    }
    function sync() {
      var go = running();
      el.classList.toggle('is-paused', !go);
      if (go) { if (!swapTimer) scheduleSwap(); }
      else { clearTimeout(swapTimer); swapTimer = null; }
    }

    /* ----- layout by screen size (CSS decides the mode with --fw-mode) ----- */
    function clearAll() {
      gen++;
      timers.forEach(clearTimeout); timers = [];
      cards.forEach(function (c) { c.gone = true; if (c.el.parentNode) c.el.parentNode.removeChild(c.el); });
      cards = []; used = {}; recent = [];
    }
    function populate() {
      for (var i = 0; i < G.target; i++) later(function () { enterOne(); }, reduced() ? 0 : i * 230 + rand(0, 180));
    }
    function layout() {
      if (!el.clientWidth) return;
      var m = (getComputedStyle(el).getPropertyValue('--fw-mode') || '').trim();
      if (!MODES[m]) m = 'wide';
      if (m === mode) return;
      mode = m; G = MODES[m];
      G.target = Math.max(4, Math.round(count * G.share));
      el.setAttribute('data-mode', m);
      clearAll(); buildAnchors(); buildFlies();
      if (started) populate();
    }

    /* ----- fireflies: tiny lights that wander and blink behind the photos ----- */
    function buildFlies() {
      if (!fliesEl) return;
      fliesEl.textContent = '';
      var frag = document.createDocumentFragment(), calm = G.calm, i, f, size, gold, wd;
      for (i = 0; i < G.flies; i++) {
        f = document.createElement('i'); f.className = 'fw-fly';
        size = rand(1.8, 3.8); gold = Math.random() < 0.65; wd = rand(20, 38);
        var s = f.style;
        s.left = rand(2, 98).toFixed(1) + '%'; s.top = rand(3, 94).toFixed(1) + '%';
        s.setProperty('--fs', size.toFixed(1) + 'px');
        s.setProperty('--fc', gold ? '#ffd98a' : '#fff6e0');
        s.setProperty('--fg', gold ? 'rgba(255,205,120,0.55)' : 'rgba(255,246,226,0.5)');
        s.setProperty('--fg2', gold ? 'rgba(255,190,100,0.2)' : 'rgba(255,240,210,0.16)');
        s.setProperty('--pk', rand(0.5, 0.95).toFixed(2));                       // how bright it gets
        s.setProperty('--wd', wd.toFixed(1) + 's'); s.setProperty('--wl', (-rand(0, wd)).toFixed(1) + 's');
        s.setProperty('--bd', rand(4, 9).toFixed(1) + 's'); s.setProperty('--bl', (-rand(0, 9)).toFixed(1) + 's');
        for (var k = 1; k <= 3; k++) {                                           // slow wandering path
          s.setProperty('--x' + k, (sign() * rand(20, 70) * calm).toFixed(0) + 'px');
          s.setProperty('--y' + k, (sign() * rand(16, 56) * calm).toFixed(0) + 'px');
        }
        frag.appendChild(f);
      }
      fliesEl.appendChild(frag);
    }

    function begin() {
      if (started || destroyed) return;
      started = true;
      layout();
      if (G) populate();
      sync();
    }
    function openAt(i, from) { if (viewer) viewer.open(i, from); }
    function onVisibility() { sync(); }
    function onMotion() { if (pauseBtn) pauseBtn.hidden = reduced(); sync(); }

    function init(list) {
      photos = list.filter(function (p) { return p && typeof p.src === 'string'; });
      if (photos.length < 8) return;
      viewer = createViewer(photos, function (open) { viewerOpen = open; sync(); }, function () { return pauseBtn; });

      fliesEl = document.createElement('div'); fliesEl.className = 'fw-flies'; fliesEl.setAttribute('aria-hidden', 'true');
      el.appendChild(fliesEl);

      ctrl = document.createElement('div'); ctrl.className = 'fw-ctrl';
      pauseBtn = document.createElement('button'); pauseBtn.type = 'button'; pauseBtn.className = 'fw-btn';
      pauseBtn.textContent = 'Pause'; pauseBtn.setAttribute('aria-pressed', 'false'); pauseBtn.hidden = reduced();
      pauseBtn.addEventListener('click', function () {
        userPaused = !userPaused;
        pauseBtn.textContent = userPaused ? 'Play' : 'Pause';
        pauseBtn.setAttribute('aria-pressed', String(userPaused));
        sync();
      });
      ctrl.appendChild(pauseBtn); el.appendChild(ctrl);

      el.addEventListener('click', function (e) {
        var c = e.target.closest ? e.target.closest('.fw-card') : null;
        if (c) openAt(parseInt(c.getAttribute('data-idx'), 10) || 0, c);
      });
      el.addEventListener('keydown', function (e) {                // photos can be opened from the keyboard too
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var c = e.target.closest ? e.target.closest('.fw-card') : null;
        if (!c) return;
        e.preventDefault();
        openAt(parseInt(c.getAttribute('data-idx'), 10) || 0, c);
      });

      layout();
      if ('ResizeObserver' in window) { ro = new ResizeObserver(layout); ro.observe(el); }
      else window.addEventListener('resize', layout);
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(function (entries) {
          inView = entries[entries.length - 1].isIntersecting;
          if (inView) begin();            // photos are only requested once the wall is near the viewport
          sync();
        }, { rootMargin: '200px 0px' });
        io.observe(el);
      } else { inView = true; begin(); }
      document.addEventListener('visibilitychange', onVisibility);
      if (reduceQuery) {
        if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onMotion);
        else if (reduceQuery.addListener) reduceQuery.addListener(onMotion);
      }
    }

    fetch(manifest, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(init)
      .catch(function () { /* no list: the wall stays empty */ });

    return {
      destroy: function () {
        destroyed = true; clearAll(); clearTimeout(swapTimer);
        if (io) io.disconnect();
        if (ro) ro.disconnect(); else window.removeEventListener('resize', layout);
        document.removeEventListener('visibilitychange', onVisibility);
        if (reduceQuery) {
          if (reduceQuery.removeEventListener) reduceQuery.removeEventListener('change', onMotion);
          else if (reduceQuery.removeListener) reduceQuery.removeListener(onMotion);
        }
        if (viewer) viewer.destroy();
        if (ctrl && ctrl.parentNode) ctrl.parentNode.removeChild(ctrl);
        if (fliesEl && fliesEl.parentNode) fliesEl.parentNode.removeChild(fliesEl);
      }
    };
  }

  window.PhotoGrid = { mount: mount };
  var nodes = document.querySelectorAll('[data-photo-grid]');
  for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
})();
