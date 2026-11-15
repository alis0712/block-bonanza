#!/usr/bin/env python3
"""v59 vampire creature sounds. Short human performances, CC0.

Cuts one phrase from each recording, fades the edges, and trims the
rumble and the top fizz. The hiss stays a hiss. Title, menu, stages
and the vampire's existing lines are not touched.
"""
import os
import subprocess

import numpy as np
import soundfile as sf

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'voice', 'vamp')
SRC = '/tmp/v59-src'

# name, file, start, end, highpass, lowpass
CUTS = [
    ('hiss', 'hiss-qubo.mp3', 3.02, 4.22, 220, 9000),
    ('growl', 'growl-male.mp3', 1.68, 3.55, 55, 7500),
    ('whisper', 'whis-evil.mp3', 6.52, 7.38, 90, 9000),
    ('chuckle', 'laugh-baker.mp3', 0.70, 2.18, 70, 10000),
    ('shriek', 'scream-burst.mp3', 1.46, 2.58, 90, 10000),
]


def cut(path, a, b, hp, lp):
    af = 'highpass=f=%d,lowpass=f=%d' % (hp, lp)
    raw = subprocess.check_output([
        'ffmpeg', '-v', 'error', '-ss', str(a), '-t', str(b - a), '-i', path,
        '-af', af, '-ar', str(SR), '-ac', '1', '-f', 'f32le', '-',
    ])
    y = np.frombuffer(raw, np.float32).copy()
    fade = int(0.03 * SR)
    if len(y) > fade * 2:
        w = np.linspace(0, 1, fade, dtype=np.float32)
        y[:fade] *= w
        y[-fade:] *= w[::-1]
    peak = float(np.max(np.abs(y))) or 1.0
    y *= np.float32(0.62 / peak)
    return y


def air(y):
    spec = np.fft.rfft(y)
    f = np.fft.rfftfreq(len(y), 1.0 / SR)
    spec = spec.copy()
    spec[f < 9000] = 0
    z = np.fft.irfft(spec, len(y))
    hop = int(0.04 * SR)
    acc = []
    for a in range(0, max(0, len(y) - hop), hop):
        if np.sqrt(np.mean(y[a:a + hop] ** 2)) < 0.015:
            acc.append(np.sqrt(np.mean(z[a:a + hop] ** 2)))
    return float(np.median(acc)) if acc else 0.0


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, fn, a, b, hp, lp in CUTS:
        y = cut(os.path.join(SRC, fn), a, b, hp, lp)
        wav = os.path.join('/tmp/v59-src', name + '.wav')
        sf.write(wav, y, SR, subtype='PCM_16')
        subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '5', os.path.join(OUT, name + '.ogg')])
        subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '128k', os.path.join(OUT, name + '.mp3')])
        print('%-8s %5.2fs peak %.2f air %.5f' % (name, len(y) / SR, float(np.max(np.abs(y))), air(y)))


if __name__ == '__main__':
    main()
