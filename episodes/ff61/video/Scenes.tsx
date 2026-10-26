import React from 'react';
import {C, F, D} from '../../kit/theme';
import {ep, prog, rnd} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Vox flat graphics. Bold flat blocks of the lab inks, split screens, annotated freeze frames (a row by row zoom with a hand drawn circle and an arrow),
 * giant numbers, and labeled bars drawn to scale. Every number comes from episodes/ff61/fixture/experiment.mjs (1920x1080 frames, ffmpeg 6.1.1):
 * 10 bar layouts x 9 values of round = 90 runs, read by the crop line and by Node on the decoded pixels.
 */

/* evidence, in the order of the ten layouts: 1+1, 2+2, 5+5, 3+10, 138+138, 141+141, 140+140, none, sides 141+141, all four sides */
const LAYOUTS = ['1 | 1', '2 | 2', '5 | 5', '3 | 10', '138 | 138', '141 | 141', '140 | 140', 'no bars', 'sides 141 | 141', '38 | 38 + 141 | 141'];
const LOST_DEFAULT = [6, 4, 14, 11, 4, 14, 0, 8, 14, 18]; // rows + columns of picture thrown away at the default (round 16)
const LOST_ROUND2 = [2, 0, 2, 1, 0, 2, 0, 0, 2, 2]; // the same at round=2
const ROUND_NAMES = ['default', '0', '1', '2', '3', '4', '8', '16', '32'];
const ROUND_LOST = [6, 6, 6, 2, 4, 2, 6, 6, 22]; // rows lost on the 1078 row picture, by value of round
const ROUND_H = [1072, 1072, 1072, 1076, 1074, 1076, 1072, 1072, 1056];

const beatOf = (t: number, starts: number[]) => { let i = 0; for (let k = 0; k < starts.length; k++) if (t >= starts[k]) i = k; return {i, lt: t - starts[i]}; };
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
type K = 'cyan' | 'amber' | 'red' | 'green' | 'text' | 'bg2' | 'panel' | 'mute' | 'dim' | 'line';

/* ---------- flat blocks, wipes, giant numbers ---------- */
const Page: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, background: C.bg, overflow: 'hidden'}}>{children}</div>
);
const Blk: React.FC<{x: number; y: number; w: number; h: number; k: K; o?: number; dy?: number; children?: React.ReactNode}> = ({x, y, w, h, k, o = 1, dy = 0, children}) => (
  <div style={{position: 'absolute', left: x, top: y + dy, width: w, height: h, background: C[k], opacity: o, boxSizing: 'border-box'}}>{children}</div>
);
const Tag: React.FC<{text: string; color?: string; x?: number; y?: number; size?: number; w?: number; align?: 'left' | 'center' | 'right'; o?: number}> = ({text, color = C.bg, x = 28, y = 22, size = 26, w, align = 'left', o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, textAlign: align, opacity: o, fontFamily: F.mono, fontSize: size, letterSpacing: 2, textTransform: 'uppercase', color, whiteSpace: 'nowrap'}}>{text}</div>
);
const Giant: React.FC<{text: string; color?: string; size: number; x: number; y: number; w: number; align?: 'left' | 'center' | 'right'; o?: number}> = ({text, color = C.bg, size, x, y, w, align = 'center', o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, textAlign: align, opacity: o, fontFamily: F.display, fontWeight: 900, fontSize: size * D.k * 0.8, lineHeight: 0.92, color, letterSpacing: 1, whiteSpace: 'nowrap'}}>{text}</div>
);
const Line: React.FC<{text: string; x: number; y: number; size?: number; color?: string; w?: number; align?: 'left' | 'center' | 'right'; mono?: boolean; o?: number; bold?: boolean}> = ({text, x, y, size = 36, color = C.text, w = 800, align = 'left', mono = false, o = 1, bold = false}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, textAlign: align, opacity: o, fontFamily: mono ? F.mono : F.sans, fontSize: size, fontWeight: bold ? 700 : 400, lineHeight: 1.22, color, whiteSpace: 'pre-wrap'}}>{text}</div>
);
const Wipe: React.FC<{t: number; starts: number[]; k?: K}> = ({t, starts, k = 'text'}) => {
  const hit = starts.slice(1).find((s) => t >= s && t < s + 0.3);
  if (hit === undefined) return null;
  const p = prog(t, hit, hit + 0.3);
  return <div style={{position: 'absolute', top: 0, height: 1080, width: 300, left: lerp(-300, 1920, p), background: C[k]}} />;
};

