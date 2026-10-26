import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, FrameStrip, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff34/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="100 PNGs to video" title="Why is it the wrong speed?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i img%03d.png -r 10 out.mkv" hi="-r 10" size={36} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'You expect', value: '10 s', sub: '100 frames at 10 fps', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 110}}
      right={{label: 'Test', value: '100 PNGs', sub: 'img001 to img100', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 80}}
      mid="?" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Source and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic PNGs · gray" title="Each picture knows its number." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={44} items={[
      {label: 'Files', value: '100 PNGs', sub: 'img001 to img100', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Marked', value: 'gray = N', sub: 'level 2N + 10 per file', color: C.amber, o: ep(t, 1.6, 2.2)},
      {label: 'Control · no option', value: '4.0 s', sub: '25 fps default, each once', color: C.green, o: ep(t, 2.3, 2.9)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · ffprobe', value: 'packets', sub: 'count, rate, last timestamp', color: C.cyan, o: ep(t, 4.6, 5.3), valueSize: 64}}
      right={{label: 'Reader 2 · decode', value: 'the data', sub: 'frame hashes, pixel values', color: C.amber, o: ep(t, 5.6, 6.3), valueSize: 64}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.2, 5.8)} />
  </>
);

/* 3. Options before -i */
const Input: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={500} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Before the input · rate" title="All 100 frames, 10 s." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={260} cw={400} gap={32} valueSize={72} items={[
      {label: 'Option one', value: '10 s', sub: '-framerate 10 -i\n100 frames, each once', color: C.green, o: ep(t, 0.9, 1.5)},
      {label: 'Option two', value: '10 s', sub: '-r 10 -i\nsame frames, same length', color: C.green, o: ep(t, 1.8, 2.4)},
      {label: 'Both set', value: '10 s', sub: '-framerate 25 -r 10 -i\n-r wins', color: C.amber, o: ep(t, 2.7, 3.3)},
    ]} />
    <Mid y={600} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>-pattern_type glob with either option: same frames, same 10 s.</Mid>
    <Verdict y={700} text="Before -i, both options set the input rate" color={C.green} o={ep(t, 5.8, 6.6)} size={34} />
  </>
);

/* 4. Option after -i: the surprise */
const KEPT = [0, 1, 2, 4, 7, 9];
const Output: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="After the input · rate" title="Frames are dropped." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={280} value="42 of 100" caption="source frames survive · film 4.2 s" color={C.red} size={160} o={ep(t, 0.9, 1.6)} />
    <FrameStrip y={590} n={12} kept={(i) => KEPT.includes(i)} label={(i) => String(i + 1)} o={ep(t, 2.6, 3.2)} fw={112} fh={80} gap={14} />
    <Mid y={785} size={28} color={C.mute} o={ep(t, 4.4, 5.0)}>Files 1 to 12. Kept: 1, 2, 3, 5, 8, 10. None repeated.</Mid>
    <Mid y={840} size={28} color={C.red} o={ep(t, 6.0, 6.6)}>The input still ran at 25 fps. 25 in, 10 out: 58 dropped.</Mid>
  </>
);

/* 5. Rates that work */
const Fix: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Set the input, then convert" title="Same 10 s, more frames." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Duel y={280} h={300}
      left={{label: 'Input rate only', value: '100', sub: '-framerate 10\neach frame once, 10 s', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 110}}
      right={{label: 'Then convert', value: '300', sub: '-framerate 10 -i, then -r 30\neach frame 3 times, 10 s', color: C.cyan, o: ep(t, 2.8, 3.5), valueSize: 110}}
      mid="" midO={0} />
    <Mid y={640} size={30} color={C.dim} o={ep(t, 4.8, 5.4)}>Files start at img051.png: add -start_number 51 (50 frames, 5 s).</Mid>
    <Mid y={700} size={30} color={C.amber} o={ep(t, 6.0, 6.6)}>Without it, the command fails.</Mid>
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Speed goes before -i." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Before the input', value: '-framerate', sub: 'sets the speed of the sequence', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'After the input', value: '-r', sub: 'converts: drops or repeats frames', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 64}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: other rates, other formats, real footage, players.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 34 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, input: Input, output: Output, fix: Fix, close: Close};
