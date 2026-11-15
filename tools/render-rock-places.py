#!/usr/bin/env python3
"""Full-song rock beds from CC0 performances.

Each bed has an intro, a quieter verse, a pre-chorus, a loud chorus with a
lead hook, a second verse, a breakdown, a solo, a bigger final chorus and an
ending. The notes are the players' own. Nothing here is Local H's riff.
"""
import os
import subprocess
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'music')
TMP = '/tmp/v50-build'
SR = 44100
os.makedirs(OUT, exist_ok=True)
os.makedirs(TMP, exist_ok=True)

# One arc, about two minutes. The second chorus is the big one.
SECTIONS = [
    ('intro', 0.0, 8.0),
    ('verse', 8.0, 24.0),
    ('pre', 24.0, 32.0),
    ('chorus', 32.0, 48.0),
    ('verse', 48.0, 60.0),
    ('pre', 60.0, 68.0),
    ('breakdown', 68.0, 82.0),
    ('solo', 82.0, 98.0),
    ('final', 98.0, 116.0),
    ('ending', 116.0, 124.0),
]
GAIN = {
    'intro': (0.46, 0.00, 0.00, 0.00),
    'verse': (0.58, 0.50, 0.00, 0.18),
    'pre': (0.82, 0.74, 0.40, 0.48),
    'chorus': (1.00, 0.92, 0.86, 0.62),
    'breakdown': (0.40, 0.00, 0.00, 0.22),
    'solo': (0.52, 0.80, 1.00, 0.28),
    'final': (1.08, 1.00, 0.94, 0.78),
    'ending': (0.50, 0.00, 0.20, 0.00),
}


def read_wav(path):
    with wave.open(path, 'rb') as w:
        ch, sr, n = w.getnchannels(), w.getframerate(), w.getnframes()
        x = np.frombuffer(w.readframes(n), dtype='<i2').astype('float32') / 32768.0
        if ch == 2:
            x = x.reshape(-1, 2)
        else:
            x = np.stack([x, x], axis=1)
    if sr != SR:
        raise SystemExit('bad rate ' + path)
    return np.ascontiguousarray(x)


def write_wav(path, x):
    y = np.clip(x, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((y * 32767.0).astype('<i2').tobytes())


def atempo(src_wav, factor, dest):
    if abs(factor - 1.0) < 0.01:
        return read_wav(src_wav)
    subprocess.check_call([
        'ffmpeg', '-y', '-v', 'error', '-i', src_wav,
        '-filter:a', 'atempo=%.5f' % factor, '-ac', '2', '-ar', str(SR), dest,
    ])
    return read_wav(dest)


def tile(src, n, fade=None):
    if fade is None:
        fade = int(0.025 * SR)
    fade = min(fade, max(1, len(src) // 8))
    y = np.zeros((n, 2), dtype='float32')
    pos = 0
    while pos < n:
        take = min(len(src), n - pos)
        if pos > 0 and fade > 8:
            f = min(fade, take)
            ramp = np.linspace(0.0, 1.0, f, dtype='float32')[:, None]
            y[pos:pos + f] = y[pos:pos + f] * (1.0 - ramp) + src[:f] * ramp
            if take > f:
                y[pos + f:pos + take] = src[f:take]
        else:
            y[pos:pos + take] = src[:take]
        pos += take
    return y


def place(dst, src, t, dur, gain, src_at=0.0):
    if gain <= 0.001 or dur <= 0:
        return
    i0 = int(t * SR)
    n = int(dur * SR)
    s0 = int(src_at * SR)
    if i0 >= len(dst) or s0 >= len(src):
        return
    n = min(n, len(dst) - i0, len(src) - s0)
    if n < 8:
        return
    chunk = src[s0:s0 + n] * np.float32(gain)
    f = min(int(0.04 * SR), n // 3)
    ramp = np.linspace(0.0, 1.0, f, dtype='float32')[:, None]
    chunk[:f] *= ramp
    chunk[-f:] *= ramp[::-1]
    dst[i0:i0 + n] += chunk


def place_loop(dst, src, t, dur, gain):
    if gain <= 0.001:
        return
    n = int(dur * SR)
    place(dst, tile(src, n + int(0.05 * SR)), t, dur, gain)


def fill_slice(drums):
    """The busiest one-second stretch of a short played groove. Used as a fill."""
    mono = drums.mean(axis=1)
    win = int(1.15 * SR)
    if len(mono) <= win + 8:
        return drums
    hop = SR // 40
    csum = np.cumsum(mono * mono)
    best, bi = 0.0, 0
    for i in range(0, len(mono) - win, hop):
        e = float(csum[i + win] - csum[i])
        if e > best:
            best, bi = e, i
    return drums[bi:bi + win]


def build(rhythm, drums, lead, solo, extra, lead_at, solo_at, solo_len=14.0):
    total = int(SECTIONS[-1][2] * SR)
    y = np.zeros((total, 2), dtype='float32')
    fl = fill_slice(drums)
    for i, (name, a, b) in enumerate(SECTIONS):
        g, d, ld, ex = GAIN[name]
        place_loop(y, rhythm, a, b - a, g)
        place_loop(y, drums, a, b - a, d)
        if extra is not None:
            place_loop(y, extra, a, b - a, ex)
        if name in ('chorus', 'final') and lead is not None:
            place(y, lead, a + 0.3, min(8.5, b - a - 0.5), ld, lead_at)
            # the hook answers itself once in the big chorus
            if name == 'final':
                place(y, lead, a + 8.2, min(7.0, b - a - 8.4), ld * 0.9, lead_at)
        if name == 'solo' and solo is not None:
            place(y, solo, a + 0.2, min(solo_len, b - a - 0.4), ld, solo_at)
        if name == 'pre' and lead is not None:
            place(y, lead, a + 0.4, min(4.0, b - a - 0.6), ld * 0.85, lead_at + 2.0)
        # a played fill throws the next section, except the guitar-only open
        if i > 0 and name != 'breakdown':
            place(y, fl, a - 0.05, 1.15, max(d, 0.75))
    # the ending falls away so the loop can restart on the quiet intro
    fade_n = int(3.5 * SR)
    ramp = np.linspace(1.0, 0.0, fade_n, dtype='float32')[:, None]
    y[-fade_n:] *= ramp
    return y


def lufs(path):
    out = subprocess.check_output([
        'ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128', '-f', 'null', '-',
    ], stderr=subprocess.STDOUT, text=True)
    summary = out.split('Integrated loudness:')[-1]
    for line in summary.splitlines():
        if 'I:' in line and 'LUFS' in line:
            return float(line.split('I:')[1].split('LUFS')[0].strip())
    raise SystemExit('no lufs for ' + path)


def master(y, name):
    raw = os.path.join(TMP, name + '-raw.wav')
    write_wav(raw, y)
    before = lufs(raw)
    # static gain toward -12 LUFS, then a ceiling. No compressor, so it does not pump.
    # Measure the clipped file, then scale that same audio.
    gain = 10 ** ((-12.0 - before) / 20.0)
    y = read_wav(raw) * np.float32(gain)
    peak = float(np.max(np.abs(y)))
    if peak > 0.89:
        y *= np.float32(0.89 / peak)
    path = os.path.join(TMP, name + '.wav')
    write_wav(path, y)
    after = lufs(path)
    peak = float(np.max(np.abs(y)))
    return path, before, after, peak


def quiet_air(path):
    x = read_wav(path).mean(axis=1)
    hop = int(0.04 * SR)
    rms, airs = [], []
    for i in range(0, len(x) - hop, hop):
        fr = x[i:i + hop]
        rms.append(float(np.sqrt(np.mean(fr * fr))))
        sp = np.abs(np.fft.rfft(fr)) ** 2
        f = np.fft.rfftfreq(len(fr), 1.0 / SR)
        airs.append(float(sp[f >= 9000].sum() / (sp.sum() + 1e-12)))
    rms = np.array(rms)
    airs = np.array(airs)
    return float(np.median(airs[rms <= np.percentile(rms, 12)]))


def encode(wav, stem):
    ogg = os.path.join(OUT, stem + '.ogg')
    mp3 = os.path.join(OUT, stem + '.mp3')
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '5', ogg])
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '160k', mp3])


