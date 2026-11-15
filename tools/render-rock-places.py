#!/usr/bin/env python3
"""Six rock beds from CC0 performances. No one-shot sequencing.

Each bed is a different person's guitar take. Drums are human grooves,
time-fit only enough to share a tempo with that guitar. See
music/GENRE-LICENSES.md.
"""
import os
import subprocess
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'music')
SRC = '/tmp/v48-src/wav'
TMP = '/tmp/genre-render'
os.makedirs(OUT, exist_ok=True)
os.makedirs(TMP, exist_ok=True)
SR = 44100


def read_wav(path):
    with wave.open(path, 'rb') as w:
        ch, sr, n = w.getnchannels(), w.getframerate(), w.getnframes()
        x = np.frombuffer(w.readframes(n), dtype='<i2').astype('float32') / 32768.0
        if ch == 2:
            x = x.reshape(-1, 2)
        else:
            x = np.stack([x, x], axis=1)
    if sr != SR:
        raise SystemExit('unexpected rate ' + path)
    return x


def write_wav(path, x):
    y = np.clip(x, -1, 1)
    pcm = (y * 32767.0).astype('<i2').tobytes()
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm)


def atempo(src, factor, dest):
    if abs(factor - 1.0) < 0.004:
        return src
    subprocess.check_call([
        'ffmpeg', '-y', '-v', 'error', '-i', src,
        '-filter:a', 'atempo=%.5f' % factor, '-ac', '2', '-ar', str(SR), dest,
    ])
    return dest


def fit_len(x, n):
    if len(x) >= n:
        return x[:n]
    y = np.zeros((n, 2), dtype='float32')
    y[:len(x)] = x
    return y


def tile(x, n, fade=None):
    """Repeat a performance out to n samples, with a short join."""
    if fade is None:
        fade = int(0.02 * SR)
    fade = min(fade, len(x) // 8)
    y = np.zeros((n, 2), dtype='float32')
    pos = 0
    while pos < n:
        take = min(len(x), n - pos)
        if pos > 0 and fade > 8:
            f = min(fade, take)
            ramp = np.linspace(0.0, 1.0, f, dtype='float32')[:, None]
            y[pos:pos + f] = y[pos:pos + f] * (1.0 - ramp) + x[:f] * ramp
            if take > f:
                y[pos + f:pos + take] = x[f:take]
        else:
            y[pos:pos + take] = x[:take]
        pos += take
    return y


def highpass(x, fc):
    a = np.float32(np.exp(-2.0 * np.pi * fc / SR))
    y = np.empty_like(x)
    px = np.zeros(2, dtype='float32')
    py = np.zeros(2, dtype='float32')
    for i in range(len(x)):
        py = a * (py + x[i] - px)
        px = x[i].copy()
        y[i] = py
    return y


def p99(x):
    return float(np.percentile(np.abs(x).max(axis=1), 99))


def scale(x, target):
    return x * np.float32(target / (p99(x) + 1e-9))


def seam(x):
    fade = int(0.04 * SR)
    head = x[:fade].copy()
    body = x[:-fade].copy()
    ramp = np.linspace(0.0, 1.0, fade, dtype='float32')[:, None]
    body[:fade] = head * ramp + x[-fade:] * (1.0 - ramp)
    peak = float(np.max(np.abs(body))) or 1.0
    body *= min(2.5, 0.84 / peak)
    return body


def crack_cv(x):
    mono = x.mean(axis=1)
    spec = np.fft.rfft(mono)
    freqs = np.fft.rfftfreq(len(mono), 1.0 / SR)
    spec[(freqs < 1500) | (freqs >= 5500)] = 0
    y = np.fft.irfft(spec, n=len(mono)).astype('float32')
    hop = int(0.01 * SR)
    env = np.array([np.sqrt(np.mean(y[i:i + hop] ** 2)) for i in range(0, len(y) - hop, hop)])
    thr = np.percentile(env, 82)
    times = []
    for i in range(1, len(env) - 1):
        if env[i] > thr and env[i] >= env[i - 1] and env[i] > env[i + 1]:
            t = i * 0.01
            if not times or t - times[-1] > 0.12:
                times.append(t)
    if len(times) < 4:
        return 0.0, 1.0
    iv = np.diff(times[:24])
    cv = float(iv.std() / (iv.mean() + 1e-9))
    # waveform likeness of the first hits
    w = int(0.035 * SR)
    clips = []
    for t in times[:10]:
        c = int(t * SR)
        if c + w < len(mono):
            clips.append(mono[c:c + w])
    cs = []
    for i in range(len(clips)):
        for j in range(i + 1, len(clips)):
            u = clips[i] - clips[i].mean()
            v = clips[j] - clips[j].mean()
            cs.append(float((u * v).sum() / (np.sqrt((u * u).sum() * (v * v).sum()) + 1e-9)))
    return cv, float(np.median(cs) if cs else 0.0)


def quiet_air(x):
    mono = x.mean(axis=1)
    hop = int(0.03 * SR)
    rms, airs = [], []
    for i in range(0, len(mono) - hop, hop):
        fr = mono[i:i + hop]
        rms.append(float(np.sqrt(np.mean(fr * fr))))
        sp = np.abs(np.fft.rfft(fr)) ** 2
        f = np.fft.rfftfreq(len(fr), 1.0 / SR)
        airs.append(float(sp[f >= 8000].sum() / (sp.sum() + 1e-12)))
    rms = np.array(rms)
    airs = np.array(airs)
    return float(np.median(airs[rms <= np.percentile(rms, 15)]))


def encode(wav, stem):
    ogg = os.path.join(OUT, stem + '.ogg')
    mp3 = os.path.join(OUT, stem + '.mp3')
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '5', ogg])
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '160k', mp3])
    print('  %-18s ogg %.2f MB' % (stem, os.path.getsize(ogg) / 1e6))


