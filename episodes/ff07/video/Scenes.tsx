import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Medallion, Mid, Mirror, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff07/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). */
const EV = {srcI: '-26.1', srcLRA: '8', srcPeak: '-20.1', oneI: '-11.7', oneLRA: '4.5', onePeak: '-3.9', twoI: '-14.5', twoLRA: '8', twoPeak: '-8.4'};
const CMD = 'ffmpeg -i in.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 out.wav';

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="loudnorm, run once" title="Target minus fourteen. Does it land?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text={CMD} hi="I=-14" size={32} o={ep(t, 1.0, 1.6)} />
    <Row y={470} h={250} valueSize={72} items={[
      {label: 'Integrated', value: '-14', sub: 'LUFS', color: C.cyan, o: ep(t, 2.2, 2.8)},
      {label: 'True peak', value: '-1.5', sub: 'dBTP', color: C.cyan, o: ep(t, 2.8, 3.4)},
      {label: 'Range', value: '11', sub: 'LU', color: C.cyan, o: ep(t, 3.4, 4.0)},
    ]} />
    <Mid y={790} size={30} o={ep(t, 5.0, 5.6)}>Then measure the file, with a separate tool.</Mid>
  </>
);

/* 2. The source */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic source · 440 Hz tone" title="Quiet half, loud half." o={ep(t, 0.2, 0.8)} />
    <Duel y={280} h={270}
      left={{label: 'First 8 seconds', value: '-10 dB', color: C.cyan, o: ep(t, 0.8, 1.4), valueSize: 80}}
      right={{label: 'Next 8 seconds', value: '-2 dB', color: C.amber, o: ep(t, 1.4, 2.0), valueSize: 80}}
      mid="8 dB" midSub="step" midO={ep(t, 1.8, 2.4)} />
    <Row y={595} h={230} valueSize={60} items={[
      {label: 'Integrated', value: `${EV.srcI} LUFS`, color: C.text, o: ep(t, 3.0, 3.6)},
      {label: 'Loudness range', value: `${EV.srcLRA} LU`, color: C.text, o: ep(t, 3.6, 4.2)},
      {label: 'Peak', value: `${EV.srcPeak} dBFS`, color: C.text, o: ep(t, 4.2, 4.8)},
    ]} />
    <Mid y={855} size={28} color={C.mute} o={ep(t, 5.4, 6.0)}>Measured with the ebur128 filter</Mid>
  </>
);

/* 3. One pass */
const OnePass: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="One pass" title="Louder than asked." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={275} h={290}
      left={{label: 'Target', value: '-14.0', sub: 'LUFS', color: C.cyan, o: ep(t, 0.8, 1.4)}}
      right={{label: 'One pass, measured', value: EV.oneI, sub: 'LUFS', color: C.amber, o: ep(t, 1.6, 2.2)}}
      mid="+2.3" midSub="LU" midColor={C.amber} midO={ep(t, 2.4, 3.0)} />
    <Mirror y={655} label="Range" left={{value: 8, text: 'Source 8 LU', color: C.cyan}} right={{value: 4.5, text: 'One pass 4.5 LU', color: C.amber}} max={8} p={ep(t, 3.6, 4.8)} o={ep(t, 3.4, 3.8)} />
    <Mid y={775} size={28} color={C.dim} o={ep(t, 5.4, 6.0)}>loudnorm's own report: -11.76 LUFS, range 4.1 LU, mode dynamic</Mid>
  </>
);

/* 4. Two passes */
const TwoPass: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Two passes · measured values fed back · linear=true" title="Closer." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Duel y={275} h={290}
      left={{label: 'Target', value: '-14.0', sub: 'LUFS', color: C.cyan, o: ep(t, 0.8, 1.4)}}
      right={{label: 'Two pass, measured', value: EV.twoI, sub: 'LUFS', color: C.green, o: ep(t, 1.6, 2.2)}}
      mid="0.5" midSub="LU off" midColor={C.green} midO={ep(t, 2.4, 3.0)} />
    <Mirror y={655} label="Range" left={{value: 8, text: 'Source 8 LU', color: C.cyan}} right={{value: 8, text: 'Two pass 8 LU', color: C.green}} max={8} p={ep(t, 3.6, 4.8)} o={ep(t, 3.4, 3.8)} />
    <Mid y={775} size={28} color={C.dim} o={ep(t, 5.4, 6.0)}>The second run reported mode: linear</Mid>
  </>
);

/* 5. Range and peaks */
const Peak: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="What changed in the sound" title="Squeezed, or kept." o={ep(t, 0.2, 0.8)} />
    <Mirror y={295} label="Range" left={{value: 4.5, text: 'One pass 4.5 LU', color: C.amber}} right={{value: 8, text: 'Two pass 8 LU', color: C.green}} max={8} p={ep(t, 0.8, 2.2)} o={ep(t, 0.6, 1.0)} />
    <Row y={430} h={260} valueSize={64} items={[
      {label: 'One pass peak', value: `${EV.onePeak} dBFS`, color: C.amber, o: ep(t, 2.8, 3.4)},
      {label: 'Ceiling asked', value: '-1.5 dBTP', color: C.mute, o: ep(t, 3.4, 4.0)},
      {label: 'Two pass peak', value: `${EV.twoPeak} dBFS`, color: C.green, o: ep(t, 4.0, 4.6)},
    ]} />
    <Mid y={760} size={30} o={ep(t, 5.2, 5.8)}>Neither touches the ceiling here.</Mid>
  </>
);

/* 6. Two builds */
const Both: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={500} color={C.violet} o={ep(t, 0, 1.2)} />
    <Head over="Same on two builds" title="One pass, two pass: identical." color={C.violet} o={ep(t, 0.2, 0.8)} />
    <Duel y={260} h={300}
      left={{label: 'ffmpeg 6.1.1', value: `${EV.oneI} · ${EV.twoI}`, sub: 'one pass · two pass, LUFS', color: C.violet, o: ep(t, 0.8, 1.4), valueSize: 72}}
      right={{label: 'ffmpeg 8.1.2', value: `${EV.oneI} · ${EV.twoI}`, sub: 'one pass · two pass, LUFS', color: C.violet, o: ep(t, 1.4, 2.0), valueSize: 72}}
      mid="=" midColor={C.violet} midO={ep(t, 1.8, 2.4)} />
    <Verdict y={660} text="One pass: simpler, squeezes the range" color={C.amber} o={ep(t, 3.4, 4.2)} size={34} />
    <Verdict y={730} text="Two pass: closer here, range kept, extra run" color={C.green} o={ep(t, 4.6, 5.4)} size={34} />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.amber} o={ep(t, 0, 1.2)} />
    <Head over="Measure the output" title="Do not assume the target was met." color={C.amber} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={280}
      left={{label: 'One pass missed by', value: '2.3 LU', color: C.amber, o: ep(t, 1.4, 2.1), valueSize: 88}}
      right={{label: 'Two pass missed by', value: '0.5 LU', color: C.green, o: ep(t, 2.0, 2.7), valueSize: 88}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={640} size={28} color={C.mute} o={ep(t, 3.6, 4.2)}>Not tested: music, speech, other targets, builds in between.</Mid>
    <Mid y={720} size={30} color={C.dim} o={ep(t, 4.2, 4.8)}>FFmpeg Reality Checks · episode 7 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, onepass: OnePass, twopass: TwoPass, peak: Peak, both: Both, close: Close};
void Medallion;
