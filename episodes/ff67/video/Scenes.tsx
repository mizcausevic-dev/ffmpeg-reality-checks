import React from 'react';
import {C, F, D, W, H} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff67/fixture/experiment.mjs (evidence.json from fixture/run.mjs). ffmpeg 6.1.1, libx264, one thread.
   Style: Vox flat graphics. Bold flat colour blocks, split screens, annotated freeze frames (circles and arrows), giant numbers,
   labelled bars drawn to scale. Palette lab only, flat fills, square corners, no gradients.
   The grids and strips below are the measured luma values and frame types. */
const PATCH_B: number[][] = [[79, 86, 79, 80, 83, 78, 75, 85, 75, 78, 82, 86, 85, 77, 75, 76, 82, 80, 82, 76, 77, 76, 77, 79], [75, 76, 76, 84, 77, 77, 80, 80, 76, 84, 82, 76, 84, 85, 81, 79, 80, 80, 75, 83, 81, 76, 78, 76], [75, 79, 76, 78, 80, 83, 81, 76, 84, 78, 83, 76, 75, 81, 81, 78, 78, 83, 85, 79, 83, 77, 79, 84], [83, 82, 85, 75, 83, 84, 79, 82, 82, 76, 86, 77, 85, 75, 77, 78, 79, 86, 86, 81, 79, 78, 76, 79], [83, 77, 83, 81, 82, 85, 78, 86, 82, 84, 77, 77, 78, 80, 85, 82, 83, 83, 75, 78, 78, 85, 77, 86], [83, 80, 77, 80, 86, 82, 76, 84, 77, 79, 75, 78, 76, 86, 79, 81, 80, 86, 78, 77, 81, 81, 76, 79], [86, 86, 81, 81, 84, 77, 83, 77, 75, 75, 83, 80, 86, 79, 82, 85, 86, 77, 79, 86, 80, 75, 85, 75], [76, 79, 75, 77, 81, 79, 81, 76, 86, 82, 84, 83, 82, 82, 77, 78, 82, 85, 81, 81, 81, 82, 75, 75], [77, 83, 81, 82, 85, 78, 86, 82, 84, 77, 77, 78, 80, 85, 82, 83, 83, 75, 78, 78, 85, 77, 86, 82], [82, 77, 75, 77, 81, 85, 84, 85, 83, 86, 78, 78, 85, 80, 81, 75, 77, 78, 81, 84, 82, 81, 80, 85], [76, 78, 80, 80, 80, 85, 78, 80, 80, 76, 83, 82, 85, 75, 83, 84, 79, 82, 82, 76, 86, 77, 85, 75], [82, 84, 77, 75, 79, 76, 77, 79, 78, 86, 86, 85, 77, 85, 86, 82, 80, 86, 76, 75, 78, 77, 85, 82], [85, 78, 78, 82, 83, 83, 78, 82, 81, 75, 79, 81, 84, 79, 75, 77, 79, 78, 84, 76, 81, 79, 78, 81], [86, 81, 79, 76, 86, 85, 77, 85, 77, 85, 82, 83, 75, 84, 85, 86, 77, 82, 81, 86, 81, 79, 82, 83], [77, 79, 83, 82, 86, 81, 82, 83, 80, 83, 81, 79, 77, 79, 85, 85, 79, 86, 80, 83, 77, 83, 81, 82], [77, 81, 84, 86, 75, 79, 77, 76, 77, 82, 78, 83, 75, 76, 84, 84, 81, 79, 82, 82, 85, 85, 84, 84], [86, 84, 81, 86, 76, 79, 76, 80, 84, 77, 78, 84, 78, 78, 76, 83, 79, 76, 76, 82, 82, 82, 76, 86], [75, 85, 86, 81, 79, 76, 86, 85, 77, 85, 77, 85, 82, 83, 75, 84, 85, 86, 77, 82, 81, 86, 81, 79]];
const PATCH_C: number[][] = [[76, 77, 76, 77, 79, 80, 81, 81, 82, 81, 81, 80, 81, 79, 78, 81, 83, 81, 78, 77, 86, 81, 83, 86], [84, 86, 86, 82, 76, 85, 81, 75, 77, 78, 79, 75, 76, 76, 84, 77, 77, 80, 80, 76, 84, 82, 76, 84], [82, 78, 78, 86, 84, 81, 84, 77, 82, 76, 75, 75, 77, 77, 81, 84, 86, 75, 79, 77, 76, 77, 82, 78], [76, 77, 79, 80, 81, 81, 82, 81, 81, 80, 81, 79, 78, 81, 83, 81, 78, 77, 86, 81, 83, 86, 76, 81], [80, 86, 78, 82, 82, 86, 82, 76, 80, 80, 84, 76, 81, 85, 83, 77, 80, 82, 85, 80, 75, 82, 86, 81], [79, 83, 82, 86, 81, 82, 83, 80, 83, 81, 79, 77, 79, 85, 85, 79, 86, 80, 83, 77, 83, 81, 82, 85], [77, 78, 82, 85, 81, 81, 81, 82, 75, 75, 77, 79, 78, 80, 77, 86, 85, 77, 80, 84, 81, 84, 81, 76], [82, 82, 76, 86, 77, 85, 75, 77, 78, 79, 86, 86, 81, 79, 78, 76, 79, 82, 78, 76, 78, 78, 80, 85], [80, 83, 77, 84, 85, 82, 83, 75, 76, 76, 79, 83, 83, 81, 80, 81, 86, 86, 80, 77, 77, 80, 81, 82], [76, 77, 82, 84, 85, 76, 83, 81, 78, 84, 75, 82, 83, 84, 84, 75, 81, 75, 79, 86, 83, 75, 78, 85], [77, 82, 76, 75, 75, 77, 77, 81, 84, 86, 75, 79, 77, 76, 77, 82, 78, 83, 75, 76, 84, 84, 81, 79], [79, 78, 86, 86, 85, 77, 85, 86, 82, 80, 86, 76, 75, 78, 77, 85, 82, 81, 86, 76, 82, 75, 77, 75], [83, 83, 77, 80, 80, 83, 76, 80, 81, 83, 78, 82, 84, 77, 75, 79, 76, 77, 79, 78, 86, 86, 85, 77], [84, 81, 84, 77, 82, 76, 75, 75, 77, 77, 81, 84, 86, 75, 79, 77, 76, 77, 82, 78, 83, 75, 76, 84], [84, 75, 78, 76, 85, 84, 85, 78, 81, 82, 85, 86, 81, 75, 85, 86, 81, 79, 76, 86, 85, 77, 85, 77], [75, 81, 86, 84, 80, 77, 75, 82, 81, 77, 83, 83, 81, 86, 80, 81, 86, 79, 75, 78, 83, 82, 77, 79], [77, 86, 85, 77, 80, 84, 81, 84, 81, 76, 83, 77, 82, 81, 80, 84, 75, 78, 76, 85, 84, 85, 78, 81], [79, 75, 81, 86, 84, 80, 77, 75, 82, 81, 77, 83, 83, 81, 86, 80, 81, 86, 79, 75, 78, 83, 82, 77]];
const SEQ_D = 'IBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBBPBBP';
const SEQ_Z = 'IPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP';

