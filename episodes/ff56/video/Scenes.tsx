import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff56/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Copy everything into MP4" title="Which stream breaks it?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mkv -map 0 -c copy out.mp4" hi="-map 0" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'Video and audio', value: 'copies?', sub: 'the usual streams', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 80}}
      right={{label: 'Subtitles and fonts', value: 'copies?', sub: 'the extra streams', color: C.amber, o: ep(t, 3.6, 4.3), valueSize: 80}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 5.2, 5.8)}>We copy ten stream types, one at a time, on ffmpeg 6.1.1.</Mid>
  </>
);

/* 2. The ten sources and the readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic video · 50 frames" title="One extra stream each." o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={200} cw={520} gap={40} valueSize={52} items={[
      {label: 'Audio', value: '5 codecs', sub: 'aac · opus · flac · pcm · vorbis', color: C.cyan, o: ep(t, 1.0, 1.6)},
      {label: 'Cover art', value: '1 image', sub: 'mjpeg, a second video stream', color: C.cyan, o: ep(t, 1.8, 2.4)},
      {label: 'Subtitles and font', value: '4 more', sub: 'subrip · ass · webvtt · ttf', color: C.cyan, o: ep(t, 2.6, 3.2)},
    ]} />
    <Row y={540} h={190} cw={520} gap={40} valueSize={48} items={[
      {label: 'Control, all together', value: '7 in, 7 out', sub: 'video, 5 audio, cover art', color: C.green, o: ep(t, 4.2, 4.8)},
      {label: 'Reader 1', value: 'ffprobe', sub: 'the stream list, before and after', color: C.cyan, o: ep(t, 5.8, 6.4)},
      {label: 'Reader 2', value: 'mp4 boxes', sub: 'tracks and bytes, parsed in Node', color: C.amber, o: ep(t, 6.6, 7.2)},
    ]} />
    <Mid y={800} size={28} color={C.mute} o={ep(t, 7.8, 8.4)}>Each run: copy with the stream copy flag, then read what came out.</Mid>
  </>
);

/* 3. Six of ten pass */
const Pass: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Copy into MP4" title="Six of ten copy." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Figure y={250} value="6 of 10" caption="aac · opus · flac · pcm · vorbis · cover art" size={150} color={C.green} o={ep(t, 1.2, 2.0)} />
    <Row y={620} h={190} cw={520} gap={40} valueSize={48} items={[
      {label: 'Stream list', value: 'same', sub: 'after equals before, all six', color: C.green, o: ep(t, 4.0, 4.6)},
      {label: 'Cover art', value: '2nd video', sub: 'a second video track in the file', color: C.cyan, o: ep(t, 5.0, 5.6)},
      {label: 'Video frames', value: '50 of 50', sub: 'the same hashes as the source', color: C.green, o: ep(t, 6.0, 6.6)},
    ]} />
    <Mid y={870} size={26} color={C.dim} o={ep(t, 7.2, 7.8)}>The stream copy flag is what lets these through unchanged.</Mid>
  </>
);

/* 4. Four of ten fail */
const Fail: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Copy into MP4" title="Four of ten fail." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Row y={285} h={170} cw={390} gap={30} valueSize={44} items={[
      {label: 'Subtitle', value: 'subrip', sub: 'no tag for the codec', color: C.red, o: ep(t, 1.4, 2.0)},
      {label: 'Subtitle', value: 'ass', sub: 'no tag for the codec', color: C.red, o: ep(t, 2.0, 2.6)},
      {label: 'Subtitle', value: 'webvtt', sub: 'no tag for the codec', color: C.red, o: ep(t, 2.6, 3.2)},
      {label: 'Attachment', value: 'ttf font', sub: 'no tag for the codec', color: C.red, o: ep(t, 3.2, 3.8)},
    ]} />
    <Figure y={520} value="0 bytes" caption="the output file · no moov box · ffprobe cannot open it" size={130} color={C.red} o={ep(t, 4.6, 5.4)} />
    <Mid y={800} size={28} color={C.dim} o={ep(t, 6.6, 7.2)}>The message names the codec and the stream number. The video was fine.</Mid>
  </>
);

/* 5. The half fixes */
const Trap: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="One file with both" title="Half a fix fails next." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Cmd y={285} text="ffmpeg -i mix.mkv -map 0 -c copy out.mp4" hi="-map 0" size={30} o={ep(t, 0.9, 1.5)} />
    <Mid y={375} size={26} color={C.red} o={ep(t, 1.6, 2.2)}>Fails at the subrip stream, stream 6. Zero bytes out.</Mid>
    <Row y={450} h={210} cw={520} gap={40} valueSize={48} items={[
      {label: 'Convert the subtitle', value: 'ttf fails', sub: '-c:s mov_text · stream 7', color: C.red, o: ep(t, 3.0, 3.6)},
      {label: 'Drop the subtitles', value: 'ttf fails', sub: '-sn · stream 6', color: C.red, o: ep(t, 4.4, 5.0)},
      {label: 'Drop the attachment', value: 'subrip fails', sub: '-map -0:t · stream 6', color: C.red, o: ep(t, 5.8, 6.4)},
    ]} />
    <Verdict y={770} text="Four tries, four zero byte files" color={C.red} o={ep(t, 7.0, 7.6)} size={34} />
  </>
);

/* 6. What works */
const Fix: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Both together" title="Two changes fix it." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Cmd y={285} text="ffmpeg -i mix.mkv -map 0 -map -0:t -c copy -c:s mov_text out.mp4" hi="-map -0:t" size={28} o={ep(t, 0.9, 1.5)} />
    <Row y={400} h={200} cw={520} gap={40} valueSize={52} items={[
      {label: 'Streams out', value: '7', sub: 'video · 5 audio · mov_text', color: C.green, o: ep(t, 2.4, 3.0)},
      {label: 'Cue text', value: 'found', sub: 'in the bytes and in a decode', color: C.green, o: ep(t, 3.8, 4.4)},
      {label: 'Video frames', value: '50 of 50', sub: 'the same hashes as the source', color: C.green, o: ep(t, 5.0, 5.6)},
    ]} />
    <Row y={670} h={190} cw={520} gap={40} valueSize={44} items={[
      {label: 'Each subtitle alone', value: 'convert', sub: 'subrip, ass, webvtt to mov_text', color: C.cyan, o: ep(t, 6.2, 6.8)},
      {label: 'Or no subtitle', value: '6 streams', sub: '-map 0:v -map 0:a', color: C.amber, o: ep(t, 7.0, 7.6)},
    ]} />
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Count streams, not errors." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Copies as it is', value: 'video, audio', sub: 'and cover art as a video track', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'Needs a change', value: 'text, fonts', sub: 'mov_text for subtitles, drop attachments', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 64}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.8, 4.4)}>Not tested: other containers, data streams, bitmap subtitles, real files, builds other than ffmpeg 6.1.1.</Mid>
    <Mid y={760} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 56 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, pass: Pass, fail: Fail, trap: Trap, fix: Fix, close: Close};
