import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, FrameBox, Halo, Head, Medallion, Mid, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every result below is measured by episodes/ff13/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). */

/* 1. The ask: sideways pixels plus a note */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={560} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Phone video" title="Sideways pixels. A note says: turn 90." o={ep(t, 0.2, 0.8)} />
    <FrameBox cx={640} cy={560} w={320} h={180} k={1.3} color={C.amber} label="320x180" sub="stored pixels" o={ep(t, 1.0, 1.7)} />
    <Medallion y={560} d={104} text="+" o={ep(t, 2.0, 2.6)} />
    <FrameBox cx={1280} cy={560} w={180} h={320} k={1.1} color={C.cyan} label="rotate 90" sub="the tag" o={ep(t, 2.4, 3.1)} />
    <Mid y={800} size={30} color={C.dim} o={ep(t, 4.4, 5.0)}>Five commands. Two readers. A synthetic test pattern.</Mid>
  </>
);

/* 2. The source and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic source" title="Two ways to read each file." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Reader 1 · ffprobe', value: '320x180', sub: 'stored size · tag: rotation 90', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 84}}
      right={{label: 'Reader 2 · decode', value: 'upright', sub: 'compared with 4 reference pictures', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 84}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 2.4, 3.0)} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 5.4, 6.0)}>References: as recorded · upright · upside down · turned the other way</Mid>
  </>
);

/* 3. Plain and copy */
const Plain: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="A plain re-encode" title="FFmpeg turns it for you." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'Stored after re-encode', value: '180x320', sub: 'pixels turned · tag gone', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 84}}
      right={{label: 'Decoded picture', value: 'upright', sub: 'matches the upright reference', color: C.green, o: ep(t, 2.4, 3.1), valueSize: 84}}
      mid="=" midColor={C.green} midO={ep(t, 2.0, 2.6)} />
    <Cmd y={690} text="-c copy keeps 320x180 and the tag: still upright" hi="-c copy" color={C.dim} size={28} o={ep(t, 4.6, 5.2)} />
  </>
);

/* 4. The trap */
const Transpose: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Adding a fix on top" title="Your filter turns it back." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cmd y={270} text="ffmpeg -i in.mp4 -vf transpose=1 -c:v libx264 out.mp4" hi="-vf transpose=1" color={C.red} size={32} o={ep(t, 0.8, 1.4)} />
    <Duel y={400} h={290}
      left={{label: 'Stored', value: '320x180', sub: 'no tag left', color: C.amber, o: ep(t, 1.8, 2.5), valueSize: 84}}
      right={{label: 'Decoded picture', value: 'sideways', sub: 'matches the original', color: C.red, o: ep(t, 3.0, 3.7), valueSize: 84}}
      mid="!" midColor={C.red} midO={ep(t, 2.8, 3.4)} />
    <Verdict y={760} text="The fix undid the fix" color={C.red} o={ep(t, 5.2, 6.0)} size={38} />
  </>
);

/* 5. -noautorotate */
const NoAuto: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="-noautorotate" title="The build decides what happens." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'ffmpeg 6.1.1', value: 'tag kept', sub: 'shown upright', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 80}}
      right={{label: 'ffmpeg 8.1.2', value: 'tag dropped', sub: 'plays sideways', color: C.red, o: ep(t, 2.6, 3.3), valueSize: 80}}
      mid="vs" midO={ep(t, 2.2, 2.8)} />
    <Mid y={680} size={28} color={C.mute} o={ep(t, 4.8, 5.4)}>Stored in both builds: 320x180, pixels as recorded.</Mid>
  </>
);

/* 6. By hand */
const Manual: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="-noautorotate -vf transpose=2" title="Turning it by hand." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'ffmpeg 6.1.1 · tag kept', value: 'upside down', sub: 'turned twice', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 72}}
      right={{label: 'ffmpeg 8.1.2 · tag dropped', value: 'upright', sub: 'turned once', color: C.green, o: ep(t, 2.6, 3.3), valueSize: 72}}
      mid="vs" midO={ep(t, 2.2, 2.8)} />
    <Mid y={680} size={28} color={C.mute} o={ep(t, 4.8, 5.4)}>Stored in both builds: 180x320.</Mid>
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to do" title="Let FFmpeg turn it." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Safe', value: 're-encode', sub: 'or -c copy', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 76}}
      right={{label: 'Avoid', value: '+ transpose', sub: 'on a tagged video', color: C.red, o: ep(t, 2.0, 2.7), valueSize: 76}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={620} size={28} color={C.mute} o={ep(t, 3.6, 4.2)}>Not tested: real phone files, other angles, other containers, players.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.2, 4.8)}>FFmpeg Reality Checks · episode 13 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, plain: Plain, transpose: Transpose, noauto: NoAuto, manual: Manual, close: Close};
