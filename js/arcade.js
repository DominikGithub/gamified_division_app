/* Divide & Conquer — ARCADE QUEST
   Campaign with 6 worlds + bosses, Meteor Storm, Daily Challenge, Shop, Trophies.
   Every correct long-division step fires your ship's laser at the monster. */
(function () {
  'use strict';
  const DQ = window.DQ, $ = DQ.$, FX = DQ.fx, P = DQ.profile;
  const root = $('#arcadeRoot'), screenEl = $('#screen-arcade');
  const A = { view: null, booted: false, active: false, battle: null, meteor: null, mood: 'menu', cleanup: [] };

  /* ================= WORLDS ================= */
  const WORLDS = [
    { planet: '🪐', colors: ['#22d3ee', '#6366f1'], tiers: [['t1'], ['t1'], ['t1'], ['t1']], boss: { emoji: '🦖', tiers: ['t1', 't1', 't2'] }, monsters: [['🐛'], ['🐌'], ['🦀'], ['🐸']], charge: 50, attack: '💧' },
    { planet: '🌊', colors: ['#2dd4bf', '#0ea5e9'], tiers: [['t2'], ['t2'], ['t1', 't2'], ['t2']], boss: { emoji: '🐙', tiers: ['t2', 't2', 't3', 't2'] }, monsters: [['🐡'], ['🦑'], ['🦞'], ['🐊']], charge: 50, attack: '💦' },
    { planet: '🏔️', colors: ['#a78bfa', '#f472b6'], tiers: [['t3'], ['t3', 't4'], ['t4'], ['t4']], boss: { emoji: '🦍', tiers: ['t3', 't4', 't4', 't4'] }, monsters: [['🐐'], ['🦅'], ['🐻'], ['🐺']], charge: 55, attack: '🪨' },
    { planet: '🕳️', colors: ['#94a3b8', '#8b5cf6'], tiers: [['t5'], ['t5'], ['t4', 't5'], ['t5']], boss: { emoji: '👻', tiers: ['t5', 't5', 't5', 't6'] }, monsters: [['🦇'], ['🕷️'], ['🐍'], ['💀']], charge: 55, attack: '⭕' },
    { planet: '🌕', colors: ['#facc15', '#f97316'], tiers: [['t6'], ['t6'], ['t5', 't6'], ['t6']], boss: { emoji: '👽', tiers: ['t6', 't6', 't6', 't6'] }, monsters: [['👾'], ['🛸'], ['🤖'], ['🧟']], charge: 60, attack: '⚡' },
    { planet: '🌋', colors: ['#f43f5e', '#f97316'], tiers: [['t7'], ['t7'], ['t7', 't8'], ['t8']], boss: { emoji: '🐉', tiers: ['t7', 't8', 't8'] }, monsters: [['🦂'], ['🐲'], ['👹'], ['🔥']], charge: 70, attack: '🔥' },
  ];
  const T = (k, p) => DQ.t(k, p);
  WORLDS.forEach((w, i) => {
    Object.defineProperty(w, 'name', { get: () => T(`w${i + 1}.name`) });
    Object.defineProperty(w, 'desc', { get: () => T(`w${i + 1}.desc`) });
  });
  const TOTAL_LEVELS = WORLDS.length * 5;

  function levelDef(idx) {
    const wi = Math.floor(idx / 5), j = idx % 5, w = WORLDS[wi], boss = j === 4;
    return {
      idx, world: wi, boss, label: `${wi + 1}-${j + 1}`,
      name: boss ? T(`boss${wi + 1}`) : T(`mon${wi + 1}_${j}`),
      emoji: boss ? w.boss.emoji : w.monsters[j][0],
      attack: w.attack,
      tiers: boss ? w.boss.tiers : w.tiers[j],
      hearts: 5,
      charge: w.charge - (boss ? 10 : 0),
      makeProblems() {
        return boss ? this.tiers.map(t => DQ.genProblem([t])) : [0, 1, 2].map(() => DQ.genProblem(this.tiers));
      },
    };
  }
  function dailyDef() {
    return {
      daily: true, boss: true, label: '📅', name: T('a.dailyBoss'), emoji: '🐲', attack: '🔥', hearts: 5, charge: 60,
      makeProblems() {
        const rng = DQ.makeRng(DQ.hashStr('daily-' + DQ.todayKey()));
        return ['t2', 't3', 't5', 't6', 't7'].map(t => DQ.TIERS[t].gen(rng));
      },
    };
  }
  const unlocked = idx => idx === 0 || (P.campaign[idx - 1] || 0) > 0;
  const totalStars = () => Object.values(P.campaign).reduce((a, b) => a + b, 0);
  const shipRot = () => (P.equipped.ship === 'rocket' ? 45 : 0);
  const laserColor = () => DQ.laser().colors[0];
  const dailyDone = () => P.daily.date === DQ.todayKey() && P.daily.done;

  function applyTheme() {
    const t = DQ.theme();
    screenEl.style.setProperty('--n1', t.vars[0]);
    screenEl.style.setProperty('--n2', t.vars[1]);
    screenEl.style.setProperty('--n3', t.vars[2]);
    screenEl.style.setProperty('--sky1', t.sky[0]);
    screenEl.style.setProperty('--sky2', t.sky[1]);
  }

  /* ================= SYNTHWAVE BACKGROUND ================= */
  const bg = $('#arcadeBg'), bx = bg.getContext('2d');
  let bgRun = false, bgW = 0, bgH = 0;
  const stars = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random() * 0.62, s: Math.random() * 1.6 + 0.3, p: Math.random() * 6 }));
  function bgResize() {
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    bgW = innerWidth; bgH = innerHeight;
    bg.width = Math.max(1, bgW * dpr); bg.height = Math.max(1, bgH * dpr);
    bx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', () => { if (bgRun) bgResize(); });
  function bgFrame(now) {
    if (!bgRun) return;
    const w = bgW, h = bgH, t = DQ.theme();
    const hz = h * 0.62;
    const boss = A.mood === 'boss';
    const sky = bx.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, t.sky[0]); sky.addColorStop(1, boss ? '#4a0010' : t.sky[1]);
    bx.fillStyle = sky; bx.fillRect(0, 0, w, hz);
    // stars
    for (const s of stars) {
      bx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(now / 900 + s.p));
      bx.fillStyle = '#fff';
      bx.fillRect(s.x * w, s.y * hz, s.s, s.s);
    }
    bx.globalAlpha = 1;
    // striped sun
    const R = Math.min(w, h) * 0.17, cxs = w / 2, cys = hz - R * 0.25;
    const sg = bx.createLinearGradient(0, cys - R, 0, cys + R);
    sg.addColorStop(0, boss ? '#ff5f5f' : t.vars[2]); sg.addColorStop(1, boss ? '#7f1d1d' : t.vars[1]);
    bx.save();
    bx.beginPath(); bx.rect(0, 0, w, hz); bx.clip();
    bx.shadowColor = boss ? '#ef4444' : t.vars[1]; bx.shadowBlur = 50;
    bx.fillStyle = sg; bx.beginPath(); bx.arc(cxs, cys, R, 0, Math.PI * 2); bx.fill();
    bx.shadowBlur = 0;
    bx.fillStyle = boss ? '#4a0010' : t.sky[1];
    for (let i = 0; i < 7; i++) {
      const yy = cys + R * 0.05 + i * R * 0.15, hh = 2 + i * 1.6;
      bx.fillRect(cxs - R, yy, R * 2, hh);
    }
    bx.restore();
    // floor grid
    const fl = bx.createLinearGradient(0, hz, 0, h);
    fl.addColorStop(0, '#120320'); fl.addColorStop(1, '#05010c');
    bx.fillStyle = fl; bx.fillRect(0, hz, w, bgH - hz);
    bx.strokeStyle = boss ? '#ef4444' : t.vars[0];
    bx.shadowColor = bx.strokeStyle; bx.shadowBlur = 8;
    bx.lineWidth = 1.2;
    bx.globalAlpha = 0.55;
    const sp = { menu: 0.12, battle: 0.3, boss: 0.55, storm: 0.45 }[A.mood] || 0.2;
    const off = ((now / 1000) * sp) % 1;
    for (let i = 0; i < 16; i++) {
      const p = Math.pow((i + off) / 16, 2.2);
      const y = hz + (h - hz) * p;
      bx.beginPath(); bx.moveTo(0, y); bx.lineTo(w, y); bx.stroke();
    }
    for (let i = -18; i <= 18; i++) {
      bx.beginPath(); bx.moveTo(cxs + i * 6, hz); bx.lineTo(cxs + i * w * 0.09, h); bx.stroke();
    }
    bx.shadowBlur = 0; bx.globalAlpha = 1;
    // horizon glow
    const hg = bx.createLinearGradient(0, hz - 30, 0, hz + 30);
    hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(0.5, (boss ? '#ef4444' : t.vars[1]) + '88'); hg.addColorStop(1, 'rgba(0,0,0,0)');
    bx.fillStyle = hg; bx.fillRect(0, hz - 30, w, 60);
    requestAnimationFrame(bgFrame);
  }
  function startBg() { if (!bgRun) { bgRun = true; bgResize(); requestAnimationFrame(bgFrame); } }
  function stopBg() { bgRun = false; }

  /* ================= COMMON UI ================= */
  function head(title, back = 'menu') {
    return `<div class="a-head">
      <button class="a-btn ghost" data-go="${back}" type="button">${T('a.back')}</button>
      <div class="a-title">${title}</div>
      <div class="a-head-r"><span class="a-coins">🪙 <b>${DQ.fmt(P.coins)}</b></span></div>
    </div>`;
  }
  function bindCommon(scope = root) {
    DQ.$$('[data-go]', scope).forEach(b => b.addEventListener('click', () => { DQ.sfx('click'); go(b.dataset.go); }));
  }
  function refreshCoins() { DQ.$$('.a-coins b', root).forEach(b => { b.textContent = DQ.fmt(P.coins); }); }
  DQ.on('profile', () => { if (A.active) refreshCoins(); });

  function aModal(html, o = {}) {
    const m = DQ.h('div', { class: 'a-modal ' + (o.cls || '') }, DQ.h('div', { class: 'a-modal-box', html }));
    root.appendChild(m);
    requestAnimationFrame(() => m.classList.add('in'));
    const close = () => { m.classList.remove('in'); setTimeout(() => m.remove(), 250); if (o.onClose) o.onClose(); };
    if (o.dismissable) m.addEventListener('click', e => { if (e.target === m) { DQ.sfx('click'); close(); } });
    m.close = close;
    return m;
  }

  function cleanupView() {
    A.cleanup.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    A.cleanup = [];
    A.battle = null; A.meteor = null;
    root.innerHTML = '';
  }
  function go(view, arg) {
    cleanupView();
    A.view = view;
    window.scrollTo({ top: 0 });
    const v = { boot: viewBoot, menu: viewMenu, map: viewMap, shop: viewShop, trophies: viewTrophies, meteor: viewMeteor, daily: () => startBattle(dailyDef()) }[view];
    (v || viewMenu)(arg);
  }

  /* ================= BOOT ================= */
  function viewBoot() {
    A.mood = 'menu';
    root.innerHTML = `<div class="a-boot">
      <div class="a-logo glitch" data-text="${T('a.logo')}">${T('a.logo')}</div>
      <div class="a-sub">${T('a.sub')}</div>
      <div class="a-parade"><span>🚀</span><span>👾</span><span>☄️</span><span>🐉</span><span>👑</span></div>
      <button class="a-start" type="button">${T('a.start')}</button>
      <div class="a-hint">${T('a.anyKey')}</div>
    </div>`;
    const start = () => {
      if (A.view !== 'boot') return;
      A.booted = true;
      DQ.sfx('powerup');
      FX.flash('rgba(255,255,255,.5)');
      go('menu');
    };
    root.querySelector('.a-start').addEventListener('click', start);
    DQ.keyHandler = e => { if (!e.repeat) start(); };
  }

  /* ================= MENU ================= */
  function viewMenu() {
    A.mood = 'menu';
    const pct = Math.round((P.xp / DQ.xpNeeded(P.level)) * 100);
    const inv = DQ.SHOP.items.map(it => `<span class="inv" title="${it.name}">${it.icon}<b>${P.items[it.id] || 0}</b></span>`).join('');
    const ach = Object.keys(P.achievements).length;
    root.innerHTML = `<div class="a-wrap">
      <div class="a-pilot">
        <div class="a-pilot-ship" style="--rot:${shipRot()}deg">${DQ.shipIcon()}</div>
        <div class="a-pilot-info">
          <div class="a-rank">${DQ.rankTitle(P.level)}</div>
          <div class="a-lv">${T('a.pilotLevel', { n: P.level })}</div>
          <div class="a-xp"><i style="width:${pct}%"></i></div>
        </div>
        <div class="a-inv">${inv}</div>
        <span class="a-coins">🪙 <b>${DQ.fmt(P.coins)}</b></span>
      </div>
      <div class="a-logo small glitch" data-text="${T('a.sub')}">${T('a.sub')}</div>
      <div class="a-tiles">
        <button class="a-tile t-campaign" data-go="map" type="button"><span class="t-ico">🗺️</span><span class="t-name">${T('a.campaign')}</span><span class="t-sub">${T('a.campaignSub', { s: totalStars(), t: TOTAL_LEVELS * 3 })}</span></button>
        <button class="a-tile t-meteor" data-go="meteor" type="button"><span class="t-ico">☄️</span><span class="t-name">${T('a.meteor')}</span><span class="t-sub">${T('a.best', { n: DQ.fmt(P.best.meteor) })}</span></button>
        <button class="a-tile t-daily ${dailyDone() ? 'done' : ''}" data-go="daily" type="button"><span class="t-ico">📅</span><span class="t-name">${T('a.daily')}</span><span class="t-sub">${dailyDone() ? T('a.dailyDone') : T('a.dailyBonus')}</span></button>
        <button class="a-tile t-shop" data-go="shop" type="button"><span class="t-ico">🛒</span><span class="t-name">${T('a.shop')}</span><span class="t-sub">${T('a.shopSub')}</span></button>
        <button class="a-tile t-trophy" data-go="trophies" type="button"><span class="t-ico">🏆</span><span class="t-name">${T('a.trophies')}</span><span class="t-sub">${T('a.trophiesSub', { n: ach, t: DQ.ACHIEVEMENTS.length })}</span></button>
      </div>
      <div class="a-tip">💬 ${DQ.pick(T('tips'))}</div>
    </div>`;
    bindCommon();
    const tiles = DQ.$$('.a-tile', root);
    let sel = 0;
    const focus = () => tiles.forEach((t, i) => t.classList.toggle('kfocus', i === sel));
    DQ.keyHandler = e => {
      if (['ArrowRight', 'ArrowDown'].includes(e.key)) { sel = (sel + 1) % tiles.length; focus(); DQ.sfx('tick'); }
      else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) { sel = (sel - 1 + tiles.length) % tiles.length; focus(); DQ.sfx('tick'); }
      else if (e.key === 'Enter') { e.preventDefault(); tiles[sel].click(); }
    };
  }

  /* ================= CAMPAIGN MAP ================= */
  function viewMap() {
    A.mood = 'menu';
    const worlds = WORLDS.map((w, wi) => {
      const first = wi * 5;
      const locked = !unlocked(first);
      const nodes = [0, 1, 2, 3, 4].map(j => {
        const idx = first + j, st = P.campaign[idx] || 0, open = unlocked(idx), boss = j === 4;
        const ico = open ? (boss ? w.boss.emoji : w.monsters[j][0]) : '🔒';
        return `<button class="m-node ${boss ? 'boss' : ''} ${open ? 'open' : 'locked'} ${st ? 'cleared' : ''} ${open && !st ? 'current' : ''}" data-lvl="${idx}" ${open ? '' : 'disabled'} type="button">
          <span class="mn-ico">${ico}</span><span class="mn-lbl">${boss ? T('a.boss') : `${wi + 1}-${j + 1}`}</span>
          <span class="mn-stars">${'★'.repeat(st)}<i>${'★'.repeat(3 - st)}</i></span></button>`;
      }).join('<span class="m-link"></span>');
      const wStars = [0, 1, 2, 3, 4].reduce((a, j) => a + (P.campaign[first + j] || 0), 0);
      return `<div class="m-world ${locked ? 'locked' : ''}" style="--wc1:${w.colors[0]};--wc2:${w.colors[1]}">
        <div class="mw-planet">${w.planet}</div>
        <div class="mw-info"><div class="mw-num">${T('a.world', { n: wi + 1, s: wStars })}</div><div class="mw-name">${w.name}</div><div class="mw-desc">${w.desc}</div></div>
        <div class="mw-nodes">${nodes}</div>
      </div>`;
    }).join('');
    root.innerHTML = head(T('a.campaign')) + `<div class="a-map">${worlds}</div>`;
    bindCommon();
    DQ.$$('.m-node.open', root).forEach(n => n.addEventListener('click', () => { DQ.sfx('click'); brief(+n.dataset.lvl); }));
    const cur = root.querySelector('.m-node.current');
    if (cur) setTimeout(() => cur.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    DQ.keyHandler = e => {
      if (e.key === 'Escape') go('menu');
      else if (e.key === 'Enter' && cur) cur.click();
    };
  }

  function brief(idx) {
    const L = levelDef(idx);
    const st = P.campaign[idx] || 0;
    const m = aModal(`<div class="a-brief ${L.boss ? 'boss' : ''}">
      ${L.boss ? `<div class="warn-banner">${T('a.warn')}</div>` : ''}
      <div class="br-lvl">${T('a.level', { l: L.label })} · ${WORLDS[L.world].name.toUpperCase()}</div>
      <div class="br-monster">${L.emoji}</div>
      <div class="br-name">${L.name}</div>
      <div class="br-info">${T('a.problems', { n: L.boss ? L.tiers.length : 3, tier: DQ.tierLabel(L.tiers[0]) })}</div>
      <div class="br-stars">${'★'.repeat(st)}<i>${'★'.repeat(3 - st)}</i></div>
      <div class="br-btns"><button class="a-btn ghost br-x" type="button">✕</button><button class="a-btn big go" type="button">${T('a.fight')}</button></div>
    </div>`, { dismissable: true });
    if (L.boss) { DQ.sfx('boss'); setTimeout(() => DQ.sfx('warn'), 300); FX.shake(m.querySelector('.a-modal-box')); }
    else DQ.sfx('whoosh');
    m.querySelector('.br-x').addEventListener('click', () => { DQ.sfx('click'); m.close(); });
    m.querySelector('.go').addEventListener('click', () => { DQ.sfx('powerup'); startBattle(L); });
    const prev = DQ.keyHandler;
    DQ.keyHandler = e => {
      if (e.key === 'Enter') { e.preventDefault(); m.querySelector('.go').click(); }
      else if (e.key === 'Escape') { m.close(); DQ.keyHandler = prev; }
    };
  }

  /* ================= BATTLE ================= */
  const comboWord = c => { const w = T('comboWords'); return w[Math.min(w.length - 1, Math.floor(c / 5) - 1)]; };
  const comboMult = c => Math.min(5, 1 + Math.floor(c / 5));

  function startBattle(def) {
    cleanupView();
    A.view = 'battle';
    window.scrollTo({ top: 0 });
    A.mood = def.boss ? 'boss' : 'battle';
    const problems = def.makeProblems();
    const hpMax = problems.reduce((a, [n, d]) => a + DQ.longDivision(n, d).steps.length * 3, 0);
    const B = (A.battle = {
      def, problems, pi: 0, hearts: def.hearts, maxHearts: def.hearts, score: 0, combo: 0, maxCombo: 0,
      mistakes: 0, shield: false, double: false, frozen: false, charge: 0, hp: hpMax, hpMax, over: false, paused: false,
    });

    root.innerHTML = `<div class="battle ${def.boss ? 'boss' : ''}">
      <div class="b-hud">
        <button class="a-btn ghost small b-pause" type="button" title="${T('tip.pause')}">⏸</button>
        <div class="b-hearts"></div>
        <div class="b-title">${def.label} · ${def.name}</div>
        <div class="b-score">${T('a.score')} <b>0</b></div>
        <div class="b-combo"><span>${T('a.combo')}</span> <b>x1</b></div>
      </div>
      <div class="b-arena">
        <div class="b-ship" style="--rot:${shipRot()}deg"><span class="ship-emoji">${DQ.shipIcon()}</span><div class="shield-bubble"></div><div class="b-thruster"></div></div>
        <div class="b-vs">${T('a.vs')}</div>
        <div class="b-monster-wrap">
          <div class="b-mname">${def.name}</div>
          <div class="b-hp"><i></i><span></span></div>
          <div class="b-monster">${def.emoji}</div>
          <div class="b-charge" title="${T('a.charge')}"><i></i><span>⚡</span></div>
        </div>
        <div class="b-badges"></div>
      </div>
      <div class="b-main">
        <div class="b-boardcard">
          <div class="b-pinfo">${T('a.problem')} <b>1</b>/${problems.length}</div>
          <div class="b-dmsb"></div>
          <div class="b-board"></div>
        </div>
        <div class="b-ctrl">
          <div class="prompt"></div>
          <div class="feedback"></div>
          <div class="answer-display">?</div>
          <div class="keypad"></div>
          <div class="b-powers"></div>
        </div>
      </div>
    </div>`;
    const el = sel => root.querySelector(sel);
    const ship = el('.b-ship'), mon = el('.b-monster'), arena = el('.b-arena');
    const board = new DQ.Board(el('.b-board'), { skin: 'neon', maxCell: 46, minCell: 18, pad: 0.6, maxHeight: () => (innerWidth < 860 ? innerHeight * 0.34 : 0) });

    const solver = new DQ.SolverUI({
      board, promptEl: el('.prompt'), feedbackEl: el('.feedback'), inputEl: el('.answer-display'),
      keypadEl: el('.keypad'), dmsbEl: el('.b-dmsb'),
      hooks: {
        onCorrect: info => onCorrect(info),
        onWrong: () => { if (B.over) return; B.combo = 0; B.mistakes++; DQ.sfx('wrong'); hud(); monsterAttack(); },
        onSolved: info => onSolved(info),
      },
    });
    B.solver = solver;

    function hud() {
      el('.b-hearts').innerHTML = Array.from({ length: B.maxHearts }, (_, i) => `<span class="heart ${i < B.hearts ? '' : 'lost'}">${i < B.hearts ? '❤️' : '🖤'}</span>`).join('');
      el('.b-score b').textContent = DQ.fmt(B.score);
      const cb = el('.b-combo');
      cb.querySelector('b').textContent = `x${comboMult(B.combo)}` + (B.combo >= 2 ? ` · ${B.combo}` : '');
      cb.classList.toggle('fire', B.combo >= 10);
      cb.classList.toggle('hot', B.combo >= 5);
      el('.b-hp i').style.width = (B.hp / B.hpMax) * 100 + '%';
      el('.b-hp span').textContent = `${T('hp')} ${B.hp}/${B.hpMax}`;
      ship.classList.toggle('shielded', B.shield);
      el('.b-badges').innerHTML = (B.double ? `<span class="badge">${T('a.double')}</span>` : '') + (B.frozen ? `<span class="badge ice">${T('a.frozen')}</span>` : '');
      el('.b-charge').classList.toggle('frozen', B.frozen);
      powers();
    }
    function powers() {
      const can = {
        hint: () => !solver.done && solver.phase !== 'bring',
        shield: () => !B.shield,
        heart: () => B.hearts < B.maxHearts,
        freeze: () => !B.frozen,
        double: () => !B.double,
      };
      const box = el('.b-powers');
      box.innerHTML = DQ.SHOP.items.map(it => {
        const n = P.items[it.id] || 0;
        return `<button class="pw" data-pw="${it.id}" ${n > 0 && can[it.id]() ? '' : 'disabled'} title="${it.name}: ${it.desc}" type="button">${it.icon}<b>${n}</b></button>`;
      }).join('');
      DQ.$$('.pw', box).forEach(b => b.addEventListener('click', () => usePower(b.dataset.pw)));
    }
    function usePower(id) {
      if (B.over || !(P.items[id] > 0)) return;
      P.items[id]--; DQ.save();
      DQ.sfx('powerup');
      const c = FX.center(ship);
      if (id === 'hint') { solver.reveal(); FX.sparkle(c.x, c.y); }
      if (id === 'shield') { B.shield = true; FX.ring(c.x, c.y, '#38bdf8', 20, 80); }
      if (id === 'heart') { B.hearts = Math.min(B.maxHearts, B.hearts + 1); FX.burst(c.x, c.y, { texts: ['❤️'], shape: 'text', size: 22, count: 8, speed: 160 }); }
      if (id === 'freeze') { B.frozen = true; B.charge = 0; FX.burst(FX.center(mon).x, FX.center(mon).y, { colors: ['#bae6fd', '#fff', '#38bdf8'], shape: 'star', count: 24 }); }
      if (id === 'double') { B.double = true; FX.floatText(c.x, c.y - 30, T('a.doubleFloat'), { cls: 'gold' }); }
      hud();
    }

    function onCorrect({ center, assisted }) {
      if (B.over) return;
      if (!assisted) {
        B.combo++;
        B.maxCombo = Math.max(B.maxCombo, B.combo);
        DQ.statMax('maxCombo', B.combo);
      }
      const pts = assisted ? 0 : 10 * comboMult(B.combo);
      B.score += pts;
      B.charge = 0;
      const sc = FX.center(ship);
      const col = laserColor();
      FX.sparkle(center.x, center.y, [col === 'rainbow' ? '#f472b6' : col, '#fff']);
      FX.projectile(center.x, center.y, sc.x, sc.y, { color: col === 'rainbow' ? '#f472b6' : col, size: 14, life: 0.28, arc: -30 }).then(() => {
        if (!A.battle || A.battle !== B) return;
        const mc = FX.center(mon);
        ship.classList.remove('fire'); void ship.offsetWidth; ship.classList.add('fire');
        FX.beam(sc.x + 20, sc.y, mc.x - 20, mc.y, { color: col, width: B.combo >= 10 ? 11 : 7 });
        DQ.sfx('laser');
        setTimeout(() => {
          if (A.battle !== B) return;
          DQ.sfx('hit');
          FX.explosion(mc.x, mc.y, { colors: [col === 'rainbow' ? '#fde047' : col, '#fff', '#fde047'] });
          mon.classList.remove('hit'); void mon.offsetWidth; mon.classList.add('hit');
          B.hp = Math.max(0, B.hp - 1);
          if (pts) FX.floatText(mc.x, mc.y - 40, `+${pts}`, { cls: B.combo >= 10 ? 'gold big' : 'gold' });
          if (B.def.boss) FX.shake(arena, 'shake-sm');
          hud();
        }, 110);
      });
      if (!assisted && B.combo > 0 && B.combo % 5 === 0) {
        const w = comboWord(B.combo);
        DQ.sfx('combo', B.combo / 5 * 3);
        FX.banner(`${w}<small>${B.combo} ${T('a.combo')} · x${comboMult(B.combo)}</small>`, { cls: 'combo', ms: 900 });
      }
      hud();
    }

    function monsterAttack(reason) {
      if (B.over) return;
      const mc = FX.center(mon), sc = FX.center(ship);
      mon.classList.remove('attack'); void mon.offsetWidth; mon.classList.add('attack');
      if (reason === 'charge') FX.banner(T('a.tooSlow'), { cls: 'danger', ms: 800 });
      FX.projectile(mc.x - 30, mc.y, sc.x, sc.y, { text: B.def.attack, size: 34, life: 0.5, arc: -70, color: '#f43f5e' }).then(() => {
        if (A.battle !== B || B.over) return;
        if (B.shield) {
          B.shield = false;
          DQ.sfx('shield');
          FX.ring(sc.x, sc.y, '#38bdf8', 26, 90);
          FX.floatText(sc.x, sc.y - 40, T('a.blocked'), { cls: 'ice' });
          hud();
          return;
        }
        B.hearts--;
        DQ.sfx('hurt');
        FX.explosion(sc.x, sc.y, { colors: ['#f43f5e', '#fb923c', '#fff'] });
        FX.flash('rgba(239,68,68,.35)');
        FX.shake(screenEl);
        ship.classList.remove('hurt'); void ship.offsetWidth; ship.classList.add('hurt');
        hud();
        if (B.hearts <= 0) gameOver();
      });
    }

    function onSolved({ mistakes, time, data }) {
      if (B.over) return;
      DQ.recordSolved(data, 'arcade');
      const par = data.steps.length * 3 * 7;
      const speedBonus = Math.max(0, Math.round((par - time) * 3));
      const perfect = mistakes === 0 ? 50 : 0;
      B.score += speedBonus + perfect;
      hud();
      DQ.sfx('correct');
      const extra = [speedBonus ? T('a.speed', { n: speedBonus }) : '', perfect ? T('a.perfect') : ''].filter(Boolean).join(' · ');
      FX.banner(`${T('a.cleared')}${extra ? `<small>${extra}</small>` : ''}`, { cls: 'good', ms: 1000 });
      el('.feedback').innerHTML = `<div class="check-mini">${DQ.checkLine(data)}</div>`;
      el('.feedback').className = 'feedback show good';
      B.pi++;
      if (B.pi >= problems.length) setTimeout(() => { if (A.battle === B) victory(); }, 700);
      else setTimeout(() => { if (A.battle === B && !B.over) nextProblem(); }, 1500);
    }

    function nextProblem() {
      const bc = el('.b-boardcard');
      bc.classList.remove('swap-in'); bc.classList.add('swap-out');
      DQ.sfx('whoosh');
      setTimeout(() => {
        if (A.battle !== B) return;
        B.frozen = false; B.charge = 0;
        const [n, d] = problems[B.pi];
        solver.load(n, d);
        el('.b-pinfo b').textContent = B.pi + 1;
        bc.classList.remove('swap-out'); bc.classList.add('swap-in');
        hud();
      }, 300);
    }

    async function victory() {
      B.over = true;
      const mc = FX.center(mon);
      mon.classList.add('dying');
      DQ.sfx('explode');
      FX.explosion(mc.x, mc.y, { big: true });
      FX.burst(mc.x, mc.y, { texts: [B.def.emoji, '💥', '⭐'], shape: 'text', size: 30, count: 12, speed: 400 });
      FX.shake(screenEl);
      await DQ.sleep(800);
      if (A.battle !== B) return;
      DQ.sfx('victory');
      FX.fireworks(B.def.boss ? 8 : 4);
      const stars = B.mistakes <= 1 ? 3 : B.mistakes <= 3 ? 2 : 1;
      let coins = Math.round(B.score / 10) + (B.def.boss ? 120 : 25);
      if (B.double) coins *= 2;
      const xp = Math.round(B.score / 4) + (B.def.boss ? 60 : 20);
      let bonusText = '';
      let firstClear = false;
      if (B.def.idx != null) {
        const prev = P.campaign[B.def.idx] || 0;
        firstClear = prev === 0;
        P.campaign[B.def.idx] = Math.max(prev, stars);
        DQ.stat('levelsCleared');
        if (stars === 3) DQ.stat('perfectLevels');
        if (B.def.boss) DQ.stat('bosses');
      }
      if (B.def.daily) {
        if (!dailyDone()) { coins += 100; bonusText = T('a.dailyBonusWon'); P.daily = { date: DQ.todayKey(), done: true }; }
        DQ.stat('daily');
      }
      DQ.addCoins(coins);
      DQ.addXP(xp);
      results({ win: true, stars, coins, xp, bonusText, firstClear });
    }

    function gameOver() {
      B.over = true;
      const sc = FX.center(ship);
      ship.classList.add('dying');
      FX.explosion(sc.x, sc.y, { big: true, colors: ['#f43f5e', '#fb923c', '#fde047', '#fff'] });
      DQ.sfx('explode');
      setTimeout(() => DQ.sfx('gameover'), 500);
      const coins = Math.round(B.score / 20), xp = Math.round(B.score / 8);
      DQ.addCoins(coins); DQ.addXP(xp);
      setTimeout(() => { if (A.battle === B) results({ win: false, stars: 0, coins, xp }); }, 1100);
    }

    function results(r) {
      clearInterval(timer);
      const def = B.def;
      const nextIdx = def.idx != null && def.idx + 1 < TOTAL_LEVELS ? def.idx + 1 : null;
      const html = `<div class="a-results ${r.win ? 'win' : 'lose'}">
        <div class="res-title ${r.win ? '' : 'glitch'}" data-text="${r.win ? T('a.victory') : T('a.gameover')}">${r.win ? T('a.victory') : T('a.gameover')}</div>
        ${r.win ? `<div class="res-stars">${[0, 1, 2].map(i => `<span class="rs" data-i="${i}">★</span>`).join('')}</div>` : `<div class="res-sad">${def.emoji}<span>😵</span></div><div class="res-msg">${T('a.loseMsg')}</div>`}
        <div class="res-stats">
          <div><span>${T('a.score')}</span><b class="cnt" data-v="${B.score}">0</b></div>
          <div><span>${T('a.bestCombo')}</span><b>${B.maxCombo}</b></div>
          <div><span>${T('a.mistakes')}</span><b>${B.mistakes}</b></div>
          <div><span>${T('a.coins')}</span><b class="cnt gold" data-v="${r.coins}">0</b></div>
          <div><span>${T('xp')}</span><b class="cnt" data-v="${r.xp}">0</b></div>
        </div>
        ${r.bonusText ? `<div class="res-bonus">${r.bonusText}</div>` : ''}
        ${r.win && def.boss && !def.daily ? `<button class="a-btn big chest-btn" type="button">${T('a.openChest')}</button>` : ''}
        <div class="res-btns">
          ${def.daily ? `<button class="a-btn" data-r="menu" type="button">${T('a.menu')}</button>` : `<button class="a-btn ghost" data-r="map" type="button">${T('a.map')}</button>`}
          <button class="a-btn ghost" data-r="retry" type="button">${T('a.retry')}</button>
          ${r.win && nextIdx != null ? `<button class="a-btn big" data-r="next" type="button">${T('a.next')}</button>` : ''}
        </div>
      </div>`;
      const m = aModal(html, { cls: r.win ? 'win' : 'lose' });
      // count-up numbers
      DQ.$$('.cnt', m).forEach(b => {
        const v = +b.dataset.v, t0 = performance.now();
        const step = now => {
          const k = Math.min(1, (now - t0) / 1100);
          b.textContent = DQ.fmt(v * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      if (r.win) {
        DQ.$$('.rs', m).forEach((s, i) => {
          if (i < r.stars) setTimeout(() => {
            s.classList.add('on'); DQ.sfx('star', i);
            const c = FX.center(s); FX.sparkle(c.x, c.y);
          }, 450 + i * 420);
        });
        setTimeout(() => { const c = FX.center(m.querySelector('.res-stats')); FX.coinsTo(c.x, c.y, Math.min(12, 3 + Math.round(r.coins / 25))); }, 1300);
      }
      const btns = m.querySelector('.res-btns');
      const chestBtn = m.querySelector('.chest-btn');
      if (chestBtn) {
        btns.classList.add('hidden');
        chestBtn.addEventListener('click', () => { chestBtn.remove(); openChest(() => btns.classList.remove('hidden')); });
      }
      DQ.$$('[data-r]', m).forEach(b => b.addEventListener('click', () => {
        DQ.sfx('click');
        const a = b.dataset.r;
        if (a === 'map') go('map');
        else if (a === 'menu') go('menu');
        else if (a === 'retry') startBattle(def);
        else if (a === 'next') { go('map'); brief(nextIdx); }
      }));
      DQ.keyHandler = e => {
        if (e.key !== 'Enter' || (chestBtn && chestBtn.isConnected)) return;
        const nb = m.querySelector('[data-r="next"]') || m.querySelector('[data-r="retry"]');
        if (nb && !btns.classList.contains('hidden')) nb.click();
      };
    }

    function pause() {
      if (B.over || B.paused) return;
      B.paused = true;
      const m = aModal(`<div class="a-pause"><div class="res-title">${T('a.paused')}</div>
        <div class="res-btns col"><button class="a-btn big" data-p="resume" type="button">${T('a.resume')}</button>
        <button class="a-btn ghost" data-p="quit" type="button">${def.daily ? T('a.quitMenu') : T('a.quitMap')}</button></div></div>`);
      const resume = () => { m.close(); B.paused = false; DQ.keyHandler = keys; };
      m.querySelector('[data-p="resume"]').addEventListener('click', () => { DQ.sfx('click'); resume(); });
      m.querySelector('[data-p="quit"]').addEventListener('click', () => { DQ.sfx('click'); go(def.daily ? 'menu' : 'map'); });
      DQ.keyHandler = e => { if (e.key === 'Escape' || e.key === 'Enter') resume(); };
    }
    el('.b-pause').addEventListener('click', () => { DQ.sfx('click'); pause(); });

    // monster charge timer: answer before the bar fills!
    const timer = setInterval(() => {
      if (B.over || B.paused || B.frozen || solver.done || solver.busy || document.hidden) return;
      B.charge += 0.1 / def.charge;
      const bar = el('.b-charge');
      if (!bar) return;
      bar.querySelector('i').style.width = Math.min(100, B.charge * 100) + '%';
      bar.classList.toggle('danger', B.charge > 0.75);
      mon.classList.toggle('angry', B.charge > 0.75);
      if (B.charge >= 1) { B.charge = 0; B.combo = 0; monsterAttack('charge'); hud(); }
    }, 100);
    A.cleanup.push(() => clearInterval(timer));

    const keys = e => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { pause(); return; }
      if (B.paused || B.over) return;
      if (/^[0-9]$/.test(e.key) || ['Backspace', 'Enter', 'ArrowDown', ' '].includes(e.key)) { e.preventDefault(); solver.key(e.key); }
      else if (e.key === 'h' || e.key === 'H') usePower('hint');
    };
    DQ.keyHandler = keys;

    // intro
    const [n0, d0] = problems[0];
    solver.load(n0, d0);
    hud();
    B.paused = true;
    FX.banner(def.boss ? `⚠ ${def.name} ⚠<small>${T('a.bossBattle')}</small>` : `${T('a.level', { l: def.label })}<small>${T('a.ready')}</small>`, { cls: def.boss ? 'danger' : '', ms: 1000 })
      .then(() => { if (A.battle !== B) return; DQ.sfx('powerup'); return FX.banner(T('a.go'), { cls: 'fight', ms: 550 }); })
      .then(() => { if (A.battle === B) B.paused = false; });
    if (def.boss) DQ.sfx('boss');
  }

  /* ================= MYSTERY CHEST ================= */
  function openChest(onDone) {
    const notOwned = [];
    ['ships', 'lasers', 'themes'].forEach(cat => DQ.SHOP[cat].forEach(it => { if (!P.owned[cat].includes(it.id) && it.price <= 500) notOwned.push([cat, it]); }));
    const roll = Math.random();
    let reward;
    if (roll < 0.3 && notOwned.length) {
      const [cat, it] = DQ.pick(notOwned);
      reward = { kind: 'unlock', cat, it, icon: it.icon || (cat === 'lasers' ? '🔫' : '🎨'), text: T(cat === 'ships' ? 'a.newShip' : cat === 'lasers' ? 'a.newLaser' : 'a.newTheme', { n: it.name }) };
    } else if (roll < 0.62) {
      const it = DQ.pick(DQ.SHOP.items);
      reward = { kind: 'item', it, n: 3, icon: it.icon, text: T('a.gotItems', { n: it.name }) };
    } else {
      const n = DQ.randInt(15, 35) * 10;
      reward = { kind: 'coins', n, icon: '🪙', text: T('a.gotCoins', { n }) };
    }
    const m = aModal(`<div class="chest-wrap"><div class="chest-rays"></div><button class="chest" type="button">🎁</button><div class="chest-hint">${T('a.tap3')}</div><div class="chest-reward hidden"></div></div>`, { cls: 'chest-modal' });
    let taps = 0;
    const chest = m.querySelector('.chest');
    const tap = () => {
      taps++;
      chest.classList.remove('shake-chest'); void chest.offsetWidth; chest.classList.add('shake-chest');
      const c = FX.center(chest);
      FX.burst(c.x, c.y, { shape: 'star', count: 10 * taps, colors: ['#fde047', '#fff'], speed: 200 });
      if (taps < 3) { DQ.sfx('rumble'); return; }
      chest.disabled = true;
      DQ.sfx('chest');
      FX.explosion(c.x, c.y, { big: true, colors: ['#fde047', '#f472b6', '#22d3ee', '#fff'] });
      FX.confetti(120);
      chest.textContent = reward.icon;
      chest.classList.add('opened');
      m.querySelector('.chest-hint').classList.add('hidden');
      if (reward.kind === 'unlock') { P.owned[reward.cat].push(reward.it.id); }
      else if (reward.kind === 'item') { P.items[reward.it.id] = (P.items[reward.it.id] || 0) + reward.n; }
      else { P.coins += reward.n; FX.coinsTo(c.x, c.y, 10); }
      DQ.save(); DQ.checkAchievements();
      const rw = m.querySelector('.chest-reward');
      rw.innerHTML = `<div class="cr-text">${reward.text}</div>${reward.kind === 'unlock' ? `<div class="cr-sub">${T('a.equipHint')}</div>` : ''}<button class="a-btn big cr-ok" type="button">${T('a.awesome')}</button>`;
      rw.classList.remove('hidden');
      rw.querySelector('.cr-ok').addEventListener('click', () => { DQ.sfx('click'); m.close(); onDone && onDone(); });
    };
    chest.addEventListener('click', tap);
    const prev = DQ.keyHandler;
    DQ.keyHandler = e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (taps < 3) tap(); else { const ok = m.querySelector('.cr-ok'); if (ok) { ok.click(); DQ.keyHandler = prev; } }
      }
    };
  }

  /* ================= METEOR STORM ================= */
  function viewMeteor() {
    A.mood = 'storm';
    root.innerHTML = `<div class="meteor">
      <div class="m-hud">
        <button class="a-btn ghost small" data-go="menu" type="button">◀</button>
        <div class="m-lives"></div>
        <div class="m-stat">${T('a.score')} <b class="m-score">0</b></div>
        <div class="m-stat">${T('m.wave')} <b class="m-wave">1</b></div>
        <div class="m-stat m-combo">x<b>1</b></div>
        <div class="m-stat dim">${T('m.best')} <b>${DQ.fmt(P.best.meteor)}</b></div>
      </div>
      <div class="m-arena">
        <canvas class="m-canvas"></canvas>
        <div class="m-overlay">
          <div class="m-o-title">${T('m.title')}</div>
          <div class="m-o-text">${T('m.text')}</div>
          <button class="a-btn big m-go" type="button">${T('m.start')}</button>
        </div>
      </div>
      <div class="m-ctrl">
        <div class="m-input">?</div>
        <div class="m-keys">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(k => `<button class="kp" data-k="${k}" type="button">${k}</button>`).join('')}<button class="kp kp-back" data-k="Backspace" type="button">⌫</button><button class="kp kp-enter" data-k="Enter" type="button">${T('m.fire')}</button></div>
      </div>
    </div>`;
    bindCommon();
    const el = s => root.querySelector(s);
    const cv = el('.m-canvas'), cx = cv.getContext('2d'), arena = el('.m-arena');
    const M = (A.meteor = { meteors: [], lives: 3, score: 0, wave: 1, kills: 0, combo: 0, value: '', spawnT: 1, slowT: 0, running: false, last: 0, w: 0, h: 0, raf: 0, city: [], over: false });

    function resize() {
      const r = arena.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      M.w = r.width; M.h = r.height;
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // a little skyline for Number City
      M.city = [];
      let x = 0;
      while (x < M.w) {
        const bw = 26 + Math.random() * 40, bh = 24 + Math.random() * 60;
        M.city.push({ x, w: bw, h: bh, hp: 1, win: Array.from({ length: 12 }, () => Math.random() < 0.5) });
        x += bw + 4;
      }
    }
    resize();
    const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(arena);
    A.cleanup.push(() => { M.running = false; cancelAnimationFrame(M.raf); if (ro) ro.disconnect(); });

    const ground = () => M.h - 34;
    const shipPos = () => ({ x: M.w / 2, y: ground() - 26 });
    const toPage = (x, y) => { const r = cv.getBoundingClientRect(); return { x: r.left + x, y: r.top + y }; };

    function hud() {
      el('.m-lives').innerHTML = Array.from({ length: Math.max(3, M.lives) }, (_, i) => `<span class="heart ${i < M.lives ? '' : 'lost'}">${i < M.lives ? '❤️' : '🖤'}</span>`).join('');
      el('.m-score').textContent = DQ.fmt(M.score);
      el('.m-wave').textContent = M.wave;
      el('.m-combo b').textContent = comboMult(M.combo) + (M.combo >= 2 ? ` · ${M.combo}` : '');
      el('.m-combo').classList.toggle('fire', M.combo >= 10);
      el('.m-input').textContent = M.value || '?';
    }
    function divisors() {
      const w = M.wave;
      if (w <= 1) return [2, 5, 10];
      if (w === 2) return [2, 3, 4, 5, 10];
      if (w === 3) return [2, 3, 4, 5, 6, 10];
      if (w <= 5) return [2, 3, 4, 5, 6, 7, 8, 9];
      return [3, 4, 6, 7, 8, 9, 11, 12];
    }
    function spawn() {
      let d, q, tries = 0;
      do { d = DQ.pick(divisors()); q = DQ.randInt(1, M.wave >= 4 ? 12 : 10); tries++; }
      while (tries < 12 && M.meteors.some(m => m.q === q));
      const r = DQ.clamp(M.w * 0.05, 30, 42);
      let x, t2 = 0;
      do { x = r + 8 + Math.random() * (M.w - 2 * r - 16); t2++; } while (t2 < 10 && M.meteors.some(m => Math.abs(m.x - x) < r * 2.4 && m.y < r * 3));
      const golden = Math.random() < 0.1;
      M.meteors.push({
        x, y: -r, r, q, d, text: `${q * d} ${DQ.div()} ${d}`,
        vy: (20 + M.wave * 6) * (M.h / 440) * (0.85 + Math.random() * 0.3),
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 1.5, golden,
        power: golden ? DQ.pick(['bomb', 'freeze', 'life']) : null,
      });
    }
    function update(dt) {
      const slow = M.slowT > 0 ? 0.35 : 1;
      M.slowT = Math.max(0, M.slowT - dt);
      M.spawnT -= dt;
      const maxOn = Math.min(7, 2 + Math.floor(M.wave / 1.5));
      if (M.spawnT <= 0 && M.meteors.length < maxOn) { spawn(); M.spawnT = Math.max(0.9, 2.8 - M.wave * 0.22); }
      for (let i = M.meteors.length - 1; i >= 0; i--) {
        const m = M.meteors[i];
        m.y += m.vy * dt * slow; m.rot += m.vr * dt;
        if (m.y + m.r * 0.6 >= ground()) { M.meteors.splice(i, 1); impact(m); }
      }
    }
    function draw(now) {
      const w = M.w, h = M.h, g = ground(), t = DQ.theme();
      cx.clearRect(0, 0, w, h);
      if (M.slowT > 0) { cx.fillStyle = 'rgba(56,189,248,.08)'; cx.fillRect(0, 0, w, h); }
      // city
      for (const b of M.city) {
        cx.fillStyle = b.hp > 0 ? '#1e1b4b' : '#2a0a0a';
        cx.fillRect(b.x, g + 34 - b.h * 0.55 - 10, b.w, b.h * 0.55 + 10);
        cx.fillStyle = b.hp > 0 ? t.vars[2] : '#7f1d1d';
        b.win.forEach((on, k) => {
          if (!on) return;
          const wx = b.x + 5 + (k % 3) * (b.w - 10) / 3, wy = g + 34 - b.h * 0.55 - 4 + Math.floor(k / 3) * 8;
          if (wy < h - 4) cx.fillRect(wx, wy, 4, 3);
        });
      }
      cx.strokeStyle = t.vars[0]; cx.lineWidth = 2; cx.shadowColor = t.vars[0]; cx.shadowBlur = 10;
      cx.beginPath(); cx.moveTo(0, g); cx.lineTo(w, g); cx.stroke();
      cx.shadowBlur = 0;
      // meteors
      for (const m of M.meteors) {
        const danger = m.y > g * 0.7;
        const tail = cx.createLinearGradient(m.x, m.y - m.r * 3.2, m.x, m.y);
        tail.addColorStop(0, 'rgba(0,0,0,0)');
        tail.addColorStop(1, m.golden ? 'rgba(250,204,21,.7)' : 'rgba(251,146,60,.6)');
        cx.fillStyle = tail;
        cx.beginPath(); cx.moveTo(m.x - m.r * 0.8, m.y); cx.lineTo(m.x, m.y - m.r * 3.4); cx.lineTo(m.x + m.r * 0.8, m.y); cx.fill();
        cx.save(); cx.translate(m.x, m.y); cx.rotate(m.rot);
        const rg = cx.createRadialGradient(-m.r * 0.3, -m.r * 0.3, m.r * 0.1, 0, 0, m.r);
        if (m.golden) { rg.addColorStop(0, '#fef08a'); rg.addColorStop(1, '#ca8a04'); cx.shadowColor = '#facc15'; cx.shadowBlur = 25; }
        else { rg.addColorStop(0, '#a8a29e'); rg.addColorStop(1, '#44403c'); cx.shadowColor = danger ? '#ef4444' : '#fb923c'; cx.shadowBlur = danger ? 22 : 12; }
        cx.fillStyle = rg;
        cx.beginPath();
        for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, rr = m.r * (0.86 + ((k * 37) % 7) / 40); cx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        cx.closePath(); cx.fill();
        cx.shadowBlur = 0;
        cx.fillStyle = 'rgba(0,0,0,.18)';
        cx.beginPath(); cx.arc(m.r * 0.3, m.r * 0.2, m.r * 0.18, 0, 7); cx.arc(-m.r * 0.35, m.r * 0.35, m.r * 0.12, 0, 7); cx.fill();
        cx.restore();
        const fs = Math.round(m.r * 0.52);
        cx.font = `700 ${fs}px Orbitron, Fredoka, sans-serif`;
        cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.lineWidth = 4; cx.strokeStyle = 'rgba(0,0,0,.85)';
        cx.strokeText(m.text, m.x, m.y);
        cx.fillStyle = danger && Math.floor(now / 200) % 2 ? '#fecaca' : '#fff';
        cx.fillText(m.text, m.x, m.y);
        if (m.golden) { cx.font = `${fs}px serif`; cx.fillText('✨', m.x + m.r * 0.9, m.y - m.r * 0.9); }
      }
      // ship
      const s = shipPos();
      cx.font = '38px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.save(); cx.translate(s.x, s.y + Math.sin(now / 300) * 3);
      if (P.equipped.ship === 'rocket') cx.rotate(-Math.PI / 4);
      cx.fillText(DQ.shipIcon(), 0, 0);
      cx.restore();
    }
    function loop(now) {
      if (!M.running) return;
      const dt = Math.min(0.05, (now - M.last) / 1000);
      M.last = now;
      if (!document.hidden && !M.paused) update(dt);
      draw(now);
      M.raf = requestAnimationFrame(loop);
    }

    function destroy(m, chain) {
      const i = M.meteors.indexOf(m);
      if (i < 0) return;
      M.meteors.splice(i, 1);
      const s = toPage(shipPos().x, shipPos().y), p = toPage(m.x, m.y);
      FX.beam(s.x, s.y - 10, p.x, p.y, { color: laserColor(), width: 6, life: 0.22 });
      DQ.sfx(chain ? 'hit' : 'laser');
      setTimeout(() => DQ.sfx('hit'), 60);
      FX.explosion(p.x, p.y, { colors: m.golden ? ['#fde047', '#fff', '#facc15'] : ['#fb923c', '#fde047', '#a8a29e', '#fff'] });
      if (!chain) { M.combo++; DQ.statMax('maxCombo', M.combo); }
      const pts = (10 + Math.floor((1 - m.y / M.h) * 10)) * comboMult(M.combo) * (chain ? 0.5 : 1);
      M.score += Math.round(pts);
      M.kills++;
      DQ.stat('meteors');
      FX.floatText(p.x, p.y - 20, `+${Math.round(pts)}`, { cls: 'gold' });
      if (!chain && M.combo > 0 && M.combo % 5 === 0) {
        FX.banner(`${comboWord(M.combo)}<small>${M.combo} ${T('a.combo')}</small>`, { cls: 'combo', ms: 800 });
        DQ.sfx('combo', M.combo / 5 * 3);
      }
      if (m.power) power(m.power, p);
      if (M.kills % 8 === 0) {
        M.wave++;
        DQ.sfx('powerup');
        FX.banner(T('m.waveBanner', { n: M.wave }), { ms: 1000 });
      }
      hud();
    }
    function power(kind, p) {
      DQ.sfx('powerup');
      if (kind === 'bomb') {
        FX.banner(T('m.bomb'), { cls: 'good', ms: 900 });
        FX.flash('rgba(255,255,255,.6)');
        M.meteors.slice().forEach((m, i) => setTimeout(() => { if (A.meteor === M) destroy(m, true); }, 120 * (i + 1)));
      } else if (kind === 'freeze') {
        M.slowT = 6;
        FX.banner(T('m.slow'), { cls: 'ice', ms: 900 });
        FX.burst(p.x, p.y, { colors: ['#bae6fd', '#fff', '#38bdf8'], shape: 'star', count: 30 });
      } else {
        M.lives = Math.min(5, M.lives + 1);
        FX.banner(T('m.life'), { cls: 'good', ms: 900 });
      }
    }
    function impact(m) {
      const p = toPage(m.x, ground());
      FX.explosion(p.x, p.y, { colors: ['#ef4444', '#fb923c', '#fde047'] });
      FX.shake(arena);
      FX.flash('rgba(239,68,68,.25)');
      DQ.sfx('hurt');
      const b = M.city.find(c => m.x >= c.x && m.x <= c.x + c.w);
      if (b) b.hp = 0;
      M.combo = 0;
      M.lives--;
      hud();
      if (M.lives <= 0) over();
    }
    function tryFire(force) {
      if (!M.running || M.over) return;
      const v = parseInt(M.value, 10);
      if (isNaN(v)) return;
      const matches = M.meteors.filter(m => m.q === v);
      if (matches.length) {
        const target = matches.reduce((a, b) => (b.y > a.y ? b : a));
        M.value = '';
        destroy(target);
      } else if (force) {
        M.value = '';
        M.combo = 0;
        DQ.sfx('wrong');
        FX.shake(el('.m-input'));
        const s = toPage(shipPos().x, shipPos().y);
        FX.floatText(s.x, s.y - 40, T('m.miss'), { cls: 'danger' });
      }
      hud();
    }
    function type(k) {
      if (!M.running || M.over) return;
      if (/^[0-9]$/.test(k)) {
        if (M.value.length >= 3) return;
        M.value += k; DQ.sfx('key');
        const v = parseInt(M.value, 10);
        const longer = M.meteors.some(m => String(m.q).length > M.value.length && String(m.q).startsWith(M.value));
        if (!longer && M.meteors.some(m => m.q === v)) tryFire(false);
      } else if (k === 'Backspace') M.value = M.value.slice(0, -1);
      else if (k === 'Enter') tryFire(true);
      hud();
    }
    function start() {
      el('.m-overlay').classList.add('hidden');
      Object.assign(M, { meteors: [], lives: 3, score: 0, wave: 1, kills: 0, combo: 0, value: '', spawnT: 0.6, slowT: 0, over: false, running: true, last: performance.now() });
      M.city.forEach(b => { b.hp = 1; });
      DQ.sfx('powerup');
      FX.banner(T('m.wave1'), { ms: 900 });
      hud();
      M.raf = requestAnimationFrame(loop);
    }
    function over() {
      M.over = true;
      setTimeout(() => { M.running = false; }, 600);
      DQ.sfx('gameover');
      const best = M.score > P.best.meteor;
      if (best) P.best.meteor = M.score;
      DQ.stat('meteorGames');
      const coins = Math.floor(M.score / 15), xp = Math.floor(M.score / 8);
      DQ.addCoins(coins); DQ.addXP(xp);
      const m = aModal(`<div class="a-results ${best ? 'win' : 'lose'}">
        <div class="res-title">${best ? T('m.record') : T('m.fallen')}</div>
        <div class="res-stats">
          <div><span>${T('a.score')}</span><b>${DQ.fmt(M.score)}</b></div>
          <div><span>${T('m.best')}</span><b>${DQ.fmt(P.best.meteor)}</b></div>
          <div><span>${T('m.meteors')}</span><b>${M.kills}</b></div>
          <div><span>${T('m.wave')}</span><b>${M.wave}</b></div>
          <div><span>${T('a.coins')}</span><b class="gold">+${coins}</b></div>
          <div><span>${T('xp')}</span><b>+${xp}</b></div>
        </div>
        <div class="res-btns"><button class="a-btn ghost" data-r="menu" type="button">${T('a.menu')}</button><button class="a-btn big" data-r="again" type="button">${T('m.again')}</button></div>
      </div>`);
      if (best) { FX.fireworks(5); DQ.sfx('victory'); }
      if (coins) setTimeout(() => { const c = FX.center(m.querySelector('.res-stats')); FX.coinsTo(c.x, c.y, Math.min(10, 2 + Math.round(coins / 10))); }, 600);
      DQ.checkAchievements();
      m.querySelector('[data-r="menu"]').addEventListener('click', () => { DQ.sfx('click'); go('menu'); });
      m.querySelector('[data-r="again"]').addEventListener('click', () => { DQ.sfx('click'); m.close(); setTimeout(start, 250); });
      DQ.keyHandler = e => { if (e.key === 'Enter') { e.preventDefault(); m.querySelector('[data-r="again"]').click(); DQ.keyHandler = keys; } };
    }
    DQ.$$('.m-keys .kp', root).forEach(b => b.addEventListener('click', () => type(b.dataset.k)));
    el('.m-go').addEventListener('click', start);
    const keys = e => {
      if (!M.running) { if (e.key === 'Enter' && !M.over) { e.preventDefault(); start(); } return; }
      if (/^[0-9]$/.test(e.key) || e.key === 'Backspace' || e.key === 'Enter') { e.preventDefault(); type(e.key); }
      else if (e.key === 'Escape') go('menu');
    };
    DQ.keyHandler = keys;
    hud();
    draw(performance.now());
  }

  /* ================= SHOP ================= */
  function viewShop(tab = 'ships') {
    A.mood = 'menu';
    const TABS = [['ships', T('shop.tabShips')], ['lasers', T('shop.tabLasers')], ['themes', T('shop.tabThemes')], ['items', T('shop.tabItems')]];
    const cards = DQ.SHOP[tab].map(it => {
      let preview = '', action = '';
      if (tab === 'ships') preview = `<div class="sp-ship">${it.icon}</div>`;
      if (tab === 'lasers') preview = `<div class="sp-laser" style="--lc:${it.colors[0] === 'rainbow' ? '#f472b6' : it.colors[0]}" ${it.colors[0] === 'rainbow' ? 'data-rainbow' : ''}></div>`;
      if (tab === 'themes') preview = `<div class="sp-theme" style="background:linear-gradient(${it.sky[1]},${it.sky[0]})">${it.vars.map(c => `<i style="background:${c};box-shadow:0 0 10px ${c}"></i>`).join('')}</div>`;
      if (tab === 'items') {
        preview = `<div class="sp-ship">${it.icon}</div><div class="sp-desc">${it.desc}</div><div class="sp-have">${T('shop.have', { n: P.items[it.id] || 0 })}</div>`;
        action = `<button class="a-btn buy" data-buy="${it.id}" type="button" ${P.coins < it.price ? 'data-poor' : ''}>🪙 ${it.price}</button>`;
      } else {
        const key = tab === 'ships' ? 'ship' : tab === 'lasers' ? 'laser' : 'theme';
        const owned = P.owned[tab].includes(it.id), eq = P.equipped[key] === it.id;
        action = eq ? `<button class="a-btn ghost" disabled type="button">${T('shop.equipped')}</button>`
          : owned ? `<button class="a-btn ghost" data-equip="${it.id}" type="button">${T('shop.equip')}</button>`
            : `<button class="a-btn buy" data-buy="${it.id}" type="button" ${P.coins < it.price ? 'data-poor' : ''}>🪙 ${it.price}</button>`;
      }
      return `<div class="shop-card"><div class="sc-prev">${preview}</div><div class="sc-name">${it.name}</div>${action}</div>`;
    }).join('');
    root.innerHTML = head(T('a.shop')) + `<div class="a-shop">
      <div class="shop-tabs">${TABS.map(([id, l]) => `<button class="a-btn ${id === tab ? '' : 'ghost'}" data-tab="${id}" type="button">${l}</button>`).join('')}</div>
      <div class="shop-grid">${cards}</div></div>`;
    bindCommon();
    DQ.$$('[data-tab]', root).forEach(b => b.addEventListener('click', () => { DQ.sfx('click'); viewShop(b.dataset.tab); }));
    DQ.$$('[data-equip]', root).forEach(b => b.addEventListener('click', () => {
      const key = tab === 'ships' ? 'ship' : tab === 'lasers' ? 'laser' : 'theme';
      P.equipped[key] = b.dataset.equip; DQ.save();
      DQ.sfx('powerup');
      if (tab === 'themes') applyTheme();
      viewShop(tab);
    }));
    DQ.$$('[data-buy]', root).forEach(b => b.addEventListener('click', () => {
      const it = DQ.SHOP[tab].find(x => x.id === b.dataset.buy);
      if (!DQ.spendCoins(it.price)) {
        DQ.sfx('wrong'); FX.shake(b);
        const c = FX.center(b); FX.floatText(c.x, c.y - 20, T('shop.poor'), { cls: 'danger' });
        return;
      }
      const c = FX.center(b);
      FX.burst(c.x, c.y, { shape: 'star', count: 26, speed: 220 });
      DQ.sfx('coin'); setTimeout(() => DQ.sfx('powerup'), 120);
      DQ.stat('purchases');
      if (tab === 'items') P.items[it.id] = (P.items[it.id] || 0) + 1;
      else {
        P.owned[tab].push(it.id);
        const key = tab === 'ships' ? 'ship' : tab === 'lasers' ? 'laser' : 'theme';
        P.equipped[key] = it.id;
        if (tab === 'themes') applyTheme();
        FX.confetti(60);
      }
      DQ.save(); DQ.checkAchievements();
      viewShop(tab);
    }));
    DQ.keyHandler = e => { if (e.key === 'Escape') go('menu'); };
  }

  /* ================= TROPHIES ================= */
  function viewTrophies() {
    A.mood = 'menu';
    const s = k => P.stats[k] || 0;
    const tot = s('correct') + s('wrong');
    const pct = Math.round((P.xp / DQ.xpNeeded(P.level)) * 100);
    const stats = [
      [T('tr.solved'), s('solved')], [T('tr.correct'), s('correct')], [T('tr.acc'), tot ? Math.round((s('correct') / tot) * 100) + '%' : '–'],
      [T('tr.combo'), s('maxCombo')], [T('tr.bosses'), s('bosses')], [T('tr.stars'), `${totalStars()}/${TOTAL_LEVELS * 3}`],
      [T('tr.meteors'), s('meteors')], [T('tr.meteorBest'), DQ.fmt(P.best.meteor)], [T('tr.chapters'), `${Object.keys(P.watched).length}/${DQ.LESSON_COUNT}`],
    ];
    root.innerHTML = head(T('a.trophies')) + `<div class="a-trophies">
      <div class="tr-profile">
        <div class="a-pilot-ship big" style="--rot:${shipRot()}deg">${DQ.shipIcon()}</div>
        <div><div class="a-rank">${DQ.rankTitle(P.level)}</div><div class="a-lv">${T('a.pilotLevel', { n: P.level })}</div>
        <div class="a-xp"><i style="width:${pct}%"></i></div><div class="tr-xp">${P.xp} / ${DQ.xpNeeded(P.level)} ${T('xp')}</div></div>
      </div>
      <div class="tr-stats">${stats.map(([l, v]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>
      <div class="tr-grid">${DQ.ACHIEVEMENTS.map(a => {
        const got = !!P.achievements[a.id];
        return `<div class="tr-ach ${got ? 'got' : ''}"><div class="tr-ico">${a.icon}</div><div class="tr-name">${a.name}</div><div class="tr-desc">${a.desc}</div>${got ? `<div class="tr-tag">${T('tr.unlocked')}</div>` : '<div class="tr-tag lock">🔒 +50 🪙</div>'}</div>`;
      }).join('')}</div>
    </div>`;
    bindCommon();
    DQ.keyHandler = e => { if (e.key === 'Escape') go('menu'); };
  }

  /* ================= SCREEN HOOKS ================= */
  DQ.screens = DQ.screens || {};
  DQ.screens.arcade = {
    init() { applyTheme(); },
    enter() {
      A.active = true;
      document.body.classList.add('arcade-mode');
      applyTheme();
      startBg();
      go(A.booted ? 'menu' : 'boot');
    },
    leave() {
      A.active = false;
      document.body.classList.remove('arcade-mode');
      cleanupView();
      stopBg();
    },
  };
})();
