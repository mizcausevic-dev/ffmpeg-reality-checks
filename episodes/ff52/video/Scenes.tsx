import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, FrameStrip, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff52/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="The gif muxer option" title="Zero, minus one, or three?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mkv -loop 3 out.gif" hi="-loop 3" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'In the file', value: '?', sub: 'the loop block, read from the bytes', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 90}}
      right={{label: 'On playback', value: '?', sub: 'how many passes ffmpeg plays', color: C.amber, o: ep(t, 3.6, 4.3), valueSize: 90}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 5.2, 5.8)}>One synthetic ten frame gif, written seven ways, read two ways.</Mid>
  </>
);

/* 2. Two readers and a control */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic gif · 10 frames · 1 s" title="Two readers and a control." o={ep(t, 0.2, 0.8)} />
    <FrameStrip y={265} n={10} kept={() => true} label={(i) => String(i)} fw={150} fh={86} gap={14} o={ep(t, 1.0, 1.7)} />
    <Row y={450} h={200} cw={520} gap={40} valueSize={50} items={[
      {label: 'Reader 1', value: 'gif bytes', sub: 'the loop block, parsed in Node', color: C.cyan, o: ep(t, 2.4, 3.0)},
      {label: 'Reader 2', value: 'playback', sub: 'frames ffmpeg plays in 20 s', color: C.amber, o: ep(t, 3.4, 4.0)},
      {label: 'Control', value: 'count 7', sub: 'gif built byte by byte in Node', color: C.green, o: ep(t, 4.8, 5.4)},
    ]} />
    <Duel y={700} h={160}
      left={{label: 'Bytes say', value: '7', color: C.green, o: ep(t, 6.2, 6.8), valueSize: 70}}
      right={{label: 'Playback', value: '14 frames = 7 passes', color: C.green, o: ep(t, 7.0, 7.6), valueSize: 44}}
      mid="" midO={0} />
  </>
);

/* 3. Zero, and no option */
const Zero: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Zero, and no option at all" title="The same file, byte for byte." color={C.cyan} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i src -loop 0 out.gif" hi="-loop 0" size={30} o={ep(t, 0.9, 1.5)} />
    <Figure y={390} value="0" caption="loop count in the bytes · with -loop 0 and with no -loop" color={C.cyan} size={200} o={ep(t, 2.0, 2.8)} />
    <Row y={700} h={190} cw={520} gap={40} valueSize={50} items={[
      {label: 'Files compared', value: 'identical', sub: '2630 bytes each, same hash', color: C.green, o: ep(t, 4.4, 5.0)},
      {label: 'Loop block', value: '19 bytes', sub: 'NETSCAPE2.0, count 0', color: C.cyan, o: ep(t, 5.2, 5.8)},
      {label: 'Playback', value: 'plays on', sub: 'still playing at the 20 s limit', color: C.amber, o: ep(t, 6.0, 6.6)},
    ]} />
  </>
);

/* 4. Minus one */
const Minus1: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Minus one" title="No loop block at all." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i src -loop -1 out.gif" hi="-loop -1" size={30} o={ep(t, 0.9, 1.5)} />
    <Figure y={395} value="19 bytes" caption="smaller than the -loop 0 file · 2611 against 2630" color={C.red} size={150} o={ep(t, 2.0, 2.8)} />
    <Row y={700} h={190} cw={520} gap={40} valueSize={50} items={[
      {label: 'Loop marker in the bytes', value: 'none', sub: 'no NETSCAPE2.0 block', color: C.red, o: ep(t, 4.4, 5.0)},
      {label: 'Playback', value: '1 pass', sub: '10 frames, once', color: C.amber, o: ep(t, 5.2, 5.8)},
      {label: 'The 10 frames', value: 'same', sub: 'identical frame hashes', color: C.green, o: ep(t, 6.0, 6.6)},
    ]} />
  </>
);

/* 5. A count of three */
const Three: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="A count of three" title="The number is the number." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i src -loop 3 out.gif" hi="-loop 3" size={30} o={ep(t, 0.9, 1.5)} />
    <Figure y={395} value="3 passes" caption="count 3 in the bytes · 30 frames played from the 10" color={C.green} size={150} o={ep(t, 2.0, 2.8)} />
    <Row y={700} h={190} cw={520} gap={40} valueSize={50} items={[
      {label: 'Bytes that differ from 0', value: '1 byte', sub: 'the low byte of the count', color: C.cyan, o: ep(t, 4.4, 5.0)},
      {label: 'Count of 1', value: '1 pass', sub: 'plays once, like minus one', color: C.amber, o: ep(t, 5.2, 5.8)},
      {label: 'Count of 65536', value: 'refused', sub: '65535 is written as given', color: C.red, o: ep(t, 6.0, 6.6)},
    ]} />
  </>
);

/* 6. Before the input */
const Input: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Before the input" title="Same word, another option." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -loop 1 -i card.png -t 1 -r 10 out.gif" hi="-loop 1" size={30} o={ep(t, 0.9, 1.5)} />
    <Duel y={400} h={280}
      left={{label: 'One before the input', value: 'repeats', sub: 'the png fills the 1 s: 10 frames\nthe gif still has count 0', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 80}}
      right={{label: 'Three before the input', value: 'refused', sub: 'not a yes or no value\nffmpeg stops, no gif', color: C.red, o: ep(t, 3.8, 4.5), valueSize: 80}}
      mid="" midO={0} />
    <Verdict y={790} text="Put -loop after the input, on the gif output" color={C.green} o={ep(t, 6.0, 6.6)} size={32} />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What the file says" title="Three values, three answers." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Row y={280} h={250} cw={520} gap={40} valueSize={60} items={[
      {label: 'Minus one', value: 'no block', sub: 'plays once in ffmpeg', color: C.red, o: ep(t, 1.4, 2.0)},
      {label: 'Zero', value: 'count 0', sub: 'the default · plays on at 20 s', color: C.cyan, o: ep(t, 2.4, 3.0)},
      {label: 'Three', value: 'count 3', sub: 'plays 3 times in ffmpeg', color: C.green, o: ep(t, 3.4, 4.0)},
    ]} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 4.8, 5.4)}>How a browser counts a loop was not tested. Not tested: browsers, players, gifs from other tools, builds other than 6.1.1.</Mid>
    <Mid y={760} size={30} color={C.dim} o={ep(t, 5.6, 6.2)}>FFmpeg Reality Checks · episode 52 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, zero: Zero, minus1: Minus1, three: Three, input: Input, close: Close};
