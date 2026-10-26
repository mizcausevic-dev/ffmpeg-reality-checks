import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, CX, Duel, FrameBox, Halo, Head, Medallion, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff08/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). */
const CMD = 'ffmpeg -f concat -i list.txt -c copy join.m4a';

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="AAC · concat · copy the packets" title="2 s + 2 s = 4 s of sound?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text={CMD} hi="-c copy" o={ep(t, 1.0, 1.6)} />
    <FrameBox cx={CX - 330} cy={620} w={420} h={170} color={C.cyan} label="a.m4a" sub="2 seconds" o={ep(t, 2.2, 2.8)} />
    <FrameBox cx={CX + 330} cy={620} w={420} h={170} color={C.amber} label="b.m4a" sub="2 seconds" o={ep(t, 2.8, 3.4)} />
    <Medallion y={620} text="+" color={C.mute} d={72} size={44} o={ep(t, 3.2, 3.8)} />
    <Mid y={790} size={30} o={ep(t, 4.6, 5.2)}>We count samples, not duration labels.</Mid>
  </>
);

/* 2. One file, counted */
const Single: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="One file alone · 44.1 kHz · 128k" title="Two seconds, counted." o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={290} valueSize={72} items={[
      {label: 'Asked for', value: '88,200', sub: 'samples', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'First packet skips', value: '1,024', sub: 'samples', color: C.mute, o: ep(t, 1.6, 2.2)},
      {label: 'Decoded', value: '89,088', sub: '2.0201 s', color: C.amber, o: ep(t, 2.3, 2.9)},
    ]} />
    <Mid y={650} size={30} o={ep(t, 4.0, 4.6)}>88 packets · container says 2 seconds</Mid>
  </>
);

/* 3. The join */
const Join: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={500} color={C.amber} o={ep(t, 0.2, 1.4)} />
    <Head over="The join" title="Longer than four seconds." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={280} h={310}
      left={{label: 'Container says', value: '4.02322 s', sub: '4 s + 1,024 samples', color: C.cyan, o: ep(t, 0.8, 1.5), valueSize: 80}}
      right={{label: 'Decoded', value: '180,224', sub: '4.0867 s', color: C.amber, o: ep(t, 1.6, 2.3), valueSize: 80}}
      mid="176" midSub="packets" midColor={C.text} midO={ep(t, 2.0, 2.6)} />
    <Verdict y={680} text="No skip marker on the first packet" color={C.amber} o={ep(t, 4.4, 5.2)} size={34} />
  </>
);

/* 4. Where the extra goes */
const Sum: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Compare the counts" title="The join decodes extra." o={ep(t, 0.2, 0.8)} />
    <Duel y={280} h={300}
      left={{label: 'More than two separate decodes', value: '+2,048', sub: 'samples', color: C.amber, o: ep(t, 0.8, 1.5), valueSize: 88}}
      right={{label: 'More than the audio asked for', value: '+3,824', sub: 'samples', color: C.red, o: ep(t, 2.4, 3.1), valueSize: 88}}
      mid="vs" midO={ep(t, 2.0, 2.6)} />
    <Mid y={660} size={44} mono color={C.text} o={ep(t, 4.8, 5.4)}>3,824 = 2 x (1,024 + 888)</Mid>
    <Mid y={740} size={28} color={C.dim} o={ep(t, 5.4, 6.0)}>two files, each: priming + padding</Mid>
  </>
);

/* 5. Why it happens */
const Why: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Priming and padding" title="The skip marker is gone." o={ep(t, 0.2, 0.8)} />
    <Duel y={280} h={300}
      left={{label: 'Single file', value: 'skip 1,024', sub: 'first packet marks the priming', color: C.cyan, o: ep(t, 0.8, 1.5), valueSize: 72}}
      right={{label: 'Joined by copy', value: 'no skip', sub: 'padding sits mid-stream', color: C.amber, o: ep(t, 1.6, 2.3), valueSize: 72}}
      mid="vs" midO={ep(t, 2.0, 2.6)} />
    <Mid y={660} size={30} o={ep(t, 4.0, 4.6)}>The numbers fit that account.</Mid>
    <Mid y={720} size={28} color={C.mute} o={ep(t, 4.6, 5.2)}>Identical on ffmpeg 6.1.1 and 8.1.2</Mid>
  </>
);

/* 6. How big */
const Size: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="How big is it?" title="In numbers." o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={280} valueSize={72} items={[
      {label: 'Extra samples', value: '3,824', color: C.red, o: ep(t, 0.9, 1.5)},
      {label: 'Sample rate', value: '44.1 kHz', color: C.text, o: ep(t, 1.6, 2.2)},
      {label: 'Time', value: 'about 87 ms', color: C.amber, o: ep(t, 2.3, 2.9)},
    ]} />
    <Verdict y={680} text="Audible? Players? Not tested." color={C.amber} o={ep(t, 4.2, 5.0)} size={36} />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.amber} o={ep(t, 0, 1.2)} />
    <Head over="Count, do not trust" title="A copy join can run long." color={C.amber} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={280}
      left={{label: 'Asked for', value: '176,400', sub: 'samples', color: C.cyan, o: ep(t, 1.4, 2.1), valueSize: 84}}
      right={{label: 'Decoded', value: '180,224', sub: 'samples', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 84}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={640} size={28} color={C.mute} o={ep(t, 3.6, 4.2)}>No remedy claimed. Not tested: other codecs, rates, real recordings.</Mid>
    <Mid y={720} size={30} color={C.dim} o={ep(t, 4.2, 4.8)}>FFmpeg Reality Checks · episode 8 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, single: Single, join: Join, sum: Sum, why: Why, size: Size, close: Close};
