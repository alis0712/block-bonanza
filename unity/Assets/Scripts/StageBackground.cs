using UnityEngine;

/// <summary>
/// The animated background for one stage. BackgroundDirector creates one of
/// these per stage and fades it in/out via <see cref="Alpha"/> (crossfade).
/// All visuals are plain SpriteRenderers drawn behind the board
/// (sorting orders -40 .. -20).
/// </summary>
public class StageBackground : MonoBehaviour
{
    /// <summary>Master opacity, animated by the director for crossfades.</summary>
    public float Alpha = 1f;
    public int Stage { get; private set; }

    // Wide enough for any aspect ratio the camera allows.
    private const float HalfW = 30f, HalfH = 16f;

    // Generic element storage; what each array means depends on the stage.
    private SpriteRenderer[] items;
    private Color[] baseColors;
    private Vector2[] pos, vel;
    private float[] a, b, c; // per-item scratch values (phase, speed, size...)
    private float timer;
    private int bpm = 120;

    /// <summary>Builds the visuals. Call right after AddComponent.</summary>
    public void Init(int stage)
    {
        Stage = StageData.Clamp(stage);
        bpm = MusicSynth.Bpm(Stage);
        switch (Stage)
        {
            case 0: BuildNeonCity(); break;
            case 1: BuildDeepSpace(); break;
            case 2: BuildCyberJungle(); break;
            case 3: BuildVolcano(); break;
            default: BuildGlitch(); break;
        }
    }

    private void Allocate(int count)
    {
        items = new SpriteRenderer[count];
        baseColors = new Color[count];
        pos = new Vector2[count];
        vel = new Vector2[count];
        a = new float[count]; b = new float[count]; c = new float[count];
    }

    private SpriteRenderer Make(int i, Sprite sprite, int order, Color color, Vector2 position, Vector2 scale)
    {
        SpriteRenderer sr = SpriteFactory.CreateRenderer("BG", transform, sprite, order, color);
        sr.transform.localPosition = new Vector3(position.x, position.y, 0f);
        sr.transform.localScale = new Vector3(scale.x, scale.y, 1f);
        items[i] = sr;
        baseColors[i] = color;
        pos[i] = position;
        return sr;
    }

    // Sets a renderer's color with the master Alpha applied.
    private void Tint(int i, Color color, float alphaMul = 1f)
    {
        color.a *= alphaMul * Alpha;
        items[i].color = color;
    }

    private void Place(int i, Vector2 p, float rotation, Vector2 scale)
    {
        Transform t = items[i].transform;
        t.localPosition = new Vector3(p.x, p.y, 0f);
        t.localRotation = Quaternion.Euler(0f, 0f, rotation);
        t.localScale = new Vector3(scale.x, scale.y, 1f);
    }

    private float Beat { get { return Time.time * bpm / 60f; } }
    // 1 on each beat, quickly falling to 0: makes things pulse with the music.
    private float BeatPulse { get { float f = Beat - Mathf.Floor(Beat); return Mathf.Exp(-f * 6f); } }

    private void Update()
    {
        float dt = Time.deltaTime;
        timer += dt;
        switch (Stage)
        {
            case 0: UpdateNeonCity(dt); break;
            case 1: UpdateDeepSpace(dt); break;
            case 2: UpdateCyberJungle(dt); break;
            case 3: UpdateVolcano(dt); break;
            default: UpdateGlitch(dt); break;
        }
    }

    // =====================================================================
    // 0. NEON CITY - synthwave sun, skyline and a perspective grid floor
    // =====================================================================
    // layout of the items array:
    private const int NeonSun = 0, NeonGlow = 1, NeonStripes = 2, NeonStripeCount = 5;
    private const int NeonFloor = NeonStripes + NeonStripeCount;          // 7
    private const int NeonSky = NeonFloor + 1, NeonSkyCount = 16;         // skyline buildings
    private const int NeonHLines = NeonSky + NeonSkyCount, NeonHCount = 14;
    private const int NeonVLines = NeonHLines + NeonHCount, NeonVCount = 25;
    private const int NeonStars = NeonVLines + NeonVCount, NeonStarCount = 40;
    private const float Horizon = -3f;

