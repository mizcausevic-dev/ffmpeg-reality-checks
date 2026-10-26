import React from 'react';
import {C, F} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Editorial collage. Cut-out paper pieces with torn edges (an SVG turbulence and displacement filter), halftone dots whose
 * size comes from the measured gray levels, masking tape, a paper grain tile, slightly offset print misregistration on the headlines and layered type.
 * Every number, swatch, dot and bar below is drawn from evidence.json written by episodes/ff76/fixture/run.mjs (ffmpeg 6.1.1).
 * The four patch chips use the lab inks (madder, olive, indigo, ochre) as stand-ins for pure red, green, blue and yellow.
 */

const DATA = {"gray": {"raw": [76, 150, 29, 226], "seen": [76, 150, 29, 226]}, "hue": {"raw": [81, 145, 41, 210], "seen": [76, 150, 29, 226]}, "c601": {"seen": [76, 150, 29, 226]}, "c709": {"seen": [54, 182, 18, 236]}, "hd": {"gray": [55, 183, 19, 236], "hue": [54, 182, 18, 236], "c601": [76, 149, 29, 225], "c709": [54, 182, 18, 235]}, "white": {"gray": [255, 255], "hue": [235, 255], "c709": 254}, "black": {"gray": 0, "hue": 16}, "ramp": {"gray": {"shown": [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92, 96, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 148, 152, 156, 160, 164, 168, 172, 176, 180, 184, 188, 192, 196, 200, 204, 208, 212, 216, 220, 224, 228, 232, 236, 240, 244, 248, 252, 255], "distinct": 256, "max": 255, "rawMin": 0, "rawMax": 255, "missing": []}, "hue": {"shown": [0, 3, 8, 12, 16, 20, 24, 28, 31, 36, 40, 44, 48, 52, 56, 61, 64, 68, 72, 76, 80, 84, 88, 92, 95, 100, 104, 108, 112, 116, 120, 123, 128, 132, 136, 140, 144, 148, 153, 156, 160, 164, 168, 172, 176, 180, 184, 187, 192, 196, 200, 204, 208, 212, 217, 220, 224, 228, 232, 236, 240, 245, 248, 252, 255], "distinct": 220, "max": 255, "rawMin": 16, "rawMax": 235, "missing": [4, 11, 18, 25, 32, 39, 46, 53, 60, 67, 74, 81, 89, 96, 103, 110, 117, 124, 131, 138, 145, 152, 159, 166, 174, 181, 188, 195, 202, 209, 216, 223, 230, 237, 244, 251]}, "c601": {"shown": [0, 3, 8, 12, 16, 20, 24, 27, 33, 36, 40, 44, 47, 53, 56, 60, 64, 68, 72, 77, 80, 84, 88, 92, 96, 100, 104, 107, 112, 116, 120, 124, 128, 131, 137, 140, 144, 148, 151, 157, 160, 164, 168, 172, 176, 181, 184, 187, 192, 196, 200, 204, 208, 211, 217, 220, 224, 228, 231, 237, 240, 244, 248, 252, 255], "distinct": 194, "max": 255, "rawMin": 0, "rawMax": 255, "missing": [4, 6, 11, 21, 22, 28, 32, 38, 42, 45, 48, 49, 52, 55, 57, 59, 65, 66, 69, 74, 76, 91, 93, 108, 110, 118, 119, 125, 129, 132, 135, 136, 139, 142, 146, 152, 156, 162, 163, 171, 173, 178, 180, 188, 189, 195, 199, 205, 207, 212, 216, 222, 226, 229, 232, 233, 236, 239, 241, 243, 249, 253]}, "c709": {"shown": [0, 4, 9, 13, 15, 19, 24, 28, 32, 37, 41, 43, 47, 52, 56, 60, 65, 68, 71, 75, 80, 84, 88, 93, 96, 100, 104, 108, 112, 116, 121, 124, 128, 132, 136, 140, 144, 148, 152, 156, 160, 164, 168, 172, 176, 180, 184, 188, 192, 196, 200, 204, 208, 212, 216, 220, 224, 227, 232, 236, 240, 245, 248, 252, 254], "distinct": 200, "max": 254, "rawMin": 0, "rawMax": 254, "missing": [2, 6, 8, 12, 16, 20, 22, 26, 30, 34, 36, 40, 44, 48, 50, 58, 62, 64, 72, 76, 78, 87, 90, 92, 101, 106, 115, 120, 129, 135, 143, 149, 157, 163, 171, 177, 181, 185, 187, 191, 195, 199, 201, 205, 209, 214, 215, 219, 223, 228, 229, 233, 242, 243, 247, 255]}}, "eq": {"chroma": 127, "spread": 4}};
const GRAIN = "data:image/png;base64,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";

