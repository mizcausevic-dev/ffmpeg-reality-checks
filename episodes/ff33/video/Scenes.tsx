import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, FrameStrip, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff33/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Looping a clip" title="Seamless? The right length?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -stream_loop 2 -i in.mkv out.mkv" hi="-stream_loop 2" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'You expect', value: '3 x 4 s', sub: '12 s, no seam', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 80}}
      right={{label: 'Test', value: '4 s clip', sub: '120 frames and an audio ramp', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 80}}
      mid="?" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Source and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clip · lossless" title="Marked frames. Marked samples." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={44} items={[
      {label: 'Picture', value: '120 frames', sub: '30 fps, 4.0 s', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Audio', value: 'a ramp', sub: 'each sample marks its place', color: C.amber, o: ep(t, 1.6, 2.2)},
      {label: 'Control · equal lengths', value: '360 · 12.0 s', sub: 'frames, seconds', color: C.green, o: ep(t, 2.3, 2.9)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · packets', value: 'ffprobe', sub: 'timestamps and durations', color: C.cyan, o: ep(t, 4.6, 5.3), valueSize: 64}}
      right={{label: 'Reader 2 · decode', value: 'the data', sub: 'hashes, pixels, samples', color: C.amber, o: ep(t, 5.6, 6.3), valueSize: 64}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.2, 5.8)} />
    <Mid y={800} size={28} color={C.mute} o={ep(t, 7.0, 7.6)}>The control also matches a concat demuxer build, frame for frame.</Mid>
  </>
);

/* 3. Audio shorter than the picture */
const Short: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Audio 3.9 s · picture 4.0 s · re-encode" title="The loop follows the audio." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={280} h={250}
      left={{label: 'Expected', value: '12.00 s', sub: '360 frames', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 96}}
      right={{label: 'Measured', value: '11.83 s', sub: '355 frames, audio 11.7 s', color: C.red, o: ep(t, 2.2, 2.9), valueSize: 96}}
      mid="vs" midO={ep(t, 1.8, 2.4)} />
    <FrameStrip y={575} n={8} kept={(i) => i >= 2} label={(i) => String(i)} o={ep(t, 3.8, 4.4)} fw={112} fh={80} gap={14} />
    <Mid y={745} size={28} color={C.mute} o={ep(t, 5.0, 5.6)}>Source frames at the start of play 2. Frames 0 and 1 are gone; play 3 starts at frame 3.</Mid>
    <Mid y={800} size={28} color={C.amber} o={ep(t, 6.4, 7.0)}>Audio 3.97 s, only 30 ms short: 359 frames.</Mid>
  </>
);

/* 4. Audio longer, and -c copy */
const Long: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Other cases" title="Holes at every seam." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={280} h={310}
      left={{label: 'Re-encode · audio 4.1 s', value: '12.3 s', sub: 'all 360 frames\npicture holes 0.13 s', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 110}}
      right={{label: '-c copy · audio 3.9 s', value: '12.0 s', sub: 'picture, 360 frames\nsound holes 0.1 s', color: C.amber, o: ep(t, 3.0, 3.7), valueSize: 110}}
      mid="" midO={0} />
    <Mid y={650} size={30} color={C.dim} o={ep(t, 5.0, 5.6)}>-c copy, audio 3.9 s: 11.7 s of samples on an 11.9 s timeline.</Mid>
    <Verdict y={740} text="The seam is a hole, not a join" color={C.red} o={ep(t, 6.2, 7.0)} size={34} />
  </>
);

/* 5. Infinite loop and -t */
const Span: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="-stream_loop -1 -t 25" title="Exact length. Lost heads." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Figure y={260} value="25.0 s" caption="750 frames, 7 plays, the last one cut after 1 s" color={C.green} size={150} o={ep(t, 0.9, 1.6)} />
    <Row y={560} h={230} cw={520} gap={32} valueSize={44} items={[
      {label: 'Audio 4.0 s · play starts', value: '0 0 0 0 0 0 0', sub: 'source frame of each play', color: C.green, o: ep(t, 3.4, 4.0)},
      {label: 'Audio 3.9 s · play starts', value: '0 2 3 3 3 3 3', sub: 'still 25.0 s, 750 frames', color: C.red, o: ep(t, 4.4, 5.0)},
      {label: 'Sound minus picture', value: '-33 ms', sub: 'at every seam, no drift', color: C.cyan, o: ep(t, 5.4, 6.0)},
    ]} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Match the lengths first." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Equal lengths', value: 'exact', sub: '360 frames, 12.0 s', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 80}}
      right={{label: 'Unequal lengths', value: 'lost or holes', sub: '30 ms to 100 ms measured', color: C.red, o: ep(t, 2.0, 2.7), valueSize: 64}}
      mid="or" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: other builds, containers and codecs, real footage with encoder delay, stream order, players.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 33 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, short: Short, long: Long, span: Span, close: Close};
