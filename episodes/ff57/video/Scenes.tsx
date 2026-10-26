import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, FrameStrip, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff57/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* one cell per output second: which clip is on screen */
const cells = (n: number, blendAt: number) => (i: number) => (i < blendAt ? 'A' : i === blendAt ? 'mix' : 'B');

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Crossfade two clips" title="Where does the offset go?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="xfade=transition=fade:duration=1:offset=?" hi="offset=?" size={36} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'Clip A', value: '5 s', sub: 'the first clip', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 90}}
      right={{label: 'Clip B', value: '5 s', sub: 'the second clip', color: C.amber, o: ep(t, 3.6, 4.3), valueSize: 90}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 5.2, 5.8)}>We measure every output frame, on ffmpeg 6.1.1.</Mid>
  </>
);

/* 2. The two clips and the readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clips · 5 s · 125 frames each" title="One frame names its clip." o={ep(t, 0.2, 0.8)} />
    <FrameStrip y={290} n={8} kept={() => true} label={(i) => String(16 + i)} fw={150} fh={60} gap={14} o={ep(t, 1.0, 1.7)} />
    <FrameStrip y={445} n={8} label={(i) => String(235 - i)} fw={150} fh={60} gap={14} o={ep(t, 2.2, 2.9)} />
    <Row y={635} h={180} cw={520} gap={40} valueSize={46} items={[
      {label: 'Control, no blend', value: '250 frames', sub: 'concat: A, then B, 10 s', color: C.green, o: ep(t, 4.4, 5.0)},
      {label: 'Reader 1', value: 'framemd5', sub: 'each hash against the clips', color: C.cyan, o: ep(t, 6.0, 6.6)},
      {label: 'Reader 2', value: 'raw pixels', sub: 'luma and chroma, in Node', color: C.amber, o: ep(t, 7.0, 7.6)},
    ]} />
    <Mid y={860} size={26} color={C.mute} o={ep(t, 8.0, 8.6)}>Top: clip A, luma 16 up. Bottom: clip B, luma 235 down.</Mid>
  </>
);

/* 3. Offset 4 */
const Right: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="First clip 5 s minus the fade 1 s" title="Offset 4: nine seconds." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Cmd y={285} text="xfade=transition=fade:duration=1:offset=4" hi="offset=4" size={30} o={ep(t, 0.9, 1.5)} />
    <FrameStrip y={385} n={9} cur={4} kept={(i) => i < 4} label={cells(9, 4)} fw={150} fh={60} gap={14} color={C.green} o={ep(t, 2.0, 2.7)} />
    <Row y={600} h={190} cw={520} gap={40} valueSize={50} items={[
      {label: 'Output', value: '9 s', sub: '225 frames', color: C.green, o: ep(t, 3.6, 4.2)},
      {label: 'Blended frames', value: '24', sub: 'the weight of B rises each frame', color: C.green, o: ep(t, 4.8, 5.4)},
      {label: 'Clip A lost', value: '0 s', sub: 'every frame of A shows', color: C.green, o: ep(t, 6.0, 6.6)},
    ]} />
    <Mid y={840} size={26} color={C.mute} o={ep(t, 7.2, 7.8)}>One cell is one output second. The blend sits in second 4, pure B from 5.00 s.</Mid>
  </>
);

/* 4. Offset 3 and 1 */
const Early: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="One second early" title="Offset 3: A loses its end." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cmd y={285} text="xfade=transition=fade:duration=1:offset=3" hi="offset=3" size={30} o={ep(t, 0.9, 1.5)} />
    <FrameStrip y={385} n={8} cur={3} kept={(i) => i < 3} label={cells(8, 3)} fw={150} fh={60} gap={14} color={C.red} o={ep(t, 2.0, 2.7)} />
    <Row y={600} h={190} cw={520} gap={40} valueSize={50} items={[
      {label: 'Output', value: '8 s', sub: '200 frames, not 225', color: C.red, o: ep(t, 3.6, 4.2)},
      {label: 'Clip A lost', value: '25 frames', sub: 'its last second never shows', color: C.red, o: ep(t, 4.8, 5.4)},
      {label: 'Offset 1', value: '6 s', sub: '3 s of clip A lost', color: C.red, o: ep(t, 6.2, 6.8)},
    ]} />
    <Mid y={840} size={26} color={C.mute} o={ep(t, 7.6, 8.2)}>Blend 3.00 to 4.00 s, then clip B takes over.</Mid>
  </>
);

/* 5. Offset 5 */
const Late: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Offset equals clip A" title="Offset 5: no crossfade." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cmd y={285} text="xfade=transition=fade:duration=1:offset=5" hi="offset=5" size={30} o={ep(t, 0.9, 1.5)} />
    <Figure y={385} value="0 blended" caption="125 frames of A, then 1 frame of B · 5.04 s" size={130} color={C.red} o={ep(t, 2.0, 2.8)} />
    <Duel y={640} h={190}
      left={{label: 'Offset 4', value: '24 blended', sub: 'B plays on to 9 s', color: C.green, o: ep(t, 4.4, 5.1), valueSize: 56}}
      right={{label: 'Offset 5', value: '0 blended', sub: 'B almost absent', color: C.red, o: ep(t, 5.2, 5.9), valueSize: 56}}
      mid="vs" midO={ep(t, 5.0, 5.6)} />
    <Mid y={870} size={26} color={C.dim} o={ep(t, 6.8, 7.4)}>The one frame of B is its last frame.</Mid>
  </>
);

/* 6. The rule */
const Rule: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Offsets 1 to 4, fade 1 s" title="Length is offset plus five." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Row y={295} h={210} cw={390} gap={30} valueSize={60} items={[
      {label: 'Offset 1', value: '6 s', sub: '3 s of A lost', color: C.red, o: ep(t, 1.2, 1.8)},
      {label: 'Offset 2', value: '7 s', sub: '2 s of A lost', color: C.red, o: ep(t, 2.2, 2.8)},
      {label: 'Offset 3', value: '8 s', sub: '1 s of A lost', color: C.red, o: ep(t, 3.2, 3.8)},
      {label: 'Offset 4', value: '9 s', sub: '0 s of A lost', color: C.green, o: ep(t, 4.2, 4.8)},
    ]} />
    <Mid y={560} size={30} color={C.dim} o={ep(t, 5.4, 6.0)}>The blend is 24 frames every time. Only its position moves.</Mid>
    <Verdict y={700} text="offset = first clip length minus the fade" color={C.green} o={ep(t, 6.6, 7.2)} size={34} />
    <Mid y={820} size={28} color={C.mute} o={ep(t, 7.6, 8.2)}>Here 5 s minus 1 s is 4.</Mid>
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Count the seconds." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Output length', value: 'offset + 5 s', sub: 'offset plus the second clip', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'Where the blend sits', value: 'frame luma', sub: 'a frame names its clip', color: C.green, o: ep(t, 2.4, 3.1), valueSize: 64}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.8, 4.4)}>Not tested: other transitions, audio, other lengths or frame rates, real footage, builds other than ffmpeg 6.1.1.</Mid>
    <Mid y={760} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 57 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, right: Right, early: Early, late: Late, rule: Rule, close: Close};
