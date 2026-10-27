import React from 'react';
import {C, F, D, W, H} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Head, Mid} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff80/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
   Style: illustrated scenario. Flat vector objects only (film frames, reels, projector, clock), no faces. Palette lab only. */

/* ---------- measured data ---------- */
const CONSTS = [
  {d: 2, fps: 50, label: '50', dur: '0.400'},
  {d: 3, fps: 100 / 3, label: '33.33', dur: '0.600'},
  {d: 4, fps: 25, label: '25', dur: '0.800'},
  {d: 6, fps: 100 / 6, label: '16.67', dur: '1.200'},
  {d: 10, fps: 10, label: '10', dur: '2.000'},
];
const MIXD = Array.from({length: 20}, (_, i) => [2, 3, 4, 6, 10][i % 5]); // delays of the mixed gif, sum 100
const LOST = [5, 15];  // frames never shown by fps=30 on the 3 hundredth gif

/* ---------- local drawing kit (square corners, flat fills, no gradients) ---------- */
const Svg: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <svg style={{position: 'absolute', left: 0, top: 0}} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
    <defs>
      <pattern id="hatch" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)">
        <rect width="16" height="16" fill={C.redDim} />
        <line x1="0" y1="0" x2="0" y2="16" stroke={C.red} strokeWidth="5" />
      </pattern>
      <marker id="chev" markerWidth="14" markerHeight="14" refX="11" refY="7" orient="auto" markerUnits="userSpaceOnUse"><path d="M1,1 L12,7 L1,13" fill="none" stroke={C.mute} strokeWidth="3" /></marker>
    </defs>
    {children}
  </svg>
);
const Tx: React.FC<{x: number; y: number; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; mono?: boolean; weight?: number; o?: number; children?: React.ReactNode}> = ({x, y, size = 26, color = C.text, anchor = 'start', mono = true, weight = 600, o = 1, children}) => (
  <text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor} fontFamily={mono ? F.mono : F.sans} fontWeight={weight} opacity={o}>{children}</text>
);

