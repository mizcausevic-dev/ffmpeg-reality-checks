import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff10/fixture/experiment.mjs (see evidence.json from fixture/run.mjs).
   Pitches are measured by counting zero crossings in the decoded audio, within about 3 Hz of the tone that was generated. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="A plain convert" title="One track went missing." o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mp4 -c:v libx264 -c:a aac out.mp4" hi="-i in.mp4" size={32} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'In', value: '2', sub: 'audio tracks', color: C.cyan, o: ep(t, 2.2, 2.9), valueSize: 110}}
      right={{label: 'Out', value: '1', sub: 'audio track', color: C.red, o: ep(t, 2.9, 3.6), valueSize: 110}}
      mid="?" midO={ep(t, 3.4, 4.0)} />
    <Mid y={830} size={30} o={ep(t, 4.8, 5.4)}>No error. No warning.</Mid>
  </>
);

/* 2. The source */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic source · 1 video, 2 audio" title="Two tones, two tracks." o={ep(t, 0.2, 0.8)} />
    <Duel y={280} h={300}
      left={{label: 'Audio track 1 · default', value: '440 Hz', sub: 'main', color: C.cyan, o: ep(t, 0.9, 1.6)}}
      right={{label: 'Audio track 2', value: '880 Hz', sub: 'commentary', color: C.amber, o: ep(t, 1.6, 2.3)}}
      mid="2" midSub="tracks" midColor={C.text} midO={ep(t, 2.0, 2.6)} />
    <Row y={650} h={170} cw={600} gap={60} valueSize={34} items={[
      {label: 'Reader 1', value: 'ffprobe', sub: 'lists the streams', color: C.dim, o: ep(t, 4.4, 5.0)},
      {label: 'Reader 2', value: 'pitch', sub: 'zero crossings in decoded audio', color: C.dim, o: ep(t, 5.0, 5.6)},
    ]} />
  </>
);

/* 3. No map */
const NoMap: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="No -map option" title="Track 2 is gone." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={310}
      left={{label: 'Kept', value: '440 Hz', sub: 'track 1', color: C.cyan, o: ep(t, 0.9, 1.6)}}
      right={{label: 'Dropped', value: '880 Hz', sub: 'track 2, the commentary', color: C.red, o: ep(t, 2.4, 3.1)}}
      mid="1 of 2" midColor={C.red} midO={ep(t, 2.0, 2.6)} />
    <Verdict y={680} text="No error. -c copy gives the same." color={C.amber} o={ep(t, 4.6, 5.4)} size={34} />
  </>
);

/* 4. Say what you want */
const MapScene: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Say what you want" title="Name the streams." o={ep(t, 0.2, 0.8)} />
    <Duel y={280} h={320}
      left={{label: '-map 0', value: '2 audio', sub: '440 Hz and 880 Hz both present', color: C.green, o: ep(t, 0.9, 1.6), valueSize: 84}}
      right={{label: '-map 0:v -map 0:a:1', value: '880 Hz', sub: 'only the second track', color: C.amber, o: ep(t, 2.8, 3.5), valueSize: 84}}
      mid="or" midO={ep(t, 2.4, 3.0)} />
    <Mid y={660} size={30} o={ep(t, 5.0, 5.6)}>Everything, or exactly what you named.</Mid>
  </>
);

/* 5. The documented rule */
const Rule: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Track 1 mono · track 2 stereo" title="The docs rule did not decide it." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'Docs say, for audio', value: 'most channels', sub: 'would pick track 2, stereo', color: C.dim, o: ep(t, 0.9, 1.6), valueSize: 64}}
      right={{label: 'Output kept', value: 'track 1', sub: 'mono · 440 Hz', color: C.amber, o: ep(t, 2.6, 3.3), valueSize: 84}}
      mid="vs" midO={ep(t, 2.2, 2.8)} />
    <Mid y={680} size={30} o={ep(t, 4.8, 5.4)}>Track 1 carried the default flag.</Mid>
  </>
);

/* 6. The default flag */
const Flag: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.amber} o={ep(t, 0.2, 1.4)} />
    <Head over="Move the default flag" title="The flag decides." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={320}
      left={{label: 'Flag on track 1 (mono)', value: '440 Hz', sub: 'kept', color: C.cyan, o: ep(t, 0.9, 1.6)}}
      right={{label: 'Flag on track 2 (stereo)', value: '880 Hz', sub: 'kept · 2 channels', color: C.green, o: ep(t, 2.6, 3.3)}}
      mid="flag" midColor={C.amber} midO={ep(t, 2.2, 2.8)} />
    <Mid y={680} size={30} o={ep(t, 4.8, 5.4)}>Default flag over channel count. Same on ffmpeg 6.1.1 and 8.1.2.</Mid>
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Name the track" title="Do not rely on the default." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Every track', value: '-map 0', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 84}}
      right={{label: 'One track', value: 'name it', color: C.cyan, o: ep(t, 2.0, 2.7), valueSize: 84}}
      mid="or" midO={ep(t, 2.4, 3.0)} />
    <Mid y={620} size={28} color={C.mute} o={ep(t, 3.6, 4.2)}>Not tested: subtitles, other containers, builds in between.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.2, 4.8)}>FFmpeg Reality Checks · episode 10 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, nomap: NoMap, map: MapScene, rule: Rule, flag: Flag, close: Close};