    private void BuildNeonCity()
    {
        Allocate(NeonStars + NeonStarCount);
        Make(NeonGlow, SpriteFactory.Circle, -39, new Color(1f, 0.3f, 0.6f, 0.35f), new Vector2(0f, 2f), new Vector2(22f, 22f));
        Make(NeonSun, SpriteFactory.Disc, -38, new Color(1f, 0.45f, 0.55f), new Vector2(0f, 2f), new Vector2(10f, 10f));
        for (int i = 0; i < NeonStripeCount; i++)
            Make(NeonStripes + i, SpriteFactory.Square, -37, StageData.Sky[0], Vector2.zero, Vector2.one);
        Make(NeonFloor, SpriteFactory.Square, -36, new Color(0.04f, 0.0f, 0.08f), new Vector2(0f, Horizon - 8f), new Vector2(HalfW * 2f, 16f));
        for (int i = 0; i < NeonSkyCount; i++)
        {
            float w = Random.Range(1.2f, 3f), h = Random.Range(1.5f, 6f);
            float x = -HalfW + (i + 0.5f) * (HalfW * 2f / NeonSkyCount) + Random.Range(-0.8f, 0.8f);
            Make(NeonSky + i, SpriteFactory.Square, -36, new Color(0.10f, 0.02f, 0.18f), new Vector2(x, Horizon + h / 2f), new Vector2(w, h));
        }
        for (int i = 0; i < NeonHCount; i++)
            Make(NeonHLines + i, SpriteFactory.Square, -35, new Color(1f, 0.2f, 0.9f), Vector2.zero, Vector2.one);
        for (int i = 0; i < NeonVCount; i++)
        {
            int k = i - NeonVCount / 2;
            Vector2 top = new Vector2(k * 0.8f, Horizon), bottom = new Vector2(k * 6f, -HalfH);
            Vector2 d = bottom - top;
            Make(NeonVLines + i, SpriteFactory.Square, -35, new Color(1f, 0.2f, 0.9f), Vector2.zero, Vector2.one);
            Place(NeonVLines + i, (top + bottom) / 2f, Mathf.Atan2(d.y, d.x) * Mathf.Rad2Deg, new Vector2(d.magnitude, 0.06f));
        }
        for (int i = 0; i < NeonStarCount; i++)
        {
            Make(NeonStars + i, SpriteFactory.Circle, -39, Color.white,
                 new Vector2(Random.Range(-HalfW, HalfW), Random.Range(Horizon + 2f, HalfH)), Vector2.one * Random.Range(0.08f, 0.25f));
            a[NeonStars + i] = Random.Range(0f, 10f);
        }
    }

    private void UpdateNeonCity(float dt)
    {
        float pulse = BeatPulse;
        Tint(NeonGlow, baseColors[NeonGlow], 0.7f + 0.3f * pulse);
        Tint(NeonSun, Color.Lerp(new Color(1f, 0.85f, 0.3f), new Color(1f, 0.25f, 0.6f), 0.5f + 0.5f * Mathf.Sin(timer * 0.5f)));
        // Dark stripes slide down across the sun's lower half (classic synthwave look).
        for (int i = 0; i < NeonStripeCount; i++)
        {
            float p = Mathf.Repeat(i / (float)NeonStripeCount + timer * 0.08f, 1f);
            float y = 2f - p * 5f;
            float dy = y - 2f;
            float chord = 2f * Mathf.Sqrt(Mathf.Max(0f, 25f - dy * dy)); // width of the sun at this height
            Place(NeonStripes + i, new Vector2(0f, y), 0f, new Vector2(chord, 0.1f + p * 0.5f));
            Tint(NeonStripes + i, StageData.Sky[0]);
        }
        Tint(NeonFloor, baseColors[NeonFloor]);
        for (int i = 0; i < NeonSkyCount; i++) Tint(NeonSky + i, baseColors[NeonSky + i]);
        // Horizontal grid lines rush towards the viewer.
        for (int i = 0; i < NeonHCount; i++)
        {
            float p = Mathf.Repeat(i / (float)NeonHCount + timer * 0.25f, 1f);
            float y = Horizon - p * p * (HalfH + Horizon);
            Place(NeonHLines + i, new Vector2(0f, y), 0f, new Vector2(HalfW * 2f, 0.03f + p * 0.1f));
            Tint(NeonHLines + i, baseColors[NeonHLines + i], p * (0.6f + 0.4f * pulse));
        }
        for (int i = 0; i < NeonVCount; i++) Tint(NeonVLines + i, baseColors[NeonVLines + i], 0.45f + 0.35f * pulse);
        for (int i = 0; i < NeonStarCount; i++)
            Tint(NeonStars + i, Color.white, 0.4f + 0.4f * Mathf.Sin(timer * 2f + a[NeonStars + i]));
    }