const PATCH = ['red', 'green', 'blue', 'yellow'];
const RGBT = ['255, 0, 0', '0, 255, 0', '0, 0, 255', '255, 255, 0'];
const inkOf = (k: number) => [C.red, C.green, C.cyan, C.amber][k];

/* ---------- helpers ---------- */
const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const Defs: React.FC = () => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <defs>
      {[1, 2, 3, 4, 5].map((k) => (
        <filter key={k} id={`tear${k}`} x="-8%" y="-14%" width="116%" height="128%">
          <feTurbulence type="fractalNoise" baseFrequency={`${0.02 + k * 0.004} ${0.045 + k * 0.007}`} numOctaves={3} seed={k * 11} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={12 + k * 2} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      ))}
    </defs>
  </svg>
);
const Stage: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <>
    <div style={{position: 'absolute', inset: 0, background: C.bg}} />
    <Defs />
    {children}
    <div style={{position: 'absolute', inset: 0, backgroundImage: `url(${GRAIN})`, backgroundSize: '192px 192px', pointerEvents: 'none'}} />
  </>
);
/** fade and settle for html (children use page coordinates) */
const H: React.FC<{t: number; a: number; d?: number; dy?: number; children?: React.ReactNode}> = ({t, a, d = 0.35, dy = 14, children}) => {
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
/** display type with a second, offset pass in madder: print misregistration */
const Mis: React.FC<Omit<TxProps, 'font' | 'weight' | 'lh'> & {dx?: number; dy?: number; back?: string}> = ({dx = 6, dy = 4, back, ...p}) => (
  <>
    <Big {...p} x={p.x + dx} y={p.y + dy} color={back ?? C.red} style={{mixBlendMode: 'multiply', opacity: 0.8}} />
    <Big {...p} />
  </>
);

/** a torn paper piece: a rectangle run through the displacement filter, with a darker offset copy as its thickness */
const Paper: React.FC<{x: number; y: number; w: number; h: number; fill?: string; rot?: number; seed?: number; dashed?: string; children?: React.ReactNode}> = ({x, y, w, h, fill, rot = 0, seed = 1, dashed, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: `rotate(${rot}deg)`}}>
    <svg width={w + 60} height={h + 60} style={{position: 'absolute', left: -30, top: -30, overflow: 'visible'}}>
      <g filter={`url(#tear${seed})`}>
        <rect x={34} y={35} width={w} height={h} fill={C.line} />
        <rect x={30} y={30} width={w} height={h} fill={fill ?? C.bg2} />
      </g>
      {dashed ? <rect x={42} y={42} width={w - 24} height={h - 24} fill="none" stroke={dashed} strokeWidth={4} strokeDasharray="14 10" /> : null}
    </svg>
    {children}
  </div>
);
const TAPE_CLIP = 'polygon(0 0,3% 12%,0 25%,3% 38%,0 50%,3% 62%,0 75%,3% 88%,0 100%,100% 100%,97% 88%,100% 75%,97% 62%,100% 50%,97% 38%,100% 25%,97% 12%,100% 0)';
const Tape: React.FC<{x: number; y: number; w?: number; h?: number; rot?: number}> = ({x, y, w = 140, h = 44, rot = -4}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: `rotate(${rot}deg)`, background: hexA(C.amber, 0.34), clipPath: TAPE_CLIP}} />
);

