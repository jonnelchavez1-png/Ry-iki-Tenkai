/*
  Photo intro (About section).
  Markup:  <div class="photo-intro" data-photo-intro data-src="/assets/photo-grid/photos.json" data-final="/assets/photo-grid/photo-19-full.webp"
                data-hero="19" data-name="Jonnel|De Chavez" data-roles="Operations Support|Digital Solution"></div>
  Photo list (JSON): [{ "src": "/assets/photo-grid/photo-01.webp", "focus": "50% 45%" }, ...]  (same file the old gallery used)
  data-hero is the photo number (1 based, position in the list) that is the final portrait; it is left out of the collage.
  Sequence (seconds): 0-3.7 warp tunnel, 3.0-4.7 burst fills the stage edge to edge, then a static collage whose photos keep changing,
  7.4-11.2 tiles dissolve one by one over the portrait that was already underneath, 10.4 caption appears. Plays once when the block
  scrolls into view; Replay / Pause / Skip buttons. Pauses off screen and in a background tab. Reduced motion: shows the end state.
*/
(function () {
  'use strict';
  function mount(el) {
    var manifest = el.getAttribute('data-src'), finalSrc = el.getAttribute('data-final'), hero = (parseInt(el.getAttribute('data-hero'), 10) || 1) - 1;
    if (!manifest || !finalSrc) return;
    var nm = (el.getAttribute('data-name') || '').split('|'), rl = (el.getAttribute('data-roles') || '').split('|');
    function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', 'Photo of ' + nm.join(' ') + ' with his mother. ' + rl.join(', ') + '.');
    el.innerHTML = '<canvas aria-hidden="true"></canvas><div class="pi-status" aria-hidden="true">Loading photos</div>' +
      '<div class="pi-cap"><div class="pi-nm">' + nm.map(function (n) { return '<span class="pi-ln"><b>' + esc(n) + '</b></span>'; }).join('') + '</div>' +
      '<div class="pi-rule"></div><div class="pi-rl">' + rl.map(function (r) { return '<span>' + esc(r) + '</span>'; }).join('<i></i>') + '</div></div>' +
      '<div class="pi-hud"><button class="pi-pill" type="button" data-pi="replay">Replay</button><button class="pi-pill" type="button" data-pi="pause">Pause</button><button class="pi-pill" type="button" data-pi="skip">Skip</button></div>';
  var PAL = { A: { bg0: '#10244a', bg1: '#050b15', grade: 'rgba(10,26,51,', veil: 'rgba(7,20,44,', ink: '#f4efe4', accent: '#d0ab59', soft: '#b9c2d0' } };
  // timeline (seconds at 1x)
  var SPAWN_STOP = 2.9, WARP_END = 3.7, BURST_T = 3.0, BURST_DUR = 0.85, BURST_SPREAD = 0.8,
      ALL_IN = BURST_T + BURST_SPREAD + BURST_DUR,           // every tile is in place
      REVEAL_T = 7.4, REVEAL_SPAN = 3.0, FADE = 0.8,         // tiles dissolve one by one between 7.4 and 11.2
      ALL_GONE = REVEAL_T + REVEAL_SPAN + FADE, CAP_T = 10.4, END = 12.2;

  var stage = el, cv = stage.querySelector('canvas'), ctx = cv.getContext('2d');
  var capEl = stage.querySelector('.pi-cap'), statusEl = stage.querySelector('.pi-status');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var btnReplay = stage.querySelector('[data-pi=replay]'), btnPause = stage.querySelector('[data-pi=pause]'), btnSkip = stage.querySelector('[data-pi=skip]');

  var photos = [], finalImg = null;
  var pal = 'A', layout = 'full', speed = 1;
  var W = 0, H = 0, dpr = 1, portrait = false, finalC = null, tiles = [], order = [], warp = [], streaks = [], lifts = [];
  var T = 0, sdt = 0, last = 0, raf = 0, paused = false, idle = false, ready = false, liftNext = 0, started = false;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function eo3(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function eio(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function focus(i) { var m = (photos[i].focus || '50% 50%').match(/([\d.]+)%\s+([\d.]+)%/); return m ? [m[1] / 100, m[2] / 100] : [0.5, 0.5]; }

  /* draw an image into a rect like object-fit: cover, with zoom and a pan anchor */
  function cover(g, img, dx, dy, dw, dh, zoom, px, py) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    var s = Math.max(dw / iw, dh / ih) * zoom, sw = dw / s, sh = dh / s;
    var sx = (iw - sw) * clamp(px, 0, 1), sy = (ih - sh) * clamp(py, 0, 1);
    g.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  /* ---------- build ---------- */
  function setup() {
    var r = stage.getBoundingClientRect();
    portrait = window.innerWidth < 700;
    stage.classList.toggle('is-portrait', portrait);
    r = stage.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, portrait ? 1.5 : 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    buildFinal(); buildGrid(); buildWarp(); layoutCaption();
  }

  function buildFinal() {
    var p = PAL[pal];
    finalC = document.createElement('canvas'); finalC.width = cv.width; finalC.height = cv.height;
    var g = finalC.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingQuality = 'high';
    if (layout === 'full') {
      cover(g, finalImg, 0, 0, W, H, 1, 0.5, portrait ? 0.3 : 0.16);
      var gl = portrait ? g.createLinearGradient(0, H * 0.45, 0, H) : g.createLinearGradient(0, 0, W * 0.62, 0);
      gl.addColorStop(0, p.veil + '0)'); gl.addColorStop(1, p.veil + (portrait ? '0.92)' : '0)'));
      if (!portrait) { gl = g.createLinearGradient(0, 0, W * 0.62, 0); gl.addColorStop(0, p.veil + '0.88)'); gl.addColorStop(1, p.veil + '0)'); }
      g.fillStyle = gl; g.fillRect(0, 0, W, H);
    } else {
      // blurred, darkened copy of the same photo fills everything, so there is never an empty area
      var sm = document.createElement('canvas'); sm.width = 14; sm.height = Math.max(4, Math.round(14 * H / W));
      var sg = sm.getContext('2d'); sg.imageSmoothingQuality = 'high'; cover(sg, finalImg, 0, 0, sm.width, sm.height, 1.25, 0.5, 0.3);
      var sm2 = document.createElement('canvas'); sm2.width = 56; sm2.height = Math.max(8, Math.round(56 * H / W)); var s2g = sm2.getContext('2d'); s2g.imageSmoothingQuality = 'high';
      s2g.drawImage(sm, 0, 0, sm2.width, sm2.height);
      g.drawImage(sm2, 0, 0, W, H);
      g.fillStyle = p.veil + '0.74)'; g.fillRect(0, 0, W, H);
      var side, x, y, fe;
      if (portrait) { side = W; x = 0; y = 0; cover(g, finalImg, x, y, side, side, 1, 0.5, 0.5);
        fe = g.createLinearGradient(0, side * 0.82, 0, side); fe.addColorStop(0, p.veil + '0)'); fe.addColorStop(1, p.veil + '0.9)'); g.fillStyle = fe; g.fillRect(0, side * 0.82, W, side * 0.18);
      } else { side = H; x = W - side; y = 0; cover(g, finalImg, x, y, side, side, 1, 0.5, 0.5);
        fe = g.createLinearGradient(x, 0, x + side * 0.2, 0); fe.addColorStop(0, p.veil + '0.92)'); fe.addColorStop(1, p.veil + '0)'); g.fillStyle = fe; g.fillRect(x, 0, side * 0.2, H);
      }
      var v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.38)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
    }
  }

  function layoutCaption() {
    var s = capEl.style; s.left = s.top = s.right = s.bottom = s.width = s.transform = '';
    capEl.classList.toggle('full', layout === 'full');
    if (portrait) {
      s.left = '8%'; s.right = '8%';
      if (layout === 'split') s.top = (W / H * 100 + 3.5) + '%'; else s.bottom = '7%';
    } else if (layout === 'split') {
      s.left = '6%'; s.top = '50%'; s.transform = 'translateY(-50%)'; s.width = ((W - H) * 0.86) + 'px';
    } else { s.left = '6%'; s.bottom = '10%'; s.width = '60%'; }
  }

  function buildGrid() {
    tiles = []; lifts = [];
    var target = portrait ? 110 : 170;
    var cols = clamp(Math.round(W / target), 3, 14), cw = W / cols, rows = Math.ceil(H / (cw / 1.35)), ch = H / rows;
    function snap(v) { return Math.round(v * dpr) / dpr; }
    var cx0 = W / 2, cy0 = H / 2, maxD = Math.hypot(cx0, cy0);
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var x = snap(c * cw), y = snap(r * ch), tw = snap((c + 1) * cw) - x, th = snap((r + 1) * ch) - y, cx = x + tw / 2, cy = y + th / 2, d = Math.hypot(cx - cx0, cy - cy0) / maxD, i = Math.floor(Math.random() * photos.length);
      tiles.push({ x: x, y: y, w: tw, h: th, cx: cx, cy: cy, d: d, delay: BURST_T + d * BURST_SPREAD, idx: i, next: rand(0, 0.4), pop: 0,
        prev: -1, swapT: -9, lockAt: REVEAL_T + REVEAL_SPAN * eio(clamp(0.55 * (1 - d) + 0.45 * Math.random(), 0, 1)) });
    }
    order = tiles.slice().sort(function (a, b) { return b.d - a.d; }); // outer first, inner on top while bursting
  }

  function buildWarp() {
    warp = []; streaks = [];
    var N = portrait ? 26 : 44, tw = W * (portrait ? 0.34 : 0.2);
    for (var i = 0; i < N; i++) { var t = { tw: tw, th: tw * 0.68 }; spawnWarp(t, rand(400, 3400)); t.idx = Math.floor(Math.random() * photos.length); t.next = rand(0, 0.3); t.pop = 0; warp.push(t); }
    for (var k = 0; k < 90; k++) streaks.push({ a: rand(0, 6.2832), r: Math.random(), s: rand(0.6, 1.4) });
  }
  function spawnWarp(t, d) {
    var a = rand(0, 6.2832), r = rand(0.12, 0.95) * W * 0.95;
    t.x = Math.cos(a) * r; t.y = Math.sin(a) * r * 0.66; t.d = d; t.rz = rand(-0.17, 0.17); t.alive = true;
  }

  /* ---------- drawing ---------- */
  function drawWarp() {
    var p = PAL[pal], u = clamp(T / WARP_END, 0, 1), v = 650 + 3300 * u * u, F = 900, cx = W / 2, cy = H / 2, i;
    var fadeOut = 1 - eio((T - 3.1) / 0.7);
    // speed streaks
    var R = Math.hypot(W, H) * 0.55; ctx.lineCap = 'round'; ctx.strokeStyle = p.accent;
    for (i = 0; i < streaks.length; i++) {
      var s = streaks[i]; s.r += (0.22 + 1.5 * u * u) * s.s * sdt; if (s.r > 1) s.r = rand(0, 0.12);
      var r0 = s.r, r1 = s.r + 0.015 + 0.13 * u;
      ctx.globalAlpha = (0.06 + 0.4 * s.r * (0.35 + u)) * fadeOut; ctx.lineWidth = 1 + 1.2 * u;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(s.a) * R * r0, cy + Math.sin(s.a) * R * r0 * 0.7); ctx.lineTo(cx + Math.cos(s.a) * R * r1, cy + Math.sin(s.a) * R * r1 * 0.7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // frames, far to near
    for (i = 0; i < warp.length; i++) {
      var t = warp[i]; if (!t.alive) continue;
      t.d -= v * sdt;
      if (t.d < 170) { if (T < SPAWN_STOP) { spawnWarp(t, 3400 + rand(0, 400)); t.idx = Math.floor(Math.random() * photos.length); } else { t.alive = false; continue; } }
      if (T >= t.next) { t.idx = (t.idx + 1 + Math.floor(Math.random() * (photos.length - 1))) % photos.length; t.next = T + rand(0.2, 0.55); t.pop = T + 0.07; }
    }
    warp.sort(function (a, b) { return b.d - a.d; });
    for (i = 0; i < warp.length; i++) {
      var q = warp[i]; if (!q.alive) continue;
      var k = F / q.d, sx = cx + q.x * k, sy = cy + q.y * k, w = q.tw * k, h = q.th * k;
      if (sx + w < 0 || sx - w > W || sy + h < 0 || sy - h > H) continue;
      var fog = clamp(1 - (q.d - 700) / 2800, 0.12, 1), a = clamp((3400 - q.d) / 900, 0, 1) * clamp((q.d - 150) / 260, 0, 1) * fog * fadeOut;
      if (a <= 0.01) continue;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(sx, sy); ctx.rotate(q.rz);
      var f = focus(q.idx); cover(ctx, photos[q.idx].img, -w / 2, -h / 2, w, h, 1, f[0], f[1]);
      if (q.pop > T) { ctx.globalAlpha = a * (q.pop - T) / 0.07 * 0.4; ctx.fillStyle = '#fff3cf'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.globalAlpha = a; }
      ctx.lineWidth = Math.max(1, 2 * Math.min(k, 1.4)); ctx.strokeStyle = p.accent; ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawTilePhoto(idx, x, y, w, h) { var f = focus(idx); cover(ctx, photos[idx].img, x, y, w, h, 1, f[0], f[1]); }

  /* The wall never changes size once it has burst in. It stays alive through quick photo changes that crossfade,
     and a slow band of light. Then tiles dissolve one by one, outer tiles first, over the final photo that was
     already sitting underneath. */
  function drawCollage() {
    var p = PAL[pal], i, t;
    var u = clamp((T - (BURST_T + 0.6)) / (REVEAL_T + REVEAL_SPAN - (BURST_T + 0.6)), 0, 1);
    var interval = (0.1 + 0.7 * eio(u)) / Math.max(0.5, speed * 0.85 + 0.3);
    for (i = 0; i < order.length; i++) {
      t = order[i];
      var e = eo3((T - t.delay) / BURST_DUR); if (e <= 0.001) continue;
      var fade = 1 - eio((T - t.lockAt) / FADE); if (fade <= 0.001) continue;
      if (T < t.lockAt && T >= t.next) { t.prev = t.idx; t.idx = (t.idx + 1 + Math.floor(Math.random() * (photos.length - 1))) % photos.length; t.swapT = T; t.next = T + interval * rand(0.6, 1.7); t.pop = T + 0.08; }
      var bl = e < 1 ? 1.5 : 0, w = (t.w + bl) * e, h = (t.h + bl) * e, x = W / 2 + (t.cx - W / 2) * e - w / 2, y = H / 2 + (t.cy - H / 2) * e - h / 2;
      var ba = clamp(e * 2.2, 0, 1) * fade, xf = clamp((T - t.swapT) / 0.09, 0, 1);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      if (xf < 1 && t.prev >= 0) { ctx.globalAlpha = ba; drawTilePhoto(t.prev, x, y, w, h); ctx.globalAlpha = ba * xf; } else ctx.globalAlpha = ba;
      drawTilePhoto(t.idx, x, y, w, h);
      if (t.pop > T && T < t.lockAt) { ctx.globalAlpha = ba * (t.pop - T) / 0.08 * 0.2; ctx.fillStyle = '#fff3cf'; ctx.fillRect(x, y, w, h); }
      ctx.restore();
    }
    var rv = clamp((T - REVEAL_T) / (REVEAL_SPAN + FADE), 0, 1);
    // a slow band of light drifts across the wall
    if (T > BURST_T + 1.3) {
      var ph = ((T - BURST_T) % 3.8) / 3.8, sx = lerp(-0.35 * W, 1.35 * W, ph), sa = 0.1 * (1 - eio(rv));
      var sg = ctx.createLinearGradient(sx - 0.22 * W, 0, sx + 0.22 * W, H * 0.35);
      sg.addColorStop(0, 'rgba(255,240,205,0)'); sg.addColorStop(0.5, 'rgba(255,240,205,' + sa.toFixed(3) + ')'); sg.addColorStop(1, 'rgba(255,240,205,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    }
    // shared colour grade and vignette fade out smoothly across the whole reveal
    var gk = clamp((T - BURST_T) / 1.6, 0, 1) * (1 - eio(rv));
    if (gk > 0.001) {
      ctx.fillStyle = p.grade + (0.3 * gk).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
      var vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + (0.5 * gk).toFixed(3) + ')'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  }

  function drawFlash() {
    var b = (T - 3.0) / 0.9; if (b <= 0 || b >= 1) return;
    var a = Math.sin(b * Math.PI) * 0.6, p = PAL[pal];
    var g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * (0.25 + 0.6 * b));
    g.addColorStop(0, 'rgba(255,246,220,' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,246,220,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function render() {
    var p = PAL[pal];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1;
    if (T >= ALL_GONE) { ctx.drawImage(finalC, 0, 0, W, H); }
    else {
      var bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
      bg.addColorStop(0, p.bg0); bg.addColorStop(1, p.bg1); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      if (T < WARP_END + 0.3) drawWarp();
      if (T >= ALL_IN) ctx.drawImage(finalC, 0, 0, W, H);   // the final photo waits underneath the wall
      if (T >= BURST_T) drawCollage();
      drawFlash();
    }
    capEl.classList.toggle('show', T >= CAP_T);
  }


  /* ---------- loop and controls ---------- */
  var inView = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    if (!ready || !started || paused || idle || !inView || document.hidden) return;
    sdt = dt * speed; T += sdt; render();
    if (T >= END) { idle = true; }
  }
  function restart(atEnd) {
    T = 0; sdt = 0; idle = false; last = performance.now();
    setup();
    if (atEnd) { T = END; idle = true; }
    render();
  }
  function setPaused(p) { paused = p; btnPause.textContent = p ? 'Play' : 'Pause'; last = performance.now(); }

  btnReplay.addEventListener('click', function () { started = true; setPaused(false); restart(false); });
  btnPause.addEventListener('click', function () { started = true; setPaused(!paused); });
  btnSkip.addEventListener('click', function () { started = true; T = END; idle = true; render(); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (ready && Math.abs(stage.clientWidth - W) > 2) restart(idle || !started); }, 250); });
  document.addEventListener('visibilitychange', function () { last = performance.now(); });

  /* ---------- load (only when the block is near the screen) ---------- */
  function load(src) { return new Promise(function (res) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = src; }); }
  function begin() {
    fetch(manifest).then(function (r) { return r.json(); }).then(function (list) {
      list = list.filter(function (p, i) { return i !== hero; });
      photos = list;
      return Promise.all(list.map(function (p) { return load(p.src).then(function (im) { p.img = im; }); })).then(function () { return load(finalSrc); });
    }).then(function (img) {
      photos = photos.filter(function (p) { return p.img; });
      if (!img || !photos.length) throw new Error('photos');
      finalImg = img;
      statusEl.hidden = true; ready = true;
      restart(reduce); started = reduce ? true : started;
      last = performance.now(); raf = requestAnimationFrame(frame);
      if (!reduce && inView) started = true;
    }).catch(function (e) { if (window.console) console.error('photo-intro', e); statusEl.hidden = false; statusEl.textContent = 'Photos could not be loaded'; });
  }
  if ('IntersectionObserver' in window) {
    var warm = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { warm.disconnect(); begin(); } }, { rootMargin: '700px 0px' });
    warm.observe(stage);
    new IntersectionObserver(function (es) { inView = es[0].isIntersecting; if (inView && ready && !started && !reduce) { started = true; last = performance.now(); } }, { threshold: 0.4 }).observe(stage);
  } else { inView = true; started = true; begin(); }
  }

  var nodes = document.querySelectorAll('[data-photo-intro]');
  for (var n = 0; n < nodes.length; n++) mount(nodes[n]);
})();
