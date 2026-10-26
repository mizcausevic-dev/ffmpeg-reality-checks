import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff20/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). Bitrates are the values ffprobe declares. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="No bitrate set" title="What do you get?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.wav -c:a aac out.m4a" hi="-c:a aac" size={36} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'Channels', value: '1 · 2', sub: 'mono and stereo', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 84}}
      right={{label: 'Sample rates', value: '4', sub: '22.05 to 48 kHz', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 96}}
      mid="×" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Source and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic source · 10 s" title="Noise in. Two readers out." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={40} items={[
      {label: 'Source', value: 'pink noise', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Per channel', value: 'own seed', color: C.amber, o: ep(t, 1.4, 2.0)},
      {label: 'Control', value: 'silence', color: C.dim, o: ep(t, 1.9, 2.5)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · ffprobe', value: 'declared', sub: 'stream bit_rate', color: C.cyan, o: ep(t, 4.4, 5.1), valueSize: 64}}
      right={{label: 'Reader 2 · packets', value: 'measured', sub: 'summed payload ÷ time', color: C.amber, o: ep(t, 5.4, 6.1), valueSize: 64}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.0, 5.6)} />
  </>
);

/* 3. Stereo */
const Stereo: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Stereo · no -b:a" title="About 128 kbps." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={260} cw={400} gap={32} valueSize={52} items={[
      {label: '22.05 kHz', value: '127.2', sub: 'kbps', color: C.green, o: ep(t, 0.9, 1.5)},
      {label: '32 kHz', value: '127.8', sub: 'kbps', color: C.green, o: ep(t, 1.6, 2.2)},
      {label: '44.1 kHz', value: '128.1', sub: 'kbps', color: C.green, o: ep(t, 2.3, 2.9)},
      {label: '48 kHz', value: '127.9', sub: 'kbps', color: C.green, o: ep(t, 3.0, 3.6)},
    ]} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 4.6, 5.2)}>Both readers agree within 1%.</Mid>
  </>
);

/* 4. Mono */
const Mono: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.amber} o={ep(t, 0.2, 1.4)} />
    <Head over="Mono · no -b:a" title="About 69 kbps." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={260} cw={400} gap={32} valueSize={52} items={[
      {label: '22.05 kHz', value: '69.0', sub: 'kbps', color: C.amber, o: ep(t, 0.9, 1.5)},
      {label: '32 kHz', value: '69.4', sub: 'kbps', color: C.amber, o: ep(t, 1.6, 2.2)},
      {label: '44.1 kHz', value: '69.2', sub: 'kbps', color: C.amber, o: ep(t, 2.3, 2.9)},
      {label: '48 kHz', value: '69.3', sub: 'kbps', color: C.amber, o: ep(t, 3.0, 3.6)},
    ]} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 4.6, 5.2)}>Not 64, and not half of stereo: 0.54 of it.</Mid>
  </>
);

/* 5. Silence */
const Silence: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Digital silence · no -b:a" title="The default is a target." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'AAC, silence', value: '2.1 kbps', sub: 'nothing to code', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 80}}
      right={{label: 'MP3, noise', value: '128 / 64', sub: 'stereo / mono, fixed', color: C.green, o: ep(t, 2.8, 3.5), valueSize: 80}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={680} size={28} color={C.mute} o={ep(t, 5.0, 5.6)}>The control: the mp3 readings show both readers work.</Mid>
  </>
);

/* 6. Explicit */
const Explicit: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.cyan} o={ep(t, 0.2, 1.4)} />
    <Head over="-b:a 96k" title="Set it, and you get it." color={C.cyan} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Stereo', value: '95.9 kbps', sub: 'declared', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 76}}
      right={{label: 'Mono', value: '96.3 kbps', sub: 'declared', color: C.green, o: ep(t, 2.2, 2.9), valueSize: 76}}
      mid="" midO={0} />
    <Verdict y={690} text="If the number matters, set it" color={C.amber} o={ep(t, 4.6, 5.4)} size={36} />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Defaults, for sound." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Stereo', value: '≈ 128', sub: 'kbps', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 84}}
      right={{label: 'Mono', value: '≈ 69', sub: 'kbps', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 84}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: real music, variable bitrate modes, 5.1.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 20 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, stereo: Stereo, mono: Mono, silence: Silence, explicit: Explicit, close: Close};
