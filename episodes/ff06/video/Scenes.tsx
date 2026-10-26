import React from 'react';
import {C, F} from '../../kit/theme';
import {ep, step} from '../../kit/anim';
import {Axis, Cells, Cmd, CX, Duel, FrameBox, Halo, Head, Medallion, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff06/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). */
const EV = {a: '320x180', b: '640x360', frames: 50, total: 100, seconds: 4};
const CMD = 'ffmpeg -f concat -i mixed.txt -c copy out.mp4';
const FIT = '-vf "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,setsar=1"';

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => {
  const k = 0.8, cy = 690;
  return (
    <>
      <Halo y={520} color={C.cyan} o={ep(t, 0, 1.2)} />
      <Head over="Concat demuxer · copy the streams" title="Two clips. Two sizes. One file?" o={ep(t, 0.2, 0.8)} />
      <Cmd y={330} text={CMD} hi="-c copy" o={ep(t, 1.0, 1.6)} />
      <FrameBox cx={CX - 380} cy={cy} w={320} h={180} k={k} color={C.cyan} label="A" sub={EV.a} o={ep(t, 2.2, 2.8)} />
      <FrameBox cx={CX + 508} cy={cy} w={640} h={360} k={k} color={C.amber} label="B" sub={EV.b} o={ep(t, 2.8, 3.4)} />
      <Medallion y={cy} x={CX} text="+" color={C.mute} d={72} size={44} o={ep(t, 3.2, 3.8)} />
      <Mid y={860} size={30} o={ep(t, 4.6, 5.2)}>No re-encode. Does FFmpeg say anything?</Mid>
    </>
  );
};

/* 2. The fixture */
const Fixture: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic test pattern" title="Same codec. Same rate. Different size." o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={380} left={{label: 'Clip A', value: EV.a, sub: `${EV.frames} frames · 2 s · 25 fps`, color: C.cyan, o: ep(t, 0.8, 1.5)}} right={{label: 'Clip B', value: EV.b, sub: `${EV.frames} frames · 2 s · 25 fps`, color: C.amber, o: ep(t, 1.4, 2.1)}} mid="+" midO={ep(t, 1.8, 2.4)} />
    <Verdict y={760} text="Docs: all files must have the same streams" color={C.dim} o={ep(t, 5.0, 5.8)} size={34} />
    <Mid y={830} size={28} color={C.mute} o={ep(t, 6.4, 7.0)}>We break the rule on purpose.</Mid>
  </>
);

/* 3. The join succeeds */
const Join: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={560} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="The join" title="It worked." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Cmd y={290} text={CMD} hi="-c copy" color={C.green} o={ep(t, 0.6, 1.2)} />
    <Row y={430} h={270} items={[
      {label: 'Exit code', value: '0', color: C.green, o: ep(t, 1.6, 2.2)},
      {label: 'Warning lines', value: '0', color: C.green, o: ep(t, 2.4, 3.0)},
      {label: 'Output file', value: 'out.mp4', color: C.green, o: ep(t, 3.2, 3.8)},
    ]} />
    <Verdict y={780} text="No error. No warning. No hint." color={C.amber} o={ep(t, 4.6, 5.4)} />
  </>
);

/* 4. What the header says */
const Header: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="ffprobe on out.mp4" title="The header says clip A." o={ep(t, 0.2, 0.8)} />
    <Row y={330} h={290} valueSize={76} items={[
      {label: 'Size', value: EV.a, color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Frames', value: String(EV.total), color: C.cyan, o: ep(t, 1.6, 2.2)},
      {label: 'Duration', value: `${EV.seconds} s`, color: C.cyan, o: ep(t, 2.3, 2.9)},
    ]} />
    <Verdict y={730} text={`Nothing here mentions ${EV.b}`} color={C.amber} o={ep(t, 4.4, 5.2)} />
  </>
);

/* 5. What is inside: every decoded frame */
const Inside: React.FC<SceneProps> = ({t}) => {
  const n = Math.floor(ep(t, 2.4, 5.0) * EV.frames);
  return (
    <>
      <Head over="Decode every frame, read its size" title="Half the frames are bigger." o={ep(t, 0.2, 0.8)} />
      <Duel y={270} h={340}
        left={{label: `Frames at ${EV.a}`, value: String(EV.frames), sub: 'first clip', color: C.cyan, o: ep(t, 0.8, 1.4)}}
        right={{label: `Frames at ${EV.b}`, value: String(EV.frames), sub: 'second clip', color: C.amber, o: ep(t, 1.4, 2.0)}}
        mid={String(EV.total)} midSub="frames" midColor={C.text} midO={ep(t, 1.8, 2.4)} />
      <Cells y={670} cx={CX - 420} n={EV.frames} perRow={25} size={24} gap={6} color={C.cyan} lit={(i) => i < n} />
      <Cells y={670} cx={CX + 420} n={EV.frames} perRow={25} size={24} gap={6} color={C.amber} lit={(i) => i < n} />
      <Axis y1={660} y2={740} />
      <Mid y={800} size={30} o={ep(t, 6.0, 6.6)}>Decode problems: 0 · Players: not tested</Mid>
    </>
  );
};

/* 6. Controls and the fix */
const Control: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Two more runs" title="Match the sizes, or re-encode." o={ep(t, 0.2, 0.8)} />
    <Duel y={250} h={340}
      left={{label: 'Control · same size, -c copy', value: EV.a, sub: `all ${EV.total} frames`, color: C.cyan, o: ep(t, 0.8, 1.5)}}
      right={{label: 'Re-encode · scale + pad', value: EV.b, sub: `all ${EV.total} frames · header agrees`, color: C.green, o: ep(t, 3.4, 4.1)}}
      mid="ok" midColor={C.green} midO={ep(t, 4.0, 4.6)} />
    <Cmd y={660} text={FIT} size={24} color={C.green} o={ep(t, 4.8, 5.5)} />
    <Mid y={780} size={28} color={C.mute} o={ep(t, 6.2, 6.8)}>Scale to fit inside 640x360, then pad the rest.</Mid>
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.amber} o={ep(t, 0, 1.2)} />
    <Head over="Check before you copy" title="Silent success is not proof." color={C.amber} o={ep(t, 0.2, 0.9)} />
    <Duel y={310} h={260}
      left={{label: 'Sizes match', value: '-c copy', sub: 'fast, safe', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 72}}
      right={{label: 'Sizes differ', value: 're-encode', sub: 'scale + pad to one size', color: C.amber, o: ep(t, 2.0, 2.7), valueSize: 72}}
      mid="or" midO={ep(t, 2.4, 3.0)} />
    <Mid y={660} size={30} color={C.dim} o={ep(t, 3.8, 4.4)}>Same results on ffmpeg 6.1.1 and 8.1.2.</Mid>
    <Mid y={720} size={28} color={C.mute} o={ep(t, 4.2, 4.8)}>Not tested: players, editors, other codecs, other mismatches.</Mid>
    <Mid y={810} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 6 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, fixture: Fixture, join: Join, header: Header, inside: Inside, control: Control, close: Close};
void F; void step;
