/* Divide & Conquer — "Pure Practice": calm step-by-step long division on squared paper */
(function () {
  'use strict';
  const DQ = window.DQ;
  const $ = DQ.$;

  const LEVELS = [
    { id: 'starter', name: 'Starter', ex: '84 ÷ 4', tiers: ['t1'] },
    { id: 'leftovers', name: 'Leftovers', ex: '47 ÷ 5', tiers: ['t2'] },
    { id: 'three', name: '3 digits', ex: '756 ÷ 6', tiers: ['t3', 't4'] },
    { id: 'zeros', name: 'Zeros', ex: '618 ÷ 3', tiers: ['t5'] },
    { id: 'four', name: '4 digits', ex: '5832 ÷ 7', tiers: ['t6'] },
    { id: 'expert', name: '÷ 2 digits', ex: '864 ÷ 24', tiers: ['t7', 't8'] },
  ];
  const sess = { solved: 0, correct: 0, wrong: 0, streak: 0 };
  let solver, current = null;

  function level() { return LEVELS.find(l => l.id === DQ.settings.practiceLevel) || LEVELS[0]; }

  function buildLevels() {
    const el = $('#pLevels');
    el.innerHTML = '';
    LEVELS.forEach(l => {
      const b = DQ.h('button', { class: 'lvl-chip' + (l.id === level().id ? ' on' : ''), type: 'button' },
        DQ.h('b', null, l.name), DQ.h('small', null, l.ex));
      b.addEventListener('click', () => {
        DQ.sfx('click');
        DQ.settings.practiceLevel = l.id; DQ.save();
        buildLevels(); next();
      });
      el.appendChild(b);
    });
  }

  function updateStats() {
    $('#psSolved').textContent = sess.solved;
    const tot = sess.correct + sess.wrong;
    $('#psAcc').textContent = tot ? Math.round((sess.correct / tot) * 100) + '%' : '–';
    $('#psStreak').textContent = sess.streak;
  }

  function load(n, d) {
    current = [n, d];
    $('#pCheck').innerHTML = '';
    $('#pCheck').classList.remove('show');
    solver.load(n, d);
  }
  function next() { const [n, d] = DQ.genProblem(level().tiers); load(n, d); }

  function init() {
    const board = new DQ.Board($('#pBoard'), { skin: 'paper', maxCell: 46, minCell: 20, pad: 1, maxHeight: () => (innerWidth < 860 ? innerHeight * 0.4 : 0) });
    solver = new DQ.SolverUI({
      board,
      promptEl: $('#pPrompt'), feedbackEl: $('#pFeedback'), inputEl: $('#pInput'),
      keypadEl: $('#pKeypad'), dmsbEl: $('#pDmsb'), hintBtn: $('#pHint'), showBtn: $('#pShow'),
      hooks: {
        onCorrect: ({ center, assisted }) => {
          if (!assisted) { sess.correct++; DQ.sfx('soft'); DQ.fx.sparkle(center.x, center.y, ['#16a34a', '#86efac', '#fde047']); }
          updateStats();
          DQ.checkAchievements();
        },
        onWrong: () => { sess.wrong++; sess.streak = 0; DQ.sfx('gentleWrong'); updateStats(); },
        onSolved: ({ mistakes, hints, data }) => {
          sess.solved++;
          if (mistakes === 0 && hints === 0) sess.streak++;
          updateStats();
          DQ.recordSolved(data, 'practice');
          const xp = 8 + data.steps.length * 3 - Math.min(6, mistakes * 2 + hints);
          DQ.addXP(xp);
          DQ.sfx('correct');
          const chk = $('#pCheck');
          chk.innerHTML = DQ.checkLine(data);
          chk.classList.add('show');
          const pr = $('#pPrompt');
          pr.insertAdjacentHTML('beforeend', `<div class="solved-extra"><span class="xp-pill">+${xp} XP</span> ${mistakes === 0 && hints === 0 ? '⭐ Perfect — no mistakes!' : ''}</div><button class="btn primary next-btn" type="button">Next problem ▶</button>`);
          pr.querySelector('.next-btn').addEventListener('click', () => { DQ.sfx('click'); next(); });
          if (sess.streak > 0 && sess.streak % 5 === 0) DQ.fx.confetti(90);
          const c = DQ.fx.center($('#pBoard'));
          DQ.fx.burst(c.x, c.y, { count: 26, shape: 'star', size: 7, speed: 220, gravity: 80 });
        },
        onNext: () => next(),
      },
    });
    $('#pNew').addEventListener('click', () => { DQ.sfx('click'); next(); });
    $('#pOwnGo').addEventListener('click', () => {
      const n = parseInt($('#pOwnA').value, 10), d = parseInt($('#pOwnB').value, 10);
      const err = $('#pOwnErr');
      if (!(n >= 1 && n <= 999999)) { err.textContent = 'Dividend: 1 to 999999, please.'; return; }
      if (!(d >= 2 && d <= 99)) { err.textContent = 'Divisor: 2 to 99, please.'; return; }
      if (n < d) { err.textContent = 'The dividend should be bigger than the divisor.'; return; }
      err.textContent = '';
      load(n, d);
    });
    DQ.on('notation', () => { if (current) load(...current); });
    buildLevels();
    updateStats();
  }

  DQ.screens = DQ.screens || {};
  DQ.screens.practice = {
    init,
    enter() {
      if (!current) next(); else solver.board.fit();
      DQ.keyHandler = e => {
        if (/^[0-9]$/.test(e.key) || ['Backspace', 'Enter', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          solver.key(e.key);
        } else if (e.key === 'h' || e.key === 'H') solver.hint();
      };
    },
    leave() {},
  };
})();
