import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, FrameStrip, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff53/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Same CRF, two encoders" title="Same number, same quality?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mkv -c:v libx265 -crf 23 out.mp4" hi="-crf 23" size={32} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'H.264', value: '?', sub: 'x264: file size, PSNR, SSIM', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 90}}
      right={{label: 'H.265', value: '?', sub: 'x265: file size, PSNR, SSIM', color: C.amber, o: ep(t, 3.6, 4.3), valueSize: 90}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 5.2, 5.8)}>One synthetic clip, encoded at crf 18, 23 and 28, read back against the source.</Mid>
  </>
);

/* 2. Two readers and a control */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clip · 75 frames · 320 by 240" title="Two readers and a control." o={ep(t, 0.2, 0.8)} />
    <FrameStrip y={265} n={10} kept={() => true} label={(i) => String(i)} fw={150} fh={86} gap={14} o={ep(t, 1.0, 1.7)} />
    <Row y={450} h={200} cw={520} gap={40} valueSize={50} items={[
      {label: 'Reader 1', value: 'ffmpeg', sub: 'the psnr and ssim filters', color: C.cyan, o: ep(t, 2.4, 3.0)},
      {label: 'Reader 2', value: 'Node', sub: 'both written from scratch, on decoded pixels', color: C.amber, o: ep(t, 3.4, 4.0)},
      {label: 'Control', value: 'lossless', sub: 'x264 with qp 0, the known positive', color: C.green, o: ep(t, 4.8, 5.4)},
    ]} />
    <Duel y={700} h={160}
      left={{label: 'PSNR, both readers', value: 'inf', color: C.green, o: ep(t, 6.2, 6.8), valueSize: 70}}
      right={{label: 'SSIM, both readers', value: '1.0000', color: C.green, o: ep(t, 7.0, 7.6), valueSize: 70}}
      mid="" midO={0} />
  </>
);

/* 3. CRF 18 */
const Crf18: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="At CRF 18" title="A much smaller file." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i src -c:v libx265 -crf 18 out.mp4" hi="-crf 18" size={30} o={ep(t, 0.9, 1.5)} />
    <Figure y={395} value="-39.6%" caption="x265 494944 bytes against x264 819510 bytes" color={C.red} size={170} o={ep(t, 2.0, 2.8)} />
    <Row y={700} h={190} cw={520} gap={40} valueSize={50} items={[
      {label: 'File size', value: '495 KB', sub: 'x264: 820 KB', color: C.green, o: ep(t, 4.4, 5.0)},
      {label: 'PSNR Y', value: '-0.59 dB', sub: '38.35 against 38.94', color: C.red, o: ep(t, 5.2, 5.8)},
      {label: 'SSIM Y', value: '0.9039', sub: 'x264: 0.9270', color: C.red, o: ep(t, 6.0, 6.6)},
    ]} />
  </>
);

/* 4. The flip */
const Flip: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="At CRF 23 and 28" title="The gap changes sign." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i src -c:v libx265 -crf 28" hi="-crf 28" size={30} o={ep(t, 0.9, 1.5)} />
    <Duel y={400} h={290}
      left={{label: 'CRF 23', value: '+0.33 dB', sub: 'x265 is 3.2% bigger\n127679 against 123693 bytes', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 80}}
      right={{label: 'CRF 28', value: '+0.49 dB', sub: 'x265 is 0.2% smaller\n62813 against 62946 bytes', color: C.green, o: ep(t, 3.8, 4.5), valueSize: 80}}
      mid="" midO={0} />
    <Row y={740} h={150} cw={520} gap={40} valueSize={44} items={[
      {label: 'CRF 18', value: '-0.59 dB', sub: 'x265 vs x264, 40% smaller', color: C.red, o: ep(t, 5.4, 6.0)},
      {label: 'CRF 23', value: '+0.33 dB', sub: 'x265 vs x264, 3% bigger', color: C.amber, o: ep(t, 6.0, 6.6)},
      {label: 'CRF 28', value: '+0.49 dB', sub: 'x265 vs x264, same size', color: C.green, o: ep(t, 6.6, 7.2)},
    ]} />
  </>
);

/* 5. Readers agree */
const Readers: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Do the readers agree?" title="Eight encodes, two readers." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Row y={270} h={230} cw={520} gap={40} valueSize={56} items={[
      {label: 'PSNR Y, two readers', value: 'under 1e-6', sub: 'largest PSNR difference, dB', color: C.green, o: ep(t, 1.2, 1.8)},
      {label: 'SSIM Y, two readers', value: 'under 1e-6', sub: 'largest SSIM difference', color: C.green, o: ep(t, 2.2, 2.8)},
      {label: 'Second encode', value: 'identical', sub: 'crf 23, both codecs, same hash', color: C.cyan, o: ep(t, 3.2, 3.8)},
    ]} />
    <Duel y={600} h={230}
      left={{label: 'H.264 bytes', value: '819510 > 123693 > 62946', sub: 'crf 18, 23, 28', color: C.amber, o: ep(t, 4.8, 5.5), valueSize: 36}}
      right={{label: 'H.265 bytes', value: '494944 > 127679 > 62813', sub: 'crf 18, 23, 28', color: C.amber, o: ep(t, 5.8, 6.5), valueSize: 36}}
      mid="" midO={0} />
    <Mid y={850} size={28} color={C.dim} o={ep(t, 7.0, 7.6)}>Lower crf: more bytes and higher PSNR, in both.</Mid>
  </>
);

/* 6. The defaults */
const Defaults: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Leave the quality out" title="The defaults differ." color={C.cyan} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i src -c:v libx265 out.mp4" hi="libx265" size={30} o={ep(t, 0.9, 1.5)} />
    <Duel y={400} h={270}
      left={{label: 'H.264 default', value: 'crf 23', sub: 'libx264: 123693 bytes, same file as -crf 23', color: C.cyan, o: ep(t, 2.0, 2.7), valueSize: 80}}
      right={{label: 'H.265 default', value: 'crf 28', sub: 'libx265: 62813 bytes, same file as -crf 28', color: C.amber, o: ep(t, 3.8, 4.5), valueSize: 80}}
      mid="" midO={0} />
    <Row y={740} h={150} cw={520} gap={40} valueSize={44} items={[
      {label: 'File size', value: '-49.2%', sub: 'x265 default against x264 default', color: C.green, o: ep(t, 5.4, 6.0)},
      {label: 'PSNR Y', value: '-1.40 dB', sub: 'x265 35.41 against x264 36.81', color: C.red, o: ep(t, 6.2, 6.8)},
    ]} />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What the numbers say" title="Same CRF is not same quality." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Row y={280} h={250} cw={520} gap={40} valueSize={60} items={[
      {label: 'CRF 18', value: '-0.59 dB', sub: 'x265 vs x264, 40% smaller', color: C.red, o: ep(t, 1.4, 2.0)},
      {label: 'CRF 23', value: '+0.33 dB', sub: 'x265 vs x264, 3% bigger', color: C.amber, o: ep(t, 2.4, 3.0)},
      {label: 'CRF 28', value: '+0.49 dB', sub: 'x265 vs x264, same size', color: C.green, o: ep(t, 3.4, 4.0)},
    ]} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 4.8, 5.4)}>One synthetic clip, preset medium. Not tested: real footage, other presets, VMAF, hardware encoders, builds other than 6.1.1.</Mid>
    <Mid y={760} size={30} color={C.dim} o={ep(t, 5.6, 6.2)}>FFmpeg Reality Checks · episode 53 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, crf18: Crf18, flip: Flip, readers: Readers, defaults: Defaults, close: Close};
