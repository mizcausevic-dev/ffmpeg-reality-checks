import React from 'react';
import {C, F, D, W, H} from '../../kit/theme';
import {ep, prog, rnd} from '../../kit/anim';
import {Head} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: desk and map. A top down desk, one paper sheet pinned flat, index cards with typed labels, pushpins and string
 * between the evidence, hand drawn circles and arrows, and a slow push in of the whole desk. The map is the clip's own clock:
 * one second is 135 px, one frame is 13.5 px, a keyframe every 10 frames.
 * Every number comes from episodes/ff90/fixture/experiment.mjs (ffmpeg 6.1.1): a 100 frame clip at 10 fps, frame n has luma 16 + 2n,
 * cut at -ss 3.5 (frame 35), in mp4, mkv, ts (muxer clock starts at 1.4 s) and two controls (mkv14: mkv shifted to 1.4 s; ts0: ts that starts at 0).
 */

type K = 'cyan' | 'amber' | 'red' | 'green' | 'text' | 'mute';

/* ---------- the clock map ---------- */
const PX = 110, X0 = 300;
const xs = (s: number) => X0 + s * PX;

/* ---------- local kit: sheet, pins, string, cards, strips, hand drawn marks ---------- */
const Cam: React.FC<{t: number; dur: number; dx?: number; dy?: number; z?: number; children?: React.ReactNode}> = ({t, dur, dx = 0, dy = 0, z = 0.03, children}) => {
  const p = prog(t, 0, dur);
  return <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `scale(${1 + z * p}) translate(${dx * p}px, ${dy * p}px)`, transformOrigin: '50% 55%'}}>{children}</div>;
};
const Svg: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <svg style={{position: 'absolute', left: 0, top: 0}} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>{children}</svg>
);
const Tx: React.FC<{x: number; y: number; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; mono?: boolean; weight?: number; o?: number; children?: React.ReactNode}> = ({x, y, size = 24, color = C.text, anchor = 'start', mono = true, weight = 600, o = 1, children}) => (
  <text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor} fontFamily={mono ? F.mono : F.sans} fontWeight={weight} opacity={o}>{children}</text>
);
const Sheet: React.FC<{x: number; y: number; w: number; h: number; o?: number}> = ({x, y, w, h, o = 1}) => (
  <g opacity={o}>
    <rect x={x + 8} y={y + 8} width={w} height={h} fill={C.panel} />
    <rect x={x} y={y} width={w} height={h} fill={C.bg2} stroke={C.text} strokeWidth={3} />
  </g>
);
const Pin: React.FC<{x: number; y: number; k?: K; o?: number}> = ({x, y, k = 'red', o = 1}) => (
  <g opacity={o}>
    <circle cx={x} cy={y} r={13} fill={C[k]} stroke={C.text} strokeWidth={3} />
    <circle cx={x - 4} cy={y - 4} r={4} fill={C.bg} opacity={0.8} />
  </g>
);
/* string between two pins: a shallow sag, drawn on with p */
const Str: React.FC<{x1: number; y1: number; x2: number; y2: number; p: number; k?: K; sag?: number}> = ({x1, y1, x2, y2, p, k = 'red', sag = 26}) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + sag;
  return <path d={`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`} pathLength={1} fill="none" stroke={C[k]} strokeWidth={4} strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - p} />;
};
const Circle: React.FC<{cx: number; cy: number; rx: number; ry: number; p: number; seed?: number; color?: string; sw?: number}> = ({cx, cy, rx, ry, p, seed = 3, color = C.text, sw = 6}) => {
  const n = 28;
  const pts = Array.from({length: n + 6}, (_, i) => { const a = (i / n) * Math.PI * 2 - 1.2; const j = 1 + (rnd(seed * 31 + i) - 0.5) * 0.07 + i * 0.0035; return [cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]; });
  const d = pts.map((q, i) => `${i === 0 ? 'M' : 'L'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ');
  return <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1 - p} />;
};
const Arrow: React.FC<{x1: number; y1: number; x2: number; y2: number; p: number; color?: string; sw?: number}> = ({x1, y1, x2, y2, p, color = C.text, sw = 6}) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx = (s: number) => [x2 - Math.cos(a + s) * 24, y2 - Math.sin(a + s) * 24];
  const h1 = hx(0.45), h2 = hx(-0.45);
  return (
    <g>
      <path d={`M${x1} ${y1} L${x2} ${y2}`} pathLength={1} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - Math.min(1, p * 1.25)} />
      {p > 0.8 && <path d={`M${h1[0]} ${h1[1]} L${x2} ${y2} L${h2[0]} ${h2[1]}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity={prog(p, 0.8, 1)} />}
    </g>
  );
};
/* an index card: paper, one ink border, a small tilt, typed label */
const IC: React.FC<{x: number; y: number; w: number; h: number; rot?: number; label: string; value: string; sub?: string; k?: K; o?: number; vs?: number}> = ({x, y, w, h, rot = 0, label, value, sub, k = 'cyan', o = 1, vs = 44}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box', transform: `rotate(${rot}deg)`, opacity: o, background: C.bg, border: `3px solid ${C.text}`, borderTop: `14px solid ${C[k]}`, padding: '8px 18px', fontFamily: F.sans}}>
    <div style={{fontSize: 20, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: C[k]}}>{label}</div>
    <div style={{fontFamily: F.mono, fontSize: vs, fontWeight: 800, color: C.text, lineHeight: 1.1, marginTop: 2, whiteSpace: 'nowrap'}}>{value}</div>
    {sub && <div style={{fontSize: 23, color: C.dim, marginTop: 4, lineHeight: 1.25}}>{sub}</div>}
  </div>
);
const Note: React.FC<{x: number; y: number; w: number; o?: number; size?: number; color?: string; align?: 'left' | 'center'; mono?: boolean; bold?: boolean; children?: React.ReactNode}> = ({x, y, w, o = 1, size = 26, color = C.dim, align = 'left', mono = false, bold = false, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, fontFamily: mono ? F.mono : F.sans, fontSize: size, fontWeight: bold ? 700 : 500, color, lineHeight: 1.3, textAlign: align, whiteSpace: 'pre-wrap'}}>{children}</div>
);
const Giant: React.FC<{text: string; color?: string; size: number; x: number; y: number; w: number; align?: 'left' | 'center' | 'right'; o?: number}> = ({text, color = C.text, size, x, y, w, align = 'center', o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, textAlign: align, opacity: o, fontFamily: F.display, fontWeight: 900, fontSize: size * D.k * 0.8, lineHeight: 0.92, color, letterSpacing: 1, whiteSpace: 'nowrap'}}>{text}</div>
);

