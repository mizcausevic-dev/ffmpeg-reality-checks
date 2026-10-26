import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff39/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Scale down by 3" title="Thin lines: jagged or gone?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mp4 -vf scale=iw/3:ih/3:flags=neighbor out.mp4" hi="flags=neighbor" size={32} o={ep(t, 1.0, 1.6)} />
    <Row y={470} h={230} cw={330} gap={30} valueSize={50} items={[
      {label: 'Flag 1', value: 'neighbor', color: C.red, o: ep(t, 2.2, 2.8)},
      {label: 'Flag 2', value: 'bilinear', color: C.cyan, o: ep(t, 2.8, 3.4)},
      {label: 'Flag 3', value: 'bicubic', color: C.cyan, o: ep(t, 3.4, 4.0)},
      {label: 'Flag 4', value: 'lanczos', color: C.cyan, o: ep(t, 4.0, 4.6)},
      {label: 'Flag 5', value: 'area', color: C.green, o: ep(t, 4.6, 5.2)},
    ]} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 5.6, 6.2)}>Lines 1 pixel wide, luma 200 on 60, scaled 3x down.</Mid>
  </>
);

/* 2. Card and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic test card" title="Twelve lines, one pixel wide." o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={210} cw={520} gap={40} valueSize={56} items={[
      {label: 'Card', value: '312x24', sub: 'background luma 60', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Lines', value: '12 x 200', sub: 'one every 25 columns', color: C.amber, o: ep(t, 2.0, 2.6)},
      {label: 'Output', value: '104x8', sub: 'three phases, four lines each', color: C.green, o: ep(t, 3.4, 4.0)},
    ]} />
    <Row y={560} h={190} cw={520} gap={40} valueSize={46} items={[
      {label: 'Reader 1', value: 'raw luma', sub: 'bytes read in Node', color: C.cyan, o: ep(t, 5.4, 6.0)},
      {label: 'Reader 2', value: 'signalstats', sub: 'YMIN YMAX YAVG, psnr', color: C.amber, o: ep(t, 6.2, 6.8)},
      {label: 'Control', value: 'area', sub: 'block mean from Node', color: C.green, o: ep(t, 7.0, 7.6)},
    ]} />
    <Mid y={790} size={28} color={C.mute} o={ep(t, 8.4, 9.0)}>Control at 3x: largest difference 1 level, psnr 62.67 dB. Other flags: 29 to 140 levels.</Mid>
  </>
);

/* 3. neighbor keeps or drops */
const Neighbor: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Downscale by 3" title="The line is kept or dropped." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={300} value="8 of 12" caption="lines gone · peak 60, the background" color={C.red} size={190} o={ep(t, 0.9, 1.7)} />
    <Row y={635} h={170} cw={400} gap={32} valueSize={56} items={[
      {label: 'Phase 0 · 4 lines', value: '60', sub: 'gone', color: C.red, o: ep(t, 3.2, 3.8)},
      {label: 'Phase 1 · 4 lines', value: '200', sub: 'kept, untouched', color: C.green, o: ep(t, 3.9, 4.5)},
      {label: 'Phase 2 · 4 lines', value: '60', sub: 'gone', color: C.red, o: ep(t, 4.6, 5.2)},
    ]} />
    <Mid y={830} size={28} color={C.dim} o={ep(t, 6.0, 6.6)}>Stripes of 0 and 255 at 2x: all 0. Shifted one pixel: all 255. Area: 128 both ways.</Mid>
  </>
);

/* 4. Everything else keeps the line, faint */
const Faint: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Peak luma of a 200 line on 60" title="Kept, but faint." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={260} cw={420} gap={30} valueSize={56} items={[
      {label: 'Same at every phase', value: 'area', sub: '107 · 107 · 107', color: C.green, o: ep(t, 0.9, 1.5)},
      {label: 'Changes with phase', value: 'bilinear', sub: '91 · 107 · 91', color: C.amber, o: ep(t, 1.8, 2.4)},
      {label: 'Changes with phase', value: 'bicubic', sub: '97 · 107 · 97', color: C.amber, o: ep(t, 2.7, 3.3)},
      {label: 'Changes with phase', value: 'lanczos', sub: '99 · 107 · 99', color: C.amber, o: ep(t, 3.6, 4.2)},
    ]} />
    <Mid y={620} size={32} color={C.dim} o={ep(t, 5.0, 5.6)}>At the weak phases the line is 2 pixels wide, for example bilinear 91 and 76 side by side.</Mid>
    <Verdict y={760} text="No line vanishes. 22 to 34 percent of the contrast is left." color={C.amber} o={ep(t, 6.6, 7.2)} size={34} />
  </>
);

/* 5. Halos and the default */
const Halo5: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={500} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Next to the line" title="Ringing below the background." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'Lowest value · background 60', value: '53', sub: 'lanczos · bicubic 56\nbilinear 60 · area 60', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 100}}
      right={{label: 'The scale default', value: 'bicubic', sub: 'same bytes as flags=bicubic', color: C.green, o: ep(t, 3.2, 3.9), valueSize: 100}}
      mid="" midO={0} />
    <Mid y={680} size={30} color={C.dim} o={ep(t, 5.0, 5.6)}>Line luma sum, input = 1: area, bilinear, bicubic 1.01. lanczos up to 1.05. neighbor 0 or 3.</Mid>
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Read the peak after the scale." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Same line at every phase', value: 'area', sub: '107 at all 12 lines', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 80}}
      right={{label: 'Drops lines by phase', value: 'neighbor', sub: '8 of 12 lines gone', color: C.red, o: ep(t, 2.4, 3.1), valueSize: 80}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.8, 4.4)}>Not tested: color, real footage, other builds, other scale factors, any player.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 39 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, neighbor: Neighbor, faint: Faint, halo: Halo5, close: Close};