    // =====================================================================
    // 1. DEEP SPACE - warp-speed starfield, nebulas and a ringed planet
    // =====================================================================
    private const int SpaceNebula = 0, SpaceNebulaCount = 5;
    private const int SpacePlanet = SpaceNebula + SpaceNebulaCount, SpaceRing = SpacePlanet + 1, SpaceShine = SpacePlanet + 2;
    private const int SpaceStars = SpacePlanet + 3, SpaceStarCount = 130;

    private void BuildDeepSpace()
    {
        Allocate(SpaceStars + SpaceStarCount);
        for (int i = 0; i < SpaceNebulaCount; i++)
        {
            Make(SpaceNebula + i, SpriteFactory.Circle, -40, Color.clear,
                 new Vector2(Random.Range(-20f, 20f), Random.Range(-10f, 10f)), Vector2.one * Random.Range(12f, 20f));
            a[SpaceNebula + i] = Random.Range(0f, 10f);
        }
        Make(SpacePlanet, SpriteFactory.Disc, -37, new Color(0.25f, 0.75f, 0.8f), new Vector2(-15f, 6f), new Vector2(6f, 6f));
        Make(SpaceShine, SpriteFactory.Circle, -36, new Color(1f, 1f, 1f, 0.35f), new Vector2(-16f, 7f), new Vector2(4f, 4f));
        Make(SpaceRing, SpriteFactory.Square, -36, new Color(0.9f, 0.8f, 0.6f, 0.6f), new Vector2(-15f, 6f), new Vector2(11f, 0.25f));
        for (int i = 0; i < SpaceStarCount; i++)
        {
            int k = SpaceStars + i;
            Make(k, SpriteFactory.Circle, -38, Color.white, Vector2.zero, Vector2.one * 0.1f);
            a[k] = Random.Range(0f, Mathf.PI * 2f);   // direction
            b[k] = Random.Range(0.2f, 28f);            // distance from center
        }
    }

    private void UpdateDeepSpace(float dt)
    {
        for (int i = 0; i < SpaceNebulaCount; i++)
        {
            int k = SpaceNebula + i;
            float pulse = 0.5f + 0.5f * Mathf.Sin(timer * 0.4f + a[k]);
            Color col = Color.HSVToRGB(Mathf.Repeat(0.6f + i * 0.08f + timer * 0.01f, 1f), 0.7f, 0.7f);
            col.a = 0.12f + 0.08f * pulse;
            Tint(k, col);
        }
        float bob = Mathf.Sin(timer * 0.3f) * 0.5f;
        Place(SpacePlanet, new Vector2(-15f, 6f + bob), 0f, new Vector2(6f, 6f));
        Place(SpaceShine, new Vector2(-16f, 7f + bob), 0f, new Vector2(4f, 4f));
        Place(SpaceRing, new Vector2(-15f, 6f + bob), -18f + Mathf.Sin(timer * 0.2f) * 4f, new Vector2(11f, 0.25f));
        Tint(SpacePlanet, baseColors[SpacePlanet]);
        Tint(SpaceShine, baseColors[SpaceShine]);
        Tint(SpaceRing, baseColors[SpaceRing]);

        // Warp stars fly outward from the center and speed up as they get closer.
        float speed = 0.5f + 0.25f * BeatPulse;
        for (int i = 0; i < SpaceStarCount; i++)
        {
            int k = SpaceStars + i;
            b[k] += (0.4f + b[k] * 0.5f) * dt * speed;
            if (b[k] > 32f) { b[k] = Random.Range(0.2f, 2f); a[k] = Random.Range(0f, Mathf.PI * 2f); }
            Vector2 dir = new Vector2(Mathf.Cos(a[k]), Mathf.Sin(a[k]));
            float size = 0.04f + b[k] * 0.012f;
            Place(k, dir * b[k], a[k] * Mathf.Rad2Deg, new Vector2(size * (1f + b[k] * 0.25f), size));
            Tint(k, new Color(0.85f, 0.9f, 1f), Mathf.Clamp01(b[k] * 0.15f));
        }
    }

