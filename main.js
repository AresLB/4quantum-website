(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Scroll reveal */
  var targets = document.querySelectorAll('.reveal:not(.hero .reveal), .statement');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add('in'); });
  }

  /* Statement: word-by-word fade */
  var stmt = document.getElementById('stmt');
  if (stmt) {
    var i = 0;
    var walk = function (node, hl) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span');
            s.className = 'w' + (hl ? ' hl' : '');
            s.style.setProperty('--i', i++);
            s.textContent = part;
            frag.appendChild(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          walk(n, hl || n.classList.contains('hl'));
        }
      });
    };
    walk(stmt, false);
    stmt.querySelectorAll('.hl').forEach(function (h) {
      if (h.tagName === 'SPAN' && !h.classList.contains('w')) { h.style.display = 'contents'; }
    });
  }

  if (reduce) {
    document.querySelectorAll('svg').forEach(function (s) { if (s.pauseAnimations) s.pauseAnimations(); });
  }

  /* Intro: animated lockup, then scroll to hero */
  (function () {
    var root = document.documentElement;
    var intro = document.getElementById('intro');
    var hero = document.getElementById('hero');
    if (!intro || !hero || root.classList.contains('skip-intro')) return;
    window.scrollTo(0, 0);
    root.classList.add('intro-active');
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      try { sessionStorage.setItem('q4-intro', '1'); } catch (e) {}
      root.classList.remove('intro-lock');
      hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    var last = intro.querySelector('.l7');
    if (last) last.addEventListener('animationend', function () { setTimeout(finish, 1100); });
    setTimeout(finish, 8000);
    window.addEventListener('wheel', function (e) { if (e.deltaY > 0) finish(); }, { passive: true });
    window.addEventListener('touchmove', finish, { passive: true });
    window.addEventListener('keydown', function (e) { if (/^( |ArrowDown|PageDown|Enter)$/.test(e.key)) finish(); });
    var hint = intro.querySelector('.scrollhint');
    if (hint) hint.addEventListener('click', function (e) { e.preventDefault(); finish(); });
    window.addEventListener('scroll', function () {
      root.classList.toggle('intro-active', window.scrollY < intro.offsetHeight * 0.5);
    }, { passive: true });
  })();

  /* Product diagram: pump in -> photon pair -> click -> store -> read out */
  (function () {
    var box = document.getElementById('diagram');
    if (!box) return;
    var svg = box.querySelector('svg'), scroller = box.querySelector('.scroller'), phase = document.getElementById('phase');
    var $ = function (id) { return svg.querySelector('#' + id); };
    var el = {
      beam: $('beam'), burst: $('burst'), c1: $('c1glow'), c2: $('c2glow'), det: $('detFlash'), click: $('clickFlash'),
      mc: $('mcFlash'), clickGlow: $('clickGlow'), ctrl: $('ctrlGlow'), ring: $('ring'), a: $('phA'), b: $('phB'), out: $('outLbl')
    };
    var beamLines = el.beam.querySelectorAll('line');

    function mk(pts) {
      var L = [0];
      for (var i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return { p: pts, L: L, len: L[L.length - 1] };
    }
    function at(path, s) {
      s = Math.max(0, Math.min(path.len, s));
      for (var i = 1; i < path.L.length; i++) {
        if (s <= path.L[i]) {
          var f = (s - path.L[i - 1]) / (path.L[i] - path.L[i - 1] || 1);
          return [path.p[i - 1][0] + (path.p[i][0] - path.p[i - 1][0]) * f, path.p[i - 1][1] + (path.p[i][1] - path.p[i - 1][1]) * f];
        }
      }
      return path.p[path.p.length - 1];
    }
    var loop = [[640, 124], [660, 124], [706, 176]];
    for (var d = 0; d <= 501.3; d += 3) {
      var th = (-90 - d) * Math.PI / 180;
      loop.push([706 + 26 * Math.cos(th), 202 + 26 * Math.sin(th)]);
    }
    loop.push([640, 288], [485, 288]);
    var pathA = mk([[640, 124], [770, 124]]);
    var pathB = mk(loop);
    var pathOut = mk([[485, 288], [330, 288], [90, 288]]);

    var vB = 140, tPair = 1.6, tClick = tPair + 1.0;
    var tE = tPair + (pathB.len - 60) / vB, tS = tE + 0.9;
    var tW0 = tClick + 0.7, tW1 = tE + 0.1;
    var tRs = tS + 0.6, tRa = tRs + 1.9, T = tRa + 2.0 + 0.9;

    function clamp(x) { return Math.max(0, Math.min(1, x)); }
    function ramp(t, a, b) { return clamp((t - a) / (b - a)); }
    function bump(t, a) { return ramp(t, a, a + 0.1) * (1 - ramp(t, a + 0.15, a + 0.7)) * 0.85; }
    function place(g, p, o, sc) { g.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ') scale(' + (sc || 1).toFixed(3) + ')'); g.setAttribute('opacity', o.toFixed(2)); }
    function dash(node, u) { node.setAttribute('stroke-dashoffset', (-(-0.25 + 1.25 * u)).toFixed(4)); }

    var captions = [
      [0, 'The pump beam enters the light cage'],
      [tPair, 'A photon pair is generated'],
      [tClick, 'One photon triggers the detector click, the other runs through the delay fiber'],
      [tE - 0.1, 'The memory control holds the photon inside the memory'],
      [tRs, 'Read out on demand']
    ];
    var capIdx = -1;
    function setCaption(t) {
      var i = 0;
      for (var k = 0; k < captions.length; k++) if (t >= captions[k][0]) i = k;
      if (i === capIdx) return;
      capIdx = i;
      phase.classList.add('swap');
      setTimeout(function () {
        phase.querySelector('.step').textContent = i + 1;
        phase.querySelector('.txt').textContent = captions[i][1];
        phase.classList.remove('swap');
      }, 180);
    }

    function frame(t) {
      var u = ramp(t, 0, 1.5);
      beamLines.forEach(function (l) { l.setAttribute('stroke-dashoffset', (-(-0.2 + 1.2 * u)).toFixed(4)); });
      el.beam.setAttribute('opacity', t < tPair ? 1 : 0);
      el.c1.setAttribute('opacity', Math.max(0, 0.75 * (ramp(t, 0.7, 1.5) - ramp(t, 2.3, 3.4))).toFixed(2));

      var bu = ramp(t, tPair - 0.05, tPair + 0.7);
      el.burst.setAttribute('r', (6 + 30 * bu).toFixed(1));
      el.burst.setAttribute('opacity', (t >= tPair - 0.05 && bu < 1) ? ((1 - bu) * 0.9).toFixed(2) : 0);

      var pa = null;
      if (t >= tPair && t < tClick) { pa = at(pathA, pathA.len * (t - tPair) / (tClick - tPair)); place(el.a, pa, Math.min(1, ramp(t, tPair, tPair + 0.15) * 1.2)); }
      else el.a.setAttribute('opacity', 0);
      el.det.setAttribute('opacity', bump(t, tClick).toFixed(2));
      el.click.setAttribute('opacity', bump(t, tClick + 0.05).toFixed(2));

      var cu = ramp(t, tClick + 0.05, tClick + 0.7);
      el.clickGlow.setAttribute('opacity', (cu > 0 && cu < 1) ? 1 : 0);
      dash(el.clickGlow, cu);
      el.mc.setAttribute('opacity', Math.min(0.9, bump(t, tW0) + bump(t, tRs)).toFixed(2));

      var wu = ramp(t, tW0, tW1), ru = ramp(t, tRs, tRa), cuu = 0, show = 0;
      if (t >= tW0 && t < tW1) { cuu = wu; show = 1; } else if (t >= tRs && t < tRa) { cuu = ru; show = 1; }
      el.ctrl.setAttribute('opacity', show);
      dash(el.ctrl, cuu);

      el.c2.setAttribute('opacity', Math.max(0, 0.7 * (ramp(t, tE, tS) - ramp(t, tRa, tRa + 0.8))).toFixed(2));
      var r1 = ramp(t, tW1, tW1 + 0.8), r2 = ramp(t, tRa, tRa + 0.8), rr = (r1 > 0 && r1 < 1) ? r1 : ((r2 > 0 && r2 < 1) ? r2 : 0);
      el.ring.setAttribute('r', (8 + 34 * rr).toFixed(1));
      el.ring.setAttribute('opacity', rr > 0 ? ((1 - rr) * 0.9).toFixed(2) : 0);

      var pb = null;
      if (t >= tPair && t < tRa) {
        var s;
        if (t < tE) s = vB * (t - tPair);
        else if (t < tS) { var q = (t - tE) / 0.9; s = pathB.len - 60 + 60 * (1 - (1 - q) * (1 - q)); }
        else s = pathB.len;
        pb = at(pathB, s);
        var pulse = (t >= tS) ? 1 + 0.18 * Math.sin((t - tS) * 5.5) : 1;
        place(el.b, pb, Math.min(1, ramp(t, tPair, tPair + 0.15) * 1.2), pulse);
      } else if (t >= tRa && t < tRa + 2.0) {
        var ou = (t - tRa) / 2.0, sm = ou * ou * (3 - 2 * ou);
        pb = at(pathOut, pathOut.len * sm);
        place(el.b, pb, ou > 0.88 ? Math.max(0, (1 - ou) / 0.12) : 1);
      } else el.b.setAttribute('opacity', 0);

      el.out.setAttribute('opacity', (0.6 + 0.4 * ramp(t, tRa + 1.4, tRa + 1.9) * (1 - ramp(t, tRa + 2.2, tRa + 2.9))).toFixed(2));
      setCaption(t);

      if (follow) {
        var fx = t < tPair ? 210 + 430 * u : (t < tClick ? (pa ? pa[0] : 640) : (t < tW0 + 0.6 ? 860 : (pb ? pb[0] : 485)));
        var k = svg.getBoundingClientRect().width / 1000;
        var target = fx * k - scroller.clientWidth / 2;
        scroller.scrollLeft += (target - scroller.scrollLeft) * 0.07;
      }
    }

    var follow = false, lastTouch = 0;
    function updateFollow() { follow = window.innerWidth <= 860 && scroller.scrollWidth > scroller.clientWidth + 4 && (performance.now() - lastTouch > 5000); }
    scroller.addEventListener('touchstart', function () { lastTouch = performance.now(); follow = false; }, { passive: true });
    scroller.addEventListener('pointerdown', function () { lastTouch = performance.now(); follow = false; });
    window.addEventListener('resize', updateFollow);

    var fixed = /[?&]diagT=([0-9.]+)/.exec(location.search);
    if (fixed) { frame(parseFloat(fixed[1])); return; }
    if (reduce) { frame(tS + 0.8); return; }
    var visible = false, vt = 0, prev = 0;
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; prev = performance.now(); }, { threshold: 0.1 }).observe(box);
    (function tick(now) {
      requestAnimationFrame(tick);
      if (!visible) return;
      vt += Math.min(0.1, (now - prev) / 1000); prev = now;
      updateFollow();
      frame(vt % T);
    })(performance.now());
  })();

  /* Europe network map */
  var N = [[46,222],[105,248],[155,237],[130,290],[191,270],[237,234],[230,185],[211,123],[282,130],[349,118],[311,239],[248,271],[265,298],[219,299],[190,312],[196,342],[292,309],[360,357],[338,455],[229,395],[127,400],[70,417],[18,443]]
    .map(function (p) { return [p[0] / 444, p[1] / 500]; });
  var E = [[0,1],[1,2],[1,3],[2,3],[2,4],[3,4],[3,20],[20,21],[21,22],[20,15],[2,6],[4,5],[4,14],[14,13],[13,11],[5,6],[5,10],[5,11],[6,7],[6,8],[7,8],[8,9],[9,10],[10,16],[11,12],[12,16],[16,17],[17,18],[15,19],[19,18],[12,13],[14,15],[19,16]];
  var adj = N.map(function () { return []; });
  E.forEach(function (e, k) { adj[e[0]].push(k); adj[e[1]].push(k); });

  var dotsPromise = fetch('assets/map-dots.json').then(function (r) { return r.json(); }).then(function (pts) {
    var seen = {}, out = [];
    pts.forEach(function (p) {
      var gx = Math.floor(p[0] / 9), gy = Math.floor(p[1] / 9), ok = true;
      for (var dx = -1; dx <= 1 && ok; dx++) for (var dy = -1; dy <= 1 && ok; dy++) {
        var l = seen[(gx + dx) + ',' + (gy + dy)];
        if (l) for (var q = 0; q < l.length; q++) { var a = l[q][0] - p[0], b = l[q][1] - p[1]; if (a * a + b * b < 81) { ok = false; break; } }
      }
      if (ok) { (seen[gx + ',' + gy] = seen[gx + ',' + gy] || []).push(p); out.push([p[0] / 1000, p[1] / 1000, Math.random() * 6.28]); }
    });
    return out;
  }).catch(function () { return []; });

  function initMap(canvas) {
    var ctx = canvas.getContext('2d');
    var dots = [], w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var visible = true, start = performance.now(), raf = 0;
    var packets = [];
    for (var k = 0; k < 9; k++) {
      var ei = Math.floor(Math.random() * E.length);
      packets.push({ e: ei, dir: Math.random() < .5 ? 0 : 1, p: Math.random(), v: .18 + Math.random() * .22 });
    }

    function resize() {
      var r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function frame(now) {
      var t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);

      var rad = Math.max(1.1, w * 0.0027);
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var a = reduce ? .34 : .16 + .2 * (0.5 + 0.5 * Math.sin(t * .9 + d[2]));
        ctx.fillStyle = 'rgba(70,82,104,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(d[0] * w, d[1] * h, rad, 0, 6.2832); ctx.fill();
      }

      ctx.lineWidth = Math.max(1, w * .002);
      for (var j = 0; j < E.length; j++) {
        var prog = reduce ? 1 : Math.min(1, Math.max(0, (t - .4 - j * .06) / 1.1));
        if (prog <= 0) continue;
        var A = N[E[j][0]], B = N[E[j][1]];
        ctx.strokeStyle = 'rgba(255,90,54,.5)';
        ctx.beginPath(); ctx.moveTo(A[0] * w, A[1] * h);
        ctx.lineTo((A[0] + (B[0] - A[0]) * prog) * w, (A[1] + (B[1] - A[1]) * prog) * h); ctx.stroke();
      }

      for (var n = 0; n < N.length; n++) {
        var np = reduce ? 1 : Math.min(1, Math.max(0, (t - .2 - n * .07) / .6));
        if (np <= 0) continue;
        var x = N[n][0] * w, y = N[n][1] * h;
        var pulse = reduce ? .5 : 0.5 + 0.5 * Math.sin(t * 1.6 + n * 1.7);
        var gr = (w * .028 + pulse * w * .014) * np;
        var g = ctx.createRadialGradient(x, y, 0, x, y, gr);
        g.addColorStop(0, 'rgba(255,90,54,.42)'); g.addColorStop(1, 'rgba(255,90,54,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, gr, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#ff6a47'; ctx.beginPath(); ctx.arc(x, y, Math.max(2, w * .0058) * np, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, Math.max(1, w * .0024) * np, 0, 6.2832); ctx.fill();
      }

      if (!reduce && t > 1.4) {
        for (var q = 0; q < packets.length; q++) {
          var pk = packets[q];
          pk.p += pk.v * (1 / 60);
          if (pk.p >= 1) {
            var endNode = E[pk.e][pk.dir === 0 ? 1 : 0];
            var opts = adj[endNode].filter(function (c) { return c !== pk.e; });
            var nxt = opts.length ? opts[Math.floor(Math.random() * opts.length)] : pk.e;
            pk.dir = (E[nxt][0] === endNode) ? 0 : 1; pk.e = nxt; pk.p = 0;
          }
          var s = N[E[pk.e][pk.dir]], f = N[E[pk.e][pk.dir === 0 ? 1 : 0]];
          var px = (s[0] + (f[0] - s[0]) * pk.p) * w, py = (s[1] + (f[1] - s[1]) * pk.p) * h;
          var pg = ctx.createRadialGradient(px, py, 0, px, py, w * .018);
          pg.addColorStop(0, 'rgba(255,90,54,.95)'); pg.addColorStop(.35, 'rgba(255,90,54,.4)'); pg.addColorStop(1, 'rgba(255,90,54,0)');
          ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, w * .018, 0, 6.2832); ctx.fill();
        }
      }
    }

    function loop(now) {
      if (visible) frame(now);
      raf = requestAnimationFrame(loop);
    }

    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start = start; }).observe(canvas);
    window.addEventListener('resize', resize);
    resize();
    dotsPromise.then(function (d) {
      dots = d; start = performance.now();
      if (reduce) { frame(start + 5000); } else { raf = requestAnimationFrame(loop); }
    });
  }

  document.querySelectorAll('canvas[data-map]').forEach(initMap);
})();
