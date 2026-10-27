import React from 'react';
import {C, F, D} from '../../kit/theme';
import {ep, prog, rnd} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Vox flat graphics. Bold flat blocks of the lab inks, split screens, annotated freeze frames (hand drawn circles and arrows),
 * giant numbers, and labeled bars and grids drawn to scale. Identity colors: chromakey is indigo, colorkey is ochre; madder is the failure, olive is verified.
 * Every number comes from episodes/ff88/fixture/experiment.mjs (96x72 cards, ffmpeg 6.1.1): 4 filter variants x 4 blends x 11 similarities = 176 runs,
 * read by alphaextract and by a PNG decoder in Node, plus the exact key test on six key colors and the matched blend runs.
 */

const beatOf = (t: number, starts: number[]) => { let i = 0; for (let k = 0; k < starts.length; k++) if (t >= starts[k]) i = k; return {i, lt: t - starts[i]}; };
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
type K = 'cyan' | 'amber' | 'red' | 'green' | 'text' | 'bg2' | 'panel' | 'mute' | 'dim' | 'line' | 'cyanDim' | 'amberDim' | 'redDim' | 'greenDim';
const CH: K = 'cyan', CK: K = 'amber'; // chromakey indigo, colorkey ochre

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

/* ---------- an alpha matte square: opaque pixels in ink, keyed pixels as paper with an outline ---------- */
const Matte: React.FC<{x: number; y: number; w: number; h: number; opaque: boolean; o?: number; fill?: number}> = ({x, y, w, h, opaque, o = 1, fill = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: o, boxSizing: 'border-box', border: `4px solid ${C.text}`, background: C.bg2, overflow: 'hidden'}}>
    {opaque ? <div style={{position: 'absolute', left: 0, top: 0, width: '100%', height: `${fill * 100}%`, background: C.text}} /> : (
      <svg width={w} height={h} style={{position: 'absolute', left: -4, top: -4}}>
        {Array.from({length: 12}, (_, i) => <line key={i} x1={-20 + i * 48} y1={h + 8} x2={i * 48 + 80} y2={-8} stroke={C.line} strokeWidth={2} />)}
      </svg>
    )}
  </div>
);

/* ---------- labeled horizontal bars drawn to scale, values with decimals ---------- */
const HBars: React.FC<{x: number; y: number; unit: number; rows: {label: string; v: number; k: K; text?: string}[]; rh?: number; reveal: number; labelW?: number; size?: number; numSize?: number}> = ({x, y, unit, rows, rh = 70, reveal, labelW = 230, size = 26, numSize = 44}) => (
  <>
    {rows.map((r, i) => {
      const p = ep(reveal, i * 0.12, i * 0.12 + 0.5);
      return (
        <div key={i} style={{position: 'absolute', left: x, top: y + i * rh, width: 1000, height: rh - 10, opacity: p > 0 ? 1 : 0}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: labelW - 14, height: rh - 10, lineHeight: `${rh - 10}px`, textAlign: 'right', fontFamily: F.mono, fontSize: size, color: C.text, whiteSpace: 'nowrap'}}>{r.label}</div>
          <div style={{position: 'absolute', left: labelW, top: 0, width: Math.max(6, r.v * unit * p), height: rh - 10, background: C[r.k]}} />
          <div style={{position: 'absolute', left: labelW + Math.max(6, r.v * unit * p) + 14, top: 0, lineHeight: `${rh - 10}px`, fontFamily: F.display, fontWeight: 900, fontSize: numSize * D.k * 0.8, color: C[r.k], opacity: p, whiteSpace: 'nowrap'}}>{r.text ?? String(r.v)}</div>
        </div>
      );
    })}
  </>
);

