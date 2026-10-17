using System;

/// <summary>
/// Tiny software synthesizer. Everything here is plain math on float arrays
/// (no Unity API), so it is safe to run on a background thread.
/// Samples are mono, 44.1 kHz, in the range -1..1.
/// </summary>
public static class AudioSynth
{
    public const int SampleRate = 44100;
    private const double TwoPi = Math.PI * 2.0;

    public enum Wave { Sine, Square, Saw, Triangle, Noise }

    /// <summary>Converts a MIDI note number to a frequency in Hz (69 = A4 = 440 Hz).</summary>
    public static float MidiToHz(float midi)
    {
        return 440f * (float)Math.Pow(2.0, (midi - 69f) / 12f);
    }

    public static float[] NewBuffer(float seconds)
    {
        return new float[Math.Max(1, (int)(seconds * SampleRate))];
    }

    /// <summary>One sample of a basic waveform. phase is measured in cycles.</summary>
    public static float Osc(Wave wave, double phase, Random rnd)
    {
        double p = phase - Math.Floor(phase);
        switch (wave)
        {
            case Wave.Sine: return (float)Math.Sin(p * TwoPi);
            case Wave.Square: return p < 0.5 ? 1f : -1f;
            case Wave.Saw: return (float)(2.0 * p - 1.0);
            case Wave.Triangle: return (float)(p < 0.5 ? 4.0 * p - 1.0 : 3.0 - 4.0 * p);
            default: return (float)(rnd.NextDouble() * 2.0 - 1.0);
        }
    }

    /// <summary>
    /// Adds a tone to the buffer. freq(t) and env(t) get the time in seconds since
    /// the tone started, so you can make pitch drops, vibrato, decays, etc.
    /// </summary>
    public static void AddTone(float[] buf, float start, float duration, Wave wave,
                               Func<float, float> freq, Func<float, float> env, float volume, Random rnd)
    {
        int s0 = (int)(start * SampleRate);
        int n = (int)(duration * SampleRate);
        double phase = 0;
        for (int i = 0; i < n; i++)
        {
            int idx = s0 + i;
            if (idx < 0 || idx >= buf.Length) continue;
            float t = i / (float)SampleRate;
            phase += freq(t) / SampleRate;
            float a = env(t);
            // tiny 2 ms fade-in so tones never click
            if (i < 88) a *= i / 88f;
            buf[idx] += Osc(wave, phase, rnd) * a * volume;
        }
    }

    /// <summary>Adds filtered noise. lowCut/highCut(t) are filter cutoffs in Hz
    /// (highCut lowpasses, lowCut removes rumble), giving a band of noise.</summary>
    public static void AddNoise(float[] buf, float start, float duration, Func<float, float> env,
                                float volume, Func<float, float> highCut, float lowCut, Random rnd)
    {
        int s0 = (int)(start * SampleRate);
        int n = (int)(duration * SampleRate);
        float lp = 0f, lp2 = 0f;
        float hpCoef = Coef(lowCut);
        for (int i = 0; i < n; i++)
        {
            int idx = s0 + i;
            if (idx < 0 || idx >= buf.Length) continue;
            float t = i / (float)SampleRate;
            float x = (float)(rnd.NextDouble() * 2.0 - 1.0);
            lp += Coef(highCut(t)) * (x - lp);
            lp2 += hpCoef * (lp - lp2);
            buf[idx] += (lp - lp2) * env(t) * volume;
        }
    }

    /// <summary>One-pole filter coefficient for a cutoff frequency.</summary>
    public static float Coef(float cutoffHz)
    {
        float c = 1f - (float)Math.Exp(-TwoPi * Math.Max(10f, cutoffHz) / SampleRate);
        return Math.Min(1f, Math.Max(0.0001f, c));
    }

    public static void LowPass(float[] buf, float cutoffHz)
    {
        float c = Coef(cutoffHz), y = 0f;
        for (int i = 0; i < buf.Length; i++) { y += c * (buf[i] - y); buf[i] = y; }
    }

