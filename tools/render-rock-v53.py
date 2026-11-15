#!/usr/bin/env python3
"""v53 stage beds. One different full-band performance per stage.

Title and menu are the v52 files and are not rebuilt here. Each stage is a
performance that was already played together (guitar, bass and drums in one
recording), so the parts cannot drift apart the way separately recorded riffs
did. The song form is different on every stage: the loud chorus, the
breakdown and the ending do not land at the same time.

Sources are Freesound CC0 previews. See music/GENRE-LICENSES.md.
"""
import os
import subprocess

import numpy as np
import soundfile as sf

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'music')
TMP = '/tmp/v53-build'

# gain is relative. stop=True silences the last eighth before this section,
# so the whole band hits the downbeat together.
# Forms are in bars. Tempos differ, so the same bar count is a different clock time.
FORMS = {
    # chorus enters after a short verse, about 14 s at 140
    'shore': [
        (0, 6, 0.78, False), (6, 8, 0.95, True), (8, 20, 1.18, False),
        (20, 28, 0.72, False), (28, 32, 0.48, False), (32, 36, 1.0, True),
        (36, 48, 1.28, False), (48, 52, 0.4, False),
    ],
    # opens on the chorus, breakdown early
    'sewer': [
        (0, 8, 0.75, False), (8, 10, 0.95, True), (10, 22, 1.22, False),
        (22, 28, 0.66, False), (28, 36, 1.28, True), (36, 40, 0.55, False),
    ],
    # boss: loud from the first beat, long hole in the middle, bigger return
    'sunny': [
        (0, 12, 1.22, False), (12, 20, 0.5, False), (20, 24, 0.9, True),
        (24, 40, 1.32, False), (40, 44, 0.4, False),
    ],
    # long quiet build, chorus arrives late
    'storm': [
        (0, 12, 0.62, False), (12, 16, 0.88, True), (16, 28, 1.15, False),
        (28, 36, 0.55, False), (36, 40, 1.0, True), (40, 52, 1.26, False),
        (52, 58, 0.42, False),
    ],
    # two short choruses, the second much later, fast tempo
    'horizon': [
        (0, 4, 0.7, False), (4, 12, 1.15, True), (12, 22, 0.68, False),
        (22, 26, 0.42, False), (26, 30, 0.95, True), (30, 44, 1.3, False),
        (44, 48, 0.38, False),
    ],
    # heavy: short stab, drop, then one long chorus
    'gazza': [
        (0, 6, 0.78, False), (6, 14, 0.62, False), (14, 18, 0.95, True),
        (18, 34, 1.28, False), (34, 40, 0.58, False),
    ],
    # bright: chorus, verse, extended louder chorus
    'crystal': [
        (0, 2, 0.85, False), (2, 14, 1.16, True), (14, 24, 0.7, False),
        (24, 28, 0.5, False), (28, 44, 1.3, True), (44, 48, 0.42, False),
    ],
    # driving, chorus in the middle, hard stop into a short final
    'clock': [
        (0, 8, 0.8, False), (8, 12, 1.0, True), (12, 24, 1.18, False),
        (24, 32, 0.55, False), (32, 36, 1.05, True), (36, 44, 1.24, False),
        (44, 46, 0.35, False),
    ],
    # slow: the loud part waits, and the song ends early
    'haunt': [
        (0, 10, 0.58, False), (10, 14, 0.85, True), (14, 26, 1.2, False),
        (26, 30, 0.4, False),
    ],
    # alt: chorus first, breakdown almost immediately, late final
    'park': [
        (0, 8, 0.74, False), (8, 14, 0.62, False), (14, 22, 0.9, True),
        (22, 36, 1.22, False), (36, 42, 0.55, False),
    ],
    # boss: one long heavy chorus after a 2-bar hit
    'maw': [
        (0, 6, 0.72, False), (6, 10, 0.95, True), (10, 26, 1.26, False),
        (26, 32, 0.6, False), (32, 40, 1.2, True), (40, 44, 0.5, False),
    ],
    # anthem: three rises, each chorus longer, ending is the longest tail
    'keep': [
        (0, 4, 0.7, False), (4, 10, 1.05, True), (10, 16, 0.65, False),
        (16, 26, 1.18, True), (26, 32, 0.5, False), (32, 36, 1.0, True),
        (36, 50, 1.3, False), (50, 56, 0.45, False),
    ],
    # half-time: very long bars, chorus late, short ending
    'vamp': [
        (0, 8, 0.6, False), (8, 12, 0.88, True), (12, 24, 1.22, False),
        (24, 28, 0.42, False), (28, 36, 1.28, True), (36, 40, 0.38, False),
    ],
}

