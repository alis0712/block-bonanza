using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// A lightweight, pooled particle system built from SpriteRenderers.
/// All particles are created once in Awake and then recycled, so spawning
/// effects never allocates memory or creates GameObjects during play.
/// High-level helpers (LineClearBurst, QuadCelebration, ...) build the
/// game's effects out of simple particles.
/// </summary>
public class EffectsManager : MonoBehaviour
{
    /// <summary>Sorting order for effects: higher than the board so they draw in front.</summary>
    public const int SortingOrder = 20;
    private const int PoolSize = 800;

    /// <summary>When true, particles freeze in place (used by the pause menu).</summary>
    public bool Paused;

    private class Particle
    {
        public SpriteRenderer renderer;
        public Transform transform;
        public Vector2 position, velocity;
        public float age, lifetime;
        public float startSize, endSize;
        public float gravity, drag;
        public float rotation, spin;
        public Color color;
        public bool stretch;      // stretch along velocity (for streaks/trails)
        public bool fadeLate;     // stay opaque longer before fading (for debris)
    }

    private readonly Stack<Particle> free = new Stack<Particle>(PoolSize);
    private readonly List<Particle> active = new List<Particle>(PoolSize);

    private void Awake()
    {
        for (int i = 0; i < PoolSize; i++)
        {
            SpriteRenderer sr = SpriteFactory.CreateRenderer("Particle", transform, SpriteFactory.Circle, SortingOrder, Color.white);
            sr.enabled = false;
            free.Push(new Particle { renderer = sr, transform = sr.transform });
        }
    }

    /// <summary>Spawns one particle. Silently does nothing if the pool is empty.</summary>
    public void Spawn(Vector2 position, Vector2 velocity, Color color, float lifetime,
                      float startSize, float endSize, float gravity, float drag, Sprite sprite,
                      bool stretch = false, float spin = 0f, bool fadeLate = false)
    {
        if (free.Count == 0) return;
        Particle p = free.Pop();
        p.position = position;
        p.velocity = velocity;
        p.color = color;
        p.age = 0f;
        p.lifetime = Mathf.Max(0.01f, lifetime);
        p.startSize = startSize;
        p.endSize = endSize;
        p.gravity = gravity;
        p.drag = drag;
        p.rotation = Random.Range(0f, 360f);
        p.spin = spin;
        p.stretch = stretch;
        p.fadeLate = fadeLate;
        p.renderer.sprite = sprite;
        p.renderer.enabled = true;
        active.Add(p);
        Apply(p);
    }

    /// <summary>Removes every particle immediately (used on restart).</summary>
    public void ClearAll()
    {
        for (int i = active.Count - 1; i >= 0; i--) Release(i);
    }

    private void Update()
    {
        if (Paused) return;
        float dt = Time.deltaTime;
        // Walk backwards so we can remove finished particles while iterating.
        for (int i = active.Count - 1; i >= 0; i--)
        {
            Particle p = active[i];
            p.age += dt;
            if (p.age >= p.lifetime) { Release(i); continue; }
            p.velocity.y -= p.gravity * dt;
            p.velocity *= 1f / (1f + p.drag * dt);
            p.position += p.velocity * dt;
            p.rotation += p.spin * dt;
            Apply(p);
        }
    }

    // Pushes a particle's state to its SpriteRenderer/Transform.
    private void Apply(Particle p)
    {
        float t = p.age / p.lifetime; // 0 -> 1 over the particle's life
        float size = Mathf.Lerp(p.startSize, p.endSize, t);
        float fade = p.fadeLate ? 1f - t * t * t : 1f - t;
        Color c = p.color;
        c.a *= fade;
        p.renderer.color = c;
        p.transform.localPosition = new Vector3(p.position.x, p.position.y, 0f);

        if (p.stretch)
        {
            float speed = p.velocity.magnitude;
            float angle = Mathf.Atan2(p.velocity.y, p.velocity.x) * Mathf.Rad2Deg;
            p.transform.localRotation = Quaternion.Euler(0f, 0f, angle);
            p.transform.localScale = new Vector3(size * (1f + speed * 0.12f), size, 1f);
        }
        else
        {
            p.transform.localRotation = Quaternion.Euler(0f, 0f, p.rotation);
            p.transform.localScale = new Vector3(size, size, 1f);
        }
    }

    private void Release(int index)
    {
        Particle p = active[index];
        p.renderer.enabled = false;
        // swap-remove is O(1); order of active particles doesn't matter
        int last = active.Count - 1;
        active[index] = active[last];
        active.RemoveAt(last);
        free.Push(p);
    }

    private static Vector2 RandomDirection()
    {
        float a = Random.Range(0f, Mathf.PI * 2f);
        return new Vector2(Mathf.Cos(a), Mathf.Sin(a));
    }

    private static Color Brighten(Color c, float amount)
    {
        return Color.Lerp(c, Color.white, amount);
    }

    // ------------------------------------------------------------------
    // Game effects
    // ------------------------------------------------------------------

