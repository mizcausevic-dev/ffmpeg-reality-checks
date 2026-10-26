import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff37/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Scale to fit, then pad" title="Why a black line?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={300} text="-vf scale=1920:1080:force_original_aspect_ratio=decrease," hi="force_original_aspect_ratio=decrease" size={30} o={ep(t, 1.0, 1.6)} />
    <Cmd y={360} text="pad=1920:1080:(ow-iw)/2:(oh-ih)/2" hi="pad=1920:1080" size={30} o={ep(t, 1.6, 2.2)} />
    <Duel y={480} h={290}
      left={{label: 'You expect', value: 'equal bars', sub: 'the same black above and below', color: C.amber, o: ep(t, 2.6, 3.3), valueSize: 80}}
      right={{label: 'Test', value: '1280x690', sub: 'synthetic pattern, 4:2:0, one frame', color: C.cyan, o: ep(t, 3.6, 4.3), valueSize: 80}}
      mid="?" midO={ep(t, 3.2, 3.8)} />
  </>
);

/* 2. Pattern, readers, control */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic pattern · lossless" title="Two readers. One control." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={44} items={[
      {label: 'Source', value: '1280x690', sub: 'testsrc2, one frame', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Frame', value: '1920x1080', sub: 'scale to fit, then pad', color: C.amber, o: ep(t, 1.6, 2.2)},
      {label: 'Control · 4:3', value: '240 · 240', sub: 'black columns left · right\n1440x1080 picture', color: C.green, o: ep(t, 2.3, 2.9)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · ffprobe', value: 'width, height', sub: 'of the output, and of the unpadded render', color: C.cyan, o: ep(t, 4.6, 5.3), valueSize: 56}}
      right={{label: 'Reader 2 · decode', value: 'the pixels', sub: 'black rows and columns, read in Node', color: C.amber, o: ep(t, 5.6, 6.3), valueSize: 56}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.2, 5.8)} />
  </>
);

/* 3. The odd case */
const Odd: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={560} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Scaled height is odd" title="One row goes missing." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={250} h={250}
      left={{label: 'Scale makes', value: '1920x1035', sub: 'ffprobe, pad asks for y=22.5', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 80}}
      right={{label: 'The frame holds', value: '1034 rows', sub: 'of picture, in 1920x1080', color: C.red, o: ep(t, 2.4, 3.1), valueSize: 80}}
      mid="→" midO={ep(t, 2.0, 2.6)} />
    <Figure y={560} value="22 vs 24" caption="black rows above vs below · asked for 22.5 each" color={C.red} size={150} o={ep(t, 4.0, 4.8)} />
    <Verdict y={810} text="The last picture row is gone" color={C.red} o={ep(t, 5.8, 6.6)} size={34} />
  </>
);

/* 4. Why: 4:2:0 */
const Why: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Pad rounds to even" title="Chroma is half size." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={250} h={290}
      left={{label: '4:2:0 · asked row 21', value: 'row 20', sub: 'picture starts here\n1034 rows kept', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 100}}
      right={{label: '4:4:4 · asked row 21', value: 'row 21', sub: 'honored\nall 1035 rows kept', color: C.green, o: ep(t, 2.8, 3.5), valueSize: 100}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Row y={620} h={200} cw={520} gap={32} valueSize={52} items={[
      {label: '4:3 in a 1080x1920 frame', value: '554 · 556', sub: 'rows above · below, none cropped', color: C.amber, o: ep(t, 4.6, 5.2)},
      {label: 'Odd width 1917', value: '0 · 4', sub: 'columns left · right', color: C.amber, o: ep(t, 5.4, 6.0)},
    ]} />
  </>
);

/* 5. Encoder error and fix */
const Fix: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Make the size even" title="Pad, or force even." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Duel y={250} h={300}
      left={{label: 'Scale alone · encoder', value: 'refused', sub: 'libx264: height not divisible\nby 2 (1920x1035)', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 100}}
      right={{label: 'Scale, then pad', value: '1920x1080', sub: 'encodes, even size', color: C.green, o: ep(t, 2.4, 3.1), valueSize: 100}}
      mid="" midO={0} />
    <Row y={620} h={200} cw={520} gap={32} valueSize={52} items={[
      {label: 'Divisible by 2 · bars', value: '22 · 22', sub: 'force_divisible_by=2\n1036 rows, none lost', color: C.green, o: ep(t, 4.4, 5.0)},
      {label: 'Odd offset · columns', value: '0 · 2', sub: '1918 wide, x=1\nstill not centered', color: C.amber, o: ep(t, 5.4, 6.0)},
    ]} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Even size. Even offset." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Scaled size', value: 'even', sub: 'force_divisible_by=2', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 80}}
      right={{label: 'Odd offset', value: 'off by 2', sub: 'bars can differ by 2 pixels', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 80}}
      mid="+" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: other builds, other pad colors, other scale algorithms, real footage, players.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 37 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, odd: Odd, why: Why, fix: Fix, close: Close};