/** halftone dots on a 45 degree lattice: dot area follows the darkness the data asks for (u, v run 0 to 1 across the box) */
const Halftone: React.FC<{x: number; y: number; w: number; h: number; cell: number; dark: (u: number, v: number) => number; color?: string}> = ({x, y, w, h, cell, dark, color}) => {
  const dots: React.ReactNode[] = [];
  const n = Math.ceil((w + h) / cell) + 2, s = cell / Math.SQRT2;
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const px = w / 2 + (i - j) * s, py = h / 2 + (i + j) * s;
      if (px < 0 || px > w || py < 0 || py > h) continue;
      const d = clamp(dark(px / w, py / h), 0, 1);
      if (d <= 0.01) continue;
      dots.push(<circle key={`${i}_${j}`} cx={px} cy={py} r={Math.min(cell * 0.74, cell * Math.sqrt(d / Math.PI))} fill={color ?? C.text} />);
    }
  }
  return <svg width={w} height={h} style={{position: 'absolute', left: x, top: y, overflow: 'hidden'}}>{dots}</svg>;
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** a torn piece with a halftone of one gray level on it: dots cover (1 - level / 255) of the paper */
const Swatch: React.FC<{x: number; y: number; s: number; v: number; seed?: number; rot?: number}> = ({x, y, s, v, seed = 2, rot = 0}) => (
  <>
    <Paper x={x} y={y} w={s} h={s} fill={C.bg2} seed={seed} rot={rot} />
    <div style={{position: 'absolute', left: x, top: y, width: s, height: s, transform: `rotate(${rot}deg)`}}>
      <Halftone x={8} y={8} w={s - 16} h={s - 16} cell={Math.max(8, Math.round(s / 13))} dark={() => 1 - v / 255} />
    </div>
  </>
);
const Chip: React.FC<{x: number; y: number; w: number; h: number; k: number; seed?: number; rot?: number}> = ({x, y, w, h, k, seed = 3, rot = 0}) => <Paper x={x} y={y} w={w} h={h} fill={inkOf(k)} seed={seed} rot={rot} />;
const Slip: React.FC<{x: number; y: number; w: number; h: number; fill?: string; rot?: number; seed?: number; dashed?: string; children?: React.ReactNode}> = ({children, ...p}) => (
  <Paper {...p}>
    <div style={{position: 'absolute', inset: 0}}>{children}</div>
  </Paper>
);
const Cap: React.FC<{x: number; y: number; w: number; size?: number; color?: string; align?: 'left' | 'center' | 'right'; children?: React.ReactNode}> = ({x, y, w, size = 30, color, align = 'center', children}) => (
  <Mono x={x} y={y} w={w} size={size} align={align} color={color ?? C.text}>{children}</Mono>
);

/* ===== 1. The question ===== */
const Ask: React.FC<SceneProps> = ({t}) => {
  const CX = [140, 440, 740, 1040], rots = [-3, 2, -2, 3];
  const methods = ['format=gray', 'hue=s=0', 'colorchannelmixer'];
  const mfill = [C.panel, C.cyanDim, C.amberDim];
  return (
    <Stage>
      <H t={t} a={0.2}>
        <Mis x={108} y={122} size={126}>Black and white, three ways</Mis>
      </H>
      <H t={t} a={3.8}>
        <Big x={112} y={252} size={78} color={C.cyan}>Do they match?</Big>
      </H>
      {CX.map((x, k) => (
        <H key={k} t={t} a={5.6 + k * 0.7}>
          <Chip x={x} y={372} w={230} h={210} k={k} seed={(k % 4) + 1} rot={rots[k]} />
          <Tape x={x + 62} y={354} w={110} h={40} rot={k % 2 ? 5 : -5} />
          <Slip x={x + 6} y={618} w={218} h={96} fill={C.bg2} seed={((k + 1) % 5) + 1} rot={-rots[k] / 2}>
            <Tx x={0} y={12} w={218} align="center" size={30} weight={700}>{PATCH[k]}</Tx>
            <Mono x={0} y={54} w={218} align="center" size={24} color={C.dim}>{RGBT[k]}</Mono>
          </Slip>
        </H>
      ))}
      {methods.map((m, k) => (
        <H key={m} t={t} a={9.2 + k * 1.1}>
          <Slip x={1370} y={372 + k * 124} w={450} h={92} fill={mfill[k]} seed={k + 2} rot={k % 2 ? 1.2 : -1.2}>
            <Mono x={0} y={26} w={450} align="center" size={32}>{m}</Mono>
          </Slip>
          {k === 0 ? <Tape x={1590} y={352} w={120} h={40} rot={-6} /> : null}
        </H>
      ))}
      <H t={t} a={13.4}>
        <Slip x={140} y={796} w={1640} h={96} fill={C.bg2} seed={4} rot={-0.4}>
          <div style={{position: 'absolute', left: 0, top: 0, width: 1640, height: 96}}>
            <Halftone x={24} y={10} w={1590} h={76} cell={13} dark={(u) => 1 - DATA.ramp.gray.shown[Math.round(u * 64)] / 255} />
          </div>
        </Slip>
        <Slip x={150} y={738} w={236} h={44} fill={C.panel} seed={5} rot={-2}>
          <Mono x={0} y={8} w={236} align="center" size={26}>ramp 0 to 255</Mono>
        </Slip>
        <Tape x={1700} y={780} w={110} h={38} rot={8} />
      </H>
    </Stage>
  );
};