/* ---------- hand drawn circle and arrow (drawn on, pathLength dash) ---------- */
const Circle: React.FC<{cx: number; cy: number; rx: number; ry: number; p: number; seed?: number; color?: string; sw?: number}> = ({cx, cy, rx, ry, p, seed = 3, color = C.text, sw = 7}) => {
  const n = 28;
  const pts = Array.from({length: n + 6}, (_, i) => { const a = (i / n) * Math.PI * 2 - 1.2; const j = 1 + (rnd(seed * 31 + i) - 0.5) * 0.07 + i * 0.0035; return [cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]; });
  const d = pts.map((q, i) => `${i === 0 ? 'M' : 'L'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' ');
  return <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}><path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1 - p} /></svg>;
};
const Arrow: React.FC<{x1: number; y1: number; x2: number; y2: number; p: number; color?: string; sw?: number}> = ({x1, y1, x2, y2, p, color = C.text, sw = 7}) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx = (s: number) => [x2 - Math.cos(a + s) * 28, y2 - Math.sin(a + s) * 28];
  const h1 = hx(0.45), h2 = hx(-0.45);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      <path d={`M${x1} ${y1} L${x2} ${y2}`} pathLength={1} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - Math.min(1, p * 1.25)} />
      {p > 0.8 && <path d={`M${h1[0]} ${h1[1]} L${x2} ${y2} L${h2[0]} ${h2[1]}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity={prog(p, 0.8, 1)} />}
    </svg>
  );
};

/* ---------- row by row freeze frame: one cell per picture row at an edge of the frame ---------- */
type RowKind = 'bar' | 'lost' | 'kept';
const ROWCOL: Record<RowKind, K> = {bar: 'text', lost: 'red', kept: 'green'};
const RowStack: React.FC<{x: number; y: number; w: number; ch: number; rows: {n: number; kind: RowKind}[]; shown: number}> = ({x, y, w, ch, rows, shown}) => (
  <>
    {rows.map((r, i) => {
      const p = ep(shown, i * 0.35, i * 0.35 + 0.35);
      if (p <= 0) return null;
      return (
        <div key={i} style={{position: 'absolute', left: x, top: y + i * ch, width: w * p, height: ch - 3, background: C[ROWCOL[r.kind]], overflow: 'hidden'}}>
          <span style={{position: 'absolute', left: 14, top: 0, lineHeight: `${ch - 3}px`, fontFamily: F.mono, fontSize: Math.min(26, ch - 10), color: C.bg, letterSpacing: 1, whiteSpace: 'nowrap'}}>{`row ${r.n}`}</span>
          <span style={{position: 'absolute', right: 14, top: 0, lineHeight: `${ch - 3}px`, fontFamily: F.mono, fontSize: Math.min(24, ch - 12), color: C.bg, letterSpacing: 1, whiteSpace: 'nowrap'}}>{r.kind === 'bar' ? 'black bar' : r.kind === 'lost' ? 'picture, thrown away' : 'picture, kept'}</span>
        </div>
      );
    })}
  </>
);

