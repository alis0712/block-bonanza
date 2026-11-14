# Genre track licenses

The indie rock, pop and classical beds in this folder are original instrumental
compositions written for Block Bonanza. They do not quote or arrange an existing
song. The rock bed is in a general mid-2000s pop-punk style. It is not a copy of
any Burnout, EA Trax, or other commercial recording.

The performances are rendered from **FluidR3_GM** by Frank Wen.

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

The v46 rock guitars are FluidR3's clean electric and muted-electric programs
(plucked notes, not the distortion-guitar patch). A tanh fuzz and a low cabinet
filter are applied after the render. Notes are short, with a gap, so a fifth
cannot sit as a drone. The lead is a single note with its octave, not a reed.
A handful of decaying square-wave stabs, synthesized, sit in one chorus only.
Drums and bass are FluidR3 samples. Pop and classical still use the FluidR3
programs from v45, without that guitar fuzz.

`tools/render-genres.py` is the arrangement and the render script. The techno
vaporwave genre is still synthesized in `game.js` and does not use this bank.

Files:

- `genre-rock.ogg` / `genre-rock.mp3`
- `genre-pop.ogg` / `genre-pop.mp3`
- `genre-classical.ogg` / `genre-classical.mp3`
