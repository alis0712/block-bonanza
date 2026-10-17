/* BLOCK BONANZA - web edition. Single-file canvas game, no dependencies. */
'use strict';
(function () {
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
];
const BOX = [4, 2, 3, 3, 3, 3, 3];
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
  { name: 'NEON CITY', bpm: 120, c1: '#ff2bd6', c2: '#2bf0ff', root: 45, prog: [0, 0, -4, -2], chord: [0, 7, 12, 15, 12, 7, 3, 7],
    kick: 'x...x...x...x...', hat: '..o...o...o...o.', clap: '....x.......x...', bass: 'x.xox.xox.xox.xo', perc: '................',
    arp: 'x.xxx.xxx.xxx.xx', bw: 'sawtooth', aw: 'square', alp: 1800 },
  { name: 'DEEP SPACE', bpm: 126, c1: '#8f9bff', c2: '#e0a3ff', root: 38, prog: [0, 3, -2, 5], chord: [0, 7, 10, 14, 19, 14, 10, 7],
    kick: 'x.......x.....x.', hat: 'x.x.x.x.x.x.x.x.', clap: '........x.......', bass: 'x...x.o.x...x.o.', perc: '................',
    arp: 'x..x..x..x..x.x.', bw: 'triangle', aw: 'sine', alp: 3000, echo: true },
  { name: 'CYBER JUNGLE', bpm: 130, c1: '#3dff7a', c2: '#d4ff3d', root: 40, prog: [0, 0, 3, 5], chord: [0, 3, 7, 10, 12, 10, 7, 3],
    kick: 'x..x..x...x..x..', hat: 'xxoxxxoxxxoxxxox', clap: '....x.......x...', bass: 'x..xo..x..x.o..x', perc: '..x..x...x..x.x.',
    arp: 'xx.xx.xx.xx.xx.x', bw: 'square', aw: 'triangle', alp: 2200 },
  { name: 'VOLCANO CORE', bpm: 136, c1: '#ff5a1f', c2: '#ffd23d', root: 36, prog: [0, 1, 0, -2], chord: [0, 1, 7, 12, 13, 12, 7, 1],
    kick: 'x...x...x...x.x.', hat: '..o...o...o...o.', clap: '....x.......x...', bass: 'xxoxxxoxxxoxxxox', perc: 'x.......x.......',
    arp: 'x.x.x.x.x.x.x.x.', bw: 'sawtooth', aw: 'sawtooth', alp: 1400 },
  { name: 'GLITCH DIMENSION', bpm: 145, c1: '#ff00ea', c2: '#00ffd5', root: 42, prog: [0, -5, 2, -3], chord: [0, 12, 3, 15, 7, 19, 10, 22],
    kick: 'x...x...x...x...', hat: 'xxxxxxxxxxxxxxxx', clap: '....x..x....x...', bass: 'x.x.x.xox.x.x.xo', perc: '...x......x..x..',
    arp: 'xxxxxxxxxxxxxxxx', bw: 'square', aw: 'square', alp: 2600, glitch: true },
];
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
      A.mus.connect(A.master); A.sfx.connect(A.master); A.master.connect(comp); comp.connect(c.destination);
      const len = c.sampleRate | 0, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      A.noise = buf;
      c.onstatechange = () => { if (c.state === 'running') { M.next = 0; } };
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
const aok = () => A.ctx && settings.sound && A.ctx.state === 'running';
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
  node.connect(gn); gn.connect(o.dest || A.sfx);
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
  s.connect(fl); fl.connect(gn); gn.connect(o.dest || A.sfx);
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
  glitchWarn() { if (!aok()) return; for (let i = 0; i < 6; i++) tone(rand(800, 2400), 0.04, 'square', 0.05, { when: anow() + i * 0.18 }); },
  glitch() { if (!aok()) return; for (let i = 0; i < 8; i++) tone(rand(200, 3000), 0.03, 'square', 0.08, { when: anow() + i * 0.025 }); noise(0.15, 0.2, 'highpass', 3000); },
  cheer() { if (!aok()) return; const t = anow(); [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => tone(mf(n), 0.25, 'square', 0.09, { when: t + i * 0.06, lp: 4000 })); },
};

