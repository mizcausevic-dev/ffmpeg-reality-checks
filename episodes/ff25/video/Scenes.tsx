import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff25/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). Numbers are source frame numbers. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="One thumbnail per second" title="Which frame do you get?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mkv -vf fps=1 thumb_%03d.png" hi="fps=1" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'You expect', value: '0 · 1 · 2 s', sub: 'the first frame of each second', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 64}}
      right={{label: 'Test', value: '3 clips', sub: '25, 30, 60 fps', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 80}}
      mid="?" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Source and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clips · lossless" title="Frame N has luma N." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={44} items={[
      {label: '25 fps', value: '125 frames', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: '30 fps', value: '150 frames', color: C.amber, o: ep(t, 1.6, 2.2)},
      {label: '60 fps', value: '120 frames', color: C.green, o: ep(t, 2.3, 2.9)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · frame md5', value: 'matched', sub: 'back to the source', color: C.cyan, o: ep(t, 4.6, 5.3), valueSize: 64}}
      right={{label: 'Reader 2 · luma', value: 'the value', sub: 'is the frame number', color: C.amber, o: ep(t, 5.6, 6.3), valueSize: 64}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.2, 5.8)} />
  </>
);

/* 3. The default */
const Near: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="fps=1 · default rounding" title="The middle of each second." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: '25 fps keeps frames', value: '12 · 37 · 62', sub: 'first at 0.48 s, not 0', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 56}}
      right={{label: '30 fps keeps frames', value: '14 · 44 · 74', sub: 'first at 0.467 s', color: C.red, o: ep(t, 2.8, 3.5), valueSize: 56}}
      mid="" midO={0} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 4.8, 5.4)}>Frame 0 is not in the output.</Mid>
  </>
);

/* 4. Rounding */
const Round: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="25 fps · fps=1 and friends" title="Say which frame you mean." o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={260} cw={400} gap={32} valueSize={44} items={[
      {label: 'round=up', value: '0 · 25 · 50', sub: 'first of each second', color: C.green, o: ep(t, 0.9, 1.5)},
      {label: 'round=down', value: '24 · 49 · 74', sub: 'last of each second', color: C.amber, o: ep(t, 2.4, 3.0)},
      {label: 'select + vfr', value: '0 · 25 · 50', sub: "not(mod(n,25))", color: C.green, o: ep(t, 3.8, 4.4)},
    ]} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 5.4, 6.0)}>Same result on both readers for every case.</Mid>
  </>
);

/* 5. 60 to 24 */
const Sixty: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.amber} o={ep(t, 0.2, 1.4)} />
    <Head over="60 fps to 24 fps" title="The first frame is never used." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Kept source frames', value: '1 · 3 · 6 · 8 · 11', sub: 'steps of 2, then 3, then 2', color: C.amber, o: ep(t, 0.9, 1.6), valueSize: 44}}
      right={{label: 'Frames out', value: '48', sub: 'from 120', color: C.cyan, o: ep(t, 2.8, 3.5), valueSize: 96}}
      mid="" midO={0} />
    <Verdict y={690} text="Frame 0 never makes it" color={C.red} o={ep(t, 5.0, 5.8)} size={34} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Want the first frame? Say so." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'First of each second', value: 'round=up', sub: 'or select with mod(n,fps)', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'Default', value: 'the middle', sub: 'about 0.48 s into each second', color: C.red, o: ep(t, 2.0, 2.7), valueSize: 64}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: other rounding modes, variable frame rate input, real footage.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 25 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, near: Near, round: Round, sixty: Sixty, close: Close};