    // =====================================================================
    // 2. CYBER JUNGLE - swaying glowing vines, rain and fireflies
    // =====================================================================
    private const int JungleVines = 10, JungleSegs = 24;
    private const int JungleRain = JungleVines * JungleSegs, JungleRainCount = 90;
    private const int JungleFlies = JungleRain + JungleRainCount, JungleFlyCount = 16;
    private const int JungleMist = JungleFlies + JungleFlyCount, JungleMistCount = 5;

    private void BuildCyberJungle()
    {
        Allocate(JungleMist + JungleMistCount);
        for (int v = 0; v < JungleVines; v++)
        {
            float baseX = -HalfW + (v + 0.5f) * (HalfW * 2f / JungleVines) + Random.Range(-1f, 1f);
            float phase = Random.Range(0f, 10f);
            float length = Random.Range(0.5f, 1f);
            for (int s = 0; s < JungleSegs; s++)
            {
                int k = v * JungleSegs + s;
                Make(k, SpriteFactory.Circle, -37, new Color(0.2f, 1f, 0.5f), Vector2.zero, Vector2.one);
                a[k] = baseX; b[k] = phase; c[k] = length;
            }
        }
        for (int i = 0; i < JungleRainCount; i++)
        {
            int k = JungleRain + i;
            Make(k, SpriteFactory.Square, -36, new Color(0.5f, 1f, 1f, 0.3f),
                 new Vector2(Random.Range(-HalfW, HalfW), Random.Range(-HalfH, HalfH)), new Vector2(0.03f, 0.9f));
            vel[k] = new Vector2(-3f, -Random.Range(18f, 28f));
        }
        for (int i = 0; i < JungleFlyCount; i++)
        {
            int k = JungleFlies + i;
            Make(k, SpriteFactory.Circle, -35, new Color(0.9f, 1f, 0.3f), Vector2.zero, Vector2.one * 0.4f);
            pos[k] = new Vector2(Random.Range(-HalfW, HalfW), Random.Range(-HalfH, HalfH));
            a[k] = Random.Range(0f, 10f);
        }
        for (int i = 0; i < JungleMistCount; i++)
            Make(JungleMist + i, SpriteFactory.Circle, -39, new Color(0.1f, 0.6f, 0.4f, 0.18f),
                 new Vector2(-HalfW + i * 14f, -HalfH + 2f), new Vector2(18f, 9f));
    }

    private void UpdateCyberJungle(float dt)
    {
        // Vines hang from the top and sway more towards their tips.
        // A glowing pulse travels down each vine.
        for (int v = 0; v < JungleVines; v++)
            for (int s = 0; s < JungleSegs; s++)
            {
                int k = v * JungleSegs + s;
                float y = HalfH - s * (HalfH * 2f * c[k] / JungleSegs);
                float sway = Mathf.Sin(timer * 0.8f + b[k] + s * 0.2f) * 0.08f * s;
                Place(k, new Vector2(a[k] + sway, y), 0f, Vector2.one * (s % 4 == 0 ? 0.9f : 0.55f));
                float glow = Mathf.Pow(Mathf.Max(0f, Mathf.Sin(s * 0.45f - timer * 3f + b[k])), 6f);
                Color col = Color.Lerp(new Color(0.1f, 0.6f, 0.3f), new Color(0.4f, 1f, 0.9f), glow);
                Tint(k, col, 0.55f + 0.45f * glow);
            }
        for (int i = 0; i < JungleRainCount; i++)
        {
            int k = JungleRain + i;
            pos[k] += vel[k] * dt;
            if (pos[k].y < -HalfH) pos[k] = new Vector2(Random.Range(-HalfW, HalfW + 5f), HalfH);
            Place(k, pos[k], -6f, new Vector2(0.03f, 0.9f));
            Tint(k, baseColors[k]);
        }
        for (int i = 0; i < JungleFlyCount; i++)
        {
            int k = JungleFlies + i;
            Vector2 wander = new Vector2(Mathf.Sin(timer * 0.7f + a[k]) * 2f, Mathf.Cos(timer * 0.9f + a[k] * 1.3f) * 1.5f);
            Place(k, pos[k] + wander, 0f, Vector2.one * 0.4f);
            Tint(k, baseColors[k], Mathf.Max(0f, Mathf.Sin(timer * 2.5f + a[k])));
        }
        for (int i = 0; i < JungleMistCount; i++)
            Tint(JungleMist + i, baseColors[JungleMist + i], 0.7f + 0.3f * BeatPulse);
    }

