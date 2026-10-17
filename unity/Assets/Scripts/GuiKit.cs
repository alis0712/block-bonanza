using UnityEngine;

/// <summary>
/// Helpers for the immediate-mode (OnGUI) interface.
///
/// All UI is laid out on a "virtual" screen that is always 720 units tall
/// (width depends on the aspect ratio), then scaled to the real resolution.
/// That way the UI looks the same on a phone and a 4K monitor.
/// </summary>
public static class GuiKit
{
    public const float RefHeight = 720f;

    private static Texture2D white, rounded, star;
    private static GUIStyle textStyle, panelStyle;

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
    private static void ResetStatics() { white = null; rounded = null; star = null; textStyle = null; panelStyle = null; }

    public static float Scale { get { return Mathf.Max(0.01f, Screen.height / RefHeight); } }
    public static float Width { get { return Screen.width / Scale; } }
    public static float Height { get { return RefHeight; } }

    /// <summary>The matrix that maps virtual units to real pixels.</summary>
    public static Matrix4x4 BaseMatrix
    {
        get { return Matrix4x4.TRS(Vector3.zero, Quaternion.identity, new Vector3(Scale, Scale, 1f)); }
    }

    /// <summary>Mouse position in virtual GUI units (y grows downwards).</summary>
    public static Vector2 Mouse
    {
        get
        {
            Vector3 m = Input.mousePosition;
            return new Vector2(m.x / Scale, (Screen.height - m.y) / Scale);
        }
    }

    /// <summary>OnGUI runs several times per frame (layout, input, repaint).
    /// We only draw, so everything except the repaint pass can be skipped.</summary>
    public static bool IsRepaint { get { return Event.current != null && Event.current.type == EventType.Repaint; } }

    /// <summary>Start drawing in virtual units. Call at the top of OnGUI.</summary>
    public static void Begin() { GUI.matrix = BaseMatrix; GUI.color = Color.white; }

    /// <summary>Rotates and scales what you draw next around a pivot. Undo with Reset().</summary>
    public static void Transform(Vector2 pivot, float angleDegrees, float scaleX, float scaleY)
    {
        // GUI.matrix must stay invertible: never let a scale reach zero.
        scaleX = Mathf.Max(0.01f, scaleX);
        scaleY = Mathf.Max(0.01f, scaleY);
        GUI.matrix = BaseMatrix *
                     Matrix4x4.TRS(new Vector3(pivot.x, pivot.y, 0f), Quaternion.Euler(0f, 0f, angleDegrees), new Vector3(scaleX, scaleY, 1f)) *
                     Matrix4x4.TRS(new Vector3(-pivot.x, -pivot.y, 0f), Quaternion.identity, Vector3.one);
    }

    public static void Transform(Vector2 pivot, float angleDegrees, float scale)
    {
        Transform(pivot, angleDegrees, scale, scale);
    }

    public static void Reset() { GUI.matrix = BaseMatrix; }

    // ------------------------------------------------------------------ textures

    public static Texture2D WhiteTexture
    {
        get
        {
            if (white == null)
            {
                white = new Texture2D(2, 2, TextureFormat.RGBA32, false);
                white.SetPixels(new[] { Color.white, Color.white, Color.white, Color.white });
                white.Apply();
            }
            return white;
        }
    }

    private static Texture2D RoundedTexture
    {
        get
        {
            if (rounded == null)
            {
                const int s = 64; const float r = 18f;
                rounded = new Texture2D(s, s, TextureFormat.RGBA32, false);
                rounded.filterMode = FilterMode.Bilinear;
                rounded.wrapMode = TextureWrapMode.Clamp;
                var px = new Color[s * s];
                for (int y = 0; y < s; y++)
                    for (int x = 0; x < s; x++)
                    {
                        // distance outside the rounded corner
                        float dx = Mathf.Max(0f, Mathf.Max(r - x, x - (s - 1 - r)));
                        float dy = Mathf.Max(0f, Mathf.Max(r - y, y - (s - 1 - r)));
                        float d = Mathf.Sqrt(dx * dx + dy * dy);
                        float alpha = Mathf.Clamp01(r - d);
                        float border = d > r - 4f ? 1f : 0.82f; // light rim
                        px[y * s + x] = new Color(border, border, border, alpha);
                    }
                rounded.SetPixels(px);
                rounded.Apply();
            }
            return rounded;
        }
    }

    /// <summary>Comic-book starburst texture (for POW! / BAM!).</summary>
    public static Texture2D StarTexture
    {
        get
        {
            if (star == null)
            {
                const int s = 128; const int spikes = 14;
                star = new Texture2D(s, s, TextureFormat.RGBA32, false);
                star.filterMode = FilterMode.Bilinear;
                star.wrapMode = TextureWrapMode.Clamp;
                var px = new Color[s * s];
                float c = (s - 1) / 2f;
                for (int y = 0; y < s; y++)
                    for (int x = 0; x < s; x++)
                    {
                        float dx = x - c, dy = y - c;
                        float ang = Mathf.Atan2(dy, dx);
                        float d = Mathf.Sqrt(dx * dx + dy * dy) / c;
                        float spike = Mathf.Abs(Mathf.Repeat(ang / (Mathf.PI * 2f) * spikes, 1f) - 0.5f) * 2f; // 0 at a tip
                        float edge = Mathf.Lerp(1f, 0.62f, spike);
                        float alpha = Mathf.Clamp01((edge - d) * c * 0.5f);
                        float inner = d < edge - 0.08f ? 1f : 0.15f; // dark outline
                        px[y * s + x] = new Color(inner, inner, inner, alpha);
                    }
                star.SetPixels(px);
                star.Apply();
            }
            return star;
        }
    }

