#!/usr/bin/env python3
"""Render original rock, pop and classical beds with FluidR3_GM (MIT).

Compositions are original. They are not arrangements of existing songs.
Rock is a fast instrumental in a mid-2000s pop-punk / arcade-racing style.
Pop is a major-key song with piano, clean guitar, bass and a kit.
Classical is an original allegro for strings, piano and winds. No drums.
"""
import os
import struct
import subprocess
import wave
from midiutil import MIDIFile

SF = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'music')
TMP = '/tmp/genre-render'
os.makedirs(TMP, exist_ok=True)
os.makedirs(OUT, exist_ok=True)


def new_midi():
    mf = MIDIFile(1)
    mf.addTempo(0, 0, 120)
    return mf


def clip_note(beat, dur, limit):
    if beat >= limit - 0.03:
        return None
    if beat + dur > limit - 0.02:
        dur = limit - beat - 0.02
    if dur < 0.04:
        return None
    return dur


class Song:
    def __init__(self, bpm, bars):
        self.bpm = bpm
        self.bars = bars
        self.limit = bars * 4
        self.mf = MIDIFile(1, removeDuplicates=False, deinterleave=False)
        self.mf.addTempo(0, 0, bpm)
        self._prog = set()

    def prog(self, ch, program, pan=64, vol=100):
        if ch in self._prog:
            return
        self._prog.add(ch)
        self.mf.addProgramChange(0, ch, 0, program)
        self.mf.addControllerEvent(0, ch, 0, 7, vol)
        self.mf.addControllerEvent(0, ch, 0, 10, pan)

    def n(self, ch, pitch, beat, dur, vel):
        d = clip_note(beat, dur, self.limit)
        if d is None:
            return
        self.mf.addNote(0, ch, int(pitch), float(beat), float(d), int(max(1, min(127, vel))))

    def save(self, path):
        with open(path, 'wb') as f:
            self.mf.writeFile(f)


def power(s, ch, root, beat, dur, vel):
    s.n(ch, root, beat, dur, vel)
    s.n(ch, root + 7, beat, dur, max(1, vel - 10))
    s.n(ch, root + 12, beat, dur, max(1, vel - 14))


def render_wav(mid, wav, reverb=True):
    cmd = ['fluidsynth', '-ni', '-R', '1' if reverb else '0', '-C', '0', '-g', '0.65',
           '-r', '44100', '-F', wav, '-T', 'wav', SF, mid]
    subprocess.check_call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def read_wav(path):
    with wave.open(path, 'rb') as w:
        ch, sw, sr, n, _, _ = w.getparams()[:6]
        raw = w.readframes(n)
    import numpy as np
    x = np.frombuffer(raw, dtype='<i2').astype('float32') / 32768.0
    if ch == 2:
        x = x.reshape(-1, 2)
    return x, sr


def write_wav(path, x, sr):
    import numpy as np
    y = np.clip(x, -1, 1)
    pcm = (y * 32767.0).astype('<i2').tobytes()
    ch = 1 if y.ndim == 1 else y.shape[1]
    with wave.open(path, 'wb') as w:
        w.setnchannels(ch)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm)


def fold_loop(x, sr, seconds):
    """Fold the reverb tail onto the downbeat, then overlap-add a short seam.

    The file ends on the sample just before the overlap, and the start begins
    with that same sample, so a looping player does not click.
    """
    import numpy as np
    n = int(round(seconds * sr))
    if len(x) < n + 8:
        raise SystemExit('render shorter than the loop')
    tail = x[n:]
    body = x[:n].copy()
    fade_n = min(len(tail), int(0.7 * sr))
    ramp = np.linspace(1.0, 0.0, fade_n, dtype='float32')
    if body.ndim == 2:
        ramp = ramp[:, None]
    body[:fade_n] += tail[:fade_n] * ramp
    seam = int(0.04 * sr)
    fade_in = np.linspace(0.0, 1.0, seam, dtype='float32')
    fade_out = 1.0 - fade_in
    if body.ndim == 2:
        fade_in = fade_in[:, None]
        fade_out = fade_out[:, None]
    head = body[:seam].copy()
    overlapped = head * fade_in + body[-seam:] * fade_out
    body = body[:-seam]
    body[:seam] = overlapped
    return body


