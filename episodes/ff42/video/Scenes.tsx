import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, FrameStrip, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff42/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Deinterlace everything?" title="yadif on every video?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mp4 -vf yadif out.mp4" hi="-vf yadif" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'Interlaced footage', value: 'combing', sub: 'yadif removes it', color: C.cyan, o: ep(t, 2.4, 3.1), valueSize: 80}}
      right={{label: 'Progressive footage', value: '?', sub: 'nothing to remove', color: C.amber, o: ep(t, 3.6, 4.3), valueSize: 80}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 5.2, 5.8)}>We measure frames changed, detail kept and frame count.</Mid>
  </>
);

/* 2. Clips and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clips · 320x240 · 50 frames" title="Two progressive. One woven." o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={210} cw={520} gap={40} valueSize={52} items={[
      {label: 'Fine', value: 'progressive', sub: 'stripes, lines, moving box', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Smooth', value: 'progressive', sub: 'no fine row detail', color: C.cyan, o: ep(t, 2.0, 2.6)},
      {label: 'Control', value: 'interlaced', sub: 'woven from two moments', color: C.green, o: ep(t, 3.4, 4.0)},
    ]} />
    <Row y={560} h={190} cw={520} gap={40} valueSize={46} items={[
      {label: 'Reader 1', value: 'raw luma', sub: 'rows, frames, PSNR in Node', color: C.cyan, o: ep(t, 5.4, 6.0)},
      {label: 'Reader 2', value: 'framemd5', sub: 'one hash per frame', color: C.amber, o: ep(t, 6.2, 6.8)},
      {label: 'Reader 3', value: 'idet', sub: 'ffmpeg frame counts', color: C.green, o: ep(t, 7.0, 7.6)},
    ]} />
    <Mid y={800} size={28} color={C.mute} o={ep(t, 8.4, 9.0)}>Control combing: adjacent rows differ 5.5 times two-apart rows. Smooth clip: 0.5.</Mid>
  </>
);

/* 3. yadif on progressive */
const Wipe: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="yadif, no options, fine progressive clip" title="Fifty of fifty rewritten." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i fine.mp4 -vf yadif out.mp4" hi="-vf yadif" size={30} o={ep(t, 0.9, 1.5)} />
    <FrameStrip y={370} n={10} kept={() => true} label={(i) => String(i)} fw={150} fh={86} gap={14} o={ep(t, 2.0, 2.7)} />
    <Row y={560} h={200} cw={520} gap={40} valueSize={52} items={[
      {label: 'Stripe rows, difference', value: '180 to 1.6', sub: 'PSNR 6.1 dB', color: C.red, o: ep(t, 3.6, 4.2)},
      {label: 'Moving striped box', value: '38.5 to 0.1', sub: 'detail wiped', color: C.red, o: ep(t, 4.6, 5.2)},
      {label: 'Static single lines', value: 'identical', sub: '87.1 before and after', color: C.green, o: ep(t, 5.6, 6.2)},
    ]} />
    <Mid y={810} size={28} color={C.mute} o={ep(t, 7.0, 7.6)}>Frames 0 to 9 of 50 shown. Raw luma and frame md5 agree: 50 of 50. Frame count and timing unchanged.</Mid>
  </>
);

/* 4. The flag decides */
const Flag: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Only frames flagged interlaced" title="deint=interlaced trusts the flag." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={280} h={330}
      left={{label: 'Flag says progressive', value: '0 of 50', sub: 'frames changed\nsame md5 as the source', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 100}}
      right={{label: 'Same pixels, flag says interlaced', value: '50 of 50', sub: 'encoded with ilme+ildct\nstripe rows 180 to 1.5', color: C.red, o: ep(t, 3.4, 4.1), valueSize: 100}}
      mid="vs" midO={ep(t, 3.0, 3.6)} />
    <Mid y={660} size={28} color={C.dim} o={ep(t, 5.6, 6.2)}>Smooth clip with plain yadif: 50 of 50 frames change, only 14 pixels each, 52.7 dB.</Mid>
    <Verdict y={780} text="The flag decides, not the picture" color={C.amber} o={ep(t, 6.8, 7.4)} size={34} />
  </>
);

/* 5. Control and frame rate */
const Rate: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Control and mode=1" title="Combing gone. Frames doubled." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Duel y={280} h={310}
      left={{label: 'Woven control, yadif', value: '5.5 to 0.5', sub: 'combing ratio\nidet: 50 interlaced to 50 progressive', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 90}}
      right={{label: 'mode=1, send_field', value: '50 to 100', sub: 'frames, one every 0.02 s\nfine clip: stripes 180 to 1.5', color: C.amber, o: ep(t, 3.4, 4.1), valueSize: 90}}
      mid="and" midO={ep(t, 3.0, 3.6)} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 5.6, 6.2)}>The readers can see combing, so a clean result on the fine clip is not a blind spot.</Mid>
    <Verdict y={770} text="Default yadif keeps 50 frames. mode=1 makes 100" color={C.green} o={ep(t, 6.8, 7.4)} size={34} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Look before you filter." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Always', value: 'ffprobe', sub: 'read field_order first', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'Avoid', value: 'yadif on all', sub: 'it rewrites progressive frames', color: C.red, o: ep(t, 2.4, 3.1), valueSize: 64}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.8, 4.4)}>Not tested: real footage, other deinterlacers, other builds, players. idet itself: 50 undetermined on the fine clip.</Mid>
    <Mid y={720} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 42 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, wipe: Wipe, flag: Flag, rate: Rate, close: Close};
