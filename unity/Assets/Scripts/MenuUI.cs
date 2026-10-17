using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// All menu screens, drawn with OnGUI: title, how to play, best scores
/// (with the reset confirmation), high-score initials entry and game over.
///
/// Buttons work with the mouse (hover + click) and the keyboard
/// (arrows/WASD to move, Enter/Space to press, Esc to go back).
/// Pressing a button plays a cartoon PUNCH with squash, shake, confetti
/// and a POW!/BAM!/WHAM! starburst.
/// </summary>
public class MenuUI : MonoBehaviour
{
    // ------------------------------------------------------------ button model
    private class Button
    {
        public System.Func<string> Label;
        public System.Action Action;
        public System.Action<int> OnLeftRight; // optional: Left/Right changes a value
        public System.Func<bool> Visible;      // optional: hide on some platforms
        public Color Color;
        public Rect Rect;
        public float Hover, Squash, Wiggle;
        public bool IsVisible { get { return Visible == null || Visible(); } }
    }

    private class Burst { public Vector2 Pos; public string Word; public float Age, Angle; public Color Color; }

    private static readonly string[] PunchWords = { "POW!", "BAM!", "WHAM!", "BONK!", "KAPOW!", "ZAP!", "BOOM!" };
    private static readonly string[] Taglines =
    {
        "Now with 100% more blocks!",
        "Gravity sold separately.",
        "Stack responsibly.",
        "Lines go POOF!",
        "Rated E for Excessive Shaking.",
        "No blocks were harmed. Mostly.",
        "Your couch called. It misses you.",
        "Warning: may cause spontaneous dancing.",
        "Ask your doctor if stacking is right for you.",
        "Contains zero calories!",
    };
    private static readonly string[] GameOverQuips =
    {
        "The blocks win this round.", "Gravity: 1, You: 0.", "That was... a choice.",
        "Have you tried NOT stacking to the top?", "The blocks send their regards.", "So close! (Probably.)",
    };

    private GameApp app;
    private List<Button> titleButtons, howToButtons, scoreButtons, confirmButtons, gameOverButtons, initialsButtons;
    private List<Button> currentList;
    private int selected;
    private Vector2 lastMouse;
    private Button pendingButton;
    private float pendingTimer;
    private readonly List<Burst> bursts = new List<Burst>();
    private float modeTime;
    private string toastText = "";
    private float toastTimer;

    // title
    private int taglineIndex;
    private float taglineTimer, confettiTimer;

    // best scores
    private ScoreSort sort = ScoreSort.Score;
    private bool todayOnly;
    private int confirmStep;            // 0 = no dialog, 1 = "are you sure?", 2 = "SURE sure?"
    private float poofTimer = -1f;
    public ScoreEntry HighlightEntry;   // newest entry blinks in the table

    // initials entry
    private readonly char[] initials = { 'A', 'A', 'A' };
    private int slot;
    private float letterBounce;

    // last run (game over screen)
    private int runScore, runLines, runLevel, runStage;
    private bool runHigh;
    private string quip = "";
    private const float AutoReturnSeconds = 20f;

    public void Init(GameApp owner)
    {
        app = owner;
        Color pink = new Color(1f, 0.35f, 0.65f), yellow = new Color(1f, 0.8f, 0.2f), cyan = new Color(0.3f, 0.85f, 1f),
              green = new Color(0.35f, 0.95f, 0.45f), purple = new Color(0.65f, 0.45f, 1f), red = new Color(1f, 0.35f, 0.3f);

        titleButtons = new List<Button>
        {
            new Button { Label = () => "PLAY!", Action = app.StartGame, Color = pink },
            new Button { Label = StageLabel, Action = () => CycleStage(1), OnLeftRight = CycleStage, Color = purple },
            new Button { Label = () => "BEST SCORES", Action = app.ShowScores, Color = yellow },
            new Button { Label = () => "HOW TO PLAY", Action = app.ShowHowTo, Color = cyan },
            new Button { Label = () => app.SoundOn ? "SOUND: ON" : "SOUND: OFF", Action = app.ToggleSound, Color = green },
            new Button { Label = () => "QUIT", Action = app.Quit, Color = red, Visible = CanQuit },
        };
        howToButtons = new List<Button> { new Button { Label = () => "GOT IT!", Action = app.ShowTitle, Color = pink } };
        scoreButtons = new List<Button>
        {
            new Button { Label = () => "SORT: " + sort.ToString().ToUpper(), Action = () => sort = (ScoreSort)(((int)sort + 1) % 3), Color = cyan },
            new Button { Label = () => todayOnly ? "SHOWING: TODAY" : "SHOWING: ALL-TIME", Action = () => todayOnly = !todayOnly, Color = yellow },
            new Button { Label = () => "RESET", Action = () => OpenConfirm(), Color = red },
            new Button { Label = () => "BACK", Action = app.ShowTitle, Color = pink },
        };
        confirmButtons = new List<Button>
        {
            new Button { Label = () => confirmStep == 1 ? "YES, WIPE 'EM!" : "DO IT!", Action = ConfirmYes, Color = red },
            new Button { Label = () => confirmStep == 1 ? "NO WAIT!" : "I PANICKED", Action = ConfirmNo, Color = green },
        };
        gameOverButtons = new List<Button>
        {
            new Button { Label = () => "PLAY AGAIN", Action = app.StartGame, Color = pink },
            new Button { Label = () => "BEST SCORES", Action = app.ShowScores, Color = yellow },
            new Button { Label = () => "TITLE", Action = app.ShowTitle, Color = cyan },
        };
        initialsButtons = new List<Button> { new Button { Label = () => "DONE!", Action = SubmitInitials, Color = green } };
    }

