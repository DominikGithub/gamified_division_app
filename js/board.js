/* Divide & Conquer — the long-division "paper" board.
   Lays out every digit a pupil would write in a fixed grid, exactly like
   squared exercise-book paper, and reveals it piece by piece.
   Two notations:  bracket  (  4 ⟌ 935 , quotient on top)
                   colon    (  935 : 4 = 233 , quotient on the right)       */
(function () {
  'use strict';
  const DQ = window.DQ;
  const STATIC = ['static', 'divisor', 'dividend', 'sym'];

  class Board {
    constructor(host, opts = {}) {
      this.host = host;
      this.opts = Object.assign({ maxCell: 54, minCell: 18, skin: 'paper', pad: 1, maxHeight: null }, opts);
      host.classList.add('dboard', 'skin-' + this.opts.skin);
      host.innerHTML = '';
      this.inner = DQ.h('div', { class: 'dboard-inner' });
      host.appendChild(this.inner);
      this.groups = {}; this.meta = {}; this.temp = []; this.data = null; this.slotEl = null;
      if (window.ResizeObserver) { this.ro = new ResizeObserver(() => this.fit()); this.ro.observe(host); }
      else addEventListener('resize', () => this.fit());
    }

    setProblem(dividend, divisor, style) {
      this.style = style || DQ.settings.notation || 'colon';
      const data = (this.data = DQ.longDivision(dividend, divisor));
      this.inner.innerHTML = '';
      this.inner.className = 'dboard-inner style-' + this.style;
      this.groups = {}; this.meta = {}; this.temp = []; this.slotEl = null; this.cellSize = 0;
      const n = data.digits.length, ds = String(data.divisor), m = ds.length, S = data.steps.length;
      const remStr = data.remainder ? DQ.remText(data.remainder) : '';
      let dcol, qrow, drow, work, qcol, Rpos, cols;

      if (this.style === 'colon') {
        dcol = i => 1 + i; qrow = 0; drow = 0; work = 1;
        const colon = n + 1, eq = colon + m + 1, q0 = eq + 1;
        this.cell('sym', 0, colon, ':', 'sym');
        ds.split('').forEach((c, i) => this.cell('divisor', 0, colon + 1 + i, c, 'divisor'));
        this.cell('sym', 0, eq, '=', 'sym');
        qcol = k => q0 + k;
        Rpos = { r: 0, c: q0 + S + 0.3 };
        cols = q0 + S + (remStr ? remStr.length * 0.62 + 0.5 : 0.2);
      } else {
        dcol = i => m + 1 + i; qrow = 0; drow = 1; work = 2;
        ds.split('').forEach((c, i) => this.cell('divisor', drow, i, c, 'divisor'));
        this.add('static', DQ.h('div', { class: 'dbracket' }), { r: drow, c: m + 0.6, w: n + 0.5 });
        qcol = k => dcol(data.steps[k].endCol);
        Rpos = { r: 0, c: dcol(n - 1) + 1.25 };
        cols = dcol(n - 1) + 1 + (remStr ? remStr.length * 0.62 + 0.7 : 0.2);
      }
      this.dcol = dcol; this.drow = drow;

      data.digits.forEach((dg, i) => { this.cell('dividend', drow, dcol(i), dg, 'dividend').dataset.di = i; });

      data.steps.forEach((st, k) => {
        const pr = work + 2 * k, rr = pr + 1;
        // quotient digit
        this.cell('q' + k, qrow, qcol(k), st.q, 'quot');
        this.meta['q' + k] = { r: qrow, right: qcol(k), len: 1 };
        // product with minus sign and the subtraction line
        const ps = String(st.product);
        const pInfo = DQ.partialInfo(data, k);
        const pLeft = st.endCol - ps.length + 1;
        const minusCol = dcol(pLeft) - 1;
        this.cell('p' + k, pr, minusCol, '−', 'minus');
        ps.split('').forEach((c, j) => this.cell('p' + k, pr, dcol(pLeft + j), c, 'prod'));
        const lineStart = Math.min(minusCol, dcol(pInfo.left));
        this.add('p' + k, DQ.h('div', { class: 'dline' }), { r: pr, c: lineStart, w: dcol(st.endCol) - lineStart + 1 });
        this.meta['p' + k] = { r: pr, right: dcol(st.endCol), len: ps.length };
        // remainder of this step
        const rs = String(st.rem);
        rs.split('').forEach((c, j) => this.cell('r' + k, rr, dcol(st.endCol - rs.length + 1 + j), c, k === S - 1 ? 'rem final' : 'rem'));
        this.meta['r' + k] = { r: rr, right: dcol(st.endCol), len: rs.length };
        // the digit that gets brought down next to it
        if (k < S - 1) {
          this.add('b' + k, DQ.h('div', { class: 'darrow' }), { c: dcol(st.endCol + 1), r: drow + 1, h: rr - drow - 1 });
          this.cell('b' + k, rr, dcol(st.endCol + 1), st.brought, 'brought');
        }
      });
      if (remStr) this.cell('R', Rpos.r, Rpos.c, remStr, 'rlabel');

      this.cols = cols;
      this.rows = work + 2 * S;
      Object.keys(this.groups).forEach(g => { if (!STATIC.includes(g)) this.groups[g].forEach(el => el.classList.add('gh')); });
      this.fit();
      return data;
    }

    cell(group, r, c, text, cls) {
      return this.add(group, DQ.h('div', { class: 'dcell ' + (cls || ''), style: `--r:${r};--c:${c}` }, String(text)));
    }
    add(group, el, pos) {
      if (pos) for (const k in pos) el.style.setProperty('--' + k, pos[k]);
      el.dataset.g = group;
      (this.groups[group] = this.groups[group] || []).push(el);
      this.inner.appendChild(el);
      return el;
    }

    fit() {
      if (!this.data) return;
      const pad = this.opts.pad;
      const cs = getComputedStyle(this.host);
      const avail = this.host.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
      if (avail <= 0) return;
      let cell = Math.floor(avail / (this.cols + pad * 2));
      const mh = typeof this.opts.maxHeight === 'function' ? this.opts.maxHeight() : this.opts.maxHeight;
      if (mh > 0) cell = Math.min(cell, Math.floor(mh / (this.rows + pad * 2)));
      cell = DQ.clamp(cell, this.opts.minCell, this.opts.maxCell);
      const s = this.inner.style;
      s.setProperty('--cell', cell + 'px');
      s.setProperty('--pad', pad);
      s.width = Math.ceil((this.cols + pad * 2) * cell) + 'px';
      s.height = (this.rows + pad * 2) * cell + 'px';
      this.cellSize = cell;
    }

    /* ----- revealing ----- */
    show(group, anim = true) {
      (this.groups[group] || []).forEach((el, i) => {
        el.classList.remove('gh');
        if (anim) {
          el.classList.remove('pop'); void el.offsetWidth;
          el.style.animationDelay = i * 45 + 'ms';
          el.classList.add('pop');
        }
      });
    }
    shown(group) { const g = this.groups[group]; return !!(g && g.length && !g[0].classList.contains('gh')); }
    showAll() { Object.keys(this.groups).forEach(g => this.show(g, false)); }

    /* ----- highlighting ----- */
    mark(group, cls = 'hl') {
      (this.groups[group] || []).forEach(el => {
        if (el.classList.contains('dcell') && !el.classList.contains('minus')) el.classList.add(cls);
      });
    }
    markPartial(k, cls = 'hl') {
      const st = this.data.steps[k];
      if (k === 0) this.groups.dividend.forEach(el => { if (+el.dataset.di <= st.endCol) el.classList.add(cls); });
      else { this.mark('r' + (k - 1), cls); this.mark('b' + (k - 1), cls); }
    }
    markNextDigit(k, cls = 'hl3') {
      const i = this.data.steps[k].endCol + 1;
      this.groups.dividend.forEach(el => { if (+el.dataset.di === i) el.classList.add(cls); });
    }
    clearMarks() { this.inner.querySelectorAll('.hl,.hl2,.hl3').forEach(el => el.classList.remove('hl', 'hl2', 'hl3')); }

    /* ----- answer slot + digits being typed ----- */
    setSlot(group) {
      this.clearSlot();
      const m = this.meta[group]; if (!m) return;
      this.slotEl = DQ.h('div', { class: 'dslot', style: `--r:${m.r};--c:${m.right - m.len + 1};--w:${m.len}` });
      this.inner.appendChild(this.slotEl);
    }
    clearSlot() { if (this.slotEl) { this.slotEl.remove(); this.slotEl = null; } }
    setPending(group, str) {
      this.clearPending();
      const m = this.meta[group]; if (!m || !str) return;
      for (let j = 0; j < str.length; j++) {
        const el = DQ.h('div', { class: 'dcell pending', style: `--r:${m.r};--c:${m.right - (str.length - 1 - j)}` }, str[j]);
        this.inner.appendChild(el); this.temp.push(el);
      }
    }
    clearPending() { this.temp.forEach(e => e.remove()); this.temp = []; }

    /* ----- the "bring down" animation: the digit slides down the page ----- */
    async bringDown(k, ms = 650) {
      const st = this.data.steps[k];
      const i = st.endCol + 1;
      const src = this.groups.dividend.find(el => +el.dataset.di === i);
      const grp = this.groups['b' + k] || [];
      const tgt = grp.find(el => el.classList.contains('dcell'));
      const arrow = grp.find(el => el.classList.contains('darrow'));
      if (!src || !tgt) return;
      src.classList.add('used');
      if (arrow) { arrow.classList.remove('gh'); arrow.classList.add('grow'); }
      const ghost = DQ.h('div', { class: 'dcell flying', style: `--r:${src.style.getPropertyValue('--r')};--c:${src.style.getPropertyValue('--c')}` }, src.textContent);
      this.inner.appendChild(ghost);
      const dy = (parseFloat(tgt.style.getPropertyValue('--r')) - parseFloat(src.style.getPropertyValue('--r'))) * (this.cellSize || 40);
      void ghost.offsetWidth;
      ghost.style.transition = `transform ${ms}ms cubic-bezier(.55,0,.35,1.2)`;
      ghost.style.transform = `translateY(${dy}px)`;
      await DQ.sleep(ms);
      ghost.remove();
      this.show('b' + k);
    }

    groupCenter(group) {
      const els = (this.groups[group] || []).filter(e => e.classList.contains('dcell'));
      if (!els.length) return DQ.fx.center(this.host);
      let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
      els.forEach(e => {
        const q = e.getBoundingClientRect();
        l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
      });
      return { x: (l + r) / 2, y: (t + b) / 2 };
    }
  }
  DQ.Board = Board;
})();