/* ---------- measured scalars ---------- */
const B = {def: 179174, zl: 428245, film: 211127, anim: 179591, bf0: 197671, mb0: 389555, d22: 244638};
const CRF_RATIO = [{crf: 18, r: 1.2654}, {crf: 20, r: 1.5916}, {crf: 23, r: 2.3901}, {crf: 26, r: 1.3307}, {crf: 28, r: 1.268}, {crf: 30, r: 1.0854}, {crf: 32, r: 1.034}];
const DEF_CURVE: {crf: number; b: number; y: number}[] = [
  {crf: 18, b: 1280446, y: 38.522}, {crf: 20, b: 760484, y: 37.307}, {crf: 22, b: 244638, y: 36.419}, {crf: 23, b: 179174, y: 36.152}, {crf: 26, b: 110493, y: 35.181},
  {crf: 28, b: 85873, y: 34.476}, {crf: 30, b: 72209, y: 33.778}, {crf: 32, b: 62660, y: 32.76}, {crf: 35, b: 52352, y: 31.352},
];
const ZL_CURVE: {crf: number; b: number; y: number}[] = [
  {crf: 18, b: 1620238, y: 39.227}, {crf: 20, b: 1210387, y: 38.214}, {crf: 23, b: 428245, y: 36.452}, {crf: 26, b: 147036, y: 35.244},
  {crf: 28, b: 108889, y: 34.332}, {crf: 30, b: 78377, y: 33.518}, {crf: 32, b: 64790, y: 32.708},
];