/* a strip of frames on the clock map. frames fa..fb, frame fa sits at clock second `start`. kept frames in ink k, keyframes (every 10th) stand taller. */
const Strip: React.FC<{y: number; fa: number; fb: number; start: number; k: K; h?: number; p?: number; o?: number; labels?: boolean}> = ({y, fa, fb, start, k, h = 30, p = 1, o = 1, labels = true}) => {
  const n = fb - fa + 1, shown = Math.ceil(n * p);
  return (
    <g opacity={o}>
      {Array.from({length: shown}, (_, i) => {
        const f = fa + i, x = xs(start + i * 0.1), key = f % 10 === 0;
        return <rect key={f} x={x} y={key ? y - 10 : y} width={PX * 0.1 - 1.5} height={key ? h + 10 : h} fill={C[k]} />;
      })}
      {labels && p > 0.95 && <Tx x={xs(start)} y={y + h + 28} size={22} color={C.text} anchor="start">{fa}</Tx>}
      {labels && p > 0.95 && <Tx x={xs(start + (n - 1) * 0.1) + PX * 0.1 - 1.5} y={y + h + 28} size={22} color={C.text} anchor="end">{fb}</Tx>}
    </g>
  );
};
/* the ruler of the clock: ticks each second */
const Ruler: React.FC<{y: number; from: number; to: number; o?: number; label?: string}> = ({y, from, to, o = 1, label}) => (
  <g opacity={o}>
    <line x1={xs(from)} y1={y} x2={xs(to)} y2={y} stroke={C.mute} strokeWidth={3} />
    {Array.from({length: Math.floor(to - from) + 1}, (_, i) => {
      const s = Math.ceil(from) + i; if (s > to) return null;
      return <g key={s}><line x1={xs(s)} y1={y} x2={xs(s)} y2={y - 12} stroke={C.mute} strokeWidth={3} /><Tx x={xs(s)} y={y - 20} size={20} color={C.mute} anchor="middle" weight={500}>{s}</Tx></g>;
    })}
    {label && <Tx x={xs(from) - 14} y={y + 6} size={22} anchor="end" color={C.dim} weight={600}>{label}</Tx>}
  </g>
);

