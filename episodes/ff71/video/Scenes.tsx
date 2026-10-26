import React from 'react';
import {C, F} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import {Mid} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff71/fixture/experiment.mjs (evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
   Production style: editorial collage. Cut-out paper pieces with torn edges (SVG turbulence plus displacement), halftone dots whose size is the measured luma of a level,
   paper grain, masking tape, and type printed twice with a small misregistration. Local components only; palette lab through C.* keys. */

const DATA = {"head":{"map":[25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255],"first255":230,"merged":26,"shift":25,"at0":25,"at100":125,"at128":153},"stair":[[0,0],[0.01,-1],[0.02,2],[0.03,4],[0.04,7],[0.05,12],[0.06,12],[0.07,17],[0.08,17],[0.09,22],[0.1,25],[0.11,25],[0.12,27],[0.13,30],[0.14,35],[0.15,37],[0.16,37],[0.17,42],[0.18,45],[0.19,45],[0.2,50],[0.21,50],[0.22,53],[0.23,58],[0.24,58],[0.25,63],[0.26,63],[0.27,68],[0.28,71],[0.29,71],[0.3,76]],"lim":{"blackOut":41,"whiteOut":255,"above":25,"at255":6,"first":230,"pctLegal":11.4},"contrast":{"map":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,4,5,7,8,10,11,13,14,16,17,19,20,22,23,25,26,28,29,31,32,34,35,37,38,40,41,43,44,46,47,49,50,52,53,55,56,58,59,61,62,64,65,67,68,70,71,73,74,76,77,79,80,82,83,85,86,88,89,91,92,94,95,97,98,100,101,103,104,106,107,109,110,112,113,115,116,118,119,121,122,124,125,127,128,130,131,133,134,136,137,139,140,142,143,145,146,148,149,151,152,154,155,157,158,160,161,163,164,166,167,169,170,172,173,175,176,178,179,181,182,184,185,187,188,190,191,193,194,196,197,199,200,202,203,205,206,208,209,211,212,214,215,217,218,220,221,223,224,226,227,229,230,232,233,235,236,238,239,241,242,244,245,247,248,250,251,253,254,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255],"at16":0,"floorEnd":43,"first255":214},"gamma":{"map":[0,20,28,33,38,42,46,49,53,55,58,61,63,66,68,70,72,74,76,78,80,82,84,85,87,89,90,92,93,95,96,98,99,101,102,103,105,106,107,109,110,111,112,113,115,116,117,118,119,120,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,144,145,146,147,148,149,150,151,152,152,153,154,155,156,157,157,158,159,160,161,161,162,163,164,164,165,166,167,168,168,169,170,171,171,172,173,173,174,175,176,176,177,178,178,179,180,181,181,182,183,183,184,185,185,186,187,187,188,189,189,190,191,191,192,193,193,194,194,195,196,196,197,198,198,199,199,200,201,201,202,202,203,204,204,205,205,206,207,207,208,208,209,210,210,211,211,212,212,213,214,214,215,215,216,216,217,217,218,219,219,220,220,221,221,222,222,223,223,224,225,225,226,226,227,227,228,228,229,229,230,230,231,231,232,232,233,233,234,234,235,235,236,236,237,237,238,238,239,239,240,240,241,241,242,242,243,243,244,244,245,245,246,246,247,247,248,248,249,249,249,250,250,251,251,252,252,253,253,254,254,255,255,255],"at16":72},"fix":{"at16":38,"first235":213,"max":235},"ramp":{"min":25,"max":255,"avg":151.23,"inAvg":127.5,"flat":26},"brightB":{"b01":-1}} as const;


const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const fx = (l: number, x0: number, w: number) => x0 + (l / 255) * w;

