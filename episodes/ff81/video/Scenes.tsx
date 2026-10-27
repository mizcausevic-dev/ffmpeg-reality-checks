import React from 'react';
import {C, F, D} from '../../kit/theme';
import {ep, prog, rnd} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Vox flat graphics. Bold flat blocks of the lab inks, split screens, annotated freeze frames (a hand drawn circle and an arrow),
 * giant numbers, and labeled bars drawn to scale. Every number comes from episodes/ff81/fixture/experiment.mjs
 * (60 raw frames of 160 x 90, scores read by ffmpeg select and by Node on the pixels, ffmpeg 6.1.1).
 */

/* ---------- measured data ---------- */
const CUT = 0.773139;                       // hard cut, frame 30: mean luma difference 77.31 / 100
const FADE_FIRST: Record<number, number> = {1: 0.773139, 2: 0.386687, 4: 0.19346, 8: 0.096613, 16: 0.048371, 32: 0.023991};
const THR = [0.1, 0.2, 0.3, 0.4, 0.5];
const NOISE: Record<number, number> = {30: 0.198008, 31: 0.06699};      // first noisy frames; every later frame is under 0.01
const NOISE_H264 = 0.164287;
const CUT_H264 = 0.773545;
const SLOW: Record<number, number> = {1: 0.02};
const FLASH: Record<number, number> = {30: 0.773139};                   // the jump back (frame 31) scores 0
const DOUBLE: Record<number, number> = {20: 0.773139, 24: 0.773139};
const NFR = 60;

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
type K = 'cyan' | 'amber' | 'red' | 'green' | 'text' | 'bg2' | 'panel' | 'mute' | 'dim' | 'line';

/* ---------- flat blocks, wipes, giant numbers (copied from the batch 2 Vox film) ---------- */
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

/* ---------- the two pictures, drawn cell by cell from the fixture's own formulas (4 x 4 pixel cells) ---------- */
const pictureA = (x: number, y: number) => { let v = 40 + Math.round((x * 160) / 160); if (x > 20 && x < 60 && y > 20 && y < 50) v = 230; if ((x - 110) ** 2 + (y - 60) ** 2 < 400) v = 20; return v; };
const pictureB = (x: number, y: number) => { let v = 200 - Math.round((y * 150) / 90); if (x > 90 && x < 140 && y > 10 && y < 40) v = 30; if ((x - 40) ** 2 + (y - 60) ** 2 < 500) v = 240; return v; };
const Pic: React.FC<{x: number; y: number; s: number; which: 'A' | 'B'; o?: number}> = ({x, y, s, which, o = 1}) => {
  const f = which === 'A' ? pictureA : pictureB, cell = 4, k = s / 160;
  const cells: React.ReactNode[] = [];
  for (let j = 0; j < 90; j += cell) for (let i = 0; i < 160; i += cell) { const v = f(i + 2, j + 2); cells.push(<rect key={`${i}-${j}`} x={x + i * k} y={y + j * k} width={cell * k + 0.6} height={cell * k + 0.6} fill={`rgb(${v},${v},${v})`} />); }
  return <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: o}}>{cells}<rect x={x} y={y} width={s} height={(s * 90) / 160} fill="none" stroke={C.text} strokeWidth={4} /></svg>;
};

/* ---------- a row of 60 score bars, drawn to scale ---------- */
const ScoreBars: React.FC<{x: number; y: number; w: number; h: number; max: number; scores: Record<number, number>; from?: number; to?: number; color?: string; p?: number; lines?: number[]; labels?: boolean; bw?: number}> = ({x, y, w, h, max, scores, from = 0, to = NFR, color = C.text, p = 1, lines = [], labels = true, bw}) => {
  const n = to - from, step = w / n, wid = bw ?? Math.max(3, step * 0.62);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      <line x1={x} y1={y} x2={x + w} y2={y} stroke={C.text} strokeWidth={3} />
      {lines.map((T) => (
        <g key={T}>
          <line x1={x} y1={y - (T / max) * h} x2={x + w} y2={y - (T / max) * h} stroke={C.mute} strokeWidth={2} strokeDasharray="10 8" />
          {labels && <text x={x + w + 12} y={y - (T / max) * h + 8} fontSize={24} fontFamily={F.mono} fill={C.dim}>{T}</text>}
        </g>
      ))}
      {Array.from({length: n}, (_, i) => {
        const v = scores[from + i] ?? 0, bh = (v / max) * h * p;
        return <rect key={i} x={x + i * step + (step - wid) / 2} y={y - Math.max(bh, v > 0 ? 3 : 0)} width={wid} height={Math.max(bh, v > 0 ? 3 : 0)} fill={color} />;
      })}
    </svg>
  );
};