/* ---------- 1. The ask ---------- */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const mark = prog(t, A(0.5), A(0.6));
  return (
    <>
      <Head over="A cut and a kept clock" title="Which frame comes first?" o={ep(t, A(0.02), A(0.07))} />
      <Cam t={t} dur={dur} dx={-16} dy={-8}>
        <Svg>
          <Sheet x={96} y={290} w={1728} h={460} o={ep(t, A(0.06), A(0.14))} />
          <Ruler y={420} from={0} to={10} o={ep(t, A(0.14), A(0.22))} label="s" />
          <Strip y={450} fa={0} fb={99} start={0} k="mute" p={ep(t, A(0.18), A(0.34))} labels={false} />
          <Tx x={xs(0)} y={560} size={22} color={C.text} anchor="start" o={ep(t, A(0.3), A(0.38))}>frame 0, 0.0 s</Tx>
          <Tx x={xs(9.9) + 12} y={560} size={22} color={C.text} anchor="end" o={ep(t, A(0.3), A(0.38))}>frame 99, 9.9 s</Tx>
          <Pin x={xs(3.5)} y={400} k="red" o={ep(t, A(0.4), A(0.46))} />
          <Tx x={xs(3.5)} y={372} size={30} anchor="middle" weight={800} color={C.red} o={ep(t, A(0.4), A(0.46))}>-ss 3.5</Tx>
          <Circle cx={xs(3.5) + 6} cy={465} rx={34} ry={44} p={mark} seed={5} color={C.red} />
          <Tx x={xs(3.5) + 6} y={540} size={26} anchor="middle" weight={800} color={C.red} o={ep(t, A(0.56), A(0.64))}>frame 35</Tx>
        </Svg>
        <IC x={150} y={622} w={470} h={116} rot={-1} label="Three containers" value="mp4 · mkv · ts" k="cyan" o={ep(t, A(0.66), A(0.74))} vs={36} />
        <IC x={690} y={622} w={470} h={116} rot={0.8} label="Two flags" value="-copyts · -start_at_zero" k="amber" o={ep(t, A(0.72), A(0.8))} vs={25} />
        <IC x={1230} y={622} w={470} h={116} rot={-0.6} label="Two positions" value="-ss before / after -i" k="green" o={ep(t, A(0.78), A(0.86))} vs={30} />
      </Cam>
      <Note x={96} y={812} w={1728} align="center" size={26} o={ep(t, A(0.88), A(0.95))}>100 frames, 10 per second, a keyframe every second. ffmpeg 6.1.1.</Note>
    </>
  );
};