/* ---------- local drawing kit (flat blocks) ---------- */
const ON = () => C.capText || C.text; // type on a dark colour block
const Svg: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <svg style={{position: 'absolute', left: 0, top: 0}} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>{children}</svg>
);
const Tx: React.FC<{x: number; y: number; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; face?: 'mono' | 'sans' | 'display'; weight?: number; o?: number; ls?: number; children?: React.ReactNode}> = ({x, y, size = 28, color = C.text, anchor = 'start', face = 'mono', weight = 700, o = 1, ls = 0, children}) => (
  <text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor} fontFamily={F[face]} fontWeight={weight} opacity={o} letterSpacing={ls} style={{whiteSpace: 'pre'}}>{children}</text>
);
/* a flat block that wipes in from the left */
const Block: React.FC<{x: number; y: number; w: number; h: number; color: string; p?: number}> = ({x, y, w, h, color, p = 1}) => <rect x={x} y={y} width={w * p} height={h} fill={color} />;
const Title: React.FC<{text: string; color?: string; o?: number}> = ({text, color = C.cyan, o = 1}) => (
  <div style={{position: 'absolute', left: 96, top: 120, opacity: o}}>
    <div style={{fontFamily: F.display, fontSize: 80 * D.k, fontWeight: 800, letterSpacing: D.ls, lineHeight: 1, color: C.text, textTransform: 'uppercase', whiteSpace: 'nowrap'}}>{text}</div>
    <div style={{width: 150, height: 10, background: color, marginTop: 12}} />
  </div>
);
/* a hand-drawn circle, drawn on */
const Circ: React.FC<{cx: number; cy: number; rx: number; ry: number; p?: number; color?: string; sw?: number}> = ({cx, cy, rx, ry, p = 1, color = C.red, sw = 5}) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={color} strokeWidth={sw} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} opacity={p > 0 ? 1 : 0} />
);
/* an arrow from (x1,y1) to (x2,y2), drawn on; the head is a flat triangle */
const Arrow: React.FC<{x1: number; y1: number; x2: number; y2: number; p?: number; color?: string; sw?: number}> = ({x1, y1, x2, y2, p = 1, color = C.red, sw = 5}) => {
  const a = Math.atan2(y2 - y1, x2 - x1), hx = x1 + (x2 - x1) * p, hy = y1 + (y2 - y1) * p, L = 22;
  const pts = `${hx},${hy} ${hx - L * Math.cos(a - 0.45)},${hy - L * Math.sin(a - 0.45)} ${hx - L * Math.cos(a + 0.45)},${hy - L * Math.sin(a + 0.45)}`;
  return (
    <g opacity={p > 0 ? 1 : 0}>
      <line x1={x1} y1={y1} x2={hx - (L * 0.6) * Math.cos(a)} y2={hy - (L * 0.6) * Math.sin(a)} stroke={color} strokeWidth={sw} />
      <polygon points={pts} fill={color} />
    </g>
  );
};
const fmt = (n: number) => String(Math.round(n));

/* ---------- 1. The question: a split screen ---------- */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const a = (f: number, w = 0.6) => ep(t, f * dur, f * dur + w);
  const pL = ep(t, 0.03 * dur, 0.03 * dur + 0.7), pR = ep(t, 0.3 * dur, 0.3 * dur + 0.7);
  const count = Math.round(B.def * prog(t, 0.12 * dur, 0.4 * dur));
  return (
    <>
      <Title text="Same CRF, how many bytes?" color={C.red} />
      <Svg>
        <Block x={96} y={290} w={840} h={560} color={C.cyan} p={pL} />
        <Block x={984} y={290} w={840} h={560} color={C.red} p={pR} />
        <Tx x={136} y={352} size={30} color={ON()} face="sans" weight={800} ls={6} o={a(0.1)}>NO TUNE</Tx>
        <Tx x={136} y={436} size={60} color={ON()} o={a(0.1)}>-crf 23</Tx>
        <Tx x={130} y={640} size={150} color={ON()} weight={800} o={a(0.12)}>{fmt(count)}</Tx>
        <Tx x={136} y={706} size={36} color={ON()} face="sans" weight={600} o={a(0.12)}>bytes</Tx>
        <Tx x={136} y={800} size={26} color={ON()} face="sans" weight={500} o={a(0.12)}>preset medium, 100 frames, 320 by 240</Tx>
        <Tx x={1024} y={352} size={30} color={ON()} face="sans" weight={800} ls={6} o={a(0.32)}>WITH A TUNE</Tx>
        <Tx x={1024} y={436} size={44} color={ON()} o={a(0.32)}>-crf 23 -tune zerolatency</Tx>
        <Tx x={1404} y={700} size={250} color={ON()} face="display" weight={800} anchor="middle" o={a(0.45)}>?</Tx>
        <Tx x={1024} y={760} size={36} color={ON()} face="sans" weight={600} o={a(0.45)}>bytes</Tx>
        <Tx x={1024} y={800} size={26} color={ON()} face="sans" weight={500} o={a(0.45)}>same preset, same frames, same clip</Tx>
      </Svg>
    </>
  );
};