/* 1. The question */
const miniScores = (m: Record<number, number>) => m;
const Ask: React.FC<SceneProps> = ({t}) => {
  const dx1 = (1 - ep(t, 0, 0.5)) * -80, dx2 = (1 - ep(t, 0.15, 0.65)) * 80;
  const cards = [
    {k: 'cyan' as K, label: 'a hard cut', sc: {30: CUT}},
    {k: 'amber' as K, label: 'a cross-fade', sc: {30: FADE_FIRST[16]}},
    {k: 'green' as K, label: 'a slow drift', sc: SLOW},
    {k: 'red' as K, label: 'noise', sc: NOISE},
  ];
  return (
    <Page>
      <Blk x={60} y={130} w={880} h={300} k="cyan" o={ep(t, 0, 0.3)}>
        <Tag text="the filter" y={20} x={30} />
        <Giant text="scene" size={200} x={dx1} y={60} w={880} />
        <Tag text="a score from 0 to 1 for every frame" y={256} x={0} w={880} align="center" size={26} />
      </Blk>
      <Blk x={980} y={130} w={880} h={300} k="red" o={ep(t, 0.15, 0.45)}>
        <Tag text="what does a cut score?" y={20} x={30} />
        <Giant text="?" size={200} x={dx2} y={60} w={880} />
        <Tag text="a fade? a drift? noise?" y={256} x={0} w={880} align="center" size={28} />
      </Blk>
      {cards.map((c, i) => {
        const o = ep(t, 3.0 + i * 1.4, 3.6 + i * 1.4);
        return (
          <React.Fragment key={i}>
            <Blk x={60 + i * 455} y={480} w={425} h={330} k={c.k} o={o} dy={(1 - o) * 30}>
              <Tag text={c.label} y={18} size={28} />
            </Blk>
            <div style={{opacity: o}}><ScoreBars x={84 + i * 455} y={780} w={378} h={230} max={0.8} scores={c.sc} color={C.bg} p={ep(t, 3.4 + i * 1.4, 4.0 + i * 1.4)} /></div>
          </React.Fragment>
        );
      })}
      <Line text="every bar: one frame, 60 frames, same scale" x={60} y={830} size={28} mono color={C.dim} w={1700} o={ep(t, 9.0, 9.6)} />
    </Page>
  );
};

