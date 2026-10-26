import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, FrameStrip, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff35/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="HLS segment length" title="Why is none of them 3 s?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mp4 -c:v libx264 -f hls -hls_time 3 p.m3u8" hi="-hls_time 3" size={32} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={290}
      left={{label: 'You expect', value: '3 s each', sub: 'segments as long as the ask', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 80}}
      right={{label: 'Test', value: '20 s clip', sub: '500 frames, a keyframe every 2 s', color: C.cyan, o: ep(t, 3.4, 4.1), valueSize: 80}}
      mid="?" midO={ep(t, 3.0, 3.6)} />
  </>
);

/* 2. Clip and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clip · libx264" title="Known keyframes. Three readers." o={ep(t, 0.2, 0.8)} />
    <Row y={270} h={200} cw={520} gap={40} valueSize={52} items={[
      {label: 'Picture', value: '500 frames', sub: '25 fps, 20 s', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Keyframes', value: 'every 2 s', sub: 'at 0, 2, 4 ... 18 s', color: C.amber, o: ep(t, 1.6, 2.2)},
      {label: 'Control', value: '75 frame GOP', sub: 'equal to the 3 s ask', color: C.green, o: ep(t, 2.3, 2.9)},
    ]} />
    <Row y={540} h={230} cw={520} gap={40} valueSize={52} items={[
      {label: 'Reader 1 · playlist', value: 'EXTINF', sub: 'each segment, in the m3u8', color: C.cyan, o: ep(t, 4.4, 5.0)},
      {label: 'Reader 2 · packets', value: 'ffprobe', sub: 'timestamps in each .ts', color: C.cyan, o: ep(t, 5.4, 6.0)},
      {label: 'Reader 3 · decode', value: 'framemd5', sub: 'each .ts decoded alone', color: C.cyan, o: ep(t, 6.4, 7.0)},
    ]} />
  </>
);

/* 3. Asked 3, got 4 and 2 */
const Cut: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Asked 3 s · 2 s keyframes" title="Four, two, four, two." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={290} value="4 2 4 2 4 2 2" caption="seconds per segment · playlist and ffprobe agree" color={C.red} size={190} o={ep(t, 0.9, 1.7)} />
    <FrameStrip y={620} n={10} kept={(i) => [0, 2, 3, 5, 6, 8, 9].includes(i)} label={(i) => String(i * 2)} fw={150} fh={86} gap={14} o={ep(t, 3.0, 3.7)} />
    <Mid y={810} size={28} color={C.mute} o={ep(t, 4.6, 5.2)}>Source seconds 0 to 18. Cuts (lit) at 0, 4, 6, 10, 12, 16, 18: all keyframes.</Mid>
    <Mid y={860} size={28} color={C.red} o={ep(t, 6.0, 6.6)}>Segments that are 3 s: 0 of 7. Frames kept: 500 of 500.</Mid>
  </>
);

/* 4. The rule */
const Rule: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Next keyframe wins" title="Cut at or after n times the ask." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={250} cw={560} gap={40} valueSize={52} items={[
      {label: 'Asked 3 s', value: '4 2 4 2 4 2 2', sub: 'target duration 4', color: C.red, o: ep(t, 0.9, 1.5)},
      {label: 'Asked 5 s', value: '6 4 6 4', sub: 'target duration 6', color: C.red, o: ep(t, 1.8, 2.4)},
      {label: 'Asked 1 s', value: '2 x 10', sub: 'ten segments of 2 s', color: C.red, o: ep(t, 2.7, 3.3)},
    ]} />
    <Mid y={620} size={32} color={C.dim} o={ep(t, 4.2, 4.8)}>Each cut: the first keyframe after the last cut, at or after n times the ask. It predicted every cut.</Mid>
    <Verdict y={760} text="Nothing is lost: 500 of 500 frames, 20 s in all" color={C.green} o={ep(t, 6.0, 6.8)} size={34} />
  </>
);

/* 5. Force the keyframes */
const Fix: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Put keyframes at the ask" title="Exact, or the same again." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Cmd y={290} text={'-force_key_frames "expr:gte(t,n_forced*3)"'} hi="-force_key_frames" size={32} o={ep(t, 0.8, 1.4)} />
    <Row y={450} h={250} cw={560} gap={40} valueSize={52} items={[
      {label: 'Forced keyframes', value: '3 3 3 3 3 3 2', sub: 'every segment starts on one', color: C.green, o: ep(t, 2.2, 2.8)},
      {label: 'Control · 75 frame GOP', value: '3 3 3 3 3 3 2', sub: 'GOP equal to the ask', color: C.green, o: ep(t, 3.4, 4.0)},
      {label: 'Stream copy', value: '4 2 4 2 4 2 2', sub: '-c copy keeps the 2 s GOP', color: C.red, o: ep(t, 5.0, 5.6)},
    ]} />
    <Mid y={760} size={30} color={C.dim} o={ep(t, 6.4, 7.0)}>The playlist target duration drops from 4 to 3.</Mid>
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Cuts follow keyframes." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Match or force', value: 'GOP = ask', sub: 'or -force_key_frames at the ask', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 72}}
      right={{label: 'Cut by time anyway', value: '3 of 7', sub: 'start off a keyframe: -hls_flags split_by_time', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 72}}
      mid="or" midO={ep(t, 2.4, 3.0)} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.4, 4.0)}>Not tested: audio, other encoders, fragmented MP4, real footage, players.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.0, 4.6)}>FFmpeg Reality Checks · episode 35 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, cut: Cut, rule: Rule, fix: Fix, close: Close};