    // =====================================================================
    // 3. VOLCANO CORE - lava glow, jagged rocks and rising embers
    // =====================================================================
    private const int LavaGlow = 0, LavaGlowCount = 8;
    private const int LavaRocks = LavaGlowCount, LavaRockCount = 12;
    private const int LavaEmbers = LavaRocks + LavaRockCount, LavaEmberCount = 130;

    private void BuildVolcano()
    {
        Allocate(LavaEmbers + LavaEmberCount);
        for (int i = 0; i < LavaGlowCount; i++)
        {
            Make(LavaGlow + i, SpriteFactory.Circle, -39, new Color(1f, 0.35f, 0.05f, 0.5f),
                 new Vector2(-HalfW + i * (HalfW * 2f / (LavaGlowCount - 1)), -HalfH), new Vector2(14f, 10f));
            a[LavaGlow + i] = Random.Range(0f, 10f);
        }
        for (int i = 0; i < LavaRockCount; i++)
        {
            float side = i % 2 == 0 ? -1f : 1f;
            Vector2 p = new Vector2(side * Random.Range(14f, 26f), Random.Range(-HalfH, HalfH));
            Make(LavaRocks + i, SpriteFactory.Square, -37, new Color(0.08f, 0.02f, 0.02f), p, new Vector2(Random.Range(3f, 7f), Random.Range(2f, 5f)));
            items[LavaRocks + i].transform.localRotation = Quaternion.Euler(0f, 0f, Random.Range(0f, 90f));
        }
        for (int i = 0; i < LavaEmberCount; i++)
        {
            int k = LavaEmbers + i;
            Make(k, SpriteFactory.Circle, -36, Color.white, Vector2.zero, Vector2.one * 0.2f);
            ResetEmber(k, true);
        }
    }

    private void ResetEmber(int k, bool anywhere)
    {
        pos[k] = new Vector2(Random.Range(-HalfW, HalfW), anywhere ? Random.Range(-HalfH, HalfH) : -HalfH - 1f);
        vel[k] = new Vector2(Random.Range(-0.5f, 0.5f), Random.Range(1.5f, 5f));
        a[k] = Random.Range(0f, 10f);
        b[k] = Random.Range(0.1f, 0.35f);
    }

    private void UpdateVolcano(float dt)
    {
        float pulse = BeatPulse;
        for (int i = 0; i < LavaGlowCount; i++)
        {
            float wave = 0.5f + 0.5f * Mathf.Sin(timer * 1.3f + a[LavaGlow + i]);
            Place(LavaGlow + i, pos[LavaGlow + i], 0f, new Vector2(14f, 9f + 3f * wave));
            Tint(LavaGlow + i, Color.Lerp(new Color(1f, 0.2f, 0.0f, 0.5f), new Color(1f, 0.6f, 0.1f, 0.6f), wave), 0.8f + 0.2f * pulse);
        }
        for (int i = 0; i < LavaRockCount; i++) Tint(LavaRocks + i, baseColors[LavaRocks + i]);
        for (int i = 0; i < LavaEmberCount; i++)
        {
            int k = LavaEmbers + i;
            pos[k] += vel[k] * dt;
            pos[k].x += Mathf.Sin(timer * 2f + a[k]) * dt * 0.8f;
            if (pos[k].y > HalfH) ResetEmber(k, false);
            float height = Mathf.InverseLerp(-HalfH, HalfH, pos[k].y); // 0 bottom .. 1 top
            Color col = Color.Lerp(new Color(1f, 0.9f, 0.3f), new Color(1f, 0.15f, 0.05f), height);
            Place(k, pos[k], 0f, Vector2.one * b[k] * (1f - height * 0.6f));
            Tint(k, col, (1f - height) * (0.6f + 0.4f * Mathf.Sin(timer * 8f + a[k])));
        }
    }