/* ---------- mini frame (a layout, to scale) ---------- */
const Mini: React.FC<{x: number; y: number; s: number; T: number; B: number; L: number; R: number; label: string; o?: number}> = ({x, y, s, T, B, L, R, label, o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, opacity: o}}>
    <div style={{position: 'relative', width: 1920 * s, height: 1080 * s, background: C.text}}>
      <div style={{position: 'absolute', left: L * s, top: T * s, width: (1920 - L - R) * s, height: (1080 - T - B) * s, background: C.mute}} />
    </div>
    <div style={{fontFamily: F.mono, fontSize: 22, color: C.text, marginTop: 8, whiteSpace: 'nowrap', width: 1920 * s, textAlign: 'center'}}>{label}</div>
  </div>
);

/* ---------- labeled horizontal bars drawn to scale ---------- */
const Bars: React.FC<{x: number; y: number; w: number; unit: number; rows: {label: string; v: number; k: K; sub?: string}[]; rh?: number; reveal: number; labelW?: number; size?: number}> = ({x, y, w, unit, rows, rh = 50, reveal, labelW = 260, size = 26}) => (
  <>
    {rows.map((r, i) => {
      const p = ep(reveal, i * 0.12, i * 0.12 + 0.5);
      return (
        <div key={i} style={{position: 'absolute', left: x, top: y + i * rh, width: w + labelW + 130, height: rh - 8, opacity: p > 0 ? 1 : 0}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: labelW - 14, height: rh - 8, lineHeight: `${rh - 8}px`, textAlign: 'right', fontFamily: F.mono, fontSize: size, color: C.text, whiteSpace: 'nowrap'}}>{r.label}</div>
          <div style={{position: 'absolute', left: labelW, top: 0, width: Math.max(r.v > 0 ? 6 : 0, r.v * unit * p), height: rh - 8, background: C[r.k]}} />
          <div style={{position: 'absolute', left: labelW + r.v * unit * p + 14, top: 0, lineHeight: `${rh - 8}px`, fontFamily: F.display, fontWeight: 900, fontSize: 40 * D.k * 0.8, color: C[r.k === 'green' ? 'green' : r.k === 'amber' ? 'amber' : r.k === 'red' ? 'red' : 'text'], opacity: p}}>{Math.round(r.v * p)}</div>
        </div>
      );
    })}
  </>
);

/* 1. The question */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const rows: {n: number; kind: RowKind}[] = [{n: 0, kind: 'bar'}, {n: 1, kind: 'lost'}, {n: 2, kind: 'lost'}, {n: 3, kind: 'lost'}, {n: 4, kind: 'kept'}, {n: 5, kind: 'kept'}, {n: 6, kind: 'kept'}, {n: 7, kind: 'kept'}, {n: 8, kind: 'kept'}];
  const CH = 44, RY = 480;
  const dx1 = (1 - ep(t, 0, 0.5)) * -80, dx2 = (1 - ep(t, 0.15, 0.65)) * 80;
  return (
    <Page>
      <Blk x={60} y={130} w={880} h={300} k="cyan" dy={0} o={ep(t, 0, 0.3)}>
        <Tag text="the picture is" y={20} x={30} />
        <Giant text="1078" size={200} x={dx1} y={60} w={880} />
        <Tag text="rows high" y={256} x={0} w={880} align="center" size={28} />
      </Blk>
      <Blk x={980} y={130} w={880} h={300} k="red" o={ep(t, 0.15, 0.45)}>
        <Tag text="cropdetect says" y={20} x={30} />
        <Giant text="1072" size={200} x={dx2} y={60} w={880} />
        <Tag text="rows in the crop" y={256} x={0} w={880} align="center" size={28} />
      </Blk>
      <RowStack x={140} y={RY} w={600} ch={CH} rows={rows} shown={Math.max(0, (t - A(0.22)) * 4)} />
      <Line text="top edge of the frame, row by row" x={140} y={RY - 40} size={26} mono color={C.dim} w={700} o={ep(t, A(0.22), A(0.3))} />
      <Circle cx={440} cy={RY + 2 * CH + 14} rx={340} ry={80} p={prog(t, A(0.5), A(0.62))} seed={5} color={C.text} />
      <Arrow x1={1180} y1={RY + 2 * CH + 20} x2={800} y2={RY + 2 * CH + 20} p={prog(t, A(0.6), A(0.68))} />
      <Blk x={1190} y={RY + 40} w={640} h={140} k="amber" o={ep(t, A(0.58), A(0.66))}>
        <Giant text="3 ROWS" size={110} x={0} y={24} w={640} />
      </Blk>
      <Line text="picture starts at row 1, the crop at row 4" x={1190} y={RY + 200} size={28} w={640} color={C.text} o={ep(t, A(0.64), A(0.72))} />
      <Line text="the same at the bottom edge: 6 rows in all" x={1190} y={RY + 280} size={28} w={640} color={C.red} bold o={ep(t, A(0.78), A(0.86))} />
    </Page>
  );
};

