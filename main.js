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
        var a = reduce ? .38 : .2 + .22 * (0.5 + 0.5 * Math.sin(t * .9 + d[2]));
        ctx.fillStyle = 'rgba(190,205,230,' + a.toFixed(3) + ')';
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
        g.addColorStop(0, 'rgba(255,90,54,.55)'); g.addColorStop(1, 'rgba(255,90,54,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, gr, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#ff6a47'; ctx.beginPath(); ctx.arc(x, y, Math.max(2, w * .0058) * np, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#ffe3da'; ctx.beginPath(); ctx.arc(x, y, Math.max(1, w * .0024) * np, 0, 6.2832); ctx.fill();
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
          pg.addColorStop(0, 'rgba(255,230,220,.95)'); pg.addColorStop(.4, 'rgba(255,110,70,.5)'); pg.addColorStop(1, 'rgba(255,90,54,0)');
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