/* ---------- 2. The clip: annotated freeze frames ---------- */
const CELL = 20, GW = 24 * CELL, GH = 18 * CELL, GY = 336;
const shade = (v: number) => 0.9 - 0.78 * ((v - 75) / 11); // opacity of ink: darkest at 75, lightest at 86
const Grid: React.FC<{x: number; data: number[][] | null; flat?: number; o?: number}> = ({x, data, flat, o = 1}) => (
  <g opacity={o}>
    <rect x={x} y={GY} width={GW} height={GH} fill={C.bg2} />
    {Array.from({length: 18}).map((_, r) => Array.from({length: 24}).map((__, c) => (
      <rect key={r * 24 + c} x={x + c * CELL} y={GY + r * CELL} width={CELL} height={CELL} fill={C.text} opacity={shade(data ? data[r][c] : flat ?? 81)} />
    )))}
    <rect x={x} y={GY} width={GW} height={GH} fill="none" stroke={C.text} strokeWidth={3} />
  </g>
);
const Clip: React.FC<SceneProps> = ({t, dur}) => {
  const a = (f: number, w = 0.6) => ep(t, f * dur, f * dur + w);
  const XA = 96, XB = 672, XC = 1248;
  const cx = (x: number) => x + CELL / 2, cy = GY + CELL / 2;
  return (
    <>
      <Title text="The clip" color={C.amber} />
      <Svg>
        <Tx x={XA} y={GY - 16} size={24} face="sans" weight={800} ls={4} color={C.cyan} o={a(0.02)}>CLEAN, FRAME 50</Tx>
        <Tx x={XB} y={GY - 16} size={24} face="sans" weight={800} ls={4} color={C.red} o={a(0.32)}>NOISY, FRAME 50</Tx>
        <Tx x={XC} y={GY - 16} size={24} face="sans" weight={800} ls={4} color={C.red} o={a(0.5)}>NOISY, FRAME 51</Tx>
        <Grid x={XA} data={null} flat={81} o={a(0.02)} />
        <Grid x={XB} data={PATCH_B} o={a(0.32)} />
        <Grid x={XC} data={PATCH_C} o={a(0.5)} />
        <Tx x={XA} y={GY + GH + 42} size={32} color={C.cyan} o={a(0.1)}>81 in all 432 cells</Tx>
        <Tx x={XB} y={GY + GH + 42} size={32} color={C.red} o={a(0.36)}>75 to 86, 12 values</Tx>
        <Tx x={XC} y={GY + GH + 42} size={32} color={C.red} o={a(0.54)}>398 of 432 cells change</Tx>
        <Arrow x1={XB + GW + 14} y1={GY + GH / 2} x2={XC - 14} y2={GY + GH / 2} p={prog(t, 0.5 * dur, 0.58 * dur)} color={C.text} sw={5} />
        <Circ cx={cx(XB)} cy={cy} rx={20} ry={20} p={prog(t, 0.58 * dur, 0.66 * dur)} />
        <Circ cx={cx(XC)} cy={cy} rx={20} ry={20} p={prog(t, 0.66 * dur, 0.74 * dur)} />
        <Tx x={XC + GW} y={GY + GH + 78} size={24} face="sans" weight={700} color={C.red} anchor="end" o={a(0.7)}>circled, top left cell: 79, then 76</Tx>
        {/* legend and the whole-clip change, bars to scale */}
        <Tx x={96} y={806} size={22} face="sans" weight={700} color={C.dim} o={a(0.7)}>SHADING STRETCHED, 75 DARKEST TO 86 LIGHTEST</Tx>
        {Array.from({length: 12}).map((_, i) => <rect key={i} x={96 + i * 30} y={820} width={30} height={28} fill={C.text} opacity={a(0.7) * shade(75 + i)} />)}
        <Tx x={1000} y={806} size={22} face="sans" weight={700} color={C.dim} o={a(0.8)}>MEAN LUMA CHANGE PER FRAME, WHOLE CLIP</Tx>
        <Tx x={1000} y={838} size={24} face="sans" weight={700} color={C.text} anchor="end" o={a(0.8)}>clean 2.81</Tx>
        <Tx x={1000} y={866} size={24} face="sans" weight={700} color={C.text} anchor="end" o={a(0.8)}>noisy 6.40</Tx>
        <Block x={1016} y={820} w={(2.806 / 6.403) * 780} h={24} color={C.cyan} p={prog(t, 0.8 * dur, 0.9 * dur)} />
        <Block x={1016} y={848} w={780} h={24} color={C.red} p={prog(t, 0.82 * dur, 0.95 * dur)} />
      </Svg>
    </>
  );
};

