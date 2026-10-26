import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff18/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Making audio louder" title="Does volume clip?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.wav -af volume=6dB out.wav" hi="volume=6dB" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'Boost, then cut', value: 'same amount', sub: 'do you get the source back?', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 60}}
      right={{label: 'Test', value: '9 chains', sub: 'one tone, two readers', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 80}}
      mid="?" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Source and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic source · 2 s · 48 kHz · 16-bit" title="One tone. Two readers." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={44} items={[
      {label: 'Tone', value: '440 Hz', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Level', value: '−3 dBFS', color: C.amber, o: ep(t, 1.4, 2.0)},
      {label: 'At full scale', value: '0', color: C.green, o: ep(t, 1.9, 2.5)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · astats', value: 'flat tops', sub: 'peak level and flat factor', color: C.cyan, o: ep(t, 4.6, 5.3), valueSize: 64}}
      right={{label: 'Reader 2 · raw samples', value: 'at full scale', sub: 'count of 16-bit samples', color: C.amber, o: ep(t, 5.6, 6.3), valueSize: 64}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.2, 5.8)} />
  </>
);

/* 3. Plain gain */
const Gain: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Samples at full scale" title="+3 fits. +6 does not." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={260} cw={400} gap={32} valueSize={60} items={[
      {label: '−6 dB', value: '0%', color: C.green, o: ep(t, 0.9, 1.5)},
      {label: '+3 dB', value: '0%', color: C.green, o: ep(t, 1.6, 2.2)},
      {label: '+6 dB', value: '49.8%', color: C.amber, o: ep(t, 3.0, 3.6)},
      {label: '+12 dB', value: '76.8%', color: C.red, o: ep(t, 4.0, 4.6)},
    ]} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 5.4, 6.0)}>+3 dB lands just under full scale. Both readers agree.</Mid>
  </>
);

/* 4. Boost then cut */
const Chain: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="volume=12dB, then volume=-12dB" title="Where the clip happens." o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={300} cw={400} gap={32} valueSize={72} items={[
      {label: 'One command', value: 'error 0', sub: 'back to the source', color: C.green, o: ep(t, 0.9, 1.6)},
      {label: '16-bit file between', value: '≈ 15,000', sub: 'max error, damage stays', color: C.red, o: ep(t, 3.4, 4.1)},
      {label: 'Float file between', value: 'error 0', sub: 'back to the source', color: C.green, o: ep(t, 5.6, 6.3)},
    ]} />
    <Mid y={680} size={28} color={C.mute} o={ep(t, 7.0, 7.6)}>The gain stage is floating point. The 16-bit file is where it clips.</Mid>
  </>
);

/* 5. Limiter */
const Limiter: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="volume=12dB, then alimiter=limit=0.89" title="A limiter, and its default." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'level=disabled', value: '−1.0 dB', sub: 'peak · 0 samples at full scale', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 84}}
      right={{label: 'default level', value: '801', sub: 'samples at full scale', color: C.red, o: ep(t, 2.8, 3.5), valueSize: 96}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Verdict y={690} text="Read the filter's default" color={C.amber} o={ep(t, 4.8, 5.6)} size={36} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Clipping happens at write." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Same chain', value: 'safe', sub: 'boost and cut together', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 76}}
      right={{label: '16-bit between', value: 'clips', sub: 'and it stays clipped', color: C.red, o: ep(t, 2.0, 2.7), valueSize: 76}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: AAC and other lossy encodes, loudnorm, real music.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 18 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, gain: Gain, chain: Chain, limiter: Limiter, close: Close};
