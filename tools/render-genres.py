#!/usr/bin/env python3
"""Render original rock, pop and classical beds.

Compositions are original. They are not arrangements of existing songs.
Rock is sequenced from recorded samples: a Fender electric guitar already
played through an amplifier (FreePats Distorted #2, CC0), a picked Yamaha
bass (CC0) and a close-miked acoustic kit (MuldjordKit, CC BY 4.0).
Pop and classical still use FluidR3_GM.
"""
import os
import struct
import subprocess
import wave
from midiutil import MIDIFile

SF = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'music')
TMP = '/tmp/genre-render'
os.makedirs(TMP, exist_ok=True)
os.makedirs(OUT, exist_ok=True)


def new_midi():
    mf = MIDIFile(1)
    mf.addTempo(0, 0, 120)
    return mf


def clip_note(beat, dur, limit):
    if beat >= limit - 0.03:
        return None
    if beat + dur > limit - 0.02:
        dur = limit - beat - 0.02
    if dur < 0.04:
        return None
    return dur


class Song:
    def __init__(self, bpm, bars):
        self.bpm = bpm
        self.bars = bars
        self.limit = bars * 4
        self.mf = MIDIFile(1, removeDuplicates=False, deinterleave=False)
        self.mf.addTempo(0, 0, bpm)
        self._prog = set()

    def prog(self, ch, program, pan=64, vol=100):
        if ch in self._prog:
            return
        self._prog.add(ch)
        self.mf.addProgramChange(0, ch, 0, program)
        self.mf.addControllerEvent(0, ch, 0, 7, vol)
        self.mf.addControllerEvent(0, ch, 0, 10, pan)

    def n(self, ch, pitch, beat, dur, vel):
        d = clip_note(beat, dur, self.limit)
        if d is None:
            return
        self.mf.addNote(0, ch, int(pitch), float(beat), float(d), int(max(1, min(127, vel))))

    def save(self, path):
        with open(path, 'wb') as f:
            self.mf.writeFile(f)


def power(s, ch, root, beat, dur, vel):
    s.n(ch, root, beat, dur, vel)
    s.n(ch, root + 7, beat, dur, max(1, vel - 10))
    s.n(ch, root + 12, beat, dur, max(1, vel - 14))


def render_wav(mid, wav, reverb=True, soundfont=None, gain=0.65):
    cmd = ['fluidsynth', '-ni', '-R', '1' if reverb else '0', '-C', '0', '-g', f'{gain:.2f}',
           '-r', '44100', '-F', wav, '-T', 'wav', soundfont or SF, mid]
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def read_wav(path):
    with wave.open(path, 'rb') as w:
        ch, sw, sr, n, _, _ = w.getparams()[:6]
        raw = w.readframes(n)
    import numpy as np
    x = np.frombuffer(raw, dtype='<i2').astype('float32') / 32768.0
    if ch == 2:
        x = x.reshape(-1, 2)
    return x, sr


def write_wav(path, x, sr):
    import numpy as np
    y = np.clip(x, -1, 1)
    pcm = (y * 32767.0).astype('<i2').tobytes()
    ch = 1 if y.ndim == 1 else y.shape[1]
    with wave.open(path, 'wb') as w:
        w.setnchannels(ch)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm)


def fold_loop(x, sr, seconds):
    """Fold the reverb tail onto the downbeat, then overlap-add a short seam.

    The file ends on the sample just before the overlap, and the start begins
    with that same sample, so a looping player does not click.
    """
    import numpy as np
    n = int(round(seconds * sr))
    if len(x) < n + 8:
        raise SystemExit('render shorter than the loop')
    tail = x[n:]
    body = x[:n].copy()
    fade_n = min(len(tail), int(0.7 * sr))
    ramp = np.linspace(1.0, 0.0, fade_n, dtype='float32')
    if body.ndim == 2:
        ramp = ramp[:, None]
    body[:fade_n] += tail[:fade_n] * ramp
    seam = int(0.04 * sr)
    fade_in = np.linspace(0.0, 1.0, seam, dtype='float32')
    fade_out = 1.0 - fade_in
    if body.ndim == 2:
        fade_in = fade_in[:, None]
        fade_out = fade_out[:, None]
    head = body[:seam].copy()
    overlapped = head * fade_in + body[-seam:] * fade_out
    body = body[:-seam]
    body[:seam] = overlapped
    return body


def encode(wav, stem):
    ogg = os.path.join(OUT, stem + '.ogg')
    mp3 = os.path.join(OUT, stem + '.mp3')
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '5', ogg])
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '160k', mp3])
    for p in (ogg, mp3):
        sz = os.path.getsize(p)
        print(f'  {os.path.basename(p):22} {sz/1e6:.2f} MB')


def finish(name, wav_in, seconds):
    x, sr = read_wav(wav_in)
    loop = fold_loop(x, sr, seconds)
    # peak normalize to about -1.5 dBFS
    peak = float(abs(loop).max()) or 1
    loop *= min(2.5, 0.84 / peak)
    out = os.path.join(TMP, name + '-loop.wav')
    write_wav(out, loop, sr)
    encode(out, 'genre-' + name)
    return out


# ---------------------------------------------------------------- rock
# Original instrumental, 168 BPM, key of E.
# Rhythm guitar, lead guitar, picked bass and an acoustic kit are recorded
# samples, sequenced here. No synth, no oscillator, no extra distortion.
# Style reference only: fast mid-2000s pop-punk / heavier alt-rock.
# The notes are not taken from any existing song.

ROCK_BPM = 168
ROCK_BARS = 80
E, A, D, G, B = 40, 45, 50, 55, 59

# Loud recorded takes. In these fonts, MIDI velocity picks a sample, and the
# high 110s are the hard hits (kick, snare, and the distorted guitar).
GTR_V = (118, 112, 124, 115, 120, 110, 122)
LEAD_V = (116, 120, 112, 124, 118)
KICK_V = (124, 118, 113, 120, 125)
SNARE_V = (124, 117, 112, 119, 125)
HAT_V = (108, 100, 104, 96)
TOM_V = (120, 124, 115, 118)