    /// <summary>Soft-clip distortion; bigger drive = dirtier and louder.</summary>
    public static void Drive(float[] buf, float drive)
    {
        for (int i = 0; i < buf.Length; i++) buf[i] = (float)Math.Tanh(buf[i] * drive);
    }

    public static void Normalize(float[] buf, float peak)
    {
        float max = 0.0001f;
        for (int i = 0; i < buf.Length; i++) max = Math.Max(max, Math.Abs(buf[i]));
        float g = peak / max;
        for (int i = 0; i < buf.Length; i++) buf[i] *= g;
    }

    /// <summary>Short fade at the very end so a sound never stops with a click.</summary>
    public static void FadeEdges(float[] buf)
    {
        int n = Math.Min(buf.Length / 4, SampleRate / 150); // ~7 ms
        for (int i = 0; i < n; i++) buf[buf.Length - 1 - i] *= i / (float)n;
    }

    private static Func<float, float> Const(float v) { return t => v; }
    private static Func<float, float> Decay(float rate) { return t => (float)Math.Exp(-t * rate); }

    // ==================================================================
    // Sound effects (deliberately "clunky" and cartoony)
    // ==================================================================

    public static float[] MoveTick()
    {
        var r = new Random(1); var b = NewBuffer(0.045f);
        AddTone(b, 0, 0.045f, Wave.Square, Const(950f), Decay(90f), 0.3f, r);
        AddNoise(b, 0, 0.015f, Decay(300f), 0.3f, Const(5000f), 300f, r);
        Normalize(b, 0.5f); return b;
    }

    public static float[] RotateClick()
    {
        var r = new Random(2); var b = NewBuffer(0.07f);
        AddTone(b, 0, 0.07f, Wave.Square, t => t < 0.018f ? 1500f : 760f, Decay(55f), 0.3f, r);
        AddTone(b, 0, 0.03f, Wave.Triangle, Const(2300f), Decay(140f), 0.3f, r);
        Normalize(b, 0.5f); return b;
    }

    public static float[] SoftDropTap()
    {
        var r = new Random(3); var b = NewBuffer(0.04f);
        AddNoise(b, 0, 0.04f, Decay(150f), 0.6f, Const(1500f), 100f, r);
        AddTone(b, 0, 0.04f, Wave.Sine, Const(180f), Decay(100f), 0.5f, r);
        Normalize(b, 0.4f); return b;
    }

    public static float[] LockThud()
    {
        var r = new Random(4); var b = NewBuffer(0.25f);
        AddTone(b, 0, 0.25f, Wave.Sine, t => 40f + 120f * (float)Math.Exp(-t * 12f), Decay(14f), 0.9f, r);
        AddTone(b, 0, 0.12f, Wave.Square, Const(72f), Decay(28f), 0.18f, r); // wooden "clunk"
        AddNoise(b, 0, 0.08f, Decay(40f), 0.5f, Const(700f), 60f, r);
        Drive(b, 2f); Normalize(b, 0.85f); return b;
    }

    public static float[] HardDropSlam()
    {
        var r = new Random(5); var b = NewBuffer(0.5f);
        AddTone(b, 0, 0.5f, Wave.Sine, t => 35f + 170f * (float)Math.Exp(-t * 20f), Decay(7f), 1f, r);
        AddNoise(b, 0, 0.32f, Decay(16f), 0.8f, t => 300f + 3000f * (float)Math.Exp(-t * 15f), 80f, r);
        AddTone(b, 0, 0.28f, Wave.Square, Const(311f), Decay(16f), 0.12f, r); // metallic clang
        AddTone(b, 0, 0.28f, Wave.Square, Const(467f), Decay(18f), 0.10f, r);
        Drive(b, 3f); Normalize(b, 0.95f); return b;
    }

