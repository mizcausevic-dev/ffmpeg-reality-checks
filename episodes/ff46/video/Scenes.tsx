import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, FrameStrip, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff46/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Shift the audio, copy the streams" title="Does the audio move?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i v.mkv -itsoffset 1 -i a.m4a -map 0:v -map 1:a -c copy out.mp4" hi="-itsoffset 1" size={30} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'In the mp4', value: 'moves?', sub: 'or nothing happens', color: C.amber, o: ep(t, 2.2, 2.9), valueSize: 80}}
      right={{label: 'In the mkv', value: 'moves?', sub: 'or nothing happens', color: C.amber, o: ep(t, 3.2, 3.9), valueSize: 80}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>A 4 s synthetic clip, five cases, two containers, three readers.</Mid>
  </>
);

/* 2. A tone that marks the time */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic · 4 s · 25 fps · 48000 Hz" title="A tone marks the time." o={ep(t, 0.2, 0.8)} />
    <FrameStrip y={262} n={8} cur={-1} kept={() => true} label={(i) => String(i * 14)} fw={190} fh={86} gap={12} o={ep(t, 0.9, 1.5)} />
    <Mid y={405} size={28} color={C.dim} o={ep(t, 1.6, 2.1)}>100 different frames · 192000 samples · silence, then a 1000 Hz tone at 1.500 s</Mid>
    <Row y={480} h={170} cw={520} gap={40} valueSize={46} items={[
      {label: 'Reader 1', value: 'ffprobe', sub: 'start times and decoded tone', color: C.cyan, o: ep(t, 2.4, 3.0)},
      {label: 'Reader 2', value: 'Node bytes', sub: 'mp4 edit lists, mkv blocks', color: C.amber, o: ep(t, 3.2, 3.8)},
      {label: 'Reader 3', value: 'no edit lists', sub: 'ffmpeg ignoring them, mp4', color: C.green, o: ep(t, 4.0, 4.6)},
    ]} />
    <Duel y={700} h={230}
      left={{label: 'Control, no offset', value: '1.500 s', sub: 'tone · both starts 0.000 s', color: C.green, o: ep(t, 5.2, 5.8), valueSize: 64}}
      right={{label: 'Control, real delay', value: '2.500 s', sub: 'tone moved · stamps stay 0.000 s', color: C.green, o: ep(t, 6.2, 6.8), valueSize: 64}}
      mid="" midO={0} />
  </>
);

/* 3. Audio plus one second */
const Plus: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Audio input · offset 1 · stream copy" title="It moves. Both files." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Cmd y={262} text="ffmpeg -i v.mkv -itsoffset 1 -i a.m4a -map 0:v -map 1:a -c copy out" hi="-itsoffset 1" size={30} o={ep(t, 0.9, 1.5)} />
    <Figure y={350} value="1.000 s" caption="audio start in the mp4 and in the mkv" size={170} color={C.green} o={ep(t, 1.8, 2.5)} />
    <Row y={670} h={170} cw={520} gap={40} valueSize={50} items={[
      {label: 'Tone now at', value: '2.500 s', sub: 'was 1.500 s · decoded', color: C.green, o: ep(t, 3.4, 4.0)},
      {label: 'Picture start', value: '0.000 s', sub: 'did not move', color: C.cyan, o: ep(t, 4.2, 4.8)},
      {label: 'Samples', value: '192000', sub: 'equal to the source', color: C.green, o: ep(t, 5.0, 5.6)},
    ]} />
    <Mid y={880} size={26} color={C.dim} o={ep(t, 6.0, 6.6)}>Three readers agree within 1.5 ms.</Mid>
  </>
);

/* 4. Where the second lives */
const Ignore: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.amber} o={ep(t, 0.2, 1.4)} />
    <Head over="Where the second is stored" title="mp4: in an edit list." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={262} h={250}
      left={{label: 'mp4, audio track', value: '1000 ms', sub: 'empty edit, then the audio', color: C.amber, o: ep(t, 1.2, 1.8), valueSize: 70}}
      right={{label: 'mkv, first blocks', value: '1.000 s', sub: 'audio block · picture block 0.000 s', color: C.cyan, o: ep(t, 2.2, 2.8), valueSize: 70}}
      mid="" midO={0} />
    <Cmd y={560} text="ffmpeg -ignore_editlist 1 -i out.mp4 ..." hi="-ignore_editlist 1" size={30} o={ep(t, 3.4, 4.0)} />
    <Figure y={660} value="0.000 s" caption="mp4 audio start when edit lists are ignored" size={130} color={C.red} o={ep(t, 4.4, 5.0)} />
    <Mid y={905} size={26} color={C.dim} o={ep(t, 5.8, 6.4)}>Tone back at 1.500 s, all 192000 samples, same hash as the file with no offset.</Mid>
  </>
);