def crunch(x):
    """Soft guitar drive. Tanh on a tonal stem does not add a noise bed."""
    import numpy as np
    drive = 2.2
    y = np.tanh(x * drive) / np.tanh(drive)
    # one-pole lowpass ~5.5 kHz to keep the crunch and drop any fizz
    a = 0.42
    z = np.zeros_like(y)
    acc = np.zeros(y.shape[-1] if y.ndim == 2 else 1, dtype='float32')
    if y.ndim == 1:
        acc = np.float32(0)
        for i in range(len(y)):
            acc += a * (y[i] - acc)
            z[i] = acc
    else:
        acc = np.zeros(2, dtype='float32')
        for i in range(len(y)):
            acc += a * (y[i] - acc)
            z[i] = acc
    return z * np.float32(0.9)


def encode(wav, stem):
    ogg = os.path.join(OUT, stem + '.ogg')
    mp3 = os.path.join(OUT, stem + '.mp3')
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '5', ogg])
    subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '160k', mp3])
    for p in (ogg, mp3):
        sz = os.path.getsize(p)
        print(f'  {os.path.basename(p):22} {sz/1e6:.2f} MB')


def finish(name, wav_in, seconds):
    x, sr = read_wav(wav_in)
    loop = fold_loop(x, sr, seconds)
    # peak normalize to about -1.5 dBFS
    peak = float(abs(loop).max()) or 1
    loop *= min(2.5, 0.84 / peak)
    out = os.path.join(TMP, name + '-loop.wav')
    write_wav(out, loop, sr)
    encode(out, 'genre-' + name)
    return out


# ---------------------------------------------------------------- rock
# Original instrumental. Fast pop-punk: muted chugs, then open power chords,
# eighth-note bass, acoustic kit, a major-key lead hook. Key of A.

A, E, D, G, Fs = 45, 40, 38, 43, 42


def rock_kit(s, bar, kind='verse', fill=False, crash=False):
    t = bar * 4
    if crash:
        s.n(9, 49, t, 1.4, 118)
    if kind == 'half':
        s.n(9, 36, t, 0.3, 116)
        s.n(9, 42, t, 0.2, 64)
        s.n(9, 42, t + 2, 0.2, 60)
        s.n(9, 38, t + 2, 0.25, 112)
        return
    if kind == 'build':
        for i in range(16):
            s.n(9, 38, t + i * 0.25, 0.09, 64 + i * 3)
        s.n(9, 36, t, 0.2, 110)
        s.n(9, 49, t + 3.7, 0.5, 120)
        return
    for i in range(8):
        hat = 46 if (kind == 'chorus' and i % 4 == 3) else 42
        s.n(9, hat, t + i * 0.5, 0.16, 80 if i % 2 == 0 else 58)
    for off, vel in ((0, 120), (1.5, 108), (2.5, 104)):
        s.n(9, 36, t + off, 0.2, vel)
    if kind == 'chorus':
        s.n(9, 36, t + 3.5, 0.14, 98)
    s.n(9, 38, t + 1, 0.2, 122)
    if fill:
        for off, tom, vel in ((2.5, 45, 102), (2.75, 47, 106), (3.0, 45, 108), (3.25, 47, 110), (3.5, 50, 114), (3.75, 38, 120)):
            s.n(9, tom, t + off, 0.1, vel)
    else:
        s.n(9, 38, t + 3, 0.2, 118)


def rock_bass(s, bar, root, drive=True):
    t = bar * 4
    b = root - 12
    for i in range(8):
        n = b + 12 if drive and i == 7 else b
        s.n(3, n, t + i * 0.5, 0.42, 112 if i % 2 == 0 else 96)


def rock_chug(s, bar, root):
    t = bar * 4
    for i in range(8):
        vel = 96 if i % 2 == 0 else 78
        power(s, 0, root, t + i * 0.5, 0.16, vel)
        power(s, 1, root, t + i * 0.5 + 0.02, 0.15, vel - 8)