    /// <summary>Bell chime: more lines = more notes and a higher starting pitch.</summary>
    public static float[] LineClearChime(int lines)
    {
        var r = new Random(10 + lines); var b = NewBuffer(0.4f + lines * 0.09f);
        int[] semis = { 0, 4, 7, 12, 16, 19 };
        float baseMidi = 72f + (lines - 1) * 2f;
        for (int k = 0; k <= lines; k++)
        {
            float f = MidiToHz(baseMidi + semis[k]);
            float start = k * 0.07f;
            float len = k == lines ? 0.4f : 0.25f;
            AddTone(b, start, len, Wave.Sine, Const(f), Decay(8f), 0.5f, r);
            AddTone(b, start, len, Wave.Sine, Const(f * 2.76f), Decay(16f), 0.15f, r); // bell overtone
            AddTone(b, start, 0.05f, Wave.Triangle, Const(f * 2f), Decay(60f), 0.2f, r);
        }
        AddNoise(b, 0, 0.3f, Decay(10f), 0.08f, Const(12000f), 5000f, r); // sparkle
        Normalize(b, 0.6f); return b;
    }

    /// <summary>Brassy fanfare for a 4-line "Quad Smash".</summary>
    public static float[] QuadFanfare()
    {
        var r = new Random(20); var b = NewBuffer(1.6f);
        float[] notes = { 60, 64, 67 };
        for (int i = 0; i < notes.Length; i++)
        {
            float f = MidiToHz(notes[i]);
            AddTone(b, i * 0.11f, 0.12f, Wave.Saw, Const(f), Decay(6f), 0.35f, r);
            AddTone(b, i * 0.11f, 0.12f, Wave.Saw, Const(f * 1.005f), Decay(6f), 0.25f, r);
        }
        float[] chord = { 60, 64, 67, 72 };
        foreach (float m in chord)
        {
            float f = MidiToHz(m);
            Func<float, float> vib = t => f * (1f + 0.006f * (float)Math.Sin(t * 35f) * Math.Min(1f, t * 3f));
            AddTone(b, 0.36f, 1.2f, Wave.Saw, vib, t => (float)Math.Exp(-t * 1.8f), 0.22f, r);
        }
        AddTone(b, 0.36f, 0.5f, Wave.Sine, t => 50f + 90f * (float)Math.Exp(-t * 20f), Decay(6f), 0.9f, r); // timpani hit
        LowPass(b, 4500f);
        Drive(b, 1.5f); Normalize(b, 0.75f); return b;
    }

    public static float[] LevelUpJingle()
    {
        var r = new Random(21); var b = NewBuffer(0.7f);
        float[] notes = { 79, 84, 88, 91, 96 };
        for (int i = 0; i < notes.Length; i++)
            AddTone(b, i * 0.07f, 0.16f, Wave.Square, Const(MidiToHz(notes[i])), Decay(14f), 0.2f, r);
        AddTone(b, 0.35f, 0.35f, Wave.Triangle, t => MidiToHz(96) * (1f + 0.01f * (float)Math.Sin(t * 60f)), Decay(6f), 0.3f, r);
        Normalize(b, 0.55f); return b;
    }

    public static float[] PauseBlip()
    {
        var r = new Random(22); var b = NewBuffer(0.16f);
        AddTone(b, 0, 0.06f, Wave.Square, Const(880f), Decay(30f), 0.3f, r);
        AddTone(b, 0.07f, 0.08f, Wave.Square, Const(1320f), Decay(30f), 0.3f, r);
        Normalize(b, 0.45f); return b;
    }

