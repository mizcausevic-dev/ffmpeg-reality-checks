import React from 'react';
import {C, F, D, W, H} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff66/fixture/experiment.mjs (evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
   Style: technical mini-documentary. Specimen plates with a double rule, plate numbers and figure captions, numbered callouts,
   hex dumps with the key bytes circled, a slow camera drift. Palette lab only, flat fills, square corners, no gradients.
   The arrays below are the measured click positions and levels (sample, peak) of each output. */
const SRC_POS: number[] = [0, 4800, 9600, 14400, 19200, 24000, 28800, 33600, 38400, 43200, 48000, 52800, 57600, 62400, 67200, 72000, 76800, 81600, 86400, 91200, 96000, 100800, 105600, 110400, 115200, 120000, 124800, 129600, 134400, 139200, 144000, 148800, 153600, 158400, 163200, 168000, 172800, 177600, 182400, 187200];
const EV05: [number, number][] = [[0,29490],[6848,6521],[8128,29486],[9408,29478],[16768,20359],[17280,28376],[17792,9110],[26176,11834],[27456,29478],[28224,17634],[29504,27016],[35584,4290],[36608,4290],[37632,29475],[38656,25184],[46016,29211],[47296,29478],[54912,9068],[55424,28358],[55936,20401],[65344,27016],[66624,29486],[74240,14711],[75264,14711],[76288,29468],[77312,14756],[83648,6521],[84928,29486],[86208,29478],[93568,20359],[94080,28376],[94592,9110],[102976,11834],[104256,29478],[105024,17634],[106304,27016],[112384,4290],[113408,4290],[114432,29475],[115456,25184],[122816,29211],[124096,29478],[131712,9068],[132224,28358],[132736,20401],[142144,27016],[143424,29486],[151040,14711],[152064,14711],[153088,29468],[154112,14756],[160448,6521],[161728,29486],[163008,29478],[170368,20359],[170880,28376],[171392,9110],[179776,11834],[181056,29478],[181824,17634],[183104,27016],[189184,4290],[190208,4290],[191232,29475],[192256,25184],[199616,29211],[200896,29478],[208512,9068],[209024,28358],[209536,20401],[218944,27016],[220224,29486],[227840,14711],[228864,14711],[229888,29468],[230912,14756],[237248,6521],[238528,29486],[239808,29478],[247168,20359],[247680,28376],[248192,9110],[256576,11834],[257856,29478],[258624,17634],[259904,27016],[265984,4290],[267008,4290],[268032,29475],[269056,25184],[276416,29211],[277696,29478],[285312,9068],[285824,28358],[286336,20401],[295744,27016],[297024,29486],[304640,14711],[305664,14711],[306688,29468],[307712,14756],[314048,6521],[315328,29486],[316608,29478],[323968,20359],[324480,28376],[324992,9110],[333376,11834],[334656,29478],[335424,17634],[336704,27016],[342784,4290],[343808,4290],[344832,29475],[345856,25184],[353216,29211],[354496,29478],[362112,9068],[362624,28358],[363136,20401],[372544,27016],[373824,29486]];
const EV2: [number, number][] = [[0,29490],[1728,22950],[4480,20359],[8960,25184],[11712,17590],[16192,27016],[18944,14711],[23424,28376],[26176,11834],[27904,4322],[30656,29211],[33408,9068],[35136,6559],[37888,29490],[40640,6521],[42368,9110],[45120,29202],[47872,4290],[49600,11878],[52352,28358],[56832,14756],[59584,26990],[64064,17634],[66816,25152],[71296,20401],[74048,22912],[78528,22950],[81280,20359],[85760,25184],[88512,17590],[92992,27016]];
const EV4: [number, number][] = [[0,29490],[1280,25152],[8832,9068],[9728,14711],[13568,4322],[15872,14711],[17024,9068],[20864,9110],[24320,4290],[28160,14756],[35456,20401],[43328,22912],[44480,17590]];
const EVR05: [number, number][] = [[0,29491],[9595,29491],[19195,29491],[28795,29491],[38395,29491],[47995,29491],[57595,29491],[67195,29491],[76795,29491],[86395,29491],[95995,29491],[105595,29491],[115195,29491],[124795,29491],[134395,29491],[143995,29491],[153595,29491],[163195,29491],[172795,29491],[182395,29491],[191995,29491],[201595,29491],[211195,29491],[220795,29491],[230395,29491],[239995,29491],[249595,29491],[259195,29491],[268795,29491],[278395,29491],[287995,29491],[297595,29491],[307195,29491],[316795,29491],[326395,29491],[335995,29491],[345595,29491],[355195,29491],[364795,29491],[374395,29491]];
const LEN = {"src": 192000, "t05": 381440, "t2": 95744, "t4": 47104, "r05": 384000};
const HEX_SRC = [{"off":0,"pos":0,"bytes":[51,115,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"off":9600,"pos":4800,"bytes":[51,115,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}];
const HEX_05 = [{"off":0,"pos":0,"bytes":[50,115,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"off":13696,"pos":6848,"bytes":[121,25,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"off":16256,"pos":8128,"bytes":[46,115,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{"off":18816,"pos":9408,"bytes":[38,115,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}];

/* ---------- measured scalars (evidence.json from fixture/run.mjs, ffmpeg 6.1.1) ---------- */
const LIM = {lo: 0.5, hi: 100};
const SINGLES: {v: number; ok: boolean}[] = [
  {v: 0.25, ok: false}, {v: 0.4, ok: false}, {v: 0.5, ok: true}, {v: 0.8, ok: true}, {v: 1, ok: true}, {v: 1.5, ok: true}, {v: 2, ok: true},
  {v: 2.5, ok: true}, {v: 4, ok: true}, {v: 10, ok: true}, {v: 100, ok: true}, {v: 100.5, ok: false}, {v: 200, ok: false},
];
const CHAINS = [{label: '0.5,0.5', v: 0.25, anchor: 'end' as const}, {label: '0.5,0.8', v: 0.4, anchor: 'start' as const}];
const REFUSED_MSG = "Value 0.400000 for parameter 'tempo' out of range [0.5 - 100]";
const LENGTHS = [
  {k: 'atempo=0.5', want: 384000, got: 382896},
  {k: 'atempo=2', want: 96000, got: 95952},
  {k: 'atempo=100', want: 1920, got: 1024},
  {k: '100 then 2', want: 960, got: 0},
];
const PITCH: {k: string; hz: number; g: number; ctl?: boolean; note?: string}[] = [
  {k: 'atempo=0.5', hz: 999.87, g: 1842}, {k: 'atempo=0.8', hz: 999.8, g: 1842}, {k: 'atempo=1.5', hz: 999.6, g: 1842}, {k: 'atempo=2', hz: 999.46, g: 1842},
  {k: 'atempo=2.5', hz: 999.3, g: 1842}, {k: 'atempo=4', hz: 998.77, g: 1842}, {k: 'atempo=10', hz: 994.9, g: 1842}, {k: 'atempo=100', hz: 939.33, g: 1832, note: '1024 samples left'},
  {k: 'resample 0.5', hz: 500, g: 0, ctl: true}, {k: 'resample 2', hz: 2000.02, g: 0, ctl: true}, {k: 'resample 4', hz: 4000.1, g: 0, ctl: true},
];
const STRIPS: {k: string; ev: [number, number][]; len: number; f: number; ctl?: boolean}[] = [
  {k: 'source', ev: SRC_POS.map((p) => [p, 29491] as [number, number]), len: LEN.src, f: 1},
  {k: 'atempo=0.5', ev: EV05, len: LEN.t05, f: 0.5},
  {k: 'atempo=2', ev: EV2, len: LEN.t2, f: 2},
  {k: 'atempo=4', ev: EV4, len: LEN.t4, f: 4},
  {k: 'resample 0.5', ev: EVR05, len: LEN.r05, f: 0.5, ctl: true},
];
const FULL = 29491;

/* ---------- local drawing kit (specimen plates) ---------- */
const PX = 96, PW = 1728, PY = 300, PH = 540;
const Svg: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <svg style={{position: 'absolute', left: 0, top: 0}} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
    <defs>
      <pattern id="hatch" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
        <rect width="14" height="14" fill={C.redDim} />
        <line x1="0" y1="0" x2="0" y2="14" stroke={C.red} strokeWidth="3" />
      </pattern>
    </defs>
    {children}
  </svg>
);
const Tx: React.FC<{x: number; y: number; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; mono?: boolean; weight?: number; o?: number; ls?: number; children?: React.ReactNode}> = ({x, y, size = 28, color = C.text, anchor = 'start', mono = true, weight = 700, o = 1, ls = 0, children}) => (
  <text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor} fontFamily={mono ? F.mono : F.sans} fontWeight={weight} opacity={o} letterSpacing={ls} style={{whiteSpace: 'pre'}}>{children}</text>
);
/* the plate: double rule, a plate number above it and the figure caption below it */
const Frame: React.FC<{no: string; fig: string; o?: number}> = ({no, fig, o = 1}) => (
  <g opacity={o}>
    <rect x={PX} y={PY} width={PW} height={PH} fill={C.bg2} stroke={C.text} strokeWidth={3} />
    <rect x={PX + 10} y={PY + 10} width={PW - 20} height={PH - 20} fill="none" stroke={C.text} strokeWidth={1} />
    <Tx x={PX} y={PY - 14} size={24} color={C.dim} weight={700} ls={5}>{'PLATE ' + no}</Tx>
    <Tx x={PX} y={PY + PH + 34} size={24} color={C.dim} weight={500} mono={false}>{fig}</Tx>
  </g>
);
/* a numbered callout, with an optional leader line to the thing it points at */
const Call: React.FC<{x: number; y: number; n: number | string; tx?: number; ty?: number; color?: string; o?: number}> = ({x, y, n, tx, ty, color = C.red, o = 1}) => (
  <g opacity={o}>
    {tx !== undefined && ty !== undefined && (
      <>
        <line x1={x} y1={y} x2={tx} y2={ty} stroke={color} strokeWidth={2} />
        <circle cx={tx} cy={ty} r={4} fill={color} />
      </>
    )}
    <circle cx={x} cy={y} r={18} fill={C.bg2} stroke={color} strokeWidth={3} />
    <Tx x={x} y={y + 8} size={22} color={color} anchor="middle" weight={800}>{n}</Tx>
  </g>
);
/* a hand-drawn circle round the key bytes, drawn on */
const Circ: React.FC<{cx: number; cy: number; rx: number; ry: number; p?: number; color?: string}> = ({cx, cy, rx, ry, p = 1, color = C.red}) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={color} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} opacity={p > 0 ? 1 : 0} />
);
/* the slow camera: a drift of a few pixels and a 1 percent push-in over the whole scene */
const Drift: React.FC<{t: number; dur: number; children?: React.ReactNode}> = ({t, dur, children}) => {
  const p = Math.min(1, t / Math.max(1, dur));
  return <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '50% 50%', transform: `translate(${-8 * p}px, ${-4 * p}px) scale(${1 + 0.01 * p})`}}>{children}</div>;
};
const Title: React.FC<{text: string; color?: string; o?: number}> = ({text, color = C.cyan, o = 1}) => (
  <div style={{position: 'absolute', left: 96, top: 120, opacity: o}}>
    <div style={{fontFamily: F.display, fontSize: 80 * D.k, fontWeight: 800, letterSpacing: D.ls, lineHeight: 1, color: C.text, textTransform: 'uppercase', whiteSpace: 'nowrap'}}>{text}</div>
    <div style={{width: 150, height: 10, background: color, marginTop: 12}} />
  </div>
);
const Counter: React.FC<{label: string; value: string; color?: string; o?: number}> = ({label, value, color = C.cyan, o = 1}) => (
  <div style={{position: 'absolute', left: 1344, top: 124, width: 480, height: 134, boxSizing: 'border-box', opacity: o, background: C.bg2, border: `3px solid ${color}`, borderLeftWidth: 14, padding: '12px 24px', fontFamily: F.sans}}>
    <div style={{fontSize: 20, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color}}>{label}</div>
    <div style={{fontFamily: F.mono, fontSize: 60, fontWeight: 800, color: C.text, lineHeight: 1.15, whiteSpace: 'nowrap'}}>{value}</div>
  </div>
);
const hex2 = (n: number) => n.toString(16).padStart(2, '0');
const hex8 = (n: number) => n.toString(16).padStart(8, '0');
const asc = (b: number) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.');
type HexRow = {off: number; pos: number; bytes: number[]};
/* one hexdump row: offset, 16 bytes in two groups of eight, the ASCII column; bytes are placed one by one so the circles line up */
const BX0 = 372, BP = 54, BSIZE = 30;
const bx = (i: number) => BX0 + i * BP + (i >= 8 ? 14 : 0) + BP / 2;
const HexHead: React.FC<{o?: number}> = ({o = 1}) => (
  <g opacity={o}>
    <Tx x={150} y={366} size={22} color={C.dim} weight={700} ls={4}>OFFSET</Tx>
    <Tx x={BX0} y={366} size={22} color={C.dim} weight={700} ls={4}>BYTES, 16 BIT SIGNED, LITTLE ENDIAN</Tx>
    <Tx x={bx(15) + BP / 2 + 26} y={366} size={22} color={C.dim} weight={700} ls={4}>ASCII</Tx>
  </g>
);
const HexLine: React.FC<{y: number; row: HexRow; o?: number; hot?: number[]; tint?: string}> = ({y, row, o = 1, hot = [0, 1], tint = C.text}) => (
  <g opacity={o}>
    <Tx x={150} y={y} size={BSIZE} color={C.dim} weight={600}>{hex8(row.off)}</Tx>
    {row.bytes.map((b, i) => <Tx key={i} x={bx(i)} y={y} size={BSIZE} anchor="middle" color={hot.includes(i) ? tint : b === 0 ? C.mute : C.text} weight={hot.includes(i) ? 800 : 600}>{hex2(b)}</Tx>)}
    <Tx x={bx(15) + BP / 2 + 26} y={y} size={BSIZE} color={C.dim} weight={600}>{'|' + row.bytes.map(asc).join('') + '|'}</Tx>
  </g>
);

/* ---------- 1. The question ---------- */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const a = (f: number, w = 0.6) => ep(t, f * dur, f * dur + w);
  const sx0 = 190, sw = 760, sy = 580, amp = 0.9 * 110;
  let d = '';
  for (let k = 0; k <= 600; k++) d += `${k ? 'L' : 'M'}${(sx0 + (sw * k) / 600).toFixed(1)} ${(sy - amp * Math.sin((2 * Math.PI * 6 * k) / 600)).toFixed(1)}`;
  const b0 = 1090, bw = 660, pA = prog(t, 0.06 * dur, 0.3 * dur), pB = prog(t, 0.3 * dur, 0.5 * dur);
  return (
    <Drift t={t} dur={dur}>
      <Title text="The question" color={C.amber} />
      <Counter label="atempo runs" value={String(Math.round(19 * prog(t, 0.55 * dur, 0.75 * dur)))} color={C.amber} o={a(0.5)} />
      <Svg>
        <Frame no="I" fig="Fig. 1. Two specimens: a 1000 Hz tone and a train of 40 single sample clicks, both 4 s at 48000 Hz." />
        <Tx x={150} y={372} size={22} color={C.dim} weight={700} ls={5} o={a(0.03)}>SPECIMEN A</Tx>
        <Tx x={150} y={418} size={40} color={C.cyan} weight={800} mono={false} o={a(0.03)}>tone</Tx>
        <path d={d} fill="none" stroke={C.cyan} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - pA} />
        <line x1={sx0} y1={sy} x2={sx0 + sw} y2={sy} stroke={C.mute} strokeWidth={1} />
        <Tx x={sx0} y={720} size={24} color={C.dim} weight={500} mono={false} o={a(0.1)}>1000 Hz sine, 192000 samples. Drawn: the first 6 ms.</Tx>
        <Tx x={sx0} y={770} size={34} color={C.cyan} weight={800} mono={false} o={a(0.3)}>Does the pitch stay?</Tx>
        <line x1={1010} y1={352} x2={1010} y2={784} stroke={C.line} strokeWidth={2} />
        <Tx x={1070} y={372} size={22} color={C.dim} weight={700} ls={5} o={a(0.3)}>SPECIMEN B</Tx>
        <Tx x={1070} y={418} size={40} color={C.red} weight={800} mono={false} o={a(0.3)}>clicks</Tx>
        <line x1={b0} y1={sy} x2={b0 + bw} y2={sy} stroke={C.mute} strokeWidth={1} />
        {SRC_POS.map((p, i) => (i + 1) / 40 <= pB + 0.001 && <line key={i} x1={b0 + (p / 192000) * bw} y1={sy} x2={b0 + (p / 192000) * bw} y2={sy - 99} stroke={C.red} strokeWidth={4} />)}
        <Tx x={b0} y={720} size={24} color={C.dim} weight={500} mono={false} o={a(0.33)}>40 samples at 0.9 of full scale, 4800 apart.</Tx>
        <Tx x={b0} y={770} size={34} color={C.red} weight={800} mono={false} o={a(0.5)}>Does the timing stay?</Tx>
        <Call x={930} y={470} n={1} tx={sx0 + sw * (5.25 / 6)} ty={sy - amp} color={C.cyan} o={a(0.2)} />
        <Call x={1730} y={470} n={2} tx={b0 + (SRC_POS[39] / 192000) * bw} ty={sy - 99} color={C.red} o={a(0.4)} />
        <Tx x={960} y={818} size={24} color={C.dim} weight={500} mono={false} anchor="middle" o={a(0.7)}>ffmpeg 6.1.1. Every command carries a hard -t 30.</Tx>
      </Svg>
    </Drift>
  );
};

