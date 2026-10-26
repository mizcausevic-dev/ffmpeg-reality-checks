import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cells, Cmd, Duel, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff44/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="HDR to SDR" title="Why grey and washed out?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i hdr.mkv -pix_fmt yuv420p out.mp4" hi="-pix_fmt" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'The clip says', value: 'HDR', sub: 'PQ, bt2020, 10 bit', color: C.cyan, o: ep(t, 2.4, 3.1), valueSize: 90}}
      right={{label: 'The result looks', value: 'grey', sub: 'washed out', color: C.amber, o: ep(t, 3.6, 4.3), valueSize: 90}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 5.2, 5.8)}>We measure ten grey patches of known brightness.</Mid>
  </>
);

/* 2. Clip and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clip · 320x240 · 10 frames" title="Ten grey patches." o={ep(t, 0.2, 0.8)} />
    <Row y={270} h={190} cw={520} gap={40} valueSize={48} items={[
      {label: 'Transfer', value: 'smpte2084', sub: 'PQ, 10 bit', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Primaries', value: 'bt2020', sub: 'matrix bt2020nc, tv range', color: C.cyan, o: ep(t, 1.6, 2.2)},
      {label: 'Control', value: 'SDR clip', sub: 'bt709 tags, correct values', color: C.green, o: ep(t, 2.4, 3.0)},
    ]} />
    <Cells y={520} n={10} lit={(i) => i >= 5} color={C.amber} dim={C.cyan} size={64} gap={14} o={ep(t, 3.6, 4.2)} />
    <Mid y={620} size={28} color={C.mute} o={ep(t, 4.4, 5.0)}>0 · 1 · 10 · 50 · 100 · 203 · 600 · 1000 · 4000 · 10000 nits (filled: above SDR white)</Mid>
    <Row y={690} h={150} cw={520} gap={40} valueSize={40} items={[
      {label: 'Reader 1', value: 'raw luma', sub: 'Y, Cb, Cr means in Node', color: C.cyan, o: ep(t, 5.4, 6.0)},
      {label: 'Reader 2', value: 'signalstats', sub: 'YAVG on a crop', color: C.amber, o: ep(t, 6.2, 6.8)},
      {label: 'Reader 3', value: 'ffprobe', sub: 'pix_fmt and color tags', color: C.green, o: ep(t, 7.0, 7.6)},
    ]} />
  </>
);

/* 3. What the plain conversion does */
const Grey: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Plain pixel format, 100 nit white" title="Rescaled, not converted." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cmd y={265} text="ffmpeg -i hdr.mkv -pix_fmt yuv420p out.mp4" hi="-pix_fmt" size={28} o={ep(t, 0.9, 1.5)} />
    <Figure y={355} value="127" caption="Y of the 100 nit patch · an SDR white is 235" color={C.red} size={170} o={ep(t, 2.0, 2.8)} />
    <Row y={640} h={170} cw={520} gap={40} valueSize={52} items={[
      {label: '10 nit patch', value: '81.8', sub: 'expected 100', color: C.red, o: ep(t, 3.8, 4.4)},
      {label: '50 nit patch', value: '112.5', sub: 'expected 180', color: C.red, o: ep(t, 4.6, 5.2)},
      {label: '10000 nit patch', value: '235', sub: 'not clipped', color: C.green, o: ep(t, 5.4, 6.0)},
    ]} />
    <Mid y={830} size={26} color={C.mute} o={ep(t, 6.8, 7.4)}>Mean mid-tone error 64.5 codes. About 20 nits on a 100 nit gamma 2.4 screen.</Mid>
  </>
);

/* 4. The tags */
const Tags: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Do the tags survive?" title="They do, until they lie." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={260} h={340}
      left={{label: 'Plain pixel format', value: 'PQ kept', sub: 'bt2020 · smpte2084 · bt2020nc\nzscale recovers: within 0.5 code', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 90}}
      right={{label: 'Colorspace forced', value: 'bt709', sub: 'iall=bt2020 · same pixels, white 127\ntags now lie, nothing to recover', color: C.red, o: ep(t, 3.4, 4.1), valueSize: 90}}
      mid="vs" midO={ep(t, 3.0, 3.6)} />
    <Row y={650} h={150} cw={520} gap={40} valueSize={44} items={[
      {label: 'Scale, output matrix', value: '126', sub: 'white · tags unchanged', color: C.amber, o: ep(t, 5.2, 5.8)},
      {label: 'colorspace alone', value: 'refused', sub: 'unsupported transfer 16', color: C.amber, o: ep(t, 6.0, 6.6)},
    ]} />
    <Mid y={830} size={26} color={C.mute} o={ep(t, 7.4, 8.0)}>Measured on ffmpeg 6.1.1. Raw luma and signalstats agree on every patch.</Mid>
  </>
);

/* 5. zscale and tonemap */
const Fix: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="A real conversion" title="zscale, then tonemap." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Duel y={260} h={340}
      left={{label: 'zscale alone', value: '5 become 1', sub: '0 to 100 nits exact\n203 to 10000 nits all at 255', color: C.amber, o: ep(t, 0.9, 1.6), valueSize: 90}}
      right={{label: 'zscale and tonemap', value: '5 stay 5', sub: '203 nits at 182, 1000 at 235\n4000 at 254, 10000 at 255', color: C.green, o: ep(t, 3.4, 4.1), valueSize: 90}}
      mid="vs" midO={ep(t, 3.0, 3.6)} />
    <Mid y={650} size={28} color={C.dim} o={ep(t, 5.4, 6.0)}>Tone mapping trades mid-tones for highlights: 100 nits lands at 151.</Mid>
    <Verdict y={760} text="Control: the SDR clip stays exact, 10 of 10 patches" color={C.green} o={ep(t, 6.6, 7.2)} size={32} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Read the transfer first." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Always', value: 'ffprobe', sub: 'read color_transfer first', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'Avoid', value: 'pixel format only', sub: 'for smpte2084 input', color: C.red, o: ep(t, 2.4, 3.1), valueSize: 64}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.8, 4.4)}>Not tested: real footage, HLG, Dolby Vision, saturated colors, players, other builds.</Mid>
    <Mid y={720} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 44 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, grey: Grey, tags: Tags, fix: Fix, close: Close};