/* 2. Frames, two readers */
const Setup: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const cfg = [[1, 1, 0, 0], [2, 2, 0, 0], [5, 5, 0, 0], [3, 10, 0, 0], [138, 138, 0, 0], [141, 141, 0, 0], [140, 140, 0, 0], [0, 0, 0, 0], [0, 0, 141, 141], [38, 38, 141, 141]];
  const S = 0.15;
  return (
    <Page>
      <Tag text="1920 x 1080, gray picture in black bars: top | bottom" color={C.dim} x={120} y={128} size={26} o={ep(t, 0, 0.3)} />
      {cfg.map((c, i) => {
        const col = i % 5, row = Math.floor(i / 5);
        return <Mini key={i} x={120 + col * 346} y={176 + row * 214} s={S} T={c[0]} B={c[1]} L={c[2]} R={c[3]} label={LAYOUTS[i]} o={ep(t, 0.1 + i * 0.18, 0.4 + i * 0.18)} />;
      })}
      <Blk x={120} y={600} w={560} h={270} k="amber" o={ep(t, A(0.34), A(0.42))} dy={(1 - ep(t, A(0.34), A(0.42))) * 40}>
        <Tag text="reader 1" y={18} />
        <Line text="the crop line the filter prints" x={28} y={64} size={30} color={C.bg} w={510} />
        <Line text="crop=1920:1072:0:4" x={28} y={170} size={40} mono color={C.bg} w={520} bold />
      </Blk>
      <Blk x={700} y={600} w={560} h={270} k="green" o={ep(t, A(0.52), A(0.6))} dy={(1 - ep(t, A(0.52), A(0.6))) * 40}>
        <Tag text="reader 2" y={18} />
        <Line text="Node finds the picture in the pixels, applies the crop, counts" x={28} y={64} size={28} color={C.bg} w={510} />
        <Line text={'11520 picture pixels\nthrown away'} x={28} y={172} size={34} mono color={C.bg} w={520} bold />
      </Blk>
      <Blk x={1280} y={600} w={560} h={270} k="text" o={ep(t, A(0.74), A(0.82))} dy={(1 - ep(t, A(0.74), A(0.82))) * 40}>
        <Tag text="control" y={18} />
        <Giant text="140 | 140" size={100} x={0} y={62} w={560} />
        <Line text="exact crop, 0 rows lost" x={0} y={172} size={30} color={C.bg} w={560} align="center" />
        <Line text="crop=1920:800:0:140" x={0} y={218} size={28} mono color={C.greenDim} w={560} align="center" />
      </Blk>
    </Page>
  );
};

