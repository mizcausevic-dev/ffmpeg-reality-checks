import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff19/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Stereo to mono" title="Is mono as loud?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i stereo.wav -ac 1 mono.wav" hi="-ac 1" size={36} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'Sources', value: '4', sub: 'stereo test files', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 96}}
      right={{label: 'Ways to mono', value: '3', sub: 'one command, two pan filters', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 96}}
      mid="×" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Sources and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Left: 440 Hz at −8 dBFS · right channel varies" title="Four sources. Two readers." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={40} items={[
      {label: 'Right is', value: 'the same', color: C.green, o: ep(t, 0.9, 1.5)},
      {label: 'Right is', value: 'inverted', color: C.red, o: ep(t, 1.4, 2.0)},
      {label: 'Right is', value: 'silent', color: C.amber, o: ep(t, 1.9, 2.5)},
      {label: 'Right is', value: '660 Hz', color: C.cyan, o: ep(t, 2.4, 3.0)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · astats', value: 'peak, RMS', sub: 'ffmpeg filter', color: C.cyan, o: ep(t, 4.6, 5.3), valueSize: 64}}
      right={{label: 'Reader 2 · raw samples', value: 'peak, RMS', sub: 'computed in JS', color: C.amber, o: ep(t, 5.6, 6.3), valueSize: 64}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.2, 5.8)} />
  </>
);

/* 3. Same */
const Same: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Identical channels" title="Nothing changes." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Stereo peak', value: '−7.96 dB', sub: 'left = right', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 76}}
      right={{label: 'After -ac 1', value: '−7.96 dB', sub: 'unchanged', color: C.green, o: ep(t, 2.6, 3.3), valueSize: 76}}
      mid="→" midO={ep(t, 2.2, 2.8)} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 4.6, 5.2)}>The case most people test. It hides the next two.</Mid>
  </>
);

/* 4. One-sided */
const LeftOnly: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.amber} o={ep(t, 0.2, 1.4)} />
    <Head over="Only the left channel has sound" title="6 dB quieter." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Left channel peak', value: '−7.96 dB', sub: 'right is silent', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 76}}
      right={{label: 'After -ac 1', value: '−13.98 dB', sub: 'average of left and nothing', color: C.amber, o: ep(t, 2.8, 3.5), valueSize: 76}}
      mid="→" midO={ep(t, 2.4, 3.0)} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 5.0, 5.6)}>One active microphone: half the level, 6.02 dB.</Mid>
  </>
);

/* 5. Anti-phase */
const Anti: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Right channel = left channel, inverted" title="Average is zero." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Stereo peak', value: '−7.96 dB', sub: 'sounds fine in stereo', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 76}}
      right={{label: 'After -ac 1', value: '−∞ dB', sub: 'both readers: digital silence', color: C.red, o: ep(t, 3.0, 3.7), valueSize: 84}}
      mid="→" midO={ep(t, 2.6, 3.2)} />
    <Verdict y={690} text="A silent file, from a good one" color={C.red} o={ep(t, 5.0, 5.8)} size={36} />
  </>
);

/* 6. The mix */
const Fix: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Choosing the mix" title="Say which channels you mean." o={ep(t, 0.2, 0.8)} />
    <Cmd y={260} text="-af pan=mono|c0=c0" hi="c0=c0" size={30} o={ep(t, 0.8, 1.4)} />
    <Mid y={350} size={28} color={C.mute} o={ep(t, 1.6, 2.2)}>Keeps the left channel at its own level, in all four sources.</Mid>
    <Cmd y={450} text="-af pan=mono|c0=c0+c1" hi="c0+c1" size={30} o={ep(t, 3.4, 4.0)} />
    <Duel y={540} h={220}
      left={{label: 'Identical channels', value: '+6 dB', sub: 'peak −1.94 dB', color: C.amber, o: ep(t, 4.4, 5.1), valueSize: 64}}
      right={{label: 'Inverted channels', value: '−∞ dB', sub: 'still cancels', color: C.red, o: ep(t, 5.4, 6.1), valueSize: 64}}
      mid="" midO={0} />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="-ac 1 is an average." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Check', value: 'loudness', sub: 'one-sided stereo drops 6 dB', color: C.amber, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'Check', value: 'phase', sub: 'inverted channels vanish', color: C.red, o: ep(t, 2.0, 2.7), valueSize: 64}}
      mid="+" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: 5.1 downmix, real recordings.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 19 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, same: Same, leftonly: LeftOnly, anti: Anti, fix: Fix, close: Close};
