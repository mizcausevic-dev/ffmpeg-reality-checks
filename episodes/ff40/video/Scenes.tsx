import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff40/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Crop at an odd offset" title="Where does the picture start?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={310} text="-vf crop=96:54:3:5" hi="3:5" size={40} o={ep(t, 1.0, 1.6)} />
    <Duel y={460} h={270}
      left={{label: 'You ask for', value: 'col 3', sub: 'row 5 · luma, exactly', color: C.amber, o: ep(t, 2.6, 3.3), valueSize: 100}}
      right={{label: 'Test', value: '4:2:0', sub: 'chroma at half size\n192x108 coded cards', color: C.cyan, o: ep(t, 3.6, 4.3), valueSize: 100}}
      mid="?" midO={ep(t, 3.2, 3.8)} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 5.2, 5.8)}>Something has to give. We read the pixels.</Mid>
  </>
);

/* 2. Cards, readers, control */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Coded cards · lossless" title="Every pixel names itself." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={50} items={[
      {label: 'Card one', value: 'column', sub: 'luma = the column\nchroma has its own', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Card two', value: 'row', sub: 'luma = the row\n192x108, one frame each', color: C.amber, o: ep(t, 1.6, 2.2)},
      {label: 'Control · even offset', value: '4 · 6', sub: 'asked column 4, row 6\nstarts at column 4, row 6', color: C.green, o: ep(t, 2.3, 2.9)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · ffprobe', value: 'width, height', sub: 'of the cropped output', color: C.cyan, o: ep(t, 4.6, 5.3), valueSize: 56}}
      right={{label: 'Reader 2 · decode', value: 'the planes', sub: 'first column and row kept, luma and chroma', color: C.amber, o: ep(t, 5.6, 6.3), valueSize: 56}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.2, 5.8)} />
    <Mid y={810} size={28} color={C.mute} o={ep(t, 7.0, 7.6)}>Plus the frame hash, to compare one crop with another.</Mid>
  </>
);

/* 3. Odd offset rounds to even */
const Odd: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Odd offset, 4:2:0" title="It moved one pixel." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={240}
      left={{label: 'You asked', value: '3 · 5', sub: 'column · row', color: C.amber, o: ep(t, 0.9, 1.6), valueSize: 100}}
      right={{label: 'The picture starts', value: '2 · 4', sub: 'same frame as asking for 2,4', color: C.red, o: ep(t, 2.4, 3.1), valueSize: 100}}
      mid="→" midO={ep(t, 2.0, 2.6)} />
    <Row y={580} h={190} cw={520} gap={32} valueSize={52} items={[
      {label: 'Offset 1 · 1', value: '0 · 0', sub: 'nothing moves', color: C.red, o: ep(t, 4.2, 4.8)},
      {label: 'Odd size', value: '94x52', sub: 'asked 95x53, rounded down', color: C.red, o: ep(t, 5.0, 5.6)},
    ]} />
    <Verdict y={835} text="No warning. Luma and chroma stay aligned." color={C.red} o={ep(t, 6.4, 7.2)} size={32} />
  </>
);

/* 4. The exact option */
const Exact: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="The exact option" title="Luma exact. Chroma not." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Cmd y={270} text="-vf crop=96:54:3:5:exact=1" hi="exact=1" size={34} o={ep(t, 0.9, 1.5)} />
    <Duel y={380} h={270}
      left={{label: 'Luma starts', value: '3 · 5', sub: 'as asked · odd size kept\n95x53 stays 95x53', color: C.green, o: ep(t, 2.0, 2.7), valueSize: 88}}
      right={{label: 'Chroma is off by', value: '1 px', sub: 'starts at chroma column 1, row 2\nhalf a chroma sample', color: C.red, o: ep(t, 3.4, 4.1), valueSize: 88}}
      mid="but" midO={ep(t, 3.0, 3.6)} />
    <Row y={710} h={150} cw={520} gap={32} valueSize={46} items={[
      {label: 'Control · 4:4:4', value: '3 · 5', sub: 'honored, both settings', color: C.green, o: ep(t, 5.2, 5.8)},
      {label: '4:2:2', value: 'x moves', sub: 'column 2, row 5 kept', color: C.amber, o: ep(t, 6.0, 6.6)},
    ]} />
  </>
);

/* 5. Centered crop */
const Center: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="A centered crop" title="Not quite centered." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cmd y={270} text="-vf crop=90:50   (x=51, y=29)" hi="crop=90:50" size={34} o={ep(t, 0.9, 1.5)} />
    <Figure y={385} value="50 · 52" caption="columns left · right, in a 192 wide frame" color={C.red} size={150} o={ep(t, 2.0, 2.8)} />
    <Row y={650} h={190} cw={520} gap={32} valueSize={52} items={[
      {label: 'Default · top · bottom', value: '28 · 30', sub: 'starts at row 28, asked 29', color: C.red, o: ep(t, 4.4, 5.0)},
      {label: 'Exact on · left · right', value: '51 · 51', sub: 'rows 29 · 29, equal margins', color: C.green, o: ep(t, 5.2, 5.8)},
    ]} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Even offset. Even size." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Default', value: 'rounds', sub: 'offset and size down to even\nchroma stays aligned', color: C.amber, o: ep(t, 1.4, 2.1), valueSize: 80}}
      right={{label: 'Exact on', value: 'luma', sub: 'where you asked\nchroma half a sample off', color: C.red, o: ep(t, 2.0, 2.7), valueSize: 80}}
      mid="or" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: other builds, real footage, other crop options, players.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 40 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, odd: Odd, exact: Exact, center: Center, close: Close};