/* 3. The default */
const Default: React.FC<SceneProps> = ({t, dur}) => {
  const starts = [0, 0.27 * dur, 0.58 * dur];
  const {i, lt} = beatOf(t, starts);
  const items = [
    {from: 1078, to: 1072, lost: 6, label: 'bars of 1 and 1', mult: '67 x 16'},
    {from: 1070, to: 1056, lost: 14, label: 'bars of 5 and 5', mult: '66 x 16'},
    {from: 1080, to: 1072, lost: 8, label: 'no bars at all', mult: '67 x 16'},
  ];
  return (
    <Page>
      {i === 0 && (
        <>
          <Blk x={60} y={150} w={500} h={420} k="cyan" o={ep(lt, 0, 0.3)}><Tag text="picture rows" y={20} /><Giant text="1078" size={230} x={0} y={110} w={500} /></Blk>
          <Giant text="->" size={160} color={C.text} x={560} y={240} w={300} o={ep(lt, 0.5, 0.9)} />
          <Blk x={860} y={150} w={500} h={420} k="red" o={ep(lt, 0.6, 0.9)}><Tag text="crop height" y={20} /><Giant text="1072" size={230} x={0} y={110} w={500} /></Blk>
          <Blk x={1400} y={150} w={460} h={420} k="amber" o={ep(lt, 1.2, 1.5)}><Tag text="round 16" y={20} /><Giant text="67 x 16" size={120} x={0} y={140} w={460} /><Line text="rounded down, never to the nearest" x={0} y={290} size={26} color={C.bg} w={460} align="center" /></Blk>
          <Line text="the default is round=16: height and width become multiples of 16" x={60} y={640} size={36} w={1700} color={C.text} o={ep(lt, 1.8, 2.2)} />
        </>
      )}
      {i === 1 && items.map((it, k) => (
        <Blk key={k} x={60} y={150 + k * 235} w={1800} h={205} k={k === 1 ? 'red' : k === 2 ? 'amber' : 'cyan'} o={ep(lt, k * 0.9, k * 0.9 + 0.3)} dy={(1 - ep(lt, k * 0.9, k * 0.9 + 0.3)) * 30}>
          <Tag text={it.label} y={16} />
          <Giant text={`${it.from} -> ${it.to}`} size={112} x={30} y={52} w={1000} align="left" />
          <Giant text={`${it.lost} lost`} size={112} x={1000} y={52} w={760} align="right" />
          <Tag text={it.mult} x={30} y={170} size={26} />
        </Blk>
      ))}
      {i === 2 && (
        <>
          <Tag text="rows + columns of picture thrown away at the default" color={C.dim} x={80} y={128} size={24} o={ep(lt, 0, 0.3)} />
          <Bars x={50} y={170} w={900} unit={36} rows={LAYOUTS.map((l, k) => ({label: l, v: LOST_DEFAULT[k], k: (LOST_DEFAULT[k] === 0 ? 'green' : 'red') as K}))} rh={69} reveal={lt * 1.4} labelW={420} size={24} />
          <Blk x={1460} y={170} w={400} h={330} k="red" o={ep(lt, 0.2, 0.5)}><Giant text="9 of 10" size={110} x={0} y={70} w={400} /><Line text="layouts lose picture" x={0} y={200} size={28} color={C.bg} w={400} align="center" /></Blk>
          <Blk x={1460} y={530} w={400} h={280} k="green" o={ep(lt, 1.4, 1.7)}><Giant text="0" size={150} x={0} y={30} w={400} /><Line text="black pixels kept in all 90 runs" x={20} y={186} size={26} color={C.bg} w={360} align="center" /></Blk>
        </>
      )}
      <Wipe t={t} starts={starts} k="red" />
    </Page>
  );
};