/* one gif frame drawn like the pixels: ink picture, white top row, the frame number n as six 6 x 8 blocks (48 x 48 grid) */
const Frame: React.FC<{x: number; y: number; s: number; n: number; o?: number; edge?: string}> = ({x, y, s, n, o = 1, edge}) => {
  const k = s / 48;
  return (
    <g opacity={o}>
      <rect x={x} y={y} width={s} height={s} fill={C.text} stroke={edge ?? C.text} strokeWidth={3} />
      <rect x={x} y={y} width={s} height={Math.max(1, k)} fill={C.bg} />
      {Array.from({length: 6}, (_, b) => ((n >> b) & 1 ? <rect key={b} x={x + (2 + 7 * b) * k} y={y + 20 * k} width={6 * k} height={8 * k} fill={C.bg} /> : null))}
    </g>
  );
};
/* a film reel: tape disc, six holes, hub */
const Reel: React.FC<{cx: number; cy: number; r: number; color: string; tint: string; tape?: number; spin?: number; o?: number}> = ({cx, cy, r, color, tint, tape = 1, spin = 0, o = 1}) => (
  <g opacity={o}>
    <circle cx={cx} cy={cy} r={r} fill={C.bg2} stroke={color} strokeWidth={6} />
    <circle cx={cx} cy={cy} r={Math.max(r * 0.3, r * 0.9 * tape)} fill={tint} stroke={color} strokeWidth={3} />
    <g transform={`rotate(${spin} ${cx} ${cy})`}>
      {Array.from({length: 6}, (_, i) => {
        const a = (i * Math.PI) / 3;
        return <circle key={i} cx={cx + Math.cos(a) * r * 0.2} cy={cy + Math.sin(a) * r * 0.2} r={r * 0.07} fill={C.bg} />;
      })}
    </g>
    <circle cx={cx} cy={cy} r={r * 0.08} fill={color} />
  </g>
);
/* a clock whose hand makes one turn in one second */
const Clock: React.FC<{cx: number; cy: number; r: number; sec: number; color?: string; o?: number}> = ({cx, cy, r, sec, color = C.text, o = 1}) => {
  const a = sec * 2 * Math.PI - Math.PI / 2;
  return (
    <g opacity={o}>
      <circle cx={cx} cy={cy} r={r} fill={C.bg2} stroke={color} strokeWidth={5} />
      {Array.from({length: 10}, (_, i) => {
        const b = (i / 10) * 2 * Math.PI - Math.PI / 2;
        return <line key={i} x1={cx + Math.cos(b) * r * 0.8} y1={cy + Math.sin(b) * r * 0.8} x2={cx + Math.cos(b) * r * 0.94} y2={cy + Math.sin(b) * r * 0.94} stroke={C.mute} strokeWidth={3} />;
      })}
      <line x1={cx} y1={cy} x2={cx + Math.cos(a) * r * 0.7} y2={cy + Math.sin(a) * r * 0.7} stroke={color} strokeWidth={6} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill={color} />
    </g>
  );
};
const Projector: React.FC<{x: number; y: number; k?: number; color?: string; tint?: string; spin?: number; o?: number}> = ({x, y, k = 1, color = C.cyan, tint = C.cyanDim, spin = 0, o = 1}) => (
  <g opacity={o} transform={`translate(${x} ${y}) scale(${k})`}>
    <rect x={0} y={0} width={260} height={150} fill={C.panel} stroke={C.text} strokeWidth={5} />
    <rect x={260} y={50} width={44} height={50} fill={C.bg2} stroke={C.text} strokeWidth={5} />
    <Reel cx={70} cy={-50} r={50} color={color} tint={tint} tape={0.8} spin={spin} />
    <Reel cx={190} cy={-50} r={50} color={C.green} tint={C.greenDim} tape={0.4} spin={spin} />
    <rect x={30} y={104} width={90} height={14} fill={C.line} />
  </g>
);
const Card: React.FC<{x: number; y: number; w: number; h: number; label: string; value: string; sub?: string; color?: string; o?: number; vs?: number; mono?: boolean}> = ({x, y, w, h, label, value, sub, color = C.cyan, o = 1, vs = 50, mono = true}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box', opacity: o, background: C.bg2, border: `3px solid ${color}`, borderLeftWidth: 14, padding: '8px 22px', fontFamily: F.sans}}>
    <div style={{fontSize: 20, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color}}>{label}</div>
    <div style={{fontFamily: mono ? F.mono : F.display, fontSize: vs * (mono ? 1 : D.k), fontWeight: 800, color: C.text, lineHeight: 1.1, marginTop: 4, whiteSpace: 'nowrap'}}>{value}</div>
    {sub && <div style={{fontSize: 24, color: C.dim, marginTop: 4, lineHeight: 1.25}}>{sub}</div>}
  </div>
);
const Note: React.FC<{x: number; y: number; w: number; o?: number; size?: number; color?: string; align?: 'left' | 'center'; mono?: boolean; children?: React.ReactNode}> = ({x, y, w, o = 1, size = 26, color = C.dim, align = 'left', mono = false, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, fontFamily: mono ? F.mono : F.sans, fontSize: size, fontWeight: 500, color, lineHeight: 1.3, textAlign: align, whiteSpace: 'pre-wrap'}}>{children}</div>
);
const Cmd: React.FC<{y: number; text: string; o?: number; size?: number}> = ({y, text, o = 1, size = 34}) => (
  <div style={{position: 'absolute', left: 0, top: y, width: W, display: 'flex', justifyContent: 'center', opacity: o}}>
    <div style={{padding: '14px 32px', background: C.codeBg, border: `3px solid ${C.text}`, fontFamily: F.mono, fontSize: size, color: C.text, whiteSpace: 'pre'}}><span style={{color: C.cyan}}>$ </span>{text}</div>
  </div>
);
/* a time axis drawn to scale: pps pixels per second from x0 */
const Axis: React.FC<{x0: number; y: number; pps: number; to: number; step: number; o?: number; fmt?: (s: number) => string}> = ({x0, y, pps, to, step, o = 1, fmt = (s) => `${s.toFixed(2)} s`}) => (
  <g opacity={o}>
    <line x1={x0} y1={y} x2={x0 + to * pps} y2={y} stroke={C.mute} strokeWidth={3} />
    {Array.from({length: Math.floor(to / step + 1e-9) + 1}, (_, i) => i * step).map((s) => (
      <g key={s}>
        <line x1={x0 + s * pps} y1={y} x2={x0 + s * pps} y2={y + 14} stroke={C.mute} strokeWidth={3} />
        <Tx x={x0 + s * pps} y={y + 42} size={22} color={C.mute} anchor="middle">{fmt(s)}</Tx>
      </g>
    ))}
  </g>
);

