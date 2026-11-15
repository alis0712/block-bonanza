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

v49 keeps pop, classical and techno as the single tracks from v45/v48. Rock is six beds. Each one is built from a different person's guitar performance. They are not one loop copied onto every stage, and they are not a copy of any commercial song. Tempos are only nudged so a guitar phrase and a drum groove can share a length.

Freesound only hands the original WAV to a logged-in user. These beds use Freesound's high-quality preview MP3s of the CC0 recordings (about 190 kbps).

| Bed | Where it plays | Guitar | Drums |
| --- | --- | --- | --- |
| `rock-title` | Start splash | ["A G Riff"](https://freesound.org/people/aceinet/sounds/417158/) by aceinet, heavy distorted A-to-G riff | lennartgreen, sped a little so three passes fill the riff |
| `rock-menu` | Main menu, stage map, store, how-to, scores | ["074-grungy-guitar-loop"](https://freesound.org/people/GENERALMiDiGUy/sounds/431180/) by GENERALMiDiGUy, distorted chords at 74 BPM, nudged to 80 | lennartgreen at half speed, kept quiet |
| `rock-shore` | Stages 1, 7 and 10 (Tropical Tides, Crystal Caverns, Tomorrow Park) | ["Grunge sad guitar 166bpm loop"](https://freesound.org/people/Billyguiro/sounds/845806/) by Billyguiro, FAIM guitar and a fuzz pedalboard | lennartgreen at 166. Bass is ["bass rock riff 4"](https://freesound.org/people/CVLTIV8R/sounds/799090/) by CVLTIV8R |
| `rock-murk` | Stages 2 and 9 (Sewer Lair, Haunted Forest) | ["D sharp 80 bpm dirty"](https://freesound.org/people/aceinet/sounds/718847/) by aceinet | lennartgreen at half speed, louder than the menu |
| `rock-drive` | Stages 4, 5, 8 and 12 (Storm Planet, Event Horizon, Clockwork Factory, Solaris Keep) | ["Rock Riff"](https://freesound.org/people/Dusk225/sounds/253076/) by Dusk225, guitar into a computer input | lennartgreen at the recorded 160 |
| `rock-boss` | Stages 3, 6, 11 and 13 (Sunny, Gazza, Maw, the vampire), including the fights | ["Chug Riff"](https://freesound.org/people/bangcorrupt/sounds/832833/) by bangcorrupt, low-tuned power chords | lennartgreen about 12% faster |

The kit on five of the beds is the same Gretsch performance by lennartgreen ([sound 860527](https://freesound.org/people/lennartgreen/sounds/860527/)), played back at a different speed. The six guitar parts are six different recordings. All of the above are [CC0](https://creativecommons.org/publicdomain/zero/1.0/). The Music tab lists the names.

Pop and classical still use the FluidR3 programs from v45. Techno is still the synth in `game.js`.

`tools/render-genres.py` is the arrangement and the render script. The techno
vaporwave genre is still synthesized in `game.js` and does not use this bank.

Files:

- `rock-title`, `rock-menu`, `rock-shore`, `rock-murk`, `rock-drive`, `rock-boss` (`.ogg` and `.mp3`)
- `genre-pop.ogg` / `genre-pop.mp3`
- `genre-classical.ogg` / `genre-classical.mp3`
- `genre-rock.ogg` / `genre-rock.mp3` is the older single rock bed and is no longer played