/* ---------- 3. The bytes: labelled bars to scale and a giant number ---------- */
const BAR_X = 96, BAR_W = 820;
const Bytes: React.FC<SceneProps> = ({t, dur}) => {
  const a = (f: number, w = 0.6) => ep(t, f * dur, f * dur + w);
  const rows = [
    {name: 'no tune', flag: '-crf 23', b: B.def, color: C.cyan, f: 0.04},
    {name: 'animation', flag: '-tune animation', b: B.anim, color: C.cyan, f: 0.34},
    {name: 'film', flag: '-tune film', b: B.film, color: C.amber, f: 0.46},
    {name: 'zerolatency', flag: '-tune zerolatency', b: B.zl, color: C.red, f: 0.18},
  ];
  const order = [0, 3, 2, 1];
  const refX = BAR_X + (B.def / B.zl) * BAR_W;
  return (
    <>
      <Title text="The bytes" color={C.red} />
      <Svg>
        {order.map((ri, i) => {
          const r = rows[ri], y = 290 + i * 140, w = (r.b / B.zl) * BAR_W, p = prog(t, r.f * dur, r.f * dur + 0.9);
          return (
            <g key={r.name}>
              <Tx x={BAR_X} y={y + 28} size={30} face="sans" weight={800} color={r.color} o={a(r.f)}>{r.name}</Tx>
              <Tx x={refX + 16} y={y + 28} size={24} color={C.dim} weight={600} o={a(r.f)}>{r.flag}</Tx>
              <Block x={BAR_X} y={y + 42} w={w} h={70} color={r.color} p={p} />
              <Tx x={BAR_X + w + 18} y={y + 94} size={34} color={C.text} o={a(r.f + 0.05)}>{fmt(r.b * Math.min(1, p))}</Tx>
              <Tx x={BAR_X + w + 18 + 175} y={y + 94} size={38} face="sans" color={r.color} weight={800} o={a(r.f + 0.1)}>{(r.b / B.def).toFixed(2) + 'x'}</Tx>
            </g>
          );
        })}
        <line x1={refX} y1={284} x2={refX} y2={862} stroke={C.text} strokeWidth={2} strokeDasharray="8 8" opacity={a(0.3)} />
        <Block x={1380} y={290} w={444} h={560} color={C.red} p={ep(t, 0.2 * dur, 0.2 * dur + 0.7)} />
        <Tx x={1602} y={570} size={190} color={ON()} face="display" weight={800} anchor="middle" o={a(0.3)}>{(1 + (B.zl / B.def - 1) * prog(t, 0.3 * dur, 0.5 * dur)).toFixed(2) + 'x'}</Tx>
        <Tx x={1602} y={650} size={34} color={ON()} face="sans" weight={700} anchor="middle" o={a(0.34)}>more bytes</Tx>
        <Tx x={1602} y={700} size={26} color={ON()} face="sans" weight={500} anchor="middle" o={a(0.34)}>same CRF 23, same preset</Tx>
        <Tx x={1602} y={750} size={26} color={ON()} face="sans" weight={500} anchor="middle" o={a(0.34)}>same 100 frames</Tx>
      </Svg>
    </>
  );
};

/* ---------- 4. The B frames: two strips of frame types ---------- */
const SX = 96, SW = 1728, FW = SW / 100;
const typeColor = (ch: string) => (ch === 'I' ? C.red : ch === 'P' ? C.amber : C.cyan);
const Strip: React.FC<{y: number; seq: string; shown: number; h?: number}> = ({y, seq, shown, h = 90}) => (
  <g>
    {seq.split('').map((ch, i) => i < shown && <rect key={i} x={SX + i * FW} y={y} width={FW - 3} height={h} fill={typeColor(ch)} />)}
  </g>
);
const Frames: React.FC<SceneProps> = ({t, dur}) => {
  const a = (f: number, w = 0.6) => ep(t, f * dur, f * dur + w);
  const shA = Math.round(100 * prog(t, 0.05 * dur, 0.3 * dur)), shB = Math.round(100 * prog(t, 0.3 * dur, 0.5 * dur));
  return (
    <>
      <Title text="The B frames" color={C.cyan} />
      <Svg>
        <Tx x={SX} y={300} size={26} face="sans" weight={800} ls={4} color={C.cyan} o={a(0.03)}>NO TUNE, 100 FRAMES IN ORDER OF DISPLAY</Tx>
        <Strip y={320} seq={SEQ_D} shown={shA} />
        <Tx x={SX} y={500} size={26} face="sans" weight={800} ls={4} color={C.red} o={a(0.3)}>ZEROLATENCY, THE SAME 100 FRAMES</Tx>
        <Strip y={516} seq={SEQ_Z} shown={shB} />
        <Circ cx={SX + FW * 2.5} cy={365} rx={FW * 3.5 + 8} ry={58} p={prog(t, 0.5 * dur, 0.6 * dur)} color={C.text} sw={4} />
        <Arrow x1={SX + 230} y1={440} x2={SX + FW * 3.5} y2={424} p={prog(t, 0.55 * dur, 0.63 * dur)} color={C.text} sw={4} />
        <Tx x={SX + 240} y={452} size={26} face="sans" weight={600} color={C.text} o={a(0.58)}>I, then B B B P, over and over</Tx>
        <Arrow x1={SX + 700} y1={650} x2={SX + FW * 20} y2={616} p={prog(t, 0.62 * dur, 0.7 * dur)} color={C.text} sw={4} />
        <Tx x={SX + 710} y={664} size={26} face="sans" weight={600} color={C.text} o={a(0.66)}>one I, then 99 P</Tx>
        {/* legend */}
        {[{k: 'I', c: C.red}, {k: 'P', c: C.amber}, {k: 'B', c: C.cyan}].map((l, i) => (
          <g key={l.k} opacity={a(0.7)}>
            <rect x={1500 + i * 110} y={640} width={26} height={26} fill={l.c} />
            <Tx x={1536 + i * 110} y={662} size={26} color={C.text}>{l.k}</Tx>
          </g>
        ))}
        {/* giant counts */}
        <Block x={96} y={690} w={816} h={170} color={C.cyan} p={ep(t, 0.7 * dur, 0.7 * dur + 0.6)} />
        <Block x={1008} y={690} w={816} h={170} color={C.red} p={ep(t, 0.76 * dur, 0.76 * dur + 0.6)} />
        <Tx x={136} y={822} size={150} face="display" weight={800} color={ON()} o={a(0.74)}>74</Tx>
        <Tx x={330} y={778} size={34} face="sans" weight={700} color={ON()} o={a(0.74)}>B frames</Tx>
        <Tx x={330} y={822} size={26} face="mono" weight={600} color={ON()} o={a(0.74)}>1 I, 25 P</Tx>
        <Tx x={1048} y={822} size={150} face="display" weight={800} color={ON()} o={a(0.8)}>0</Tx>
        <Tx x={1150} y={778} size={34} face="sans" weight={700} color={ON()} o={a(0.8)}>B frames</Tx>
        <Tx x={1150} y={822} size={26} face="mono" weight={600} color={ON()} o={a(0.8)}>1 I, 99 P</Tx>
      </Svg>
    </>
  );
};