/* ---------- the evidence ---------- */
/* first similarity (blend 0) that keys the probe, for the key and the key moved by the same amount on every channel */
const LUMA_LABELS = ['key', 'key + 16', 'key + 40', 'key - 16', 'key - 20'];
const LUMA_CK = [0.01, 0.075, 0.2, 0.075, 0.1];
const LUMA_CH = [0.03, 0.03, 0.03, 0.03, 0.03];
/* six key colors: [hex, key U,V as the filter sees it, card U,V, distance in alpha levels, alpha of the card at similarity 0.01] */
const KEYS: {hex: string; key: [number, number]; px: [number, number]; d: number; a: number}[] = [
  {hex: '14B43C', key: [95, 58], px: [99, 66], d: 6, a: 255}, {hex: '00FF00', key: [44, 21], px: [54, 34], d: 11, a: 255}, {hex: '00B140', key: [101, 49], px: [105, 58], d: 6, a: 255},
  {hex: '0000FF', key: [256, 107], px: [240, 110], d: 10, a: 255}, {hex: '90C090', key: [112, 108], px: [114, 110], d: 1, a: 0}, {hex: '808080', key: [128, 128], px: [128, 128], d: 0, a: 0},
];
/* alpha along row 35, columns 14 to 30, through the soft edge */
const PROF = {
  ideal: [0, 0, 0, 13, 38, 64, 89, 115, 140, 166, 191, 217, 242, 255, 255, 255, 255],
  ck0: [0, 0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255],
  ck1: [0, 0, 0, 0, 0, 53, 178, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255],
  ckm: [0, 0, 0, 12, 37, 63, 88, 114, 139, 165, 190, 216, 241, 255, 255, 255, 255],
  ch1: [0, 0, 0, 0, 0, 0, 61, 136, 209, 255, 255, 255, 255, 255, 255, 255, 255],
};
/* the noisy card: rows are blend 0, 0.1, 0.2, 0.5; columns are similarity 0.01 ... 0.5. C clean, S specks left, L subject lost, B both */
const SIMS = ['0.01', '0.02', '0.03', '0.05', '0.075', '0.1', '0.15', '0.2', '0.3', '0.4', '0.5'];
const BLENDS = ['0', '0.1', '0.2', '0.5'];
const WIN_CK = ['SSSSSCCCCLL', 'SSSCCCCCLLL', 'CCCCCCCCLLL', 'CCCCCLLLLLL'];
const WIN_CH = ['SSSSSSLLLLL', 'SSSSBLLLLLL', 'BBBLLLLLLLL', 'LLLLLLLLLLL'];
const WCOL: Record<string, K> = {C: 'green', S: 'red', L: 'amber', B: 'text'};

/* 1. The question: a card of exactly the key color */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const sq = (x: number, k: K, n: string, hex: string) => (
    <Blk x={x} y={190} w={880} h={520} k={k} o={ep(t, k === CH ? 0.2 : 0.5, k === CH ? 0.6 : 0.9)}>
      <Tag text={n} y={20} size={30} />
      <Tag text={hex} y={20} x={0} w={850} align="right" size={24} />
    </Blk>
  );
  return (
    <Page>
      <Line text="a 96 x 72 card of exactly the key color, 14B43C, keyed with 14B43C" x={60} y={132} size={30} mono color={C.dim} w={1800} o={ep(t, 0, 0.4)} />
      {sq(60, CH, 'chromakey', 'similarity 0.01 (default)')}
      {sq(980, CK, 'colorkey', 'similarity 0.01 (default)')}
      <Matte x={100} y={280} w={380} h={285} opaque o={ep(t, A(0.14), A(0.2))} fill={ep(t, A(0.16), A(0.3))} />
      <Matte x={1020} y={280} w={380} h={285} opaque={false} o={ep(t, A(0.34), A(0.4))} />
      <Giant text="0" size={260} x={520} y={290} w={330} o={ep(t, A(0.3), A(0.38))} />
      <Giant text="6912" size={180} x={1430} y={310} w={420} o={ep(t, A(0.46), A(0.54))} />
      <Tag text="pixels keyed" x={520} y={520} w={330} align="center" size={26} o={ep(t, A(0.32), A(0.4))} />
      <Tag text="pixels keyed" x={1430} y={520} w={420} align="center" size={26} o={ep(t, A(0.48), A(0.56))} />
      <Tag text="alpha 255 everywhere" x={100} y={600} size={26} o={ep(t, A(0.34), A(0.42))} />
      <Tag text="alpha 0 everywhere" x={1020} y={600} size={26} o={ep(t, A(0.5), A(0.58))} />
      <Circle cx={290} cy={422} rx={190} ry={146} p={prog(t, A(0.56), A(0.68))} seed={4} color={C.red} sw={9} />
      <Line text="chromakey=color=0x14B43C" x={60} y={742} size={34} mono color={C.text} w={880} bold o={ep(t, A(0.2), A(0.3))} />
      <Line text="colorkey=color=0x14B43C" x={980} y={742} size={34} mono color={C.text} w={880} bold o={ep(t, A(0.5), A(0.6))} />
      <Line text="similarity 0.1: 0.1 of what?" x={60} y={812} size={50} w={1800} bold color={C.text} o={ep(t, A(0.7), A(0.8))} />
    </Page>
  );
};