class RR:
    def __init__(self):
        self.n = {}

    def pick(self, key, options):
        i = self.n.get(key, 0)
        self.n[key] = i + 1
        return options[i % len(options)]


def rock_fonts():
    """Recorded soundfonts. Not committed; the render looks them up on disk."""
    import glob
    want = {
        'gtr': 'EGuitarFSBS-dist2',
        'bas': 'PickedBassYR',
        'drm': 'MuldjordKit',
    }
    roots = ['/tmp/v47-sf', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sf2-cache')]
    found = {}
    hits = []
    for root in roots:
        hits.extend(glob.glob(os.path.join(root, '**', '*.sf2'), recursive=True))
    for key, frag in want.items():
        for path in hits:
            if frag in os.path.basename(path):
                found[key] = path
                break
    missing = [k for k in want if k not in found]
    if missing:
        raise SystemExit(
            'missing recorded fonts: ' + ', '.join(missing) +
            '\nGuitars (CC0): https://github.com/freepats/electric-guitar-FSBS-dist2/releases/download/2022-09-11/EGuitarFSBS-dist2-SF2-20220911.7z'
            '\nBass (CC0): https://github.com/freepats/electric-bass-YR/releases/download/2019-09-30/PickedBassYR-SF2-20190930.7z'
            '\nDrums (CC BY 4.0): https://github.com/freepats/muldjordkit/releases/download/2020-10-18/MuldjordKit-SF2-20201018.7z'
        )
    return found


def rock_chord(s, rr, root, beat, dur):
    """A downstroke. Root, fifth and octave, plus a high fifth when the hit is long."""
    notes = [root, root + 7, root + 12]
    if dur >= 0.6:
        notes.append(root + 19)
    for i, pitch in enumerate(notes):
        s.n(0, pitch, beat + i * 0.022, max(0.08, dur - i * 0.012), rr.pick('g', GTR_V))


def rock_chug(s, rr, bar, root):
    t = bar * 4
    for i in range(8):
        rock_chord(s, rr, root, t + i * 0.5, 0.26)


def rock_open(s, rr, bar, root):
    t = bar * 4
    rock_chord(s, rr, root, t, 0.82)
    rock_chord(s, rr, root, t + 2.0, 0.70)
    for off in (1.0, 1.5, 2.5, 3.0, 3.5):
        rock_chord(s, rr, root, t + off, 0.22)


def rock_half(s, rr, bar, root):
    t = bar * 4
    rock_chord(s, rr, root, t, 1.55)
    rock_chord(s, rr, root, t + 2.0, 1.35)


# Single notes on pitches the guitar bank actually recorded, so the lead is
# not a pitch-stretched synth-like tone. Original line, not a quote.
HOOK = [
    (0.00, 64, 0.42), (0.50, 67, 0.36), (1.00, 71, 0.42), (1.50, 67, 0.32),
    (2.00, 64, 0.36), (2.50, 61, 0.32), (3.00, 64, 0.48),
    (4.00, 71, 0.36), (4.50, 74, 0.42), (5.00, 71, 0.32), (5.50, 67, 0.36),
    (6.00, 64, 0.50), (7.00, 59, 0.36), (7.50, 64, 0.40),
    (8.00, 67, 0.36), (8.50, 71, 0.46), (9.50, 74, 0.36), (10.0, 71, 0.32),
    (10.5, 67, 0.36), (11.0, 64, 0.42), (12.0, 61, 0.32), (12.5, 64, 0.36),
    (13.0, 67, 0.36), (13.5, 71, 0.50), (14.5, 64, 0.36),
]


def rock_hook(s, rr, bar):
    base = bar * 4
    for off, pitch, dur in HOOK:
        s.n(0, pitch, base + off, dur, rr.pick('lead', LEAD_V))


def rock_kit(s, rr, bar, kind='verse', fill=False, crash=False):
    t = bar * 4
    if crash and kind != 'build':
        s.n(0, 58, t, 2.0, 112)
    if kind == 'half':
        s.n(0, 48, t, 0.28, rr.pick('k', KICK_V))
        s.n(0, 48, t + 2.0, 0.24, rr.pick('k', KICK_V))
        s.n(0, 50, t + 2.0, 0.24, rr.pick('s', SNARE_V))
        for off, vel in ((0.0, 100), (1.0, 88), (2.0, 100), (3.0, 88)):
            s.n(0, 52, t + off, 0.16, vel)
        return
    if kind == 'build':
        for i in range(16):
            s.n(0, 50, t + i * 0.25, 0.10, 96 + i * 2)
        s.n(0, 48, t, 0.2, rr.pick('k', KICK_V))
        s.n(0, 48, t + 2.0, 0.16, rr.pick('k', KICK_V))
        return
    for i in range(8):
        hat = 53 if (kind == 'chorus' and i % 4 == 3) else 52
        vel = rr.pick('h', HAT_V) if i % 2 == 0 else 90
        s.n(0, hat, t + i * 0.5, 0.12, vel)
    for off in (0.0, 1.5, 2.5):
        s.n(0, 48, t + off, 0.16, rr.pick('k', KICK_V))
    if kind == 'chorus':
        s.n(0, 48, t + 3.5, 0.12, rr.pick('k', KICK_V))
    s.n(0, 50, t + 1.0, 0.16, rr.pick('s', SNARE_V))
    if fill:
        for off, tom in ((2.5, 61), (2.75, 62), (3.0, 63), (3.25, 64), (3.5, 62), (3.75, 50)):
            if tom == 50:
                s.n(0, tom, t + off, 0.12, rr.pick('s', SNARE_V))
            else:
                s.n(0, tom, t + off, 0.12, rr.pick('t', TOM_V))
    else:
        s.n(0, 50, t + 3.0, 0.16, rr.pick('s', SNARE_V))


def bass_note(root):
    b = root - 12
    while b > 40:
        b -= 12
    while b < 28:
        b += 12
    return b


def rock_bass(s, bar, root, kind='drive'):
    t = bar * 4
    b = bass_note(root)
    if kind == 'half':
        s.n(0, b, t, 1.5, 116)
        s.n(0, b, t + 2.0, 1.4, 110)
        return
    for i in range(8):
        n = b + 12 if i == 6 and b + 12 <= 40 else b
        s.n(0, n, t + i * 0.5, 0.36, 114 if i % 2 == 0 else 100)


def rock_events():
    """(bar, root, guitar_kind, drum_kind, fill, crash, lead)."""
    verse = [E, E, A, D, E, G, D, A]
    chorus = [E, G, D, A]
    pre = [G, D, A, E]
    ev = []
    for bar in range(16):
        ev.append((bar, verse[bar % 8], 'chug', 'verse', bar % 8 == 7, bar % 8 == 0, False))
    for i, root in enumerate(pre):
        ev.append((16 + i, root, 'open', 'chorus', i == 3, True, False))
    for cycle in range(4):
        for i, root in enumerate(chorus):
            bar = 20 + cycle * 4 + i
            ev.append((bar, root, 'open', 'chorus', i == 3, i == 0, i == 0))
    for bar in range(36, 52):
        ev.append((bar, verse[(bar - 36) % 8], 'chug', 'chorus', (bar - 36) % 8 == 7, (bar - 36) % 8 == 0, False))
    for i, root in enumerate(pre):
        ev.append((52 + i, root, 'open', 'chorus', i == 3, True, False))
    for cycle in range(4):
        for i, root in enumerate(chorus):
            bar = 56 + cycle * 4 + i
            ev.append((bar, root, 'open', 'chorus', i == 3, i == 0, i == 0))
    for i, root in enumerate((E, G, D, A)):
        ev.append((72 + i, root, 'half', 'half', False, i == 0, False))
    for bar, root in ((76, E), (77, A), (78, D), (79, E)):
        kind = 'build' if bar == 79 else 'verse'
        ev.append((bar, root, 'chug', kind, False, False, False))
    return ev


def build_rock(part):
    s = Song(ROCK_BPM, ROCK_BARS)
    s.prog(0, 0, pan=64, vol=124)
    rr = RR()
    for bar, root, gk, dk, fill, crash, lead in rock_events():
        if part == 'gtr':
            if gk == 'chug':
                rock_chug(s, rr, bar, root)
            elif gk == 'half':
                rock_half(s, rr, bar, root)
            else:
                rock_open(s, rr, bar, root)
        elif part == 'lead' and lead:
            rock_hook(s, rr, bar)
        elif part == 'drm':
            rock_kit(s, rr, bar, dk, fill=fill, crash=crash)
        elif part == 'bas':
            rock_bass(s, bar, root, 'half' if gk == 'half' else 'drive')
    return s


def _highpass(x, sr, fc):
    import numpy as np
    a = np.float32(np.exp(-2.0 * np.pi * fc / sr))
    y = np.empty_like(x)
    px = np.zeros(x.shape[1], dtype='float32') if x.ndim == 2 else np.float32(0)
    py = np.zeros(x.shape[1], dtype='float32') if x.ndim == 2 else np.float32(0)
    for i in range(len(x)):
        py = a * (py + x[i] - px)
        px = x[i]
        y[i] = py
    return y


def widen_guitar(mono, sr):
    """Second performance: a few cents sharp and a short delay, panned right."""
    import numpy as np
    rate = 2.0 ** (8.0 / 1200.0)
    n = len(mono)
    idx = np.minimum(np.arange(n, dtype=np.float64) * rate, n - 1.001)
    i0 = idx.astype(np.int32)
    frac = (idx - i0).astype(np.float32)
    i1 = np.minimum(i0 + 1, n - 1)
    det = mono[i0] * (1.0 - frac) + mono[i1] * frac
    delay = int(0.014 * sr)
    right = np.zeros(n, dtype=np.float32)
    right[delay:] = det[:n - delay]
    return np.stack([mono, right * np.float32(0.97)], axis=1)


def _p99(x):
    import numpy as np
    mono = x.mean(axis=1) if x.ndim == 2 else x
    return float(np.percentile(np.abs(mono), 99))


def _scale_p99(x, target):
    import numpy as np
    p = _p99(x)
    return x * np.float32(target / (p + 1e-9))


def mix_report(parts, mix, sr, bpm):
    """Guitars and drums have to be the loudest things. Quiet frames must not hiss."""
    import numpy as np
    print('  stem p99  ' + '  '.join(f'{name}={_p99(x):.3f}' for name, x in parts))
    gtr = parts[0][1] + parts[1][1]
    drm = parts[2][1]
    bas = parts[3][1]
    gp, dp, bp = _p99(gtr), _p99(drm), _p99(bas)
    print(f'  balance guitar={gp:.3f} drums={dp:.3f} bass={bp:.3f}')
    if gp < bp * 1.35 or dp < bp * 1.35:
        raise SystemExit('bass is covering the guitars or the drums')
    mono = mix.mean(axis=1) if mix.ndim == 2 else mix
    # guitar side energy: a real double-track is wide
    if mix.ndim == 2:
        side = (mix[:, 0] - mix[:, 1]) * 0.5
        mid = mix.mean(axis=1)
        width = float(np.sqrt(np.mean(side ** 2)) / (np.sqrt(np.mean(mid ** 2)) + 1e-9))
        print(f'  stereo width={width:.2f}')
    hop = int(0.03 * sr)
    quiet_air = []
    loud_air = []
    rmses = []
    for i in range(0, len(mono) - hop, hop):
        frame = mono[i:i + hop]
        rms = float(np.sqrt(np.mean(frame * frame)))
        rmses.append(rms)
    rmses = np.array(rmses)
    lo = np.percentile(rmses, 20)
    hi = np.percentile(rmses, 80)
    spec_i = 0
    for i in range(0, len(mono) - hop, hop):
        frame = mono[i:i + hop]
        spec = np.abs(np.fft.rfft(frame * np.hanning(len(frame)))) ** 2
        freqs = np.fft.rfftfreq(len(frame), 1.0 / sr)
        air = float(spec[freqs >= 8000].sum() / (spec.sum() + 1e-12))
        if rmses[spec_i] <= lo:
            quiet_air.append(air)
        elif rmses[spec_i] >= hi:
            loud_air.append(air)
        spec_i += 1
    q = float(np.median(quiet_air)) if quiet_air else 0
    loud = float(np.median(loud_air)) if loud_air else 0
    print(f'  air-band quiet={q:.3f} loud={loud:.3f}')
    if q > 0.25:
        raise SystemExit('hiss in the quiet frames')
    return {'guitar': gp, 'drums': dp, 'bass': bp, 'quiet_air': q}


def mix_rock(gtr, lead, drm, bas, out):
    import numpy as np
    stems = [read_wav(p) for p in (gtr, lead, drm, bas)]
    sr = stems[0][1]
    n = max(len(x) for x, _sr in stems)
    def fit(x):
        if len(x) >= n:
            return x[:n]
        pad = np.zeros((n - len(x), x.shape[1]), dtype=x.dtype) if x.ndim == 2 else np.zeros(n - len(x), dtype=x.dtype)
        return np.concatenate([x, pad], axis=0)
    g = fit(stems[0][0])
    lead_x = fit(stems[1][0])
    d = fit(stems[2][0])
    b = fit(stems[3][0])
    gm = g.mean(axis=1) if g.ndim == 2 else g
    lm = lead_x.mean(axis=1) if lead_x.ndim == 2 else lead_x
    bm = b.mean(axis=1) if b.ndim == 2 else b
    if d.ndim == 1:
        d = np.stack([d, d], axis=1)
    gm = _highpass(gm, sr, 80.0)
    t0 = int(20 * 4 * 60.0 / ROCK_BPM * sr)
    seg = gm[t0:t0 + 4 * sr]
    hop = max(1, int(0.02 * sr))
    rms = np.array([np.sqrt(np.mean(seg[i:i + hop] ** 2)) for i in range(0, len(seg) - hop, hop)])
    cv = float(rms.std() / (rms.mean() + 1e-9))
    print(f'  rhythm chorus cv={cv:.2f}')
    if cv < 0.40:
        raise SystemExit('rhythm guitar is a held tone')
    wide = widen_guitar(gm, sr)
    # lead stays near the center so it reads as a guitar line, not a pad
    lead_st = np.stack([lm * np.float32(0.92), lm * np.float32(0.78)], axis=1)
    bass_st = np.stack([bm, bm], axis=1)
    wide = _scale_p99(wide, 0.55)
    lead_st = _scale_p99(lead_st, 0.42)
    d = _scale_p99(d, 0.62)
    bass_st = _scale_p99(bass_st, 0.22)
    y = wide + lead_st + d + bass_st
    peak = float(np.max(np.abs(y)))
    if peak > 0.98:
        y *= np.float32(0.98 / peak)
    print('mix check')
    mix_report([('rhythm', wide), ('lead', lead_st), ('drums', d), ('bass', bass_st)], y, sr, ROCK_BPM)
    write_wav(out, y, sr)
    return out

# ---------------------------------------------------------------- pop
# Original, C major, 112 BPM. Piano and clean guitar, a sung-style hook
# with no singer, bass, and a pop kit (kick on 1 and 3, clap on 2 and 4).

POP = {
    'C': ([60, 64, 67], 36),
    'Em': ([64, 67, 71], 40),
    'F': ([65, 69, 72], 41),
    'G': ([67, 71, 74], 43),
    'Am': ([69, 72, 76], 45),
    'Dm': ([62, 65, 69], 38),
}


def pop_kit(s, bar, bright=False, fill=False):
    t = bar * 4
    s.n(9, 36, t, 0.22, 114)
    s.n(9, 36, t + 1.5, 0.16, 92)
    s.n(9, 36, t + 2, 0.2, 108)
    for off in (1, 3):
        s.n(9, 38, t + off, 0.18, 112)
        s.n(9, 39, t + off + 0.01, 0.12, 96)  # hand clap sample
    for i in range(8):
        s.n(9, 42, t + i * 0.5, 0.1, 70 if i % 2 == 0 else 52)
    if bright:
        s.n(9, 46, t + 3.5, 0.2, 78)
    if fill:
        s.n(9, 45, t + 3.0, 0.12, 90)
        s.n(9, 47, t + 3.25, 0.1, 94)
        s.n(9, 50, t + 3.5, 0.1, 98)
        s.n(9, 49, t + 3.75, 0.3, 100)


def pop_piano(s, bar, name, bouncy=True):
    notes, _ = POP[name]
    t = bar * 4
    dur = 0.34 if bouncy else 1.55
    steps = (0, 2) if bouncy else (0, 2)
    for st in steps:
        for i, n in enumerate(notes):
            s.n(0, n, t + st + i * 0.012, dur, 88 - i * 3)
    if bouncy:
        for i, n in enumerate(notes):
            s.n(0, n + 12, t + 3 + i * 0.01, 0.28, 74)


def pop_guitar(s, bar, name):
    notes, _ = POP[name]
    t = bar * 4
    for st in (0, 1.5, 2, 3):
        for i, n in enumerate(notes):
            s.n(2, n, t + st + i * 0.018, 0.42, 96 if st in (0, 2) else 80)


def pop_bass(s, bar, name):
    _, root = POP[name]
    t = bar * 4
    s.n(3, root, t, 0.85, 108)
    s.n(3, root + 7, t + 1.5, 0.35, 90)
    s.n(3, root + 12, t + 2, 0.7, 102)
    s.n(3, root, t + 3.0, 0.4, 92)
    s.n(3, root + 7, t + 3.5, 0.28, 84)


# 8-bar hook in C major. Original contour, not a quotation.
POP_HOOK = [
    (0.0, 76, 0.45, 108), (0.5, 79, 0.4, 106), (1.0, 81, 0.9, 114),
    (2.0, 79, 0.4, 104), (2.5, 76, 0.4, 102), (3.0, 74, 0.85, 108),
    (4.0, 72, 0.45, 104), (4.5, 76, 0.4, 106), (5.0, 79, 0.9, 112),
    (6.0, 77, 0.35, 100), (6.5, 76, 0.35, 100), (7.0, 74, 0.9, 106),
    (8.0, 76, 0.4, 106), (8.5, 79, 0.4, 108), (9.0, 84, 0.9, 116),
    (10.0, 81, 0.4, 108), (10.5, 79, 0.4, 106), (11.0, 76, 0.85, 110),
    (12.0, 74, 0.45, 104), (12.5, 76, 0.4, 106), (13.0, 79, 0.45, 108),
    (13.5, 81, 0.4, 110), (14.0, 79, 0.7, 108), (15.0, 76, 0.8, 104),
    (16.0, 76, 0.4, 108), (16.5, 79, 0.4, 110), (17.0, 81, 0.9, 116),
    (18.0, 84, 0.45, 112), (18.5, 81, 0.4, 108), (19.0, 79, 0.9, 110),
    (20.0, 76, 0.45, 106), (20.5, 74, 0.4, 104), (21.0, 72, 0.9, 108),
    (22.0, 74, 0.4, 104), (22.5, 76, 0.4, 106), (23.0, 79, 0.85, 112),
    (24.0, 81, 0.9, 114), (25.0, 79, 0.45, 108), (25.5, 76, 0.4, 106),
    (26.0, 74, 0.9, 108), (27.0, 72, 0.9, 106),
    (28.0, 74, 0.45, 104), (28.5, 76, 0.4, 106), (29.0, 79, 0.45, 108),
    (29.5, 81, 0.4, 110), (30.0, 84, 0.7, 114), (31.0, 79, 0.85, 108),
]


def pop_section(s, start, names, hook=False, guitar=True, bouncy=True):
    for i, name in enumerate(names):
        bar = start + i
        pop_piano(s, bar, name, bouncy=bouncy)
        pop_bass(s, bar, name)
        pop_kit(s, bar, bright=hook, fill=(hook and i == len(names) - 1))
        if guitar:
            pop_guitar(s, bar, name)
        if hook and i == 0:
            base = bar * 4
            for off, pitch, dur, vel in POP_HOOK:
                s.n(0, pitch, base + off, dur, vel)
                s.n(2, pitch - 12, base + off, dur * 0.9, vel - 14)


def build_pop():
    s = Song(112, 56)
    s.prog(0, 0, pan=58, vol=104)    # acoustic grand
    s.prog(1, 4, pan=78, vol=80)     # electric piano, color
    s.prog(2, 27, pan=48, vol=96)    # clean electric guitar
    s.prog(3, 33, pan=64, vol=112)   # finger bass
    verse = ['C', 'Em', 'F', 'G'] * 4          # 16
    chorus = ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'G']  # 8
    verse2 = ['C', 'Em', 'F', 'G'] * 3         # 12
    brk = ['Am', 'Em', 'F', 'G']               # 4
    pop_section(s, 0, verse, hook=False, guitar=False, bouncy=True)
    pop_section(s, 16, chorus, hook=True, guitar=True, bouncy=False)
    pop_section(s, 24, verse2, hook=False, guitar=True, bouncy=True)
    pop_section(s, 36, brk, hook=False, guitar=False, bouncy=True)
    pop_section(s, 40, chorus, hook=True, guitar=True, bouncy=False)
    pop_section(s, 48, chorus, hook=True, guitar=True, bouncy=False)
    return s


