/* Divide & Conquer — "Watch & Learn": an animated, narrated lesson that plays like a video.
   Chapters are little scripts that move things around a chalkboard stage while
   Divvy the robot explains (with a real voice, if the browser supports it). */
(function () {
  'use strict';
  const DQ = window.DQ;
  const $ = DQ.$;
  const t = (k, p) => DQ.t(k, p);
  const W = 960, H = 540;
  const stage = $('#stage'), wrap = $('#stageWrap'), caption = $('#caption'), overlay = $('#stageOverlay');
  const L = { gen: 0, paused: false, playing: false, chapter: 0, started: false, custom: null };
  const speed = () => DQ.settings.speed || 1;
  let mascot = null;

  /* ---------- timing primitives that respect pause / skip ---------- */
  class Cancelled extends Error {}
  const check = g => { if (g !== L.gen) throw new Cancelled(); };
  async function gate(g) { check(g); while (L.paused) { await DQ.sleep(80); check(g); } }
  async function wait(ms, g) {
    let tt = 0;
    await gate(g);
    while (tt < ms) { await DQ.sleep(40); await gate(g); tt += 40 * speed(); }
  }

  const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
  function toSpeech(html) {
    let s = plain(html);
    if (DQ.lang() === 'de') {
      s = s.replace(/(\d)\s*:\s*(\d)/g, '$1 geteilt durch $2').replace(/·/g, ' mal ').replace(/−/g, ' minus ')
        .replace(/\+/g, ' plus ').replace(/=/g, ' gleich ');
    } else {
      s = s.replace(/÷/g, ' divided by ').replace(/×/g, ' times ').replace(/−/g, ' minus ')
        .replace(/\+/g, ' plus ').replace(/=/g, ' equals ').replace(/(\d)\s*R\s*(\d)/g, '$1 remainder $2');
    }
    return s.replace(/\p{Extended_Pictographic}/gu, '').replace(/[⬇↻✔✓→️]/g, '').replace(/\s+/g, ' ').trim();
  }

  async function say(html, g, after = 250) {
    await gate(g);
    caption.innerHTML = html;
    caption.classList.remove('in'); void caption.offsetWidth; caption.classList.add('in');
    if (mascot) mascot.classList.add('talking');
    try {
      if (DQ.settings.voice && DQ.speech.supported) {
        const text = toSpeech(html);
        for (;;) {
          const box = { state: 'speaking' };
          DQ.speech.speak(text, speed()).then(() => { if (box.state === 'speaking') box.state = 'ended'; });
          while (box.state === 'speaking') {
            await DQ.sleep(80);
            if (g !== L.gen) { box.state = 'cancel'; DQ.speech.cancel(); throw new Cancelled(); }
            if (L.paused) { box.state = 'paused'; DQ.speech.cancel(); }
          }
          if (box.state === 'ended') break;
          if (mascot) mascot.classList.remove('talking');
          await gate(g); // wait for resume, then repeat the sentence
          if (mascot) mascot.classList.add('talking');
        }
      } else {
        await wait(Math.max(1600, plain(html).length * 55), g);
      }
    } finally { if (mascot) mascot.classList.remove('talking'); }
    await wait(after, g);
  }

  function stageToScreen(x, y) {
    const r = stage.getBoundingClientRect();
    const s = r.width / W;
    return { x: r.left + x * s, y: r.top + y * s };
  }

  /* ---------- the stage API every chapter script gets ---------- */
  function api(g) {
    const S = {
      g,
      say: (txt, a) => say(txt, g, a),
      wait: ms => wait(ms, g),
      el(html, x, y, cls = '') {
        const e = DQ.h('div', { class: 'st-el ' + cls, html });
        e.style.left = x + 'px'; e.style.top = y + 'px';
        stage.appendChild(e);
        return e;
      },
      async move(e, x, y, ms = 600, ease = 'cubic-bezier(.5,0,.3,1.3)') {
        const d = ms / speed();
        e.style.transition = `left ${d}ms ${ease}, top ${d}ms ${ease}, transform ${d}ms, opacity ${d}ms`;
        e.style.left = x + 'px'; e.style.top = y + 'px';
        await wait(ms, g);
      },
      async clear() {
        Array.from(stage.children).forEach(c => c.classList.add('st-out'));
        await wait(380, g);
        stage.innerHTML = '';
      },
      async title(text, sub) {
        const e = S.el(`<div class="tc-sub">${sub || ''}</div><div class="tc-title">${text}</div>`, W / 2, H / 2, 'title-card');
        DQ.sfx('whoosh');
        await wait(1800, g);
        e.classList.add('st-out');
        await wait(400, g);
        e.remove();
      },
      async equation(parts, y) {
        const row = S.el('', W / 2, y, 'eq-row');
        for (const p of parts) {
          const span = DQ.h('span', { class: 'eq-part ' + (p.cls || '') }, DQ.h('span', { class: 'eq-t' }, p.t));
          if (p.label) span.appendChild(DQ.h('span', { class: 'eq-label', html: p.label }));
          row.appendChild(span);
          DQ.sfx('pop');
          await wait(280, g);
        }
        return row;
      },
      burstAt(x, y, o) { const p = stageToScreen(x, y); DQ.fx.burst(p.x, p.y, o); },
      sparkleAt(x, y) { const p = stageToScreen(x, y); DQ.fx.sparkle(p.x, p.y); },
    };
    return S;
  }
  const chap = n => t('learn.chapter', { n });

  /* ---------- reusable scenes ---------- */
  async function shareScene(S, total, groups) {
    const people = ['🧒', '👧', '👦', '🧑'];
    const gx = i => (W * (i + 1)) / (groups + 1);
    const kids = [];
    for (let i = 0; i < groups; i++) {
      kids.push(S.el(`<div class="kid-plate"></div><div class="kid-face">${people[i]}</div><div class="kid-count"></div>`, gx(i), 455, 'kid st-pop'));
      DQ.sfx('pop');
      await S.wait(160);
    }
    const cookies = [];
    const perRow = Math.min(total, 7);
    for (let c = 0; c < total; c++) {
      const x = W / 2 + ((c % perRow) - (perRow - 1) / 2) * 54;
      const y = 80 + Math.floor(c / perRow) * 54;
      cookies.push(S.el('🍪', x, y, 'cookie st-pop'));
      await S.wait(45);
    }
    return { kids, cookies, gx };
  }
  async function deal(S, sc, total, groups) {
    const per = Math.floor(total / groups);
    for (let c = 0; c < per * groups; c++) {
      const i = c % groups, slot = Math.floor(c / groups);
      const x = sc.gx(i) + ((slot % 3) - 1) * 36;
      const y = 372 - Math.floor(slot / 3) * 32;
      S.move(sc.cookies[c], x, y, 420);
      DQ.sfx('pop');
      await S.wait(c < groups * 2 ? 420 : 180);
    }
    await S.wait(500);
    sc.kids.forEach(k => { k.querySelector('.kid-count').textContent = per; k.classList.add('counted'); });
    DQ.sfx('correct');
  }

  /* Narrates a full long division on a chalkboard, step by step */
  async function narrate(S, n, d, opts = {}) {
    const bar = S.el('', W / 2, 34, 'stage-dmsb');
    const setPh = DQ.buildDmsb(bar);
    const host = S.el('', W / 2, 295, 'stage-board');
    const board = new DQ.Board(host, { skin: 'chalk', maxCell: 52, maxHeight: 440, pad: 0.5 });
    const D = board.setProblem(n, d);
    const NS = D.steps.length;

    await S.say(opts.intro || t('n.intro', { n, d }));
    if (opts.explainLayout !== false) await S.say(t(board.style === 'bracket' ? 'n.layoutBracket' : 'n.layoutColon', { n, d }));
    for (let k = 0; k < NS; k++) {
      const st = D.steps[k];
      const p = { d, p: st.partial, q: st.q, pr: st.product, q1: st.q + 1, pr1: (st.q + 1) * d, r: st.rem };
      if (k === 0) {
        board.clearMarks(); board.markPartial(0);
        if (st.endCol > 0) await S.say(t('n.firstSmall', Object.assign({ digits: D.digits.slice(0, st.endCol).join('') }, p)));
        else await S.say(t('n.first', p));
      }
      setPh('divide'); board.clearMarks(); board.markPartial(k); board.mark('divisor', 'hl2');
      await S.say(t(st.q === 0 ? 'n.divZero' : 'n.div', p));
      board.show('q' + k); DQ.sfx('pop');
      await S.wait(450);
      if (k === 0 && st.endCol > 0 && board.style === 'bracket') await S.say(t('n.above', { x: D.digits[st.endCol] }));
      setPh('multiply'); board.clearMarks(); board.mark('q' + k, 'hl2'); board.mark('divisor', 'hl2');
      await S.say(t('n.mul', p));
      board.show('p' + k); DQ.sfx('pop');
      await S.wait(450);
      setPh('subtract'); board.clearMarks(); board.markPartial(k); board.mark('p' + k, 'hl2');
      await S.say(t('n.sub', p));
      board.show('r' + k); DQ.sfx('pop');
      await S.wait(450);
      if (k < NS - 1) {
        setPh('bring'); board.clearMarks(); board.markNextDigit(k);
        await S.say(t('n.bring', { x: st.brought }), 0);
        DQ.sfx('bring');
        await board.bringDown(k, 750 / speed());
        await S.wait(350);
      }
    }
    setPh(null); board.clearMarks();
    await S.say(D.remainder ? t('n.doneRem', { r: D.remainder }) : t('n.doneNoRem'));
    board.show('R');
    D.steps.forEach((s, i) => board.mark('q' + i, 'hl2'));
    DQ.sfx('correct');
    const c = DQ.fx.center(host);
    DQ.fx.sparkle(c.x, c.y);
    await S.say(`<b>${n} ${DQ.div()} ${d} = ${D.quotient}${D.remainder ? ' ' + DQ.remText(D.remainder) : ''}</b> 🎉`);
    return board;
  }

  /* ---------- the chapters ---------- */
  const CH = [
    {
      id: 'what', icon: '🍪',
      async run(S) {
        await S.title(t('ch.what'), chap(1));
        await S.say(t('c1.s1'));
        const sc = await shareScene(S, 12, 3);
        await S.say(t('c1.s2'));
        await S.say(t('c1.s3'), 50);
        await deal(S, sc, 12, 3);
        await S.say(t('c1.s4'));
        await S.clear();
        const eq = await S.equation([
          { t: '12', cls: 'c-dividend', label: t('lbl.dividend') }, { t: DQ.div() },
          { t: '3', cls: 'c-divisor', label: t('lbl.divisor') }, { t: '=' },
          { t: '4', cls: 'c-quot', label: t('lbl.quot') },
        ], 220);
        await S.say(t('c1.s5'));
        eq.classList.add('labels-on'); DQ.sfx('whoosh');
        await S.say(t('c1.s6'));
      },
    },
    {
      id: 'leftovers', icon: '🧁',
      async run(S) {
        await S.title(t('c2.card'), chap(2));
        const sc = await shareScene(S, 14, 3);
        await S.say(t('c2.s1'), 50);
        await deal(S, sc, 14, 3);
        sc.cookies.slice(12).forEach(c => c.classList.add('leftover'));
        await S.say(t('c2.s2'));
        await S.say(t('c2.s3'));
        await S.clear();
        const eq = await S.equation([
          { t: '14', cls: 'c-dividend' }, { t: DQ.div() }, { t: '3', cls: 'c-divisor' }, { t: '=' },
          { t: '4', cls: 'c-quot' }, { t: DQ.remText(2), cls: 'c-rem', label: t('lbl.rem') },
        ], 220);
        eq.classList.add('labels-on');
        await S.say(t('c2.s4'));
        await S.say(t('c2.s5'));
      },
    },
    {
      id: 'tens', icon: '🧱',
      async run(S) {
        await S.title(t('c3.card'), chap(3));
        await S.say(t('c3.s1'));
        const rods = [], cubes = [];
        for (let i = 0; i < 7; i++) { rods.push(S.el('', 250 + i * 34, 130, 'rod st-pop')); DQ.sfx('tick'); await S.wait(90); }
        for (let j = 0; j < 2; j++) { cubes.push(S.el('', 560 + j * 30, 170, 'cube st-pop')); DQ.sfx('tick'); await S.wait(90); }
        const lt = S.el(t('c3.tens', { n: 7 }), 352, 222, 'st-label st-pop');
        const lo = S.el(t('c3.ones', { n: 2 }), 575, 222, 'st-label st-pop');
        await S.say(t('c3.s2'));
        const gx = [180, 480, 780];
        gx.forEach((x, i) => S.el(`<span>${t('learn.group', { n: i + 1 })}</span>`, x, 425, 'grp-box st-pop'));
        await S.say(t('c3.s3'), 50);
        for (let i = 0; i < 6; i++) {
          const gi = i % 3, slot = Math.floor(i / 3);
          S.move(rods[i], gx[gi] - 78 + slot * 28, 418, 520);
          DQ.sfx('pop');
          await S.wait(330);
        }
        await S.wait(400);
        lt.innerHTML = t('c3.tensLeft', { n: 1 });
        rods[6].classList.add('wiggle');
        await S.say(t('c3.s4'));
        await S.say(t('c3.s5'), 50);
        const rx = parseFloat(rods[6].style.left), ry = parseFloat(rods[6].style.top);
        S.burstAt(rx, ry, { count: 40, colors: ['#fde047', '#fff', '#93c5fd'], speed: 300, gravity: 200 });
        DQ.sfx('explode');
        rods[6].remove();
        for (let j = 0; j < 10; j++) cubes.push(S.el('', rx, ry - 54 + j * 12, 'cube st-pop'));
        await S.wait(450);
        lt.innerHTML = t('c3.tensLeft', { n: 0 });
        for (let j = 0; j < 12; j++) S.move(cubes[j], 470 + (j % 6) * 28, 145 + Math.floor(j / 6) * 28, 500);
        await S.wait(550);
        lo.innerHTML = t('c3.ones', { n: 12 }); lo.classList.add('glow');
        await S.say(t('c3.s6'));
        await S.say(t('c3.s7'), 50);
        for (let j = 0; j < 12; j++) {
          const gi = j % 3, slot = Math.floor(j / 3);
          S.move(cubes[j], gx[gi] + 22 + (slot % 2) * 26, 405 + Math.floor(slot / 2) * 26, 450);
          DQ.sfx('pop');
          await S.wait(170);
        }
        await S.wait(500);
        gx.forEach(x => S.el('<b>24</b>', x, 330, 'st-badge st-pop'));
        DQ.sfx('correct');
        await S.say(t('c3.s8'));
        await S.say(t('c3.s9'));
      },
    },
    {
      id: 'recipe', icon: '📜',
      async run(S) {
        await S.title(t('ch.recipe'), chap(4));
        await S.say(t('c4.s1'));
        const xs = [150, 370, 590, 810];
        const cards = [];
        const rec = DQ.recipe();
        for (let i = 0; i < 4; i++) {
          const r = rec[i];
          const card = S.el(`<div class="rc-sym">${r.sym}</div><div class="rc-word">${r.word}</div><div class="rc-who">${r.who} ${r.fam}</div>`, xs[i], -140, `recipe-card rc-${r.id}`);
          cards.push(card);
          S.move(card, xs[i], 240, 700, 'cubic-bezier(.3,1.5,.5,1)');
          DQ.sfx('whoosh');
          await S.say(t('c4.l' + (i + 1)));
        }
        S.el(t('c4.loop'), W / 2, 440, 'loop-banner st-pop');
        DQ.sfx('powerup');
        await S.say(t('c4.s2'));
        for (const c of cards) { c.classList.add('bounce'); DQ.sfx('pop'); await S.wait(260); }
        await S.say(t('c4.s3'));
      },
    },
    {
      id: 'paper1', icon: '✏️',
      async run(S) {
        await S.title(t('c5.card'), chap(5));
        await narrate(S, 72, 3, { intro: t('c5.intro') });
        await S.say(t('c5.after'));
      },
    },
    {
      id: 'paper2', icon: '📝',
      async run(S) {
        await S.title(t('c6.card'), chap(6));
        await narrate(S, 935, 4, { intro: t('c6.intro'), explainLayout: false });
      },
    },
    {
      id: 'small', icon: '🔍',
      async run(S) {
        await S.title(t('ch.small'), chap(7));
        await narrate(S, 156, 6, { intro: t('c7.intro'), explainLayout: false });
      },
    },
    {
      id: 'zero', icon: '0️⃣',
      async run(S) {
        await S.title(t('ch.zero'), chap(8));
        await narrate(S, 618, 3, { intro: t('c8.intro'), explainLayout: false });
        await S.say(t('c8.after'));
      },
    },
    {
      id: 'check', icon: '✔️',
      async run(S) {
        await S.title(t('ch.check'), chap(9));
        await S.say(t('c9.s1'));
        const dv = DQ.div(), ml = DQ.mul();
        S.el(`935 ${dv} 4 = <span class="c-quot">233</span> <span class="c-rem">${DQ.remText(3)}</span>`, W / 2, 90, 'big-eq st-pop');
        await S.say(t('c9.s2'));
        S.el(`<span class="c-quot">233</span> ${ml} <span class="c-divisor">4</span> = 932`, W / 2, 220, 'big-eq st-pop');
        await S.say(t('c9.s3'));
        S.el('932 + <span class="c-rem">3</span> = <b>935</b>', W / 2, 330, 'big-eq st-pop');
        await S.say(t('c9.s4'));
        S.el('✔', 760, 330, 'big-check st-pop');
        DQ.sfx('correct');
        S.sparkleAt(760, 330);
        await S.say(t('c9.s5'));
        await S.say(t('c9.s6'));
      },
    },
    {
      id: 'turn', icon: '🚀',
      async run(S) {
        await S.title(t('ch.turn'), chap(10));
        DQ.fx.confetti(140);
        DQ.sfx('levelup');
        S.el(`<div class="turn-title">${t('c10.title')}</div>
          <div class="turn-btns"><a class="btn big primary" href="#practice">${t('c10.practice')}</a><a class="btn big arcade" href="#arcade">${t('c10.arcade')}</a></div>`, W / 2, 270, 'turn-box st-pop');
        await S.say(t('c10.s1'));
      },
    },
  ];
  DQ.LESSON_COUNT = CH.length;
  const chTitle = c => t('ch.' + c.id);

  /* ---------- player UI ---------- */
  const list = $('#chapterList'), segs = $('#progressSegs');
  function buildList() {
    list.innerHTML = `<div class="ch-head">${t('learn.chapters')}</div>`;
    CH.forEach((c, i) => {
      const b = DQ.h('button', { class: 'ch-item', type: 'button', 'data-i': i },
        DQ.h('span', { class: 'ch-num' }, String(i + 1)),
        DQ.h('span', { class: 'ch-icon' }, c.icon),
        DQ.h('span', { class: 'ch-title' }, chTitle(c)),
        DQ.h('span', { class: 'ch-done' }, '✔'));
      b.addEventListener('click', () => { DQ.sfx('click'); playFrom(i); });
      list.appendChild(b);
    });
    segs.innerHTML = CH.map((c, i) => `<button class="seg" data-i="${i}" title="${DQ.esc(chTitle(c))}"></button>`).join('');
    DQ.$$('.seg', segs).forEach(s => s.addEventListener('click', () => playFrom(+s.dataset.i)));
  }
  function updateUI() {
    DQ.$$('.ch-item', list).forEach((b, i) => {
      b.classList.toggle('active', i === L.chapter && !L.custom);
      b.classList.toggle('done', !!DQ.profile.watched[CH[i].id]);
    });
    DQ.$$('.seg', segs).forEach((s, i) => {
      s.classList.toggle('active', i === L.chapter && !L.custom);
      s.classList.toggle('done', !!DQ.profile.watched[CH[i].id]);
    });
    $('#cPlay').textContent = L.playing && !L.paused ? '⏸' : '▶';
    $('#cVoice').textContent = DQ.settings.voice ? '🔊' : '🔇';
    $('#cSpeed').textContent = speed() + '×';
    wrap.classList.toggle('paused', L.paused);
  }
  function markWatched(id) {
    if (!DQ.profile.watched[id]) {
      DQ.profile.watched[id] = Date.now();
      DQ.stat('chapters');
      DQ.addXP(20);
      const r = caption.getBoundingClientRect();
      DQ.fx.floatText(r.left + r.width / 2, r.top, '+20 XP', { cls: 'xp' });
    }
    DQ.checkAchievements();
    updateUI();
  }

  async function playFrom(i) {
    L.gen++;
    const g = L.gen;
    DQ.speech.cancel();
    L.custom = null;
    L.chapter = DQ.clamp(i, 0, CH.length - 1);
    L.paused = false; L.playing = true; L.started = true;
    overlay.classList.add('hidden');
    stage.innerHTML = '';
    updateUI();
    try {
      await CH[L.chapter].run(api(g));
      markWatched(CH[L.chapter].id);
      if (L.chapter < CH.length - 1) {
        await wait(1400, g);
        playFrom(L.chapter + 1);
      } else { L.playing = false; updateUI(); }
    } catch (e) {
      if (!(e instanceof Cancelled)) console.error(e);
    }
  }

  async function playCustom(n, d) {
    L.gen++;
    const g = L.gen;
    DQ.speech.cancel();
    L.custom = [n, d];
    L.paused = false; L.playing = true; L.started = true;
    overlay.classList.add('hidden');
    stage.innerHTML = '';
    updateUI();
    try {
      const S = api(g);
      await S.title(`${n} ${DQ.div()} ${d}`, t('learn.ownTitle'));
      await narrate(S, n, d, {});
      DQ.addXP(10);
      L.playing = false; updateUI();
    } catch (e) { if (!(e instanceof Cancelled)) console.error(e); }
  }

  function togglePlay() {
    if (!L.playing) {
      if (L.custom) playCustom(...L.custom); else playFrom(L.chapter);
      return;
    }
    L.paused = !L.paused;
    if (L.paused) DQ.speech.cancel();
    updateUI();
  }
  function stopAll() {
    L.gen++;
    DQ.speech.cancel();
    L.playing = false; L.paused = false;
    if (mascot) mascot.classList.remove('talking');
  }

  function fitStage() {
    const s = wrap.clientWidth / W;
    stage.style.transform = `scale(${s})`;
  }

  /* ---------- wiring ---------- */
  function init() {
    mascot = $('#capMascot .mascot');
    buildList();
    if (window.ResizeObserver) new ResizeObserver(fitStage).observe(wrap); else addEventListener('resize', fitStage);
    fitStage();
    $('#bigPlay').addEventListener('click', () => { DQ.sfx('click'); togglePlay(); });
    $('#cPlay').addEventListener('click', () => { DQ.sfx('click'); togglePlay(); });
    $('#cPrev').addEventListener('click', () => { DQ.sfx('click'); playFrom(L.custom ? L.chapter : L.chapter - 1); });
    $('#cNext').addEventListener('click', () => { DQ.sfx('click'); playFrom(L.custom ? L.chapter : L.chapter + 1); });
    $('#cVoice').addEventListener('click', () => {
      DQ.settings.voice = !DQ.settings.voice;
      if (!DQ.settings.voice) DQ.speech.cancel();
      DQ.save(); updateUI();
    });
    $('#cSpeed').addEventListener('click', () => {
      const sp = [0.75, 1, 1.25, 1.5];
      DQ.settings.speed = sp[(sp.indexOf(speed()) + 1) % sp.length];
      DQ.save(); updateUI();
    });
    wrap.addEventListener('click', e => {
      if (e.target.closest('a,button')) return;
      if (L.playing) togglePlay();
    });
    $('#ownGo').addEventListener('click', () => {
      const n = parseInt($('#ownDividend').value, 10), d = parseInt($('#ownDivisor').value, 10);
      const err = $('#ownErr');
      if (!(n >= 1 && n <= 999999)) { err.textContent = t('err.dividend'); return; }
      if (!(d >= 2 && d <= 99)) { err.textContent = t('err.divisor'); return; }
      if (n < d) { err.textContent = t('err.order'); return; }
      err.textContent = '';
      wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
      playCustom(n, d);
    });
    updateUI();
  }

  DQ.screens = DQ.screens || {};
  DQ.screens.learn = {
    init,
    enter() {
      fitStage();
      updateUI();
      if (!L.started) { overlay.classList.remove('hidden'); $('#overlayLabel').textContent = t('learn.play'); }
      DQ.keyHandler = e => {
        if (e.key === ' ') { e.preventDefault(); togglePlay(); }
        else if (e.key === 'ArrowRight') playFrom(L.chapter + 1);
        else if (e.key === 'ArrowLeft') playFrom(L.chapter - 1);
      };
    },
    leave() {
      if (L.playing) {
        stopAll();
        stage.innerHTML = '';
        overlay.classList.remove('hidden');
        $('#overlayLabel').textContent = L.custom ? t('learn.replay') : t('learn.continue', { n: L.chapter + 1 });
        caption.innerHTML = t('learn.welcomeBack');
      }
      updateUI();
    },
  };
})();