/* ===== 2. What gets stored ===== */
const COLX = [540, 860, 1180, 1500];
const Raw: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {name: 'format=gray', sub: 'full range, 0 to 255', vals: DATA.gray.raw, y: 350, a: 3.0, col: C.text, fill: C.bg2},
    {name: 'hue=s=0', sub: 'video range, 16 to 235', vals: DATA.hue.raw, y: 560, a: 7.0, col: C.red, fill: C.bg2},
  ];
  return (
    <Stage>
      <H t={t} a={0.2}>
        <Mis x={108} y={122} size={92}>What gets stored</Mis>
      </H>
      {PATCH.map((n, k) => (
        <H key={n} t={t} a={1.0 + k * 0.25}>
          <Chip x={COLX[k] + 70} y={236} w={140} h={60} k={k} seed={k + 1} rot={k % 2 ? 2 : -2} />
          <Cap x={COLX[k]} y={308} w={280} size={28}>{n}</Cap>
        </H>
      ))}
      {rows.map((r, ri) => (
        <React.Fragment key={r.name}>
          <H t={t} a={r.a - 0.6}>
            <Slip x={108} y={r.y + 8} w={380} h={150} fill={ri ? C.amberDim : C.panel} seed={ri + 2} rot={ri ? 1 : -1}>
              <Mono x={0} y={34} w={380} align="center" size={34}>{r.name}</Mono>
              <Tx x={0} y={90} w={380} align="center" size={26} color={C.dim}>{r.sub}</Tx>
            </Slip>
            {ri === 0 ? <Tape x={140} y={344} w={110} h={38} rot={-6} /> : <Tape x={360} y={554} w={110} h={38} rot={5} />}
          </H>
          {r.vals.map((v, k) => (
            <H key={k} t={t} a={r.a + k * 0.6}>
              <Slip x={COLX[k]} y={r.y} w={280} h={170} fill={r.fill} seed={((k + ri) % 5) + 1} rot={(k + ri) % 2 ? 1.2 : -1}>
                <Big x={0} y={26} w={280} align="center" size={124} color={r.col}>{v}</Big>
              </Slip>
            </H>
          ))}
        </React.Fragment>
      ))}
      <H t={t} a={11.2}>
        <Slip x={540} y={772} w={1240} h={104} fill={C.panel} seed={3} rot={-0.6}>
          <Big x={30} y={22} size={62}>white {DATA.white.gray[0]} against <span style={{color: C.red}}>{DATA.white.hue[0]}</span></Big>
          <Big x={810} y={22} size={62}>black {DATA.black.gray} against <span style={{color: C.red}}>{DATA.black.hue}</span></Big>
        </Slip>
        <Tape x={520} y={752} w={120} h={40} rot={-8} />
      </H>
    </Stage>
  );
};

