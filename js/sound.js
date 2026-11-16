/* Divide & Conquer — short synthesized sound effects (no background music) and narrator voice.
   Everything is generated with the Web Audio API: no audio files needed. */
(function () {
  'use strict';
  const DQ = window.DQ;
  let ctx = null, master, sfxBus;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp); comp.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  // browsers only allow audio after a user gesture
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => ac(), { passive: true }));

  function tone(o) {
    const c = ac(); if (!c) return;
    const t = (o.at != null ? o.at : c.currentTime) + (o.delay || 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + o.dur);
    const vol = o.vol != null ? o.vol : 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(o.dest || sfxBus);
    osc.start(t); osc.stop(t + o.dur + 0.05);
  }
  let noiseBuf = null;
  function noise(o) {
    const c = ac(); if (!c) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = (o.at != null ? o.at : c.currentTime) + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.freq || 2000, t);
    if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t + o.dur);
    f.Q.value = o.q || 1;
    const g = c.createGain();
    g.gain.setValueAtTime(o.vol != null ? o.vol : 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxBus);
    src.start(t); src.stop(t + o.dur + 0.05);
  }
  const N = n => 440 * Math.pow(2, (n - 69) / 12);

  const SFX = {
    click: () => tone({ freq: 660, dur: 0.05, vol: 0.07 }),
    key: () => tone({ freq: 900, dur: 0.035, vol: 0.05, type: 'triangle' }),
    pop: () => tone({ freq: 480, slide: 920, dur: 0.09, vol: 0.09, type: 'sine' }),
    correct: () => [72, 76, 79].forEach((n, i) => tone({ freq: N(n), dur: 0.16, vol: 0.13, type: 'triangle', delay: i * 0.06 })),
    soft: () => [76, 83].forEach((n, i) => tone({ freq: N(n), dur: 0.22, vol: 0.08, type: 'sine', delay: i * 0.08 })),
    wrong: () => { tone({ freq: 220, slide: 110, dur: 0.3, vol: 0.13, type: 'sawtooth' }); tone({ freq: 233, slide: 116, dur: 0.3, vol: 0.08 }); },
    gentleWrong: () => tone({ freq: 330, slide: 247, dur: 0.22, vol: 0.08, type: 'triangle' }),
    laser: () => tone({ freq: 1500, slide: 160, dur: 0.18, vol: 0.08 }),
    hit: () => { noise({ dur: 0.18, vol: 0.3, freq: 3000, freqEnd: 300 }); tone({ freq: 190, slide: 50, dur: 0.22, vol: 0.2, type: 'sine' }); },
    explode: () => { noise({ dur: 0.9, vol: 0.5, freq: 2000, freqEnd: 60 }); tone({ freq: 95, slide: 28, dur: 0.8, vol: 0.32, type: 'sine' }); },
    coin: () => { tone({ freq: N(83), dur: 0.07, vol: 0.08 }); tone({ freq: N(88), dur: 0.22, vol: 0.08, delay: 0.07 }); },
    levelup: () => [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone({ freq: N(n), dur: i === 6 ? 0.6 : 0.13, vol: 0.1, delay: i * 0.075 })),
    achievement: () => [79, 83, 86, 91].forEach((n, i) => tone({ freq: N(n), dur: 0.3, vol: 0.09, type: 'triangle', delay: i * 0.09 })),
    combo: (lvl = 1) => tone({ freq: N(72 + Math.min(lvl, 24)), dur: 0.12, vol: 0.08 }),
    whoosh: () => noise({ dur: 0.35, vol: 0.22, freq: 400, freqEnd: 3200, filter: 'bandpass', q: 2 }),
    bring: () => { noise({ dur: 0.28, vol: 0.13, freq: 2600, freqEnd: 500, filter: 'bandpass', q: 3 }); tone({ freq: N(67), slide: N(60), dur: 0.22, vol: 0.07, type: 'triangle' }); },
    boss: () => { tone({ freq: 110, slide: 40, dur: 1.3, vol: 0.22, type: 'sawtooth' }); tone({ freq: 117, slide: 42, dur: 1.3, vol: 0.16 }); noise({ dur: 1.1, vol: 0.2, freq: 500, freqEnd: 80 }); },
    hurt: () => { tone({ freq: 320, slide: 80, dur: 0.38, vol: 0.18, type: 'sawtooth' }); noise({ dur: 0.3, vol: 0.28, freq: 1400, freqEnd: 200 }); },
    shield: () => { tone({ freq: N(84), slide: N(72), dur: 0.3, vol: 0.1, type: 'triangle' }); noise({ dur: 0.2, vol: 0.12, freq: 6000, filter: 'highpass' }); },
    powerup: () => [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone({ freq: N(67 + s), dur: 0.09, vol: 0.07, delay: i * 0.035 })),
    star: (i = 0) => { tone({ freq: N(84 + i * 4), dur: 0.45, vol: 0.1, type: 'triangle' }); tone({ freq: N(91 + i * 4), dur: 0.35, vol: 0.05, type: 'sine', delay: 0.05 }); },
    victory: () => [[60, 0], [64, 0.1], [67, 0.2], [72, 0.3], [67, 0.45], [72, 0.55], [76, 0.65], [79, 0.8]].forEach(([n, d], i) =>
      tone({ freq: N(n), dur: i === 7 ? 0.8 : 0.14, vol: 0.1, delay: d })),
    gameover: () => [67, 63, 60, 55].forEach((n, i) => tone({ freq: N(n), dur: 0.4, vol: 0.1, delay: i * 0.26 })),
    chest: () => { noise({ dur: 0.7, vol: 0.18, freq: 300, freqEnd: 2400 }); [84, 88, 91, 96].forEach((n, i) => tone({ freq: N(n), dur: 0.35, vol: 0.07, type: 'triangle', delay: 0.45 + i * 0.06 })); },
    rumble: () => noise({ dur: 0.25, vol: 0.2, freq: 220, freqEnd: 120 }),
    tick: () => tone({ freq: 1250, dur: 0.025, vol: 0.035 }),
    warn: () => [0, 0.32].forEach(d => tone({ freq: 880, slide: 660, dur: 0.24, vol: 0.08, type: 'sawtooth', delay: d })),
  };

  DQ.sfx = (name, ...args) => {
    if (!DQ.settings.sfx || !SFX[name]) return;
    try { SFX[name](...args); } catch (e) { /* audio not ready */ }
  };

  /* background music removed on purpose: silent stand-in (calls to be cleaned out of arcade.js) */
  DQ.music = { play() {}, stop() {}, pause() {}, resume() {}, off() {}, refresh() {} };

  /* ---------- narrator voice (Web Speech API), English or German ---------- */
  const synth = window.speechSynthesis;
  let voice = null;
  function chooseVoice() {
    if (!synth) return;
    const de = DQ.lang && DQ.lang() === 'de';
    const vs = synth.getVoices().filter(v => (de ? /^de/i : /^en/i).test(v.lang));
    const prefs = de
      ? [/Google Deutsch/i, /Natural/i, /Anna|Helena|Katja|Petra|Marlene|Vicki/i, /de-DE/i, /de-AT/i, /de/i]
      : [/Google UK English Female/i, /Samantha/i, /Natural/i, /Google US English/i, /Karen|Moira|Tessa|Serena/i, /en-GB/i, /en-US/i];
    for (const p of prefs) { const v = vs.find(x => p.test(x.name) || p.test(x.lang)); if (v) { voice = v; return; } }
    voice = vs[0] || null;
  }
  if (synth) { chooseVoice(); synth.onvoiceschanged = chooseVoice; }

  DQ.speech = {
    supported: !!synth,
    speak(text, rate = 1) {
      return new Promise(resolve => {
        if (!synth || !text) return resolve();
        let done = false;
        const finish = () => { if (!done) { done = true; clearTimeout(safety); resolve(); } };
        const u = new SpeechSynthesisUtterance(text);
        if (!voice) chooseVoice();
        if (voice) u.voice = voice;
        u.lang = voice ? voice.lang : DQ.lang() === 'de' ? 'de-DE' : 'en-GB';
        u.rate = 0.98 * rate; u.pitch = 1.08;
        u.onend = finish; u.onerror = finish;
        // safety net: some browsers never fire onend
        const safety = setTimeout(finish, 2500 + text.length * 95 / rate);
        try { synth.cancel(); synth.speak(u); } catch (e) { finish(); }
      });
    },
    cancel() { try { synth && synth.cancel(); } catch (e) { /* ignore */ } },
  };
})();