# ---------------------------------------------------------------- classical
# Original allegro in D major. Strings, piano, flute, oboe, horn. No drums.

D2, A2, B2, Fs2, G2, E2 = 38, 45, 47, 42, 43, 40


def vln(s, bar, notes, ch=0, vel=86):
    t = bar * 4
    for off, pitch, dur in notes:
        s.n(ch, pitch, t + off, dur * 0.96, vel)


# diatonic third below in D major, for the pitches we actually use
THIRD = {}
_scale = [62, 64, 66, 67, 69, 71, 73]
_below = [59, 61, 62, 64, 66, 67, 69]
for _oct in range(-1, 4):
    for _a, _b in zip(_scale, _below):
        THIRD[_a + 12 * _oct] = _b + 12 * _oct


A_MELODY = [
    [(0, 74, 1.4), (1.5, 78, 0.45), (2.0, 76, 0.9), (3.0, 74, 0.85)],
    [(0, 69, 1.7), (2.0, 71, 0.4), (2.5, 73, 0.4), (3.0, 74, 0.45), (3.5, 76, 0.4)],
    [(0, 78, 1.4), (1.5, 76, 0.4), (2.0, 74, 1.7)],
    [(0, 73, 0.85), (1.0, 74, 0.4), (1.5, 76, 0.4), (2.0, 78, 0.4), (2.5, 81, 0.4), (3.0, 78, 0.85)],
    [(0, 79, 1.3), (1.5, 78, 0.4), (2.0, 76, 0.85), (3.0, 74, 0.85)],
    [(0, 74, 0.85), (1.0, 73, 0.85), (2.0, 71, 1.7)],
    [(0, 69, 0.4), (0.5, 71, 0.4), (1.0, 73, 0.4), (1.5, 74, 0.4), (2.0, 76, 0.85), (3.0, 74, 0.85)],
    [(0, 73, 0.7), (1.0, 71, 0.7), (2.0, 69, 1.8)],
]
# sequence: same rhythm starting a step up, used in the B section's first half
B_MELODY = [
    [(0, 79, 1.2), (1.5, 81, 0.4), (2.0, 79, 0.85), (3.0, 76, 0.85)],
    [(0, 74, 0.4), (0.5, 76, 0.4), (1.0, 78, 0.4), (1.5, 79, 0.4), (2.0, 81, 1.6)],
    [(0, 78, 0.85), (1.0, 76, 0.4), (1.5, 74, 0.4), (2.0, 73, 0.85), (3.0, 74, 0.85)],
    [(0, 76, 0.4), (0.5, 78, 0.4), (1.0, 79, 0.85), (2.0, 81, 0.4), (2.5, 79, 0.4), (3.0, 76, 0.85)],
    [(0, 74, 1.4), (1.5, 73, 0.4), (2.0, 74, 0.85), (3.0, 76, 0.85)],
    [(0, 78, 0.85), (1.0, 76, 0.85), (2.0, 74, 0.4), (2.5, 73, 0.4), (3.0, 71, 0.85)],
    [(0, 69, 0.4), (0.5, 71, 0.4), (1.0, 73, 0.4), (1.5, 74, 0.4), (2.0, 76, 0.4), (2.5, 74, 0.4), (3.0, 73, 0.85)],
    [(0, 74, 0.7), (1.0, 73, 0.5), (2.0, 69, 1.8)],
]
CHORDS = {
    'D': (38, 54, [50, 54, 57]),
    'A': (45, 61, [52, 57, 61]),
    'Bm': (47, 62, [47, 50, 54]),
    'Fsm': (42, 61, [49, 54, 58]),
    'G': (43, 59, [50, 55, 59]),
    'Em': (40, 59, [52, 55, 59]),
    'C': (36, 60, [48, 52, 55]),
}


