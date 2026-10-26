import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff26/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). Y is the luma byte in the file. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="After an encode" title="Why is black gray?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i card.mkv -c:v libx264 -pix_fmt yuv420p out.mp4" hi="-pix_fmt yuv420p" size={32} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'You expect', value: 'black = 0', sub: 'pure black stays black', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 72}}
      right={{label: 'Test', value: '9 cases', sub: 'one card, two builds', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 72}}
      mid="?" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Test card and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic test card · lossless RGB" title="Four patches, two readers." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={72} items={[
      {label: 'Black', value: '0', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'White', value: '255', color: C.cyan, o: ep(t, 1.4, 2.0)},
      {label: 'Shadow', value: '8', color: C.amber, o: ep(t, 1.9, 2.5)},
      {label: 'Highlight', value: '247', color: C.amber, o: ep(t, 2.4, 3.0)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · ffprobe', value: 'tag + stats', sub: 'range tag, signalstats', color: C.green, o: ep(t, 4.6, 5.3), valueSize: 60}}
      right={{label: 'Reader 2 · raw luma', value: 'the byte', sub: 'plane dump read in Node', color: C.green, o: ep(t, 5.6, 6.3), valueSize: 60}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.2, 5.8)} />
  </>
);

/* 3. The default */
const Default: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="The default encode" title="Black is 16. That is fine." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'In the file', value: 'Y 16 · 235', sub: 'black and white, no range tag', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 80}}
      right={{label: 'A player shows', value: '0 · 255', sub: 'no tag means limited: stretched', color: C.green, o: ep(t, 2.8, 3.5), valueSize: 96}}
      mid="→" midO={ep(t, 2.4, 3.0)} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 4.8, 5.4)}>-color_range tv: identical raw frame, still no tag. Same on 6.1.1 and 8.1.2.</Mid>
  </>
);

/* 4. The label: same command, two builds */
const Label: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="-color_range pc" title="Same command. Two builds." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={265} value="16 vs 0" caption="black after -color_range pc: ffmpeg 6.1.1 vs 8.1.2" size={200} color={C.red} o={ep(t, 0.9, 1.7)} />
    <Duel y={655} h={215}
      left={{label: 'ffmpeg 6.1.1', value: 'relabels', sub: 'same bytes as the default', color: C.red, o: ep(t, 3.0, 3.7), valueSize: 60}}
      right={{label: 'ffmpeg 8.1.2', value: 'converts', sub: 'same bytes as yuvj420p', color: C.green, o: ep(t, 3.8, 4.5), valueSize: 60}}
      mid="vs" midO={ep(t, 3.4, 4.0)} />
  </>
);

/* 5. Real full range and the controls */
const Full: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Convert, then label" title="Real full range, and a control." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={300} cw={400} gap={32} valueSize={56} items={[
      {label: 'Route 1', value: 'Y 0 · 255', sub: '-pix_fmt yuvj420p\ntag pc, shown right', color: C.green, o: ep(t, 0.9, 1.5)},
      {label: 'Route 2', value: 'Y 0 · 255', sub: 'scale=out_range=full\nfile says yuvj420p', color: C.green, o: ep(t, 2.2, 2.8)},
      {label: 'Control · flag 1', value: 'black 16', sub: 'copy, flag set to 1\nlimited bytes, pc label', color: C.red, o: ep(t, 4.4, 5.0)},
      {label: 'Control · flag 0', value: '8 → 0', sub: 'copy, flag set to 0\n247 → 255, clipped', color: C.red, o: ep(t, 6.2, 6.8)},
    ]} />
    <Verdict y={660} text="Only the flag changed. The picture did not." color={C.red} o={ep(t, 7.6, 8.4)} size={32} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Label and pixels must match." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'ffprobe', value: 'color_range', sub: 'what the file claims', color: C.cyan, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'signalstats', value: 'YMIN · YMAX', sub: 'what the pixels hold', color: C.cyan, o: ep(t, 2.0, 2.7), valueSize: 64}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: builds other than 6.1.1 and 8.1.2, real players, real footage, other encoders, 10-bit.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 26 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, default: Default, label: Label, full: Full, close: Close};
