import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, FrameStrip, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff45/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1 and 8.1.2. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="Cut with the trim filter" title="Frozen start? Audio off?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mov -vf trim=start=1:end=2 out.mov" hi="trim=start=1:end=2" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'Picture', value: 'frozen?', sub: 'repeats at the start', color: C.amber, o: ep(t, 2.4, 3.1), valueSize: 80}}
      right={{label: 'Sound', value: 'off?', sub: 'a second out of sync', color: C.amber, o: ep(t, 3.6, 4.3), valueSize: 80}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 5.2, 5.8)}>We measure first frame time, frame count, repeats and audio start, on ffmpeg 6.1.1 and 8.1.2.</Mid>
  </>
);

/* 2. A clip that names its frames, the control */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clip · 4 s · 100 frames" title="Every frame names itself." o={ep(t, 0.2, 0.8)} />
    <FrameStrip y={265} n={10} kept={() => true} label={(i) => String(25 + i)} fw={150} fh={86} gap={14} o={ep(t, 1.0, 1.7)} />
    <Row y={450} h={190} cw={520} gap={40} valueSize={52} items={[
      {label: 'Cut from the clip', value: '25 to 49', sub: 'frame numbers and audio 1 to 2 s', color: C.cyan, o: ep(t, 2.0, 2.6)},
      {label: 'Control, seek 1 s, 1 s long', value: '25 frames', sub: 'first at 0.00 s · 48000 samples', color: C.cyan, o: ep(t, 3.0, 3.6)},
      {label: 'Trim with timestamps reset', value: 'identical', sub: 'same 25 hashes, same samples', color: C.green, o: ep(t, 4.6, 5.2)},
    ]} />
    <Row y={680} h={160} cw={520} gap={40} valueSize={44} items={[
      {label: 'Reader 1', value: 'framemd5', sub: 'one hash per frame', color: C.cyan, o: ep(t, 6.2, 6.8)},
      {label: 'Reader 2', value: 'raw luma', sub: 'frames and samples in Node', color: C.amber, o: ep(t, 7.0, 7.6)},
      {label: 'Reader 3', value: 'ffprobe', sub: 'packet timestamps', color: C.green, o: ep(t, 7.8, 8.4)},
    ]} />
  </>
);

/* 3. Without setpts, mov */
const Freeze: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Trim alone, mov file, ffmpeg 6.1.1" title="Twenty five frames stand still." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i src.mkv -vf trim=start=1:end=2 out.mov" hi="trim=start=1:end=2" size={30} o={ep(t, 0.9, 1.5)} />
    <FrameStrip y={370} n={10} kept={() => true} cur={-1} label={() => '25'} fw={150} fh={86} gap={14} o={ep(t, 2.0, 2.7)} />
    <Row y={560} h={200} cw={520} gap={40} valueSize={52} items={[
      {label: 'Frames out', value: '50, not 25', sub: 'the cut was 25 frames', color: C.red, o: ep(t, 3.6, 4.2)},
      {label: 'Repeats of frame 25', value: '25', sub: 'one run of 26 equal frames', color: C.red, o: ep(t, 4.6, 5.2)},
      {label: 'Clip ends at', value: '2.00 s', sub: 'the cut was 1.00 s long', color: C.red, o: ep(t, 5.6, 6.2)},
    ]} />
    <Mid y={810} size={28} color={C.mute} o={ep(t, 7.0, 7.6)}>First 10 of 50 frames shown, all frame 25. Frame md5 and raw luma agree: 25 repeats.</Mid>
  </>
);

/* 4. Same command, mkv */
const Gap: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="The same trim, mkv file, both builds" title="No repeats. A one second gap." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Cmd y={275} text="ffmpeg -i src.mkv -vf trim=start=1:end=2 out.mkv" hi="trim=start=1:end=2" size={30} o={ep(t, 0.9, 1.5)} />
    <Duel y={400} h={290}
      left={{label: 'Pixels', value: 'identical', sub: '25 frames, 0 repeats\nsame hashes as the control', color: C.green, o: ep(t, 2.0, 2.7), valueSize: 90}}
      right={{label: 'First frame at', value: '1.00 s', sub: 'the control starts at 0.00 s\nread by ffprobe and framemd5', color: C.red, o: ep(t, 4.0, 4.7), valueSize: 90}}
      mid="but" midO={ep(t, 3.6, 4.2)} />
    <Mid y={760} size={28} color={C.dim} o={ep(t, 6.4, 7.0)}>Same on ffmpeg 6.1.1 and 8.1.2. The cut is right; its first timestamp is 1.00 s.</Mid>
  </>
);

/* 4b. The same mov command, two builds */
const Builds: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="trim alone, written to a mov file" title="Same command. Two builds." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Figure y={250} value="50 vs 25" caption="frames out of the same trim: ffmpeg 6.1.1 vs 8.1.2" size={200} color={C.red} o={ep(t, 0.9, 1.7)} />
    <Duel y={560} h={215}
      left={{label: 'ffmpeg 6.1.1', value: 'fills', sub: '25 repeats, ends at 2.00 s', color: C.red, o: ep(t, 3.0, 3.7), valueSize: 60}}
      right={{label: 'ffmpeg 8.1.2', value: 'leaves a gap', sub: '25 frames, first at 1.00 s', color: C.amber, o: ep(t, 3.8, 4.5), valueSize: 60}}
      mid="vs" midO={ep(t, 3.4, 4.0)} />
    <Mid y={815} size={28} color={C.dim} o={ep(t, 6.0, 6.6)}>-fps_mode cfr: 50 frames, 25 repeats. -fps_mode passthrough: 25 frames, first at 1.00 s. Same on both builds.</Mid>
    <Verdict y={895} text="Write the frame rate mode, or reset the stamps" color={C.green} o={ep(t, 8.0, 8.6)} size={32} />
  </>
);

/* 5. Audio and the half fix */
const Sync: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Audio keeps its source stamps" title="Fix one stream, break the sync." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Figure y={250} value="1.00 s" caption="audio start with trim alone, in both files · samples identical to the control" color={C.amber} size={170} o={ep(t, 1.0, 1.7)} />
    <Row y={560} h={210} cw={520} gap={40} valueSize={60} items={[
      {label: 'Neither stamped', value: '0.00 s', sub: 'in sync, both a second late', color: C.cyan, o: ep(t, 3.6, 4.2)},
      {label: 'Video stamped only', value: '+1.00 s', sub: 'audio late', color: C.red, o: ep(t, 4.8, 5.4)},
      {label: 'Audio stamped only', value: '-1.00 s', sub: 'audio early', color: C.red, o: ep(t, 6.0, 6.6)},
    ]} />
    <Verdict y={810} text="Stamp both streams, or neither" color={C.green} o={ep(t, 7.4, 8.0)} size={34} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Reset both, then read the first frame." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Both reset, or seek', value: 'matches', sub: 'the control, frame for frame', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'Reset one, or none', value: 'not clean', sub: 'frozen, gapped or 1.00 s out of sync', color: C.red, o: ep(t, 2.4, 3.1), valueSize: 64}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.8, 4.4)}>setpts=PTS-STARTPTS after trim, asetpts=PTS-STARTPTS after atrim, or -ss and -t. Not tested: players, black frames, other containers, real footage, builds other than 6.1.1 and 8.1.2.</Mid>
    <Mid y={760} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 45 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, freeze: Freeze, gap: Gap, builds: Builds, sync: Sync, close: Close};
