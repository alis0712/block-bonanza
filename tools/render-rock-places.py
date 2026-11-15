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
# rhythm, drums, lead, extra. Drums stay under the guitars in the band a phone can play.
GAIN = {
    'intro': (0.70, 0.00, 0.00, 0.00),
    'verse': (1.00, 0.62, 0.82, 0.55),
    'pre': (1.00, 0.70, 0.70, 0.62),
    'chorus': (1.05, 0.74, 1.05, 0.72),
    'breakdown': (0.62, 0.00, 0.00, 0.28),
    'solo': (0.75, 0.40, 1.25, 0.45),
    'final': (1.08, 0.76, 1.08, 0.80),
    'ending': (0.62, 0.00, 0.28, 0.00),
}
BASS_GAIN = {
    'intro': 0.00, 'verse': 0.62, 'pre': 0.70, 'chorus': 0.78,
    'breakdown': 0.55, 'solo': 0.48, 'final': 0.82, 'ending': 0.20,
}
# Different slice of each performance so a section is not the same loop again.
RHY_AT = [0.0, 0.0, 5.0, 2.5, 9.0, 6.5, 3.0, 11.0, 2.5, 0.0]
BASS_AT = [0.0, 0.0, 3.0, 1.5, 7.0, 4.0, 2.0, 8.0, 1.5, 0.0]


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


def eq_file(src_wav, dest, filt):
    subprocess.check_call([
        'ffmpeg', '-y', '-v', 'error', '-i', src_wav, '-af', filt, '-ac', '2', '-ar', str(SR), dest,
    ])
    return read_wav(dest)


# Lift the fuzz into the band a phone speaker plays. Do not boost the hiss region.
G_EQ = 'highpass=f=110,equalizer=f=1500:t=h:w=1400:g=8,equalizer=f=2700:t=h:w=700:g=3'
B_EQ = 'highpass=f=50,equalizer=f=240:t=h:w=200:g=3,equalizer=f=780:t=h:w=500:g=6'
D_EQ = 'equalizer=f=2800:t=h:w=1400:g=-3'


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


def take(src, src_at, n):
    if n < 8 or len(src) < 8:
        return None
    s0 = int(src_at * SR) % len(src)
    if s0 + n <= len(src):
        return src[s0:s0 + n]
    return np.concatenate([src[s0:], src[:n - (len(src) - s0)]])[:n]


