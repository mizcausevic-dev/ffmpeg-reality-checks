import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, FrameStrip, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff49/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

const NOISE_BY_Q = ['250', '207', '182', '168', '143', '120', '109', '100', '99', '77'];

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Variable bitrate mp3" title="What does quality 2 cost?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.wav -c:a libmp3lame -q:a 2 out.mp3" hi="-q:a 2" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'The setting says', value: 'quality 2', sub: 'a number from 0 to 9', color: C.cyan, o: ep(t, 2.2, 2.9), valueSize: 80}}
      right={{label: 'The file says', value: '? kbit/s', sub: 'the same for every signal?', color: C.amber, o: ep(t, 3.2, 3.9), valueSize: 80}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>Five synthetic signals, ten settings, the average bitrate read two ways.</Mid>
  </>
);

/* 2. Five signals, two readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic stereo · 44100 Hz · 10 s" title="Five signals, two readers." o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={200} cw={320} gap={24} valueSize={56} items={[
      {label: 'Flat', value: 'silence', sub: 'digital zero', color: C.cyan, o: ep(t, 0.9, 1.4)},
      {label: 'Tonal', value: 'sine', sub: '1000 and 1500 Hz', color: C.cyan, o: ep(t, 1.3, 1.8)},
      {label: 'Tonal', value: 'chord', sub: 'five tones each', color: C.cyan, o: ep(t, 1.7, 2.2)},
      {label: 'Moving', value: 'sweep', sub: 'rising chirp', color: C.cyan, o: ep(t, 2.1, 2.6)},
      {label: 'Dense', value: 'noise', sub: 'white, stereo', color: C.cyan, o: ep(t, 2.5, 3.0)},
    ]} />
    <Row y={580} h={200} cw={520} gap={40} valueSize={50} items={[
      {label: 'Reader 1', value: 'ffprobe', sub: 'packet sizes over time', color: C.cyan, o: ep(t, 3.6, 4.2)},
      {label: 'Reader 2', value: 'Node', sub: 'walks the frame headers', color: C.amber, o: ep(t, 4.4, 5.0)},
      {label: 'Control', value: '128 kbit/s', sub: 'constant bitrate, -b:a 128k', color: C.green, o: ep(t, 5.2, 5.8)},
    ]} />
    <Mid y={820} size={28} color={C.mute} o={ep(t, 6.4, 7.0)}>Both readers skip the tag frame that starts every mp3 made by lame.</Mid>
  </>
);

/* 3. The control: constant bitrate */
const Control: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={500} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Control · known answer" title="128 asked. 128 got." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i in.wav -c:a libmp3lame -b:a 128k out.mp3" hi="-b:a 128k" size={30} o={ep(t, 0.9, 1.5)} />
    <Figure y={390} value="128" caption="kbit/s, all five signals, both readers" color={C.green} size={160} o={ep(t, 1.8, 2.5)} />
    <Row y={700} h={170} cw={520} gap={40} valueSize={50} items={[
      {label: 'Signals at 128', value: '5 of 5', sub: 'silence to noise', color: C.green, o: ep(t, 3.4, 4.0)},
      {label: 'Frame sizes used', value: '1', sub: 'every frame is a 128 frame', color: C.green, o: ep(t, 4.2, 4.8)},
      {label: 'Readers agree', value: '58 of 58', sub: 'files, within 0.05 kbit/s', color: C.green, o: ep(t, 5.0, 5.6)},
    ]} />
  </>
);

/* 4. Same quality, five bitrates */
const Spread: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="The same setting, quality 2" title="Five signals, five bitrates." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={262} value="32 to 182" caption="kbit/s from one setting, the same ten seconds" size={190} color={C.red} o={ep(t, 0.9, 1.6)} />
    <Row y={590} h={210} cw={320} gap={24} valueSize={80} items={[
      {label: 'Silence', value: '32', sub: 'kbit/s', color: C.green, o: ep(t, 2.2, 2.7)},
      {label: 'Sweep', value: '43', sub: 'kbit/s', color: C.cyan, o: ep(t, 2.6, 3.1)},
      {label: 'Sine', value: '58', sub: 'kbit/s', color: C.cyan, o: ep(t, 3.0, 3.5)},
      {label: 'Chord', value: '69', sub: 'kbit/s', color: C.amber, o: ep(t, 3.4, 3.9)},
      {label: 'Noise', value: '182', sub: 'kbit/s', color: C.red, o: ep(t, 3.8, 4.3)},
    ]} />
    <Verdict y={830} text="Quality is a target. The bitrate follows the signal." color={C.red} o={ep(t, 4.6, 5.2)} size={34} />
  </>
);

/* 5. Ten settings, two signals */
const Curve: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Quality 0 to 9, two signals" title="Silence never moves." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Mid y={262} size={26} color={C.dim} o={ep(t, 0.9, 1.4)}>Noise, average kbit/s at quality 0 to 9</Mid>
    <FrameStrip y={300} n={10} kept={(i) => i === 2} cur={-1} label={(i) => NOISE_BY_Q[i]} fw={150} fh={70} gap={14} color={C.red} o={ep(t, 1.0, 1.6)} />
    <Duel y={490} h={290}
      left={{label: 'Silence, every setting', value: '32', sub: 'minimum frames, same size at 0 to 9', color: C.green, o: ep(t, 2.6, 3.3), valueSize: 90}}
      right={{label: 'Noise, 0 to 9', value: '250 to 77', sub: '3.2 times less from 0 to 9', color: C.red, o: ep(t, 3.8, 4.5), valueSize: 90}}
      mid="vs" midO={ep(t, 3.4, 4.0)} />
    <Mid y={820} size={28} color={C.dim} o={ep(t, 5.2, 5.8)}>A bigger number never cost more, on all five signals.</Mid>
  </>
);

/* 6. The average describes no frame */
const Average: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={500} color={C.amber} o={ep(t, 0.2, 1.4)} />
    <Head over="5 s of silence, then 5 s of noise" title="The average is nobody's rate." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Figure y={262} value="107" caption="kbit/s average at quality 2, about the mean of its two halves" size={170} color={C.amber} o={ep(t, 0.9, 1.6)} />
    <Duel y={560} h={250}
      left={{label: 'First half', value: '32.7', sub: 'kbit/s, the silence', color: C.green, o: ep(t, 2.6, 3.3), valueSize: 80}}
      right={{label: 'Second half', value: '182.5', sub: 'kbit/s, the noise', color: C.red, o: ep(t, 3.6, 4.3), valueSize: 80}}
      mid="" midO={0} />
    <Verdict y={830} text="Frames within 25 kbit/s of 107: 0 of 384" color={C.amber} o={ep(t, 4.8, 5.4)} size={34} />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Ask for a size, or measure." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Need a size', value: 'constant', sub: '-b:a 128k gave 128 kbit/s\nfor every signal', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 70}}
      right={{label: 'Need a quality', value: 'measure', sub: '-q:a gave 32 to 182 kbit/s\nfrom the signal alone', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 70}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.8, 4.4)}>Not tested: real music, mono and other sample rates, joint stereo options, other lame builds, players.</Mid>
    <Mid y={760} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 49 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, control: Control, spread: Spread, curve: Curve, average: Average, close: Close};