/* ---------- local components ---------- */
type TxProps = {x: number; y: number; s?: number; c?: string; w?: number; a?: 'start' | 'middle' | 'end'; f?: 'sans' | 'mono' | 'display'; ls?: number; o?: number; children: React.ReactNode};
const Tx: React.FC<TxProps> = ({x, y, s = 24, c = C.text, w = 400, a = 'start', f = 'sans', ls = 0, o = 1, children}) => (
  <text x={x} y={y} fontSize={s} fill={c} fontWeight={w} textAnchor={a} fontFamily={F[f]} letterSpacing={ls} opacity={o}>{children}</text>
);
/* type printed twice: a madder plate a few pixels off register under the ink plate */
const Reg: React.FC<TxProps & {dx?: number; dy?: number; plate?: string}> = ({dx = 4, dy = 3, plate = C.red, o = 1, ...p}) => (
  <g>
    <Tx {...p} x={p.x + dx} y={p.y + dy} c={plate} o={0.55 * o} />
    <Tx {...p} o={o} />
  </g>
);
const TORN = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const Layer: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', left: 0, top: 0}}>
    <defs>
      {TORN.map((s) => (
        <filter key={s} id={`torn${s}`} x="-6%" y="-8%" width="112%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.026 0.045" numOctaves={3} seed={s * 7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={15} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      ))}
      <filter id="grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={4} result="t" />
        <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 -0.5" result="a" />
        <feFlood floodColor={C.text} result="f" />
        <feComposite in="f" in2="a" operator="in" />
      </filter>
      <pattern id="hatch" patternUnits="userSpaceOnUse" width={10} height={10} patternTransform="rotate(45)"><line x1={0} y1={0} x2={0} y2={10} stroke={C.red} strokeWidth={2.4} /></pattern>
    </defs>
    {children}
    <rect x={0} y={0} width={1920} height={1080} filter="url(#grain)" opacity={0.4} />
  </svg>
);
/* a torn paper piece; the shape under it, offset and darker, is the paper's thickness (flat, no blur) */
const Paper: React.FC<{x: number; y: number; w: number; h: number; rot?: number; seed?: number; fill?: string; under?: string; o?: number; children?: React.ReactNode}> = ({x, y, w, h, rot = 0, seed = 1, fill = C.bg2, under = C.line, o = 1, children}) => (
  <g opacity={o} transform={`translate(${x} ${y}) rotate(${rot} ${w / 2} ${h / 2})`}>
    <rect x={6} y={8} width={w} height={h} fill={under} filter={`url(#torn${(seed % 9) + 1})`} />
    <rect width={w} height={h} fill={fill} filter={`url(#torn${seed})`} />
    {children}
  </g>
);
const Tape: React.FC<{x: number; y: number; rot?: number; w?: number; h?: number; o?: number}> = ({x, y, rot = 0, w = 120, h = 36, o = 1}) => {
  const z = h / 4;
  const pts = `0,0 ${w},0 ${w - 6},${z} ${w},${2 * z} ${w - 6},${3 * z} ${w},${h} 0,${h} 6,${3 * z} 0,${2 * z} 6,${z}`;
  return <g opacity={o} transform={`translate(${x} ${y}) rotate(${rot}) translate(${-w / 2} ${-h / 2})`}><polygon points={pts} fill={C.amberDim} opacity={0.85} stroke={C.amber} strokeWidth={1} /></g>;
};
/* halftone: one dot per value, area of the dot proportional to the luma level; rows are staggered like a screen */
const Dots: React.FC<{x: number; y: number; vals: readonly number[]; rows?: number; pitch?: number; color?: string; n?: number; o?: number; mark?: (i: number) => string | null}> = ({x, y, vals, rows = 3, pitch = 21.6, color = C.text, n, o = 1, mark}) => {
  const out: React.ReactNode[] = [];
  const shown = n ?? vals.length;
  for (let r = 0; r < rows; r++) for (let i = 0; i < vals.length; i++) {
    if (i >= shown) break;
    const rad = (pitch / 2) * Math.sqrt(vals[i] / 255);
    if (rad < 0.4) continue;
    out.push(<circle key={`${r}-${i}`} cx={x + i * pitch + (r % 2 ? pitch / 2 : 0) + pitch / 2} cy={y + r * pitch * 0.87 + pitch / 2} r={rad} fill={mark?.(i) ?? color} />);
  }
  return <g opacity={o}>{out}</g>;
};
const sample = (m: readonly number[], step = 4) => Array.from({length: 64}, (_, c) => m[Math.min(255, c * step)]);
const RAMP_IN = Array.from({length: 64}, (_, c) => c * 4);