/* ---------- 2. The sources and a control ---------- */
const Source: React.FC<SceneProps> = ({t, dur}) => {
  const a = (f: number, w = 0.6) => ep(t, f * dur, f * dur + w);
  const sx0 = 170, sw = 1580, sy = 780;
  return (
    <Drift t={t} dur={dur}>
      <Title text="The sources" color={C.cyan} />
      <Counter label="samples" value={String(Math.round(192000 * prog(t, 0.05 * dur, 0.35 * dur)))} o={a(0.02)} />
      <Svg>
        <Frame no="II" fig="Fig. 2. clicks.wav as stored: byte offsets, 16 bytes a row. Control: -af anull returns these bytes unchanged (same md5)." />
        <HexHead o={a(0.02)} />
        <HexLine y={460} row={HEX_SRC[0]} tint={C.red} o={a(0.05)} />
        <Tx x={150} y={510} size={BSIZE} color={C.dim} weight={600} o={a(0.2)}>*</Tx>
        <HexLine y={560} row={HEX_SRC[1]} tint={C.red} o={a(0.3)} />
        <Circ cx={(bx(0) + bx(1)) / 2} cy={449} rx={57} ry={26} p={prog(t, 0.12 * dur, 0.2 * dur)} />
        <Circ cx={(bx(0) + bx(1)) / 2} cy={549} rx={57} ry={26} p={prog(t, 0.35 * dur, 0.43 * dur)} />
        <Call x={bx(0) - 24} y={402} n={1} tx={bx(0) - 8} ty={424} o={a(0.12)} />
        <Call x={bx(1) + 70} y={512} n={2} tx={bx(1) + 6} ty={534} o={a(0.35)} />
        <Tx x={760} y={410} size={26} color={C.red} weight={700} mono={false} o={a(0.12)}>sample 0 = 29491 (0x7333), 0.9 of full scale</Tx>
        <Tx x={560} y={516} size={26} color={C.red} weight={700} mono={false} o={a(0.35)}>4799 zero samples later: the same bytes</Tx>
        <line x1={sx0} y1={sy} x2={sx0 + sw} y2={sy} stroke={C.mute} strokeWidth={3} />
        {[0, 1, 2, 3, 4].map((s) => (
          <g key={s} opacity={a(0.5)}>
            <line x1={sx0 + (s * sw) / 4} y1={sy} x2={sx0 + (s * sw) / 4} y2={sy + 10} stroke={C.mute} strokeWidth={3} />
            <Tx x={sx0 + (s * sw) / 4} y={sy + 28} size={20} color={C.dim} weight={600} anchor="middle">{s}</Tx>
          </g>
        ))}
        <Tx x={sx0 + sw + 14} y={sy + 28} size={20} color={C.dim} weight={600} o={a(0.5)}>s</Tx>
        {SRC_POS.map((p, i) => (i + 1) / 40 <= prog(t, 0.5 * dur, 0.75 * dur) + 0.001 && <line key={i} x1={sx0 + (p / 192000) * sw} y1={sy} x2={sx0 + (p / 192000) * sw} y2={sy - 80} stroke={C.cyan} strokeWidth={4} />)}
        <Tx x={sx0} y={676} size={26} color={C.dim} weight={600} mono={false} o={a(0.5)}>The whole file to scale: 40 clicks, 4800 samples (0.1 s) apart.</Tx>
      </Svg>
    </Drift>
  );
};