/* 2. Four cards, two readers */
const SOFT_RINGS = Array.from({length: 11}, (_, i) => i); // 11 rings from radius 31 down to 21
const Setup: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const S = 3.2, CW = 96 * S, CHt = 72 * S, GAP = 106, X0 = 120, Y0 = 186;
  const probeCol = (i: number): K => (i < 5 ? 'green' : i < 12 ? 'greenDim' : i === 12 ? 'amber' : i === 13 ? 'amberDim' : i === 14 ? 'mute' : i === 15 ? 'bg2' : i === 16 ? 'text' : i === 17 ? 'red' : i === 18 ? 'cyan' : i === 19 ? 'cyanDim' : i === 20 ? 'amberDim' : i === 21 ? 'greenDim' : i === 22 ? 'greenDim' : 'redDim');
  const card = (k: number, label: string, sub: string, body: React.ReactNode) => (
    <div key={k} style={{position: 'absolute', left: X0 + k * (CW + GAP), top: Y0, opacity: ep(t, 0.1 + k * 0.5, 0.5 + k * 0.5)}}>
      <div style={{position: 'relative', width: CW, height: CHt, background: C.green, border: `4px solid ${C.text}`, boxSizing: 'border-box', overflow: 'hidden'}}>{body}</div>
      <div style={{fontFamily: F.mono, fontSize: 26, letterSpacing: 2, textTransform: 'uppercase', color: C.text, marginTop: 12}}>{label}</div>
      <div style={{fontFamily: F.mono, fontSize: 22, color: C.dim, marginTop: 2}}>{sub}</div>
    </div>
  );
  return (
    <Page>
      {card(0, 'probe', '24 flat blocks', <>{Array.from({length: 24}, (_, i) => <div key={i} style={{position: 'absolute', left: (i % 6) * (CW / 6), top: Math.floor(i / 6) * (CHt / 4), width: CW / 6, height: CHt / 4, background: C[probeCol(i)], boxSizing: 'border-box', border: `1px solid ${C.bg}`}} />)}</>)}
      {card(1, 'soft', 'disc, 1628 edge pixels', (
        <svg width={CW} height={CHt} style={{position: 'absolute', left: -4, top: -4}}>
          {SOFT_RINGS.map((i) => <circle key={i} cx={47.5 * S} cy={35.5 * S} r={(31 - i) * S} fill={C.amber} opacity={i === 0 ? 0.1 : 0.14 + i * 0.08} />)}
          <circle cx={47.5 * S} cy={35.5 * S} r={21 * S} fill={C.amber} />
        </svg>
      ))}
      {card(2, 'noisy', 'up to 24 levels of noise', (
        <svg width={CW} height={CHt} style={{position: 'absolute', left: -4, top: -4}}>
          {Array.from({length: 24 * 18}, (_, i) => { const cx = i % 24, cy = Math.floor(i / 24); const inside = cx >= 7 && cx < 17 && cy >= 5 && cy < 13; if (inside) return null; return <rect key={i} x={cx * 4 * S} y={cy * 4 * S} width={4 * S} height={4 * S} fill={rnd(i + 7) > 0.5 ? C.greenDim : C.green} opacity={0.35 + rnd(i * 3 + 1) * 0.5} />; })}
          <rect x={28 * S} y={21 * S} width={20 * S} height={30 * S} fill={C.amber} />
          <rect x={48 * S} y={21 * S} width={20 * S} height={30 * S} fill={C.amberDim} />
        </svg>
      ))}
      {card(3, 'flat', 'the key color alone', null)}
      <Blk x={120} y={560} w={540} h={270} k={CK} o={ep(t, A(0.34), A(0.42))} dy={(1 - ep(t, A(0.34), A(0.42))) * 40}>
        <Tag text="reader 1" y={18} />
        <Line text="alphaextract, raw gray, read in Node" x={28} y={64} size={28} color={C.bg} w={490} />
        <Line text={'alpha plane\nof every frame'} x={28} y={170} size={36} mono color={C.bg} w={490} bold />
      </Blk>
      <Blk x={700} y={560} w={540} h={270} k={CH} o={ep(t, A(0.5), A(0.58))} dy={(1 - ep(t, A(0.5), A(0.58))) * 40}>
        <Tag text="reader 2" y={18} />
        <Line text="the same output as a PNG, decoded in Node" x={28} y={64} size={28} color={C.bg} w={490} />
        <Line text={'zlib + unfilter,\nno ffmpeg'} x={28} y={170} size={36} mono color={C.bg} w={490} bold />
      </Blk>
      <Blk x={1280} y={560} w={520} h={270} k="green" o={ep(t, A(0.68), A(0.76))} dy={(1 - ep(t, A(0.68), A(0.76))) * 40}>
        <Tag text="agree" y={18} />
        <Giant text="176 of 176" size={104} x={0} y={56} w={520} />
        <Line text="runs: raw alpha equals PNG alpha" x={0} y={170} size={26} color={C.bg} w={520} align="center" />
        <Line text="formulas in Node: colorkey 44 runs, chromakey 88" x={20} y={212} size={21} color={C.bg} w={480} align="center" />
      </Blk>
    </Page>
  );
};

