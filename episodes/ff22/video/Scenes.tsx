import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff22/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). RGB values are the decoded pixel at the line. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.red} o={ep(t, 0, 1.2)} />
    <Head over="Screen recordings" title="Thin red text looks purple." o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.png -c:v libx264 -pix_fmt yuv420p out.mp4" hi="yuv420p" size={32} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'Source line', value: '255, 0, 0', sub: 'one pixel wide, pure red', color: C.red, o: ep(t, 2.4, 3.1), valueSize: 64}}
      right={{label: 'Test', value: '3 formats', sub: '444 · 422 · 420', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 64}}
      mid="?" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Source and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic image · 320x180 · crf 0" title="One red line on blue." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={40} items={[
      {label: 'Background', value: '0, 0, 255', color: '#4d8bff', o: ep(t, 0.9, 1.5)},
      {label: 'Line, 1 px', value: '255, 0, 0', color: C.red, o: ep(t, 1.6, 2.2)},
      {label: 'Two images', value: 'vertical, horizontal', color: C.amber, o: ep(t, 2.3, 2.9)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · decode', value: 'RGB', sub: 'pixels across the line', color: C.cyan, o: ep(t, 4.6, 5.3), valueSize: 64}}
      right={{label: 'Reader 2 · signalstats', value: 'U and V', sub: 'chroma at the line pixel', color: C.amber, o: ep(t, 5.6, 6.3), valueSize: 64}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.2, 5.8)} />
  </>
);

/* 3. Vertical line */
const VLine: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Vertical line · decoded pixel at the line" title="Red becomes purple." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={260} cw={400} gap={32} valueSize={44} items={[
      {label: 'yuv444p', value: '254, 0, 0', sub: 'pure red', color: C.green, o: ep(t, 0.9, 1.5)},
      {label: 'yuv422p', value: '150, 21, 149', sub: 'purple', color: C.red, o: ep(t, 2.4, 3.0)},
      {label: 'yuv420p', value: '150, 21, 149', sub: 'purple', color: C.red, o: ep(t, 3.2, 3.8)},
    ]} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 5.4, 6.0)}>The pixel beside the line becomes 104, 0, 103.</Mid>
  </>
);

/* 4. Horizontal line */
const HLine: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Horizontal line · decoded pixel at the line" title="422 keeps it. 420 smears it." o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={260} cw={400} gap={32} valueSize={44} items={[
      {label: 'yuv444p', value: '254, 0, 0', sub: 'pure red', color: C.green, o: ep(t, 0.9, 1.5)},
      {label: 'yuv422p', value: '253, 0, 0', sub: 'still red', color: C.green, o: ep(t, 2.2, 2.8)},
      {label: 'yuv420p', value: '137, 24, 169', sub: 'smeared, rows above and below tinted', color: C.red, o: ep(t, 3.6, 4.2)},
    ]} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 5.4, 6.0)}>4:2:2 halves chroma across. 4:2:0 also halves it down.</Mid>
  </>
);

/* 5. Light */
const Light: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.cyan} o={ep(t, 0.2, 1.4)} />
    <Head over="Brightness (Y) at the line" title="Color is lost. Light is not." color={C.cyan} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Y in all six files', value: '≈ 81', sub: 'unchanged', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 96}}
      right={{label: 'Chroma U, V', value: '90, 240 → 175, 167', sub: 'in 422 and 420, vertical line', color: C.red, o: ep(t, 2.8, 3.5), valueSize: 40}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Verdict y={690} text="Chroma smears. Brightness does not." color={C.amber} o={ep(t, 5.0, 5.8)} size={34} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="420 shares color." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Thin colored lines', value: '444', sub: 'or accept the bleed', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 84}}
      right={{label: 'Players', value: '420', sub: 'often what they want', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 84}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: other encoders, chroma resampling options, real recordings.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 22 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, vline: VLine, hline: HLine, light: Light, close: Close};
