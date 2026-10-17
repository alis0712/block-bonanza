using UnityEngine;

/// <summary>Which screen the app is showing.</summary>
public enum AppMode { Title, HowTo, Scores, Playing, EnterInitials, GameOver }

/// <summary>
/// The "director" of the whole app. It builds every system in code (camera,
/// audio, effects, backgrounds, game, menus), owns the current screen (mode),
/// handles the global mute keys and the swooshy screen transitions.
/// </summary>
public class GameApp : MonoBehaviour
{
    public static GameApp Instance { get; private set; }

    public Camera Cam { get; private set; }
    public CameraShake Shake { get; private set; }
    public EffectsManager Fx { get; private set; }
    public BackgroundDirector Backgrounds { get; private set; }
    public TitleRain Rain { get; private set; }
    public BlockBonanzaGame Game { get; private set; }
    public MenuUI Menu { get; private set; }

    public AppMode Mode { get; private set; }

    /// <summary>Stage chosen on the title screen (0-4).</summary>
    public int StartStage;

    public bool SoundOn { get; private set; }
    public bool MusicOn { get; private set; }

    private const string SoundKey = "BlockBonanza.SoundOn";
    private const string MusicKey = "BlockBonanza.MusicOn";

    // Screen transition ("swoosh" wipe)
    private const float TransitionSeconds = 0.75f;
    private float transitionTime = -1f;
    private System.Action pendingAction;
    private bool pendingDone;
    private string transitionWord = "WHOOSH!";
    private static readonly string[] TransitionWords = { "WHOOSH!", "ZOOM!", "SWOOSH!", "VWOOP!", "ZIP!" };

    public bool IsTransitioning { get { return transitionTime >= 0f; } }

    // ============================================================ setup

    private void Awake()
    {
        Instance = this;
        SetupCamera();

        Fx = new GameObject("Effects").AddComponent<EffectsManager>();
        new GameObject("Sound Effects").AddComponent<SfxManager>();
        new GameObject("Music").AddComponent<MusicManager>();

        Backgrounds = new GameObject("Backgrounds").AddComponent<BackgroundDirector>();
        Backgrounds.Init(Cam);

        Rain = new GameObject("Title Rain").AddComponent<TitleRain>();
        Rain.Init(Cam);

        Game = new GameObject("Block Bonanza Game").AddComponent<BlockBonanzaGame>();
        Game.Init(this);

        Menu = new GameObject("Menus").AddComponent<MenuUI>();
        Menu.Init(this);

        // Saved settings
        SoundOn = PlayerPrefs.GetInt(SoundKey, 1) == 1;
        MusicOn = PlayerPrefs.GetInt(MusicKey, 1) == 1;
        AudioListener.volume = SoundOn ? 1f : 0f;
        MusicManager.Instance.MusicOn = MusicOn;
        StartStage = 0;

        UpdateCameraSize();
        EnterTitle();
    }

    private void SetupCamera()
    {
        Cam = Camera.main;
        if (Cam == null)
        {
            var camGo = new GameObject("Main Camera");
            camGo.tag = "MainCamera";
            Cam = camGo.AddComponent<Camera>();
        }
        Cam.orthographic = true;
        Cam.orthographicSize = 11.5f;
        Cam.clearFlags = CameraClearFlags.SolidColor;
        Cam.backgroundColor = StageData.Sky[0];
        Cam.nearClipPlane = 0.1f;
        Cam.farClipPlane = 100f;

        Shake = Cam.GetComponent<CameraShake>();
        if (Shake == null) Shake = Cam.gameObject.AddComponent<CameraShake>();
        Shake.basePosition = new Vector3(0f, 0f, -10f);
        Cam.transform.position = Shake.basePosition;
        Cam.transform.rotation = Quaternion.identity;

        // Sound needs exactly one AudioListener in the scene.
        if (Object.FindFirstObjectByType<AudioListener>() == null)
            Cam.gameObject.AddComponent<AudioListener>();
    }

    /// <summary>Zooms the camera out on narrow windows so everything fits.</summary>
    private void UpdateCameraSize()
    {
        float aspect = Screen.height > 0 ? Screen.width / (float)Screen.height : 1.6f;
        const float neededHalfWidth = 13f;
        Cam.orthographicSize = Mathf.Max(11.5f, neededHalfWidth / aspect);
    }

    // ============================================================ coordinates

    /// <summary>How many virtual GUI units one world unit covers.</summary>
    public float GuiUnitsPerWorldUnit { get { return GuiKit.RefHeight / (2f * Cam.orthographicSize); } }

    public Vector2 WorldToGui(Vector2 world)
    {
        Vector3 s = Cam.WorldToScreenPoint(new Vector3(world.x, world.y, 0f));
        return new Vector2(s.x / GuiKit.Scale, (Screen.height - s.y) / GuiKit.Scale);
    }

    public Vector2 GuiToWorld(Vector2 gui)
    {
        Vector3 w = Cam.ScreenToWorldPoint(new Vector3(gui.x * GuiKit.Scale, Screen.height - gui.y * GuiKit.Scale, 10f));
        return new Vector2(w.x, w.y);
    }

    // ============================================================ update