def rock_open(s, bar, root):
    t = bar * 4
    for i in range(8):
        vel = 118 if i % 2 == 0 else 100
        power(s, 0, root, t + i * 0.5, 0.48, vel)
        power(s, 1, root, t + i * 0.5 + 0.022, 0.46, vel - 6)


HOOK = [
    (0.00, 73, 0.42, 114), (0.50, 76, 0.42, 112), (1.00, 81, 0.85, 120),
    (2.00, 79, 0.40, 110), (2.50, 78, 0.40, 108), (3.00, 76, 0.85, 114),
    (4.00, 76, 0.40, 112), (4.50, 78, 0.40, 110), (5.00, 79, 0.85, 116),
    (6.00, 76, 0.40, 108), (6.50, 74, 0.40, 106), (7.00, 73, 0.85, 114),
    (8.00, 69, 0.40, 106), (8.50, 73, 0.40, 108), (9.00, 76, 0.85, 118),
    (10.0, 74, 0.40, 108), (10.5, 76, 0.40, 110), (11.0, 78, 0.85, 116),
    (12.0, 79, 0.32, 112), (12.35, 78, 0.30, 110), (12.70, 76, 0.30, 108),
    (13.05, 74, 0.30, 106), (13.50, 73, 0.70, 114), (14.50, 76, 0.40, 110),
]
HARM = {73: 69, 76: 73, 81: 76, 79: 74, 78: 74, 74: 71, 69: 64}


def rock_hook(s, bar, harmony=False):
    base = bar * 4
    for off, pitch, dur, vel in HOOK:
        s.n(2, pitch, base + off, dur, vel)
        if harmony and pitch in HARM:
            s.n(4, HARM[pitch], base + off, dur, vel - 16)


