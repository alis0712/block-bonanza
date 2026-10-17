using System;

/// <summary>
/// Renders seamless 8-bar techno loops, one per stage plus one for the title.
/// Pure C# math (no Unity API), so it can run on a background thread.
///
/// Every track is built from the same parts: kick, hats, clap/snare, a pulsing
/// bass with a filter sweep, and a minor-key arpeggio. The style settings
/// change the tempo, patterns and sound of each part.
/// </summary>
public static class MusicSynth
{
    public const int TrackCount = 6;   // 0-4 = stages, 5 = title screen
    public const int TitleTrack = 5;
    private const int Steps = 128;     // 8 bars x 16 sixteenth-notes
    private const int SR = AudioSynth.SampleRate;

    private enum Style { NeonCity, DeepSpace, CyberJungle, VolcanoCore, Glitch, Title }

    public static int Bpm(int track)
    {
        int[] bpm = { 120, 126, 130, 136, 145, 124 };
        return bpm[track];
    }

    // Chord progression in a minor key (i - VI - III - VII), 2 bars per chord.
    private static readonly int[] ChordRoot = { 0, -4, 3, -2 };
    private static readonly bool[] ChordMinor = { true, false, false, false };
    private static readonly int[] RootNote = { 45, 50, 52, 48, 54, 45 }; // A, D, E, C, F#, A

    /// <summary>Renders one full loop. Takes a fraction of a second.</summary>
    public static float[] Render(int track)
    {
        var style = (Style)track;
        var rnd = new Random(1000 + track);
        int bpm = Bpm(track);
        int stepLen = (int)Math.Round(SR * 60.0 / bpm / 4.0);
        int total = stepLen * Steps;

        var drums = new float[total];
        var bass = new float[total];
        var lead = new float[total];
        var pad = new float[total];

        for (int step = 0; step < Steps; step++)
        {
            int pos = step * stepLen;
            int s16 = step % 16;          // position inside the bar
            int bar = step / 16;
            bool lastBar = bar == 7;
            int chord = (step / 32) % 4;

            // ---------------- Drums ----------------
            if (style == Style.CyberJungle)
            {
                // Breakbeat: syncopated kicks, snares on 2 and 4, ghost notes.
                bool barB = bar % 2 == 1;
                if (s16 == 0 || s16 == 10 || (barB && s16 == 2) || (!barB && s16 == 7)) Kick(drums, pos, style, rnd);
                if (s16 == 4 || s16 == 12) Snare(drums, pos, 0.8f, rnd);
                if (s16 == 7 || s16 == 15 || (barB && s16 == 14)) Snare(drums, pos, 0.25f, rnd);
                Hat(drums, pos, s16 % 4 == 2, s16 % 2 == 0 ? 0.25f : 0.15f, rnd);
            }
            else
            {
                // Four-on-the-floor kick on every beat.
                bool roll = style == Style.Glitch && lastBar && s16 >= 12; // hardstyle kick roll
                if (s16 % 4 == 0 || roll) Kick(drums, pos, style, rnd);
                // Offbeat open hats.
                if (s16 % 4 == 2) Hat(drums, pos, true, 0.35f, rnd);
                // Quiet 16th closed hats in the busier styles.
                if (style != Style.NeonCity && s16 % 2 == 1) Hat(drums, pos, false, 0.12f, rnd);
                // Clap on beats 2 and 4.
                if (s16 == 4 || s16 == 12) Clap(drums, pos, style == Style.VolcanoCore ? 0.9f : 0.7f, rnd);
                if (style == Style.VolcanoCore && (s16 == 3 || s16 == 11 || s16 == 14)) Clank(drums, pos, rnd);
                if (style == Style.Title && s16 == 14 && bar % 2 == 1) Clap(drums, pos, 0.4f, rnd);
            }

            // ---------------- Bass ----------------
            int bassNote = RootNote[track] + ChordRoot[chord];
            int bassLen; int octave; bool play;
            BassPattern(style, s16, out play, out octave, out bassLen);
            if (play)
                BassNote(bass, pos, stepLen * bassLen, AudioSynth.MidiToHz(bassNote + 12 * octave),
                         Sweep(step), style, rnd);

            // ---------------- Arpeggio lead ----------------
            int[] tones = ChordMinor[chord] ? new[] { 0, 3, 7, 12, 15, 19 } : new[] { 0, 4, 7, 12, 16, 19 };
            int arpIndex;
            if (ArpPattern(style, step, rnd, out arpIndex))
            {
                float midi = RootNote[track] + 24 + ChordRoot[chord] + tones[arpIndex];
                if (style == Style.VolcanoCore) midi -= 12;
                LeadNote(lead, pos, stepLen, AudioSynth.MidiToHz(midi), style, rnd);
            }

            // ---------------- Pad chord (once per chord) ----------------
            if (step % 32 == 0 && (style == Style.NeonCity || style == Style.DeepSpace || style == Style.Title))
            {
                for (int i = 0; i < 3; i++)
                    PadNote(pad, pos, stepLen * 32, AudioSynth.MidiToHz(RootNote[track] + 12 + ChordRoot[chord] + tones[i]));
            }
        }

        // Space gets a long echo on the lead; others a short one.
        Echo(lead, stepLen * 3, style == Style.DeepSpace ? 0.55f : 0.3f);

        // Sidechain "pump": bass and pad duck on every beat, the classic techno pulse.
        bool fourFloor = style != Style.CyberJungle;
        var mix = new float[total];
        for (int i = 0; i < total; i++)
        {
            float beatPhase = (i % (stepLen * 4)) / (float)(stepLen * 4);
            float duck = fourFloor ? 1f - 0.65f * (float)Math.Exp(-beatPhase * 9f) : 1f;
            mix[i] = drums[i] * 0.9f + (bass[i] * 0.55f + pad[i] * 0.12f) * duck + lead[i] * 0.22f;
        }

        if (style == Style.Glitch) Glitchify(mix, stepLen, rnd);
        float drive = style == Style.VolcanoCore || style == Style.Glitch ? 1.6f : 1.2f;
        for (int i = 0; i < total; i++) mix[i] = (float)Math.Tanh(mix[i] * drive);
        AudioSynth.Normalize(mix, 0.85f);
        return mix;
    }