/* ---------- 3. The range ---------- */
const Range: React.FC<SceneProps> = ({t, dur}) => {
  const a = (f: number, w = 0.6) => ep(t, f * dur, f * dur + w);
  const x0 = 190, wd = 1540, lo = Math.log10(0.2), span = Math.log10(300) - lo, ay = 560;
  const X = (v: number) => x0 + ((Math.log10(v) - lo) / span) * wd;
  const nAcc = SINGLES.filter((s) => s.ok).length;
  return (
    <Drift t={t} dur={dur}>
      <Title text="The range" color={C.green} />
      <Counter label="accepted" value={`${Math.round(nAcc * prog(t, 0.1 * dur, 0.5 * dur))} of ${SINGLES.length}`} color={C.green} o={a(0.02)} />
      <Svg>
        <Frame no="III" fig="Fig. 3. Thirteen single atempo values and two chains, on a log scale. Above the axis: ran. Below: refused, no output." />
        <Tx x={150} y={348} size={22} color={C.dim} weight={700} ls={4} o={a(0.02)}>TEMPO VALUES TRIED, LOG SCALE. DIAMONDS: CHAINS OF TWO.</Tx>
        <rect x={x0} y={ay - 108} width={X(LIM.lo) - x0} height={108} fill="url(#hatch)" opacity={a(0.05)} />
        <rect x={X(LIM.lo)} y={ay - 108} width={X(LIM.hi) - X(LIM.lo)} height={108} fill={C.greenDim} opacity={0.55 * a(0.05)} />
        <rect x={X(LIM.hi)} y={ay - 108} width={x0 + wd - X(LIM.hi)} height={108} fill="url(#hatch)" opacity={a(0.05)} />
        <line x1={x0} y1={ay} x2={x0 + wd} y2={ay} stroke={C.text} strokeWidth={3} />
        {SINGLES.map((s, i) => {
          const o = a(0.08 + (i / SINGLES.length) * 0.3, 0.4);
          return s.ok ? (
            <g key={s.v} opacity={o}>
              <line x1={X(s.v)} y1={ay} x2={X(s.v)} y2={ay - 40} stroke={C.green} strokeWidth={3} />
              <circle cx={X(s.v)} cy={ay - 40} r={11} fill={C.green} />
              <Tx x={X(s.v)} y={ay - 62} size={26} color={C.text} anchor="middle" weight={700}>{s.v}</Tx>
            </g>
          ) : (
            <g key={s.v} opacity={o}>
              <line x1={X(s.v) - 11} y1={ay + 28} x2={X(s.v) + 11} y2={ay + 50} stroke={C.red} strokeWidth={5} />
              <line x1={X(s.v) + 11} y1={ay + 28} x2={X(s.v) - 11} y2={ay + 50} stroke={C.red} strokeWidth={5} />
              <Tx x={X(s.v)} y={ay + 84} size={26} color={C.red} anchor="middle" weight={700}>{s.v}</Tx>
            </g>
          );
        })}
        {CHAINS.map((c, i) => {
          const o = a(0.62 + i * 0.1, 0.5), cx = X(c.v), cy = ay - 125;
          return (
            <g key={c.label} opacity={o}>
              <line x1={cx} y1={ay} x2={cx} y2={cy + 12} stroke={C.amber} strokeWidth={2} strokeDasharray="6 6" />
              <rect x={cx - 11} y={cy - 11} width={22} height={22} fill={C.amber} transform={`rotate(45 ${cx} ${cy})`} />
              <Tx x={c.anchor === 'end' ? cx + 14 : cx - 14} y={cy - 46} size={24} color={C.amber} anchor={c.anchor} weight={800}>{c.label}</Tx>
              <Tx x={c.anchor === 'end' ? cx + 14 : cx - 14} y={cy - 20} size={22} color={C.dim} anchor={c.anchor} weight={600}>{'= ' + c.v}</Tx>
            </g>
          );
        })}
        <Tx x={(X(LIM.lo) + X(LIM.hi)) / 2} y={ay - 122} size={24} color={C.green} anchor="middle" weight={800} ls={3} o={a(0.3)}>ACCEPTED BAND: 0.5 TO 100</Tx>
        <rect x={190} y={690} width={1240} height={72} fill={C.codeBg} stroke={C.red} strokeWidth={3} opacity={a(0.4)} />
        <Tx x={214} y={737} size={29} color={C.red} weight={700} o={a(0.4)}>{REFUSED_MSG}</Tx>
        <Tx x={1470} y={737} size={28} color={C.red} weight={800} mono={false} o={a(0.45)}>and no output</Tx>
        <Call x={160} y={726} n={1} color={C.red} o={a(0.4)} />
      </Svg>
    </Drift>
  );
};