    /// <summary>Comic "wah wah wah wahhhh" trombone on game over.</summary>
    public static float[] GameOverWahWah()
    {
        var r = new Random(23);
        float[] notes = { 67, 66, 65, 64 };          // G, F#, F, E
        float[] lens = { 0.45f, 0.45f, 0.45f, 1.6f };
        var b = NewBuffer(3.1f);
        float start = 0f;
        for (int n = 0; n < notes.Length; n++)
        {
            float f0 = MidiToHz(notes[n] - 12);
            float len = lens[n];
            bool last = n == notes.Length - 1;
            int s0 = (int)(start * SampleRate), count = (int)(len * SampleRate);
            double phase = 0; float lp = 0, lp2 = 0;
            for (int i = 0; i < count && s0 + i < b.Length; i++)
            {
                float t = i / (float)SampleRate;
                float u = t / len;
                // pitch sags a little at the end of each note; last note wobbles
                float f = f0 * (1f - 0.03f * u * u);
                if (last) f *= 1f + 0.025f * (float)Math.Sin(t * TwoPi * 5.5f) * Math.Min(1f, t * 2f);
                phase += f / SampleRate;
                float x = Osc(Wave.Saw, phase, r);
                // the "wah": a filter that opens and closes like a trombone mute
                float wah = (float)Math.Sin(Math.PI * Math.Min(1f, u * 1.2f));
                if (last) wah = 0.5f + 0.5f * (float)Math.Sin(t * TwoPi * 2.7f - 1.5f);
                float cut = 250f + 1900f * wah;
                lp += Coef(cut) * (x - lp);
                lp2 += Coef(cut) * (lp - lp2);
                float env = Math.Min(1f, t * 40f) * (last ? (float)Math.Exp(-t * 1.2f) : 1f - u * 0.6f);
                b[s0 + i] += lp2 * env * 0.8f;
            }
            start += len;
        }
        Drive(b, 1.8f); Normalize(b, 0.8f); return b;
    }

    /// <summary>Cartoon PUNCH: a noise smack plus a sliding low "thoomp".</summary>
    public static float[] Punch()
    {
        var r = new Random(30); var b = NewBuffer(0.35f);
        AddTone(b, 0, 0.004f, Wave.Square, Const(2200f), Const(1f), 0.6f, r); // click
        AddNoise(b, 0, 0.09f, Decay(35f), 1f, t => 800f + 5000f * (float)Math.Exp(-t * 40f), 150f, r);
        AddTone(b, 0, 0.35f, Wave.Sine, t => 45f + 230f * (float)Math.Exp(-t * 18f), Decay(10f), 1f, r);
        Drive(b, 2.5f); Normalize(b, 0.95f); return b;
    }

    /// <summary>Springy cartoon "boing".</summary>
    public static float[] Boing()
    {
        var r = new Random(31); var b = NewBuffer(0.45f);
        Func<float, float> f = t => (180f + 260f * (1f - (float)Math.Exp(-t * 8f))) *
                                    (1f + 0.12f * (float)Math.Sin(t * TwoPi * 16f) * (float)Math.Exp(-t * 5f));
        AddTone(b, 0, 0.45f, Wave.Sine, f, Decay(6f), 0.5f, r);
        AddTone(b, 0, 0.45f, Wave.Triangle, t => f(t) * 2f, Decay(9f), 0.15f, r);
        Normalize(b, 0.4f); return b;
    }

    public static float[] Swoosh()
    {
        var r = new Random(32); var b = NewBuffer(0.5f);
        AddNoise(b, 0, 0.5f, t => (float)Math.Sin(Math.PI * t / 0.5f), 0.8f,
                 t => 300f + 5000f * (float)Math.Sin(Math.PI * t / 0.5f), 250f, r);
        Normalize(b, 0.5f); return b;
    }

    public static float[] Bonk()
    {
        var r = new Random(33); var b = NewBuffer(0.14f);
        AddTone(b, 0, 0.14f, Wave.Sine, t => 300f + 500f * (float)Math.Exp(-t * 30f), Decay(30f), 0.7f, r);
        AddTone(b, 0, 0.03f, Wave.Square, Const(1400f), Decay(90f), 0.1f, r);
        Normalize(b, 0.5f); return b;
    }
}