def build_rock(guitars=True, bed=True):
    s = Song(176, 88)
    if guitars:
        s.prog(0, 30, pan=42, vol=108)   # distortion guitar, left
        s.prog(1, 30, pan=86, vol=100)   # double, right
        s.prog(2, 29, pan=70, vol=112)   # overdriven lead
        s.prog(4, 30, pan=58, vol=90)    # harmony guitar
        s.mf.addPitchWheelEvent(0, 1, 0, 8520)  # about +8 cents
    if bed:
        s.prog(3, 34, pan=64, vol=118)   # pick bass
    verse = [A, A, E, D, A, G, D, E]
    chorus = [D, A, E, A]
    for bar in range(16):
        root = verse[bar % 8]
        if guitars:
            rock_chug(s, bar, root)
        elif bed:
            rock_bass(s, bar, root, False)
        if bed:
            rock_kit(s, bar, 'verse', fill=(bar % 8 == 7), crash=(bar % 8 == 0))
    pre = [G, D, A, E]
    for i, root in enumerate(pre):
        bar = 16 + i
        if guitars:
            rock_open(s, bar, root)
        elif bed:
            rock_bass(s, bar, root, True)
        if bed:
            rock_kit(s, bar, 'chorus', fill=(i == 3), crash=True)
    for cycle in range(4):
        for i, root in enumerate(chorus):
            bar = 20 + cycle * 4 + i
            if guitars:
                rock_open(s, bar, root)
                if i == 0:
                    rock_hook(s, bar, harmony=False)
            elif bed:
                rock_bass(s, bar, root, True)
            if bed:
                rock_kit(s, bar, 'chorus', fill=(i == 3), crash=True)
    for bar in range(36, 52):
        root = verse[(bar - 36) % 8]
        if guitars:
            rock_chug(s, bar, root)
        elif bed:
            rock_bass(s, bar, root, False)
        if bed:
            rock_kit(s, bar, 'chorus', fill=((bar - 36) % 8 == 7), crash=((bar - 36) % 8 == 0))
    for i, root in enumerate(pre):
        bar = 52 + i
        if guitars:
            rock_open(s, bar, root)
        elif bed:
            rock_bass(s, bar, root, True)
        if bed:
            rock_kit(s, bar, 'chorus', fill=(i == 3), crash=True)
    for cycle in range(4):
        for i, root in enumerate(chorus):
            bar = 56 + cycle * 4 + i
            if guitars:
                rock_open(s, bar, root)
                if i == 0:
                    rock_hook(s, bar, harmony=True)
            elif bed:
                rock_bass(s, bar, root, True)
            if bed:
                rock_kit(s, bar, 'chorus', fill=(i == 3), crash=True)
    # bridge: pedal, then a snare build. No chord wash into the loop.
    walk = [A, G, D, E]
    for i, root in enumerate(walk):
        bar = 72 + i
        t = bar * 4
        if guitars:
            for k in range(8):
                s.n(0, root, t + k * 0.5, 0.14, 84)
                s.n(1, root + 12, t + k * 0.5 + 0.02, 0.12, 74)
        if bed:
            s.n(3, root - 12, t, 1.7, 104)
            s.n(3, (root - 12) + 7, t + 2, 1.5, 96)
            rock_kit(s, bar, 'half', crash=(i == 0))
    for bar in (76, 77):
        if guitars:
            rock_chug(s, bar, A if bar == 76 else D)
        elif bed:
            rock_bass(s, bar, A if bar == 76 else D, True)
        if bed:
            rock_kit(s, bar, 'build', crash=False)
    # final hook, then a tom fill and a clean cut so the loop restarts on the crash
    for cycle in range(1):
        for i, root in enumerate(chorus):
            bar = 78 + i
            if bar >= 86:
                break
            if guitars:
                rock_open(s, bar, root)
                if i == 0:
                    rock_hook(s, bar, harmony=True)
            elif bed:
                rock_bass(s, bar, root, True)
            if bed:
                rock_kit(s, bar, 'chorus', fill=False, crash=True)
    # bars 82-85 second hook statement, 86-87 fill only
    for i, root in enumerate(chorus):
        bar = 82 + i
        if guitars:
            rock_open(s, bar, root)
            if i == 0:
                rock_hook(s, bar, harmony=True)
        elif bed:
            rock_bass(s, bar, root, True)
        if bed:
            rock_kit(s, bar, 'chorus', fill=(i == 3), crash=True)
    for bar, root in ((86, E), (87, A)):
        t = bar * 4
        if bed:
            s.n(3, root - 12, t, 1.2, 100)
            rock_kit(s, bar, 'build' if bar == 87 else 'verse', fill=(bar == 86), crash=False)
        if guitars and bar == 86:
            rock_chug(s, bar, root)
    return s


# ---------------------------------------------------------------- pop
# Original, C major, 112 BPM. Piano and clean guitar, a sung-style hook
# with no singer, bass, and a pop kit (kick on 1 and 3, clap on 2 and 4).

POP = {
    'C': ([60, 64, 67], 36),
    'Em': ([64, 67, 71], 40),
    'F': ([65, 69, 72], 41),
    'G': ([67, 71, 74], 43),
    'Am': ([69, 72, 76], 45),
    'Dm': ([62, 65, 69], 38),
}


def pop_kit(s, bar, bright=False, fill=False):
    t = bar * 4
    s.n(9, 36, t, 0.22, 114)
    s.n(9, 36, t + 1.5, 0.16, 92)
    s.n(9, 36, t + 2, 0.2, 108)
    for off in (1, 3):
        s.n(9, 38, t + off, 0.18, 112)
        s.n(9, 39, t + off + 0.01, 0.12, 96)  # hand clap sample
    for i in range(8):
        s.n(9, 42, t + i * 0.5, 0.1, 70 if i % 2 == 0 else 52)
    if bright:
        s.n(9, 46, t + 3.5, 0.2, 78)
    if fill:
        s.n(9, 45, t + 3.0, 0.12, 90)
        s.n(9, 47, t + 3.25, 0.1, 94)
        s.n(9, 50, t + 3.5, 0.1, 98)
        s.n(9, 49, t + 3.75, 0.3, 100)