def main():
    S = '/tmp/v48-src/wav'
    rhythm = {
        'ag': read_wav(os.path.join(S, 'g-ag.wav')),
        'slow': read_wav(os.path.join(S, 'g-grungy74.wav')),
        'fuzz': read_wav(os.path.join(S, 'g-grunge166.wav')),
        'rock': read_wav(os.path.join(S, 'g-rock.wav')),
        'dirty': read_wav(os.path.join(S, 'g-dsharp80.wav')),
        'chug': read_wav(os.path.join(S, 'g-chug.wav')),
    }
    drums = read_wav(os.path.join(S, 'd-160.wav'))
    drums_half = atempo(os.path.join(S, 'd-160.wav'), 0.5, os.path.join(TMP, 'd-half.wav'))
    drums_fast = atempo(os.path.join(S, 'd-160.wav'), 1.12, os.path.join(TMP, 'd-fast.wav'))
    lead = read_wav('/tmp/v50-src/licks.wav')
    solo = read_wav('/tmp/v50-src/swell.wav')
    lick = read_wav('/tmp/v50-src/lick2.wav')
    bass = read_wav(os.path.join(S, 'b-riff4.wav'))

    # name, rhythm, drums, lead buf, lead offset, solo buf, solo offset, extra
    songs = [
        ('rock-title', rhythm['ag'], drums, lead, 0.0, solo, 0.0, rhythm['chug']),
        ('rock-menu', rhythm['slow'], drums_half, lead, 10.0, solo, 16.0, None),
        ('rock-shore', rhythm['fuzz'], drums, lead, 18.0, solo, 8.0, bass),
        ('rock-murk', rhythm['dirty'], drums_half, lick, 0.0, solo, 24.0, rhythm['chug']),
        ('rock-drive', rhythm['rock'], drums, lead, 24.0, solo, 30.0, rhythm['fuzz']),
        ('rock-boss-sunny', rhythm['fuzz'], drums_fast, solo, 4.0, lead, 0.0, rhythm['ag']),
        ('rock-boss-gazza', rhythm['chug'], drums_fast, lead, 6.0, lick, 0.0, rhythm['ag']),
        ('rock-boss-maw', rhythm['dirty'], drums, solo, 20.0, lead, 12.0, rhythm['chug']),
        ('rock-boss-vamp', rhythm['slow'], drums, lead, 20.0, solo, 36.0, rhythm['chug']),
    ]
    print('section timeline (every bed)')
    for name, a, b in SECTIONS:
        print('  %s  %5.1f-%5.1f' % (name, a, b))
    for name, rhy, drm, ld, ld_at, so, so_at, extra in songs:
        print('building', name)
        y = build(rhy, drm, ld, so, extra, ld_at, so_at)
        path, before, after, peak = master(y, name)
        air = quiet_air(path)
        print('  %s  mix %6.1f LUFS  mastered %6.1f LUFS  peak %.2f  quiet-air %.3f' % (name, before, after, peak, air))
        if air > 0.08:
            raise SystemExit(name + ' hiss')
        if after < -16.0 or after > -9.5:
            raise SystemExit(name + ' loudness out of range ' + str(after))
        encode(path, name)
    print('done')


if __name__ == '__main__':
    main()
