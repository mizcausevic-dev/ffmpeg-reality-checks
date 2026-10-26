import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, FrameStrip, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff48/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

const SAMPLE = ['0', '13', '27', '40', '54', '55', '66', '77', '88', '99'];

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Pick a picture from a video" title="Which frame does it pick?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mp4 -vf thumbnail out.png" hi="thumbnail" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'The filter list says', value: 'representative', sub: '"the most representative frame"', color: C.cyan, o: ep(t, 2.2, 2.9), valueSize: 64}}
      right={{label: 'You hope for', value: 'the best', sub: 'a good picture', color: C.amber, o: ep(t, 3.2, 3.9), valueSize: 64}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>A 100 frame synthetic clip, the pick read four ways.</Mid>
  </>
);

/* 2. A clip with two shots */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clip · 160x120 · 25 fps" title="100 frames, two shots." o={ep(t, 0.2, 0.8)} />
    <FrameStrip y={262} n={10} kept={(i) => i >= 5} label={(i) => SAMPLE[i]} fw={150} fh={86} gap={14} o={ep(t, 0.9, 1.5)} />
    <Row y={450} h={170} cw={520} gap={40} valueSize={50} items={[
      {label: 'Shot A', value: '0 to 54', sub: 'dark title card, a growing bar', color: C.cyan, o: ep(t, 1.8, 2.4)},
      {label: 'Shot B', value: '55 to 99', sub: 'colour bars, a counter, motion', color: C.amber, o: ep(t, 2.6, 3.2)},
    ]} />
    <Row y={650} h={170} cw={520} gap={40} valueSize={46} items={[
      {label: 'Reader 1', value: 'ffmpeg', sub: 'timestamp and frame hash', color: C.cyan, o: ep(t, 3.6, 4.2)},
      {label: 'Reader 2', value: 'Node', sub: 'raw pixels, byte for byte', color: C.amber, o: ep(t, 4.2, 4.8)},
      {label: 'Reader 3', value: 'the algorithm', sub: 'rewritten in Node', color: C.green, o: ep(t, 4.8, 5.4)},
    ]} />
    <Mid y={850} size={26} color={C.mute} o={ep(t, 5.8, 6.4)}>For "is it the best": luma entropy and mean luma, read by Node and by ffmpeg.</Mid>
  </>
);

/* 3. Two controls */
const Control: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={500} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Controls · known answers" title="Two frames it must pick." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Duel y={300} h={320}
      left={{label: 'Ramp, 99 frames', value: '49', sub: 'the middle one is the average\nexpected 49, got 49', color: C.green, o: ep(t, 1.2, 1.9), valueSize: 120}}
      right={{label: 'One odd frame, of 100', value: 'not 37', sub: 'the white frame 37 is never picked\nit picks frame 0', color: C.green, o: ep(t, 2.4, 3.1), valueSize: 110}}
      mid="" midO={0} />
    <Row y={660} h={170} cw={520} gap={40} valueSize={50} items={[
      {label: 'Readers agree', value: '4 of 4', sub: 'pts, hash, pixels, algorithm', color: C.green, o: ep(t, 4.0, 4.6)},
      {label: 'Cases agreeing', value: '10 of 10', sub: 'every case in this episode', color: C.green, o: ep(t, 4.8, 5.4)},
    ]} />
  </>
);

/* 4. It picks frame 54 */
const Pick: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Default settings, 100 frames" title="It picks the title card." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={250} value="54" caption="the last frame of the dark title card" size={190} color={C.red} o={ep(t, 0.9, 1.6)} />
    <Duel y={560} h={220}
      left={{label: 'Picked: frame 54', value: '0.44', sub: 'bits of entropy · mean luma 39', color: C.red, o: ep(t, 2.6, 3.3), valueSize: 80}}
      right={{label: 'Most detailed: frame 80', value: '4.55', sub: 'bits of entropy · mean luma 114', color: C.green, o: ep(t, 3.6, 4.3), valueSize: 80}}
      mid="vs" midO={ep(t, 3.2, 3.8)} />
    <Verdict y={830} text="Rank 46 of 100: every scene frame beats it" color={C.red} o={ep(t, 4.8, 5.4)} size={34} />
  </>
);

/* 5. One frame per batch */
const Batch: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="The batch decides" title="One frame per batch." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Row y={270} h={190} cw={410} gap={30} valueSize={46} items={[
      {label: 'Batches of 50', value: '24, 93', sub: 'two frames', color: C.amber, o: ep(t, 0.9, 1.5)},
      {label: 'Batches of 25', value: '12, 37, 67, 86', sub: 'four frames', color: C.amber, o: ep(t, 1.6, 2.2)},
      {label: 'Batches of 30', value: '14, 54, 74, 96', sub: 'the last batch has 10', color: C.amber, o: ep(t, 2.3, 2.9)},
      {label: 'Batches of 10', value: 'ten frames', sub: '4, 14, 24 ... 96', color: C.amber, o: ep(t, 3.0, 3.6)},
    ]} />
    <FrameStrip y={520} n={10} cur={4} kept={(i) => i >= 5} label={(i) => SAMPLE[i]} fw={150} fh={70} gap={14} color={C.red} o={ep(t, 3.8, 4.4)} />
    <Mid y={720} size={28} color={C.dim} o={ep(t, 4.6, 5.2)}>Batches of 50: the first pick is in the title card, the second in the scene.</Mid>
    <Verdict y={810} text="A 60 frame clip still gets one frame, at the end" color={C.amber} o={ep(t, 5.6, 6.2)} size={32} />
  </>
);

/* 6. Make the batch the scene */
const Fix: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Make the batch the scene" title="Then it picks frame 74." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Cmd y={262} text="-vf trim=start_frame=55,thumbnail=n=45" hi="thumbnail=n=45" size={32} o={ep(t, 0.9, 1.5)} />
    <Figure y={370} value="74" caption="a scene frame, from a batch of the 45 scene frames" size={170} color={C.green} o={ep(t, 1.8, 2.5)} />
    <Row y={670} h={190} cw={520} gap={40} valueSize={56} items={[
      {label: 'Mean luma', value: '114', sub: 'a scene frame', color: C.green, o: ep(t, 3.6, 4.2)},
      {label: 'Entropy', value: '4.45 bits', sub: '98 percent of the best', color: C.green, o: ep(t, 4.4, 5.0)},
      {label: 'Rank of 100', value: '32', sub: 'frame 80 is first', color: C.amber, o: ep(t, 5.2, 5.8)},
    ]} />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Typical is not best." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={270}
      left={{label: 'What the filter finds', value: 'typical', sub: 'closest to its batch average', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 80}}
      right={{label: 'What predicted it', value: 'histograms', sub: 'colour counts alone, 10 of 10 cases', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 80}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.8, 4.4)}>Not tested: real footage, other pixel formats than rgb24, scene changes in real clips, players, other builds.</Mid>
    <Mid y={760} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 48 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, control: Control, pick: Pick, batch: Batch, fix: Fix, close: Close};