/* ---------- 1. The ask ---------- */
const XA = 285, PPC = 54; // strip start and pixels per hundredth of a second
const Ask: React.FC<SceneProps> = ({t}) => {
  const ds = [2, 3, 4, 6, 10];
  let acc = 0;
  return (
    <>
      <Head over="A gif stores a delay per frame" title="Hundredths of a second." o={ep(t, 0.2, 0.8)} />
      <Svg>
        {ds.map((d, i) => {
          const x = XA + acc * PPC, w = d * PPC; acc += d;
          const o = ep(t, 1.0 + i * 0.7, 1.6 + i * 0.7);
          return (
            <g key={i} opacity={o}>
              <rect x={x} y={330} width={w} height={146} fill={i % 2 ? C.panel : C.bg2} stroke={C.text} strokeWidth={4} />
              <Frame x={x + 12} y={346} s={84} n={i} />
              <Tx x={x + w / 2} y={522} size={30} anchor="middle" weight={800}>{d}</Tx>
            </g>
          );
        })}
        <Axis x0={XA} y={560} pps={PPC * 100} to={0.25} step={0.05} o={ep(t, 4.6, 5.2)} />
        <Tx x={XA} y={316} size={24} color={C.dim} mono={false} weight={600} o={ep(t, 1.0, 1.6)}>frame 0 to 4, drawn as long as its delay (hundredths)</Tx>
      </Svg>
      <Cmd y={700} text="ffmpeg -i in.gif out.mp4" o={ep(t, 5.6, 6.2)} />
      <Mid y={800} size={30} color={C.text} o={ep(t, 7.0, 7.6)}>frame rate? length? which frames survive?</Mid>
    </>
  );
};

