/* Divide & Conquer — app shell: routing, top bar, settings, toasts, level-up celebrations */
(function () {
  'use strict';
  const DQ = window.DQ, $ = DQ.$, P = DQ.profile;

  /* ---------- mascots & static bits ---------- */
  DQ.$$('.mascot-slot').forEach(s => { s.innerHTML = DQ.mascotSVG(); });
  DQ.buildDmsb($('#homeDmsb'));
  (function cycleHomeRecipe() {
    const ids = DQ.recipe().map(r => r.id);
    let i = 0;
    setInterval(() => {
      DQ.$$('#homeDmsb .dm-chip').forEach(c => c.classList.toggle('on', c.dataset.ph === ids[i % 4]));
      i++;
    }, 1100);
  })();

  /* ---------- top bar ---------- */
  function updateTopbar() {
    $('#tbAvatar').textContent = DQ.shipIcon();
    $('#tbRank').textContent = DQ.rankTitle(P.level);
    $('#tbLevel').textContent = P.level;
    $('#tbCoins').textContent = DQ.fmt(P.coins);
    $('#tbXp').style.width = Math.min(100, (P.xp / DQ.xpNeeded(P.level)) * 100) + '%';
  }
  DQ.on('profile', updateTopbar);

  /* ---------- toasts (achievements) ---------- */
  function toast(html, cls = '') {
    const t = DQ.h('div', { class: 'toast ' + cls, html });
    $('#toasts').appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 400); }, 3800);
  }
  DQ.toast = toast;
  DQ.on('achievement', a => {
    DQ.sfx('achievement');
    toast(`<div class="t-ico">${a.icon}</div><div><div class="t-k">🏆 Trophy unlocked!</div><div class="t-n">${a.name}</div><div class="t-d">${a.desc} · +50 🪙</div></div>`, 'ach');
    const c = DQ.fx.center($('#toasts'));
    DQ.fx.burst(c.x, c.y + 30, { shape: 'star', count: 16, speed: 160, gravity: 100 });
  });

  /* ---------- big overlays (queued so they never overlap) ---------- */
  let overlayChain = Promise.resolve();
  function queueOverlay(build) {
    overlayChain = overlayChain.then(() => new Promise(done => {
      const layer = $('#modalLayer');
      const ov = DQ.h('div', { class: 'overlay' });
      ov.appendChild(build(() => { ov.classList.remove('in'); setTimeout(() => { ov.remove(); done(); }, 300); }));
      layer.appendChild(ov);
      requestAnimationFrame(() => ov.classList.add('in'));
    }));
  }
  DQ.on('levelup', ({ level, reward, rank }) => {
    queueOverlay(close => {
      const box = DQ.h('div', {
        class: 'levelup-box',
        html: `<div class="lu-rays"></div><div class="lu-k">LEVEL UP!</div><div class="lu-n">${level}</div>
          <div class="lu-rank">${rank}</div><div class="lu-reward">+${reward} 🪙</div><button class="btn primary big" type="button">Awesome! ✨</button>`,
      });
      setTimeout(() => {
        DQ.sfx('levelup');
        DQ.fx.confetti(140);
        const c = DQ.fx.center(box);
        DQ.fx.burst(c.x, c.y, { shape: 'star', count: 40, speed: 380 });
      }, 150);
      const btn = box.querySelector('button');
      let closed = false;
      const finish = () => { if (closed) return; closed = true; DQ.sfx('click'); DQ.keyHandler = prevKeys; close(); };
      const prevKeys = DQ.keyHandler;
      DQ.keyHandler = e => { if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') { e.preventDefault(); finish(); } };
      btn.addEventListener('click', finish);
      setTimeout(() => btn.focus(), 50);
      return box;
    });
  });

  /* ---------- generic modal ---------- */
  DQ.modal = function ({ title, html, buttons = [] }) {
    const layer = $('#modalLayer');
    const ov = DQ.h('div', { class: 'overlay' });
    const box = DQ.h('div', { class: 'modal-box', html: `<div class="mb-head"><h3>${title}</h3><button class="icon-btn mb-x" type="button" aria-label="Close">✕</button></div><div class="mb-body">${html}</div>` });
    const foot = DQ.h('div', { class: 'mb-foot' });
    const close = () => { ov.classList.remove('in'); setTimeout(() => ov.remove(), 300); };
    buttons.forEach(b => {
      const el = DQ.h('button', { class: 'btn ' + (b.cls || ''), type: 'button' }, b.label);
      el.addEventListener('click', () => { DQ.sfx('click'); if (b.onClick) b.onClick(close); else close(); });
      foot.appendChild(el);
    });
    if (buttons.length) box.appendChild(foot);
    box.querySelector('.mb-x').addEventListener('click', () => { DQ.sfx('click'); close(); });
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ov.appendChild(box);
    layer.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('in'));
    return { box, close };
  };

  /* ---------- settings ---------- */
  $('#btnSettings').addEventListener('click', () => {
    DQ.sfx('click');
    const S = DQ.settings;
    const sw = (id, label, on) => `<label class="sw-row"><span>${label}</span><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><i class="sw"></i></label>`;
    const { box, close } = DQ.modal({
      title: '⚙️ Settings',
      html: `
        <div class="set-label">How do you write long division at school?</div>
        <div class="notation-pick">
          <button class="np ${S.notation === 'bracket' ? 'on' : ''}" data-n="bracket" type="button">
            <span class="np-demo bracket"><span class="np-q">24</span><span class="np-d">3</span><span class="np-n">72</span></span>
            <span class="np-l">Bracket ⟌<small>UK · US · many countries</small></span></button>
          <button class="np ${S.notation === 'colon' ? 'on' : ''}" data-n="colon" type="button">
            <span class="np-demo colon">72 : 3 = 24</span>
            <span class="np-l">Colon :<small>Germany · Austria · Switzerland</small></span></button>
        </div>
        ${sw('setVoice', '🗣️ Narrator voice in the lesson', S.voice)}
        ${sw('setSfx', '🔔 Sound effects', S.sfx)}
        <div class="danger-zone"><button class="btn danger" id="setReset" type="button">🗑️ Reset all progress</button></div>`,
      buttons: [{ label: 'Done', cls: 'primary' }],
    });
    DQ.$$('.np', box).forEach(b => b.addEventListener('click', () => {
      DQ.sfx('pop');
      S.notation = b.dataset.n; DQ.save();
      DQ.$$('.np', box).forEach(x => x.classList.toggle('on', x === b));
      DQ.emit('notation', S.notation);
    }));
    $('#setVoice', box).addEventListener('change', e => { S.voice = e.target.checked; if (!S.voice) DQ.speech.cancel(); DQ.save(); });
    $('#setSfx', box).addEventListener('change', e => { S.sfx = e.target.checked; DQ.save(); DQ.sfx('pop'); });
    $('#setReset', box).addEventListener('click', () => {
      close();
      DQ.modal({
        title: 'Reset everything?',
        html: '<p>This deletes your level, coins, stars, trophies and shop items on this device. This cannot be undone.</p>',
        buttons: [{ label: 'Keep my progress' }, { label: 'Yes, reset', cls: 'danger', onClick: () => DQ.resetProfile() }],
      });
    });
  });

  /* ---------- routing ---------- */
  const SCREENS = ['home', 'learn', 'practice', 'arcade'];
  let current = null;
  function route() {
    let id = (location.hash || '#home').slice(1);
    if (!SCREENS.includes(id)) id = 'home';
    if (id === current) return;
    const prev = current;
    if (prev && DQ.screens[prev] && DQ.screens[prev].leave) DQ.screens[prev].leave();
    current = id;
    DQ.keyHandler = null;
    SCREENS.forEach(s => $('#screen-' + s).classList.toggle('active', s === id));
    DQ.$$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === id));
    document.body.dataset.screen = id;
    window.scrollTo({ top: 0 });
    if (DQ.screens[id] && DQ.screens[id].enter) DQ.screens[id].enter();
  }
  addEventListener('hashchange', route);

  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter' && t && t.tagName === 'BUTTON' && !t.classList.contains('kp')) return; // let focused buttons click
    if (DQ.keyHandler) DQ.keyHandler(e);
  });
  // keypad buttons shouldn't keep focus (so Enter keeps going to the game)
  document.addEventListener('click', e => { const b = e.target.closest('.kp, .row-btns .btn, .pw, .controls .ctrl, .lvl-chip'); if (b) b.blur(); });

  /* ---------- boot ---------- */
  Object.values(DQ.screens).forEach(s => s.init && s.init());
  updateTopbar();
  route();
  DQ.checkAchievements();
})();