/* ---------- 2. The map and the readers ---------- */
const Setup: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  return (
    <>
      <Head over="The map and its two readers" title="A frame names itself." o={ep(t, A(0.02), A(0.07))} />
      <Cam t={t} dur={dur} dx={10} dy={-6}>
        <Svg>
          <Sheet x={96} y={290} w={1728} h={250} o={ep(t, A(0.06), A(0.12))} />
          <Ruler y={330} from={0} to={10} o={ep(t, A(0.1), A(0.16))} />
          <Strip y={370} fa={0} fb={99} start={0} k="mute" p={ep(t, A(0.12), A(0.26))} labels={false} />
          {[0, 10, 20, 30, 40].map((f, i) => <Tx key={f} x={xs(f / 10) + 6} y={470} size={20} anchor="middle" color={C.text} o={ep(t, A(0.24 + i * 0.02), A(0.3 + i * 0.02))}>{16 + 2 * f}</Tx>)}
          <Tx x={xs(7)} y={470} size={20} anchor="middle" color={C.text} o={ep(t, A(0.34), A(0.4))}>luma 16 + 2n</Tx>
          <Tx x={xs(3.5)} y={512} size={22} anchor="middle" color={C.dim} weight={500} mono={false} o={ep(t, A(0.34), A(0.4))}>frame 35 has luma 86: a decoded picture says which frame it is</Tx>
          <Pin x={420} y={600} k="cyan" o={ep(t, A(0.44), A(0.5))} />
          <Pin x={1500} y={600} k="amber" o={ep(t, A(0.6), A(0.66))} />
        </Svg>
        <IC x={120} y={620} w={800} h={200} rot={-0.8} label="Reader 1 · timestamps" value="ffprobe" sub="format and stream start_time, every packet pts_time" k="cyan" o={ep(t, A(0.44), A(0.52))} />
        <IC x={1000} y={620} w={800} h={200} rot={0.7} label="Reader 2 · pictures" value="decoded frames" sub="which frame is first, how many; showinfo with -copyts for the decoder's own clock" k="amber" o={ep(t, A(0.6), A(0.68))} vs={42} />
      </Cam>
      <Note x={96} y={850} w={1728} align="center" size={26} o={ep(t, A(0.82), A(0.9))}>They agree on the first timestamp of every re-encoded cut.</Note>
    </>
  );
};

/* ---------- 3. No copyts ---------- */
const Default: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const R = [310, 470, 630];
  return (
    <>
      <Head over="No -copyts" title="The cut restarts the clock." o={ep(t, A(0.02), A(0.07))} />
      <Cam t={t} dur={dur} dx={-12} dy={-6}>
        <Svg>
          <Sheet x={96} y={280} w={1728} h={500} o={ep(t, A(0.05), A(0.1))} />
          <Ruler y={322} from={0} to={11} o={ep(t, A(0.08), A(0.14))} />
          {/* source */}
          <Tx x={118} y={364} size={22} weight={800} color={C.dim}>source</Tx>
          <Strip y={344} fa={0} fb={99} start={0} k="mute" h={26} p={ep(t, A(0.1), A(0.2))} labels={false} />
          <Pin x={xs(3.5)} y={322} k="red" o={ep(t, A(0.2), A(0.25))} />
          {/* mp4 and mkv */}
          <Tx x={118} y={R[1] + 18} size={22} weight={800} color={C.cyan}>mp4, mkv</Tx>
          <Strip y={R[1]} fa={35} fb={99} start={0} k="cyan" h={26} p={ep(t, A(0.32), A(0.46))} />
          <Arrow x1={xs(3.5)} y1={366} x2={xs(0.1)} y2={R[1] - 14} p={prog(t, A(0.28), A(0.36))} color={C.red} />
          <Tx x={xs(7.6)} y={R[1] + 18} size={30} weight={800} color={C.cyan} o={ep(t, A(0.46), A(0.54))}>start 0.0 s</Tx>
          {/* ts */}
          <Tx x={118} y={R[2] + 18} size={22} weight={800} color={C.amber}>ts</Tx>
          <Strip y={R[2]} fa={35} fb={99} start={1.4} k="amber" h={26} p={ep(t, A(0.56), A(0.7))} />
          <rect x={xs(0)} y={R[2] + 4} width={1.4 * PX} height={20} fill="none" stroke={C.amber} strokeWidth={3} strokeDasharray="8 6" opacity={ep(t, A(0.66), A(0.72))} />
          <Tx x={xs(9.2)} y={R[2] + 18} size={30} weight={800} color={C.amber} o={ep(t, A(0.7), A(0.78))}>start 1.4 s</Tx>
        </Svg>
        <Note x={xs(0)} y={R[2] + 66} w={1000} size={24} color={C.dim} o={ep(t, A(0.74), A(0.82))}>ts with -ss after -i: the mpegts muxer starts its clock at 1.4 s</Note>
        <Note x={xs(0)} y={R[1] + 66} w={820} size={24} color={C.dim} o={ep(t, A(0.5), A(0.58))}>frame 35 first, 65 frames, before or after -i</Note>
      </Cam>
    </>
  );
};

