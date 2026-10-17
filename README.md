# BLOCK BONANZA

A silly, splashy falling-block puzzler built for phones. Pure HTML5 canvas + Web Audio, no dependencies.

**Play:** https://alis0712.github.io/block-bonanza/

On iPhone: open the link in Safari, tap **Share → Add to Home Screen** to launch it fullscreen like an app.

## Controls
- **Tap**: rotate
- **Swipe left/right**: move (keep dragging to slide cell by cell)
- **Swipe down**: soft drop, **fast flick down**: hard drop
- On-screen buttons at the bottom (toggle in Pause menu)
- Keyboard: ← → move, ↑/X rotate, Z rotate back, ↓ soft drop, Space hard drop, P pause, M mute, N music

## How it plays
Each falling piece is one of the 7 classic shapes, but every block has its own color
(blue circle, yellow triangle, pink diamond, teal plus, plus orange star from stage 5, so colors stay readable for colorblind players).
Rows never clear. After a piece lands, any group of **4 or more touching blocks of one color pops**.
Blocks above fall down, and new matches set off **CHAIN x2, x3...** combos. Groups of 8 or more score a **MEGA POP!**

Scoring: 10 per popped block plus a big-group bonus, times chain multiplier, times level.
Pop 50 blocks to level up (faster gravity). Pop 150 to reach the next stage, and each stage adds a twist:

1. **Neon City**: just colors
2. **Deep Space**: rainbow wildcard blocks match any color
3. **Cyber Jungle**: vine blocks in pieces and rising from below. They break only when a match pops next to them
4. **Volcano Core**: a lava row rises every 20 s (warning glow + rumble). Lava breaks only when a match pops next to it
5. **Glitch Dimension**: 5 colors, and settled blocks flicker and then swap colors

Also: ghost piece, lock delay, SRS wall kicks, particles and screen shake, animated backgrounds and a procedural techno
track per stage, top-10 best scores with initials (saved on the device).

## Sound on iPhone
Tap anywhere once to turn sound on (the title screen shows SOUND ON / TAP FOR SOUND). If it's still silent,
check the ring/silent switch and the volume buttons.

`icons.tar.b64` holds the app icons (base64 tar); a small GitHub Action unpacks them into the PNGs at the root.
