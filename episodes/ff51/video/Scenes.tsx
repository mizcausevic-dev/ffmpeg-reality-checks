import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff51/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Copy subtitles into mkv" title="Does it fail, or change?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mp4 -map 0 -c copy out.mkv" hi="-c copy" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'In the mp4', value: 'mov_text', sub: 'tx3g in the bytes · 3 cues', color: C.cyan, o: ep(t, 2.4, 3.1), valueSize: 80}}
      right={{label: 'In the mkv', value: '?', sub: 'stream list and cue text', color: C.amber, o: ep(t, 3.6, 4.3), valueSize: 80}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 5.2, 5.8)}>A five second synthetic clip, copied nine ways, read two ways.</Mid>
  </>
);

/* 2. A clip with three cues, the controls */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clip · 5 s · 3 cues" title="Controls first." o={ep(t, 0.2, 0.8)} />
    <Row y={270} h={200} cw={520} gap={40} valueSize={52} items={[
      {label: 'Source mp4', value: 'mov_text', sub: 'video, tone, 3 cues, one italic', color: C.cyan, o: ep(t, 1.0, 1.6)},
      {label: 'Control: copy to mov', value: 'mov_text', sub: '3 streams, 3 cues, same times', color: C.green, o: ep(t, 2.4, 3.0)},
      {label: 'Control: mkv remux', value: 'subrip', sub: '3 streams, 3 cues, same times', color: C.green, o: ep(t, 3.8, 4.4)},
    ]} />
    <Row y={560} h={200} cw={520} gap={40} valueSize={46} items={[
      {label: 'Reader 1', value: 'ffprobe', sub: 'stream list, packet times', color: C.cyan, o: ep(t, 5.6, 6.2)},
      {label: 'Reader 2', value: 'raw bytes', sub: 'codec id and cue text, in Node', color: C.amber, o: ep(t, 6.4, 7.0)},
      {label: 'Reader 3', value: 'srt export', sub: 'ffmpeg decodes the cues back', color: C.green, o: ep(t, 7.2, 7.8)},
    ]} />
    <Mid y={820} size={28} color={C.mute} o={ep(t, 8.6, 9.2)}>Cue text is written by Node as an srt file: alpha, bravo in italics, charlie.</Mid>
  </>
);

/* 3. -c copy into mkv */
const Copy: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Plain copy into mkv" title="Zero of three streams." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i in.mp4 -map 0 -c copy out.mkv" hi="-c copy" size={30} o={ep(t, 0.9, 1.5)} />
    <Figure y={385} value="0 of 3" caption="streams in the output · video and audio lost with the subtitle" color={C.red} size={190} o={ep(t, 2.0, 2.8)} />
    <Row y={690} h={190} cw={520} gap={40} valueSize={50} items={[
      {label: 'ffmpeg', value: 'stops', sub: 'subtitle codec not supported', color: C.red, o: ep(t, 4.4, 5.0)},
      {label: 'Output file', value: '293 bytes', sub: 'ffprobe finds no streams', color: C.red, o: ep(t, 5.2, 5.8)},
      {label: 'Cue text in the bytes', value: 'none', sub: 'the source file is 448760 bytes', color: C.red, o: ep(t, 6.0, 6.6)},
    ]} />
  </>
);

/* 4. Name the codec */
const Fix: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Name the codec" title="Three streams, three cues." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i in.mp4 -map 0 -c copy -c:s srt out.mkv" hi="-c:s srt" size={30} o={ep(t, 0.9, 1.5)} />
    <Row y={400} h={230} cw={520} gap={40} valueSize={56} items={[
      {label: 'Subtitle as srt', value: 'subrip', sub: 'S_TEXT/UTF8 · 3 packets', color: C.green, o: ep(t, 2.0, 2.6)},
      {label: 'Subtitle as ass', value: 'ass', sub: 'S_TEXT/ASS · 3 packets', color: C.green, o: ep(t, 3.2, 3.8)},
      {label: 'Subtitle left out', value: '2 streams', sub: 'no cue text in the bytes', color: C.amber, o: ep(t, 4.6, 5.2)},
    ]} />
    <Mid y={680} size={28} color={C.dim} o={ep(t, 6.2, 6.8)}>Times match the source to the millisecond. Italics kept: {'<i>'} in srt, {'{\\i1}'} in ass. Video and audio copied.</Mid>
    <Mid y={800} size={28} color={C.mute} o={ep(t, 7.4, 8.0)}>-map 0:v -map 0:a -c copy leaves the subtitle out: 2 streams.</Mid>
  </>
);

/* 5. No codec options at all */
const Plain: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.amber} o={ep(t, 0.2, 1.4)} />
    <Head over="No codec options at all" title="It does not fail. It converts." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i in.mp4 -map 0 out.mkv" hi="-map 0" size={32} o={ep(t, 0.9, 1.5)} />
    <Row y={420} h={230} cw={520} gap={40} valueSize={60} items={[
      {label: 'Subtitle', value: 'ass', sub: 'was mov_text', color: C.amber, o: ep(t, 2.0, 2.6)},
      {label: 'Audio', value: 'vorbis', sub: 'was pcm_s16le', color: C.amber, o: ep(t, 3.2, 3.8)},
      {label: 'Cue times', value: '+3 ms', sub: '0.503 s, not 0.500 s', color: C.red, o: ep(t, 4.4, 5.0)},
    ]} />
    <Mid y={720} size={30} color={C.dim} o={ep(t, 6.0, 6.6)}>Text and italics survive. The exit status is 0, so only the stream list shows what changed.</Mid>
    <Verdict y={840} text="Read the stream list, not the exit status" color={C.amber} o={ep(t, 7.4, 8.0)} size={32} />
  </>
);

/* 6. The other direction */
const Back: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="The other direction" title="Subrip into mp4 has no home." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i in.mkv -map 0 -c copy out.mp4" hi="-c copy" size={30} o={ep(t, 0.9, 1.5)} />
    <Duel y={400} h={270}
      left={{label: 'Plain copy', value: '0 bytes', sub: 'ffmpeg stops, no file', color: C.red, o: ep(t, 2.0, 2.7), valueSize: 80}}
      right={{label: 'Convert the subtitle', value: 'works', sub: 'mov_text · 3 cues · same times · italics', color: C.green, o: ep(t, 3.8, 4.5), valueSize: 80}}
      mid="" midO={0} />
    <Mid y={720} size={28} color={C.dim} o={ep(t, 5.6, 6.2)}>-c copy -c:s mov_text makes the second one.</Mid>
    <Mid y={800} size={30} color={C.mute} o={ep(t, 6.8, 7.4)}>Packets for 3 cues: mov_text 6 (3 are empty gaps), subrip 3, ass 3.</Mid>
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Match the subtitle to the box." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'mkv accepted', value: 'srt, ass', sub: 'not mov_text', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 70}}
      right={{label: 'mp4 accepted', value: 'mov_text', sub: 'not subrip', color: C.green, o: ep(t, 2.4, 3.1), valueSize: 70}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.8, 4.4)}>Name it with -c:s, then read the stream list with ffprobe. Not tested: other subtitle formats, picture subtitles, players, builds other than 6.1.1.</Mid>
    <Mid y={760} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 51 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, copy: Copy, fix: Fix, plain: Plain, back: Back, close: Close};