/* 3. What similarity measures */
const Meaning: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const U = 3000; // px per unit of similarity
  const rows = (vals: number[], k: K) => vals.map((v, i) => ({label: LUMA_LABELS[i], v, k, text: String(v)}));
  return (
    <Page>
      <Blk x={60} y={140} w={880} h={170} k={CK} o={ep(t, 0.1, 0.4)}>
        <Tag text="colorkey" y={14} />
        <Giant text="R G B / 442" size={78} x={0} y={42} w={880} />
        <Line text="distance in red, green and blue" x={0} y={128} size={24} color={C.bg} w={880} align="center" />
      </Blk>
      <Blk x={980} y={140} w={880} h={170} k={CH} o={ep(t, A(0.2), A(0.26))}>
        <Tag text="chromakey" y={14} />
        <Giant text="U V / 361" size={78} x={0} y={42} w={880} />
        <Line text="distance in U and V only, mean over a 3 x 3 patch" x={0} y={128} size={24} color={C.bg} w={880} align="center" />
      </Blk>
      <Tag text="first similarity that keys it (blend 0)" color={C.dim} x={80} y={338} size={22} o={ep(t, A(0.3), A(0.36))} />
      <Tag text="first similarity that keys it (blend 0)" color={C.dim} x={1000} y={338} size={22} o={ep(t, A(0.3), A(0.36))} />
      <HBars x={50} y={376} unit={U} rows={rows(LUMA_CK, CK)} rh={86} reveal={Math.max(0, (t - A(0.34)) * 1.2)} labelW={210} size={26} numSize={44} />
      <HBars x={970} y={376} unit={U} rows={rows(LUMA_CH, CH)} rh={86} reveal={Math.max(0, (t - A(0.38)) * 1.2)} labelW={210} size={26} numSize={44} />
      <Blk x={1480} y={440} w={380} h={220} k="red" o={ep(t, A(0.66), A(0.74))} dy={(1 - ep(t, A(0.66), A(0.74))) * 30}>
        <Giant text="all 0.03" size={100} x={0} y={30} w={380} />
        <Line text="five brightnesses, one answer" x={0} y={140} size={24} color={C.bg} w={380} align="center" />
      </Blk>
      <Line text="key + 40 on every channel changes the brightness and not the U,V" x={60} y={830} size={30} w={1800} bold color={C.text} o={ep(t, A(0.78), A(0.86))} />
      <Circle cx={908} cy={588} rx={74} ry={44} p={prog(t, A(0.52), A(0.62))} seed={6} color={C.text} sw={6} />
    </Page>
  );
};

