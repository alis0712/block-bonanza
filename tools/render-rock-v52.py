#!/usr/bin/env python3
"""v52 rock beds. One tempo, one grid, two parts.

The v51 beds stacked guitars, bass and a lead that were recorded by different
players at different tempos. Those layers flammed. This builder keeps only the
parts that land on the Gretsch kit's grid:

  * lennartgreen's Gretsch groove, rubberband R3 from 160 to 140 BPM
  * four bars of aceinet's A-to-G riff, R3 onto that grid, then a small R2 warp

The D-sharp riff, the licks, the solo, the fuzz, the chug and the bass were
measured and left out. Their notes stayed 25 ms or more off the kit. The
D-sharp phrase was closer, but one pick in every bar sat 18 ms late against
the snare, so it is not in the beds either.

Rubberband 3.3's R3 engine ignores a time map (it warns about NaN and writes
the input unchanged). The constant-ratio tempo change uses R3. The small
per-onset correction uses R2 at crispness 6, which is the engine that actually
applies the map.

Every song is the same two locked stems. Songs differ by which slice of the
riff plays, by tempo (the finished mix is stretched with R3, so the two parts
cannot drift apart) and by a darker or a brighter balance. A whole-band stop
lands on the last eighth before each chorus.
"""
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

SR = 44100
BPM = 140.0
BAR = int(round(60.0 / BPM * 4 * SR))  # 75600
BEAT = BAR // 4
N_BARS = 64
TMP = '/tmp/v52-build'
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'music')
LOCKED = '/tmp/v52-exp'

# bar, drums gain, guitar gain, guitar slice in bars, stop on the last eighth
# intro, verse, pre, chorus, verse, pre, breakdown, chorus, final, ending
FORM = [
    (0, 4, 0.78, 0.90, 0, False),
    (4, 12, 0.92, 1.00, 4, False),
    (12, 16, 1.00, 1.08, 8, True),
    (16, 24, 1.05, 1.18, 12, False),
    (24, 32, 0.92, 1.00, 6, False),
    (32, 36, 1.00, 1.10, 10, True),
    (36, 44, 0.00, 0.82, 2, True),
    (44, 52, 1.08, 1.22, 14, False),
    (52, 60, 1.12, 1.30, 16, False),
    (60, 64, 0.55, 0.45, 0, False),
]


def read_mono(path):
    y, sr = sf.read(path, always_2d=False)
    if y.ndim > 1:
        y = y.mean(axis=1)
    if sr != SR:
        raise SystemExit('%s is %s Hz' % (path, sr))
    return y.astype(np.float32)


def write_wav(path, y):
    stereo = np.column_stack([y, y])
    sf.write(path, stereo, SR, subtype='PCM_16')


