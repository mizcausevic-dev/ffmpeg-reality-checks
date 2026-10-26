import React from 'react';
import {C, F} from '../../kit/theme';
import {ep, prog, blink, rnd} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Illustrated scenario. Flat vector story panels with objects only (projector, screen, speaker, clock, film strip),
 * a short storyboard, then the measured proof drawn from evidence.json (written by episodes/ff75/fixture/run.mjs, ffmpeg 6.1.1).
 * The peach cards are the real counter frames (luma 60 + 3 n, cb 100, cr 150) converted to RGB; added black is drawn in ink.
 */

const DATA = {"hash": {"first": "d9353649", "last": "ae201d8c", "black": "910380cd"}, "add": {"frames": 75, "added": 25, "y": 16, "u": 128, "v": 128}, "clone": {"added": 25, "eq": true}, "startClone": {"added": 5, "eq": true}, "cloneOnly": 50, "both": {"added": 25, "frames": 75}, "stop10": 10, "round": [{"s": 0.01, "ask": 0.25, "added": 0}, {"s": 0.02, "ask": 0.5, "added": 1}, {"s": 0.05, "ask": 1.25, "added": 1}, {"s": 0.06, "ask": 1.5, "added": 2}, {"s": 0.1, "ask": 2.5, "added": 3}, {"s": 0.3, "ask": 7.5, "added": 8}, {"s": 0.5, "ask": 12.5, "added": 13}], "fps": [{"fps": 24, "add1": 24}, {"fps": 25, "add1": 25}, {"fps": 30, "add1": 30}], "audio": {"samples": 16000, "level": 16384, "added": 8000, "zero": true, "first": 0, "silence": 2}, "mux": {"tpadOnly": {"v": 75, "a": 16000, "fmt": 3}, "tpadShortest": {"v": 50, "a": 16000, "fmt": 2}, "tpadApad": {"v": 75, "a": 24000, "fmt": 3}, "tpadApadShortest": {"v": 75, "a": 24000, "fmt": 3}}};

/* ---------- helpers ---------- */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const yuv = (y: number, u: number, v: number) => {
  const c = 1.164 * (y - 16);
  const q = (x: number) => Math.round(clamp(x, 0, 255));
  return `rgb(${q(c + 1.596 * (v - 128))},${q(c - 0.392 * (u - 128) - 0.813 * (v - 128))},${q(c + 2.017 * (u - 128))})`;
};
const cardFill = (n: number) => yuv(60 + 3 * n, 100, 150);
const cardInk = (n: number) => (60 + 3 * n > 130 ? C.text : C.bg);
const typed = (s: string, t: number, a: number, cps = 40) => s.slice(0, Math.max(0, Math.floor((t - a) * cps)));

const Stage: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <>
    <div style={{position: 'absolute', inset: 0, background: C.bg}} />
    {children}
  </>
);
const Svg: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', left: 0, top: 0}}>{children}</svg>
);
/** fade and rise for svg groups */
const G: React.FC<{t: number; a: number; d?: number; dy?: number; children?: React.ReactNode}> = ({t, a, d = 0.3, dy = 10, children}) => {
  const p = ep(t, a, a + d);
  if (p <= 0) return null;
  return <g opacity={p} transform={`translate(0,${(1 - p) * dy})`}>{children}</g>;
};
/** fade and rise for html (children use page coordinates) */
const H: React.FC<{t: number; a: number; d?: number; dy?: number; children?: React.ReactNode}> = ({t, a, d = 0.3, dy = 10, children}) => {
  const p = ep(t, a, a + d);
  if (p <= 0) return null;
  return <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, opacity: p, transform: `translateY(${(1 - p) * dy}px)`}}>{children}</div>;
};
type TxProps = {x: number; y: number; size: number; font?: string; color?: string; weight?: number; w?: number; align?: 'left' | 'center' | 'right'; lh?: number; ls?: number; pre?: boolean; style?: React.CSSProperties; children?: React.ReactNode};
const Tx: React.FC<TxProps> = ({x, y, size, font, color, weight, w, align, lh = 1.2, ls, pre, style, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, fontFamily: font ?? F.sans, fontSize: size, fontWeight: weight, color: color ?? C.text, textAlign: align, lineHeight: lh, letterSpacing: ls, whiteSpace: pre ? 'pre' : w ? 'normal' : 'nowrap', ...style}}>{children}</div>
);
const Big: React.FC<Omit<TxProps, 'font' | 'weight' | 'lh'>> = (p) => <Tx {...p} font={F.display} weight={800} lh={1} />;
const Mono: React.FC<Omit<TxProps, 'font'>> = (p) => <Tx {...p} font={F.mono} />;

const ringPath = (cx: number, cy: number, rx: number, ry: number, seed: number) => {
  const pts: string[] = [];
  const n = 36;
  for (let i = 0; i <= n + 3; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const j = 1 + (rnd(seed + (i % n)) - 0.5) * 0.07 + i * 0.0015;
    pts.push(`${(cx + Math.cos(a) * rx * j).toFixed(1)},${(cy + Math.sin(a) * ry * j).toFixed(1)}`);
  }
  return 'M' + pts.join(' L');
};
const Ring: React.FC<{cx: number; cy: number; rx: number; ry: number; seed: number; p: number; color?: string; sw?: number}> = ({cx, cy, rx, ry, seed, p, color, sw = 6}) =>
  p <= 0 ? null : <path d={ringPath(cx, cy, rx, ry, seed)} fill="none" stroke={color ?? C.red} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} />;