def mix(name, gtr, drm, bas, g_lvl, d_lvl, b_lvl):
    parts = []
    if gtr is not None:
        parts.append(scale(gtr, g_lvl))
    if drm is not None:
        parts.append(scale(drm, d_lvl))
    if bas is not None:
        parts.append(scale(bas, b_lvl))
    n = min(len(p) for p in parts)
    y = sum(p[:n] for p in parts)
    peak = float(np.max(np.abs(y)))
    if peak > 0.98:
        y *= np.float32(0.98 / peak)
    loop = seam(y)
    cv, corr = crack_cv(loop)
    air = quiet_air(loop)
    gp = p99(gtr[:n]) if gtr is not None else 0
    # report on the scaled stems actually summed
    print('%s  dur %.1fs  drum-cv %.2f  hit-corr %.2f  quiet-air %.3f' % (name, len(loop) / SR, cv, corr, air))
    if cv < 0.08:
        raise SystemExit(name + ' drums are on a machine grid')
    if corr > 0.7:
        raise SystemExit(name + ' drum hits are copies of one sample')
    if air > 0.12:
        raise SystemExit(name + ' has a hiss bed')
    path = os.path.join(TMP, name + '.wav')
    write_wav(path, loop)
    encode(path, 'rock-' + name)
    return path


def main():
    g_ag = read_wav(os.path.join(SRC, 'g-ag.wav'))
    g_74 = read_wav(os.path.join(SRC, 'g-grungy74.wav'))
    g_166 = read_wav(os.path.join(SRC, 'g-grunge166.wav'))
    g_rock = read_wav(os.path.join(SRC, 'g-rock.wav'))
    g_riff = read_wav(os.path.join(SRC, 'g-dsharp80.wav'))
    g_chug = read_wav(os.path.join(SRC, 'g-chug.wav'))
    d160 = read_wav(os.path.join(SRC, 'd-160.wav'))
    dfree = read_wav(os.path.join(SRC, 'd-free.wav'))
    bass = read_wav(os.path.join(SRC, 'b-riff4.wav'))

    # Title: aceinet's A-to-G distorted riff. Three kit passes fill that phrase.
    title_n = len(g_ag)
    factor = len(d160) / (title_n / 3.0)
    dpath = atempo(os.path.join(SRC, 'd-160.wav'), factor, os.path.join(TMP, 'd-title.wav'))
    d_title = tile(read_wav(dpath), title_n)
    mix('title', g_ag, d_title, None, 0.60, 0.50, 0)

    # Menu: 74 bpm chord performance sped slightly to 80, kit at half speed (calmer).
    gpath = atempo(os.path.join(SRC, 'g-grungy74.wav'), 80.0 / 74.0, os.path.join(TMP, 'g-menu.wav'))
    dpath = atempo(os.path.join(SRC, 'd-160.wav'), 0.5, os.path.join(TMP, 'd-menu.wav'))
    g_menu = read_wav(gpath)
    d_menu = tile(read_wav(dpath), len(g_menu))
    mix('menu', g_menu, d_menu, None, 0.64, 0.36, 0)

    # Bright stages: the 166 bpm fuzz phrase, twice, with the Gretsch groove and bass.
    bar = int(round(4 * 60.0 / 166.0 * SR))
    shore_n = 16 * bar
    gpath = atempo(os.path.join(SRC, 'g-grunge166.wav'), len(g_166) / (8 * bar), os.path.join(TMP, 'g-shore.wav'))
    dpath = atempo(os.path.join(SRC, 'd-160.wav'), len(d160) / (8 * bar), os.path.join(TMP, 'd-shore.wav'))
    bpath = atempo(os.path.join(SRC, 'b-riff4.wav'), len(bass) / (8 * bar), os.path.join(TMP, 'b-shore.wav'))
    mix('shore', tile(read_wav(gpath), shore_n), tile(read_wav(dpath), shore_n), tile(read_wav(bpath), shore_n), 0.58, 0.56, 0.20)

    # Murk: aceinet's slower dirty riff, kit at half speed so the whole bed sits near 80.
    # Heavier than the menu (drums up), and a different guitar part.
    murk_n = len(read_wav(atempo(os.path.join(SRC, 'd-160.wav'), 0.5, os.path.join(TMP, 'd-murk.wav'))))
    gpath = atempo(os.path.join(SRC, 'g-dsharp80.wav'), len(g_riff) / murk_n, os.path.join(TMP, 'g-murk.wav'))
    mix('murk', highpass(fit_len(read_wav(gpath), murk_n), 70.0), read_wav(os.path.join(TMP, 'd-murk.wav')), None, 0.60, 0.54, 0)

    # Drive: Dusk225's rock riff over two native Gretsch passes (both already ~24s / 12s).
    drive_n = len(g_rock)
    mix('drive', g_rock, tile(d160, drive_n), None, 0.58, 0.56, 0)

    # Boss: the low chug and the kit, both a little faster, guitar in front.
    boss_seconds = 4 * (len(d160) / SR) / 1.12
    boss_n = int(boss_seconds * SR)
    gpath = atempo(os.path.join(SRC, 'g-chug.wav'), len(g_chug) / boss_n, os.path.join(TMP, 'g-boss.wav'))
    dpath = atempo(os.path.join(SRC, 'd-160.wav'), 1.12, os.path.join(TMP, 'd-boss.wav'))
    g_boss = highpass(fit_len(read_wav(gpath), boss_n), 80.0)
    d_boss = tile(read_wav(dpath), boss_n)
    mix('boss', g_boss, d_boss, None, 0.66, 0.58, 0)
    print('done')


if __name__ == '__main__':
    main()
