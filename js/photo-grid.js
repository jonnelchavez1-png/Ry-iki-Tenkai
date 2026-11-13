/*
  Framed photo rows (About section).
  Markup:  <div class="photo-grid" data-photo-grid data-src="/assets/photo-grid/photos.json"></div>
  Photo list (JSON): [{ "src": "/assets/photo-grid/photo-01.webp", "focus": "50% 45%" }, ...]   (focus is optional)
  How it behaves:
    - Two rows of identical gold-framed photos, tilted in 3D. Row 1 moves left to right, row 2 right to left,
      each at its own speed, and they loop without a visible seam.
    - Smart fit: every frame is the same size. A photo that would lose too much is shown whole on a dim blurred copy of itself.
    - Center focus: the photo nearest the middle is sharp, bright and lit; the ones farther away are soft and dark.
    - Photos are decoration only: not clickable, no hover, no viewer, hidden from screen readers.
    - Pauses off screen, in a background tab and with the Pause button. Stays still for reduced motion.
    - Tiny fireflies drift and blink over the scene (count depends on screen size).
*/
(function () {
  'use strict';

  var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  var ROWS = 2, GAP = 7, AR = 1.5, CROP_MAX = 0.14, SOFT = 28;
  var DIRS = [1, -1];                                       // row 1 left to right, row 2 right to left
  var SPEED = [78, 62];                                     // px per second on a wide screen
  var MODES = {                                             // chosen by CSS (--fw-mode)
    wide:  { tilt: 35, k: 1,    flies: 22, calm: 1 },
    mid:   { tilt: 26, k: 0.9,  flies: 14, calm: 1 },
    small: { tilt: 18, k: 0.75, flies: 8,  calm: 0.6 }
  };

  function rand(a, b) { return a + Math.random() * (b - a); }
  function sign() { return Math.random() < 0.5 ? -1 : 1; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function div(c) { var d = document.createElement('div'); d.className = c; return d; }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function mount(el) {
    var manifest = el.getAttribute('data-src');
    if (!manifest) return null;

    var photos = [], imgs = [], order = [], groups = [];
    var rowsEl, fliesEl, ctrl, pauseBtn, ro, io, rt, raf = 0, tickN = 0;
    var rows = [], builtW = 0, builtH = 0, TW = 0, MID = 0, range = 300, mode = 'wide', G = MODES.wide;
    var inView = false, userPaused = false, started = false, destroyed = false;

    function reduced() { return !!(reduceQuery && reduceQuery.matches); }
    function running() { return started && inView && !document.hidden && !userPaused && !reduced() && !destroyed; }

    /* a tiny blurred copy of each photo: cheap to draw, so no live blur filter is needed */
    function soft(i) {
      var p = photos[i];
      if (p.soft) return p.soft;
      try {
        var c = document.createElement('canvas');
        c.width = SOFT; c.height = Math.max(8, Math.round(SOFT * p.h / p.w));
        c.getContext('2d').drawImage(imgs[i], 0, 0, c.width, c.height);
        p.soft = c.toDataURL('image/jpeg', 0.7);
      } catch (e) { p.soft = ''; }
      return p.soft;
    }

    function frameOf(idx, fw, fit) {
      var p = photos[idx], f = div('fw-frame' + (fit ? ' is-fit' : '')), pic = div('fw-pic'), sf = div('fw-soft'), dim = div('fw-dim'), im = document.createElement('img');
      f.style.width = fw + 'px'; f.style.marginRight = GAP + 'px'; f.style.setProperty('--fp', p.focus || '50% 50%');
      im.className = 'fw-sharp'; im.alt = ''; im.draggable = false; im.src = p.src;
      var s = soft(idx); if (s) sf.style.backgroundImage = 'url("' + s + '")';
      pic.appendChild(sf); pic.appendChild(im); pic.appendChild(dim); f.appendChild(pic);
      return { el: f, sharp: im, dim: dim, w: fw, x: 0, g: -1 };
    }

    function off(row, t) {
      var p = (((t % row.dur) + row.dur) % row.dur) / row.dur * row.W1;
      return row.dir > 0 ? -row.W1 + p : -p;
    }

    /* focus: how close each frame is to the middle, 1 = at the middle, 0 = far. Smooth, never a jump. */
    function update() {
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r], tx = row.anim ? off(row, Number(row.anim.currentTime) || 0) : row.tx;
        for (var i = 0; i < row.frames.length; i++) {
          var f = row.frames[i], cx = f.x + tx + f.w / 2;
          if (cx < -f.w - 80 || cx > TW + f.w + 80) continue;
          var u = clamp((Math.abs(cx - MID) / range - 0.06) / 0.94, 0, 1), g = 1 - smooth(u);
          if (f.g >= 0 && Math.abs(g - f.g) < 0.008) continue;
          f.g = g;
          f.sharp.style.opacity = g.toFixed(3);
          f.dim.style.opacity = (0.62 * (1 - g)).toFixed(3);
          f.el.style.setProperty('--g', g.toFixed(3));
          f.el.style.transform = 'scale(' + (1 + 0.025 * g).toFixed(3) + ')';
          f.el.style.zIndex = g > 0.5 ? 2 : 1;
        }
      }
    }
    function tick() {
      raf = 0;
      if (!running()) return;
      if (mode !== 'small' || (++tickN & 1)) update();      // phones update every other frame
      raf = requestAnimationFrame(tick);
    }

    /* start or stop everything */
    function sync() {
      var go = running(), i;
      el.classList.toggle('is-paused', !go && !reduced());
      for (i = 0; i < rows.length; i++) {
        if (!rows[i].anim) continue;
        if (go) { if (rows[i].anim.playState !== 'running') rows[i].anim.play(); }
        else if (rows[i].anim.playState === 'running') rows[i].anim.pause();
      }
      if (go && !raf) raf = requestAnimationFrame(tick);
      if (!go && raf) { cancelAnimationFrame(raf); raf = 0; }
    }

    function build() {
      if (destroyed || !photos.length) return;
      var W = el.clientWidth, H = el.clientHeight;
      if (!W || !H) return;
      var cs = window.getComputedStyle ? getComputedStyle(el).getPropertyValue('--fw-mode') : '';
      mode = (cs || '').replace(/["'\s]/g, '') || 'wide'; if (!MODES[mode]) mode = 'wide';
      G = MODES[mode]; el.setAttribute('data-mode', mode);
      builtW = W; builtH = H;

      rows.forEach(function (r) { if (r.anim) r.anim.cancel(); });
      rows = []; rowsEl.textContent = '';

      var a = G.tilt;
      el.style.setProperty('--fw-tilt', (-a) + 'deg');
      el.style.setProperty('--fw-fit', (1 - a * 0.0072).toFixed(3));
      el.style.setProperty('--fw-persp', clamp(Math.round(W * 1.2), 800, 1500) + 'px');

      var pad = Math.round(W * 0.65); TW = W + 2 * pad; MID = pad + W / 2;
      rowsEl.style.left = rowsEl.style.right = (-pad) + 'px';
      var area = H * 0.7, frameH = Math.floor((area - (ROWS - 1) * GAP) / ROWS), top0 = Math.round((H - (frameH * ROWS + (ROWS - 1) * GAP)) / 2);
      var fw = Math.round(frameH * AR);
      range = Math.max(0.32 * W, 1.6 * frameH);

      var per = Math.floor(order.length / ROWS);
      for (var r = 0; r < ROWS; r++) {
        var list = order.slice(r * per, r * per + per), items = [], x = 0, i, k;
        for (i = 0; i < list.length; i++) {
          var p = photos[list[i]], ar = p.w / p.h, crop = ar > AR ? 1 - AR / ar : 1 - ar / AR;
          items.push({ idx: list[i], x: x, fit: crop > CROP_MAX }); x += fw + GAP;
        }
        var W1 = x, copies = Math.max(2, Math.ceil(TW / W1) + 1), frames = [], rowEl = div('fw-row'), track = div('fw-track');
        rowEl.style.top = (top0 + r * (frameH + GAP)) + 'px'; rowEl.style.height = frameH + 'px'; track.style.width = (W1 * copies) + 'px';
        for (k = 0; k < copies; k++) for (i = 0; i < items.length; i++) {
          var fo = frameOf(items[i].idx, fw, items[i].fit); fo.x = k * W1 + items[i].x; frames.push(fo); track.appendChild(fo.el);
        }
        rowEl.appendChild(track); rowsEl.appendChild(rowEl);
        var dur = W1 / (SPEED[r] * G.k * rand(0.94, 1.06)) * 1000, dir = DIRS[r];
        var row = { frames: frames, W1: W1, dir: dir, dur: dur, anim: null, tx: 0 };
        if (!reduced() && track.animate) {
          row.anim = track.animate(
            [{ transform: 'translate3d(' + (dir > 0 ? -W1 : 0) + 'px,0,0)' }, { transform: 'translate3d(' + (dir > 0 ? 0 : -W1) + 'px,0,0)' }],
            { duration: dur, iterations: Infinity, easing: 'linear' });
          row.anim.currentTime = Math.random() * dur;
          row.anim.pause();                                  // sync() starts it
        } else { row.tx = off(row, Math.random() * dur); track.style.transform = 'translate3d(' + row.tx + 'px,0,0)'; }
        rows.push(row);
      }
      buildFlies();
      update();
      rowsEl.classList.add('is-ready');
      sync();
    }

    /* ----- fireflies: tiny lights that wander and blink over the scene ----- */
    function buildFlies() {
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
        s.setProperty('--pk', rand(0.5, 0.95).toFixed(2));
        s.setProperty('--wd', wd.toFixed(1) + 's'); s.setProperty('--wl', (-rand(0, wd)).toFixed(1) + 's');
        s.setProperty('--bd', rand(4, 9).toFixed(1) + 's'); s.setProperty('--bl', (-rand(0, 9)).toFixed(1) + 's');
        for (var k = 1; k <= 3; k++) {
          s.setProperty('--x' + k, (sign() * rand(20, 70) * calm).toFixed(0) + 'px');
          s.setProperty('--y' + k, (sign() * rand(16, 56) * calm).toFixed(0) + 'px');
        }
        frag.appendChild(f);
      }
      fliesEl.appendChild(frag);
    }

    function onResize() {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (!started || destroyed) return;
        if (el.clientWidth !== builtW || el.clientHeight !== builtH) build();
      }, 150);
    }
    function onVisibility() { sync(); }
    function onMotion() { if (pauseBtn) pauseBtn.hidden = reduced(); if (started) build(); }

    /* photos are only requested once the gallery is near the viewport */
    function begin(list) {
      if (started || destroyed) return;
      var left = list.length, ok = [];
      function done() {
        if (--left > 0 || destroyed) return;
        photos = ok.filter(Boolean);
        if (photos.length < 8) return;
        imgs = photos.map(function (p) { return p.img; });
        order = shuffle(photos.map(function (_, i) { return i; }));
        started = true;
        build();
      }
      list.forEach(function (p, n) {
        var im = new Image();
        im.onload = function () { ok[n] = { src: p.src, focus: p.focus, img: im, w: im.naturalWidth, h: im.naturalHeight }; done(); };
        im.onerror = function () { done(); };
        im.src = p.src;
      });
    }

    function init(list) {
      list = list.filter(function (p) { return p && typeof p.src === 'string'; });
      if (list.length < 8) return;

      fliesEl = document.createElement('div'); fliesEl.className = 'fw-flies'; fliesEl.setAttribute('aria-hidden', 'true');
      rowsEl = document.createElement('div'); rowsEl.className = 'fw-rows'; rowsEl.setAttribute('aria-hidden', 'true');
      el.appendChild(rowsEl); el.appendChild(fliesEl);

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

      if ('ResizeObserver' in window) { ro = new ResizeObserver(onResize); ro.observe(el); }
      else window.addEventListener('resize', onResize);
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(function (entries) {
          inView = entries[entries.length - 1].isIntersecting;
          if (inView) begin(list);
          sync();
        }, { rootMargin: '200px 0px' });
        io.observe(el);
      } else { inView = true; begin(list); }
      document.addEventListener('visibilitychange', onVisibility);
      if (reduceQuery) {
        if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onMotion);
        else if (reduceQuery.addListener) reduceQuery.addListener(onMotion);
      }
    }

    fetch(manifest, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(init)
      .catch(function () { /* no list: the gallery stays empty */ });

    return {
      destroy: function () {
        destroyed = true; clearTimeout(rt);
        if (raf) cancelAnimationFrame(raf);
        rows.forEach(function (r) { if (r.anim) r.anim.cancel(); });
        if (io) io.disconnect();
        if (ro) ro.disconnect(); else window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibility);
        if (reduceQuery) {
          if (reduceQuery.removeEventListener) reduceQuery.removeEventListener('change', onMotion);
          else if (reduceQuery.removeListener) reduceQuery.removeListener(onMotion);
        }
        [rowsEl, fliesEl, ctrl].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
      }
    };
  }

  window.PhotoGrid = { mount: mount };
  var nodes = document.querySelectorAll('[data-photo-grid]');
  for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
})();