const Check: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
  <path d={`M${x} ${y + 12 * s} L${x + 9 * s} ${y + 22 * s} L${x + 26 * s} ${y}`} fill="none" stroke={C.green} strokeWidth={7 * s} strokeLinecap="square" strokeLinejoin="miter" />
);

/* ---------- objects ---------- */
const Screen: React.FC<{x: number; y: number; w: number; h: number; fill: string; label?: string; lc?: string; size?: number}> = ({x, y, w, h, fill, label, lc, size = 90}) => (
  <g>
    <rect x={x - 12} y={y - 12} width={w + 24} height={h + 24} fill={C.text} />
    <rect x={x} y={y} width={w} height={h} fill={fill} />
    {label ? <text x={x + w / 2} y={y + h / 2 + size * 0.34} textAnchor="middle" fontFamily={F.display} fontWeight={800} fontSize={size} fill={lc ?? C.text}>{label}</text> : null}
    <rect x={x + w / 2 - 6} y={y + h + 12} width={12} height={34} fill={C.text} />
    <rect x={x + w / 2 - 66} y={y + h + 46} width={132} height={10} fill={C.text} />
  </g>
);
const Speaker: React.FC<{x: number; y: number; s?: number; waves?: number}> = ({x, y, s = 1, waves = 0}) => (
  <g>
    <rect x={x} y={y} width={120 * s} height={190 * s} fill={C.cyan} stroke={C.text} strokeWidth={5} />
    <circle cx={x + 60 * s} cy={y + 52 * s} r={20 * s} fill={C.bg} stroke={C.text} strokeWidth={5} />
    <circle cx={x + 60 * s} cy={y + 128 * s} r={42 * s} fill={C.bg} stroke={C.text} strokeWidth={5} />
    <circle cx={x + 60 * s} cy={y + 128 * s} r={14 * s} fill={C.text} />
    {[0, 1, 2].map((k) => (
      <path key={k} d={`M${x + (140 + k * 26) * s} ${y + (92 - k * 12) * s} Q${x + (162 + k * 26) * s} ${y + 128 * s} ${x + (140 + k * 26) * s} ${y + (164 + k * 12) * s}`} fill="none" stroke={C.text} strokeWidth={6} strokeLinecap="round" opacity={waves * (0.35 + 0.65 * blink(waves * 10 + k * 0.17, 0, 0.9))} />
    ))}
  </g>
);
const Clock: React.FC<{x: number; y: number; r: number; turn: number}> = ({x, y, r, turn}) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={C.bg} stroke={C.text} strokeWidth={6} />
    {Array.from({length: 12}, (_, k) => {
      const a = (k / 12) * Math.PI * 2;
      return <line key={k} x1={x + Math.sin(a) * r * 0.78} y1={y - Math.cos(a) * r * 0.78} x2={x + Math.sin(a) * r * 0.92} y2={y - Math.cos(a) * r * 0.92} stroke={C.text} strokeWidth={4} />;
    })}
    <line x1={x} y1={y} x2={x + Math.sin(turn * Math.PI * 2) * r * 0.7} y2={y - Math.cos(turn * Math.PI * 2) * r * 0.7} stroke={C.red} strokeWidth={6} strokeLinecap="round" />
    <circle cx={x} cy={y} r={7} fill={C.text} />
  </g>
);
const Projector: React.FC<{x: number; y: number; s?: number; turn?: number}> = ({x, y, s = 1, turn = 0}) => (
  <g>
    <rect x={x} y={y} width={150 * s} height={72 * s} fill={C.cyan} stroke={C.text} strokeWidth={5} />
    {[0, 1].map((k) => (
      <g key={k}>
        <circle cx={x + (36 + k * 70) * s} cy={y - 22 * s} r={30 * s} fill={C.bg2} stroke={C.text} strokeWidth={5} />
        {[0, 1, 2].map((q) => {
          const a = turn * Math.PI * 2 + (q / 3) * Math.PI * 2;
          return <circle key={q} cx={x + (36 + k * 70) * s + Math.cos(a) * 15 * s} cy={y - 22 * s + Math.sin(a) * 15 * s} r={6 * s} fill={C.text} />;
        })}
      </g>
    ))}
    <rect x={x + 150 * s} y={y + 18 * s} width={22 * s} height={36 * s} fill={C.text} />
    <rect x={x + 18 * s} y={y + 72 * s} width={12} height={20 * s} fill={C.text} />
    <rect x={x + 118 * s} y={y + 72 * s} width={12} height={20 * s} fill={C.text} />
  </g>
);

