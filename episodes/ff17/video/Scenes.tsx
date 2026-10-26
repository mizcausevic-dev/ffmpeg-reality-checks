import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff17/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). "Read as" means the file was decoded with that matrix forced. */
const BLUE = '#4d8bff';

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Image to video" title="Pure green looks duller." o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.png -c:v libx264 -pix_fmt yuv420p out.mp4" hi="-pix_fmt yuv420p" size={30} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'Source', value: '0, 255, 0', sub: 'pure green, RGB', color: C.green, o: ep(t, 2.2, 2.9), valueSize: 76}}
      right={{label: 'After the file', value: '0, 215, 0', sub: 'read as BT.709', color: C.red, o: ep(t, 3.0, 3.7), valueSize: 76}}
      mid="→" midO={ep(t, 3.4, 4.0)} />
  </>
);

/* 2. Source and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic source · 1280x720" title="Four patches. Two readers." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={200} cw={400} gap={32} valueSize={44} items={[
      {label: 'Red', value: '255, 0, 0', color: C.red, o: ep(t, 0.9, 1.5)},
      {label: 'Green', value: '0, 255, 0', color: C.green, o: ep(t, 1.4, 2.0)},
      {label: 'Blue', value: '0, 0, 255', color: BLUE, o: ep(t, 1.9, 2.5)},
      {label: 'Gray', value: '128 × 3', color: C.dim, o: ep(t, 2.4, 3.0)},
    ]} />
    <Duel y={540} h={220}
      left={{label: 'Reader 1 · ffprobe', value: 'the tag', sub: 'color matrix the file declares', color: C.cyan, o: ep(t, 4.6, 5.3), valueSize: 64}}
      right={{label: 'Reader 2 · decode', value: 'RGB values', sub: 'at the center of each patch', color: C.amber, o: ep(t, 5.6, 6.3), valueSize: 64}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 5.2, 5.8)} />
  </>
);

/* 3. Default */
const Default: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Plain command · no tag · BT.601 pixels" title="Right, until read as BT.709." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Read as BT.601', value: '± 2', sub: 'levels off, every patch', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 96}}
      right={{label: 'Read as BT.709', value: '255 → 215', sub: 'green channel of pure green', color: C.red, o: ep(t, 2.6, 3.3), valueSize: 76}}
      mid="vs" midO={ep(t, 2.2, 2.8)} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 5.2, 5.8)}>Red also gains a green channel of 23, blue gains 14.</Mid>
  </>
);

/* 4. Tagged */
const Tagged: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="BT.709 pixels · BT.709 tag" title="The tag picks the matrix." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Reader follows the tag', value: '± 1', sub: 'levels off', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 96}}
      right={{label: 'Reader forced to BT.601', value: '± 23', sub: 'levels off', color: C.red, o: ep(t, 2.4, 3.1), valueSize: 96}}
      mid="vs" midO={ep(t, 2.0, 2.6)} />
  </>
);

/* 5. Untagged */
const Untagged: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="scale=out_color_matrix=bt709 · no -colorspace" title="Same command, different builds." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'ffmpeg 6.1.1', value: 'no tag', sub: 'read as 601 · off by up to 23', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 80}}
      right={{label: 'ffmpeg 8.1.2', value: 'tag written', sub: 'bt709 · reads right', color: C.green, o: ep(t, 2.6, 3.3), valueSize: 80}}
      mid="vs" midO={ep(t, 2.2, 2.8)} />
    <Mid y={680} size={28} color={C.mute} o={ep(t, 4.8, 5.4)}>The pixels are BT.709 in both builds.</Mid>
  </>
);

/* 6. Only the label */
const Liar: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="-colorspace bt709 on a plain RGB source" title="A label, or a conversion?" o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'ffmpeg 6.1.1', value: 'label only', sub: 'pixels stay BT.601 · off by 40', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 76}}
      right={{label: 'ffmpeg 8.1.2', value: 'converts too', sub: 'pixels follow the tag · reads right', color: C.green, o: ep(t, 2.6, 3.3), valueSize: 76}}
      mid="vs" midO={ep(t, 2.2, 2.8)} />
    <Verdict y={690} text="Same flag, different meaning" color={C.amber} o={ep(t, 5.0, 5.8)} size={36} />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Tag and matrix, together." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Gray', value: 'never moved', sub: '128 under every reading', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'Colors', value: 'move', sub: 'when matrix and tag disagree', color: C.red, o: ep(t, 2.0, 2.7), valueSize: 84}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: real players, other color ranges, HDR, 10-bit video.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 17 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, default: Default, tagged: Tagged, untagged: Untagged, liar: Liar, close: Close};