/* ---------- 4. The length ---------- */
const Length: React.FC<SceneProps> = ({t, dur}) => {
  const a = (f: number, w = 0.6) => ep(t, f * dur, f * dur + w);
  const bx0 = 1200, bw = 480, ry = (i: number) => 440 + i * 92;
  return (
    <Drift t={t} dur={dur}>
      <Title text="The length" color={C.red} />
      <Counter label="samples short at 0.5" value={String(Math.round(1104 * prog(t, 0.08 * dur, 0.3 * dur)))} color={C.red} o={a(0.02)} />
      <Svg>
        <Frame no="IV" fig="Fig. 4. Samples out against samples expected (192000 divided by the speed). Pipe count and ffprobe duration_ts agree on every non-empty run." />
        <g opacity={a(0.02)}>
          <Tx x={150} y={380} size={22} color={C.dim} weight={700} ls={3}>FILTER</Tx>
          <Tx x={520} y={380} size={22} color={C.dim} weight={700} ls={3} anchor="end">EXPECTED</Tx>
          <Tx x={790} y={380} size={22} color={C.dim} weight={700} ls={3} anchor="end">OUT</Tx>
          <Tx x={1050} y={380} size={22} color={C.dim} weight={700} ls={3} anchor="end">SHORT BY</Tx>
          <Tx x={bx0} y={380} size={22} color={C.dim} weight={700} ls={3}>OUT AS A SHARE OF EXPECTED</Tx>
          <line x1={150} y1={398} x2={1760} y2={398} stroke={C.text} strokeWidth={1} />
        </g>
        {LENGTHS.map((r, i) => {
          const o = a(0.1 + i * 0.17), y = ry(i), share = r.got / r.want, pc = ep(t, (0.12 + i * 0.17) * dur, (0.12 + i * 0.17) * dur + 1.0);
          return (
            <g key={r.k} opacity={o}>
              <Tx x={150} y={y + 18} size={28} weight={800}>{r.k}</Tx>
              <Tx x={520} y={y + 18} size={30} color={C.dim} weight={700} anchor="end">{r.want}</Tx>
              <Tx x={790} y={y + 18} size={30} weight={800} anchor="end">{r.got}</Tx>
              <Tx x={1050} y={y + 18} size={30} color={C.red} weight={800} anchor="end">{r.want - r.got}</Tx>
              <rect x={bx0} y={y - 16} width={bw} height={44} fill="url(#hatch)" opacity={0.5} />
              <rect x={bx0} y={y - 16} width={bw * share * pc} height={44} fill={C.cyan} />
              <rect x={bx0} y={y - 16} width={bw} height={44} fill="none" stroke={C.text} strokeWidth={2} />
              <Tx x={bx0 + bw + 14} y={y + 16} size={24} color={C.text} weight={800}>{(share * 100).toFixed(share > 0.99 ? 2 : 1) + '%'}</Tx>
            </g>
          );
        })}
        <Call x={bx0 + bw * 0.78} y={ry(2) - 36} n={1} color={C.red} tx={bx0 + bw * 0.78} ty={ry(2) - 16} o={a(0.6)} />
        <Tx x={bx0 + bw * 0.78 + 30} y={ry(2) - 28} size={24} color={C.red} weight={700} mono={false} o={a(0.6)}>nearly half gone</Tx>
        <Tx x={150} y={812} size={24} color={C.dim} weight={500} mono={false} o={a(0.75)}>Chain 100 then 2 asks for a speed of 200: no error, an empty file.</Tx>
      </Svg>
    </Drift>
  );
};

