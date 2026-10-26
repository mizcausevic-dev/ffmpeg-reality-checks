import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, FrameStrip, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff47/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

const SEG = ['silence', 'tone', 'silence', 'tone', 'silence'];
const isTone = (i: number) => i === 1 || i === 3;

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Cut the silence" title="Why only the start?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.wav -af silenceremove=start_periods=1 out.wav" hi="start_periods=1" size={32} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'You expect', value: 'all of it', sub: 'every silence cut', color: C.cyan, o: ep(t, 2.2, 2.9), valueSize: 80}}
      right={{label: 'You see', value: 'the start', sub: 'and nothing else', color: C.amber, o: ep(t, 3.2, 3.9), valueSize: 80}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>A 4 s synthetic clip, three silences, seven settings, three readers.</Mid>
  </>
);

/* 2. A clip with three silences */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic mono · 48000 Hz · 4 s" title="Three silences, two tones." o={ep(t, 0.2, 0.8)} />
    <FrameStrip y={262} n={5} kept={isTone} label={(i) => SEG[i]} fw={290} fh={90} gap={14} o={ep(t, 0.9, 1.5)} />
    <Mid y={440} size={28} color={C.dim} o={ep(t, 1.6, 2.1)}>0.5 s, 1.0 s, 1.0 s, 1.0 s, 0.5 s: 192000 samples · every setting uses -50dB thresholds</Mid>
    <Row y={520} h={170} cw={520} gap={40} valueSize={46} items={[
      {label: 'Reader 1', value: 'ffprobe', sub: 'sample count of the wav', color: C.cyan, o: ep(t, 2.6, 3.2)},
      {label: 'Reader 2', value: 'Node', sub: 'raw samples, silent runs', color: C.amber, o: ep(t, 3.4, 4.0)},
      {label: 'Reader 3', value: 'silencedetect', sub: "ffmpeg's own silence list", color: C.green, o: ep(t, 4.2, 4.8)},
    ]} />
    <Row y={720} h={170} cw={520} gap={40} valueSize={46} items={[
      {label: 'Control, cut by atrim', value: '168000', sub: 'exactly 24000 removed', color: C.green, o: ep(t, 5.4, 6.0)},
      {label: 'Control, cut by hand', value: '96000', sub: 'all silence out, tones only', color: C.green, o: ep(t, 6.2, 6.8)},
    ]} />
  </>
);

/* 3. With no options */
const None: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.cyan} o={ep(t, 0.2, 1.4)} />
    <Head over="No options at all" title="It does nothing." o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i in.wav -af silenceremove out.wav" hi="silenceremove" size={32} o={ep(t, 0.9, 1.5)} />
    <Figure y={390} value="192000" caption="samples in, samples out" color={C.cyan} size={180} o={ep(t, 1.8, 2.5)} />
    <Row y={690} h={170} cw={520} gap={40} valueSize={50} items={[
      {label: 'Removed', value: '0', sub: 'samples', color: C.cyan, o: ep(t, 3.4, 4.0)},
      {label: 'Same bytes as the source', value: 'yes', sub: 'hash equal', color: C.green, o: ep(t, 4.2, 4.8)},
      {label: 'Silences left', value: '3 of 3', sub: 'Node and silencedetect', color: C.amber, o: ep(t, 5.0, 5.6)},
    ]} />
  </>
);

/* 4. Only the start */
const Start: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.amber} o={ep(t, 0.2, 1.4)} />
    <Head over="Cut the front" title="One of three." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Cmd y={262} text="ffmpeg -i in.wav -af silenceremove=start_periods=1 out.wav" hi="start_periods=1" size={30} o={ep(t, 0.9, 1.5)} />
    <FrameStrip y={370} n={5} cur={0} kept={isTone} label={(i) => (i === 0 ? 'cut' : SEG[i])} fw={290} fh={90} gap={14} color={C.red} o={ep(t, 1.8, 2.4)} />
    <Figure y={545} value="24003" caption="samples removed: the leading silence" size={120} color={C.amber} o={ep(t, 3.0, 3.6)} />
    <Row y={765} h={175} cw={520} gap={40} valueSize={46} items={[
      {label: 'Middle silence', value: '48001', sub: 'untouched', color: C.amber, o: ep(t, 4.4, 5.0)},
      {label: 'Last silence', value: '24000', sub: 'untouched', color: C.amber, o: ep(t, 5.0, 5.6)},
      {label: 'The rest', value: 'identical', sub: 'the source tail, byte for byte', color: C.green, o: ep(t, 5.6, 6.2)},
    ]} />
  </>
);

