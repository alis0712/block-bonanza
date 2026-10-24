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

Scoring is shown in dollars ($10 per popped block plus a big-group bonus, times chain multiplier, times level). Big gains rain coins and MEGA POP / COMEBACK ring the cash register.
Pop 50 blocks to level up (faster gravity). Pop 150 to reach the next stage, and each stage adds a twist:

1. **Tropical Tides**: just colors. Sunny ocean with gentle rolling wave layers, shimmering sun reflections, foam and little splashes lapping the island shore, rising bubbles, swaying palms, jumping fish, seagulls
2. **Sewer Lair**: rainbow wildcard blocks match any color. Murky water with slow current streaks, ripples where drips land, bubbles that surface and pop, flickering lamps, and a gently bobbing alligator whose eyes blink in the water
3. **Neo Metropolis**: steel girder blocks in pieces and rising from below. They break only when a match pops next to them. Parallax skyline, holo billboards, flying cars
4. **Storm Planet**: a storm rock row surges up every 20 s ("STORM SURGE!"). It breaks only when a match pops next to it. Two moons, howling wind, lightning with delayed thunder
5. **Event Horizon**: 5 colors and gravity distortion. Space warps and settled blocks swap colors. Black hole with a spinning accretion disk and stars being spaghettified
6. **Deep Sea Abyss**: dim blocks sit dark in the deep and can't match until a pop next to them lights them up. Glowing anglerfish, jellyfish, god rays, caustics and marine snow
7. **Crystal Caverns**: frozen blocks need two pops next to them (the ice cracks, then shatters). Sparkling crystal clusters, dripping stalactites and pool ripples
8. **Clockwork Factory**: a conveyor row near the bottom slides one step every few seconds (arrows warn first, direction flips now and then). Meshing gears, steam vents, pistons and a pressure gauge
9. **Haunted Forest**: drifting fog briefly hides part of the board. Twisted trees, blinking eyes in the dark, wisps, and a path leading to the tomb
10. **Vampire's Tomb (FINAL BOSS)**: Count Blockula watches from his tomb. Every pop drains his health bar (chains hit harder); bat swarms now and then drop spider webs that tear when a match pops next to them. Blood moon, lightning, spiders, bats and jack-o'-lanterns. Drain his health to **WIN**: a victory screen, a **$25,000 victory bonus** banked into your wallet, and a high score entry

The boss doesn't get meaner as he weakens beyond one gentle step (bat swarms come a little more often below 35%), and gravity levels off in the late stages so a steady player can reach and beat him.

**Danger zone + COMEBACK!** When the stack climbs into the top rows the board glows red, an alarm sounds and the music
switches into an alarm layer. Get back below the safe line after at least 3 seconds in danger and you earn a **COMEBACK!**:
a synth-brass fanfare that lands on the beat, a green/cyan burst and a **$500 x level** bonus, then the normal track fades back in.

## Wallet + STORE
Every game's cash is **banked** into a wallet when the game ends ("Banked +$X"), saved on the device. The wallet shows on the
title screen and in the **STORE** (title menu). Everything is bought with in-game cash only; there are no real-money purchases.

- **Power-ups** (kept in inventory): **Row Wipe** $1,000 (a laser sweeps the bottom row away) and **Bomb Block** $2,000
  (your next piece is a bomb that blasts a 3x3 area). In a game, tap the ⚡ button in the HUD: the game pauses and a quick
  menu shows how many you own and lets you USE one or BUY more with wallet cash.
- **Backgrounds** (cosmetic, overrides the stage scenery): any stage theme ($5,000–$35,000; Tropical Tides is free, Vampire's Tomb is $35,000)
  plus store exclusives **Candy Land** $20,000, **Retro Arcade** $25,000, **Sunset Desert** $30,000. Pick STAGE THEMES to go back to automatic.
- **Block skins**: Classic Glossy (free), Neon Outline $8,000, Pixel Retro $10,000, Jelly $15,000, Gemstone $40,000.
  Every skin keeps the colors and symbols readable.

## Editions
- **FREE** (the default): the wallet starts at $0. Planned to carry minimal ads; none are implemented yet (`maybeShowAd()` is the hook and only counts requests).
- **FULL** (purchased): no ads at all, plus a one-time **$1,000** starting bonus. Switching FREE → FULL grants it once (never again, even after switching back).
- The title shows a FREE / FULL badge. **UPGRADE TO FULL** in the store is a placeholder ("coming soon").
- **Developer toggle:** tap the BLOCK BONANZA logo **5 times** quickly to switch editions, or open the game with
  `?edition=full` / `?edition=free` (e.g. https://alis0712.github.io/block-bonanza/?edition=full).
- Code hooks for real IAP and ads later: `isFullEdition()`, `grantFullEditionBonus()`, `setEdition()`, `IAP.purchaseFullEdition()`, `maybeShowAd()`.

## Music
Every track is generated live in Web Audio, with no audio files: a punchy kick with a sub tail and sidechain pumping, detuned
supersaw leads and pads, a 303-style acid bass, FM arpeggios, metallic hats and rides, laser zaps, risers and white-noise
uplifters, glitch stutter and bitcrush fills every 8/16 bars, ping-pong delay and convolution reverb, all through a
compressor and limiter. Tracks are arranged in sections (intro, build, drop, breakdown) so they keep changing.
Title: cyber anthem 128 BPM, Tropical Tides: synthwave techno 120, Sewer Lair: trance techno 126, Neo Metropolis: breakbeat 130,
Storm Planet: industrial 136, Event Horizon: hard glitch 145, Deep Sea Abyss: sonar dub techno 122, Crystal Caverns: bell-tone trance 132,
Clockwork Factory: tick-tock industrial 138, Haunted Forest: dark techno with a ghostly choir 126, Vampire's Tomb: spooky techno 140 with a church organ, choir and procedural evil laughs. A new stage drops in on the next bar after a noise uplifter.

All backgrounds are drawn procedurally on canvas: static scenery is pre-rendered once, and only the moving parts animate.

Developer shortcut: `?stage=N` (1–10) starts a new game at that stage, e.g. https://alis0712.github.io/block-bonanza/?stage=10

Also: ghost piece, lock delay, SRS wall kicks, particles and screen shake, animated backgrounds and a procedural techno
track per stage, top-10 best scores with initials, wallet and store items (all saved on the device).

## Sound on iPhone
Tap anywhere once to turn sound on (the title screen shows SOUND ON / TAP FOR SOUND). If it's still silent,
check the ring/silent switch and the volume buttons.

`icons.tar.b64` holds the app icons (base64 tar); a small GitHub Action unpacks them into the PNGs at the root.