/* title: a kicker label and the title on taped slips, set twice off register */
const Title: React.FC<{kick: string; title: string; color: string; o?: number; seed?: number}> = ({kick, title, color, o = 1, seed = 1}) => {
  const w = Math.round(title.length * 37 + 110), x = 960 - w / 2;
  return (
    <Layer>
      <g opacity={o}>
        <Paper x={x} y={170} w={w} h={104} rot={-0.6} seed={seed} fill={C.bg2}>
          <Reg x={w / 2} y={82} s={90} w={800} a="middle" f="display" ls={0.4} c={C.text} dx={5} dy={3}>{title}</Reg>
        </Paper>
        <Paper x={x - 18} y={124} w={kick.length * 15 + 56} h={42} rot={-2} seed={seed + 2} fill={C.panel}>
          <Tx x={28} y={29} s={22} f="mono" w={700} ls={2} c={color}>{kick}</Tx>
        </Paper>
        <Tape x={x + w - 26} y={178} rot={32} w={96} h={32} />
      </g>
    </Layer>
  );
};

/* ---------- 1. the question ---------- */
const Ask: React.FC<SceneProps> = ({t}) => {
  const cols = Math.round(64 * ep(t, 1.6, 4.4));
  return (
    <>
      <Title kick="brightness 0.1" title="How many levels?" color={C.red} o={ep(t, 0.2, 0.9)} seed={1} />
      <Layer>
        <Paper x={240} y={320} w={1440} h={172} rot={-0.3} seed={2} o={ep(t, 1.2, 2.0)}>
          <Dots x={26} y={26} vals={RAMP_IN} n={cols} color={C.text} />
          <Tx x={26} y={152} s={22} f="mono" c={C.dim}>0</Tx>
          <Tx x={1414} y={152} s={22} f="mono" c={C.dim} a="end">255</Tx>
          <Tx x={720} y={152} s={22} f="mono" c={C.dim} a="middle">input ramp, dot size = luma level</Tx>
        </Paper>
        <g opacity={ep(t, 5.4, 6.4)}>
          <Paper x={640} y={528} w={640} h={68} rot={0.8} seed={3} fill={C.panel}>
            <Tx x={320} y={46} s={32} f="mono" w={700} a="middle" c={C.cyan}>-vf eq=brightness=0.1</Tx>
          </Paper>
          <Tape x={660} y={530} rot={-20} w={90} h={30} />
        </g>
        <Paper x={240} y={640} w={1440} h={172} rot={0.3} seed={4} fill={C.panel} o={ep(t, 8.4, 9.4)}>
          <Reg x={720} y={118} s={130} w={800} a="middle" f="display" c={C.text} o={ep(t, 10.4, 11.4)}>? ? ?</Reg>
          <Tx x={26} y={152} s={22} f="mono" c={C.dim}>output: how many levels added, where is the clip?</Tx>
        </Paper>
        <g opacity={ep(t, 13.6, 14.6)}>
          <Paper x={248} y={286} w={250} h={40} rot={-3} seed={5} fill={C.amberDim}><Tx x={125} y={28} s={20} f="mono" w={700} a="middle" c={C.text}>limited range (tv)</Tx></Paper>
        </g>
        <g opacity={ep(t, 15.4, 16.4)}>
          <Paper x={1420} y={286} w={250} h={40} rot={2.4} seed={6} fill={C.greenDim}><Tx x={125} y={28} s={20} f="mono" w={700} a="middle" c={C.text}>full range (pc)</Tx></Paper>
        </g>
      </Layer>
    </>
  );
};