def loop_take(y, start_bar, n_bars):
    """Copy n_bars from a stem that has already been trimmed to whole bars."""
    n = n_bars * BAR
    usable = (len(y) // BAR) * BAR
    src = y[:usable]
    start = (start_bar * BAR) % usable
    out = np.empty(n, np.float32)
    pos = 0
    idx = start
    fade = int(0.012 * SR)
    while pos < n:
        room = usable - idx
        take = min(room, n - pos)
        chunk = src[idx:idx + take]
        if idx == 0 and pos > 0 and fade > 0:
            # the stem wrapped: crossfade the join
            w = np.linspace(0, 1, fade, dtype=np.float32)
            chunk = chunk.copy()
            chunk[:fade] *= w
            out[pos - fade:pos] *= (1 - w)
        out[pos:pos + take] = chunk
        pos += take
        idx = 0
    return out


def apply_form(drums, guitar, guitar_shift, drum_k, gtr_k):
    d = np.zeros(N_BARS * BAR, np.float32)
    g = np.zeros(N_BARS * BAR, np.float32)
    for a, b, dg, gg, goff, stop in FORM:
        nb = b - a
        ds = loop_take(drums, 0, nb) * np.float32(dg * drum_k)
        gs = loop_take(guitar, goff + guitar_shift, nb) * np.float32(gg * gtr_k)
        d[a * BAR:b * BAR] = ds
        g[a * BAR:b * BAR] = gs
        if stop:
            cut_from = b * BAR - BEAT // 2
            fade = int(0.01 * SR)
            ramp = np.linspace(1, 0, fade, dtype=np.float32)
            d[cut_from - fade:cut_from] *= ramp
            g[cut_from - fade:cut_from] *= ramp
            d[cut_from:b * BAR] = 0
            g[cut_from:b * BAR] = 0
    return d, g


def eq_stem(y, kind, dest):
    raw = dest + '-pre.wav'
    write_wav(raw, y)
    if kind == 'guitar':
        af = 'highpass=f=110,equalizer=f=1600:t=q:w=1.1:g=6,equalizer=f=2800:t=q:w=1.4:g=3'
    elif kind == 'guitar-dark':
        af = 'highpass=f=100,equalizer=f=800:t=q:w=1.0:g=3,equalizer=f=2400:t=q:w=1.2:g=-3,lowpass=f=5000'
    else:
        af = 'highpass=f=40,equalizer=f=70:t=q:w=1.0:g=3,equalizer=f=3500:t=q:w=1.3:g=2'
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', raw, '-af', af, dest])
    return read_mono(dest)


def band_onsets(y, lo, hi):
    import librosa
    spec = np.fft.rfft(y)
    f = np.fft.rfftfreq(len(y), 1.0 / SR)
    spec[(f < lo) | (f > hi)] = 0
    z = np.fft.irfft(spec, len(y)).astype(np.float32)
    return librosa.onset.onset_detect(y=z, sr=SR, units='time', hop_length=128, delta=0.08, wait=2)


def on_grid(y):
    import librosa
    return librosa.onset.onset_detect(y=y, sr=SR, units='time', hop_length=128, delta=0.07, wait=2)


def grid_err(onsets, phase, bpm):
    step = 60.0 / bpm / 4.0
    return np.abs((onsets - phase + step / 2.0) % step - step / 2.0) * 1000.0


def best_phase(onsets, bpm):
    step = 60.0 / bpm / 4.0
    best = None
    for phase in np.linspace(0, step, 80, endpoint=False):
        err = grid_err(onsets, phase, bpm)
        med = float(np.median(err))
        if best is None or med < best[0]:
            best = (med, float(phase))
    return best[1]


def flam(drums, guitar, label):
    """Onset error against the kit's 16th-note grid. Off-beat notes count as
    on time when they land on a 16th, which is the grid the kit is playing."""
    d = on_grid(drums)
    g = on_grid(guitar)
    if len(d) == 0 or len(g) == 0:
        print('  %s no onsets' % label)
        return None
    phase = best_phase(d, BPM)
    dd, gg = grid_err(d, phase, BPM), grid_err(g, phase, BPM)
    print('  %-16s drums p50 %4.1f p90 %4.1f   guitar p50 %4.1f p90 %4.1f ms  guitar within15 %3.0f%%' % (
        label, float(np.median(dd)), float(np.percentile(dd, 90)),
        float(np.median(gg)), float(np.percentile(gg, 90)), float(np.mean(gg <= 15) * 100)))
    return float(np.median(gg)), float(np.percentile(gg, 90)), float(np.mean(gg <= 15) * 100)


def lufs(path):
    out = subprocess.check_output(
        ['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128', '-f', 'null', '-'],
        stderr=subprocess.STDOUT, text=True)
    summary = out.split('Integrated loudness:')[-1]
    for line in summary.splitlines():
        if 'I:' in line and 'LUFS' in line:
            return float(line.split('I:')[1].split('LUFS')[0].strip())
    raise SystemExit('no lufs for ' + path)


def master(y, name):
    raw = os.path.join(TMP, name + '-raw.wav')
    write_wav(raw, y)
    before = lufs(raw)
    gain = 10 ** ((-12.0 - before) / 20.0)
    y = read_mono(raw) * np.float32(gain)
    peak = float(np.max(np.abs(y)))
    if peak > 0.89:
        y *= np.float32(0.89 / peak)
    path = os.path.join(TMP, name + '.wav')
    write_wav(path, y)
    return path, before, lufs(path), float(np.max(np.abs(y)))


def quiet_air(path):
    x = read_mono(path)
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


def phone(y):
    spec = np.fft.rfft(y)
    f = np.fft.rfftfreq(len(y), 1.0 / SR)
    spec[(f < 400) | (f > 3800)] = 0
    z = np.fft.irfft(spec, len(y))
    hop = int(0.04 * SR)
    levels = [float(np.sqrt(np.mean(z[i:i + hop] ** 2))) for i in range(0, len(z) - hop, hop)]
    return float(np.percentile(levels, 90)), float(np.max(np.abs(z)))


def stretch_to(path, src_bpm, dst_bpm, dest):
    if abs(src_bpm - dst_bpm) < 0.2:
        subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', path, dest])
        return
    ratio = src_bpm / dst_bpm
    subprocess.check_call(['rubberband', '-q', '-3', '-t', '%.6f' % ratio, path, dest])


def shipped_flam(path, label, bpm):
    """Before-number, same grid test, on the v51 chorus (32s to 48s)."""
    y, sr = sf.read(path, always_2d=True)
    y = y.mean(axis=1).astype(np.float32)
    if sr != SR:
        raise SystemExit(path + ' is not 44100')
    y = y[int(32 * sr):int(48 * sr)]
    kick = band_onsets(y, 40, 180)
    gtr = band_onsets(y, 600, 2800)
    if len(kick) < 4 or len(gtr) < 4:
        print('  %-16s (v51) too few onsets' % label)
        return
    phase = best_phase(kick, bpm)
    gg = grid_err(gtr, phase, bpm)
    print('  %-16s (v51 @%3.0f) guitar p50 %4.1f p90 %4.1f ms  within15 %3.0f%%  n %d' % (
        label, bpm, float(np.median(gg)), float(np.percentile(gg, 90)),
        float(np.mean(gg <= 15) * 100), len(gtr)))


def finish(y, fade_s=3.2):
    n = int(fade_s * SR)
    y = y.copy()
    y[-n:] *= np.linspace(1, 0, n, dtype=np.float32)
    y[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR), dtype=np.float32)
    return y