/* ---------- 2. Four panels ---------- */
const PW = 400, PH = 430, PY = 280, PG = 40, PX0 = (W - (4 * PW + 3 * PG)) / 2;
const SGAP = 4.8;
const panels = [
  {time: '0.600 s', cap: '20 frames, 3 hundredths each: 0.6 s.'},
  {time: '100 / 3', cap: 'Converted: 33.33 frames a second, 0.6 s.'},
  {time: '-r 30', cap: '30 frames a second: 20 frames last 0.667 s.'},
  {time: 'fps=30', cap: 'Still 0.6 s, but frames 5 and 15 vanish.'},
];
const Story: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="The story, in four panels" title="Same frames, three clocks." o={ep(t, 0.2, 0.8)} />
    <Svg>
      {panels.map((p, i) => {
        const x = PX0 + i * (PW + PG), o = ep(t, 0.8 + i * SGAP, 1.5 + i * SGAP);
        const col = i === 2 ? C.red : i === 3 ? C.amber : C.green;
        return (
          <g key={i} opacity={o} transform={`translate(${x} ${PY})`}>
            <rect width={PW} height={PH} fill={C.bg2} stroke={C.text} strokeWidth={5} />
            <rect width={56} height={56} fill={C.text} />
            <Tx x={28} y={40} size={34} color={C.bg} anchor="middle" weight={800}>{i + 1}</Tx>
            <Tx x={PW - 20} y={42} size={32} anchor="end" weight={800} color={i === 0 ? C.text : col}>{p.time}</Tx>
            {i === 0 && (
              <g>
                {[0, 1, 2, 3, 4].map((k) => <Frame key={k} x={30 + k * 72} y={110} s={62} n={k} />)}
                <Tx x={30} y={225} size={26} color={C.dim}>frames 0 to 4 of 20</Tx>
                <Clock cx={110} cy={335} r={58} sec={0.6} />
                <Tx x={290} y={352} size={64} anchor="middle" weight={800}>3</Tx>
                <Tx x={290} y={388} size={22} anchor="middle" color={C.dim} mono={false}>hundredths</Tx>
              </g>
            )}
            {i === 1 && (
              <g>
                <Projector x={30} y={170} k={0.78} color={C.green} tint={C.greenDim} spin={t * 70} />
                <Tx x={PW / 2} y={350} size={58} anchor="middle" weight={800} color={C.green}>33.33</Tx>
                <Tx x={PW / 2} y={392} size={26} anchor="middle" color={C.dim} mono={false}>frames a second</Tx>
              </g>
            )}
            {i === 2 && (
              <g>
                <Projector x={30} y={170} k={0.78} color={C.red} tint={C.redDim} spin={t * 60} />
                <Tx x={PW / 2} y={350} size={58} anchor="middle" weight={800} color={C.red}>30</Tx>
                <Tx x={PW / 2} y={392} size={26} anchor="middle" color={C.dim} mono={false}>20 frames, 0.667 s</Tx>
              </g>
            )}
            {i === 3 && (
              <g>
                {Array.from({length: 20}, (_, k) => (LOST.includes(k)
                  ? <rect key={k} x={30 + k * 17.5} y={110} width={14} height={50} fill="url(#hatch)" stroke={C.red} strokeWidth={2} />
                  : <rect key={k} x={30 + k * 17.5} y={110} width={14} height={50} fill={C.text} />))}
                <Tx x={30 + 5 * 17.5 + 7} y={196} size={22} anchor="middle" color={C.red}>5</Tx>
                <Tx x={30 + 15 * 17.5 + 7} y={196} size={22} anchor="middle" color={C.red}>15</Tx>
                <Tx x={PW / 2} y={350} size={58} anchor="middle" weight={800} color={C.amber}>18 frames</Tx>
                <Tx x={PW / 2} y={392} size={26} anchor="middle" color={C.dim} mono={false}>of 20, in 0.600 s</Tx>
              </g>
            )}
          </g>
        );
      })}
      {[0, 1, 2].map((i) => <line key={i} x1={PX0 + (i + 1) * PW + i * PG + 6} y1={PY + PH / 2} x2={PX0 + (i + 1) * PW + i * PG + PG - 6} y2={PY + PH / 2} stroke={C.mute} strokeWidth={4} markerEnd="url(#chev)" opacity={ep(t, 0.8 + (i + 1) * SGAP, 1.5 + (i + 1) * SGAP)} />)}
    </Svg>
    {panels.map((p, i) => <Note key={i} x={PX0 + i * (PW + PG)} y={PY + PH + 18} w={PW} size={26} color={C.text} o={ep(t, 1.2 + i * SGAP, 1.9 + i * SGAP)}>{p.cap}</Note>)}
  </>
);

