import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff23/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). All cuts are lossless (FFV1). */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="From second 5 to second 10" title="How long is the clip?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -ss 5 -i in.mkv -to 10 out.mkv" hi="-ss 5 -i in.mkv -to 10" size={32} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'You expect', value: '5 s', sub: 'source 5 to 10', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 96}}
      right={{label: 'Test', value: '5 cuts', sub: 'one source, two readers', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 80}}
      mid="?" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Source and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic source · 20 s · 25 fps" title="500 unique frames." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={44} items={[
      {label: 'Source', value: '500 frames', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Unique', value: '500', color: C.green, o: ep(t, 1.6, 2.2)},
      {label: 'Codec', value: 'FFV1', sub: 'lossless', color: C.amber, o: ep(t, 2.3, 2.9)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · ffprobe', value: 'frames', sub: 'count and duration', color: C.cyan, o: ep(t, 4.6, 5.3), valueSize: 64}}
      right={{label: 'Reader 2 · frame md5', value: 'which seconds', sub: 'matched back to the source', color: C.amber, o: ep(t, 5.6, 6.3), valueSize: 56}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.2, 5.8)} />
  </>
);

/* 3. Both before */
const Before: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="-ss 5 -to 10 -i  ·  and  -i -ss 5 -to 10" title="5 seconds." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Clip length', value: '5 s', sub: '125 frames', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 96}}
      right={{label: 'Holds source', value: '5 → 10 s', sub: 'frames 125 to 249', color: C.green, o: ep(t, 2.6, 3.3), valueSize: 80}}
      mid="" midO={0} />
  </>
);

/* 4. After */
const After: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="-ss 5 -i in.mkv -to 10" title="10 seconds." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Clip length', value: '10 s', sub: '250 frames', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 96}}
      right={{label: 'Holds source', value: '5 → 15 s', sub: 'frames 125 to 374', color: C.red, o: ep(t, 2.6, 3.3), valueSize: 80}}
      mid="" midO={0} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 4.8, 5.4)}>After a seek the output clock restarts at 0. -to 10 means 10 s on it.</Mid>
  </>
);

/* 5. A length */
const Length: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Two more cuts" title="A length, or from the start." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: '-ss 5 -i ... -t 5', value: '5 s', sub: 'source 5 to 10', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 96}}
      right={{label: '-to 10 -i alone', value: '10 s', sub: 'source 0 to 10', color: C.amber, o: ep(t, 2.8, 3.5), valueSize: 96}}
      mid="" midO={0} />
    <Verdict y={690} text="Both readers agree on all five" color={C.cyan} o={ep(t, 5.0, 5.8)} size={34} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Keep -ss and -to together." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Together', value: '5 s', sub: '-ss and -to on the same side', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 84}}
      right={{label: 'Split', value: '10 s', sub: '-to after the input', color: C.red, o: ep(t, 2.0, 2.7), valueSize: 84}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: -c copy, other containers.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 23 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, before: Before, after: After, length: Length, close: Close};
