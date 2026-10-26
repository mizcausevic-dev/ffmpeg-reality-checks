import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, FrameStrip, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff54/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* luma of the first ten frames of the fade in (output frames 0 to 9) */
const RAMP = ['16', '23', '31', '38', '45', '53', '60', '68', '75', '82'];

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="A fade after a seek" title="Where does the fade land?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -ss 2 -i in.mkv -vf fade=t=in:st=0:d=1 out.mkv" hi="-ss 2" size={32} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'Seek before the input', value: 'fades?', sub: '-ss 2 -i in.mkv', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 80}}
      right={{label: 'Seek after the input', value: 'fades?', sub: '-i in.mkv -ss 2', color: C.amber, o: ep(t, 3.6, 4.3), valueSize: 80}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 5.2, 5.8)}>We measure the brightness of every frame, on ffmpeg 6.1.1.</Mid>
  </>
);

/* 2. A clip of flat cards, the control */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clip · 6 s · 150 frames" title="Every frame is a flat card." o={ep(t, 0.2, 0.8)} />
    <FrameStrip y={265} n={10} kept={() => true} label={() => '200'} fw={150} fh={86} gap={14} o={ep(t, 1.0, 1.7)} />
    <Row y={450} h={190} cw={520} gap={40} valueSize={52} items={[
      {label: 'Every frame', value: 'luma 200', sub: 'black is luma 16', color: C.cyan, o: ep(t, 2.0, 2.6)},
      {label: 'Cut from second 2', value: '75 frames', sub: 'the fade is 25 frames', color: C.cyan, o: ep(t, 3.0, 3.6)},
      {label: 'Control, no fade', value: 'all 200', sub: 'one hash · first frame at 0.00 s', color: C.green, o: ep(t, 4.6, 5.2)},
    ]} />
    <Row y={680} h={160} cw={520} gap={40} valueSize={44} items={[
      {label: 'Reader 1', value: 'framemd5', sub: 'hash per frame · signalstats', color: C.cyan, o: ep(t, 6.2, 6.8)},
      {label: 'Reader 2', value: 'raw luma', sub: 'decoded frames in Node', color: C.amber, o: ep(t, 7.0, 7.6)},
      {label: 'Reader 2', value: 'ffprobe', sub: 'packet timestamps', color: C.green, o: ep(t, 7.8, 8.4)},
    ]} />
  </>
);

/* 3. Seek before the input */
const Before: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Seek before the input" title="Twenty five frames fade in." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -ss 2 -i src.mkv -t 3 -vf fade=t=in:st=0:d=1 out.mkv" hi="st=0" size={28} o={ep(t, 0.9, 1.5)} />
    <FrameStrip y={370} n={10} cur={0} kept={(i) => i > 0} label={(i) => RAMP[i]} fw={150} fh={86} gap={14} color={C.green} o={ep(t, 2.0, 2.7)} />
    <Row y={560} h={200} cw={520} gap={40} valueSize={52} items={[
      {label: 'Frames faded', value: '25', sub: 'output frames 0 to 24', color: C.green, o: ep(t, 3.6, 4.2)},
      {label: 'First frame', value: 'luma 16', sub: 'black, then it climbs', color: C.cyan, o: ep(t, 4.6, 5.2)},
      {label: 'Back at 200', value: '1.00 s', sub: 'frame 25 and every later frame', color: C.green, o: ep(t, 5.6, 6.2)},
    ]} />
    <Mid y={810} size={28} color={C.mute} o={ep(t, 7.0, 7.6)}>Luma of the first 10 of 75 frames shown. Raw luma and signalstats agree on all 75.</Mid>
  </>
);

/* 4. Seek after the input */
const After: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Seek after the input" title="The same fade does nothing." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i src.mkv -ss 2 -t 3 -vf fade=t=in:st=0:d=1 out.mkv" hi="st=0" size={28} o={ep(t, 0.9, 1.5)} />
    <Figure y={372} value="0 faded" caption="all 75 frames at luma 200 · the control's hash" size={140} color={C.red} o={ep(t, 2.0, 2.8)} />
    <Duel y={650} h={180}
      left={{label: 'Seek before, start 0', value: '25 frames', sub: 'faded', color: C.green, o: ep(t, 4.2, 4.9), valueSize: 56}}
      right={{label: 'Seek after, start 0', value: '0 frames', sub: 'faded', color: C.red, o: ep(t, 5.0, 5.7), valueSize: 56}}
      mid="vs" midO={ep(t, 4.8, 5.4)} />
    <Mid y={850} size={26} color={C.dim} o={ep(t, 6.6, 7.2)}>The fade ran over source seconds 0 to 1, which were thrown away.</Mid>
  </>
);

/* 5. The same number, another time */
const Rule: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Start two, both orders" title="After: lands on time. Before: late." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={260} h={310}
      left={{label: 'Seek after, start 2', value: '25 faded', sub: 'frame for frame the same as\nseek before, start 0', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 80}}
      right={{label: 'Seek before, start 2', value: '51 black', sub: 'then 24 frames of ramp\nends at luma 193, never 200', color: C.red, o: ep(t, 3.4, 4.1), valueSize: 80}}
      mid="vs" midO={ep(t, 3.0, 3.6)} />
    <Cmd y={640} text="ffmpeg -i src.mkv -ss 2 -t 3 -vf fade=t=in:st=2:d=1 out.mkv" hi="st=2" size={28} o={ep(t, 5.0, 5.6)} />
    <Mid y={760} size={28} color={C.dim} o={ep(t, 6.2, 6.8)}>After -i the filter sees source time. Before -i it sees the cut, which starts at 0.</Mid>
    <Verdict y={860} text="After the input, start = source time" color={C.green} o={ep(t, 7.6, 8.2)} size={32} />
  </>
);

/* 6. Fade out */
const Out: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Fade out, same rule" title="Black for two seconds." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={260} h={290}
      left={{label: 'Seek after, start 4', value: '1 s ramp', sub: 'full for 51 frames, then down\nto luma 23 at the end', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 76}}
      right={{label: 'Seek after, start 2', value: '50 black', sub: 'ramp in the first second\nthen black for 2 s', color: C.red, o: ep(t, 3.4, 4.1), valueSize: 76}}
      mid="vs" midO={ep(t, 3.0, 3.6)} />
    <Cmd y={620} text="ffmpeg -i src.mkv -ss 2 -t 3 -vf fade=t=out:st=4:d=1 out.mkv" hi="st=4" size={28} o={ep(t, 5.0, 5.6)} />
    <Mid y={750} size={28} color={C.dim} o={ep(t, 6.2, 6.8)}>Start 4 after -i gives the same 75 frame hashes as start 2 before -i.</Mid>
    <Verdict y={850} text="Black for 50 of 75 frames" color={C.red} o={ep(t, 7.4, 8.0)} size={34} />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Count the faded frames." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Seek before the input', value: 'start 0', sub: 'the fade starts at the cut', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 70}}
      right={{label: 'Seek after the input', value: 'start + seek', sub: 'source time: add the 2 s seek', color: C.green, o: ep(t, 2.4, 3.1), valueSize: 70}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.8, 4.4)}>Not tested: audio fades (afade), stream copy, real footage, other containers, builds other than ffmpeg 6.1.1.</Mid>
    <Mid y={760} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 54 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, before: Before, after: After, rule: Rule, out: Out, close: Close};