/* 2. The frames and the readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <Page>
    <Blk x={60} y={130} w={560} h={330} k="text" o={ep(t, 0, 0.3)} />
    <Pic x={80} y={150} s={520} which="A" o={ep(t, 0.2, 0.6)} />
    <Tag text="picture A · frames 0 to 29" x={60} y={476} size={26} color={C.text} o={ep(t, 0.4, 0.8)} />
    <Blk x={660} y={130} w={560} h={330} k="text" o={ep(t, 1.6, 1.9)} />
    <Pic x={680} y={150} s={520} which="B" o={ep(t, 1.8, 2.2)} />
    <Tag text="picture B · frames 30 to 59" x={660} y={476} size={26} color={C.text} o={ep(t, 2.0, 2.4)} />
    <Giant text="60" size={190} color={C.text} x={1280} y={130} w={580} o={ep(t, 0.8, 1.3)} />
    <Line text="frames, 160 x 90, raw yuv420p" x={1280} y={320} size={34} w={580} align="center" color={C.text} o={ep(t, 0.9, 1.4)} />
    <Line text="a cut, fades of 2 to 32 frames, a drift, noise, a flash, two cuts" x={1280} y={390} size={28} w={580} align="center" color={C.dim} o={ep(t, 2.8, 3.4)} />
    <Blk x={60} y={560} w={560} h={270} k="amber" o={ep(t, 5.0, 5.4)} dy={(1 - ep(t, 5.0, 5.4)) * 40}>
      <Tag text="reader 1" y={18} />
      <Line text="ffmpeg prints the score of every frame" x={28} y={64} size={30} color={C.bg} w={510} />
      <Line text="lavfi.scene_score" x={28} y={172} size={38} mono color={C.bg} w={520} bold />
    </Blk>
    <Blk x={660} y={560} w={560} h={270} k="green" o={ep(t, 7.0, 7.4)} dy={(1 - ep(t, 7.0, 7.4)) * 40}>
      <Tag text="reader 2" y={18} />
      <Line text="Node, on the pixels: mean luma difference between neighbours" x={28} y={64} size={28} color={C.bg} w={510} />
      <Line text="min(d, change in d) / 100" x={28} y={184} size={28} mono color={C.bg} w={520} bold />
    </Blk>
    <Blk x={1260} y={560} w={600} h={270} k="cyan" o={ep(t, 9.0, 9.4)} dy={(1 - ep(t, 9.0, 9.4)) * 40}>
      <Tag text="control" y={18} />
      <Giant text="frame 0 = 0" size={92} color={C.bg} x={0} y={66} w={600} />
      <Line text="no previous frame, no score" x={0} y={170} size={30} color={C.bg} w={600} align="center" />
    </Blk>
  </Page>
);

/* 3. The hard cut */
const Cut: React.FC<SceneProps> = ({t}) => {
  const grow = ep(t, 1.6, 2.6);
  const X = 180, Y = 760, WW = 1500, HH = 480, MX = 0.8;
  return (
    <Page>
      <Tag text="a hard cut, score of every frame" color={C.dim} x={120} y={128} size={26} o={ep(t, 0, 0.3)} />
      <ScoreBars x={X} y={Y} w={WW} h={HH} max={MX} scores={{30: CUT}} color={C.cyan} p={grow} lines={THR} />
      <Giant text="0.773" size={220} color={C.text} x={X + 40} y={170} w={560} align="left" o={ep(t, 2.4, 2.9)} />
      <Line text="= mean luma difference / 100" x={X + 40} y={376} size={30} mono w={640} color={C.dim} o={ep(t, 4.6, 5.2)} />
      <Circle cx={X + 30.5 * (WW / NFR)} cy={Y - (CUT / MX) * HH + 12} rx={46} ry={56} p={prog(t, 3.2, 3.9)} seed={4} color={C.text} />
      <Tag text="frame 30" color={C.text} x={X + 30.5 * (WW / NFR) + 62} y={Y - (CUT / MX) * HH + 4} size={28} o={ep(t, 3.6, 4.1)} />
      <Blk x={X} y={800} w={WW} h={90} k="green" o={ep(t, 6.6, 7.0)}>
        <Line text="threshold 0.1, 0.2, 0.3, 0.4, 0.5: frame 30 is selected, and nothing else" x={0} y={24} size={34} color={C.bg} w={WW} align="center" bold />
      </Blk>
      <Tag text="Node: 77.31 / 100 = 0.773" color={C.text} x={X + 40} y={424} size={28} o={ep(t, 5.4, 6.0)} />
    </Page>
  );
};

/* 4. The formula: a flash and two cuts */
const Formula: React.FC<SceneProps> = ({t}) => {
  const F0 = 26, F1 = 36, n = F1 - F0, X = 140, WW = 780;
  const step = WW / n;
  const diff = (i: number) => (i === 30 || i === 31 ? 77.3 : 0);
  const sc = (i: number) => (i === 30 ? CUT : 0);
  return (
    <Page>
      <Blk x={60} y={130} w={1800} h={110} k="text" o={ep(t, 0, 0.3)}>
        <Line text="score = the smaller of: the difference, and how much it changed" x={0} y={34} size={36} mono color={C.bg} w={1800} align="center" bold />
      </Blk>
      <Tag text="a one frame flash, frames 26 to 35" color={C.dim} x={X} y={272} size={26} o={ep(t, 0.6, 1.0)} />
      <Tag text="difference to the previous frame" color={C.text} x={X} y={316} size={26} o={ep(t, 0.8, 1.2)} />
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <line x1={X} y1={540} x2={X + WW} y2={540} stroke={C.text} strokeWidth={3} />
        {Array.from({length: n}, (_, i) => {
          const f = F0 + i, v = diff(f), bh = (v / 77.3) * 150 * ep(t, 1.2 + (i > 3 ? 0.4 : 0), 2.0);
          return (
            <g key={i}>
              <rect x={X + i * step + 8} y={540 - bh} width={step - 16} height={bh} fill={C.amber} />
              <text x={X + i * step + step / 2} y={574} fontSize={22} fontFamily={F.mono} fill={C.dim} textAnchor="middle">{f}</text>
            </g>
          );
        })}
        <line x1={X} y1={850} x2={X + WW} y2={850} stroke={C.text} strokeWidth={3} />
        {Array.from({length: n}, (_, i) => {
          const f = F0 + i, v = sc(f), bh = (v / CUT) * 150 * ep(t, 3.4 + (i > 3 ? 0.4 : 0), 4.2);
          return (
            <g key={i}>
              <rect x={X + i * step + 8} y={850 - Math.max(bh, 0)} width={step - 16} height={Math.max(bh, 0)} fill={C.green} />
              <text x={X + i * step + step / 2} y={884} fontSize={22} fontFamily={F.mono} fill={C.dim} textAnchor="middle">{f}</text>
            </g>
          );
        })}
      </svg>
      <Tag text="score" color={C.text} x={X} y={620} size={26} o={ep(t, 3.0, 3.4)} />
      <Giant text="0.773" size={88} color={C.green} x={X + 4 * step + step / 2 - 70} y={596} w={140} align="center" o={ep(t, 4.2, 4.6)} />
      <Circle cx={X + 5 * step + step / 2} cy={800} rx={52} ry={44} p={prog(t, 5.6, 6.3)} seed={6} color={C.red} />
      <Tag text="way back: 0" color={C.red} x={X + 5 * step + step / 2 + 78} y={780} size={26} o={ep(t, 6.0, 6.6)} />
      <Blk x={1000} y={272} w={860} h={330} k="cyan" o={ep(t, 8.6, 9.0)}>
        <Tag text="two cuts, four frames apart" y={18} />
        <ScoreBars x={50} y={290} w={760} h={125} max={0.8} scores={DOUBLE} from={16} to={30} color={C.bg} p={ep(t, 9.0, 9.8)} />
        <Giant text="20 and 24" size={90} color={C.bg} x={0} y={72} w={860} o={ep(t, 9.6, 10.0)} />
      </Blk>
      <Blk x={1000} y={640} w={860} h={250} k="amber" o={ep(t, 10.4, 10.8)}>
        <Tag text="both caught" y={18} />
        <Giant text="0.773 + 0.773" size={110} color={C.bg} x={0} y={70} w={860} />
        <Line text="the quiet frames between them reset the difference" x={0} y={186} size={28} color={C.bg} w={860} align="center" />
      </Blk>
    </Page>
  );
};

