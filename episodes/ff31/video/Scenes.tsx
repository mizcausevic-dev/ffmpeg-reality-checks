import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff31/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). libx265, 50 synthetic frames. Byte counts are per build: 6.1.1 measured here, 8.1.2 measured on the PC. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="HEVC in MP4 · iPhone and Safari" title="hev1 or hvc1?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in -c:v libx265 -tag:v hvc1 out.mp4" hi="-tag:v hvc1" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'You expect', value: 'a fix', sub: 'the flag renames the tag only', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 80}}
      right={{label: 'Test', value: '50 frames', sub: 'synthetic, libx265', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 80}}
      mid="?" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Readers and control */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clip · libx265" title="Three readers." o={ep(t, 0.2, 0.8)} />
    <Row y={280} h={220} cw={500} gap={32} valueSize={48} items={[
      {label: 'Reader 1', value: 'ffprobe', sub: 'codec_tag_string', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Reader 2', value: 'stsd FourCC', sub: 'raw MP4 box parse, hvcC', color: C.amber, o: ep(t, 1.6, 2.2)},
      {label: 'Reader 3', value: 'the stream', sub: 'packet md5, frame md5, samples', color: C.green, o: ep(t, 2.3, 2.9)},
    ]} />
    <Duel y={560} h={210}
      left={{label: 'Control · first tag', value: 'hev1', sub: 'all three readers see it', color: C.cyan, o: ep(t, 4.4, 5.1), valueSize: 80}}
      right={{label: 'Control · second tag', value: 'hvc1', sub: 'all three readers see it', color: C.green, o: ep(t, 5.4, 6.1), valueSize: 80}}
      mid="2" midSub="values" midColor={C.text} midO={ep(t, 5.0, 5.6)} />
  </>
);

/* 3. The default */
const Default: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="No tag flag given" title="ffmpeg writes hev1." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Reader 1 · ffprobe', value: 'hev1', sub: 'codec_tag_string', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 110}}
      right={{label: 'Reader 2 · stsd', value: 'hev1', sub: 'hvcC box inside the entry', color: C.red, o: ep(t, 2.4, 3.1), valueSize: 110}}
      mid="=" midO={ep(t, 2.0, 2.6)} />
    <Mid y={650} size={30} color={C.dim} o={ep(t, 4.2, 4.8)}>Stream copy to mov, and mkv to mp4: hev1 too. -tag:v hev1: the same file, 0 bytes differ.</Mid>
    <Verdict y={740} text="The default label is hev1, not hvc1" color={C.red} o={ep(t, 5.6, 6.4)} size={34} />
  </>
);

/* 4. Retag without re-encoding */
const Retag: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Stream copy, new tag" title="Zero frames change." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Figure y={290} value="0 of 50" caption="decoded frames changed by the retag" color={C.green} size={190} o={ep(t, 0.9, 1.7)} />
    <Row y={600} h={190} cw={420} gap={28} valueSize={48} items={[
      {label: 'Packets · 50', value: 'same md5', sub: 'before and after', color: C.green, o: ep(t, 3.0, 3.6)},
      {label: 'Raw samples', value: 'same hash', sub: 'read from mdat', color: C.green, o: ep(t, 3.8, 4.4)},
      {label: 'Decoded frames', value: 'same hash', sub: '50 of 50', color: C.green, o: ep(t, 4.6, 5.2)},
    ]} />
    <Mid y={830} size={28} color={C.mute} o={ep(t, 5.8, 6.4)}>Both readers say hvc1. Against a plain copy, every differing byte is inside the sample entry.</Mid>
  </>
);

/* 5. Size depends on the build */
const Size: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Bytes that change · by build" title="The label's size is the build's." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'ffmpeg 6.1.1', value: '2 bytes', sub: 'retag vs plain copy: the FourCC\nplain copy vs encode: 0 bytes', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 100}}
      right={{label: 'ffmpeg 8.1.2', value: '5 bytes', sub: 'retag vs plain copy: FourCC + 3 flags\nplain copy vs encode: 3 bytes', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 100}}
      mid="vs" midO={ep(t, 2.0, 2.6)} />
    <Mid y={670} size={30} color={C.dim} o={ep(t, 4.4, 5.0)}>Both builds: packets, samples and frames hash the same.</Mid>
    <Verdict y={760} text="The picture never changes. The label size does." color={C.red} o={ep(t, 5.6, 6.4)} size={34} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="A label, not a check." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Parameter sets in the samples', value: '1 sample', sub: 'still holds VPS, SPS, PPS after the retag', color: C.amber, o: ep(t, 1.4, 2.1), valueSize: 80}}
      right={{label: 'mkv', value: 'no FourCC', sub: 'CodecID V_MPEGH/ISO/HEVC', color: C.green, o: ep(t, 2.0, 2.7), valueSize: 64}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: any Apple player, other builds, other encoders, hardware encoders, real footage.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 31 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, writes: Default, retag: Retag, size: Size, close: Close};