def classical_bar(s, bar, name, melody, vel=84, flute=False, horn=False, oboe=None):
    root, third, piano = CHORDS[name]
    t = bar * 4
    # cello walking quarters
    s.n(3, root, t, 0.9, vel - 6)
    s.n(3, root + 7, t + 1, 0.85, vel - 10)
    s.n(3, third - 12 if third > root else third, t + 2, 0.85, vel - 8)
    s.n(3, root + 7 if bar % 2 == 0 else root, t + 3, 0.8, vel - 10)
    # viola holds the third
    s.n(2, third, t, 3.4, vel - 18)
    # violins
    for off, pitch, dur in melody:
        s.n(0, pitch, t + off, dur * 0.97, vel)
        harm = THIRD.get(pitch)
        if harm:
            s.n(1, harm, t + off, dur * 0.95, vel - 12)
    # piano on the strong beats, soft
    for st in (0, 2):
        for i, n in enumerate(piano):
            s.n(4, n, t + st + i * 0.015, 1.3, 62)
    if flute:
        for off, pitch, dur in melody:
            s.n(5, pitch + 12, t + off, dur * 0.9, vel - 8)
    if horn:
        s.n(6, root + 12, t, 3.5, 70)
    if oboe:
        for off, pitch, dur in oboe:
            s.n(7, pitch, t + off, dur, vel - 4)