/* ===== 3. What the screen shows ===== */
const Seen: React.FC<SceneProps> = ({t}) => {
  const X0 = 140, W0 = 1640, ux = (v: number) => X0 + (v / 255) * W0;
  const draw = ep(t, 3.0, 4.0);
  return (
    <Stage>
      <H t={t} a={0.2}>
        <Mis x={108} y={122} size={92}>What the screen shows</Mis>
      </H>
      <H t={t} a={0.8}>
        <Slip x={X0} y={246} w={W0} h={74} fill={C.bg2} seed={1} rot={-0.3}>
          <Mono x={24} y={18} size={34}>0</Mono>
          <Mono x={0} y={18} w={W0} align="center" size={30} color={C.dim}>full range</Mono>
          <Mono x={W0 - 130} y={18} w={106} align="right" size={34}>255</Mono>
        </Slip>
      </H>
      <H t={t} a={1.8}>
        <Slip x={ux(16)} y={372} w={ux(235) - ux(16)} h={74} fill={C.amberDim} seed={3} rot={0.3}>
          <Mono x={24} y={18} size={34}>16</Mono>
          <Mono x={0} y={18} w={ux(235) - ux(16)} align="center" size={30} color={C.dim}>video range</Mono>
          <Mono x={ux(235) - ux(16) - 130} y={18} w={106} align="right" size={34}>235</Mono>
        </Slip>
        <Tape x={ux(16) - 20} y={362} w={100} h={36} rot={-30} />
        <Tape x={ux(235) - 80} y={362} w={100} h={36} rot={30} />
      </H>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <line x1={ux(16)} y1={372} x2={ux(16) + (X0 - ux(16)) * draw} y2={326 + 46 * (1 - draw)} stroke={C.red} strokeWidth={6} strokeDasharray="12 9" />
        <line x1={ux(235)} y1={372} x2={ux(235) + (ux(255) - ux(235)) * draw} y2={326 + 46 * (1 - draw)} stroke={C.red} strokeWidth={6} strokeDasharray="12 9" />
      </svg>
      <H t={t} a={4.4}>
        <Tx x={ux(100)} y={326} size={28} weight={700} color={C.red} w={500}>stretched back by the screen</Tx>
      </H>
      {PATCH.map((n, k) => {
        const gx = 140 + k * 420;
        return (
          <React.Fragment key={n}>
            <H t={t} a={5.4 + k * 0.7}>
              <Cap x={gx} y={478} w={380} size={30}>{n}</Cap>
              <Swatch x={gx + 10} y={524} s={150} v={DATA.gray.seen[k]} seed={k + 1} rot={-1} />
              <Swatch x={gx + 210} y={524} s={150} v={DATA.hue.seen[k]} seed={k + 2} rot={1} />
              <Big x={gx + 160} y={572} w={50} align="center" size={60} color={C.green}>=</Big>
              <Big x={gx + 10} y={690} w={150} align="center" size={70}>{DATA.gray.seen[k]}</Big>
              <Big x={gx + 210} y={690} w={150} align="center" size={70}>{DATA.hue.seen[k]}</Big>
              <Mono x={gx + 10} y={768} w={150} align="center" size={24} color={C.dim}>gray</Mono>
              <Mono x={gx + 210} y={768} w={150} align="center" size={24} color={C.dim}>hue</Mono>
            </H>
          </React.Fragment>
        );
      })}
      <H t={t} a={11.0}>
        <Slip x={560} y={806} w={800} h={70} fill={C.panel} seed={4} rot={-0.5}>
          <Big x={0} y={8} w={800} align="center" size={54} color={C.red}>Same picture. Only the range differs.</Big>
        </Slip>
      </H>
    </Stage>
  );
};

/* ===== 4. The mixer ===== */
const Mixer: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {name: 'format=gray', sub: 'the reference', vals: DATA.gray.seen, y: 200, a: 0.8, fill: C.panel, tag: ''},
    {name: 'mixer, 601 weights', sub: '0.299  0.587  0.114', vals: DATA.c601.seen, y: 420, a: 3.2, fill: C.cyanDim, tag: 'same four numbers'},
    {name: 'mixer, 709 weights', sub: '0.2126  0.7152  0.0722', vals: DATA.c709.seen, y: 640, a: 6.6, fill: C.amberDim, tag: 'not the same'},
  ];
  return (
    <Stage>
      <H t={t} a={0.2}>
        <Mis x={108} y={122} size={64} dx={4} dy={3}>The mixer is only weights</Mis>
      </H>
      {rows.map((r, ri) => (
        <React.Fragment key={r.name}>
          <H t={t} a={r.a}>
            <Slip x={108} y={r.y + 30} w={660} h={176} fill={r.fill} seed={ri + 1} rot={ri % 2 ? 0.8 : -0.8}>
              <Mono x={0} y={22} w={660} align="center" size={36}>{r.name}</Mono>
              <Mono x={0} y={78} w={660} align="center" size={32} color={C.dim}>{r.sub}</Mono>
              {r.tag ? <Tx x={0} y={128} w={660} align="center" size={26} weight={700} color={ri === 1 ? C.green : C.red}>{r.tag}</Tx> : null}
            </Slip>
            <Tape x={ri % 2 ? 640 : 120} y={r.y + 18} w={110} h={38} rot={ri % 2 ? 7 : -7} />
          </H>
          {r.vals.map((v, k) => (
            <H key={k} t={t} a={r.a + 0.5 + k * 0.35}>
              <Swatch x={880 + k * 232} y={r.y + 4} s={150} v={v} seed={((k + ri) % 5) + 1} rot={(k + ri) % 2 ? 1.4 : -1.2} />
              <Big x={880 + k * 232} y={r.y + 164} w={150} align="center" size={56} color={ri === 2 ? C.red : C.text}>{v}</Big>
            </H>
          ))}
        </React.Fragment>
      ))}
    </Stage>
  );
};

