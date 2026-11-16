/* Divide & Conquer — particle effects, lasers, confetti, banners, screen shake */
(function () {
  'use strict';
  const DQ = window.DQ;
  const FX = (DQ.fx = {});
  const cv = document.getElementById('fxCanvas');
  const cx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  FX.reduced = reduce;

  const parts = [], beams = [], projs = [];
  let running = false, last = 0;
  function kick() {
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  }
  const rainbow = t => `hsl(${(t / 4) % 360},100%,62%)`;

  function drawStar(x, y, r) {
    cx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    cx.closePath(); cx.fill();
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    cx.clearRect(0, 0, W, H);

    // lasers
    cx.globalCompositeOperation = 'lighter';
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      b.t += dt;
      const k = 1 - b.t / b.life;
      if (k <= 0) { beams.splice(i, 1); continue; }
      const col = b.color === 'rainbow' ? rainbow(now) : b.color;
      cx.lineCap = 'round';
      cx.globalAlpha = 0.25 * k; cx.strokeStyle = col; cx.lineWidth = b.width * 3.2;
      cx.beginPath(); cx.moveTo(b.x1, b.y1); cx.lineTo(b.x2, b.y2); cx.stroke();
      cx.globalAlpha = 0.9 * k; cx.lineWidth = b.width;
      cx.beginPath(); cx.moveTo(b.x1, b.y1); cx.lineTo(b.x2, b.y2); cx.stroke();
      cx.globalAlpha = k; cx.strokeStyle = b.core; cx.lineWidth = b.width * 0.35;
      cx.beginPath(); cx.moveTo(b.x1, b.y1); cx.lineTo(b.x2, b.y2); cx.stroke();
    }

    // projectiles
    for (let i = projs.length - 1; i >= 0; i--) {
      const p = projs[i];
      p.t += dt;
      const k = Math.min(1, p.t / p.life);
      const e = k * k * (3 - 2 * k);
      const x = p.x1 + (p.x2 - p.x1) * e;
      const y = p.y1 + (p.y2 - p.y1) * e + Math.sin(Math.PI * e) * p.arc;
      if (Math.random() < 0.9) parts.push({ x, y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, g: 0, drag: 0.9, life: 0.35, max: 0.35, size: p.size * 0.18, color: p.color, shape: 'circle', glow: true, rot: 0, vr: 0 });
      cx.globalCompositeOperation = 'source-over';
      cx.globalAlpha = 1;
      if (p.text) {
        cx.font = `${p.size}px serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.save(); cx.translate(x, y); cx.rotate(p.t * 10); cx.fillText(p.text, 0, 0); cx.restore();
      } else {
        cx.globalCompositeOperation = 'lighter';
        cx.fillStyle = p.color; cx.beginPath(); cx.arc(x, y, p.size / 2, 0, 7); cx.fill();
      }
      if (k >= 1) { projs.splice(i, 1); p.res(); }
    }

    // particles
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      const drag = Math.pow(p.drag, dt * 60);
      p.vx *= drag; p.vy = p.vy * drag + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const a = Math.min(1, (p.life / p.max) * 1.6);
      cx.globalAlpha = a;
      cx.globalCompositeOperation = p.glow ? 'lighter' : 'source-over';
      const col = p.color === 'rainbow' ? rainbow(now + i * 40) : p.color;
      cx.fillStyle = col; cx.strokeStyle = col;
      switch (p.shape) {
        case 'rect':
          cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.scale(1, Math.cos(p.rot * 1.7));
          cx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66); cx.restore(); break;
        case 'spark':
          cx.lineWidth = p.size; cx.lineCap = 'round';
          cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); cx.stroke(); break;
        case 'star': drawStar(p.x, p.y, p.size); break;
        case 'ring': {
          const r = p.size + (1 - p.life / p.max) * p.grow;
          cx.lineWidth = 4 * (p.life / p.max) + 0.5; cx.beginPath(); cx.arc(p.x, p.y, r, 0, 7); cx.stroke(); break;
        }
        case 'text':
          cx.font = `${p.size}px serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
          cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillText(p.text, 0, 0); cx.restore(); break;
        default:
          cx.beginPath(); cx.arc(p.x, p.y, Math.max(0.3, p.size * (p.shrink ? p.life / p.max : 1)), 0, 7); cx.fill();
      }
    }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    if (parts.length || beams.length || projs.length) requestAnimationFrame(loop);
    else { running = false; cx.clearRect(0, 0, W, H); }
  }

  const BRIGHT = ['#facc15', '#f472b6', '#22d3ee', '#a78bfa', '#4ade80', '#fb923c'];

  FX.burst = (x, y, o = {}) => {
    const n = Math.round((o.count != null ? o.count : 30) * (reduce ? 0.3 : 1));
    const colors = o.colors || BRIGHT;
    for (let i = 0; i < n; i++) {
      const ang = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread != null ? o.spread : Math.PI * 2) : Math.random() * Math.PI * 2;
      const sp = (o.speed != null ? o.speed : 260) * (0.3 + Math.random() * 0.8);
      const life = (o.life || 0.9) * (0.6 + Math.random() * 0.6);
      parts.push({
        x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        g: o.gravity != null ? o.gravity : 320, drag: o.drag || 0.95,
        life, max: life, size: (o.size || 4) * (0.6 + Math.random() * 0.8),
        color: DQ.pick(colors), shape: o.shape || 'circle', glow: !!o.glow, shrink: o.shrink !== false,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
        text: o.texts ? DQ.pick(o.texts) : null,
      });
    }
    kick();
  };
  FX.ring = (x, y, color = '#fff', size = 8, grow = 110, life = 0.55) => {
    parts.push({ x, y, vx: 0, vy: 0, g: 0, drag: 1, life, max: life, size, grow, color, shape: 'ring', glow: true, rot: 0, vr: 0 });
    kick();
  };
  FX.explosion = (x, y, o = {}) => {
    const colors = o.colors || ['#fde047', '#fb923c', '#ef4444', '#ffffff'];
    FX.burst(x, y, { count: o.big ? 90 : 40, colors, speed: o.big ? 520 : 320, shape: 'spark', size: 3, glow: true, gravity: 120, life: 0.7 });
    FX.burst(x, y, { count: o.big ? 40 : 18, colors, speed: o.big ? 260 : 160, size: o.big ? 9 : 6, glow: true, gravity: -40, life: 0.8 });
    FX.ring(x, y, colors[0], 10, o.big ? 260 : 120);
    if (o.big) setTimeout(() => FX.ring(x, y, colors[2] || '#fff', 20, 340, 0.8), 120);
  };
  FX.sparkle = (x, y, colors) => FX.burst(x, y, { count: 18, colors: colors || ['#fde047', '#fff', '#a7f3d0'], shape: 'star', size: 6, speed: 180, gravity: 60, life: 0.8 });
  FX.confetti = (n = 160) => {
    n = Math.round(n * (reduce ? 0.25 : 1));
    for (let i = 0; i < n; i++) {
      const life = 2.6 + Math.random() * 2;
      parts.push({
        x: Math.random() * W, y: -20 - Math.random() * H * 0.3,
        vx: (Math.random() - 0.5) * 160, vy: 80 + Math.random() * 220, g: 160, drag: 0.985,
        life, max: life, size: 8 + Math.random() * 7, color: DQ.pick(BRIGHT), shape: 'rect',
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10,
      });
    }
    kick();
  };
  FX.fireworks = (count = 5) => {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const x = W * (0.15 + Math.random() * 0.7), y = H * (0.15 + Math.random() * 0.35);
        const c = DQ.pick([['#f472b6', '#fff'], ['#22d3ee', '#fff'], ['#facc15', '#fb923c'], ['#a78bfa', '#4ade80']]);
        FX.burst(x, y, { count: 70, colors: c, shape: 'spark', size: 2.5, speed: 380, gravity: 140, glow: true, life: 1.2, drag: 0.97 });
        FX.ring(x, y, c[0], 4, 160, 0.6);
        DQ.sfx('pop');
      }, i * 260);
    }
  };
  FX.beam = (x1, y1, x2, y2, o = {}) => {
    beams.push({ x1, y1, x2, y2, color: o.color || '#22d3ee', core: o.core || '#fff', width: o.width || 7, life: o.life || 0.28, t: 0 });
    kick();
  };
  FX.projectile = (x1, y1, x2, y2, o = {}) => new Promise(res => {
    projs.push({ x1, y1, x2, y2, t: 0, life: o.life || 0.45, text: o.text || null, color: o.color || '#f43f5e', size: o.size || 30, arc: o.arc != null ? o.arc : -50, res });
    kick();
  });
  FX.center = el => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  FX.floatText = (x, y, text, o = {}) => {
    const el = DQ.h('div', { class: 'float-text ' + (o.cls || '') }, text);
    el.style.left = x + 'px'; el.style.top = y + 'px';
    if (o.color) el.style.color = o.color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  };
  FX.shake = (el = document.body, cls = 'shake') => {
    if (reduce || !el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 600);
  };
  FX.flash = (color = 'rgba(255,255,255,.7)') => {
    const el = DQ.h('div', { class: 'screen-flash' });
    el.style.background = color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 500);
  };
  FX.banner = (html, o = {}) => new Promise(res => {
    const el = DQ.h('div', { class: 'fx-banner ' + (o.cls || ''), html });
    document.body.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => { el.remove(); res(); }, 350);
    }, o.ms || 1100);
  });
  /* Coins fly from a point into the top-bar coin counter */
  FX.coinsTo = (x, y, n = 8) => {
    const target = document.getElementById('tbCoins');
    if (!target) return;
    const t = FX.center(target);
    n = Math.min(n, reduce ? 3 : 14);
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        FX.projectile(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 40, t.x, t.y, { text: '🪙', size: 22, life: 0.6 + Math.random() * 0.25, arc: -80 - Math.random() * 80, color: '#facc15' })
          .then(() => {
            DQ.sfx('coin');
            target.parentElement.classList.remove('bump'); void target.offsetWidth; target.parentElement.classList.add('bump');
          });
      }, i * 70);
    }
  };
})();
