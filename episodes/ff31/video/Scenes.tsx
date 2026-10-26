import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff31/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1, libx265, 50 synthetic frames. */

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
    <Head over="Stream copy, new tag" title="Two bytes change." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Figure y={290} value="2 of 29532" caption="bytes differ: hev1 becomes hvc1" color={C.green} size={170} o={ep(t, 0.9, 1.7)} />
    <Row y={600} h={190} cw={420} gap={28} valueSize={48} items={[
      {label: 'Packets · 50', value: 'same md5', sub: 'before and after', color: C.green, o: ep(t, 3.0, 3.6)},
      {label: 'Raw samples', value: 'same hash', sub: 'read from mdat', color: C.green, o: ep(t, 3.8, 4.4)},
      {label: 'Decoded frames', value: 'same hash', sub: '50 of 50', color: C.green, o: ep(t, 4.6, 5.2)},
    ]} />
    <Mid y={830} size={28} color={C.mute} o={ep(t, 5.8, 6.4)}>Both readers say hvc1. Retag back to hev1: 2 bytes again.</Mid>
  </>
);

/* 5. Two details */
const Extra: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Two details" title="More than a name." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Retag by copy', value: '2 bytes', sub: 'parameter set arrays: flags 0 0 0', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 100}}
      right={{label: 'Encoded with the tag', value: '5 bytes', sub: 'VPS, SPS, PPS arrays: flags 1 1 1', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 100}}
      mid="vs" midO={ep(t, 2.0, 2.6)} />
    <Mid y={650} size={30} color={C.dim} o={ep(t, 4.2, 4.8)}>Stream with parameter sets inside its first sample, then retagged to hvc1: they are still there.</Mid>
    <Verdict y={750} text="The retag renames. It checks nothing." color={C.red} o={ep(t, 5.6, 6.4)} size={34} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Read the sample entry." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'mp4 and mov', value: 'stsd FourCC', sub: 'hev1 or hvc1', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'mkv', value: 'no FourCC', sub: 'CodecID V_MPEGH/ISO/HEVC', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 64}}
      mid="or" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: any Apple player, other ffmpeg builds, other encoders, hardware encoders, real footage.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 31 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, writes: Default, retag: Retag, extra: Extra, close: Close};
