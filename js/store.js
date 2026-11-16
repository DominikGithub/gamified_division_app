/* Divide & Conquer — player profile, XP, coins, shop catalog, achievements */
(function () {
  'use strict';
  const DQ = window.DQ;
  const KEY = 'divide-and-conquer.v1';

  const defaults = () => ({
    xp: 0, level: 1, coins: 0,
    owned: { ships: ['rocket'], lasers: ['cyan'], themes: ['neon'] },
    equipped: { ship: 'rocket', laser: 'cyan', theme: 'neon' },
    items: { hint: 2, shield: 1, heart: 0, freeze: 0, double: 0 },
    campaign: {},
    best: { meteor: 0 },
    stats: {},
    achievements: {},
    watched: {},
    daily: { date: '', done: false },
    settings: { notation: 'colon', voice: true, sfx: true, practiceLevel: 'starter', speed: 1, lang: '' },
  });

  function merge(base, saved) {
    for (const k in saved) {
      const b = base[k], s = saved[k];
      if (s && typeof s === 'object' && !Array.isArray(s) && b && typeof b === 'object' && !Array.isArray(b)) base[k] = merge(b, s);
      else base[k] = s;
    }
    return base;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return merge(defaults(), JSON.parse(raw));
    } catch (e) { /* storage unavailable: play without saving */ }
    return defaults();
  }

  const P = (DQ.profile = load());
  DQ.settings = P.settings;
  // v2: German/European colon notation becomes the default, background music removed
  if ((P.settings.v || 1) < 2) { P.settings.notation = 'colon'; P.settings.v = 2; }
  delete P.settings.music;

  let saveTimer;
  DQ.save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* ignore */ }
    }, 120);
    DQ.emit('profile');
  };
  DQ.saveNow = () => {
    clearTimeout(saveTimer);
    try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* ignore */ }
  };
  DQ.resetProfile = () => {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    location.hash = '#home';
    location.reload();
  };

  /* ---------- XP & levels ---------- */
  DQ.xpNeeded = lvl => 100 + (lvl - 1) * 50;
  const RANKS = [[1, 'rank1'], [3, 'rank2'], [5, 'rank3'], [8, 'rank4'], [12, 'rank5'], [16, 'rank6'], [20, 'rank7']];
  DQ.rankTitle = lvl => DQ.t(RANKS.filter(r => lvl >= r[0]).pop()[1]);

  DQ.addXP = n => {
    n = Math.max(0, Math.round(n));
    P.xp += n;
    while (P.xp >= DQ.xpNeeded(P.level)) {
      P.xp -= DQ.xpNeeded(P.level);
      P.level++;
      const reward = 25 + P.level * 10;
      P.coins += reward;
      DQ.emit('levelup', { level: P.level, reward, rank: DQ.rankTitle(P.level) });
    }
    DQ.save();
    DQ.checkAchievements();
  };
  DQ.addCoins = n => { P.coins += Math.max(0, Math.round(n)); DQ.save(); DQ.checkAchievements(); };
  DQ.spendCoins = n => { if (P.coins < n) return false; P.coins -= n; DQ.save(); return true; };
  DQ.stat = (key, inc = 1) => { P.stats[key] = (P.stats[key] || 0) + inc; DQ.save(); return P.stats[key]; };
  DQ.statMax = (key, v) => { if (v > (P.stats[key] || 0)) { P.stats[key] = v; DQ.save(); } };
  const S = key => P.stats[key] || 0;

  /* Record a fully solved long division (any mode) */
  DQ.recordSolved = (data, mode) => {
    DQ.stat('solved');
    if (mode) DQ.stat('solved_' + mode);
    if (DQ.hasInnerZero(data)) DQ.stat('zeroSolved');
    if (data.divisor >= 10) DQ.stat('bigSolved');
    DQ.checkAchievements();
  };

  /* ---------- shop catalog ---------- */
  DQ.SHOP = {
    ships: [
      { id: 'rocket', name: 'Rocket', icon: '🚀', price: 0 },
      { id: 'cat', name: 'Space Cat', icon: '🐱', price: 120 },
      { id: 'ufo', name: 'Saucer', icon: '🛸', price: 150 },
      { id: 'robot', name: 'Mecha', icon: '🤖', price: 200 },
      { id: 'shark', name: 'Sky Shark', icon: '🦈', price: 250 },
      { id: 'unicorn', name: 'Unicorn', icon: '🦄', price: 300 },
      { id: 'alien', name: 'Zip the Alien', icon: '👽', price: 350 },
      { id: 'dragon', name: 'Dragon', icon: '🐉', price: 450 },
      { id: 'crown', name: 'Royal Divider', icon: '👑', price: 1000 },
    ],
    lasers: [
      { id: 'cyan', name: 'Cyan Beam', colors: ['#22d3ee', '#cffafe'], price: 0 },
      { id: 'pink', name: 'Bubblegum', colors: ['#f472b6', '#fce7f3'], price: 100 },
      { id: 'lime', name: 'Lime Zapper', colors: ['#a3e635', '#ecfccb'], price: 100 },
      { id: 'plasma', name: 'Plasma', colors: ['#a855f7', '#f3e8ff'], price: 200 },
      { id: 'gold', name: 'Golden Ray', colors: ['#facc15', '#fef9c3'], price: 250 },
      { id: 'rainbow', name: 'RAINBOW', colors: ['rainbow', '#ffffff'], price: 500 },
    ],
    themes: [
      { id: 'neon', name: 'Neon Night', vars: ['#22d3ee', '#f472b6', '#a855f7'], sky: ['#0b0420', '#2a0845'], price: 0 },
      { id: 'lava', name: 'Lava Core', vars: ['#fb923c', '#ef4444', '#facc15'], sky: ['#1a0500', '#4a0d0d'], price: 200 },
      { id: 'ocean', name: 'Deep Ocean', vars: ['#2dd4bf', '#38bdf8', '#818cf8'], sky: ['#00111f', '#032a4a'], price: 200 },
      { id: 'toxic', name: 'Toxic Lab', vars: ['#a3e635', '#22c55e', '#facc15'], sky: ['#031105', '#0f2a0a'], price: 250 },
      { id: 'galaxy', name: 'Royal Galaxy', vars: ['#fde047', '#c084fc', '#f472b6'], sky: ['#0d0221', '#2b0b4a'], price: 350 },
    ],
    items: [
      { id: 'hint', name: 'Hint Bulb', icon: '💡', price: 40, desc: 'Shows the answer for one step — no damage.' },
      { id: 'shield', name: 'Shield', icon: '🛡️', price: 60, desc: 'Blocks the next hit you would take.' },
      { id: 'heart', name: 'Heart Potion', icon: '❤️', price: 50, desc: 'Restores one heart in battle.' },
      { id: 'freeze', name: 'Time Freeze', icon: '❄️', price: 45, desc: 'Monster stops charging for this problem.' },
      { id: 'double', name: 'Coin Doubler', icon: '✨', price: 80, desc: 'Double coins for the current battle.' },
    ],
  };
  // names/descriptions come from the translation table
  Object.values(DQ.SHOP).forEach(list => list.forEach(it => {
    delete it.name; delete it.desc;
    Object.defineProperty(it, 'name', { get() { return DQ.t('shop.' + it.id); } });
    Object.defineProperty(it, 'desc', { get() { return DQ.t('itemd.' + it.id); } });
  }));
  DQ.shipIcon = () => (DQ.SHOP.ships.find(s => s.id === P.equipped.ship) || DQ.SHOP.ships[0]).icon;
  DQ.laser = () => DQ.SHOP.lasers.find(s => s.id === P.equipped.laser) || DQ.SHOP.lasers[0];
  DQ.theme = () => DQ.SHOP.themes.find(s => s.id === P.equipped.theme) || DQ.SHOP.themes[0];

  /* ---------- achievements ---------- */
  DQ.ACHIEVEMENTS = [
    { id: 'first_correct', icon: '👣', name: 'First Step', desc: 'Answer your first step correctly', test: () => S('correct') >= 1 },
    { id: 'first_solve', icon: '🎉', name: 'Problem Solver', desc: 'Solve your first long division', test: () => S('solved') >= 1 },
    { id: 'solve10', icon: '🔟', name: 'Ten Down', desc: 'Solve 10 long divisions', test: () => S('solved') >= 10 },
    { id: 'solve50', icon: '🏅', name: 'Half Century', desc: 'Solve 50 long divisions', test: () => S('solved') >= 50 },
    { id: 'solve100', icon: '💯', name: 'Centurion', desc: 'Solve 100 long divisions', test: () => S('solved') >= 100 },
    { id: 'practice25', icon: '✏️', name: 'Paper Pro', desc: 'Solve 25 problems in Pure Practice', test: () => S('solved_practice') >= 25 },
    { id: 'scholar', icon: '🎓', name: 'Scholar', desc: 'Watch every lesson chapter', test: () => Object.keys(P.watched).length >= (DQ.LESSON_COUNT || 99) },
    { id: 'zero', icon: '0️⃣', name: 'Zero Hero', desc: 'Solve a problem with a 0 inside the answer', test: () => S('zeroSolved') >= 1 },
    { id: 'bigbrain', icon: '🧠', name: 'Big Brain', desc: 'Solve a division by a 2-digit number', test: () => S('bigSolved') >= 1 },
    { id: 'combo10', icon: '🔥', name: 'On Fire', desc: 'Reach a 10× combo in the arcade', test: () => S('maxCombo') >= 10 },
    { id: 'combo25', icon: '⚡', name: 'Unstoppable', desc: 'Reach a 25× combo in the arcade', test: () => S('maxCombo') >= 25 },
    { id: 'perfect', icon: '⭐', name: 'Flawless', desc: 'Get 3 stars on a campaign level', test: () => S('perfectLevels') >= 1 },
    { id: 'boss1', icon: '👹', name: 'Boss Slayer', desc: 'Defeat your first boss', test: () => S('bosses') >= 1 },
    { id: 'allbosses', icon: '👑', name: 'Galaxy Champion', desc: 'Defeat all 6 bosses', test: () => [4, 9, 14, 19, 24, 29].every(i => (P.campaign[i] || 0) > 0) },
    { id: 'meteor50', icon: '☄️', name: 'Meteor Hunter', desc: 'Destroy 50 meteors', test: () => S('meteors') >= 50 },
    { id: 'meteor1000', icon: '🛰️', name: 'Ace Pilot', desc: 'Score 1,000 in Meteor Storm', test: () => P.best.meteor >= 1000 },
    { id: 'daily', icon: '📅', name: 'Daily Hero', desc: 'Complete a daily challenge', test: () => S('daily') >= 1 },
    { id: 'shopper', icon: '🛍️', name: 'Shopper', desc: 'Buy something in the shop', test: () => S('purchases') >= 1 },
    { id: 'rich', icon: '💰', name: 'Treasure Hoard', desc: 'Have 1,000 coins at once', test: () => P.coins >= 1000 },
    { id: 'lvl5', icon: '🆙', name: 'Level 5', desc: 'Reach player level 5', test: () => P.level >= 5 },
    { id: 'lvl10', icon: '🌟', name: 'Level 10', desc: 'Reach player level 10', test: () => P.level >= 10 },
  ];
  DQ.ACHIEVEMENTS.forEach(a => {
    delete a.name; delete a.desc;
    Object.defineProperty(a, 'name', { get() { return DQ.t('ach.' + a.id); } });
    Object.defineProperty(a, 'desc', { get() { return DQ.t('achd.' + a.id); } });
  });
  let checking = false;
  DQ.checkAchievements = () => {
    if (checking) return;
    checking = true;
    try {
      for (const a of DQ.ACHIEVEMENTS) {
        if (!P.achievements[a.id] && a.test()) {
          P.achievements[a.id] = Date.now();
          P.coins += 50;
          DQ.emit('achievement', a);
        }
      }
    } finally { checking = false; }
    DQ.save();
  };
})();
