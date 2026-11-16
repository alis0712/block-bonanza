#!/usr/bin/env python3
"""v60 wordless boss vocals. Real CC0 performances, no speech.

The raw chuckle take has a steady noise floor, so those slices are gated.
Everything else is a clean close recording, high-passed and peaked at 0.62.
"""
import os
import subprocess

import numpy as np
import soundfile as sf

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = '/tmp/v59-src'
# dest folder under voice/, filename, source, start, end, highpass, lowpass, gate
CUTS = [
    ('vamp', 'laugh', 'laugh-ck.mp3', 0.22, 2.58, 70, 9000, False),
    ('surfer', 'laugh', 'chuck-raw.mp3', 1.12, 1.82, 80, 8000, True),
    ('surfer', 'grunt', 'grunts.mp3', 0.48, 0.98, 70, 7000, False),
    ('gator', 'snarl', 'snarl.mp3', 0.22, 1.08, 50, 5000, False),
    ('gator', 'grunt', 'groans.mp3', 5.48, 6.22, 60, 7000, False),
    ('gator', 'growl', 'growl-throat.mp3', 0.16, 1.28, 45, 4500, False),
    ('maw', 'growl', 'growl-male.mp3', 6.22, 8.15, 45, 5500, False),
    ('maw', 'snarl', 'groans.mp3', 13.28, 14.12, 60, 7000, False),
    ('sol', 'chuckle', 'chuck-raw.mp3', 3.32, 3.88, 80, 8000, True),
]


def load_cut(path, a, b, hp, lp):
    af = 'highpass=f=%d,lowpass=f=%d' % (hp, lp)
    raw = subprocess.check_output([
        'ffmpeg', '-v', 'error', '-ss', str(a), '-t', str(b - a), '-i', path,
        '-af', af, '-ar', str(SR), '-ac', '1', '-f', 'f32le', '-',
    ])
    return np.frombuffer(raw, np.float32).copy()


def gate(y):
    hop = int(0.01 * SR)
    env = np.zeros_like(y)
    for a in range(0, len(y) - hop, hop):
        env[a:a + hop] = np.sqrt(np.mean(y[a:a + hop] ** 2))
    g = np.clip((env - 0.075) / 0.035, 0, 1).astype(np.float32)
    win = int(0.015 * SR) or 1
    g = np.convolve(g, np.ones(win, dtype=np.float32) / win, mode='same')
    return y * g


def finish(y):
    fade = int(0.025 * SR)
    if len(y) > fade * 2:
        w = np.linspace(0, 1, fade, dtype=np.float32)
        y = y.copy()
        y[:fade] *= w
        y[-fade:] *= w[::-1]
    peak = float(np.max(np.abs(y))) or 1.0
    return y * np.float32(0.62 / peak)


def air(y):
    spec = np.fft.rfft(y)
    f = np.fft.rfftfreq(len(y), 1.0 / SR)
    spec = spec.copy()
    spec[f < 9000] = 0
    z = np.fft.irfft(spec, len(y))
    hop = int(0.04 * SR)
    acc = []
    for a in range(0, max(0, len(y) - hop), hop):
        if np.sqrt(np.mean(y[a:a + hop] ** 2)) < 0.012:
            acc.append(np.sqrt(np.mean(z[a:a + hop] ** 2)))
    return float(np.median(acc)) if acc else 0.0


def main():
    for folder, name, fn, a, b, hp, lp, do_gate in CUTS:
        y = load_cut(os.path.join(SRC, fn), a, b, hp, lp)
        if do_gate:
            y = gate(y)
        y = finish(y)
        out = os.path.join(ROOT, 'voice', folder)
        os.makedirs(out, exist_ok=True)
        wav = os.path.join('/tmp', 'v60-%s-%s.wav' % (folder, name))
        sf.write(wav, y, SR, subtype='PCM_16')
        subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '5', os.path.join(out, name + '.ogg')])
        subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '128k', os.path.join(out, name + '.mp3')])
        print('%-8s %-8s %5.2fs peak %.2f air %.5f' % (folder, name, len(y) / SR, float(np.max(np.abs(y))), air(y)))


if __name__ == '__main__':
    main()