    // Filter sweep for the bass: opens and closes twice per loop.
    private static float Sweep(int step)
    {
        return 0.5f - 0.5f * (float)Math.Cos(step / (float)Steps * Math.PI * 4.0);
    }

    private static void BassPattern(Style s, int s16, out bool play, out int octave, out int length)
    {
        play = false; octave = 0; length = 1;
        switch (s)
        {
            case Style.NeonCity: play = s16 % 2 == 0; octave = s16 % 8 == 6 ? 1 : 0; length = 2; break;
            case Style.DeepSpace: play = s16 % 4 == 2 || s16 % 4 == 3; length = 1; break; // rolling offbeat
            case Style.CyberJungle: play = s16 == 0 || s16 == 3 || s16 == 6 || s16 == 10 || s16 == 11; length = 3; break;
            case Style.VolcanoCore: play = s16 % 4 != 0; octave = s16 % 4 == 3 ? 1 : 0; break; // driving 16ths
            case Style.Glitch: play = s16 % 4 == 2; length = 2; break; // hardstyle offbeat bass
            case Style.Title: play = s16 % 2 == 0; octave = (s16 / 2) % 2; length = 2; break; // bouncy octaves
        }
    }

    private static bool ArpPattern(Style s, int step, Random rnd, out int index)
    {
        int s16 = step % 16;
        int[] up = { 0, 1, 2, 3, 2, 1, 3, 4, 0, 2, 4, 5, 4, 2, 3, 1 };
        index = up[s16];
        switch (s)
        {
            case Style.NeonCity: return true;
            case Style.DeepSpace: return s16 % 2 == 0;
            case Style.CyberJungle: index = (s16 * 5) % 6; return s16 % 3 == 0;
            case Style.VolcanoCore: index = s16 % 8 < 4 ? 0 : 1; return s16 % 2 == 0;
            case Style.Glitch: index = rnd.Next(6); return rnd.NextDouble() < 0.8;
            default: index = up[(s16 * 3) % 16] % 5; return s16 % 2 == 0 || s16 == 7;
        }
    }

    // ---------------- Instruments ----------------

    // Adds a sample to the buffer, wrapping at the end so the loop is seamless.
    private static void Put(float[] buf, int index, float value)
    {
        buf[index % buf.Length] += value;
    }