/* 4. The key is not at distance zero */
const PX = 22; // px per U,V unit in the zoom
const KeyColor: React.FC<SceneProps> = ({t, dur}) => {
  const starts = [0, 0.56 * dur];
  const {i, lt} = beatOf(t, starts);
  const ox = 1150, oy = 690; // the key point of the zoom
  const px = (4) * PX, py = (8) * PX; // card is +4 U and +8 V from the key
  return (
    <Page>
      {i === 0 && (
        <>
          <Tag text="U, V plane (0 to 255): where the filter puts the key, where the card is" color={C.dim} x={80} y={128} size={22} o={ep(lt, 0, 0.4)} />
          <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
            <rect x={110} y={170} width={600} height={600} fill={C.bg2} stroke={C.text} strokeWidth={4} opacity={ep(lt, 0, 0.4)} />
            {KEYS.map((k, n) => {
              const X = (u: number) => 110 + (Math.min(u, 255) / 255) * 600, Y = (v: number) => 770 - (v / 255) * 600;
              const p = ep(lt, 0.5 + n * 0.35, 1.0 + n * 0.35);
              return (
                <g key={k.hex} opacity={p}>
                  {k.d > 0 && <line x1={X(k.key[0])} y1={Y(k.key[1])} x2={X(k.px[0])} y2={Y(k.px[1])} stroke={C.red} strokeWidth={5} />}
                  <circle cx={X(k.key[0])} cy={Y(k.key[1])} r={9} fill="none" stroke={C.cyan} strokeWidth={5} />
                  <circle cx={X(k.px[0])} cy={Y(k.px[1])} r={6} fill={C.green} />
                  <text x={X(k.px[0]) + 16} y={Y(k.px[1]) - 14} fontFamily={F.mono} fontSize={20} fill={C.text}>{k.hex}</text>
                </g>
              );
            })}
            <text x={410} y={812} textAnchor="middle" fontFamily={F.mono} fontSize={22} fill={C.dim}>U</text>
            <text x={84} y={474} textAnchor="middle" fontFamily={F.mono} fontSize={22} fill={C.dim}>V</text>
            {/* zoom panel */}
            <g opacity={ep(lt, 2.4, 3.0)}>
              <rect x={790} y={170} width={1070} height={640} fill={C.bg2} stroke={C.text} strokeWidth={4} />
              <circle cx={ox} cy={oy} r={0.01 * 360.6 * PX} fill={C.cyanDim} stroke={C.cyan} strokeWidth={4} opacity={ep(lt, 3.0, 3.5)} />
              <line x1={ox} y1={oy} x2={ox + px} y2={oy - py} stroke={C.red} strokeWidth={6} opacity={ep(lt, 3.6, 4.2)} />
              <circle cx={ox} cy={oy} r={11} fill="none" stroke={C.cyan} strokeWidth={6} />
              <circle cx={ox + px} cy={oy - py} r={9} fill={C.green} />
              <text x={ox - 100} y={oy + 10} textAnchor="end" fontFamily={F.mono} fontSize={28} fontWeight={700} fill={C.cyan}>key 95, 58</text>
              <text x={ox + px + 64} y={oy - py + 10} fontFamily={F.mono} fontSize={28} fontWeight={700} fill={C.green}>card 99, 66</text>
              <text x={ox + px / 2 - 40} y={oy - py / 2 - 6} textAnchor="end" fontFamily={F.mono} fontSize={26} fill={C.red} opacity={ep(lt, 4.0, 4.6)}>8.9 units</text>
              <text x={ox + 100} y={oy + 10} fontFamily={F.mono} fontSize={26} fill={C.cyan} opacity={ep(lt, 3.2, 3.8)}>keyed zone at 0.01: 3.6 units</text>
            </g>
          </svg>
          <Blk x={820} y={200} w={430} h={150} k="red" o={ep(lt, 4.6, 5.2)}><Giant text="OUTSIDE" size={84} x={0} y={14} w={430} /><Line text="the card is kept" x={0} y={104} size={26} color={C.bg} w={430} align="center" /></Blk>
          <Circle cx={ox + px} cy={oy - py} rx={46} ry={46} p={prog(lt, 4.8, 5.6)} seed={8} color={C.red} sw={7} />
        </>
      )}
      {i === 1 && (
        <>
          <Tag text="distance from the key to a card of exactly the key color, in alpha levels (of 255)" color={C.dim} x={80} y={128} size={22} o={ep(lt, 0, 0.3)} />
          <HBars x={60} y={176} unit={44} rows={KEYS.map((k) => ({label: k.hex, v: k.d, k: (k.d === 0 ? 'green' : 'red') as K}))} rh={92} reveal={lt * 1.2} labelW={220} size={30} numSize={54} />
          <Blk x={1130} y={176} w={730} h={250} k="red" o={ep(lt, 1.2, 1.6)} dy={(1 - ep(lt, 1.2, 1.6)) * 30}>
            <Tag text="similarity 0.01, the default" y={16} />
            <Giant text="4 of 6" size={140} x={0} y={66} w={730} />
            <Line text="key cards stay whole (alpha 255)" x={0} y={188} size={28} color={C.bg} w={730} align="center" />
          </Blk>
          <Blk x={1130} y={460} w={730} h={250} k="green" o={ep(lt, 2.4, 2.8)} dy={(1 - ep(lt, 2.4, 2.8)) * 30}>
            <Tag text="the key given in yuv: yuv=1" y={16} />
            <Giant text="0 of 6" size={140} x={0} y={66} w={730} />
            <Line text="kept: distance 0 for every key" x={0} y={188} size={28} color={C.bg} w={730} align="center" />
          </Blk>
          <Line text="colorkey: distance 0 for all six, at every similarity" x={1130} y={750} size={26} w={730} color={C.text} o={ep(lt, 3.4, 3.8)} />
        </>
      )}
      <Wipe t={t} starts={starts} k="cyan" />
    </Page>
  );
};