    private static bool CanQuit()
    {
        // iOS apps must not quit themselves, and WebGL can't.
        return Application.platform != RuntimePlatform.IPhonePlayer && Application.platform != RuntimePlatform.WebGLPlayer;
    }

    private string StageLabel()
    {
        int s = app.StartStage;
        bool locked = HighScores.MaxStageReached == 0;
        return "STAGE: < " + (s + 1) + ". " + StageData.Names[s] + " >" + (locked ? "  (more to unlock!)" : "");
    }

    private void CycleStage(int dir)
    {
        int count = HighScores.MaxStageReached + 1; // only stages you have reached
        app.StartStage = ((app.StartStage + dir) % count + count) % count;
        app.Backgrounds.ShowStage(app.StartStage);
    }

    /// <summary>Called by GameApp whenever the screen changes.</summary>
    public void OnEnterMode(AppMode mode)
    {
        modeTime = 0f;
        selected = 0;
        pendingButton = null;
        confirmStep = 0;
        bursts.Clear();
        switch (mode)
        {
            case AppMode.Title: currentList = titleButtons; taglineTimer = 0f; break;
            case AppMode.HowTo: currentList = howToButtons; break;
            case AppMode.Scores: currentList = scoreButtons; break;
            case AppMode.GameOver: currentList = gameOverButtons; break;
            case AppMode.EnterInitials:
                currentList = initialsButtons;
                string last = HighScores.LastInitials;
                for (int i = 0; i < 3; i++) initials[i] = last[i];
                slot = 0;
                SfxManager.Play(Sfx.QuadFanfare);
                app.Fx.QuadCelebration(Vector2.zero);
                app.Shake.AddShake(0.5f);
                break;
            default: currentList = null; break;
        }
        if (mode == AppMode.GameOver) quip = GameOverQuips[Random.Range(0, GameOverQuips.Length)];
    }

    public void SetLastRun(int score, int lines, int level, int stage, bool newHigh)
    {
        runScore = score; runLines = lines; runLevel = level; runStage = stage; runHigh = newHigh;
        HighlightEntry = null;
    }

    /// <summary>Small message in the corner (e.g. "MUSIC OFF").</summary>
    public void Toast(string text)
    {
        toastText = text;
        toastTimer = 1.5f;
    }

    // ============================================================ update / input