/* 5. Audio minus one second */
const Minus: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.amber} o={ep(t, 0.2, 1.4)} />
    <Head over="Audio input · offset -1 · stream copy" title="Same shift, built differently." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Cmd y={262} text="ffmpeg -i v.mkv -itsoffset -1 -i a.m4a -map 0:v -map 1:a -c copy out" hi="-itsoffset -1" size={30} o={ep(t, 0.9, 1.5)} />
    <Duel y={360} h={330}
      left={{label: 'mp4', value: '144000', sub: 'samples · first 48000 skipped · picture 0.000 s · tone 0.500 s', color: C.amber, o: ep(t, 1.8, 2.5), valueSize: 80}}
      right={{label: 'mkv', value: '192000', sub: 'samples · all kept · picture starts 1.000 s · tone 1.500 s', color: C.cyan, o: ep(t, 2.9, 3.6), valueSize: 80}}
      mid="" midO={0} />
    <Row y={740} h={170} cw={520} gap={40} valueSize={50} items={[
      {label: 'Audio against picture', value: '-1.000 s', sub: 'in both files', color: C.green, o: ep(t, 4.4, 5.0)},
      {label: 'mp4 decoded audio', value: 'source tail', sub: 'the last 144000, same hash', color: C.amber, o: ep(t, 5.2, 5.8)},
    ]} />
  </>
);

/* 6. Offset on the picture */
const Same: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.cyan} o={ep(t, 0.2, 1.4)} />
    <Head over="Offset on the video input" title="The picture moves instead." o={ep(t, 0.2, 0.8)} />
    <Cmd y={262} text="ffmpeg -itsoffset 1 -i v.mkv -i a.m4a -map 0:v -map 1:a -c copy out" hi="-itsoffset 1" size={30} o={ep(t, 0.9, 1.5)} />
    <Row y={370} h={190} cw={520} gap={40} valueSize={54} items={[
      {label: 'Picture start', value: '1.000 s', sub: 'mp4 and mkv', color: C.cyan, o: ep(t, 1.8, 2.4)},
      {label: 'Audio start', value: '0.000 s', sub: 'tone still at 1.500 s', color: C.cyan, o: ep(t, 2.6, 3.2)},
      {label: 'Audio against picture', value: '-1.000 s', sub: 'three readers', color: C.green, o: ep(t, 3.4, 4.0)},
    ]} />
    <Row y={620} h={190} cw={520} gap={40} valueSize={54} items={[
      {label: 'Files checked', value: '10', sub: '5 cases, mp4 and mkv', color: C.cyan, o: ep(t, 4.6, 5.2)},
      {label: 'Frames equal source', value: '100', sub: 'in every file', color: C.green, o: ep(t, 5.4, 6.0)},
      {label: 'Audio changed by copy', value: '0 samples', sub: 'all equal the source', color: C.green, o: ep(t, 6.2, 6.8)},
    ]} />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="It moves. Check the start times." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Row y={290} h={230} cw={520} gap={40} valueSize={60} items={[
      {label: 'mp4 and mkv', value: '1.000 s', sub: 'audio moved, no quality cost', color: C.green, o: ep(t, 1.4, 2.0)},
      {label: 'mp4 edit list', value: 'ignored', sub: 'by a reader: audio at 0.000 s', color: C.amber, o: ep(t, 2.2, 2.8)},
      {label: 'Negative offset', value: 'differs', sub: 'mp4 skips, mkv shifts picture', color: C.amber, o: ep(t, 3.0, 3.6)},
    ]} />
    <Mid y={580} size={28} color={C.mute} o={ep(t, 4.2, 4.8)}>Measured on ffmpeg 6.1.1 only. Not tested: other builds, players, uploads, AAC priming, other codecs, subtitles.</Mid>
    <Mid y={760} size={30} color={C.dim} o={ep(t, 5.0, 5.6)}>FFmpeg Reality Checks · episode 46 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, plus: Plus, ignore: Ignore, minus: Minus, same: Same, close: Close};