/* 5. Stop periods one */
const Stop: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Cut the end, the other option" title="It deletes the second tone." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cmd y={262} text="ffmpeg -i in.wav -af silenceremove=stop_periods=1:stop_duration=0.3 out.wav" hi="stop_periods=1" size={28} o={ep(t, 0.9, 1.5)} />
    <FrameStrip y={370} n={5} cur={-1} kept={(i) => i === 1} label={(i) => (i < 2 ? SEG[i] : 'gone')} fw={290} fh={90} gap={14} color={C.red} o={ep(t, 1.8, 2.4)} />
    <Figure y={545} value="87357" caption="samples left of 192000" size={120} color={C.red} o={ep(t, 3.0, 3.6)} />
    <Row y={765} h={175} cw={520} gap={40} valueSize={46} items={[
      {label: 'Tone samples left', value: '47999', sub: 'of 95998 in the source', color: C.red, o: ep(t, 4.4, 5.0)},
      {label: 'Second tone', value: 'gone', sub: 'cut after the first silence', color: C.red, o: ep(t, 5.0, 5.6)},
      {label: 'What is left', value: 'identical', sub: 'the source head, byte for byte', color: C.amber, o: ep(t, 5.6, 6.2)},
    ]} />
  </>
);

/* 6. Both, and what it keeps */
const Fix: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Start and stop together" title="Both tones stay. Gaps stay too." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Cmd y={262} text="-af silenceremove=start_periods=1:stop_periods=-1:stop_duration=0.3" hi="stop_periods=-1" size={28} o={ep(t, 0.9, 1.5)} />
    <Mid y={345} size={24} color={C.mute} o={ep(t, 1.2, 1.7)}>both thresholds -50dB, as in every case here</Mid>
    <Figure y={410} value="126708" caption="samples out · the hand cut with no silence: 96000" size={140} color={C.green} o={ep(t, 1.8, 2.5)} />
    <Duel y={655} h={205}
      left={{label: 'Kept in each gap', value: '15357', sub: 'samples: 0.3 s plus about 20 ms', color: C.amber, o: ep(t, 3.4, 4.0), valueSize: 62}}
      right={{label: 'At 0.1 s instead', value: '5757', sub: 'stop_duration=0.1 keeps 5757', color: C.green, o: ep(t, 4.4, 5.0), valueSize: 62}}
      mid="" midO={0} />
    <Mid y={880} size={26} color={C.dim} o={ep(t, 5.6, 6.2)}>Even stop_duration=0.02 leaves 99828 samples, not 96000: a gap is always kept.</Mid>
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Name both periods. Count samples." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Row y={290} h={230} cw={520} gap={40} valueSize={60} items={[
      {label: 'No options', value: '0 of 3', sub: 'silences cut', color: C.cyan, o: ep(t, 1.4, 2.0)},
      {label: 'Start only', value: '1 of 3', sub: 'the leading one', color: C.amber, o: ep(t, 2.2, 2.8)},
      {label: 'Cutting the end', value: 'audio lost', sub: 'the second tone', color: C.red, o: ep(t, 3.0, 3.6)},
    ]} />
    <Mid y={580} size={28} color={C.mute} o={ep(t, 4.2, 4.8)}>Not tested: noisy silence, other detection modes and windows, start_silence and stop_silence, real recordings, players, other builds.</Mid>
    <Mid y={760} size={30} color={C.dim} o={ep(t, 5.0, 5.6)}>FFmpeg Reality Checks · episode 47 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, none: None, start: Start, stop: Stop, fix: Fix, close: Close};
