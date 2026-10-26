import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Mid, Mirror, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff16/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="-r 10" title="Before -i or after -i?" o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Before the input', value: 'ffmpeg -r 10 -i', sub: 'in.mp4 out.mp4', color: C.cyan, o: ep(t, 1.2, 1.9), valueSize: 44}}
      right={{label: 'After the input', value: 'ffmpeg -i in.mp4', sub: '-r 10 out.mp4', color: C.amber, o: ep(t, 2.2, 2.9), valueSize: 44}}
      mid="?" midO={ep(t, 2.8, 3.4)} />
    <Mid y={660} size={30} color={C.dim} o={ep(t, 4.4, 5.0)}>Source: 60 frames at 30 fps, a synthetic test pattern.</Mid>
  </>
);

/* 2. Readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Source: 60 frames · 30 fps · 2.0 s" title="Two ways to read each file." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Reader 1 · ffprobe', value: 'declared', sub: 'duration and frame rate', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 80}}
      right={{label: 'Reader 2 · inside', value: 'the frames', sub: 'packets · decoded frames · gaps', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 80}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 2.4, 3.0)} />
  </>
);

/* 3. After the input */
const After: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="ffmpeg -i in.mp4 -r 10 out.mp4" title="After: frames are dropped." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: '-r 10 after -i', value: '22', sub: 'frames · 2.2 s · 10 fps', color: C.amber, o: ep(t, 0.9, 1.6), valueSize: 108}}
      right={{label: 'fps=10 filter', value: '20', sub: 'frames · 2.0 s · 10 fps', color: C.green, o: ep(t, 2.4, 3.1), valueSize: 108}}
      mid="vs" midO={ep(t, 2.0, 2.6)} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 4.6, 5.2)}>60 frames in. The filter is the exact way to drop them.</Mid>
  </>
);

/* 4. Before the input */
const Before: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="ffmpeg -r 10 -i in.mp4 out.mp4" title="Before: time is stretched." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Mirror y={300} label="Length" max={6} half={420} p={ep(t, 0.9, 2.3)} o={ep(t, 0.8, 1.3)}
      left={{value: 2, text: 'source 2 s', color: C.cyan}} right={{value: 6, text: 'output 6 s', color: C.red}} />
    <Row y={440} h={200} cw={520} gap={40} valueSize={72} items={[
      {label: 'Frames kept', value: '60 / 60', color: C.green, o: ep(t, 2.8, 3.5)},
      {label: 'Playback speed', value: '1/3', color: C.red, o: ep(t, 3.6, 4.3)},
    ]} />
    <Verdict y={720} text="-r on both sides gives the same: 6 s" color={C.amber} o={ep(t, 5.6, 6.4)} size={32} />
  </>
);

/* 5. With copy */
const Copy: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="-r 10 before -i · with -c copy" title="No effect on an MP4." o={ep(t, 0.2, 0.8)} />
    <Cmd y={270} text="ffmpeg -r 10 -i in.mp4 -c copy out.mp4" hi="-r 10" size={32} o={ep(t, 0.8, 1.4)} />
    <Duel y={400} h={290}
      left={{label: 'Frame rate', value: '30 fps', sub: 'unchanged', color: C.green, o: ep(t, 1.8, 2.5), valueSize: 96}}
      right={{label: 'Length', value: '2.0 s', sub: '60 frames', color: C.green, o: ep(t, 2.8, 3.5), valueSize: 96}}
      mid="=" midColor={C.green} midO={ep(t, 2.6, 3.2)} />
  </>
);

/* 6. Raw stream */
const Raw: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Raw H.264 · no stored timing" title="Here, before -i is the way." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'No -r', value: '30 fps', sub: '2.0 s · assumed default', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 96}}
      right={{label: '-r 10 before -i', value: '10 fps', sub: '6.0 s · 60 frames', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 96}}
      mid="vs" midO={ep(t, 2.0, 2.6)} />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to remember" title="Frames, or the clock." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'After -i', value: 'frames', sub: 'drops them', color: C.amber, o: ep(t, 1.4, 2.1), valueSize: 84}}
      right={{label: 'Before -i', value: 'the clock', sub: 'relabels the timing', color: C.cyan, o: ep(t, 2.0, 2.7), valueSize: 84}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.dim} o={ep(t, 3.4, 4.0)}>Exact dropping: the fps filter. Same on 6.1.1 and 8.1.2.</Mid>
    <Mid y={680} size={28} color={C.mute} o={ep(t, 4.0, 4.6)}>Not tested: variable frame rate, other containers, audio.</Mid>
    <Mid y={770} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 16 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, after: After, before: Before, copy: Copy, raw: Raw, close: Close};