    private void Update()
    {
        float dt = Time.deltaTime;
        modeTime += dt;
        toastTimer -= dt;
        letterBounce = Mathf.Max(0f, letterBounce - dt * 5f);
        if (poofTimer >= 0f) { poofTimer += dt; if (poofTimer > 1.6f) poofTimer = -1f; }

        for (int i = bursts.Count - 1; i >= 0; i--)
        {
            bursts[i].Age += dt;
            if (bursts[i].Age > 0.7f) bursts.RemoveAt(i);
        }

        AppMode mode = app.Mode;
        List<Button> list = mode == AppMode.Scores && confirmStep > 0 ? confirmButtons : currentList;
        if (list == null) return;

        Layout(mode);
        AnimateButtons(list, dt);

        // A pressed button runs its action after a tiny delay so the squash is visible.
        if (pendingButton != null)
        {
            pendingTimer -= dt;
            if (pendingTimer <= 0f)
            {
                Button b = pendingButton;
                pendingButton = null;
                b.Action();
            }
            return;
        }
        if (app.IsTransitioning) return;

        // Short grace period after a screen appears, so a player still mashing
        // hard drop doesn't instantly press a button on the game-over screen.
        float grace = mode == AppMode.GameOver || mode == AppMode.EnterInitials ? 0.9f : 0.2f;
        if (modeTime < grace) return;

        switch (mode)
        {
            case AppMode.Title:
                UpdateTitle(dt);
                HandleButtons(list, false);
                break;
            case AppMode.HowTo:
                HandleButtons(list, false);
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.Backspace)) app.ShowTitle();
                break;
            case AppMode.Scores:
                HandleButtons(list, true);
                if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.Backspace))
                {
                    if (confirmStep > 0) ConfirmNo();
                    else app.ShowTitle();
                }
                break;
            case AppMode.GameOver:
                HandleButtons(list, true);
                if (Input.GetKeyDown(KeyCode.R)) Activate(gameOverButtons[0]);
                else if (Input.GetKeyDown(KeyCode.Escape)) Activate(gameOverButtons[2]);
                else if (modeTime > AutoReturnSeconds) app.ShowTitle();
                break;
            case AppMode.EnterInitials:
                UpdateInitials();
                HandleButtons(list, true, false); // mouse only; keys edit letters
                break;
        }
    }

    private void AnimateButtons(List<Button> list, float dt)
    {
        for (int i = 0; i < list.Count; i++)
        {
            Button b = list[i];
            b.Hover = Mathf.MoveTowards(b.Hover, i == selected ? 1f : 0f, dt * 6f);
            b.Squash = Mathf.Max(0f, b.Squash - dt * 4f);
            b.Wiggle = Mathf.Max(0f, b.Wiggle - dt * 2.5f);
        }
    }

    private void HandleButtons(List<Button> list, bool horizontal, bool keyboard = true)
    {
        if (selected >= list.Count || !list[selected].IsVisible) selected = 0;

        if (keyboard)
        {
            bool prev = horizontal ? Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A)
                                   : Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W);
            bool next = horizontal ? Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D)
                                   : Input.GetKeyDown(KeyCode.DownArrow) || Input.GetKeyDown(KeyCode.S);
            if (prev) Select(list, Step(list, selected, -1));
            if (next) Select(list, Step(list, selected, 1));

            // Left/Right on a value button (stage select) changes the value.
            if (!horizontal && list[selected].OnLeftRight != null)
            {
                int dir = 0;
                if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A)) dir = -1;
                if (Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D)) dir = 1;
                if (dir != 0)
                {
                    list[selected].OnLeftRight(dir);
                    list[selected].Squash = 0.6f;
                    SfxManager.Play(Sfx.Boing, 1f, 1.3f);
                }
            }

            if (Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter) || Input.GetKeyDown(KeyCode.Space))
            {
                Activate(list[selected]);
                return;
            }
        }

        // Mouse: hovering selects (with a boing), clicking presses.
        Vector2 mouse = GuiKit.Mouse;
        bool moved = (mouse - lastMouse).sqrMagnitude > 1f;
        lastMouse = mouse;
        for (int i = 0; i < list.Count; i++)
        {
            if (!list[i].IsVisible || !list[i].Rect.Contains(mouse)) continue;
            if (moved && i != selected) Select(list, i);
            if (Input.GetMouseButtonDown(0)) { selected = i; Activate(list[i]); }
            break;
        }
    }

    private static int Step(List<Button> list, int from, int dir)
    {
        int i = from;
        for (int n = 0; n < list.Count; n++)
        {
            i = (i + dir + list.Count) % list.Count;
            if (list[i].IsVisible) return i;
        }
        return from;
    }

    private void Select(List<Button> list, int index)
    {
        if (index == selected) return;
        selected = index;
        list[index].Wiggle = 1f;
        SfxManager.Play(Sfx.Boing);
    }

    /// <summary>The PUNCH: sound, squash, shake, confetti, starburst, then the action.</summary>
    private void Activate(Button b)
    {
        if (pendingButton != null) return;
        SfxManager.Play(Sfx.Punch);
        b.Squash = 1f;
        app.Shake.AddShake(0.3f);
        Vector2 c = b.Rect.center;
        bursts.Add(new Burst
        {
            Pos = c + new Vector2(b.Rect.width * 0.45f, -20f),
            Word = PunchWords[Random.Range(0, PunchWords.Length)],
            Angle = Random.Range(-25f, 25f),
            Color = Color.HSVToRGB(Random.Range(0.05f, 0.18f), 0.9f, 1f),
        });
        app.Fx.Confetti(app.GuiToWorld(c), 25);
        pendingButton = b;
        pendingTimer = 0.14f;
    }

    // ---------------------------------------------------------------- title

    private void UpdateTitle(float dt)
    {
        taglineTimer += dt;
        if (taglineTimer > 3f)
        {
            taglineTimer = 0f;
            taglineIndex = (taglineIndex + 1) % Taglines.Length;
        }
        confettiTimer -= dt;
        if (confettiTimer <= 0f)
        {
            confettiTimer = Random.Range(0.4f, 0.9f);
            float halfW = app.Cam.orthographicSize * app.Cam.aspect;
            app.Fx.Confetti(new Vector2(Random.Range(-halfW, halfW), -app.Cam.orthographicSize), 14);
        }
    }

    // ---------------------------------------------------------------- scores

    private void OpenConfirm()
    {
        confirmStep = 1;
        selected = 1; // default to "NO" - we're nice like that
    }

    private void ConfirmYes()
    {
        if (confirmStep == 1) { confirmStep = 2; selected = 1; return; }
        HighScores.ResetAll();
        HighlightEntry = null;
        confirmStep = 0;
        selected = 2;
        poofTimer = 0f;
        app.Fx.QuadCelebration(Vector2.zero);
        app.Shake.AddShake(0.8f);
        SfxManager.Play(Sfx.HardDrop);
    }

    private void ConfirmNo()
    {
        confirmStep = 0;
        selected = 2;
        SfxManager.Play(Sfx.Boing, 1f, 0.8f);
    }

    // ---------------------------------------------------------------- initials

    private void UpdateInitials()
    {
        if (Input.GetKeyDown(KeyCode.UpArrow)) ChangeLetter(1);
        if (Input.GetKeyDown(KeyCode.DownArrow)) ChangeLetter(-1);
        if (Input.GetKeyDown(KeyCode.LeftArrow)) MoveSlot(-1);
        if (Input.GetKeyDown(KeyCode.RightArrow)) MoveSlot(1);
        if (Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter)) { Activate(initialsButtons[0]); return; }

        // Typing letters fills the slots directly.
        string typed = Input.inputString;
        if (!string.IsNullOrEmpty(typed))
        {
            foreach (char ch in typed)
            {
                if (ch == '\b') MoveSlot(-1);
                else if (char.IsLetterOrDigit(ch))
                {
                    initials[slot] = char.ToUpperInvariant(ch);
                    letterBounce = 1f;
                    SfxManager.Play(Sfx.MoveTick);
                    if (slot < 2) slot++;
                }
            }
        }

        // Mouse: click the top half of a letter to go up, bottom half to go down.
        if (Input.GetMouseButtonDown(0))
        {
            Vector2 m = GuiKit.Mouse;
            for (int i = 0; i < 3; i++)
            {
                Rect r = LetterRect(i);
                if (!r.Contains(m)) continue;
                slot = i;
                ChangeLetter(m.y < r.center.y ? 1 : -1);
            }
        }

        // Keep the party going.
        if (Random.value < Time.deltaTime * 2.5f)
            app.Fx.Confetti(new Vector2(Random.Range(-12f, 12f), -app.Cam.orthographicSize), 20);
    }

    private void ChangeLetter(int dir)
    {
        const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        int i = alphabet.IndexOf(initials[slot]);
        if (i < 0) i = 0;
        i = (i + dir + alphabet.Length) % alphabet.Length;
        initials[slot] = alphabet[i];
        letterBounce = 1f;
        SfxManager.Play(Sfx.MoveTick, 1f, dir > 0 ? 1.2f : 0.9f);
    }

    private void MoveSlot(int dir)
    {
        slot = Mathf.Clamp(slot + dir, 0, 2);
        letterBounce = 1f;
        SfxManager.Play(Sfx.Rotate);
    }

    private void SubmitInitials()
    {
        SfxManager.Play(Sfx.LevelUp);
        app.SubmitInitials(new string(initials), runScore, runLines, runLevel, runStage);
    }

    private Rect LetterRect(int i)
    {
        float cx = GuiKit.Width / 2f + (i - 1) * 130f;
        return new Rect(cx - 55f, 300f, 110f, 130f);
    }

    // ============================================================ layout

    private void Layout(AppMode mode)
    {
        float cx = GuiKit.Width / 2f;
        switch (mode)
        {
            case AppMode.Title:
                for (int i = 0; i < titleButtons.Count; i++)
                {
                    float w = i == 1 ? 520f : 340f;
                    titleButtons[i].Rect = new Rect(cx - w / 2f, 300f + i * 58f, w, 48f);
                }
                break;
            case AppMode.HowTo:
                howToButtons[0].Rect = new Rect(cx - 140f, 630f, 280f, 52f);
                break;
            case AppMode.Scores:
                for (int i = 0; i < scoreButtons.Count; i++)
                    scoreButtons[i].Rect = new Rect(cx - 470f + i * 240f, 630f, 220f, 52f);
                for (int i = 0; i < confirmButtons.Count; i++)
                    confirmButtons[i].Rect = new Rect(cx - 250f + i * 260f, 430f, 240f, 56f);
                break;
            case AppMode.GameOver:
                for (int i = 0; i < gameOverButtons.Count; i++)
                    gameOverButtons[i].Rect = new Rect(cx - 330f + i * 225f, 520f, 210f, 54f);
                break;
            case AppMode.EnterInitials:
                initialsButtons[0].Rect = new Rect(cx - 120f, 540f, 240f, 56f);
                break;
        }
    }

    // ============================================================ drawing

    private void OnGUI()
    {
        if (app == null || !GuiKit.IsRepaint) return;
        GUI.depth = 0;
        GuiKit.Begin();
        switch (app.Mode)
        {
            case AppMode.Title: DrawTitle(); break;
            case AppMode.HowTo: DrawHowTo(); break;
            case AppMode.Scores: DrawScores(); break;
            case AppMode.GameOver: DrawGameOver(); break;
            case AppMode.EnterInitials: DrawInitials(); break;
        }

        foreach (Burst b in bursts) DrawBurst(b);

        if (toastTimer > 0f)
        {
            float a = Mathf.Clamp01(toastTimer * 2f);
            Vector2 p = new Vector2(GuiKit.Width - 130f, 40f);
            GuiKit.Panel(new Rect(p.x - 110f, p.y - 24f, 220f, 48f), new Color(0f, 0f, 0f, 0.6f * a));
            GuiKit.Text(p, toastText, 24f, new Color(1f, 1f, 1f, a));
        }
    }

    private void DrawButtons(List<Button> list)
    {
        for (int i = 0; i < list.Count; i++)
        {
            Button b = list[i];
            if (!b.IsVisible) continue;
            bool sel = i == selected;
            Vector2 c = b.Rect.center;
            float wiggle = Mathf.Sin(Time.time * 28f) * 9f * b.Wiggle + (sel ? Mathf.Sin(Time.time * 4f) * 1.5f : 0f);
            float sx = 1f + 0.08f * b.Hover + 0.28f * b.Squash;
            float sy = 1f + 0.08f * b.Hover - 0.3f * b.Squash;
            GuiKit.Transform(c, wiggle, sx, sy);
            Rect r = b.Rect;
            GuiKit.Panel(new Rect(r.x + 5f, r.y + 7f, r.width, r.height), new Color(0f, 0f, 0f, 0.45f)); // shadow
            Color col = sel ? Color.Lerp(b.Color, Color.white, 0.25f + 0.1f * Mathf.Sin(Time.time * 8f)) : b.Color * 0.8f;
            col.a = 1f;
            GuiKit.Panel(r, col);
            GuiKit.Text(c, b.Label(), r.height * 0.48f, Color.white, 2.5f);
            GuiKit.Reset();
        }
    }

    private void DrawBurst(Burst b)
    {
        float t = b.Age / 0.7f;
        float s = GuiKit.EaseOutBack(Mathf.Clamp01(b.Age * 7f)) * (1f + 0.1f * t);
        float a = 1f - Mathf.Clamp01((t - 0.6f) / 0.4f);
        GuiKit.Star(b.Pos, 150f * s, b.Angle + t * 40f, new Color(b.Color.r, b.Color.g, b.Color.b, a));
        GuiKit.FancyText(b.Pos, b.Word, 40f, new Color(1f, 1f, 1f, a), b.Angle, s, 3f);
    }

    private void DrawTitle()
    {
        float t = modeTime;
        float cx = GuiKit.Width / 2f;
        DrawLogoLine("BLOCK", new Vector2(cx, 85f), 96f, 0, t);
        DrawLogoLine("BONANZA!", new Vector2(cx, 185f), 104f, 5, t);

        // Silly tagline that pops in every few seconds.
        float pop = GuiKit.EaseOutBack(Mathf.Clamp01(taglineTimer * 4f));
        GuiKit.FancyText(new Vector2(cx, 258f), Taglines[taglineIndex], 28f, new Color(1f, 0.95f, 0.4f),
                         -3f + Mathf.Sin(t * 2f) * 2f, pop, 2.5f);

        DrawButtons(titleButtons);

        GuiKit.Text(new Vector2(cx, 668f), "BEST: " + HighScores.Best + "      Mouse or Arrows + Enter      M: mute   N: music",
                    18f, new Color(1f, 1f, 1f, 0.75f), 1.5f);
        GuiKit.Text(new Vector2(cx, 698f), "Left/Right on STAGE picks any stage you've reached", 15f, new Color(1f, 1f, 1f, 0.5f), 1f);
    }

    /// <summary>Logo letters drop in with a bounce, then bob and wobble forever.</summary>
    private static void DrawLogoLine(string word, Vector2 center, float size, int colorOffset, float time)
    {
        float letterW = size * 0.7f;
        float left = center.x - (word.Length - 1) * letterW / 2f;
        for (int i = 0; i < word.Length; i++)
        {
            float delay = (i + colorOffset) * 0.06f;
            float drop = GuiKit.EaseOutBounce((time - delay) / 0.7f);
            float y = Mathf.Lerp(-200f, center.y, drop) + Mathf.Sin(time * 4f + i * 0.7f) * 8f;
            float angle = Mathf.Sin(time * 3f + i * 1.3f) * 8f;
            float beat = Mathf.Exp(-Mathf.Repeat(time * 124f / 60f, 1f) * 6f); // pulses with the title music
            float scale = 1f + 0.06f * beat;
            Color col = Color.HSVToRGB(Mathf.Repeat((i + colorOffset) * 0.08f + time * 0.1f, 1f), 0.75f, 1f);
            GuiKit.FancyText(new Vector2(left + i * letterW, y), word[i].ToString(), size, col, angle, scale, 5f);
        }
    }

    private static Rect CenterPanel(float w, float h, float y)
    {
        return new Rect(GuiKit.Width / 2f - w / 2f, y, w, h);
    }

    private void DrawHowTo()
    {
        float cx = GuiKit.Width / 2f;
        GuiKit.Panel(CenterPanel(900f, 520f, 90f), new Color(0.05f, 0.05f, 0.12f, 0.88f));
        GuiKit.FancyText(new Vector2(cx, 60f), "HOW TO PLAY", 60f, new Color(0.4f, 0.9f, 1f), Mathf.Sin(modeTime * 3f) * 3f, 1f, 4f);
        string left =
            "Left / Right  or  A / D\nUp  or  W\nDown  or  S\nSpace\nP  or  Esc\nR\nM  /  N";
        string right =
            "Move (hold to slide)\nRotate (kicks off walls)\nSoft drop  (+1 per row)\nHard drop  (+2 per row)\nPause  (Q quits to title)\nRestart\nMute all  /  toggle music";
        GuiKit.Text(new Vector2(cx - 30f, 250f), left, 24f, new Color(1f, 0.85f, 0.3f), 2f, TextAnchor.MiddleRight);
        GuiKit.Text(new Vector2(cx + 30f, 250f), right, 24f, Color.white, 2f, TextAnchor.MiddleLeft);
        GuiKit.Text(new Vector2(cx, 440f),
            "Fill a whole row to clear it. Clear 4 at once for a QUAD SMASH!\n" +
            "Clear lines back-to-back for COMBO bonus points.\n" +
            "Every 10 lines: faster blocks and a NEW STAGE with its own music:\n" +
            "Neon City > Deep Space > Cyber Jungle > Volcano Core > Glitch Dimension",
            21f, new Color(0.85f, 0.9f, 1f), 1.5f);
        DrawButtons(howToButtons);
    }

    private void DrawScores()
    {
        float cx = GuiKit.Width / 2f;
        GuiKit.FancyText(new Vector2(cx, 55f), "BEST SCORES", 60f, new Color(1f, 0.85f, 0.3f), Mathf.Sin(modeTime * 3f) * 3f, 1f, 4f);
        GuiKit.Panel(CenterPanel(900f, 500f, 105f), new Color(0.05f, 0.05f, 0.12f, 0.88f));

        float[] cols = { -380f, -290f, -120f, 40f, 160f, 300f };
        string[] headers = { "#", "NAME", "SCORE", "LINES", "LEVEL", "DATE" };
        for (int c = 0; c < cols.Length; c++)
            GuiKit.Text(new Vector2(cx + cols[c], 140f), headers[c], 22f, new Color(0.6f, 0.8f, 1f), 1.5f);

        List<ScoreEntry> top = HighScores.GetTop(sort, todayOnly);
        if (top.Count == 0)
        {
            GuiKit.FancyText(new Vector2(cx, 340f), todayOnly ? "Nobody has played today.\nThe blocks are lonely." : "No scores yet!\nGo make history.",
                             32f, Color.white, Mathf.Sin(modeTime * 2f) * 3f, 1f, 2f);
        }
        for (int i = 0; i < top.Count; i++)
        {
            ScoreEntry e = top[i];
            float y = 180f + i * 40f;
            bool isNew = e == HighlightEntry;
            Color col = i == 0 ? new Color(1f, 0.85f, 0.2f) : i == 1 ? new Color(0.85f, 0.9f, 1f) : i == 2 ? new Color(1f, 0.6f, 0.35f) : Color.white;
            if (isNew) col = Color.Lerp(col, new Color(0.4f, 1f, 0.6f), 0.5f + 0.5f * Mathf.Sin(modeTime * 10f));
            float bounce = isNew ? Mathf.Abs(Mathf.Sin(modeTime * 6f)) * 4f : 0f;
            string[] cells = { (i + 1).ToString(), e.initials, e.score.ToString(), e.lines.ToString(), e.level.ToString(), e.date };
            for (int c = 0; c < cols.Length; c++)
                GuiKit.Text(new Vector2(cx + cols[c], y - bounce), cells[c], 24f, col, 1.5f);
        }

        if (poofTimer >= 0f)
            GuiKit.FancyText(new Vector2(cx, 340f), "POOF! All gone.", 64f, new Color(1f, 0.4f, 0.4f, 1f - poofTimer / 1.6f),
                             Mathf.Sin(poofTimer * 20f) * 6f, 1f + poofTimer * 0.3f, 4f);

        DrawButtons(scoreButtons);

        if (confirmStep > 0) DrawConfirm();
    }

    private void DrawConfirm()
    {
        float cx = GuiKit.Width / 2f;
        GuiKit.Rect(new Rect(0f, 0f, GuiKit.Width, GuiKit.Height), new Color(0f, 0f, 0f, 0.6f));
        Vector2 c = new Vector2(cx, 360f);
        float shake = confirmStep == 2 ? Mathf.Sin(Time.time * 40f) * 2.5f : Mathf.Sin(Time.time * 3f) * 2f;
        GuiKit.Transform(c, shake, 1f + 0.02f * Mathf.Sin(Time.time * 6f));
        GuiKit.Panel(new Rect(cx - 320f, 200f, 640f, 320f), new Color(0.35f, 0.05f, 0.12f, 0.97f));
        GuiKit.Reset();
        GuiKit.FancyText(new Vector2(cx, 260f), confirmStep == 1 ? "ARE YOU SURE?" : "LIKE... SURE SURE?", 52f, new Color(1f, 0.9f, 0.3f), shake, 1f, 4f);
        GuiKit.Text(new Vector2(cx, 340f),
            confirmStep == 1 ? "This deletes ALL your best scores.\nThe blocks worked really hard on those."
                             : "No take-backs. No undo. No crying.\n(Okay, a little crying is fine.)",
            24f, Color.white, 2f);
        DrawButtons(confirmButtons);
    }

    private void DrawInitials()
    {
        float cx = GuiKit.Width / 2f;
        float t = modeTime;
        GuiKit.Rect(new Rect(0f, 0f, GuiKit.Width, GuiKit.Height), new Color(0f, 0f, 0f, 0.45f));

        // Rainbow, bouncing "NEW HIGH SCORE!"
        string title = "NEW HIGH SCORE!";
        float letterW = 46f;
        float left = cx - (title.Length - 1) * letterW / 2f;
        for (int i = 0; i < title.Length; i++)
        {
            float y = 110f - Mathf.Abs(Mathf.Sin(t * 5f + i * 0.4f)) * 22f;
            Color col = Color.HSVToRGB(Mathf.Repeat(t * 0.6f + i * 0.07f, 1f), 0.8f, 1f);
            GuiKit.FancyText(new Vector2(left + i * letterW, y), title[i].ToString(), 72f, col, Mathf.Sin(t * 6f + i) * 10f, 1f, 4f);
        }
        GuiKit.Star(new Vector2(cx, 215f), 330f, t * 30f, new Color(1f, 0.75f, 0.1f, 0.35f));
        GuiKit.Text(new Vector2(cx, 205f), "SCORE " + runScore, 44f, Color.white, 3f);
        GuiKit.Text(new Vector2(cx, 250f), "RANK #" + (HighScores.Rank(runScore) + 1) + "   -   enter your initials!", 24f, new Color(1f, 0.9f, 0.5f), 2f);

        for (int i = 0; i < 3; i++)
        {
            Rect r = LetterRect(i);
            bool sel = i == slot;
            float bounce = sel ? Mathf.Abs(Mathf.Sin(t * 6f)) * 10f + letterBounce * 12f : 0f;
            GuiKit.Transform(r.center, sel ? Mathf.Sin(t * 8f) * 4f : 0f, sel ? 1.08f : 1f);
            GuiKit.Panel(new Rect(r.x, r.y - bounce, r.width, r.height), sel ? new Color(1f, 0.4f, 0.7f) : new Color(0.25f, 0.25f, 0.45f));
            GuiKit.Text(new Vector2(r.center.x, r.center.y - bounce), initials[i].ToString(), 84f, Color.white, 4f);
            GuiKit.Reset();
            if (sel)
            {
                // "<" rotated 90 degrees makes handy up/down arrows.
                GuiKit.FancyText(new Vector2(r.center.x, r.y - 30f - bounce), "<", 40f, Color.white, 90f, 1f, 2f);
                GuiKit.FancyText(new Vector2(r.center.x, r.yMax + 26f - bounce), "<", 40f, Color.white, -90f, 1f, 2f);
            }
        }
        GuiKit.Text(new Vector2(cx, 505f), "Type letters, or Up/Down to change, Left/Right to move, Enter when done", 19f,
                    new Color(1f, 1f, 1f, 0.8f), 1.5f);
        DrawButtons(initialsButtons);
    }

    private void DrawGameOver()
    {
        float cx = GuiKit.Width / 2f;
        GuiKit.Rect(new Rect(0f, 0f, GuiKit.Width, GuiKit.Height), new Color(0f, 0f, 0f, 0.5f));
        float drop = GuiKit.EaseOutBounce(Mathf.Clamp01(modeTime / 0.8f));
        GuiKit.Transform(new Vector2(cx, 340f), Mathf.Sin(modeTime * 2f) * 1.5f, 1f);
        GuiKit.Panel(new Rect(cx - 380f, Mathf.Lerp(-500f, 120f, drop), 760f, 480f), new Color(0.06f, 0.05f, 0.14f, 0.95f));
        GuiKit.Reset();
        float top = Mathf.Lerp(-500f, 120f, drop);

        GuiKit.FancyText(new Vector2(cx, top + 60f), "GAME OVER", 72f, new Color(1f, 0.35f, 0.4f), Mathf.Sin(modeTime * 4f) * 4f,
                         1f + 0.04f * Mathf.Sin(modeTime * 6f), 4f);
        GuiKit.Text(new Vector2(cx, top + 120f), quip, 24f, new Color(1f, 0.9f, 0.5f), 2f);

        GuiKit.Text(new Vector2(cx, top + 175f), "SCORE", 22f, new Color(0.7f, 0.8f, 1f), 1.5f);
        GuiKit.RollingNumber(new Vector2(cx, top + 220f), Mathf.Min(runScore, runScore * Mathf.Clamp01(modeTime / 1.2f)), 54f, Color.white, 1);
        GuiKit.Text(new Vector2(cx, top + 285f),
            "LINES " + runLines + "     LEVEL " + runLevel + "     STAGE " + (runStage + 1) + ": " + StageData.Names[runStage],
            22f, Color.white, 1.5f);
        GuiKit.Text(new Vector2(cx, top + 320f), "BEST " + HighScores.Best, 22f, new Color(1f, 0.85f, 0.4f), 1.5f);
        if (runHigh)
            GuiKit.FancyText(new Vector2(cx + 280f, top + 200f), "NEW HIGH\nSCORE!", 26f, Color.HSVToRGB(Mathf.Repeat(modeTime, 1f), 0.8f, 1f),
                             15f + Mathf.Sin(modeTime * 6f) * 5f, 1f + 0.1f * Mathf.Sin(modeTime * 9f), 3f);

        if (drop >= 1f) DrawButtons(gameOverButtons);
        int secondsLeft = Mathf.CeilToInt(AutoReturnSeconds - modeTime);
        GuiKit.Text(new Vector2(cx, 640f), "R: play again    Esc: title    (back to title in " + Mathf.Max(0, secondsLeft) + ")",
                    18f, new Color(1f, 1f, 1f, 0.65f), 1.5f);
    }
}