/* 4. Other values of round */
const Values: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const col = (i: number): K => {
    if (i === 8) return t >= A(0.72) ? 'red' : 'mute';
    if (i === 4) return t >= A(0.55) ? 'amber' : 'mute';
    if (i === 3 || i === 5) return t >= A(0.04) ? 'green' : 'mute';
    return t >= A(0.2) ? 'red' : 'mute';
  };
  return (
    <Page>
      <Tag text="1078 row picture: rows thrown away, by value of round" color={C.dim} x={80} y={128} size={24} />
      <Bars x={50} y={176} w={720} unit={34} rows={ROUND_NAMES.map((n, k) => ({label: `round=${n}`, v: ROUND_LOST[k], k: col(k), sub: `${ROUND_H[k]}`}))} rh={74} reveal={t * 2.2} labelW={280} size={28} />
      <Blk x={1160} y={170} w={700} h={300} k="red" o={ep(t, A(0.24), A(0.34))} dy={(1 - ep(t, A(0.24), A(0.34))) * 40}>
        <Tag text="round=0 and round=1" y={18} />
        <Giant text="= 16" size={200} x={0} y={66} w={700} />
        <Line text="the same crop, in all 10 layouts" x={0} y={262} size={28} color={C.bg} w={700} align="center" />
      </Blk>
      <Blk x={1160} y={500} w={700} h={150} k="green" o={ep(t, A(0.05), A(0.15))} dy={(1 - ep(t, A(0.05), A(0.15))) * 40}>
        <Tag text="round=2 and round=4" y={14} />
        <Giant text="2 rows" size={90} x={0} y={50} w={700} />
      </Blk>
      <Blk x={1160} y={680} w={700} h={170} k="amber" o={ep(t, A(0.56), A(0.66))} dy={(1 - ep(t, A(0.56), A(0.66))) * 40}>
        <Tag text="round=3" y={14} />
        <Giant text="1074" size={90} x={0} y={50} w={700} />
        <Line text="a multiple of 6" x={0} y={128} size={24} color={C.bg} w={700} align="center" />
      </Blk>
      <Blk x={1160} y={500} w={700} h={350} k="red" o={ep(t, A(0.74), A(0.84))} dy={(1 - ep(t, A(0.74), A(0.84))) * 40}>
        <Tag text="round=32" y={18} />
        <Giant text="1056" size={190} x={0} y={60} w={700} />
        <Line text="22 rows lost" x={0} y={250} size={44} color={C.bg} w={700} align="center" bold />
      </Blk>
    </Page>
  );
};

/* 5. The even offset */
const Even: React.FC<SceneProps> = ({t, dur}) => {
  const starts = [0, 0.3 * dur, 0.63 * dur];
  const {i, lt} = beatOf(t, starts);
  const rows: {n: number; kind: RowKind}[] = [{n: 0, kind: 'bar'}, {n: 1, kind: 'lost'}, {n: 2, kind: 'kept'}, {n: 3, kind: 'kept'}, {n: 4, kind: 'kept'}, {n: 5, kind: 'kept'}, {n: 6, kind: 'kept'}];
  const CH = 60;
  return (
    <Page>
      {i === 0 && (
        <>
          <Tag text="round=2, a 1 row bar: top edge, row by row" color={C.dim} x={140} y={128} size={26} o={ep(lt, 0, 0.3)} />
          <RowStack x={140} y={190} w={720} ch={CH} rows={rows} shown={lt * 2.2} />
          <Circle cx={500} cy={190 + CH * 1.5 - 2} rx={420} ry={42} p={prog(lt, 2.4, 3.1)} seed={9} />
          <Arrow x1={1160} y1={190 + CH * 1.5} x2={900} y2={190 + CH * 1.5} p={prog(lt, 3.0, 3.5)} />
          <Blk x={1170} y={160} w={690} h={170} k="amber" o={ep(lt, 2.8, 3.2)}><Giant text="y = 2" size={120} x={0} y={26} w={690} /></Blk>
          <Line text="picture starts at row 1, the crop can only start at an even row" x={1170} y={350} size={30} w={690} o={ep(lt, 3.4, 3.9)} />
          <Line text="1 row of picture lost, at each edge" x={1170} y={470} size={34} w={690} color={C.red} bold o={ep(lt, 4.4, 4.9)} />
        </>
      )}
      {i === 1 && (
        <>
          {[{k: 'red' as K, big: '2', top: 'bars 1 | 1', sub: 'rows lost'}, {k: 'amber' as K, big: '1', top: 'bars 3 | 10', sub: 'row lost'}, {k: 'cyan' as K, big: '2', top: 'sides 141 | 141', sub: 'columns lost'}].map((b, k) => (
            <Blk key={k} x={60 + k * 610} y={150} w={580} h={620} k={b.k} o={ep(lt, k * 1.1, k * 1.1 + 0.3)} dy={(1 - ep(lt, k * 1.1, k * 1.1 + 0.3)) * 40}>
              <Tag text={b.top} y={22} size={30} />
              <Giant text={b.big} size={420} x={0} y={110} w={580} />
              <Line text={b.sub} x={0} y={520} size={42} color={C.bg} w={580} align="center" bold />
            </Blk>
          ))}
          <Line text="at round=2, each odd bar costs one row or column; each even bar costs none" x={60} y={800} size={30} w={1800} o={ep(lt, 3.6, 4.0)} />
        </>
      )}
      {i === 2 && (
        <>
          {['gray', 'yuv444p', 'yuv420p'].map((pf, k) => (
            <Blk key={pf} x={60 + k * 610} y={150} w={580} h={600} k={k === 0 ? 'cyan' : k === 1 ? 'amber' : 'green'} o={ep(lt, k * 0.6, k * 0.6 + 0.3)}>
              <Tag text={pf} y={22} size={32} />
              <Line text="bars 3 | 1, round=2" x={0} y={90} size={28} color={C.bg} w={580} align="center" />
              <Giant text="y = 4" size={230} x={0} y={170} w={580} />
              <Line text="1920:1074:0:4" x={0} y={440} size={44} mono color={C.bg} w={580} align="center" bold />
            </Blk>
          ))}
          <Line text="the same crop in all three: the even rule is in the filter, not in the format" x={60} y={790} size={30} w={1800} o={ep(lt, 2.0, 2.4)} />
        </>
      )}
      <Wipe t={t} starts={starts} k="amber" />
    </Page>
  );
};