    private static void Kick(float[] buf, int pos, Style s, Random rnd)
    {
        bool hard = s == Style.Glitch, dirty = s == Style.VolcanoCore;
        float len = hard ? 0.45f : 0.3f;
        int n = (int)(len * SR);
        double phase = 0;
        for (int i = 0; i < n; i++)
        {
            float t = i / (float)SR;
            float f = (hard ? 55f : 48f) + (hard ? 260f : 140f) * (float)Math.Exp(-t * (hard ? 22f : 32f));
            phase += f / SR;
            float env = (float)Math.Exp(-t * (hard ? 5f : 9f));
            float x = (float)Math.Sin(phase * Math.PI * 2.0) * env;
            if (i < 60) x += (float)(rnd.NextDouble() - 0.5) * 0.6f; // click
            if (hard) x = (float)Math.Tanh(x * 7f) * 0.7f;            // distorted hardstyle kick
            else if (dirty) x = (float)Math.Tanh(x * 3f) * 0.85f;
            Put(buf, pos + i, x);
        }
    }

    private static void Hat(float[] buf, int pos, bool open, float vol, Random rnd)
    {
        int n = (int)((open ? 0.16f : 0.05f) * SR);
        float lp = 0f;
        for (int i = 0; i < n; i++)
        {
            float t = i / (float)SR;
            float x = (float)(rnd.NextDouble() * 2.0 - 1.0);
            lp += 0.35f * (x - lp);
            float hp = x - lp; // keep only the sizzle
            Put(buf, pos + i, hp * (float)Math.Exp(-t * (open ? 22f : 70f)) * vol);
        }
    }

    private static void Clap(float[] buf, int pos, float vol, Random rnd)
    {
        int n = (int)(0.2f * SR);
        float lp = 0f, lp2 = 0f;
        for (int i = 0; i < n; i++)
        {
            float t = i / (float)SR;
            // three quick bursts then a tail = hand clap
            float env = t < 0.03f ? (float)Math.Exp(-(t % 0.01f) * 300f) : (float)Math.Exp(-(t - 0.03f) * 22f);
            float x = (float)(rnd.NextDouble() * 2.0 - 1.0);
            lp += 0.5f * (x - lp);
            lp2 += 0.06f * (lp - lp2);
            Put(buf, pos + i, (lp - lp2) * env * vol);
        }
    }

    private static void Snare(float[] buf, int pos, float vol, Random rnd)
    {
        int n = (int)(0.18f * SR);
        double phase = 0;
        for (int i = 0; i < n; i++)
        {
            float t = i / (float)SR;
            phase += 190.0 / SR;
            float tone = (float)Math.Sin(phase * Math.PI * 2.0) * (float)Math.Exp(-t * 25f);
            float noise = (float)(rnd.NextDouble() * 2.0 - 1.0) * (float)Math.Exp(-t * 18f);
            Put(buf, pos + i, (tone * 0.6f + noise * 0.5f) * vol);
        }
    }

    // Industrial metal hit: clashing square waves.
    private static void Clank(float[] buf, int pos, Random rnd)
    {
        int n = (int)(0.12f * SR);
        for (int i = 0; i < n; i++)
        {
            float t = i / (float)SR;
            float x = AudioSynth.Osc(AudioSynth.Wave.Square, t * 540.0, rnd) * 0.4f +
                      AudioSynth.Osc(AudioSynth.Wave.Square, t * 813.0, rnd) * 0.3f +
                      AudioSynth.Osc(AudioSynth.Wave.Square, t * 1177.0, rnd) * 0.3f;
            Put(buf, pos + i, x * (float)Math.Exp(-t * 30f) * 0.25f);
        }
    }

