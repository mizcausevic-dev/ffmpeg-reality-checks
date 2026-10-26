import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff36/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1, x264 core 164. Rates are kbps; the busiest second is the worst sliding 1 s window of packet sizes. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Capping the bitrate" title="Why is the bitrate higher?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mkv -c:v libx264 -crf 18 -maxrate 2M out.mp4" hi="-maxrate 2M" size={30} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'You expect', value: '2000 kbps', sub: 'or lower', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 80}}
      right={{label: 'Test', value: '8 s clip', sub: '200 noisy frames, lossless source', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 80}}
      mid="?" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Source and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clip · hard to compress" title="Noisy on purpose. Two readers." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={52} items={[
      {label: 'Picture', value: '200 frames', sub: '320x180, 25 fps, 8 s', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Baseline', value: '3588 kbps', sub: '-crf 18 alone', color: C.amber, o: ep(t, 1.6, 2.2)},
      {label: 'Busiest second', value: '3676 kbps', sub: 'worst 1 s window', color: C.amber, o: ep(t, 2.3, 2.9)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · packets', value: 'ffprobe', sub: 'sizes in a sliding 1 s window', color: C.cyan, o: ep(t, 4.6, 5.3), valueSize: 64}}
      right={{label: 'Reader 2 · raw stream', value: 'Node', sub: 'frame sizes summed', color: C.amber, o: ep(t, 5.6, 6.3), valueSize: 64}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.2, 5.8)} />
  </>
);

/* 3. maxrate alone */
const Ignored: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="The cap on its own" title="Nothing happens." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={285} value="3588" caption="kbps with the 2M cap, the same as without it" color={C.red} size={200} o={ep(t, 0.9, 1.6)} />
    <Mid y={655} size={28} color={C.amber} o={ep(t, 3.0, 3.6)}>warning: VBV maxrate specified, but no bufsize, ignored</Mid>
    <Mid y={720} size={28} color={C.mute} o={ep(t, 4.4, 5.0)}>-maxrate 2M, -maxrate 2000k and -x264-params vbv-maxrate=2000 all give the same bytes.</Mid>
    <Verdict y={800} text="Same packet md5. Same busiest second. Same PSNR." color={C.red} o={ep(t, 5.8, 6.6)} size={32} />
  </>
);

/* 4. With bufsize */
const Buffer: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Add a buffer" title="Now the encoder obeys." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'Buffer equal to the cap', value: '2098 kbps', sub: '-bufsize 2M\nbusiest second 2593', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 84}}
      right={{label: 'Buffer 2x the cap', value: '2198 kbps', sub: '-bufsize 4M\nbusiest second 2942', color: C.amber, o: ep(t, 3.0, 3.7), valueSize: 84}}
      mid="" midO={0} />
    <Mid y={680} size={30} color={C.dim} o={ep(t, 5.0, 5.6)}>PSNR against the lossless source: 37.80 dB, then 32.05 dB.</Mid>
    <Verdict y={770} text="A buffer rule, not a limit on every second" color={C.amber} o={ep(t, 6.2, 7.0)} size={32} />
  </>
);

/* 5. Control and average mode */
const Control: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Control and average mode" title="The readers see a cap." color={C.cyan} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'Control · tiny buffer', value: '2077 kbps', sub: '-bufsize 200k\nbusiest second', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 84}}
      right={{label: 'Average mode', value: '2531 kbps', sub: '-b:v 2M, average 2024\nbusiest second', color: C.amber, o: ep(t, 3.0, 3.7), valueSize: 84}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={680} size={28} color={C.mute} o={ep(t, 5.0, 5.6)}>Average mode keeps the average near 2000 kbps. The peaks are not capped.</Mid>
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Set both. Check the peak." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Ignored', value: 'cap alone', sub: '3588 kbps, as uncapped', color: C.red, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'Works', value: 'cap + buffer', sub: '2098 kbps, busiest 2593', color: C.green, o: ep(t, 2.0, 2.7), valueSize: 64}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: other presets, two pass, other encoders, real footage, players.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 36 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, ignored: Ignored, buffer: Buffer, control: Control, close: Close};