/* ===== 5. A high definition source ===== */
const Hd: React.FC<SceneProps> = ({t}) => {
  const SC = 3.0, BX = 330;
  const file = DATA.hd.gray, mix = DATA.hd.c601;
  const gap = file.map((v, k) => Math.abs(v - mix[k]));
  return (
    <Stage>
      <H t={t} a={0.2}>
        <Mis x={108} y={122} size={92}>A bt709 source</Mis>
      </H>
      {PATCH.map((n, k) => {
        const y = 250 + k * 135;
        return (
          <React.Fragment key={n}>
            <H t={t} a={3.0 + k * 0.5}>
              <Chip x={108} y={y + 6} w={70} h={86} k={k} seed={k + 1} rot={k % 2 ? 2 : -2} />
              <Cap x={190} y={y + 28} w={130} size={28} align="left">{n}</Cap>
              <Paper x={BX} y={y} w={file[k] * SC} h={42} fill={C.cyan} seed={((k + 1) % 5) + 1} rot={-0.3} />
              <Big x={BX + file[k] * SC + 20} y={y - 2} size={48}>{file[k]}</Big>
            </H>
            <H t={t} a={7.6 + k * 0.5}>
              <Paper x={BX} y={y + 50} w={mix[k] * SC} h={42} fill={C.amber} seed={((k + 3) % 5) + 1} rot={0.3} />
              <Big x={BX + mix[k] * SC + 20} y={y + 48} size={48}>{mix[k]}</Big>
            </H>
            <H t={t} a={10.6 + k * 0.5}>
              <Big x={1330} y={y + 4} size={78} color={C.red}>{gap[k]}</Big>
              <Tx x={1330 + (gap[k] > 9 ? 100 : 100)} y={y + 30} size={30} color={C.red} weight={700}>levels off</Tx>
            </H>
          </React.Fragment>
        );
      })}
      <H t={t} a={12.6}>
        <Slip x={1330} y={806} w={480} h={70} fill={C.panel} seed={4} rot={-0.6}>
          <Big x={0} y={8} w={480} align="center" size={52} color={C.red}>Green is {gap[1]} levels off</Big>
        </Slip>
      </H>
      <H t={t} a={1.2}>
        <Slip x={320} y={806} w={430} h={64} fill={C.bg2} seed={2} rot={-0.8}>
          <Paper x={16} y={16} w={34} h={32} fill={C.cyan} seed={3} />
          <Tx x={66} y={16} size={26} weight={700}>gray and hue follow the file</Tx>
        </Slip>
        <Slip x={780} y={806} w={510} h={64} fill={C.bg2} seed={5} rot={0.8}>
          <Paper x={16} y={16} w={34} h={32} fill={C.amber} seed={4} />
          <Tx x={66} y={16} size={26} weight={700}>the 601 mixer follows its weights</Tx>
        </Slip>
      </H>
    </Stage>
  );
};

