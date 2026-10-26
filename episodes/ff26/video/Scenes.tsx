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
      right={{label: 'Test', value: '7 encodes', sub: 'one test card, libx264', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 72}}
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
    <Mid y={650} size={28} color={C.mute} o={ep(t, 4.8, 5.4)}>-color_range tv: identical raw frame, still no tag.</Mid>
  </>
);

/* 4. The label */
const Label: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="One flag" title="Same bytes. New label." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={270} value="16" caption="black, as shown by a player that trusts the pc label" size={220} color={C.red} o={ep(t, 0.9, 1.7)} />
    <Duel y={655} h={215}
      left={{label: 'Default · no tag', value: 'Y 16 · 235', sub: '-pix_fmt yuv420p', color: C.cyan, o: ep(t, 3.0, 3.7), valueSize: 56}}
      right={{label: 'Label: full', value: 'Y 16 · 235', sub: '-color_range pc', color: C.red, o: ep(t, 3.8, 4.5), valueSize: 56}}
      mid="=" midO={ep(t, 3.4, 4.0)} />
  </>
);

/* 5. Real full range and the control */
const Full: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Convert, then label" title="Real full range." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={280} cw={500} gap={32} valueSize={64} items={[
      {label: 'Route 1', value: 'Y 0 · 255', sub: '-pix_fmt yuvj420p\ntag pc, shown 0 · 255', color: C.green, o: ep(t, 0.9, 1.5)},
      {label: 'Route 2', value: 'Y 0 · 255', sub: 'scale=out_range=full\nfile says yuvj420p', color: C.green, o: ep(t, 2.4, 3.0)},
      {label: 'Control · no label', value: '8 → 0', sub: 'full pixels, no full tag\n247 → 255, clipped', color: C.red, o: ep(t, 4.6, 5.2)},
    ]} />
    <Verdict y={660} text="Full pixels without the label lose the ends" color={C.red} o={ep(t, 6.2, 7.0)} size={32} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="The label must match." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'ffprobe', value: 'color_range', sub: 'what the file claims', color: C.cyan, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'signalstats', value: 'YMIN · YMAX', sub: 'what the pixels hold', color: C.cyan, o: ep(t, 2.0, 2.7), valueSize: 64}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: other ffmpeg builds, real players, real footage, other encoders, 10-bit.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 26 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, default: Default, label: Label, full: Full, close: Close};