/* 6. What to do (the last 10.5 s sit under the end card, so the beats fill the first dur - 10.5 s) */
const Close: React.FC<SceneProps> = ({t, dur}) => {
  const D2 = Math.max(12, dur - 10.5);
  const A = (f: number) => f * D2;
  const items: {k: K; n: string; head: string; sub: string; at: number}[] = [
    {k: 'green', n: '1', head: 'round=2', sub: 'even sizes, nothing lost on even bars', at: 0.02},
    {k: 'amber', n: '2', head: 'an odd bar costs a row', sub: 'x and y are always even', at: 0.2},
    {k: 'red', n: '3', head: 'round=1 is not exact', sub: 'it gives the same crop as 16', at: 0.38},
  ];
  return (
    <Page>
      {items.map((it) => (
        <Blk key={it.n} x={60} y={140 + (Number(it.n) - 1) * 200} w={1160} h={175} k={it.k} o={ep(t, A(it.at), A(it.at) + 0.3)} dy={(1 - ep(t, A(it.at), A(it.at) + 0.3)) * 40}>
          <Giant text={it.n} size={170} x={20} y={14} w={150} align="left" />
          <Line text={it.head} x={190} y={22} size={46} color={C.bg} w={940} bold />
          <Line text={it.sub} x={190} y={98} size={30} color={C.bg} w={940} />
        </Blk>
      ))}
      <Blk x={1260} y={140} w={600} h={375} k="text" o={ep(t, A(0.58), A(0.58) + 0.3)}>
        <Tag text="to keep every row" y={20} />
        <Line text="find the box in the pixels yourself" x={28} y={80} size={38} color={C.bg} w={540} bold />
        <Line text="scan luma above the limit, take min and max of x and y" x={28} y={210} size={28} color={C.bg} w={540} />
      </Blk>
      <Blk x={1260} y={540} w={600} h={235} k="dim" o={ep(t, A(0.78), A(0.78) + 0.3)}>
        <Tag text="not tested" y={18} />
        <Line text={'other builds, interlaced video,\nreal footage, the limit\nand skip options'} x={28} y={70} size={28} color={C.bg} w={560} />
      </Blk>
    </Page>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, setup: Setup, default: Default, values: Values, even: Even, close: Close};

