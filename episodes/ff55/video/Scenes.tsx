import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, FrameStrip, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff55/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* stored time, in ticks at timescale 1000, of frames 0 to 9 */
const TICKS = ['0', '33', '67', '100', '133', '167', '200', '234', '267', '300'];

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Timestamps in an mp4" title="Do 29.97 fps timestamps round?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mkv -c:v libx264 -video_track_timescale 1000 out.mp4" hi="-video_track_timescale 1000" size={30} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'One frame lasts', value: '33.37 ms', sub: 'not a whole number', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 80}}
      right={{label: 'The file stores', value: 'whole ticks', sub: 'ticks per second = timescale', color: C.amber, o: ep(t, 3.6, 4.3), valueSize: 80}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 5.2, 5.8)}>We set the track timescale seven ways and read every frame, on ffmpeg 6.1.1.</Mid>
  </>
);

/* 2. The clip, the control, the readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clip · 300 frames · 10.01 s" title="One gray clip, two readers." o={ep(t, 0.2, 0.8)} />
    <Row y={270} h={200} cw={520} gap={40} valueSize={52} items={[
      {label: 'Exact frame time', value: '33.3667 ms', sub: 'n × 1001 / 30000 seconds', color: C.cyan, o: ep(t, 1.0, 1.6)},
      {label: 'Control, timescale 30000', value: '1001 ticks', sub: 'every frame · zero error', color: C.green, o: ep(t, 2.4, 3.0)},
      {label: 'Timescales set', value: '7 settings', sub: 'six values and the default', color: C.cyan, o: ep(t, 3.8, 4.4)},
    ]} />
    <Row y={540} h={190} cw={520} gap={40} valueSize={46} items={[
      {label: 'Reader 1', value: 'mp4 bytes', sub: 'the stts table, parsed in Node', color: C.cyan, o: ep(t, 5.4, 6.0)},
      {label: 'Reader 2', value: 'ffprobe', sub: 'packet and decoded frame pts', color: C.amber, o: ep(t, 6.2, 6.8)},
      {label: 'Counts only', value: 'framemd5', sub: 'times are frame numbers', color: C.green, o: ep(t, 7.0, 7.6)},
    ]} />
    <Mid y={800} size={28} color={C.mute} o={ep(t, 8.0, 8.5)}>Lossless x264, no B-frames, so a frame time is its stored decode time.</Mid>
  </>
);

/* 3. Timescale 1000 */
const Round: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={500} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Timescale 1000" title="Rounded to the millisecond." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={258} value="33 or 34" caption="ms per frame, never 33.37" size={150} color={C.red} o={ep(t, 0.9, 1.7)} />
    <Mid y={535} size={26} color={C.dim} o={ep(t, 2.6, 3.2)}>Stored time of frames 0 to 9, in ms</Mid>
    <FrameStrip y={575} n={10} kept={() => true} label={(i) => TICKS[i]} fw={150} fh={70} gap={14} o={ep(t, 2.8, 3.5)} />
    <Row y={735} h={140} cw={520} gap={40} valueSize={46} items={[
      {label: 'Frames of 33 ms', value: '190', sub: 'of 300', color: C.cyan, o: ep(t, 4.6, 5.2)},
      {label: 'Frames of 34 ms', value: '110', sub: 'of 300', color: C.red, o: ep(t, 5.4, 6.0)},
      {label: 'Both readers', value: 'agree', sub: 'tick for tick', color: C.green, o: ep(t, 6.2, 6.8)},
    ]} />
  </>
);