/* ---------- film strip drawn from the data ---------- */
type K = 'real' | 'black' | 'clone';
type Cell = {k: K; n: number};
const fillOf = (c: Cell) => (c.k === 'black' ? C.text : cardFill(c.n));
const FilmStrip: React.FC<{x: number; y: number; w: number; ch: number; cells: Cell[]; gap?: number; t: number; a: number; per: number; size?: number; hole?: number; hide?: (i: number) => boolean}> = ({x, y, w, ch, cells, gap = 2, t, a, per, size, hole, hide}) => {
  const pad = 22;
  const cw = (w - 2 * 12 - gap * (cells.length - 1)) / cells.length;
  const hs = hole ?? Math.max(5, Math.min(14, cw * 0.4));
  const x0 = x + 12;
  return (
    <g>
      <rect x={x} y={y} width={w} height={ch + 2 * pad} fill={C.dim} />
      {cells.map((c, i) => {
        if (hide && hide(i)) return null;
        if (t < a + i * per) return null;
        const cx = x0 + i * (cw + gap);
        return (
          <g key={i}>
            <rect x={cx} y={y + pad} width={cw} height={ch} fill={fillOf(c)} />
            {size ? <text x={cx + cw / 2} y={y + pad + ch / 2 + size * 0.36} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={size} fill={c.k === 'black' ? C.bg : cardInk(c.n)}>{c.n}</text> : null}
          </g>
        );
      })}
      {cells.map((_, i) => {
        const cx = x0 + i * (cw + gap) + cw / 2 - hs / 2;
        return (
          <g key={'h' + i}>
            <rect x={cx} y={y + (pad - hs) / 2} width={hs} height={hs} fill={C.bg} />
            <rect x={cx} y={y + pad + ch + (pad - hs) / 2} width={hs} height={hs} fill={C.bg} />
          </g>
        );
      })}
    </g>
  );
};
const cellX = (x: number, w: number, count: number, i: number, gap = 2) => {
  const cw = (w - 24 - gap * (count - 1)) / count;
  return {x: x + 12 + i * (cw + gap), cw};
};
const Bracket: React.FC<{x1: number; x2: number; y: number; color: string; label: string; size?: number; op?: number}> = ({x1, x2, y, color, label, size = 30, op = 1}) => (
  <g opacity={op}>
    <path d={`M${x1} ${y} v14 H${x2} v-14`} fill="none" stroke={color} strokeWidth={5} />
    <text x={(x1 + x2) / 2} y={y + 14 + size + 6} textAnchor="middle" fontFamily={F.sans} fontWeight={700} fontSize={size} fill={color}>{label}</text>
  </g>
);

const REAL: Cell[] = Array.from({length: 50}, (_, n) => ({k: 'real' as K, n}));
const rep = (k: K, n: number, count: number): Cell[] => Array.from({length: count}, () => ({k, n}));

/* ---------- panel frame ---------- */
const PanelFrame: React.FC<{x: number; y: number; w: number; h: number; no: number}> = ({x, y, w, h, no}) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill={C.bg2} stroke={C.text} strokeWidth={4} />
    <rect x={x} y={y} width={54} height={54} fill={C.text} />
    <text x={x + 27} y={y + 41} textAnchor="middle" fontFamily={F.display} fontWeight={800} fontSize={44} fill={C.bg}>{no}</text>
  </g>
);

/* ===== 1. The question ===== */
const Ask: React.FC<SceneProps> = ({t}) => {
  const PX = [108, 540, 972, 1404], PY = 150, PW = 408, PH = 380;
  const at = [0.3, 1.8, 3.6, 11.0];
  const turn = ep(t, at[1] + 0.3, at[1] + 2.6);
  const ring = ep(t, at[3] + 0.5, at[3] + 1.4);
  const holdCells: Cell[] = [{k: 'real', n: 47}, {k: 'real', n: 48}, {k: 'real', n: 49}, {k: 'clone', n: 49}, {k: 'clone', n: 49}, {k: 'clone', n: 49}];
  const caps = ['The picture ends at card 49.', 'The music runs on for one more second.', 'Plan: hold card 49 of the 50 card counter.', 'The added frames are black.'];
  const cmd = ['ffmpeg -i counter.mkv', '  -vf tpad=stop_duration=1', '  out.mkv'];
  const proof = 12.9;
  return (
    <Stage>
      <Svg>
        {PX.map((x, i) => (
          <G key={i} t={t} a={at[i]}>
            <PanelFrame x={x} y={PY} w={PW} h={PH} no={i + 1} />
          </G>
        ))}
        <G t={t} a={at[0] + 0.2}>
          <Screen x={PX[0] + 70} y={PY + 64} w={268} h={130} fill={cardFill(49)} label="49" size={90} />
          <Projector x={PX[0] + 60} y={PY + 298} s={0.8} turn={t * 0.35} />
        </G>
        <G t={t} a={at[1] + 0.2}>
          <Speaker x={PX[1] + 30} y={PY + 110} s={1.0} waves={ep(t, at[1] + 0.4, at[1] + 0.9)} />
          <Clock x={PX[1] + 336} y={PY + 250} r={54} turn={turn} />
        </G>
        <G t={t} a={at[2] + 0.2}>
          <FilmStrip x={PX[2] + 20} y={PY + 130} w={PW - 40} ch={78} cells={holdCells} gap={6} t={t} a={at[2] + 0.4} per={0.12} size={26} hole={10} />
          <path d={`M${PX[2] + 20 + 12 + 2 * 54 + 27 - 4} ${PY + 118} Q${PX[2] + 230} ${PY + 70} ${PX[2] + 20 + 12 + 4 * 54 + 28} ${PY + 118}`} fill="none" stroke={C.amber} strokeWidth={5} strokeDasharray="10 8" opacity={ep(t, at[2] + 1.6, at[2] + 2.2)} />
          <text x={PX[2] + 230} y={PY + 62} textAnchor="middle" fontFamily={F.sans} fontWeight={700} fontSize={28} fill={C.amber} opacity={ep(t, at[2] + 1.8, at[2] + 2.4)}>hold</text>
        </G>
        <G t={t} a={at[3] + 0.2}>
          <Screen x={PX[3] + 70} y={PY + 64} w={268} h={130} fill={C.text} />
          <Ring cx={PX[3] + 204} cy={PY + 129} rx={170} ry={96} seed={7} p={ring} />
        </G>
      </Svg>
      {caps.map((c, i) => (
        <H key={i} t={t} a={at[i] + 0.4}>
          <Tx x={PX[i]} y={PY + PH + 18} w={PW} size={30} lh={1.25}>{c}</Tx>
        </H>
      ))}
      <H t={t} a={at[3] + 0.9}>
        <Mono x={PX[3] + 70} y={PY + 290} size={30} color={C.red}>frame 51</Mono>
      </H>
      <H t={t} a={proof}>
        <Big x={108} y={636} size={250} color={C.red}>25</Big>
        <Tx x={400} y={676} size={46} weight={700}>black frames added</Tx>
        <Mono x={400} y={750} size={34} color={C.dim}>75 out: 50 real, 25 black</Mono>
        <div style={{position: 'absolute', left: 1000, top: 646, width: 812, height: 196, background: C.text}} />
        {cmd.map((l, i) => (
          <Mono key={i} x={1030} y={664 + i * 54} size={38} color={C.bg} pre>{typed(l, t, proof + 0.4 + i * 0.7, 38)}</Mono>
        ))}
      </H>
    </Stage>
  );
};

