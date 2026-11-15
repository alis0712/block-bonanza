# Genre track licenses

The indie rock, pop and classical beds in this folder are original instrumental
compositions written for Block Bonanza. They do not quote or arrange an existing
song. The rock bed is in a general mid-2000s pop-punk style. It is not a copy of
any Burnout, EA Trax, or other commercial recording.

Pop and classical are rendered from **FluidR3_GM** by Frank Wen. Rock uses the recorded libraries named below.

- SoundFont: FluidR3_GM.sf2
- Copyright © 2000-2002, 2008 Frank Wen
- License: MIT
- Source used to render: the Debian `fluid-soundfont-gm` package
  (`/usr/share/sounds/sf2/FluidR3_GM.sf2`), which redistributes Frank Wen's bank.

MIT terms, as shipped with that bank:

> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

Fluid was built partly from public-domain samples that Frank Wen edited, and
partly from his own recordings, with help acknowledged in the upstream README
(Suren M. Seron, Scott Hanan, Steve Aupperle, Chris Gillman, Alex Taubr, Chris
Prola, Andrew Klenk, Winfried Hubbe, Dylan, Tim, Gort, Uros Katic, Ethan Winer).

v56 keeps pop, classical and techno as they were. The title is still the v52 bed (aceinet's A-to-G phrase locked to lennartgreen's Gretsch kit). The menu is BaDoink's distorted guitar, bass and drum clip. Stage tracks are unchanged. See `EVERYONE-ALIVE.md`. None of the notes come from Local H.

While a genre bed is playing, stage ambience on `A.amb` is multiplied by 0.45 (about -7 dB). The waves and the other beds stay audible under the song. Gameplay hits stay on `A.sfx`.

The files are mastered near -12 LUFS and the game plays them at the same bus gain as the vaporwave loops (2.2).

Freesound only hands the original WAV to a logged-in user. These beds use Freesound's high-quality preview MP3s of the CC0 recordings.

Title and menu, both [CC0](https://creativecommons.org/publicdomain/zero/1.0/):

- aceinet, ["A G Riff"](https://freesound.org/people/aceinet/sounds/417158/)
- lennartgreen, ["Uptempo Rock Drum Groove 160 BpM"](https://freesound.org/people/lennartgreen/sounds/860527/) (Gretsch Renown kick, toms, Mapex snare)

Stage performances, all [CC0](https://creativecommons.org/publicdomain/zero/1.0/). F. Benjamin (BaDoink) played these himself except where noted:

- Stage 1, ["Grunge distortion guitar soundtrack"](https://freesound.org/people/ValentinSosnitskiy/sounds/495685/) by ValentinSosnitskiy — CC BY. Overdriven guitar, bass and drums. His own progression, not a copy of any other song
- Menu, ["Rockin Audio Clip"](https://freesound.org/people/BaDoink/sounds/547891/) — distorted guitar, bass and drums at 140 BPM. The clip plays twice so the riff comes back, then loops
- Stage 2, ["Industrial Metal Fusion 120"](https://freesound.org/people/BaDoink/sounds/566057/) — guitar, bass and drums at 120
- Stage 3, ["Kick 130"](https://freesound.org/people/BaDoink/sounds/579754/) — dry hard rock at 130, D minor
- Stage 4, ["Hard Rock Loop"](https://freesound.org/people/BaDoink/sounds/524240/) — chordal hard rock
- Stage 5, ["HardKor2"](https://freesound.org/people/BaDoink/sounds/525136/) — fast hard rock
- Stage 6, ["Fatter Freddy"](https://freesound.org/people/BaDoink/sounds/560623/) — drop-D heavy rock
- Stage 7, ["Rockin_140"](https://freesound.org/people/BaDoink/sounds/568755/) — Ibanez and LTD guitars, Hydrogen drums, 140
- Stage 8, ["Freddy's Best"](https://freesound.org/people/BaDoink/sounds/537961/) — guitars, bass and electric drums
- Stage 9, ["WILLY NILLY GUITAR LOOP/BEAT"](https://freesound.org/people/Seth_Makes_Sounds/sounds/653517/) — Seth_Makes_Sounds, 99 BPM instrumental
- Stage 10, ["Glitch Rock Loop"](https://freesound.org/people/BaDoink/sounds/585515/) — alt rock loop
- Stage 11, ["Metal Hop Loop"](https://freesound.org/people/BaDoink/sounds/535233/) — guitars, bass and electric drums
- Stage 12, ["Ivan Rockanov"](https://freesound.org/people/BaDoink/sounds/564596/) — hard-rock chops
- Stage 13, ["Alive105_Dm"](https://freesound.org/people/BaDoink/sounds/570579/) — drop-D heavy rock at 105

Measured and not used in v52, still CC0, so the earlier credits stay findable:

- aceinet, ["D sharp 80 bpm dirty"](https://freesound.org/people/aceinet/sounds/718847/), ["hot hot licks"](https://freesound.org/people/aceinet/sounds/418096/)
- Billyguiro, ["Grunge sad guitar 166bpm loop"](https://freesound.org/people/Billyguiro/sounds/845806/)
- bangcorrupt, ["Chug Riff"](https://freesound.org/people/bangcorrupt/sounds/832833/)
- Dusk225, ["Rock Riff"](https://freesound.org/people/Dusk225/sounds/253076/)
- GENERALMiDiGUy, ["074-grungy-guitar-loop"](https://freesound.org/people/GENERALMiDiGUy/sounds/431180/)
- Vrezerino, ["gtr_distortRiff2"](https://freesound.org/people/Vrezerino/sounds/7977/)
- dfhadhadghadgjhtokai, ["Guitar swell:solo"](https://freesound.org/s/155458/)
- CVLTIV8R, ["bass rock riff 4"](https://freesound.org/people/CVLTIV8R/sounds/799090/)

Which file plays where is in `EVERYONE-ALIVE.md`. Pop and classical still use the FluidR3 programs from v45. Techno is still the synth in `game.js`.

`tools/render-rock-v53.py` builds the stage songs. The title and menu are the v52 renders. Techno stays a synth in `game.js`.

Files:

- `rock-title` (unchanged from v52), `rock-menu` (v56)
- `rock-s01` through `rock-s13`, one per stage
- `genre-pop.ogg` / `genre-pop.mp3`
- `genre-classical.ogg` / `genre-classical.mp3`
- `genre-rock.ogg` / `genre-rock.mp3` is the older single rock bed and is no longer played
