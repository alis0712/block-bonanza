using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// The falling-blocks game itself: board data, input, rules, scoring, stages,
/// all gameplay animations and the in-game HUD.
/// GameApp creates it, and turns it on with Begin() and off with Hide().
///
/// Coordinates: the grid is 10 x 20, cell (0,0) is bottom-left.
/// One cell = one world unit; the board is centered on the world origin.
/// </summary>
public class BlockBonanzaGame : MonoBehaviour
{
    public const int Width = 10;
    public const int Height = 20;

    // ---------------- Tuning ----------------
    private const float MoveRepeatDelay = 0.17f;   // hold left/right this long before auto-repeat
    private const float MoveRepeatRate = 0.05f;    // auto-repeat interval
    private const float SoftDropRate = 0.04f;      // soft drop speed (seconds per row)
    private const float LockDelay = 0.45f;         // time a grounded piece waits before locking
    private const float ClearDuration = 0.38f;     // line flash/shrink animation length
    private const float GameOverRowDelay = 0.06f;  // stagger between rows falling at game over
    private const float BannerDuration = 2.4f;
    private static readonly int[] LineScores = { 0, 100, 300, 500, 800 };
    private static readonly string[] ClearNames = { "", "SINGLE", "DOUBLE", "TRIPLE", "QUAD SMASH!" };
    private static readonly Sfx[] ClearSounds = { Sfx.Clear1, Sfx.Clear1, Sfx.Clear2, Sfx.Clear3, Sfx.Clear4 };

    // Wall kicks: offsets tried, in order, when a rotation doesn't fit.
    private static readonly Vector2Int[] Kicks =
    {
        new Vector2Int(0, 0), new Vector2Int(-1, 0), new Vector2Int(1, 0),
        new Vector2Int(0, 1), new Vector2Int(-2, 0), new Vector2Int(2, 0),
    };

    private enum State { Playing, Clearing, GameOverAnim, Finished }

    // ---------------- Board data ----------------
    private readonly int[,] grid = new int[Width, Height];          // 0 = empty, otherwise piece type + 1
    private readonly float[,] squashTime = new float[Width, Height]; // seconds since lock squash started (-1 = none)
    private readonly float[,] dropOffset = new float[Width, Height]; // visual Y offset while rows collapse

    // ---------------- Current piece ----------------
    private int currentType, currentRotation, nextType;
    private Vector2Int currentPos;                    // bottom-left of the piece's rotation box
    private readonly List<int> bag = new List<int>(); // 7-bag randomizer

    // ---------------- Game state ----------------
    private bool active;
    private State state;
    private bool paused;
    private int score, lines, level = 1, stage, startStage, combo = -1;
    private float fallTimer, lockTimer;
    private readonly List<int> clearingRows = new List<int>();
    private float clearTimer;
    private float gameOverTimer;
    private int gameOverRow;
    private int bestAtStart;
    private bool beatBest;

    // ---------------- Input ----------------
    private int holdDirection;
    private float holdTimer, softDropTimer;

    // ---------------- Animation timers ----------------
    private float displayedScore;  // rolls towards the real score
    private float scorePop;        // 1 -> 0, makes the score pop/flash
    private float levelPop, linesPop, comboPop, bestPop;
    private float rotatePop;       // piece "boing" after rotating
    private float nextPop;         // next-piece preview pops in
    private float bannerTimer = -1f;
    private string popupText = "";
    private float popupTimer;
    private Color popupColor = Color.white;

    private class FloatingText
    {
        public Vector2 world; public string text; public Color color; public float age, life, size;
    }
    private readonly List<FloatingText> floaters = new List<FloatingText>();

    // ---------------- Scene objects ----------------
    private GameApp app;
    private SpriteRenderer[,] cellRenderers;
    private SpriteRenderer[] pieceRenderers, ghostRenderers, nextRenderers;
    private SpriteRenderer[] verticalLines, horizontalLines;
    private SpriteRenderer borderRenderer, panelRenderer, nextBorder, nextPanel;
    private GameObject boardRoot;
    private static readonly Vector2 NextPreviewCenter = new Vector2(8.5f, 6.5f);

    public bool IsActive { get { return active; } }
    public bool IsPaused { get { return paused; } }
    public int Score { get { return score; } }

    // ============================================================
    // Setup
    // ============================================================

    public void Init(GameApp owner)
    {
        app = owner;
        BuildBoardVisuals();
        Hide();
    }