/* ---------- 3. The fixture and the readers ---------- */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic gifs · 48 x 48 · 20 frames" title="A picture names its frame." o={ep(t, 0.2, 0.8)} />
    <Svg>
      <Frame x={130} y={290} s={330} n={37} o={ep(t, 1.0, 1.7)} />
      {[0, 1, 2, 3, 4, 5].map((b) => <Tx key={b} x={130 + (2 + 7 * b + 3) * (330 / 48)} y={526} size={26} anchor="middle" color={C.bg} weight={700} o={ep(t, 2.0, 2.6)}>{(37 >> b) & 1}</Tx>)}
      <Tx x={130} y={668} size={26} weight={700} o={ep(t, 2.0, 2.6)}>frame 37 = 1 + 4 + 32</Tx>
      <g opacity={ep(t, 4.6, 5.3)}>
        {['21', 'f9', '04', '00', '03', '00', '00', '00'].map((h, i) => <Tx key={i} x={130 + i * 50} y={764} size={28} weight={i === 4 || i === 5 ? 800 : 700} color={i === 4 || i === 5 ? C.red : C.text}>{h}</Tx>)}
        <rect x={130 + 4 * 50 - 8} y={736} width={2 * 50 - 4} height={40} fill="none" stroke={C.red} strokeWidth={4} />
        <Tx x={130} y={812} size={24} mono={false} color={C.dim} weight={500}>graphic control block: 03 00 is a delay of 3</Tx>
      </g>
    </Svg>
    <Card x={700} y={290} w={1120} h={128} label="Reader 1" value="delay bytes" sub="Node reads the delay field of every graphic control block" color={C.cyan} o={ep(t, 7.4, 8.0)} vs={42} />
    <Card x={700} y={434} w={1120} h={128} label="Reader 2" value="ffprobe" sub="frame rates, packet timestamps, duration" color={C.amber} o={ep(t, 9.6, 10.2)} vs={42} />
    <Card x={700} y={578} w={1120} h={128} label="Reader 3" value="decoded pixels" sub="which frame is on screen, and for how long" color={C.violet} o={ep(t, 11.6, 12.2)} vs={42} />
    <Card x={700} y={722} w={1120} h={128} label="Control" value="the gif itself" sub="frame i is on screen for exactly delay i, all five delays" color={C.green} o={ep(t, 14.4, 15.0)} vs={42} />
  </>
);

/* ---------- 4. A constant delay ---------- */
const BX4 = 470, KF = 11; // bars start here, 11 px per frame per second
const Const: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="One delay for every frame" title="Rate = 100 / delay." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Svg>
      <line x1={BX4 + 30 * KF} y1={300} x2={BX4 + 30 * KF} y2={780} stroke={C.mute} strokeWidth={3} strokeDasharray="12 9" opacity={ep(t, 0.9, 1.4)} />
      <Tx x={BX4 + 30 * KF} y={292} size={24} anchor="middle" color={C.mute} o={ep(t, 0.9, 1.4)}>30 fps</Tx>
      {CONSTS.map((c, i) => {
        const y = 330 + i * 92, a = 1.2 + i * 1.7, hl = c.d === 3;
        const col = hl ? C.amber : C.green, tint = hl ? C.amberDim : C.greenDim;
        return (
          <g key={c.d}>
            <Tx x={96} y={y + 38} size={28} weight={700} o={ep(t, a, a + 0.4)}>{c.d} hundredths</Tx>
            <rect x={BX4} y={y} width={c.fps * KF * ep(t, a + 0.1, a + 0.9)} height={56} fill={tint} stroke={col} strokeWidth={4} />
            <Tx x={1140} y={y + 38} size={30} weight={800} color={col} o={ep(t, a + 0.7, a + 1.2)}>{c.label} fps</Tx>
            <Tx x={1500} y={y + 38} size={28} weight={600} color={C.text} o={ep(t, a + 0.7, a + 1.2)}>{c.dur} s</Tx>
          </g>
        );
      })}
      <Tx x={1500} y={300} size={24} color={C.mute} o={ep(t, 1.2, 1.7)}>length, 20 frames</Tx>
      <Tx x={1140} y={300} size={24} color={C.mute} o={ep(t, 1.2, 1.7)}>mp4 rate</Tx>
    </Svg>
    <Note x={96} y={810} w={1728} align="center" size={28} color={C.text} o={ep(t, 10.4, 11.0)}>Every frame kept. Each is on screen for exactly its delay, in the mp4.</Note>
  </>
);