/* ---------- 2. the readers ---------- */
const SWATCH = [0, 32, 64, 100, 128, 192, 230, 255];
const Swatch: React.FC<{x: number; y: number; level: number; size?: number}> = ({x, y, level, size = 62}) => {
  const p = size / 5, out: React.ReactNode[] = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) { const rad = (p / 2) * Math.sqrt(level / 255); if (rad > 0.4) out.push(<circle key={`${r}${c}`} cx={x + c * p + p / 2} cy={y + r * p + p / 2} r={rad} fill={C.text} />); }
  return <g><rect x={x} y={y} width={size} height={size} fill="none" stroke={C.mute} strokeWidth={1.5} />{out}</g>;
};
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Title kick="two readers, one control" title="The test ramp" color={C.cyan} o={ep(t, 0.2, 0.9)} seed={2} />
    <Layer>
      <g opacity={ep(t, 2.0, 3.0)}>
        <Paper x={190} y={310} w={720} h={250} rot={-0.7} seed={3}>
          <Tx x={28} y={46} s={30} w={700} c={C.cyan}>reader 1: Node</Tx>
          <Tx x={28} y={78} s={21} f="mono" c={C.dim}>decoded Y plane, first luma byte of each frame</Tx>
          {SWATCH.map((l, i) => <g key={l}><Swatch x={28 + i * 84} y={100} level={l} /><Tx x={28 + i * 84 + 31} y={198} s={19} f="mono" a="middle" c={C.text}>{l}</Tx></g>)}
          <Tx x={28} y={232} s={21} f="mono" c={C.dim}>256 flat frames, frame n has luma n</Tx>
        </Paper>
        <Tape x={470} y={316} rot={-3} w={110} h={32} />
      </g>
      <g opacity={ep(t, 6.0, 7.0)}>
        <Paper x={1010} y={310} w={720} h={250} rot={0.6} seed={4}>
          <Tx x={28} y={46} s={30} w={700} c={C.cyan}>reader 2: ffmpeg signalstats</Tx>
          <Tx x={28} y={78} s={21} f="mono" c={C.dim}>YAVG, YMIN, YMAX of each frame</Tx>
          <Reg x={28} y={170} s={78} w={800} f="display" c={C.text}>frame 100: YAVG 100</Reg>
          <Tx x={28} y={226} s={21} f="mono" c={C.dim}>flat frame, so the average is the level</Tx>
        </Paper>
        <Tape x={1370} y={316} rot={4} w={110} h={32} />
      </g>
      <g opacity={ep(t, 10.0, 11.0)}>
        <Paper x={190} y={600} w={720} h={236} rot={0.5} seed={5} fill={C.greenDim}>
          <Tx x={28} y={46} s={30} w={700} c={C.green}>control: no filter</Tx>
          <Reg x={28} y={150} s={96} w={800} f="display" c={C.text}>256 of 256</Reg>
          <Tx x={28} y={198} s={21} f="mono" c={C.text}>levels map to themselves, in both readers</Tx>
        </Paper>
        <Tape x={560} y={606} rot={2} w={110} h={32} />
      </g>
      <g opacity={ep(t, 14.0, 15.0)}>
        <Paper x={1010} y={600} w={720} h={236} rot={-0.5} seed={6} fill={C.redDim}>
          <Tx x={28} y={46} s={30} w={700} c={C.red}>known positive</Tx>
          <Tx x={28} y={96} s={24} f="mono" w={700} c={C.text}>lutyuv=y=clip(val+25,0,255)</Tx>
          <Tx x={28} y={148} s={24} f="mono" c={C.text}>level 100 becomes 125</Tx>
          <Tx x={28} y={188} s={24} f="mono" c={C.text}>first 255 at level 230</Tx>
          <Tx x={28} y={222} s={19} f="mono" c={C.dim}>a shift we wrote ourselves: both readers see +25</Tx>
        </Paper>
        <Tape x={1400} y={606} rot={-3} w={110} h={32} />
      </g>
    </Layer>
  </>
);

