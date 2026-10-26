import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff11/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="x264 · crf 0" title="Lossless means lossless?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i frames -c:v libx264 -crf 0 out.mkv" hi="-crf 0" size={32} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'RGB in', value: '25 frames', sub: '320x180 test pattern', color: C.cyan, o: ep(t, 2.2, 2.9), valueSize: 84}}
      right={{label: 'RGB out', value: 'the same?', sub: 'bit for bit', color: C.amber, o: ep(t, 2.9, 3.6), valueSize: 84}}
      mid="?" midO={ep(t, 3.4, 4.0)} />
  </>
);

/* 2. Two readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic source · 25 frames · planar RGB" title="Two ways to compare." o={ep(t, 0.2, 0.8)} />
    <Row y={310} h={290} cw={640} gap={60} valueSize={52} items={[
      {label: 'Reader 1', value: 'frame md5', sub: 'how many of 25 frames are bit-identical', color: C.cyan, o: ep(t, 0.9, 1.6)},
      {label: 'Reader 2', value: 'psnr', sub: 'inf means no difference at all', color: C.amber, o: ep(t, 1.8, 2.5)},
    ]} />
    <Mid y={680} size={28} color={C.mute} o={ep(t, 4.0, 4.6)}>Both compare the decoded output with the RGB source.</Mid>
  </>
);

/* 3. Controls */
const Control: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Two controls" title="These two are lossless." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'FFV1', value: '25 / 25', sub: 'identical · psnr inf', color: C.green, o: ep(t, 0.9, 1.6)}}
      right={{label: 'libx264rgb -crf 0', value: '25 / 25', sub: 'identical · psnr inf · stored as RGB', color: C.green, o: ep(t, 2.2, 2.9)}}
      mid="=" midColor={C.green} midO={ep(t, 2.0, 2.6)} />
    <Mid y={680} size={28} color={C.mute} o={ep(t, 4.2, 4.8)}>So the comparison can see a lossless result.</Mid>
  </>
);

/* 4. Plain libx264 */
const Default: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Plain libx264 · -crf 0" title="Not the same pictures." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'Stored as', value: 'yuv444p', sub: 'chosen quietly from RGB input', color: C.amber, o: ep(t, 0.9, 1.6), valueSize: 84}}
      right={{label: 'Back in RGB', value: '0 / 25', sub: 'frames identical · psnr 54.6 dB', color: C.red, o: ep(t, 2.6, 3.3)}}
      mid="!" midColor={C.red} midO={ep(t, 2.2, 2.8)} />
    <Verdict y={690} text="Not lossless against the RGB source" color={C.red} o={ep(t, 4.8, 5.6)} size={36} />
  </>
);

/* 5. In its own format */
const InOwn: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Same output, a different comparison" title="Lossless for what it was given." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'Compared in RGB', value: '0 / 25', sub: 'identical', color: C.red, o: ep(t, 0.9, 1.6)}}
      right={{label: 'Compared in yuv444p', value: '25 / 25', sub: 'identical', color: C.green, o: ep(t, 2.4, 3.1)}}
      mid="vs" midO={ep(t, 2.0, 2.6)} />
    <Mid y={680} size={30} o={ep(t, 4.8, 5.4)}>The difference comes in the RGB to YUV conversion.</Mid>
  </>
);

/* 6. 4:2:0 */
const Four2Zero: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Add -pix_fmt yuv420p" title="The gap grows." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'yuv444p · psnr vs RGB', value: '54.6 dB', sub: 'both builds', color: C.amber, o: ep(t, 0.9, 1.6)}}
      right={{label: 'yuv420p · psnr vs RGB', value: '24.0 dB', sub: 'ffmpeg 6.1.1 · 22.8 dB on 8.1.2', color: C.red, o: ep(t, 2.6, 3.3)}}
      mid="vs" midO={ep(t, 2.2, 2.8)} />
    <Mid y={680} size={30} o={ep(t, 4.8, 5.4)}>Still exact in its own format: 25 of 25.</Mid>
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="If you need RGB back" title="Say so, with the right codec." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'RGB exact', value: 'libx264rgb', sub: 'or FFV1', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 76}}
      right={{label: '-crf 0 alone', value: 'YUV only', sub: 'lossless in the format it was given', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 76}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={620} size={28} color={C.mute} o={ep(t, 3.6, 4.2)}>Not tested: other lossless codecs, real footage, hardware encoders.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.2, 4.8)}>FFmpeg Reality Checks · episode 11 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, control: Control, default: Default, inown: InOwn, four2zero: Four2Zero, close: Close};