/* 5. The soft edge */
const Edge: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const rows: {label: string; sub: string; data: number[]; k: K; lv: string}[] = [
    {label: 'ideal matte', sub: 'the true mixing fraction', data: PROF.ideal, k: 'text', lv: '1628 px'},
    {label: 'colorkey', sub: 'similarity 0.1, blend 0', data: PROF.ck0, k: CK, lv: '2 levels'},
    {label: 'colorkey', sub: 'similarity 0.1, blend 0.1', data: PROF.ck1, k: CK, lv: '29 levels'},
    {label: 'colorkey', sub: 'blend 0.488, similarity 0', data: PROF.ckm, k: CK, lv: '127 levels'},
    {label: 'chromakey', sub: 'similarity 0.1, blend 0.1', data: PROF.ch1, k: CH, lv: '60 levels'},
  ];
  const RH = 134, X0 = 520, BW = 34, BH = 92;
  return (
    <Page>
      <Tag text="alpha along one row through the soft edge: 17 pixels, bars drawn to scale" color={C.dim} x={80} y={128} size={22} o={ep(t, 0, 0.3)} />
      {rows.map((r, n) => {
        const y0 = 176 + n * RH;
        const o = ep(t, 0.2 + n * 0.5, 0.6 + n * 0.5);
        return (
          <div key={n} style={{position: 'absolute', left: 0, top: y0, width: 1920, height: RH - 14, opacity: o}}>
            <div style={{position: 'absolute', left: 60, top: 6, fontFamily: F.mono, fontSize: 30, fontWeight: 700, color: C.text, whiteSpace: 'nowrap'}}>{r.label}</div>
            <div style={{position: 'absolute', left: 60, top: 46, fontFamily: F.mono, fontSize: 22, color: C.dim, whiteSpace: 'nowrap'}}>{r.sub}</div>
            <div style={{position: 'absolute', left: X0 - 6, top: BH + 14, width: 17 * BW + 12, height: 4, background: C.text}} />
            {r.data.map((a, c) => {
              const h = Math.max(a > 0 ? 3 : 0, (a / 255) * BH);
              const fringe = n > 0 && PROF.ideal[c] < 128 && a >= 128;
              return <div key={c} style={{position: 'absolute', left: X0 + c * BW, top: BH + 14 - h, width: BW - 4, height: h, background: fringe ? C.red : C[r.k]}} />;
            })}
            <div style={{position: 'absolute', left: X0 + 17 * BW + 24, top: 22, fontFamily: F.display, fontWeight: 900, fontSize: 56 * D.k * 0.8, color: C[r.k === 'text' ? 'text' : r.k], whiteSpace: 'nowrap'}}>{r.lv}</div>
          </div>
        );
      })}
      <Blk x={1390} y={176} w={470} h={250} k="red" o={ep(t, A(0.5), A(0.58))} dy={(1 - ep(t, A(0.5), A(0.58))) * 30}>
        <Tag text="colorkey 0.1, blend 0" y={16} size={24} />
        <Giant text="1236" size={150} x={0} y={50} w={470} />
        <Line text="of 1628 edge pixels kept opaque" x={0} y={190} size={26} color={C.bg} w={470} align="center" />
      </Blk>
      <Blk x={1390} y={452} w={470} h={250} k="red" o={ep(t, A(0.62), A(0.7))} dy={(1 - ep(t, A(0.62), A(0.7))) * 30}>
        <Tag text="red bars, kept, mostly green" y={16} size={20} />
        <Giant text="504" size={150} x={0} y={50} w={470} />
        <Line text="of them are less than half subject" x={0} y={190} size={26} color={C.bg} w={470} align="center" />
      </Blk>
      <Line text="blend 0 draws a step; blend = the subject's distance draws the matte" x={60} y={858} size={30} bold w={1800} color={C.text} o={ep(t, A(0.78), A(0.86))} />
    </Page>
  );
};