/* ---------- 3. the size of the shift ---------- */
const Add: React.FC<SceneProps> = ({t}) => {
  const bars = DATA.stair, X0 = 930, BASE = 700, SC = 4.0, PITCH = 25.2;
  const nShow = Math.round(31 * ep(t, 5.0, 14.0));
  const marks: Record<number, {txt: string; c: string}> = {9: {txt: '22', c: C.text}, 12: {txt: '27', c: C.text}};
  return (
    <>
      <Title kick="eq=brightness=0.1" title="It adds 25." color={C.red} o={ep(t, 0.2, 0.9)} seed={3} />
      <Layer>
        <g opacity={ep(t, 1.0, 2.0)}>
          <Paper x={140} y={330} w={640} h={400} rot={-1.6} seed={4} fill={C.panel}>
            <Reg x={320} y={250} s={290} w={800} a="middle" f="display" c={C.text} dx={7} dy={5}>+25</Reg>
            <Tx x={320} y={310} s={26} f="mono" w={700} a="middle" c={C.cyan}>levels at brightness 0.1</Tx>
            <Tx x={320} y={352} s={21} f="mono" a="middle" c={C.dim}>{`0 to ${DATA.head.at0},  100 to ${DATA.head.at100},  128 to ${DATA.head.at128}`}</Tx>
          </Paper>
          <Tape x={220} y={340} rot={-30} w={110} h={32} />
        </g>
        <g opacity={ep(t, 3.6, 4.6)}>
          <Paper x={850} y={300} w={900} h={540} rot={0.4} seed={5}>
            <Tx x={30} y={42} s={24} f="mono" w={700} c={C.cyan}>levels added, by brightness value</Tx>
          </Paper>
        </g>
        <g>
          <line x1={X0 - 14} y1={BASE} x2={X0 + 31 * PITCH} y2={BASE} stroke={C.text} strokeWidth={2.5} opacity={ep(t, 3.8, 4.6)} />
          {[0, 5, 10, 15, 20, 25, 30].map((k) => <g key={k} opacity={ep(t, 3.8, 4.6)}><line x1={X0 + k * PITCH + 8} y1={BASE} x2={X0 + k * PITCH + 8} y2={BASE + 10} stroke={C.text} strokeWidth={2} /><Tx x={X0 + k * PITCH + 8} y={BASE + 40} s={20} f="mono" a="middle" c={C.dim}>{(k / 100).toFixed(2)}</Tx></g>)}
          {[25, 50, 75].map((v) => <g key={v} opacity={ep(t, 3.8, 4.6)}><line x1={X0 - 14} y1={BASE - v * SC} x2={X0 + 31 * PITCH} y2={BASE - v * SC} stroke={C.line} strokeWidth={1.2} strokeDasharray="5 6" /><Tx x={X0 - 22} y={BASE - v * SC + 7} s={19} f="mono" a="end" c={C.dim}>{v}</Tx></g>)}
          {bars.map(([b, sh], i) => {
            if (i >= nShow) return null;
            const h = sh * SC, pair = b === 0.1 || b === 0.11 || b === 0.05 || b === 0.06, neg = sh < 0;
            const col = neg ? C.red : pair ? C.amber : C.cyan;
            const x = X0 + i * PITCH;
            return (
              <g key={i}>
                <rect x={x} y={sh >= 0 ? BASE - h : BASE} width={17} height={Math.max(neg ? 5 : 0, Math.abs(h))} fill={col} />
                {marks[i] && <Tx x={x + 8} y={BASE - h - 8} s={19} f="mono" w={700} a="middle" c={marks[i].c}>{marks[i].txt}</Tx>}
              </g>
            );
          })}
          <g opacity={ep(t, 9.6, 10.6)}>
            <Tx x={X0 + 5.5 * PITCH + 8} y={BASE - 12 * SC - 40} s={22} f="mono" w={700} a="middle" c={C.amber}>12 = 12</Tx>
            <Tx x={X0 + 11 * PITCH + 17} y={BASE - 25 * SC - 54} s={22} f="mono" w={700} a="end" c={C.amber}>25 = 25</Tx>
          </g>
          <g opacity={ep(t, 16.6, 17.6)}>
            <Tx x={X0 + 1 * PITCH + 8} y={BASE + 74} s={22} f="mono" w={700} a="middle" c={C.red}>0.01 is -1</Tx>
            <line x1={X0 + 1 * PITCH + 8} y1={BASE + 52} x2={X0 + 1 * PITCH + 8} y2={BASE + 6} stroke={C.red} strokeWidth={2} />
          </g>
        </g>
      </Layer>
    </>
  );
};

