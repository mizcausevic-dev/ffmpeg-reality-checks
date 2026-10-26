import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, FrameStrip, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff43/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1 and 8.1.2. */

const IN_RATES = ['8000', '11025', '12000', '16000', '22050', '24000', '32000', '44100', '48000', '96000'];
const HEAD_RATES = ['8000', '12000', '12000', '16000', '24000', '24000', '24000', '48000', '48000', '48000'];
const SAME = (i: number) => IN_RATES[i] === HEAD_RATES[i];

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Opus and sample rate" title="Everything becomes 48 kHz?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.wav -c:a libopus out.opus" hi="-c:a libopus" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'ffprobe says', value: '48000', sub: 'on every Opus file', color: C.cyan, o: ep(t, 2.4, 3.1), valueSize: 90}}
      right={{label: 'The encoder ran at', value: '?', sub: 'sample rate, samples, pitch, bandwidth', color: C.amber, o: ep(t, 3.6, 4.3), valueSize: 90}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 5.2, 5.8)}>A 1000 Hz sine at ten input rates, measured two ways.</Mid>
  </>
);

/* 2. Files and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic sine · 1000 Hz · 2 seconds" title="Thirty files, two readers." o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={210} cw={520} gap={40} valueSize={52} items={[
      {label: 'Input rates', value: '8000 to 96000', sub: 'ten rates', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Libopus files', value: '30', sub: 'ogg, mka, webm', color: C.cyan, o: ep(t, 2.0, 2.6)},
      {label: 'Control', value: 'pcm, flac', sub: '20 files, rate kept', color: C.green, o: ep(t, 3.4, 4.0)},
    ]} />
    <Row y={560} h={190} cw={520} gap={40} valueSize={46} items={[
      {label: 'Reader 1', value: 'ffprobe', sub: 'stream sample_rate', color: C.cyan, o: ep(t, 5.4, 6.0)},
      {label: 'Reader 2', value: 'Node samples', sub: 'count, zero crossings, FFT', color: C.amber, o: ep(t, 6.2, 6.8)},
      {label: 'Reader 2', value: 'Node bytes', sub: 'the OpusHead header', color: C.green, o: ep(t, 7.0, 7.6)},
    ]} />
    <Mid y={800} size={28} color={C.mute} o={ep(t, 8.4, 9.0)}>The sine is made at each rate by lavfi, then encoded at 64 kbit/s.</Mid>
  </>
);

/* 3. The label */
const Label: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0.2, 1.4)} />
    <Head over="At the label level" title="Yes. 48000 for 30 of 30." o={ep(t, 0.2, 0.8)} />
    <Figure y={270} value="48000" caption="ffprobe sample_rate, every input rate, every container" color={C.cyan} size={200} o={ep(t, 1.0, 1.8)} />
    <Row y={600} h={200} cw={520} gap={40} valueSize={52} items={[
      {label: 'Decoded samples', value: '96000', sub: '2 s, all 30 files', color: C.cyan, o: ep(t, 3.2, 3.8)},
      {label: 'Pitch', value: '1000 Hz', sub: 'zero crossings and FFT', color: C.cyan, o: ep(t, 4.2, 4.8)},
      {label: 'Control', value: '20 of 20', sub: 'keep their own rate', color: C.green, o: ep(t, 5.2, 5.8)},
    ]} />
    <Mid y={830} size={26} color={C.mute} o={ep(t, 6.4, 7.0)}>Nothing is sped up or slowed down.</Mid>
  </>
);

/* 4. The header remembers */
const Header: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="The OpusHead input rate" title="The header remembers." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Mid y={262} size={26} color={C.dim} o={ep(t, 0.9, 1.4)}>Source rate</Mid>
    <FrameStrip y={300} n={10} kept={() => false} label={(i) => IN_RATES[i]} fw={150} fh={70} gap={14} color={C.cyan} o={ep(t, 1.0, 1.6)} />
    <Mid y={470} size={26} color={C.dim} o={ep(t, 2.4, 2.9)}>Rate recorded in the file (the same in ogg, mka and webm)</Mid>
    <FrameStrip y={508} n={10} cur={6} kept={SAME} label={(i) => HEAD_RATES[i]} fw={150} fh={70} gap={14} color={C.red} o={ep(t, 2.6, 3.2)} />
    <Mid y={690} size={28} color={C.dim} o={ep(t, 4.4, 5.0)}>ffmpeg picks the nearest of 8000, 12000, 16000, 24000 and 48000.</Mid>
    <Verdict y={780} text="32000 in, 24000 recorded" color={C.red} o={ep(t, 5.8, 6.4)} size={36} />
  </>
);

/* 5. The cost */
const Loss: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="White noise, 32000 Hz source" title="The top is gone." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={272} value="-80 dB" caption="13 to 15.5 kHz against 0.3 to 9 kHz. ffprobe still says 48000." color={C.red} size={170} o={ep(t, 1.0, 1.8)} />
    <Duel y={570} h={210}
      left={{label: 'Default, header 24000', value: '80 dB down', sub: 'bandwidth cut at 12 kHz', color: C.red, o: ep(t, 3.0, 3.7), valueSize: 64}}
      right={{label: 'Output rate set to 48000', value: '0.7 dB down', sub: 'header 48000', color: C.green, o: ep(t, 4.2, 4.9), valueSize: 64}}
      mid="vs" midO={ep(t, 3.8, 4.4)} />
    <Mid y={810} size={26} color={C.mute} o={ep(t, 5.8, 6.4)}>A 44100 Hz source loses 0 dB. Output rate 8000 on 48000 noise: 5 to 20 kHz is 86.6 dB down.</Mid>
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Read the header, not the label." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Cmd y={280} text="ffmpeg -i in32k.wav -ar 48000 -c:a libopus out.opus" hi="-ar 48000" size={32} o={ep(t, 1.2, 1.8)} />
    <Duel y={420} h={280}
      left={{label: 'Unsupported rate set', value: 'refused', sub: 'no file; the same source\nencodes without it', color: C.red, o: ep(t, 2.6, 3.3), valueSize: 70}}
      right={{label: '32000 Hz source', value: 'set 48000', sub: 'keeps the top band', color: C.green, o: ep(t, 3.8, 4.5), valueSize: 70}}
      mid="" midO={0} />
    <Mid y={735} size={28} color={C.mute} o={ep(t, 5.0, 5.6)}>Not tested: real music, other Opus encoders, other builds, players.</Mid>
    <Mid y={820} size={30} color={C.dim} o={ep(t, 5.8, 6.4)}>FFmpeg Reality Checks · episode 43 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, label: Label, header: Header, loss: Loss, close: Close};
