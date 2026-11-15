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

The v47 rock bed does not use FluidR3 and it has no synthesized tones.

- **Guitars.** [FSBS Electric Guitar Distorted #2](https://freepats.zenvoid.org/ElectricGuitar/distorted-electric-guitar.html) by the FreePats project. A Fender electric guitar was recorded direct, then the same takes were played through an amplifier and an effects rack by the sample author. The bank is published under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The song plays those recorded notes (power chords and a single-note lead). Nothing is added on top: no oscillator, no extra fuzz.
- **Bass.** [Picked Bass YR](https://freepats.zenvoid.org/ElectricGuitar/clean-electric-bass.html) by Andrea Biasior, sampled from a Yamaha RBX and contributed to FreePats under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- **Drums.** MuldjordKit by Lars Muldjord, a close-miked acoustic drum kit. Source: <https://github.com/freepats/muldjordkit> and <http://www.muldjord.com/>. License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). The samples are sequenced into this original arrangement and mixed with the guitar and bass. The recordings themselves are not edited.

Pop and classical still use the FluidR3 programs from v45.

`tools/render-genres.py` is the arrangement and the render script. The techno
vaporwave genre is still synthesized in `game.js` and does not use this bank.

Files:

- `genre-rock.ogg` / `genre-rock.mp3`
- `genre-pop.ogg` / `genre-pop.mp3`
- `genre-classical.ogg` / `genre-classical.mp3`