/* ---------- 5. The pitch ---------- */
const Pitch: React.FC<SceneProps> = ({t, dur}) => {
  const a = (f: number, w = 0.6) => ep(t, f * dur, f * dur + w);
  const hx0 = 420, hw = 920, X = (hz: number) => hx0 + (hz / 4500) * hw, ry = (i: number) => 410 + i * 36 + (i >= 8 ? 20 : 0);
  return (
    <Drift t={t} dur={dur}>
      <Title text="The pitch" color={C.cyan} />
      <Counter label="tone at 0.5" value="999.87 Hz" o={a(0.06)} />
      <Svg>
        <Frame no="V" fig="Fig. 5. Pitch of the 1000 Hz tone after each filter. Reader 1: zero crossings. Reader 2: Goertzel magnitude at 1000 Hz." />
        <line x1={hx0} y1={392} x2={hx0 + hw} y2={392} stroke={C.mute} strokeWidth={2} />
        {[0, 1000, 2000, 3000, 4000].map((f) => (
          <g key={f} opacity={a(0.02)}>
            <line x1={X(f)} y1={386} x2={X(f)} y2={398} stroke={C.mute} strokeWidth={2} />
            <Tx x={X(f)} y={376} size={20} color={C.dim} anchor="middle" weight={600}>{f}</Tx>
          </g>
        ))}
        <Tx x={1560} y={376} size={20} color={C.dim} weight={700} anchor="end" ls={2} o={a(0.02)}>HZ</Tx>
        <Tx x={1760} y={376} size={20} color={C.dim} weight={700} anchor="end" ls={2} o={a(0.02)}>GOERTZEL</Tx>
        <line x1={X(1000)} y1={398} x2={X(1000)} y2={800} stroke={C.cyan} strokeWidth={2} strokeDasharray="8 8" opacity={a(0.04)} />
        <Tx x={X(1000) + 12} y={820} size={22} color={C.cyan} weight={700} mono={false} o={a(0.04)}>source 1000 Hz</Tx>
        {PITCH.map((r, i) => {
          const f = 0.08 + i * 0.065, o = a(f, 0.4), y = ry(i), cx = X(r.hz);
          return (
            <g key={r.k} opacity={o}>
              <Tx x={150} y={y + 8} size={24} color={r.ctl ? C.red : C.text} weight={700}>{r.k}</Tx>
              {r.ctl ? <rect x={cx - 10} y={y - 10} width={20} height={20} fill={C.red} transform={`rotate(45 ${cx} ${y})`} /> : <circle cx={cx} cy={y} r={10} fill={C.cyan} />}
              <Tx x={1560} y={y + 8} size={24} color={r.ctl ? C.red : C.text} weight={800} anchor="end">{r.hz.toFixed(r.hz === 500 ? 0 : 2)}</Tx>
              <Tx x={1760} y={y + 8} size={24} color={r.ctl ? C.red : C.text} weight={800} anchor="end">{r.g}</Tx>
              {r.note && <Tx x={cx + 22} y={y + 8} size={20} color={C.amber} weight={700} mono={false}>{r.note}</Tx>}
            </g>
          );
        })}
        <Call x={X(1000) + 90} y={470} n={1} color={C.cyan} tx={X(999.87)} ty={ry(0)} o={a(0.2)} />
        <Tx x={X(1000) + 118} y={478} size={24} color={C.cyan} weight={700} mono={false} o={a(0.2)}>atempo: all on the line</Tx>
        <Call x={X(2000) + 90} y={ry(9) - 30} n={2} color={C.red} tx={X(2000.02)} ty={ry(9)} o={a(0.55)} />
        <Tx x={X(2000) + 118} y={ry(9) - 22} size={24} color={C.red} weight={700} mono={false} o={a(0.55)}>resampling moves it</Tx>
      </Svg>
    </Drift>
  );
};

