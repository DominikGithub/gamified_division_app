/* Divide & Conquer — the interactive step-by-step tutor.
   Walks the pupil through Divide → Multiply → Subtract → Bring down,
   checks every answer and gives kind, specific feedback. Shared by
   Pure Practice and the Arcade.                                        */
(function () {
  'use strict';
  const DQ = window.DQ;
  const t = (k, p) => DQ.t(k, p);
  const NEXT = { divide: 'multiply', multiply: 'subtract' };

  class SolverUI {
    constructor(o) {
      this.o = o;
      this.board = o.board;
      this.hooks = o.hooks || {};
      this.value = '';
      this.data = null;
      if (o.keypadEl) this.buildKeypad(o.keypadEl);
      this.setDmsb = o.dmsbEl ? DQ.buildDmsb(o.dmsbEl) : () => {};
      if (o.hintBtn) o.hintBtn.addEventListener('click', () => this.hint());
      if (o.showBtn) o.showBtn.addEventListener('click', () => this.reveal());
    }

    buildKeypad(el) {
      el.classList.add('keypad');
      el.innerHTML = '';
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Backspace', '0', 'Enter'].forEach(k => {
        const label = k === 'Backspace' ? '⌫' : k === 'Enter' ? '✓' : k;
        const b = DQ.h('button', { class: 'kp' + (k === 'Enter' ? ' kp-enter' : k === 'Backspace' ? ' kp-back' : ''), 'data-k': k, type: 'button' }, label);
        b.addEventListener('click', () => this.key(k));
        el.appendChild(b);
      });
      this.enterBtn = el.querySelector('.kp-enter');
    }

    load(dividend, divisor) {
      this.board.setProblem(dividend, divisor);
      this.data = this.board.data;
      this.k = 0; this.phase = 'divide';
      this.mistakes = 0; this.hints = 0; this.tries = 0; this.hintLevel = 0;
      this.busy = false; this.done = false; this.value = '';
      this.questions = this.data.steps.length * 3;
      this.startTime = performance.now();
      if (this.o.feedbackEl) { this.o.feedbackEl.innerHTML = ''; this.o.feedbackEl.className = 'feedback'; }
      this.render();
    }

    get st() { return this.data.steps[this.k]; }
    get isLast() { return this.k === this.data.steps.length - 1; }
    expected() {
      const st = this.st;
      return this.phase === 'divide' ? st.q : this.phase === 'multiply' ? st.product : this.phase === 'subtract' ? st.rem : null;
    }
    group(phase = this.phase) {
      return { divide: 'q', multiply: 'p', subtract: 'r' }[phase] + this.k;
    }
    label(ph) {
      const r = DQ.recipe().find(x => x.id === ph);
      return `<span class="ph ph-${ph}">${r.sym} ${r.word}</span>`;
    }

    render() {
      const b = this.board, st = this.st, d = this.data.divisor, ph = this.phase;
      b.clearMarks(); b.clearSlot(); b.clearPending();
      let html = '';
      if (ph === 'divide') {
        b.markPartial(this.k); b.mark('divisor', 'hl2'); b.setSlot(this.group());
        let note = '';
        if (this.k === 0 && st.endCol > 0) note = `<div class="pnote">${t('q.small', { digits: this.data.digits.slice(0, st.endCol).join(''), d, p: st.partial })}</div>`;
        html = `${this.label('divide')} ${t('q.divide', { d, p: st.partial })}${note}`;
      } else if (ph === 'multiply') {
        b.mark('q' + this.k, 'hl2'); b.mark('divisor', 'hl2'); b.setSlot(this.group());
        html = `${this.label('multiply')} <b class="c-quot">${st.q}</b> ${DQ.mul()} <b class="c-divisor">${d}</b> = ?`;
      } else if (ph === 'subtract') {
        b.markPartial(this.k); b.mark('p' + this.k, 'hl2'); b.setSlot(this.group());
        html = `${this.label('subtract')} <b class="c-partial">${st.partial}</b> − <b>${st.product}</b> = ?`;
      } else if (ph === 'bring') {
        b.markNextDigit(this.k);
        html = `${this.label('bring')} ${t('q.bring', { x: st.brought })}<br><button class="btn primary bring-btn" type="button">${t('q.bringBtn')}</button>`;
      }
      const pe = this.o.promptEl;
      if (pe) {
        pe.innerHTML = html;
        const bb = pe.querySelector('.bring-btn');
        if (bb) bb.addEventListener('click', () => this.bring());
        pe.classList.remove('swap'); void pe.offsetWidth; pe.classList.add('swap');
      }
      this.setDmsb(ph);
      this.updateInput();
      if (this.enterBtn) this.enterBtn.textContent = ph === 'bring' ? '⬇' : '✓';
      if (this.o.keypadEl) this.o.keypadEl.classList.toggle('bring-mode', ph === 'bring');
    }

    updateInput() {
      const ie = this.o.inputEl;
      if (ie) {
        ie.textContent = this.phase === 'bring' ? '⬇' : this.value || '?';
        ie.classList.toggle('empty', !this.value);
      }
      if (['divide', 'multiply', 'subtract'].includes(this.phase)) this.board.setPending(this.group(), this.value);
    }

    key(k) {
      if (!this.data || this.busy) return;
      if (this.done) { if (k === 'Enter' && this.hooks.onNext) this.hooks.onNext(); return; }
      if (this.phase === 'bring') { if (k === 'Enter' || k === 'ArrowDown' || k === ' ') this.bring(); return; }
      if (/^[0-9]$/.test(k)) {
        if (this.value.length < 6) { this.value = (this.value === '0' ? '' : this.value) + k; DQ.sfx('key'); this.updateInput(); }
      } else if (k === 'Backspace') {
        this.value = this.value.slice(0, -1); this.updateInput();
      } else if (k === 'Enter') this.submit();
    }

    submit() {
      if (this.value === '') { this.say(t('q.typeFirst'), 'info'); return; }
      const v = parseInt(this.value, 10);
      if (v === this.expected()) this.correct(false);
      else this.wrong(v);
    }

    say(html, kind = 'info') {
      const fe = this.o.feedbackEl; if (!fe) return;
      fe.innerHTML = html;
      fe.className = 'feedback show ' + kind;
      if (kind === 'bad') { fe.classList.remove('wiggle'); void fe.offsetWidth; fe.classList.add('wiggle'); }
    }

    correct(assisted) {
      const g = this.group(), phase = this.phase;
      this.board.clearPending(); this.board.clearSlot();
      this.board.show(g);
      this.tries = 0; this.hintLevel = 0; this.value = '';
      if (!assisted) {
        DQ.stat('correct');
        this.say(`✅ ${DQ.pick(t('praise'))}`, 'good');
      } else this.say(t('q.shown'), 'info');
      const center = this.board.groupCenter(g);
      if (phase === 'subtract') this.phase = this.isLast ? 'done' : 'bring';
      else this.phase = NEXT[phase];
      if (this.hooks.onCorrect) this.hooks.onCorrect({ phase, group: g, center, assisted, solver: this });
      if (this.phase === 'done') this.finish();
      else this.render();
    }

    wrong(v) {
      this.mistakes++; this.tries++;
      DQ.stat('wrong');
      const st = this.st, d = this.data.divisor, p = st.partial;
      let msg = '';
      if (this.phase === 'divide') {
        if (v > st.q) msg = st.q === 0 ? t('fb.divTooBigZero', { d, p }) : t('fb.divTooBig', { v, d, vd: v * d, p });
        else msg = t('fb.divTooSmall', { v, d, vd: v * d, p, diff: p - v * d });
      } else if (this.phase === 'multiply') {
        msg = t('fb.mul', { q: st.q, d, v });
      } else {
        msg = t('fb.sub', { p, pr: st.product, v });
        if (v >= d && v < p) msg += t('fb.subTip', { d });
      }
      this.value = '';
      this.updateInput();
      if (this.tries >= 2) msg += `<div class="hint-inline">💡 ${this.hintText(Math.min(this.tries - 1, 2))}</div>`;
      this.say('❌ ' + msg, 'bad');
      if (this.hooks.onWrong) this.hooks.onWrong({ phase: this.phase, value: v, tries: this.tries, solver: this });
    }

    hintText(level) {
      const st = this.st, d = this.data.divisor, p = st.partial;
      if (this.phase === 'divide') {
        if (st.q === 0) return t('h.divZero', { d, p });
        const list = [];
        for (let i = 1; i <= st.q + 1 && i <= 10; i++) list.push(i * d);
        if (level < 2) return t('h.div1', { d, p, list: list.slice(0, Math.min(3, list.length)).join(', ') });
        return t('h.div2', { d, list: list.map((x, i) => (i === st.q ? `<s>${x}</s>` : x)).join(', '), next: (st.q + 1) * d, q: st.q });
      }
      if (this.phase === 'multiply') {
        if (st.q === 0) return t('h.mulZero');
        if (level < 2) return t('h.mul1', { q: st.q, d });
        return `${st.q} ${DQ.mul()} ${d} = <b>${st.product}</b>`;
      }
      if (this.phase === 'subtract') {
        if (level < 2) return t('h.sub1', { pr: st.product, p });
        return `${p} − ${st.product} = <b>${st.rem}</b>`;
      }
      return t('h.bring');
    }

    hint() {
      if (!this.data || this.done || this.busy) return;
      if (this.phase === 'bring') { this.say('💡 ' + t('h.bring'), 'info'); return; }
      if (this.hooks.beforeHint && !this.hooks.beforeHint(this)) return;
      this.hints++;
      this.hintLevel = Math.min(2, this.hintLevel + 1);
      this.say('💡 ' + this.hintText(this.hintLevel), 'info');
      if (this.hooks.onHint) this.hooks.onHint(this);
    }

    reveal() {
      if (!this.data || this.done || this.busy) return;
      if (this.phase === 'bring') { this.bring(); return; }
      this.hints++;
      this.correct(true);
    }

    async bring() {
      if (this.busy || this.phase !== 'bring') return;
      this.busy = true;
      DQ.sfx('bring');
      if (this.o.promptEl) { const bb = this.o.promptEl.querySelector('.bring-btn'); if (bb) bb.disabled = true; }
      this.board.clearMarks();
      await this.board.bringDown(this.k);
      this.k++;
      this.phase = 'divide';
      this.busy = false;
      if (this.hooks.onBring) this.hooks.onBring(this);
      this.render();
    }

    finish() {
      this.done = true;
      const b = this.board, D = this.data;
      b.clearMarks(); b.clearSlot(); b.clearPending();
      b.show('R');
      D.steps.forEach((s, i) => b.mark('q' + i, 'hl2'));
      const ans = `${D.quotient}${D.remainder ? ` <span class="c-rem">${DQ.remText(D.remainder)}</span>` : ''}`;
      if (this.o.promptEl) this.o.promptEl.innerHTML = `<span class="ph ph-done">${t('q.solved')}</span> ${D.dividend} ${DQ.div()} ${D.divisor} = <b class="c-quot">${ans}</b>`;
      this.setDmsb(null);
      if (this.enterBtn) this.enterBtn.textContent = '▶';
      if (this.o.inputEl) this.o.inputEl.textContent = '✓';
      const time = (performance.now() - this.startTime) / 1000;
      if (this.hooks.onSolved) this.hooks.onSolved({ mistakes: this.mistakes, hints: this.hints, time, data: D, solver: this });
    }
  }

  /* The check ("Probe"): quotient × divisor + remainder = dividend */
  DQ.checkLine = D => {
    const prod = D.quotient * D.divisor, m = DQ.mul();
    return D.remainder
      ? `${t('check')} <b class="c-quot">${D.quotient}</b> ${m} <b class="c-divisor">${D.divisor}</b> = ${prod}, &nbsp;${prod} + <b class="c-rem">${D.remainder}</b> = <b>${D.dividend}</b> ✔`
      : `${t('check')} <b class="c-quot">${D.quotient}</b> ${m} <b class="c-divisor">${D.divisor}</b> = <b>${D.dividend}</b> ✔`;
  };

  DQ.SolverUI = SolverUI;
})();
