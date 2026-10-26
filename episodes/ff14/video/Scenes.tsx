import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Mid, Mirror, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff14/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). Sizes shown are rounded and differ by under 1% between builds. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="GIF" title="256 colors, at most." o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mkv out.gif" hi="out.gif" size={32} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'Source', value: '5,299', sub: 'colors in the gradient clip', color: C.cyan, o: ep(t, 2.2, 2.9), valueSize: 84}}
      right={{label: 'GIF', value: '≤ 256', sub: 'colors per picture', color: C.amber, o: ep(t, 2.9, 3.6), valueSize: 84}}
      mid="→" midO={ep(t, 3.4, 4.0)} />
  </>
);

/* 2. Sources and measures */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic sources · 320x180 · 20 frames" title="Two clips, three measures." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Gradient clip', value: '5,299', sub: 'colors · smooth fractal', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 84}}
      right={{label: 'Shapes clip', value: '15,124', sub: 'colors · flat shapes and text', color: C.amber, o: ep(t, 1.9, 2.6), valueSize: 84}}
      mid="2" midSub="clips" midColor={C.text} midO={ep(t, 2.4, 3.0)} />
    <Row y={650} h={150} cw={400} gap={36} valueSize={44} items={[
      {label: 'Measure 1', value: 'PSNR', color: C.cyan, o: ep(t, 5.0, 5.6)},
      {label: 'Measure 2', value: 'SSIM', color: C.amber, o: ep(t, 6.0, 6.6)},
      {label: 'Measure 3', value: 'colors used', color: C.green, o: ep(t, 7.0, 7.6)},
    ]} />
  </>
);

/* 3. The plain command */
const Default: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Plain command" title="Muddy, and measurably so." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Gradient · PSNR', value: '21.6 dB', sub: 'SSIM 0.40 · 207 colors', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 84}}
      right={{label: 'Shapes · PSNR', value: '28.7 dB', sub: 'SSIM 0.84 · 202 colors', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 84}}
      mid="vs" midO={ep(t, 2.0, 2.6)} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 4.8, 5.4)}>The source used 5,299 and 15,124 colors.</Mid>
  </>
);

/* 4. With palettegen */
const Palette: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="palettegen + paletteuse" title="Same file type. Far closer." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Gradient · PSNR', value: '35.3 dB', sub: 'SSIM 0.97 · 253 colors', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 84}}
      right={{label: 'Shapes · PSNR', value: '39.7 dB', sub: 'SSIM 0.98 · 255 colors', color: C.green, o: ep(t, 2.4, 3.1), valueSize: 84}}
      mid="↑" midColor={C.green} midO={ep(t, 2.0, 2.6)} />
    <Cmd y={660} text='-vf "split[a][b];[a]palettegen[p];[b][p]paletteuse"' hi="palettegen" color={C.green} size={26} o={ep(t, 4.4, 5.0)} />
  </>
);

/* 5. Size */
const Size: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="File size, plain vs palette" title="Not always bigger." o={ep(t, 0.2, 0.8)} />
    <Mirror y={300} label="Gradient" max={600} half={420} p={ep(t, 1.0, 2.4)} o={ep(t, 0.9, 1.4)}
      left={{value: 584, text: '584k plain', color: C.red}} right={{value: 460, text: '460k palette', color: C.green}} />
    <Mirror y={440} label="Shapes" max={600} half={420} p={ep(t, 2.4, 3.8)} o={ep(t, 2.3, 2.8)}
      left={{value: 104, text: '104k plain', color: C.green}} right={{value: 120, text: '120k palette', color: C.amber}} />
    <Mid y={620} size={28} color={C.mute} o={ep(t, 5.4, 6.0)}>Rounded, in kilobytes. Builds differ by under 1%.</Mid>
  </>
);

/* 6. Dither */
const Dither: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="paletteuse=dither=none" title="Higher score, smaller file." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Gradient · PSNR', value: '36.2 dB', sub: 'about 390k', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 84}}
      right={{label: 'Shapes · PSNR', value: '40.7 dB', sub: 'about 103k', color: C.green, o: ep(t, 2.4, 3.1), valueSize: 84}}
      mid="↑" midColor={C.green} midO={ep(t, 2.0, 2.6)} />
    <Verdict y={660} text="Banding by eye: not measured" color={C.amber} o={ep(t, 5.4, 6.2)} size={34} />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to do" title="Build a palette from the clip." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Gain, gradient', value: '+13.8 dB', sub: 'palette vs plain', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 76}}
      right={{label: 'Gain, shapes', value: '+11.0 dB', sub: 'palette vs plain', color: C.green, o: ep(t, 2.0, 2.7), valueSize: 76}}
      mid="↑" midColor={C.green} midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.dim} o={ep(t, 3.4, 4.0)}>Control: 4 colors scores 13.8 and 9.7 dB, so the scores can fall.</Mid>
    <Mid y={680} size={28} color={C.mute} o={ep(t, 4.0, 4.6)}>Not tested: real footage, other GIF tools, how it looks on screen.</Mid>
    <Mid y={770} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 14 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, default: Default, palette: Palette, size: Size, dither: Dither, close: Close};