/* ===== 2. What the default adds ===== */
const Black: React.FC<SceneProps> = ({t}) => {
  const SX = 96, SW = 1728, SY = 150, CH = 100;
  const cells: Cell[] = [...REAL, ...rep('black', 49, DATA.add.added)];
  const xr = cellX(SX, SW, 75, 0), xr1 = cellX(SX, SW, 75, 49), xa0 = cellX(SX, SW, 75, 50), xa1 = cellX(SX, SW, 75, 74);
  const BX = [108, 412, 716];
  const blocks = [
    {no: DATA.add.y, cap: 'luma', fill: C.text, ink: C.bg, a: 3.6},
    {no: DATA.add.u, cap: 'chroma blue', fill: C.panel, ink: C.text, a: 4.5},
    {no: DATA.add.v, cap: 'chroma red', fill: C.panel, ink: C.text, a: 5.2},
  ];
  const bx0 = 108, bw = 1704, ux = (v: number) => bx0 + (v / 255) * bw;
  const barP = ep(t, 6.2, 7.2);
  return (
    <Stage>
      <Svg>
        <FilmStrip x={SX} y={SY} w={SW} ch={CH} cells={cells} t={t} a={0.3} per={0.026} />
        <Bracket x1={xr.x} x2={xr1.x + xr1.cw} y={SY + CH + 44 + 6} color={C.text} label="50 real frames" op={ep(t, 1.4, 1.8)} />
        <Bracket x1={xa0.x} x2={xa1.x + xa1.cw} y={SY + CH + 44 + 6} color={C.red} label="25 added" op={ep(t, 2.9, 3.3)} />
        {blocks.map((b, i) => (
          <G key={i} t={t} a={b.a}>
            <rect x={BX[i]} y={412} width={280} height={190} fill={b.fill} stroke={C.text} strokeWidth={4} />
          </G>
        ))}
        {/* range bar */}
        <rect x={bx0} y={690} width={(ux(16) - bx0) * barP} height={44} fill={C.redDim} />
        <rect x={ux(16)} y={690} width={(ux(235) - ux(16)) * barP} height={44} fill={C.panel} />
        <rect x={ux(235)} y={690} width={(ux(255) - ux(235)) * barP} height={44} fill={C.redDim} />
        <rect x={bx0} y={690} width={bw * barP} height={44} fill="none" stroke={C.text} strokeWidth={4} />
        <G t={t} a={7.0}>
          <line x1={ux(16)} y1={672} x2={ux(16)} y2={748} stroke={C.red} strokeWidth={7} />
          <line x1={ux(235)} y1={672} x2={ux(235)} y2={748} stroke={C.text} strokeWidth={4} />
        </G>
        <G t={t} a={8.4}>
          <rect x={1060} y={430} width={752} height={80} fill="none" />
          <Check x={1064} y={440} s={1.1} />
          <Check x={1064} y={554} s={1.1} />
        </G>
      </Svg>
      {blocks.map((b, i) => (
        <H key={i} t={t} a={b.a}>
          <Big x={BX[i]} y={428} w={280} align="center" size={132} color={b.ink}>{b.no}</Big>
          <Mono x={BX[i]} y={560} w={280} align="center" size={28} color={b.ink === C.bg ? C.bg : C.dim}>{b.cap}</Mono>
        </H>
      ))}
      <H t={t} a={6.2}>
        <Mono x={bx0} y={640} size={26} color={C.dim}>luma, 0 to 255</Mono>
        <Mono x={bx0} y={744} size={26} color={C.dim}>0</Mono>
        <Mono x={1812 - 140} y={744} size={26} color={C.dim} align="right" w={140}>255</Mono>
      </H>
      <H t={t} a={7.0}>
        <Mono x={ux(16) + 12} y={744} size={28} color={C.red}>16 video black</Mono>
        <Mono x={ux(235) - 300} y={744} size={28} color={C.text} align="right" w={288}>235 video white</Mono>
      </H>
      <H t={t} a={8.4}>
        <Tx x={1112} y={424} w={700} size={30} lh={1.25}>Reader 1, decoded planes: 25 of 25 added frames read {DATA.add.y}, {DATA.add.u}, {DATA.add.v}.</Tx>
        <Tx x={1112} y={538} w={700} size={30} lh={1.25}>Reader 2, frame hash: 25 of 25 equal the black frame from the color source ({DATA.hash.black}).</Tx>
      </H>
      <H t={t} a={11.3}>
        <div style={{position: 'absolute', left: 108, top: 800, width: 1704, height: 76, background: C.text}} />
        <Tx x={108} y={816} w={1704} align="center" size={40} weight={700} color={C.bg}>Default stop_mode is add: it paints a color. It repeats nothing.</Tx>
      </H>
    </Stage>
  );
};

