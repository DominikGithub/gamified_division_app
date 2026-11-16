/* Divide & Conquer — core helpers + the long-division algorithm */
(function () {
  'use strict';
  const DQ = (window.DQ = window.DQ || {});

  /* ---------- tiny event bus ---------- */
  const handlers = {};
  DQ.on = (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); };
  DQ.emit = (ev, ...args) => {
    (handlers[ev] || []).slice().forEach(fn => { try { fn(...args); } catch (e) { console.error(e); } });
  };

  /* ---------- DOM helpers ---------- */
  DQ.$ = (sel, root = document) => root.querySelector(sel);
  DQ.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  DQ.h = function (tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  };
  DQ.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- misc utils ---------- */
  DQ.sleep = ms => new Promise(r => setTimeout(r, ms));
  DQ.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  DQ.randInt = (a, b, rng = Math.random) => a + Math.floor(rng() * (b - a + 1));
  DQ.pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];
  DQ.shuffle = (arr, rng = Math.random) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  DQ.makeRng = seed => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  DQ.hashStr = s => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  DQ.todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  DQ.fmt = n => Math.round(n).toLocaleString('en-US');

  /* ---------- the long division algorithm ----------
     Produces the exact steps a pupil writes on paper:
     for each step: partial number, quotient digit, product, remainder,
     and the digit that gets "brought down" afterwards.               */
  DQ.longDivision = function (dividend, divisor) {
    dividend = Math.floor(Math.abs(dividend));
    divisor = Math.floor(Math.abs(divisor)) || 1;
    const digits = String(dividend).split('').map(Number);
    const steps = [];
    let i = 0;
    let partial = digits[0];
    // first group: take digits until the divisor fits (or we run out)
    while (partial < divisor && i < digits.length - 1) { i++; partial = partial * 10 + digits[i]; }
    for (;;) {
      const q = Math.floor(partial / divisor);
      const product = q * divisor;
      const rem = partial - product;
      const step = { index: steps.length, partial, endCol: i, q, product, rem, brought: null };
      steps.push(step);
      if (i >= digits.length - 1) break;
      i++;
      step.brought = digits[i];
      partial = rem * 10 + digits[i];
    }
    return {
      dividend, divisor, digits, steps,
      quotient: Math.floor(dividend / divisor),
      remainder: dividend % divisor,
    };
  };

  /* What the partial number looks like on paper (e.g. "05" after a remainder of 0) */
  DQ.partialInfo = (data, k) => {
    const st = data.steps[k];
    const text = k === 0
      ? data.digits.slice(0, st.endCol + 1).join('')
      : String(data.steps[k - 1].rem) + data.steps[k - 1].brought;
    return { text, left: st.endCol - text.length + 1 };
  };

  DQ.hasInnerZero = data => data.steps.some((s, i) => i > 0 && s.q === 0);

  /* ---------- problem generators ---------- */
  const R = DQ.randInt;
  DQ.TIERS = {
    t1: { gen: rng => { const d = R(2, 9, rng); const q = R(10, Math.floor(99 / d), rng); return [q * d, d]; } },
    t2: { gen: rng => { const d = R(2, 9, rng); let n; do { n = R(d * 10, 99, rng); } while (n % d === 0); return [n, d]; } },
    t3: { gen: rng => { const d = R(2, 9, rng); const q = R(Math.ceil(100 / d), Math.floor(999 / d), rng); return [q * d, d]; } },
    t4: { gen: rng => { const d = R(2, 9, rng); return [R(100, 999, rng), d]; } },
    t5: {
      gen: rng => {
        for (let t = 0; t < 800; t++) {
          const d = R(2, 9, rng);
          const n = rng() < 0.55 ? R(100, 999, rng) : R(1000, 9999, rng);
          if (DQ.hasInnerZero(DQ.longDivision(n, d))) return [n, d];
        }
        return [618, 3];
      },
    },
    t6: { gen: rng => { const d = R(3, 9, rng); return [R(1000, 9999, rng), d]; } },
    t7: { gen: rng => { const d = R(11, 29, rng); return [R(d * 10, 999, rng), d]; } },
    t8: { gen: rng => { const d = R(11, 39, rng); return [R(1000, 9999, rng), d]; } },
  };
  DQ.tierLabel = id => DQ.t('tier.' + id);
  let lastKey = '';
  DQ.genProblem = (tiers, rng = Math.random) => {
    for (let t = 0; t < 20; t++) {
      const tier = DQ.TIERS[DQ.pick(tiers, rng)] || DQ.TIERS.t1;
      const [n, d] = tier.gen(rng);
      const key = n + '/' + d;
      if (key !== lastKey || t > 15) { lastKey = key; return [n, d]; }
    }
    return [84, 4];
  };

  /* ---------- the friendly robot mascot (inline SVG) ---------- */
  DQ.mascotSVG = () => `
<svg class="mascot" viewBox="0 0 120 140" aria-hidden="true">
  <line x1="60" y1="10" x2="60" y2="26" stroke="#312e81" stroke-width="4" stroke-linecap="round"/>
  <circle class="m-antenna" cx="60" cy="9" r="7" fill="#f43f5e" stroke="#312e81" stroke-width="3"/>
  <path class="m-arm-l" d="M18 78 q-14 4 -12 20" stroke="#312e81" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path class="m-arm-r" d="M102 78 q14 4 12 20" stroke="#312e81" stroke-width="6" fill="none" stroke-linecap="round"/>
  <rect x="14" y="24" width="92" height="76" rx="28" fill="#38bdf8" stroke="#312e81" stroke-width="4"/>
  <rect x="25" y="37" width="70" height="48" rx="20" fill="#ecfeff"/>
  <g class="m-eyes">
    <circle cx="46" cy="58" r="7.5" fill="#1e1b4b"/><circle cx="74" cy="58" r="7.5" fill="#1e1b4b"/>
    <circle cx="48.5" cy="55.5" r="2.4" fill="#fff"/><circle cx="76.5" cy="55.5" r="2.4" fill="#fff"/>
  </g>
  <circle cx="33" cy="71" r="4.5" fill="#f9a8d4"/><circle cx="87" cy="71" r="4.5" fill="#f9a8d4"/>
  <ellipse class="m-mouth" cx="60" cy="74" rx="9" ry="3.5" fill="#1e1b4b"/>
  <rect x="34" y="102" width="52" height="32" rx="13" fill="#8b5cf6" stroke="#312e81" stroke-width="4"/>
  <text x="60" y="126" text-anchor="middle" font-size="22" font-weight="700" fill="#fff" font-family="Fredoka, sans-serif">${DQ.t ? DQ.t('sym.div') : '÷'}</text>
</svg>`;

  /* ---------- the 4-step recipe: Divide · Multiply · Subtract · Bring down ---------- */
  DQ.recipe = () => [
    { id: 'divide', sym: DQ.t('sym.div') },
    { id: 'multiply', sym: DQ.t('sym.mul') },
    { id: 'subtract', sym: '−' },
    { id: 'bring', sym: '⬇' },
  ].map(r => Object.assign(r, { word: DQ.t('rec.' + r.id), fam: DQ.t('fam.' + r.id), who: DQ.t('who.' + r.id) }));
  DQ.buildDmsb = el => {
    el.classList.add('dmsb');
    el.innerHTML = DQ.recipe().map(r =>
      `<div class="dm-chip dm-${r.id}" data-ph="${r.id}"><span class="dm-sym">${r.sym}</span><span class="dm-word">${r.word}</span><span class="dm-who">${r.who}</span></div>`
    ).join('<span class="dm-arrow">›</span>');
    return ph => DQ.$$('.dm-chip', el).forEach(c => c.classList.toggle('on', c.dataset.ph === ph));
  };
})();
