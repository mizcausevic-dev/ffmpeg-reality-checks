import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, FrameStrip, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff32/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="The last N seconds" title="What exactly do you get?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -sseof -3 -i in.mkv out.mkv" hi="-sseof -3" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'You expect', value: '3 s', sub: 'the last 90 frames', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 80}}
      right={{label: 'Test', value: '10 s clip', sub: '300 frames with unique codes', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 80}}
      mid="?" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Source and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clip · stored three ways" title="Marked frames. Three GOPs." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={44} items={[
      {label: 'FFV1 · lossless', value: 'all keyframes', sub: '300 frames, 30 fps', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'x264 · GOP 100', value: '0 · 100 · 200', sub: 'lossless, 3 keyframes', color: C.amber, o: ep(t, 1.6, 2.2)},
      {label: 'x264 · GOP 10', value: 'every 10', sub: 'lossless, 30 keyframes', color: C.green, o: ep(t, 2.3, 2.9)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · packets', value: 'ffprobe', sub: 'first pts, last pts plus duration', color: C.cyan, o: ep(t, 4.6, 5.3), valueSize: 64}}
      right={{label: 'Reader 2 · decode', value: 'the data', sub: 'frame hashes and pixel codes', color: C.amber, o: ep(t, 5.6, 6.3), valueSize: 64}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.2, 5.8)} />
  </>
);

/* 3. Re-encode is exact */
const Exact: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Re-encode · all three files" title="Exactly the last 90." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Figure y={270} value="90 frames" caption="source frames 210 to 299 · 3 s" color={C.green} size={170} o={ep(t, 0.9, 1.6)} />
    <Duel y={620} h={230}
      left={{label: 'Counted from the end', value: '210 to 299', sub: 'FFV1, GOP 100 and GOP 10 alike', color: C.cyan, o: ep(t, 3.0, 3.7), valueSize: 64}}
      right={{label: 'Control · explicit start', value: '210 to 299', sub: 'start at 7 s (10 s minus 3 s)', color: C.green, o: ep(t, 4.4, 5.1), valueSize: 64}}
      mid="=" midO={ep(t, 4.0, 4.6)} />
  </>
);

/* 4. Stream copy */
const Copy: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={400} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Stream copy · keyframe every 100 frames" title="Ten extra frames." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={250} value="100 frames" caption="3.333 s · starts at keyframe 200" color={C.red} size={150} o={ep(t, 0.9, 1.6)} />
    <FrameStrip y={510} n={12} kept={(i) => i >= 10} label={(i) => String(200 + i)} o={ep(t, 2.6, 3.2)} fw={112} fh={80} gap={14} />
    <Mid y={705} size={28} color={C.mute} o={ep(t, 4.4, 5.0)}>Source frames 200 to 211. Asked for 210 on. Frames 200 to 209 come along.</Mid>
    <Row y={760} h={150} cw={560} gap={32} valueSize={44} items={[
      {label: 'GOP 10 · 3 s from the end', value: '90 frames', sub: 'keyframe 210, exact', color: C.green, o: ep(t, 5.4, 6.0)},
      {label: 'GOP 10 · 2.9 s from the end', value: '87 vs 90', sub: 're-encode vs copy', color: C.amber, o: ep(t, 6.4, 7.0)},
    ]} />
  </>
);

/* 5. Counted from the container end */
const Ends: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Counted back from the container" title="Not from the picture." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={260} h={340}
      left={{label: 'Picture kept · last 3 s', value: '1 s', sub: '10 s picture, 12 s audio\n30 frames: 270 to 299', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 110}}
      right={{label: 'Audio kept', value: '3 s', sub: 'container duration 12 s', color: C.cyan, o: ep(t, 2.4, 3.1), valueSize: 110}}
      mid="vs" midO={ep(t, 2.0, 2.6)} />
    <Figure y={660} value="300 of 300" caption="-sseof -30 on a 10 s file · no error" color={C.amber} size={120} o={ep(t, 4.4, 5.2)} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Exact means re-encode." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Exact last N seconds', value: 're-encode', sub: '90 frames for -sseof -3', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'With stream copy', value: 'starts earlier', sub: 'at the previous keyframe', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 64}}
      mid="or" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: other containers and encoders, audio with -c copy, real footage, players.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 32 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, exact: Exact, copy: Copy, ends: Ends, close: Close};
