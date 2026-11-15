#!/usr/bin/env python3
"""v58 menu only. The v56 BaDoink clip has a sung part. Demucs lifts that
vocal out. Guitar, bass and drums stay, then the same phone EQ, loudness
and loop as v56. Title and stages are not touched.
"""
import os
import subprocess

import numpy as np
import soundfile as sf

SR = 44100
BPM = 140.0
BAR = int(round(60.0 / BPM * 4 * SR))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'music')
SRC = '/tmp/v52-src/547891.mp3'
STEM = '/tmp/v58-sep/htdemucs/547891/no_vocals.wav'
TMP = '/tmp/v58-build'


def ensure_stem():
    if os.path.exists(STEM):
        return
    subprocess.check_call([
        'python3', '-m', 'demucs', '--two-stems=vocals', '-n', 'htdemucs',
        '-o', '/tmp/v58-sep', SRC,
    ])


def load(path):
    y, sr = sf.read(path, always_2d=True)
    if sr != SR:
        raw = subprocess.check_output(
            ['ffmpeg', '-v', 'error', '-i', path, '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'])
        y = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
    return y.astype(np.float32)


def downbeat(y):
    mono = y.mean(axis=1)
    spec = np.fft.rfft(mono)
    f = np.fft.rfftfreq(len(mono), 1.0 / SR)
    spec[(f < 40) | (f > 140)] = 0
    k = np.abs(np.fft.irfft(spec, len(mono)))
    beat = 60.0 / BPM
    best, ph = -1.0, 0.0
    for p in np.linspace(0, beat, 60, endpoint=False):
        sc, n, t = 0.0, 0, float(p)
        while t < min(len(mono) / SR, 16):
            a = int(t * SR)
            b = min(len(k), a + int(0.04 * SR))
            if b > a:
                sc += float(k[a:b].max())
            t += beat
            n += 1
        if n and sc / n > best:
            best, ph = sc / n, float(p)
    return ph


def rotate(y, seconds):
    n = int(round(seconds * SR)) % len(y)
    return np.concatenate([y[n:], y[:n]], axis=0) if n else y


def crossfade_loop(y, fade_s=0.04):
    fade = int(fade_s * SR)
    w = np.linspace(0, 1, fade, dtype=np.float32)[:, None]
    y = y.copy()
    y[:fade] = y[-fade:] * (1.0 - w) + y[:fade] * w
    return y[:-fade]


def write(path, y):
    sf.write(path, np.clip(y, -1, 1), SR, subtype='PCM_16')


def lufs(path):
    out = subprocess.check_output(
        ['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128', '-f', 'null', '-'],
        stderr=subprocess.STDOUT, text=True)
    summary = out.split('Integrated loudness:')[-1]
    for line in summary.splitlines():
        if 'I:' in line and 'LUFS' in line:
            return float(line.split('I:')[1].split('LUFS')[0].strip())
    raise SystemExit('no lufs')


def band_level(path, lo, hi):
    y, sr = sf.read(path, always_2d=True)
    x = y.mean(axis=1)
    spec = np.abs(np.fft.rfft(x))
    f = np.fft.rfftfreq(len(x), 1.0 / sr)
    m = (f >= lo) & (f < hi)
    return float(np.sqrt(np.mean(spec[m] ** 2)))


def measure(path):
    import librosa
    y, sr = sf.read(path, always_2d=True)
    mono = y.mean(axis=1).astype(np.float32)
    spec = np.fft.rfft(mono)
    f = np.fft.rfftfreq(len(mono), 1.0 / sr)

    def ons(lo, hi):
        s = spec.copy()
        s[(f < lo) | (f > hi)] = 0
        z = np.fft.irfft(s, len(mono)).astype(np.float32)
        return librosa.onset.onset_detect(y=z, sr=sr, units='time', hop_length=64, delta=0.08, wait=2)

    kick, gtr = ons(40, 160), ons(800, 4000)
    dist = np.abs(gtr[:, None] - kick[None, :]).min(1) * 1000
    near = dist[dist <= 80]
    print('guitar-to-kick p50 %.1f  p90 %.1f ms  within15 %.0f%%  n %d' % (
        float(np.median(near)), float(np.percentile(near, 90)),
        float(np.mean(near <= 15) * 100), len(near)))


def main():
    os.makedirs(TMP, exist_ok=True)
    ensure_stem()
    y = load(STEM)
    y = rotate(y, downbeat(y))
    n_bars = len(y) // BAR
    y = y[:n_bars * BAR]
    y = crossfade_loop(y)
    y = np.concatenate([y, y], axis=0)
    y = crossfade_loop(y, 0.03)
    raw = os.path.join(TMP, 'menu.wav')
    write(raw, y)
    eqed = os.path.join(TMP, 'menu-eq.wav')
    af = 'highpass=f=40,equalizer=f=90:t=q:w=0.8:g=2,equalizer=f=1800:t=q:w=1.1:g=5,equalizer=f=3200:t=q:w=1.2:g=3,lowpass=f=11000'
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', raw, '-af', af, eqed])
    z, _ = sf.read(eqed, always_2d=True)
    z = z.astype(np.float32)
    a = np.abs(z)
    knee = 0.3
    over = np.maximum(0, a - knee)
    z = (np.sign(z) * (np.minimum(a, knee) + over * 0.22)).astype(np.float32)
    tamed = os.path.join(TMP, 'menu-tame.wav')
    write(tamed, z)
    loud = lufs(tamed)
    z *= np.float32(10 ** ((-12.5 - loud) / 20.0))
    peak = float(np.max(np.abs(z)))
    if peak > 0.89:
        z *= np.float32(0.89 / peak)
    final = os.path.join(TMP, 'menu-final.wav')
    write(final, z)
    print('len %.2fs  %.1f LUFS  peak %.2f  bars %d' % (
        len(z) / SR, lufs(final), float(np.max(np.abs(z))), n_bars))
    print('menu  1-4 kHz %.1f   2-6 kHz %.1f' % (band_level(final, 1000, 4000), band_level(final, 2000, 6000)))
    stage = os.path.join(ROOT, 'music', 'rock-s03.ogg')
    print('stage3 1-4 kHz %.1f   2-6 kHz %.1f' % (band_level(stage, 1000, 4000), band_level(stage, 2000, 6000)))
    measure(final)
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', final, '-c:a', 'libvorbis', '-q:a', '5', os.path.join(OUT, 'rock-menu.ogg')])
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', final, '-c:a', 'libmp3lame', '-b:a', '160k', os.path.join(OUT, 'rock-menu.mp3')])


if __name__ == '__main__':
    main()