def pop_piano(s, bar, name, bouncy=True):
    notes, _ = POP[name]
    t = bar * 4
    dur = 0.34 if bouncy else 1.55
    steps = (0, 2) if bouncy else (0, 2)
    for st in steps:
        for i, n in enumerate(notes):
            s.n(0, n, t + st + i * 0.012, dur, 88 - i * 3)
    if bouncy:
        for i, n in enumerate(notes):
            s.n(0, n + 12, t + 3 + i * 0.01, 0.28, 74)


def pop_guitar(s, bar, name):
    notes, _ = POP[name]
    t = bar * 4
    for st in (0, 1.5, 2, 3):
        for i, n in enumerate(notes):
            s.n(2, n, t + st + i * 0.018, 0.42, 96 if st in (0, 2) else 80)


def pop_bass(s, bar, name):
    _, root = POP[name]
    t = bar * 4
    s.n(3, root, t, 0.85, 108)
    s.n(3, root + 7, t + 1.5, 0.35, 90)
    s.n(3, root + 12, t + 2, 0.7, 102)
    s.n(3, root, t + 3.0, 0.4, 92)
    s.n(3, root + 7, t + 3.5, 0.28, 84)


# 8-bar hook in C major. Original contour, not a quotation.
POP_HOOK = [
    (0.0, 76, 0.45, 108), (0.5, 79, 0.4, 106), (1.0, 81, 0.9, 114),
    (2.0, 79, 0.4, 104), (2.5, 76, 0.4, 102), (3.0, 74, 0.85, 108),
    (4.0, 72, 0.45, 104), (4.5, 76, 0.4, 106), (5.0, 79, 0.9, 112),
    (6.0, 77, 0.35, 100), (6.5, 76, 0.35, 100), (7.0, 74, 0.9, 106),
    (8.0, 76, 0.4, 106), (8.5, 79, 0.4, 108), (9.0, 84, 0.9, 116),
    (10.0, 81, 0.4, 108), (10.5, 79, 0.4, 106), (11.0, 76, 0.85, 110),
    (12.0, 74, 0.45, 104), (12.5, 76, 0.4, 106), (13.0, 79, 0.45, 108),
    (13.5, 81, 0.4, 110), (14.0, 79, 0.7, 108), (15.0, 76, 0.8, 104),
    (16.0, 76, 0.4, 108), (16.5, 79, 0.4, 110), (17.0, 81, 0.9, 116),
    (18.0, 84, 0.45, 112), (18.5, 81, 0.4, 108), (19.0, 79, 0.9, 110),
    (20.0, 76, 0.45, 106), (20.5, 74, 0.4, 104), (21.0, 72, 0.9, 108),
    (22.0, 74, 0.4, 104), (22.5, 76, 0.4, 106), (23.0, 79, 0.85, 112),
    (24.0, 81, 0.9, 114), (25.0, 79, 0.45, 108), (25.5, 76, 0.4, 106),
    (26.0, 74, 0.9, 108), (27.0, 72, 0.9, 106),
    (28.0, 74, 0.45, 104), (28.5, 76, 0.4, 106), (29.0, 79, 0.45, 108),
    (29.5, 81, 0.4, 110), (30.0, 84, 0.7, 114), (31.0, 79, 0.85, 108),
]


def pop_section(s, start, names, hook=False, guitar=True, bouncy=True):
    for i, name in enumerate(names):
        bar = start + i
        pop_piano(s, bar, name, bouncy=bouncy)
        pop_bass(s, bar, name)
        pop_kit(s, bar, bright=hook, fill=(hook and i == len(names) - 1))
        if guitar:
            pop_guitar(s, bar, name)
        if hook and i == 0:
            base = bar * 4
            for off, pitch, dur, vel in POP_HOOK:
                s.n(0, pitch, base + off, dur, vel)
                s.n(2, pitch - 12, base + off, dur * 0.9, vel - 14)