/* ---------- 4. -copyts before the input ---------- */
const CopytsIn: React.FC<{t: number; dur: number}> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  return (
    <>
      <Head over="-copyts before the input" title="The source clock is kept." color={C.green} o={ep(t, A(0.02), A(0.07))} />
      <Cam t={t} dur={dur} dx={-14} dy={-4}>
        <Svg>
          <Sheet x={96} y={280} w={1728} h={520} o={ep(t, A(0.05), A(0.1))} />
          <Ruler y={322} from={0} to={13} o={ep(t, A(0.08), A(0.14))} />
          <Tx x={118} y={364} size={22} weight={800} color={C.dim}>source</Tx>
          <Strip y={344} fa={0} fb={99} start={0} k="mute" h={26} p={ep(t, A(0.1), A(0.18))} labels={false} />
          <Pin x={xs(3.5)} y={322} k="red" o={ep(t, A(0.18), A(0.22))} />
          {/* mp4, mkv: the same clock */}
          <Tx x={118} y={452} size={22} weight={800} color={C.cyan}>mp4, mkv</Tx>
          <Strip y={434} fa={35} fb={99} start={3.5} k="cyan" h={26} p={ep(t, A(0.26), A(0.38))} />
          <Line3 x={xs(3.5)} y1={372} y2={430} o={ep(t, A(0.26), A(0.32))} />
          <Tx x={xs(1.7)} y={452} size={30} weight={800} color={C.cyan} anchor="middle" o={ep(t, A(0.38), A(0.46))}>start 3.5 s</Tx>
          {/* ts source and outputs */}
          <Tx x={118} y={582} size={22} weight={800} color={C.dim}>ts source</Tx>
          <Strip y={564} fa={40} fb={99} start={5.4} k="mute" h={26} p={ep(t, A(0.46), A(0.54))} labels={false} />
          <Tx x={118} y={652} size={22} weight={800} color={C.amber}>ts, -copyts</Tx>
          <rect x={xs(5.4)} y={638} width={1.4 * PX} height={20} fill="none" stroke={C.amber} strokeWidth={3} strokeDasharray="8 6" opacity={ep(t, A(0.56), A(0.62))} />
          <Strip y={634} fa={40} fb={99} start={6.8} k="amber" h={26} p={ep(t, A(0.58), A(0.7))} />
          <Tx x={xs(5.4) + 1.4 * PX / 2} y={700} size={22} color={C.amber} anchor="middle" o={ep(t, A(0.62), A(0.7))}>+1.4</Tx>
          <Tx x={xs(2.5)} y={652} size={30} weight={800} color={C.amber} anchor="middle" o={ep(t, A(0.7), A(0.76))}>6.8 s</Tx>
          <Tx x={118} y={742} size={22} weight={800} color={C.green}>ts + start_at_zero</Tx>
          <Strip y={724} fa={40} fb={99} start={5.4} k="green" h={26} p={ep(t, A(0.76), A(0.86))} />
          <Tx x={xs(2.5)} y={742} size={30} weight={800} color={C.green} anchor="middle" o={ep(t, A(0.84), A(0.9))}>5.4 s</Tx>
        </Svg>
      </Cam>
    </>
  );
};
const Line3: React.FC<{x: number; y1: number; y2: number; o?: number}> = ({x, y1, y2, o = 1}) => (
  <line x1={x} y1={y1} x2={x} y2={y2} stroke={C.red} strokeWidth={4} strokeDasharray="8 6" opacity={o} />
);