// procedural techno: 16th-note step sequencer with look-ahead scheduling
const M = { timer: null, next: 0, step: 0, stage: 0 };
function mKick(t) {
  const c = A.ctx, o = c.createOscillator(), gn = c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  gn.gain.setValueAtTime(0.9, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  o.connect(gn); gn.connect(A.mus); o.start(t); o.stop(t + 0.3);
}
function mVoice(f, t, d, type, v, lp, q) {
  const c = A.ctx, o = c.createOscillator(), fl = c.createBiquadFilter(), gn = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  fl.type = 'lowpass'; fl.frequency.setValueAtTime(lp, t); fl.frequency.exponentialRampToValueAtTime(Math.max(120, lp * 0.25), t + d); fl.Q.value = q || 4;
  gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(v, t + 0.006); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(fl); fl.connect(gn); gn.connect(A.mus); o.start(t); o.stop(t + d + 0.02);
}
function playStep(step, t, st, spb) {
  const s = step % 16, bar = Math.floor(step / 16) % 4, root = st.root + st.prog[bar];
  if (st.kick[s] === 'x') mKick(t);
  if (st.hat[s] === 'x') noise(0.04, 0.12, 'highpass', 8000, { when: t, dest: A.mus });
  else if (st.hat[s] === 'o') noise(0.16, 0.12, 'highpass', 6500, { when: t, dest: A.mus });
  if (st.clap[s] === 'x') noise(0.13, 0.3, 'bandpass', 1500, { when: t, dest: A.mus, q: 1.2 });
  if (st.perc[s] === 'x') tone(st.glitch ? rand(300, 1500) : 220, 0.08, st.glitch ? 'square' : 'sine', 0.18, { when: t, to: st.glitch ? 80 : 140, dest: A.mus });
  if (st.bass[s] !== '.') mVoice(mf(root + (st.bass[s] === 'o' ? 12 : 0)), t, spb * 0.95, st.bw, 0.26, 900, 6);
  if (st.arp[s] === 'x') {
    let n = root + 24 + st.chord[step % st.chord.length];
    if (st.glitch && hash(step * 7.7) < 0.2) n += 12;
    mVoice(mf(n), t, spb * 1.6, st.aw, 0.07, st.alp, 3);
    if (st.echo) mVoice(mf(n + 12), t + spb * 3, spb * 2, 'sine', 0.025, st.alp, 1);
  }
  if (s === 0 && bar === 0) noise(1.2, 0.05, 'highpass', 9000, { when: t, dest: A.mus });
  if (st.glitch && hash(step * 3.1) < 0.12) { // stutter repeats
    for (let i = 1; i < 4; i++) tone(mf(root + 36 + ((i * 5) % 12)), spb / 4, 'square', 0.04, { when: t + i * spb / 4, dest: A.mus });
  }
}
function musicTick() {
  if (!A.ctx || A.ctx.state !== 'running') return;
  const st = STAGES[M.stage], spb = 60 / st.bpm / 4, now = A.ctx.currentTime;
  if (M.next < now - 0.2) M.next = now + 0.05;
  while (M.next < now + 0.12) { playStep(M.step, M.next, st, spb); M.next += spb; M.step++; }
}
function musicStart() { if (!A.ctx || M.timer) return; M.next = A.ctx.currentTime + 0.08; M.step = 0; M.timer = setInterval(musicTick, 25); }
function musicStop() { if (M.timer) { clearInterval(M.timer); M.timer = null; } }
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
function buildSprites() {
  const s = Math.max(4, Math.round(L.cell * DPR));
  const base = ['#3D8BFF', '#FFD23F', '#FF4FA3', '#2EE6A6', '#FF8A1F', 'RAINBOW', '#2f6b2f', '#3a1a10', '#ffffff'];
  sprites = base.map((c, idx) => {
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
      case 6: x.restore(); x.save(); x.strokeStyle = '#123d12'; x.lineWidth = Math.max(1.5, s * 0.09); x.lineCap = 'round';
        x.beginPath(); x.moveTo(s * 0.1, s * 0.85); x.bezierCurveTo(s * 0.4, s * 0.2, s * 0.6, s * 0.95, s * 0.9, s * 0.15); x.stroke();
        x.fillStyle = '#6fd36f'; x.beginPath(); x.ellipse(s * 0.33, s * 0.42, s * 0.12, s * 0.06, -0.6, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.ellipse(s * 0.68, s * 0.6, s * 0.12, s * 0.06, 0.6, 0, Math.PI * 2); x.fill(); x.restore(); x.save(); x.beginPath(); break;
      case 7: x.restore(); x.save(); x.strokeStyle = '#ff7a1a'; x.lineWidth = Math.max(1.5, s * 0.07);
        x.beginPath(); x.moveTo(s * 0.15, s * 0.3); x.lineTo(s * 0.45, s * 0.5); x.lineTo(s * 0.4, s * 0.8); x.moveTo(s * 0.45, s * 0.5); x.lineTo(s * 0.8, s * 0.35); x.lineTo(s * 0.88, s * 0.7); x.stroke();
        x.restore(); x.save(); x.beginPath(); break;
      default: x.beginPath();
    }
    if (idx <= 5) { x.fill(); x.stroke(); }
    x.restore();
    x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = Math.max(1, s * 0.05); x.strokeRect(0, 0, s, s);
    return o;
  });
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

// ---------------------------------------------------------------- backgrounds (one per stage)
const BG = { stars: [], embers: [], flies: [], bld: [[], []], vines: [] };
function initBG() {
  BG.stars = []; for (let i = 0; i < 150; i++) BG.stars.push({ x: Math.random(), y: Math.random(), z: rand(0.2, 1) });
  BG.embers = []; for (let i = 0; i < 55; i++) BG.embers.push({ x: Math.random(), y: Math.random(), s: rand(1.5, 4), v: rand(30, 90), p: rand(0, 6) });
  BG.flies = []; for (let i = 0; i < 26; i++) BG.flies.push({ x: Math.random(), y: Math.random(), p: rand(0, 6), r: rand(2, 4) });
  for (let l = 0; l < 2; l++) {
    const arr = []; let x = 0;
    while (x < W * 2 + 100) { const w = rand(30, 70) * (l ? 1.2 : 1); arr.push({ x, w, h: rand(0.1, 0.3) * H * (l ? 0.8 : 1.1) }); x += w + rand(2, 10); }
    arr.total = x; BG.bld[l] = arr;
  }
  BG.vines = []; for (let i = 0; i < 8; i++) BG.vines.push({ x: (i + rand(0.2, 0.8)) / 8, len: rand(0.25, 0.65), p: rand(0, 6) });
}
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
function bgSpace(t) {
  ctx.fillStyle = cache.space; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = cache.planet; ctx.beginPath(); ctx.arc(W * 0.78, H * 0.18, Math.min(W, H) * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(224,163,255,0.6)'; ctx.lineWidth = 3; ctx.beginPath();
  ctx.ellipse(W * 0.78, H * 0.18, Math.min(W, H) * 0.24, Math.min(W, H) * 0.05, -0.35, 0, Math.PI * 2); ctx.stroke();
  for (let layer = 0; layer < 3; layer++) {
    ctx.fillStyle = ['rgba(255,255,255,0.35)', 'rgba(200,210,255,0.65)', '#ffffff'][layer];
    for (let i = layer; i < BG.stars.length; i += 3) {
      const s = BG.stars[i], sp = 10 + layer * 30, y = (s.y * H + t * sp) % H, sz = 1 + layer * 0.8;
      ctx.fillRect(s.x * W, y, sz, sz);
    }
  }
  const sh = (t % 5) / 5;
  if (sh < 0.18) {
    const k = sh / 0.18, x = W * (0.1 + k * 0.7), y = H * (0.1 + k * 0.25);
    ctx.strokeStyle = 'rgba(255,255,255,' + (1 - k) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 60, y - 22); ctx.stroke();
  }
}
function bgJungle(t) {
  ctx.fillStyle = cache.jungle; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#04260f'; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H * 0.72 + Math.sin(x * 0.012 + 1) * 30 + Math.sin(x * 0.03) * 12);
  ctx.lineTo(W, H); ctx.fill();
  ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (const v of BG.vines) {
    const x0 = v.x * W, len = v.len * H, sw = Math.sin(t * 1.3 + v.p) * 26;
    ctx.strokeStyle = '#1f7a3a'; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.quadraticCurveTo(x0 + sw, len * 0.5, x0 + sw * 1.4, len); ctx.stroke();
    ctx.fillStyle = '#2fbf5a';
    let side = 1;
    for (let k = 0.15; k < 1; k += 0.17) {
      side = -side;
      ctx.beginPath(); ctx.ellipse(x0 + sw * k * 1.3 + side * 8, len * k, 9, 4, side * 0.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.lineCap = 'butt';
  ctx.globalCompositeOperation = 'lighter';
  for (const f of BG.flies) {
    const x = (f.x * W + Math.sin(t * 0.7 + f.p) * 40), y = (f.y * H + Math.cos(t * 0.5 + f.p * 2) * 30), a = 0.35 + 0.35 * Math.sin(t * 3 + f.p);
    ctx.fillStyle = 'rgba(212,255,61,' + (a * 0.35) + ')'; ctx.beginPath(); ctx.arc(x, y, f.r * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(240,255,170,' + a + ')'; ctx.beginPath(); ctx.arc(x, y, f.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}
function bgVolcano(t) {
  ctx.fillStyle = cache.volc; ctx.fillRect(0, 0, W, H);
  const base = H * 0.86;
  ctx.fillStyle = '#1c0300'; ctx.beginPath(); ctx.moveTo(W * 0.05, base); ctx.lineTo(W * 0.4, H * 0.5); ctx.lineTo(W * 0.6, H * 0.5); ctx.lineTo(W * 0.95, base); ctx.fill();
  const glow = 0.5 + 0.3 * Math.sin(t * 2);
  ctx.fillStyle = 'rgba(255,120,0,' + glow + ')'; ctx.beginPath(); ctx.ellipse(W / 2, H * 0.5, W * 0.1, 8, 0, 0, Math.PI * 2); ctx.fill();
  for (const e of BG.embers) {
    const y = ((e.y * H - t * e.v) % H + H) % H, x = e.x * W + Math.sin(t * 2 + e.p) * 10;
    ctx.fillStyle = (Math.sin(t * 9 + e.p) > 0) ? '#ffd23d' : '#ff5a1f';
    ctx.fillRect(x, y, e.s, e.s);
  }
  ctx.fillStyle = cache.lava; ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, base + Math.sin(x * 0.03 + t * 2) * 8 + Math.sin(x * 0.011 - t) * 6);
  ctx.lineTo(W, H); ctx.fill();
}
function bgGlitch(t) {
  ctx.fillStyle = '#07000f'; ctx.fillRect(0, 0, W, H);
  const fr = Math.floor(t * 10), cs = Math.max(24, W / 10);
  for (let i = 0; i < 18; i++) {
    const h1 = hash(fr * 13 + i), h2 = hash(fr * 7 + i * 3.3), h3 = hash(i * 9.1 + Math.floor(t * 3));
    ctx.fillStyle = ['rgba(255,0,234,0.18)', 'rgba(0,255,213,0.16)', 'rgba(200,255,0,0.12)'][i % 3];
    ctx.fillRect(Math.floor(h1 * W / cs) * cs, Math.floor(h2 * H / cs) * cs, cs * (1 + Math.floor(h3 * 2)), cs);
  }
  for (let i = 0; i < 5; i++) {
    const h = hash(fr * 3.7 + i * 11);
    if (h > 0.6) continue;
    ctx.fillStyle = i % 2 ? 'rgba(0,255,213,0.25)' : 'rgba(255,0,234,0.25)';
    ctx.fillRect(0, hash(fr + i * 5.5) * H, W, 3 + h * 18);
  }
  ctx.strokeStyle = 'rgba(0,255,213,0.12)'; ctx.lineWidth = 1; ctx.beginPath();
  const sp = cs * 1.5, off = (t * 40) % sp;
  for (let y = off; y < H; y += sp) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  if (hash(fr * 1.3) > 0.85) txt('ERR0R', hash(fr) * W, hash(fr + 1) * H, 30, 'rgba(255,0,234,0.25)', null, 'center', 'monospace');
  ctx.fillStyle = cache.scan; ctx.fillRect(0, 0, W, H);
}
const BGS = [bgNeon, bgSpace, bgJungle, bgVolcano, bgGlitch];
let bgCur = 0, bgPrev = 0, bgFade = 0;
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
    else if (p.type === 2) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); }
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
const RAINBOW = 9, VINE = 10, LAVA = 11, FLASH = 12;
const PAL = [null, '#3D8BFF', '#FFD23F', '#FF4FA3', '#2EE6A6', '#FF8A1F'];
const PAL_NAMES = [null, 'blue circle', 'yellow triangle', 'pink diamond', 'teal plus', 'orange star'];
const STAGE_POPS = 150, LEVEL_POPS = 50, POP_T = 0.34;
const TWISTS = [
  { text: 'Match 4+ touching blocks of one color!', icon: 1 },
  { text: 'Rainbow blocks match ANY color!', icon: RAINBOW },
  { text: 'Vines only break when a match pops next to them!', icon: VINE },
  { text: 'Lava rises from below! Pop next to it to break it!', icon: LAVA },
  { text: 'Glitches swap block colors. Watch the flicker!', icon: 3 },
];
const cellColor = (v) => (v >= 1 && v <= 5 ? PAL[v] : v === RAINBOW ? '#ffffff' : v === VINE ? '#3c9a3c' : v === LAVA ? '#ff5a1f' : '#ffffff');
const spr = (v) => (v >= 1 && v <= 5 ? v - 1 : v === RAINBOW ? 5 : v === VINE ? 6 : v === LAVA ? 7 : 8);
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
  return { t, cols };
}
function newGame() {
  g.board = []; for (let y = 0; y < ROWS; y++) g.board.push(new Int8Array(COLS));
  g.anim = new Float32Array(ROWS * COLS).fill(-9); g.fallOff = new Float32Array(ROWS * COLS); g.popMask = new Uint8Array(ROWS * COLS);
  g.stage = 0; g.bag = []; g.queue = []; for (let i = 0; i < 3; i++) g.queue.push(makePiece(fromBag()));
  g.score = 0; g.disp = 0; g.popped = 0; g.level = 1; g.pop = 0; g.time = 0; g.megas = 0; g.maxChain = 0;
  g.grav = 0; g.lock = 0; g.resets = 0; g.lowY = 0; g.res = null; g.chain = 0; g.piece = null; g.soft = false;
  g.twistT = 0; g.warn = null; g.glitch = null; g.events = [];
  P.length = 0; FT.length = 0; TUMBLE.length = 0; RINGS.length = 0; TRAILS.length = 0;
  for (const k in holds) delete holds[k];
  setBG(0); M.stage = 0;
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
  for (let i = 0; i < 4; i++) {
    const cx = x + c[i][0], cy = y + c[i][1];
    if (cx < 0 || cx >= COLS || cy >= ROWS) return true;
    if (cy >= 0 && g.board[cy][cx]) return true;
  }
  return false;
}
function spawn() {
  const q = g.queue.shift(); g.queue.push(makePiece(fromBag()));
  g.piece = { t: q.t, cols: q.cols, r: 0, x: q.t === 1 ? 4 : 3, y: 1 };
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
  const broken = [];
  for (let k = 0; k < N; k++) {
    if (!pm[k]) continue;
    const x = k % COLS, y = (k / COLS) | 0;
    for (const n of [x > 0 ? k - 1 : -1, x < COLS - 1 ? k + 1 : -1, y > 0 ? k - COLS : -1, y < ROWS - 1 ? k + COLS : -1]) {
      if (n < 0 || pm[n] === 1) continue;
      const v = at(n); if ((v === VINE || v === LAVA) && pm[n] !== 2) { pm[n] = 2; broken.push(n); }
    }
  }
  return { groups, pm, broken };
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
  pts += pop.broken.length * 15;
  pts *= g.chain * g.level;
  addScore(pts); g.pop = 1;
  g.popped += count;
  g.popMask = pop.pm;
  g.res = { phase: 'pop', t: 0, dur: POP_T };
  const cx = sx / count + c / 2, cy = sy / count + c / 2;
  floatText('+' + fmt(pts), clampX(cx), cy, '#ffe23d', c * (maxG >= 8 ? 1.1 : 0.85));
  sfx.pop(g.chain, count);
  if (pop.broken.length) { sfx.crack(); floatText(pop.broken.some((k) => at2(k) === LAVA) ? 'LAVA BUSTED!' : 'VINES SNAPPED!', clampX(cx), cy + c * 1.2, '#7dffb0', c * 0.6); }
  if (g.chain >= 2) {
    floatText('CHAIN x' + g.chain + '!', L.bx + c * 5, L.by + c * 6, g.chain >= 4 ? '#ff4fa3' : '#2bf0ff', Math.min(c * (1.1 + g.chain * 0.15), W * 0.13), 1.4);
    shake(0.25 + g.chain * 0.05, 4 + g.chain * 2);
    RINGS.push({ x: cx, y: cy, r: c * (4 + g.chain), t: 0, color: '#2bf0ff' });
  }
  if (maxG >= 8) {
    g.megas++;
    floatText('MEGA POP!', L.bx + c * 5, L.by + c * 8.5, '#ff2bd6', Math.min(c * 1.5, W * 0.12), 1.6);
    shake(0.55, 14); flashA = 0.5; sfx.quad();
    RINGS.push({ x: cx, y: cy, r: c * 9, t: 0, color: '#ffe23d' });
  } else if (g.chain < 2) shake(0.12, 3);
  const nl = Math.floor(g.popped / LEVEL_POPS) + 1;
  if (nl > g.level) {
    g.level = nl;
    const ns = Math.min(4, Math.floor(g.popped / STAGE_POPS));
    if (ns !== g.stage) { g.stage = ns; M.stage = ns; setBG(ns); g.twistT = 0; g.warn = null; g.glitch = null; showBanner('STAGE ' + (ns + 1), STAGES[ns].name, STAGES[ns].c1, TWISTS[ns]); }
    else showBanner('LEVEL ' + nl, 'FASTER! FASTER!', STAGES[g.stage].c2);
    setTimeout(sfx.level, 350);
  }
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
  for (let i = 0; i < 30; i++) part(bx + rand(0, L.cell * COLS), by + L.cell, rand(-80, 80), rand(-320, -80), rand(0.4, 0.9), rand(3, 6), kind === 'lava' ? (i % 2 ? '#ff5a1f' : '#ffd23d') : '#3dff7a', 700, 0);
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
    for (let i = 0; i < 8; i++) part(px + L.cell / 2, py + L.cell / 2, rand(-200, 200), rand(-200, 200), rand(0.2, 0.4), 3, i % 2 ? '#00ffd5' : '#ff00ea', 0, 1);
  }
  g.glitch = null; g.twistT = 0; sfx.glitch(); shake(0.15, 4);
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
}
function gravInterval() { return Math.max(0.07, 0.9 * Math.pow(0.86, g.level - 1)); }
function updateGame(dt) {
  g.time += dt;
  g.pop = Math.max(0, g.pop - dt * 2.5);
  g.wob = Math.max(0, (g.wob || 0) - dt * 6);
  const gap = g.score - g.disp;
  g.disp = gap > 0 ? Math.min(g.score, g.disp + Math.max(60, gap * 7) * dt) : g.score;
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
  musicStop(); sfx.over(); shake(0.4, 8);
  overJoke = OVER_JOKES[Math.random() * OVER_JOKES.length | 0];
}
function submitEntry() {
  const n = ent.map((c) => String.fromCharCode(c)).join('');
  const rec = { n, s: g.score, l: g.popped, lv: g.level, d: Date.now() };
  scores.push(rec); scores.sort((a, b) => b.s - a.s); scores = scores.slice(0, 10);
  store.set('bb_scores_v2', scores); lastInit = n; store.set('bb_init', n);
  rankNew = scores.indexOf(rec) + 1;
  state = 'over'; overT = 0; sfx.cheer();
}
const best = () => Math.max(scores.length ? scores[0].s : 0, g.score);
// debug/test hooks
const LETTERS = { '.': 0, B: 1, Y: 2, P: 3, G: 4, O: 5, '*': RAINBOW, V: VINE, L: LAVA };
const dbg = {
  setup(rows, piece) {
    for (let y = 0; y < ROWS; y++) g.board[y].fill(0);
    rows.forEach((s, i) => { const y = ROWS - rows.length + i; [...s].forEach((ch, x) => { g.board[y][x] = LETTERS[ch] || 0; }); });
    g.res = null; g.glitch = null; g.warn = null; g.twistT = 0;
    if (piece) { g.piece = { t: piece.t, r: piece.r || 0, x: piece.x, y: piece.y == null ? 2 : piece.y, cols: [...piece.cols].map((ch) => LETTERS[ch]) }; g.lock = 0; g.resets = 0; g.lowY = g.piece.y; }
  },
  setStage(i) { g.popped = i * STAGE_POPS; g.level = Math.floor(g.popped / LEVEL_POPS) + 1; g.stage = i; M.stage = i; setBG(i); bgFade = 0; g.twistT = 0; showBanner('STAGE ' + (i + 1), STAGES[i].name, STAGES[i].c1, TWISTS[i]); },
  setTwistT(v) { g.twistT = v; },
  twistNow() { g.twistT = 999; if (g.stage === 3) g.warn = { t: 3 }; },
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
  paused = p; for (const k in holds) delete holds[k]; g.soft = false; heldBtn.clear(); gest.clear();
  sfx.pause();
}
function toggleSound() {
  settings.sound = !settings.sound; saveSettings();
  if (A.master) A.master.gain.value = settings.sound ? 0.8 : 0;
}
function startGame() { newGame(); state = 'play'; paused = false; M.step = 0; }
function toMenu() { state = 'title'; paused = false; setBG(0); M.stage = 0; confirmReset = false; P.length = 0; TUMBLE.length = 0; banner = null; }
function doAction(id) {
  switch (id) {
    case 'play': case 'again': case 'restart': startGame(); break;
    case 'scores': state = 'scores'; confirmReset = false; break;
    case 'howto': state = 'howto'; break;
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
  let by = Math.max(ly + size * 2.0 + bh * 0.9, (H - (bh * 4 + gap * 3)) / 2 + size * 0.9);
  by = Math.min(by, L.bot - (bh + gap) * 4 - 16);
  const items = [['play', 'PLAY!', DEEP], ['scores', 'BEST SCORES', TEAL], ['howto', 'HOW TO PLAY', AQUA],
    ['sound', 'SOUND: ' + (settings.sound ? 'ON' : 'OFF'), settings.sound ? OCEAN : ['#4a6572', '#2c3e50']]];
  items.forEach(([id, label, col], i) => button(id, cx, by + i * (bh + gap) + bh / 2, bw * (i === 0 ? 1.08 : 1), bh * (i === 0 ? 1.12 : 1), label, col, { rot: Math.sin(T * 2.5 + i) * 0.025 }));
  txt('tap a button. go on. we dare you.', cx, L.bot - 8, 12, 'rgba(255,255,255,0.6)', null);
  // sound indicator
  const live = A.ctx && A.ctx.state === 'running', on = settings.sound, ss = 44;
  button('snd', L.right - ss / 2, L.top + ss / 2, ss, ss, '', on ? (live ? TEAL : ['#ffb300', '#ff7043']) : ['#4a6572', '#2c3e50'], { icon: on ? 'spk' : 'mute', r: 12 });
  fitTxt(!on ? 'SOUND OFF' : live ? 'SOUND ON' : 'TAP FOR SOUND', L.right - ss / 2, L.top + ss + 12, 11, on && live ? '#7dffe0' : '#ffd180', '#03243a', 'center');
}
function drawScores() {
  const pw = Math.min(W - 24, 420), ph = Math.min(L.bot - L.top - 10, 640), px = (W - pw) / 2, py = L.top + (L.bot - L.top - ph) / 2;
  panel(px, py, pw, ph, '#00E5FF');
  wobblyWord('BEST SCORES', W / 2, py + 38, Math.min(34, pw / 9), T, 1, COLORS, pw * 0.9);
  const list = scores.slice().sort((a, b) => b[sortKey] - a[sortKey]);
  const rowH = Math.min(34, (ph - 170) / 11), y0 = py + 82, fs = rowH * 0.55;
  const cols = [px + pw * 0.07, px + pw * 0.17, px + pw * 0.6, px + pw * 0.78, px + pw * 0.93];
  ['#', 'NAME', 'SCORE', 'POPS', 'LV'].forEach((h, i) => txt(h + (['', '', 's', 'l', 'lv'][i] === sortKey ? '*' : ''), cols[i], y0, fs * 0.8, '#ffe23d', null, i >= 2 ? 'right' : 'left'));
  if (!list.length) fitTxt('No scores yet. Go make history!', W / 2, y0 + rowH * 3, 18, pw * 0.9, '#fff', null);
  list.forEach((s, i) => {
    const y = y0 + rowH * (i + 1), col = i === 0 ? '#ffd91a' : i === 1 ? '#d9e2ff' : i === 2 ? '#ff9a4d' : '#ffffff';
    if (i % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(px + 10, y - rowH / 2, pw - 20, rowH); }
    txt(String(i + 1), cols[0], y, fs, col, null, 'left', NFONT);
    txt(s.n, cols[1], y, fs, col, null, 'left', NFONT);
    txt(fmt(s.s), cols[2], y, fs, col, null, 'right', NFONT);
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
    button('sort', W / 2, byy, bw, bh, 'SORT: ' + { s: 'SCORE', l: 'POPS', lv: 'LEVEL' }[sortKey], OCEAN);
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
    ['', 'rainbow, vines, lava, glitches!'],
  ];
  const top = sy + sw / 2 + 18, rowH = Math.min(38, (ph - (top - py) - 80) / lines.length), fs = Math.min(16, pw / 25);
  lines.forEach(([a, b], i) => {
    const y = top + i * rowH + rowH / 2;
    if (a) fitTxt(a, px + pw * 0.05, y, fs, pw * 0.3, '#ffe23d', null, 'left');
    fitTxt(b, px + pw * 0.36, y, fs, pw * 0.6, '#fff', null, 'left');
  });
  const bh = Math.min(52, H * 0.065);
  button('back', W / 2, py + ph - bh * 0.8 - 8, Math.min(220, pw * 0.6), bh, 'GOT IT!', DEEP);
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
  for (let y = HID - 1; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const v = g.board[y][x]; if (!v) continue;
      const k = y * COLS + x;
      let sx = bx + x * c, sy = by + (y - HID) * c;
      if (fallK < 1 && g.fallOff[k]) sy -= g.fallOff[k] * c * (1 - fallK * fallK);
      if (popK >= 0 && g.popMask[k]) {
        const s = c * (1 + 0.25 * Math.sin(popK * Math.PI) - popK * 0.9);
        drawBlock(Math.floor(popK * 14) % 2 ? 8 : spr(v), sx + (c - s) / 2, sy + (c - s) / 2, Math.max(1, s));
        continue;
      }
      let si = spr(v);
      if (gl && gl.cells.indexOf(k) >= 0) { sx += rand(-2, 2) * gl.t * 2; if (Math.sin(T * 50) > 0) si = Math.floor(T * 20) % nColors(); }
      const age = g.time - g.anim[k];
      if (age >= 0 && age < 0.22) { // squash on landing
        const kk = age / 0.22, sq = Math.sin(kk * Math.PI) * (1 - kk);
        const hh = c * (1 - 0.3 * sq), ww = c * (1 + 0.18 * sq);
        ctx.drawImage(sprites[si], sx - (ww - c) / 2, sy + c - hh, ww, hh);
      } else drawBlock(si, sx, sy, c);
    }
  }
  if (g.warn) { // lava warning glow
    const a = 0.25 + 0.25 * Math.sin(T * 14);
    const gr = ctx.createLinearGradient(0, by + bh - c * 2.5, 0, by + bh); gr.addColorStop(0, 'rgba(255,90,31,0)'); gr.addColorStop(1, 'rgba(255,90,31,' + (a + 0.3) + ')');
    ctx.fillStyle = gr; ctx.fillRect(bx, by + bh - c * 2.5, bw, c * 2.5);
    txt('LAVA RISING!', bx + bw / 2, by + bh - c * 0.9, c * 0.75, '#ffd23d', '#3a0a00');
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
  ctx.restore();
}
function drawHUD() {
  const st = STAGES[g.stage], y0 = L.top, h = L.hudH;
  txt('SCORE', L.bx, y0 + h * 0.18, Math.max(11, h * 0.2), 'rgba(255,255,255,0.75)', null, 'left');
  const sc = 1 + g.pop * 0.3;
  ctx.save(); ctx.translate(L.bx, y0 + h * 0.62); ctx.scale(sc, sc);
  txt(fmt(g.disp), 0, 0, h * 0.5, g.pop > 0.05 ? '#ffe23d' : '#ffffff', '#1a0530', 'left', NFONT);
  ctx.restore();
  const ps = Math.min(44, h - 8), pxp = L.right - ps / 2;
  if (state === 'play' && !paused) button('pause', pxp, y0 + h / 2, ps, ps, '', ['rgba(0,229,255,0.35)', 'rgba(41,121,255,0.35)'], { icon: 'pause', r: 10, glow: false });
  const rx = pxp - ps / 2 - 10;
  txt('STAGE ' + (g.stage + 1), rx, y0 + h * 0.28, Math.max(11, h * 0.2), 'rgba(255,255,255,0.75)', null, 'right');
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
  for (const [lab, val, col] of [['LEVEL', g.level, st.c2], ['POPPED', g.popped, '#fff'], ['BEST', best(), '#ffe23d']]) {
    txt(lab, x + w / 2, y + c * 0.35, c * 0.42, 'rgba(255,255,255,0.7)', null);
    fitTxt(fmt(val), x + w / 2, y + c * 1.0, c * 0.72, w, col, '#1a0530', 'center', NFONT);
    y += c * 1.75;
  }
  if (g.stage < 4) { // progress to next stage
    const k = (g.popped % STAGE_POPS) / STAGE_POPS;
    txt('NEXT STAGE', x + w / 2, y + c * 0.35, c * 0.38, 'rgba(255,255,255,0.7)', null);
    rr(x + 2, y + c * 0.7, w - 4, c * 0.5, c * 0.25); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
    rr(x + 2, y + c * 0.7, Math.max(c * 0.5, (w - 4) * k), c * 0.5, c * 0.25); ctx.fillStyle = st.c1; ctx.fill();
    y += c * 1.6;
  }
  if (g.maxChain >= 2) { txt('BEST CHAIN', x + w / 2, y + c * 0.35, c * 0.38, 'rgba(255,255,255,0.7)', null); txt('x' + g.maxChain, x + w / 2, y + c, c * 0.72, '#2bf0ff', '#1a0530', 'center', NFONT); }
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
  const pw = Math.min(W - 40, 340), bh = Math.min(54, H * 0.065), gap = bh * 0.3, ph = bh * 5 + gap * 4 + 150;
  const px = (W - pw) / 2, py = (H - ph) / 2;
  panel(px, py, pw, ph, STAGES[g.stage].c1);
  wobblyWord('PAUSED', W / 2, py + 44, Math.min(44, pw / 6), T, 0, COLORS, pw * 0.9);
  fitTxt('Go grab a snack. The blocks will wait.', W / 2, py + 88, 15, pw * 0.9, '#ffe23d', null);
  const items = [['resume', 'RESUME', DEEP], ['restart', 'RESTART', TEAL], ['music', 'MUSIC: ' + (settings.music ? 'ON' : 'OFF'), AQUA],
    ['buttons', 'BUTTONS: ' + (settings.buttons ? 'ON' : 'OFF'), OCEAN], ['menu', 'MAIN MENU', TEAL]];
  items.forEach(([id, l, col], i) => button(id, W / 2, py + 120 + i * (bh + gap) + bh / 2, pw * 0.8, bh, l, col));
}
function drawEntry() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
  const pw = Math.min(W - 30, 380), ph = Math.min(H - 60, 430), px = (W - pw) / 2, py = (H - ph) / 2;
  panel(px, py, pw, ph, '#1DE9B6');
  wobblyWord('NEW HIGH SCORE!', W / 2, py + 44, Math.min(34, pw / 10), T * 1.5, 0, COLORS, pw * 0.92);
  txt(fmt(g.score), W / 2, py + 98, Math.min(44, pw / 7), '#ffe23d', '#1a0530', 'center', NFONT);
  txt('ENTER YOUR INITIALS', W / 2, py + 145, 16, '#fff', null);
  const sw = Math.min(74, pw / 4.3), cy = py + 245;
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
  const pw = Math.min(W - 30, 380), ph = Math.min(H - 60, 400), px = (W - pw) / 2, py = (H - ph) / 2, k = Math.min(1, overT / 0.35);
  const e = easeOutBack(k);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(e, e); ctx.translate(-W / 2, -H / 2);
  panel(px, py, pw, ph, '#ff4050');
  wobblyWord('GAME OVER', W / 2, py + 48, Math.min(46, pw / 7), T * 1.3, 0, ['#ff4050', '#ff8c1a', '#ffd91a'], pw * 0.9);
  fitTxt(overJoke, W / 2, py + 96, 16, pw * 0.9, '#fff', null);
  txt(fmt(g.score), W / 2, py + 150, Math.min(48, pw / 7), '#ffe23d', '#1a0530', 'center', NFONT);
  txt('POPPED ' + g.popped + '   \u00b7   CHAIN x' + g.maxChain, W / 2, py + 196, 16, 'rgba(255,255,255,0.8)', null);
  if (rankNew) txt('#' + rankNew + ' ON THE BOARD!', W / 2, py + 228, 20, '#2bf0ff', '#000');
  ctx.restore();
  // buttons drawn unscaled so hit boxes match
  if (k >= 1) {
    const bh = Math.min(54, H * 0.065);
    button('again', W / 2, py + ph - bh * 2 - 22, pw * 0.7, bh, 'PLAY AGAIN', DEEP);
    button('menu', W / 2, py + ph - bh * 0.5 - 14, pw * 0.7, bh, 'MENU', OCEAN);
  }
}

// ---------------------------------------------------------------- main loop
let last = performance.now();
function syncMusic() {
  const want = A.ctx && settings.sound && settings.music && (state === 'title' || state === 'scores' || state === 'howto' || (state === 'play' && !paused));
  if (want && !M.timer) musicStart(); else if (!want && M.timer) musicStop();
  if (state !== 'play') M.stage = 0;
}
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; T += dt;
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
    if (state === 'title' || state === 'scores' || state === 'howto') updateRain(dt);
    if (state === 'entry' && Math.random() < dt * 6) confetti(2);
    if (!paused) updateFX(dt);
    syncMusic();

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    UI = [];
    drawBG(T);
    if (state === 'title' || state === 'scores' || state === 'howto') { ctx.fillStyle = cache.menuWash; ctx.fillRect(0, 0, W, H); }
    if (state === 'title') { drawTitle(); drawFX(); }
    else if (state === 'scores') { drawRain(); drawScores(); drawFX(); }
    else if (state === 'howto') { drawRain(); drawHowto(); drawFX(); }
    else {
      let sx = 0, sy = 0;
      if (shakeT > 0) { const m = shakeM * (shakeT / shakeD); sx = rand(-m, m); sy = rand(-m, m); }
      ctx.save(); ctx.translate(sx, sy);
      drawBoard(); drawSide(); drawFX();
      ctx.restore();
      if (flashA > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flashA + ')'; ctx.fillRect(0, 0, W, H); }
      drawHUD(); drawControls(); drawBannerUI();
      if (state === 'play' && paused) drawPause();
      else if (state === 'entry') { drawEntry(); drawFX(); }
      else if (state === 'over') drawOver();
    }
    drawBursts();
  } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}
layout();
window.__bb = {
  get state() { return state; }, get paused() { return paused; }, get piece() { return g.piece ? Object.assign({}, g.piece) : null; },
  get score() { return g.score; }, get popped() { return g.popped; }, get stage() { return g.stage; }, get chain() { return g.maxChain; }, get resolving() { return !!g.res; }, dbg, get audio() { return A.ctx ? A.ctx.state : 'none'; },
  get layout() { return Object.assign({ W, H }, L); }, get buttons() { return UI.map((b) => Object.assign({}, b)); },
};
requestAnimationFrame(frame);
})();