    private static void BassNote(float[] buf, int pos, int length, float freq, float sweep, Style s, Random rnd)
    {
        AudioSynth.Wave wave = s == Style.DeepSpace || s == Style.CyberJungle ? AudioSynth.Wave.Sine : AudioSynth.Wave.Saw;
        double phase = 0;
        float lp = 0f, lp2 = 0f;
        float baseCut = 180f + 1800f * sweep;
        if (s == Style.VolcanoCore) baseCut += 400f;
        for (int i = 0; i < length; i++)
        {
            float t = i / (float)SR;
            float wobble = s == Style.CyberJungle ? 1f + 0.01f * (float)Math.Sin(t * 40f) : 1f;
            phase += freq * wobble / SR;
            float x = AudioSynth.Osc(wave, phase, rnd);
            if (wave == AudioSynth.Wave.Saw) x = x * 0.7f + AudioSynth.Osc(AudioSynth.Wave.Saw, phase * 1.007, rnd) * 0.3f;
            float cut = baseCut * (0.4f + 1.2f * (float)Math.Exp(-t * 14f)); // pluck-y filter envelope
            float c = AudioSynth.Coef(cut);
            lp += c * (x - lp);
            lp2 += c * (lp - lp2);
            float y = wave == AudioSynth.Wave.Sine ? x : lp2;
            float env = Math.Min(1f, i / 120f) * Math.Min(1f, (length - i) / 300f);
            if (s == Style.Glitch || s == Style.VolcanoCore) y = (float)Math.Tanh(y * 3f);
            Put(buf, pos + i, y * env);
        }
    }

    private static void LeadNote(float[] buf, int pos, int stepLen, float freq, Style s, Random rnd)
    {
        AudioSynth.Wave wave = s == Style.Glitch || s == Style.Title ? AudioSynth.Wave.Square :
                               s == Style.CyberJungle ? AudioSynth.Wave.Triangle : AudioSynth.Wave.Saw;
        int n = (int)(stepLen * (s == Style.DeepSpace ? 1.8f : 0.9f));
        double phase = 0;
        float lp = 0f;
        for (int i = 0; i < n; i++)
        {
            float t = i / (float)SR;
            float vib = s == Style.Glitch ? 1f + 0.02f * (float)Math.Sin(t * 60f) : 1f; // screechy
            phase += freq * vib / SR;
            float x = AudioSynth.Osc(wave, phase, rnd);
            lp += AudioSynth.Coef(2500f + 3000f * (float)Math.Exp(-t * 20f)) * (x - lp);
            float env = (float)Math.Exp(-t * (s == Style.DeepSpace ? 7f : 14f)) * Math.Min(1f, i / 60f);
            Put(buf, pos + i, lp * env);
        }
    }

    private static void PadNote(float[] buf, int pos, int length, float freq)
    {
        double p1 = 0, p2 = 0;
        float lp = 0f;
        for (int i = 0; i < length; i++)
        {
            float u = i / (float)length;
            p1 += freq * 0.997 / SR;
            p2 += freq * 1.004 / SR;
            float x = (float)(2.0 * (p1 - Math.Floor(p1)) - 1.0 + 2.0 * (p2 - Math.Floor(p2)) - 1.0) * 0.5f;
            lp += 0.03f * (x - lp);
            float env = (float)Math.Sin(Math.PI * u); // slow swell in and out
            Put(buf, pos + i, lp * env);
        }
    }

    // Simple feedback delay that wraps around so the loop stays seamless.
    private static void Echo(float[] buf, int delay, float feedback)
    {
        for (int pass = 0; pass < 2; pass++) // two passes so the wrapped tail is included
            for (int i = 0; i < buf.Length; i++)
            {
                int from = (i - delay + buf.Length) % buf.Length;
                buf[i] += buf[from] * feedback * (pass == 0 ? 1f : 0.3f) * 0.5f;
            }
    }

    // Glitch Dimension: random stutters (repeated slices) and bit-crushed beats.
    private static void Glitchify(float[] buf, int stepLen, Random rnd)
    {
        for (int beat = 0; beat < Steps / 4; beat++)
        {
            double roll = rnd.NextDouble();
            int start = beat * stepLen * 4;
            int len = stepLen * 4;
            if (roll < 0.15)
            {
                // stutter: repeat the first 1/32-note slice for the whole beat
                int slice = stepLen / 2;
                for (int i = slice; i < len; i++) buf[start + i] = buf[start + (i % slice)];
            }
            else if (roll < 0.3)
            {
                // bit-crush + sample-rate reduction
                float hold = 0f;
                for (int i = 0; i < len; i++)
                {
                    if (i % 6 == 0) hold = (float)Math.Round(buf[start + i] * 6f) / 6f;
                    buf[start + i] = hold;
                }
            }
        }
    }
}