/* ---------- 5. -copyts after the input ---------- */
const CopytsOut: React.FC<{t: number; dur: number}> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  return (
    <>
      <Head over="-copyts after the input" title="The cut counts on the file clock." color={C.red} o={ep(t, A(0.02), A(0.07))} />
      <Cam t={t} dur={dur} dx={-10} dy={-6}>
        <Svg>
          <Sheet x={96} y={280} w={1728} h={330} o={ep(t, A(0.05), A(0.1))} />
          {/* file clock of a ts file: starts at 1.4 */}
          <Ruler y={322} from={1.4} to={11.3} o={ep(t, A(0.08), A(0.14))} label="file clock" />
          <Strip y={352} fa={0} fb={99} start={1.4} k="mute" h={26} p={ep(t, A(0.1), A(0.2))} labels={false} />
          <Tx x={xs(1.4) - 14} y={372} size={22} color={C.text} anchor="end" o={ep(t, A(0.18), A(0.24))}>frame 0 at 1.4 s</Tx>
          <Pin x={xs(3.5)} y={322} k="red" o={ep(t, A(0.24), A(0.3))} />
          <Circle cx={xs(3.5) + 6} cy={366} rx={30} ry={40} p={prog(t, A(0.32), A(0.4))} seed={9} color={C.red} />
          <Tx x={xs(3.5) + 6} y={490} size={26} color={C.red} weight={800} anchor="start" o={ep(t, A(0.38), A(0.46))}>-ss 3.5: frame 21, not 35</Tx>
          <Arrow x1={xs(3.5) + 6} y1={420} x2={xs(3.5) + 6} y2={458} p={prog(t, A(0.34), A(0.4))} color={C.red} sw={5} />
          {/* the kept frames */}
          <Tx x={118} y={560} size={22} weight={800} color={C.red}>kept</Tx>
          <Strip y={540} fa={21} fb={99} start={3.5} k="red" h={26} p={ep(t, A(0.44), A(0.56))} labels={false} />
          <Tx x={xs(11.3)} y={598} size={26} weight={800} color={C.red} anchor="end" o={ep(t, A(0.54), A(0.6))}>79 frames, not 65</Tx>
        </Svg>
        <IC x={110} y={640} w={410} h={150} rot={-0.8} label="ts or mkv, start 1.4 s" value="frame 21" sub="79 frames" k="red" o={ep(t, A(0.6), A(0.68))} vs={42} />
        <IC x={560} y={640} w={410} h={150} rot={0.6} label="ts, start 0" value="frame 35" sub="not affected" k="green" o={ep(t, A(0.68), A(0.76))} vs={42} />
        <IC x={1010} y={640} w={410} h={150} rot={-0.5} label="mp4, mkv, start 0" value="frame 35" sub="not affected" k="green" o={ep(t, A(0.76), A(0.84))} vs={42} />
        <IC x={1460} y={640} w={370} h={150} rot={0.7} label="+ start_at_zero" value="frame 35" sub="ts: repaired" k="cyan" o={ep(t, A(0.84), A(0.92))} vs={42} />
      </Cam>
    </>
  );
};