def build_classical():
    s = Song(116, 58)
    s.prog(0, 40, pan=46, vol=108)  # violin
    s.prog(1, 40, pan=82, vol=96)   # violin II
    s.prog(2, 41, pan=64, vol=90)   # viola
    s.prog(3, 42, pan=64, vol=104)  # cello
    s.prog(4, 0, pan=60, vol=78)    # piano
    s.prog(5, 73, pan=78, vol=90)   # flute
    s.prog(6, 60, pan=52, vol=84)   # french horn
    s.prog(7, 68, pan=70, vol=88)   # oboe
    a_chords = ['D', 'A', 'Bm', 'Fsm', 'G', 'D', 'Em', 'A']
    for rep in range(2):
        for i, name in enumerate(a_chords):
            classical_bar(s, rep * 8 + i, name, A_MELODY[i], vel=80 if rep == 0 else 88, horn=(rep == 1 and i in (0, 7)))
    b_chords = ['G', 'D', 'Em', 'A', 'D', 'Bm', 'Em', 'A']
    oboe_line = [
        [(0, 79, 1.5), (2, 76, 1.5)],
        [(0, 74, 1.0), (1, 76, 0.5), (2, 78, 1.5)],
        [(0, 76, 2.0), (2.5, 74, 1.0)],
        [(0, 73, 1.0), (1.5, 74, 2.0)],
        [(0, 74, 1.2), (1.5, 78, 0.5), (2.5, 76, 1.2)],
        [(0, 74, 1.5), (2, 71, 1.5)],
        [(0, 71, 0.7), (1, 73, 0.7), (2, 74, 1.5)],
        [(0, 76, 1.0), (1.5, 73, 0.5), (2.5, 69, 1.2)],
    ]
    for i, name in enumerate(b_chords):
        classical_bar(s, 16 + i, name, B_MELODY[i], vel=90, oboe=oboe_line[i], horn=(i in (0, 4)))
    for i, name in enumerate(b_chords):
        classical_bar(s, 24 + i, name, B_MELODY[i], vel=94, flute=True, horn=(i in (0, 4)))
    # a short episode, still lyrical, then the theme returns with flute and horn
    epi = ['C', 'G', 'D', 'A', 'Bm', 'Fsm', 'G', 'A', 'D', 'A']
    epi_mel = [
        [(0, 72, 1.5), (2, 71, 1.5)],
        [(0, 74, 0.7), (1, 76, 0.7), (2, 79, 1.5)],
        [(0, 78, 1.2), (1.5, 76, 0.5), (2.5, 74, 1.2)],
        [(0, 73, 2.0), (2.5, 74, 1.0)],
        [(0, 71, 0.5), (0.5, 73, 0.5), (1, 74, 0.5), (1.5, 76, 0.5), (2, 78, 1.5)],
        [(0, 78, 1.0), (1.5, 73, 0.5), (2.5, 69, 1.2)],
        [(0, 79, 1.4), (2, 78, 0.5), (3, 76, 0.7)],
        [(0, 76, 0.7), (1, 74, 0.7), (2, 73, 1.5)],
        [(0, 74, 1.5), (2, 69, 1.5)],
        [(0, 73, 0.8), (1, 74, 0.5), (2, 76, 1.6)],
    ]
    for i, name in enumerate(epi):
        classical_bar(s, 32 + i, name, epi_mel[i], vel=86, horn=(i in (0, 8)))
    for i, name in enumerate(a_chords):
        classical_bar(s, 42 + i, name, A_MELODY[i], vel=98, flute=True, horn=True)
    for i, name in enumerate(a_chords):
        # second statement eases into a cadence the loop can restart on
        vel = 100 if i < 6 else 90
        classical_bar(s, 50 + i, name, A_MELODY[i], vel=vel, flute=(i < 6), horn=(i in (0, 6, 7)))
    return s