/* ---------- 5. Mixed delays ---------- */
const XM = 210, PPS = 1500; // 1.00 s = 1500 px
const mixCells = (() => { let a = 0; return MIXD.map((d) => { const x = a; a += d; return {x, d}; }); })();
const Mix: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Different delays in one gif" title="Twenty frames become a hundred." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Svg>
      <Tx x={XM} y={300} size={26} weight={700} o={ep(t, 0.9, 1.4)}>gif: 20 frames, 1.00 s</Tx>
      {mixCells.map((c, i) => (
        <g key={i} opacity={ep(t, 1.0 + i * 0.04, 1.4 + i * 0.04)}>
          <rect x={XM + c.x * 15} y={316} width={c.d * 15} height={56} fill={i % 2 ? C.cyanDim : C.bg2} stroke={C.text} strokeWidth={3} />
          <Tx x={XM + c.x * 15 + c.d * 7.5} y={353} size={22} anchor="middle">{c.d}</Tx>
        </g>
      ))}
      <Tx x={XM} y={446} size={26} weight={700} color={C.amber} o={ep(t, 3.2, 3.7)}>default mp4: 100 frames, 100 per second, 1.00 s</Tx>
      {mixCells.map((c, i) => Array.from({length: c.d}, (_, k) => (
        <rect key={`${i}-${k}`} x={XM + (c.x + k) * 15 + 1} y={462} width={13} height={56} fill={i % 2 ? C.cyanDim : C.bg2} stroke={C.amber} strokeWidth={2} opacity={ep(t, 3.4 + (c.x + k) * 0.02, 3.8 + (c.x + k) * 0.02)} />
      )))}
      <Tx x={XM} y={592} size={26} weight={700} color={C.red} o={ep(t, 8.6, 9.1)}>passthrough: 20 frames, exact times, 0.91 s</Tx>
      {mixCells.map((c, i) => {
        const last = i === 19, w = last ? 15 : c.d * 15;
        return (
          <g key={i} opacity={ep(t, 8.8 + i * 0.03, 9.2 + i * 0.03)}>
            <rect x={XM + c.x * 15} y={608} width={w} height={56} fill={i % 2 ? C.cyanDim : C.bg2} stroke={C.red} strokeWidth={3} />
            {!last && <Tx x={XM + c.x * 15 + c.d * 7.5} y={645} size={22} anchor="middle">{c.d}</Tx>}
          </g>
        );
      })}
      <g opacity={ep(t, 11.4, 12.0)}>
        <rect x={XM + 91 * 15} y={608} width={9 * 15} height={56} fill="url(#hatch)" stroke={C.red} strokeWidth={3} strokeDasharray="10 7" />
        <Tx x={XM + 100 * 15} y={700} size={24} anchor="end" color={C.red}>last delay: 10 becomes 1</Tx>
      </g>
      <Axis x0={XM} y={740} pps={PPS} to={1} step={0.25} o={ep(t, 1.0, 1.6)} />
    </Svg>
  </>
);