/* 6. The noisy card */
const Noise: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const CS = 62;
  const grid = (x0: number, win: string[], k: K, title: string, n: string, t0: number) => (
    <>
      <Tag text={title} color={C.text} x={x0} y={196} size={32} o={ep(t, t0, t0 + 0.4)} />
      <Giant text={n} size={104} color={C[k]} x={x0 + 240} y={172} w={440} align="right" o={ep(t, A(0.46), A(0.54))} />
      {win.map((row, r) => row.split('').map((c, col) => {
        const p = ep(t, t0 + 0.2 + (r * 11 + col) * 0.025, t0 + 0.5 + (r * 11 + col) * 0.025);
        return <div key={`${r}-${col}`} style={{position: 'absolute', left: x0 + col * CS, top: 330 + r * CS, width: CS - 4, height: CS - 4, background: C[WCOL[c]], opacity: p}} />;
      }))}
      {BLENDS.map((b, r) => <div key={b} style={{position: 'absolute', left: x0 - 62, top: 330 + r * CS, width: 54, height: CS - 4, lineHeight: `${CS - 4}px`, textAlign: 'right', fontFamily: F.mono, fontSize: 20, color: C.dim}}>{b}</div>)}
      {SIMS.map((s, c) => <div key={s} style={{position: 'absolute', left: x0 + c * CS - 6, top: 330 + 4 * CS + 6, width: CS + 8, textAlign: 'center', fontFamily: F.mono, fontSize: 18, color: C.dim}}>{s}</div>)}
    </>
  );
  return (
    <Page>
      <Tag text="noisy card: every setting of the sweep (rows: blend, columns: similarity)" color={C.dim} x={80} y={128} size={22} o={ep(t, 0, 0.3)} />
      {grid(150, WIN_CK, CK, 'colorkey', '22 clean', 0.3)}
      {grid(1060, WIN_CH, CH, 'chromakey', '0 clean', 0.7)}
      {/* legend */}
      {[['green', 'clean: no speck, subject whole'], ['red', 'specks left'], ['amber', 'subject lost'], ['text', 'both']].map(([k, l], n) => (
        <div key={l} style={{position: 'absolute', left: [150, 720, 1030, 1350][n], top: 650, opacity: ep(t, A(0.34), A(0.42))}}>
          <div style={{position: 'absolute', left: 0, top: 2, width: 30, height: 30, background: C[k as K]}} />
          <div style={{position: 'absolute', left: 44, top: 0, fontFamily: F.mono, fontSize: 24, color: C.text, whiteSpace: 'nowrap'}}>{l}</div>
        </div>
      ))}
      <Blk x={150} y={710} w={820} h={150} k={CK} o={ep(t, A(0.56), A(0.64))} dy={(1 - ep(t, A(0.56), A(0.64))) * 30}>
        <Tag text="colorkey, defaults: opaque background" y={14} size={22} />
        <Giant text="5699 of 5712" size={96} x={0} y={50} w={820} />
      </Blk>
      <Blk x={1000} y={710} w={770} h={150} k={CH} o={ep(t, A(0.66), A(0.74))} dy={(1 - ep(t, A(0.66), A(0.74))) * 30}>
        <Tag text="chromakey, defaults: opaque background" y={14} size={22} />
        <Giant text="5712 of 5712" size={96} x={0} y={50} w={770} />
      </Blk>
      <Circle cx={1432} cy={361} rx={104} ry={46} p={prog(t, A(0.8), A(0.9))} seed={5} color={C.text} sw={6} />
    </Page>
  );
};

