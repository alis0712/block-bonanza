/* BLOCK BONANZA - web edition. Single-file canvas game, no dependencies.
 * Copyright (c) 2026 goneRogue Entertainment. All rights reserved.
 * Proprietary and confidential: no permission is granted to copy, modify or redistribute this code,
 * its music or its artwork. See LICENSE. */
'use strict';
(function () {
const COPYRIGHT = '\u00a9 2026 goneRogue Entertainment. All rights reserved.';
// ---------------------------------------------------------------- setup
const cv = document.getElementById('c');
const ctx = cv.getContext('2d', { alpha: false });
const safeEl = document.getElementById('safe');
let W = 0, H = 0, DPR = 1;
const safe = { t: 0, r: 0, b: 0, l: 0 };
const L = {};
const COLS = 10, ROWS = 22, HID = 2, VIS = 20;
const CLEAR_T = 0.32, LOCK_T = 0.5, DAS = 0.16, ARR = 0.05;
const COLORS = ['#1ae6ff', '#ffd91a', '#b84dff', '#40f259', '#ff4050', '#4073ff', '#ff8c1a'];
const WHITE = 7;
// cells use y-down coordinates inside an n x n rotation box (SRS spawn orientation)
const SHAPES = [
  [[0, 1], [1, 1], [2, 1], [3, 1]], // I
  [[0, 0], [1, 0], [0, 1], [1, 1]], // O
  [[1, 0], [0, 1], [1, 1], [2, 1]], // T
  [[1, 0], [2, 0], [0, 1], [1, 1]], // S
  [[0, 0], [1, 0], [1, 1], [2, 1]], // Z
  [[0, 0], [0, 1], [1, 1], [2, 1]], // J
  [[2, 0], [0, 1], [1, 1], [2, 1]], // L
  [[0, 0]], // bomb (power-up)
];
const BOX = [4, 2, 3, 3, 3, 3, 3, 1];
const ROT = SHAPES.map((s, t) => {
  const n = BOX[t], r = [s];
  for (let i = 1; i < 4; i++) r.push(r[i - 1].map(([x, y]) => [n - 1 - y, x]));
  return r;
});
// SRS wall kicks (x right, y UP as in the guideline tables)
const KJ = {
  '01': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], '10': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '12': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], '21': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '23': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], '32': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '30': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], '03': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};
const KI = {
  '01': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], '10': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '12': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], '21': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '23': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], '32': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '30': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], '03': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};
const LINE_PTS = [0, 100, 300, 500, 800];
const FONT = "'Chalkboard SE','Comic Sans MS','Marker Felt','Arial Rounded MT Bold','Arial Black',Impact,system-ui,sans-serif";
const NFONT = "'Arial Rounded MT Bold','Arial Black',Impact,system-ui,sans-serif";

const STAGES = [
  { name: 'TROPICAL TIDES', bpm: 120, c1: '#ffb703', c2: '#00d4ff', root: 45, prog: [0, 0, -4, -2], chord: [0, 7, 12, 15, 12, 7, 3, 7],
    kick: 'x...x...x...x...', hat: '..o...o...o...o.', clap: '....x.......x...', bass: 'x.xox.xox.xox.xo', perc: '................',
    arp: 'x.xxx.xxx.xxx.xx', bw: 'sawtooth', aw: 'square', alp: 1800 },
  { name: 'SEWER LAIR', bpm: 126, c1: '#7cff4f', c2: '#d9c36a', root: 38, prog: [0, 3, -2, 5], chord: [0, 7, 10, 14, 19, 14, 10, 7],
    kick: 'x.......x.....x.', hat: 'x.x.x.x.x.x.x.x.', clap: '........x.......', bass: 'x...x.o.x...x.o.', perc: '................',
    arp: 'x..x..x..x..x.x.', bw: 'triangle', aw: 'sine', alp: 3000, echo: true },
  { name: 'NEO METROPOLIS', bpm: 130, c1: '#00e5ff', c2: '#ff3df2', root: 40, prog: [0, 0, 3, 5], chord: [0, 3, 7, 10, 12, 10, 7, 3],
    kick: 'x..x..x...x..x..', hat: 'xxoxxxoxxxoxxxox', clap: '....x.......x...', bass: 'x..xo..x..x.o..x', perc: '..x..x...x..x.x.',
    arp: 'xx.xx.xx.xx.xx.x', bw: 'square', aw: 'triangle', alp: 2200 },
  { name: 'STORM PLANET', bpm: 136, c1: '#b388ff', c2: '#3dffd8', root: 36, prog: [0, 1, 0, -2], chord: [0, 1, 7, 12, 13, 12, 7, 1],
    kick: 'x...x...x...x.x.', hat: '..o...o...o...o.', clap: '....x.......x...', bass: 'xxoxxxoxxxoxxxox', perc: 'x.......x.......',
    arp: 'x.x.x.x.x.x.x.x.', bw: 'sawtooth', aw: 'sawtooth', alp: 1400 },
  { name: 'EVENT HORIZON', bpm: 145, c1: '#ff9e3d', c2: '#c77dff', root: 42, prog: [0, -5, 2, -3], chord: [0, 12, 3, 15, 7, 19, 10, 22],
    kick: 'x...x...x...x...', hat: 'xxxxxxxxxxxxxxxx', clap: '....x..x....x...', bass: 'x.x.x.xox.x.x.xo', perc: '...x......x..x..',
    arp: 'xxxxxxxxxxxxxxxx', bw: 'square', aw: 'square', alp: 2600, glitch: true },
  { name: 'DEEP SEA ABYSS', c1: '#2bd9ff', c2: '#7dffd0' },
  { name: 'CRYSTAL CAVERNS', c1: '#d77dff', c2: '#7df9ff' },
  { name: 'CLOCKWORK FACTORY', c1: '#ffb347', c2: '#ffd98a' },
  { name: 'HAUNTED FOREST', c1: '#9dff6a', c2: '#c9a6ff' },
  { name: "VAMPIRE'S TOMB", c1: '#ff3355', c2: '#ffb3c1' },
];
const BOSS = 9, LAST_STAGE = 9;
const TEAL = ['#00E5FF', '#1DE9B6'], AQUA = ['#1DE9B6', '#2979FF'], OCEAN = ['#00E5FF', '#2979FF'], DEEP = ['#00B8D4', '#1DE9B6', '#2979FF'];
const LOGO = ['#00E5FF', '#1DE9B6', '#64FFDA', '#2979FF', '#18FFFF', '#00BFA5', '#448AFF'];
const TAGLINES = [
  'Now with 37% more blocks!', 'Gravity: still undefeated.', 'Certified rectangle-adjacent.',
  'Your thumbs called. They want a workout.', 'Warning: may cause fist pumps.', 'Blocks fall. You don\'t. Hopefully.',
  'Rated E for Excessively Square.', 'Lines go in. Points come out.', 'Handcrafted by tiny block elves.',
  'Side effects include MEGA POP!',
];
const OVER_JOKES = ['The blocks send their regards.', 'Gravity wins again.', 'That was... a choice.', 'So close! (Probably.)',
  'The stack has achieved sentience.', 'Have you tried NOT stacking to the top?'];

// ---------------------------------------------------------------- storage
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
const settings = Object.assign({ sound: true, music: true, buttons: true }, store.get('bb_settings', {}));
const saveSettings = () => store.set('bb_settings', settings);
let scores = store.get('bb_scores_v2', []);
if (!Array.isArray(scores)) scores = [];
let lastInit = String(store.get('bb_init', 'AAA')).slice(0, 3).padEnd(3, 'A');

// ---------------------------------------------------------------- helpers
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, k) => a + (b - a) * k;
const easeOutBack = (k) => { const c = 1.70158; k -= 1; return 1 + (c + 1) * k * k * k + c * k * k; };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const fmt = (n) => Math.floor(n).toLocaleString('en-US');
const money = (n) => '$' + fmt(n); // scores are stored as plain integers (dollars) so a store can spend them
const mf = (n) => 440 * Math.pow(2, (n - 69) / 12);
const font = (sz, f) => 'bold ' + Math.max(1, Math.round(sz)) + 'px ' + (f || FONT);
function txt(s, x, y, size, fill, stroke, align, f, lw) {
  ctx.font = font(size, f); ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = lw || Math.max(2, size * 0.16); ctx.strokeStyle = stroke; ctx.strokeText(s, x, y); }
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
}
function fitTxt(s, x, y, size, maxW, fill, stroke, align, f) {
  ctx.font = font(size, f);
  const w = ctx.measureText(s).width;
  if (w > maxW) size *= maxW / w;
  txt(s, x, y, size, fill, stroke, align, f);
}
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
// ---------------------------------------------------------------- audio (Web Audio, all procedural)
const A = { ctx: null, master: null, mus: null, sfx: null, noise: null, unlocked: false };
let silentEl = null;
function silentWavURI() {
  const sr = 8000, n = 4000, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  const b = new Uint8Array(buf); let str = ''; for (let i = 0; i < b.length; i++) str += String.fromCharCode(b[i]);
  return 'data:audio/wav;base64,' + btoa(str);
}
// Called synchronously from every touchend / pointerup / click / keydown handler.
function audioUnlock() {
  try {
    // iOS 17+: treat the page as media playback so sound plays even with the ringer switch on silent
    if (navigator.audioSession && navigator.audioSession.type !== 'playback') { try { navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ } }
    if (!A.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = new AC();
      A.ctx = c;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
      A.master = c.createGain(); A.master.gain.value = settings.sound ? 0.8 : 0;
      A.mus = c.createGain(); A.mus.gain.value = 0.42;
      A.sfx = c.createGain(); A.sfx.gain.value = 0.9;
      A.mus.connect(A.master); A.sfx.connect(A.master); A.master.connect(comp);
      const lim = c.createDynamicsCompressor(); // brick-wall-ish safety limiter so nothing clips
      lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
      comp.connect(lim); lim.connect(c.destination);
      const len = c.sampleRate | 0, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      A.noise = buf;
      c.onstatechange = () => { if (c.state === 'running') { M.next = 0; } };
      try { xmPrefetch(0); xmPrefetch(1); } catch (e) { /* optional */ }
    }
    // 'suspended' or iOS 'interrupted' (phone call, Siri, other app): resume inside this gesture
    if (A.ctx.state !== 'running') { const p = A.ctx.resume(); if (p && p.catch) p.catch(() => {}); }
    if (!A.unlocked) { // play a silent buffer inside the gesture
      const s = A.ctx.createBufferSource(); s.buffer = A.ctx.createBuffer(1, 1, 22050); s.connect(A.ctx.destination); s.start(0);
      A.unlocked = true;
    }
    // silent looping <audio>: moves iOS into the "playback" audio category (ignores the silent switch on older iOS)
    if (settings.sound && !document.hidden) {
      if (!silentEl) { silentEl = document.createElement('audio'); silentEl.src = silentWavURI(); silentEl.loop = true; silentEl.setAttribute('playsinline', ''); silentEl.setAttribute('x-webkit-airplay', 'deny'); silentEl.preload = 'auto'; }
      if (silentEl.paused) { const p = silentEl.play(); if (p && p.catch) p.catch(() => {}); }
    }
  } catch (e) { /* audio is optional */ }
}
let aokTry = 0;
const aok = () => {
  if (!A.ctx || !settings.sound) return false;
  if (A.ctx.state !== 'running') { const n = Date.now(); if (n - aokTry > 500) { aokTry = n; try { const p = A.ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ } } return false; }
  return true;
};
const anow = () => A.ctx.currentTime;
function tone(f, d, type, v, o) {
  if (!aok()) return;
  o = o || {};
  const c = A.ctx, t = o.when || c.currentTime;
  const os = c.createOscillator(), gn = c.createGain();
  os.type = type || 'square';
  os.frequency.setValueAtTime(f, t);
  if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + d);
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(v, t + (o.a || 0.005));
  gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  let node = os;
  if (o.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; fl.Q.value = o.q || 1; os.connect(fl); node = fl; }
  node.connect(gn); gn.connect(o.dest || A.sfx); if (!o.dest && v >= 0.06) xmSfxDuck();
  os.start(t); os.stop(t + d + 0.03);
}
function noise(d, v, type, freq, o) {
  if (!aok()) return;
  o = o || {};
  const c = A.ctx, t = o.when || c.currentTime;
  const s = c.createBufferSource(); s.buffer = A.noise;
  const fl = c.createBiquadFilter(); fl.type = type || 'lowpass'; fl.frequency.value = freq || 1000; fl.Q.value = o.q || 0.8;
  const gn = c.createGain();
  gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(fl); fl.connect(gn); gn.connect(o.dest || A.sfx); if (!o.dest && v >= 0.1) xmSfxDuck();
  if (d > 0.45) s.loop = true;
  s.start(t, Math.random() * 0.5); s.stop(t + d + 0.02);
}
const sfx = {
  move() { tone(170, 0.045, 'square', 0.07, { lp: 900 }); noise(0.025, 0.05, 'bandpass', 2500); },
  rotate() { tone(480, 0.07, 'triangle', 0.13, { to: 820 }); noise(0.02, 0.06, 'highpass', 4000); },
  lock() { tone(120, 0.14, 'sine', 0.4, { to: 42 }); noise(0.09, 0.22, 'lowpass', 700); tone(70, 0.1, 'square', 0.06, { lp: 250, to: 40 }); },
  slam() { tone(95, 0.3, 'sine', 0.65, { to: 28 }); tone(55, 0.25, 'sawtooth', 0.12, { lp: 320, to: 30 }); noise(0.25, 0.5, 'lowpass', 1100); noise(0.05, 0.2, 'bandpass', 3000); },
  line(n) {
    if (!aok()) return;
    const t = anow(), base = [72, 76, 79, 84], up = (g.level - 1) % 5;
    for (let i = 0; i < n; i++) {
      tone(mf(base[i] + up), 0.42, 'triangle', 0.22, { when: t + i * 0.07 });
      tone(mf(base[i] + up + 12), 0.28, 'sine', 0.08, { when: t + i * 0.07 });
    }
    noise(0.3, 0.1, 'highpass', 6000);
  },
  quad() {
    if (!aok()) return;
    const t = anow();
    [60, 64, 67, 72, 67, 72, 76, 79, 84].forEach((n, i) => {
      tone(mf(n), i === 8 ? 0.7 : 0.13, 'square', 0.12, { when: t + i * 0.075, lp: 3500 });
      tone(mf(n - 12), 0.12, 'sawtooth', 0.06, { when: t + i * 0.075, lp: 1200 });
    });
    sfx.slam();
  },
  level() { if (!aok()) return; tone(180, 0.6, 'sawtooth', 0.13, { to: 1800, lp: 4000 }); tone(360, 0.6, 'square', 0.05, { to: 2400, lp: 3000, when: anow() + 0.05 }); },
  over() {
    if (!aok()) return;
    const c = A.ctx, t = c.currentTime + 0.05;
    [55, 54, 53, 52].forEach((n, i) => { // sad trombone wah-wah
      const st = t + i * 0.42, d = i === 3 ? 1.15 : 0.38;
      const o = c.createOscillator(), f = c.createBiquadFilter(), gn = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(mf(n), st);
      if (i === 3) {
        const lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = 6; lg.gain.value = mf(n) * 0.03; lfo.connect(lg); lg.connect(o.frequency); lfo.start(st); lfo.stop(st + d);
        o.frequency.linearRampToValueAtTime(mf(n) * 0.92, st + d);
      }
      f.type = 'lowpass'; f.Q.value = 9;
      f.frequency.setValueAtTime(250, st); f.frequency.exponentialRampToValueAtTime(1800, st + d * 0.35); f.frequency.exponentialRampToValueAtTime(300, st + d);
      gn.gain.setValueAtTime(0.0001, st); gn.gain.exponentialRampToValueAtTime(0.3, st + 0.03);
      gn.gain.setValueAtTime(0.3, st + d * 0.75); gn.gain.exponentialRampToValueAtTime(0.0001, st + d);
      o.connect(f); f.connect(gn); gn.connect(A.sfx); o.start(st); o.stop(st + d + 0.05);
    });
  },
  punch() { noise(0.16, 0.7, 'lowpass', 1600); tone(160, 0.2, 'sine', 0.8, { to: 38 }); tone(900, 0.05, 'square', 0.12, { to: 180 }); },
  bonk(v) { tone(260 + Math.random() * 140, 0.09, 'sine', 0.07 * v, { to: 120 }); },
  blip() { tone(660, 0.05, 'square', 0.07, { lp: 2500 }); },
  pause() { if (!aok()) return; tone(520, 0.08, 'square', 0.08, { lp: 2000 }); tone(390, 0.1, 'square', 0.08, { lp: 2000, when: anow() + 0.09 }); },
  pop(chain, count) {
    if (!aok()) return;
    const t = anow(), base = 64 + Math.min(chain - 1, 6) * 3;
    noise(0.12, 0.45, 'lowpass', 1400); tone(150, 0.16, 'sine', 0.55, { to: 50 });
    [0, 4, 7, 12].forEach((n, i) => tone(mf(base + n), 0.32, 'triangle', 0.18, { when: t + 0.03 + i * 0.055 }));
    if (count >= 6) tone(mf(base + 19), 0.4, 'sine', 0.1, { when: t + 0.25 });
  },
  crack() { noise(0.18, 0.4, 'bandpass', 900, { q: 3 }); tone(300, 0.12, 'square', 0.08, { to: 90, lp: 900 }); },
  land() { tone(110, 0.08, 'sine', 0.18, { to: 60 }); },
  rise(kind) { tone(kind === 'lava' ? 60 : 90, 0.5, 'sawtooth', 0.2, { to: 140, lp: 500 }); noise(0.4, 0.35, 'lowpass', 400); },
  rumble() { if (!aok()) return; for (let i = 0; i < 5; i++) { tone(45 + i * 3, 0.5, 'sawtooth', 0.12, { lp: 180, when: anow() + i * 0.45 }); noise(0.4, 0.2, 'lowpass', 200, { when: anow() + i * 0.45 }); } },
  glitchWarn() { if (!aok()) return; tone(520, 1.25, 'sine', 0.09, { to: 70 }); tone(780, 1.2, 'triangle', 0.035, { to: 110 }); noise(1.2, 0.08, 'bandpass', 600, { q: 4 }); }, // gravity warp wind-up
  glitch() { if (!aok()) return; tone(60, 0.35, 'sine', 0.3, { to: 900 }); for (let i = 0; i < 5; i++) tone(rand(300, 1600), 0.05, 'triangle', 0.06, { when: anow() + i * 0.03 }); noise(0.25, 0.18, 'highpass', 2500); },
  thunder(delay) { // low procedural thunder: crack + long rumble, delayed after the flash
    if (!aok()) return false;
    const t = anow() + delay;
    noise(0.3, 0.09, 'lowpass', 1600, { when: t }); noise(2.8, 0.16, 'lowpass', 170, { when: t + 0.04, q: 0.6 }); noise(2.2, 0.11, 'lowpass', 90, { when: t + 0.35 }); tone(46, 1.8, 'sine', 0.07, { when: t + 0.1, to: 30 });
    return true;
  },
  danger() { if (!aok()) return; const t = anow(); [0, 0.16, 0.32].forEach((d, i) => tone(i % 2 ? 660 : 880, 0.12, 'square', 0.07, { when: t + d, lp: 3000 })); },
  chaching() { // cash register: drawer slam + two bright bells + coin shimmer
    if (!aok()) return; const t = anow() + 0.02;
    noise(0.06, 0.25, 'bandpass', 2500, { when: t, q: 2 }); tone(180, 0.08, 'square', 0.08, { when: t, to: 90, lp: 1500 });
    tone(2093, 0.5, 'triangle', 0.12, { when: t + 0.07 }); tone(2637, 0.6, 'triangle', 0.12, { when: t + 0.16 }); tone(5274, 0.3, 'sine', 0.03, { when: t + 0.16 });
    for (let i = 0; i < 6; i++) tone(rand(3000, 5200), 0.06, 'sine', 0.025, { when: t + 0.2 + i * 0.045 });
  },
  cheer() { if (!aok()) return; const t = anow(); [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => tone(mf(n), 0.25, 'square', 0.09, { when: t + i * 0.06, lp: 4000 })); },
  light() { if (!aok()) return; const t = anow(); tone(1320, 0.5, 'sine', 0.12, { when: t }); tone(1980, 0.4, 'sine', 0.05, { when: t + 0.05 }); tone(660, 0.35, 'triangle', 0.06, { when: t, to: 990 }); }, // dim block lights up (sonar-ish ping)
  ice() { noise(0.12, 0.35, 'highpass', 3500, { q: 2 }); tone(2400, 0.2, 'triangle', 0.08, { to: 1800 }); tone(3200, 0.25, 'sine', 0.05); }, // frozen block cracks
  shatter() { if (!aok()) return; const t = anow(); noise(0.3, 0.4, 'highpass', 2500); for (let i = 0; i < 6; i++) tone(rand(2600, 5200), 0.18, 'sine', 0.05, { when: t + i * 0.03 }); },
  gears() { if (!aok()) return; const t = anow(); for (let i = 0; i < 10; i++) { noise(0.025, 0.22, 'bandpass', 1800 + (i % 2) * 600, { when: t + i * 0.13, q: 4 }); tone(i % 2 ? 210 : 160, 0.05, 'square', 0.04, { when: t + i * 0.13, lp: 900 }); } tone(70, 1.2, 'sawtooth', 0.06, { lp: 260, when: t, to: 110 }); },
  clunk() { tone(90, 0.25, 'square', 0.16, { lp: 600, to: 55 }); noise(0.18, 0.3, 'bandpass', 900, { q: 2 }); noise(0.5, 0.08, 'highpass', 4000); }, // conveyor shifts + steam hiss
  whoosh() { if (!aok()) return; const c = A.ctx, t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g2 = c.createGain(); s.buffer = A.noise; s.loop = true; f.type = 'bandpass'; f.Q.value = 2.5; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(1400, t + 0.8); f.frequency.exponentialRampToValueAtTime(250, t + 1.8); g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.22, t + 0.6); g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.9); s.connect(f); f.connect(g2); g2.connect(A.sfx); s.start(t); s.stop(t + 2); tone(220, 1.6, 'sine', 0.035, { when: t + 0.2, to: 180 }); }, // ghostly fog
  laugh(base, v) { if (!aok()) return; vampLaugh(A.ctx, anow() + 0.02, M.E ? M.E.fx : A.sfx, base || 96, v || 0.42, A.noise); }, // evil vampire laugh (through the music reverb when available)
  bats() { if (!aok()) return; const t = anow(); for (let i = 0; i < 7; i++) tone(rand(3200, 5600), 0.06, 'sine', 0.05, { when: t + i * 0.07, to: rand(1800, 2600) }); noise(0.6, 0.12, 'bandpass', 900, { q: 3 }); }, // screeching bat swarm + wing flutter
  web() { noise(0.15, 0.25, 'bandpass', 600, { q: 3 }); tone(140, 0.12, 'sine', 0.12, { to: 90 }); },
  hurt() { if (!aok()) return; const c = A.ctx, t = anow(), o = c.createOscillator(), f = c.createBiquadFilter(), g2 = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(85, t + 0.28); f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 3; g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(f); f.connect(g2); g2.connect(A.sfx); o.start(t); o.stop(t + 0.32); }, // vampire grunt when hit
  defeat() { // vampire's last cry: long falling "nooo" (ooh formant) + bats bursting out + big thud
    if (!aok()) return; const c = A.ctx, t = anow() + 0.02, o = c.createOscillator(), mix = c.createGain(), amp = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(70, t + 1.6);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 6; lg.gain.value = 60; lfo.connect(lg); lg.connect(o.detune);
    for (const [f, gv] of VOWELS.ooh) { const bp = c.createBiquadFilter(), bg = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 6; bg.gain.value = gv * 2.4; mix.connect(bp); bp.connect(bg); bg.connect(amp); }
    amp.gain.setValueAtTime(0.0001, t); amp.gain.exponentialRampToValueAtTime(0.5, t + 0.08); amp.gain.setValueAtTime(0.45, t + 1.1); amp.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
    o.connect(mix); amp.connect(M.E ? M.E.fx : A.sfx); amp.connect(A.sfx); o.start(t); lfo.start(t); o.stop(t + 1.75); lfo.stop(t + 1.75);
    sfx.bats(); tone(60, 0.9, 'sine', 0.5, { when: t + 0.1, to: 28 }); noise(0.8, 0.3, 'lowpass', 500, { when: t + 0.1 });
  },
};

// ---------------------------------------------------------------- music engine (procedural electro techno)
// One engine per AudioContext (live or offline). All drums are pre-rendered into small buffers once,
// synths use short-lived oscillators with a global voice cap, effects are shared nodes reused forever.
const TRACKS = [
  { name: 'TITLE', bpm: 128, root: 33, swing: 0, chords: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]],
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', hat16: 'xxoxxxoxxxoxxxox', perc: '................',
    bass: 'rolling', bpat: '.x.x.x.x.x.x.x.x', acid: false, apat: 'x.xa.xx.xa.x.xxa', anotes: [0, 0, 12, 0, 3, 0, 7, 12, 0, 0, 12, 10, 0, 7, 3, 12],
    arp: 'xxxxxxxxxxxxxxxx', arpOrder: [0, 1, 2, 3, 2, 1, 4, 2], fm: [2, 1.6], pad: 'sus', padGate: null,
    lead: 'x..x..x.x.x.x...', leadDeg: [4, 3, 2, 3, 4, 5, 4, 2], leadV: 5, leadCut: 5200, kickType: 0, duck: 0.22,
    dly: 0.75, fb: 0.38, rev: 0.32, zap: 0.35, glitch: 0.15, drive: 0, alarm: [24, 27] },
  { name: 'TROPICAL TIDES', bpm: 120, root: 33, swing: 0, chords: [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [-2, 2, 5]],
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', hat16: 'x.oxx.ox x.oxx.ox'.replace(/ /g, ''), perc: '......x.......x.',
    bass: 'octave', bpat: 'xoxoxoxoxoxoxoxo', acid: false, apat: 'x..x..x.x..x..x.', anotes: [0, 0, 12, 0, 0, 7, 0, 12, 0, 0, 12, 0, 3, 0, 7, 0],
    arp: 'x.xxx.xxx.xxx.xx', arpOrder: [0, 2, 1, 3, 2, 4], fm: [1, 2.2], pad: 'gate', padGate: 'x.x.xxx.x.x.xx.x',
    lead: 'x...x.x...x.x.x.', leadDeg: [3, 2, 1, 2, 3, 4], leadV: 3, leadCut: 3600, kickType: 0, duck: 0.3,
    dly: 0.75, fb: 0.32, rev: 0.4, zap: 0.15, glitch: 0.08, drive: 0, alarm: [24, 31] },
  { name: 'SEWER LAIR', bpm: 126, root: 38, swing: 0, chords: [[0, 3, 7], [3, 7, 10], [-2, 2, 5], [5, 8, 12]],
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..o...o...o...o.', hat16: 'xxxxxxxxxxxxxxxx', perc: '...x.......x....',
    bass: 'rolling', bpat: '.xxx.xxx.xxx.xxx', acid: false, apat: 'x.x.x.xax.x.x.xa', anotes: [0, 12, 0, 12, 0, 12, 0, 15, 0, 12, 0, 12, 0, 12, 7, 12],
    arp: 'x..x..x..x..x.x.', arpOrder: [0, 2, 4, 3, 1, 4, 2, 5], fm: [3, 1.2], pad: 'gate', padGate: 'x.xx.xx.x.xx.x.x',
    lead: 'x.xx.xx.x.xx.x.x', leadDeg: [4, 4, 3, 4, 5, 4, 3, 2], leadV: 5, leadCut: 4800, kickType: 0, duck: 0.18,
    dly: 0.75, fb: 0.5, rev: 0.55, zap: 0.25, glitch: 0.1, drive: 0, alarm: [26, 29] },
  { name: 'NEO METROPOLIS', bpm: 130, root: 40, swing: 0.14, chords: [[0, 3, 7], [0, 3, 7], [3, 7, 10], [5, 9, 12]],
    kick: 'x.....x...x.....', snare: '....x.......x..x', hat: 'x.xxx.xxx.xxx.xx', hat16: 'xxoxxxoxxxoxxoxx', perc: '..x..x...x..x.x.',
    bass: 'sub', bpat: 'x.........x.....', acid: true, apat: 'x.xa.xxsx.ax.xsa', anotes: [0, 0, 12, 0, 3, 0, 0, 7, 0, 10, 12, 0, 3, 0, 7, 12],
    arp: 'xx.xx.xx.xx.xx.x', arpOrder: [0, 1, 2, 1, 3, 2], fm: [3.5, 2.5], pad: 'sus', padGate: null,
    lead: 'x..x...x..x.x...', leadDeg: [2, 4, 3, 1, 2], leadV: 3, leadCut: 3000, kickType: 1, duck: 0.35,
    dly: 0.5, fb: 0.35, rev: 0.3, zap: 0.3, glitch: 0.12, drive: 0.3, alarm: [24, 30] },
  { name: 'STORM PLANET', bpm: 136, root: 36, swing: 0, chords: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 2, 5]],
    kick: 'x...x...x...x.x.', snare: '....x.......x...', hat: '..x...x...x...x.', hat16: 'x.xxx.xxx.xxx.xx', perc: '.x.x.x.x.x.x.x.x',
    bass: 'sub', bpat: 'x...x...x...x...', acid: true, apat: 'xxaxxsxaxxaxxsxa', anotes: [0, 0, 1, 0, 12, 0, 1, 0, 0, 0, 13, 0, 12, 7, 1, 0],
    arp: 'x.x.x.x.x.x.x.x.', arpOrder: [0, 1, 0, 2, 0, 3], fm: [1.41, 4], pad: 'sus', padGate: null,
    lead: 'x.x...x.x.x...x.', leadDeg: [1, 2, 1, 0, 3, 2], leadV: 3, leadCut: 2400, kickType: 2, duck: 0.3,
    dly: 0.375, fb: 0.3, rev: 0.35, zap: 0.2, glitch: 0.12, drive: 0.75, alarm: [24, 25] },
  { name: 'EVENT HORIZON', bpm: 145, root: 42, swing: 0, chords: [[0, 3, 7], [-5, -2, 2], [2, 5, 9], [-3, 0, 4]],
    kick: 'x...x...x...x...', snare: '....x..x....x...', hat: 'xxxxxxxxxxxxxxxx', hat16: 'xxxxxxxxxxxxxxxx', perc: '...x......x..x..',
    bass: 'rolling', bpat: '.x.x.x.x.x.x.x.x', acid: true, apat: 'xaxxsaxxxaxsxaxx', anotes: [0, 12, 0, 7, 0, 12, 3, 0, 0, 12, 0, 10, 0, 12, 7, 15],
    arp: 'xxxxxxxxxxxxxxxx', arpOrder: [0, 4, 1, 5, 2, 6, 3, 7], fm: [5.01, 3], pad: 'gate', padGate: 'xx.xx.x.xx.x.xx.',
    lead: 'x.x.xx.x..x.x.xx', leadDeg: [4, 6, 3, 5, 2, 4, 1], leadV: 3, leadCut: 4200, kickType: 3, duck: 0.25,
    dly: 0.375, fb: 0.42, rev: 0.3, zap: 0.5, glitch: 0.35, drive: 0.4, alarm: [24, 36] },
  // 6: dub techno from the deep: offbeat chord stabs drowned in echo, sonar pings, sub bass, glassy FM bells
  { name: 'DEEP SEA ABYSS', bpm: 122, root: 35, swing: 0, chords: [[0, 3, 7], [0, 3, 7], [-2, 2, 5], [-4, 0, 3]],
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', hat16: 'x.oxx.oxx.oxx.ox', perc: '.......x.......x', percType: 'sonar',
    bass: 'sub', bpat: 'x.....x...x.....', acid: false, apat: 'x...............', anotes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    arp: 'x..x..x..x..x...', arpOrder: [0, 2, 4, 2, 1, 3], fm: [3.5, 1.4], pad: 'gate', padGate: '..x...x...x..xx.',
    lead: 'x.......x...x...', leadDeg: [4, 3, 2, 1, 2, 3], leadV: 3, leadCut: 2200, kickType: 0, duck: 0.3,
    dly: 0.75, fb: 0.55, rev: 0.6, zap: 0.06, glitch: 0.05, drive: 0, alarm: [24, 27] },
  // 7: sparkling trance-techno: crystal FM bell arps, glass percussion, octave bass
  { name: 'CRYSTAL CAVERNS', bpm: 132, root: 40, swing: 0, chords: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]],
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', hat16: 'xxoxxxoxxxoxxxox', perc: 'x..x..x...x..x..', percType: 'bell',
    bass: 'octave', bpat: 'xoxoxoxoxoxoxoxo', acid: false, apat: 'x...............', anotes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    arp: 'xxxxxxxxxxxxxxxx', arpOrder: [0, 1, 2, 3, 4, 3, 2, 1], fm: [7.0, 1.8], pad: 'sus', padGate: null,
    lead: 'x..x..x.x..x..x.', leadDeg: [4, 5, 6, 5, 4, 3], leadV: 5, leadCut: 6000, kickType: 1, duck: 0.25,
    dly: 0.375, fb: 0.45, rev: 0.55, zap: 0.2, glitch: 0.08, drive: 0, alarm: [28, 31] },
  // 8: industrial techno: distorted kick, tick-tock clockwork percussion, metallic clangs, gritty acid
  { name: 'CLOCKWORK FACTORY', bpm: 138, root: 37, swing: 0, chords: [[0, 3, 7], [0, 3, 7], [1, 5, 8], [-2, 2, 5]],
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hat16: 'x.xxx.xxx.xxx.xx', perc: 'x..x..x..x..x.x.', tick: true,
    bass: 'rolling', bpat: '.xxx.xxx.xxx.xxx', acid: true, apat: 'x.xsx.axx.xsx.ax', anotes: [0, 0, 12, 0, 1, 0, 12, 0, 0, 0, 12, 13, 0, 7, 12, 0],
    arp: 'x.x.x.x.x.x.x.x.', arpOrder: [0, 1, 2, 1], fm: [1.41, 5], pad: 'gate', padGate: 'x..x..x..x..x.x.',
    lead: 'x...x.x.x...x.x.', leadDeg: [2, 3, 2, 1, 0, 1], leadV: 3, leadCut: 2600, kickType: 2, duck: 0.28,
    dly: 0.375, fb: 0.3, rev: 0.25, zap: 0.2, glitch: 0.2, drive: 0.7, alarm: [24, 25] },
  // 9: eerie minor techno: ghostly 'ooh' choir pad, swung hats, creeping acid, harmonic-minor turn
  { name: 'HAUNTED FOREST', bpm: 126, root: 37, swing: 0.1, chords: [[0, 3, 7], [-4, 0, 3], [5, 8, 12], [7, 11, 14]],
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', hat16: 'x.xxx.xxx.xxx.xx', perc: '...x......x.....',
    bass: 'sub', bpat: 'x...x...x...x...', acid: true, apat: 'x..sx.a.x..sx.a.', anotes: [0, 0, 12, 0, 3, 0, 7, 0, 0, 0, 12, 0, 8, 0, 7, 0],
    arp: 'x.xx.xx.x.xx.xx.', arpOrder: [0, 2, 1, 3, 2, 4], fm: [2.01, 3], pad: 'sus', padGate: null, choir: 'ooh',
    lead: 'x..x..x...x.x...', leadDeg: [4, 3, 2, 3, 1, 2], leadV: 3, leadCut: 2400, kickType: 0, duck: 0.3,
    dly: 0.5, fb: 0.48, rev: 0.5, zap: 0.1, glitch: 0.15, drive: 0.2, alarm: [25, 26] },
  // 10: FINAL BOSS - spooky techno: pipe organ toccata riff, creepy 'aah' choir, hard kick, evil vampire laughs
  { name: "VAMPIRE'S TOMB", bpm: 140, root: 38, swing: 0, chords: [[0, 3, 7], [-4, 0, 3], [5, 8, 12], [7, 11, 14]],
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', hat16: 'xxxxxxxxxxxxxxxx', perc: '..x...x...x..x.x',
    bass: 'rolling', bpat: '.x.x.x.x.x.x.x.x', acid: true, apat: 'xaxsx.axxaxsx.ax', anotes: [0, 12, 0, 1, 0, 12, 0, 7, 0, 12, 0, 8, 0, 12, 7, 0],
    arp: 'x.xxx.xxx.xxx.xx', arpOrder: [0, 1, 2, 3, 2, 1], fm: [2, 2], pad: 'sus', padGate: 'x..x..x...x..x..', choir: 'aah', organ: true, laugh: true,
    organRiff: [19, 17, 19, null, null, null, 17, 15, 14, 12, 11, 12, null, null, null, null],
    lead: 'x..x..x...x..x..', leadDeg: [4, 3, 2, 3], leadV: 3, leadCut: 3000, kickType: 3, duck: 0.3,
    dly: 0.5, fb: 0.4, rev: 0.55, zap: 0.1, glitch: 0.2, drive: 0.3, alarm: [26, 27] },
];
// 56-bar arrangement, then loops from bar 4 (build). Each pass through the loop flips the lead variant.
const SECTIONS = [['intro', 4], ['build', 8], ['drop', 16], ['break', 8], ['build', 4], ['drop', 16]];
const SEC_BAR = []; SECTIONS.forEach(([n, len]) => { for (let i = 0; i < len; i++) SEC_BAR.push([n, i, len]); });
function secAt(bar) {
  const loopLen = SEC_BAR.length - 4;
  const b = bar < SEC_BAR.length ? bar : 4 + ((bar - 4) % loopLen);
  const pass = bar < 4 ? 0 : Math.floor((bar - 4) / loopLen);
  const s = SEC_BAR[b];
  return { name: s[0], i: s[1], len: s[2], pass, alt: (pass + (b >= 36 ? 1 : 0)) % 2 };
}
const DROP_BAR = 12;
// tiny DSP helpers for pre-rendering drum buffers
function mkBuf(c, secs, fn) {
  const sr = c.sampleRate, n = Math.max(1, (secs * sr) | 0), b = c.createBuffer(1, n, sr), d = b.getChannelData(0);
  fn(d, sr, n);
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i]));
  if (pk > 0.98) { const k = 0.98 / pk; for (let i = 0; i < n; i++) d[i] *= k; }
  return b;
}
function biq(d, sr, type, f, q) { // in-place RBJ biquad
  const w = 2 * Math.PI * f / sr, al = Math.sin(w) / (2 * q), cs = Math.cos(w);
  let b0, b1, b2; const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
  if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; } else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; } else { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < d.length; i++) { const x = d[i], y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; d[i] = y; }
}
const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];
function metal(d, sr, mul, dec, hp) {
  const ph = METAL.map(() => Math.random());
  for (let i = 0; i < d.length; i++) {
    let s = 0;
    for (let k = 0; k < 6; k++) { ph[k] += METAL[k] * mul / sr; s += (ph[k] % 1) < 0.5 ? 1 : -1; }
    d[i] = (s / 6 * 0.8 + (Math.random() * 2 - 1) * 0.35);
  }
  biq(d, sr, 'hp', hp, 0.7); biq(d, sr, 'hp', hp, 0.7);
  for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] *= Math.exp(-t / dec) * Math.min(1, i / 20); }
}
function kickBuf(c, type) {
  // type 0 punchy club, 1 tight break kick, 2 industrial (distorted), 3 hard/gabber-ish
  const drive = [1.2, 1.6, 4.5, 3.2][type], tail = [0.42, 0.3, 0.38, 0.5][type], f0 = [190, 220, 160, 240][type], f1 = [46, 52, 42, 48][type];
  return mkBuf(c, 0.75, (d, sr, n) => {
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, f = f1 + (f0 - f1) * Math.exp(-t / 0.035);
      ph += f / sr;
      const body = Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.16);
      const sub = Math.sin(2 * Math.PI * ph) * 0.65 * Math.exp(-t / tail) * Math.min(1, t / 0.02);
      const click = (Math.random() * 2 - 1) * Math.exp(-t / 0.0025) * 0.5;
      d[i] = Math.tanh((body + sub + click) * drive) * Math.min(1, (n - i) / 400);
    }
    if (type === 2) for (let i = 0; i < n; i++) { const t = i / sr; d[i] += (Math.random() * 2 - 1) * 0.12 * Math.exp(-t / 0.06); }
  });
}
function snareBuf(c, rough) {
  return mkBuf(c, 0.4, (d, sr, n) => {
    const nz = new Float32Array(n); for (let i = 0; i < n; i++) nz[i] = Math.random() * 2 - 1;
    biq(nz, sr, 'hp', 1200, 0.7);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr; ph += (185 + 60 * Math.exp(-t / 0.02)) / sr;
      d[i] = Math.sin(2 * Math.PI * ph) * 0.6 * Math.exp(-t / 0.05) + nz[i] * 0.8 * Math.exp(-t / (rough ? 0.12 : 0.09));
      if (rough) d[i] = Math.tanh(d[i] * 2.5);
    }
  });
}
function clapBuf(c) {
  return mkBuf(c, 0.45, (d, sr, n) => {
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      let e = Math.exp(-t / 0.11) * 0.7;
      for (let k = 0; k < 3; k++) { const tk = t - k * 0.011; if (tk >= 0 && tk < 0.011) e = Math.max(e, Math.exp(-tk / 0.004)); }
      d[i] = (Math.random() * 2 - 1) * e;
    }
    biq(d, sr, 'bp', 1400, 1.1); biq(d, sr, 'hp', 600, 0.7);
  });
}
function crashBuf(c) {
  return mkBuf(c, 2.2, (d, sr, n) => {
    const m = new Float32Array(n); metal(m, sr, 2.4, 0.9, 5000);
    const nz = new Float32Array(n); for (let i = 0; i < n; i++) nz[i] = Math.random() * 2 - 1;
    biq(nz, sr, 'hp', 4000, 0.6);
    for (let i = 0; i < n; i++) { const t = i / sr; d[i] = m[i] * 0.6 + nz[i] * 0.6 * Math.exp(-t / 0.7) * Math.min(1, t / 0.004); }
  });
}
function irBuf(c, secs) { // stereo reverb impulse, darkened exponential noise
  const sr = c.sampleRate, n = (secs * sr) | 0, b = c.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
    biq(d, sr, 'lp', 6500, 0.7); biq(d, sr, 'hp', 180, 0.7);
  }
  return b;
}
function makeMusic(c, out, fanOut) {
  const E = { c, voices: [], stats: { notes: 0, skipped: 0, fills: 0, risers: 0, uplifts: 0, zaps: 0, fanfares: 0 }, danger: false };
  const G = (v, to) => { const n = c.createGain(); n.gain.value = v; if (to) n.connect(to); return n; };
  const pan = (p, to) => { if (c.createStereoPanner) { const n = c.createStereoPanner(); n.pan.value = p; n.connect(to); return n; } return G(1, to); };
  // --- buses: everything -> pre -> (clean | bitcrush) -> gate (stutter) -> bus compressor -> out
  const glue = c.createDynamicsCompressor();
  glue.threshold.value = -10; glue.knee.value = 6; glue.ratio.value = 3; glue.attack.value = 0.01; glue.release.value = 0.12;
  glue.connect(out);
  E.gate = G(1, glue);
  E.clean = G(1, E.gate);
  E.crushAmt = G(0, E.gate);
  const crush = c.createWaveShaper(); const cv = new Float32Array(2048);
  for (let i = 0; i < 2048; i++) { const x = i / 1023.5 - 1; cv[i] = Math.round(x * 7) / 7; }
  crush.curve = cv; crush.connect(E.crushAmt);
  E.pre = G(1); E.pre.connect(E.clean); E.pre.connect(crush);
  // sidechain duck: bass, synths and effect returns pump on every kick
  E.duck = G(1, E.pre);
  E.drums = G(0.95, E.pre);
  E.hats = pan(-0.22, E.drums); E.perc = pan(0.28, E.drums);
  E.bass = G(0.9, E.duck);
  const dshape = c.createWaveShaper(); const dc = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; dc[i] = Math.tanh(x * 4) / Math.tanh(4); }
  dshape.curve = dc; dshape.oversample = 'none';
  E.driveIn = G(0.6); E.driveIn.connect(dshape); E.driveOut = G(0.55, E.duck); dshape.connect(E.driveOut);
  E.synth = G(1); E.normXf = G(1, E.duck); E.synth.connect(E.normXf);
  E.dang = G(1); E.dangXf = G(0, E.duck); E.dang.connect(E.dangXf);
  E.fx = G(0.9, E.pre);
  // ping-pong delay (L -> R -> L ...), darkened feedback
  E.dSend = G(0.25); const dl = c.createDelay(2), dr = c.createDelay(2), fb1 = G(0.35), fb2 = G(0.35), dlp = c.createBiquadFilter();
  dlp.type = 'lowpass'; dlp.frequency.value = 3800;
  const merge = c.createChannelMerger(2), dRet = G(0.7, E.duck);
  E.dSend.connect(dlp); dlp.connect(dl); dl.connect(merge, 0, 0); dl.connect(fb1); fb1.connect(dr); dr.connect(merge, 0, 1); dr.connect(fb2); fb2.connect(dl);
  merge.connect(dRet); E.dl = dl; E.dr = dr; E.fb1 = fb1; E.fb2 = fb2;
  // convolution reverb
  E.rSend = G(0.3); const conv = c.createConvolver(); conv.buffer = irBuf(c, 1.9); E.rSend.connect(conv); conv.connect(G(0.6, E.duck));
  E.drumRev = G(0.12, E.rSend); E.drums.connect(E.drumRev);
  E.synth.connect(E.dSend); E.synth.connect(E.rSend); E.dang.connect(E.dSend);
  E.fx.connect(E.dSend); E.fx.connect(E.rSend);
  E.fan = G(1, fanOut || out); E.fanRev = G(0.5, E.rSend); E.fan.connect(E.fanRev);
  // noise + drum buffers (rendered once)
  const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  E.noise = nb;
  E.kicks = [0, 1, 2, 3].map((t) => kickBuf(c, t));
  E.snare = snareBuf(c, false); E.snareR = snareBuf(c, true); E.clap = clapBuf(c);
  E.hatC = mkBuf(c, 0.09, (d, sr) => metal(d, sr, 1.6, 0.022, 7500));
  E.hatO = mkBuf(c, 0.5, (d, sr) => metal(d, sr, 1.6, 0.16, 7000));
  E.ride = mkBuf(c, 1.3, (d, sr) => { metal(d, sr, 3.1, 0.5, 4500); for (let i = 0; i < d.length; i++) d[i] += Math.sin(i / sr * 2 * Math.PI * 3200) * 0.18 * Math.exp(-i / sr / 0.4); });
  E.crash = crashBuf(c);
  // pipe organ: one oscillator per note with a drawbar-style periodic wave, through a shared tremolo bus
  { const n = 10, re = new Float32Array(n), im = new Float32Array(n); [0, 1, 0.85, 0.55, 0.6, 0, 0.35, 0, 0.3, 0].forEach((v, i) => { im[i] = v; }); E.organWave = c.createPeriodicWave(re, im); }
  E.organBus = G(0.8, E.synth); const olfo = c.createOscillator(), olg = G(0.22, E.organBus.gain); olfo.frequency.value = 5.6; olfo.connect(olg); olfo.start(0);
  E.track = 0;
  E.setTrack = function (i, t) {
    const tr = TRACKS[i], spb = 60 / tr.bpm;
    E.track = i;
    E.dl.delayTime.setValueAtTime(spb * tr.dly, t); E.dr.delayTime.setValueAtTime(spb * tr.dly, t);
    E.fb1.gain.setValueAtTime(tr.fb, t); E.fb2.gain.setValueAtTime(tr.fb, t);
    E.rSend.gain.setValueAtTime(tr.rev, t);
  };
  E.setTrack(0, 0);
  return E;
}
// --- voice management: cap simultaneous oscillators (prio 0 = essential, 1 = normal, 2 = decoration)
const VCAP = [72, 44, 30];
function vAlloc(E, t, end, n, prio) {
  const v = E.voices;
  for (let i = v.length - 1; i >= 0; i--) if (v[i] < t) { v[i] = v[v.length - 1]; v.pop(); }
  if (v.length + n > VCAP[prio]) { E.stats.skipped++; return false; }
  for (let i = 0; i < n; i++) v.push(end);
  E.stats.notes++;
  return true;
}
function smp(E, buf, t, v, dest, rate) {
  const s = E.c.createBufferSource(); s.buffer = buf; if (rate) s.playbackRate.value = rate;
  const g = E.c.createGain(); g.gain.value = v; s.connect(g); g.connect(dest); s.start(t);
}
// detuned supersaw stack through one resonant filter + one amp envelope
function supersaw(E, notes, t, d, o) {
  const n = o.n || 5, c = E.c;
  if (!vAlloc(E, t, t + d + (o.rel || 0.1), notes.length * n, o.prio == null ? 1 : o.prio)) return;
  const fl = c.createBiquadFilter(), g = c.createGain();
  fl.type = 'lowpass'; fl.Q.value = o.q || 1.5;
  const c0 = o.cut || 3000, c1 = o.cutEnd || c0 * 0.4, att = o.att || 0.01, rel = o.rel || 0.1, v = (o.v || 0.1) / Math.sqrt(notes.length * n);
  fl.frequency.setValueAtTime(o.cutStart || c0, t);
  if (o.cutStart) fl.frequency.exponentialRampToValueAtTime(c0, t + (o.cutAtt || 0.05));
  fl.frequency.exponentialRampToValueAtTime(Math.max(150, c1), t + d + rel);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + att);
  g.gain.setValueAtTime(v, t + Math.max(att, d)); g.gain.exponentialRampToValueAtTime(0.0001, t + d + rel);
  fl.connect(g); g.connect(o.dest || E.synth);
  const spread = o.det || 18;
  for (const m of notes) {
    const f = mf(m);
    for (let k = 0; k < n; k++) {
      const os = c.createOscillator(); os.type = 'sawtooth'; os.frequency.setValueAtTime(f, t);
      os.detune.value = n === 1 ? 0 : (k / (n - 1) - 0.5) * 2 * spread;
      if (o.glideTo) os.frequency.exponentialRampToValueAtTime(mf(o.glideTo), t + d);
      os.connect(fl); os.start(t); os.stop(t + d + rel + 0.02);
    }
  }
}
// 2-operator FM pluck / bell
function fmPluck(E, m, t, d, ratio, index, v, dest, prio) {
  if (!vAlloc(E, t, t + d, 2, prio == null ? 1 : prio)) return;
  const c = E.c, f = mf(m), car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain();
  car.frequency.value = f; mod.frequency.value = f * ratio;
  mg.gain.setValueAtTime(f * index, t); mg.gain.exponentialRampToValueAtTime(f * 0.05 + 1, t + d * 0.6);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(dest || E.synth);
  car.start(t); mod.start(t); car.stop(t + d + 0.02); mod.stop(t + d + 0.02);
}
// 303-style acid: saw -> resonant lowpass with accent-driven envelope, optional slide from previous note
function acid(E, m, t, d, accent, slideFrom, drive) {
  if (!vAlloc(E, t, t + d + 0.05, 1, 0)) return;
  const c = E.c, os = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
  os.type = 'sawtooth';
  if (slideFrom != null) { os.frequency.setValueAtTime(mf(slideFrom), t); os.frequency.exponentialRampToValueAtTime(mf(m), t + 0.06); } else os.frequency.setValueAtTime(mf(m), t);
  fl.type = 'lowpass'; fl.Q.value = accent ? 17 : 11;
  const peak = accent ? 3200 : 1500;
  fl.frequency.setValueAtTime(peak, t); fl.frequency.exponentialRampToValueAtTime(accent ? 260 : 200, t + d + (accent ? 0.12 : 0.04));
  const v = accent ? 0.2 : 0.13;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004);
  g.gain.setValueAtTime(v, t + d * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.04);
  os.connect(fl); fl.connect(g); g.connect(drive ? E.driveIn : E.bass);
  os.start(t); os.stop(t + d + 0.06);
}
function bassNote(E, m, t, d, type, v, cut) {
  if (!vAlloc(E, t, t + d, type === 'sub' ? 1 : 2, 0)) return;
  const c = E.c, g = c.createGain(), fl = c.createBiquadFilter();
  fl.type = 'lowpass'; fl.Q.value = 2; fl.frequency.setValueAtTime(cut, t); fl.frequency.exponentialRampToValueAtTime(Math.max(120, cut * 0.35), t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.005);
  g.gain.setValueAtTime(v, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  fl.connect(g); g.connect(E.bass);
  const o1 = c.createOscillator(); o1.type = type === 'sub' ? 'sine' : 'sawtooth'; o1.frequency.value = mf(m); o1.connect(fl); o1.start(t); o1.stop(t + d + 0.02);
  if (type !== 'sub') { const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = mf(m) * 0.5; o2.detune.value = 6; o2.connect(fl); o2.start(t); o2.stop(t + d + 0.02); }
}
function laser(E, t, v) {
  if (!vAlloc(E, t, t + 0.2, 1, 2)) return;
  E.stats.zaps++;
  const c = E.c, os = c.createOscillator(), g = c.createGain();
  os.type = 'square'; const f0 = 1800 + Math.random() * 2400;
  os.frequency.setValueAtTime(f0, t); os.frequency.exponentialRampToValueAtTime(90, t + 0.17);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  os.connect(g); g.connect(E.fx); os.start(t); os.stop(t + 0.2);
}
// white-noise uplifter (band-pass sweep up + swell) ending at tEnd
function uplifter(E, t0, tEnd, v) {
  const c = E.c, d = Math.max(0.3, tEnd - t0);
  E.stats.uplifts++;
  const s = c.createBufferSource(); s.buffer = E.noise; s.loop = true;
  const fl = c.createBiquadFilter(), g = c.createGain();
  fl.type = 'bandpass'; fl.Q.value = 1.8;
  fl.frequency.setValueAtTime(350, t0); fl.frequency.exponentialRampToValueAtTime(9500, tEnd);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v || 0.3, tEnd - 0.01); g.gain.exponentialRampToValueAtTime(0.0001, tEnd + 0.08);
  s.connect(fl); fl.connect(g); g.connect(E.fx); s.start(t0); s.stop(tEnd + 0.1);
  return d;
}
// pipe organ chord/notes (one oscillator per note, drawbar wave), sustained with a soft click
function organ(E, notes, t, d, v, prio) {
  if (!vAlloc(E, t, t + d + 0.1, notes.length, prio == null ? 1 : prio)) return;
  const c = E.c, g = c.createGain(), vv = v / Math.sqrt(notes.length);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vv, t + 0.012); g.gain.setValueAtTime(vv, t + Math.max(0.015, d)); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.09);
  g.connect(E.organBus);
  for (const m of notes) { const os = c.createOscillator(); os.setPeriodicWave(E.organWave); os.frequency.value = mf(m); os.connect(g); os.start(t); os.stop(t + d + 0.12); }
}
// formant choir: two detuned saws per note through three vowel band-passes, slow swell + vibrato
const VOWELS = { aah: [[800, 1], [1150, 0.5], [2900, 0.22]], ooh: [[350, 1], [620, 0.45], [2400, 0.08]] };
function choir(E, notes, t, d, v, vowel, dest) {
  if (!vAlloc(E, t, t + d + 0.6, notes.length * 2 + 1, 1)) return;
  const c = E.c, out = c.createGain(), mix = c.createGain(), att = Math.min(0.6, d * 0.4), vv = v / Math.sqrt(notes.length);
  out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(vv, t + att); out.gain.setValueAtTime(vv, t + Math.max(att, d)); out.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.55);
  out.connect(dest || E.synth);
  for (const [f, gv] of VOWELS[vowel] || VOWELS.aah) { const bp = c.createBiquadFilter(), bg = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 7; bg.gain.value = gv * 2.2; mix.connect(bp); bp.connect(bg); bg.connect(out); }
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 5.2; lg.gain.value = 14; lfo.connect(lg); lfo.start(t); lfo.stop(t + d + 0.6);
  for (const m of notes) for (let k = 0; k < 2; k++) { const os = c.createOscillator(); os.type = 'sawtooth'; os.frequency.value = mf(m); os.detune.value = k ? 9 : -9; lg.connect(os.detune); os.connect(mix); os.start(t); os.stop(t + d + 0.6); }
}
// procedural evil vampire laugh: "MWAH-HA-HA-HA-HA" - a deep voice (saw + sub) through vowel formants,
// per-syllable pitch + amplitude envelopes, breathy 'h' noise at each syllable, wobbly vibrato
function vampLaugh(c, t, dest, base, v, noiseBuf) {
  base = base || 98; v = v || 0.5;
  const syl = [[0, 0.34, 1.0], [0.42, 0.15, 1.22], [0.62, 0.15, 1.17], [0.82, 0.15, 1.1], [1.02, 0.17, 1.02], [1.25, 0.3, 0.9]];
  const end = t + 1.65, os = c.createOscillator(), sub = c.createOscillator(), mix = c.createGain(), amp = c.createGain(), lp = c.createBiquadFilter();
  os.type = 'sawtooth'; sub.type = 'square'; lp.type = 'lowpass'; lp.Q.value = 1;
  amp.gain.setValueAtTime(0.0001, t);
  lp.frequency.setValueAtTime(350, t); lp.frequency.exponentialRampToValueAtTime(4200, t + 0.12);
  for (const [o, d, p] of syl) {
    const st = t + o, f = base * p;
    os.frequency.setValueAtTime(f * 1.06, st); os.frequency.exponentialRampToValueAtTime(f * 0.86, st + d);
    sub.frequency.setValueAtTime(f * 0.53, st); sub.frequency.exponentialRampToValueAtTime(f * 0.43, st + d);
    amp.gain.setValueAtTime(0.0001, st); amp.gain.exponentialRampToValueAtTime(v, st + 0.025); amp.gain.setValueAtTime(v * 0.8, st + d * 0.6); amp.gain.exponentialRampToValueAtTime(0.0001, st + d);
    if (noiseBuf && o > 0) { const n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain(); n.buffer = noiseBuf; nf.type = 'bandpass'; nf.frequency.value = 1700; nf.Q.value = 1.2; ng.gain.setValueAtTime(v * 0.5, st - 0.03); ng.gain.exponentialRampToValueAtTime(0.0001, st + 0.05); n.connect(nf); nf.connect(ng); ng.connect(dest); n.start(st - 0.03, Math.random() * 0.5); n.stop(st + 0.06); }
  }
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 7.5; lg.gain.value = 35; lfo.connect(lg); lg.connect(os.detune);
  const sg = c.createGain(); sg.gain.value = 0.35; sub.connect(sg); sg.connect(mix); os.connect(mix);
  for (const [f, gv] of [[750, 1], [1180, 0.6], [2600, 0.25]]) { const bp = c.createBiquadFilter(), bg = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 5; bg.gain.value = gv * 2.4; mix.connect(bp); bp.connect(bg); bg.connect(lp); }
  lp.connect(amp); amp.connect(dest);
  os.start(t); sub.start(t); lfo.start(t); os.stop(end); sub.stop(end); lfo.stop(end);
  return 1.65;
}
// pitch riser (detuned saws gliding up an octave or two)
function riser(E, root, t0, tEnd) {
  E.stats.risers++;
  supersaw(E, [root + 24], t0, tEnd - t0, { n: 3, det: 30, v: 0.07, att: tEnd - t0 - 0.02, cut: 6000, cutStart: 400, cutAtt: tEnd - t0, rel: 0.05, glideTo: root + 48, dest: E.fx, prio: 2 });
}
// schedule one 16th step of track ti at time t
function chordAt(tr, bar) { return tr.chords[bar % tr.chords.length]; }
function chordTone(tr, bar, deg, base) { const ch = chordAt(tr, bar); const o = Math.floor(deg / 3); return tr.root + base + ch[((deg % 3) + 3) % 3] + o * 12; }
function musicStep(E, ti, step, t) {
  const tr = TRACKS[ti], spb = 60 / tr.bpm / 4, s = step % 16, bar = Math.floor(step / 16), beat = s >> 2;
  const sec = secAt(bar), nm = sec.name, drop = nm === 'drop', build = nm === 'build', brk = nm === 'break', intro = nm === 'intro';
  const lastBar = sec.i === sec.len - 1, nextIsDrop = (build && lastBar) || (bar === DROP_BAR - 1);
  const sw = (s & 1) ? spb * tr.swing : 0, ts = t + sw;
  const ch = chordAt(tr, bar), r = tr.root;
  const fill16 = bar % 16 === 15, fill8 = bar % 8 === 7;
  const inFill = (fill16 && s >= 8) || (fill8 && s >= 12);
  // ---- drums
  const kickOn = !brk && !(nextIsDrop && s >= 12) && !(intro && ti === 0 && bar < 2);
  if (kickOn && tr.kick[s] === 'x') {
    smp(E, E.kicks[tr.kickType], t, 0.95, E.drums);
    const dk = E.duck.gain; dk.setTargetAtTime(tr.duck, t, 0.004); dk.setTargetAtTime(1, t + 0.03, 60 / tr.bpm * 0.17);
  }
  if (brk && s === 0 && sec.i % 2 === 0) smp(E, E.kicks[tr.kickType], t, 0.35, E.drumRev); // distant boom
  if (!intro || sec.i >= 2) {
    if (!brk && tr.snare[s] === 'x') { smp(E, tr.drive > 0.5 ? E.snareR : E.snare, ts, 0.5, E.drums); if (ti !== 3) smp(E, E.clap, ts + 0.004, 0.42, E.drums); }
    if (ti === 3 && !brk && (s === 7 || s === 10) && bar % 2) smp(E, E.snare, ts, 0.16, E.drums); // ghost notes (breakbeat)
  }
  // snare roll building into drops
  if (nextIsDrop && (build || bar === DROP_BAR - 1)) {
    const dens = s < 8 ? (s % 2 === 0) : true;
    if (dens) smp(E, E.snare, ts, 0.12 + 0.3 * s / 16, E.drums);
  } else if (build && sec.i === sec.len - 2 && s % 4 === 0) smp(E, E.snare, ts, 0.2, E.drums);
  const hp = drop ? tr.hat16 : tr.hat, hv = drop ? 1 : (brk ? 0.5 : 0.8);
  if (!(brk && sec.i < 4)) {
    const hc = hp[s];
    if (hc === 'x') smp(E, E.hatC, ts, (s % 4 === 2 ? 0.34 : 0.2) * hv, E.hats);
    else if (hc === 'o') smp(E, E.hatO, ts, 0.26 * hv, E.hats);
  }
  if (drop && s % 4 === 0) smp(E, E.ride, t, 0.17, E.perc);
  if ((drop || build) && tr.perc[s] === 'x' && tr.percType) {
    if (tr.percType === 'sonar') fmPluck(E, r + 60 + (bar % 2 ? 7 : 0), ts, 0.6, 1, 0.4, 0.07, E.fx, 2); // sonar ping into the echoes
    else fmPluck(E, r + 48 + [0, 7, 12, 3][(step >> 1) % 4], ts, 0.4, 7.0, 2.6, 0.05, E.perc, 2); // glassy crystal bell
  } else if ((drop || build) && tr.perc[s] === 'x') {
    if (tr.drive > 0.5) fmPluck(E, r + 36, ts, 0.16, 1.41, 9, 0.09, E.perc, 2); // metallic clang
    else if (ti === 5) fmPluck(E, r + 36 + ((step * 7) % 24), ts, 0.07, 5.01, 6, 0.06, E.perc, 2); // glitch bleep
    else fmPluck(E, r + 24 + (s % 3) * 5, ts, 0.12, 1, 2.5, 0.12, E.perc, 2); // tom/conga
  }
  if (s === 0 && (sec.i === 0 && (drop || (nm === 'build' && bar > 4)) || bar === 0)) smp(E, E.crash, t, 0.38, E.perc);
  if (tr.tick && !intro && (s & 3) !== 1 && (s & 3) !== 3) fmPluck(E, r + ((s & 3) ? 55 : 62), ts, 0.035, 3.5, 5, (s & 3) ? 0.035 : 0.05, E.perc, 2); // tick-tock clockwork
  // ---- bass
  if (!brk) {
    const bc = tr.bpat[s];
    if (bc !== '.' && (tr.bass !== 'sub' || !intro || sec.i >= 1)) {
      const m = r + ch[0] + (bc === 'o' ? 12 : 0);
      const cut = intro ? 500 : (build ? 600 + sec.i * 120 : 1300);
      if (tr.bass === 'sub') bassNote(E, m, t, spb * 6, 'sub', 0.5, 300);
      else bassNote(E, m, ts, spb * (tr.bass === 'rolling' ? 0.9 : 0.85), tr.bass, 0.32, cut);
    }
    if (tr.acid && (drop || (build && sec.i >= 2)) && tr.apat[s] !== '.') {
      const ac = tr.apat[s], prev = tr.apat[(s + 15) % 16];
      const m = r + 12 + ch[0] + tr.anotes[s] + (sec.alt && s >= 8 ? 0 : 0);
      const slide = prev === 's' ? r + 12 + ch[0] + tr.anotes[(s + 15) % 16] : null;
      acid(E, m, ts, spb * (ac === 's' ? 1.05 : 0.7), ac === 'a', slide, tr.drive > 0);
    }
  } else if (s === 0) bassNote(E, r + ch[0], t, spb * 16, 'sub', 0.32, 200);
  // ---- pads (supersaw chord once per bar; gated variants use 8th/16th stabs from the same stack)
  const padOn = !intro || sec.i >= 2;
  if (padOn) {
    const notes = ch.map((x) => r + 24 + x).concat(drop || brk ? [r + 36 + ch[0]] : []);
    if (tr.pad === 'gate' && (drop || build) && tr.padGate) {
      if (tr.padGate[s] === 'x') supersaw(E, notes, t, spb * 0.8, { n: 3, det: 22, v: drop ? 0.16 : 0.1, cut: drop ? 3400 : 1400 + sec.i * 250, cutEnd: 900, att: 0.005, rel: 0.05, q: 2 });
    } else if (s === 0 && tr.choir) choir(E, ch.map((x) => r + 36 + x), t, spb * 15.5, brk ? 0.2 : (drop ? 0.16 : 0.11), tr.choir);
    else if (s === 0) supersaw(E, notes, t, spb * 15, { n: 3, det: 20, v: brk ? 0.14 : 0.1, cut: brk ? 2200 : (drop ? 2600 : 1200), cutEnd: brk ? 900 : 700, att: brk ? 0.5 : 0.08, rel: 0.4, prio: 1 });
  }
  // ---- arpeggio (FM plucks)
  if ((build || drop || brk) && tr.arp[s] === 'x') {
    const deg = tr.arpOrder[step % tr.arpOrder.length] + (sec.alt ? 1 : 0);
    const m = chordTone(tr, bar, deg, 36) + (ti === 5 && hash(step * 7.7) < 0.2 ? 12 : 0);
    fmPluck(E, m, ts, spb * 1.8, tr.fm[0], tr.fm[1] * (brk ? 0.6 : 1), drop ? 0.075 : 0.06, E.synth, 1);
  }
  // ---- lead (big detuned supersaw)
  if (tr.organ) {
    if (drop) {
      const rn = tr.organRiff[s];
      if (bar % 4 < 2) { if (rn != null) organ(E, [r + 24 + rn, r + 36 + rn], ts, spb * 0.92, 0.2, 1); }
      else if (tr.padGate[s] === 'x') organ(E, ch.map((x) => r + 36 + x).concat([r + 24 + ch[0]]), ts, spb * 1.7, 0.17, 1);
    } else if ((brk || build) && s === 0) organ(E, ch.map((x) => r + 36 + x).concat([r + 24 + ch[0]]), t, spb * (brk ? 15 : 7), brk ? 0.15 : 0.1, 1);
    else if (build && s === 8 && sec.i >= 2) organ(E, ch.map((x) => r + 36 + x), t, spb * 7, 0.1, 1);
  }
  if (tr.laugh && drop && bar % 8 === 6 && s === 6) { vampLaugh(E.c, ts, E.fx, 92 + (bar % 16 === 6 ? 0 : 8), 0.32, E.noise); E.stats.laughs = (E.stats.laughs || 0) + 1; }
  if (!tr.organ && (drop || (brk && sec.i >= 4)) && tr.lead[s] === 'x') {
    let k = 0; for (let i = 0; i < s; i++) if (tr.lead[i] === 'x') k++;
    let nx = 1; while (nx < 8 && tr.lead[(s + nx) % 16] !== 'x') nx++;
    const deg = tr.leadDeg[(k + (bar % 2) * 3) % tr.leadDeg.length] + (sec.alt ? 2 : 0);
    const m = chordTone(tr, bar, deg, 36);
    supersaw(E, [m, m + 12 * (ti === 0 || ti === 2 ? 1 : 0)].slice(0, ti === 0 || ti === 2 ? 2 : 1), ts, spb * Math.min(nx, 4) * 0.92,
      { n: tr.leadV, det: 24, v: brk ? 0.08 : 0.14, cut: brk ? 1600 : tr.leadCut, cutEnd: tr.leadCut * 0.35, att: 0.006, rel: 0.09, q: 3, dest: tr.drive > 0.5 ? E.driveIn : E.synth, prio: 1 });
  }
  // ---- effects: laser zaps, risers + uplifters before drops, glitch/bitcrush fills every 8/16 bars
  if (drop && (s === 14 || s === 6) && hash(step * 1.37 + ti) < tr.zap) laser(E, ts, 0.06);
  if (s === 0 && nextIsDrop) { const tEnd = t + spb * 16; uplifter(E, t, tEnd, 0.22); riser(E, r, t, tEnd); }
  if (s === 0 && brk && lastBar) uplifter(E, t, t + spb * 16, 0.16);
  if (!brk && !intro && inFill && s === (fill16 ? 8 : 12)) {
    const len = spb * (fill16 ? 8 : 4);
    E.stats.fills++;
    const cr = E.crushAmt.gain, cl = E.clean.gain, gt = E.gate.gain;
    if (fill16 || hash(bar * 3.3 + ti) < 0.5 + tr.glitch) { cr.setValueAtTime(1, t); cl.setValueAtTime(0, t); cr.setValueAtTime(0, t + len); cl.setValueAtTime(1, t + len); }
    // stutter: chop the whole mix on 32nds, accelerating
    const st0 = t + len * 0.5, n = fill16 ? 8 : 4;
    for (let i = 0; i < n; i++) { const a = st0 + i * len / (2 * n); gt.setValueAtTime(0.08, a + len / (4 * n)); gt.setValueAtTime(1, a + len / (2 * n) - 0.002); }
    for (let i = 0; i < n; i++) smp(E, E.snare, st0 + i * len / (2 * n), 0.18, E.drums, 1 + i * 0.06);
    if (fill16) { laser(E, t, 0.07); laser(E, t + spb * 2, 0.07); }
  }
  // ---- danger layer: two-tone alarm + open-hat rush (crossfaded via E.dangXf)
  if (E.danger) {
    if (s % 4 === 0) supersaw(E, [r + tr.alarm[beat % 2]], t, spb * 3.6, { n: 2, det: 12, v: 0.09, cut: 2600, cutEnd: 1200, att: 0.01, rel: 0.05, q: 6, dest: E.dang, prio: 1 });
    if (s % 2 === 1) smp(E, E.hatO, ts, 0.12, E.dang);
  }
}
// comeback fanfare: synth-brass stab on t, rising arpeggio for 2 beats, crash + impact on t + 2 beats
function fanfare(E, ti, t) {
  const tr = TRACKS[ti], beat = 60 / tr.bpm, r = tr.root + 24, f = E.fan;
  E.stats.fanfares++;
  const maj = [0, 4, 7, 12];
  supersaw(E, maj.map((x) => r + 12 + x), t, beat * 0.9, { n: 4, det: 16, v: 0.34, cutStart: 300, cut: 5200, cutAtt: 0.06, cutEnd: 900, att: 0.012, rel: 0.25, q: 2, dest: f, prio: 0 });
  supersaw(E, [r], t, beat * 0.9, { n: 3, det: 10, v: 0.18, cut: 1500, cutEnd: 300, att: 0.01, rel: 0.2, dest: f, prio: 0 });
  const arp = [0, 4, 7, 12, 16, 19, 24, 28];
  arp.forEach((x, i) => fmPluck(E, r + 24 + x, t + beat * 0.25 * i + beat * 0.0, beat * 0.5, 2, 2.2, 0.14, f, 0));
  arp.forEach((x, i) => supersaw(E, [r + 12 + x], t + beat * 0.25 * i, beat * 0.22, { n: 3, det: 14, v: 0.09, cut: 4000, cutEnd: 1500, att: 0.004, rel: 0.05, dest: f, prio: 0 }));
  const hit = t + beat * 2;
  smp(E, E.crash, hit, 0.6, f); smp(E, E.kicks[2], hit, 0.9, f, 0.7); smp(E, E.snareR, hit, 0.5, f);
  supersaw(E, [r + 12, r + 16, r + 19, r + 24, r + 31], hit, beat * 1.6, { n: 4, det: 20, v: 0.3, cutStart: 500, cut: 6000, cutAtt: 0.05, cutEnd: 1200, att: 0.01, rel: 0.6, q: 1.5, dest: f, prio: 0 });
  return hit;
}

// ---------------------------------------------------------------- v7 streamed "vapor-funk" soundtrack
// Pre-rendered seamless loops (music/loop-NN.b64 = base64 MP3: 0.5 s pre-roll + 18-bar loop + 0.5 s post-roll, periodic
// across the whole file so the loop window is click-free whatever the codec priming). Lazy-loaded per stage, next stage
// preloaded, played on the same bar grid as the sequencer (M), danger layer + comeback fanfare are matching buffers.
// If a file can't load the old procedural engine (makeMusic) plays that track instead.
const XM_BPM = [123, 122, 121, 124, 123, 120, 121, 124, 125, 123, 126], XM_BARS = 18, XM_PAD = 0.5, XM_DBARS = 4, XM_V = 10, XM_MARK = 0.25;
const XM = { on: true, gain: 2.2, sd: null, sdT: 0, prime: null, raw: {}, dec: {}, buf: {}, failed: {}, bus: null, duck: null, src: null, srcG: null, track: -1, t0: 0, dly: {}, dSrc: null, dG: null, dOn: false, want: -1, plays: 0, fans: 0, lastErr: null };
const xmKey = (kind, i) => kind + '-' + String(i).padStart(2, '0');
const xmLoopLen = (i) => XM_BARS * 240 / XM_BPM[i];
function xmFetch(key) {
  if (XM.raw[key]) return XM.raw[key];
  const b64ToBuf = (t) => { // base64 -> ArrayBuffer; fetch(data:) decodes natively (no main-thread loop), atob fallback
    const clean = t.replace(/\s+/g, '');
    return fetch('data:application/octet-stream;base64,' + clean).then((r) => r.arrayBuffer()).catch(() => { const bin = atob(clean), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; });
  };
  XM.raw[key] = fetch('music/' + key + '.b64?v=' + XM_V).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + key); return r.text(); }).then(b64ToBuf)
    .catch((e) => { XM.failed[key] = true; XM.lastErr = String(e && e.message || e); delete XM.raw[key]; throw e; });
  return XM.raw[key];
}
function xmDecode(key) {
  if (XM.buf[key]) return Promise.resolve(XM.buf[key]);
  if (XM.dec[key]) return XM.dec[key];
  if (!A.ctx) return xmFetch(key).then(() => null);
  XM.dec[key] = xmFetch(key).then((ab) => new Promise((res, rej) => A.ctx.decodeAudioData(ab.slice(0), res, rej))).then((b) => {
    XM.dly[key] = xmFindMark(b); // where the decoder really put t = 0 (MP3 encoder priming differs per browser)
    XM.buf[key] = b; delete XM.dec[key]; xmEvict(); return b;
  }).catch((e) => { XM.failed[key] = true; XM.lastErr = String(e && e.message || e); delete XM.dec[key]; return null; });
  return XM.dec[key];
}
// Every file starts with a 0.5 s pre-roll that is never played and holds one click at exactly 0.25 s. Its position in the
// decoded buffer tells us the decoder's start offset, so loops sit sample-accurately on the bar grid in every browser.
function xmFindMark(b) {
  const d = b.getChannelData(0), sr = b.sampleRate, n = Math.min(d.length, Math.round(0.42 * sr)); let mi = 0, mv = 0;
  for (let i = 0; i < n; i++) { const v = d[i] < 0 ? -d[i] : d[i]; if (v > mv) { mv = v; mi = i; } }
  if (mv < 0.08) return XM.prime != null ? XM.prime : 0; // no marker found: fall back to the last measured offset
  const off = Math.max(-0.05, Math.min(0.1, mi / sr - XM_MARK)); XM.prime = off; return off;
}
function xmEvict() { // keep memory bounded on phones: title, current, next (+ their danger/fanfare) only
  const keep = new Set(), cur = Math.max(0, XM.track), nx = Math.min(10, cur + 1);
  for (const i of cur === 0 ? [0, 1] : [cur, nx, Math.max(0, XM.want)]) { keep.add(xmKey('loop', i)); keep.add(xmKey('danger', i)); keep.add(xmKey('fanfare', i)); }
  for (const k in XM.buf) if (!keep.has(k)) delete XM.buf[k];
}
function xmPrefetch(i) { if (i < 0 || i > 10) return; xmDecode(xmKey('loop', i)); if (i > 0) { xmDecode(xmKey('danger', i)); xmDecode(xmKey('fanfare', i)); } }
function xmGraph() {
  if (XM.bus || !A.ctx) return;
  const c = A.ctx; XM.bus = c.createGain(); XM.bus.gain.value = XM.gain; XM.bus.connect(A.mus);
  XM.sd = c.createGain(); XM.sd.connect(XM.bus); XM.duck = c.createGain(); XM.duck.connect(XM.sd);
}
const xmUsable = (i) => XM.on && !XM.failed[xmKey('loop', i)];
// start track i so that loop position 0 (start of drop A) lands exactly on `when` (a bar line of M's grid)
function xmPlay(i, when) {
  if (!A.ctx) return; xmGraph();
  const key = xmKey('loop', i), b = XM.buf[key], c = A.ctx;
  XM.want = i; xmPrefetch(i); xmPrefetch(Math.min(10, i + 1));
  if (!b) { xmDecode(key).then((bb) => { if (bb && XM.want === i && M.timer && M.track === i) xmPlay(i, nextBarTime(0.08)); }); return; } // keep the old loop going until this one is decoded
  XM.track = i;
  const d = XM.dly[key] || 0, L = xmLoopLen(i), s = c.createBufferSource(), g = c.createGain();
  s.buffer = b; s.loop = true; s.loopStart = XM_PAD + d; s.loopEnd = XM_PAD + d + L;
  g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(1, when + 0.012);
  s.connect(g); g.connect(XM.duck); xmStopLoop(when); s.start(when, XM_PAD + d);
  XM.src = s; XM.srcG = g; XM.t0 = when; XM.plays++;
  if (XM.dOn) { xmDangerStop(when, true); xmDanger(true, when); }
}
// sound effects duck the streamed music for a moment (-3.5 dB, ~150 ms) so pops, locks and cheers cut through
function xmSfxDuck() {
  if (!XM.sd || !XM.src) return; const t = A.ctx.currentTime; if (t - XM.sdT < 0.05) return; XM.sdT = t;
  const gn = XM.sd.gain; gn.cancelScheduledValues(t); gn.setValueAtTime(gn.value, t); gn.linearRampToValueAtTime(0.67, t + 0.01); gn.setTargetAtTime(1, t + 0.12, 0.1);
}
function xmStopLoop(when, fade) {
  const s = XM.src, g = XM.srcG; if (!s) return; XM.src = null; XM.srcG = null;
  const t = Math.max(when || 0, A.ctx.currentTime), f = fade || 0.05;
  try { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + f); s.stop(t + f + 0.05); } catch (e) { /* already stopped */ }
}
function xmDanger(on, at) {
  if (!A.ctx || !XM.bus) return; const c = A.ctx, i = XM.track, t = Math.max(at || 0, c.currentTime + 0.03);
  if (!on) { XM.dOn = false; xmDangerStop(t); XM.duck.gain.cancelScheduledValues(t); XM.duck.gain.setTargetAtTime(1, t, 0.5); return; }
  XM.dOn = true; if (i < 1 || XM.dSrc) return;
  const key = xmKey('danger', i), b = XM.buf[key];
  if (!b) { xmDecode(key).then((bb) => { if (bb && XM.dOn && !XM.dSrc && XM.track === i) xmDanger(true); }); return; }
  const d = XM.dly[key] || 0, Ld = XM_DBARS * 240 / XM_BPM[i], pos = (((t - XM.t0) % Ld) + Ld) % Ld, s = c.createBufferSource(), g = c.createGain();
  s.buffer = b; s.loop = true; s.loopStart = XM_PAD + d; s.loopEnd = XM_PAD + d + Ld;
  g.gain.setValueAtTime(0, t); g.gain.setTargetAtTime(0.9, t, 0.35); s.connect(g); g.connect(XM.bus); s.start(t, XM_PAD + d + pos);
  XM.dSrc = s; XM.dG = g; XM.duck.gain.cancelScheduledValues(t); XM.duck.gain.setTargetAtTime(0.78, t, 0.4);
}
function xmDangerStop(t, instant) { const s = XM.dSrc, g = XM.dG; if (!s) return; XM.dSrc = null; XM.dG = null; const f = instant ? 0.03 : 0.6;
  try { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, f / 3); s.stop(t + f + 0.3); } catch (e) { /* ignore */ } }
// comeback / victory fanfare on time t; returns the impact time (one beat later) or 0 if not available
function xmFanfare(i, t, alone) {
  if (!A.ctx) return 0; xmGraph(); const key = xmKey('fanfare', Math.max(1, i)), b = XM.buf[key]; if (!b) { xmDecode(key); return 0; }
  const s = A.ctx.createBufferSource(), g = A.ctx.createGain(), beat = 60 / XM_BPM[Math.max(1, i)];
  s.buffer = b; g.gain.value = alone ? 1 : 0.95; s.connect(g); g.connect(XM.bus); s.start(t, XM_PAD + (XM.dly[key] || 0)); XM.fans++;
  XM.dOn = false; xmDangerStop(t, true);
  if (!alone) { const dg = XM.duck.gain; dg.cancelScheduledValues(t); dg.setTargetAtTime(0.3, t, 0.03); dg.setTargetAtTime(1, t + beat * 3, 0.6); }
  return t + beat;
}
function xmStopAll() { if (!A.ctx || !XM.bus) return; const t = A.ctx.currentTime; xmStopLoop(t, 0.12); xmDangerStop(t, true); XM.dOn = false; XM.want = -1; XM.duck.gain.cancelScheduledValues(t); XM.duck.gain.setValueAtTime(1, t); }
// stage 1 ocean ambience: its own gentle layer under the music. Low-passed brown noise (no hiss) shaped into slow,
// irregular swells: each wave rises ~3 s (filter opens 300 -> ~1.2 kHz) and recedes over ~4-5 s.
const AMB = { src: null, lp: null, g: null, out: null, next: 0, waves: 0, level: 1.1 };
function ambBuffer(c) {
  const sr = c.sampleRate, n = Math.round(8 * sr), x = Math.round(0.5 * sr), b = c.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch), tmp = new Float32Array(n + x); let y = 0;
    for (let i = 0; i < n + x; i++) { y = (y + 0.02 * (Math.random() * 2 - 1)) / 1.02; tmp[i] = y * 3.5; }
    for (let i = 0; i < n; i++) d[i] = tmp[i]; for (let i = 0; i < x; i++) { const k = i / x; d[i] = tmp[n + i] * (1 - k) + tmp[i] * k; } } // seamless loop
  return b;
}
function ambStart() {
  if (!A.ctx || AMB.src) return; const c = A.ctx, t = c.currentTime;
  if (!AMB.buf) AMB.buf = ambBuffer(c);
  AMB.src = c.createBufferSource(); AMB.src.buffer = AMB.buf; AMB.src.loop = true;
  AMB.hp = c.createBiquadFilter(); AMB.hp.type = 'highpass'; AMB.hp.frequency.value = 150;
  AMB.lp = c.createBiquadFilter(); AMB.lp.type = 'lowpass'; AMB.lp.Q.value = 0.3; AMB.lp.frequency.value = 300;
  AMB.g = c.createGain(); AMB.g.gain.value = 0.0001; AMB.out = c.createGain(); AMB.out.gain.setValueAtTime(0, t); AMB.out.gain.linearRampToValueAtTime(AMB.level, t + 1.5);
  AMB.src.connect(AMB.hp); AMB.hp.connect(AMB.lp); AMB.lp.connect(AMB.g); AMB.g.connect(AMB.out); AMB.out.connect(A.mus);
  AMB.src.start(t, Math.random() * 7); AMB.next = t + 0.3;
}
function ambStop() {
  if (!AMB.src) return; const t = A.ctx.currentTime, o = AMB.out, s = AMB.src;
  try { o.gain.cancelScheduledValues(t); o.gain.setValueAtTime(o.gain.value, t); o.gain.linearRampToValueAtTime(0, t + 1.2); s.stop(t + 1.3); } catch (e) { /* ignore */ }
  AMB.src = null;
}
function ambTick() {
  if (!AMB.src) return; const now = A.ctx.currentTime, g = AMB.g.gain, f = AMB.lp.frequency;
  while (AMB.next < now + 1) { const t = Math.max(AMB.next, now), pk = 0.6 + Math.random() * 0.4, r = 2.4 + Math.random() * 1.2, fall = 3.6 + Math.random() * 1.6;
    g.setTargetAtTime(pk, t, r / 2.6); f.setTargetAtTime(600 + 600 * pk, t, r / 2.6);
    g.setTargetAtTime(0.14, t + r, fall / 3); f.setTargetAtTime(300, t + r, fall / 3);
    AMB.next = t + r + fall * (0.75 + Math.random() * 0.25); AMB.waves++; }
}
function ambSync() { const on = !!(A.ctx && M.timer && M.track === 1 && state === 'play' && !paused); if (on && !AMB.src) ambStart(); else if (!on && AMB.src) ambStop(); ambTick(); }
// the sequencer grid follows the new tempos
for (let i = 0; i < TRACKS.length && i < XM_BPM.length; i++) TRACKS[i].bpm = XM_BPM[i];
xmFetch(xmKey('loop', 0)).catch(() => {}); // start downloading the title loop right away (decoded after the first tap)
// live sequencer: look-ahead scheduler (setInterval 25 ms, schedules 150 ms ahead), bar-quantized track switches
const M = { timer: null, next: 0, step: 0, stage: 0, track: 0, E: null, pending: null, danger: false, sched: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], lastT: [0, 0], fanAt: 0 };
function ensureEngine() { if (!M.E && A.ctx) { M.E = makeMusic(A.ctx, A.mus, A.sfx); M.E.setTrack(M.track, A.ctx.currentTime); } return M.E; }
const stepDur = (ti) => 60 / TRACKS[ti].bpm / 4;
function musicTick() {
  if (!A.ctx || A.ctx.state !== 'running' || !M.E) return;
  const now = A.ctx.currentTime;
  if (M.next < now - 0.2) { // the scheduler fell behind (tab stall, context resumed): re-anchor
    if (XM.src && XM.track === M.track && !M.pending) { const sd = stepDur(M.track), k = Math.ceil((now + 0.05 - XM.t0) / sd); M.next = XM.t0 + k * sd; M.step = k; } // stay on the loop's own grid
    else M.next = now + 0.05;
  }
  let guard = 0;
  while (M.next < now + 0.15 && guard++ < 64) {
    if (M.pending && M.next >= M.pending.at - 0.001) {
      M.track = M.pending.track; M.step = M.pending.bar * 16; M.E.setTrack(M.track, M.next); M.pending = null;
      if (xmUsable(M.track)) xmPlay(M.track, M.next); else { xmStopLoop(M.next); smp(M.E, M.E.crash, M.next, 0.5, M.E.perc); }
    }
    if (!xmUsable(M.track)) musicStep(M.E, M.track, M.step, M.next);
    M.sched[M.track]++; M.lastT[0] = M.lastT[1]; M.lastT[1] = M.next;
    M.next += stepDur(M.track); M.step++;
  }
}
function musicStart() {
  if (!A.ctx || M.timer) return;
  ensureEngine();
  M.next = A.ctx.currentTime + 0.08; M.step = 0; M.pending = null;
  M.track = desiredTrack(); M.E.setTrack(M.track, M.next);
  if (xmUsable(M.track)) xmPlay(M.track, M.next);
  M.timer = setInterval(musicTick, 25); musicTick();
}
function musicStop() { if (M.timer) { clearInterval(M.timer); M.timer = null; } M.pending = null; if (M.E) setDanger(false, true); xmStopAll(); }
function desiredTrack() { return (state === 'play' || state === 'dying') ? Math.min(LAST_STAGE, g.stage || 0) + 1 : 0; }
// time of the next bar line that is at least minLead seconds away
function nextBarTime(minLead) {
  const spb = stepDur(M.track), now = A.ctx.currentTime;
  let t = M.next + ((16 - (M.step % 16)) % 16) * spb;
  while (t - now < minLead) t += spb * 16;
  return t;
}
function nextBeatTime() {
  const spb = stepDur(M.track), now = A.ctx.currentTime;
  let t = M.next + ((4 - (M.step % 4)) % 4) * spb;
  while (t - now < 0.06) t += spb * 4;
  return t;
}
function requestTrack(ti, startBar, minLead, lift) {
  if (!M.timer || !M.E) return 0;
  const at = nextBarTime(minLead);
  M.pending = { track: ti, at, bar: startBar };
  if (xmUsable(ti)) xmPrefetch(ti);
  if (lift) { const t0 = Math.max(A.ctx.currentTime + 0.05, at - Math.min(3, stepDur(M.track) * 32)); uplifter(M.E, t0, at, 0.3); riser(M.E, TRACKS[M.track].root, t0, at); }
  return at;
}
// stage changes: noise uplifter rises into the next bar line, then the new stage track drops in with the banner
let pendBanner = null;
function stageBanner(i) {
  const show = () => showBanner('STAGE ' + (i + 1), STAGES[i].name, STAGES[i].c1, TWISTS[i]);
  if (M.timer && aok()) { const at = requestTrack(i + 1, DROP_BAR, 1.2, true); pendBanner = { at, show }; } else show();
}
function syncTrack() {
  if (!M.timer || M.pending || pendBanner) return;
  const want = desiredTrack();
  if (want !== M.track) requestTrack(want, want === 0 || state === 'play' && g.popped === 0 ? 0 : DROP_BAR, 0.15, false);
}
function setDanger(on, instant) {
  M.danger = on;
  if (XM.bus && (on ? M.timer && xmUsable(M.track) : true)) xmDanger(on);
  if (!M.E) return;
  const c = A.ctx, t = c.currentTime, E = M.E;
  E.danger = on;
  E.dangXf.gain.cancelScheduledValues(t); E.normXf.gain.cancelScheduledValues(t);
  E.dangXf.gain.setTargetAtTime(on ? 1 : 0, t, instant ? 0.01 : (on ? 0.4 : 0.6));
  E.normXf.gain.setTargetAtTime(on ? 0.5 : 1, t, instant ? 0.01 : (on ? 0.4 : 0.6));
}
// ---- offline previews (used by tests and to export WAVs)
function renderPreview(ti, secs, startBar) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const sr = 44100, oc = new OAC(2, Math.round(sr * secs), sr);
  const comp = oc.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
  const lim = oc.createDynamicsCompressor(); lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
  const master = oc.createGain(); master.gain.value = 0.8; const mus = oc.createGain(); mus.gain.value = 0.42 * 1.6; // preview a bit hotter to stress the limiter
  mus.connect(master); master.connect(comp); comp.connect(lim); lim.connect(oc.destination);
  const E = makeMusic(oc, mus, master); E.setTrack(ti, 0);
  const spb = stepDur(ti); let t = 0.02, step = (startBar || 0) * 16;
  while (t < secs) { musicStep(E, ti, step, t); t += spb; step++; }
  return oc.startRendering().then((buf) => {
    const L0 = buf.getChannelData(0), R0 = buf.getChannelData(1), n = buf.length;
    let peak = 0, clip = 0; const rms = [];
    for (let sIdx = 0; sIdx < Math.floor(secs); sIdx++) {
      let acc = 0; for (let i = sIdx * sr; i < (sIdx + 1) * sr && i < n; i++) acc += L0[i] * L0[i] + R0[i] * R0[i];
      rms.push(Math.sqrt(acc / (2 * sr)));
    }
    for (let i = 0; i < n; i++) { const a = Math.max(Math.abs(L0[i]), Math.abs(R0[i])); if (a > peak) peak = a; if (a >= 0.999) clip++; }
    const wav = new DataView(new ArrayBuffer(44 + n * 4)), ws = (o, s) => { for (let i = 0; i < s.length; i++) wav.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); wav.setUint32(4, 36 + n * 4, true); ws(8, 'WAVE'); ws(12, 'fmt '); wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 2, true);
    wav.setUint32(24, sr, true); wav.setUint32(28, sr * 4, true); wav.setUint16(32, 4, true); wav.setUint16(34, 16, true); ws(36, 'data'); wav.setUint32(40, n * 4, true);
    for (let i = 0, o = 44; i < n; i++, o += 4) { wav.setInt16(o, Math.max(-1, Math.min(1, L0[i])) * 32767, true); wav.setInt16(o + 2, Math.max(-1, Math.min(1, R0[i])) * 32767, true); }
    const bytes = new Uint8Array(wav.buffer); let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { peak, clip, rms, stats: E.stats, wav: btoa(bin) };
  });
}
// ---------------------------------------------------------------- danger zone + comeback
const DANGER_IN = 15, DANGER_OUT = 11, DANGER_MIN = 3;
let pendFX = null;
function stackHeight() { for (let y = 0; y < ROWS; y++) { const r = g.board[y]; for (let x = 0; x < COLS; x++) if (r[x]) return ROWS - y; } return 0; }
function updateDanger(dt) {
  if (g.danger) { g.dangerT += dt; if (!M.danger && M.timer) setDanger(true); }
  if (g.res) return; // judge only a settled board
  const h = stackHeight();
  if (!g.danger && h >= DANGER_IN) { g.danger = true; g.dangerT = 0; g.dangerCount++; setDanger(true); sfx.danger(); }
  else if (g.danger && h <= DANGER_OUT) {
    g.danger = false;
    if (g.dangerT >= DANGER_MIN) comeback(); else setDanger(false);
  }
}
function comeback() {
  g.comebacks++;
  const bonus = 500 * g.level;
  const fire = () => {
    if (state !== 'play') return;
    addScore(bonus); g.pop = 1;
    showBanner('COMEBACK!', '+' + money(bonus) + ' BONUS', '#2bf0ff'); sfx.chaching(); coinBurst(cx0(), cy0(), 26);
    const c = L.cell, cx = L.bx + c * 5, cy = L.by + c * 10;
    floatText('+' + money(bonus), cx, cy + c * 2.5, '#7dffb0', Math.min(c * 1.3, W * 0.1), 1.8);
    flashA = 0.5; shake(0.35, 9);
    const cols = ['#2bf0ff', '#3dff7a', '#7dffb0', '#00E5FF', '#1DE9B6', '#ffffff'];
    for (let i = 0; i < 110; i++) { const a = rand(0, 6.28), v = rand(160, 640); part(cx, cy, Math.cos(a) * v, Math.sin(a) * v - 120, rand(0.6, 1.3), rand(4, 9), cols[i % 6], 420, i % 3 === 0 ? 1 : 0); }
    RINGS.push({ x: cx, y: cy, r: c * 10, t: 0, color: '#3dff7a' }, { x: cx, y: cy, r: c * 6, t: 0, color: '#2bf0ff' });
  };
  if (aok() && ensureEngine()) {
    const t = M.timer ? nextBeatTime() : A.ctx.currentTime + 0.05;
    const hit = (xmUsable(M.track) && xmFanfare(M.track, t)) || fanfare(M.E, M.track, t);
    M.fanAt = t; M.E.danger = false; M.danger = false;
    // crossfade back to the normal track once the impact lands
    const E = M.E; E.dangXf.gain.cancelScheduledValues(t); E.normXf.gain.cancelScheduledValues(t);
    E.normXf.gain.setTargetAtTime(0.25, t, 0.03); E.dangXf.gain.setTargetAtTime(0, t, 0.05);
    E.normXf.gain.setTargetAtTime(1, hit, 0.7);
    pendFX = { at: t, fire };
  } else { setDanger(false); fire(); }
}
function updatePending() {
  const now = A.ctx ? A.ctx.currentTime : 0;
  if (pendBanner && (!A.ctx || !M.timer || now >= pendBanner.at - 0.03)) { const p = pendBanner; pendBanner = null; p.show(); }
  if (pendFX && (!A.ctx || now >= pendFX.at - 0.02)) { const p = pendFX; pendFX = null; p.fire(); }
}
function drawDanger() {
  if (!g.danger || state !== 'play') return;
  const c = L.cell, x = L.bx, y = L.by, w = c * COLS, h = c * VIS, k = 0.5 + 0.5 * Math.sin(T * 9);
  ctx.save();
  const gr = ctx.createLinearGradient(0, y, 0, y + c * 5);
  gr.addColorStop(0, 'rgba(255,40,60,' + (0.18 + 0.22 * k) + ')'); gr.addColorStop(1, 'rgba(255,40,60,0)');
  ctx.fillStyle = gr; ctx.fillRect(x, y, w, c * 5);
  ctx.strokeStyle = 'rgba(255,50,70,' + (0.45 + 0.5 * k) + ')'; ctx.lineWidth = 3 + 2 * k; ctx.shadowColor = '#ff2040'; ctx.shadowBlur = 14;
  ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
  ctx.restore();
  txt('DANGER!', x + w / 2, y + c * 1.1, Math.min(c * 0.95, 30) * (1 + 0.06 * k), '#ff4050', '#2a0008');
}
// ---------------------------------------------------------------- layout + caches
let sprites = [];
const cache = {};
function layout() {
  W = window.innerWidth; H = window.innerHeight; DPR = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const cs = getComputedStyle(safeEl);
  safe.t = parseFloat(cs.paddingTop) || 0; safe.r = parseFloat(cs.paddingRight) || 0;
  safe.b = parseFloat(cs.paddingBottom) || 0; safe.l = parseFloat(cs.paddingLeft) || 0;
  L.top = safe.t + 6; L.bot = H - safe.b - 6; L.left = safe.l + 8; L.right = W - safe.r - 8;
  L.hudH = Math.max(50, Math.min(64, H * 0.075));
  L.ctrlH = settings.buttons ? Math.max(56, Math.min(78, H * 0.09)) : 0;
  const availW = L.right - L.left;
  const availH = (L.bot - L.ctrlH - (L.ctrlH ? 10 : 0)) - (L.top + L.hudH) - 6;
  const cell = Math.max(8, Math.floor(Math.min(availW / (COLS + 3.8), availH / VIS)));
  L.cell = cell;
  const bw = cell * COLS, sw = cell * 3.8, bh = cell * VIS;
  L.bx = Math.round(L.left + (availW - (bw + sw)) / 2);
  L.by = Math.round(L.top + L.hudH + (availH - bh) / 2);
  L.sx = L.bx + bw + cell * 0.45; L.sw = cell * 3.35;
  buildSprites(); makeCaches();
}
function buildSprites() { sprites = makeSpriteSet(wallet.skin, Math.max(4, Math.round(L.cell * DPR))); }
function makeSpriteSet(skin, s) {
  const base = ['#3D8BFF', '#FFD23F', '#FF4FA3', '#2EE6A6', '#FF8A1F', 'RAINBOW', '#8d99a6', '#2a2140', '#ffffff'];
  const set = base.map((c, idx) => {
    if (idx <= 4 && skin && skin !== 'classic') return skinBlock(skin, c, idx, s);
    const o = document.createElement('canvas'); o.width = o.height = s;
    const x = o.getContext('2d'), b = Math.max(2, s * 0.14), m = s / 2;
    if (c === 'RAINBOW') {
      const rc = ['#ff4050', '#ff8c1a', '#ffd91a', '#40f259', '#1ae6ff', '#b84dff'];
      rc.forEach((col, i) => { x.fillStyle = col; x.fillRect(0, i * s / 6, s, s / 6 + 1); });
    } else { x.fillStyle = c; x.fillRect(0, 0, s, s); }
    x.fillStyle = 'rgba(255,255,255,0.42)';
    x.beginPath(); x.moveTo(0, 0); x.lineTo(s, 0); x.lineTo(s - b, b); x.lineTo(b, b); x.lineTo(b, s - b); x.lineTo(0, s); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.35)';
    x.beginPath(); x.moveTo(s, s); x.lineTo(0, s); x.lineTo(b, s - b); x.lineTo(s - b, s - b); x.lineTo(s - b, b); x.lineTo(s, 0); x.fill();
    // colorblind-friendly symbol per color
    x.save(); x.translate(m, m); const r = s * 0.2;
    x.fillStyle = 'rgba(0,0,0,0.38)'; x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = Math.max(1, s * 0.035);
    const star = (pts, ro, ri) => { x.beginPath(); for (let i = 0; i < pts * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / pts, rr2 = i % 2 ? ri : ro; x.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } x.closePath(); };
    switch (idx) {
      case 0: x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); break;
      case 1: x.beginPath(); x.moveTo(0, -r * 1.1); x.lineTo(r * 1.05, r * 0.8); x.lineTo(-r * 1.05, r * 0.8); x.closePath(); break;
      case 2: x.beginPath(); x.moveTo(0, -r * 1.15); x.lineTo(r * 0.85, 0); x.lineTo(0, r * 1.15); x.lineTo(-r * 0.85, 0); x.closePath(); break;
      case 3: x.beginPath(); { const a = r * 0.38, bb = r * 1.05; x.moveTo(-a, -bb); x.lineTo(a, -bb); x.lineTo(a, -a); x.lineTo(bb, -a); x.lineTo(bb, a); x.lineTo(a, a); x.lineTo(a, bb); x.lineTo(-a, bb); x.lineTo(-a, a); x.lineTo(-bb, a); x.lineTo(-bb, -a); x.lineTo(-a, -a); x.closePath(); } break;
      case 4: star(5, r * 1.15, r * 0.5); break;
      case 5: x.fillStyle = 'rgba(255,255,255,0.9)'; x.strokeStyle = 'rgba(0,0,0,0.6)'; star(5, r * 1.25, r * 0.55); break;
      case 6: x.restore(); x.save(); { // steel girder: I-beam with an X truss and rivets
        x.fillStyle = '#5b6672'; x.fillRect(0, s * 0.12, s, s * 0.12); x.fillRect(0, s * 0.76, s, s * 0.12);
        x.strokeStyle = '#46505b'; x.lineWidth = Math.max(1.5, s * 0.08);
        x.beginPath(); x.moveTo(s * 0.12, s * 0.24); x.lineTo(s * 0.88, s * 0.76); x.moveTo(s * 0.88, s * 0.24); x.lineTo(s * 0.12, s * 0.76); x.stroke();
        x.fillStyle = '#d5dde5'; [[0.18, 0.18], [0.82, 0.18], [0.18, 0.82], [0.82, 0.82]].forEach(([u, v]) => { x.beginPath(); x.arc(s * u, s * v, s * 0.045, 0, 7); x.fill(); });
      } x.restore(); x.save(); x.beginPath(); break;
      case 7: x.restore(); x.save(); { // storm rock: dark slate with glowing electric cracks
        x.fillStyle = 'rgba(255,255,255,0.06)'; x.beginPath(); x.moveTo(s * 0.2, s * 0.15); x.lineTo(s * 0.5, s * 0.3); x.lineTo(s * 0.3, s * 0.55); x.fill();
        x.shadowColor = '#3dffd8'; x.shadowBlur = s * 0.15; x.strokeStyle = '#7cf7ff'; x.lineWidth = Math.max(1.2, s * 0.06);
        x.beginPath(); x.moveTo(s * 0.12, s * 0.35); x.lineTo(s * 0.42, s * 0.48); x.lineTo(s * 0.36, s * 0.86); x.moveTo(s * 0.42, s * 0.48); x.lineTo(s * 0.78, s * 0.3); x.lineTo(s * 0.9, s * 0.66); x.stroke();
      } x.restore(); x.save(); x.beginPath(); break;
      default: x.beginPath();
    }
    if (idx <= 5) { x.fill(); x.stroke(); }
    x.restore();
    x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = Math.max(1, s * 0.05); x.strokeRect(0, 0, s, s);
    return o;
  });
  set.push(bombSprite(s));
  extraSprites(set, base, s);
  return set;
}
// stage 6-10 cell sprites, derived from the current skin so they stay readable on every skin
// 10-14 dim (deep sea), 15-19 frozen, 20-24 cracked frozen, 25 spider web, 26 gear icon, 27 fog-hidden, 28 bat icon
function extraSprites(set, base, s) {
  const mk = (fn) => { const o = document.createElement('canvas'); o.width = o.height = s; fn(o.getContext('2d')); return o; };
  const lw = Math.max(1, s * 0.06);
  for (let i = 0; i < 5; i++) set.push(mk((x) => { // dim: sunk in darkness, faint dashed outline in its future color
    x.drawImage(set[i], 0, 0, s, s); x.fillStyle = 'rgba(1,6,24,0.74)'; x.fillRect(0, 0, s, s);
    x.setLineDash([s * 0.14, s * 0.1]); x.strokeStyle = base[i]; x.globalAlpha = 0.75; x.lineWidth = lw; x.strokeRect(s * 0.1, s * 0.1, s * 0.8, s * 0.8); x.setLineDash([]); x.globalAlpha = 1;
    x.fillStyle = 'rgba(160,240,255,0.55)'; x.beginPath(); x.arc(s * 0.78, s * 0.22, s * 0.05, 0, 7); x.fill();
  }));
  const ice = (x, i, cracked) => {
    x.drawImage(set[i], 0, 0, s, s); x.fillStyle = 'rgba(200,245,255,0.5)'; x.fillRect(0, 0, s, s);
    x.fillStyle = 'rgba(255,255,255,0.55)'; x.beginPath(); x.moveTo(s * 0.12, s * 0.5); x.lineTo(s * 0.5, s * 0.12); x.lineTo(s * 0.62, s * 0.12); x.lineTo(s * 0.12, s * 0.62); x.fill();
    x.beginPath(); x.moveTo(s * 0.55, s * 0.88); x.lineTo(s * 0.88, s * 0.55); x.lineTo(s * 0.88, s * 0.62); x.lineTo(s * 0.62, s * 0.88); x.fill();
    x.strokeStyle = '#e6fbff'; x.lineWidth = Math.max(1.5, s * 0.09); x.strokeRect(s * 0.05, s * 0.05, s * 0.9, s * 0.9);
    x.strokeStyle = 'rgba(40,120,170,0.8)'; x.lineWidth = Math.max(1, s * 0.035); x.strokeRect(s * 0.1, s * 0.1, s * 0.8, s * 0.8);
    if (cracked) { x.strokeStyle = '#ffffff'; x.lineWidth = Math.max(1.2, s * 0.06); x.beginPath(); x.moveTo(s * 0.18, s * 0.2); x.lineTo(s * 0.45, s * 0.45); x.lineTo(s * 0.38, s * 0.7); x.lineTo(s * 0.55, s * 0.9); x.moveTo(s * 0.45, s * 0.45); x.lineTo(s * 0.8, s * 0.32); x.moveTo(s * 0.45, s * 0.45); x.lineTo(s * 0.7, s * 0.66); x.stroke(); x.strokeStyle = 'rgba(20,60,90,0.7)'; x.lineWidth = Math.max(1, s * 0.025); x.stroke(); }
  };
  for (let i = 0; i < 5; i++) set.push(mk((x) => ice(x, i, false)));
  for (let i = 0; i < 5; i++) set.push(mk((x) => ice(x, i, true)));
  set.push(mk((x) => { // spider web
    x.fillStyle = '#191626'; x.fillRect(0, 0, s, s); x.strokeStyle = 'rgba(230,230,255,0.85)'; x.lineWidth = Math.max(0.8, s * 0.03); const m = s / 2;
    x.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; x.moveTo(m, m); x.lineTo(m + Math.cos(a) * s * 0.7, m + Math.sin(a) * s * 0.7); } x.stroke();
    for (const r of [0.14, 0.26, 0.38]) { x.beginPath(); for (let k = 0; k <= 8; k++) { const a = k * Math.PI / 4, a2 = (k - 0.5) * Math.PI / 4; if (k) x.quadraticCurveTo(m + Math.cos(a2) * s * r * 0.75, m + Math.sin(a2) * s * r * 0.75, m + Math.cos(a) * s * r, m + Math.sin(a) * s * r); else x.moveTo(m + s * r, m); } x.stroke(); }
    x.fillStyle = '#000'; x.beginPath(); x.arc(s * 0.68, s * 0.3, s * 0.08, 0, 7); x.fill(); x.fillStyle = '#ff3355'; x.fillRect(s * 0.66, s * 0.29, s * 0.04, s * 0.03);
    x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = Math.max(1, s * 0.05); x.strokeRect(0, 0, s, s);
  }));
  set.push(mk((x) => { // gear icon
    x.fillStyle = '#2a1a0e'; x.fillRect(0, 0, s, s); x.translate(s / 2, s / 2); x.fillStyle = '#ffb347'; x.beginPath();
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, r = k % 2 ? s * 0.3 : s * 0.42; x.lineTo(Math.cos(a - 0.12) * r, Math.sin(a - 0.12) * r); x.lineTo(Math.cos(a + 0.12) * r, Math.sin(a + 0.12) * r); }
    x.closePath(); x.fill(); x.fillStyle = '#2a1a0e'; x.beginPath(); x.arc(0, 0, s * 0.12, 0, 7); x.fill(); x.setTransform(1, 0, 0, 1, 0, 0);
  }));
  set.push(mk((x) => { // fog-hidden block
    x.fillStyle = '#56636b'; x.fillRect(0, 0, s, s); x.fillStyle = 'rgba(220,240,230,0.35)';
    for (const [a, b, r] of [[0.3, 0.35, 0.22], [0.62, 0.3, 0.2], [0.5, 0.62, 0.26]]) { x.beginPath(); x.arc(s * a, s * b, s * r, 0, 7); x.fill(); }
    x.font = 'bold ' + Math.round(s * 0.55) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(20,30,35,0.55)'; x.fillText('?', s / 2, s * 0.54);
    x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = Math.max(1, s * 0.05); x.strokeRect(0, 0, s, s);
  }));
  set.push(mk((x) => { x.fillStyle = '#2a0614'; x.fillRect(0, 0, s, s); x.translate(s / 2, s * 0.55); batPath(x, s * 0.42, 0.6); x.fillStyle = '#0a0006'; x.fill(); x.fillStyle = '#ff3355'; x.fillRect(-s * 0.07, -s * 0.06, s * 0.04, s * 0.04); x.fillRect(s * 0.03, -s * 0.06, s * 0.04, s * 0.04); x.setTransform(1, 0, 0, 1, 0, 0); }));
}
// bat silhouette centered at the origin, span 2*r, flap 0..1 (wing tips up/down)
function batPath(x, r, flap) {
  const up = (flap - 0.5) * r * 1.1;
  x.beginPath(); x.moveTo(0, -r * 0.18);
  x.quadraticCurveTo(r * 0.35, -r * 0.3 - up * 0.4, r, -up); x.quadraticCurveTo(r * 0.8, r * 0.05 - up * 0.3, r * 0.62, r * 0.12 - up * 0.2);
  x.quadraticCurveTo(r * 0.45, r * 0.02, r * 0.32, r * 0.2); x.quadraticCurveTo(r * 0.2, r * 0.1, 0, r * 0.3);
  x.quadraticCurveTo(-r * 0.2, r * 0.1, -r * 0.32, r * 0.2); x.quadraticCurveTo(-r * 0.45, r * 0.02, -r * 0.62, r * 0.12 - up * 0.2);
  x.quadraticCurveTo(-r * 0.8, r * 0.05 - up * 0.3, -r, -up); x.quadraticCurveTo(-r * 0.35, -r * 0.3 - up * 0.4, 0, -r * 0.18);
  x.moveTo(-r * 0.12, -r * 0.16); x.lineTo(-r * 0.08, -r * 0.34); x.lineTo(-r * 0.02, -r * 0.18); x.lineTo(r * 0.02, -r * 0.18); x.lineTo(r * 0.08, -r * 0.34); x.lineTo(r * 0.12, -r * 0.16); x.closePath();
}
function lg(y0, y1, stops) { const gr = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([k, c]) => gr.addColorStop(k, c)); return gr; }
function makeCaches() {
  cache.neon = lg(0, H * 0.62, [[0, '#0d0221'], [0.55, '#3a0b5e'], [1, '#ff2bd6']]);
  cache.sun = lg(H * 0.4, H * 0.62, [[0, '#ffe66d'], [1, '#ff2b8a']]);
  cache.menuWash = lg(0, H, [[0, 'rgba(0,229,255,0.28)'], [0.5, 'rgba(29,233,182,0.18)'], [1, 'rgba(41,121,255,0.32)']]);
  cache.space = lg(0, H, [[0, '#02010a'], [0.6, '#0b0b2e'], [1, '#1d0b3a']]);
  cache.jungle = lg(0, H, [[0, '#021a0e'], [0.5, '#063b1f'], [1, '#0b5a28']]);
  cache.volc = lg(0, H, [[0, '#120000'], [0.55, '#4a0800'], [1, '#c43500']]);
  cache.lava = lg(H * 0.85, H, [[0, '#ffb000'], [1, '#ff3b00']]);
  const pc = ctx.createRadialGradient(W * 0.78 - 20, H * 0.18 - 20, 5, W * 0.78, H * 0.18, Math.min(W, H) * 0.14);
  pc.addColorStop(0, '#d9a3ff'); pc.addColorStop(1, '#3b1a6b'); cache.planet = pc;
  const p = document.createElement('canvas'); p.width = 4; p.height = 4;
  const px = p.getContext('2d'); px.fillStyle = 'rgba(0,0,0,0.35)'; px.fillRect(0, 2, 4, 2);
  cache.scan = ctx.createPattern(p, 'repeat');
  initBG();
}
function drawBlock(i, x, y, s) { ctx.drawImage(sprites[i], x, y, s, s); }

// ---------------------------------------------------------------- wallet, editions, store catalog
// Scores are dollars. Each game's dollars are banked into a persistent wallet at game over.
const PU = [
  { id: 'wipe', name: 'ROW WIPE', desc: 'Laser-sweeps the bottom row away', price: 1000 },
  { id: 'bomb', name: 'BOMB BLOCK', desc: 'Next piece is a bomb: blasts 3x3', price: 2000 },
];
const SHOP_BG = [
  { id: 'auto', name: 'STAGE THEMES', price: 0, bg: -1 }, { id: 'tropical', name: 'TROPICAL TIDES', price: 0, bg: 0 },
  { id: 'sewer', name: 'SEWER LAIR', price: 5000, bg: 1 }, { id: 'metro', name: 'NEO METROPOLIS', price: 7500, bg: 2 },
  { id: 'storm', name: 'STORM PLANET', price: 10000, bg: 3 }, { id: 'hole', name: 'EVENT HORIZON', price: 12500, bg: 4 },
  { id: 'abyss', name: 'DEEP SEA ABYSS', price: 15000, bg: 9 }, { id: 'caverns', name: 'CRYSTAL CAVERNS', price: 17500, bg: 10 },
  { id: 'clock', name: 'CLOCKWORK FACTORY', price: 20000, bg: 11 }, { id: 'haunted', name: 'HAUNTED FOREST', price: 22500, bg: 12 },
  { id: 'tomb', name: "VAMPIRE'S TOMB", price: 35000, bg: 13 },
  { id: 'candy', name: 'CANDY LAND', price: 20000, bg: 6, ex: 1 }, { id: 'arcade', name: 'RETRO ARCADE', price: 25000, bg: 7, ex: 1 },
  { id: 'desert', name: 'SUNSET DESERT', price: 30000, bg: 8, ex: 1 },
];
const SHOP_SKIN = [
  { id: 'classic', name: 'CLASSIC GLOSSY', price: 0 }, { id: 'neon', name: 'NEON OUTLINE', price: 8000 },
  { id: 'pixel', name: 'PIXEL RETRO', price: 10000 }, { id: 'jelly', name: 'JELLY', price: 15000 }, { id: 'gem', name: 'GEMSTONE', price: 40000 },
];
const START_CASH = { free: 0, full: 1000 };
function loadWallet() {
  const w = Object.assign({ cash: 0, edition: 'free', grants: {}, inv: {}, bgs: [], bg: 'auto', skins: [], skin: 'classic', banked: 0, games: 0 }, store.get('bb_wallet', {}));
  w.cash = Math.max(0, Math.floor(+w.cash || 0)); w.inv = Object.assign({ wipe: 0, bomb: 0 }, w.inv); w.grants = w.grants || {};
  ['auto', 'tropical'].forEach((id) => { if (w.bgs.indexOf(id) < 0) w.bgs.push(id); }); if (w.skins.indexOf('classic') < 0) w.skins.push('classic');
  if (w.edition !== 'full') w.edition = 'free';
  return w;
}
let wallet = loadWallet();
const saveWallet = () => store.set('bb_wallet', wallet);
// ---- edition hooks (no real payments or ads exist yet)
function isFullEdition() { return wallet.edition === 'full'; }
// One-time FULL starting bonus. Also called when a FREE player upgrades. Safe to call repeatedly.
function grantFullEditionBonus() { if (wallet.grants.full) return false; wallet.grants.full = true; wallet.cash += START_CASH.full; saveWallet(); return true; }
function applyEditionGrant() {
  if (isFullEdition()) return grantFullEditionBonus();
  if (!wallet.grants.free) { wallet.grants.free = true; wallet.cash += START_CASH.free; saveWallet(); }
  return false;
}
function setEdition(e) { wallet.edition = e === 'full' ? 'full' : 'free'; const granted = applyEditionGrant(); saveWallet(); return granted; }
const IAP = { // hook: wire a real store purchase here, then call setEdition('full') on success
  available: false,
  purchaseFullEdition() { return Promise.resolve(false); },
};
function maybeShowAd(where) { // hook: FREE edition = minimal ads (e.g. where === 'gameover'); FULL edition = no ads ever. Nothing shown yet.
  if (isFullEdition()) return false;
  BB_ADS.requests++; BB_ADS.last = where; return false;
}
const BB_ADS = { requests: 0, last: null };
(function initEdition() {
  try { const q = new URLSearchParams(location.search).get('edition'); if (q === 'full' || q === 'free') wallet.edition = q; } catch (e) { /* ignore */ }
  applyEditionGrant(); saveWallet();
})();
function canAfford(p) { return wallet.cash >= p; }
let shop = { tab: 0, shake: 0, msg: null, modal: null, thumbs: {}, thumbQ: [] };
function noCash() {
  shop.shake = 0.5; shop.msg = { t: 0, text: 'Not enough cash!' }; shake(0.3, 6);
  if (aok()) { tone(150, 0.18, 'sawtooth', 0.14, { lp: 700 }); tone(110, 0.3, 'sawtooth', 0.14, { lp: 600, when: anow() + 0.16 }); }
}
function spend(p) {
  if (!canAfford(p)) { noCash(); return false; }
  wallet.cash -= p; saveWallet(); sfx.chaching(); shop.msg = { t: 0, text: '-' + money(p), good: true };
  return true;
}
function buyPU(id) { const it = PU.find((p) => p.id === id); if (!spend(it.price)) return false; wallet.inv[id]++; saveWallet(); return true; }
function buyBG(id) {
  const it = SHOP_BG.find((b) => b.id === id);
  if (wallet.bgs.indexOf(id) >= 0) { wallet.bg = id; saveWallet(); sfx.blip(); return true; }
  if (!spend(it.price)) return false; wallet.bgs.push(id); wallet.bg = id; saveWallet(); return true;
}
function buySkin(id) {
  const it = SHOP_SKIN.find((b) => b.id === id);
  if (wallet.skins.indexOf(id) < 0) { if (!spend(it.price)) return false; wallet.skins.push(id); } else sfx.blip();
  wallet.skin = id; saveWallet(); buildSprites(); return true;
}
const STAGE_BG = [0, 1, 2, 3, 4, 9, 10, 11, 12, 13]; // BGS index per stage (5 = title, 6-8 = store exclusives)
function bgFor(stageIdx) { const it = SHOP_BG.find((b) => b.id === wallet.bg); return it && it.bg >= 0 ? it.bg : STAGE_BG[stageIdx] || 0; }
function bankRun() {
  const amt = Math.max(0, Math.floor(g.score));
  const from = wallet.cash;
  wallet.cash += amt; wallet.banked += amt; wallet.games++; saveWallet();
  g.bank = { amt, from, t: 0 };
  maybeShowAd('gameover');
}
// ---- block skins (symbols stay on every skin so colors remain readable)
function shadeHex(hex, k) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k));
  return 'rgb(' + f(r) + ',' + f(gg) + ',' + f(b) + ')';
}
function symPath(x, idx, r) {
  const star = (pts, ro, ri) => { x.beginPath(); for (let i = 0; i < pts * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / pts, rr2 = i % 2 ? ri : ro; x.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } x.closePath(); };
  switch (idx) {
    case 0: x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); break;
    case 1: x.beginPath(); x.moveTo(0, -r * 1.1); x.lineTo(r * 1.05, r * 0.8); x.lineTo(-r * 1.05, r * 0.8); x.closePath(); break;
    case 2: x.beginPath(); x.moveTo(0, -r * 1.15); x.lineTo(r * 0.85, 0); x.lineTo(0, r * 1.15); x.lineTo(-r * 0.85, 0); x.closePath(); break;
    case 3: x.beginPath(); { const a = r * 0.38, bb = r * 1.05; x.moveTo(-a, -bb); x.lineTo(a, -bb); x.lineTo(a, -a); x.lineTo(bb, -a); x.lineTo(bb, a); x.lineTo(a, a); x.lineTo(a, bb); x.lineTo(-a, bb); x.lineTo(-a, a); x.lineTo(-bb, a); x.lineTo(-bb, -a); x.lineTo(-a, -a); x.closePath(); } break;
    case 4: star(5, r * 1.15, r * 0.5); break;
    default: star(5, r * 1.25, r * 0.55);
  }
}
function skinBlock(skin, c, idx, s) {
  const o = document.createElement('canvas'); o.width = o.height = s;
  const x = o.getContext('2d'), m = s / 2, r = s * 0.2;
  if (skin === 'neon') {
    x.fillStyle = '#0b0a1c'; x.fillRect(0, 0, s, s);
    x.shadowColor = c; x.shadowBlur = s * 0.22; x.strokeStyle = c; x.lineWidth = Math.max(1.5, s * 0.1);
    x.strokeRect(s * 0.1, s * 0.1, s * 0.8, s * 0.8);
    x.translate(m, m); symPath(x, idx, r * 1.05); x.fillStyle = shadeHex(c, -0.35); x.fill(); x.lineWidth = Math.max(1.2, s * 0.07); x.stroke();
  } else if (skin === 'pixel') {
    const n = 10, p = document.createElement('canvas'); p.width = p.height = n; const q = p.getContext('2d');
    q.fillStyle = c; q.fillRect(0, 0, n, n);
    q.fillStyle = shadeHex(c, 0.45); q.fillRect(0, 0, n, 1); q.fillRect(0, 0, 1, n);
    q.fillStyle = shadeHex(c, -0.45); q.fillRect(0, n - 1, n, 1); q.fillRect(n - 1, 0, 1, n);
    q.translate(n / 2, n / 2); symPath(q, idx, n * 0.24); q.fillStyle = 'rgba(0,0,0,0.5)'; q.fill();
    x.imageSmoothingEnabled = false; x.drawImage(p, 0, 0, s, s);
  } else if (skin === 'jelly') {
    const gr = x.createRadialGradient(m * 0.8, m * 0.7, s * 0.05, m, m, s * 0.75); gr.addColorStop(0, shadeHex(c, 0.35)); gr.addColorStop(1, shadeHex(c, -0.25));
    rrx(x, s * 0.04, s * 0.04, s * 0.92, s * 0.92, s * 0.3); x.fillStyle = gr; x.fill(); x.strokeStyle = shadeHex(c, -0.5); x.lineWidth = Math.max(1, s * 0.05); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.55)'; x.beginPath(); x.ellipse(s * 0.34, s * 0.24, s * 0.2, s * 0.09, -0.4, 0, 7); x.fill();
    x.beginPath(); x.arc(s * 0.72, s * 0.74, s * 0.045, 0, 7); x.fill();
    x.translate(m, m + s * 0.03); symPath(x, idx, r); x.fillStyle = 'rgba(255,255,255,0.8)'; x.fill(); x.strokeStyle = shadeHex(c, -0.55); x.lineWidth = Math.max(1, s * 0.035); x.stroke();
  } else { // gemstone: faceted cut
    const i0 = s * 0.24, i1 = s - i0;
    const facet = (pts, col) => { x.fillStyle = col; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
    facet([[0, 0], [s, 0], [i1, i0], [i0, i0]], shadeHex(c, 0.5));
    facet([[0, 0], [i0, i0], [i0, i1], [0, s]], shadeHex(c, 0.22));
    facet([[s, 0], [s, s], [i1, i1], [i1, i0]], shadeHex(c, -0.22));
    facet([[0, s], [i0, i1], [i1, i1], [s, s]], shadeHex(c, -0.42));
    facet([[i0, i0], [i1, i0], [i1, i1], [i0, i1]], shadeHex(c, 0.1));
    x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 1; x.strokeRect(i0, i0, i1 - i0, i1 - i0);
    x.save(); x.translate(m, m); symPath(x, idx, r * 0.85); x.fillStyle = 'rgba(0,0,0,0.4)'; x.fill(); x.restore();
    x.fillStyle = '#fff'; x.save(); x.translate(s * 0.76, s * 0.2); x.fillRect(-s * 0.09, -0.6, s * 0.18, 1.2); x.fillRect(-0.6, -s * 0.09, 1.2, s * 0.18); x.restore();
  }
  x.setTransform(1, 0, 0, 1, 0, 0); x.shadowBlur = 0;
  if (skin !== 'jelly') { x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = Math.max(1, s * 0.05); x.strokeRect(0, 0, s, s); }
  return o;
}
function rrx(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
function bombSprite(s) {
  const o = document.createElement('canvas'); o.width = o.height = s; const x = o.getContext('2d'), m = s / 2;
  x.fillStyle = '#3a0010'; x.fillRect(0, 0, s, s);
  x.strokeStyle = '#ff4050'; x.lineWidth = Math.max(1.5, s * 0.08); x.strokeRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88);
  const gr = x.createRadialGradient(m * 0.8, m * 0.85, s * 0.03, m, m * 1.1, s * 0.36); gr.addColorStop(0, '#666'); gr.addColorStop(1, '#0a0a0a');
  x.fillStyle = gr; x.beginPath(); x.arc(m, m * 1.12, s * 0.3, 0, 7); x.fill();
  x.fillStyle = '#444'; x.fillRect(m - s * 0.08, m * 1.12 - s * 0.38, s * 0.16, s * 0.1);
  x.strokeStyle = '#d9b26a'; x.lineWidth = Math.max(1, s * 0.05); x.beginPath(); x.moveTo(m, m * 1.12 - s * 0.38); x.quadraticCurveTo(m + s * 0.15, s * 0.1, m + s * 0.26, s * 0.14); x.stroke();
  x.fillStyle = '#ffe23d'; x.beginPath(); x.arc(m + s * 0.27, s * 0.14, s * 0.07, 0, 7); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.arc(m - s * 0.1, m * 1.0, s * 0.06, 0, 7); x.fill();
  return o;
}
// ---------------------------------------------------------------- backgrounds (one per stage + title)
// Static scenery is pre-rendered once per layout into offscreen canvases (BG.L); only moving parts are drawn per frame.
const BG = { stars: [], bld: [[], []], L: {}, lt: new Array(14).fill(0), draws: new Array(14).fill(0) };
const BSC = () => Math.min(DPR, 1.5);
function mkLayer(w, h, fn) {
  const s = BSC(), o = document.createElement('canvas');
  o.width = Math.max(1, Math.ceil(w * s)); o.height = Math.max(1, Math.ceil(h * s));
  const x = o.getContext('2d'); x.scale(s, s); fn(x, w, h); return o;
}
const lay = (key, w, h, fn) => BG.L[key] || (BG.L[key] = mkLayer(w, h, fn));
const lgx = (x, y0, y1, stops) => { const gr = x.createLinearGradient(0, y0, 0, y1); stops.forEach(([k, c]) => gr.addColorStop(k, c)); return gr; };
const rgx = (x, cx, cy, r0, r1, stops) => { const gr = x.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach(([k, c]) => gr.addColorStop(k, c)); return gr; };
function bgDt(i, t) { const d = Math.max(0, Math.min(0.1, t - BG.lt[i])); BG.lt[i] = t; BG.draws[i]++; return d; }
const colX = () => (L.sx ? L.sx + L.sw / 2 : W * 0.85);
function initBG() {
  BG.L = {}; BG.water = null; BG.sprinkles = BG.pix = BG.sand = null; if (typeof shop !== 'undefined') shop.thumbs = {};
  BG.stars = []; for (let i = 0; i < 150; i++) BG.stars.push({ x: Math.random(), y: Math.random(), z: rand(0.2, 1) });
  for (let l = 0; l < 2; l++) {
    const arr = []; let x = 0;
    while (x < W * 2 + 100) { const w = rand(30, 70) * (l ? 1.2 : 1); arr.push({ x, w, h: rand(0.1, 0.3) * H * (l ? 0.8 : 1.1) }); x += w + rand(2, 10); }
    arr.total = x; BG.bld[l] = arr;
  }
  // tropical
  BG.clouds = []; for (let i = 0; i < 6; i++) BG.clouds.push({ x: Math.random(), y: rand(0.015, 0.2), s: rand(0.6, 1.2), v: rand(5, 14), i: i % 3 });
  BG.spark = []; for (let i = 0; i < 28; i++) BG.spark.push({ x: Math.random(), y: rand(0.03, 0.95), p: rand(0, 6.28), f: rand(1.5, 3.5) });
  // sewer
  const wy = H * 0.8;
  BG.drips = [W * 0.07, W * 0.29, W * 0.5, W * 0.7, W * 0.9, W * 0.985].map((x, i) => ({ x, y0: i === 5 ? H * 0.6 + 8 : 41, y: 0, vy: 0, r: 0, ph: 'grow', w: rand(0.2, 2), gr: rand(0.8, 2.2) }));
  BG.rings = []; BG.splash = [];
  BG.gator = { x: colX(), wy, state: 'up', t: 0, nextBlink: rand(1.5, 3.5), blink: null, blinks: 0, doubles: 0, sinks: 0, nextSink: rand(16, 26), dy: 0 };
  // metropolis
  BG.cars = [];
  [[0.055, 0.5, 70], [0.2, 0.65, -110], [0.64, 0.8, 150], [0.93, 1, -210]].forEach(([y, s, v], li) => {
    for (let k = 0; k < 3; k++) BG.cars.push({ x: rand(0, W + 200) - 100, y: H * y + rand(-6, 6) * s, s, v: v * rand(0.85, 1.2), c: (li + k) % 2, lane: li });
  });
  BG.twinkle = [];
  // storm
  BG.dust = []; for (let i = 0; i < 70; i++) BG.dust.push({ x: Math.random() * W, y: Math.random() * H, v: rand(260, 720), len: rand(8, 30), a: i % 2 });
  BG.debris = []; for (let i = 0; i < 8; i++) BG.debris.push({ x: Math.random() * W, y: rand(0.3, 0.95) * H, v: rand(380, 760), r: rand(0, 6), vr: rand(-12, 12), s: rand(2.5, 6), p: rand(0, 6) });
  BG.plants = [];
  [[0.04, 70], [0.2, 46], [0.42, 60], [0.66, 52], [colX() / W - 0.06, 84], [colX() / W + 0.07, 58], [0.97, 66]].forEach(([x, h], i) => BG.plants.push({ x: x * W, h: h * Math.min(1.3, H / 664), p: i * 1.7, c: i % 2 }));
  BG.storm = BG.storm || { flashes: 0, thunders: 0 };
  BG.storm.next = BG.lt[3] + rand(2.5, 5); BG.storm.bolt = null; BG.storm.age = 9;
  // black hole
  BG.fall = []; for (let i = 0; i < 80; i++) BG.fall.push(newFaller(true));
  BG.hole = BG.hole || { pulse: 0, eaten: 0 };
  initBG2();
}
// ---- 1. TROPICAL TIDES
function bgTropical(t) {
  const dt = bgDt(0, t), hz = H * 0.66, cx = colX();
  ctx.drawImage(lay('tsky', W, H, (x) => {
    x.fillStyle = lgx(x, 0, hz, [[0, '#1593ff'], [0.5, '#5fd0ff'], [0.86, '#bdf4ff'], [1, '#fff0b8']]); x.fillRect(0, 0, W, hz + 1);
    const sx = W * 0.72, sy = H * 0.11, r = Math.min(W, H) * 0.075;
    x.fillStyle = rgx(x, sx, sy, r * 0.6, r * 5, [[0, 'rgba(255,250,210,0.95)'], [0.25, 'rgba(255,236,150,0.35)'], [1, 'rgba(255,236,150,0)']]); x.fillRect(0, 0, W, hz);
    x.fillStyle = '#fff8d0'; x.beginPath(); x.arc(sx, sy, r, 0, 7); x.fill();
    x.fillStyle = 'rgba(40,130,140,0.5)'; x.beginPath(); x.ellipse(W * 0.14, hz, W * 0.2, H * 0.016, 0, Math.PI, 0); x.fill();
    x.beginPath(); x.ellipse(W * 0.42, hz, W * 0.08, H * 0.008, 0, Math.PI, 0); x.fill();
    x.fillStyle = lgx(x, hz, H, [[0, '#3fe0ea'], [0.2, '#14b4d4'], [1, '#03508a']]); x.fillRect(0, hz, W, H - hz);
  }), 0, 0, W, H);
  // slow sun rays
  ctx.save(); ctx.translate(W * 0.72, H * 0.11); ctx.rotate(t * 0.05); ctx.fillStyle = 'rgba(255,255,220,0.07)';
  for (let k = 0; k < 9; k++) { ctx.rotate(Math.PI * 2 / 9); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.9, -W * 0.07); ctx.lineTo(W * 0.9, W * 0.07); ctx.fill(); }
  ctx.restore();
  for (const c of BG.clouds) {
    const spr2 = lay('cloud' + c.i, 170, 64, (x) => {
      const puffs = [[40, 40, 22], [70, 30, 28], [102, 36, 24], [128, 44, 18], [58, 46, 18], [92, 48, 20]].map(([a, b, r]) => [a + c.i * 3, b, r * (1 - c.i * 0.08)]);
      x.fillStyle = 'rgba(160,200,230,0.55)'; puffs.forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b + 5, r, 0, 7); x.fill(); });
      x.fillStyle = '#ffffff'; puffs.forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); });
    });
    const span = W + 260, xx = ((c.x * span + t * c.v) % span) - 200;
    ctx.globalAlpha = 0.9; ctx.drawImage(spr2, xx, c.y * H, 170 * c.s, 64 * c.s); ctx.globalAlpha = 1;
  }
  // seagulls crossing the top every ~7 s
  const gp = t % 7.5;
  if (gp < 5.5) {
    ctx.strokeStyle = '#33475b'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
    for (let k = 0; k < 2; k++) {
      const gx = -30 + (W + 60) * (gp / 5.5) - k * 34, gy = H * (0.045 + k * 0.03) + Math.sin(t * 2 + k) * 5, f = Math.sin(t * 11 + k * 2) * 5, s = k ? 0.75 : 1;
      ctx.moveTo(gx - 10 * s, gy - f * s); ctx.quadraticCurveTo(gx - 4 * s, gy - 5 * s, gx, gy); ctx.quadraticCurveTo(gx + 4 * s, gy - 5 * s, gx + 10 * s, gy - f * s);
    }
    ctx.stroke(); ctx.lineCap = 'butt';
  }
  const band = (k) => {
    const base = hz + (H - hz) * [0.02, 0.17, 0.42, 0.74][k], A = [1.4, 3, 5, 7.5][k], lam = [36, 64, 104, 150][k], sp = [0.9, 1.3, 1.7, 2.1][k];
    const col = ['#45dfe9', '#1fbcd9', '#0f96c6', '#0a6ea8'][k];
    const yAt = (x) => base + A * Math.sin(x / lam * 6.283 + t * sp + k * 1.7) + A * 0.35 * Math.sin(x / lam * 15 - t * sp * 1.6);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, yAt(x));
    ctx.lineTo(W, H); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + k * 0.1) + ')'; ctx.lineWidth = 1 + k * 0.6; ctx.beginPath();
    for (let x = 0; x <= W + 10; x += 10) { const y = yAt(x); if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let x = 5; x <= W; x += 10) { const s = Math.sin(x / lam * 6.283 + t * sp + k * 1.7); if (s < -0.82) { const y = yAt(x); ctx.fillRect(x - 2 - k, y - 1, 4 + k * 2, 1.5 + k * 0.5); } }
    return yAt;
  };
  band(0);
  // island with two swaying palms
  const iy = hz + (H - hz) * 0.1, iw = Math.max(70, L.sw || 80);
  ctx.drawImage(lay('island', iw + 20, 40, (x) => {
    x.fillStyle = '#d9b86a'; x.beginPath(); x.ellipse(iw / 2 + 10, 30, iw / 2 + 6, 16, 0, Math.PI, 0); x.fill();
    x.fillStyle = '#f5dc94'; x.beginPath(); x.ellipse(iw / 2 + 8, 31, iw / 2 - 4, 12, 0, Math.PI, 0); x.fill();
    x.fillStyle = '#6b7a52'; x.beginPath(); x.arc(iw * 0.25, 28, 5, Math.PI, 0); x.arc(iw * 0.82, 29, 4, Math.PI, 0); x.fill();
    x.fillStyle = '#3f9e4a'; for (let k = 0; k < 7; k++) { const gx = 14 + k * iw / 7; x.beginPath(); x.moveTo(gx, 26); x.lineTo(gx + 3, 17 - (k % 3) * 2); x.lineTo(gx + 6, 26); x.fill(); }
  }), cx - iw / 2 - 10, iy - 30, iw + 20, 40);
  { // shoreline foam lapping around the island
    const W2 = BG.water || (BG.water = { tb: [], ts: [], sb: [], cur: [], splashes: 0, pops: 0, nextSp: 1 });
    const fx = cx - 2, rx = iw / 2 + 7, br = Math.sin(t * 1.6) * 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(fx, iy + 1, rx + br, 3.2, 0, 0, 7); ctx.stroke();
    for (let j = 0; j < 2; j++) { const k = (t * 0.45 + j * 0.5) % 1; ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * (1 - k)) + ')'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(fx, iy + 2 + k * 3, rx + 4 + k * 18, 3.5 + k * 4, 0, 0, Math.PI); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let j = 0; j < 9; j++) { const a = j / 9 * Math.PI * 2 + t * 0.3, wob = Math.sin(t * 3 + j * 1.9) * 1.2; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * (rx + br + wob), iy + 1 + Math.sin(a) * 3.2, 1.6 + (j % 3) * 0.5, 0, 7); ctx.fill(); }
    W2.nextSp -= dt;
    if (W2.nextSp <= 0) { W2.nextSp = rand(1.4, 3.2); W2.splashes++; const side = Math.random() < 0.5 ? -1 : 1, sx = fx + side * (rx + rand(-4, 6)); for (let j = 0; j < 6 && W2.ts.length < 30; j++) W2.ts.push({ x: sx, y: iy + 1, vx: side * rand(5, 40), vy: rand(-90, -40), t: 0 }); }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = W2.ts.length - 1; i >= 0; i--) { const d = W2.ts[i]; d.t += dt; d.vy += 300 * dt; d.x += d.vx * dt; d.y += d.vy * dt; if (d.y > iy + 3) { W2.ts.splice(i, 1); continue; } ctx.fillRect(d.x - 1, d.y - 1, 2.2, 2.2); }
  }
  [[-iw * 0.18, 92, -0.18, 0], [iw * 0.16, 70, 0.22, 2]].forEach(([ox, h, lean, p]) => {
    const sw = Math.sin(t * 1.3 + p) * 0.07 + Math.sin(t * 2.9 + p) * 0.025, ang = lean + sw;
    const bx = cx + ox, by = iy - 10, tx = bx + Math.sin(ang) * h, ty = by - Math.cos(ang) * h, mx = bx + Math.sin(ang * 0.4) * h * 0.5 - lean * 18, my = by - h * 0.55;
    ctx.strokeStyle = '#7a5532'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
    ctx.strokeStyle = '#a9794a'; ctx.lineWidth = 2; ctx.setLineDash([3, 5]); ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'butt';
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.5 + sw * 2 + Math.sin(t * 3.1 + k + p) * 0.06, len = h * (0.42 + (k % 2) * 0.1);
      const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.5 + len * 0.45, qx = tx + Math.cos(a) * len * 0.55, qy = ty + Math.sin(a) * len * 0.55 - 8;
      ctx.fillStyle = k % 2 ? '#2f9d45' : '#3fbf55'; ctx.beginPath(); ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(qx - 6, qy - 6, ex, ey); ctx.quadraticCurveTo(qx + 6, qy + 6, tx, ty); ctx.fill();
    }
    ctx.fillStyle = '#5a3d1e'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(tx - 4 + k * 4, ty + 4, 3, 0, 7); ctx.fill(); }
  });
  band(1);
  // fish jumping out of the water every ~9 s near the island
  const fp = t % 9, fy = hz + (H - hz) * 0.3;
  if (fp < 1.2) {
    const k = fp / 1.2, x0 = cx - 34 + hash(Math.floor(t / 9)) * 20, fx = x0 + k * 62, fyy = fy - Math.sin(k * Math.PI) * 64, ang = Math.atan2(-Math.cos(k * Math.PI) * 64 * Math.PI, 62);
    ctx.save(); ctx.translate(fx, fyy); ctx.rotate(-ang);
    ctx.fillStyle = '#ff9f1c'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 4.5, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-15, -5); ctx.lineTo(-15, 5); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(5, -1, 1.6, 0, 7); ctx.fill(); ctx.restore();
    for (const [sx0, kk] of [[x0, k], [x0 + 62, k - 0.85]]) if (kk >= 0 && kk < 0.4) {
      const a = 1 - kk / 0.4; ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(sx0, fy, 6 + kk * 40, 2 + kk * 10, 0, 0, 7); ctx.stroke();
    }
  }
  band(2); band(3);
  { // shimmering sun-glitter column under the sun + little bubbles rising in the water
    const W2 = BG.water, sx = W * 0.72;
    for (let k = 0; k < 16; k++) {
      const y = hz + (H - hz) * (0.03 + k * 0.06), wv = (5 + k * 2.6) * (0.55 + 0.45 * Math.sin(t * 2.6 + k * 1.7)), a = 0.16 + 0.22 * Math.max(0, Math.sin(t * 3.7 + k * 2.3));
      ctx.fillStyle = 'rgba(255,250,215,' + a + ')'; ctx.fillRect(sx - wv + Math.sin(t * 1.1 + k * 2.1) * (2 + k * 1.2), y, wv * 2, 1.4 + k * 0.08);
    }
    if (W2.tb.length < 12 && Math.random() < dt * 3) W2.tb.push({ x: rand(0.03, 0.97) * W, y: H + 4, r: rand(1.2, 3.2), v: rand(18, 38), p: rand(0, 6) });
    ctx.strokeStyle = 'rgba(220,250,255,0.55)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = W2.tb.length - 1; i >= 0; i--) { const b = W2.tb[i]; b.y -= b.v * dt; if (b.y < hz + (H - hz) * 0.5) { W2.tb.splice(i, 1); continue; } const bx = b.x + Math.sin(t * 2.4 + b.p) * 3; ctx.moveTo(bx + b.r, b.y); ctx.arc(bx, b.y, b.r, 0, 7); }
    ctx.stroke();
  }
  // sun sparkles on the water
  for (const s of BG.spark) {
    const a = Math.pow(Math.max(0, Math.sin(t * s.f + s.p)), 10); if (a < 0.05) continue;
    const x = s.x * W, y = hz + (H - hz) * s.y, r = 2 + a * 4;
    ctx.fillStyle = 'rgba(255,255,240,' + a + ')'; ctx.fillRect(x - r, y - 0.6, r * 2, 1.2); ctx.fillRect(x - 0.6, y - r, 1.2, r * 2);
  }
}
// ---- 2. SEWER LAIR
function bgSewer(t) {
  const dt = bgDt(1, t), wy = H * 0.8, ax = W * 0.5, aw = W * 0.36, atop = H * 0.2;
  ctx.drawImage(lay('sewer', W, H, (x) => {
    x.fillStyle = '#1b201b'; x.fillRect(0, 0, W, H);
    const bh = 14, bw = 30;
    for (let r = 0; r * bh < wy + bh; r++) for (let c = -1; c * bw < W; c++) {
      const h = hash(r * 91.7 + c * 13.1), l = 34 + h * 22, gtint = 8 * hash(r * 3.1 + c);
      x.fillStyle = 'rgb(' + (l + 6 | 0) + ',' + (l + gtint | 0) + ',' + (l - 4 | 0) + ')';
      x.fillRect(c * bw + (r % 2) * bw / 2 + 1, r * bh + 1, bw - 2, bh - 2);
    }
    // grime streaks + moss near the waterline
    for (let i = 0; i < 26; i++) { const gx = hash(i * 7.3) * W, gw = 3 + hash(i) * 10; x.fillStyle = lgx(x, 0, wy, [[0, 'rgba(10,20,8,0)'], [0.4 + hash(i * 2) * 0.4, 'rgba(10,20,8,0.45)'], [1, 'rgba(20,40,10,0.7)']]); x.fillRect(gx, 40, gw, wy - 40); }
    x.fillStyle = lgx(x, wy - 40, wy, [[0, 'rgba(60,110,30,0)'], [1, 'rgba(60,110,30,0.65)']]); x.fillRect(0, wy - 40, W, 40);
    // main tunnel arch with depth
    const arch = (w, top, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(ax - w, wy); x.lineTo(ax - w, top + w); x.arc(ax, top + w, w, Math.PI, 0); x.lineTo(ax + w, wy); x.closePath(); x.fill(); };
    arch(aw + 12, atop - 12, '#2a2620');
    x.strokeStyle = '#141210'; x.lineWidth = 1.5;
    for (let k = 0; k <= 16; k++) { const a = Math.PI + k * Math.PI / 16; x.beginPath(); x.moveTo(ax + Math.cos(a) * aw, atop + aw + Math.sin(a) * aw); x.lineTo(ax + Math.cos(a) * (aw + 12), atop + aw + Math.sin(a) * (aw + 12)); x.stroke(); }
    arch(aw, atop, lgx(x, atop, wy, [[0, '#0b0f0b'], [1, '#050705']]));
    arch(aw * 0.62, atop + aw * 0.55, '#030403');
    arch(aw * 0.3, atop + aw * 1.0, '#010101');
    // pipes: top run, right run with elbow, left riser
    const pipe = (x0, y0, x1, y1, d, c1, c2) => {
      const hor = Math.abs(y1 - y0) < 1;
      x.fillStyle = hor ? lgx(x, y0 - d / 2, y0 + d / 2, [[0, c1], [0.45, c2], [1, '#0d100c']]) : c1;
      if (hor) x.fillRect(x0, y0 - d / 2, x1 - x0, d); else { const gr = x.createLinearGradient(x0 - d / 2, 0, x0 + d / 2, 0); gr.addColorStop(0, c1); gr.addColorStop(0.45, c2); gr.addColorStop(1, '#0d100c'); x.fillStyle = gr; x.fillRect(x0 - d / 2, y0, d, y1 - y0); }
      x.fillStyle = 'rgba(0,0,0,0.45)';
      if (hor) for (let px = x0 + 30; px < x1; px += 72) x.fillRect(px, y0 - d / 2 - 2, 6, d + 4); else for (let py = y0 + 30; py < y1; py += 72) x.fillRect(x0 - d / 2 - 2, py, d + 4, 6);
    };
    pipe(0, 34, W, 34, 14, '#4d5a44', '#8a9a74');
    pipe(L.sx ? L.sx - 6 : W * 0.7, H * 0.6, W, H * 0.6, 12, '#5a3f2a', '#9c6b43');
    pipe(W - 6, H * 0.6, W - 6, wy, 10, '#5a3f2a', '#9c6b43');
    pipe(7, 34, 7, wy, 12, '#3f4a39', '#748463');
    x.fillStyle = 'rgba(120,70,30,0.35)'; for (let i = 0; i < 6; i++) x.fillRect(hash(i * 5.5) * W, 41, 3, 20 + hash(i) * 40);
    // water
    x.fillStyle = lgx(x, wy, H, [[0, '#3c5f26'], [0.15, '#2a4a1c'], [1, '#0c1d0b']]); x.fillRect(0, wy, W, H - wy);
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(ax, wy + 6, aw * 0.9, 10, 0, 0, 7); x.fill();
  }), 0, 0, W, H);
  // flickering caged lamps
  const glow = lay('sglow', 200, 300, (x) => { x.fillStyle = rgx(x, 100, 40, 4, 160, [[0, 'rgba(255,230,150,0.75)'], [0.3, 'rgba(220,200,110,0.22)'], [1, 'rgba(200,180,90,0)']]); x.fillRect(0, 0, 200, 300); });
  ctx.globalCompositeOperation = 'lighter';
  [W * 0.2, W * 0.52, W * 0.84].forEach((lx, i) => {
    const h = hash(Math.floor(t * (i === 1 ? 14 : 9)) + i * 37.3), f = h < (i === 1 ? 0.16 : 0.05) ? 0.12 : 0.75 + 0.12 * Math.sin(t * 23 + i * 2);
    ctx.globalAlpha = f; ctx.drawImage(glow, lx - 100, 12, 200, 300);
  });
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  [W * 0.2, W * 0.52, W * 0.84].forEach((lx) => { ctx.fillStyle = '#2b2b22'; ctx.fillRect(lx - 7, 41, 14, 4); ctx.fillStyle = '#ffe9a6'; ctx.beginPath(); ctx.arc(lx, 50, 4.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#2b2b22'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(lx, 50, 6, 0, Math.PI); ctx.moveTo(lx, 45); ctx.lineTo(lx, 56); ctx.stroke(); });
  { // murky flow: slow current streaks drifting toward the tunnel side, bubbles that rise, sit and pop
    const W2 = BG.water || (BG.water = { tb: [], ts: [], sb: [], cur: [], splashes: 0, pops: 0, nextSp: 1 });
    if (!W2.cur.length) for (let i = 0; i < 16; i++) W2.cur.push({ x: Math.random() * W, f: hash(i * 3.7), len: rand(18, 60), v: rand(8, 22) });
    ctx.strokeStyle = 'rgba(160,215,115,0.3)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
    for (const c of W2.cur) {
      const y = wy + 8 + c.f * (H - wy - 14), sp = c.v * (0.6 + c.f * 0.8); c.x += sp * dt; if (c.x - c.len > W) { c.x = -rand(0, 40); c.len = rand(18, 60); }
      const yy = y + Math.sin(c.x * 0.03 + t * 0.6) * 1.5; ctx.moveTo(c.x - c.len, yy); ctx.quadraticCurveTo(c.x - c.len / 2, yy - 2, c.x, yy);
    }
    ctx.stroke(); ctx.lineCap = 'butt';
    if (W2.sb.length < 7 && Math.random() < dt * 0.9) W2.sb.push({ x: Math.random() < 0.6 && L.sx ? rand(L.sx, W - 10) : rand(0.05, 0.95) * W, y: wy + rand(14, 60), r: rand(2, 4.5), v: rand(16, 30), st: 'rise', t: 0 });
    for (let i = W2.sb.length - 1; i >= 0; i--) {
      const b = W2.sb[i]; b.t += dt; b.x += 6 * dt;
      if (b.st === 'rise') { b.y -= b.v * dt; if (b.y <= wy + 2) { b.y = wy + 1; b.st = 'float'; b.t = 0; b.life = rand(0.8, 2.4); } }
      else if (b.t > b.life) { W2.pops++; if (BG.rings.length < 16) BG.rings.push({ x: b.x, y: wy + 2, t: 0, s: 0.6 }); W2.sb.splice(i, 1); continue; }
      const r = b.st === 'float' ? b.r * 1.3 : b.r;
      ctx.strokeStyle = 'rgba(180,230,140,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(b.x, b.y, r, b.st === 'float' ? Math.PI : 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(230,255,200,0.5)'; ctx.fillRect(b.x - r * 0.45, b.y - r * 0.55, 1.4, 1.4);
    }
  }
  // gentle surface ripples
  ctx.strokeStyle = 'rgba(160,220,120,0.12)'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let k = 0; k < 3; k++) { const yy = wy + 4 + k * (H - wy) / 4; for (let x = 0; x <= W; x += 14) { const y = yy + Math.sin(x * 0.045 + t * (0.8 + k * 0.2) + k) * (1.2 + k * 0.4); if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); } }
  ctx.stroke();
  // drips
  for (const d of BG.drips) {
    if (d.ph === 'wait') { d.w -= dt; if (d.w <= 0) { d.ph = 'grow'; d.r = 0; } continue; }
    if (d.ph === 'grow') { d.r += dt * 3 / d.gr; if (d.r >= 3) { d.ph = 'fall'; d.y = d.y0 + 3; d.vy = 30; } }
    else { d.vy += 980 * dt; d.y += d.vy * dt; if (d.y >= wy) { d.ph = 'wait'; d.w = rand(0.3, 2.2); d.gr = rand(0.8, 2.4); if (BG.rings.length < 16) BG.rings.push({ x: d.x, y: wy + 2, t: 0, s: 1 }); for (let k = 0; k < 3 && BG.splash.length < 24; k++) BG.splash.push({ x: d.x, y: wy, vx: rand(-40, 40), vy: rand(-140, -70), t: 0 }); } }
    ctx.fillStyle = 'rgba(170,230,140,0.85)';
    if (d.ph === 'grow') { ctx.beginPath(); ctx.arc(d.x, d.y0 + d.r, d.r, 0, 7); ctx.fill(); }
    else { ctx.beginPath(); ctx.ellipse(d.x, d.y, 2.2, 3.6, 0, 0, 7); ctx.fill(); }
  }
  for (let i = BG.splash.length - 1; i >= 0; i--) { const s = BG.splash[i]; s.t += dt; s.vy += 600 * dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.y > wy + 2) { BG.splash.splice(i, 1); continue; } ctx.fillStyle = 'rgba(170,230,140,0.7)'; ctx.fillRect(s.x - 1, s.y - 1, 2, 2); }
  for (let i = BG.rings.length - 1; i >= 0; i--) { const r = BG.rings[i]; r.t += dt; const k = r.t / 1.1; if (k >= 1) { BG.rings.splice(i, 1); continue; } ctx.strokeStyle = 'rgba(190,240,150,' + (0.6 * (1 - k)) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(r.x, r.y, (3 + k * 26) * r.s, (1 + k * 6) * r.s, 0, 0, 7); ctx.stroke(); }
  drawGator(dt, t, wy);
}
function drawGator(dt, t, wy) {
  const gt = BG.gator; gt.t += dt;
  if (gt.state === 'up') {
    gt.nextBlink -= dt; gt.nextSink -= dt;
    if (!gt.blink && gt.nextBlink <= 0) {
      const dbl = Math.random() < 0.3;
      gt.blink = { t: 0, d: dbl ? 0.85 : rand(0.16, 0.26), dbl }; gt.blinks++; if (dbl) gt.doubles++;
      gt.nextBlink = rand(1.8, 5.2);
    }
    if (gt.nextSink <= 0 && !gt.blink) { gt.state = 'sink'; gt.t = 0; gt.sinks++; BG.rings.push({ x: gt.x, y: wy + 2, t: 0, s: 1.6 }); }
  } else if (gt.state === 'sink') { gt.dy = Math.min(1, gt.t / 1.1) * 18; if (gt.t > 1.1) { gt.state = 'under'; gt.t = 0; gt.under = rand(2, 4.5); } }
  else if (gt.state === 'under') { if (gt.t > gt.under) { gt.state = 'rise'; gt.t = 0; gt.x = colX() + rand(-10, 10); BG.rings.push({ x: gt.x, y: wy + 2, t: 0, s: 1.6 }); } }
  else if (gt.state === 'rise') { gt.dy = 18 * (1 - Math.min(1, gt.t / 1.2)); if (gt.t > 1.2) { gt.state = 'up'; gt.t = 0; gt.dy = 0; gt.nextSink = rand(18, 30); gt.nextBlink = rand(0.6, 2); } }
  if (gt.state === 'under') return;
  let lid = 0;
  if (gt.blink) {
    const b = gt.blink; b.t += dt; const k = b.t / b.d;
    if (k >= 1) gt.blink = null;
    else lid = b.dbl ? Math.abs(Math.sin(k * Math.PI * 2)) : Math.sin(k * Math.PI);
  }
  const x = gt.x, bob = Math.sin(t * 1.3) * 1.8 + Math.sin(t * 0.55 + 1) * 0.9, y = wy + gt.dy + bob;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, wy + 1); ctx.clip();
  ctx.fillStyle = '#2c4a1f'; ctx.beginPath(); ctx.ellipse(x, y + 3, 22, 7, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - 19, y + 2, 6, 3.5, 0, 0, 7); ctx.ellipse(x + 19, y + 2, 6, 3.5, 0, 0, 7); ctx.fill(); // nostril bumps
  for (const ex of [x - 8, x + 8]) {
    ctx.fillStyle = '#35572a'; ctx.beginPath(); ctx.ellipse(ex, y - 2, 7, 7, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.ellipse(ex, y - 4, 4.4, Math.max(0.2, 3.4 * (1 - lid)), 0, 0, 7); ctx.fill();
    if (lid < 0.8) { ctx.fillStyle = '#111'; ctx.fillRect(ex - 0.8, y - 4 - 3 * (1 - lid), 1.6, 6 * (1 - lid)); }
    ctx.fillStyle = 'rgba(255,240,170,0.18)'; ctx.beginPath(); ctx.arc(ex, y - 4, 8, 0, 7); ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(190,240,150,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, wy + 2, 30 + bob * 1.5, 4 + Math.max(0, -bob) * 0.6, 0, 0, 7); ctx.stroke();
  const lap = (t * 0.7) % 1; ctx.strokeStyle = 'rgba(190,240,150,' + (0.3 * (1 - lap)) + ')'; ctx.beginPath(); ctx.ellipse(x, wy + 2, 32 + lap * 22, 4 + lap * 4, 0, 0, 7); ctx.stroke();
}
// ---- 3. NEO METROPOLIS
function cityLayer(l) {
  const SW = Math.ceil(W * 1.5), key = 'city' + l;
  if (BG.L[key]) return BG.L[key];
  const wins = [], boards = [];
  const cv = mkLayer(SW, H, (x) => {
    const base = ['#1d1a4a', '#131035', '#0a0822'][l], hmin = [0.3, 0.22, 0.14][l], hmax = [0.58, 0.48, 0.36][l], wmin = [26, 34, 44][l];
    let bx = 0, n = 0;
    while (bx < SW - 10) {
      const w = Math.min(SW - bx, rand(wmin, wmin * 2)), h = H * rand(hmin, hmax), top = H - h;
      x.fillStyle = base; x.fillRect(bx, top, w - 2, h);
      if (n % 3 === 1) { x.fillRect(bx + w * 0.4, top - 18, 3, 18); wins.push({ x: bx + w * 0.4 + 1.5, y: top - 18, ant: 1 }); }
      if (n % 4 === 0) { x.beginPath(); x.moveTo(bx, top); x.lineTo(bx + w / 2, top - w * 0.35); x.lineTo(bx + w - 2, top); x.fill(); }
      x.fillStyle = ['rgba(0,229,255,0.22)', 'rgba(255,61,242,0.25)', 'rgba(0,229,255,0.35)'][(n + l) % 3]; x.fillRect(bx + w - 3, top, 1.5, h);
      const cw = 3 + l, ch = 4 + l, gx = 4 + l * 2, gy = 7 + l * 2;
      for (let wy = top + 8; wy < H - 6; wy += gy) for (let wx = bx + 4; wx < bx + w - 6; wx += gx) {
        const h2 = hash(wx * 0.37 + wy * 1.91 + l * 7);
        if (h2 > 0.58) { x.fillStyle = h2 > 0.93 ? '#ff7af5' : h2 > 0.82 ? '#8ff6ff' : '#ffd36b'; x.globalAlpha = 0.45 + l * 0.18; x.fillRect(wx, wy, cw, ch); x.globalAlpha = 1; if (l > 0 && h2 > 0.9 && wins.length < 260) wins.push({ x: wx, y: wy, w: cw, h: ch, c: x.fillStyle }); }
      }
      if (l > 0 && n % 5 === 2 && w > 38) boards.push({ x: bx + 4, y: top + 14 + rand(0, 30), w: w - 10, h: Math.min(46, w * 0.6), k: boards.length });
      bx += w + rand(0, 4); n++;
    }
  });
  cv.wins = wins; cv.boards = boards; cv.sw = SW;
  BG.L[key] = cv; return cv;
}
const HOLO = ['POP!', 'NEO', 'BONANZA', '\u25c6 4+ \u25c6', 'CHAIN', 'x3!'];
function bgMetro(t) {
  const dt = bgDt(2, t);
  ctx.drawImage(lay('msky', W, H, (x) => {
    x.fillStyle = lgx(x, 0, H, [[0, '#03031a'], [0.45, '#1a0b45'], [0.75, '#4b1268'], [1, '#ff3d9a']]); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.2 + hash(i) * 0.6) + ')'; x.fillRect(hash(i * 3.3) * W, hash(i * 7.7) * H * 0.5, 1.3, 1.3); }
    x.fillStyle = rgx(x, W * 0.3, H * 0.78, 10, W * 0.8, [[0, 'rgba(255,61,242,0.35)'], [1, 'rgba(255,61,242,0)']]); x.fillRect(0, 0, W, H);
    x.drawImage(cityLayer(0), 0, 0, Math.ceil(W * 1.5), H);
  }), 0, 0, W, H);
  const sp = [0, 7, 15];
  for (let l = 1; l < 3; l++) {
    const cv = cityLayer(l), SW = cv.sw, off = (t * sp[l]) % SW;
    ctx.drawImage(cv, -off, 0, SW, H); if (SW - off < W) ctx.drawImage(cv, SW - off, 0, SW, H);
    if (l === 0) continue;
    const sx = (px) => { let x = px - off; if (x < -60) x += SW; return x; };
    // twinkling windows + blinking antenna lights
    for (let i = 0; i < cv.wins.length; i += 1) {
      const w = cv.wins[i], x = sx(w.x); if (x < -5 || x > W + 5) continue;
      if (w.ant) { if (Math.sin(t * 3 + i) > 0.3) { ctx.fillStyle = '#ff3355'; ctx.beginPath(); ctx.arc(x, w.y, 2, 0, 7); ctx.fill(); } continue; }
      const s = Math.sin(t * (0.6 + hash(i) * 2) + i * 2.1);
      if (s > 0.75) { ctx.fillStyle = w.c; ctx.fillRect(x - 0.5, w.y - 0.5, w.w + 1, w.h + 1); }
      else if (s < -0.85) { ctx.fillStyle = '#0a0822'; ctx.fillRect(x, w.y, w.w, w.h); }
    }
    // holographic billboards
    for (const b of cv.boards) {
      const x = sx(b.x); if (x < -b.w || x > W) continue;
      const fl = 0.55 + 0.25 * Math.sin(t * 5 + b.k) + (hash(Math.floor(t * 8) + b.k * 9) < 0.07 ? -0.4 : 0), jx = hash(Math.floor(t * 6) + b.k) < 0.05 ? 3 : 0;
      ctx.globalAlpha = Math.max(0.1, fl);
      const hue = b.k % 2 ? 'rgba(255,61,242,' : 'rgba(0,229,255,', msg = (b.k + Math.floor(t / 3)) % HOLO.length;
      ctx.drawImage(lay('holo' + l + '_' + b.k + '_' + msg, b.w + 4, b.h + 4, (hx) => { // cached hologram card
        hx.fillStyle = hue + '0.28)'; hx.fillRect(2, 2, b.w, b.h); hx.strokeStyle = hue + '0.9)'; hx.lineWidth = 1.5; hx.strokeRect(2, 2, b.w, b.h);
        let fs = b.h * 0.45; hx.font = font(fs, NFONT); const tw = hx.measureText(HOLO[msg]).width; if (tw > b.w * 0.85) fs *= b.w * 0.85 / tw;
        hx.font = font(fs, NFONT); hx.textAlign = 'center'; hx.textBaseline = 'middle'; hx.fillStyle = b.k % 2 ? '#ffd0fb' : '#c8fbff'; hx.fillText(HOLO[msg], 2 + b.w / 2, 2 + b.h / 2);
        hx.fillStyle = 'rgba(0,0,0,0.3)'; for (let yy = 2; yy < b.h + 2; yy += 3) hx.fillRect(2, yy, b.w, 1);
      }), x + jx - 2, b.y - 2, b.w + 4, b.h + 4);
      ctx.fillStyle = hue + '0.12)'; ctx.beginPath(); ctx.moveTo(x + b.w * 0.3, b.y + b.h); ctx.lineTo(x + b.w * 0.7, b.y + b.h); ctx.lineTo(x + b.w * 0.55, b.y + b.h + 30); ctx.lineTo(x + b.w * 0.45, b.y + b.h + 30); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  // flying cars with light trails (4 lanes, different depth/speed/direction)
  const trail = lay('trail', 128, 8, (x) => { const gr = x.createLinearGradient(0, 0, 128, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 8); });
  for (const c of BG.cars) {
    c.x += c.v * dt;
    if (c.v > 0 && c.x > W + 140) c.x = -140; if (c.v < 0 && c.x < -140) c.x = W + 140;
    const s = c.s, dir = Math.sign(c.v), y = c.y + Math.sin(t * 2 + c.x * 0.01) * 1.5 * s, len = 40 + Math.abs(c.v) * 0.45;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * s;
    ctx.translate(c.x, y); ctx.scale(dir, 1);
    ctx.drawImage(trail, -len - 10 * s, -2.5 * s, len, 2.5 * s);
    ctx.globalAlpha = 0.35 * s; ctx.drawImage(trail, -len * 0.7 - 10 * s, 1.5 * s, len * 0.7, 1.6 * s);
    ctx.restore();
    ctx.save(); ctx.translate(c.x, y); ctx.scale(dir * s, s);
    ctx.fillStyle = c.c ? '#2a2f5a' : '#3b1f4f'; rr(-12, -4, 24, 7, 3); ctx.fill();
    ctx.fillStyle = 'rgba(140,240,255,0.9)'; ctx.fillRect(-2, -3.5, 7, 2.5);
    ctx.fillStyle = c.c ? '#00e5ff' : '#ff3df2'; ctx.fillRect(-10, 3, 20, 1.5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(11, -1.5, 2.5, 2); ctx.fillStyle = '#ff3355'; ctx.fillRect(-13, -1.5, 2, 2);
    ctx.restore();
  }
}
// ---- 4. STORM PLANET
function makeBolt() {
  const x0 = rand(W * 0.08, W * 0.92), y1 = H * rand(0.68, 0.86), x1 = x0 + rand(-W * 0.25, W * 0.25);
  const path = (ax, ay, bx, by, n, rough) => { let pts = [[ax, ay], [bx, by]]; for (let it = 0; it < n; it++) { const np = [pts[0]]; for (let i = 1; i < pts.length; i++) { const [px, py] = pts[i - 1], [qx, qy] = pts[i], d = Math.hypot(qx - px, qy - py); np.push([(px + qx) / 2 + rand(-1, 1) * d * rough, (py + qy) / 2 + rand(-0.2, 0.2) * d * rough]); np.push(pts[i]); } pts = np; } return pts; };
  const main = path(x0, -10, x1, y1, 5, 0.35), lines = [main];
  for (let b = 0; b < 3; b++) { const st = main[(4 + Math.random() * (main.length - 12)) | 0], len = rand(40, 120); lines.push(path(st[0], st[1], st[0] + rand(-1, 1) * len, st[1] + len * rand(0.6, 1.1), 4, 0.4)); }
  return lines;
}
function bgStorm(t) {
  const dt = bgDt(3, t), hz = H * 0.74, gy = H * 0.88, S = BG.storm;
  ctx.drawImage(lay('ssky', W, H, (x) => {
    x.fillStyle = lgx(x, 0, hz, [[0, '#14062e'], [0.45, '#4a1f7a'], [0.8, '#2f7f8a'], [1, '#5fd3c4']]); x.fillRect(0, 0, W, hz + 1);
    const moon = (mx, my, r, c1, c2, cr) => {
      x.fillStyle = rgx(x, mx, my, r, r * 2.4, [[0, cr], [1, 'rgba(0,0,0,0)']]); x.fillRect(mx - r * 3, my - r * 3, r * 6, r * 6);
      x.fillStyle = rgx(x, mx - r * 0.35, my - r * 0.35, r * 0.1, r * 1.1, [[0, c1], [1, c2]]); x.beginPath(); x.arc(mx, my, r, 0, 7); x.fill();
      x.fillStyle = 'rgba(0,0,0,0.16)'; for (let i = 0; i < 6; i++) { const a = hash(i * 3 + r) * 6.28, d = hash(i * 7 + r) * r * 0.7; x.beginPath(); x.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, r * (0.08 + hash(i) * 0.12), 0, 7); x.fill(); }
      x.fillStyle = 'rgba(10,0,30,0.45)'; x.beginPath(); x.arc(mx, my, r, -1.2, 1.9); x.arc(mx - r * 0.35, my, r * 0.95, 1.9, -1.2, true); x.fill();
    };
    moon(W * 0.24, H * 0.085, Math.min(W, H) * 0.1, '#d8fff6', '#4fb3a6', 'rgba(120,255,230,0.25)');
    moon(W * 0.8, H * 0.05, Math.min(W, H) * 0.045, '#ffe0f4', '#b0549a', 'rgba(255,150,230,0.25)');
    x.fillStyle = '#2b1550'; x.beginPath(); x.moveTo(0, hz);
    for (let px = 0; px <= W; px += 16) x.lineTo(px, hz - 10 - hash(px * 0.13) * 28 - (px % 96 < 40 ? 16 : 0)); x.lineTo(W, hz); x.fill();
    const spire = (sx, h, w, c) => {
      x.fillStyle = c; x.beginPath(); x.moveTo(sx - w, gy + 4);
      x.quadraticCurveTo(sx - w * 0.3, gy - h * 0.5, sx - w * 0.15, gy - h * 0.82); x.lineTo(sx - w * 0.75, gy - h * 0.9); x.quadraticCurveTo(sx, gy - h * 1.06, sx + w * 0.55, gy - h * 0.95);
      x.lineTo(sx + w * 0.15, gy - h * 0.84); x.quadraticCurveTo(sx + w * 0.35, gy - h * 0.4, sx + w, gy + 4); x.fill();
      x.fillStyle = 'rgba(95,211,196,0.25)'; x.fillRect(sx - w * 0.2, gy - h * 0.8, 2, h * 0.75);
    };
    [[0.12, 0.34, 18], [0.33, 0.22, 12], [0.55, 0.4, 20], [0.74, 0.27, 14], [0.9, 0.46, 22]].forEach(([sx, h, w]) => spire(W * sx, H * h, w, '#1d0d36'));
    [[colX() / W + 0.04, 0.2, 13], [0.04, 0.18, 10]].forEach(([sx, h, w]) => spire(W * sx, H * h, w, '#140826'));
    x.fillStyle = lgx(x, gy - 6, H, [[0, '#1a0b2e'], [1, '#07020f']]); x.beginPath(); x.moveTo(0, H);
    for (let px = 0; px <= W; px += 12) x.lineTo(px, gy - hash(px * 0.7) * 7); x.lineTo(W, H); x.fill();
  }), 0, 0, W, H);
  // racing storm clouds
  const cl = lay('scloud', W * 2, H * 0.3, (x) => { for (let i = 0; i < 40; i++) { const cx = hash(i * 1.7) * W * 2, cy = hash(i * 4.1) * H * 0.22, r = 20 + hash(i * 9) * 50; x.fillStyle = rgx(x, cx, cy, 2, r, [[0, 'rgba(40,15,70,0.55)'], [1, 'rgba(40,15,70,0)']]); x.fillRect(cx - r, cy - r, r * 2, r * 2); } });
  const co = (t * 60) % (W * 2); ctx.drawImage(cl, co - W * 2, 0, W * 2, H * 0.3); ctx.drawImage(cl, co, 0, W * 2, H * 0.3);
  // lightning: periodic, branching bolt, scene flash, thunder delayed by distance
  if (t >= S.next) { S.bolt = makeBolt(); S.age = 0; S.flashes++; S.next = t + rand(3.5, 8); if (sfx.thunder(rand(0.35, 1.3))) S.thunders++; if (state === 'play') flashA = Math.max(flashA, 0.14); }
  S.age += dt;
  const a = S.age < 0.07 ? 1 : S.age < 0.13 ? 0.25 : S.age < 0.22 ? 0.9 : Math.max(0, 0.7 - (S.age - 0.22) * 2);
  if (a > 0 && S.bolt) {
    ctx.fillStyle = 'rgba(200,180,255,' + (a * 0.4) + ')'; ctx.fillRect(0, 0, W, H);
    ctx.lineJoin = 'round';
    S.bolt.forEach((pts, bi) => {
      for (const [lw, col] of [[bi ? 4 : 8, 'rgba(170,120,255,' + (a * 0.35) + ')'], [bi ? 1.2 : 2.4, 'rgba(255,255,255,' + a + ')']]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
      }
    });
  }
  // gusting wind: dust streaks, debris, plants bending hard
  const gust = 0.6 + 0.3 * Math.sin(t * 0.8) + 0.15 * Math.sin(t * 2.3);
  ctx.lineWidth = 1;
  for (let grp = 0; grp < 2; grp++) {
    ctx.strokeStyle = grp ? 'rgba(230,210,255,0.35)' : 'rgba(150,240,225,0.22)'; ctx.beginPath();
    for (const d of BG.dust) { if (d.a !== grp) continue; d.x += d.v * gust * dt; d.y += Math.sin(t * 3 + d.v) * 20 * dt; if (d.x > W + 30) { d.x = -30; d.y = Math.random() * H; } ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * gust, d.y - d.len * 0.08); }
    ctx.stroke();
  }
  ctx.fillStyle = '#2a1a40';
  for (const d of BG.debris) {
    d.x += d.v * gust * dt; d.r += d.vr * dt; d.y += Math.sin(t * 4 + d.p) * 40 * dt;
    if (d.x > W + 20) { d.x = -20; d.y = rand(0.3, 0.95) * H; }
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.r); ctx.fillRect(-d.s, -d.s * 0.4, d.s * 2, d.s * 0.8); ctx.restore();
  }
  for (const p of BG.plants) {
    const bend = (gust * 0.9 + Math.sin(t * 5.5 + p.p) * 0.12) * p.h, x0 = p.x, y0 = gy - 2;
    const tx = x0 + bend * 0.85, ty = y0 - p.h + Math.abs(bend) * 0.35;
    ctx.strokeStyle = p.c ? '#3a7f6a' : '#5b3a7d'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + bend * 0.15, y0 - p.h * 0.6, tx, ty); ctx.stroke();
    ctx.lineWidth = 1.6; ctx.beginPath();
    for (let k = 1; k <= 3; k++) { const f = k / 4, sx = x0 + bend * 0.15 * f * 2 + (tx - x0) * f * f, sy = y0 - (y0 - ty) * f; ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 8 + bend * 0.2, sy - 6, sx + 14 + bend * 0.35, sy + 2); }
    ctx.stroke(); ctx.lineCap = 'butt';
    const gc = p.c ? 'rgba(95,255,214,' : 'rgba(255,120,240,', pul = 0.6 + 0.4 * Math.sin(t * 3 + p.p);
    ctx.fillStyle = gc + (0.25 * pul) + ')'; ctx.beginPath(); ctx.arc(tx, ty, 9, 0, 7); ctx.fill();
    ctx.fillStyle = gc + '0.95)'; ctx.beginPath(); ctx.ellipse(tx, ty, 5, 3.5, bend * 0.01, 0, 7); ctx.fill();
  }
}
// ---- 5. EVENT HORIZON
function newFaller(init) {
  const R = Math.max(W, H) * 0.75;
  return { r: init ? rand(W * 0.15, R) : rand(R * 0.7, R), a: rand(0, 6.28), c: Math.random() < 0.3 ? 1 : 0, s: rand(0.8, 1.8) };
}
function bgHole(t) {
  const dt = bgDt(4, t), cx = W * 0.56, cy = H * 0.4, R = W * 0.5, rs = W * 0.105, Hh = BG.hole;
  Hh.pulse = Math.max(0, Hh.pulse - dt * 0.8);
  const warp = 1 + 0.012 * Math.sin(t * 1.6) + Hh.pulse * 0.03;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(warp, warp); ctx.translate(-cx, -cy);
  ctx.drawImage(lay('bhsky', W, H, (x) => {
    x.fillStyle = '#030109'; x.fillRect(0, 0, W, H);
    [[0.2, 0.2, '#3b1a78'], [0.85, 0.75, '#152d6b'], [0.3, 0.85, '#4d1450']].forEach(([nx, ny, c]) => { x.fillStyle = rgx(x, nx * W, ny * H, 5, W * 0.6, [[0, c + '88'], [1, c + '00']]); x.fillRect(0, 0, W, H); });
    for (let i = 0; i < 260; i++) { const b = hash(i * 1.3); x.fillStyle = b > 0.9 ? '#ffe7c4' : b > 0.75 ? '#b9c8ff' : 'rgba(255,255,255,' + (0.25 + b * 0.5) + ')'; const s = b > 0.94 ? 2 : 1.1; x.fillRect(hash(i * 5.1) * W, hash(i * 8.9) * H, s, s); }
  }), 0, 0, W, H);
  ctx.restore();
  const disk = lay('disk', R * 2, R * 2, (x) => {
    const rin = rs * 1.25;
    x.fillStyle = rgx(x, R, R, rin, R, [[0, 'rgba(255,248,225,1)'], [0.12, 'rgba(255,190,90,0.95)'], [0.4, 'rgba(255,110,40,0.65)'], [0.7, 'rgba(150,50,200,0.35)'], [1, 'rgba(80,20,140,0)']]);
    x.beginPath(); x.arc(R, R, R, 0, 7); x.arc(R, R, rin, 0, 7, true); x.fill();
    for (let i = 0; i < 160; i++) {
      const k = Math.pow(Math.random(), 0.8), rr2 = rin + (R - rin) * k, a0 = Math.random() * 6.28;
      x.strokeStyle = k < 0.2 ? 'rgba(255,250,235,' : k < 0.5 ? 'rgba(255,160,70,' : 'rgba(190,90,255,'; x.strokeStyle += (0.15 + Math.random() * 0.4) * (1 - k * 0.6) + ')';
      x.lineWidth = 0.8 + Math.random() * 2.4; x.beginPath(); x.arc(R, R, rr2, a0, a0 + 0.4 + Math.random() * 2.2); x.stroke();
    }
  });
  const tilt = 0.27, rot = t * 0.22;
  const drawDisk = () => { ctx.save(); ctx.translate(cx, cy); ctx.scale(1, tilt); ctx.rotate(rot); ctx.drawImage(disk, -R, -R, R * 2, R * 2); ctx.restore(); };
  // gravitational lensing ring: light from the far side of the disk bent around the hole (brighter on the approaching side)
  const lens = lay('lens', rs * 4, rs * 4, (x) => {
    const c2 = rs * 2;
    x.fillStyle = rgx(x, c2, c2, rs * 1.0, rs * 1.9, [[0, 'rgba(255,240,210,0)'], [0.12, 'rgba(255,240,210,0.95)'], [0.35, 'rgba(255,150,60,0.55)'], [1, 'rgba(140,50,220,0)']]);
    x.beginPath(); x.arc(c2, c2, rs * 1.9, 0, 7); x.fill();
    const gr = x.createLinearGradient(0, 0, rs * 4, 0); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)');
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = gr; x.fillRect(0, 0, rs * 4, rs * 4);
  });
  const lp = 1 + 0.04 * Math.sin(t * 2.2) + Hh.pulse * 0.12;
  ctx.drawImage(lens, cx - rs * 2 * lp, cy - rs * 2 * lp, rs * 4 * lp, rs * 4 * lp);
  drawDisk();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(cx, cy, rs, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(0, cy, W, H); ctx.clip(); drawDisk(); ctx.restore(); // near side of the disk passes in front
  ctx.strokeStyle = 'rgba(255,245,220,0.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy, rs * 1.04, 0, 7); ctx.stroke();
  // infalling stars / debris: spiral inward and stretch (spaghettification)
  for (let grp = 0; grp < 2; grp++) {
    ctx.strokeStyle = grp ? 'rgba(255,170,90,0.75)' : 'rgba(210,225,255,0.8)'; ctx.lineWidth = grp ? 1.6 : 1.1; ctx.beginPath();
    for (const f of BG.fall) {
      if (f.c !== grp) continue;
      const w = 0.5 * Math.pow(R / f.r, 1.5) * f.s;
      f.a += w * dt; f.r -= (8 + 1800 / f.r) * dt * f.s;
      if (f.r < rs * 1.05) { Hh.eaten++; Object.assign(f, newFaller(false)); continue; }
      const st = Math.min(1.2, w * 0.12 + 0.02), sq = 0.45;
      const x1 = cx + Math.cos(f.a) * f.r, y1 = cy + Math.sin(f.a) * f.r * sq, r0 = f.r * (1 + st * 0.15);
      ctx.moveTo(cx + Math.cos(f.a - st) * r0, cy + Math.sin(f.a - st) * r0 * sq); ctx.lineTo(x1, y1);
    }
    ctx.stroke();
  }
  // space-warp pulse ring every 4 s (and stronger when gravity distorts the board)
  const pk = (t % 4) / 4;
  ctx.strokeStyle = 'rgba(190,140,255,' + (0.25 * (1 - pk) + Hh.pulse * 0.4) + ')'; ctx.lineWidth = 2 + Hh.pulse * 3;
  ctx.beginPath(); ctx.ellipse(cx, cy, rs * (1.4 + pk * 5), rs * (1.4 + pk * 5) * 0.62, 0, 0, 7); ctx.stroke();
}
// ---- store-exclusive backgrounds
function bgCandy(t) {
  const dt = bgDt(6, t);
  ctx.drawImage(lay('candy', W, H, (x) => {
    x.fillStyle = lgx(x, 0, H, [[0, '#ffb3e6'], [0.5, '#d9b3ff'], [1, '#b3f0ff']]); x.fillRect(0, 0, W, H);
    const hill = (y0, amp, col, ph) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, H); for (let px = 0; px <= W; px += 8) x.lineTo(px, y0 + Math.sin(px * 0.02 + ph) * amp + Math.sin(px * 0.05 + ph * 2) * amp * 0.3); x.lineTo(W, H); x.fill(); };
    hill(H * 0.66, 18, '#ff8fd0', 0); hill(H * 0.74, 22, '#ff6fb5', 2); hill(H * 0.84, 16, '#ffd1ec', 4);
    for (let i = 0; i < 14; i++) { const gx = hash(i * 3.7) * W, gy = H * (0.78 + hash(i * 1.3) * 0.18), col = ['#ff4fa3', '#3dd6ff', '#ffe23d', '#7dffb0'][i % 4]; x.fillStyle = col; x.beginPath(); x.arc(gx, gy, 9, Math.PI, 0); x.lineTo(gx + 9, gy + 4); x.lineTo(gx - 9, gy + 4); x.fill(); x.fillStyle = 'rgba(255,255,255,0.6)'; x.beginPath(); x.arc(gx - 3, gy - 4, 2.5, 0, 7); x.fill(); }
  }), 0, 0, W, H);
  // cotton candy clouds
  for (let i = 0; i < 4; i++) { const cx = ((hash(i * 9) * (W + 200) + t * (8 + i * 3)) % (W + 200)) - 100, cy = H * (0.06 + i * 0.07); ctx.fillStyle = i % 2 ? 'rgba(255,214,240,0.9)' : 'rgba(220,230,255,0.9)'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(cx + k * 18, cy + (k % 2) * 6, 16 + (k % 2) * 6, 0, 7); ctx.fill(); } }
  // swaying lollipops
  [[0.06, 0.62, '#ff4fa3'], [colX() / W, 0.58, '#3dd6ff'], [0.96, 0.66, '#ffe23d'], [0.45, 0.62, '#7dffb0']].forEach(([lx, ly, col], i) => {
    const bx = lx * W, by = H * 0.8, sw = Math.sin(t * 1.5 + i) * 0.12, tx = bx + Math.sin(sw) * (by - ly * H), ty = ly * H;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(t * 1.2 + i); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); for (let a = 0; a < 12; a += 0.4) { const r = a * 1.4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.stroke(); ctx.restore();
  });
  // falling sprinkles
  if (!BG.sprinkles) { BG.sprinkles = []; for (let i = 0; i < 50; i++) BG.sprinkles.push({ x: Math.random() * W, y: Math.random() * H, v: rand(30, 80), r: rand(0, 6), c: i % 5 }); }
  for (const s of BG.sprinkles) {
    s.y += s.v * dt; s.r += dt * 3; if (s.y > H) { s.y = -5; s.x = Math.random() * W; }
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.r); ctx.fillStyle = ['#ff4fa3', '#3dd6ff', '#ffe23d', '#7dffb0', '#ffffff'][s.c]; ctx.fillRect(-4, -1.2, 8, 2.4); ctx.restore();
  }
}
function bgArcade(t) {
  const dt = bgDt(7, t);
  ctx.fillStyle = '#05010f'; ctx.fillRect(0, 0, W, H);
  if (!BG.pix) { BG.pix = []; for (let i = 0; i < 90; i++) BG.pix.push({ x: Math.random() * W, y: Math.random() * H, v: rand(20, 160), c: i % 3 }); }
  for (const p of BG.pix) { p.y += p.v * dt; if (p.y > H) { p.y = 0; p.x = Math.random() * W; } ctx.fillStyle = ['#ffffff', '#5dd3ff', '#ff5dcf'][p.c]; const s = p.v > 100 ? 3 : 2; ctx.fillRect(p.x | 0, p.y | 0, s, s); }
  // pixel sunset + blocky mountains (cached)
  const hz = H * 0.8;
  ctx.drawImage(lay('arcsun', W, H, (x) => {
    const r = Math.min(W, H) * 0.2, cx = W * 0.5, q = 6;
    for (let yy = -r; yy < 0; yy += q) {
      const f = (yy + r) / r, hw = Math.sqrt(Math.max(0, r * r - (yy + q / 2) * (yy + q / 2)));
      if (f > 0.45 && Math.floor(yy / q) % 3 === 0) continue;
      x.fillStyle = `rgb(255,${Math.round(230 - f * 170)},${Math.round(90 + f * 120)})`;
      const w = Math.round(hw / q) * q; x.fillRect(cx - w, hz + yy, w * 2, q - 1);
    }
    x.fillStyle = '#2a0b4a'; for (let px = 0, k = 0; px < W; px += q * 2, k++) { const h = (Math.sin(k * 0.7) * 0.5 + 0.5) * H * 0.07 + (k % 3) * q + q * 2; x.fillRect(px, hz - Math.round(h / q) * q, q * 2, H); }
    x.fillStyle = '#05010f'; x.fillRect(0, hz, W, H - hz);
  }), 0, 0, W, H);
  // pixel grid floor ctx.strokeStyle = 'rgba(93,211,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath();
  const ph = (t * 0.8) % 1; for (let k = 0; k < 8; k++) { const f = (k + ph) / 8, y = hz + (H - hz) * f * f; ctx.moveTo(0, y); ctx.lineTo(W, y); }
  for (let k = -8; k <= 8; k++) { ctx.moveTo(W / 2 + k * W * 0.03, hz); ctx.lineTo(W / 2 + k * W * 0.25, H); } ctx.stroke();
  // marching pixel invaders
  const INV = ['00100000100', '00010001000', '00111111100', '01101110110', '11111111111', '10111111101', '10100000101', '00011011000'];
  const INV2 = ['00100000100', '10010001001', '10111111101', '11101110111', '11111111111', '01111111110', '00100000100', '01000000010'];
  const frame2 = Math.floor(t * 2) % 2, ps = 2.2, step = Math.floor(t * 2), off = ((step % 40) < 20 ? step % 20 : 20 - (step % 20)) * 4;
  for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) {
    const bx = 8 + off + k * 32 * ps / 2.2 * 1.6, by = 10 + r * 22 + Math.floor(step / 40) % 3 * 2, pat = frame2 ? INV2 : INV;
    if (bx > W) continue; ctx.fillStyle = r ? '#7dff6a' : '#ff5dcf';
    for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 11; xx++) if (pat[yy][xx] === '1') ctx.fillRect(bx + xx * ps, by + yy * ps, ps, ps);
  }
  if (Math.floor(t * 1.6) % 2) fitTxt('INSERT COIN', colX(), H * 0.72, 13, (L.sw || 80) * 1.1, '#ffe23d', null, 'center', 'monospace');
  ctx.fillStyle = cache.scan; ctx.fillRect(0, 0, W, H);
}
function bgDesert(t) {
  const dt = bgDt(8, t), hz = H * 0.66;
  ctx.drawImage(lay('desert', W, H, (x) => {
    x.fillStyle = lgx(x, 0, hz, [[0, '#2a1b5e'], [0.45, '#b4407a'], [0.8, '#ff8a3d'], [1, '#ffd27a']]); x.fillRect(0, 0, W, hz + 1);
    const sx = W * 0.5, sy = hz - H * 0.02, r = Math.min(W, H) * 0.2;
    x.fillStyle = rgx(x, sx, sy, r * 0.8, r * 2.6, [[0, 'rgba(255,200,120,0.6)'], [1, 'rgba(255,140,80,0)']]); x.fillRect(0, 0, W, hz);
    x.fillStyle = lgx(x, sy - r, sy, [[0, '#fff1a8'], [1, '#ff6f3c']]); x.beginPath(); x.arc(sx, sy, r, Math.PI, 0); x.fill();
    x.fillStyle = 'rgba(180,64,122,0.55)'; for (let k = 0; k < 4; k++) x.fillRect(sx - r, sy - r * (0.15 + k * 0.17), r * 2, 2 + k);
    const dune = (y0, amp, col, ph) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, H); for (let px = 0; px <= W; px += 8) x.lineTo(px, y0 + Math.sin(px * 0.012 + ph) * amp + Math.sin(px * 0.031 + ph) * amp * 0.4); x.lineTo(W, H); x.fill(); };
    dune(hz, 10, '#c4573a', 0); dune(hz + H * 0.07, 16, '#a3402e', 1.5); dune(hz + H * 0.17, 14, '#7a2c24', 3); dune(hz + H * 0.27, 12, '#4f1c1c', 4.5);
    const cactus = (cx, cy, h) => { x.fillStyle = '#2b0f14'; rrx(x, cx - 5, cy - h, 10, h, 5); x.fill(); rrx(x, cx - 16, cy - h * 0.62, 7, h * 0.32, 3.5); x.fill(); x.fillRect(cx - 16, cy - h * 0.36, 14, 6); rrx(x, cx + 9, cy - h * 0.78, 7, h * 0.36, 3.5); x.fill(); x.fillRect(cx + 2, cy - h * 0.48, 14, 6); };
    cactus(W * 0.12, hz + H * 0.2, 56); cactus(colX(), hz + H * 0.15, 46); cactus(W * 0.62, hz + H * 0.24, 38);
  }), 0, 0, W, H);
  for (let i = 0; i < 18; i++) { const a = Math.max(0, Math.sin(t * 1.3 + i * 2.1)); ctx.fillStyle = 'rgba(255,240,220,' + a * 0.8 + ')'; ctx.fillRect(hash(i * 4.4) * W, hash(i * 2.2) * H * 0.25, 1.5, 1.5); }
  // vulture circling + rolling tumbleweed
  const va = t * 0.6, vx = W * 0.7 + Math.cos(va) * 50, vy = H * 0.14 + Math.sin(va) * 14, f = Math.sin(t * 6) * 4;
  ctx.strokeStyle = '#2b0f14'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(vx - 12, vy - f); ctx.quadraticCurveTo(vx - 4, vy - 4, vx, vy); ctx.quadraticCurveTo(vx + 4, vy - 4, vx + 12, vy - f); ctx.stroke();
  const tp = t % 8;
  if (tp < 6) {
    const tx = -30 + (W + 60) * tp / 6, ty = hz + H * 0.22 - Math.abs(Math.sin(tp * 4)) * 18, rr2 = 11;
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(tp * 6); ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let k = 0; k < 7; k++) { ctx.moveTo(-rr2, 0); ctx.bezierCurveTo(-rr2 * 0.3, -rr2 * 1.2, rr2 * 0.6, rr2 * 1.1, rr2, 0); ctx.rotate(0.9); }
    ctx.stroke(); ctx.restore();
  }
  // drifting sand
  if (!BG.sand) { BG.sand = []; for (let i = 0; i < 30; i++) BG.sand.push({ x: Math.random() * W, y: hz + Math.random() * (H - hz), v: rand(40, 110) }); }
  ctx.fillStyle = 'rgba(255,210,150,0.5)';
  for (const s of BG.sand) { s.x += s.v * dt; if (s.x > W) s.x = 0; ctx.fillRect(s.x, s.y + Math.sin(t * 3 + s.v) * 2, 2, 1); }
}
// ---- stage 6-10 backgrounds (shared helpers)
const glowSpr = (col) => lay('glow' + col, 64, 64, (x) => { x.fillStyle = rgx(x, 32, 32, 0, 32, [[0, col], [0.35, col.replace(/[\d.]+\)$/, '0.35)')], [1, col.replace(/[\d.]+\)$/, '0)')]]); x.fillRect(0, 0, 64, 64); });
function glowAt(col, x, y, r, a) { ctx.globalAlpha = a; ctx.drawImage(glowSpr(col), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
const puffSpr = () => lay('puff', 64, 64, (x) => { x.fillStyle = rgx(x, 32, 32, 0, 32, [[0, 'rgba(255,255,255,0.9)'], [0.5, 'rgba(255,255,255,0.4)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, 64, 64); });
function initBG2() {
  const cx = colX();
  // deep sea
  BG.snow = []; for (let i = 0; i < 60; i++) BG.snow.push({ x: Math.random() * W, y: Math.random() * H, v: rand(6, 22), s: rand(0.7, 1.9), p: rand(0, 6) });
  BG.jelly = [{ x: W * 0.14, y: H * 0.34, s: 1, p: 0, c: 'rgba(255,122,217,1)', v: 9 }, { x: cx, y: H * 0.66, s: 0.8, p: 2, c: 'rgba(125,249,255,1)', v: 7 }, { x: W * 0.62, y: H * 0.22, s: 0.6, p: 4, c: 'rgba(179,136,255,1)', v: 11 }];
  BG.angler = { x: W * 0.25, dir: 1, y: H * 0.56, turn: 0 };
  BG.abub = []; BG.plank = []; for (let i = 0; i < 26; i++) BG.plank.push({ x: Math.random() * W, y: rand(0.3, 0.98) * H, p: rand(0, 6), f: rand(0.6, 1.8) });
  // crystal caverns
  BG.stal = []; for (let i = 0; i < 11; i++) BG.stal.push({ x: (i + 0.5) / 11 * W + (hash(i * 3.1) - 0.5) * W * 0.05, len: H * (0.05 + hash(i * 7.7) * 0.12), w: 10 + hash(i * 1.9) * 16 });
  BG.cdrips = BG.stal.filter((_, i) => i % 2 === 0).map((st) => ({ x: st.x, y0: st.len, ph: 'grow', r: 0, y: 0, vy: 0, w: rand(0, 2), gr: rand(1, 2.6) }));
  BG.crys = [[0.08, 0.9, 1.1, 0], [0.3, 0.93, 0.8, 1], [0.52, 0.91, 1, 2], [cx / W, 0.9, 1.15, 0], [0.97, 0.88, 0.9, 1], [0.02, 0.5, 0.7, 2], [0.98, 0.42, 0.6, 0], [0.7, 0.95, 0.6, 1]].map(([x, y, s, c]) => ({ x: x * W, y: y * H, s: s * Math.min(1.3, H / 700), c }));
  BG.cring = []; BG.csplash = []; BG.motes = []; for (let i = 0; i < 24; i++) BG.motes.push({ x: Math.random() * W, y: Math.random() * H, p: rand(0, 6), v: rand(4, 12) });
  // clockwork factory
  const sc = Math.min(1.25, Math.max(0.8, W / 390));
  const gears = [{ x: W * 0.1, y: H * 0.15, r: 58 * sc, n: 14, c: 0 }];
  const link = (from, ang, r, n, c) => { const f = gears[from], d = (f.r + r) * 0.93; gears.push({ x: f.x + Math.cos(ang) * d, y: f.y + Math.sin(ang) * d, r, n, c, from }); };
  link(0, 0.35, 34 * sc, 9, 1); link(1, -0.6, 24 * sc, 7, 0); link(0, 1.45, 40 * sc, 11, 1);
  gears.push({ x: cx, y: H * 0.88, r: 46 * sc, n: 12, c: 0 }); link(4, -2.4, 28 * sc, 8, 1); link(4, -0.5, 22 * sc, 7, 1);
  gears.push({ x: W * 0.62, y: H * 0.1, r: 30 * sc, n: 9, c: 1 }); link(7, 0.5, 44 * sc, 12, 0);
  gears.forEach((gg, i) => { gg.w = i === 0 || gg.from == null ? (i % 2 ? -0.5 : 0.5) * 60 / gg.r : 0; gg.i = i; });
  gears.forEach((gg) => { if (gg.from != null) { const f = gears[gg.from]; gg.w = -f.w * f.r / gg.r; } });
  BG.gears = gears; BG.steam = []; BG.vents = [[W * 0.32, H * 0.3], [W * 0.82, H * 0.3], [W * 0.05, H * 0.72]].map(([x, y]) => ({ x, y, next: rand(0.5, 2.5) }));
  BG.crates = []; for (let i = 0; i < 4; i++) BG.crates.push({ x: i * W * 0.32, s: rand(0.8, 1.15), c: i % 3 });
  // haunted forest
  BG.eyes = [[0.06, 0.62], [0.2, 0.78], [0.44, 0.7], [cx / W - 0.05, 0.77], [0.94, 0.6], [0.33, 0.52], [0.7, 0.82]].map(([x, y], i) => ({ x: x * W, y: y * H, s: 0.8 + hash(i) * 0.6, next: rand(0.5, 4), blink: 0, on: Math.random() < 0.7, c: i % 3 }));
  BG.wisps = []; for (let i = 0; i < 9; i++) BG.wisps.push({ x: Math.random() * W, y: rand(0.45, 0.95) * H, p: rand(0, 6), v: rand(6, 16) });
  BG.hbat = { t: rand(2, 5), x: 0, y: 0, on: false };
  // vampire's tomb
  BG.spiders = [[0.05, 0.2], [0.27, 0.11], [0.5, 0.15], [cx / W, 0.08], [0.95, 0.24]].map(([x, l], i) => ({ x: x * W, len: l * H, p: i * 1.9, s: 0.8 + hash(i * 5) * 0.5 }));
  BG.tbats = []; for (let i = 0; i < 7; i++) BG.tbats.push({ x: Math.random() * W, y: rand(0.06, 0.4) * H, v: rand(40, 110) * (i % 2 ? 1 : -1), p: rand(0, 6), s: rand(0.6, 1.2) });
  BG.tomb = BG.tomb || { flashes: 0, thunders: 0 }; BG.tomb.next = BG.lt[13] + rand(2, 4); BG.tomb.bolt = null; BG.tomb.age = 9;
}
// ---- 6. DEEP SEA ABYSS
function bgAbyss(t) {
  const dt = bgDt(9, t), cx = colX();
  ctx.drawImage(lay('abyss', W, H, (x) => {
    x.fillStyle = lgx(x, 0, H, [[0, '#0a3d66'], [0.3, '#05264a'], [0.7, '#020f24'], [1, '#00050f']]); x.fillRect(0, 0, W, H);
    x.fillStyle = '#031326'; x.beginPath(); x.moveTo(0, H); for (let px = 0; px <= W; px += 10) x.lineTo(px, H * 0.8 - hash(px * 0.031) * H * 0.06 - Math.sin(px * 0.013) * H * 0.03); x.lineTo(W, H); x.fill();
    x.fillStyle = '#010913'; x.beginPath(); x.moveTo(0, H); for (let px = 0; px <= W; px += 8) x.lineTo(px, H * 0.9 - hash(px * 0.11 + 4) * H * 0.03); x.lineTo(W, H); x.fill();
    for (let i = 0; i < 12; i++) { // tube worms + coral fans
      const bx = hash(i * 9.3) * W, by = H * (0.88 + hash(i * 2.1) * 0.06), h = 18 + hash(i * 4.7) * 46;
      x.strokeStyle = i % 2 ? '#0b2238' : '#14203a'; x.lineWidth = 3 + (i % 3); x.lineCap = 'round';
      x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo(bx + (hash(i) - 0.5) * 20, by - h * 0.6, bx + (hash(i * 3) - 0.5) * 14, by - h); x.stroke();
    }
    x.lineCap = 'butt';
  }), 0, 0, W, H);
  // god rays from the far surface, swaying
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) {
    const x0 = W * (0.15 + k * 0.25) + Math.sin(t * 0.3 + k * 2) * W * 0.05, a = 0.035 + 0.025 * Math.sin(t * 0.5 + k * 1.7);
    ctx.fillStyle = lg(0, H * 0.75, [[0, 'rgba(120,220,255,' + a + ')'], [1, 'rgba(120,220,255,0)']]);
    ctx.beginPath(); ctx.moveTo(x0 - 18, 0); ctx.lineTo(x0 + 18, 0); ctx.lineTo(x0 + 70 + k * 10, H * 0.75); ctx.lineTo(x0 - 40, H * 0.75); ctx.fill();
  }
  ctx.restore();
  // caustic shimmer near the top (simple water animation)
  ctx.strokeStyle = 'rgba(160,230,255,0.12)'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let k = 0; k < 4; k++) { const yy = H * (0.02 + k * 0.035); for (let px = 0; px <= W; px += 12) { const y = yy + Math.sin(px * 0.04 + t * (1.2 + k * 0.3) + k) * 3 + Math.sin(px * 0.11 - t * 2) * 1.2; if (px) ctx.lineTo(px, y); else ctx.moveTo(px, y); } }
  ctx.stroke();
  // glowing coral tips
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 12; i++) { const bx = hash(i * 9.3) * W, by = H * (0.88 + hash(i * 2.1) * 0.06), h = 18 + hash(i * 4.7) * 46, tx = bx + (hash(i * 3) - 0.5) * 14, ty = by - h; glowAt(i % 3 ? 'rgba(80,255,220,1)' : 'rgba(255,90,200,1)', tx, ty, 9, 0.5 + 0.4 * Math.sin(t * 2 + i)); }
  // plankton sparkle
  for (const p of BG.plank) { const a = Math.pow(Math.max(0, Math.sin(t * p.f + p.p)), 6); if (a > 0.05) glowAt('rgba(120,255,240,1)', p.x + Math.sin(t * 0.3 + p.p) * 6, p.y, 5, a * 0.8); }
  ctx.globalCompositeOperation = 'source-over';
  // marine snow
  ctx.fillStyle = 'rgba(210,235,255,0.55)';
  for (const p of BG.snow) { p.y += p.v * dt; p.x += Math.sin(t * 0.6 + p.p) * 4 * dt; if (p.y > H) { p.y = -3; p.x = Math.random() * W; } ctx.fillRect(p.x, p.y, p.s, p.s); }
  // jellyfish: pulsing bells drifting upward, trailing wavy tentacles
  for (const j of BG.jelly) {
    const pulse = Math.sin(t * 2.2 + j.p), k = 0.5 + 0.5 * pulse, r = 16 * j.s;
    j.y -= (j.v * (0.4 + Math.max(0, -pulse))) * dt; j.x += Math.sin(t * 0.4 + j.p) * 6 * dt;
    if (j.y < -60) { j.y = H + 60; j.x = rand(0.05, 0.95) * W; }
    ctx.globalCompositeOperation = 'lighter'; glowAt(j.c.replace('1)', '0.9)'), j.x, j.y, r * 3, 0.35); ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = j.c.replace('1)', '0.45)'); ctx.lineWidth = 1.2; ctx.beginPath();
    for (let q = 0; q < 5; q++) { const tx = j.x - r * 0.7 + q * r * 0.35; ctx.moveTo(tx, j.y); for (let s2 = 1; s2 <= 6; s2++) ctx.lineTo(tx + Math.sin(t * 3 + q + s2 * 0.8) * 3 * j.s, j.y + s2 * 6 * j.s * (1.1 - k * 0.2)); }
    ctx.stroke();
    ctx.fillStyle = j.c.replace('1)', '0.55)'); ctx.beginPath(); ctx.ellipse(j.x, j.y, r * (0.85 + 0.2 * k), r * (0.75 - 0.15 * k), 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(j.x - r * 0.25, j.y - r * 0.35, r * 0.25, r * 0.12, -0.3, 0, 7); ctx.fill();
  }
  // the anglerfish: slow patrol, glowing lure bobbing ahead of a toothy grin
  const an = BG.angler, sp = 22;
  an.x += an.dir * sp * dt; if (an.x > W + 60) an.dir = -1; else if (an.x < -60) an.dir = 1;
  const ay = an.y + Math.sin(t * 0.7) * H * 0.04, s = Math.min(1.4, Math.max(0.9, W / 360));
  ctx.save(); ctx.translate(an.x, ay); ctx.scale(an.dir * s, s);
  const lx = 36 + Math.sin(t * 1.6) * 3, ly = -38 + Math.cos(t * 2.1) * 4;
  ctx.strokeStyle = '#1c3550'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(6, -18); ctx.quadraticCurveTo(24, -50, lx, ly); ctx.stroke();
  ctx.fillStyle = '#0f2236'; ctx.beginPath(); ctx.moveTo(-30, -4); ctx.lineTo(-48, -18); ctx.lineTo(-44, 2); ctx.lineTo(-50, 18); ctx.lineTo(-30, 6); ctx.fill(); // tail
  ctx.fillStyle = '#132a42'; ctx.beginPath(); ctx.ellipse(0, 0, 32, 22, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#0a1a2a'; ctx.beginPath(); ctx.moveTo(4, -20); ctx.lineTo(-6, -30); ctx.lineTo(-14, -19); ctx.fill(); ctx.beginPath(); ctx.moveTo(-6, 18); ctx.lineTo(-14, 28); ctx.lineTo(-20, 16); ctx.fill();
  ctx.fillStyle = '#05080f'; ctx.beginPath(); ctx.moveTo(32, -6); ctx.quadraticCurveTo(14, 4, 32, 14); ctx.lineTo(36, 4); ctx.fill(); // mouth
  ctx.fillStyle = '#e8f4ff'; for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.moveTo(22 + q * 3, -2 + q * 0.5); ctx.lineTo(24 + q * 3, 4); ctx.lineTo(26 + q * 3, -1 + q * 0.5); ctx.fill(); ctx.beginPath(); ctx.moveTo(22 + q * 3, 12 - q * 0.3); ctx.lineTo(24 + q * 3, 6); ctx.lineTo(26 + q * 3, 12 - q * 0.3); ctx.fill(); }
  ctx.fillStyle = '#d8fff4'; ctx.beginPath(); ctx.arc(14, -8, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(15.5, -8, 2.4, 0, 7); ctx.fill();
  ctx.globalCompositeOperation = 'lighter'; const lp = 0.7 + 0.3 * Math.sin(t * 5); glowAt('rgba(140,255,230,1)', lx, ly, 26 + lp * 8, 0.75); glowAt('rgba(255,255,255,1)', lx, ly, 6, 0.9);
  ctx.restore(); ctx.globalCompositeOperation = 'source-over';
  // bubbles rising from vents
  if (BG.abub.length < 14 && Math.random() < dt * 3) BG.abub.push({ x: Math.random() < 0.5 ? cx + rand(-30, 30) : rand(0.05, 0.95) * W, y: H * 0.92, r: rand(1.5, 4), v: rand(25, 50), p: rand(0, 6) });
  ctx.strokeStyle = 'rgba(190,240,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = BG.abub.length - 1; i >= 0; i--) { const b = BG.abub[i]; b.y -= b.v * dt; if (b.y < -10) { BG.abub.splice(i, 1); continue; } const bx = b.x + Math.sin(t * 3 + b.p) * 3; ctx.moveTo(bx + b.r, b.y); ctx.arc(bx, b.y, b.r, 0, 7); }
  ctx.stroke();
}
// ---- 7. CRYSTAL CAVERNS
function crystalPath(x, cx, cy, s, n, seed) { // cluster of hexagonal crystal prisms
  const shards = [];
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.38 + (hash(seed + i) - 0.5) * 0.3, h = s * (26 + hash(seed * 3 + i) * 34) * (i === (n >> 1) ? 1.35 : 1), w = s * (6 + hash(seed * 5 + i) * 6); shards.push([a, h, w]); }
  return shards;
}
function bgCaverns(t) {
  const dt = bgDt(10, t), py = H * 0.9, COLS2 = ['#7df9ff', '#ff7ae0', '#b38bff'];
  ctx.drawImage(lay('cave', W, H, (x) => {
    x.fillStyle = lgx(x, 0, H, [[0, '#0b0620'], [0.4, '#1a0f3a'], [0.8, '#12183a'], [1, '#050814']]); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { const bx = hash(i * 2.3) * W, by = hash(i * 5.9) * H * 0.85, r = 20 + hash(i * 8.1) * 60; x.fillStyle = rgx(x, bx, by, 2, r, [[0, i % 3 ? 'rgba(40,20,80,0.5)' : 'rgba(20,50,90,0.45)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(bx - r, by - r, r * 2, r * 2); }
    // cave walls
    x.fillStyle = '#080416'; x.beginPath(); x.moveTo(0, 0); for (let yy = 0; yy <= H; yy += 20) x.lineTo(14 + hash(yy * 0.37) * 22, yy); x.lineTo(0, H); x.fill();
    x.beginPath(); x.moveTo(W, 0); for (let yy = 0; yy <= H; yy += 20) x.lineTo(W - 14 - hash(yy * 0.53) * 22, yy); x.lineTo(W, H); x.fill();
    // stalactites
    x.fillStyle = '#0a0519'; x.fillRect(0, 0, W, 10);
    for (const st of BG.stal) { x.fillStyle = '#0d0720'; x.beginPath(); x.moveTo(st.x - st.w, 0); x.lineTo(st.x - st.w * 0.3, st.len * 0.6); x.lineTo(st.x, st.len); x.lineTo(st.x + st.w * 0.35, st.len * 0.55); x.lineTo(st.x + st.w, 0); x.fill(); x.fillStyle = 'rgba(125,249,255,0.18)'; x.beginPath(); x.moveTo(st.x - st.w * 0.3, st.len * 0.6); x.lineTo(st.x, st.len); x.lineTo(st.x - st.w * 0.1, st.len * 0.4); x.fill(); }
    // underground pool
    x.fillStyle = lgx(x, py, H, [[0, '#123a5a'], [1, '#04101e']]); x.fillRect(0, py, W, H - py);
    // crystal clusters
    for (const cl of BG.crys) {
      const shards = crystalPath(x, cl.x, cl.y, cl.s, 5, cl.x * 0.01), col = COLS2[cl.c];
      for (const [a, h, w] of shards) {
        x.save(); x.translate(cl.x, cl.y); x.rotate(a + Math.PI / 2);
        x.fillStyle = lgx(x, -h, 0, [[0, '#ffffff'], [0.2, col], [1, 'rgba(20,10,50,0.9)']]);
        x.beginPath(); x.moveTo(-w, 0); x.lineTo(-w, -h * 0.8); x.lineTo(0, -h); x.lineTo(w, -h * 0.8); x.lineTo(w, 0); x.fill();
        x.fillStyle = 'rgba(255,255,255,0.3)'; x.beginPath(); x.moveTo(-w * 0.2, 0); x.lineTo(-w * 0.2, -h * 0.85); x.lineTo(0, -h); x.lineTo(w * 0.15, -h * 0.85); x.lineTo(w * 0.15, 0); x.fill();
        x.restore();
      }
    }
  }), 0, 0, W, H);
  // crystal glow pulse + sparkles
  ctx.globalCompositeOperation = 'lighter';
  BG.crys.forEach((cl, i) => glowAt(['rgba(125,249,255,1)', 'rgba(255,122,224,1)', 'rgba(179,139,255,1)'][cl.c], cl.x, cl.y - 24 * cl.s, 60 * cl.s, 0.22 + 0.14 * Math.sin(t * 1.5 + i * 1.3)));
  for (let i = 0; i < 22; i++) {
    const cl = BG.crys[i % BG.crys.length], a = Math.pow(Math.max(0, Math.sin(t * (1.3 + hash(i) * 2) + i * 2.7)), 12); if (a < 0.05) continue;
    const sx = cl.x + (hash(i * 3.3) - 0.5) * 44 * cl.s, sy = cl.y - hash(i * 7.1) * 60 * cl.s, r = 2 + a * 5;
    ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; ctx.fillRect(sx - r, sy - 0.6, r * 2, 1.2); ctx.fillRect(sx - 0.6, sy - r, 1.2, r * 2);
  }
  for (const m of BG.motes) { m.y -= m.v * dt; m.x += Math.sin(t + m.p) * 5 * dt; if (m.y < -5) { m.y = H + 5; m.x = Math.random() * W; } glowAt('rgba(180,140,255,1)', m.x, m.y, 4, 0.4 + 0.3 * Math.sin(t * 2 + m.p)); }
  ctx.globalCompositeOperation = 'source-over';
  // pool shimmer
  ctx.strokeStyle = 'rgba(140,230,255,0.25)'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let k = 0; k < 3; k++) { const yy = py + 4 + k * (H - py) / 3.5; for (let px = 0; px <= W; px += 12) { const y = yy + Math.sin(px * 0.05 + t * (1 + k * 0.3) + k) * (1 + k * 0.5); if (px) ctx.lineTo(px, y); else ctx.moveTo(px, y); } }
  ctx.stroke();
  // dripping crystals: glowing drops form at stalactite tips, fall, ripple the pool
  for (const d of BG.cdrips) {
    if (d.ph === 'wait') { d.w -= dt; if (d.w <= 0) { d.ph = 'grow'; d.r = 0; } continue; }
    if (d.ph === 'grow') { d.r += dt * 3 / d.gr; if (d.r >= 3) { d.ph = 'fall'; d.y = d.y0 + 3; d.vy = 20; } }
    else { d.vy += 900 * dt; d.y += d.vy * dt; if (d.y >= py) { d.ph = 'wait'; d.w = rand(0.4, 2.5); d.gr = rand(1, 2.6); if (BG.cring.length < 14) BG.cring.push({ x: d.x, t: 0 }); for (let k = 0; k < 4 && BG.csplash.length < 24; k++) BG.csplash.push({ x: d.x, y: py, vx: rand(-40, 40), vy: rand(-150, -70) }); } }
    ctx.globalCompositeOperation = 'lighter'; glowAt('rgba(125,249,255,1)', d.x, d.ph === 'grow' ? d.y0 + d.r : d.y, 9, 0.6); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#d9fbff'; ctx.beginPath(); if (d.ph === 'grow') ctx.arc(d.x, d.y0 + d.r, d.r, 0, 7); else ctx.ellipse(d.x, d.y, 2, 3.4, 0, 0, 7); ctx.fill();
  }
  for (let i = BG.csplash.length - 1; i >= 0; i--) { const sp = BG.csplash[i]; sp.vy += 600 * dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; if (sp.y > py + 2) { BG.csplash.splice(i, 1); continue; } ctx.fillStyle = 'rgba(200,250,255,0.8)'; ctx.fillRect(sp.x - 1, sp.y - 1, 2, 2); }
  for (let i = BG.cring.length - 1; i >= 0; i--) { const r = BG.cring[i]; r.t += dt; const k = r.t / 1.2; if (k >= 1) { BG.cring.splice(i, 1); continue; } ctx.strokeStyle = 'rgba(160,240,255,' + 0.6 * (1 - k) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(r.x, py + 2, 3 + k * 28, 1 + k * 6, 0, 0, 7); ctx.stroke(); }
}
// ---- 8. CLOCKWORK FACTORY
function gearSpr(gg) {
  const R = gg.r + 8, key = 'gear' + gg.i + '_' + Math.round(gg.r);
  return lay(key, R * 2, R * 2, (x) => {
    x.translate(R, R); const n = gg.n, ro = gg.r + 6, ri = gg.r - 2, cols = gg.c ? ['#d9a441', '#8a5a1c'] : ['#c27b3a', '#6e3b16'];
    x.fillStyle = rgx(x, -gg.r * 0.3, -gg.r * 0.3, 2, gg.r * 1.3, [[0, cols[0]], [1, cols[1]]]); x.beginPath();
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, da = Math.PI / n; x.lineTo(Math.cos(a - da * 0.55) * ri, Math.sin(a - da * 0.55) * ri); x.lineTo(Math.cos(a - da * 0.32) * ro, Math.sin(a - da * 0.32) * ro); x.lineTo(Math.cos(a + da * 0.32) * ro, Math.sin(a + da * 0.32) * ro); x.lineTo(Math.cos(a + da * 0.55) * ri, Math.sin(a + da * 0.55) * ri); }
    x.closePath(); x.fill(); x.strokeStyle = 'rgba(30,15,5,0.8)'; x.lineWidth = 1.5; x.stroke();
    x.globalCompositeOperation = 'destination-out';
    const spokes = gg.r > 30 ? 5 : 4; for (let k = 0; k < spokes; k++) { const a = k / spokes * Math.PI * 2; x.beginPath(); x.arc(Math.cos(a + 0.6) * gg.r * 0.55, Math.sin(a + 0.6) * gg.r * 0.55, gg.r * 0.2, 0, 7); x.fill(); }
    x.globalCompositeOperation = 'source-over';
    x.strokeStyle = 'rgba(255,230,170,0.35)'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, gg.r * 0.82, 0, 7); x.stroke();
    x.fillStyle = '#3a2410'; x.beginPath(); x.arc(0, 0, gg.r * 0.2, 0, 7); x.fill(); x.fillStyle = '#e8c27a'; x.beginPath(); x.arc(0, 0, gg.r * 0.09, 0, 7); x.fill();
  });
}
function bgClockwork(t) {
  const dt = bgDt(11, t), fy = H * 0.94;
  ctx.drawImage(lay('clock', W, H, (x) => {
    x.fillStyle = lgx(x, 0, H, [[0, '#24150a'], [0.5, '#3a2412'], [1, '#160c05']]); x.fillRect(0, 0, W, H);
    const pw = 64, ph = 80; // riveted wall panels
    for (let r = 0; r * ph < H; r++) for (let c = 0; c * pw < W; c++) { const hh = hash(r * 7.1 + c * 3.3); x.fillStyle = 'rgba(' + (60 + hh * 30 | 0) + ',' + (38 + hh * 16 | 0) + ',20,0.55)'; x.fillRect(c * pw + 2, r * ph + 2, pw - 4, ph - 4); x.fillStyle = 'rgba(230,190,120,0.35)'; for (const [u, v] of [[6, 6], [pw - 8, 6], [6, ph - 8], [pw - 8, ph - 8]]) { x.beginPath(); x.arc(c * pw + u, r * ph + v, 1.6, 0, 7); x.fill(); } }
    const pipe = (y, d, c1, c2) => { x.fillStyle = lgx(x, y - d / 2, y + d / 2, [[0, c1], [0.45, c2], [1, '#1a0e05']]); x.fillRect(0, y - d / 2, W, d); x.fillStyle = 'rgba(0,0,0,0.4)'; for (let px = 20; px < W; px += 90) x.fillRect(px, y - d / 2 - 2, 7, d + 4); };
    pipe(H * 0.3, 16, '#8a4b20', '#e09a5a'); pipe(H * 0.72, 12, '#6e5a2a', '#c9a94e');
    x.fillStyle = '#120a04'; x.fillRect(0, fy, W, H - fy); x.fillStyle = '#4a3016'; x.fillRect(0, fy - 4, W, 4);
    // pressure gauge
    const gx = W * 0.5, gy = H * 0.42, gr = Math.min(W, H) * 0.06; x.fillStyle = '#c9a94e'; x.beginPath(); x.arc(gx, gy, gr + 4, 0, 7); x.fill(); x.fillStyle = '#f4ecd8'; x.beginPath(); x.arc(gx, gy, gr, 0, 7); x.fill();
    x.strokeStyle = '#3a2410'; x.lineWidth = 1.5; for (let k = 0; k <= 8; k++) { const a = Math.PI * 0.75 + k / 8 * Math.PI * 1.5; x.beginPath(); x.moveTo(gx + Math.cos(a) * gr * 0.75, gy + Math.sin(a) * gr * 0.75); x.lineTo(gx + Math.cos(a) * gr * 0.92, gy + Math.sin(a) * gr * 0.92); x.stroke(); }
    x.fillStyle = 'rgba(200,40,30,0.6)'; x.beginPath(); x.arc(gx, gy, gr * 0.9, Math.PI * 1.95, Math.PI * 2.25); x.arc(gx, gy, gr * 0.75, Math.PI * 2.25, Math.PI * 1.95, true); x.fill();
  }), 0, 0, W, H);
  // gauge needle wobbling
  { const gx = W * 0.5, gy = H * 0.42, gr = Math.min(W, H) * 0.06, a = Math.PI * 0.75 + (0.55 + 0.25 * Math.sin(t * 0.7) + 0.04 * Math.sin(t * 17)) * Math.PI * 1.5;
    ctx.strokeStyle = '#b3201a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(a) * gr * 0.85, gy + Math.sin(a) * gr * 0.85); ctx.stroke(); ctx.fillStyle = '#3a2410'; ctx.beginPath(); ctx.arc(gx, gy, 3, 0, 7); ctx.fill(); }
  // interlocking spinning gears
  for (const gg of BG.gears) { const sp = gearSpr(gg), R = gg.r + 8; ctx.save(); ctx.translate(gg.x, gg.y); ctx.rotate(t * gg.w + (gg.i % 2) * Math.PI / gg.n); ctx.drawImage(sp, -R, -R, R * 2, R * 2); ctx.restore(); }
  // piston pumping
  { const px = W * 0.93, top = H * 0.45, k = 0.5 + 0.5 * Math.sin(t * 3.2), rodY = top + 20 + k * 40;
    ctx.fillStyle = '#5a3a18'; ctx.fillRect(px - 12, top, 24, 22); ctx.fillStyle = '#c9a94e'; ctx.fillRect(px - 4, top + 20, 8, rodY - top - 20); ctx.fillStyle = '#8a5a1c'; ctx.fillRect(px - 14, rodY, 28, 12); }
  // steam vents puffing
  const puff = puffSpr();
  for (const v of BG.vents) { v.next -= dt; if (v.next <= 0) { v.next = rand(1.6, 3.5); for (let k = 0; k < 7 && BG.steam.length < 60; k++) BG.steam.push({ x: v.x + rand(-4, 4), y: v.y, vx: rand(-14, 14), vy: rand(-70, -35), r: rand(6, 12), t: 0, life: rand(1.2, 2.2) }); } }
  for (let i = BG.steam.length - 1; i >= 0; i--) { const p = BG.steam[i]; p.t += dt; if (p.t > p.life) { BG.steam.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= 1 - dt * 0.6; const k = p.t / p.life, r = p.r * (1 + k * 3); ctx.globalAlpha = 0.45 * (1 - k); ctx.drawImage(puff, p.x - r, p.y - r, r * 2, r * 2); }
  ctx.globalAlpha = 1;
  // rotating warning beacon
  { const bx = W * 0.96, by = H * 0.06, a = t * 4; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(bx, by); ctx.fillStyle = 'rgba(255,150,40,0.12)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, W * 0.5, a, a + 0.35); ctx.fill(); ctx.restore(); ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.arc(bx, by, 6, 0, 7); ctx.fill(); }
  // factory-floor conveyor with crates
  ctx.fillStyle = '#2a2a2e'; ctx.fillRect(0, fy + 4, W, 10); ctx.fillStyle = '#5a5a60'; const off = (t * 40) % 16; for (let px = -16 + off; px < W; px += 16) ctx.fillRect(px, fy + 5, 8, 2);
  for (const c of BG.crates) { c.x += 40 * dt; if (c.x > W + 40) c.x = -40; const s = 22 * c.s; ctx.fillStyle = ['#8a5a2b', '#6b4a8a', '#3a6a5a'][c.c]; ctx.fillRect(c.x, fy + 4 - s, s, s); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(c.x, fy + 4 - s, s, s); ctx.beginPath(); ctx.moveTo(c.x, fy + 4 - s); ctx.lineTo(c.x + s, fy + 4); ctx.stroke(); }
}
// ---- 9. HAUNTED FOREST
function twistedTree(x, bx, by, h, w, seed, col) {
  const br = (sx, sy, len, ang, wd, d) => {
    const ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len, mx = (sx + ex) / 2 + Math.cos(ang + 1.57) * len * 0.25 * (hash(seed + d * 3.1 + sx) - 0.5) * 2, my = (sy + ey) / 2 + Math.sin(ang + 1.57) * len * 0.25;
    x.strokeStyle = col; x.lineWidth = wd; x.lineCap = 'round'; x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo(mx, my, ex, ey); x.stroke();
    if (d <= 0 || wd < 1) return;
    const n = 2 + (hash(seed + sx * 0.1 + d) > 0.6 ? 1 : 0);
    for (let k = 0; k < n; k++) br(ex, ey, len * (0.6 + hash(seed + k + d * 7 + ex) * 0.25), ang + (k - (n - 1) / 2) * 0.75 + (hash(seed * 2 + k + ey) - 0.5) * 0.5, wd * 0.62, d - 1);
  };
  x.fillStyle = col; x.beginPath(); x.moveTo(bx - w * 1.6, by); x.quadraticCurveTo(bx - w * 0.4, by - h * 0.2, bx - w * 0.5, by - h * 0.5); x.lineTo(bx + w * 0.5, by - h * 0.5); x.quadraticCurveTo(bx + w * 0.4, by - h * 0.2, bx + w * 1.6, by); x.fill();
  br(bx, by - h * 0.45, h * 0.35, -Math.PI / 2 + (hash(seed) - 0.5) * 0.4, w, 4);
  x.fillStyle = 'rgba(0,0,0,0.9)'; x.beginPath(); x.ellipse(bx, by - h * 0.3, w * 0.25, w * 0.4, 0, 0, 7); x.fill(); // hollow
}
function bgHaunted(t) {
  const dt = bgDt(12, t), hz = H * 0.62, cx = colX();
  ctx.drawImage(lay('haunt', W, H, (x) => {
    x.fillStyle = lgx(x, 0, hz, [[0, '#07030f'], [0.6, '#1c0f30'], [1, '#2e1d3c']]); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.2 + hash(i * 3) * 0.5) + ')'; x.fillRect(hash(i * 1.7) * W, hash(i * 4.3) * hz * 0.7, 1.2, 1.2); }
    const mx = W * 0.72, my = H * 0.13, mr = Math.min(W, H) * 0.1;
    x.fillStyle = rgx(x, mx, my, mr, mr * 3.5, [[0, 'rgba(220,255,200,0.35)'], [1, 'rgba(220,255,200,0)']]); x.fillRect(0, 0, W, hz);
    x.fillStyle = rgx(x, mx - mr * 0.3, my - mr * 0.3, 2, mr * 1.2, [[0, '#fbffe6'], [1, '#c8d9a0']]); x.beginPath(); x.arc(mx, my, mr, 0, 7); x.fill();
    x.fillStyle = 'rgba(120,140,90,0.3)'; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(mx + (hash(i * 2) - 0.5) * mr * 1.2, my + (hash(i * 5) - 0.5) * mr * 1.2, mr * (0.1 + hash(i) * 0.12), 0, 7); x.fill(); }
    // distant hill with the vampire's tomb (where the path leads)
    x.fillStyle = '#140b20'; x.beginPath(); x.moveTo(0, hz); x.quadraticCurveTo(W * 0.3, hz - H * 0.05, W * 0.55, hz - H * 0.09); x.quadraticCurveTo(W * 0.8, hz - H * 0.06, W, hz - H * 0.02); x.lineTo(W, H); x.lineTo(0, H); x.fill();
    const tx = W * 0.55, ty = hz - H * 0.09; x.fillStyle = '#0a0512'; x.fillRect(tx - 16, ty - 22, 32, 22); x.beginPath(); x.moveTo(tx - 20, ty - 22); x.lineTo(tx, ty - 36); x.lineTo(tx + 20, ty - 22); x.fill(); x.fillRect(tx - 1.5, ty - 46, 3, 12); x.fillRect(tx - 6, ty - 42, 12, 3);
    x.fillStyle = '#0d0716'; x.beginPath(); x.moveTo(0, H); x.lineTo(0, hz + H * 0.05); x.quadraticCurveTo(W * 0.5, hz + H * 0.02, W, hz + H * 0.06); x.lineTo(W, H); x.fill();
    // winding path to the tomb
    x.fillStyle = 'rgba(80,70,90,0.45)'; x.beginPath(); x.moveTo(W * 0.38, H); x.quadraticCurveTo(W * 0.62, H * 0.8, W * 0.46, hz + H * 0.04); x.quadraticCurveTo(W * 0.52, hz - H * 0.04, tx - 2, ty); x.lineTo(tx + 2, ty); x.quadraticCurveTo(W * 0.56, hz - H * 0.03, W * 0.5, hz + H * 0.04); x.quadraticCurveTo(W * 0.7, H * 0.8, W * 0.6, H); x.fill();
    // gravestones
    [[0.12, 0.86, 1], [0.3, 0.8, 0.8], [0.78, 0.84, 0.9], [0.9, 0.9, 1.1]].forEach(([gx, gy, s]) => { x.fillStyle = '#211a2c'; const w = 14 * s, h = 22 * s; x.beginPath(); x.moveTo(gx * W - w / 2, gy * H); x.lineTo(gx * W - w / 2, gy * H - h + w / 2); x.arc(gx * W, gy * H - h + w / 2, w / 2, Math.PI, 0); x.lineTo(gx * W + w / 2, gy * H); x.fill(); x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(gx * W - 1, gy * H - h * 0.7, 2, h * 0.4); });
    // twisted trees framing the scene
    twistedTree(x, W * 0.08, H * 0.98, H * 0.75, 16, 1.3, '#050208');
    twistedTree(x, W * 0.36, H * 0.86, H * 0.4, 8, 4.2, '#0b0612');
    twistedTree(x, W * 0.9, H * 0.97, H * 0.7, 15, 7.7, '#050208');
    twistedTree(x, cx - 6, H * 0.84, H * 0.3, 6, 2.9, '#0d0716');
  }), 0, 0, W, H);
  // tomb window flicker far away
  { const tx = W * 0.55, ty = H * 0.62 - H * 0.09, f = hash(Math.floor(t * 9)) < 0.2 ? 0.3 : 0.9; ctx.globalCompositeOperation = 'lighter'; glowAt('rgba(255,60,80,1)', tx, ty - 11, 12, f * 0.6); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(255,90,90,' + f + ')'; ctx.fillRect(tx - 3, ty - 14, 6, 7); }
  // a bat crossing the moon now and then
  const hb = BG.hbat; hb.t -= dt;
  if (!hb.on && hb.t <= 0) { hb.on = true; hb.x = -20; hb.y = H * rand(0.08, 0.2); hb.v = rand(80, 130); }
  if (hb.on) { hb.x += hb.v * dt; const fl = 0.5 + 0.5 * Math.sin(t * 16); ctx.save(); ctx.translate(hb.x, hb.y + Math.sin(t * 5) * 6); batPath(ctx, 10, fl); ctx.fillStyle = '#05020a'; ctx.fill(); ctx.restore(); if (hb.x > W + 30) { hb.on = false; hb.t = rand(5, 10); } }
  // drifting fog banks (two layers, opposite speeds)
  const fog = lay('fogband', W * 2, H * 0.3, (x) => { for (let i = 0; i < 26; i++) { const fx = hash(i * 1.9) * W * 2, fy = H * 0.15 + (hash(i * 3.7) - 0.5) * H * 0.16, r = 40 + hash(i * 5.3) * 70; x.fillStyle = rgx(x, fx, fy, 2, r, [[0, 'rgba(190,210,200,0.32)'], [1, 'rgba(190,210,200,0)']]); x.fillRect(fx - r, fy - r, r * 2, r * 2); } });
  for (const [yy, sp, a] of [[H * 0.56, 14, 0.7], [H * 0.76, -22, 0.9]]) { const o = ((t * sp) % (W * 2) + W * 2) % (W * 2); ctx.globalAlpha = a; ctx.drawImage(fog, o - W * 2, yy - H * 0.15, W * 2, H * 0.3); ctx.drawImage(fog, o, yy - H * 0.15, W * 2, H * 0.3); }
  ctx.globalAlpha = 1;
  // will-o-wisps
  ctx.globalCompositeOperation = 'lighter';
  for (const w of BG.wisps) { w.x += Math.sin(t * 0.5 + w.p) * w.v * dt; w.y += Math.cos(t * 0.7 + w.p) * w.v * 0.6 * dt; glowAt('rgba(157,255,106,1)', w.x, w.y, 7, 0.35 + 0.35 * Math.sin(t * 3 + w.p)); }
  // glowing eyes in the dark, blinking (and sometimes vanishing to reappear elsewhere)
  for (const e of BG.eyes) {
    e.next -= dt; if (e.next <= 0) { if (Math.random() < 0.2) e.on = !e.on; else e.blink = 0.18; e.next = rand(1.5, 4.5); }
    if (e.blink > 0) e.blink -= dt;
    if (!e.on) continue;
    const lid = e.blink > 0 ? Math.sin((e.blink / 0.18) * Math.PI) : 0, col = ['rgba(255,220,60,1)', 'rgba(255,60,60,1)', 'rgba(150,255,90,1)'][e.c], s = e.s, look = Math.sin(t * 0.6 + e.x) * 1.2;
    for (const dx of [-5 * s, 5 * s]) { glowAt(col, e.x + dx, e.y, 8 * s, 0.45 * (1 - lid)); ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(e.x + dx + look, e.y, 2.6 * s, Math.max(0.2, 2 * s * (1 - lid)), 0, 0, 7); ctx.fill(); }
  }
  ctx.globalCompositeOperation = 'source-over';
}
// ---- 10. VAMPIRE'S TOMB (final boss)
function bgTomb(t) {
  const dt = bgDt(13, t), gy = H * 0.84, S = BG.tomb, mx = W * 0.5, mw = Math.min(W * 0.36, 170);
  ctx.drawImage(lay('tomb', W, H, (x) => {
    x.fillStyle = lgx(x, 0, gy, [[0, '#0c0108'], [0.5, '#3a0718'], [1, '#5a1020']]); x.fillRect(0, 0, W, H);
    const bx = W * 0.25, by = H * 0.14, br = Math.min(W, H) * 0.13; // blood moon
    x.fillStyle = rgx(x, bx, by, br, br * 3.2, [[0, 'rgba(255,60,60,0.4)'], [1, 'rgba(255,60,60,0)']]); x.fillRect(0, 0, W, gy);
    x.fillStyle = rgx(x, bx - br * 0.3, by - br * 0.3, 2, br * 1.2, [[0, '#ffb39a'], [1, '#c22a2a']]); x.beginPath(); x.arc(bx, by, br, 0, 7); x.fill();
    x.fillStyle = 'rgba(90,0,10,0.3)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(bx + (hash(i * 4) - 0.5) * br * 1.2, by + (hash(i * 9) - 0.5) * br * 1.2, br * (0.08 + hash(i * 2) * 0.12), 0, 7); x.fill(); }
    // mausoleum
    const top = gy - H * 0.32;
    x.fillStyle = '#1a0c14'; x.fillRect(mx - mw * 0.55, gy - 10, mw * 1.1, 10); x.fillRect(mx - mw * 0.5, gy - 18, mw, 8);
    x.fillStyle = '#251420'; x.fillRect(mx - mw * 0.45, top + H * 0.06, mw * 0.9, gy - 18 - top - H * 0.06);
    x.fillStyle = '#2e1828'; x.beginPath(); x.moveTo(mx - mw * 0.55, top + H * 0.065); x.lineTo(mx, top - H * 0.02); x.lineTo(mx + mw * 0.55, top + H * 0.065); x.fill();
    x.fillStyle = '#3a2232'; for (let k = 0; k < 4; k++) { const px = mx - mw * 0.4 + k * mw * 0.8 / 3; x.fillRect(px - 5, top + H * 0.07, 10, gy - 18 - top - H * 0.07); }
    x.fillStyle = '#050104'; x.beginPath(); x.moveTo(mx - mw * 0.16, gy - 18); x.lineTo(mx - mw * 0.16, top + H * 0.14); x.arc(mx, top + H * 0.14, mw * 0.16, Math.PI, 0); x.lineTo(mx + mw * 0.16, gy - 18); x.fill();
    x.save(); x.translate(mx, top + H * 0.03); batPath(x, mw * 0.12, 0.5); x.fillStyle = '#120610'; x.fill(); x.restore();
    x.fillStyle = '#5a3a1a'; x.save(); x.translate(mx + mw * 0.62, gy - 4); x.rotate(-0.1); x.beginPath(); x.moveTo(-10, 0); x.lineTo(-14, -30); x.lineTo(-6, -42); x.lineTo(6, -42); x.lineTo(14, -30); x.lineTo(10, 0); x.fill(); x.restore(); // coffin lid leaning
    // ground, iron fence, graves
    x.fillStyle = '#12060c'; x.beginPath(); x.moveTo(0, H); x.lineTo(0, gy); for (let px = 0; px <= W; px += 14) x.lineTo(px, gy - hash(px * 0.21) * 5); x.lineTo(W, H); x.fill();
    x.strokeStyle = '#08030a'; x.lineWidth = 2.5; x.fillStyle = '#08030a';
    for (let px = 4; px < W; px += 13) { if (Math.abs(px - mx) < mw * 0.6) continue; x.beginPath(); x.moveTo(px, gy + 6); x.lineTo(px, gy - 26); x.stroke(); x.beginPath(); x.moveTo(px - 3, gy - 24); x.lineTo(px, gy - 32); x.lineTo(px + 3, gy - 24); x.fill(); }
    x.fillRect(0, gy - 20, mx - mw * 0.6, 2.5); x.fillRect(mx + mw * 0.6, gy - 20, W, 2.5);
    // corner cobwebs
    for (const [ox, sx] of [[0, 1], [W, -1]]) { x.strokeStyle = 'rgba(220,220,235,0.35)'; x.lineWidth = 1; const R = Math.min(W, H) * 0.22; x.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI / 2; x.moveTo(ox, 0); x.lineTo(ox + sx * Math.cos(a) * R, Math.sin(a) * R); } for (const f of [0.3, 0.55, 0.8]) { for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI / 2, a0 = (k - 1) / 6 * Math.PI / 2, px = ox + sx * Math.cos(a) * R * f, py = Math.sin(a) * R * f; if (!k) x.moveTo(px, py); else x.quadraticCurveTo(ox + sx * Math.cos((a + a0) / 2) * R * f * 0.85, Math.sin((a + a0) / 2) * R * f * 0.85, px, py); } } x.stroke(); }
  }), 0, 0, W, H);
  // drifting storm clouds
  const cl = lay('tcloud', W * 2, H * 0.28, (x) => { for (let i = 0; i < 34; i++) { const cx2 = hash(i * 2.7) * W * 2, cy2 = hash(i * 6.1) * H * 0.2, r = 24 + hash(i * 3.9) * 50; x.fillStyle = rgx(x, cx2, cy2, 2, r, [[0, 'rgba(20,0,10,0.6)'], [1, 'rgba(20,0,10,0)']]); x.fillRect(cx2 - r, cy2 - r, r * 2, r * 2); } });
  const co = (t * 25) % (W * 2); ctx.drawImage(cl, co - W * 2, 0, W * 2, H * 0.28); ctx.drawImage(cl, co, 0, W * 2, H * 0.28);
  // lightning (moderate flash) with thunder during play
  if (t >= S.next) { S.bolt = makeBolt(); S.age = 0; S.flashes++; S.next = t + rand(4, 9); if (state === 'play' && sfx.thunder(rand(0.3, 1.1))) S.thunders++; if (state === 'play') flashA = Math.max(flashA, 0.1); }
  S.age += dt;
  const la = S.age < 0.07 ? 1 : S.age < 0.13 ? 0.25 : S.age < 0.22 ? 0.85 : Math.max(0, 0.7 - (S.age - 0.22) * 2);
  if (la > 0 && S.bolt) {
    ctx.fillStyle = 'rgba(255,200,220,' + (la * 0.28) + ')'; ctx.fillRect(0, 0, W, H); ctx.lineJoin = 'round';
    S.bolt.forEach((pts, bi) => { for (const [lw, col] of [[bi ? 4 : 8, 'rgba(255,120,160,' + (la * 0.35) + ')'], [bi ? 1.2 : 2.4, 'rgba(255,255,255,' + la + ')']]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke(); } });
  }
  // glowing eyes inside the tomb doorway + candle flicker on the steps
  const top = gy - H * 0.32, blink = (t % 4.3) < 0.15;
  ctx.globalCompositeOperation = 'lighter';
  if (!blink) for (const dx of [-7, 7]) { glowAt('rgba(255,30,60,1)', mx + dx, top + H * 0.17, 10, 0.7); }
  for (const [px, ph] of [[mx - mw * 0.42, 0], [mx + mw * 0.42, 2]]) glowAt('rgba(255,170,60,1)', px, gy - 26, 14 + Math.sin(t * 13 + ph) * 3, 0.55 + 0.2 * Math.sin(t * 17 + ph));
  ctx.globalCompositeOperation = 'source-over';
  if (!blink) { ctx.fillStyle = '#ff2a4a'; for (const dx of [-7, 7]) { ctx.beginPath(); ctx.ellipse(mx + dx, top + H * 0.17, 2.6, 1.6, dx < 0 ? 0.3 : -0.3, 0, 7); ctx.fill(); } }
  for (const [px, ph] of [[mx - mw * 0.42, 0], [mx + mw * 0.42, 2]]) { ctx.fillStyle = '#e8e0c8'; ctx.fillRect(px - 2.5, gy - 24, 5, 10); ctx.fillStyle = '#ffcc55'; ctx.beginPath(); ctx.ellipse(px + Math.sin(t * 11 + ph), gy - 28, 2, 4 + Math.sin(t * 15 + ph), 0, 0, 7); ctx.fill(); }
  // jack-o'-lanterns flickering on the ground
  [[W * 0.12, 0], [W * 0.84, 1.3], [colX(), 2.1]].forEach(([px, ph]) => {
    const py2 = gy + 18, f = 0.7 + 0.3 * Math.sin(t * 12 + ph) * Math.sin(t * 7.3 + ph * 2);
    ctx.globalCompositeOperation = 'lighter'; glowAt('rgba(255,140,30,1)', px, py2, 28, 0.35 * f); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#d9631c'; ctx.beginPath(); ctx.ellipse(px, py2, 14, 11, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#3a6a1a'; ctx.fillRect(px - 1.5, py2 - 15, 3, 5);
    ctx.fillStyle = 'rgba(255,' + (200 + 55 * f | 0) + ',80,' + f + ')'; ctx.beginPath(); ctx.moveTo(px - 8, py2 - 3); ctx.lineTo(px - 4, py2 - 7); ctx.lineTo(px - 2, py2 - 2); ctx.moveTo(px + 8, py2 - 3); ctx.lineTo(px + 4, py2 - 7); ctx.lineTo(px + 2, py2 - 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px - 8, py2 + 2); for (let k = 0; k <= 4; k++) ctx.lineTo(px - 8 + k * 4, py2 + (k % 2 ? 7 : 3)); ctx.lineTo(px + 8, py2 + 2); ctx.closePath(); ctx.fill();
  });
  // bats flapping across the sky
  for (const b of BG.tbats) {
    b.x += b.v * dt; if (b.v > 0 && b.x > W + 30) { b.x = -30; b.y = rand(0.06, 0.45) * H; } if (b.v < 0 && b.x < -30) { b.x = W + 30; b.y = rand(0.06, 0.45) * H; }
    const fl = 0.5 + 0.5 * Math.sin(t * 15 + b.p); ctx.save(); ctx.translate(b.x, b.y + Math.sin(t * 3 + b.p) * 8); ctx.scale(Math.sign(b.v), 1); batPath(ctx, 11 * b.s, fl); ctx.fillStyle = '#070206'; ctx.fill(); ctx.restore();
  }
  // spiders dangling on silk threads, bobbing and wiggling their legs
  for (const sp of BG.spiders) {
    const y = sp.len * (0.75 + 0.25 * Math.sin(t * 0.9 + sp.p)), s = sp.s, wig = Math.sin(t * 9 + sp.p) * 0.25;
    ctx.strokeStyle = 'rgba(230,230,240,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sp.x, 0); ctx.lineTo(sp.x, y); ctx.stroke();
    ctx.strokeStyle = '#0a0508'; ctx.lineWidth = 1.6 * s;
    for (const side of [-1, 1]) for (let k = 0; k < 4; k++) { const a = (k - 1.5) * 0.45 + (k % 2 ? wig : -wig); ctx.beginPath(); ctx.moveTo(sp.x, y + 4 * s); ctx.quadraticCurveTo(sp.x + side * 9 * s, y + (a * 12 - 6) * s, sp.x + side * 13 * s, y + (a * 14 + 6) * s); ctx.stroke(); }
    ctx.fillStyle = '#0a0508'; ctx.beginPath(); ctx.ellipse(sp.x, y + 7 * s, 6 * s, 7 * s, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(sp.x, y + 1 * s, 4 * s, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff3355'; ctx.fillRect(sp.x - 2.4 * s, y, 1.6 * s, 1.6 * s); ctx.fillRect(sp.x + 0.8 * s, y, 1.6 * s, 1.6 * s);
  }
  // low crimson ground mist
  const mist = lay('tmist', W * 2, H * 0.2, (x) => { for (let i = 0; i < 22; i++) { const fx = hash(i * 2.2) * W * 2, fy = H * 0.1 + (hash(i * 4.4) - 0.5) * H * 0.08, r = 30 + hash(i * 6.6) * 50; x.fillStyle = rgx(x, fx, fy, 2, r, [[0, 'rgba(160,40,70,0.3)'], [1, 'rgba(160,40,70,0)']]); x.fillRect(fx - r, fy - r, r * 2, r * 2); } });
  const mo = (t * 18) % (W * 2); ctx.drawImage(mist, mo - W * 2, gy - H * 0.1, W * 2, H * 0.2); ctx.drawImage(mist, mo, gy - H * 0.1, W * 2, H * 0.2);
}
// ---- title screen: neon synthwave city
function bgNeon(t) {
  ctx.fillStyle = cache.neon; ctx.fillRect(0, 0, W, H);
  const hz = H * 0.62, R = Math.min(W, H) * 0.24;
  ctx.fillStyle = cache.sun; ctx.beginPath(); ctx.arc(W / 2, hz, R, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#3a0b5e';
  for (let k = 0; k < 6; k++) { const y = hz - R * 0.12 - k * R * 0.14; ctx.fillRect(W / 2 - R, y, R * 2, 2 + k * 0.6); }
  const cols = ['#24073f', '#120226'];
  for (let l = 0; l < 2; l++) {
    const arr = BG.bld[l], off = (t * (l ? 22 : 10)) % arr.total;
    ctx.fillStyle = cols[l];
    for (const b of arr) { let x = b.x - off; if (x + b.w < 0) x += arr.total; if (x > W) continue; ctx.fillRect(x, hz - b.h, b.w, b.h); }
    if (l === 1) {
      ctx.fillStyle = 'rgba(255,230,109,0.55)';
      for (const b of arr) {
        let x = b.x - off; if (x + b.w < 0) x += arr.total; if (x > W) continue;
        for (let wy = hz - b.h + 8; wy < hz - 8; wy += 14) for (let wx = 6; wx < b.w - 6; wx += 12)
          if (hash(b.x + wx * 3 + wy) > 0.72) ctx.fillRect(x + wx, wy, 4, 6);
      }
    }
  }
  ctx.fillStyle = '#0d0221'; ctx.fillRect(0, hz, W, H - hz);
  ctx.strokeStyle = 'rgba(255,43,214,0.75)'; ctx.lineWidth = 1.5; ctx.beginPath();
  const ph = (t * 0.7) % 1;
  for (let k = 0; k < 12; k++) { const f = (k + ph) / 12, y = hz + (H - hz) * f * f; ctx.moveTo(0, y); ctx.lineTo(W, y); }
  for (let k = -10; k <= 10; k++) { ctx.moveTo(W / 2 + k * W * 0.02, hz); ctx.lineTo(W / 2 + k * W * 0.3, H); }
  ctx.stroke();
}
const BGS = [bgTropical, bgSewer, bgMetro, bgStorm, bgHole, bgNeon, bgCandy, bgArcade, bgDesert, bgAbyss, bgCaverns, bgClockwork, bgHaunted, bgTomb];
let bgCur = 5, bgPrev = 5, bgFade = 0;
function drawBG(t) {
  if (bgFade > 0) { BGS[bgPrev](t); ctx.globalAlpha = 1 - bgFade; BGS[bgCur](t); ctx.globalAlpha = 1; }
  else BGS[bgCur](t);
}
function setBG(i) { if (i === bgCur) return; bgPrev = bgCur; bgCur = i; bgFade = 1; }
// ---------------------------------------------------------------- effects
const P = [], MAXP = 700, FT = [], BURSTS = [], RINGS = [], TRAILS = [], TUMBLE = [];
let shakeT = 0, shakeD = 1, shakeM = 0, flashA = 0, banner = null;
function part(x, y, vx, vy, life, size, color, grav, type) {
  if (P.length >= MAXP) return;
  P.push({ x, y, vx, vy, life, max: life, size, color, grav, type: type || 0, rot: rand(0, 6), vr: rand(-10, 10) });
}
function shake(d, m) { const cur = shakeT > 0 ? shakeM * (shakeT / shakeD) : 0; if (m >= cur) { shakeT = d; shakeD = d; shakeM = m; } }
function floatText(s, x, y, color, size, d) { FT.push({ s, x, y, color, size, t: 0, d: d || 1.1 }); }
function burst(x, y) {
  BURSTS.push({ x, y, t: 0, text: ['POW!', 'BAM!', 'WHAM!', 'BONK!', 'KAPOW!', 'THWACK!'][Math.random() * 6 | 0], rot: rand(-0.3, 0.3), r: Math.min(70, W * 0.16) });
  for (let i = 0; i < 14; i++) { const a = rand(0, 6.28), v = rand(150, 420); part(x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.3, 0.6), rand(3, 7), ['#ffe23d', '#ff2bd6', '#2bf0ff', '#fff'][i % 4], 600, 0); }
}
function showBanner(title, sub, color, twist) { banner = { title, sub, color: color || '#fff', twist: twist || null, t: 0, d: twist ? 3.4 : 2.2 }; }
function coinBurst(x, y, n) {
  for (let i = 0; i < n; i++) { const a = rand(-Math.PI, 0), v = rand(140, 420); part(x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.7, 1.2), rand(4, 6.5), '#ffd23d', 700, i % 4 === 3 ? 4 : 3); }
  for (let i = 0; i < 6; i++) part(x + rand(-20, 20), y + rand(-10, 10), 0, -30, 0.4, 3, '#fff8c4', 0, 1);
}
const cx0 = () => L.bx + L.cell * 5, cy0 = () => L.by + L.cell * 10;
function confetti(n) { for (let i = 0; i < n; i++) part(rand(0, W), rand(-40, -5), rand(-60, 60), rand(60, 200), rand(2, 3.5), rand(5, 9), COLORS[i % 7], 120, 2); }
function updateFX(dt) {
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i]; p.life -= dt;
    if (p.life <= 0) { P[i] = P[P.length - 1]; P.pop(); continue; }
    p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if (p.type === 2) p.vx = Math.sin(p.life * 4 + p.rot) * 60;
  }
  for (let i = FT.length - 1; i >= 0; i--) { const f = FT[i]; f.t += dt; f.y -= 40 * dt; if (f.t >= f.d) FT.splice(i, 1); }
  for (let i = BURSTS.length - 1; i >= 0; i--) { BURSTS[i].t += dt; if (BURSTS[i].t > 0.55) BURSTS.splice(i, 1); }
  for (let i = RINGS.length - 1; i >= 0; i--) { RINGS[i].t += dt; if (RINGS[i].t > 0.6) RINGS.splice(i, 1); }
  for (let i = TRAILS.length - 1; i >= 0; i--) { TRAILS[i].t += dt; if (TRAILS[i].t > 0.25) TRAILS.splice(i, 1); }
  for (const b of TUMBLE) { b.vy += 1500 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt; }
  if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
  if (flashA > 0) flashA = Math.max(0, flashA - dt * 2.5);
  if (bgFade > 0) bgFade = Math.max(0, bgFade - dt);
  if (banner) { banner.t += dt; if (banner.t >= banner.d) banner = null; }
}
function drawFX() {
  for (const tr of TRAILS) {
    ctx.fillStyle = tr.color; ctx.globalAlpha = 0.35 * (1 - tr.t / 0.25);
    ctx.fillRect(tr.x + tr.w * 0.2, tr.y1, tr.w * 0.6, tr.y2 - tr.y1);
  }
  ctx.globalAlpha = 1;
  for (const b of TUMBLE) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); drawBlock(b.c, -b.s / 2, -b.s / 2, b.s); ctx.restore(); }
  for (const p of P) {
    const a = Math.min(1, p.life / p.max * 1.5);
    ctx.globalAlpha = a; ctx.fillStyle = p.color;
    if (p.type === 1) { ctx.globalCompositeOperation = 'lighter'; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3 + Math.abs(p.vy) * 0.02); ctx.globalCompositeOperation = 'source-over'; }
    else if (p.type === 3) { // gold coin, spinning
      const sx = Math.abs(Math.cos(p.rot)) * p.size; ctx.fillStyle = '#ffd23d'; ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(1, sx), p.size, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.2; ctx.stroke(); if (sx > p.size * 0.5) { ctx.fillStyle = '#b8860b'; ctx.fillRect(p.x - 0.8, p.y - p.size * 0.55, 1.6, p.size * 1.1); }
    } else if (p.type === 4) { // green cash bill
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = '#2fbf5a'; ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size); ctx.fillStyle = '#c8ffd4'; ctx.fillRect(-p.size * 0.3, -p.size * 0.3, p.size * 0.6, p.size * 0.6); ctx.restore();
    } else if (p.type === 2) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); }
    else { const s = p.size * (0.4 + 0.6 * a); ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
  }
  ctx.globalAlpha = 1;
  for (const r of RINGS) {
    if (r.t < 0) continue;
    const k = r.t / 0.6; ctx.strokeStyle = r.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 8 * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(1, r.r * easeOutBack(Math.min(1, k * 1.2))), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const f of FT) {
    const k = f.t / f.d, sc = k < 0.15 ? easeOutBack(k / 0.15) : 1;
    ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    ctx.save(); ctx.translate(f.x, f.y); ctx.scale(sc, sc); ctx.rotate(Math.sin(f.t * 10) * 0.05);
    txt(f.s, 0, 0, f.size, f.color, '#1a0530', 'center', FONT); ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawBursts() {
  for (const b of BURSTS) {
    const k = b.t / 0.55, sc = k < 0.25 ? easeOutBack(k / 0.25) : 1 + (k - 0.25) * 0.2;
    ctx.save(); ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1; ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.scale(sc, sc);
    ctx.beginPath(); const n = 11;
    for (let i = 0; i < n * 2; i++) { const r = i % 2 ? b.r * 0.55 : b.r * (0.85 + ((i * 37) % 10) / 35), an = i / (n * 2) * Math.PI * 2; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
    ctx.closePath(); ctx.fillStyle = '#ffe23d'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#e8173a'; ctx.stroke();
    fitTxt(b.text, 0, 2, b.r * 0.45, b.r * 1.3, '#e8173a', '#ffffff');
    ctx.restore();
  }
}

// ---------------------------------------------------------------- game logic (color-match rules)
const RAINBOW = 9, VINE = 10, LAVA = 11, FLASH = 12, BOMB = 13, WEB = 14;
// stage 6-10 cell codes: DIM + c (deep sea, not matchable until lit), ICE + c (frozen), ICE2 + c (cracked), icon-only codes
const DIM = 20, ICE = 30, ICE2 = 40, GEAR_I = 50, FOG_I = 51, BAT_I = 52;
const isDim = (v) => v > DIM && v <= DIM + 5, isIce = (v) => v > ICE && v <= ICE + 5, isIce2 = (v) => v > ICE2 && v <= ICE2 + 5;
const CONV_ROW = 19; // clockwork conveyor: 3rd row from the bottom
const BOSS_HP = 340, WIN_BONUS = 25000;
const PAL = [null, '#3D8BFF', '#FFD23F', '#FF4FA3', '#2EE6A6', '#FF8A1F'];
const PAL_NAMES = [null, 'blue circle', 'yellow triangle', 'pink diamond', 'teal plus', 'orange star'];
const STAGE_POPS = 150, LEVEL_POPS = 50, POP_T = 0.34;
const TWISTS = [
  { text: 'Match 4+ touching blocks of one color!', icon: 1 },
  { text: 'Rainbow blocks match ANY color!', icon: RAINBOW },
  { text: 'Steel girders only break when a match pops next to them!', icon: VINE },
  { text: 'Storm rock surges up from below! Pop next to it to smash it!', icon: LAVA },
  { text: 'Gravity distortion! Space warps and blocks swap colors!', icon: 3 },
  { text: 'Dim blocks only light up when a match pops next to them!', icon: DIM + 1 },
  { text: 'Frozen blocks need TWO matches next to them to shatter!', icon: ICE + 2 },
  { text: 'The conveyor row slides every few seconds! Watch the arrows!', icon: GEAR_I },
  { text: 'Spooky fog drifts in and hides some blocks for a moment!', icon: FOG_I },
  { text: 'FINAL BOSS! Pop matches to drain the vampire\'s health!', icon: BAT_I },
];
const cellColor = (v) => (v >= 1 && v <= 5 ? PAL[v] : isDim(v) ? PAL[v - DIM] : isIce(v) || isIce2(v) ? '#cdf6ff' : v === WEB ? '#d8d8ea' : v === RAINBOW ? '#ffffff' : v === VINE ? '#b0bec5' : v === LAVA ? '#7cf7ff' : v === BOMB ? '#ff4050' : '#ffffff');
const spr = (v) => (v >= 1 && v <= 5 ? v - 1 : isDim(v) ? 9 + v - DIM : isIce(v) ? 14 + v - ICE : isIce2(v) ? 19 + v - ICE2 : v === WEB ? 25 : v === GEAR_I ? 26 : v === FOG_I ? 27 : v === BAT_I ? 28
  : v === RAINBOW ? 5 : v === VINE ? 6 : v === LAVA ? 7 : v === BOMB ? 9 : 8);
const g = { board: [], queue: [], score: 0, disp: 0, popped: 0, level: 1, stage: 0, pop: 0, time: 0, anim: new Float32Array(ROWS * COLS), fallOff: new Float32Array(ROWS * COLS) };
let state = 'title', paused = false, T = 0, overT = 0, rankNew = 0, overJoke = '';
function nColors() { return g.stage >= 4 ? 5 : 4; }
function makePiece(t) {
  const n = nColors(), a = 1 + (Math.random() * n | 0);
  let b = 1 + (Math.random() * n | 0); if (b === a) b = 1 + (a % n);
  const roll = Math.random(), cols = [];
  for (let i = 0; i < 4; i++) cols.push(roll < 0.15 ? a : (Math.random() < 0.5 ? a : b));
  if (roll > 0.88) cols[Math.random() * 4 | 0] = 1 + (Math.random() * n | 0);
  if (g.stage === 1 && Math.random() < 0.14) cols[Math.random() * 4 | 0] = RAINBOW;
  if (g.stage === 2 && Math.random() < 0.16) cols[Math.random() * 4 | 0] = VINE;
  if (g.stage === 5 && Math.random() < 0.2) { const i = Math.random() * 4 | 0; cols[i] = DIM + cols[i]; } // deep sea: one dim cell
  if (g.stage === 6 && Math.random() < 0.16) { const i = Math.random() * 4 | 0; cols[i] = ICE + cols[i]; } // caverns: one frozen cell
  return { t, cols };
}
function newGame() {
  g.board = []; for (let y = 0; y < ROWS; y++) g.board.push(new Int8Array(COLS));
  g.anim = new Float32Array(ROWS * COLS).fill(-9); g.fallOff = new Float32Array(ROWS * COLS); g.popMask = new Uint8Array(ROWS * COLS);
  g.stage = 0; g.bag = []; g.queue = []; for (let i = 0; i < 3; i++) g.queue.push(makePiece(fromBag()));
  g.score = 0; g.disp = 0; g.popped = 0; g.level = 1; g.pop = 0; g.time = 0; g.megas = 0; g.maxChain = 0;
  g.grav = 0; g.lock = 0; g.resets = 0; g.lowY = 0; g.res = null; g.chain = 0; g.piece = null; g.soft = false;
  g.twistT = 0; g.warn = null; g.glitch = null; g.events = [];
  g.fog = null; g.convWarn = null; g.convDir = 1; g.convN = 0; g.convAt = -9; g.bats = []; g.boss = null; g.won = false; g.saved = false; g.popCrack = []; g.popLit = [];
  g.bank = null; g.wipe = null; g.stats = { wipes: 0, booms: 0 }; pmenu = false;
  g.danger = false; g.dangerT = 0; g.dangerCount = 0; g.comebacks = 0; pendFX = null; pendBanner = null; if (M.E) setDanger(false, true);
  P.length = 0; FT.length = 0; TUMBLE.length = 0; RINGS.length = 0; TRAILS.length = 0;
  for (const k in holds) delete holds[k];
  setBG(bgFor(0)); M.stage = 0;
  spawn();
  showBanner('STAGE 1', STAGES[0].name, STAGES[0].c1, TWISTS[0]);
}
function fromBag() {
  if (!g.bag.length) {
    g.bag = [0, 1, 2, 3, 4, 5, 6];
    for (let i = 6; i > 0; i--) { const j = Math.random() * (i + 1) | 0; const tmp = g.bag[i]; g.bag[i] = g.bag[j]; g.bag[j] = tmp; }
  }
  return g.bag.pop();
}
function collide(t, r, x, y) {
  const c = ROT[t][r];
  for (let i = 0; i < c.length; i++) {
    const cx = x + c[i][0], cy = y + c[i][1];
    if (cx < 0 || cx >= COLS || cy >= ROWS) return true;
    if (cy >= 0 && g.board[cy][cx]) return true;
  }
  return false;
}
function spawn() {
  const q = g.queue.shift(); g.queue.push(makePiece(fromBag()));
  g.piece = { t: q.t, cols: q.cols, r: 0, x: q.t === 1 || q.t === 7 ? 4 : 3, y: 1 };
  g.grav = 0; g.lock = 0; g.resets = 0; g.lowY = 1;
  if (collide(g.piece.t, 0, g.piece.x, g.piece.y)) {
    if (!collide(g.piece.t, 0, g.piece.x, 0)) g.piece.y = 0; else gameOver();
  }
}
const grounded = () => { const p = g.piece; return collide(p.t, p.r, p.x, p.y + 1); };
function afterShift() { if (grounded() && g.resets < 15) { g.lock = 0; g.resets++; } }
function tryMove(dx, dy) {
  const p = g.piece;
  if (!p || g.res || collide(p.t, p.r, p.x + dx, p.y + dy)) return false;
  p.x += dx; p.y += dy;
  if (p.y > g.lowY) { g.lowY = p.y; g.resets = 0; g.lock = 0; }
  if (dx) afterShift();
  return true;
}
function rotate(dir) {
  const p = g.piece;
  if (!p || g.res) return false;
  if (p.t === 7) { g.wob = 1; return true; }
  if (p.t === 1) { // O piece: spin its colors instead
    const c = p.cols; p.cols = dir > 0 ? [c[2], c[0], c[3], c[1]] : [c[1], c[3], c[0], c[2]];
    sfx.rotate(); g.wob = 1; return true;
  }
  const nr = (p.r + dir + 4) % 4, kicks = (p.t === 0 ? KI : KJ)['' + p.r + nr];
  for (const [kx, ky] of kicks) {
    if (!collide(p.t, nr, p.x + kx, p.y - ky)) {
      p.x += kx; p.y -= ky; p.r = nr;
      if (p.y > g.lowY) { g.lowY = p.y; g.resets = 0; g.lock = 0; }
      afterShift(); sfx.rotate(); g.wob = 1; return true;
    }
  }
  return false;
}
function ghostY() { const p = g.piece; let y = p.y; while (!collide(p.t, p.r, p.x, y + 1)) y++; return y; }
function addScore(n) { g.score += n; g.pop = n >= 50 ? 1 : Math.max(g.pop, 0.25); }
function cellXY(x, y) { return [L.bx + x * L.cell, L.by + (y - HID) * L.cell]; }
function hardDrop() {
  const p = g.piece;
  if (!p || g.res) return;
  const gy = ghostY(), d = gy - p.y, c = L.cell;
  const bottoms = {};
  ROT[p.t][p.r].forEach(([cx, cy], i) => {
    const a = cellXY(p.x + cx, Math.max(HID, p.y + cy)), b = cellXY(p.x + cx, gy + cy);
    if (d > 0) TRAILS.push({ x: a[0], y1: a[1], y2: b[1] + c, w: c, t: 0, color: cellColor(p.cols[i]) });
    if (!(cx in bottoms) || gy + cy > bottoms[cx].y) bottoms[cx] = { y: gy + cy, col: cellColor(p.cols[i]) };
  });
  p.y = gy; addScore(d * 2);
  for (const k in bottoms) {
    const [sx, sy] = cellXY(p.x + Number(k), bottoms[k].y + 1);
    for (let i = 0; i < 7; i++) part(sx + rand(0, c), sy, rand(-260, 260), rand(-380, -60), rand(0.3, 0.6), 3, i % 2 ? '#fff6b0' : bottoms[k].col, 1200, 1);
  }
  sfx.slam(); shake(0.18, Math.min(9, 3 + d * 0.4));
  lockPiece(true);
}
function lockPiece(hard) {
  const p = g.piece; let allHidden = true;
  if (p.t === 7) { g.piece = null; explodeBomb(p.x, p.y); return; }
  ROT[p.t][p.r].forEach(([cx, cy], i) => {
    const x = p.x + cx, y = p.y + cy;
    if (y >= 0) { g.board[y][x] = p.cols[i]; g.anim[y * COLS + x] = g.time; }
    if (y >= HID) allHidden = false;
  });
  g.piece = null;
  if (!hard) { sfx.lock(); shake(0.08, 2); }
  if (allHidden) { gameOver(); return; }
  startResolve();
}
// --- resolve loop: gravity -> find matches -> pop -> gravity -> ... (chains)
function startResolve() { g.chain = 0; resolveNext(true); }
function resolveNext(doGravity) {
  if (doGravity && applyGravity()) return;
  const pop = findPops();
  if (pop) { beginPop(pop); return; }
  g.res = null; g.chain = 0;
  if (g.boss && g.boss.hp <= 0 && state === 'play') { winGame(); return; }
  if (!g.piece && state === 'play') spawn();
}
function applyGravity() {
  let maxD = 0; g.fallOff.fill(0);
  for (let x = 0; x < COLS; x++) {
    let w = ROWS - 1;
    for (let y = ROWS - 1; y >= 0; y--) {
      const v = g.board[y][x];
      if (!v) continue;
      if (w !== y) { g.board[w][x] = v; g.board[y][x] = 0; g.fallOff[w * COLS + x] = w - y; maxD = Math.max(maxD, w - y); }
      w--;
    }
  }
  if (!maxD) return false;
  g.res = { phase: 'fall', t: 0, dur: 0.07 + 0.035 * Math.sqrt(maxD) * 2.2 };
  return true;
}
function findPops() {
  const N = COLS * ROWS, pm = new Uint8Array(N), groups = [];
  const at = (k) => g.board[(k / COLS) | 0][k % COLS];
  for (let c = 1; c <= 5; c++) {
    const seen = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (seen[i] || at(i) !== c) continue;
      const stack = [i], grp = []; seen[i] = 1;
      while (stack.length) {
        const k = stack.pop(); grp.push(k);
        const x = k % COLS, y = (k / COLS) | 0;
        const nb = [x > 0 ? k - 1 : -1, x < COLS - 1 ? k + 1 : -1, y > 0 ? k - COLS : -1, y < ROWS - 1 ? k + COLS : -1];
        for (const n of nb) { if (n < 0 || seen[n]) continue; const v = at(n); if (v === c || v === RAINBOW) { seen[n] = 1; stack.push(n); } }
      }
      if (grp.length >= 4) { groups.push({ c, size: grp.length, cells: grp }); for (const k of grp) pm[k] = 1; }
    }
  }
  if (!groups.length) return null;
  const broken = [], crack = [], lit = [], mark = new Uint8Array(N);
  for (let k = 0; k < N; k++) {
    const src = pm[k]; if (!src) continue;
    const x = k % COLS, y = (k / COLS) | 0;
    for (const n of [x > 0 ? k - 1 : -1, x < COLS - 1 ? k + 1 : -1, y > 0 ? k - COLS : -1, y < ROWS - 1 ? k + COLS : -1]) {
      if (n < 0 || pm[n] === 1) continue;
      const v = at(n);
      if (src === 2) { if ((v === VINE || v === LAVA) && pm[n] !== 2) { pm[n] = 2; broken.push(n); } continue; } // girders/storm rock keep their old chain-break
      if ((v === VINE || v === LAVA || v === WEB || isIce2(v)) && pm[n] !== 2) { pm[n] = 2; broken.push(n); }
      else if (isIce(v) && !mark[n]) { mark[n] = 1; crack.push(n); } // first hit cracks the ice
      else if (isDim(v) && !mark[n]) { mark[n] = 1; lit.push(n); } // dim block lights up
    }
  }
  return { groups, pm, broken, crack, lit };
}
function beginPop(pop) {
  g.chain++; g.maxChain = Math.max(g.maxChain, g.chain);
  const c = L.cell; let pts = 0, count = 0, maxG = 0, sx = 0, sy = 0;
  for (const gr of pop.groups) { pts += gr.size * 10 + Math.max(0, gr.size - 4) * 20; maxG = Math.max(maxG, gr.size); }
  for (let k = 0; k < pop.pm.length; k++) {
    if (!pop.pm[k]) continue;
    count++;
    const x = k % COLS, y = (k / COLS) | 0, v = g.board[y][x], [px, py] = cellXY(x, y);
    sx += px; sy += py;
    const col = v === RAINBOW ? COLORS[k % 7] : cellColor(v);
    for (let i = 0; i < (maxG >= 8 ? 8 : 6); i++) part(px + c / 2, py + c / 2, rand(-300, 300), rand(-460, -60), rand(0.55, 1.0), rand(c * 0.16, c * 0.36), col, 1100, 0);
  }
  pts += pop.broken.length * 15 + pop.crack.length * 10 + pop.lit.length * 10;
  pts *= g.chain * g.level;
  g.popCrack = pop.crack; g.popLit = pop.lit;
  addScore(pts); g.pop = 1;
  g.popped += count;
  g.popMask = pop.pm;
  g.res = { phase: 'pop', t: 0, dur: POP_T };
  const cx = sx / count + c / 2, cy = sy / count + c / 2;
  floatText('+' + money(pts), clampX(cx), cy, pts >= 200 ? '#ffd23d' : '#7dffb0', c * (maxG >= 8 ? 1.1 : 0.85));
  if (pts >= 200) coinBurst(clampX(cx), cy, Math.min(30, 6 + pts / 60));
  sfx.pop(g.chain, count);
  if (pop.broken.length) {
    const kinds = pop.broken.map(at2), shat = kinds.some(isIce2), web = kinds.indexOf(WEB) >= 0;
    if (shat) sfx.shatter(); else if (web) sfx.web(); else sfx.crack();
    floatText(shat ? 'CRYSTAL SHATTERED!' : web ? 'WEB TORN!' : kinds.indexOf(LAVA) >= 0 ? 'STORM ROCK SMASHED!' : 'GIRDERS BUSTED!', clampX(cx), cy + c * 1.2, shat ? '#bff4ff' : '#7dffb0', c * 0.6);
  }
  if (pop.crack.length) { sfx.ice(); if (!pop.broken.length) floatText('CRACK!', clampX(cx), cy + c * 1.2, '#bff4ff', c * 0.6); }
  if (pop.lit.length) { sfx.light(); floatText(pop.lit.length > 1 ? 'LIT UP x' + pop.lit.length + '!' : 'LIT UP!', clampX(cx), cy - c * 1.1, '#7dfff0', c * 0.6); }
  if (g.boss && g.boss.hp > 0) hitBoss(Math.round(count * (1 + 0.5 * (g.chain - 1))));
  if (g.chain >= 2) {
    floatText('CHAIN x' + g.chain + '!', L.bx + c * 5, L.by + c * 6, g.chain >= 4 ? '#ff4fa3' : '#2bf0ff', Math.min(c * (1.1 + g.chain * 0.15), W * 0.13), 1.4);
    shake(0.25 + g.chain * 0.05, 4 + g.chain * 2);
    RINGS.push({ x: cx, y: cy, r: c * (4 + g.chain), t: 0, color: '#2bf0ff' });
  }
  if (maxG >= 8) {
    g.megas++;
    floatText('MEGA POP!', L.bx + c * 5, L.by + c * 8.5, '#ff2bd6', Math.min(c * 1.5, W * 0.12), 1.6);
    shake(0.55, 14); flashA = 0.5; sfx.quad(); sfx.chaching();
    RINGS.push({ x: cx, y: cy, r: c * 9, t: 0, color: '#ffe23d' });
  } else if (g.chain < 2) shake(0.12, 3);
  const nl = Math.floor(g.popped / LEVEL_POPS) + 1;
  if (nl > g.level) {
    g.level = nl;
    const ns = Math.min(LAST_STAGE, Math.floor(g.popped / STAGE_POPS));
    if (ns !== g.stage) { enterStage(ns); setTimeout(sfx.level, 350); }
    else if (g.stage < BOSS) { showBanner('LEVEL ' + nl, gravInterval() <= gravFloor() + 0.001 ? 'KEEP IT UP!' : 'FASTER! FASTER!', STAGES[g.stage].c2); setTimeout(sfx.level, 350); }
  }
}
function enterStage(ns) {
  g.stage = ns; M.stage = ns; setBG(bgFor(ns)); g.twistT = 0; g.warn = null; g.glitch = null; g.fog = null; g.convWarn = null; g.bats = [];
  g.boss = ns === BOSS ? { hp: BOSS_HP, max: BOSS_HP, disp: BOSS_HP, hit: 0, laugh: 0, warn: null, attacks: 0, dmg: 0 } : null;
  stageBanner(ns);
}
function hitBoss(d) {
  const b = g.boss; b.hp = Math.max(0, b.hp - d); b.dmg += d; b.hit = 0.45;
  const c = L.cell; floatText('-' + d, L.bx + c * (2 + Math.random() * 6), L.by + c * 1.6, '#ff4d6a', c * 0.75, 0.9);
  if (b.hp <= 0) { b.laugh = 0; b.warn = null; g.bats = []; sfx.defeat(); shake(0.6, 14); flashA = 0.6; showBanner('VAMPIRE DEFEATED!', 'THE NIGHT IS SAVED!', '#ffd23d'); }
  else { sfx.hurt(); if (b.hp < b.max * 0.35 && b.hp + d >= b.max * 0.35) { showBanner('HE\'S FURIOUS!', 'ALMOST THERE - KEEP POPPING!', '#ff3355'); setTimeout(() => sfx.laugh(80, 0.5), 500); } }
}
const at2 = (k) => g.board[(k / COLS) | 0][k % COLS];
const clampX = (x) => Math.max(L.bx + L.cell * 2, Math.min(L.bx + L.cell * 8, x));
function updateResolve(dt) {
  const r = g.res; r.t += dt;
  if (r.t < r.dur) return;
  if (r.phase === 'fall') {
    for (let k = 0; k < g.fallOff.length; k++) if (g.fallOff[k]) g.anim[k] = g.time;
    g.fallOff.fill(0); sfx.land();
    resolveNext(false);
  } else {
    for (let k = 0; k < g.popMask.length; k++) if (g.popMask[k]) g.board[(k / COLS) | 0][k % COLS] = 0;
    g.popMask = new Uint8Array(ROWS * COLS);
    const c = L.cell;
    for (const k of g.popCrack) { const y = (k / COLS) | 0, x = k % COLS, v = g.board[y][x]; if (!isIce(v)) continue; g.board[y][x] = v + 10; g.anim[k] = g.time; const [px, py] = cellXY(x, y); for (let i = 0; i < 6; i++) part(px + c / 2, py + c / 2, rand(-120, 120), rand(-200, -40), rand(0.3, 0.6), rand(2, 4), '#e6fbff', 600, 1); }
    for (const k of g.popLit) { const y = (k / COLS) | 0, x = k % COLS, v = g.board[y][x]; if (!isDim(v)) continue; g.board[y][x] = v - DIM; g.anim[k] = g.time; const [px, py] = cellXY(x, y); RINGS.push({ x: px + c / 2, y: py + c / 2, r: c * 1.3, t: 0, color: PAL[v - DIM] }); for (let i = 0; i < 8; i++) part(px + c / 2, py + c / 2, rand(-90, 90), rand(-90, 90), rand(0.3, 0.6), 3, i % 2 ? '#ffffff' : PAL[v - DIM], 0, 1); }
    g.popCrack = []; g.popLit = [];
    resolveNext(true);
  }
}
// --- stage twists
function riseRow(kind) {
  if (g.board[0].some((v) => v)) { gameOver(); return; }
  g.board.shift();
  const row = new Int8Array(COLS), n = nColors(), garbage = kind === 'lava' ? 5 : 4;
  const idx = [...Array(COLS).keys()].sort(() => Math.random() - 0.5);
  for (let i = 0; i < COLS; i++) row[idx[i]] = i < garbage ? (kind === 'lava' ? LAVA : VINE) : 1 + (Math.random() * n | 0);
  g.board.push(row);
  g.anim.fill(-9);
  for (let x = 0; x < COLS; x++) g.anim[(ROWS - 1) * COLS + x] = g.time;
  const p = g.piece;
  if (p && collide(p.t, p.r, p.x, p.y)) { if (!collide(p.t, p.r, p.x, p.y - 1)) p.y--; else if (!collide(p.t, p.r, p.x, p.y - 2)) p.y -= 2; else { gameOver(); return; } }
  if (p) g.lowY = p.y;
  shake(0.35, 7); sfx.rise(kind);
  const [bx, by] = cellXY(0, ROWS - 1);
  for (let i = 0; i < 30; i++) part(bx + rand(0, L.cell * COLS), by + L.cell, rand(-80, 80), rand(-320, -80), rand(0.4, 0.9), rand(3, 6), kind === 'lava' ? (i % 2 ? '#b388ff' : '#3dffd8') : '#cfd8dc', 700, 0);
  startResolve();
}
function startGlitch() {
  const cand = [];
  for (let y = HID; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const v = g.board[y][x]; if (v >= 1 && v <= 5) cand.push(y * COLS + x); }
  if (!cand.length) { g.twistT = 0; return; }
  cand.sort(() => Math.random() - 0.5);
  g.glitch = { cells: cand.slice(0, Math.min(3, cand.length)), t: 0 };
  sfx.glitchWarn();
}
function applyGlitch() {
  const n = nColors();
  for (const k of g.glitch.cells) {
    const y = (k / COLS) | 0, x = k % COLS, v = g.board[y][x];
    if (!(v >= 1 && v <= 5)) continue;
    let nv = 1 + (Math.random() * n | 0); if (nv === v) nv = 1 + (nv % n);
    g.board[y][x] = nv; g.anim[k] = g.time;
    const [px, py] = cellXY(x, y);
    for (let i = 0; i < 8; i++) part(px + L.cell / 2, py + L.cell / 2, rand(-200, 200), rand(-200, 200), rand(0.2, 0.4), 3, i % 2 ? '#ff9e3d' : '#c77dff', 0, 1);
  }
  g.glitch = null; g.twistT = 0; sfx.glitch(); shake(0.15, 4); if (BG.hole) BG.hole.pulse = 1;
  floatText('GRAVITY WARP!', L.bx + L.cell * 5, L.by + L.cell * 4, '#c77dff', L.cell * 0.7);
  startResolve();
}
function updateTwists(dt) {
  g.twistT += dt;
  if (g.stage === 2 && g.twistT > 30) { g.twistT = 0; riseRow('vine'); return; }
  if (g.stage === 3) {
    const PER = 20;
    if (g.twistT > PER - 2.6 && !g.warn) { g.warn = { t: 0 }; sfx.rumble(); }
    if (g.warn) g.warn.t += dt;
    if (g.twistT > PER) { g.twistT = 0; g.warn = null; riseRow('lava'); }
    return;
  }
  if (g.stage === 4) {
    if (!g.glitch && g.twistT > 6) startGlitch();
    else if (g.glitch) { g.glitch.t += dt; if (g.glitch.t > 1.3) applyGlitch(); }
  }
  if (g.stage === 7) { // clockwork conveyor: 2 s warning (gears wind up, arrows flash), then the row slides one step
    const PER = 13;
    if (g.twistT > PER - 2 && !g.convWarn) { g.convWarn = { t: 0 }; sfx.gears(); }
    if (g.convWarn) g.convWarn.t += dt;
    if (g.twistT > PER) { if (shiftConveyor()) { g.twistT = 0; g.convWarn = null; } else g.twistT = PER - 0.25; }
    return;
  }
  if (g.stage === 8) { // haunted fog
    if (!g.fog && g.twistT > 9) startFog();
    else if (g.fog) { const f = g.fog; f.t += dt; f.x += f.vx * dt; if (f.t > f.dur) { g.fog = null; g.twistT = 0; } }
    return;
  }
  if (g.stage === BOSS && g.boss && g.boss.hp > 0) { // vampire summons bats that drop spider webs; gentle step-up below 35% hp
    const b = g.boss, per = b.hp < b.max * 0.35 ? 18 : 22;
    if (g.twistT > per - 2 && !b.warn) { b.warn = { t: 0 }; b.laugh = 1.7; sfx.laugh(); }
    if (b.warn) b.warn.t += dt;
    if (g.twistT > per) { g.twistT = 0; b.warn = null; batAttack(); }
  }
}
function shiftConveyor() {
  const p = g.piece, row = CONV_ROW;
  if (p && ROT[p.t][p.r].some(([cx, cy]) => p.y + cy >= row - 1)) return false; // never shove blocks into the falling piece
  const r = g.board[row], old = Array.from(r), d = g.convDir;
  for (let x = 0; x < COLS; x++) r[(x + d + COLS) % COLS] = old[x];
  g.convAt = g.time; g.convLast = d; g.convN++; if (g.convN % 3 === 0) g.convDir = -g.convDir;
  sfx.clunk(); shake(0.15, 3);
  const [bx, by] = cellXY(d > 0 ? 0 : COLS - 1, row);
  for (let i = 0; i < 12; i++) part(bx + L.cell / 2, by + L.cell / 2, rand(-60, 60), rand(-160, -40), rand(0.6, 1.1), rand(5, 9), 'rgba(230,230,230,0.6)', -40, 0);
  floatText(d > 0 ? 'CONVEYOR \u2192' : '\u2190 CONVEYOR', L.bx + L.cell * 5, by - L.cell * 0.6, '#ffb347', L.cell * 0.6, 0.9);
  startResolve();
  return true;
}
function startFog() {
  const cand = [];
  for (let y = HID + 2; y < ROWS; y++) for (let x = 1; x < COLS - 1; x++) if (g.board[y][x]) cand.push([x, y]);
  if (cand.length < 4) { g.twistT = 5; return; }
  const [x, y] = cand[Math.random() * cand.length | 0];
  g.fog = { x: x + 0.5, y: y + 0.5, vx: (Math.random() < 0.5 ? -1 : 1) * rand(0.2, 0.4), t: 0, dur: 4.6, r: 1.8 };
  sfx.whoosh();
}
const fogK = () => { const f = g.fog; return f ? Math.max(0, Math.min(1, f.t / 0.7, (f.dur - f.t) / 0.7)) : 0; };
function fogHides(x, y) { const f = g.fog; if (!f) return false; const k = fogK(); return k > 0.5 && Math.hypot(x + 0.5 - f.x, (y + 0.5 - f.y) * 1.1) < f.r * k; }
function vampPos() { // vampire portrait spot in the side column (bats launch from here)
  const c = L.cell, top = L.by + c * (6.8 + 1.75 * 3 + 1.6 + (g.maxChain >= 2 ? 1.5 : 0)), bot = L.by + c * VIS;
  return { x: L.sx + L.sw / 2, y: (top + bot) / 2, s: Math.max(c * 1.1, Math.min(L.sw * 0.5, (bot - top) * 0.46)) };
}
function batAttack() {
  const b = g.boss, hs = [];
  for (let x = 0; x < COLS; x++) { let top = ROWS; for (let y = 0; y < ROWS; y++) if (g.board[y][x]) { top = y; break; } hs.push({ x, top }); }
  const ok = hs.filter((h) => h.top > HID + 5).sort((a, b2) => b2.top - a.top).slice(0, 6); // only the lower columns, never near the top
  if (!ok.length) return;
  b.attacks++; sfx.bats();
  const vp = vampPos(), n = Math.min(2, ok.length), pick = ok.sort(() => Math.random() - 0.5).slice(0, n);
  pick.forEach((h, i) => g.bats.push({ col: h.x, t: -i * 0.18, d: 1.0, x0: vp.x, y0: vp.y }));
  floatText('BAT SWARM!', L.bx + L.cell * 5, L.by + L.cell * 4, '#ff3355', L.cell * 0.8, 1.2);
}
function updateBats(dt) {
  for (let i = g.bats.length - 1; i >= 0; i--) {
    const bt = g.bats[i]; bt.t += dt;
    if (bt.t < bt.d || g.res) continue;
    g.bats.splice(i, 1);
    let y = ROWS - 1; while (y >= 0 && g.board[y][bt.col]) y--;
    const p = g.piece, blocked = p && ROT[p.t][p.r].some(([cx, cy]) => p.x + cx === bt.col && p.y + cy >= y - 1);
    const [px, py] = cellXY(bt.col, Math.max(HID, y));
    if (y > HID + 3 && !blocked) { g.board[y][bt.col] = WEB; g.anim[y * COLS + bt.col] = g.time; sfx.web(); }
    for (let k = 0; k < 10; k++) part(px + L.cell / 2, py + L.cell / 2, rand(-120, 120), rand(-160, 40), rand(0.3, 0.6), 3, k % 2 ? '#e6e6f0' : '#5a1030', 300, 0);
  }
}
function winGame() {
  const c = L.cell; g.won = true; g.piece = null; g.res = null; g.bats = []; g.fog = null;
  state = 'won'; overT = 0; paused = false; for (const k in holds) delete holds[k];
  g.score += WIN_BONUS; g.winBonus = WIN_BONUS; g.pop = 1;
  for (let y = HID; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const v = g.board[y][x]; if (!v) continue; const [sx, sy] = cellXY(x, y); TUMBLE.push({ x: sx + c / 2, y: sy + c / 2, vx: rand(-260, 260), vy: rand(-700, -200), r: 0, vr: rand(-8, 8), c: spr(v), s: c }); g.board[y][x] = 0; }
  const vp = vampPos();
  for (let i = 0; i < 40; i++) { const a = rand(0, 6.28), v = rand(120, 420); part(vp.x, vp.y, Math.cos(a) * v, Math.sin(a) * v, rand(0.6, 1.2), rand(4, 8), i % 2 ? '#2a0614' : '#ff3355', -60, 0); }
  coinBurst(cx0(), cy0(), 40); confetti(140);
  g.danger = false; pendFX = null; g.wipe = null; musicStop();
  if (aok() && ensureEngine()) { if (!xmFanfare(BOSS + 1, A.ctx.currentTime + 1.4, true)) fanfare(M.E, BOSS + 1, A.ctx.currentTime + 1.4); setTimeout(() => { if (state === 'won' || state === 'entry') sfx.cheer(); }, 2600); }
  bankRun();
}
// speed ramps per level but flattens out; stages 9-10 get a slightly lower floor ("a bit harder near the end").
// The boss fight never speeds up as its health drops.
function gravFloor() { return g.stage >= 8 ? 0.12 : 0.14; }
function gravInterval() { return Math.max(gravFloor(), 0.9 * Math.pow(0.9, g.level - 1)); }
function updateGame(dt) {
  g.time += dt;
  g.pop = Math.max(0, g.pop - dt * 2.5);
  g.wob = Math.max(0, (g.wob || 0) - dt * 6);
  const gap = g.score - g.disp;
  g.disp = gap > 0 ? Math.min(g.score, g.disp + Math.max(60, gap * 7) * dt) : g.score;
  if (g.wipe) { g.wipe.t += dt; if (g.wipe.t >= 0.5 && !g.res) applyWipe(); }
  updateDanger(dt);
  if (g.boss) { const b = g.boss; b.hit = Math.max(0, b.hit - dt); b.laugh = Math.max(0, b.laugh - dt); b.disp += (b.hp - b.disp) * Math.min(1, dt * 4); }
  if (g.bats && g.bats.length) updateBats(dt);
  if (g.res) { updateResolve(dt); return; }
  if (!g.piece) return;
  updateTwists(dt);
  if (!g.piece || g.res || state !== 'play') return;
  updateHolds(dt);
  if (!g.piece || g.res || state !== 'play') return;
  const iv = gravInterval(), step = g.soft ? Math.min(iv / 20, 0.05) : iv;
  g.grav += dt;
  while (g.grav >= step) {
    g.grav -= step;
    if (!grounded()) { g.piece.y++; if (g.soft) addScore(1); if (g.piece.y > g.lowY) { g.lowY = g.piece.y; g.resets = 0; g.lock = 0; } }
    else { g.grav = 0; break; }
  }
  if (grounded()) { g.lock += dt; if (g.lock >= LOCK_T || g.resets >= 15) lockPiece(false); }
  else g.lock = 0;
}
function qualifies(s) { return s > 0 && (scores.length < 10 || s > scores[scores.length - 1].s); }
function gameOver() {
  g.piece = null; g.res = null; state = 'dying'; overT = 0; paused = false; g.warn = null; g.glitch = null;
  for (const k in holds) delete holds[k];
  const c = L.cell;
  for (let y = HID; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const v = g.board[y][x];
    if (!v) continue;
    const [sx, sy] = cellXY(x, y);
    TUMBLE.push({ x: sx + c / 2, y: sy + c / 2, vx: rand(-220, 220), vy: rand(-650, -150) - (ROWS - y) * 8, r: 0, vr: rand(-8, 8), c: spr(v), s: c });
    g.board[y][x] = 0;
  }
  g.danger = false; pendFX = null; g.wipe = null; musicStop(); sfx.over(); shake(0.4, 8);
  bankRun();
  overJoke = OVER_JOKES[Math.random() * OVER_JOKES.length | 0];
}
function submitEntry() {
  const n = ent.map((c) => String.fromCharCode(c)).join('');
  const rec = { n, s: g.score, l: g.popped, lv: g.level, d: Date.now() };
  scores.push(rec); scores.sort((a, b) => b.s - a.s); scores = scores.slice(0, 10);
  store.set('bb_scores_v2', scores); lastInit = n; store.set('bb_init', n);
  rankNew = scores.indexOf(rec) + 1;
  if (g.won) { g.saved = true; state = 'won'; overT = 4; } else { state = 'over'; overT = 0; }
  sfx.cheer();
}
const best = () => Math.max(scores.length ? scores[0].s : 0, g.score);
// debug/test hooks
const LETTERS = { '.': 0, B: 1, Y: 2, P: 3, G: 4, O: 5, '*': RAINBOW, V: VINE, L: LAVA, W: WEB,
  b: DIM + 1, y: DIM + 2, p: DIM + 3, g: DIM + 4, o: DIM + 5, 1: ICE + 1, 2: ICE + 2, 3: ICE + 3, 4: ICE + 4, 5: ICE + 5, '!': ICE2 + 1, '@': ICE2 + 2, '#': ICE2 + 3, '$': ICE2 + 4, '%': ICE2 + 5 };
const dbg = {
  setup(rows, piece) {
    for (let y = 0; y < ROWS; y++) g.board[y].fill(0);
    rows.forEach((s, i) => { const y = ROWS - rows.length + i; [...s].forEach((ch, x) => { g.board[y][x] = LETTERS[ch] || 0; }); });
    g.res = null; g.glitch = null; g.warn = null; g.twistT = 0;
    if (piece) { g.piece = { t: piece.t, r: piece.r || 0, x: piece.x, y: piece.y == null ? 2 : piece.y, cols: [...piece.cols].map((ch) => LETTERS[ch]) }; g.lock = 0; g.resets = 0; g.lowY = g.piece.y; }
  },
  setStage(i) { g.popped = i * STAGE_POPS; g.level = Math.floor(g.popped / LEVEL_POPS) + 1; enterStage(i); bgFade = 0; },
  bossHP(n) { if (g.boss) { g.boss.hp = n; g.boss.disp = n; } return !!g.boss; },
  hitBoss(n) { if (g.boss) hitBoss(n); },
  musicTrack(i, bar) { if (!M.timer) return false; M.pending = null; pendBanner = null; M.track = i; M.step = (bar || 0) * 16; M.E.setTrack(i, A.ctx.currentTime); if (xmUsable(i)) xmPlay(i, A.ctx.currentTime + 0.05); return true; },
  get amb() { return { on: !!AMB.src, waves: AMB.waves, level: AMB.level, g: AMB.g ? AMB.g.gain.value : 0, lp: AMB.lp ? AMB.lp.frequency.value : 0 }; },
  ambLevel(v) { AMB.level = v; if (AMB.out) AMB.out.gain.value = v; },
  get xm() { return { on: XM.on, gain: XM.gain, prime: XM.prime, dly: Object.assign({}, XM.dly), sd: XM.sd ? XM.sd.gain.value : 1, sr: A.ctx ? A.ctx.sampleRate : 0, track: XM.track, playing: !!XM.src, t0: XM.t0, plays: XM.plays, fans: XM.fans, danger: !!XM.dSrc, dangerOn: XM.dOn, loaded: Object.keys(XM.buf), failed: Object.keys(XM.failed), err: XM.lastErr, duck: XM.duck ? XM.duck.gain.value : 1, now: A.ctx ? A.ctx.currentTime : 0, pos: A.ctx && XM.src ? ((A.ctx.currentTime - XM.t0) % xmLoopLen(XM.track) + xmLoopLen(XM.track)) % xmLoopLen(XM.track) : -1 }; },
  xmGain(v) { XM.gain = v; if (XM.bus) XM.bus.gain.value = v; },
  xmEnable(v) { XM.on = !!v; if (!XM.on) xmStopAll(); },
  renderPreview,
  lightning() { if (BG.storm) BG.storm.next = 0; },
  setCash(n) { wallet.cash = n; saveWallet(); },
  cells(t, r) { return ROT[t][r]; }, collide(t, r, x, y) { return collide(t, r, x, y); },
  place(r, x) { const p = g.piece; if (!p || g.res || collide(p.t, r, x, p.y)) return false; p.r = r; p.x = x; return true; }, drop() { if (g.piece && !g.res) { hardDrop(); return true; } return false; },
  timeScale(v) { TS = v; }, board() { return g.board.map((r) => Array.from(r)); }, setEdition, gameOver() { gameOver(); }, setScore(n) { g.score = n; g.disp = n; },
  gatorSink() { if (BG.gator) BG.gator.nextSink = 0; },
  setTwistT(v) { g.twistT = v; },
  twistNow() { g.twistT = 999; if (g.stage === 3) g.warn = { t: 3 }; if (g.stage === 7) g.convWarn = { t: 2 }; if (g.boss) g.boss.warn = { t: 2 }; },
  rows() { return g.board.map((r) => [...r].map((v) => Object.keys(LETTERS).find((k) => LETTERS[k] === v) || '?').join('')); },
  sample(n) { const out = []; for (let i = 0; i < n; i++) out.push(makePiece(0).cols); return out; },
};
// ---------------------------------------------------------------- input
const holds = {};
let ent = [65, 65, 65], entSel = 0, sortKey = 's', confirmReset = false, pending = null, hoverId = null;
const pressAnim = {}, heldBtn = new Map(), gest = new Map();
let UI = [];
function act(a) {
  if (state !== 'play' || paused || !g.piece || g.res) return;
  switch (a) {
    case 'left': if (tryMove(-1, 0)) sfx.move(); break;
    case 'right': if (tryMove(1, 0)) sfx.move(); break;
    case 'rot': rotate(1); break;
    case 'ccw': rotate(-1); break;
    case 'soft': if (tryMove(0, 1)) { addScore(1); g.grav = 0; sfx.move(); } break;
    case 'hard': hardDrop(); break;
  }
}
function holdStart(k) {
  if (holds[k]) { holds[k].n++; return; }
  holds[k] = { t: 0, r: 0, n: 1 };
  if (k === 'down') g.soft = true; else act(k);
}
function holdEnd(k) { const h = holds[k]; if (!h) return; if (--h.n <= 0) { delete holds[k]; if (k === 'down') g.soft = false; } }
function updateHolds(dt) {
  for (const k of ['left', 'right']) {
    const h = holds[k]; if (!h) continue;
    h.t += dt;
    if (h.t >= DAS) { h.r += dt; while (h.r >= ARR) { h.r -= ARR; act(k); } }
  }
}
function setPaused(p) {
  if (state !== 'play' || paused === p) return;
  paused = p; if (!p) pmenu = false; for (const k in holds) delete holds[k]; g.soft = false; heldBtn.clear(); gest.clear();
  sfx.pause();
}
function toggleSound() {
  settings.sound = !settings.sound; saveSettings();
  if (A.master) A.master.gain.value = settings.sound ? 0.8 : 0;
}
let DBG_STAGE = 0; try { DBG_STAGE = Math.max(0, Math.min(10, parseInt(new URLSearchParams(location.search).get('stage'), 10) || 0)); } catch (e) { /* ignore */ }
function startGame() { newGame(); state = 'play'; paused = false; M.step = 0; if (DBG_STAGE > 1) dbg.setStage(DBG_STAGE - 1); }
function toMenu() { state = 'title'; paused = false; setBG(5); M.stage = 0; confirmReset = false; P.length = 0; TUMBLE.length = 0; banner = null; }
function doAction(id) {
  switch (id) {
    case 'play': case 'again': case 'restart': startGame(); break;
    case 'scores': state = 'scores'; confirmReset = false; break;
    case 'howto': state = 'howto'; break;
    case 'store': openStore(); break;
    case 'back': case 'menu': toMenu(); break;
    case 'resume': setPaused(false); break;
    case 'sort': sortKey = sortKey === 's' ? 'l' : sortKey === 'l' ? 'lv' : 's'; break;
    case 'reset': confirmReset = true; break;
    case 'resetNo': confirmReset = false; break;
    case 'resetYes': scores = []; store.set('bb_scores_v2', scores); confirmReset = false; break;
  }
}
function hitUI(x, y) {
  for (let i = UI.length - 1; i >= 0; i--) { const b = UI[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b; }
  return null;
}
const CTRL = { c_left: 'left', c_right: 'right', c_down: 'down' };
function pressButton(b, x, y, pid) {
  const id = b.id;
  pressAnim[id] = 0;
  if (id.startsWith('c_')) {
    heldBtn.set(pid, id);
    if (CTRL[id]) holdStart(CTRL[id]); else if (id === 'c_rot') act('rot'); else if (id === 'c_hard') act('hard');
    return;
  }
  if (id === 'pause') { setPaused(true); return; }
  if (id === 'pu') { openPU(); sfx.blip(); return; }
  if (shop.modal && id !== 'modalOk') return;
  if (id === 'modalOk') { shop.modal = null; sfx.blip(); return; }
  if (id.startsWith('tab')) { shop.tab = +id.slice(3); sfx.blip(); return; }
  if (id.startsWith('buy_')) { buyPU(id.slice(4)); return; }
  if (id.startsWith('bg_')) { buyBG(id.slice(3)); return; }
  if (id.startsWith('skin_')) { buySkin(id.slice(5)); return; }
  if (id === 'upgrade') { if (!isFullEdition()) shop.modal = 'upgrade'; sfx.blip(); return; }
  if (id.startsWith('use_')) { usePU(id.slice(4)); return; }
  if (id.startsWith('pbuy_')) { buyPU(id.slice(5)); return; }
  if (id === 'puClose') { closePU(); return; }
  if (id === 'snd') { toggleSound(); if (settings.sound) { audioUnlock(); sfx.punch(); } else if (silentEl) silentEl.pause(); return; }
  if (id.startsWith('up') || id.startsWith('dn')) {
    const i = +id.slice(2); entSel = i;
    ent[i] = 65 + ((ent[i] - 65 + (id[0] === 'u' ? 1 : 25)) % 26); sfx.blip(); return;
  }
  if (pending) return;
  sfx.punch(); burst(x, y);
  if (id === 'sound' || id === 'music' || id === 'buttons') {
    if (id === 'sound') { toggleSound(); if (settings.sound) sfx.punch(); }
    else if (id === 'music') { settings.music = !settings.music; saveSettings(); }
    else { settings.buttons = !settings.buttons; saveSettings(); layout(); }
    return;
  }
  if (id === 'ok') { submitEntry(); return; }
  pending = { id, t: 0.22 };
}
function onDown(e) {
  if (e.cancelable) e.preventDefault();
  audioUnlock();
  const x = e.clientX, y = e.clientY, b = hitUI(x, y);
  if (b) { pressButton(b, x, y, e.pointerId); return; }
  if (state === 'title') logoTap(y);
  if (state === 'play' && !paused) {
    const now = performance.now();
    gest.set(e.pointerId, { sx: x, sy: y, ax: x, ay: y, t0: now, moved: false, axis: null, hist: [[x, y, now]] });
  }
}
function onMove(e) {
  const x = e.clientX, y = e.clientY;
  if (e.pointerType === 'mouse') { const b = hitUI(x, y); hoverId = b ? b.id : null; }
  const p = gest.get(e.pointerId);
  if (!p) return;
  if (e.cancelable) e.preventDefault();
  const now = performance.now();
  p.hist.push([x, y, now]); while (p.hist.length > 2 && now - p.hist[0][2] > 200) p.hist.shift();
  const dx = x - p.sx, dy = y - p.sy;
  if (!p.axis && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) p.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : dy > 0 ? 'v' : 'u';
  const step = L.cell * 0.85;
  if (p.axis === 'h') {
    while (x - p.ax >= step) { p.ax += step; act('right'); p.moved = true; }
    while (p.ax - x >= step) { p.ax -= step; act('left'); p.moved = true; }
  } else if (p.axis === 'v') {
    while (y - p.ay >= step) { p.ay += step; act('soft'); p.moved = true; }
  }
}
function onUp(e) {
  const hb = heldBtn.get(e.pointerId);
  if (hb) { heldBtn.delete(e.pointerId); if (CTRL[hb]) holdEnd(CTRL[hb]); }
  const p = gest.get(e.pointerId);
  if (p) {
    gest.delete(e.pointerId);
    if (e.type === 'pointercancel') return;
    const x = e.clientX, y = e.clientY, now = performance.now();
    const dist = Math.hypot(x - p.sx, y - p.sy);
    // flick velocity from the last move samples (ignore a short pause at release)
    const hl = p.hist[p.hist.length - 1];
    let h0 = hl;
    for (let i = p.hist.length - 1; i >= 0 && hl[2] - p.hist[i][2] <= 120; i--) h0 = p.hist[i];
    const vy = (hl[1] - h0[1]) / Math.max(1, hl[2] - h0[2]), fresh = now - hl[2] < 160;
    if (!p.axis && now - p.t0 < 350 && dist < 14) act('rot');
    else if (p.axis === 'v') {
      if (fresh && vy > 0.8 && y - p.sy > L.cell * 1.2) act('hard');
    } else if (p.axis === 'u' && p.sy - y > L.cell * 1.5) act('rot');
  }
  audioUnlock();
}
cv.addEventListener('pointerdown', onDown, { passive: false });
window.addEventListener('pointermove', onMove, { passive: false });
window.addEventListener('pointerup', onUp, { passive: false });
window.addEventListener('pointercancel', onUp, { passive: false });
// iOS: kill scrolling, rubber-banding, pinch and double-tap zoom
['touchstart', 'touchmove', 'touchend'].forEach((ev) => document.addEventListener(ev, (e) => { if (e.cancelable) e.preventDefault(); if (ev === 'touchend') audioUnlock(); }, { passive: false }));
['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu'].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down' };
window.addEventListener('keydown', (e) => {
  audioUnlock();
  const k = e.key;
  if (k.startsWith('Arrow') || k === ' ') e.preventDefault();
  if (k === 'm' || k === 'M') { toggleSound(); return; }
  if (k === 'n' || k === 'N') { settings.music = !settings.music; saveSettings(); return; }
  if (state === 'title') { if (!e.repeat && !pending && (k === 'Enter' || k === ' ')) { sfx.punch(); burst(W / 2, H / 2); pending = { id: 'play', t: 0.22 }; } return; }
  if (state === 'scores' || state === 'howto') { if (k === 'Escape' || k === 'Enter' || k === 'Backspace') toMenu(); return; }
  if (state === 'over') { if (!e.repeat && k === 'Enter') startGame(); else if (k === 'Escape') toMenu(); return; }
  if (state === 'won') { if (!e.repeat && k === 'Enter' && (g.saved || !qualifies(g.score)) && overT > 1.2) startGame(); else if (k === 'Escape') toMenu(); return; }
  if (state === 'entry') {
    if (/^[a-zA-Z]$/.test(k)) { ent[entSel] = k.toUpperCase().charCodeAt(0); entSel = Math.min(2, entSel + 1); sfx.blip(); }
    else if (k === 'Backspace' || k === 'ArrowLeft') entSel = Math.max(0, entSel - 1);
    else if (k === 'ArrowRight') entSel = Math.min(2, entSel + 1);
    else if (k === 'ArrowUp') ent[entSel] = 65 + (ent[entSel] - 64) % 26;
    else if (k === 'ArrowDown') ent[entSel] = 65 + (ent[entSel] - 40) % 26;
    else if (k === 'Enter') submitEntry();
    return;
  }
  if (state !== 'play') return;
  if (k === 'p' || k === 'P' || k === 'Escape') { setPaused(!paused); return; }
  if (paused || e.repeat) return;
  if (KEYMAP[k]) holdStart(KEYMAP[k]);
  else if (k === 'ArrowUp' || k === 'x' || k === 'X') act('rot');
  else if (k === 'z' || k === 'Z') act('ccw');
  else if (k === ' ') act('hard');
});
window.addEventListener('keyup', (e) => { if (KEYMAP[e.key]) holdEnd(KEYMAP[e.key]); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (state === 'play') setPaused(true); musicStop(); if (A.ctx) A.ctx.suspend(); if (silentEl) silentEl.pause(); }
  else if (A.ctx) { const p = A.ctx.resume(); if (p && p.catch) p.catch(() => {}); }
});
window.addEventListener('pageshow', () => { if (A.ctx && A.ctx.state !== 'running') { const p = A.ctx.resume(); if (p && p.catch) p.catch(() => {}); } });
window.addEventListener('click', audioUnlock, true);
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 250));
// ---------------------------------------------------------------- UI drawing
function icon(name, s) {
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#03243a'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  const tri = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s))); ctx.closePath(); ctx.stroke(); ctx.fill(); };
  switch (name) {
    case 'left': tri([[0.35, -0.4], [0.35, 0.4], [-0.4, 0]]); break;
    case 'right': tri([[-0.35, -0.4], [-0.35, 0.4], [0.4, 0]]); break;
    case 'down': tri([[-0.4, -0.3], [0.4, -0.3], [0, 0.4]]); break;
    case 'up': tri([[-0.4, 0.3], [0.4, 0.3], [0, -0.4]]); break;
    case 'hard':
      tri([[-0.4, -0.5], [0.4, -0.5], [0, -0.05]]); tri([[-0.4, -0.05], [0.4, -0.05], [0, 0.4]]);
      ctx.strokeRect(-0.45 * s, 0.45 * s, 0.9 * s, 0.12 * s); ctx.fillRect(-0.45 * s, 0.45 * s, 0.9 * s, 0.12 * s); break;
    case 'rot':
      ctx.lineCap = 'round';
      ctx.lineWidth = s * 0.26; ctx.beginPath(); ctx.arc(0, 0, s * 0.3, -Math.PI * 0.5, Math.PI * 1.15); ctx.stroke();
      ctx.lineWidth = s * 0.13; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, s * 0.3, -Math.PI * 0.5, Math.PI * 1.15); ctx.stroke();
      ctx.lineCap = 'butt'; ctx.lineWidth = 3; ctx.strokeStyle = '#03243a';
      tri([[-0.12, -0.55], [0.22, -0.3], [-0.12, -0.05]]); break;
    case 'spk': case 'mute':
      ctx.beginPath(); ctx.moveTo(-0.45 * s, -0.15 * s); ctx.lineTo(-0.25 * s, -0.15 * s); ctx.lineTo(0, -0.4 * s); ctx.lineTo(0, 0.4 * s); ctx.lineTo(-0.25 * s, 0.15 * s); ctx.lineTo(-0.45 * s, 0.15 * s); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.lineCap = 'round'; ctx.lineWidth = s * 0.09; ctx.strokeStyle = '#fff'; ctx.beginPath();
      if (name === 'spk') { ctx.arc(0.05 * s, 0, 0.2 * s, -0.9, 0.9); ctx.moveTo(0.05 * s + Math.cos(-0.9) * 0.36 * s, Math.sin(-0.9) * 0.36 * s); ctx.arc(0.05 * s, 0, 0.36 * s, -0.9, 0.9); }
      else { ctx.moveTo(0.15 * s, -0.18 * s); ctx.lineTo(0.45 * s, 0.18 * s); ctx.moveTo(0.45 * s, -0.18 * s); ctx.lineTo(0.15 * s, 0.18 * s); }
      ctx.stroke(); ctx.lineCap = 'butt'; break;
    case 'bolt': tri([[0.08, -0.45], [-0.25, 0.06], [0.0, 0.06], [-0.1, 0.45], [0.26, -0.08], [0.02, -0.08]]); break;
    case 'pause':
      ctx.strokeRect(-0.3 * s, -0.35 * s, 0.2 * s, 0.7 * s); ctx.fillRect(-0.3 * s, -0.35 * s, 0.2 * s, 0.7 * s);
      ctx.strokeRect(0.1 * s, -0.35 * s, 0.2 * s, 0.7 * s); ctx.fillRect(0.1 * s, -0.35 * s, 0.2 * s, 0.7 * s); break;
  }
}
function button(id, x, y, w, h, label, color, o) {
  o = o || {};
  UI.push({ id, x: x - w / 2, y: y - h / 2, w, h });
  let sc = 1, rot = o.rot || 0;
  if (pressAnim[id] != null) sc = 1 - 0.18 * Math.sin(Math.min(1, pressAnim[id] / 0.25) * Math.PI);
  for (const v of heldBtn.values()) if (v === id) sc = 0.88;
  if (hoverId === id) rot += Math.sin(T * 20) * 0.05;
  const r = o.r != null ? o.r : h * 0.32;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  ctx.globalAlpha = o.alpha || 1;
  rr(-w / 2, -h / 2 + 5, w, h, r); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
  let fill = color;
  if (Array.isArray(color)) {
    fill = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    color.forEach((c, i) => fill.addColorStop(i / (color.length - 1), c));
  }
  if (o.glow !== false && Array.isArray(color)) { ctx.shadowColor = 'rgba(29,233,182,0.55)'; ctx.shadowBlur = 14; }
  rr(-w / 2, -h / 2, w, h, r); ctx.fillStyle = fill; ctx.fill(); ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3; ctx.strokeStyle = '#03243a'; ctx.stroke();
  rr(-w / 2 + 4, -h / 2 + 4, w - 8, h * 0.36, r * 0.6); ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fill();
  if (o.icon) icon(o.icon, Math.min(w, h) * 0.6);
  else fitTxt(label, 0, 2, o.fs || h * 0.42, w * 0.86, '#fff', '#03243a');
  ctx.restore();
}
function panel(x, y, w, h, stroke) {
  rr(x, y, w, h, 18); ctx.fillStyle = 'rgba(2,20,36,0.88)'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = stroke || '#ff2bd6'; ctx.stroke();
}
function wobblyWord(word, cx, cy, size, t, phase, colors, maxW) {
  ctx.font = font(size, FONT);
  const chars = [...word];
  let ws = chars.map((ch) => ctx.measureText(ch).width * 1.02);
  let total = ws.reduce((a, b) => a + b, 0);
  if (maxW && total > maxW) { const k = maxW / total; size *= k; ws = ws.map((w) => w * k); total = maxW; }
  let x = cx - total / 2;
  chars.forEach((ch, i) => {
    const w = ws[i], oy = Math.sin(t * 4 + i * 0.7 + phase) * size * 0.08, r = Math.sin(t * 3 + i * 1.3 + phase) * 0.12,
      s = 1 + Math.sin(t * 5 + i + phase) * 0.06;
    if (ch !== ' ') {
      ctx.save(); ctx.translate(x + w / 2, cy + oy); ctx.rotate(r); ctx.scale(s, s);
      txt(ch, size * 0.05, size * 0.08, size, 'rgba(0,0,0,0.5)', null);
      txt(ch, 0, 0, size, colors[(i + (phase | 0)) % colors.length], '#03243a', 'center', FONT, size * 0.18);
      ctx.restore();
    }
    x += w;
  });
}
// title-screen block rain
const rain = [];
function newRain(initial) { return { x: rand(0, W), y: initial ? rand(-H, 0) : rand(-260, -40), vy: 0, rot: rand(0, 6), vr: rand(-4, 4), c: Math.random() * 6 | 0, s: rand(18, 38), rest: 0 }; }
let bonkCD = 0;
function updateRain(dt) {
  if (rain.length < 14) for (let i = 0; i < 14; i++) rain.push(newRain(true));
  bonkCD -= dt;
  for (const r of rain) {
    r.vy += 900 * dt; r.y += r.vy * dt; r.rot += r.vr * dt;
    const floor = H - safe.b - r.s / 2;
    if (r.y > floor) {
      r.y = floor;
      if (r.vy > 220) { r.vy *= -0.45; r.vr *= -0.8; if (state === 'title' && bonkCD <= 0) { sfx.bonk(0.6); bonkCD = 0.35; } }
      else { r.vy = 0; r.vr *= 0.9; r.rest += dt; if (r.rest > 1.4) Object.assign(r, newRain(false)); }
    }
  }
}
function drawRain() {
  ctx.globalAlpha = 0.9;
  for (const r of rain) { ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot); drawBlock(r.c, -r.s / 2, -r.s / 2, r.s); ctx.restore(); }
  ctx.globalAlpha = 1;
}
function drawTitle() {
  drawRain();
  const cx = W / 2;
  const size = Math.min(W / 6.6, H / 10, 78);
  const bounce = Math.abs(Math.sin(T * 2.4)) * size * 0.18;
  const ly = L.top + size * 1.0 + (H > 700 ? H * 0.04 : 0);
  wobblyWord('BLOCK', cx, ly - bounce, size * 1.1, T, 0, LOGO, W * 0.9);
  wobblyWord('BONANZA', cx, ly + size * 1.05 - bounce * 0.6, size, T, 2, LOGO.slice(3).concat(LOGO.slice(0, 3)), W * 0.92);
  const ti = Math.floor(T / 2.6) % TAGLINES.length, tk = (T % 2.6) / 2.6;
  const tsc = tk < 0.1 ? easeOutBack(tk / 0.1) : 1;
  ctx.save(); ctx.translate(cx, ly + size * 2.0); ctx.rotate(-0.04 + Math.sin(T * 2) * 0.02); ctx.scale(tsc, tsc);
  fitTxt(TAGLINES[ti], 0, 0, Math.min(22, W * 0.05), W * 0.9, '#E0FFF7', '#03243a');
  ctx.restore();
  const bw = Math.min(W * 0.72, 320), bh = Math.min(58, H * 0.07), gap = bh * 0.32;
  let by = Math.max(ly + size * 2.0 + bh * 0.9 + 30, (H - (bh * 4 + gap * 3)) / 2 + size * 0.9);
  by = Math.min(by, L.bot - (bh + gap) * 5 - 34); // leaves room for the footer + copyright lines
  logoBox.y0 = ly - size * 1.2; logoBox.y1 = ly + size * 1.6;
  const items = [['play', 'PLAY!', DEEP], ['store', 'STORE', OCEAN], ['scores', 'BEST SCORES', TEAL], ['howto', 'HOW TO PLAY', AQUA],
    ['sound', 'SOUND: ' + (settings.sound ? 'ON' : 'OFF'), settings.sound ? OCEAN : ['#4a6572', '#2c3e50']]];
  items.forEach(([id, label, col], i) => button(id, cx, by + i * (bh + gap) + bh / 2, bw * (i === 0 ? 1.08 : 1), bh * (i === 0 ? 1.12 : 1), label, col, { rot: Math.sin(T * 2.5 + i) * 0.025 }));
  txt('tap a button. go on. we dare you.', cx, L.bot - 24, 12, 'rgba(255,255,255,0.6)', null);
  fitTxt(COPYRIGHT, cx, L.bot - 8, 11, W * 0.92, 'rgba(255,255,255,0.78)', 'rgba(3,20,40,0.85)');
  { // wallet + edition badge, centered between the tagline and PLAY
    const ph = 28; ctx.font = font(ph * 0.55, NFONT); const pw0 = ctx.measureText(money(wallet.cash)).width + ph * 1.5, tot = pw0 + 8 + 46;
    const wy = Math.max(ly + size * 2.0 + 26, by - bh * 0.06 - ph / 2 - 8);
    walletPill(cx - tot / 2, wy, 'left', ph); editionBadge(cx - tot / 2 + pw0 + 8, wy);
  }
  // sound indicator
  const live = A.ctx && A.ctx.state === 'running', on = settings.sound, ss = 44;
  button('snd', L.right - ss / 2, L.top + ss / 2, ss, ss, '', on ? (live ? TEAL : ['#ffb300', '#ff7043']) : ['#4a6572', '#2c3e50'], { icon: on ? 'spk' : 'mute', r: 12 });
  fitTxt(!on ? 'SOUND OFF' : live ? 'SOUND ON' : 'TAP FOR SOUND', L.right, L.top + ss + 12, 11, on && live ? '#7dffe0' : '#ffd180', '#03243a', 'right');
}
function drawScores() {
  const pw = Math.min(W - 24, 420), ph = Math.min(L.bot - L.top - 10, 640), px = (W - pw) / 2, py = L.top + (L.bot - L.top - ph) / 2;
  panel(px, py, pw, ph, '#00E5FF');
  wobblyWord('BEST SCORES', W / 2, py + 38, Math.min(34, pw / 9), T, 1, COLORS, pw * 0.9);
  const list = scores.slice().sort((a, b) => b[sortKey] - a[sortKey]);
  const rowH = Math.min(34, (ph - 170) / 11), y0 = py + 82, fs = rowH * 0.55;
  const cols = [px + pw * 0.07, px + pw * 0.17, px + pw * 0.6, px + pw * 0.78, px + pw * 0.93];
  ['#', 'NAME', 'CASH', 'POPS', 'LV'].forEach((h, i) => txt(h + (['', '', 's', 'l', 'lv'][i] === sortKey ? '*' : ''), cols[i], y0, fs * 0.8, '#ffe23d', null, i >= 2 ? 'right' : 'left'));
  if (!list.length) fitTxt('No scores yet. Go make history!', W / 2, y0 + rowH * 3, 18, pw * 0.9, '#fff', null);
  list.forEach((s, i) => {
    const y = y0 + rowH * (i + 1), col = i === 0 ? '#ffd91a' : i === 1 ? '#d9e2ff' : i === 2 ? '#ff9a4d' : '#ffffff';
    if (i % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(px + 10, y - rowH / 2, pw - 20, rowH); }
    txt(String(i + 1), cols[0], y, fs, col, null, 'left', NFONT);
    txt(s.n, cols[1], y, fs, col, null, 'left', NFONT);
    txt(money(s.s), cols[2], y, fs, i < 3 ? col : '#7dffb0', null, 'right', NFONT);
    txt(String(s.l), cols[3], y, fs, col, null, 'right', NFONT);
    txt(String(s.lv), cols[4], y, fs, col, null, 'right', NFONT);
  });
  const bh = Math.min(50, H * 0.06), byy = py + ph - bh * 0.8 - 8, bw = (pw - 48) / 3;
  if (confirmReset) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(px, py, pw, ph);
    wobblyWord('Are you SURE?', W / 2, py + ph * 0.4, Math.min(36, pw / 9), T * 1.6, 0, ['#ff4050', '#ffe23d'], pw * 0.9);
    fitTxt('This deletes every glorious score. Forever.', W / 2, py + ph * 0.4 + 44, 15, pw * 0.9, '#fff', null);
    button('resetYes', W / 2 - pw * 0.22, py + ph * 0.62, pw * 0.38, bh, 'YES, WIPE IT', '#ff4050');
    button('resetNo', W / 2 + pw * 0.22, py + ph * 0.62, pw * 0.38, bh, 'NO WAIT!', TEAL);
  } else {
    button('back', px + 16 + bw / 2, byy, bw, bh, 'BACK', TEAL);
    button('sort', W / 2, byy, bw, bh, 'SORT: ' + { s: 'CASH', l: 'POPS', lv: 'LEVEL' }[sortKey], OCEAN);
    button('reset', px + pw - 16 - bw / 2, byy, bw, bh, 'RESET', AQUA);
  }
}
function drawHowto() {
  const pw = Math.min(W - 24, 440), ph = Math.min(L.bot - L.top - 10, 640), px = (W - pw) / 2, py = L.top + (L.bot - L.top - ph) / 2;
  panel(px, py, pw, ph, '#1DE9B6');
  wobblyWord('HOW TO PLAY', W / 2, py + 36, Math.min(34, pw / 9), T, 3, COLORS, pw * 0.9);
  // color swatches with their symbols
  const sw = Math.min(34, pw / 9), sy = py + 72;
  for (let i = 0; i < 5; i++) drawBlock(i, W / 2 + (i - 2.5) * (sw + 8) + 4, sy - sw / 2, sw);
  const lines = [
    ['MATCH 4+', 'touching blocks of one color POP!'], ['CHAINS', 'falling blocks that match: x2, x3...'],
    ['8+ GROUP', 'MEGA POP! huge points'], ['TAP', 'rotate (O piece spins its colors)'],
    ['SWIPE \u2190 \u2192', 'move (keep dragging to slide)'], ['SWIPE \u2193', 'soft drop, FLICK \u2193 = hard drop'],
    ['KEYS', '\u2190\u2192 move, \u2191/X/Z rotate, SPACE drop'], ['STAGES', 'every 150 pops, each adds a twist:'],
    ['', 'rainbow, girders, storm rock, warps, dim,'], ['', 'ice, conveyor, fog... then the VAMPIRE!'], ['STORE', 'cash is banked: buy power-ups & looks'],
  ];
  const top = sy + sw / 2 + 18, rowH = Math.min(38, (ph - (top - py) - 80) / lines.length), fs = Math.min(16, pw / 25);
  lines.forEach(([a, b], i) => {
    const y = top + i * rowH + rowH / 2;
    if (a) fitTxt(a, px + pw * 0.05, y, fs, pw * 0.3, '#ffe23d', null, 'left');
    fitTxt(b, px + pw * 0.36, y, fs, pw * 0.6, '#fff', null, 'left');
  });
  const bh = Math.min(52, H * 0.065);
  button('back', W / 2, py + ph - bh * 0.8 - 14, Math.min(220, pw * 0.6), bh, 'GOT IT!', DEEP);
  fitTxt(COPYRIGHT, W / 2, py + ph - 10, 10, pw * 0.92, 'rgba(255,255,255,0.7)', null);
}
function drawPreview(q, cx, cy, cs, alpha) {
  if (!q) return;
  const c = ROT[q.t][0];
  let mnx = 9, mxx = -9, mny = 9, mxy = -9;
  for (const [x, y] of c) { mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y); }
  const ox = cx - (mxx - mnx + 1) * cs / 2, oy = cy - (mxy - mny + 1) * cs / 2;
  ctx.globalAlpha = alpha || 1;
  c.forEach(([x, y], i) => drawBlock(spr(q.cols[i]), ox + (x - mnx) * cs, oy + (y - mny) * cs, cs));
  ctx.globalAlpha = 1;
}
function drawBoard() {
  const c = L.cell, bx = L.bx, by = L.by, bw = c * COLS, bh = c * VIS, st = STAGES[g.stage];
  ctx.fillStyle = 'rgba(5,0,20,0.66)'; ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 1; x < COLS; x++) { ctx.moveTo(bx + x * c + 0.5, by); ctx.lineTo(bx + x * c + 0.5, by + bh); }
  for (let y = 1; y < VIS; y++) { ctx.moveTo(bx, by + y * c + 0.5); ctx.lineTo(bx + bw, by + y * c + 0.5); }
  ctx.stroke();
  ctx.save(); ctx.shadowColor = st.c1; ctx.shadowBlur = 16; ctx.strokeStyle = st.c1; ctx.lineWidth = 3;
  ctx.strokeRect(bx - 2, by - 2, bw + 4, bh + 4); ctx.restore();
  if (!g.board.length) return;
  ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
  const res = g.res, fallK = res && res.phase === 'fall' ? Math.min(1, res.t / res.dur) : 1, popK = res && res.phase === 'pop' ? res.t / res.dur : -1;
  const gl = g.glitch;
  if (g.stage === 7 && state === 'play') drawConveyor(bx, by, c, bw);
  const convK = g.stage === 7 ? Math.min(1, (g.time - g.convAt) / 0.22) : 1, fogOn = !!g.fog;
  for (let y = HID - 1; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const v = g.board[y][x]; if (!v) continue;
      const k = y * COLS + x;
      let sx = bx + x * c, sy = by + (y - HID) * c;
      if (fallK < 1 && g.fallOff[k]) sy -= g.fallOff[k] * c * (1 - fallK * fallK);
      if (convK < 1 && y === CONV_ROW) sx -= (g.convLast || 1) * c * (1 - convK) * (1 - convK);
      if (fogOn && fogHides(x, y) && !(popK >= 0 && g.popMask[k])) { drawBlock(27, sx, sy, c); continue; }
      if (popK >= 0 && g.popMask[k]) {
        const s = c * (1 + 0.25 * Math.sin(popK * Math.PI) - popK * 0.9);
        drawBlock(Math.floor(popK * 14) % 2 ? 8 : spr(v), sx + (c - s) / 2, sy + (c - s) / 2, Math.max(1, s));
        continue;
      }
      let si = spr(v);
      if (gl && gl.cells.indexOf(k) >= 0) { // gravity distortion: cell wobbles in a purple swirl, then flickers between colors
        const wv = Math.sin(T * 28 + k) * gl.t * 3; sx += wv; sy += Math.cos(T * 24 + k) * gl.t * 2;
        if (gl.t > 0.6 && Math.sin(T * 45) > 0) si = Math.floor(T * 20) % nColors();
        ctx.strokeStyle = 'rgba(199,125,255,' + (0.4 + 0.4 * Math.sin(T * 20)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx + c / 2, sy + c / 2, c * (0.55 + 0.25 * Math.sin(T * 12 + k)), T * 6, T * 6 + 4.5); ctx.stroke();
      }
      const age = g.time - g.anim[k];
      if (age >= 0 && age < 0.22) { // squash on landing
        const kk = age / 0.22, sq = Math.sin(kk * Math.PI) * (1 - kk);
        const hh = c * (1 - 0.3 * sq), ww = c * (1 + 0.18 * sq);
        ctx.drawImage(sprites[si], sx - (ww - c) / 2, sy + c - hh, ww, hh);
      } else drawBlock(si, sx, sy, c);
    }
  }
  if (g.fog) drawFogCloud(bx, by, c);
  if (g.boss && state !== 'won') drawBossBar(bx, by, c, bw);
  if (g.warn) { // storm surge warning glow
    const a = 0.25 + 0.25 * Math.sin(T * 14);
    const gr = ctx.createLinearGradient(0, by + bh - c * 2.5, 0, by + bh); gr.addColorStop(0, 'rgba(150,100,255,0)'); gr.addColorStop(1, 'rgba(150,100,255,' + (a + 0.3) + ')');
    ctx.fillStyle = gr; ctx.fillRect(bx, by + bh - c * 2.5, bw, c * 2.5);
    txt('STORM SURGE!', bx + bw / 2, by + bh - c * 0.9, c * 0.75, '#3dffd8', '#1a0638');
  }
  const p = g.piece;
  if (p && state === 'play') {
    const cells = ROT[p.t][p.r];
    if (!g.res) {
      const gy = ghostY();
      ctx.globalAlpha = 0.25;
      cells.forEach(([cx, cy], i) => drawBlock(spr(p.cols[i]), bx + (p.x + cx) * c, by + (gy + cy - HID) * c, c));
      ctx.globalAlpha = 0.85; ctx.lineWidth = 2;
      cells.forEach(([cx, cy], i) => { ctx.strokeStyle = cellColor(p.cols[i]); ctx.strokeRect(bx + (p.x + cx) * c + 2, by + (gy + cy - HID) * c + 2, c - 4, c - 4); });
      ctx.globalAlpha = 1;
    }
    const wob = g.wob || 0, lockK = !g.res && grounded() ? g.lock / LOCK_T : 0;
    cells.forEach(([cx, cy], i) => {
      const sx = bx + (p.x + cx) * c, sy = by + (p.y + cy - HID) * c, s = c * (1 + wob * 0.12);
      drawBlock(spr(p.cols[i]), sx - (s - c) / 2, sy - (s - c) / 2, s);
      if (lockK > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * lockK * (0.5 + 0.5 * Math.sin(T * 30))) + ')'; ctx.fillRect(sx, sy, c, c); }
    });
  }
  drawWipe();
  ctx.restore();
}
function drawHUD() {
  const st = STAGES[g.stage], y0 = L.top, h = L.hudH;
  txt('CASH', L.bx, y0 + h * 0.18, Math.max(11, h * 0.2), 'rgba(255,255,255,0.9)', 'rgba(0,0,0,0.55)', 'left');
  const sc = 1 + g.pop * 0.3;
  ctx.save(); ctx.translate(L.bx, y0 + h * 0.62); ctx.scale(sc, sc);
  txt(money(g.disp), 0, 0, h * 0.5, g.pop > 0.05 ? '#ffd23d' : '#5dff9a', '#062a12', 'left', NFONT);
  ctx.restore();
  const ps = Math.min(44, h - 8), pxp = L.right - ps / 2;
  if (state === 'play' && !paused) {
    button('pause', pxp, y0 + h / 2, ps, ps, '', ['rgba(0,229,255,0.35)', 'rgba(41,121,255,0.35)'], { icon: 'pause', r: 10, glow: false });
    button('pu', pxp - ps - 6, y0 + h / 2, ps, ps, '', ['rgba(255,210,63,0.55)', 'rgba(255,138,31,0.45)'], { icon: 'bolt', r: 10, glow: false });
    const inv = wallet.inv.wipe + wallet.inv.bomb; if (inv) { ctx.fillStyle = '#ff4050'; ctx.beginPath(); ctx.arc(pxp - ps / 2 - 4, y0 + h / 2 - ps / 2 + 4, 8, 0, 7); ctx.fill(); txt(String(inv), pxp - ps / 2 - 4, y0 + h / 2 - ps / 2 + 5, 10, '#fff', null, 'center', NFONT); }
  }
  const rx = pxp - ps * 1.5 - 14;
  txt('STAGE ' + (g.stage + 1), rx, y0 + h * 0.28, Math.max(11, h * 0.2), 'rgba(255,255,255,0.9)', 'rgba(0,0,0,0.55)', 'right');
  fitTxt(st.name, rx, y0 + h * 0.66, h * 0.3, Math.max(60, rx - L.bx - h * 2.6), st.c1, '#000', 'right');
}
function drawSide() {
  const c = L.cell, x = L.sx, w = L.sw, st = STAGES[g.stage];
  let y = L.by;
  rr(x, y, w, c * 6.1, 12); ctx.fillStyle = 'rgba(5,0,20,0.66)'; ctx.fill(); ctx.strokeStyle = st.c1; ctx.lineWidth = 2; ctx.stroke();
  txt('NEXT', x + w / 2, y + c * 0.55, c * 0.5, '#fff', null);
  drawPreview(g.queue[0], x + w / 2, y + c * 1.9, c * 0.72);
  drawPreview(g.queue[1], x + w / 2, y + c * 3.55, c * 0.5, 0.8);
  drawPreview(g.queue[2], x + w / 2, y + c * 4.95, c * 0.42, 0.6);
  y += c * 6.8;
  { const sh = c * 1.75 * 3 + c * 1.6 + (g.maxChain >= 2 ? c * 1.5 : 0) + c * 0.1; rr(x, y - c * 0.15, w, sh, 12); ctx.fillStyle = 'rgba(5,0,20,0.42)'; ctx.fill(); }
  for (const [lab, val, col] of [['LEVEL', g.level, st.c2], ['POPPED', g.popped, '#fff'], ['BEST', best(), '#ffe23d']]) {
    txt(lab, x + w / 2, y + c * 0.35, c * 0.42, 'rgba(255,255,255,0.7)', null);
    fitTxt(lab === 'BEST' ? money(val) : fmt(val), x + w / 2, y + c * 1.0, c * 0.72, w, col, '#1a0530', 'center', NFONT);
    y += c * 1.75;
  }
  if (g.stage < LAST_STAGE) { // progress to next stage
    const k = (g.popped % STAGE_POPS) / STAGE_POPS;
    txt(g.stage === LAST_STAGE - 1 ? 'TO THE BOSS' : 'NEXT STAGE', x + w / 2, y + c * 0.35, c * 0.38, 'rgba(255,255,255,0.7)', null);
    rr(x + 2, y + c * 0.7, w - 4, c * 0.5, c * 0.25); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    rr(x + 2, y + c * 0.7, Math.max(c * 0.5, (w - 4) * k), c * 0.5, c * 0.25); ctx.fillStyle = st.c1; ctx.fill();
    y += c * 1.6;
  } else if (g.boss) {
    txt('FINAL BOSS', x + w / 2, y + c * 0.35, c * 0.4, '#ff6b81', null);
    fitTxt(Math.ceil(100 * g.boss.hp / g.boss.max) + '% HP', x + w / 2, y + c * 1.0, c * 0.6, w, '#ffd0d8', '#2a0010', 'center', NFONT);
    y += c * 1.6;
  }
  if (g.maxChain >= 2) { txt('BEST CHAIN', x + w / 2, y + c * 0.35, c * 0.38, 'rgba(255,255,255,0.7)', null); txt('x' + g.maxChain, x + w / 2, y + c, c * 0.72, '#2bf0ff', '#1a0530', 'center', NFONT); }
  if (g.boss && state !== 'won') { const vp = vampPos(); drawVampire(vp.x, vp.y, vp.s, g.boss); }
}
// ---- stage 8-10 overlays
function drawConveyor(bx, by, c, bw) {
  const y = by + (CONV_ROW - HID) * c, dir = g.convDir, warn = g.convWarn, run = warn || (g.time - g.convAt < 0.3);
  ctx.fillStyle = 'rgba(60,40,20,0.75)'; ctx.fillRect(bx, y, bw, c);
  ctx.fillStyle = 'rgba(255,180,70,0.5)'; ctx.fillRect(bx, y, bw, 2); ctx.fillRect(bx, y + c - 2, bw, 2);
  const off = ((g.time * (run ? 3 : 0.4) * dir) % 1 + 1) % 1, a = warn ? 0.45 + 0.45 * Math.sin(T * 18) : 0.22;
  ctx.strokeStyle = 'rgba(255,190,80,' + a + ')'; ctx.lineWidth = Math.max(2, c * 0.12); ctx.beginPath();
  for (let k = -1; k <= COLS; k++) { const cx = bx + (k + off) * c + c / 2; ctx.moveTo(cx - dir * c * 0.18, y + c * 0.25); ctx.lineTo(cx + dir * c * 0.12, y + c * 0.5); ctx.lineTo(cx - dir * c * 0.18, y + c * 0.75); }
  ctx.stroke();
  if (warn) txt(dir > 0 ? 'SLIDING \u2192' : '\u2190 SLIDING', bx + bw / 2, y - c * 0.55, c * 0.55, '#ffb347', '#2a1500');
}
function drawFogCloud(bx, by, c) {
  const f = g.fog, k = fogK(), puff = puffSpr(); if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = 0.75 * k;
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28 + T * 0.4, rr2 = f.r * c * (0.55 + 0.25 * Math.sin(T * 1.3 + i)), px = bx + f.x * c + Math.cos(a) * rr2 * 0.6, py = by + (f.y - HID) * c + Math.sin(a) * rr2 * 0.45, r = f.r * c * (0.9 + 0.2 * Math.sin(T + i * 2)); ctx.drawImage(puff, px - r, py - r, r * 2, r * 2); }
  ctx.globalAlpha = 0.5 * k; ctx.fillStyle = 'rgba(160,255,120,0.9)'; const ex = bx + f.x * c, ey = by + (f.y - HID) * c;
  if (Math.sin(T * 2.3) > -0.6) { ctx.beginPath(); ctx.arc(ex - c * 0.3, ey, c * 0.09, 0, 7); ctx.arc(ex + c * 0.3, ey, c * 0.09, 0, 7); ctx.fill(); } // spooky eyes in the fog
  ctx.restore();
}
function drawBossBar(bx, by, c, bw) {
  const b = g.boss, h = Math.max(14, c * 0.62), sh = b.hit > 0 ? Math.sin(T * 60) * b.hit * 6 : 0, x = bx + c * 0.25 + sh, y = by + c * 0.18, w = bw - c * 0.5;
  rr(x, y, w, h, h / 2); ctx.fillStyle = 'rgba(10,0,5,0.96)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = b.hp < b.max * 0.35 ? (Math.sin(T * 10) > 0 ? '#ff3355' : '#ffd23d') : '#ff3355'; ctx.stroke();
  const ip = h + 2, iw = w - ip - 3, kd = Math.max(0, b.disp / b.max), kh = Math.max(0, b.hp / b.max);
  rr(x + ip, y + 3, iw, h - 6, (h - 6) / 2); ctx.fillStyle = 'rgba(255,60,90,0.10)'; ctx.fill();
  if (kd > kh) { rr(x + ip, y + 3, Math.max(4, iw * kd), h - 6, (h - 6) / 2); ctx.fillStyle = '#ffffff'; ctx.fill(); } // white damage trail
  if (kh > 0) { rr(x + ip, y + 3, Math.max(4, iw * kh), h - 6, (h - 6) / 2); const gr = ctx.createLinearGradient(x + ip, 0, x + ip + Math.max(4, iw * kh), 0); gr.addColorStop(0, '#c0102f'); gr.addColorStop(0.7, '#ff2a4f'); gr.addColorStop(1, '#ff8fa0'); ctx.fillStyle = gr; ctx.fill(); }
  ctx.save(); ctx.translate(x + h / 2 + 1, y + h / 2); batPath(ctx, h * 0.42, 0.5 + 0.5 * Math.sin(T * 12)); ctx.fillStyle = '#ff3355'; ctx.fill(); ctx.restore();
  fitTxt('COUNT BLOCKULA', x + ip + iw / 2, y + h / 2 + 1, h * 0.62, iw * 0.92, '#ffffff', '#3a0010', 'center', NFONT);
  if (b.warn) { const a = 0.6 + 0.4 * Math.sin(T * 16); ctx.globalAlpha = a; txt('BATS INCOMING!', bx + bw / 2, y + h + c * 0.65, c * 0.6, '#ff6b81', '#2a0010'); ctx.globalAlpha = 1; }
}
function drawVampire(cx, cy, s, b) {
  const hit = b.hit > 0, laugh = b.laugh > 0, low = b.hp < b.max * 0.35, bob = laugh ? Math.abs(Math.sin(T * 14)) * s * 0.08 : Math.sin(T * 1.6) * s * 0.03;
  ctx.save(); ctx.translate(cx + (hit ? Math.sin(T * 70) * s * 0.06 : 0), cy - bob);
  ctx.globalCompositeOperation = 'lighter'; glowAt('rgba(255,40,80,1)', 0, 0, s * 1.5, low ? 0.45 + 0.2 * Math.sin(T * 8) : 0.3); ctx.globalCompositeOperation = 'source-over';
  // high cape collar
  ctx.fillStyle = '#1a0010'; ctx.beginPath(); ctx.moveTo(-s * 0.95, s * 0.9); ctx.lineTo(-s * 0.85, -s * 0.15); ctx.lineTo(-s * 0.55, s * 0.25); ctx.lineTo(0, s * 0.55); ctx.lineTo(s * 0.55, s * 0.25); ctx.lineTo(s * 0.85, -s * 0.15); ctx.lineTo(s * 0.95, s * 0.9); ctx.fill();
  ctx.fillStyle = '#9a0f2a'; ctx.beginPath(); ctx.moveTo(-s * 0.8, s * 0.9); ctx.lineTo(-s * 0.72, s * 0.02); ctx.lineTo(-s * 0.4, s * 0.4); ctx.lineTo(0, s * 0.62); ctx.lineTo(s * 0.4, s * 0.4); ctx.lineTo(s * 0.72, s * 0.02); ctx.lineTo(s * 0.8, s * 0.9); ctx.fill();
  // ears, face, hair
  ctx.fillStyle = hit ? '#ffd0d8' : '#d9d4ea';
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * s * 0.38, -s * 0.1); ctx.lineTo(sd * s * 0.62, -s * 0.42); ctx.lineTo(sd * s * 0.42, s * 0.12); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(0, 0, s * 0.42, s * 0.55, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#0a0006'; ctx.beginPath(); ctx.moveTo(-s * 0.44, -s * 0.1); ctx.quadraticCurveTo(-s * 0.46, -s * 0.62, 0, -s * 0.62); ctx.quadraticCurveTo(s * 0.46, -s * 0.62, s * 0.44, -s * 0.1); ctx.lineTo(s * 0.3, -s * 0.36); ctx.lineTo(0, -s * 0.18); ctx.lineTo(-s * 0.3, -s * 0.36); ctx.closePath(); ctx.fill();
  // brows + eyes
  ctx.strokeStyle = '#0a0006'; ctx.lineWidth = Math.max(1.5, s * 0.07); ctx.lineCap = 'round';
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * s * 0.06, -s * 0.12); ctx.lineTo(sd * s * 0.3, -s * (laugh ? 0.26 : 0.2)); ctx.stroke(); }
  const blink = !hit && (T % 3.7) < 0.12;
  for (const sd of [-1, 1]) {
    const ex = sd * s * 0.17, ey = -s * 0.03;
    if (hit) { ctx.beginPath(); ctx.moveTo(ex - s * 0.07, ey - s * 0.07); ctx.lineTo(ex + s * 0.07, ey + s * 0.07); ctx.moveTo(ex + s * 0.07, ey - s * 0.07); ctx.lineTo(ex - s * 0.07, ey + s * 0.07); ctx.stroke(); continue; }
    ctx.globalCompositeOperation = 'lighter'; glowAt('rgba(255,30,60,1)', ex, ey, s * 0.2, 0.6); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ff1a40'; ctx.beginPath(); ctx.ellipse(ex, ey, s * 0.08, blink ? s * 0.01 : s * 0.06, 0, 0, 7); ctx.fill();
  }
  ctx.lineCap = 'butt';
  // mouth: smug smirk, wide open while laughing
  if (laugh) {
    ctx.fillStyle = '#3a0010'; ctx.beginPath(); ctx.ellipse(0, s * 0.27, s * 0.2, s * 0.13 + Math.abs(Math.sin(T * 14)) * s * 0.05, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffffff'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * s * 0.12, s * 0.16); ctx.lineTo(sd * s * 0.08, s * 0.3); ctx.lineTo(sd * s * 0.04, s * 0.16); ctx.fill(); }
  } else {
    ctx.strokeStyle = '#3a0010'; ctx.lineWidth = Math.max(1.2, s * 0.05); ctx.beginPath(); ctx.moveTo(-s * 0.18, s * 0.24); ctx.quadraticCurveTo(0, s * (hit ? 0.2 : 0.32), s * 0.2, s * 0.2); ctx.stroke();
    ctx.fillStyle = '#ffffff'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * s * 0.1, s * 0.25); ctx.lineTo(sd * s * 0.07, s * 0.36); ctx.lineTo(sd * s * 0.04, s * 0.26); ctx.fill(); }
  }
  if (low && !laugh) { ctx.fillStyle = 'rgba(140,220,255,0.9)'; const dy = (T * 0.8 % 1) * s * 0.3; ctx.beginPath(); ctx.ellipse(s * 0.36, -s * 0.2 + dy, s * 0.04, s * 0.07, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawBatsInFlight() {
  if (!g.bats || !g.bats.length) return;
  const c = L.cell;
  for (const bt of g.bats) {
    if (bt.t < 0) continue;
    const k = Math.min(1, bt.t / bt.d); let ty = ROWS - 1; while (ty >= 0 && g.board[ty][bt.col]) ty--;
    const [tx, tyy] = cellXY(bt.col, Math.max(HID, ty)), ex = tx + c / 2, ey = tyy + c / 2, mx = (bt.x0 + ex) / 2, my = Math.min(bt.y0, ey) - c * 4;
    const x = (1 - k) * (1 - k) * bt.x0 + 2 * (1 - k) * k * mx + k * k * ex, y = (1 - k) * (1 - k) * bt.y0 + 2 * (1 - k) * k * my + k * k * ey;
    ctx.save(); ctx.translate(x, y); ctx.scale(ex < bt.x0 ? -1 : 1, 1); batPath(ctx, c * 0.55, 0.5 + 0.5 * Math.sin(T * 22 + bt.col)); ctx.fillStyle = '#12000a'; ctx.fill(); ctx.strokeStyle = '#ff3355'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#ff3355'; ctx.fillRect(-c * 0.08, -c * 0.06, c * 0.05, c * 0.05); ctx.fillRect(c * 0.03, -c * 0.06, c * 0.05, c * 0.05); ctx.restore();
    ctx.strokeStyle = 'rgba(230,230,240,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + c * 0.2); ctx.lineTo(x, y + c * 0.55); ctx.stroke();
    drawBlock(25, x - c * 0.25, y + c * 0.5, c * 0.5);
  }
}
function drawControls() {
  if (!settings.buttons || state !== 'play' || paused) return;
  const n = 5, aw = L.right - L.left, w = Math.min(aw / n - 10, 92), h = L.ctrlH - 6, y = L.bot - L.ctrlH / 2;
  const defs = [['c_left', 'left', TEAL], ['c_right', 'right', TEAL], ['c_hard', 'hard', OCEAN], ['c_down', 'down', AQUA], ['c_rot', 'rot', DEEP]];
  defs.forEach(([id, ic, col], i) => button(id, L.left + aw * (i + 0.5) / n, y, w, h, '', col, { icon: ic, alpha: 0.9, glow: false }));
}
function drawBannerUI() {
  if (!banner) return;
  const b = banner, k = b.t / b.d, tw = b.twist;
  let x = W / 2;
  if (k < 0.12) x = lerp(-W * 0.6, W / 2, easeOutBack(k / 0.12));
  else if (k > 0.88) x = lerp(W / 2, W * 1.6, (k - 0.88) / 0.12);
  const y = L.by + L.cell * VIS * 0.32, s = Math.min(W * 0.11, 52), h2 = tw ? s * 1.9 : s * 1.25;
  ctx.save(); ctx.globalAlpha = k > 0.88 ? 1 - (k - 0.88) / 0.12 : 1;
  ctx.fillStyle = 'rgba(0,0,0,0.66)'; ctx.beginPath();
  ctx.moveTo(0, y - s * 1.0); ctx.lineTo(W, y - s * 1.25); ctx.lineTo(W, y + h2 - s * 0.25); ctx.lineTo(0, y + h2); ctx.fill();
  ctx.translate(x, y); ctx.rotate(-0.04);
  fitTxt(b.title, 0, -s * 0.3, s, W * 0.9, b.color, '#000');
  fitTxt(b.sub, 0, s * 0.55, s * 0.55, W * 0.9, '#fff', '#000');
  if (tw) { // twist intro card
    const is = s * 0.6;
    drawBlock(spr(tw.icon), -W * 0.42, s * 1.12 - is / 2, is);
    fitTxt(tw.text, is * 0.6, s * 1.12, s * 0.36, W * 0.72, '#ffe23d', '#000');
  }
  ctx.restore();
}
function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
  const pw = Math.min(W - 40, 340), bh = Math.min(54, H * 0.065), gap = bh * 0.3, ph = bh * 5 + gap * 4 + 172;
  const px = (W - pw) / 2, py = (H - ph) / 2;
  panel(px, py, pw, ph, STAGES[g.stage].c1);
  wobblyWord('PAUSED', W / 2, py + 44, Math.min(44, pw / 6), T, 0, COLORS, pw * 0.9);
  fitTxt('Go grab a snack. The blocks will wait.', W / 2, py + 88, 15, pw * 0.9, '#ffe23d', null);
  const items = [['resume', 'RESUME', DEEP], ['restart', 'RESTART', TEAL], ['music', 'MUSIC: ' + (settings.music ? 'ON' : 'OFF'), AQUA],
    ['buttons', 'BUTTONS: ' + (settings.buttons ? 'ON' : 'OFF'), OCEAN], ['menu', 'MAIN MENU', TEAL]];
  items.forEach(([id, l, col], i) => button(id, W / 2, py + 120 + i * (bh + gap) + bh / 2, pw * 0.8, bh, l, col));
  fitTxt(COPYRIGHT, W / 2, py + ph - 16, 11, pw * 0.9, 'rgba(255,255,255,0.75)', null);
}
function drawEntry() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  const pw = Math.min(W - 30, 380), ph = Math.min(H - 40, 460), px = (W - pw) / 2, py = (H - ph) / 2;
  panel(px, py, pw, ph, '#1DE9B6');
  wobblyWord('NEW HIGH SCORE!', W / 2, py + 44, Math.min(34, pw / 10), T * 1.5, 0, COLORS, pw * 0.92);
  txt(money(g.score), W / 2, py + 98, Math.min(44, pw / 7), '#5dff9a', '#062a12', 'center', NFONT);
  drawBanked(W / 2, py + 128, false);
  txt('ENTER YOUR INITIALS', W / 2, py + 168, 15, '#fff', null);
  const sw = Math.min(64, pw / 4.6), cy = py + 262;
  for (let i = 0; i < 3; i++) {
    const x = W / 2 + (i - 1) * (sw + 14);
    button('up' + i, x, cy - sw * 1.0, sw, sw * 0.55, '', TEAL, { icon: 'up', r: 8 });
    rr(x - sw / 2, cy - sw * 0.6, sw, sw * 1.2, 10); ctx.fillStyle = i === entSel ? '#063a4a' : '#03202e'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = i === entSel ? '#ffe23d' : '#1DE9B6'; ctx.stroke();
    txt(String.fromCharCode(ent[i]), x, cy + 2, sw * 0.8, '#fff', '#000', 'center', NFONT);
    button('dn' + i, x, cy + sw * 1.0, sw, sw * 0.55, '', AQUA, { icon: 'down', r: 8 });
  }
  button('ok', W / 2, py + ph - 44, pw * 0.5, Math.min(54, H * 0.065), 'OK!', DEEP);
}
function drawOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  const pw = Math.min(W - 30, 380), ph = Math.min(H - 40, 470), px = (W - pw) / 2, py = (H - ph) / 2, k = Math.min(1, overT / 0.35);
  const e = easeOutBack(k);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(e, e); ctx.translate(-W / 2, -H / 2);
  panel(px, py, pw, ph, '#ff4050');
  wobblyWord('GAME OVER', W / 2, py + 48, Math.min(46, pw / 7), T * 1.3, 0, ['#ff4050', '#ff8c1a', '#ffd91a'], pw * 0.9);
  fitTxt(overJoke, W / 2, py + 96, 16, pw * 0.9, '#fff', null);
  txt(money(g.score), W / 2, py + 150, Math.min(48, pw / 7), '#5dff9a', '#062a12', 'center', NFONT);
  txt('POPPED ' + g.popped + '   \u00b7   CHAIN x' + g.maxChain, W / 2, py + 196, 16, 'rgba(255,255,255,0.8)', null);
  if (rankNew) txt('#' + rankNew + ' ON THE BOARD!', W / 2, py + 226, 20, '#2bf0ff', '#000');
  ctx.restore();
  if (k >= 1) drawBanked(W / 2, py + 262, true);
  // buttons drawn unscaled so hit boxes match
  if (k >= 1) {
    const bh = Math.min(54, H * 0.065);
    button('again', W / 2, py + ph - bh * 2 - 22, pw * 0.7, bh, 'PLAY AGAIN', DEEP);
    button('menu', W / 2, py + ph - bh * 0.5 - 14, pw * 0.7, bh, 'MENU', OCEAN);
  }
}
function drawWin() {
  ctx.fillStyle = 'rgba(10,0,6,0.55)'; ctx.fillRect(0, 0, W, H);
  const pw = Math.min(W - 30, 380), ph = Math.min(H - 40, 500), px = (W - pw) / 2, py = (H - ph) / 2, k = Math.min(1, overT / 0.45), e = easeOutBack(k);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(e, e); ctx.translate(-W / 2, -H / 2);
  panel(px, py, pw, ph, '#ffd23d');
  wobblyWord('YOU WIN!', W / 2, py + 50, Math.min(50, pw / 6), T * 1.3, 0, GOLD.concat(['#ffffff']), pw * 0.9);
  fitTxt('Count Blockula is toast. Happy Halloween!', W / 2, py + 98, 16, pw * 0.9, '#ffd0d8', null);
  for (let i = 0; i < 5; i++) { const bx = W / 2 + (i - 2) * 34, by = py + 128 + Math.sin(T * 4 + i) * 5; ctx.save(); ctx.translate(bx, by); batPath(ctx, 12, 0.5 + 0.5 * Math.sin(T * 16 + i)); ctx.fillStyle = '#2a0614'; ctx.fill(); ctx.restore(); }
  txt(money(g.score), W / 2, py + 172, Math.min(48, pw / 7), '#5dff9a', '#062a12', 'center', NFONT);
  txt('INCLUDES ' + money(g.winBonus || WIN_BONUS) + ' VICTORY BONUS', W / 2, py + 208, 14, '#ffd23d', '#3a1a00', 'center', NFONT);
  txt('POPPED ' + g.popped + '   \u00b7   CHAIN x' + g.maxChain, W / 2, py + 232, 15, 'rgba(255,255,255,0.8)', null);
  if (rankNew) txt('#' + rankNew + ' ON THE BOARD!', W / 2, py + 260, 20, '#2bf0ff', '#000');
  ctx.restore();
  if (k >= 1) drawBanked(W / 2, py + 296, true);
  const ready = g.saved || !qualifies(g.score) ? overT > 1.2 : false;
  if (ready) {
    const bh = Math.min(54, H * 0.065);
    button('again', W / 2, py + ph - bh * 2 - 22, pw * 0.7, bh, 'PLAY AGAIN', DEEP);
    button('menu', W / 2, py + ph - bh * 0.5 - 14, pw * 0.7, bh, 'MENU', OCEAN);
  } else if (k >= 1) fitTxt('NEW HIGH SCORE INCOMING...', W / 2, py + ph - 40, 16, pw * 0.9, '#ffe23d', '#000');
}

// ---------------------------------------------------------------- store UI, quick power-up menu, power-ups
const GREY = ['#4a6572', '#2c3e50'], GOLD = ['#ffe066', '#ffb703', '#ff8a1f'];
function walletPill(x, y, align, h) {
  h = h || 30; const s = money(wallet.cash);
  ctx.font = font(h * 0.55, NFONT); const w = ctx.measureText(s).width + h * 1.5;
  const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  rr(x0, y - h / 2, w, h, h / 2); ctx.fillStyle = 'rgba(0,30,15,0.75)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#5dff9a'; ctx.stroke();
  ctx.fillStyle = '#ffd23d'; ctx.beginPath(); ctx.arc(x0 + h * 0.52, y, h * 0.32, 0, 7); ctx.fill(); ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.5; ctx.stroke();
  txt('$', x0 + h * 0.52, y + 1, h * 0.42, '#8a5a00', null, 'center', NFONT);
  txt(s, x0 + h * 0.98, y + 1, h * 0.55, '#5dff9a', '#062a12', 'left', NFONT);
  return { x: x0, w };
}
function puIcon(id, cx, cy, s) {
  if (id === 'bomb') { ctx.drawImage(sprites[9], cx - s / 2, cy - s / 2, s, s); return; }
  rr(cx - s / 2, cy - s / 2, s, s, s * 0.2); ctx.fillStyle = '#071a2e'; ctx.fill();
  for (let i = 0; i < 4; i++) drawBlock(i, cx - s * 0.42 + i * s * 0.21, cy + s * 0.12, s * 0.2);
  ctx.save(); ctx.shadowColor = '#ff2b6a'; ctx.shadowBlur = 10; ctx.fillStyle = '#ff4d7d'; ctx.fillRect(cx - s * 0.45, cy + s * 0.2, s * 0.9, 3);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + s * 0.1, cy - s * 0.38, 3, s * 0.75); ctx.restore();
}
function shopMsgDraw(x, y) {
  const m = shop.msg; if (!m) return;
  const a = Math.max(0, 1 - m.t / 1.4); ctx.globalAlpha = a;
  fitTxt(m.text, x, y - m.t * 12, m.good ? 16 : 20, W * 0.8, m.good ? '#5dff9a' : '#ff4d6a', '#200008');
  ctx.globalAlpha = 1;
}
function updateShop(dt) {
  if (shop.shake > 0) shop.shake = Math.max(0, shop.shake - dt * 1.6);
  if (shop.msg) { shop.msg.t += dt; if (shop.msg.t > 1.4) shop.msg = null; }
  if (g.bank) g.bank.t += dt;
}
function openStore() {
  state = 'store'; shop.tab = shop.tab || 0; shop.modal = null;
  const need = []; SHOP_BG.forEach((b) => { if (b.bg >= 0 && !shop.thumbs[b.bg] && need.indexOf(b.bg) < 0) need.push(b.bg); });
  shop.thumbQ = need;
}
// render one background thumbnail per frame by drawing it to the main canvas and copying a crop
function renderThumbs() {
  if (state !== 'store' || !shop.thumbQ.length) return;
  const bi = shop.thumbQ.shift(), tw = 150, th = 100, o = document.createElement('canvas');
  o.width = tw * DPR; o.height = th * DPR;
  BGS[bi](T + 2);
  const srcH = cv.width * th / tw, sy = Math.max(0, (cv.height - srcH) * ({ 7: 0.95, 8: 0.6 }[bi] || 0.55));
  o.getContext('2d').drawImage(cv, 0, sy, cv.width, Math.min(srcH, cv.height), 0, 0, o.width, o.height);
  shop.thumbs[bi] = o;
}
function drawStore() {
  const sx = shop.shake > 0 ? Math.sin(T * 70) * 9 * shop.shake : 0;
  const pw = Math.min(W - 12, 470), px = (W - pw) / 2 + sx, top = L.top + 2, bot = L.bot - 2;
  panel(px, top, pw, bot - top, '#00E5FF');
  const hh = Math.min(30, H * 0.045);
  wobblyWord('STORE', px + pw * 0.27, top + hh + 4, Math.min(30, pw / 10), T, 1, LOGO, pw * 0.45);
  walletPill(px + pw - 10, top + hh + 4, 'right', Math.min(30, H * 0.046));
  shopMsgDraw(px + pw * 0.72, top + hh * 2.6);
  const tabs = ['POWER-UPS', 'BACKGROUNDS', 'BLOCK SKINS'], th = Math.min(38, H * 0.058), tw = (pw - 16) / 3, ty = top + hh * 2 + 18;
  tabs.forEach((n, i) => button('tab' + i, px + 8 + tw * i + tw / 2, ty + th / 2, tw - 5, th, n, i === shop.tab ? DEEP : ['rgba(0,229,255,0.28)', 'rgba(41,121,255,0.28)'], { fs: th * 0.36, glow: i === shop.tab, r: 10 }));
  const fh = Math.min(46, H * 0.066), c0 = ty + th + 10, c1 = bot - fh * 2 - 22;
  const ax = px + 10, aw = pw - 20, ah = c1 - c0;
  if (shop.tab === 0) {
    const ch = Math.min(130, ah / 2 - 8);
    PU.forEach((p, i) => {
      const y = c0 + i * (ch + 10);
      rr(ax, y, aw, ch, 14); ctx.fillStyle = 'rgba(0,10,30,0.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(0,229,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
      const is = Math.min(ch * 0.62, aw * 0.24); puIcon(p.id, ax + 12 + is / 2, y + ch / 2, is);
      const tx = ax + 24 + is, tw2 = aw - is - 34;
      fitTxt(p.name, tx, y + ch * 0.2, Math.min(20, ch * 0.18), tw2, '#ffe23d', '#03243a', 'left');
      fitTxt(p.desc, tx, y + ch * 0.42, Math.min(14, ch * 0.12), tw2, '#e0fff7', null, 'left');
      const bw2 = Math.min(150, tw2), bh2 = Math.min(40, ch * 0.3);
      button('buy_' + p.id, tx + bw2 / 2, y + ch - bh2 / 2 - 8, bw2, bh2, 'BUY ' + money(p.price), canAfford(p.price) ? DEEP : GREY, { r: 10 });
      const ow = tw2 - bw2 - 10, oy = y + ch - bh2 / 2 - 8; if (ow > 30) { fitTxt('OWNED', tx + bw2 + 10 + ow / 2, oy - 8, 11, ow, '#7dffe0', null, 'center'); fitTxt('x' + wallet.inv[p.id], tx + bw2 + 10 + ow / 2, oy + 9, 18, ow, '#ffffff', '#03243a', 'center', NFONT); }
      else fitTxt('OWNED: ' + wallet.inv[p.id], ax + aw - 12, y + ch * 0.2, 13, aw * 0.3, '#7dffe0', null, 'right');
    });
    fitTxt('Use power-ups mid-game from the \u26a1 button.', W / 2, c0 + 2 * (ch + 10) + 12, 13, aw, 'rgba(255,255,255,0.75)', null);
  } else if (shop.tab === 1) {
    const cols = SHOP_BG.length > 12 ? 4 : 3, gap = 6, cw = (aw - gap * (cols - 1)) / cols, rows = Math.ceil(SHOP_BG.length / cols), chh = Math.min(150, (ah - gap * (rows - 1)) / rows);
    SHOP_BG.forEach((b, i) => {
      const x = ax + (i % cols) * (cw + gap), y = c0 + Math.floor(i / cols) * (chh + gap), owned = wallet.bgs.indexOf(b.id) >= 0, eq = wallet.bg === b.id;
      rr(x, y, cw, chh, 10); ctx.fillStyle = 'rgba(0,10,30,0.6)'; ctx.fill(); ctx.strokeStyle = eq ? '#ffe23d' : 'rgba(0,229,255,0.5)'; ctx.lineWidth = eq ? 3 : 1.5; ctx.stroke();
      const bh2 = Math.max(26, Math.min(30, chh * 0.22)), nh = Math.min(13, chh * 0.1), tH = chh - bh2 - nh - 16;
      const thumb = shop.thumbs[b.bg >= 0 ? b.bg : 0];
      ctx.save(); rr(x + 4, y + 4, cw - 8, tH, 7); ctx.clip();
      if (thumb) ctx.drawImage(thumb, x + 4, y + 4, cw - 8, tH); else { ctx.fillStyle = '#0a2a3a'; ctx.fillRect(x + 4, y + 4, cw - 8, tH); }
      if (b.id === 'auto') { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x + 4, y + 4, cw - 8, tH); fitTxt('AUTO', x + cw / 2, y + 4 + tH / 2, tH * 0.3, cw * 0.8, '#fff', '#03243a'); fitTxt('per stage', x + cw / 2, y + 4 + tH * 0.75, tH * 0.15, cw * 0.8, '#7dffe0', null); }
      if (b.ex) { ctx.fillStyle = '#ffb703'; ctx.fillRect(x + 4, y + 4, cw - 8, Math.max(11, tH * 0.16)); fitTxt('EXCLUSIVE', x + cw / 2, y + 4 + Math.max(11, tH * 0.16) / 2 + 0.5, Math.max(8, tH * 0.12), cw * 0.8, '#3a1500', null); }
      ctx.restore();
      fitTxt(b.name, x + cw / 2, y + 8 + tH + nh * 0.6, nh, cw - 8, '#fff', null);
      const lab = eq ? 'EQUIPPED' : owned ? 'EQUIP' : money(b.price);
      button('bg_' + b.id, x + cw / 2, y + chh - bh2 / 2 - 5, cw - 12, bh2, lab, eq ? GOLD : owned ? TEAL : canAfford(b.price) ? DEEP : GREY, { r: 8, fs: bh2 * 0.42, glow: false });
    });
  } else {
    const rh = Math.min(76, (ah - 4 * 6) / SHOP_SKIN.length);
    SHOP_SKIN.forEach((sk, i) => {
      const y = c0 + i * (rh + 6), owned = wallet.skins.indexOf(sk.id) >= 0, eq = wallet.skin === sk.id;
      rr(ax, y, aw, rh, 12); ctx.fillStyle = 'rgba(0,10,30,0.6)'; ctx.fill(); ctx.strokeStyle = eq ? '#ffe23d' : 'rgba(0,229,255,0.5)'; ctx.lineWidth = eq ? 3 : 1.5; ctx.stroke();
      const bs = Math.min(rh * 0.42, aw * 0.075), set = skinSet(sk.id, Math.round(bs * DPR));
      for (let k = 0; k < 5; k++) ctx.drawImage(set[k], ax + 10 + k * (bs + 3), y + rh * 0.52, bs, bs);
      fitTxt(sk.name, ax + 10, y + rh * 0.27, Math.min(17, rh * 0.26), aw * 0.5, '#ffe23d', '#03243a', 'left');
      const bw2 = Math.min(130, aw * 0.36), bh2 = Math.min(38, rh * 0.5);
      button('skin_' + sk.id, ax + aw - bw2 / 2 - 10, y + rh / 2, bw2, bh2, eq ? 'EQUIPPED' : owned ? 'EQUIP' : money(sk.price), eq ? GOLD : owned ? TEAL : canAfford(sk.price) ? DEEP : GREY, { r: 10, fs: bh2 * 0.4 });
    });
  }
  button('upgrade', W / 2, c1 + 10 + fh / 2, pw * 0.8, fh * 0.9, isFullEdition() ? 'FULL EDITION \u2713' : 'UPGRADE TO FULL', isFullEdition() ? GREY : GOLD, { fs: fh * 0.36 });
  button('back', W / 2, bot - fh / 2 - 8, pw * 0.55, fh, 'BACK', OCEAN);
  if (shop.modal) drawModal();
}
function drawModal() {
  UI.length = 0; // only the modal is clickable
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
  const pw = Math.min(W - 40, 340), ph = 250, px = (W - pw) / 2, py = (H - ph) / 2;
  panel(px, py, pw, ph, '#ffb703');
  wobblyWord('COMING SOON!', W / 2, py + 40, Math.min(28, pw / 10), T, 2, GOLD, pw * 0.9);
  const lines = ['The FULL edition is on its way:', 'no ads + a one-time $1,000 bonus.', 'No real purchases yet. Keep earning!'];
  lines.forEach((l, i) => fitTxt(l, W / 2, py + 92 + i * 28, 15, pw * 0.9, i === 2 ? '#7dffe0' : '#fff', null));
  button('modalOk', W / 2, py + ph - 40, pw * 0.5, 46, 'OK', DEEP);
}
const SKINSETS = {};
function skinSet(id, s) { const k = id + ':' + s; return SKINSETS[k] || (SKINSETS[k] = makeSpriteSet(id, s)); }
// ---- mid-game quick power-up menu (pauses the game)
let pmenu = false;
function openPU() { if (state !== 'play' || paused) return; setPaused(true); pmenu = true; }
function closePU() { pmenu = false; setPaused(false); }
function drawPUMenu() {
  const sx = shop.shake > 0 ? Math.sin(T * 70) * 9 * shop.shake : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0, 0, W, H);
  const pw = Math.min(W - 24, 360), rh = Math.min(96, H * 0.14), ph = rh * 2 + 210, px = (W - pw) / 2 + sx, py = (H - ph) / 2;
  panel(px, py, pw, ph, '#00E5FF');
  wobblyWord('POWER-UPS', W / 2 + sx, py + 34, Math.min(30, pw / 9), T, 0, LOGO, pw * 0.8);
  walletPill(W / 2 + sx, py + 72, 'center', 28);
  shopMsgDraw(W / 2 + sx, py + 100);
  PU.forEach((p, i) => {
    const y = py + 110 + i * (rh + 8), n = wallet.inv[p.id];
    rr(px + 10, y, pw - 20, rh, 12); ctx.fillStyle = 'rgba(0,10,30,0.6)'; ctx.fill(); ctx.strokeStyle = 'rgba(0,229,255,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
    const is = rh * 0.62; puIcon(p.id, px + 18 + is / 2, y + rh / 2, is);
    const tx = px + 28 + is, tw2 = pw - is - 48;
    fitTxt(p.name + '  x' + n, tx, y + rh * 0.24, Math.min(17, rh * 0.2), tw2, '#ffe23d', '#03243a', 'left');
    const bw2 = (tw2 - 6) / 2, bh2 = Math.min(38, rh * 0.42);
    button('use_' + p.id, tx + bw2 / 2, y + rh * 0.66, bw2, bh2, 'USE', n > 0 ? TEAL : GREY, { r: 9, fs: bh2 * 0.42 });
    button('pbuy_' + p.id, tx + bw2 * 1.5 + 6, y + rh * 0.66, bw2, bh2, money(p.price), canAfford(p.price) ? DEEP : GREY, { r: 9, fs: bh2 * 0.4 });
  });
  button('puClose', W / 2, py + ph - 34, pw * 0.6, 46, 'RESUME', OCEAN);
}
function usePU(id) {
  if (wallet.inv[id] <= 0) { shop.msg = { t: 0, text: 'None owned. Buy one!' }; shop.shake = 0.3; return false; }
  if (id === 'bomb' && g.queue[0] && g.queue[0].t === 7) { shop.msg = { t: 0, text: 'Bomb already loaded!' }; return false; }
  if (id === 'wipe' && g.wipe) { shop.msg = { t: 0, text: 'Laser busy!' }; return false; }
  wallet.inv[id]--; saveWallet(); closePU();
  const c = L.cell;
  if (id === 'wipe') { g.wipe = { t: 0 }; g.stats.wipes++; if (aok()) { tone(300, 0.5, 'sawtooth', 0.12, { to: 2400, lp: 4000 }); noise(0.5, 0.15, 'highpass', 3000); } }
  else { g.queue.unshift({ t: 7, cols: [BOMB] }); g.queue.length = 3; floatText('BOMB LOADED!', L.bx + c * 5, L.by + c * 6, '#ffb03d', c * 0.8, 1.6); sfx.blip(); }
  return true;
}
function applyWipe() {
  const y = ROWS - 1, c = L.cell; let n = 0;
  for (let x = 0; x < COLS; x++) {
    const v = g.board[y][x]; if (!v) continue; n++;
    const [px, py] = cellXY(x, y);
    for (let i = 0; i < 6; i++) part(px + c / 2, py + c / 2, rand(-160, 160), rand(-380, -60), rand(0.4, 0.8), rand(3, 6), cellColor(v), 700, 0);
    g.board[y][x] = 0;
  }
  g.wipe = null; shake(0.25, 6); flashA = Math.max(flashA, 0.2);
  floatText('ROW WIPED!', L.bx + c * 5, L.by + c * (VIS - 2), '#ff4d7d', c * 0.85);
  if (aok()) noise(0.35, 0.3, 'lowpass', 1200);
  if (n && !g.res) startResolve();
}
function explodeBomb(bx, by) {
  const c = L.cell; let n = 0;
  for (let y = by - 1; y <= by + 1; y++) for (let x = bx - 1; x <= bx + 1; x++) {
    if (y < 0 || y >= ROWS || x < 0 || x >= COLS) continue;
    const v = g.board[y][x]; if (!v) continue; n++; g.board[y][x] = 0;
    const [px, py] = cellXY(x, y);
    for (let i = 0; i < 5; i++) part(px + c / 2, py + c / 2, rand(-260, 260), rand(-420, 60), rand(0.4, 0.9), rand(3, 7), cellColor(v), 650, 0);
  }
  const [cx, cy] = cellXY(bx, by), ex = cx + c / 2, ey = cy + c / 2;
  for (let i = 0; i < 70; i++) { const a = rand(0, 6.28), v = rand(80, 520); part(ex, ey, Math.cos(a) * v, Math.sin(a) * v, rand(0.3, 0.9), rand(4, 10), ['#ffe23d', '#ff8a1f', '#ff4050', '#ffffff', '#3a3a3a'][i % 5], i % 5 === 4 ? -60 : 200, i % 3 === 0 ? 1 : 0); }
  RINGS.push({ x: ex, y: ey, r: c * 3.2, t: 0, color: '#ff8a1f' }, { x: ex, y: ey, r: c * 1.8, t: 0, color: '#ffe23d' });
  shake(0.45, 13); flashA = Math.max(flashA, 0.4);
  const pts = n * 10 * g.level; if (pts) { addScore(pts); floatText('BOOM! +' + money(pts), clampX(ex), ey, '#ffd23d', c * 0.9); } else floatText('BOOM!', clampX(ex), ey, '#ff8a1f', c * 0.9);
  g.stats.booms++; g.boomAt = g.time;
  if (aok()) { tone(110, 0.7, 'sine', 0.6, { to: 28 }); noise(0.9, 0.55, 'lowpass', 900); noise(0.25, 0.3, 'bandpass', 2500); tone(55, 0.6, 'sawtooth', 0.15, { lp: 300, to: 30 }); }
  startResolve();
}
function drawWipe() {
  if (!g.wipe) return;
  const c = L.cell, k = Math.min(1, g.wipe.t / 0.5), y = L.by + (VIS - 1) * c, x = L.bx + k * c * COLS;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,60,120,0.35)'; ctx.fillRect(L.bx, y, x - L.bx, c);
  ctx.shadowColor = '#ff2b6a'; ctx.shadowBlur = 18; ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y - c * 0.6, 4, c * 2.2);
  ctx.fillStyle = 'rgba(255,77,125,0.8)'; ctx.fillRect(x - 6, y - c * 0.6, 12, c * 2.2);
  ctx.restore();
}
// ---- dev toggle: tap the logo 5 times within 3 s to switch FREE / FULL (or use ?edition=full / ?edition=free)
let logoTaps = [], logoBox = { y0: 0, y1: 0 };
function logoTap(y) {
  if (y < logoBox.y0 || y > logoBox.y1) return;
  const now = performance.now(); logoTaps = logoTaps.filter((t) => now - t < 3000); logoTaps.push(now);
  if (logoTaps.length >= 5) {
    logoTaps = [];
    const granted = setEdition(isFullEdition() ? 'free' : 'full');
    floatText('DEV: ' + (isFullEdition() ? 'FULL' : 'FREE') + ' EDITION', W / 2, logoBox.y1 + 10, '#ffe23d', 22, 1.6);
    if (granted) { floatText('+' + money(START_CASH.full), W / 2, logoBox.y1 + 40, '#5dff9a', 26, 1.8); coinBurst(W / 2, logoBox.y1, 30); sfx.chaching(); } else sfx.blip();
  }
}
function editionBadge(x, y) {
  const full = isFullEdition(), w = 46, h = 20;
  rr(x, y - h / 2, w, h, 6); ctx.fillStyle = full ? '#ffb703' : 'rgba(255,255,255,0.18)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = full ? '#fff3c4' : 'rgba(255,255,255,0.5)'; ctx.stroke();
  txt(full ? 'FULL' : 'FREE', x + w / 2, y + 1, 12, full ? '#3a1500' : '#ffffff', null, 'center', NFONT);
}
function drawBanked(cx, y, big) {
  const b = g.bank; if (!b) return;
  const k = Math.min(1, b.t / 1.2), shown = Math.floor(b.from + (b.amt) * (1 - Math.pow(1 - k, 3)));
  if (b.t > 0.05 && !b.burst && b.amt > 0) { b.burst = 1; coinBurst(cx, y, 22); sfx.chaching(); }
  const pulse = 1 + 0.06 * Math.sin(T * 8);
  ctx.save(); ctx.translate(cx, y); ctx.scale(pulse, pulse);
  txt('BANKED +' + money(b.amt), 0, 0, big ? 22 : 16, '#ffd23d', '#3a1a00', 'center', NFONT); ctx.restore();
  txt('WALLET ' + money(shown), cx, y + (big ? 26 : 20), big ? 15 : 13, '#5dff9a', '#062a12', 'center', NFONT);
}
// ---------------------------------------------------------------- main loop
let last = performance.now();
function syncMusic() {
  const want = A.ctx && settings.sound && settings.music && (state === 'title' || state === 'scores' || state === 'howto' || state === 'store' || (state === 'play' && !paused));
  if (want && !M.timer) musicStart(); else if (!want && M.timer) musicStop();
  if (state !== 'play') M.stage = 0;
  syncTrack(); updatePending(); try { ambSync(); } catch (e) { /* ambience is optional */ }
}
let TS = 1; // test hook: game-speed multiplier
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)) * TS; last = now; T += dt;
  try {
    for (const k in pressAnim) { pressAnim[k] += dt; if (pressAnim[k] > 0.3) delete pressAnim[k]; }
    if (pending) { pending.t -= dt; if (pending.t <= 0) { const id = pending.id; pending = null; doAction(id); } }
    if (state === 'play' && !paused) updateGame(dt);
    else if (state === 'dying') {
      overT += dt; g.disp = g.score;
      if (overT > 1.7) {
        TUMBLE.length = 0; rankNew = 0; overT = 0;
        if (qualifies(g.score)) { state = 'entry'; ent = [...lastInit].map((ch) => ch.charCodeAt(0)); entSel = 0; confetti(80); sfx.cheer(); }
        else state = 'over';
      }
    } else if (state === 'over') overT += dt;
    else if (state === 'won') {
      overT += dt; g.disp = g.score; if (Math.random() < dt * 5) confetti(2);
      if (!g.saved && qualifies(g.score) && overT > 3.6) { state = 'entry'; ent = [...lastInit].map((ch) => ch.charCodeAt(0)); entSel = 0; confetti(80); }
    }
    if (state === 'title' || state === 'scores' || state === 'howto' || state === 'store') updateRain(dt);
    updateShop(dt);
    if (state === 'entry' && Math.random() < dt * 6) confetti(2);
    if (!paused) updateFX(dt);
    syncMusic();

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    UI = [];
    renderThumbs();
    drawBG(T);
    if (state === 'title' || state === 'scores' || state === 'howto' || state === 'store') { ctx.fillStyle = cache.menuWash; ctx.fillRect(0, 0, W, H); }
    if (state === 'title') { drawTitle(); drawFX(); }
    else if (state === 'scores') { drawRain(); drawScores(); drawFX(); }
    else if (state === 'howto') { drawRain(); drawHowto(); drawFX(); }
    else if (state === 'store') { drawRain(); drawStore(); drawFX(); }
    else {
      let sx = 0, sy = 0;
      if (shakeT > 0) { const m = shakeM * (shakeT / shakeD); sx = rand(-m, m); sy = rand(-m, m); }
      ctx.save(); ctx.translate(sx, sy);
      drawBoard(); drawDanger(); drawSide(); drawBatsInFlight(); drawFX();
      ctx.restore();
      if (flashA > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flashA + ')'; ctx.fillRect(0, 0, W, H); }
      drawHUD(); drawControls(); drawBannerUI();
      if (state === 'play' && paused) { if (pmenu) drawPUMenu(); else drawPause(); }
      else if (state === 'entry') { drawEntry(); drawFX(); }
      else if (state === 'over') drawOver();
      else if (state === 'won') drawWin();
    }
    drawBursts();
  } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}
layout();
window.__bb = {
  get state() { return state; }, get paused() { return paused; }, get piece() { return g.piece ? Object.assign({}, g.piece) : null; },
  get score() { return g.score; }, get popped() { return g.popped; }, get stage() { return g.stage; }, get chain() { return g.maxChain; }, get resolving() { return !!g.res; }, dbg, get audio() { return A.ctx ? A.ctx.state : 'none'; },
  get danger() { return { on: !!g.danger, t: g.dangerT || 0, count: g.dangerCount || 0, comebacks: g.comebacks || 0, height: g.board ? stackHeight() : 0, banner: banner ? banner.title : null }; },
  get music() { const E = M.E; return { running: !!M.timer, track: M.track, name: TRACKS[M.track].name, bpm: TRACKS[M.track].bpm, step: M.step, section: secAt(Math.floor(M.step / 16)).name, sched: M.sched.slice(), dt: M.lastT[1] - M.lastT[0], pending: M.pending ? M.pending.track : -1, danger: M.danger, voices: E ? E.voices.length : 0, stats: E ? Object.assign({}, E.stats) : null, fanAt: M.fanAt, next: M.next, now: A.ctx ? A.ctx.currentTime : 0 }; },
  get bg() { return { cur: bgCur, fade: bgFade, draws: BG.draws.slice(), layers: Object.keys(BG.L), gator: BG.gator ? { state: BG.gator.state, blinks: BG.gator.blinks, doubles: BG.gator.doubles, sinks: BG.gator.sinks } : null, storm: BG.storm ? { flashes: BG.storm.flashes, thunders: BG.storm.thunders } : null, hole: BG.hole ? { eaten: BG.hole.eaten } : null, water: BG.water ? { tbub: BG.water.tb.length, splashes: BG.water.splashes, sbub: BG.water.sb.length, pops: BG.water.pops, cur: BG.water.cur.length } : null, particles: { dust: BG.dust.length, fall: BG.fall.length, cars: BG.cars.length } }; },
  get wallet() { return JSON.parse(JSON.stringify(wallet)); }, get edition() { return wallet.edition; }, get shop() { return { tab: shop.tab, modal: shop.modal, msg: shop.msg ? shop.msg.text : null, thumbs: Object.keys(shop.thumbs).length }; }, get pmenu() { return pmenu; }, get stats() { return g.stats ? Object.assign({}, g.stats) : null; }, get queue() { return g.queue ? g.queue.map((q) => q.t) : []; }, get bank() { return g.bank ? { amt: g.bank.amt, from: g.bank.from } : null; }, get ads() { return Object.assign({}, BB_ADS); },
  isFullEdition, get level() { return g.level; }, get time() { return g.time; },
  get boss() { return g.boss ? { hp: g.boss.hp, max: g.boss.max, attacks: g.boss.attacks, dmg: g.boss.dmg } : null; }, get won() { return !!g.won; }, get fog() { return g.fog ? Object.assign({}, g.fog) : null; },
  get conv() { return { n: g.convN || 0, dir: g.convDir || 1, warn: !!g.convWarn }; }, get grav() { return gravInterval(); }, get bats() { return g.bats ? g.bats.length : 0; },
  get layout() { return Object.assign({ W, H }, L); }, get buttons() { return UI.map((b) => Object.assign({}, b)); },
};
requestAnimationFrame(frame);
})();