/* ---------- 6. Forcing a rate ---------- */
const XR = 300, PR = 1200; // 1 s = 1200 px
const Rate: React.FC<SceneProps> = ({t}) => {
  const shown = Array.from({length: 20}, (_, k) => k).filter((k) => !LOST.includes(k));
  return (
    <>
      <Head over="Forcing a rate on the 3 hundredth gif" title="The clip gets longer, or loses frames." color={C.red} o={ep(t, 0.2, 0.8)} />
      <Svg>
        <line x1={XR + 0.6 * PR} y1={290} x2={XR + 0.6 * PR} y2={560} stroke={C.mute} strokeWidth={3} strokeDasharray="12 9" opacity={ep(t, 0.9, 1.4)} />
        <Tx x={96} y={341} size={28} weight={700} o={ep(t, 0.9, 1.4)}>gif</Tx>
        {Array.from({length: 20}, (_, k) => (
          <g key={k} opacity={ep(t, 1.0 + k * 0.03, 1.3 + k * 0.03)}>
            <rect x={XR + k * 36} y={310} width={36} height={52} fill={k % 2 ? C.cyanDim : C.bg2} stroke={C.text} strokeWidth={2} />
            <Tx x={XR + k * 36 + 18} y={343} size={17} anchor="middle" weight={500}>{k}</Tx>
          </g>
        ))}
        <Tx x={XR + 20 * 36 + 20} y={344} size={26} weight={700} o={ep(t, 1.6, 2.0)}>0.600 s</Tx>

        <Tx x={96} y={421} size={28} weight={700} color={C.red} o={ep(t, 2.6, 3.1)}>-r 30</Tx>
        {Array.from({length: 20}, (_, k) => {
          const late = k >= 18;
          return (
            <g key={k} opacity={ep(t, 2.8 + k * 0.03, 3.1 + k * 0.03)}>
              <rect x={XR + k * 40} y={390} width={40} height={52} fill={late ? 'url(#hatch)' : k % 2 ? C.cyanDim : C.bg2} stroke={late ? C.red : C.text} strokeWidth={2} />
              <Tx x={XR + k * 40 + 20} y={423} size={17} anchor="middle" weight={500}>{k}</Tx>
            </g>
          );
        })}
        <Tx x={XR + 20 * 40 + 20} y={424} size={26} weight={700} color={C.red} o={ep(t, 3.6, 4.0)}>0.667 s</Tx>

        <Tx x={96} y={501} size={28} weight={700} color={C.amber} o={ep(t, 8.2, 8.7)}>fps=30</Tx>
        {shown.map((k, j) => (
          <g key={k} opacity={ep(t, 8.4 + j * 0.03, 8.7 + j * 0.03)}>
            <rect x={XR + j * 40} y={470} width={40} height={52} fill={j % 2 ? C.cyanDim : C.bg2} stroke={C.text} strokeWidth={2} />
            <Tx x={XR + j * 40 + 20} y={503} size={17} anchor="middle" weight={500}>{k}</Tx>
          </g>
        ))}
        <Tx x={XR + 18 * 40 + 20} y={504} size={26} weight={700} color={C.amber} o={ep(t, 9.2, 9.6)}>0.600 s, 18 frames</Tx>
        <Axis x0={XR} y={585} pps={PR} to={0.8} step={0.2} o={ep(t, 1.0, 1.6)} fmt={(s) => `${s.toFixed(1)} s`} />
      </Svg>
      <Card x={300} y={690} w={760} h={134} label="The mixed gif" value="2, 3, 4 hundredths: 33.3 ms" sub="with -r 30; fps=30 also drops frames 5 and 15" color={C.red} o={ep(t, 12.4, 13.0)} vs={34} />
      <Card x={1100} y={690} w={640} h={134} label="The 10 hundredth gif" value="80 and 120 ms" sub="with -r 25, held in turn: judder" color={C.amber} o={ep(t, 15.2, 15.8)} vs={34} />
    </>
  );
};

/* ---------- 7. Close ---------- */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="What to check" title="Probe the times after a conversion." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Svg>
      <Projector x={170} y={450} k={1} spin={t * 40} o={ep(t, 0.8, 1.4)} />
      <Clock cx={330} cy={700} r={64} sec={0.6} o={ep(t, 0.8, 1.4)} />
    </Svg>
    <Card x={800} y={290} w={1020} h={138} label="No rate flag" value="the delays survive" sub="rate 100 / delay, or a 100 fps file for mixed delays" color={C.green} o={ep(t, 1.4, 2.0)} vs={44} />
    <Card x={800} y={448} w={1020} h={138} label="Forcing a rate" value="the time changes" sub="-r 30 runs longer, fps=30 drops frames" color={C.red} o={ep(t, 2.6, 3.2)} vs={44} />
    <Card x={800} y={606} w={1020} h={138} label="Delay 0 in the file" value="read as 10 hundredths" sub="100 ms. A delay of 1 stays 10 ms." color={C.amber} o={ep(t, 3.8, 4.4)} vs={44} />
    <Note x={96} y={786} w={1728} align="center" size={28} o={ep(t, 5.4, 6.0)}>Not tested: browsers, other gif writers, real animations, other builds.</Note>
    <Note x={96} y={832} w={1728} align="center" size={28} color={C.mute} o={ep(t, 6.0, 6.6)}>FFmpeg Reality Checks · episode 80 · fixture and tests in the description</Note>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, story: Story, source: Source, const: Const, mix: Mix, rate: Rate, close: Close};