/* ---------- 5. The cause: bars that take the tune apart ---------- */
const CX0 = 560, CW = 640;
const Cause: React.FC<SceneProps> = ({t, dur}) => {
  const a = (f: number, w = 0.6) => ep(t, f * dur, f * dur + w);
  const sc = (b: number) => (b / B.zl) * CW;
  const rows: {flag: string; b: number; color: string; f: number; opt: string; note?: string}[] = [
    {flag: '-bf 0', b: B.bf0, color: C.amber, f: 0.12, opt: 'bframes 0, mbtree 1'},
    {flag: 'mbtree=0', b: B.mb0, color: C.red, f: 0.34, opt: 'bframes 3, mbtree 0'},
    {flag: 'rc-lookahead=0', b: B.mb0, color: C.red, f: 0.44, opt: 'bframes 3, mbtree 0'},
    {flag: '-tune zerolatency -bf 3', b: B.mb0, color: C.red, f: 0.62, opt: 'bframes 3, mbtree 0'},
    {flag: '-tune zerolatency', b: B.zl, color: C.red, f: 0.7, opt: 'bframes 0, mbtree 0'},
  ];
  const refX = CX0 + sc(B.def);
  return (
    <>
      <Title text="The cause" color={C.red} />
      <Svg>
        <Tx x={1520} y={290} size={20} face="sans" weight={800} ls={3} color={C.dim} o={a(0.05)}>X264 OPTIONS LINE</Tx>
        {rows.map((r, i) => {
          const y = 310 + i * 104, p = prog(t, r.f * dur, r.f * dur + 0.8), w = sc(r.b);
          const last = i === rows.length - 1;
          return (
            <g key={r.flag}>
              <Tx x={96} y={y + 52} size={24} weight={700} color={C.text} o={a(r.f)}>{r.flag}</Tx>
              <Block x={CX0} y={y + 8} w={last ? sc(B.mb0) : w} h={64} color={r.color} p={p} />
              {last && <Block x={CX0 + sc(B.mb0)} y={y + 8} w={sc(B.zl) - sc(B.mb0)} h={64} color={C.amber} p={p} />}
              <Tx x={CX0 + w + 16} y={y + 54} size={30} color={C.text} o={a(r.f + 0.05)}>{fmt(r.b * Math.min(1, p))}</Tx>
              <Tx x={CX0 + w + 16 + 140} y={y + 54} size={34} face="sans" color={r.color} weight={800} o={a(r.f + 0.1)}>{(r.b / B.def).toFixed(2) + 'x'}</Tx>
              <Tx x={1520} y={y + 52} size={22} color={C.dim} weight={600} o={a(r.f + 0.1)}>{r.opt}</Tx>
            </g>
          );
        })}
        <line x1={refX} y1={298} x2={refX} y2={846} stroke={C.text} strokeWidth={2} strokeDasharray="8 8" opacity={a(0.08)} />
        <Tx x={refX - 10} y={290} size={22} face="sans" weight={700} color={C.cyan} anchor="end" o={a(0.08)}>no tune: 179174</Tx>
        <Tx x={96} y={868} size={24} face="sans" weight={600} color={C.dim} o={a(0.8)}>Amber on the last bar: the 38690 extra bytes when the B frames are also off.</Tx>
      </Svg>
    </>
  );
};