def place(dst, src, t, dur, gain, src_at=0.0):
    if gain <= 0.001 or dur <= 0:
        return
    i0 = int(t * SR)
    n = int(dur * SR)
    if i0 >= len(dst):
        return
    n = min(n, len(dst) - i0)
    chunk = take(src, src_at, n)
    if chunk is None:
        return
    chunk = chunk * np.float32(gain)
    f = min(int(0.04 * SR), n // 3)
    ramp = np.linspace(0.0, 1.0, f, dtype='float32')[:, None]
    chunk[:f] *= ramp
    chunk[-f:] *= ramp[::-1]
    dst[i0:i0 + n] += chunk


def place_loop(dst, src, t, dur, gain, src_at=0.0):
    if gain <= 0.001:
        return
    spun = take(src, src_at, len(src))
    n = int(dur * SR)
    place(dst, tile(spun, n + int(0.05 * SR)), t, dur, gain)


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


def build(rhythm, drums, lead, solo, extra, bass, answer, lead_at, solo_at, answer_at, solo_len=14.0, menu=False):
    """menu=True keeps the same hook, just a step quieter, for the calmer bed."""
    total = int(SECTIONS[-1][2] * SR)
    guitars = np.zeros((total, 2), dtype='float32')
    kit = np.zeros((total, 2), dtype='float32')
    fl = fill_slice(drums)
    calm = 0.82 if menu else 1.0
    for i, (name, a, b) in enumerate(SECTIONS):
        g, d, ld, ex = GAIN[name]
        ld *= calm
        place_loop(guitars, rhythm, a, b - a, g, RHY_AT[i])
        place_loop(kit, drums, a, b - a, d)
        if extra is not None:
            place_loop(guitars, extra, a, b - a, ex * calm, RHY_AT[i] + 4.0)
        if bass is not None:
            place_loop(guitars, bass, a, b - a, BASS_GAIN[name] * calm, BASS_AT[i])
        dur = b - a
        if name in ('verse', 'pre', 'chorus', 'final') and lead is not None:
            # the same phrase comes back: once in a verse, through a chorus
            hook = 7.5 if name in ('chorus', 'final') else min(6.5, dur - 1.0)
            place(guitars, lead, a + 0.6, hook, ld, lead_at)
            if name == 'final':
                place(guitars, lead, a + 8.4, min(7.0, dur - 8.6), ld, lead_at)
        if name in ('verse', 'pre') and answer is not None:
            place(guitars, answer, b - 3.4, 3.0, ld * 0.8, answer_at)
        if name == 'solo' and solo is not None:
            place(guitars, solo, a + 0.2, min(solo_len, dur - 0.4), ld, solo_at)
        if i > 0 and name not in ('breakdown', 'intro'):
            place(kit, fl, max(0.0, a - 0.05), 1.05, max(d, 0.42) * calm)
    y = guitars + kit
    fade_n = int(3.5 * SR)
    ramp = np.linspace(1.0, 0.0, fade_n, dtype='float32')[:, None]
    y[-fade_n:] *= ramp
    guitars[-fade_n:] *= ramp
    return y, guitars, kit


def phone_stats(x, a, b):
    """Level from 400 Hz to 3.8 kHz, the band a phone speaker can play.

    Returns the 90th-percentile slice (a sustained part) and the peak (a snare hit).
    """
    seg = x[int(a * SR):int(b * SR)]
    if len(seg) < SR // 5:
        return 0.0, 0.0
    mono = seg.mean(axis=1)
    spec = np.fft.rfft(mono)
    freqs = np.fft.rfftfreq(len(mono), 1.0 / SR)
    spec[(freqs < 400) | (freqs >= 3800)] = 0
    y = np.fft.irfft(spec, n=len(mono))
    hop = int(0.04 * SR)
    levels = [float(np.sqrt(np.mean(y[i:i + hop] ** 2))) for i in range(0, len(y) - hop, hop)]
    return float(np.percentile(levels, 90)), float(np.max(np.abs(y)))


def audit(name, guitars, kit):
    bad = []
    print('  phone-band guitar/drums')
    for sec, a, b in SECTIONS:
        if sec in ('intro', 'breakdown', 'ending'):
            continue
        gr, gp = phone_stats(guitars, a, b)
        dr, dp = phone_stats(kit, a, b)
        # The guitar's body has to sit above a snare hit, or a phone only plays the kit.
        ratio = gr / (dp + 1e-9)
        print('    %-10s guitar-body %.4f  snare-peak %.4f  ratio %.2f' % (sec, gr, dp, ratio))
        if ratio < 1.25:
            bad.append(sec)
    if bad:
        raise SystemExit(name + ' drums cover the guitars in ' + ', '.join(bad))


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
    def gload(key, fname):
        return eq_file(os.path.join(S, fname), os.path.join(TMP, 'eq-' + key + '.wav'), G_EQ)

    rhythm = {
        'ag': gload('ag', 'g-ag.wav'),
        'slow': gload('slow', 'g-grungy74.wav'),
        'fuzz': gload('fuzz', 'g-grunge166.wav'),
        'rock': gload('rock', 'g-rock.wav'),
        'dirty': gload('dirty', 'g-dsharp80.wav'),
        'chug': gload('chug', 'g-chug.wav'),
    }
    drums = eq_file(os.path.join(S, 'd-160.wav'), os.path.join(TMP, 'eq-d.wav'), D_EQ)
    write_wav(os.path.join(TMP, 'eq-d-src.wav'), drums)
    drums_half = atempo(os.path.join(TMP, 'eq-d-src.wav'), 0.5, os.path.join(TMP, 'd-half.wav'))
    drums_fast = atempo(os.path.join(TMP, 'eq-d-src.wav'), 1.12, os.path.join(TMP, 'd-fast.wav'))
    lead = eq_file('/tmp/v50-src/licks.wav', os.path.join(TMP, 'eq-licks.wav'), G_EQ)
    solo = eq_file('/tmp/v50-src/swell.wav', os.path.join(TMP, 'eq-swell.wav'), G_EQ)
    lick = eq_file('/tmp/v50-src/lick2.wav', os.path.join(TMP, 'eq-lick2.wav'), G_EQ)
    bass = eq_file(os.path.join(S, 'b-riff4.wav'), os.path.join(TMP, 'eq-bass.wav'), B_EQ)

    # Shore is the bright one: a mid-heavy riff on top, fuzz under it, a hook that returns.
    # Menu uses the slower chords, the same hook a step back, and a quieter kit.
    # name, rhythm, drums, lead, lead_at, solo, solo_at, extra, bass, answer, answer_at, menu
    songs = [
        ('rock-title', rhythm['ag'], drums, lead, 0.0, solo, 10.0, rhythm['chug'], bass, lick, 0.0, False),
        ('rock-menu', rhythm['slow'], drums_half, lead, 8.0, solo, 18.0, rhythm['rock'], bass, lick, 2.0, True),
        ('rock-shore', rhythm['rock'], drums, lead, 0.4, solo, 6.0, rhythm['fuzz'], bass, lick, 0.0, False),
        ('rock-murk', rhythm['dirty'], drums_half, lick, 0.0, solo, 24.0, rhythm['chug'], bass, lead, 14.0, False),
        ('rock-drive', rhythm['ag'], drums, lead, 16.0, solo, 28.0, rhythm['fuzz'], bass, lick, 1.0, False),
        ('rock-boss-sunny', rhythm['rock'], drums_fast, lead, 0.4, solo, 8.0, rhythm['fuzz'], bass, lick, 0.0, False),
        ('rock-boss-gazza', rhythm['ag'], drums_fast, lead, 4.0, lick, 0.0, rhythm['chug'], bass, solo, 10.0, False),
        ('rock-boss-maw', rhythm['dirty'], drums, lead, 0.0, solo, 12.0, rhythm['chug'], bass, lick, 0.0, False),
        ('rock-boss-vamp', rhythm['slow'], drums, lead, 20.0, solo, 32.0, rhythm['chug'], bass, lick, 3.0, False),
    ]
    print('section timeline (every bed)')
    for name, a, b in SECTIONS:
        print('  %s  %5.1f-%5.1f' % (name, a, b))
    for name, rhy, drm, ld, ld_at, so, so_at, extra, bas, ans, ans_at, menu in songs:
        print('building', name)
        y, guitars, kit = build(rhy, drm, ld, so, extra, bas, ans, ld_at, so_at, ans_at, menu=menu)
        audit(name, guitars, kit)
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