def build_pop():
    s = Song(112, 56)
    s.prog(0, 0, pan=58, vol=104)    # acoustic grand
    s.prog(1, 4, pan=78, vol=80)     # electric piano, color
    s.prog(2, 27, pan=48, vol=96)    # clean electric guitar
    s.prog(3, 33, pan=64, vol=112)   # finger bass
    verse = ['C', 'Em', 'F', 'G'] * 4          # 16
    chorus = ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'G']  # 8
    verse2 = ['C', 'Em', 'F', 'G'] * 3         # 12
    brk = ['Am', 'Em', 'F', 'G']               # 4
    pop_section(s, 0, verse, hook=False, guitar=False, bouncy=True)
    pop_section(s, 16, chorus, hook=True, guitar=True, bouncy=False)
    pop_section(s, 24, verse2, hook=False, guitar=True, bouncy=True)
    pop_section(s, 36, brk, hook=False, guitar=False, bouncy=True)
    pop_section(s, 40, chorus, hook=True, guitar=True, bouncy=False)
    pop_section(s, 48, chorus, hook=True, guitar=True, bouncy=False)
    return s


# ---------------------------------------------------------------- classical
# Original allegro in D major. Strings, piano, flute, oboe, horn. No drums.

D2, A2, B2, Fs2, G2, E2 = 38, 45, 47, 42, 43, 40


def vln(s, bar, notes, ch=0, vel=86):
    t = bar * 4
    for off, pitch, dur in notes:
        s.n(ch, pitch, t + off, dur * 0.96, vel)


# diatonic third below in D major, for the pitches we actually use
THIRD = {}
_scale = [62, 64, 66, 67, 69, 71, 73]
_below = [59, 61, 62, 64, 66, 67, 69]
for _oct in range(-1, 4):
    for _a, _b in zip(_scale, _below):
        THIRD[_a + 12 * _oct] = _b + 12 * _oct


A_MELODY = [
    [(0, 74, 1.4), (1.5, 78, 0.45), (2.0, 76, 0.9), (3.0, 74, 0.85)],
    [(0, 69, 1.7), (2.0, 71, 0.4), (2.5, 73, 0.4), (3.0, 74, 0.45), (3.5, 76, 0.4)],
    [(0, 78, 1.4), (1.5, 76, 0.4), (2.0, 74, 1.7)],
    [(0, 73, 0.85), (1.0, 74, 0.4), (1.5, 76, 0.4), (2.0, 78, 0.4), (2.5, 81, 0.4), (3.0, 78, 0.85)],
    [(0, 79, 1.3), (1.5, 78, 0.4), (2.0, 76, 0.85), (3.0, 74, 0.85)],
    [(0, 74, 0.85), (1.0, 73, 0.85), (2.0, 71, 1.7)],
    [(0, 69, 0.4), (0.5, 71, 0.4), (1.0, 73, 0.4), (1.5, 74, 0.4), (2.0, 76, 0.85), (3.0, 74, 0.85)],
    [(0, 73, 0.7), (1.0, 71, 0.7), (2.0, 69, 1.8)],
]
# sequence: same rhythm starting a step up, used in the B section's first half
B_MELODY = [
    [(0, 79, 1.2), (1.5, 81, 0.4), (2.0, 79, 0.85), (3.0, 76, 0.85)],
    [(0, 74, 0.4), (0.5, 76, 0.4), (1.0, 78, 0.4), (1.5, 79, 0.4), (2.0, 81, 1.6)],
    [(0, 78, 0.85), (1.0, 76, 0.4), (1.5, 74, 0.4), (2.0, 73, 0.85), (3.0, 74, 0.85)],
    [(0, 76, 0.4), (0.5, 78, 0.4), (1.0, 79, 0.85), (2.0, 81, 0.4), (2.5, 79, 0.4), (3.0, 76, 0.85)],
    [(0, 74, 1.4), (1.5, 73, 0.4), (2.0, 74, 0.85), (3.0, 76, 0.85)],
    [(0, 78, 0.85), (1.0, 76, 0.85), (2.0, 74, 0.4), (2.5, 73, 0.4), (3.0, 71, 0.85)],
    [(0, 69, 0.4), (0.5, 71, 0.4), (1.0, 73, 0.4), (1.5, 74, 0.4), (2.0, 76, 0.4), (2.5, 74, 0.4), (3.0, 73, 0.85)],
    [(0, 74, 0.7), (1.0, 73, 0.5), (2.0, 69, 1.8)],
]
CHORDS = {
    'D': (38, 54, [50, 54, 57]),
    'A': (45, 61, [52, 57, 61]),
    'Bm': (47, 62, [47, 50, 54]),
    'Fsm': (42, 61, [49, 54, 58]),
    'G': (43, 59, [50, 55, 59]),
    'Em': (40, 59, [52, 55, 59]),
    'C': (36, 60, [48, 52, 55]),
}


