import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff09/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="scale + libx264" title="Sometimes it crashes." o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mp4 -vf scale=-1:H -c:v libx264 out.mp4" hi="scale=-1:H" size={32} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'Most videos', value: 'works', sub: 'a clean file comes out', color: C.green, o: ep(t, 2.2, 2.9), valueSize: 80}}
      right={{label: 'Some videos', value: 'crashes', sub: 'exit code, no file', color: C.red, o: ep(t, 2.9, 3.6), valueSize: 80}}
      mid="?" midO={ep(t, 3.4, 4.0)} />
    <Mid y={830} size={30} o={ep(t, 4.8, 5.4)}>Same command. What differs?</Mid>
  </>
);

/* 2. Control */
const Control: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Control" title="A clean 16:9 case." o={ep(t, 0.2, 0.8)} />
    <Row y={300} h={280} valueSize={64} items={[
      {label: 'Source', value: '1920x1080', color: C.dim, o: ep(t, 0.9, 1.5)},
      {label: 'Filter', value: 'scale=-1:720', color: C.cyan, o: ep(t, 1.6, 2.2)},
      {label: 'Result', value: '1280x720', color: C.green, o: ep(t, 2.3, 2.9)},
    ]} cw={540} gap={36} />
    <Verdict y={680} text="Exit code 0 · 10 frames on disk" color={C.green} o={ep(t, 4.4, 5.2)} size={36} />
    <Mid y={770} size={28} color={C.mute} o={ep(t, 5.4, 6.0)}>-1 means: work out the width, keep the shape.</Mid>
  </>
);

/* 3. The crash */
const Crash: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="1000x562 · scale=-1:333" title="Both numbers odd." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'scale produced', value: '593x333', sub: 'width 593, height 333', color: C.amber, o: ep(t, 0.9, 1.6)}}
      right={{label: 'libx264 said', value: 'refused', sub: 'width not divisible by 2 (593x333)', color: C.red, o: ep(t, 2.4, 3.1), valueSize: 84}}
      mid="odd" midColor={C.red} midO={ep(t, 2.0, 2.6)} />
    <Verdict y={690} text="Exit code not zero · nothing usable written" color={C.red} o={ep(t, 4.6, 5.4)} size={34} />
    <Mid y={770} size={28} color={C.mute} o={ep(t, 5.8, 6.4)}>The filter and the encoder name the same size.</Mid>
  </>
);

/* 4. Which number breaks it */
const Which: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Either one is enough" title="Width or height." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={330}
      left={{label: 'Odd width only', value: '427x240', sub: 'scale=-1:240 · fails: width', color: C.amber, o: ep(t, 0.9, 1.6), valueSize: 84}}
      right={{label: 'Odd height only', value: '592x333', sub: 'scale=-2:333 · fails: height', color: C.red, o: ep(t, 3.4, 4.1), valueSize: 84}}
      mid="or" midO={ep(t, 3.0, 3.6)} />
    <Mid y={690} size={30} o={ep(t, 5.4, 6.0)}>-2 rounds the width to even. It does not touch the height.</Mid>
  </>
);

/* 5. The fix */
const Fix: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="The fix" title="Make both even." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Row y={300} h={280} valueSize={64} items={[
      {label: 'Filter', value: 'scale=-2:334', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Result', value: '594x334', color: C.green, o: ep(t, 1.6, 2.2)},
      {label: 'Exit code', value: '0', color: C.green, o: ep(t, 2.3, 2.9)},
    ]} cw={540} gap={36} />
    <Mid y={680} size={32} o={ep(t, 3.8, 4.4)}>10 frames on disk, read back with ffprobe.</Mid>
  </>
);

/* 6. Why the encoder cares */
const Why: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Same 593x333 frame" title="Only 4:2:0 refuses." o={ep(t, 0.2, 0.8)} />
    <Duel y={280} h={310}
      left={{label: 'yuv420p', value: 'refused', sub: 'exit code not zero', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 84}}
      right={{label: 'yuv444p', value: 'encodes', sub: '593x333 · exit 0', color: C.green, o: ep(t, 1.8, 2.5), valueSize: 84}}
      mid="vs" midO={ep(t, 2.2, 2.8)} />
    <Mid y={650} size={30} o={ep(t, 4.6, 5.2)}>4:2:0 stores color at half the width and half the height.</Mid>
    <Mid y={720} size={28} color={C.mute} o={ep(t, 6.0, 6.6)}>Only libx264 was tested.</Mid>
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Pick an even height" title="The crash is not random." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Width', value: 'use -2', sub: 'rounds to even', color: C.cyan, o: ep(t, 1.4, 2.1), valueSize: 80}}
      right={{label: 'Height', value: 'choose even', sub: 'you control it', color: C.green, o: ep(t, 2.0, 2.7), valueSize: 80}}
      mid="+" midO={ep(t, 2.4, 3.0)} />
    <Mid y={620} size={30} color={C.dim} o={ep(t, 3.6, 4.2)}>Same on ffmpeg 6.1.1 and 8.1.2. The exit number differs, never zero.</Mid>
    <Mid y={690} size={28} color={C.mute} o={ep(t, 4.2, 4.8)}>Not tested: other encoders, hardware encoders, builds in between.</Mid>
    <Mid y={780} size={30} color={C.dim} o={ep(t, 4.8, 5.4)}>FFmpeg Reality Checks · episode 9 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, control: Control, crash: Crash, which: Which, fix: Fix, why: Why, close: Close};