    // =====================================================================
    // 4. GLITCH DIMENSION - scanlines, flickering color blocks, RGB split
    // =====================================================================
    private const int GlitchScan = 0, GlitchScanCount = 36;
    private const int GlitchBlocks = GlitchScanCount, GlitchBlockCount = 32;
    private const int GlitchRgb = GlitchBlocks + GlitchBlockCount, GlitchRgbCount = 3;
    private const int GlitchFlash = GlitchRgb + GlitchRgbCount;
    private static readonly Color[] GlitchColors =
    {
        new Color(1f, 0f, 0.4f), new Color(0f, 1f, 1f), new Color(1f, 1f, 0f), new Color(0.5f, 0f, 1f), new Color(0f, 1f, 0.3f)
    };

    private void BuildGlitch()
    {
        Allocate(GlitchFlash + 1);
        for (int i = 0; i < GlitchScanCount; i++)
            Make(GlitchScan + i, SpriteFactory.Square, -35, new Color(0.6f, 1f, 1f, 0.06f), Vector2.zero, Vector2.one);
        for (int i = 0; i < GlitchBlockCount; i++)
        {
            Make(GlitchBlocks + i, SpriteFactory.Square, -37, Color.clear, Vector2.zero, Vector2.one);
            a[GlitchBlocks + i] = Random.Range(0f, 0.5f); // time until next glitch
        }
        Color[] rgb = { new Color(1f, 0f, 0f, 0.12f), new Color(0f, 1f, 0f, 0.12f), new Color(0f, 0.3f, 1f, 0.12f) };
        for (int i = 0; i < GlitchRgbCount; i++)
            Make(GlitchRgb + i, SpriteFactory.Disc, -39, rgb[i], Vector2.zero, Vector2.one * 14f);
        Make(GlitchFlash, SpriteFactory.Square, -34, Color.clear, Vector2.zero, new Vector2(HalfW * 2f, HalfH * 2f));
    }

    private void UpdateGlitch(float dt)
    {
        for (int i = 0; i < GlitchScanCount; i++)
        {
            float y = HalfH - Mathf.Repeat(i * (HalfH * 2f / GlitchScanCount) + timer * 1.5f, HalfH * 2f);
            Place(GlitchScan + i, new Vector2(0f, y), 0f, new Vector2(HalfW * 2f, 0.12f));
            Tint(GlitchScan + i, baseColors[GlitchScan + i]);
        }
        // Each block teleports to a random spot with a random size/color now and then.
        for (int i = 0; i < GlitchBlockCount; i++)
        {
            int k = GlitchBlocks + i;
            a[k] -= dt;
            if (a[k] <= 0f)
            {
                a[k] = Random.Range(0.05f, 0.6f);
                bool visible = Random.value < 0.6f;
                pos[k] = new Vector2(Random.Range(-HalfW, HalfW), Random.Range(-HalfH, HalfH));
                vel[k] = new Vector2(Random.Range(0.5f, 9f), Random.Range(0.1f, 1.5f)); // used as size
                Color col = GlitchColors[Random.Range(0, GlitchColors.Length)];
                col.a = visible ? Random.Range(0.12f, 0.45f) : 0f;
                baseColors[k] = col;
            }
            Place(k, pos[k], 0f, vel[k]);
            Tint(k, baseColors[k]);
        }
        // The R, G and B discs jitter apart: a chromatic aberration look.
        float jitter = Random.value < 0.1f ? 1.2f : 0.25f;
        for (int i = 0; i < GlitchRgbCount; i++)
        {
            Vector2 p = new Vector2(Mathf.Sin(timer * 0.5f) * 8f, Mathf.Cos(timer * 0.37f) * 4f) +
                        new Vector2(Random.Range(-jitter, jitter), Random.Range(-jitter, jitter)) + new Vector2((i - 1) * 0.6f, 0f);
            Place(GlitchRgb + i, p, 0f, Vector2.one * (14f + 2f * BeatPulse));
            Tint(GlitchRgb + i, baseColors[GlitchRgb + i]);
        }
        // Rare full-screen color flash.
        b[GlitchFlash] = Mathf.Max(0f, b[GlitchFlash] - dt * 6f);
        if (Random.value < dt * 0.4f) { b[GlitchFlash] = 1f; baseColors[GlitchFlash] = GlitchColors[Random.Range(0, GlitchColors.Length)]; }
        Color flash = baseColors[GlitchFlash];
        flash.a = 0.15f * b[GlitchFlash];
        Tint(GlitchFlash, flash);
    }
}