/* 4. No drift */
const Drift: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Rounded from the exact time" title="Half a tick, no drift." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Row y={270} h={230} cw={520} gap={40} valueSize={60} items={[
      {label: 'Timescale 1000', value: '0.50 ms', sub: 'largest error · last frame 0.37 ms', color: C.amber, o: ep(t, 1.2, 1.8)},
      {label: 'Timescale 600', value: '0.83 ms', sub: 'largest error · last frame 0.03 ms', color: C.amber, o: ep(t, 2.6, 3.2)},
      {label: 'Clip length', value: '10.01 s', sub: 'exact at both', color: C.green, o: ep(t, 4.0, 4.6)},
    ]} />
    <Duel y={570} h={210}
      left={{label: 'Control, 25 fps at 1000', value: '40 ticks', sub: 'every frame · zero error', color: C.green, o: ep(t, 5.6, 6.3), valueSize: 64}}
      right={{label: '29.97 fps at 1000', value: '33 or 34', sub: 'error never above 0.50 ms', color: C.amber, o: ep(t, 6.4, 7.1), valueSize: 64}}
      mid="vs" midO={ep(t, 6.2, 6.8)} />
    <Verdict y={830} text="The error does not accumulate" color={C.green} o={ep(t, 7.8, 8.4)} size={34} />
  </>
);

/* 5. Which timescales are exact */
const Exact: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Which timescales are exact" title="Multiples of 30000 only." o={ep(t, 0.2, 0.8)} />
    <Row y={260} h={190} cw={520} gap={40} valueSize={52} items={[
      {label: 'Timescale 30000', value: '1001 ticks', sub: 'zero error', color: C.green, o: ep(t, 1.0, 1.6)},
      {label: 'Timescale 90000', value: '3003 ticks', sub: 'zero error', color: C.green, o: ep(t, 1.8, 2.4)},
      {label: 'Default, no option', value: '30000', sub: 'the same ticks as 30000', color: C.green, o: ep(t, 2.6, 3.2)},
    ]} />
    <Row y={490} h={190} cw={520} gap={40} valueSize={52} items={[
      {label: 'Timescale 24000', value: '800 or 801', sub: 'up to 0.017 ms off', color: C.amber, o: ep(t, 4.0, 4.6)},
      {label: 'Timescale 15360', value: '512 or 513', sub: 'up to 0.032 ms off', color: C.amber, o: ep(t, 4.8, 5.4)},
      {label: 'Timescale 600', value: '20 or 21', sub: 'up to 0.83 ms off', color: C.amber, o: ep(t, 5.6, 6.2)},
    ]} />
    <Mid y={730} size={28} color={C.dim} o={ep(t, 6.8, 7.4)}>At 15360 ffprobe's avg_frame_rate reads 2304000/76877, not 30000/1001, and the clip is 10.010026 s.</Mid>
  </>
);

/* 6. 29.97 as a decimal */
const Rate: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="29.97 typed as a decimal" title="Not 30000/1001." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cmd y={270} text="ffmpeg -f lavfi -i color=c=gray:r=29.97 -frames:v 300 out.mp4" hi="r=29.97" size={28} o={ep(t, 0.9, 1.5)} />
    <Duel y={390} h={300}
      left={{label: 'Rate 30000/1001', value: '30000', sub: 'timescale\n1001 ticks a frame', color: C.green, o: ep(t, 2.2, 2.9), valueSize: 86}}
      right={{label: 'Rate 29.97', value: '11988', sub: 'timescale, rate 2997/100\n400 ticks a frame', color: C.red, o: ep(t, 3.8, 4.5), valueSize: 86}}
      mid="vs" midO={ep(t, 3.4, 4.0)} />
    <Mid y={740} size={28} color={C.dim} o={ep(t, 5.6, 6.2)}>At frame 299 the decimal file is 0.010 ms behind the 30000/1001 grid. It lasts 10.01001 s, not 10.01 s.</Mid>
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Read the ticks." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Multiple of 30000', value: 'exact', sub: 'or the default, 30000 here', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 70}}
      right={{label: 'Any other timescale', value: 'rounds', sub: 'within half a tick, no drift', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 70}}
      mid="" midO={0} />
    <Mid y={590} size={28} color={C.mute} o={ep(t, 3.8, 4.4)}>framemd5 prints frame numbers, so it cannot see this. Not tested: other containers, other rates, real footage, builds other than ffmpeg 6.1.1.</Mid>
    <Mid y={760} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 55 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, round: Round, drift: Drift, exact: Exact, rate: Rate, close: Close};
