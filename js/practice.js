/* Divide & Conquer — "Pure Practice": calm step-by-step long division on squared paper */
(function () {
  'use strict';
  const DQ = window.DQ;
  const $ = DQ.$;

  const t = (k, p) => DQ.t(k, p);
  const LEVELS = [
    { id: 'starter', ex: [84, 4], tiers: ['t1'] },
    { id: 'leftovers', ex: [47, 5], tiers: ['t2'] },
    { id: 'three', ex: [756, 6], tiers: ['t3', 't4'] },
    { id: 'zeros', ex: [618, 3], tiers: ['t5'] },
    { id: 'four', ex: [5832, 7], tiers: ['t6'] },
    { id: 'expert', ex: [864, 24], tiers: ['t7', 't8'] },
  ];
  const sess = { solved: 0, correct: 0, wrong: 0, streak: 0 };
  let solver, current = null;

  function level() { return LEVELS.find(l => l.id === DQ.settings.practiceLevel) || LEVELS[0]; }

  function buildLevels() {
    const el = $('#pLevels');
    el.innerHTML = '';
    LEVELS.forEach(l => {
      const b = DQ.h('button', { class: 'lvl-chip' + (l.id === level().id ? ' on' : ''), type: 'button' },
        DQ.h('b', null, t('lvl.' + l.id)), DQ.h('small', null, `${l.ex[0]} ${DQ.div()} ${l.ex[1]}`));
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
          pr.insertAdjacentHTML('beforeend', `<div class="solved-extra"><span class="xp-pill">+${xp} ${t('xp')}</span> ${mistakes === 0 && hints === 0 ? t('p.perfect') : ''}</div><button class="btn primary next-btn" type="button">${t('p.next')}</button>`);
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
      if (!(n >= 1 && n <= 999999)) { err.textContent = t('err.dividend'); return; }
      if (!(d >= 2 && d <= 99)) { err.textContent = t('err.divisor'); return; }
      if (n < d) { err.textContent = t('err.order'); return; }
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