/* ===== 3. Clone freezes ===== */
const Clone: React.FC<{t: number; dur: number}> = ({t}) => {
  const SX = 96, SW = 1728, SY = 196, CH = 100;
  const cells: Cell[] = [...REAL, ...rep('clone', 49, DATA.clone.added)];
  const xr = cellX(SX, SW, 75, 0), xr1 = cellX(SX, SW, 75, 49), xa0 = cellX(SX, SW, 75, 50), xa1 = cellX(SX, SW, 75, 74);
  const lastX = xr1.x + xr1.cw / 2, cloneMid = (xa0.x + xa1.x + xa1.cw) / 2;
  const sCells: Cell[] = [...rep('clone', 0, DATA.startClone.added), ...Array.from({length: 6}, (_, n) => ({k: 'real' as K, n}))];
  return (
    <Stage>
      <Svg>
        <FilmStrip x={SX} y={SY} w={SW} ch={CH} cells={cells} t={t} a={0.3} per={0.022} hide={(i) => i >= 50 && t < 2.4 + (i - 50) * 0.04} />
        <Bracket x1={xr.x} x2={xr1.x + xr1.cw} y={SY + CH + 50} color={C.text} label="50 real frames" op={ep(t, 1.4, 1.8)} />
        <Bracket x1={xa0.x} x2={xa1.x + xa1.cw} y={SY + CH + 50} color={C.green} label="25 copies of card 49" op={ep(t, 3.6, 4.0)} />
        <path d={`M${lastX} ${SY - 8} Q${(lastX + cloneMid) / 2} ${SY - 78} ${cloneMid} ${SY - 8}`} fill="none" stroke={C.amber} strokeWidth={5} strokeDasharray="10 8" opacity={ep(t, 4.4, 5.0)} />
        <path d={`M${cloneMid - 16} ${SY - 24} L${cloneMid} ${SY - 6} L${cloneMid + 6} ${SY - 30}`} fill="none" stroke={C.amber} strokeWidth={5} opacity={ep(t, 4.8, 5.2)} />
        <G t={t} a={7.0}>
          <rect x={108} y={430} width={760} height={200} fill={C.bg2} stroke={C.text} strokeWidth={4} />
          <rect x={108} y={430} width={760} height={12} fill={C.text} />
          <rect x={136} y={470} width={120} height={120} fill={cardFill(49)} />
          <text x={196} y={548} textAnchor="middle" fontFamily={F.display} fontWeight={800} fontSize={76} fill={cardInk(49)}>49</text>
        </G>
        <G t={t} a={8.0}>
          <rect x={1052} y={430} width={760} height={200} fill={C.bg2} stroke={C.text} strokeWidth={4} />
          <rect x={1052} y={430} width={760} height={12} fill={C.green} />
          <rect x={1080} y={470} width={120} height={120} fill={cardFill(49)} />
          <text x={1140} y={548} textAnchor="middle" fontFamily={F.display} fontWeight={800} fontSize={76} fill={cardInk(49)}>49</text>
        </G>
        <G t={t} a={10.2}>
          <FilmStrip x={108} y={690} w={1080} ch={80} cells={sCells} gap={6} t={t} a={10.4} per={0.1} size={32} hole={10} />
          <Bracket x1={cellX(108, 1080, 11, 0, 6).x} x2={cellX(108, 1080, 11, 4, 6).x + cellX(108, 1080, 11, 4, 6).cw} y={690 + 124 + 4} color={C.green} label="5 copies" size={26} op={ep(t, 11.4, 11.8)} />
        </G>
      </Svg>
      <H t={t} a={0.1}>
        <Mono x={108} y={134} size={30} color={C.dim}>-vf tpad=stop_mode=clone:stop_duration=1</Mono>
      </H>
      <H t={t} a={7.0}>
        <Mono x={276} y={462} size={30} color={C.dim}>real last card</Mono>
        <Mono x={276} y={506} size={44} weight={700}>{DATA.hash.last}</Mono>
        <Tx x={276} y={566} size={28} color={C.dim}>frame hash</Tx>
      </H>
      <H t={t} a={8.0}>
        <Mono x={1220} y={462} size={30} color={C.dim}>frames 51 to 75</Mono>
        <Mono x={1220} y={506} size={44} weight={700}>{DATA.hash.last}</Mono>
        <Tx x={1220} y={566} size={28} color={C.green}>25 of 25 equal</Tx>
      </H>
      <H t={t} a={9.0}>
        <Big x={900} y={478} w={150} align="center" size={140} color={C.green}>=</Big>
      </H>
      <H t={t} a={10.4}>
        <Mono x={1230} y={696} size={30} color={C.dim} pre>{'-vf tpad=start=5:\n    start_mode=clone'}</Mono>
        <Tx x={1230} y={780} w={590} size={34} lh={1.25}>Start side: {DATA.startClone.added} copies of card 0, frame hash {DATA.hash.first}.</Tx>
      </H>
    </Stage>
  );
};