    private void BuildBoardVisuals()
    {
        boardRoot = new GameObject("Board");
        Transform root = boardRoot.transform;

        // Frame: a colored border behind a dark panel.
        borderRenderer = SpriteFactory.CreateRenderer("Border", root, SpriteFactory.Square, -12, Color.white);
        borderRenderer.transform.localScale = new Vector3(Width + 0.35f, Height + 0.35f, 1f);
        panelRenderer = SpriteFactory.CreateRenderer("Panel", root, SpriteFactory.Square, -11, StageData.Panel[0]);
        panelRenderer.transform.localScale = new Vector3(Width, Height, 1f);

        // Grid lines (their brightness pulses in a wave, see AnimateGrid).
        verticalLines = new SpriteRenderer[Width - 1];
        for (int x = 1; x < Width; x++)
        {
            SpriteRenderer line = SpriteFactory.CreateRenderer("GridV", root, SpriteFactory.Square, -10, Color.clear);
            line.transform.localPosition = new Vector3(x - Width / 2f, 0f, 0f);
            line.transform.localScale = new Vector3(0.04f, Height, 1f);
            verticalLines[x - 1] = line;
        }
        horizontalLines = new SpriteRenderer[Height - 1];
        for (int y = 1; y < Height; y++)
        {
            SpriteRenderer line = SpriteFactory.CreateRenderer("GridH", root, SpriteFactory.Square, -10, Color.clear);
            line.transform.localPosition = new Vector3(0f, y - Height / 2f, 0f);
            line.transform.localScale = new Vector3(Width, 0.04f, 1f);
            horizontalLines[y - 1] = line;
        }

        // One renderer per cell for locked blocks (enabled only when filled).
        cellRenderers = new SpriteRenderer[Width, Height];
        for (int x = 0; x < Width; x++)
            for (int y = 0; y < Height; y++)
            {
                cellRenderers[x, y] = SpriteFactory.CreateRenderer("Cell", root, SpriteFactory.Block, 0, Color.white);
                cellRenderers[x, y].enabled = false;
            }

        pieceRenderers = CreateBlockSet("Piece", 2);
        ghostRenderers = CreateBlockSet("Ghost", 1);
        nextRenderers = CreateBlockSet("Next", 2);

        // Little frame behind the next-piece preview.
        nextBorder = SpriteFactory.CreateRenderer("NextBorder", root, SpriteFactory.Square, -12, Color.white);
        nextBorder.transform.localPosition = NextPreviewCenter;
        nextBorder.transform.localScale = new Vector3(5.35f, 4.35f, 1f);
        nextPanel = SpriteFactory.CreateRenderer("NextPanel", root, SpriteFactory.Square, -11, StageData.Panel[0]);
        nextPanel.transform.localPosition = NextPreviewCenter;
        nextPanel.transform.localScale = new Vector3(5f, 4f, 1f);
    }

    private SpriteRenderer[] CreateBlockSet(string name, int order)
    {
        var set = new SpriteRenderer[4];
        for (int i = 0; i < 4; i++)
            set[i] = SpriteFactory.CreateRenderer(name, boardRoot.transform, SpriteFactory.Block, order, Color.white);
        return set;
    }

    /// <summary>World position of the center of grid cell (x, y).</summary>
    public static Vector2 CellToWorld(float x, float y)
    {
        return new Vector2(x - Width / 2f + 0.5f, y - Height / 2f + 0.5f);
    }

    // ============================================================
    // Game flow
    // ============================================================

    /// <summary>Starts a new game at the chosen stage (0-4).</summary>
    public void Begin(int firstStage)
    {
        startStage = StageData.Clamp(firstStage);
        active = true;
        boardRoot.SetActive(true);
        NewGame();
    }

    /// <summary>Hides the board and stops the game (used by menus).</summary>
    public void Hide()
    {
        active = false;
        paused = false;
        if (boardRoot != null) boardRoot.SetActive(false);
        if (MusicManager.Instance != null) MusicManager.Instance.SetPaused(false);
        if (app != null && app.Fx != null) app.Fx.Paused = false;
    }

    private void NewGame()
    {
        for (int x = 0; x < Width; x++)
            for (int y = 0; y < Height; y++)
            {
                grid[x, y] = 0;
                squashTime[x, y] = -1f;
                dropOffset[x, y] = 0f;
            }
        bag.Clear();
        score = 0; lines = 0; combo = -1;
        level = startStage + 1;
        stage = startStage;
        displayedScore = 0f;
        paused = false;
        clearingRows.Clear();
        floaters.Clear();
        popupTimer = 0f;
        bestAtStart = HighScores.Best;
        beatBest = false;
        app.Fx.ClearAll();
        app.Fx.Paused = false;

        MusicManager.Instance.ResetSpeed();
        MusicManager.Instance.SetPaused(false);
        EnterStage(stage, true);

        state = State.Playing;
        nextType = TakeFromBag();
        SpawnPiece();
    }

    /// <summary>Switches music, background and colors to a stage, with a splashy banner.</summary>
    private void EnterStage(int newStage, bool instant)
    {
        stage = newStage;
        HighScores.MaxStageReached = stage;
        MusicManager.Instance.PlayTrack(stage, true);
        app.Backgrounds.ShowStage(stage, false);
        panelRenderer.color = StageData.Panel[stage];
        nextPanel.color = StageData.Panel[stage];
        bannerTimer = 0f;
        SfxManager.Play(Sfx.Punch);
        SfxManager.Play(Sfx.Swoosh, 0.8f);
        if (!instant)
        {
            app.Shake.AddShake(0.35f);
            app.Fx.Confetti(new Vector2(0f, 4f), 60);
        }
    }