    /// <summary>Colorful burst for one cleared block.</summary>
    public void LineClearBurst(Vector2 pos, Color color)
    {
        for (int i = 0; i < 9; i++)
        {
            Vector2 v = RandomDirection() * Random.Range(2f, 8f) + Vector2.up * 2f;
            Spawn(pos, v, Brighten(color, Random.Range(0f, 0.5f)), Random.Range(0.45f, 0.9f),
                  Random.Range(0.25f, 0.5f), 0.05f, 9f, 1.5f, SpriteFactory.Circle);
        }
        // a couple of little spinning square chips
        for (int i = 0; i < 2; i++)
        {
            Vector2 v = RandomDirection() * Random.Range(3f, 6f) + Vector2.up * 3f;
            Spawn(pos, v, color, Random.Range(0.6f, 1.0f), 0.22f, 0.1f, 14f, 0.5f,
                  SpriteFactory.Square, false, Random.Range(-600f, 600f));
        }
    }

    /// <summary>Big rainbow celebration for a 4-line "Quad Smash".</summary>
    public void QuadCelebration(Vector2 center)
    {
        // expanding ring of streaks
        const int ring = 40;
        for (int i = 0; i < ring; i++)
        {
            float a = i / (float)ring * Mathf.PI * 2f;
            Vector2 dir = new Vector2(Mathf.Cos(a), Mathf.Sin(a));
            Color c = Color.HSVToRGB(i / (float)ring, 0.7f, 1f);
            Spawn(center, dir * 16f, c, 0.7f, 0.35f, 0.1f, 0f, 2.5f, SpriteFactory.Circle, true);
        }
        // fountain of rainbow confetti
        for (int i = 0; i < 110; i++)
        {
            Vector2 v = new Vector2(Random.Range(-9f, 9f), Random.Range(6f, 18f));
            Color c = Color.HSVToRGB(Random.value, 0.75f, 1f);
            bool chip = Random.value < 0.5f;
            Spawn(center, v, c, Random.Range(1.0f, 1.8f), chip ? 0.3f : 0.4f, 0.1f, 14f, 0.8f,
                  chip ? SpriteFactory.Square : SpriteFactory.Circle, false, Random.Range(-720f, 720f), true);
        }
        // bright central flash
        Spawn(center, Vector2.zero, new Color(1f, 1f, 1f, 0.9f), 0.35f, 4f, 14f, 0f, 0f, SpriteFactory.Circle);
    }

    /// <summary>Small dust puff under a block that just landed.</summary>
    public void LockPuff(Vector2 pos, Color color, bool strong)
    {
        int count = strong ? 6 : 3;
        Color dust = Color.Lerp(color, new Color(0.8f, 0.8f, 0.9f, 0.8f), 0.6f);
        for (int i = 0; i < count; i++)
        {
            float side = Random.value < 0.5f ? -1f : 1f;
            Vector2 v = new Vector2(side * Random.Range(1f, strong ? 4f : 2.5f), Random.Range(0.3f, 1.5f));
            Spawn(pos, v, dust, Random.Range(0.3f, 0.55f), Random.Range(0.25f, 0.4f), 0.7f, -1f, 4f, SpriteFactory.Circle);
        }
        if (strong)
        {
            // bright sparks that shoot up and out on a hard drop
            for (int i = 0; i < 4; i++)
            {
                Vector2 v = new Vector2(Random.Range(-5f, 5f), Random.Range(2f, 7f));
                Spawn(pos, v, Brighten(color, 0.6f), Random.Range(0.2f, 0.4f), 0.18f, 0.04f, 12f, 1f, SpriteFactory.Circle, true);
            }
        }
    }

    /// <summary>Streaky trail left behind by a hard-dropped block.</summary>
    public void HardDropTrail(Vector2 from, Vector2 to, Color color)
    {
        float distance = Vector2.Distance(from, to);
        int count = Mathf.Clamp(Mathf.CeilToInt(distance * 1.5f), 1, 30);
        for (int i = 0; i < count; i++)
        {
            float t = i / (float)count;
            Vector2 pos = Vector2.Lerp(to, from, t) + new Vector2(Random.Range(-0.35f, 0.35f), 0f);
            Color c = Brighten(color, 0.3f);
            c.a = 0.7f * (1f - t * 0.6f);
            // particles move slightly downward so they stretch into vertical streaks
            Spawn(pos, new Vector2(0f, -Random.Range(2f, 5f)), c, Random.Range(0.2f, 0.4f),
                  Random.Range(0.18f, 0.3f), 0.05f, 0f, 3f, SpriteFactory.Circle, true);
        }
    }

    /// <summary>Colorful spinning confetti shooting up from a point (menus, stage banner).</summary>
    public void Confetti(Vector2 pos, int count)
    {
        for (int i = 0; i < count; i++)
        {
            Vector2 v = new Vector2(Random.Range(-7f, 7f), Random.Range(4f, 14f));
            Color c = Color.HSVToRGB(Random.value, 0.75f, 1f);
            Spawn(pos, v, c, Random.Range(0.9f, 1.6f), Random.Range(0.18f, 0.32f), 0.12f, 12f, 1.2f,
                  SpriteFactory.Square, false, Random.Range(-720f, 720f), true);
        }
    }

    /// <summary>A block flying off the board during the game-over animation.</summary>
    public void Debris(Vector2 pos, Color color)
    {
        Vector2 v = new Vector2(Random.Range(-3.5f, 3.5f), Random.Range(1f, 6f));
        Spawn(pos, v, color, Random.Range(1.4f, 2.0f), 1f, 0.55f, 22f, 0.3f,
              SpriteFactory.Block, false, Random.Range(-400f, 400f), true);
    }
}