SONGS = [
    # stage, file id, path, bpm or 0 to detect, eq, form, credit name
    ('rock-s01', '/tmp/v52-src/564458.mp3', 139.5, 'bright', 'shore'),
    ('rock-s02', '/tmp/v52-src/566057.mp3', 120.0, 'dark', 'sewer'),
    ('rock-s03', '/tmp/v53-src/579754.mp3', 130.0, 'heavy', 'sunny'),
    ('rock-s04', '/tmp/v53-src/524240.mp3', 0, 'heavy', 'storm'),
    ('rock-s05', '/tmp/v53-src/525136.mp3', 160.0, 'heavy', 'horizon'),
    ('rock-s06', '/tmp/v53-src/560623.mp3', 140.0, 'dark', 'gazza'),
    ('rock-s07', '/tmp/v53-src/568755.mp3', 140.0, 'bright', 'crystal'),
    ('rock-s08', '/tmp/v52-src/537961.mp3', 125.0, 'heavy', 'clock'),
    ('rock-s09', '/tmp/v53-src/653517.mp3', 99.2, 'dark', 'haunt'),
    ('rock-s10', '/tmp/v53-src/585515.mp3', 0, 'bright', 'park'),
    ('rock-s11', '/tmp/v53-src/535233.mp3', 0, 'dark', 'maw'),
    ('rock-s12', '/tmp/v53-src/564596.mp3', 0, 'heavy', 'keep'),
    ('rock-s13', '/tmp/v53-src/570579.mp3', 105.0, 'dark', 'vamp'),
]

EQ = {
    'bright': 'highpass=f=70,equalizer=f=1800:t=q:w=1.2:g=4,equalizer=f=3400:t=q:w=1.3:g=2,lowpass=f=12000',
    'heavy': 'highpass=f=45,equalizer=f=80:t=q:w=0.9:g=2,equalizer=f=1600:t=q:w=1.1:g=4,lowpass=f=11000',
    'dark': 'highpass=f=40,equalizer=f=200:t=q:w=1.0:g=2,equalizer=f=2600:t=q:w=1.2:g=-2,lowpass=f=8000',
}


def load(path):
    y, sr = sf.read(path, always_2d=True)
    if sr != SR:
        raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', path, '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'])
        y = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
    return y.astype(np.float32)


def detect_bpm(y):
    mono = y.mean(axis=1)
    spec = np.fft.rfft(mono)
    f = np.fft.rfftfreq(len(mono), 1.0 / SR)
    spec[(f < 45) | (f > 160)] = 0
    k = np.abs(np.fft.irfft(spec, len(mono)))
    hop = SR // 200
    z = np.convolve(k, np.ones(hop) / hop, mode='same')[::hop]
    z = z - z.mean()
    n = min(len(z), 200 * 16)
    z = z[:n]
    ac = np.correlate(z, z, mode='full')[n - 1:]
    ac = ac / (ac[0] + 1e-9)
    cands = []
    lo, hi = int(200 * 60 / 180) + 1, int(200 * 60 / 80)
    for i in range(lo, min(hi, len(ac) - 1)):
        if ac[i] >= ac[i - 1] and ac[i] > ac[i + 1] and ac[i] > 0.05:
            cands.append((float(ac[i]), 60.0 * 200 / i))
    cands.sort(reverse=True)
    if not cands:
        return 120.0, 0.0
    # Prefer the candidate whose kick actually lands on a quarter-note grid.
    best = None
    for strength, bpm in cands[:4]:
        ph = downbeat(y, bpm)
        beat = 60.0 / bpm
        sc = 0.0
        n = 0
        t = ph
        while t < min(len(mono) / SR, 16) and n < 32:
            a = int(t * SR)
            b = min(len(k), a + int(0.04 * SR))
            window = k[max(0, a - int(0.08 * SR)):min(len(k), a + int(0.08 * SR))]
            if len(window):
                pk = int(np.argmax(window)) + max(0, a - int(0.08 * SR))
                sc += abs(pk / SR - t)
            t += beat
            n += 1
        err = sc / max(1, n)
        score = err - strength * 0.02
        if best is None or score < best[0]:
            best = (score, bpm, strength, err)
    return best[1], best[2]