    /// <summary>7-bag randomizer: every 7 pieces contain each shape exactly once.</summary>
    private int TakeFromBag()
    {
        if (bag.Count == 0)
        {
            for (int i = 0; i < Tetromino.Count; i++) bag.Add(i);
            // Fisher-Yates shuffle
            for (int i = bag.Count - 1; i > 0; i--)
            {
                int j = Random.Range(0, i + 1);
                int tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp;
            }
        }
        int piece = bag[0];
        bag.RemoveAt(0);
        return piece;
    }

    private void SpawnPiece()
    {
        currentType = nextType;
        nextType = TakeFromBag();
        nextPop = 1f;
        currentRotation = 0;
        int n = Tetromino.BoxSize[currentType];
        currentPos = new Vector2Int((Width - n) / 2, Height - n);
        fallTimer = 0f;
        lockTimer = 0f;

        if (!Fits(currentType, currentRotation, currentPos))
            StartGameOver();
    }

    private bool Fits(int type, int rotation, Vector2Int pos)
    {
        foreach (Vector2Int c in Tetromino.GetCells(type, rotation))
        {
            int x = pos.x + c.x, y = pos.y + c.y;
            if (x < 0 || x >= Width || y < 0 || y >= Height) return false;
            if (grid[x, y] != 0) return false;
        }
        return true;
    }

    private bool TryMove(int dx, int dy)
    {
        var target = new Vector2Int(currentPos.x + dx, currentPos.y + dy);
        if (!Fits(currentType, currentRotation, target)) return false;
        currentPos = target;
        return true;
    }

    private void TryRotate()
    {
        int newRotation = (currentRotation + 1) % 4;
        foreach (Vector2Int kick in Kicks)
        {
            Vector2Int target = currentPos + kick;
            if (Fits(currentType, newRotation, target))
            {
                currentRotation = newRotation;
                currentPos = target;
                rotatePop = 1f;
                SfxManager.Play(Sfx.Rotate);
                return;
            }
        }
    }

    private float FallInterval()
    {
        // Gets faster every level, but never faster than 20 rows per second.
        return Mathf.Max(0.05f, 0.8f * Mathf.Pow(0.82f, level - 1));
    }

    private void SetPaused(bool value)
    {
        paused = value;
        app.Fx.Paused = paused;
        MusicManager.Instance.SetPaused(paused);
        SfxManager.Play(Sfx.Pause, 1f, paused ? 1f : 1.25f);
    }

    // ============================================================
    // Update loop
    // ============================================================

    private void Update()
    {
        if (!active) return;
        float dt = Time.deltaTime;
        bool playing = state == State.Playing || state == State.Clearing;

        if (Input.GetKeyDown(KeyCode.R) && state != State.Finished) { NewGame(); return; }
        if (playing && (Input.GetKeyDown(KeyCode.P) || Input.GetKeyDown(KeyCode.Escape)))
            SetPaused(!paused);
        if (paused && Input.GetKeyDown(KeyCode.Q)) { app.ShowTitle(); return; }

        if (!paused)
        {
            switch (state)
            {
                case State.Playing:
                    HandleInput(dt);
                    if (state == State.Playing) HandleGravity(dt);
                    break;
                case State.Clearing:
                    UpdateClearing(dt);
                    break;
                case State.GameOverAnim:
                    UpdateGameOverAnimation(dt);
                    break;
            }
            UpdateAnimationTimers(dt);
        }

        RefreshVisuals(paused ? 0f : dt);
    }

