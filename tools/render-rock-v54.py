#!/usr/bin/env python3
"""v54: a new stage-1 bed and a separate menu bed.

Stage 1 uses Valentin Sosnitskiy's CC BY grunge guitar, bass and drums
(Freesound 495685). It is his own piece, not a transcription of anything else.
The menu uses BaDoink's CC0 electric blues-rock, Got Mo Bluez (564839).
The title screen and stages 2-13 are not touched.
"""
import os
import subprocess

import numpy as np
import soundfile as sf

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'music')
TMP = '/tmp/v54-build'

# source regions in seconds: start, length, gain. The first loud section is the chorus.
STAGE1 = [
    (0.0, 8.0, 0.62),    # intro, the recording opens quietly
    (36.0, 16.0, 0.74),  # tense verse
    (16.0, 6.0, 0.92),   # lift
    (24.0, 20.0, 1.16),  # fuzzy chorus, the hook of his progression
    (52.0, 12.0, 0.72),  # verse
    (116.0, 14.0, 0.5),  # breakdown, the leaner stretch
    (160.0, 16.0, 1.05), # lead section, brighter bars of the same take
    (176.0, 22.0, 1.28), # bigger final chorus
]
# laid-back menu: longer verses, a modest chorus, no huge final
MENU = [
    (4.0, 12.0, 0.7),
    (16.0, 8.0, 0.88),
    (24.0, 14.0, 1.05),
    (40.0, 12.0, 0.66),
    (52.0, 16.0, 1.08),
]


def load(path):
    y, sr = sf.read(path, always_2d=True)
    if sr != SR:
        raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', path, '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'])
        y = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
    return y.astype(np.float32)


def assemble(src, sections):
    fade = int(0.02 * SR)
    parts = []
    for start, length, gain in sections:
        a = int(start * SR)
        b = min(len(src), a + int(length * SR))
        chunk = src[a:b] * np.float32(gain)
        if len(chunk) > fade * 2:
            ramp = np.linspace(0, 1, fade, dtype=np.float32)[:, None]
            chunk[:fade] *= ramp
            chunk[-fade:] *= ramp[::-1]
        parts.append(chunk)
    y = np.concatenate(parts, axis=0)
    n = int(2.6 * SR)
    y[-n:] *= np.linspace(1, 0, n, dtype=np.float32)[:, None]
    return y


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
    raise SystemExit('no lufs ' + path)


def tame(y):
    a = np.abs(y)
    knee = 0.32
    over = np.maximum(0, a - knee)
    return (np.sign(y) * (np.minimum(a, knee) + over * 0.25)).astype(np.float32)


def measure(path, label):
    import librosa
    y, sr = sf.read(path, always_2d=True)
    # chorus window: skip the quiet open
    a, b = int(20 * sr), int(min(len(y), 42 * sr))
    mono = y[a:b].mean(axis=1).astype(np.float32)
    spec = np.fft.rfft(mono)
    f = np.fft.rfftfreq(len(mono), 1.0 / sr)
    def ons(lo, hi, delta):
        s = spec.copy()
        s[(f < lo) | (f > hi)] = 0
        z = np.fft.irfft(s, len(mono)).astype(np.float32)
        return librosa.onset.onset_detect(y=z, sr=sr, units='time', hop_length=64, delta=delta, wait=2)
    kick = ons(40, 160, 0.1)
    gtr = ons(350, 2500, 0.06)
    if len(kick) < 4 or len(gtr) < 4:
        print('  %-8s few onsets k %d g %d' % (label, len(kick), len(gtr)))
        return
    dist = np.abs(gtr[:, None] - kick[None, :]).min(1) * 1000
    near = dist[dist <= 80]
    print('  %-8s guitar-to-kick p50 %4.1f p90 %4.1f ms  within15 %3.0f%%  n %d' % (
        label, float(np.median(near)), float(np.percentile(near, 90)),
        float(np.mean(near <= 15) * 100), len(near)))


def render(name, src_path, sections, eq, chorus_at):
    os.makedirs(TMP, exist_ok=True)
    y = assemble(load(src_path), sections)
    raw = os.path.join(TMP, name + '-arr.wav')
    write(raw, y)
    eqed = os.path.join(TMP, name + '-eq.wav')
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', raw, '-af', eq, eqed])
    z, _ = sf.read(eqed, always_2d=True)
    z = tame(z.astype(np.float32))
    tmp = os.path.join(TMP, name + '-t.wav')
    write(tmp, z)
    loud = lufs(tmp)
    z *= np.float32(10 ** ((-12.5 - loud) / 20.0))
    peak = float(np.max(np.abs(z)))
    if peak > 0.89:
        z *= np.float32(0.89 / peak)
    final = os.path.join(TMP, name + '.wav')
    write(final, z)
    print('%s  chorus %4.1fs  len %5.1fs  %5.1f LUFS  peak %.2f' % (
        name, chorus_at, len(z) / SR, lufs(final), float(np.max(np.abs(z)))))
    measure(final, name)
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', final, '-c:a', 'libvorbis', '-q:a', '5', os.path.join(OUT, name + '.ogg')])
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', final, '-c:a', 'libmp3lame', '-b:a', '160k', os.path.join(OUT, name + '.mp3')])


def main():
    # Thick low guitar stays. A presence bump keeps the fuzz audible on a phone.
    stage_eq = 'highpass=f=50,equalizer=f=1800:t=q:w=1.1:g=5,equalizer=f=3200:t=q:w=1.2:g=2,lowpass=f=10000'
    menu_eq = 'highpass=f=70,equalizer=f=2000:t=q:w=1.2:g=3,lowpass=f=11000'
    # chorus starts after intro 8 + verse 16 + lift 6 = 30 s
    render('rock-s01', '/tmp/v54-src/495685.mp3', STAGE1, stage_eq, 8 + 16 + 6)
    # chorus starts after 12 + 8 = 20 s
    render('rock-menu', '/tmp/v54-src/564839.mp3', MENU, menu_eq, 12 + 8)


if __name__ == '__main__':
    main()