/* ===== 4. Two traps ===== */
const Trap: React.FC<SceneProps> = ({t}) => {
  const left: Cell[] = [0, 1, 48, 49].map((n) => ({k: 'real' as K, n}));
  const gaugeP = ep(t, 5.8, 6.6);
  const stopCells = rep('black', 49, DATA.stop10), durCells = rep('black', 49, DATA.both.added);
  const strike = ep(t, 13.2, 13.9);
  return (
    <Stage>
      <Svg>
        <line x1={960} y1={140} x2={960} y2={870} stroke={C.line} strokeWidth={4} />
        {/* left: the machine */}
        <G t={t} a={1.4}>
          <FilmStrip x={108} y={380} w={222} ch={70} cells={left} gap={5} t={t} a={1.6} per={0.2} size={24} hole={8} />
        </G>
        <G t={t} a={1.0}>
          <rect x={330} y={310} width={340} height={250} fill={C.cyan} stroke={C.text} strokeWidth={5} />
          <rect x={330} y={380} width={340} height={114} fill={C.text} />
        </G>
        <G t={t} a={4.4}>
          <FilmStrip x={670} y={380} w={222} ch={70} cells={left} gap={5} t={t} a={4.5} per={0.2} size={24} hole={8} />
        </G>
        {/* right: two lengths to scale */}
        <G t={t} a={10.0}>
          {stopCells.map((_, i) => <rect key={i} x={1012 + i * 27} y={392} width={24} height={44} fill={C.text} />)}
        </G>
        {durCells.map((_, i) => (t >= 11.2 + i * 0.03 ? <rect key={i} x={1012 + i * 27} y={522} width={24} height={44} fill={C.green} /> : null))}
        <line x1={1004} y1={414} x2={1012 + 10 * 27 + 8} y2={414} stroke={C.red} strokeWidth={8} strokeDasharray="1" pathLength={1} strokeDashoffset={1 - strike} opacity={strike > 0 ? 1 : 0} />
      </Svg>
      {/* left text */}
      <H t={t} a={0.3}>
        <Tx x={108} y={150} size={44} weight={700}>Clone alone</Tx>
        <Mono x={108} y={210} size={34}>tpad=stop_mode=clone</Mono>
      </H>
      <H t={t} a={1.0}>
        <Mono x={330} y={326} w={340} align="center" size={28} color={C.bg}>stop = <span style={{background: gaugeP > 0.5 ? C.red : 'transparent', padding: '0 8px'}}>0</span></Mono>
        <Mono x={330} y={508} w={340} align="center" size={28} color={C.bg}>stop_duration = <span style={{background: gaugeP > 0.5 ? C.red : 'transparent', padding: '0 8px'}}>0</span></Mono>
      </H>
      <H t={t} a={3.4}>
        <Big x={108} y={540} size={120}>{DATA.cloneOnly}</Big>
        <Tx x={108} y={668} size={34} color={C.dim}>frames in</Tx>
      </H>
      <H t={t} a={5.0}>
        <Big x={670} y={540} size={120} color={C.red}>{DATA.cloneOnly}</Big>
        <Tx x={670} y={668} size={34} color={C.dim}>frames out</Tx>
      </H>
      <H t={t} a={7.0}>
        <Tx x={108} y={750} w={760} size={36} lh={1.25}>Both lengths default to 0, so there is nothing to clone.</Tx>
      </H>
      {/* right text */}
      <H t={t} a={9.2}>
        <Tx x={1008} y={150} size={44} weight={700}>Both lengths given</Tx>
        <Mono x={1008} y={210} size={34}>tpad=stop=10:stop_duration=1</Mono>
      </H>
      <H t={t} a={10.0}>
        <Mono x={1012} y={336} size={30} color={C.dim}>stop=10 frames</Mono>
      </H>
      <H t={t} a={11.2}>
        <Mono x={1012} y={466} size={30} color={C.dim}>stop_duration=1 s, 25 frames</Mono>
      </H>
      <H t={t} a={14.0}>
        <Big x={1008} y={630} size={200} color={C.green}>{DATA.both.added}</Big>
        <Tx x={1250} y={668} w={560} size={40} weight={700} lh={1.2}>frames added, not {DATA.stop10}</Tx>
        <Mono x={1250} y={760} size={32} color={C.dim}>{DATA.both.frames} frames out</Mono>
      </H>
    </Stage>
  );
};