    // ------------------------------------------------------------------ drawing

    public static void Rect(Rect r, Color color)
    {
        Color old = GUI.color;
        GUI.color = color;
        GUI.DrawTexture(r, WhiteTexture);
        GUI.color = old;
    }

    /// <summary>Rounded panel/button background.</summary>
    public static void Panel(Rect r, Color color)
    {
        if (panelStyle == null)
        {
            panelStyle = new GUIStyle();
            panelStyle.normal.background = RoundedTexture;
            panelStyle.border = new RectOffset(20, 20, 20, 20);
        }
        Color old = GUI.color;
        GUI.color = color;
        GUI.Box(r, GUIContent.none, panelStyle);
        GUI.color = old;
    }

    public static void Star(Vector2 center, float size, float angle, Color color)
    {
        Transform(center, angle, 1f);
        Color old = GUI.color;
        GUI.color = color;
        GUI.DrawTexture(new Rect(center.x - size / 2f, center.y - size / 2f, size, size), StarTexture);
        GUI.color = old;
        Reset();
    }

    private static GUIStyle Style(float size, TextAnchor anchor)
    {
        if (textStyle == null)
        {
            textStyle = new GUIStyle(GUI.skin.label);
            textStyle.fontStyle = FontStyle.Bold;
            textStyle.wordWrap = false;
            textStyle.richText = false;
            textStyle.clipping = TextClipping.Overflow;
        }
        textStyle.fontSize = Mathf.Max(6, Mathf.RoundToInt(size));
        textStyle.alignment = anchor;
        return textStyle;
    }

    /// <summary>Bold text with a dark outline, centered on a point.</summary>
    public static void Text(Vector2 center, string text, float size, Color color, float outline = 2f,
                            TextAnchor anchor = TextAnchor.MiddleCenter)
    {
        GUIStyle style = Style(size, anchor);
        float w = 2000f, h = size * 6f;
        float x = anchor == TextAnchor.MiddleLeft ? center.x : anchor == TextAnchor.MiddleRight ? center.x - w : center.x - w / 2f;
        var r = new Rect(x, center.y - h / 2f, w, h);
        if (outline > 0f)
        {
            style.normal.textColor = new Color(0f, 0f, 0f, color.a * 0.85f);
            // 4 diagonal copies make a cheap outline
            for (int i = 0; i < 4; i++)
            {
                float ox = (i % 2 == 0 ? -1f : 1f) * outline, oy = (i < 2 ? -1f : 1f) * outline;
                GUI.Label(new Rect(r.x + ox, r.y + oy, w, h), text, style);
            }
            GUI.Label(new Rect(r.x + outline * 1.5f, r.y + outline * 2f, w, h), text, style); // drop shadow
        }
        style.normal.textColor = color;
        GUI.Label(r, text, style);
    }

    /// <summary>Text that is rotated/scaled around its own center.</summary>
    public static void FancyText(Vector2 center, string text, float size, Color color, float angle, float scale, float outline = 2f)
    {
        Transform(center, angle, scale);
        Text(center, text, size, color, outline);
        Reset();
    }

    /// <summary>
    /// Odometer-style number: each digit rolls up into the next one.
    /// value can have a fractional part while it counts up, which drives the roll.
    /// </summary>
    public static void RollingNumber(Vector2 center, float value, float size, Color color, int minDigits = 1)
    {
        value = Mathf.Max(0f, value);
        long whole = (long)value;
        int digits = Mathf.Max(minDigits, whole.ToString().Length);
        float digitW = size * 0.62f;
        float left = center.x - digits * digitW / 2f;
        for (int i = 0; i < digits; i++)
        {
            int power = digits - 1 - i;                    // 0 = ones digit
            double place = System.Math.Pow(10, power);
            double scaled = value / place;
            int digit = (int)(System.Math.Floor(scaled) % 10);
            // A digit only rolls while everything below it is about to wrap (like a car odometer).
            float below = (float)(value % place);
            float roll = power == 0 ? (float)(value - System.Math.Floor(value)) : Mathf.Clamp01(below - ((float)place - 1f));
            float x = left + (i + 0.5f) * digitW;
            float shift = roll * size * 0.9f;
            Text(new Vector2(x, center.y - shift), digit.ToString(), size, new Color(color.r, color.g, color.b, color.a * (1f - roll)));
            if (roll > 0.01f)
                Text(new Vector2(x, center.y + size * 0.9f - shift), ((digit + 1) % 10).ToString(), size,
                     new Color(color.r, color.g, color.b, color.a * roll));
        }
    }

    /// <summary>Bouncy ease: overshoots and settles (0..1 -> 0..1).</summary>
    public static float EaseOutBack(float t)
    {
        t = Mathf.Clamp01(t) - 1f;
        const float s = 1.9f;
        return t * t * ((s + 1f) * t + s) + 1f;
    }

    /// <summary>Ball-dropping bounce ease (0..1 -> 0..1).</summary>
    public static float EaseOutBounce(float t)
    {
        t = Mathf.Clamp01(t);
        if (t < 1f / 2.75f) return 7.5625f * t * t;
        if (t < 2f / 2.75f) { t -= 1.5f / 2.75f; return 7.5625f * t * t + 0.75f; }
        if (t < 2.5f / 2.75f) { t -= 2.25f / 2.75f; return 7.5625f * t * t + 0.9375f; }
        t -= 2.625f / 2.75f; return 7.5625f * t * t + 0.984375f;
    }
}