/* 7. What to do (the last 10.5 s sit under the end card, so the beats fill the first dur - 10.5 s) */
const Close: React.FC<SceneProps> = ({t, dur}) => {
  const D2 = Math.max(12, dur - 10.5);
  const A = (f: number) => f * D2;
  const items: {k: K; n: string; head: string; sub: string; at: number}[] = [
    {k: CK, n: '1', head: 'colorkey for a flat known color', sub: 'blend = the subject distance, similarity near 0', at: 0.02},
    {k: CH, n: '2', head: 'chromakey ignores brightness', sub: 'name the key with yuv=1, raise the similarity', at: 0.2},
    {k: 'green', n: '3', head: 'read the alpha, not the preview', sub: 'alphaextract, count levels and kept pixels', at: 0.38},
  ];
  return (
    <Page>
      {items.map((it) => (
        <Blk key={it.n} x={60} y={140 + (Number(it.n) - 1) * 200} w={1160} h={175} k={it.k} o={ep(t, A(it.at), A(it.at) + 0.3)} dy={(1 - ep(t, A(it.at), A(it.at) + 0.3)) * 40}>
          <Giant text={it.n} size={170} x={20} y={14} w={150} align="left" />
          <Line text={it.head} x={190} y={22} size={44} color={C.bg} w={940} bold />
          <Line text={it.sub} x={190} y={98} size={30} color={C.bg} w={940} />
        </Blk>
      ))}
      <Blk x={1260} y={140} w={600} h={375} k="text" o={ep(t, A(0.58), A(0.58) + 0.3)}>
        <Tag text="measured here" y={20} />
        <Line text={'default similarity 0.01:\nchromakey keeps the key card,\ncolorkey keys it'} x={28} y={80} size={32} color={C.bg} w={540} bold />
        <Line text="ffmpeg 6.1.1, 96 x 72 synthetic cards" x={28} y={290} size={26} color={C.bg} w={540} />
      </Blk>
      <Blk x={1260} y={540} w={600} h={235} k="dim" o={ep(t, A(0.78), A(0.78) + 0.3)}>
        <Tag text="not tested" y={18} />
        <Line text={'other builds, real footage,\ncompression noise,\nother key colors and noise'} x={28} y={70} size={28} color={C.bg} w={560} />
      </Blk>
    </Page>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, setup: Setup, meaning: Meaning, keycolor: KeyColor, edge: Edge, noise: Noise, close: Close};