/* 5. Cross-fades */
const Fades: React.FC<SceneProps> = ({t}) => {
  const Ls = [1, 2, 4, 8, 16, 32];
  const X0 = 130, RH = 88, Y0 = 300, BX = 330, BW = 430, CX0 = 1000, CW = 150;
  return (
    <Page>
      <Tag text="a cross-fade of L frames: score of its first frame, and what each threshold selects" color={C.dim} x={120} y={128} size={26} o={ep(t, 0, 0.3)} />
      <Tag text="fade" x={X0} y={Y0 - 52} size={24} color={C.dim} o={ep(t, 0.2, 0.6)} />
      <Tag text="score of the first fade frame" x={BX} y={Y0 - 52} size={24} color={C.dim} o={ep(t, 0.2, 0.6)} />
      {THR.map((T, j) => <Tag key={T} text={`> ${T}`} x={CX0 + j * CW} y={Y0 - 52} w={CW - 14} align="center" size={26} color={C.text} o={ep(t, 0.4, 0.8)} />)}
      {Ls.map((L, i) => {
        const a = 1.0 + i * 1.5, o = ep(t, a, a + 0.5), s = FADE_FIRST[L];
        return (
          <React.Fragment key={L}>
            <Line text={L === 1 ? 'cut' : `${L} frames`} x={X0} y={Y0 + i * RH + 22} size={28} mono w={190} color={C.text} bold o={o} />
            <Blk x={BX} y={Y0 + i * RH + 8} w={Math.max(8, (s / CUT) * BW * ep(t, a, a + 0.8))} h={RH - 22} k={L >= 8 ? 'red' : L >= 2 ? 'amber' : 'cyan'} o={o} />
            <Line text={s.toFixed(3)} x={BX + Math.max(8, (s / CUT) * BW * ep(t, a, a + 0.8)) + 14} y={Y0 + i * RH + 20} size={34} mono w={180} color={C.text} bold o={ep(t, a + 0.4, a + 0.8)} />
            {THR.map((T, j) => {
              const sel = s > T, oo = ep(t, a + 0.5 + j * 0.08, a + 0.8 + j * 0.08);
              return <Blk key={T} x={CX0 + j * CW} y={Y0 + i * RH + 8} w={CW - 14} h={RH - 22} k={sel ? 'green' : 'mute'} o={oo}><Line text={sel ? 'caught' : 'missed'} x={0} y={18} size={26} mono w={CW - 14} align="center" color={C.bg} bold /></Blk>;
            })}
          </React.Fragment>
        );
      })}
      <Line text="first fade frame = cut / L, within 6 percent" x={X0} y={Y0 + 6 * RH + 14} size={32} mono w={1500} color={C.text} bold o={ep(t, 10.2, 10.8)} />
    </Page>
  );
};

