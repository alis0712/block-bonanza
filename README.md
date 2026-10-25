# BLOCK BONANZA

A silly, splashy falling-block puzzler built for phones. Pure HTML5 canvas + Web Audio, no dependencies.

**Play:** https://alis0712.github.io/block-bonanza/

On iPhone: open the link in Safari, tap **Share → Add to Home Screen** to launch it fullscreen like an app.

## Start screen
The game opens on a wacky vaporwave sunset start screen: a striped retro sun over a neon grid, palm silhouettes, a
marble bust in shades, spinning 3D blocks and googly-eyed bouncing blocks under a squash-and-stretch logo.
The first tap turns sound on and starts the start-screen theme, **SUNSET BOING** (an original 112 BPM future-funk loop,
`music/start-00.b64`). The second tap slides into the main menu while the theme crossfades into the menu music.
With sound off, one tap goes straight to the menu. `?stage=N` links skip the start screen.

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
10. **Vampire's Tomb (FINAL BOSS)**: Count Blockula watches from his tomb. Every pop drains his health bar (chains hit harder); bat swarms now and then drop spider webs that tear when a match pops next to them. Blood moon, lightning, spiders, bats and jack-o'-lanterns. Behind the board the giant Count **laughs** (head thrown back, fangs, claws up, glowing eyes, a synthesized "MWAH-HA-HA-HA!") every 10-15 seconds, when a bat swarm comes and when your stack tops out (never more than once every 7 seconds). Every quarter of his health (75%, 50%, 25%) he yells a sillier **"OUCH!"** (flinch, red flash, shaking health bar, floating OUCH text; each fires exactly once) and at 0 he lets out a big dying "NOOOO... AARGH!". All the voices are synthesized in the browser, no recordings. The tomb crawls with spiders: dangling plain, black-widow, fuzzy and daddy-long-legs spiders, a hairy tarantula on the mausoleum, a glowing-eyed spider in the cobweb, tiny scurriers and a hopping jumping spider (fewer with Particles: Low). Drain his health to **WIN**: a victory screen, a **$25,000 victory bonus** banked into your wallet, and a high score entry

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
A vaporwave / future-funk soundtrack (original material, synthesized offline: no samples): a chopped disco-funk loop,
swung 16ths, slap funk bass with ghost notes, congas and tambourine, sidechain pump and a few stuttered vocal chops.
Each stage has its own seamless loop (`music/loop-NN.b64`, base64 MP3, ~0.8 MB) loaded when the stage starts, with the
next stage preloaded. A matching danger layer fades in when the stack gets high, and a comeback / victory fanfare hits on
the beat. Stage changes land on the next bar. If a file can't load, the old live Web Audio synth plays instead.

On stage 1, Tropical Tides, a few surfers paddle out, catch waves, carve and sometimes wipe out in the background,
with a soft wave crash each time someone catches a wave.

All backgrounds are drawn procedurally on canvas: static scenery is pre-rendered once, and only the moving parts animate.

Developer shortcut: `?stage=N` (1–10) starts a new game at that stage, e.g. https://alis0712.github.io/block-bonanza/?stage=10

Also: ghost piece, lock delay, SRS wall kicks, particles and screen shake, animated backgrounds and a procedural techno
track per stage, top-10 best scores with initials, wallet and store items (all saved on the device).

## Sound on iPhone
Tap the start screen once to turn sound on. If it's still silent,
check the ring/silent switch and the volume buttons.

`icons.tar.b64` holds the app icons (base64 tar); a small GitHub Action unpacks them into the PNGs at the root.

## Copyright
© 2026 goneRogue Entertainment. All rights reserved.

BLOCK BONANZA, including its code, music, artwork and name, is proprietary software of goneRogue Entertainment.
This repository is public only so the game can be hosted on GitHub Pages. No license is granted to copy, modify,
redistribute or reuse any part of it. See [LICENSE](LICENSE).