/* ===== 5. Rounding ===== */
const Round: React.FC<SceneProps> = ({t}) => {
  const X0 = 400, PF = 66, Y0 = 228, RH = 74;
  const at = [3.2, 5.0, 6.0, 7.0, 8.0, 8.6, 9.2];
  const isHalf = (ask: number) => Math.abs(ask - Math.floor(ask) - 0.5) < 1e-9;
  return (
    <Stage>
      <Svg>
        <G t={t} a={0.2}>
          <rect x={X0 - 20} y={134} width={14 * PF + 40} height={50} fill={C.panel} stroke={C.text} strokeWidth={4} />
          {Array.from({length: 14}, (_, k) => <line key={k} x1={X0 + k * PF} y1={134} x2={X0 + k * PF} y2={134 + (k % 5 === 0 ? 34 : 22)} stroke={C.text} strokeWidth={3} />)}
        </G>
        {DATA.round.map((r, i) => {
          const y = Y0 + i * RH;
          const p = ep(t, at[i], at[i] + 0.5);
          return (
            <g key={i}>
              {Array.from({length: 14}, (_, k) => <line key={k} x1={X0 + k * PF} y1={y - 6} x2={X0 + k * PF} y2={y + 60} stroke={C.line} strokeWidth={2} />)}
              {p > 0 ? <rect x={X0} y={y} width={Math.max(2, r.ask * PF) * p} height={24} fill="none" stroke={C.amber} strokeWidth={4} /> : null}
              {p > 0 ? <rect x={X0} y={y + 30} width={r.added * PF * ep(t, at[i] + 0.4, at[i] + 0.9)} height={24} fill={C.text} /> : null}
            </g>
          );
        })}
      </Svg>
      <H t={t} a={0.2}>
        <Mono x={108} y={142} size={28} color={C.dim}>25 fps</Mono>
        {[0, 5, 10].map((k) => <Mono key={k} x={X0 + k * PF - 20} y={188} w={40} align="center" size={22} color={C.dim}>{k}</Mono>)}
      </H>
      {DATA.round.map((r, i) => (
        <H key={i} t={t} a={at[i]}>
          <Mono x={108} y={Y0 + i * RH + 8} size={34}>{r.s} s</Mono>
          <Big x={1360} y={Y0 + i * RH + 2} size={62} color={r.added === 0 ? C.red : C.text}>adds {r.added}</Big>
          {isHalf(r.ask) ? <Tx x={1590} y={Y0 + i * RH + 14} w={240} size={28} weight={700} color={C.amber}>{r.ask} frames, up</Tx> : null}
        </H>
      ))}
      <H t={t} a={4.0}>
        <Tx x={X0} y={752} size={26} color={C.amber}>asked, in frames</Tx>
        <Tx x={X0 + 260} y={752} size={26} color={C.text}>added, whole frames (solid)</Tx>
      </H>
      <H t={t} a={11.0}>
        <Tx x={108} y={806} w={1704} size={38} weight={700}>One second adds {DATA.fps.map((f) => f.add1).join(', ')} frames at {DATA.fps.map((f) => f.fps).join(', ')} fps.</Tx>
      </H>
    </Stage>
  );
};

