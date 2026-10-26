import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Mid, Mirror, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff15/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Video + sound" title="The lengths do not match." o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i video.mp4 -i tone.m4a -c copy -shortest out.mp4" hi="-shortest" size={30} o={ep(t, 1.0, 1.6)} />
    <Mirror y={470} label="Length" max={8} half={420} p={ep(t, 2.0, 3.4)} o={ep(t, 1.9, 2.4)}
      left={{value: 5, text: 'video 5 s', color: C.cyan}} right={{value: 3, text: 'sound 3 s', color: C.amber}} />
    <Mirror y={570} label="Or" max={8} half={420} p={ep(t, 3.6, 5.0)} o={ep(t, 3.5, 4.0)}
      left={{value: 5, text: 'video 5 s', color: C.cyan}} right={{value: 8, text: 'sound 8 s', color: C.amber}} />
  </>
);

/* 2. Sources and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic sources" title="Two ways to read each file." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Reader 1 · ffprobe', value: 'declared', sub: 'the durations the file says', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 80}}
      right={{label: 'Reader 2 · full decode', value: 'really there', sub: 'frames and seconds of sound', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 64}}
      mid="2" midSub="readers" midColor={C.text} midO={ep(t, 2.4, 3.0)} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 4.8, 5.4)}>Video 5 s = 125 frames · tones 3 s and 8 s</Mid>
  </>
);

/* 3. Without -shortest */
const NoShort: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="No -shortest · sound 3 s" title="The file follows the video." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'File', value: '5 s', sub: 'video 5 s · 125 frames', color: C.cyan, o: ep(t, 0.9, 1.6), valueSize: 96}}
      right={{label: 'Sound', value: '3 s', sub: 'last 2 seconds silent', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 96}}
      mid="vs" midO={ep(t, 2.0, 2.6)} />
    <Mid y={650} size={28} color={C.mute} o={ep(t, 4.4, 5.0)}>Both readers agree.</Mid>
  </>
);

/* 4. -shortest with copy */
const ShortCopy: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="-shortest · -c copy" title="The picture stops early." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Video', value: '73 / 125', sub: 'frames · 2.92 s', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 84}}
      right={{label: 'Sound', value: '3.00 s', sub: 'file ends at 3 s', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 84}}
      mid="!" midColor={C.red} midO={ep(t, 2.0, 2.6)} />
    <Verdict y={660} text="The picture ends 80 ms before the sound" color={C.red} o={ep(t, 4.8, 5.6)} size={34} />
  </>
);

/* 5. -shortest with re-encode */
const ShortEnc: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="-shortest · re-encode" title="Both end together." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={300}
      left={{label: 'Video', value: '75 frames', sub: '3.00 s', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 84}}
      right={{label: 'Sound', value: '3.0 s', sub: 'file 3.0 s', color: C.green, o: ep(t, 2.2, 2.9), valueSize: 84}}
      mid="=" midColor={C.green} midO={ep(t, 1.9, 2.5)} />
    <Cmd y={660} text="-c:v libx264 -c:a aac -shortest" hi="-shortest" color={C.green} size={28} o={ep(t, 3.6, 4.2)} />
  </>
);

/* 6. Longer sound */
const LongAudio: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Sound 8 s · video 5 s" title="Sound over no picture." o={ep(t, 0.2, 0.8)} />
    <Mirror y={290} label="Off" max={8} half={420} p={ep(t, 0.8, 2.2)} o={ep(t, 0.7, 1.2)}
      left={{value: 5, text: 'picture 5 s', color: C.cyan}} right={{value: 8, text: 'file 8 s', color: C.red}} />
    <Mirror y={410} label="On" max={8} half={420} p={ep(t, 2.6, 4.0)} o={ep(t, 2.5, 3.0)}
      left={{value: 5, text: 'picture 5 s', color: C.cyan}} right={{value: 5, text: 'file 5 s', color: C.green}} />
    <Mid y={600} size={28} color={C.mute} o={ep(t, 5.0, 5.6)}>With -shortest: all 125 frames kept, sound trimmed to 5 s.</Mid>
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to remember" title="It follows the shortest stream." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Re-encode', value: 'in step', sub: 'picture and sound end together', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 76}}
      right={{label: '-c copy', value: '80 ms early', sub: 'the picture ends first', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 64}}
      mid="vs" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.dim} o={ep(t, 3.4, 4.0)}>Same on ffmpeg 6.1.1 and 8.1.2.</Mid>
    <Mid y={680} size={28} color={C.mute} o={ep(t, 4.0, 4.6)}>Not tested: other containers, other codecs, three or more streams.</Mid>
    <Mid y={770} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 15 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, noshort: NoShort, shortcopy: ShortCopy, shortenc: ShortEnc, longaudio: LongAudio, close: Close};