# Performances, not one-shots. Each file is a person playing.
# Freesound serves the original WAV only to logged-in users. These URLs are
# the site's own high-quality preview of those CC0 recordings.
PLAYED = {
    'verse': 'https://cdn.freesound.org/previews/845/845806_15551003-hq.mp3',  # Billyguiro, 166 bpm fuzz guitar
    'heavy': 'https://cdn.freesound.org/previews/832/832833_9524907-hq.mp3',  # bangcorrupt, low-tuned chug
    'drums': 'https://cdn.freesound.org/previews/860/860527_3661618-hq.mp3',  # lennartgreen, Gretsch kit, 160 bpm
    'bass': 'https://cdn.freesound.org/previews/799/799090_2520418-hq.mp3',  # CVLTIV8R, Charvel bass riff
}
PLAYED_BPM = 166
PLAYED_BARS = 80


def _fetch_played(name, url):
    import urllib.request
    cache = '/tmp/v48-src'
    os.makedirs(cache, exist_ok=True)
    mp3 = os.path.join(cache, name + '.mp3')
    wav = os.path.join(cache, name + '.wav')
    if not os.path.exists(mp3) or os.path.getsize(mp3) < 1000:
        urllib.request.urlretrieve(url, mp3)
    if not os.path.exists(wav) or os.path.getmtime(wav) < os.path.getmtime(mp3):
        subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', mp3, '-ac', '2', '-ar', '44100', wav])
    return wav