/* ===== 6. The sound side ===== */
const Sound: React.FC<SceneProps> = ({t}) => {
  const PX0 = 340, PXE = 1400, PYT = 190, PYB = 380;
  const total = DATA.audio.samples + DATA.audio.added;
  const xs = (s: number) => PX0 + (s / total) * (PXE - PX0);
  const lvl = ep(t, 1.2, 4.0), zero = ep(t, 4.2, 5.4);
  const hold = ep(t, 7.0, 7.8);
  const rows = [
    {name: 'tpad alone', k: DATA.mux.tpadOnly, a: 9.0},
    {name: 'with -shortest', k: DATA.mux.tpadShortest, a: 11.2},
    {name: 'pad + -shortest', k: DATA.mux.tpadApadShortest, a: 12.5},
  ];
  const bx = 470, ppx = 290; // 290 px per second
  return (
    <Stage>
      <Svg>
        <G t={t} a={0.2}>
          <Speaker x={108} y={190} s={1.0} waves={ep(t, 0.4, 0.9) * (1 - zero)} />
        </G>
        <line x1={PX0} y1={PYB} x2={PXE} y2={PYB} stroke={C.text} strokeWidth={3} />
        <line x1={PX0} y1={PYT - 20} x2={PX0} y2={PYB} stroke={C.text} strokeWidth={3} />
        <line x1={PX0} y1={PYT} x2={PX0 + (xs(DATA.audio.samples) - PX0) * lvl} y2={PYT} stroke={C.cyan} strokeWidth={10} />
        {zero > 0 ? <line x1={xs(DATA.audio.samples)} y1={PYB} x2={xs(DATA.audio.samples) + (xs(total) - xs(DATA.audio.samples)) * zero} y2={PYB} stroke={C.red} strokeWidth={10} /> : null}
        {zero > 0 ? <line x1={xs(DATA.audio.samples)} y1={PYT} x2={xs(DATA.audio.samples)} y2={PYT + (PYB - PYT) * ep(t, 4.0, 4.4)} stroke={C.text} strokeWidth={4} strokeDasharray="8 6" /> : null}
        {hold > 0 ? <line x1={xs(DATA.audio.samples)} y1={PYT} x2={xs(DATA.audio.samples) + (xs(total) - xs(DATA.audio.samples)) * hold} y2={PYT} stroke={C.amber} strokeWidth={8} strokeDasharray="14 10" /> : null}
        {t >= 7.9 ? (
          <g>
            <line x1={xs(DATA.audio.samples) + 70} y1={PYT - 22} x2={xs(total) - 30} y2={PYT + 22} stroke={C.red} strokeWidth={8} strokeLinecap="round" opacity={ep(t, 7.9, 8.4)} />
            <line x1={xs(DATA.audio.samples) + 70} y1={PYT + 22} x2={xs(total) - 30} y2={PYT - 22} stroke={C.red} strokeWidth={8} strokeLinecap="round" opacity={ep(t, 7.9, 8.4)} />
          </g>
        ) : null}
        {rows.map((r, i) => {
          const y = 490 + i * 112, p = ep(t, r.a, r.a + 0.6);
          return (
            <g key={i} opacity={p > 0 ? 1 : 0}>
              <rect x={bx} y={y} width={(r.k.v / 25) * ppx * p} height={32} fill={C.cyan} />
              <rect x={bx} y={y + 40} width={(r.k.a / 8000) * ppx * p} height={32} fill={C.amber} />
            </g>
          );
        })}
      </Svg>
      <H t={t} a={1.2}>
        <Mono x={PX0 + 12} y={PYT - 56} size={26} color={C.cyan}>last real sample {DATA.audio.level}</Mono>
      </H>
      <H t={t} a={4.4}>
        <Mono x={xs(DATA.audio.samples) + 12} y={PYB - 52} size={26} color={C.red}>next sample {DATA.audio.first}</Mono>
        <Mono x={xs(DATA.audio.samples) - 220} y={PYB + 10} w={440} align="center" size={26} color={C.dim}>silence starts at {DATA.audio.silence} s</Mono>
      </H>
      <H t={t} a={5.6}>
        <Big x={1480} y={206} size={150}>{DATA.audio.added}</Big>
        <Tx x={1480} y={352} w={340} size={32} lh={1.2}>samples added, every one {DATA.audio.first}</Tx>
      </H>
      <H t={t} a={7.0}>
        <Mono x={xs(DATA.audio.samples) + 12} y={PYT + 46} size={26} color={C.amber}>a hold would stay here</Mono>
      </H>
      {rows.map((r, i) => (
        <H key={i} t={t} a={r.a}>
          <Mono x={108} y={490 + i * 112 + 18} size={30}>{r.name}</Mono>
          <Tx x={bx + 3 * 290 + 40} y={490 + i * 112 - 2} w={440} size={30} lh={1.25}>video {r.k.v} frames, audio {r.k.a / 8000} s</Tx>
          {i === 1 ? <Tx x={bx + 3 * 290 + 40} y={490 + i * 112 + 40} w={440} size={30} weight={700} color={C.red}>the freeze is cut</Tx> : null}
          {i === 2 ? <Tx x={bx + 3 * 290 + 40} y={490 + i * 112 + 40} w={440} size={30} weight={700} color={C.green}>all 3 s stay</Tx> : null}
        </H>
      ))}
      <H t={t} a={9.0}>
        <Tx x={bx} y={824} size={24} color={C.cyan}>video</Tx>
        <Tx x={bx + 100} y={824} size={24} color={C.amber}>audio</Tx>
        <Tx x={bx + 200} y={824} size={24} color={C.dim}>bars drawn to scale</Tx>
      </H>
    </Stage>
  );
};

/* ===== 7. What to write ===== */
const Close: React.FC<SceneProps> = ({t}) => {
  const l1 = '-vf tpad=stop_mode=clone:stop_duration=1';
  const l2 = '-af apad=pad_dur=1 -shortest';
  return (
    <Stage>
      <Svg>
        <G t={t} a={0.2}>
          <rect x={108} y={150} width={1180} height={400} fill={C.bg2} stroke={C.text} strokeWidth={4} />
          <rect x={108} y={150} width={1180} height={14} fill={C.green} />
        </G>
        <G t={t} a={4.4}>
          <Screen x={1430} y={190} w={330} h={190} fill={cardFill(49)} label="49" size={110} />
        </G>
        <G t={t} a={5.4}>
          <Check x={1470} y={470} s={1.3} />
        </G>
        <G t={t} a={9.4}>
          <rect x={108} y={600} width={1704} height={270} fill={C.bg2} stroke={C.amber} strokeWidth={5} strokeDasharray="14 10" />
        </G>
      </Svg>
      <H t={t} a={0.3}>
        <Tx x={150} y={188} size={46} weight={700}>Hold the last frame for one second</Tx>
        <Tx x={150} y={282} size={26} color={C.dim}>picture</Tx>
      </H>
      <Mono x={150} y={322} size={38} pre>{typed(l1, t, 1.0, 44)}</Mono>
      <H t={t} a={6.6}>
        <Tx x={150} y={410} size={26} color={C.dim}>sound, if you use -shortest</Tx>
      </H>
      <Mono x={150} y={450} size={38} pre>{typed(l2, t, 6.8, 44)}</Mono>
      <H t={t} a={5.4}>
        <Tx x={1526} y={470} size={32} weight={700} color={C.green}>held 25 frames</Tx>
      </H>
      <H t={t} a={9.4}>
        <Big x={150} y={628} size={84} color={C.amber}>Not tested</Big>
        <Tx x={150} y={756} size={40}>other ffmpeg builds</Tx>
        <Tx x={780} y={756} size={40}>real footage</Tx>
        <Tx x={1150} y={756} size={40}>variable frame rate</Tx>
      </H>
    </Stage>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, black: Black, clone: Clone, trap: Trap, round: Round, sound: Sound, close: Close};