    private void HandleInput(float dt)
    {
        bool left = Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A);
        bool right = Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D);
        int dir = (right ? 1 : 0) - (left ? 1 : 0);

        // Tap to move once; hold to auto-repeat (DAS).
        if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A))
        { Move(-1); holdDirection = -1; holdTimer = MoveRepeatDelay; }
        else if (Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D))
        { Move(1); holdDirection = 1; holdTimer = MoveRepeatDelay; }
        else if (dir != 0 && dir == holdDirection)
        {
            holdTimer -= dt;
            if (holdTimer <= 0f) { Move(dir); holdTimer = MoveRepeatRate; }
        }
        else if (dir != holdDirection)
        {
            holdDirection = dir;
            holdTimer = MoveRepeatDelay;
        }

        if (Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W))
            TryRotate();

        // Soft drop: +1 point per row.
        if (Input.GetKeyDown(KeyCode.DownArrow) || Input.GetKeyDown(KeyCode.S)) softDropTimer = 0f;
        if (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S))
        {
            softDropTimer -= dt;
            if (softDropTimer <= 0f)
            {
                softDropTimer = SoftDropRate;
                if (TryMove(0, -1))
                {
                    AddScore(1, false);
                    fallTimer = 0f;
                    SfxManager.Play(Sfx.SoftDrop, 0.7f);
                }
            }
        }

        if (Input.GetKeyDown(KeyCode.Space))
            HardDrop();
    }

    private void Move(int dx)
    {
        if (TryMove(dx, 0)) SfxManager.Play(Sfx.MoveTick);
    }

    private void HandleGravity(float dt)
    {
        bool grounded = !Fits(currentType, currentRotation, new Vector2Int(currentPos.x, currentPos.y - 1));
        if (grounded)
        {
            // Give the player a short moment to slide/rotate before locking.
            lockTimer += dt;
            if (lockTimer >= LockDelay) LockPiece(false);
            return;
        }

        lockTimer = 0f;
        fallTimer += dt;
        if (fallTimer >= FallInterval())
        {
            fallTimer = 0f;
            TryMove(0, -1);
        }
    }

    private void HardDrop()
    {
        int startY = currentPos.y;
        while (TryMove(0, -1)) { }
        int distance = startY - currentPos.y;
        if (distance > 0) AddScore(distance * 2, false);

        // Streaky trail from where each block started to where it landed.
        Color color = Tetromino.Colors[currentType];
        if (distance > 0)
        {
            foreach (Vector2Int c in Tetromino.GetCells(currentType, currentRotation))
            {
                Vector2 end = CellToWorld(currentPos.x + c.x, currentPos.y + c.y);
                app.Fx.HardDropTrail(end + Vector2.up * distance, end, color);
            }
        }
        app.Shake.AddShake(0.25f);
        SfxManager.Play(Sfx.HardDrop);
        LockPiece(true);
    }

    private void AddScore(int points, bool big)
    {
        score += points;
        scorePop = Mathf.Max(scorePop, big ? 1f : 0.35f);
        if (!beatBest && bestAtStart > 0 && score > bestAtStart)
        {
            beatBest = true;
            bestPop = 1f;
            AddFloater(new Vector2(8.5f, -6.5f), "NEW BEST!", new Color(1f, 0.9f, 0.2f), 1.2f, 1.8f);
            SfxManager.Play(Sfx.LevelUp, 0.8f, 1.2f);
        }
    }

    private void LockPiece(bool hardDrop)
    {
        Color color = Tetromino.Colors[currentType];
        Vector2Int[] cells = Tetromino.GetCells(currentType, currentRotation);

        foreach (Vector2Int c in cells)
        {
            int x = currentPos.x + c.x, y = currentPos.y + c.y;
            grid[x, y] = currentType + 1;
            squashTime[x, y] = 0f; // start the squash/bounce animation
            dropOffset[x, y] = 0f;
        }

        // Dust puff under every block whose bottom face is exposed.
        foreach (Vector2Int c in cells)
        {
            int x = currentPos.x + c.x, y = currentPos.y + c.y;
            bool blockBelowIsSamePiece = y > 0 && ContainsCell(cells, new Vector2Int(c.x, c.y - 1));
            if (!blockBelowIsSamePiece)
                app.Fx.LockPuff(CellToWorld(x, y) + Vector2.down * 0.5f, color, hardDrop);
        }
        if (!hardDrop) SfxManager.Play(Sfx.Lock);

        // Find full rows.
        clearingRows.Clear();
        for (int y = 0; y < Height; y++)
        {
            bool full = true;
            for (int x = 0; x < Width && full; x++) full = grid[x, y] != 0;
            if (full) clearingRows.Add(y);
        }

        if (clearingRows.Count > 0) StartLineClear();
        else { combo = -1; SpawnPiece(); }
    }

    private static bool ContainsCell(Vector2Int[] cells, Vector2Int cell)
    {
        foreach (Vector2Int c in cells) if (c == cell) return true;
        return false;
    }

    // ============================================================
    // Line clears
    // ============================================================

    private void StartLineClear()
    {
        int count = clearingRows.Count;
        state = State.Clearing;
        clearTimer = 0f;
        combo++;

        // Particle burst from every cleared block, in that block's color.
        foreach (int y in clearingRows)
            for (int x = 0; x < Width; x++)
                app.Fx.LineClearBurst(CellToWorld(x, y), Tetromino.Colors[grid[x, y] - 1]);

        // Scoring: line points x level, plus a combo bonus for back-to-back clears.
        int points = LineScores[count] * level;
        int comboBonus = combo > 0 ? 50 * combo * level : 0;
        AddScore(points + comboBonus, true);
        lines += count;
        linesPop = 1f;

        // Floating "+points" at the cleared rows.
        float midRow = (clearingRows[0] + clearingRows[count - 1]) / 2f;
        Vector2 mid = CellToWorld((Width - 1) / 2f, midRow);
        AddFloater(mid, "+" + (points + comboBonus), Color.Lerp(Color.white, new Color(1f, 0.9f, 0.3f), count / 4f), 0.9f + 0.2f * count, 1.3f);
        if (combo > 0)
        {
            comboPop = 1f;
            AddFloater(mid + Vector2.down * 1.5f, "COMBO x" + (combo + 1) + "!", new Color(0.4f, 1f, 1f), 0.8f, 1.3f);
        }

        popupText = ClearNames[count];
        popupTimer = 1f;
        popupColor = Color.white;
        SfxManager.Play(ClearSounds[count], 1f, 1f + Mathf.Max(0, combo) * 0.06f);

        if (count == 4)
        {
            app.Fx.QuadCelebration(mid);
            app.Shake.AddShake(0.75f);
            popupColor = new Color(1f, 0.9f, 0.3f);
            SfxManager.Play(Sfx.QuadFanfare);
        }
        else
        {
            app.Shake.AddShake(0.12f * count);
        }

        // Level (speed) goes up every 10 lines; so does the stage, up to stage 5.
        int newLevel = startStage + 1 + lines / StageData.LinesPerStage;
        if (newLevel > level)
        {
            level = newLevel;
            levelPop = 1f;
            popupText += "\nLEVEL UP!";
            SfxManager.Play(Sfx.LevelUp);
            int newStage = StageData.Clamp(level - 1);
            if (newStage != stage) EnterStage(newStage, false);
        }
    }

    private void UpdateClearing(float dt)
    {
        clearTimer += dt;
        if (clearTimer < ClearDuration) return;

        CollapseRows();
        state = State.Playing;
        SpawnPiece();
    }

    /// <summary>Removes the cleared rows and moves everything above down.
    /// Moved blocks get a visual offset so they slide down smoothly.</summary>
    private void CollapseRows()
    {
        int writeY = 0;
        for (int y = 0; y < Height; y++)
        {
            if (clearingRows.Contains(y)) continue;
            if (writeY != y)
            {
                for (int x = 0; x < Width; x++)
                {
                    grid[x, writeY] = grid[x, y];
                    squashTime[x, writeY] = squashTime[x, y];
                    // remember how far it fell so it can animate the fall
                    dropOffset[x, writeY] = grid[x, y] != 0 ? dropOffset[x, y] + (y - writeY) : 0f;
                }
            }
            writeY++;
        }
        for (int y = writeY; y < Height; y++)
            for (int x = 0; x < Width; x++)
            {
                grid[x, y] = 0;
                squashTime[x, y] = -1f;
                dropOffset[x, y] = 0f;
            }
        clearingRows.Clear();
    }

    // ============================================================
    // Game over
    // ============================================================

    private void StartGameOver()
    {
        state = State.GameOverAnim;
        gameOverTimer = 0f;
        gameOverRow = Height - 1;
        app.Shake.AddShake(0.5f);
        popupText = "";
        popupTimer = 0f;
        SfxManager.Play(Sfx.GameOver);
        MusicManager.Instance.SlowDown();
    }

    /// <summary>Row by row (top to bottom) the blocks pop off the board,
    /// tumble down with gravity and fade away.</summary>
    private void UpdateGameOverAnimation(float dt)
    {
        gameOverTimer += dt;
        while (gameOverRow >= 0 && gameOverTimer >= (Height - 1 - gameOverRow) * GameOverRowDelay)
        {
            for (int x = 0; x < Width; x++)
            {
                if (grid[x, gameOverRow] == 0) continue;
                app.Fx.Debris(CellToWorld(x, gameOverRow), Tetromino.Colors[grid[x, gameOverRow] - 1]);
                grid[x, gameOverRow] = 0;
            }
            gameOverRow--;
        }
        if (gameOverRow < 0 && gameOverTimer > Height * GameOverRowDelay + 1.6f)
        {
            state = State.Finished;
            app.OnGameOverFinished(score, lines, level, stage);
        }
    }

    // ============================================================
    // Visuals
    // ============================================================

    private void AddFloater(Vector2 world, string text, Color color, float size, float life)
    {
        floaters.Add(new FloatingText { world = world, text = text, color = color, size = size, life = life });
    }

    private void UpdateAnimationTimers(float dt)
    {
        scorePop = Mathf.Max(0f, scorePop - dt * 2.5f);
        levelPop = Mathf.Max(0f, levelPop - dt * 1.5f);
        linesPop = Mathf.Max(0f, linesPop - dt * 3f);
        comboPop = Mathf.Max(0f, comboPop - dt * 2f);
        bestPop = Mathf.Max(0f, bestPop - dt * 1f);
        rotatePop = Mathf.Max(0f, rotatePop - dt * 8f);
        nextPop = Mathf.Max(0f, nextPop - dt * 4f);
        popupTimer = Mathf.Max(0f, popupTimer - dt * 0.8f);
        if (bannerTimer >= 0f) { bannerTimer += dt; if (bannerTimer > BannerDuration) bannerTimer = -1f; }

        for (int i = floaters.Count - 1; i >= 0; i--)
        {
            floaters[i].age += dt;
            if (floaters[i].age >= floaters[i].life) floaters.RemoveAt(i);
        }

        // Score rolls up smoothly instead of jumping.
        float gap = score - displayedScore;
        displayedScore = Mathf.MoveTowards(displayedScore, score, dt * Mathf.Max(40f, gap * 5f));
    }

    private void RefreshVisuals(float dt)
    {
        AnimateGrid();
        DrawLockedBlocks(dt);
        DrawCurrentPiece();
        DrawNextPiece();
    }

    /// <summary>Grid lines glow in a slow travelling wave; colors follow the stage palette.</summary>
    private void AnimateGrid()
    {
        float t = Time.time;
        Color accent = StageData.Accent[stage];
        for (int i = 0; i < verticalLines.Length; i++)
            verticalLines[i].color = new Color(accent.r, accent.g, accent.b, 0.07f + 0.05f * Mathf.Sin(t * 1.5f - i * 0.5f));
        for (int i = 0; i < horizontalLines.Length; i++)
            horizontalLines[i].color = new Color(accent.r, accent.g, accent.b, 0.07f + 0.05f * Mathf.Sin(t * 1.5f - i * 0.35f));

        // Border glows and flares on level-up; Glitch Dimension randomly flickers it.
        float glow = 0.7f + 0.2f * Mathf.Sin(t * 2f) + 0.5f * levelPop;
        Color border = Color.Lerp(accent * glow, Color.white, levelPop * 0.5f);
        if (stage == 4 && Random.value < 0.04f) border = Color.HSVToRGB(Random.value, 0.8f, 1f);
        border.a = 1f;
        borderRenderer.color = border;
        nextBorder.color = border;
    }

    private void DrawLockedBlocks(float dt)
    {
        float clearT = state == State.Clearing ? Mathf.Clamp01(clearTimer / ClearDuration) : 0f;

        for (int x = 0; x < Width; x++)
        {
            for (int y = 0; y < Height; y++)
            {
                SpriteRenderer sr = cellRenderers[x, y];
                if (grid[x, y] == 0) { sr.enabled = false; continue; }
                sr.enabled = true;

                Color color = Tetromino.Colors[grid[x, y] - 1];
                Vector3 scale = Vector3.one;
                Vector2 pos = CellToWorld(x, y);

                // Rows collapsing: slide down to their new spot, then bounce.
                if (dropOffset[x, y] > 0f)
                {
                    float before = dropOffset[x, y];
                    dropOffset[x, y] = Mathf.MoveTowards(before, 0f, dt * (10f + before * 10f));
                    if (dropOffset[x, y] <= 0f) squashTime[x, y] = 0.08f; // small landing bounce
                    pos.y += dropOffset[x, y];
                }

                // Squash & bounce after locking: a damped wobble.
                if (squashTime[x, y] >= 0f)
                {
                    float t = squashTime[x, y];
                    float wobble = Mathf.Exp(-t * 9f) * Mathf.Cos(t * 28f);
                    scale = new Vector3(1f + 0.22f * wobble, 1f - 0.22f * wobble, 1f);
                    pos.y -= 0.5f * (1f - scale.y); // keep the block sitting on the floor
                    color = Color.Lerp(color, Color.white, 0.5f * Mathf.Exp(-t * 12f)); // brief bright flash
                    squashTime[x, y] = t + dt;
                    if (squashTime[x, y] > 0.6f) squashTime[x, y] = -1f;
                }

                // Rows being cleared: flash white, then shrink away, sweeping out from the center.
                if (state == State.Clearing && clearingRows.Contains(y))
                {
                    float delay = Mathf.Abs(x - (Width - 1) / 2f) * 0.04f;
                    float local = Mathf.Clamp01((clearT - delay) / 0.8f);
                    float flash = Mathf.Clamp01(local * 4f);
                    color = Color.Lerp(color, Color.white, flash);
                    float shrink = 1f - Mathf.SmoothStep(0f, 1f, Mathf.Clamp01((local - 0.25f) / 0.75f));
                    scale = new Vector3(shrink * (1f + 0.3f * flash), shrink, 1f);
                }

                sr.color = color;
                sr.transform.localPosition = new Vector3(pos.x, pos.y, 0f);
                sr.transform.localScale = scale;
            }
        }
    }

    private void DrawCurrentPiece()
    {
        bool visible = state == State.Playing;
        for (int i = 0; i < 4; i++)
        {
            pieceRenderers[i].enabled = visible;
            ghostRenderers[i].enabled = visible;
        }
        if (!visible) return;

        // The ghost shows where a hard drop would land.
        int ghostY = currentPos.y;
        while (Fits(currentType, currentRotation, new Vector2Int(currentPos.x, ghostY - 1))) ghostY--;

        Color color = Tetromino.Colors[currentType];
        Color ghostColor = color;
        ghostColor.a = 0.22f + 0.08f * Mathf.Sin(Time.time * 5f);

        // A tiny "boing" after rotating, and a flicker while about to lock.
        float pop = 1f + 0.15f * rotatePop;
        float lockGlow = lockTimer / LockDelay;
        Color pieceColor = Color.Lerp(color, Color.white, 0.35f * lockGlow * (0.5f + 0.5f * Mathf.Sin(Time.time * 30f)));

        Vector2Int[] cells = Tetromino.GetCells(currentType, currentRotation);
        for (int i = 0; i < 4; i++)
        {
            Vector2 p = CellToWorld(currentPos.x + cells[i].x, currentPos.y + cells[i].y);
            pieceRenderers[i].transform.localPosition = new Vector3(p.x, p.y, 0f);
            pieceRenderers[i].transform.localScale = new Vector3(pop, pop, 1f);
            pieceRenderers[i].color = pieceColor;

            Vector2 g = CellToWorld(currentPos.x + cells[i].x, ghostY + cells[i].y);
            ghostRenderers[i].transform.localPosition = new Vector3(g.x, g.y, 0f);
            ghostRenderers[i].transform.localScale = new Vector3(0.9f, 0.9f, 1f);
            ghostRenderers[i].color = ghostColor;
        }
    }

    private void DrawNextPiece()
    {
        bool visible = state == State.Playing || state == State.Clearing;
        Vector2Int[] cells = Tetromino.GetCells(nextType, 0);

        // Center the piece inside the preview box.
        Vector2 min = new Vector2(99f, 99f), max = new Vector2(-99f, -99f);
        foreach (Vector2Int c in cells)
        {
            min = Vector2.Min(min, c);
            max = Vector2.Max(max, c);
        }
        Vector2 center = (min + max) / 2f;
        float bob = Mathf.Sin(Time.time * 2f) * 0.12f;
        float scale = 0.85f * (1f + 0.4f * nextPop * Mathf.Sin(nextPop * Mathf.PI));

        for (int i = 0; i < 4; i++)
        {
            nextRenderers[i].enabled = visible;
            Vector2 offset = ((Vector2)cells[i] - center) * 0.85f;
            Vector2 p = NextPreviewCenter + offset + Vector2.up * bob;
            nextRenderers[i].transform.localPosition = new Vector3(p.x, p.y, 0f);
            nextRenderers[i].transform.localScale = new Vector3(scale, scale, 1f);
            nextRenderers[i].color = Tetromino.Colors[nextType];
        }
    }

    // ============================================================
    // HUD (immediate-mode OnGUI in virtual 720p units, see GuiKit)
    // ============================================================

    private Vector2 W2G(float x, float y) { return app.WorldToGui(new Vector2(x, y)); }

    private void OnGUI()
    {
        if (!active || app == null || !GuiKit.IsRepaint) return;
        GUI.depth = 5; // draw below menus/transitions
        GuiKit.Begin();
        float u = app.GuiUnitsPerWorldUnit;
        Color dim = new Color(0.75f, 0.8f, 1f);
        Color accent = StageData.Accent[stage];

        // ---- Right panel: next piece + big score + stats
        GuiKit.Text(W2G(NextPreviewCenter.x, 9.3f), "NEXT", 0.75f * u, dim);

        GuiKit.Text(W2G(8.5f, 3.4f), "SCORE", 0.7f * u, dim);
        Vector2 scorePos = W2G(8.5f, 2.0f);
        float pop = 1f + 0.45f * GuiKit.EaseOutBack(scorePop) * scorePop;
        Color scoreColor = Color.Lerp(Color.white, new Color(1f, 0.9f, 0.25f), scorePop);
        if (scorePop > 0.6f && Mathf.Repeat(Time.time * 20f, 1f) < 0.5f) scoreColor = Color.white; // flash
        GuiKit.Transform(scorePos, Mathf.Sin(Time.time * 30f) * 6f * scorePop, pop);
        GuiKit.RollingNumber(scorePos, displayedScore, 1.3f * u, scoreColor, 6);
        GuiKit.Reset();

        int best = Mathf.Max(bestAtStart, score);
        GuiKit.FancyText(W2G(8.5f, 0.6f), "BEST " + best, 0.55f * u,
                         Color.Lerp(new Color(1f, 0.85f, 0.4f), Color.white, bestPop), 0f, 1f + 0.4f * bestPop);

        GuiKit.Text(W2G(7f, -1.2f), "LEVEL", 0.55f * u, dim);
        GuiKit.FancyText(W2G(7f, -2.3f), level.ToString(), 0.95f * u,
                         Color.Lerp(Color.white, new Color(0.4f, 1f, 0.6f), levelPop), 0f, 1f + 0.8f * levelPop);
        GuiKit.Text(W2G(10f, -1.2f), "LINES", 0.55f * u, dim);
        GuiKit.FancyText(W2G(10f, -2.3f), lines.ToString(), 0.95f * u,
                         Color.Lerp(Color.white, new Color(0.4f, 0.9f, 1f), linesPop), 0f, 1f + 0.5f * linesPop);

        if (combo > 0)
            GuiKit.FancyText(W2G(8.5f, -4.0f), "COMBO x" + (combo + 1), 0.7f * u, new Color(0.4f, 1f, 1f),
                             Mathf.Sin(Time.time * 8f) * 4f, 1f + 0.6f * comboPop);

        // ---- Left panel: stage + controls
        GuiKit.Text(W2G(-8.8f, 9.0f), "STAGE " + (stage + 1), 0.6f * u, dim);
        GuiKit.FancyText(W2G(-8.8f, 8.0f), StageData.Names[stage], 0.62f * u, accent, Mathf.Sin(Time.time * 2f) * 3f, 1f);
        GuiKit.Text(W2G(-8.8f, 7.2f), StageData.Genres[stage], 0.38f * u, new Color(dim.r, dim.g, dim.b, 0.7f));
        GuiKit.Text(W2G(-8.8f, 2.5f),
            "Left/Right or A/D : Move\nUp or W : Rotate\nDown or S : Soft drop\nSpace : Hard drop\nP / Esc : Pause\nR : Restart\nM : Mute   N : Music",
            0.42f * u, new Color(dim.r, dim.g, dim.b, 0.8f), 1.5f);

        // ---- Floating "+points" and combo texts that rise and fade
        foreach (FloatingText f in floaters)
        {
            float t = f.age / f.life;
            Vector2 p = W2G(f.world.x, f.world.y + t * 2.5f);
            float appear = GuiKit.EaseOutBack(Mathf.Clamp01(f.age * 6f));
            Color c = f.color; c.a = 1f - t * t;
            GuiKit.FancyText(p, f.text, f.size * u, c, Mathf.Sin(f.age * 10f) * 5f * (1f - t), appear, 2.5f);
        }

        // ---- Big popup (SINGLE / QUAD SMASH! / LEVEL UP!)
        if (popupTimer > 0f && popupText.Length > 0)
        {
            float rise = (1f - popupTimer) * 3f;
            Color c = popupColor;
            c.a = Mathf.Clamp01(popupTimer * 2f);
            float s = 1f + 0.5f * Mathf.Clamp01((popupTimer - 0.8f) * 5f);
            GuiKit.FancyText(W2G(0f, 3f + rise), popupText, 1.3f * u, c, Mathf.Sin(Time.time * 12f) * 4f, s, 3f);
        }

        DrawStageBanner(u);

        Vector2 boardCenter = W2G(0f, 0f);
        if (paused)
        {
            GuiKit.Rect(new Rect(0, 0, GuiKit.Width, GuiKit.Height), new Color(0f, 0f, 0f, 0.45f));
            GuiKit.FancyText(boardCenter, "PAUSED", 1.6f * u, Color.white, Mathf.Sin(Time.time * 3f) * 3f, 1f, 3f);
            GuiKit.Text(W2G(0f, -1.8f), "P / Esc : resume     Q : quit to title", 0.55f * u, new Color(1f, 1f, 1f, 0.85f));
        }
        else if (state == State.GameOverAnim)
        {
            float appear = Mathf.Clamp01(gameOverTimer / 0.6f);
            float wobble = Mathf.Sin(Time.time * 4f) * 5f;
            GuiKit.FancyText(boardCenter + Vector2.up * (1f - GuiKit.EaseOutBounce(appear)) * -300f, "GAME OVER", 1.6f * u,
                             new Color(1f, 0.35f, 0.4f, appear), wobble, 1f + 0.06f * Mathf.Sin(Time.time * 6f), 3f);
        }
    }

    /// <summary>"STAGE 3 - CYBER JUNGLE" banner that punches in, holds, and swooshes out.</summary>
    private void DrawStageBanner(float u)
    {
        if (bannerTimer < 0f) return;
        float t = bannerTimer;
        float screenW = GuiKit.Width;
        float x;
        if (t < 0.4f) x = Mathf.LerpUnclamped(-screenW, 0f, GuiKit.EaseOutBack(t / 0.4f));
        else if (t < BannerDuration - 0.4f) x = 0f;
        else x = Mathf.Lerp(0f, screenW * 1.2f, (t - (BannerDuration - 0.4f)) / 0.4f);

        Vector2 center = new Vector2(screenW / 2f + x, GuiKit.Height * 0.38f);
        Color accent = StageData.Accent[stage];
        float wobble = Mathf.Sin(t * 9f) * 2f;

        GuiKit.Star(center + new Vector2(-260f, 0f), 220f + 20f * Mathf.Sin(t * 12f), t * 90f, new Color(1f, 0.9f, 0.2f));
        GuiKit.Transform(center, -5f + wobble, 1f);
        GuiKit.Panel(new Rect(center.x - 330f, center.y - 70f, 660f, 140f), new Color(accent.r * 0.6f, accent.g * 0.6f, accent.b * 0.6f, 0.95f));
        GuiKit.Reset();
        GuiKit.FancyText(center + new Vector2(-260f, 0f), "POW!", 46f, new Color(1f, 0.3f, 0.2f), -15f, 1f, 3f);
        GuiKit.FancyText(center + new Vector2(30f, -32f), "STAGE " + (stage + 1), 34f, Color.white, -5f + wobble, 1f, 2f);
        GuiKit.FancyText(center + new Vector2(30f, 20f), StageData.Names[stage], 52f, Color.Lerp(accent, Color.white, 0.4f), -5f + wobble,
                         1f + 0.08f * Mathf.Sin(t * 14f), 3f);
    }
}