/* ---------- 4. where it clips ---------- */
const Clip: React.FC<SceneProps> = ({t}) => {
  const out = sample(DATA.head.map);
  const nIn = Math.round(64 * ep(t, 0.8, 2.2)), nOut = Math.round(64 * ep(t, 2.2, 4.0));
  const c0 = 58; // first column whose level (4 per column) is 230 or more: 232
  const x0 = 240 + 26 + c0 * 21.6, x1 = 240 + 26 + 64 * 21.6 + 11;
  return (
    <>
      <Title kick="the sum stops at 255" title="Everything above clips." color={C.red} o={ep(t, 0.2, 0.9)} seed={4} />
      <Layer>
        <Paper x={240} y={310} w={1440} h={160} rot={-0.3} seed={5} o={ep(t, 0.5, 1.2)}>
          <Dots x={26} y={22} vals={RAMP_IN} n={nIn} color={C.cyan} />
          <Tx x={26} y={142} s={20} f="mono" c={C.dim}>input</Tx>
          <Tx x={1414} y={142} s={20} f="mono" c={C.dim} a="end">255</Tx>
        </Paper>
        <Paper x={240} y={520} w={1440} h={160} rot={0.3} seed={6} fill={C.panel} o={ep(t, 2.0, 2.8)}>
          <Dots x={26} y={22} vals={out} n={nOut} color={C.text} mark={(i) => (i >= c0 ? C.red : null)} />
          <Tx x={26} y={142} s={20} f="mono" c={C.dim}>output of brightness 0.1</Tx>
        </Paper>
        <g opacity={ep(t, 4.2, 5.0)}>
          <path d={`M ${x0} 700 L ${x0} 716 L ${x1} 716 L ${x1} 700`} fill="none" stroke={C.red} strokeWidth={3.5} />
          <Reg x={1680} y={768} s={40} f="display" w={800} a="end" c={C.red} plate={C.text} dx={3} dy={2}>{`230 to 255: ${DATA.head.merged} levels, one white`}</Reg>
        </g>
        <g opacity={ep(t, 6.2, 7.0)}>
          <Tx x={266} y={768} s={26} f="mono" w={700} c={C.amber}>{`0 becomes ${DATA.head.at0}`}</Tx>
          <line x1={270} y1={700} x2={270} y2={742} stroke={C.amber} strokeWidth={2.5} />
        </g>
        <Tx x={960} y={836} s={22} f="mono" a="middle" c={C.dim} o={ep(t, 8.0, 8.8)}>{`signalstats on the ramp: YMIN ${DATA.ramp.min}, YMAX ${DATA.ramp.max}`}</Tx>
      </Layer>
    </>
  );
};

