import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff28/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). Levels are dBFS of one sine tone, read by Goertzel and by bandpass + astats. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Mixing two tracks" title="Why quieter? Why the jump?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i a.wav -i b.wav -filter_complex amix=inputs=2 out.wav" hi="amix=inputs=2" size={30} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'You expect', value: 'same level', sub: 'each track keeps its own level', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 72}}
      right={{label: 'Test', value: '2 tones', sub: '440 Hz for 6 s, 660 Hz for 3 s', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 72}}
      mid="?" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Tones and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic sine tones · 32-bit float" title="Known level, two readers." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={500} gap={32} valueSize={64} items={[
      {label: 'Tone A', value: '440 Hz', sub: '6 s · -6 dBFS', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Tone B', value: '660 Hz', sub: '3 s · -6 dBFS', color: C.amber, o: ep(t, 1.6, 2.2)},
      {label: 'Control · one input', value: '-6.00 dB', sub: 'amix=inputs=1, unchanged', color: C.green, o: ep(t, 2.3, 2.9)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · bandpass', value: 'astats', sub: 'RMS per half second', color: C.green, o: ep(t, 4.6, 5.3), valueSize: 64}}
      right={{label: 'Reader 2 · Goertzel', value: 'raw samples', sub: 'read in Node', color: C.green, o: ep(t, 5.6, 6.3), valueSize: 64}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.2, 5.8)} />
  </>
);

/* 3. The default */
const Quieter: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="amix · the default" title="Each input is scaled down." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'One tone alone', value: '-6.00 dB', sub: 'the source level', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 96}}
      right={{label: 'Two inputs mixed', value: '-12.02 dB', sub: 'each tone, 6.02 dB down', color: C.red, o: ep(t, 2.4, 3.1), valueSize: 96}}
      mid="→" midO={ep(t, 2.0, 2.6)} />
    <Row y={640} h={190} cw={520} gap={32} valueSize={56} items={[
      {label: 'Three inputs', value: '-15.54 dB', sub: 'each tone, 9.54 down', color: C.red, o: ep(t, 3.8, 4.4)},
      {label: 'Control · same tone twice', value: 'error 0', sub: 'output = one input', color: C.green, o: ep(t, 4.8, 5.4)},
    ]} />
  </>
);

/* 4. The jump */
const Jump: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Tone B ends at 3.0 s" title="Tone A rises." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={300} value="+6.02 dB" caption="tone A: -12.02 dB before, -6.00 dB after" size={200} color={C.red} o={ep(t, 0.9, 1.7)} />
    <Row y={670} h={200} cw={420} gap={28} valueSize={52} items={[
      {label: 'dropout_transition=0', value: 'at 3.0 s', sub: 'back at -6.00 dB at once', color: C.red, o: ep(t, 3.0, 3.6)},
      {label: 'dropout_transition=1', value: 'at 4.0 s', sub: 'back at -6.00 dB', color: C.amber, o: ep(t, 3.8, 4.4)},
      {label: 'default (2)', value: 'at 5.0 s', sub: 'back at -6.00 dB', color: C.cyan, o: ep(t, 4.6, 5.2)},
      {label: 'dropout_transition=5', value: '-9.21 dB', sub: 'at the end, 6 s', color: C.amber, o: ep(t, 5.4, 6.0)},
    ]} />
  </>
);

/* 5. normalize=0 and clipping */
const Clip: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="amix normalize=0" title="No scaling. No jump. A sum." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={280} h={290}
      left={{label: 'Tones -6 dBFS, B ends', value: '-6.00 dB', sub: 'each tone, tone A never moves', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 96}}
      right={{label: 'Two -3 dBFS tones, 16-bit', value: '18.4%', sub: 'of samples at full scale', color: C.red, o: ep(t, 2.8, 3.5), valueSize: 96}}
      mid="" midO={0} />
    <Row y={640} h={190} cw={600} gap={32} valueSize={56} items={[
      {label: 'Peak · normalize=0', value: '+2.60 dB', sub: 'above full scale, in float', color: C.red, o: ep(t, 4.4, 5.0)},
      {label: 'Peak · default', value: '-3.42 dB', sub: 'nothing clipped', color: C.cyan, o: ep(t, 5.2, 5.8)},
    ]} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Quieter, a jump, or headroom." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'weights=\'2 1\', default', value: '-9.52 · -15.54', sub: 'dB, tone A and tone B', color: C.cyan, o: ep(t, 1.4, 2.1), valueSize: 56}}
      right={{label: 'duration=shortest', value: '3 s', sub: 'output ends with tone B', color: C.green, o: ep(t, 2.0, 2.7), valueSize: 80}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: other ffmpeg builds, real music, a limiter, other mixing filters.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 28 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, quieter: Quieter, jump: Jump, clip: Clip, close: Close};