def classical_bar(s, bar, name, melody, vel=84, flute=False, horn=False, oboe=None):
    root, third, piano = CHORDS[name]
    t = bar * 4
    # cello walking quarters
    s.n(3, root, t, 0.9, vel - 6)
    s.n(3, root + 7, t + 1, 0.85, vel - 10)
    s.n(3, third - 12 if third > root else third, t + 2, 0.85, vel - 8)
    s.n(3, root + 7 if bar % 2 == 0 else root, t + 3, 0.8, vel - 10)
    # viola holds the third
    s.n(2, third, t, 3.4, vel - 18)
    # violins
    for off, pitch, dur in melody:
        s.n(0, pitch, t + off, dur * 0.97, vel)
        harm = THIRD.get(pitch)
        if harm:
            s.n(1, harm, t + off, dur * 0.95, vel - 12)
    # piano on the strong beats, soft
    for st in (0, 2):
        for i, n in enumerate(piano):
            s.n(4, n, t + st + i * 0.015, 1.3, 62)
    if flute:
        for off, pitch, dur in melody:
            s.n(5, pitch + 12, t + off, dur * 0.9, vel - 8)
    if horn:
        s.n(6, root + 12, t, 3.5, 70)
    if oboe:
        for off, pitch, dur in oboe:
            s.n(7, pitch, t + off, dur, vel - 4)


def build_classical():
    s = Song(116, 58)
    s.prog(0, 40, pan=46, vol=108)  # violin
    s.prog(1, 40, pan=82, vol=96)   # violin II
    s.prog(2, 41, pan=64, vol=90)   # viola
    s.prog(3, 42, pan=64, vol=104)  # cello
    s.prog(4, 0, pan=60, vol=78)    # piano
    s.prog(5, 73, pan=78, vol=90)   # flute
    s.prog(6, 60, pan=52, vol=84)   # french horn
    s.prog(7, 68, pan=70, vol=88)   # oboe
    a_chords = ['D', 'A', 'Bm', 'Fsm', 'G', 'D', 'Em', 'A']
    for rep in range(2):
        for i, name in enumerate(a_chords):
            classical_bar(s, rep * 8 + i, name, A_MELODY[i], vel=80 if rep == 0 else 88, horn=(rep == 1 and i in (0, 7)))
    b_chords = ['G', 'D', 'Em', 'A', 'D', 'Bm', 'Em', 'A']
    oboe_line = [
        [(0, 79, 1.5), (2, 76, 1.5)],
        [(0, 74, 1.0), (1, 76, 0.5), (2, 78, 1.5)],
        [(0, 76, 2.0), (2.5, 74, 1.0)],
        [(0, 73, 1.0), (1.5, 74, 2.0)],
        [(0, 74, 1.2), (1.5, 78, 0.5), (2.5, 76, 1.2)],
        [(0, 74, 1.5), (2, 71, 1.5)],
        [(0, 71, 0.7), (1, 73, 0.7), (2, 74, 1.5)],
        [(0, 76, 1.0), (1.5, 73, 0.5), (2.5, 69, 1.2)],
    ]
    for i, name in enumerate(b_chords):
        classical_bar(s, 16 + i, name, B_MELODY[i], vel=90, oboe=oboe_line[i], horn=(i in (0, 4)))
    for i, name in enumerate(b_chords):
        classical_bar(s, 24 + i, name, B_MELODY[i], vel=94, flute=True, horn=(i in (0, 4)))
    # a short episode, still lyrical, then the theme returns with flute and horn
    epi = ['C', 'G', 'D', 'A', 'Bm', 'Fsm', 'G', 'A', 'D', 'A']
    epi_mel = [
        [(0, 72, 1.5), (2, 71, 1.5)],
        [(0, 74, 0.7), (1, 76, 0.7), (2, 79, 1.5)],
        [(0, 78, 1.2), (1.5, 76, 0.5), (2.5, 74, 1.2)],
        [(0, 73, 2.0), (2.5, 74, 1.0)],
        [(0, 71, 0.5), (0.5, 73, 0.5), (1, 74, 0.5), (1.5, 76, 0.5), (2, 78, 1.5)],
        [(0, 78, 1.0), (1.5, 73, 0.5), (2.5, 69, 1.2)],
        [(0, 79, 1.4), (2, 78, 0.5), (3, 76, 0.7)],
        [(0, 76, 0.7), (1, 74, 0.7), (2, 73, 1.5)],
        [(0, 74, 1.5), (2, 69, 1.5)],
        [(0, 73, 0.8), (1, 74, 0.5), (2, 76, 1.6)],
    ]
    for i, name in enumerate(epi):
        classical_bar(s, 32 + i, name, epi_mel[i], vel=86, horn=(i in (0, 8)))
    for i, name in enumerate(a_chords):
        classical_bar(s, 42 + i, name, A_MELODY[i], vel=98, flute=True, horn=True)
    for i, name in enumerate(a_chords):
        # second statement eases into a cadence the loop can restart on
        vel = 100 if i < 6 else 90
        classical_bar(s, 50 + i, name, A_MELODY[i], vel=vel, flute=(i < 6), horn=(i in (0, 6, 7)))
    return s


