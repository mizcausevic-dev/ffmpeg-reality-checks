import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff21/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). Times are keyframe pts in seconds. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Keyframe interval" title="Every 4 seconds?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mkv -c:v libx264 -g 100 out.mp4" hi="-g 100" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'Expected', value: '0 · 4 · 8', sub: 'seconds, every 100 frames', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 76}}
      right={{label: 'Test', value: '4 encodes', sub: 'one clip, two readers', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 64}}
      mid="?" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Clip and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clip · 10 s · 25 fps" title="Two hard cuts." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={44} items={[
      {label: '0 to 3.2 s', value: 'bars', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: '3.2 to 6.8 s', value: 'pattern', color: C.amber, o: ep(t, 1.6, 2.2)},
      {label: '6.8 to 10 s', value: 'RGB', color: C.green, o: ep(t, 2.3, 2.9)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · packets', value: 'key flag', sub: 'ffprobe, packet flags', color: C.cyan, o: ep(t, 4.6, 5.3), valueSize: 64}}
      right={{label: 'Reader 2 · frames', value: 'I frames', sub: 'ffprobe, decoded picture type', color: C.amber, o: ep(t, 5.6, 6.3), valueSize: 64}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.2, 5.8)} />
  </>
);

/* 3. Cuts */
const Cuts: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.amber} o={ep(t, 0.2, 1.4)} />
    <Head over="-g 100 alone" title="Keyframes land on the cuts." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={260} cw={400} gap={32} valueSize={72} items={[
      {label: 'Keyframe', value: '0 s', color: C.green, o: ep(t, 0.9, 1.5)},
      {label: 'Keyframe', value: '3.2 s', color: C.amber, o: ep(t, 2.2, 2.8)},
      {label: 'Keyframe', value: '6.8 s', color: C.amber, o: ep(t, 3.2, 3.8)},
    ]} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 4.8, 5.4)}>Not 4 s and 8 s. The setting is a maximum.</Mid>
  </>
);

/* 4. Grid */
const Grid: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="-g 100 -sc_threshold 0" title="A strict grid." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={260} cw={400} gap={32} valueSize={72} items={[
      {label: 'Keyframe', value: '0 s', color: C.green, o: ep(t, 0.9, 1.5)},
      {label: 'Keyframe', value: '4 s', color: C.green, o: ep(t, 2.2, 2.8)},
      {label: 'Keyframe', value: '8 s', color: C.green, o: ep(t, 3.2, 3.8)},
    ]} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 4.8, 5.4)}>The cuts at 3.2 s and 6.8 s get no keyframe.</Mid>
  </>
);

/* 5. Forced */
const Forced: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="-force_key_frames" title="Say where, and it happens." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: '3.2,6.8 · scenecut off', value: '0 · 3.2 · 6.8', sub: 'exactly what was asked', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 56}}
      right={{label: '2 · scenecut on', value: '0 · 2 · 3.2 · 6.8', sub: 'added to the cuts', color: C.amber, o: ep(t, 3.0, 3.7), valueSize: 48}}
      mid="vs" midO={ep(t, 2.6, 3.2)} />
    <Mid y={680} size={28} color={C.mute} o={ep(t, 5.4, 6.0)}>Both readers agree on every encode.</Mid>
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="-g is a maximum." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Largest gap', value: '≤ 4 s', sub: 'in all four encodes', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 84}}
      right={{label: 'Fixed grid', value: 'scenecut off', sub: '-sc_threshold 0', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 56}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: x265, other encoders, B-frame settings, real footage.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 21 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, cuts: Cuts, grid: Grid, forced: Forced, close: Close};