def main():
    os.makedirs(TMP, exist_ok=True)
    drums = read_mono(os.path.join(LOCKED, 'drums.wav'))
    ag = read_mono(os.path.join(LOCKED, 'ag-r2.wav'))
    ds = read_mono(os.path.join(LOCKED, 'dsharp-r2.wav'))
    print('drums %.2fs  ag %.2fs  dsharp %.2fs  bar %.3fs' % (
        len(drums) / SR, len(ag) / SR, len(ds) / SR, BAR / SR))
    # one level for each stem, before the section rides
    def norm(y, target):
        r = float(np.sqrt(np.mean(y * y))) + 1e-9
        return y * np.float32(target / r)
    # Only the bars that already sit on the grid. The rest of each take
    # was measured and dropped: those notes sat 25-45 ms off the beat.
    ag = ag[8 * BAR:12 * BAR]
    ds = ds[2 * BAR:8 * BAR]
    drums, ag, ds = norm(drums, 0.065), norm(ag, 0.13), norm(ds, 0.12)

    print('section timeline at 140 BPM')
    names = ['intro', 'verse', 'pre', 'chorus', 'verse', 'pre', 'breakdown', 'chorus', 'final', 'ending']
    for (a, b, *_), name in zip(FORM, names):
        print('  %-10s %5.1f-%5.1f s' % (name, a * BAR / SR, b * BAR / SR))

    print('\nbefore (v51 mixes, guitar band vs kick band, first chorus)')
    # v51 drum tempos: the kit was left at 160, halved for the menu and murk, sped up 12% for two bosses.
    for stem, bpm in [('rock-title', 160), ('rock-shore', 160), ('rock-menu', 80),
                      ('rock-drive', 160), ('rock-murk', 80), ('rock-boss-sunny', 179)]:
        shipped_flam(os.path.join(OUT, stem + '.ogg'), stem, bpm)

    songs = [
        # Shift stays 0. Other entry points of these takes were measured
        # and the notes there sat past 20 ms, so every song starts on the
        # phrase that locks. Tempo and the bright/dark balance make them differ.
        ('rock-title', ag, 'guitar', 140, 0, 1.00, 1.00),
        ('rock-menu', ag, 'guitar', 128, 0, 0.84, 0.92),
        ('rock-shore', ag, 'guitar', 140, 0, 1.00, 1.04),
        ('rock-murk', ag, 'guitar-dark', 132, 0, 0.96, 1.00),
        ('rock-drive', ag, 'guitar', 146, 0, 1.05, 1.00),
        ('rock-boss-sunny', ag, 'guitar', 148, 0, 1.08, 1.02),
        ('rock-boss-gazza', ag, 'guitar-dark', 148, 0, 1.08, 1.00),
        ('rock-boss-maw', ag, 'guitar-dark', 140, 0, 1.02, 1.00),
        ('rock-boss-vamp', ag, 'guitar-dark', 136, 0, 1.00, 0.96),
    ]
    print('\nafter (arranged stems, guitar attacks vs drum attacks)')
    for name, gtr, kind, bpm, shift, dk, gk in songs:
        d, g = apply_form(drums, gtr, shift, dk, gk)
        d = eq_stem(d, 'drums', os.path.join(TMP, name + '-d.wav'))
        g = eq_stem(g, kind, os.path.join(TMP, name + '-g.wav'))
        # EQ can change length by a few samples
        n = min(len(d), len(g))
        d, g = d[:n], g[:n]
        stats = flam(d, g, name)
        # Guitar p90 against the kit grid. 15 ms is the aim; 16 ms leaves one
        # detector bin of room. Songs that miss it are not encoded.
        if stats is None or stats[1] > 16 or stats[2] < 85:
            raise SystemExit(name + ' is still off the grid, not encoding')
        gb, gp = phone(g[16 * BAR:24 * BAR])
        db, dp = phone(d[16 * BAR:24 * BAR])
        print('    chorus phone  guitar-body %.3f  snare-peak %.3f' % (gb, dp))
        y = finish(d + g)
        path, before, after, peak = master(y, name + '-140')
        air = quiet_air(path)
        if air > 0.08:
            raise SystemExit(name + ' has hiss in the quiet bars (%.3f)' % air)
        final = os.path.join(TMP, name + '-final.wav')
        stretch_to(path, BPM, bpm, final)
        # re-check the lock survived the whole-mix stretch
        yd = read_mono(final)
        # cannot split after the sum. The stretch moves both parts together,
        # so the stem flam above is the lock. Print the tempo and loudness.
        print('    %s  %d BPM  mix %5.1f LUFS  mastered %5.1f  peak %.2f  air %.3f' % (
            name, bpm, before, after, peak, air))
        ogg = os.path.join(OUT, name + '.ogg')
        mp3 = os.path.join(OUT, name + '.mp3')
        subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', final, '-c:a', 'libvorbis', '-q:a', '5', ogg])
        subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', final, '-c:a', 'libmp3lame', '-b:a', '160k', mp3])
        chorus = 16 * (60.0 / bpm * 4)
        print('    first chorus at %.2fs' % chorus)


if __name__ == '__main__':
    main()