def _atempo(src, factor, dest):
    # atempo keeps the pitch. One step stays inside 0.5..2.0.
    subprocess.check_call([
        'ffmpeg', '-y', '-v', 'error', '-i', src,
        '-filter:a', f'atempo={factor:.6f}', '-ac', '2', '-ar', '44100', dest,
    ])


def _fit_bars(src, bars, dest):
    """Stretch a performance so it lands on an exact bar count at PLAYED_BPM."""
    seconds = bars * 4 * 60.0 / PLAYED_BPM
    x, sr = read_wav(src)
    have = len(x) / sr
    factor = have / seconds
    if abs(factor - 1.0) < 0.004:
        return src
    _atempo(src, factor, dest)
    return dest


def _paste(dst, src, at, fade):
    import numpy as np
    end = min(len(dst), at + len(src))
    n = end - at
    if n <= 0:
        return
    if fade > 8 and at > 0:
        f = min(fade, n // 2, at)
        ramp = np.linspace(0.0, 1.0, f, dtype='float32')[:, None]
        dst[at:at + f] = dst[at:at + f] * (1.0 - ramp) + src[:f] * ramp
        if n > f:
            dst[at + f:end] = src[f:n]
    else:
        dst[at:end] = src[:n]


def _p99m(x):
    import numpy as np
    return float(np.percentile(np.abs(x).max(axis=1), 99))


def assemble_played_rock(out_wav):
    """Arrange whole performances. Nothing is sliced into a MIDI grid."""
    import numpy as np
    sr = 44100
    bar = int(round(4 * 60.0 / PLAYED_BPM * sr))
    total = PLAYED_BARS * bar
    fade = int(0.04 * sr)
    paths = {k: _fetch_played(k, u) for k, u in PLAYED.items()}
    verse = _fit_bars(paths['verse'], 8, os.path.join(TMP, 'verse-fit.wav'))
    heavy = _fit_bars(paths['heavy'], 32, os.path.join(TMP, 'heavy-fit.wav'))
    drums = _fit_bars(paths['drums'], 8, os.path.join(TMP, 'drums-fit.wav'))
    bass = _fit_bars(paths['bass'], 8, os.path.join(TMP, 'bass-fit.wav'))
    v, _ = read_wav(verse)
    h, _ = read_wav(heavy)
    d, _ = read_wav(drums)
    b, _ = read_wav(bass)
    # trim or pad each phrase to the bar grid it was stretched toward
    def take(x, bars):
        n = bars * bar
        if len(x) >= n:
            return x[:n]
        y = np.zeros((n, 2), dtype='float32')
        y[:len(x)] = x
        return y
    v, h, d, b = take(v, 8), take(h, 32), take(d, 8), take(b, 8)
    # Keep the kick's thump; the chug is already a wall from about 100 Hz up.
    h = _highpass(h, sr, 90.0) * np.float32(0.86)
    gtr = np.zeros((total, 2), dtype='float32')
    drm = np.zeros((total, 2), dtype='float32')
    bas = np.zeros((total, 2), dtype='float32')
    # Same phrase abuts on its own loop point. The two guitar changes crossfade.
    for start in (0, 8, 56, 64, 72):
        _paste(gtr, v, start * bar, 0)
        _paste(bas, b, start * bar, 0)
    _paste(gtr, h, 16 * bar - fade, fade)
    _paste(gtr, v, 48 * bar - fade, fade)
    _paste(bas, b, 48 * bar, 0)
    for start in range(0, PLAYED_BARS, 8):
        _paste(drm, d, start * bar, 0)
    gtr *= np.float32(0.62 / (_p99m(gtr) + 1e-9))
    drm *= np.float32(0.58 / (_p99m(drm) + 1e-9))
    bas *= np.float32(0.20 / (_p99m(bas) + 1e-9))
    y = gtr + drm + bas
    peak = float(np.max(np.abs(y)))
    if peak > 0.98:
        y *= np.float32(0.98 / peak)
    _played_report(gtr, drm, bas, y, sr)
    write_wav(out_wav, y, sr)
    return out_wav


def _crack_times(x, sr, lo, hi, gap):
    import numpy as np
    spec = np.fft.rfft(x.mean(axis=1))
    freqs = np.fft.rfftfreq(len(x), 1.0 / sr)
    spec[(freqs < lo) | (freqs >= hi)] = 0
    y = np.fft.irfft(spec, n=len(x)).astype('float32')
    hop = int(0.01 * sr)
    env = np.array([np.sqrt(np.mean(y[i:i + hop] ** 2)) for i in range(0, len(y) - hop, hop)])
    thr = np.percentile(env, 82)
    times = []
    for i in range(1, len(env) - 1):
        if env[i] > thr and env[i] >= env[i - 1] and env[i] > env[i + 1]:
            t = i * 0.01
            if not times or t - times[-1] > gap:
                times.append(t)
    return times


def _hit_corr(x, sr, times):
    import numpy as np
    w = int(0.035 * sr)
    clips = []
    for t in times[:16]:
        c = int(t * sr)
        if c + w < len(x):
            clips.append(x[c:c + w, 0])
    if len(clips) < 4:
        return 0.0
    cs = []
    for i in range(len(clips)):
        for j in range(i + 1, len(clips)):
            u = clips[i] - clips[i].mean()
            v = clips[j] - clips[j].mean()
            cs.append(float((u * v).sum() / (np.sqrt((u * u).sum() * (v * v).sum()) + 1e-9)))
    return float(np.median(cs))


def _played_report(gtr, drm, bas, mix, sr):
    import numpy as np
    # One 8-bar pass of the kit, so the repeated loop is not what we measure.
    bar = int(round(4 * 60.0 / PLAYED_BPM * sr))
    one = drm[:8 * bar]
    times = _crack_times(one, sr, 1500, 6000, 0.12)
    iv = np.diff(times) if len(times) > 3 else np.array([1.0])
    cv = float(iv.std() / (iv.mean() + 1e-9))
    corr = _hit_corr(one, sr, times)
    # a techno kick is a perfect quarter-note grid; this is that grid's CV
    techno_iv = np.ones(32) * (60.0 / 126.0)
    techno_cv = float(techno_iv.std() / techno_iv.mean())
    gp, dp, bp = _p99m(gtr), _p99m(drm), _p99m(bas)
    print(f'  levels guitar={gp:.3f} drums={dp:.3f} bass={bp:.3f}')
    print(f'  drum hit-interval cv={cv:.2f} (techno quarter-note grid cv={techno_cv:.2f})')
    print(f'  drum hit-to-hit waveform corr={corr:.2f}')
    if gp < bp * 1.4 or dp < bp * 1.4:
        raise SystemExit('bass is covering the guitars or the drums')
    if cv < 0.12:
        raise SystemExit('drums are on a machine grid')
    if corr > 0.65:
        raise SystemExit('drum hits are copies of one sample')
    mono = mix.mean(axis=1)
    hop = int(0.03 * sr)
    airs = []
    rms = []
    for i in range(0, len(mono) - hop, hop):
        fr = mono[i:i + hop]
        rms.append(float(np.sqrt(np.mean(fr * fr))))
        sp = np.abs(np.fft.rfft(fr)) ** 2
        f = np.fft.rfftfreq(len(fr), 1.0 / sr)
        airs.append(float(sp[f >= 8000].sum() / (sp.sum() + 1e-12)))
    rms = np.array(rms)
    airs = np.array(airs)
    quiet = float(np.median(airs[rms <= np.percentile(rms, 15)]))
    print(f'  quiet-frame air={quiet:.3f}')
    if quiet > 0.2:
        raise SystemExit('hiss in the quiet frames')


def main():
    import sys
    rock_only = len(sys.argv) > 1 and sys.argv[1] == 'rock'
    if not rock_only:
        print('pop midi')
        pop = build_pop()
        pop.save(os.path.join(TMP, 'pop.mid'))
        print('classical midi')
        cl = build_classical()
        cl.save(os.path.join(TMP, 'classical.mid'))
        render_wav(os.path.join(TMP, 'pop.mid'), os.path.join(TMP, 'pop.wav'), True)
        render_wav(os.path.join(TMP, 'classical.mid'), os.path.join(TMP, 'classical.wav'), True)
    print('assembling played rock')
    mixed = os.path.join(TMP, 'rock-mix.wav')
    assemble_played_rock(mixed)
    print('loop + encode')
    # The arrangement is already an exact bar count, so the seam is one
    # overlap of the downbeat with itself, not a reverb tail.
    import numpy as np
    x, sr = read_wav(mixed)
    seam = int(0.03 * sr)
    fade_in = np.linspace(0.0, 1.0, seam, dtype='float32')[:, None]
    fade_out = 1.0 - fade_in
    head = x[:seam].copy()
    body = x[:-seam].copy()
    body[:seam] = head * fade_in + x[-seam:] * fade_out
    peak = float(abs(body).max()) or 1
    body *= min(2.5, 0.84 / peak)
    loop = os.path.join(TMP, 'rock-loop.wav')
    write_wav(loop, body, sr)
    encode(loop, 'genre-rock')
    if not rock_only:
        finish('pop', os.path.join(TMP, 'pop.wav'), 56 * 4 * 60 / 112)
        finish('classical', os.path.join(TMP, 'classical.wav'), 58 * 4 * 60 / 116)
    print('done')


if __name__ == '__main__':
    main()