/* ---------- 5. limited or full range ---------- */
const Range: React.FC<SceneProps> = ({t}) => {
  const X0 = 270, W = 1380, R1 = 470, R2 = 650, BH = 54;
  const f = (l: number) => fx(l, X0, W);
  const out = DATA.head.map;
  return (
    <>
      <Title kick="eq ignores the range tag" title="Limited or full." color={C.amber} o={ep(t, 0.2, 0.9)} seed={5} />
      <Layer>
        <Paper x={200} y={310} w={1520} h={540} rot={-0.2} seed={6} />
        <g opacity={ep(t, 1.2, 2.2)}>
          <Tx x={X0} y={R1 - 22} s={22} f="mono" w={700} c={C.cyan}>input levels</Tx>
          <rect x={f(0)} y={R1} width={W} height={BH} fill={C.panel} stroke={C.mute} strokeWidth={1.5} />
          <rect x={f(16)} y={R1} width={f(235) - f(16)} height={BH} fill={C.greenDim} stroke={C.green} strokeWidth={2.5} />
          <Tx x={f(16)} y={R1 + BH + 28} s={20} f="mono" a="middle" c={C.green}>16</Tx>
          <Tx x={f(235)} y={R1 + BH + 28} s={20} f="mono" a="middle" c={C.green}>235</Tx>
          <Tx x={(f(16) + f(235)) / 2} y={R1 + 35} s={22} f="mono" a="middle" c={C.green}>legal range</Tx>
        </g>
        <g opacity={ep(t, 4.0, 5.0)}>
          <Tx x={X0} y={R2 + BH + 66} s={22} f="mono" w={700} c={C.cyan}>output of brightness 0.1</Tx>
          <rect x={f(0)} y={R2} width={W} height={BH} fill={C.panel} stroke={C.mute} strokeWidth={1.5} />
          <rect x={f(out[0])} y={R2} width={f(out[255]) - f(out[0])} height={BH} fill={C.amberDim} stroke={C.amber} strokeWidth={2.5} />
          <rect x={f(235)} y={R2} width={f(255) - f(235)} height={BH} fill="url(#hatch)" stroke={C.red} strokeWidth={2.5} />
          <Tx x={f(out[16])} y={R2 + BH + 28} s={20} f="mono" a="middle" c={C.amber}>{out[16]}</Tx>
          <Tx x={f(255)} y={R2 + BH + 28} s={20} f="mono" a="end" c={C.red}>255</Tx>
        </g>
        <g opacity={ep(t, 6.0, 7.0)}>
          <line x1={f(16)} y1={R1 + BH} x2={f(out[16])} y2={R2} stroke={C.text} strokeWidth={2.5} strokeDasharray="2 7" strokeLinecap="round" />
          <Reg x={f(out[16]) + 40} y={(R1 + R2) / 2 + 36} s={34} f="display" w={800} a="start" c={C.text}>{`legal black 16 becomes ${out[16]}`}</Reg>
        </g>
        <g opacity={ep(t, 8.6, 9.6)}>
          <line x1={f(235)} y1={R1 + BH} x2={f(255)} y2={R2} stroke={C.red} strokeWidth={2.5} strokeDasharray="2 7" strokeLinecap="round" />
          <Reg x={f(235) - 20} y={(R1 + R2) / 2 + 36} s={34} f="display" w={800} a="end" c={C.red} plate={C.text} dx={3} dy={2}>{`legal white 235 becomes ${out[235]}`}</Reg>
        </g>
        <g opacity={ep(t, 11.0, 12.0)}>
          <Tx x={X0} y={802} s={22} f="mono" c={C.dim}>{`${DATA.lim.above} legal levels end above 235; ${DATA.lim.at255} legal levels (230 to 235) merge into 255`}</Tx>
        </g>
        <g opacity={ep(t, 13.2, 14.2)}>
          <Paper x={1296} y={332} w={340} h={64} rot={2} seed={7} fill={C.greenDim}><Tx x={170} y={42} s={21} f="mono" w={700} a="middle" c={C.text}>tv and pc: identical</Tx></Paper>
          <Tape x={1306} y={336} rot={-25} w={80} h={28} />
        </g>
      </Layer>
    </>
  );
};