def mix_rock(bed, gtr, out, sr_expected=44100):
    import numpy as np
    a, sr = read_wav(bed)
    b, sr2 = read_wav(gtr)
    n = min(len(a), len(b))
    a = a[:n]
    b = crunch(b[:n])
    y = a * np.float32(0.82) + b * np.float32(0.72)
    write_wav(out, y, sr)
    return out


def main():
    jobs = []
    print('rock midi')
    bed = build_rock(guitars=False, bed=True)
    gtr = build_rock(guitars=True, bed=False)
    bed.save(os.path.join(TMP, 'rock-bed.mid'))
    gtr.save(os.path.join(TMP, 'rock-gtr.mid'))
    print('pop midi')
    pop = build_pop()
    pop.save(os.path.join(TMP, 'pop.mid'))
    print('classical midi')
    cl = build_classical()
    cl.save(os.path.join(TMP, 'classical.mid'))

    print('rendering (FluidR3_GM)')
    render_wav(os.path.join(TMP, 'rock-bed.mid'), os.path.join(TMP, 'rock-bed.wav'), True)
    render_wav(os.path.join(TMP, 'rock-gtr.mid'), os.path.join(TMP, 'rock-gtr.wav'), True)
    mixed = os.path.join(TMP, 'rock-mix.wav')
    mix_rock(os.path.join(TMP, 'rock-bed.wav'), os.path.join(TMP, 'rock-gtr.wav'), mixed)
    render_wav(os.path.join(TMP, 'pop.mid'), os.path.join(TMP, 'pop.wav'), True)
    render_wav(os.path.join(TMP, 'classical.mid'), os.path.join(TMP, 'classical.wav'), True)

    print('loop + encode')
    # 88 bars at 176, 56 at 112, 58 at 116. All 120.000 seconds.
    finish('rock', mixed, 88 * 4 * 60 / 176)
    finish('pop', os.path.join(TMP, 'pop.wav'), 56 * 4 * 60 / 112)
    finish('classical', os.path.join(TMP, 'classical.wav'), 58 * 4 * 60 / 116)
    print('done')


if __name__ == '__main__':
    main()