/* ---------- 6. Which frame is first ---------- */
const COLS = ['3.0', '3.2', '3.5', '3.9', '4.0', '4.3'];
const WANT = [30, 32, 35, 39, 40, 43];
const GRID: {name: string; sub: string; v: number[]; k: K}[] = [
  {name: 'mp4, re-encoded', sub: '', v: [30, 32, 35, 39, 40, 43], k: 'cyan'},
  {name: 'mkv, re-encoded', sub: '', v: [30, 32, 35, 39, 40, 43], k: 'cyan'},
  {name: 'ts, re-encoded', sub: '', v: [30, 40, 40, 40, 40, 50], k: 'red'},
  {name: 'mkv, stream copy', sub: '', v: [30, 30, 30, 30, 40, 40], k: 'amber'},
  {name: 'mp4, stream copy', sub: '', v: [30, 32, 35, 39, 40, 43], k: 'cyan'},
];
const First: React.FC<{t: number; dur: number}> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const gx = 560, cw = 190, gy = 360, rh = 78;
  return (
    <>
      <Head over="-ss before the input" title="Where the first frame lands." o={ep(t, A(0.02), A(0.07))} />
      <Cam t={t} dur={dur} dx={-10} dy={-4}>
        <Svg>
          <Sheet x={96} y={290} w={1728} h={500} o={ep(t, A(0.05), A(0.1))} />
          <Tx x={118} y={332} size={22} weight={800} color={C.dim} o={ep(t, A(0.08), A(0.14))}>asked -ss</Tx>
          {COLS.map((c, i) => <Tx key={c} x={gx + i * cw + cw / 2} y={332} size={28} weight={800} anchor="middle" o={ep(t, A(0.08), A(0.14))}>{c}</Tx>)}
          {COLS.map((c, i) => <Tx key={c} x={gx + i * cw + cw / 2} y={356} size={20} weight={500} color={C.mute} anchor="middle" mono={false} o={ep(t, A(0.08), A(0.14))}>frame {WANT[i]}</Tx>)}
          {GRID.map((r, ri) => {
            const o = ep(t, A(0.14 + ri * 0.1), A(0.22 + ri * 0.1)), y = gy + ri * rh + 20;
            return (
              <g key={r.name} opacity={o}>
                <Tx x={118} y={y + 46} size={24} weight={800}>{r.name}</Tx>
                {r.v.map((v, ci) => {
                  const off = v !== WANT[ci], col: K = off ? (v > WANT[ci] ? 'red' : 'amber') : 'green';
                  return (
                    <g key={ci}>
                      <rect x={gx + ci * cw + 14} y={y + 8} width={cw - 28} height={58} fill={C[col]} fillOpacity={off ? 1 : 0.2} stroke={C[col]} strokeWidth={3} />
                      <Tx x={gx + ci * cw + cw / 2} y={y + 49} size={34} weight={800} anchor="middle" color={off ? C.bg : C.text}>{v}</Tx>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </Svg>
        <Note x={118} y={824} w={1700} size={24} color={C.text} o={ep(t, A(0.66), A(0.76))}>red: after the request, 3.2 s gives frame 40. amber: the keyframe before. mp4 copy: 70 packets, 65 frames, first packet at -0.5 s.</Note>
      </Cam>
    </>
  );
};

/* ---------- 7. Close ---------- */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="What to do" title="Check the first frame." color={C.cyan} o={ep(t, 0.2, 0.8)} />
    <Cam t={t} dur={20} dx={-8} dy={-4}>
      <Svg>
        <Sheet x={96} y={280} w={1728} h={520} o={ep(t, 0.4, 1.0)} />
        <Pin x={150} y={330} k="red" o={ep(t, 0.8, 1.2)} /><Pin x={150} y={510} k="red" o={ep(t, 0.8, 1.2)} /><Pin x={150} y={690} k="red" o={ep(t, 0.8, 1.2)} />
      </Svg>
      <IC x={190} y={310} w={1560} h={140} rot={-0.3} label="-copyts keeps the source clock" value="and -ss after -i then counts on it" k="cyan" o={ep(t, 2.0, 2.8)} vs={38} />
      <IC x={190} y={490} w={1560} h={140} rot={0.3} label="Fix: add -start_at_zero" value="or subtract the file's start_time" k="green" o={ep(t, 5.0, 5.8)} vs={38} />
      <IC x={190} y={670} w={1560} h={110} rot={-0.2} label="ts: seeks to a keyframe at or after the request" value="read the first frame, not only the timestamps" k="red" o={ep(t, 8.0, 8.8)} vs={30} />
    </Cam>
    <Note x={96} y={832} w={1728} align="center" size={27} o={ep(t, 11.0, 11.8)}>Not tested: other builds, B frames, audio, real footage.</Note>
    <Note x={96} y={880} w={1728} align="center" size={26} color={C.mute} o={ep(t, 12.0, 12.8)}>FFmpeg Reality Checks · episode 90 · fixture and tests in the description</Note>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, setup: Setup, default: Default, copyts_in: CopytsIn, copyts_out: CopytsOut, first: First, close: Close};