/* ---------- 6. The quality: bytes against y PSNR for both curves ---------- */
const PX0 = 150, PW2 = 1080, PY0 = 310, PH2 = 500;
const LX = (b: number) => PX0 + ((Math.log10(b) - Math.log10(40000)) / (Math.log10(2000000) - Math.log10(40000))) * PW2;
const LY = (y: number) => PY0 + PH2 - ((y - 31) / (40 - 31)) * PH2;
const Quality: React.FC<SceneProps> = ({t, dur}) => {
  const a = (f: number, w = 0.6) => ep(t, f * dur, f * dur + w);
  const path = (c: {b: number; y: number}[]) => c.map((p, i) => `${i ? 'L' : 'M'}${LX(p.b).toFixed(1)} ${LY(p.y).toFixed(1)}`).join('');
  const pD = prog(t, 0.08 * dur, 0.3 * dur), pZ = prog(t, 0.3 * dur, 0.5 * dur);
  const xd = LX(B.d22), xz = LX(B.zl), ym = LY(36.44);
  return (
    <>
      <Title text="The quality" color={C.green} />
      <Svg>
        {/* axes */}
        <line x1={PX0} y1={PY0 + PH2} x2={PX0 + PW2} y2={PY0 + PH2} stroke={C.text} strokeWidth={3} />
        <line x1={PX0} y1={PY0} x2={PX0} y2={PY0 + PH2} stroke={C.text} strokeWidth={3} />
        {[32, 34, 36, 38, 40].map((v) => (
          <g key={v}><line x1={PX0} y1={LY(v)} x2={PX0 + PW2} y2={LY(v)} stroke={C.line} strokeWidth={1} /><Tx x={PX0 - 12} y={LY(v) + 8} size={22} color={C.dim} anchor="end">{v}</Tx></g>
        ))}
        {[[50000, '50k'], [100000, '100k'], [200000, '200k'], [500000, '500k'], [1000000, '1M']].map(([v, l]) => (
          <g key={String(l)}><line x1={LX(v as number)} y1={PY0} x2={LX(v as number)} y2={PY0 + PH2} stroke={C.line} strokeWidth={1} /><Tx x={LX(v as number)} y={PY0 + PH2 + 30} size={22} color={C.dim} anchor="middle">{l as string}</Tx></g>
        ))}
        <Tx x={PX0 + PW2} y={PY0 + PH2 + 62} size={22} face="sans" weight={600} color={C.dim} anchor="end">file bytes, log scale</Tx>
        <Tx x={PX0 - 10} y={PY0 - 18} size={22} face="sans" weight={600} color={C.dim}>y PSNR, dB (higher is closer to the source)</Tx>
        {/* curves */}
        <path d={path(DEF_CURVE)} fill="none" stroke={C.cyan} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - pD} />
        <path d={path(ZL_CURVE)} fill="none" stroke={C.red} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - pZ} />
        {DEF_CURVE.map((p, i) => (i + 1) / DEF_CURVE.length <= pD + 0.001 && <circle key={'d' + p.crf} cx={LX(p.b)} cy={LY(p.y)} r={8} fill={C.cyan} />)}
        {ZL_CURVE.map((p, i) => (i + 1) / ZL_CURVE.length <= pZ + 0.001 && <circle key={'z' + p.crf} cx={LX(p.b)} cy={LY(p.y)} r={8} fill={C.red} />)}
        <Tx x={LX(1280446) - 16} y={LY(38.522) - 16} size={22} color={C.cyan} anchor="end" o={a(0.3)}>18</Tx>
        <Tx x={LX(244638)} y={LY(36.419) - 22} size={22} color={C.cyan} anchor="middle" o={a(0.3)}>22</Tx>
        <Tx x={LX(179174) - 16} y={LY(36.152) - 20} size={22} color={C.cyan} anchor="end" o={a(0.3)}>23</Tx>
        <Tx x={LX(52352) + 18} y={LY(31.352) + 8} size={22} color={C.cyan} o={a(0.3)}>35</Tx>
        <Tx x={LX(1620238)} y={LY(39.227) - 20} size={22} color={C.red} anchor="middle" o={a(0.5)}>18</Tx>
        <Tx x={LX(428245) + 16} y={LY(36.452) + 40} size={22} color={C.red} o={a(0.5)}>23</Tx>
        <Tx x={290} y={540} size={24} face="sans" weight={800} color={C.cyan} o={a(0.3)}>no tune</Tx>
        <Tx x={880} y={566} size={24} face="sans" weight={800} color={C.red} o={a(0.5)}>zerolatency</Tx>
        <Tx x={PX0 + PW2 - 4} y={PY0 + PH2 - 18} size={20} face="sans" weight={600} color={C.dim} anchor="end" o={a(0.5)}>dots, from the right: CRF 18 up to 35</Tx>
        {/* the equal quality pair */}
        <line x1={xd} y1={ym} x2={xz} y2={ym} stroke={C.text} strokeWidth={3} strokeDasharray="10 8" opacity={a(0.62)} />
        <Arrow x1={xd + 44} y1={ym - 38} x2={xz - 18} y2={ym - 38} p={prog(t, 0.64 * dur, 0.74 * dur)} color={C.text} sw={4} />
        <Circ cx={xd} cy={LY(36.419)} rx={22} ry={22} p={prog(t, 0.6 * dur, 0.66 * dur)} color={C.text} sw={4} />
        <Circ cx={xz} cy={LY(36.452)} rx={22} ry={22} p={prog(t, 0.62 * dur, 0.68 * dur)} color={C.text} sw={4} />
        <Block x={1300} y={300} w={524} h={560} color={C.amber} p={ep(t, 0.55 * dur, 0.55 * dur + 0.7)} />
        <Tx x={1562} y={500} size={190} face="display" weight={800} color={ON()} anchor="middle" o={a(0.72)}>1.75x</Tx>
        <Tx x={1562} y={560} size={32} face="sans" weight={700} color={ON()} anchor="middle" o={a(0.74)}>at the same quality</Tx>
        <Tx x={1340} y={640} size={24} color={ON()} weight={600} o={a(0.78)}>default -crf 22: 244638 bytes</Tx>
        <Tx x={1340} y={676} size={24} color={ON()} weight={600} o={a(0.78)}>zerolatency -crf 23: 428245</Tx>
        <Tx x={1340} y={712} size={26} face="sans" color={ON()} weight={700} o={a(0.78)}>36.42 dB against 36.45 dB</Tx>
        <Tx x={1340} y={780} size={22} face="sans" weight={500} color={ON()} o={a(0.86)}>Same CRF 23: 36.15 dB and 36.45 dB.</Tx>
        <Tx x={1340} y={812} size={22} face="sans" weight={500} color={ON()} o={a(0.86)}>Not lower quality. Just more bytes.</Tx>
      </Svg>
    </>
  );
};

