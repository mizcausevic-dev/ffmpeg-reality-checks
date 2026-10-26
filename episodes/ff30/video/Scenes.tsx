import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff30/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). kbps = ffprobe packet bytes, PSNR = ffmpeg psnr filter, all planes. ffmpeg 6.1.1 only. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="VP9 with libvpx" title="Does -crf need -b:v 0?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i src.mkv -c:v libvpx-vp9 -crf 30 -b:v 0 out.webm" hi="-b:v 0" size={32} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'The advice', value: 'capped', sub: 'crf alone gives a blocky file', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 72}}
      right={{label: 'The test', value: '10 encodes', sub: 'one noisy clip, only the flags change', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 72}}
      mid="?" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Clip and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clip · 2 s · 320x180 · lossless" title="Four readers." o={ep(t, 0.2, 0.8)} />
    <Row y={285} h={300} cw={400} gap={32} valueSize={56} items={[
      {label: 'Bitrate · reader 1', value: 'ffprobe', sub: 'packet sizes,\nnot the header', color: C.green, o: ep(t, 0.9, 1.5)},
      {label: 'Bitrate · reader 2', value: 'IVF in Node', sub: 'copy the packets,\nsum the frame sizes', color: C.green, o: ep(t, 2.4, 3.0)},
      {label: 'Quality · reader 1', value: 'ffmpeg', sub: 'psnr filter against\nthe lossless clip', color: C.cyan, o: ep(t, 4.4, 5.0)},
      {label: 'Quality · reader 2', value: 'PSNR in Node', sub: 'our own, from\ndecoded raw frames', color: C.cyan, o: ep(t, 6.0, 6.6)},
    ]} />
    <Verdict y={660} text="They agree on all 10 encodes." color={C.green} o={ep(t, 8.0, 8.8)} size={34} />
  </>
);

/* 3. -b:v 0 changes nothing */
const Same: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Same clip, same crf" title="The fix changes nothing." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={270} value="identical" caption="0 bytes differ: same packet md5, same decoded frames" size={150} color={C.red} o={ep(t, 0.9, 1.7)} />
    <Duel y={575} h={225}
      left={{label: 'Crf 30 alone', value: '2829 kbps', sub: 'no -b:v anywhere', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 72}}
      right={{label: 'Crf 30 + zero', value: '2829 kbps', sub: '-b:v 0 added', color: C.cyan, o: ep(t, 4.4, 5.1), valueSize: 72}}
      mid="=" midO={ep(t, 4.0, 4.6)} />
    <Mid y={825} size={26} color={C.mute} o={ep(t, 6.4, 7.0)}>Crf 20 and crf 40 match their -b:v 0 twins too.</Mid>
  </>
);

/* 4. The cap you write */
const Cap: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Now ask for a bitrate" title="Now it is capped and blocky." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={262} value="-11.5 dB" caption="PSNR lost at crf 20: 40.2 down to 28.8" size={165} color={C.red} o={ep(t, 5.4, 6.2)} />
    <Duel y={575} h={225}
      left={{label: 'Free · crf 30', value: '2829 kbps', sub: 'PSNR 35.3 dB', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 72}}
      right={{label: 'Capped · crf 30', value: '697 kbps', sub: '-b:v 500k · PSNR 28.7 dB', color: C.red, o: ep(t, 2.6, 3.3), valueSize: 72}}
      mid="→" midO={ep(t, 2.2, 2.8)} />
    <Mid y={825} size={26} color={C.mute} o={ep(t, 8.0, 8.6)}>A target, not a wall: 697 kbps against a 500k request.</Mid>
  </>
);

/* 5. Under the cap crf barely matters, control */
const Crf: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Same cap, two crf values" title="Different files, same quality." o={ep(t, 0.2, 0.8)} />
    <Row y={285} h={330} cw={400} gap={32} valueSize={64} items={[
      {label: 'Cap · crf 20', value: '726 kbps', sub: '-b:v 500k\nPSNR 28.8 dB', color: C.red, o: ep(t, 0.9, 1.5)},
      {label: 'Cap · crf 40', value: '665 kbps', sub: '-b:v 500k\nPSNR 28.7 dB', color: C.red, o: ep(t, 2.4, 3.0)},
      {label: 'Control · crf 20', value: '4194 kbps', sub: '-b:v 0\nPSNR 40.2 dB', color: C.green, o: ep(t, 5.0, 5.6)},
      {label: 'Control · crf 40', value: '960 kbps', sub: '-b:v 0\nPSNR 29.6 dB', color: C.green, o: ep(t, 6.4, 7.0)},
    ]} />
    <Verdict y={700} text="Under a cap, crf 20 and crf 40 look alike." color={C.red} o={ep(t, 8.2, 9.0)} size={34} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Look for a stray -b:v." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Capped file?', value: '-b:v 500k', sub: 'in the command or a wrapper', color: C.red, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'Crf alone', value: '-crf 30', sub: 'uncapped on 6.1.1', color: C.green, o: ep(t, 2.0, 2.7), valueSize: 64}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: ffmpeg 8.1.2 (not yet checked), older builds, other libvpx versions, two pass, real footage.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 30 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, same: Same, cap: Cap, crf: Crf, close: Close};