/* 6. Drift, noise, a lossy encode */
const Noise: React.FC<SceneProps> = ({t}) => (
  <Page>
    <Blk x={60} y={130} w={880} h={420} k="green" o={ep(t, 0, 0.3)}>
      <Tag text="a slow drift, 2 levels a frame" y={18} />
      <Giant text="0.02" size={150} color={C.bg} x={0} y={52} w={880} o={ep(t, 0.8, 1.3)} />
      <Line text="on frame 1, once. Nothing higher after." x={0} y={230} size={30} color={C.bg} w={880} align="center" o={ep(t, 1.4, 2.0)} />
    </Blk>
    <ScoreBars x={110} y={520} w={780} h={150} max={0.25} scores={SLOW} color={C.bg} lines={[0.1]} labels={false} p={ep(t, 1.0, 1.8)} />
    <Blk x={980} y={130} w={880} h={420} k="red" o={ep(t, 2.6, 2.9)}>
      <Tag text="noise from frame 30" y={18} />
      <Giant text="0.198" size={150} color={C.bg} x={0} y={52} w={880} o={ep(t, 3.4, 3.9)} />
      <Line text="the first noisy frame. Then 0.067, then near 0." x={0} y={230} size={30} color={C.bg} w={880} align="center" o={ep(t, 4.6, 5.2)} />
    </Blk>
    <ScoreBars x={1030} y={520} w={780} h={150} max={0.25} scores={NOISE} color={C.bg} lines={[0.1]} labels={false} p={ep(t, 3.6, 4.4)} />
    <Line text="noisy against noisy: mean difference 26.5. flat against noisy: 19.8. The score of the later frames is still near 0." x={980} y={576} size={26} w={880} color={C.text} o={ep(t, 6.4, 7.0)} />
    <Line text="same scale, 0 to 0.25, dashed line at 0.1" x={60} y={576} size={26} mono w={880} color={C.dim} o={ep(t, 1.6, 2.2)} />
    <Blk x={60} y={680} w={1800} h={200} k="cyan" o={ep(t, 9.0, 9.4)} dy={(1 - ep(t, 9.0, 9.4)) * 30}>
      <Tag text="after libx264, crf 23, on 6.1.1" y={16} />
      <Giant text="cut 0.773 to 0.774" size={100} color={C.bg} x={30} y={58} w={880} align="left" />
      <Giant text="noise 0.198 to 0.164" size={100} color={C.bg} x={930} y={58} w={850} align="left" />
    </Blk>
  </Page>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <Page>
    <Blk x={60} y={130} w={1800} h={190} k="cyan" o={ep(t, 0, 0.3)}>
      <Tag text="before you pick a threshold" y={16} />
      <Giant text="measure the scores" size={130} color={C.bg} x={30} y={56} w={1740} align="left" />
    </Blk>
    <Blk x={60} y={350} w={880} h={220} k="green" o={ep(t, 1.6, 1.9)}>
      <Tag text="caught" y={16} />
      <Giant text="cuts" size={110} color={C.bg} x={30} y={56} w={820} align="left" />
      <Line text="and a flash on the way in" x={30} y={164} size={28} color={C.bg} w={820} />
    </Blk>
    <Blk x={980} y={350} w={880} h={220} k="red" o={ep(t, 3.0, 3.3)}>
      <Tag text="missed" y={16} />
      <Giant text="fades" size={110} color={C.bg} x={30} y={56} w={820} align="left" />
      <Line text="and the way back from a flash" x={30} y={164} size={28} color={C.bg} w={820} />
    </Blk>
    <Line text="eq(n,0)+gt(scene,0.4)" x={60} y={600} size={44} mono w={1000} color={C.text} bold o={ep(t, 4.6, 5.2)} />
    <Line text="keeps frame 0 and the cut: [0, 30]" x={60} y={664} size={30} w={1000} color={C.dim} o={ep(t, 5.0, 5.6)} />
    <Line text="Not tested: real footage, other encoders, other builds." x={60} y={760} size={30} w={1800} color={C.text} o={ep(t, 6.4, 7.0)} />
    <Line text="FFmpeg Reality Checks · episode 81 · fixture and tests in the description" x={60} y={816} size={28} w={1800} color={C.mute} o={ep(t, 7.0, 7.6)} />
  </Page>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, cut: Cut, formula: Formula, fades: Fades, noise: Noise, close: Close};