def downbeat(y, bpm):
    mono = y.mean(axis=1)
    spec = np.fft.rfft(mono)
    f = np.fft.rfftfreq(len(mono), 1.0 / SR)
    spec[(f < 40) | (f > 140)] = 0
    k = np.abs(np.fft.irfft(spec, len(mono)))
    beat = 60.0 / bpm
    best, ph = -1.0, 0.0
    step = beat / 40.0
    t_end = min(len(mono) / SR, 24.0)
    phs = np.arange(0, beat, step)
    for p in phs:
        sc = 0.0
        t = p
        n = 0
        while t < t_end:
            a = int(t * SR)
            b = min(len(k), a + int(0.05 * SR))
            if b > a:
                sc += float(k[a:b].max())
            t += beat
            n += 1
        if n and sc / n > best:
            best, ph = sc / n, float(p)
    return ph


def rotate(y, seconds):
    n = int(round(seconds * SR)) % len(y)
    if n == 0:
        return y
    return np.concatenate([y[n:], y[:n]], axis=0)


def loop_bars(src, bar, n_bars):
    usable = (len(src) // bar) * bar
    src = src[:usable]
    need = n_bars * bar
    out = np.empty((need, src.shape[1]), np.float32)
    pos = 0
    while pos < need:
        take = min(usable, need - pos)
        out[pos:pos + take] = src[:take]
        pos += take
    return out


def apply_form(y, bpm, form):
    beat = int(round(60.0 / bpm * SR))
    bar = beat * 4
    total = form[-1][1]
    # keep the source on whole bars so loops join on a downbeat
    src_bars = max(1, len(y) // bar)
    src = y[:src_bars * bar]
    out = np.zeros((total * bar, y.shape[1]), np.float32)
    eighth = beat // 2
    fade = int(0.012 * SR)
    for a, b, gain, stop in form:
        chunk = loop_bars(src, bar, b - a) * np.float32(gain)
        if stop:
            cut = eighth
            ramp = np.linspace(1, 0, fade, dtype=np.float32)[:, None]
            chunk[-cut - fade:-cut] *= ramp
            chunk[-cut:] = 0
        out[a * bar:b * bar] = chunk
    n = int(2.4 * SR)
    if len(out) > n:
        ramp = np.linspace(1, 0, n, dtype=np.float32)[:, None]
        out[-n:] *= ramp
    out[:fade] *= np.linspace(0, 1, fade, dtype=np.float32)[:, None]
    return out, bar


def write(path, y):
    sf.write(path, y, SR, subtype='PCM_16')


def lufs(path):
    out = subprocess.check_output(
        ['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128', '-f', 'null', '-'],
        stderr=subprocess.STDOUT, text=True)
    summary = out.split('Integrated loudness:')[-1]
    for line in summary.splitlines():
        if 'I:' in line and 'LUFS' in line:
            return float(line.split('I:')[1].split('LUFS')[0].strip())
    raise SystemExit('no lufs ' + path)


def measure(path, bpm, label):
    import librosa
    y, sr = sf.read(path, always_2d=True)
    # measure the middle, where the chorus usually sits
    a, b = int(8 * sr), int(min(len(y), 28 * sr))
    mono = y[a:b].mean(axis=1).astype(np.float32)
    spec = np.fft.rfft(mono)
    f = np.fft.rfftfreq(len(mono), 1.0 / sr)
    def ons(lo, hi):
        s = spec.copy()
        s[(f < lo) | (f > hi)] = 0
        z = np.fft.irfft(s, len(mono)).astype(np.float32)
        return librosa.onset.onset_detect(y=z, sr=sr, units='time', hop_length=128, delta=0.05, wait=2)
    kick, gtr = ons(40, 150), ons(500, 2400)
    step = 60.0 / bpm / 4.0
    if len(kick) < 6 or len(gtr) < 4:
        print('  %-10s too few onsets kick %d gtr %d' % (label, len(kick), len(gtr)))
        return
    best = None
    for ph in np.linspace(0, step, 70, endpoint=False):
        err = np.abs((kick - ph + step / 2) % step - step / 2)
        med = float(np.median(err))
        if best is None or med < best[0]:
            best = (med, float(ph))
    gg = np.abs((gtr - best[1] + step / 2) % step - step / 2) * 1000
    dist = np.abs(gtr[:, None] - kick[None, :]).min(1) * 1000
    near = dist[dist <= 80]
    flam = float(np.median(near)) if len(near) else float('nan')
    print('  %-10s grid p50 %4.1f p90 %4.1f within15 %3.0f%%   flam p50 %4.1f ms  n %d' % (
        label, float(np.median(gg)), float(np.percentile(gg, 90)),
        float(np.mean(gg <= 15) * 100), flam, len(gtr)))


def tame(y):
    """Pull down stray peaks so a snare hit does not pin the whole song quiet."""
    a = np.abs(y)
    knee = 0.28
    over = np.maximum(0, a - knee)
    return (np.sign(y) * (np.minimum(a, knee) + over * 0.22)).astype(np.float32)


def quiet_air(path):
    y, sr = sf.read(path, always_2d=True)
    x = y.mean(axis=1)
    x = x[:-int(3.0 * sr)] if len(x) > int(6 * sr) else x
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1.0 / sr)
    spec[f < 9000] = 0
    hp = np.fft.irfft(spec, len(x))
    hop = int(0.05 * sr)
    rms, airs = [], []
    for i in range(0, len(x) - hop, hop):
        rms.append(float(np.sqrt(np.mean(x[i:i + hop] ** 2))))
        airs.append(float(np.sqrt(np.mean(hp[i:i + hop] ** 2))))
    rms, airs = np.array(rms), np.array(airs)
    silent = rms < 0.02
    if not np.any(silent):
        return 0.0
    return float(np.median(airs[silent]))


def main():
    os.makedirs(TMP, exist_ok=True)
    print('stage bed timeline (chorus = first section at full gain)')
    for name, path, bpm, eq, form_name in SONGS:
        y = load(path)
        if bpm <= 0:
            bpm, strength = detect_bpm(y)
            print('  detected %-10s %5.1f BPM  strength %.2f' % (name, bpm, strength))
        ph = downbeat(y, bpm)
        y = rotate(y, ph)
        arranged, bar = apply_form(y, bpm, FORMS[form_name])
        raw = os.path.join(TMP, name + '-arr.wav')
        write(raw, arranged)
        eqed = os.path.join(TMP, name + '-eq.wav')
        subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', raw, '-af', EQ[eq], eqed])
        z, _ = sf.read(eqed, always_2d=True)
        z = tame(z.astype(np.float32))
        tamed = os.path.join(TMP, name + '-tame.wav')
        write(tamed, z)
        loud = lufs(tamed)
        gain = 10 ** ((-12.5 - loud) / 20.0)
        z = z.astype(np.float32) * np.float32(gain)
        peak = float(np.max(np.abs(z)))
        if peak > 0.89:
            z *= np.float32(0.89 / peak)
        final = os.path.join(TMP, name + '.wav')
        write(final, z)
        after = lufs(final)
        air = quiet_air(final)
        # first loud section
        chorus = 0
        for a, b, g, stop in FORMS[form_name]:
            if g >= 1.1:
                chorus = a * (60.0 / bpm * 4)
                break
        dur = len(z) / SR
        print('%-10s %5.1f BPM  chorus %5.1fs  len %5.1fs  %5.1f LUFS  air %.3f' % (
            name, bpm, chorus, dur, after, air))
        if air > 0.02:
            raise SystemExit(name + ' hiss ' + str(air))
        measure(final, bpm, name)
        subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', final, '-c:a', 'libvorbis', '-q:a', '5', os.path.join(OUT, name + '.ogg')])
        subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', final, '-c:a', 'libmp3lame', '-b:a', '160k', os.path.join(OUT, name + '.mp3')])


if __name__ == '__main__':
    main()
