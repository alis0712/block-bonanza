#!/usr/bin/env python3
"""v55 menu only. Johnmode's early-2000s indie guitar and drum loop.

The title and every stage stay as they are. This file is already 32 bars at
125 BPM. A short crossfade makes the loop meet itself, and a light presence
boost keeps the jangle audible on a phone.
"""
import os
import subprocess

import numpy as np
import soundfile as sf

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'music')
SRC = '/tmp/v55-src/827097.mp3'
TMP = '/tmp/v55-build'


def load(path):
    y, sr = sf.read(path, always_2d=True)
    if sr != SR:
        raw = subprocess.check_output(
            ['ffmpeg', '-v', 'error', '-i', path, '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'])
        y = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
    return y.astype(np.float32)


def loopify(y):
    # Ease the louder ending down toward the opening so the repeat does not jump.
    tail = int(0.45 * SR)
    start = y[:int(0.5 * SR)]
    target = float(np.sqrt(np.mean(start ** 2)))
    end = y[-tail:]
    now = float(np.sqrt(np.mean(end ** 2))) + 1e-9
    ramp = np.linspace(1.0, target / now, tail, dtype=np.float32)[:, None]
    y = y.copy()
    y[-tail:] *= ramp
    fade = int(0.03 * SR)
    w = np.linspace(0, 1, fade, dtype=np.float32)[:, None]
    y[:fade] = y[-fade:] * (1 - w) + y[:fade] * w
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
        return librosa.onset.onset_detect(y=z, sr=sr, units='time', hop_length=64, delta=0.07, wait=2)
    kick, gtr = ons(40, 160), ons(600, 4500)
    dist = np.abs(gtr[:, None] - kick[None, :]).min(1) * 1000
    near = dist[dist <= 80]
    print('guitar-to-kick p50 %.1f  p90 %.1f ms  within15 %.0f%%  n %d' % (
        float(np.median(near)), float(np.percentile(near, 90)),
        float(np.mean(near <= 15) * 100), len(near)))


def main():
    os.makedirs(TMP, exist_ok=True)
    y = loopify(load(SRC))
    raw = os.path.join(TMP, 'menu.wav')
    write(raw, y)
    eqed = os.path.join(TMP, 'menu-eq.wav')
    # Keep the jangle. A small lift around 3 kHz is what a phone speaker can play.
    af = 'highpass=f=70,equalizer=f=2800:t=q:w=1.3:g=3,equalizer=f=4500:t=q:w=1.2:g=1.5,lowpass=f=12000'
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', raw, '-af', af, eqed])
    z, _ = sf.read(eqed, always_2d=True)
    z = z.astype(np.float32)
    a = np.abs(z)
    knee = 0.28
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
    print('len %.2fs  %.1f LUFS  peak %.2f' % (len(z) / SR, lufs(final), float(np.max(np.abs(z)))))
    measure(final)
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', final, '-c:a', 'libvorbis', '-q:a', '5', os.path.join(OUT, 'rock-menu.ogg')])
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', final, '-c:a', 'libmp3lame', '-b:a', '160k', os.path.join(OUT, 'rock-menu.mp3')])


if __name__ == '__main__':
    main()