/* ---------- 6. The clicks ---------- */
const Clicks: React.FC<SceneProps> = ({t, dur}) => {
  const a = (f: number, w = 0.6) => ep(t, f * dur, f * dur + w);
  const sx0 = 430, sw = 1070, by = (i: number) => 410 + i * 86, h = 64;
  const split = 0.62, over = ep(t, split * dur, split * dur + 0.7), under = 1 - over;
  const n05 = Math.round(40 + 82 * prog(t, 0.2 * dur, 0.45 * dur));
  const E = HEX_05 as HexRow[];
  const rows: {row: HexRow; label: string; val: number; col: string}[] = [
    {row: HEX_SRC[0] as HexRow, label: 'source, sample 0', val: 29491, col: C.cyan},
    {row: E[0], label: 'sample 0', val: 29490, col: C.text},
    {row: E[1], label: 'sample 6848', val: 6521, col: C.red},
    {row: E[2], label: 'sample 8128', val: 29486, col: C.text},
    {row: E[3], label: 'sample 9408', val: 29478, col: C.text},
  ];
  return (
    <Drift t={t} dur={dur}>
      <Title text="The clicks" color={C.red} />
      <Counter label="events at 0.5" value={`${n05}`} color={C.red} o={a(0.03)} />
      <Svg>
        <Frame no="VI" fig={over < 0.5 ? 'Fig. 6a. Click events per output, each strip to its own length. Bar height is the level. Hairlines below: where an ideal click would sit.' : 'Fig. 6b. The first events of the atempo=0.5 output, as bytes. Each click was one sample, 29491.'} />
        <g opacity={under}>
          {STRIPS.map((s, i) => {
            const y = by(i), p = prog(t, (0.04 + i * 0.1) * dur, (0.16 + i * 0.1) * dur), col = s.ctl ? C.mute : C.text;
            const n = s.ev.length;
            return (
              <g key={s.k}>
                <Tx x={150} y={y - 18} size={25} color={s.ctl ? C.dim : C.text} weight={800} o={a(0.03 + i * 0.1)}>{s.k}</Tx>
                <line x1={sx0} y1={y} x2={sx0 + sw} y2={y} stroke={C.mute} strokeWidth={1} />
                {Array.from({length: 40}, (_, k) => <line key={k} x1={sx0 + ((k * 4800) / s.f / (192000 / s.f)) * sw} y1={y} x2={sx0 + ((k * 4800) / s.f / (192000 / s.f)) * sw} y2={y + 10} stroke={C.mute} strokeWidth={2} opacity={a(0.03 + i * 0.1)} />)}
                {s.ev.map(([pos, pk], k) => {
                  const x = sx0 + (pos / (192000 / s.f)) * sw;
                  return (k + 1) / n <= p + 0.001 && <line key={k} x1={x} y1={y} x2={x} y2={y - (h * pk) / FULL} stroke={pk >= 0.9 * FULL ? C.cyan : C.amber} strokeWidth={s.f === 4 ? 5 : 3} />;
                })}
                <Tx x={sx0 + sw + 40} y={y - 4} size={34} color={col} weight={800} o={a(0.12 + i * 0.1)}>{n}</Tx>
                <Tx x={sx0 + sw + 40 + String(n).length * 22 + 10} y={y - 4} size={22} color={C.dim} weight={600} mono={false} o={a(0.12 + i * 0.1)}>events</Tx>
              </g>
            );
          })}
          <Tx x={sx0} y={806} size={22} color={C.dim} weight={600} mono={false} o={a(0.5)}>Indigo: at least 0.9 of the original level. Ochre: a partial copy.</Tx>
          <Call x={sx0 - 58} y={by(1) - 30} n={1} color={C.red} tx={sx0 + (6848 / 384000) * sw} ty={by(1) - (h * 6521) / FULL} o={a(0.4)} />
        </g>
        <g opacity={over}>
          <HexHead />
          {rows.map((r, i) => {
            const y = 430 + i * 64 + (i > 0 ? 18 : 0);
            return (
              <g key={i}>
                <HexLine y={y} row={r.row} tint={r.col === C.text ? C.text : r.col} />
                <Circ cx={(bx(0) + bx(1)) / 2 + (0)} cy={y - 11} rx={57} ry={26} p={prog(t, (split + 0.04 + i * 0.05) * dur, (split + 0.1 + i * 0.05) * dur)} color={r.col === C.text ? C.red : r.col} />
                <Tx x={1650} y={y} size={28} color={r.col} weight={800}>{r.val}</Tx>
                <Tx x={1650} y={y + 24} size={18} color={C.dim} weight={600} mono={false}>{r.label}</Tx>
              </g>
            );
          })}
          <line x1={150} y1={474} x2={1730} y2={474} stroke={C.line} strokeWidth={1} />
          <Tx x={150} y={812} size={24} color={C.dim} weight={500} mono={false}>An ideal 0.5 output has clicks at samples 0, 9600 and 19200. This one has events at 0, 6848, 8128 and 9408.</Tx>
        </g>
      </Svg>
    </Drift>
  );
};

