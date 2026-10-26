import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff27/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). Levels are dB against the same tone in the 5.1 source. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="5.1 to stereo" title="Where did the dialogue go?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i movie.mkv -ac 2 stereo.mkv" hi="-ac 2" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'You hear', value: 'quiet speech', sub: 'the center channel?', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 64}}
      right={{label: 'Or you miss', value: 'the bass', sub: 'the LFE channel?', color: C.amber, o: ep(t, 3.4, 4.1), valueSize: 64}}
      mid="?" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Source and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic 5.1 · 3 s · equal level" title="Six channels, six tones." o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={190} cw={270} gap={20} valueSize={48} items={[
      {label: 'FL', value: '150 Hz', color: C.cyan, o: ep(t, 0.9, 1.4)},
      {label: 'FR', value: '400 Hz', color: C.cyan, o: ep(t, 1.3, 1.8)},
      {label: 'FC · dialogue', value: '1000 Hz', color: C.amber, o: ep(t, 1.7, 2.2)},
      {label: 'LFE', value: '50 Hz', color: C.amber, o: ep(t, 2.1, 2.6)},
      {label: 'BL', value: '2500 Hz', color: C.cyan, o: ep(t, 2.5, 3.0)},
      {label: 'BR', value: '6000 Hz', color: C.cyan, o: ep(t, 2.9, 3.4)},
    ]} />
    <Duel y={545} h={230}
      left={{label: 'Reader 1 · bandpass', value: 'astats RMS', sub: 'one tone at a time', color: C.cyan, o: ep(t, 4.4, 5.1), valueSize: 56}}
      right={{label: 'Reader 2 · raw PCM', value: 'Goertzel', sub: 'sum at the tone frequency', color: C.amber, o: ep(t, 5.4, 6.1), valueSize: 56}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.0, 5.6)} />
    <Mid y={810} size={28} color={C.mute} o={ep(t, 8.4, 9.0)}>Controls: stereo identical · pan 0.5 reads -6.02 dB</Mid>
  </>
);

/* 3. The default matrix */
const Default: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Default 5.1 downmix" title="The dialogue channel drops." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={285} value="-10.67 dB" caption="FC, both outputs · the same tone in the source is 0 dB" size={190} color={C.red} o={ep(t, 0.9, 1.6)} />
    <Row y={650} h={200} cw={500} gap={40} valueSize={56} items={[
      {label: 'FL · FR', value: '-7.66 dB', sub: 'own side only', color: C.cyan, o: ep(t, 3.4, 4.0)},
      {label: 'BL · BR', value: '-10.67 dB', sub: 'own side only', color: C.amber, o: ep(t, 4.6, 5.2)},
      {label: 'LFE', value: 'gone', sub: 'absent in both outputs', color: C.red, o: ep(t, 5.8, 6.4)},
    ]} />
  </>
);

/* 4. Why */
const Why: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Same loud input · 0.8 in FL, FC, BL" title="The matrix is divided by 2.414." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Default downmix · peak', value: '-1.94 dB', sub: 'plain -ac 2 · 0 clipped samples', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 92}}
      right={{label: 'Same weights, no division', value: '62,880', sub: 'clipped samples · peak 0 dB', color: C.red, o: ep(t, 3.2, 3.9), valueSize: 92}}
      mid="vs" midO={ep(t, 2.6, 3.2)} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 5.2, 5.8)}>1 + 0.707 + 0.707 = 2.414 · 20 log10 (1 / 2.414) = -7.66 dB</Mid>
    <Verdict y={730} text="Quiet is the price of never clipping" color={C.amber} o={ep(t, 6.4, 7.2)} size={34} />
  </>
);

/* 5. Writing the matrix */
const Pan: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Write the matrix yourself" title="Center at -3.01 dB, not -10.67." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Cmd y={290} text="pan=stereo|FL=FL+0.707*FC+0.707*BL|FR=FR+0.707*FC+0.707*BR" hi="0.707*FC" size={28} color={C.green} o={ep(t, 0.9, 1.5)} />
    <Row y={440} h={250} cw={520} gap={40} valueSize={60} items={[
      {label: 'pan, unscaled', value: '-3.01 dB', sub: 'FC · fronts at 0.00 dB', color: C.green, o: ep(t, 2.0, 2.6)},
      {label: 'aresample', value: '-3.01 dB', sub: 'rematrix_maxval=3 · same as pan', color: C.green, o: ep(t, 3.6, 4.2)},
      {label: 'aresample', value: '-12.90 dB', sub: 'lfe_mix_level=1 · LFE is back', color: C.amber, o: ep(t, 5.2, 5.8)},
    ]} />
    <Mid y={760} size={28} color={C.mute} o={ep(t, 6.6, 7.2)}>{'With the LFE mixed in, the fronts fall to -9.89 dB.\nBoth readers agree on every level, to 0.05 dB.'}</Mid>
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Know what -ac 2 does." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Default downmix', value: 'FC -10.67 dB', sub: 'with -ac 2 · LFE dropped', color: C.red, o: ep(t, 1.4, 2.1), valueSize: 58}}
      right={{label: 'Your own pan', value: 'you decide', sub: 'watch the peaks', color: C.green, o: ep(t, 2.0, 2.7), valueSize: 58}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: 7.1, real mixes, other decoders, other builds.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 27 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, default: Default, why: Why, pan: Pan, close: Close};