    private void Update()
    {
        UpdateCameraSize();

        // Global keys (not while typing initials, where M and N are letters).
        if (Mode != AppMode.EnterInitials)
        {
            if (Input.GetKeyDown(KeyCode.M)) ToggleSound();
            if (Input.GetKeyDown(KeyCode.N)) ToggleMusic();
        }

        if (transitionTime >= 0f)
        {
            transitionTime += Time.unscaledDeltaTime;
            // Swap screens while the wipe fully covers them.
            if (!pendingDone && transitionTime >= TransitionSeconds * 0.5f)
            {
                pendingDone = true;
                if (pendingAction != null) pendingAction();
            }
            if (transitionTime >= TransitionSeconds) transitionTime = -1f;
        }
    }

    public void ToggleSound()
    {
        SoundOn = !SoundOn;
        AudioListener.volume = SoundOn ? 1f : 0f;
        PlayerPrefs.SetInt(SoundKey, SoundOn ? 1 : 0);
        PlayerPrefs.Save();
        Menu.Toast(SoundOn ? "SOUND ON" : "SOUND OFF");
    }

    public void ToggleMusic()
    {
        MusicOn = !MusicOn;
        MusicManager.Instance.MusicOn = MusicOn;
        PlayerPrefs.SetInt(MusicKey, MusicOn ? 1 : 0);
        PlayerPrefs.Save();
        Menu.Toast(MusicOn ? "MUSIC ON" : "MUSIC OFF");
    }

    /// <summary>Plays the wipe and runs the action when the screen is covered.</summary>
    public void TransitionTo(System.Action action)
    {
        if (IsTransitioning) return;
        transitionTime = 0f;
        pendingAction = action;
        pendingDone = false;
        transitionWord = TransitionWords[Random.Range(0, TransitionWords.Length)];
        SfxManager.Play(Sfx.Swoosh);
    }

    // ============================================================ screens

    public void ShowTitle() { TransitionTo(EnterTitle); }
    public void ShowScores() { TransitionTo(() => SetMode(AppMode.Scores)); }
    public void ShowHowTo() { TransitionTo(() => SetMode(AppMode.HowTo)); }

    public void StartGame()
    {
        TransitionTo(() =>
        {
            Rain.SetActive(false);
            SetMode(AppMode.Playing);
            Game.Begin(StartStage);
        });
    }

    private void EnterTitle()
    {
        Game.Hide();
        Rain.SetActive(true);
        MusicManager.Instance.ResetSpeed();
        MusicManager.Instance.SetPaused(false);
        MusicManager.Instance.PlayTrack(MusicSynth.TitleTrack);
        Backgrounds.ShowStage(StartStage);
        SetMode(AppMode.Title);
    }

    private void SetMode(AppMode mode)
    {
        Mode = mode;
        Menu.OnEnterMode(mode);
    }

    /// <summary>Called by the game when the game-over animation has finished.</summary>
    public void OnGameOverFinished(int score, int lines, int level, int stage)
    {
        bool qualifies = HighScores.Qualifies(score);
        Menu.SetLastRun(score, lines, level, stage, qualifies);
        if (qualifies)
        {
            MusicManager.Instance.ResetSpeed();
            MusicManager.Instance.PlayTrack(MusicSynth.TitleTrack);
            SetMode(AppMode.EnterInitials);
        }
        else
        {
            SetMode(AppMode.GameOver);
        }
    }

    /// <summary>Called by the menu when the player confirms their initials.</summary>
    public void SubmitInitials(string initials, int score, int lines, int level, int stage)
    {
        Menu.HighlightEntry = HighScores.Add(initials, score, lines, level, stage);
        SetMode(AppMode.GameOver);
    }

    public void Quit()
    {
#if UNITY_EDITOR
        UnityEditor.EditorApplication.isPlaying = false;
#else
        Application.Quit();
#endif
    }

    // ============================================================ transition drawing

    private void OnGUI()
    {
        if (transitionTime < 0f || !GuiKit.IsRepaint) return;
        GUI.depth = -100; // on top of everything
        GuiKit.Begin();

        float t = transitionTime / TransitionSeconds;    // 0..1
        float w = GuiKit.Width, h = GuiKit.Height;
        Color[] colors = { new Color(1f, 0.3f, 0.6f), new Color(1f, 0.85f, 0.2f), new Color(0.3f, 0.9f, 1f) };
        Vector2 center = new Vector2(w / 2f, h / 2f);

        // Three tilted stripes sweep in from the left, then out to the right.
        GuiKit.Transform(center, -12f, 1f);
        for (int i = 0; i < 3; i++)
        {
            float local = Mathf.Clamp01(t * 1.15f - i * 0.05f);
            float x = local < 0.5f
                ? Mathf.Lerp(-w * 1.6f, -w * 0.25f, Mathf.SmoothStep(0f, 1f, local * 2f))
                : Mathf.Lerp(-w * 0.25f, w * 1.3f, Mathf.SmoothStep(0f, 1f, (local - 0.5f) * 2f));
            GuiKit.Rect(new Rect(x, -h * 0.5f + i * h * 0.67f, w * 1.5f, h * 0.7f), colors[i]);
        }
        GuiKit.Reset();

        // A comic sound-effect word in the middle while the screen is covered.
        float cover = 1f - Mathf.Abs(t - 0.5f) * 2.5f;
        if (cover > 0f)
            GuiKit.FancyText(center, transitionWord, 96f, new Color(1f, 1f, 1f, Mathf.Clamp01(cover * 2f)), -8f, 0.6f + 0.6f * cover, 5f);
    }
}