/* ---------- 7. What to check ---------- */
/* the ink is a palette key, read at render time: the palette is applied per render, so C must not be captured at module load */
const FIND: {no: number; k: string; v: string; c: 'green' | 'amber' | 'cyan' | 'red'}[] = [
  {no: 1, k: 'Range', v: '0.5 to 100 here. 0.25, 0.4, 100.5 and 200 are refused.', c: 'green'},
  {no: 2, k: 'Length', v: 'Close, not exact: 1104 samples short at 0.5, 1024 of 1920 at 100.', c: 'amber'},
  {no: 3, k: 'Pitch', v: 'Holds: 999.87 Hz at 0.5. Resampling gives 500 Hz.', c: 'cyan'},
  {no: 4, k: 'Clicks', v: '40 in, 122 out at 0.5. Speed 1 gives 55. Resampling keeps 40.', c: 'red'},
];
const Close: React.FC<SceneProps> = ({t, dur}) => {
  const d = Math.min(dur, 13.5); /* the scene also holds the end card: time the rows to the narration */
  const a = (f: number, w = 0.6) => ep(t, f * d, f * d + w);
  return (
    <Drift t={t} dur={dur}>
      <Title text="What to check" color={C.cyan} />
      <Svg>
        <Frame no="VII" fig="Fig. 7. Findings on ffmpeg 6.1.1, synthetic tone and clicks only." />
        {FIND.map((r, i) => {
          const y = 372 + i * 92, o = a(0.06 + i * 0.16);
          return (
            <g key={r.no} opacity={o}>
              <line x1={150} y1={y + 68} x2={1730} y2={y + 68} stroke={C.line} strokeWidth={1} />
              <Call x={178} y={y + 30} n={r.no} color={C[r.c]} />
              <Tx x={236} y={y + 40} size={36} color={C[r.c]} weight={800} mono={false}>{r.k}</Tx>
              <Tx x={470} y={y + 38} size={28} color={C.text} weight={600} mono={false}>{r.v}</Tx>
            </g>
          );
        })}
        <Tx x={150} y={776} size={25} color={C.dim} weight={600} mono={false} o={a(0.72)}>Not tested: speech, music, other builds, other filter settings. A single sample click is the hardest case.</Tx>
        <Tx x={150} y={808} size={22} color={C.mute} weight={500} mono={false} o={a(0.8)}>FFmpeg Reality Checks, episode 66. Fixture and tests in the description.</Tx>
      </Svg>
    </Drift>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, range: Range, length: Length, pitch: Pitch, clicks: Clicks, close: Close};
