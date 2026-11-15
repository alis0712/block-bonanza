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

The v48 rock bed does not use a soundfont and it has no synthesized notes. It is an arrangement of four CC0 performances. The riffs and the drum groove were played by those musicians; this project did not write them, and it does not copy Local H or any other commercial song. The new part is the sequence: which performance plays when, a small tempo fit so they share 166 BPM, and the mix.

Freesound only hands the original WAV to a logged-in user. The files used here are Freesound's own high-quality preview MP3s of those CC0 recordings (about 190 kbps).

- **Verse guitar.** "Grunge sad guitar 166bpm loop" by Billyguiro. A FAIM electric guitar through a pedalboard that includes a Toxic Fuzz. https://freesound.org/people/Billyguiro/sounds/845806/ — [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
- **Heavy guitar.** "Chug Riff" by bangcorrupt. A low-tuned electric guitar (CGCEgc, Invader pickups) played as power chords and recorded through an amp. https://freesound.org/people/bangcorrupt/sounds/832833/ — [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
- **Drums.** "Uptempo Rock Drum Groove Upbeat 160 BpM" by lennartgreen. Played on a Gretsch Renown kit with a Mapex snare, multitrack. https://freesound.org/people/lennartgreen/sounds/860527/ — [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
- **Bass.** "bass rock riff 4" by CVLTIV8R, a Charvel electric bass performance, under the verse guitar only. https://freesound.org/people/CVLTIV8R/sounds/799090/ — [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

The same credit line is in the Music tab of the store. Pop and classical still use the FluidR3 programs from v45.

`tools/render-genres.py` is the arrangement and the render script. The techno
vaporwave genre is still synthesized in `game.js` and does not use this bank.

Files:

- `genre-rock.ogg` / `genre-rock.mp3`
- `genre-pop.ogg` / `genre-pop.mp3`
- `genre-classical.ogg` / `genre-classical.mp3`
