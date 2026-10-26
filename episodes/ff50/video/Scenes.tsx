import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff50/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Downsample 48000 to 24000 Hz" title="Does a high tone fold down?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i tone.wav -af aresample=24000 out.wav" hi="aresample=24000" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'Tone in', value: '20 kHz', sub: 'above the new limit of 12 kHz', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 90}}
      right={{label: 'Where it would land', value: '4 kHz', sub: '24000 minus 20000, in the audible range', color: C.amber, o: ep(t, 3.6, 4.3), valueSize: 90}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 5.2, 5.8)}>We read the level at the alias, in dB against the input tone, with two readers.</Mid>
  </>
);

/* 2. A tone and a control */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic sine · 48000 Hz · 2 s" title="A control that must pass." o={ep(t, 0.2, 0.8)} />
    <Row y={270} h={210} cw={520} gap={40} valueSize={56} items={[
      {label: 'Output rate', value: '24000 Hz', sub: 'new limit (Nyquist): 12000 Hz', color: C.cyan, o: ep(t, 1.0, 1.6)},
      {label: 'Control tone', value: '6 kHz', sub: 'inside the new band', color: C.cyan, o: ep(t, 2.2, 2.8)},
      {label: 'Control result', value: '0.0 dB', sub: 'level change, both readers agree', color: C.green, o: ep(t, 3.8, 4.4)},
    ]} />
    <Duel y={560} h={220}
      left={{label: 'Reader 1', value: 'Node FFT', sub: 'Hann window on the decoded samples', color: C.cyan, o: ep(t, 5.6, 6.2), valueSize: 64}}
      right={{label: 'Reader 2', value: 'bandpass + astats', sub: 'inside ffmpeg, 400 Hz wide', color: C.amber, o: ep(t, 6.6, 7.2), valueSize: 64}}
      mid="" midO={0} />
    <Mid y={830} size={28} color={C.mute} o={ep(t, 8.0, 8.6)}>Tone made by aevalsrc, amplitude 0.25, so the input reads -15.1 dB.</Mid>
  </>
);

/* 3. Known positive: no filter */
const Naive: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={500} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Known positive · decimate by hand" title="With no filter, it folds." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={250} value="0.0 dB" caption="alias of the 20 kHz tone at 4 kHz · keep every second sample, no filter" color={C.red} size={200} o={ep(t, 1.0, 1.8)} />
    <Row y={590} h={200} cw={520} gap={40} valueSize={52} items={[
      {label: 'Tone in', value: '20000 Hz', sub: 'level -15.1 dB', color: C.cyan, o: ep(t, 3.2, 3.8)},
      {label: 'Strongest peak out', value: '4000 Hz', sub: '24000 minus 20000', color: C.red, o: ep(t, 4.2, 4.8)},
      {label: 'Node and ffmpeg', value: '0.0 dB', sub: 'both read the full tone', color: C.red, o: ep(t, 5.2, 5.8)},
    ]} />
    <Mid y={830} size={28} color={C.mute} o={ep(t, 6.6, 7.2)}>So both readers can see an alias when there is one.</Mid>
  </>
);

/* 4. The default aresample, far above the limit */
const Tone: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="The default resampler" title="Far above the limit: gone." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Cmd y={278} text="ffmpeg -i tone20000.wav -af aresample=24000 out.wav" hi="aresample=24000" size={30} o={ep(t, 0.9, 1.5)} />
    <Figure y={395} value="-106.1 dB" caption="alias at 4 kHz, Node · the ffmpeg reader says -103.0 dB" color={C.green} size={190} o={ep(t, 2.0, 2.8)} />
    <Row y={700} h={170} cw={520} gap={40} valueSize={46} items={[
      {label: '14 kHz tone', value: '-113.9 dB', sub: 'ffmpeg reader: -95.4 dB', color: C.green, o: ep(t, 4.6, 5.2)},
      {label: '16 kHz tone', value: '-99.6 dB', sub: 'ffmpeg reader: -96.8 dB', color: C.green, o: ep(t, 5.4, 6.0)},
      {label: '23 kHz tone', value: '-120.3 dB', sub: 'ffmpeg reader: -115.8 dB', color: C.green, o: ep(t, 6.2, 6.8)},
    ]} />
    <Mid y={890} size={26} color={C.mute} o={ep(t, 7.4, 8.0)}>Every tone from 14 kHz up: 90 dB down or better, in both readers.</Mid>
  </>
);

/* 5. Close to the limit */
const Leak: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="A tone just above the limit" title="Close to 12 kHz, it comes back." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={250} value="-11.8 dB" caption="12.1 kHz tone, alias at 11.9 kHz · Node · the ffmpeg reader says -12.2 dB" color={C.red} size={200} o={ep(t, 1.0, 1.8)} />
    <Row y={600} h={190} cw={520} gap={40} valueSize={52} items={[
      {label: 'Tone at 12.5 kHz', value: '-19.4 dB', sub: 'alias at 11.5 kHz · ffmpeg -19.5', color: C.red, o: ep(t, 3.4, 4.0)},
      {label: 'Tone at 13 kHz', value: '-34.0 dB', sub: 'alias at 11 kHz · ffmpeg -34.0', color: C.amber, o: ep(t, 4.4, 5.0)},
      {label: 'Tone at 14 kHz', value: '-113.9 dB', sub: 'ffmpeg reader: -95.4', color: C.green, o: ep(t, 5.4, 6.0)},
    ]} />
    <Verdict y={850} text="Only a wide margin above the limit is safe" color={C.red} o={ep(t, 7.0, 7.6)} size={32} />
  </>
);

/* 6. The filter does the work */
const Dial: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Filter size, 20 kHz tone" title="The filter does the work." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i tone20000.wav -af aresample=24000:filter_size=1 out.wav" hi="filter_size=1" size={28} o={ep(t, 0.9, 1.5)} />
    <Row y={400} h={250} cw={330} gap={24} valueSize={54} items={[
      {label: 'Size 1', value: '-7.0', sub: 'dB, alias at 4 kHz', color: C.red, o: ep(t, 2.0, 2.6)},
      {label: 'Size 2', value: '-15.5', sub: 'dB', color: C.red, o: ep(t, 2.8, 3.4)},
      {label: 'Size 4', value: '-30.7', sub: 'dB', color: C.amber, o: ep(t, 3.6, 4.2)},
      {label: 'Size 8', value: '-88.3', sub: 'dB', color: C.amber, o: ep(t, 4.4, 5.0)},
      {label: 'Size 32, default', value: '-106.1', sub: 'dB', color: C.green, o: ep(t, 5.2, 5.8)},
    ]} />
    <Mid y={700} size={28} color={C.dim} o={ep(t, 6.6, 7.2)}>Both readers agree within 0.3 dB down to -88 dB. A higher size is a longer low-pass filter.</Mid>
    <Mid y={800} size={28} color={C.mute} o={ep(t, 7.8, 8.4)}>-ar 24000, aresample=24000 and aformat=sample_rates=24000 give the same samples (same hash).</Mid>
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Mind the margin to the limit." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Far above the limit', value: 'no alias', sub: '90 dB down or better', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'Just above it', value: 'comes back', sub: '12.1 kHz returns at -11.8 dB', color: C.red, o: ep(t, 2.4, 3.1), valueSize: 64}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.8, 4.4)}>Keep content well under half the new rate, or low-pass first. Not tested: other rates, the soxr resampler, real music, builds other than 6.1.1.</Mid>
    <Mid y={760} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 50 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, naive: Naive, tone: Tone, leak: Leak, dial: Dial, close: Close};