/* ===== 6. A ramp ===== */
const Ramp: React.FC<SceneProps> = ({t}) => {
  const RX = 470, RW = 1330;
  const rows = [
    {name: 'format=gray', r: DATA.ramp.gray, a: 0.8, fill: C.panel},
    {name: 'hue=s=0', r: DATA.ramp.hue, a: 3.0, fill: C.cyanDim},
    {name: 'mixer, 601', r: DATA.ramp.c601, a: 5.4, fill: C.amberDim},
    {name: 'mixer, 709', r: DATA.ramp.c709, a: 7.0, fill: C.amberDim},
  ];
    return (
    <Stage>
      <H t={t} a={0.2}>
        <Mis x={108} y={122} size={92}>Levels kept on a ramp</Mis>
      </H>
      {rows.map((row, i) => {
        const y = 250 + i * 136;
        const miss: number[] = row.r.missing;
        return (
          <React.Fragment key={row.name}>
            <H t={t} a={row.a}>
              <Slip x={108} y={y} w={300} h={104} fill={row.fill} seed={i + 1} rot={i % 2 ? 0.8 : -0.8}>
                <Mono x={0} y={12} w={300} align="center" size={28}>{row.name}</Mono>
                <Big x={0} y={50} w={300} align="center" size={50} color={row.r.distinct === 256 ? C.green : C.red}>{row.r.distinct} levels</Big>
              </Slip>
              <Paper x={RX} y={y} w={RW} h={78} fill={C.bg2} seed={((i + 2) % 5) + 1} rot={i % 2 ? 0.2 : -0.2} />
              <Halftone x={RX + 12} y={y + 8} w={RW - 24} h={62} cell={11} dark={(u) => 1 - row.r.shown[Math.round(u * 64)] / 255} />
              <svg width={RW} height={22} style={{position: 'absolute', left: RX, top: y + 82, overflow: 'visible'}}>
                {miss.map((v) => <rect key={v} x={12 + (v / 255) * (RW - 24) - 1.5} y={0} width={3} height={22} fill={C.red} />)}
              </svg>
            </H>
          </React.Fragment>
        );
      })}
      <H t={t} a={7.8}>
        <Tx x={RX} y={784} w={RW} size={26} color={C.red} weight={700}>red ticks mark the levels a method never produces</Tx>
        <Tx x={1500} y={392 - 40} w={300} size={24} color={C.dim} align="right">raw {DATA.ramp.hue.rawMin} to {DATA.ramp.hue.rawMax}</Tx>
        <Tx x={1500} y={630} w={300} size={24} color={C.dim} align="right">top {DATA.ramp.c709.max}</Tx>
      </H>
      <H t={t} a={10.2}>
        <Slip x={108} y={846} w={1030} h={66} fill={C.panel} seed={4} rot={-0.5}>
          <Tx x={0} y={14} w={1030} align="center" size={30} weight={700}>eq=saturation=0 leaves chroma at {DATA.eq.chroma}: a faint tint</Tx>
        </Slip>
        <Tape x={96} y={830} w={100} h={36} rot={-12} />
      </H>
    </Stage>
  );
};

/* ===== 7. What to write ===== */
const Close: React.FC<SceneProps> = ({t}) => (
  <Stage>
    <H t={t} a={0.2}>
      <Mis x={108} y={122} size={92}>Match the weights to the file</Mis>
    </H>
    <H t={t} a={0.8}>
      <Slip x={140} y={300} w={1220} h={150} fill={C.bg2} seed={1} rot={-1}>
        <Big x={40} y={20} size={66}>format=gray, or hue=s=0</Big>
        <Tx x={40} y={96} size={36} color={C.dim}>keep the file's own luma</Tx>
      </Slip>
      <Tape x={120} y={282} w={120} h={40} rot={-9} />
    </H>
    <H t={t} a={5.0}>
      <Slip x={300} y={500} w={1380} h={170} fill={C.cyanDim} seed={3} rot={1}>
        <Big x={40} y={18} size={66}>colorchannelmixer</Big>
        <Tx x={40} y={96} size={34}>weights that match the file: 0.2126 0.7152 0.0722 for bt709</Tx>
      </Slip>
      <Tape x={1580} y={484} w={120} h={40} rot={8} />
    </H>
    <H t={t} a={9.0}>
      <Slip x={140} y={720} w={1500} h={156} fill={C.bg2} seed={5} rot={-0.5} dashed={C.amber}>
        <Big x={40} y={14} size={60} color={C.amber}>Not tested</Big>
        <Tx x={40} y={80} size={34}>ffmpeg 8.1.2, the PC build, real footage, other matrices</Tx>
      </Slip>
    </H>
  </Stage>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, raw: Raw, seen: Seen, mixer: Mixer, hd: Hd, ramp: Ramp, close: Close};