/* ---------- 7. What to check: the cost by CRF, and what was not tested ---------- */
const Close: React.FC<SceneProps> = ({t, dur: full}) => {
  const dur = Math.min(full, 15); // the last 10 s of this scene are the end card
  const a = (f: number, w = 0.6) => ep(t, f * dur, f * dur + w);
  const bx0 = 150, bw = 80, gap = 34, base = 770, scale = 150; // 1.00 = 150 px
  const todo = ['other presets', 'real footage', 'ffmpeg 8.1.2 and other builds', 'x265', 'the latency saved', 'players'];
  return (
    <>
      <Title text="What to check" color={C.amber} />
      <Svg>
        <Tx x={96} y={296} size={22} face="sans" weight={800} ls={3} color={C.dim} o={a(0.02)}>BYTES WITH ZEROLATENCY OVER BYTES WITH NO TUNE, SAME CRF</Tx>
        <line x1={96} y1={base} x2={bx0 + 7 * (bw + gap) - gap} y2={base} stroke={C.text} strokeWidth={3} />
        <line x1={96} y1={base - scale} x2={bx0 + 7 * (bw + gap) - gap + 4} y2={base - scale} stroke={C.text} strokeWidth={2} strokeDasharray="8 8" opacity={a(0.05)} />
        <Tx x={bx0 + 7 * (bw + gap) + 10} y={base - scale + 8} size={22} face="sans" weight={600} color={C.dim} o={a(0.05)}>1.00 = no tune</Tx>
        {CRF_RATIO.map((r, i) => {
          const h = r.r * scale, p = prog(t, (0.08 + i * 0.07) * dur, (0.08 + i * 0.07) * dur + 0.7), hot = r.crf === 23;
          return (
            <g key={r.crf}>
              <rect x={bx0 + i * (bw + gap)} y={base - h * p} width={bw} height={h * p} fill={hot ? C.red : C.cyan} />
              <Tx x={bx0 + i * (bw + gap) + bw / 2} y={base - h * p - 12} size={hot ? 42 : 32} face="sans" weight={800} color={hot ? C.red : C.text} anchor="middle" o={p > 0.3 ? 1 : 0}>{r.r.toFixed(2)}</Tx>
              <Tx x={bx0 + i * (bw + gap) + bw / 2} y={base + 36} size={26} color={C.dim} anchor="middle">{r.crf}</Tx>
            </g>
          );
        })}
        <Tx x={96} y={base + 36} size={22} face="sans" weight={700} color={C.dim}>CRF</Tx>
        <Tx x={96} y={846} size={24} face="sans" weight={600} color={C.dim} o={a(0.5)}>One thread. With two threads, CRF 23 gave 418892 over 178964: 2.34x.</Tx>
        <Block x={1180} y={296} w={644} h={554} color={C.amber} p={ep(t, 0.55 * dur, 0.55 * dur + 0.7)} />
        <Tx x={1220} y={356} size={30} face="sans" weight={800} ls={5} color={ON()} o={a(0.6)}>NOT TESTED</Tx>
        {todo.map((s, i) => <Tx key={s} x={1220} y={430 + i * 62} size={34} face="sans" weight={600} color={ON()} o={a(0.64 + i * 0.05)}>{s}</Tx>)}
        <Tx x={1220} y={812} size={24} face="sans" weight={500} color={ON()} o={a(0.92)}>Measure your own clip at your own CRF.</Tx>
      </Svg>
    </>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, clip: Clip, bytes: Bytes, bframes: Frames, cause: Cause, quality: Quality, close: Close};
