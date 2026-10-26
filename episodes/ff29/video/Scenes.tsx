import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, FrameStrip, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff29/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Speed up 2x" title="Why is the audio out of sync?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mkv -vf setpts=0.5*PTS out.mkv" hi="setpts=0.5*PTS" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'You expect', value: 'both 2x', sub: 'picture and audio', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 80}}
      right={{label: 'Test', value: '10 s clip', sub: '300 frames and a 440 Hz tone', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 80}}
      mid="?" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Source and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clip · lossless" title="Marked frames. One tone." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={44} items={[
      {label: 'Picture', value: '300 frames', sub: '30 fps, 10 s', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Audio', value: '440 Hz', sub: 'sine, 10 s', color: C.amber, o: ep(t, 1.6, 2.2)},
      {label: 'Control', value: '10 · 10 · 10 s', sub: 'picture, audio, container', color: C.green, o: ep(t, 2.3, 2.9)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · packets', value: 'ffprobe', sub: 'last timestamp plus duration', color: C.cyan, o: ep(t, 4.6, 5.3), valueSize: 64}}
      right={{label: 'Reader 2 · decode', value: 'the data', sub: 'hashes, pixels, samples', color: C.amber, o: ep(t, 5.6, 6.3), valueSize: 64}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.2, 5.8)} />
  </>
);

/* 3. setpts alone */
const Video: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Video filter alone" title="The picture ends first." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Picture', value: '5.07 s', sub: 'sped up 2x', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 110}}
      right={{label: 'Audio', value: '10.0 s', sub: 'untouched, 440 Hz', color: C.red, o: ep(t, 2.4, 3.1), valueSize: 110}}
      mid="vs" midO={ep(t, 2.0, 2.6)} />
    <Mid y={650} size={30} color={C.dim} o={ep(t, 4.2, 4.8)}>setpts=0.5*PTS · container 10.0 s · at 2.5 s the picture is at source second 4.9.</Mid>
    <Verdict y={740} text="The audio plays on after the picture ends" color={C.red} o={ep(t, 5.6, 6.4)} size={34} />
  </>
);

/* 4. Frames that survive */
const KEPT = [0, 1, 2, 3, 5, 7, 9, 11];
const Frames: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="30 fps output · default" title="Half the frames go." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Figure y={290} value="152 of 300" caption="source frames survive" color={C.red} size={160} o={ep(t, 0.9, 1.6)} />
    <FrameStrip y={590} n={12} kept={(i) => KEPT.includes(i)} o={ep(t, 2.6, 3.2)} fw={112} fh={80} gap={14} />
    <Mid y={785} size={28} color={C.mute} o={ep(t, 4.4, 5.0)}>Source frames 0 to 11. Kept: 0, 1, 2, 3, then every second frame.</Mid>
    <Mid y={840} size={28} color={C.green} o={ep(t, 6.0, 6.6)}>-fps_mode passthrough keeps all 300, in 5.0 s.</Mid>
  </>
);

/* 5. atempo and asetrate */
const Fix: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Change the audio too" title="Same length. Pitch differs." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Keeps the pitch', value: '440 Hz', sub: '-af atempo=2\naudio 5.0 s', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 110}}
      right={{label: 'Raises the pitch', value: '880 Hz', sub: '-af asetrate=88200,aresample=44100\naudio 5.0 s', color: C.red, o: ep(t, 2.8, 3.5), valueSize: 110}}
      mid="" midO={0} />
    <Mid y={650} size={30} color={C.dim} o={ep(t, 4.8, 5.4)}>With atempo: picture 5.07 s, audio 5.0 s, container 5.07 s.</Mid>
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Speed up both streams." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Same pitch', value: 'atempo=2', sub: 'with setpts=0.5*PTS', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'Higher pitch', value: 'asetrate', sub: 'moves 440 Hz to 880 Hz', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 64}}
      mid="or" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: other speeds, chained atempo, variable frame rate, real footage, players.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 29 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, video: Video, frames: Frames, fix: Fix, close: Close};