/* ---------- 6. contrast and gamma ---------- */
const Curve: React.FC<{x: number; y: number; size: number; map: readonly number[]; p: number; color: string; title: string; seed: number; o: number; floorEnd?: number; at16: number; label: string}> = ({x, y, size, map, p, color, title, seed, o, floorEnd, at16, label}) => {
  const bx = x + 60, by = y + 100, S = size / 255;
  const pts = map.map((v, i) => [bx + i * S, by + size - v * S] as const).filter((_, i) => i <= Math.round(255 * p));
  return (
    <g opacity={o}>
      <Paper x={x} y={y - 40} w={size + 120} h={size + 220} rot={seed % 2 ? -0.5 : 0.5} seed={seed} />
      <Tx x={x + 30} y={y + 20} s={30} f="mono" w={700} c={color}>{title}</Tx>
      <rect x={bx} y={by} width={size} height={size} fill="none" stroke={C.mute} strokeWidth={1.5} />
      <line x1={bx} y1={by + size} x2={bx + size} y2={by} stroke={C.mute} strokeWidth={1.5} strokeDasharray="6 6" />
      <polyline points={pts.map((q) => q.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={4} />
      {floorEnd !== undefined && p > 0.9 && <line x1={bx} y1={by + size} x2={bx + floorEnd * S} y2={by + size} stroke={C.red} strokeWidth={9} />}
      {p > 0.9 && <g><circle cx={bx + 16 * S} cy={by + size - at16 * S} r={9} fill="none" stroke={C.red} strokeWidth={3} /></g>}
      <Tx x={bx} y={by + size + 36} s={19} f="mono" c={C.dim}>0</Tx>
      <Tx x={bx + size} y={by + size + 36} s={19} f="mono" a="end" c={C.dim}>input 255</Tx>
      <Tx x={bx - 10} y={by + 6} s={19} f="mono" a="end" c={C.dim}>255</Tx>
      <Tx x={bx + size / 2} y={by + size + 68} s={24} f="mono" w={700} a="middle" c={C.red} o={p > 0.9 ? 1 : 0}>{label}</Tx>
    </g>
  );
};
const Other: React.FC<SceneProps> = ({t}) => (
  <>
    <Title kick="same blindness" title="Contrast and gamma too." color={C.red} o={ep(t, 0.2, 0.9)} seed={6} />
    <Layer>
      <Curve x={330} y={330} size={360} map={DATA.contrast.map} p={ep(t, 1.0, 4.2)} color={C.cyan} title="eq=contrast=1.5" seed={7} o={ep(t, 0.6, 1.4)} floorEnd={DATA.contrast.floorEnd} at16={DATA.contrast.at16} label={`levels 0 to ${DATA.contrast.floorEnd} all become 0`} />
      <Curve x={1110} y={330} size={360} map={DATA.gamma.map} p={ep(t, 6.2, 9.4)} color={C.amber} title="eq=gamma=2.2" seed={8} o={ep(t, 5.8, 6.6)} at16={DATA.gamma.at16} label={`legal black 16 becomes ${DATA.gamma.at16}`} />
    </Layer>
  </>
);

/* ---------- 7. what we measured ---------- */
const Close: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {c: C.red, k: 'the shift', a: `brightness 0.1 adds ${DATA.head.shift} levels`, b: 'in steps: 0.10 and 0.11 equal, 0.01 is 1 darker'},
    {c: C.red, k: 'the clip', a: `levels 230 to 255 all become 255`, b: `${DATA.head.merged} levels in one; black 0 becomes ${DATA.head.at0}`},
    {c: C.amber, k: 'the range', a: `no range awareness: tv equals pc`, b: `legal white 235 becomes 255, black 16 becomes ${DATA.lim.blackOut}`},
    {c: C.cyan, k: 'contrast, gamma', a: `contrast 1.5: 0 to ${DATA.contrast.floorEnd} become 0`, b: `gamma 2.2: legal black 16 becomes ${DATA.gamma.at16}`},
    {c: C.green, k: 'a fix', a: 'lutyuv=y=clip(val+22,16,235)', b: `ends at ${DATA.fix.max}; ${DATA.fix.first235} and up all give 235`},
  ];
  return (
    <>
      <Title kick="what we measured" title="Five facts." color={C.cyan} o={ep(t, 0.2, 0.9)} seed={7} />
      <Layer>
        {rows.map((r, i) => {
          const y = 308 + i * 100, o = ep(t, 1.2 + i * 1.4, 2.0 + i * 1.4);
          return (
            <g key={r.k} opacity={o}>
              <Paper x={200} y={y} w={1520} h={84} rot={i % 2 ? 0.25 : -0.25} seed={(i % 6) + 1} fill={i === 4 ? C.greenDim : C.bg2}>
                <rect x={0} y={0} width={14} height={84} fill={r.c} />
                <Reg x={42} y={56} s={42} w={800} f="display" c={C.text} dx={3} dy={2} plate={r.c}>{r.k}</Reg>
                <Tx x={420} y={36} s={24} f="mono" w={700} c={C.text}>{r.a}</Tx>
                <Tx x={420} y={68} s={21} f="mono" c={C.dim}>{r.b}</Tx>
              </Paper>
            </g>
          );
        })}
      </Layer>
      <Mid y={820} size={25} color={C.dim} o={ep(t, 8.6, 9.4)}>Not tested: other builds, real footage, 10 bit, RGB input, other filters.</Mid>
    </>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, add: Add, clip: Clip, range: Range, other: Other, close: Close};
