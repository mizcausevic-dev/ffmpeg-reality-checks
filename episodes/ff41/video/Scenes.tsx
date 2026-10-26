import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff41/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="JPEG frames, native mjpeg" title="Is 2 better than 5?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i src.png -c:v mjpeg -q:v 2 out.jpg" hi="-q:v 2" size={34} o={ep(t, 1.0, 1.6)} />
    <Row y={470} h={230} cw={500} gap={40} valueSize={50} items={[
      {label: 'Size', value: 'disk + ffprobe', sub: 'two readers', color: C.cyan, o: ep(t, 2.4, 3.0)},
      {label: 'Quality', value: 'psnr + Node', sub: 'two readers', color: C.amber, o: ep(t, 3.4, 4.0)},
      {label: 'Step', value: 'DQT table', sub: 'parsed from the file', color: C.green, o: ep(t, 4.4, 5.0)},
    ]} />
    <Mid y={790} size={28} color={C.mute} o={ep(t, 6.0, 6.6)}>One 640x360 card (testsrc2 plus noise), encoded at 31 settings.</Mid>
  </>
);

/* 2. Lower is better, and it is a step size */
const Scale: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Lower is better" title="The number is a step size." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={295} h={290}
      left={{label: 'Setting 2', value: '149832', sub: 'bytes · 36.38 dB\nquantizer step 4', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 100}}
      right={{label: 'Setting 31', value: '11681', sub: 'bytes · 26.97 dB\nquantizer step 62', color: C.amber, o: ep(t, 2.6, 3.3), valueSize: 100}}
      mid="vs" midO={ep(t, 2.2, 2.8)} />
    <Row y={630} h={140} cw={330} gap={30} valueSize={44} items={[
      {label: 'Setting 2', value: 'step 4', color: C.cyan, o: ep(t, 4.2, 4.8)},
      {label: 'Setting 5', value: 'step 10', color: C.cyan, o: ep(t, 4.8, 5.4)},
      {label: 'Setting 10', value: 'step 20', color: C.cyan, o: ep(t, 5.4, 6.0)},
      {label: 'Setting 31', value: 'step 62', color: C.amber, o: ep(t, 6.0, 6.6)},
    ]} />
    <Verdict y={820} text="Control: 2 and 31 differ in every reader" color={C.amber} o={ep(t, 7.2, 7.8)} size={32} />
  </>
);

/* 3. The curve is steep at the low end */
const Curve: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={440} color={C.amber} o={ep(t, 0.2, 1.4)} />
    <Head over="The size curve" title="Steep at the low end." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Figure y={290} value="3.4x" caption="the bytes of 2 against 5, for 4.6 dB" color={C.amber} size={190} o={ep(t, 1.6, 2.4)} />
    <Row y={650} h={180} cw={400} gap={32} valueSize={52} items={[
      {label: 'Setting 2 to 5', value: '3.37x', sub: 'bytes · +4.60 dB', color: C.red, o: ep(t, 3.6, 4.2)},
      {label: 'Setting 5 to 10', value: '1.95x', sub: 'bytes · +1.52 dB', color: C.cyan, o: ep(t, 4.4, 5.0)},
      {label: 'Setting 10 to 31', value: '1.95x', sub: 'bytes · +3.29 dB', color: C.cyan, o: ep(t, 5.2, 5.8)},
    ]} />
  </>
);

/* 4. One is not one */
const Clamp: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={500} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="One is not one" title="Setting 1 is clamped to 2." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={295} h={310}
      left={{label: 'Setting 1, as is', value: '149832', sub: '-q:v 1 · same file as -q:v 2\nbytes · 36.38 dB · step 4', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 100}}
      right={{label: 'Minimum lowered', value: '254864', sub: '-qmin 1 -q:v 1\nbytes · 41.59 dB · step 2', color: C.green, o: ep(t, 2.8, 3.5), valueSize: 100}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={660} size={30} color={C.dim} o={ep(t, 4.8, 5.4)}>-q:v 5 -qmin 10 is the -q:v 10 file. -q:v 5 -qmax 3 is the -q:v 3 file.</Mid>
    <Mid y={740} size={30} color={C.dim} o={ep(t, 6.0, 6.6)}>-qscale:v 5 is the -q:v 5 file, byte for byte.</Mid>
  </>
);

/* 5. Huffman: bytes, not pixels */
const Huff: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Entropy tables" title="Bytes change. Pixels do not." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Cmd y={290} text="ffmpeg -i src.png -c:v mjpeg -q:v 5 -huffman default out.jpg" hi="-huffman default" size={28} o={ep(t, 0.9, 1.5)} />
    <Duel y={430} h={270}
      left={{label: 'Default tables', value: '49679', sub: 'bytes · 31.78 dB', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 100}}
      right={{label: 'Optimal tables', value: '44436', sub: 'bytes · 31.78 dB · the default', color: C.green, o: ep(t, 3.4, 4.1), valueSize: 100}}
      mid="vs" midO={ep(t, 3.0, 3.6)} />
    <Mid y={745} size={30} color={C.dim} o={ep(t, 5.0, 5.6)}>+11.8% bytes. Decoded pixels identical: Node md5 and ffmpeg framemd5.</Mid>
    <Verdict y={830} text="Not a quality setting" color={C.green} o={ep(t, 6.4, 7.0)} size={34} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to remember" title="A quantizer step, not a score." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Rule', value: 'lower', sub: 'a lower setting is finer and bigger', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 80}}
      right={{label: 'Trap', value: '1 = 2', sub: 'add -qmin 1 to go below 2', color: C.red, o: ep(t, 2.4, 3.1), valueSize: 80}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.8, 4.4)}>Not tested: other builds, libjpeg-based encoders, real photos, chroma subsampling, any player.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 41 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, scale: Scale, curve: Curve, clamp: Clamp, huff: Huff, close: Close};
