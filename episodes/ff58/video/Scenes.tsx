import React from 'react';
import {C, F, D} from '../../kit/theme';
import {ep, eio, prog, rnd} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Johnny Harris desk-and-map. A flat desk, a paper map of the clip pinned down, pushpins, string and typed index cards,
 * a slow push-in with camera-like easing. Every mark is drawn from the measured data of episodes/ff58/fixture/experiment.mjs
 * (100 frames at 25 fps, keyframes at 0, 25, 50, 75; asked frame 38 at 1.52 s). ffmpeg 6.1.1.
 */

const X0 = 160, PX = 16;                       // map: frame i sits at x = 160 + 16 i (1600 px for 100 frames)
const xOf = (f: number) => X0 + PX * f;
const KEYS = [0, 25, 50, 75];
const typed = (s: string, t: number, a: number, cps = 34) => s.slice(0, Math.max(0, Math.floor((t - a) * cps)));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/* ---------- desk ---------- */
const Desk: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, background: C.panel}}>
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 -0.42" result="a" />
          <feFlood floodColor={C.mute} result="f" />
          <feComposite in="f" in2="a" operator="in" />
        </filter>
      </defs>
      <rect x={0} y={0} width={1920} height={1080} filter="url(#grain)" opacity={0.35} />
    </svg>
    {children}
  </div>
);

const Cam: React.FC<{t: number; dur: number; from: [number, number, number]; to: [number, number, number]; children?: React.ReactNode}> = ({t, dur, from, to, children}) => {
  const p = eio(t, 0, dur);
  const z = lerp(from[2], to[2], p), cx = lerp(from[0], to[0], p), cy = lerp(from[1], to[1], p);
  return <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${960 - cx * z}px, ${520 - cy * z}px) scale(${z})`}}>{children}</div>;
};

const Sheet: React.FC<{o?: number}> = ({o = 1}) => (
  <div style={{position: 'absolute', left: 90, top: 130, width: 1740, height: 730, background: C.bg, border: `2px solid ${C.line}`, boxShadow: `6px 6px 0 ${C.line}`, opacity: o}} />
);

const MapTitle: React.FC<{over: string; title: string; color?: string; o?: number; y?: number}> = ({over, title, color = C.cyan, o = 1, y = 150}) => (
  <div style={{position: 'absolute', left: 150, top: y, opacity: o}}>
    <div style={{fontFamily: F.sans, fontSize: 22, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase', color}}>{over}</div>
    <div style={{fontFamily: F.display, fontSize: 70 * D.k, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: C.text, lineHeight: 1.0, marginTop: 8}}>{title}</div>
  </div>
);

/* ---------- pushpin, string, circle, card ---------- */
const Pin: React.FC<{x: number; y: number; color?: string; o?: number; label?: string; labelDy?: number; labelColor?: string}> = ({x, y, color = C.red, o = 1, label, labelDy = -42, labelColor}) => {
  const drop = 1 + (1 - o) * 1.6;
  return (
    <g opacity={o}>
      <ellipse cx={x + 4} cy={y + 6} rx={11} ry={5} fill={C.dim} opacity={0.35} />
      <g transform={`translate(${x} ${y - (1 - o) * 30}) scale(${drop})`}>
        <circle r={12} fill={color} stroke={C.text} strokeWidth={2} />
        <circle cx={-4} cy={-4} r={3.5} fill={C.bg2} />
      </g>
      {label && <text x={x} y={y + labelDy} textAnchor="middle" fontFamily={F.mono} fontSize={24} fontWeight={700} fill={labelColor ?? color}>{label}</text>}
    </g>
  );
};

const Str: React.FC<{x1: number; y1: number; x2: number; y2: number; p?: number; color?: string; sag?: number; w?: number; dash?: boolean}> = ({x1, y1, x2, y2, p = 1, color = C.red, sag = 40, w = 3.5, dash = false}) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + sag;
  return <path d={`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`} stroke={color} strokeWidth={w} fill="none" pathLength={1} strokeDasharray={dash ? '0.012 0.012' : 1} strokeDashoffset={dash ? 0 : 1 - p} opacity={dash ? (p > 0.99 ? 1 : p) : 1} strokeLinecap="round" />;
};

/* hand-drawn loop around (cx, cy), overshooting a little, drawn with progress p */
const Loop: React.FC<{cx: number; cy: number; rx: number; ry: number; p?: number; color?: string; seed?: number}> = ({cx, cy, rx, ry, p = 1, color = C.red, seed = 3}) => {
  const pts: string[] = [];
  const N = 36;
  for (let i = 0; i <= N; i++) {
    const a = -Math.PI / 2 + (i / N) * Math.PI * 2.18;
    const j = 1 + (rnd(seed * 31 + i) - 0.5) * 0.07 + (i / N) * 0.05;
    pts.push(`${i ? 'L' : 'M'}${(cx + Math.cos(a) * rx * j).toFixed(1)} ${(cy + Math.sin(a) * ry * j).toFixed(1)}`);
  }
  return <path d={pts.join(' ')} stroke={color} strokeWidth={4.5} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />;
};

const Card: React.FC<{x: number; y: number; w: number; rot?: number; o?: number; head: string; lines: string[]; color?: string; size?: number; h?: number; tape?: boolean}> = ({x, y, w, rot = 0, o = 1, head, lines, color = C.cyan, size = 27, h, tape = true}) => (
  <div style={{position: 'absolute', left: x, top: y - (1 - o) * 24, width: w, height: h, boxSizing: 'border-box', transform: `rotate(${rot}deg)`, opacity: o, background: C.bg2, border: `2px solid ${C.line}`, boxShadow: `5px 5px 0 ${C.line}`, padding: '16px 22px 18px'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 5, background: color}} />
    {tape && <div style={{position: 'absolute', left: w / 2 - 44, top: -16, width: 88, height: 28, background: C.amberDim, opacity: 0.85, transform: 'rotate(-2deg)'}} />}
    <div style={{fontFamily: F.sans, fontSize: 19, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color, marginTop: 8}}>{head}</div>
    {lines.map((l, i) => <div key={i} style={{fontFamily: F.mono, fontSize: size, color: C.text, lineHeight: 1.35, marginTop: i ? 4 : 10, whiteSpace: 'pre'}}>{l}</div>)}
  </div>
);

/* ---------- the strip: one cell per frame, to scale ---------- */
type Cell = {fill?: string; stroke?: string; dash?: boolean; hatch?: boolean};
const Strip: React.FC<{y: number; h?: number; cell: (i: number) => Cell | null; from?: number; to?: number; x0?: number; px?: number; reveal?: number; keys?: boolean}> = ({y, h = 70, cell, from = 0, to = 99, x0 = X0, px = PX, reveal = 1, keys = true}) => {
  const out: React.ReactNode[] = [];
  const n = to - from + 1;
  for (let i = from; i <= to; i++) {
    const c = cell(i);
    if (!c) continue;
    const k = (i - from) / n;
    if (k > reveal) continue;
    out.push(<rect key={i} x={x0 + (i - from) * px + 1} y={y} width={px - 2} height={h} fill={c.hatch ? 'url(#hatch)' : c.fill ?? 'none'} stroke={c.stroke ?? C.line} strokeWidth={c.dash ? 2 : 1.5} strokeDasharray={c.dash ? '4 3' : undefined} />);
  }
  return (
    <g>
      <defs>
        <pattern id="hatch" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={8} height={8} fill={C.bg2} /><line x1={0} y1={0} x2={0} y2={8} stroke={C.red} strokeWidth={3} />
        </pattern>
      </defs>
      {out}
      {keys && KEYS.filter((k) => k >= from && k <= to && cell(k)).map((k) => <line key={k} x1={x0 + (k - from) * px} x2={x0 + (k - from) * px} y1={y - 18} y2={y + h + 10} stroke={C.text} strokeWidth={3} />)}
    </g>
  );
};
const Svg: React.FC<{children?: React.ReactNode}> = ({children}) => <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>{children}</svg>;
const Tag: React.FC<{x: number; y: number; text: string; color?: string; size?: number; o?: number; anchor?: 'middle' | 'start' | 'end'}> = ({x, y, text, color = C.dim, size = 24, o = 1, anchor = 'middle'}) => <text x={x} y={y} textAnchor={anchor} fontFamily={F.mono} fontSize={size} fontWeight={700} fill={color} opacity={o}>{text}</text>;
const Big: React.FC<{x: number; y: number; value: string; caption: string; color?: string; o?: number; size?: number; w?: number}> = ({x, y, value, caption, color = C.red, o = 1, size = 170, w = 360}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, textAlign: 'center'}}>
    <div style={{fontFamily: F.display, fontWeight: 900, fontSize: size * D.k * 0.8, lineHeight: 0.95, color, letterSpacing: 1, whiteSpace: 'nowrap'}}>{value}</div>
    <div style={{fontFamily: F.mono, fontSize: 24, color: C.dim, marginTop: 6, lineHeight: 1.3, whiteSpace: 'pre'}}>{caption}</div>
  </div>
);

const SY = 470;                                   // strip top (world y)
const tickRow = (y: number, o = 1) => KEYS.map((k, i) => <Tag key={k} x={xOf(k)} y={y} text={`${k}`} color={C.text} size={22} o={o * ep(1, 0, 1)} />);
const secLabels = (y: number, o = 1) => KEYS.map((k) => <Tag key={k} x={xOf(k)} y={y} text={`${(k / 25).toFixed(1)} s`} color={C.mute} size={20} o={o} />);

/* 1. The question */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const cmd = 'ffmpeg -ss 1.52 -i in.mkv -c copy out.mkv';
  const SYa = 500;
  return (
    <Desk>
      <Cam t={t} dur={dur} from={[960, 480, 1.0]} to={[960, 490, 1.05]}>
        <Sheet />
        <MapTitle over="Stream copy, cut at 1.52 s" title="Where does the cut start?" o={ep(t, 0.2, 0.9)} />
        <Card x={430} y={300} w={1060} rot={-0.5} o={ep(t, 1.0, 1.6)} head="Command" color={C.amber} size={36}
          lines={[`$ ${typed(cmd, t, 1.6, 24)}${t > 1.6 && t < 3.6 ? '|' : ''}`]} h={104} />
        <Svg>
          <Strip y={SYa + 20} cell={() => ({stroke: C.line})} reveal={ep(t, 2.4, 4.0)} />
          {KEYS.map((k, i) => <Pin key={k} x={xOf(k)} y={SYa} color={C.red} o={ep(t, 3.4 + i * 0.4, 3.9 + i * 0.4)} label={`key ${k}`} labelDy={-26} />)}
          {tickRow(SYa + 122, ep(t, 5.0, 5.6))}
          <Loop cx={xOf(38) + 8} cy={SYa + 55} rx={26} ry={62} p={ep(t, 6.2, 7.0)} color={C.red} />
          <Str x1={xOf(38) + 14} y1={SYa - 8} x2={870} y2={408} p={ep(t, 7.0, 7.6)} color={C.red} sag={-10} />
          <Tag x={xOf(38) + 8} y={SYa + 160} text="asked: frame 38 (1.52 s)" color={C.red} size={26} o={ep(t, 7.2, 7.8)} />
        </Svg>
        <Card x={170} y={700} w={620} rot={0.8} o={ep(t, 4.6, 5.2)} head="Clip" color={C.cyan} lines={['100 frames, 4 s, 25 fps', 'a keyframe every 25 frames']} />
        <Card x={1130} y={700} w={620} rot={-0.7} o={ep(t, 5.4, 6.0)} head="Question" color={C.red} lines={['Where does a copy cut', 'start, and what is in front?']} />
      </Cam>
    </Desk>
  );
};

/* 2. The clip and the readers */
const MapScene: React.FC<SceneProps> = ({t, dur}) => {
  const ctl = (i: number): Cell => (i >= 25 ? {fill: C.greenDim, stroke: C.green} : {stroke: C.line});
  const sy = 340;
  return (
    <Desk>
      <Cam t={t} dur={dur} from={[950, 480, 1.0]} to={[980, 480, 1.05]}>
        <Sheet />
        <MapTitle over="Control: ask for a keyframe" title="-ss 1 is exact." color={C.green} o={ep(t, 0.2, 0.8)} />
        <Svg>
          <Strip y={sy} cell={ctl} reveal={ep(t, 1.0, 3.2)} />
          {KEYS.map((k) => <Pin key={k} x={xOf(k)} y={sy - 4} color={k === 25 ? C.green : C.red} o={1} />)}
          {secLabels(sy + 108, ep(t, 1.4, 2.0))}
          <Tag x={xOf(62)} y={sy + 156} text="frames 25 to 99, 75 frames, nothing extra, nothing missing" color={C.green} size={26} o={ep(t, 3.0, 3.6)} />
          <Str x1={xOf(25)} y1={sy + 186} x2={430} y2={606} p={ep(t, 3.8, 4.4)} color={C.cyan} sag={30} w={3} />
          <Str x1={xOf(50)} y1={sy + 186} x2={960} y2={606} p={ep(t, 4.8, 5.4)} color={C.amber} sag={30} w={3} />
          <Str x1={xOf(75)} y1={sy + 186} x2={1490} y2={606} p={ep(t, 5.8, 6.4)} color={C.green} sag={30} w={3} />
        </Svg>
        <Card x={170} y={606} w={520} rot={-0.8} o={ep(t, 4.2, 4.8)} head="Reader 1" color={C.cyan} lines={['ffprobe times', 'framemd5 hash of each', 'frame against the source']} />
        <Card x={700} y={606} w={520} rot={0.6} o={ep(t, 5.2, 5.8)} head="Reader 2" color={C.amber} lines={['raw luma in Node', 'mp4 edit list bytes', 'mkv first block time']} />
        <Card x={1250} y={606} w={500} rot={-0.5} o={ep(t, 6.2, 6.8)} head="Control" color={C.green} lines={['-ss 1, before or after', '-i, mp4 and mkv:', 'exact in 4 of 4 copies']} />
      </Cam>
    </Desk>
  );
};

/* 3. -ss before -i */
const Before: React.FC<SceneProps> = ({t, dur}) => {
  const sy = 340;
  const cell = (i: number): Cell => (i < 25 ? {stroke: C.line} : i < 38 ? {fill: C.red, stroke: C.red} : {fill: C.greenDim, stroke: C.green});
  const mini = (i: number): Cell => (i < 49 ? {fill: C.red, stroke: C.red} : {fill: C.greenDim, stroke: C.green});
  return (
    <Desk>
      <Cam t={t} dur={dur} from={[940, 480, 1.0]} to={[990, 480, 1.05]}>
        <Sheet />
        <MapTitle over="-ss 1.52 before -i · mkv" title="It starts too early." color={C.red} o={ep(t, 0.2, 0.8)} />
        <Svg>
          <Strip y={sy} cell={cell} reveal={ep(t, 0.8, 2.4)} />
          {KEYS.map((k) => <Pin key={k} x={xOf(k)} y={sy - 4} color={k === 25 ? C.red : C.mute} o={1} />)}
          <Pin x={xOf(38)} y={sy - 4} color={C.amber} o={ep(t, 2.6, 3.0)} label="asked: 38" labelDy={-28} />
          <Str x1={xOf(38)} y1={sy - 4} x2={xOf(25)} y2={sy - 4} p={ep(t, 3.2, 4.0)} color={C.red} sag={-50} />
          <Loop cx={(xOf(25) + xOf(38)) / 2} cy={sy + 35} rx={130} ry={50} p={ep(t, 4.0, 4.8)} color={C.red} seed={5} />
          <Tag x={(xOf(25) + xOf(38)) / 2} y={sy + 120} text="13 extra frames" color={C.red} size={26} o={ep(t, 4.4, 5.0)} />
          <Tag x={xOf(25) - 20} y={sy + 156} text="the cut starts here: frame 25" color={C.red} size={22} o={ep(t, 4.4, 5.0)} anchor="start" />
          <Tag x={xOf(70)} y={sy + 120} text="62 frames asked for, 38 to 99" color={C.green} size={26} o={ep(t, 5.0, 5.6)} />
          {/* second case, to scale: -ss 1.96 */}
          <Tag x={1190} y={566} text="-ss 1.96: one keyframe window" color={C.dim} size={22} o={ep(t, 6.2, 6.8)} anchor="start" />
          <Strip y={586} h={50} cell={mini} from={25} to={49} x0={1190} px={24} keys={false} reveal={ep(t, 6.4, 7.4)} />
          <Tag x={1190} y={676} text="24 extra" color={C.red} size={24} o={ep(t, 7.4, 8.0)} anchor="start" />
          <Tag x={1790} y={676} text="1 asked" color={C.green} size={24} o={ep(t, 7.4, 8.0)} anchor="end" />
        </Svg>
        <Big x={150} y={540} value="13" caption={'extra frames · 0.52 s'} color={C.red} o={ep(t, 5.4, 6.0)} />
        <Card x={560} y={570} w={580} rot={-0.5} o={ep(t, 5.8, 6.4)} head="Both readers" color={C.cyan} size={24} lines={['source frames 25 to 99', '75 frames, first at 0.00 s', 'mkv first block at 0.00 s']} />
      </Cam>
    </Desk>
  );
};

/* 4. the mp4 edit list */
const Mp4: React.FC<SceneProps> = ({t, dur}) => {
  const top = (i: number): Cell | null => (i < 25 ? null : i < 38 ? {hatch: true, stroke: C.red} : {fill: C.greenDim, stroke: C.green});
  const bot = (i: number): Cell | null => (i < 38 ? null : {fill: C.greenDim, stroke: C.green});
  const gx = (xOf(25) + xOf(38)) / 2;
  return (
    <Desk>
      <Cam t={t} dur={dur} from={[940, 480, 1.0]} to={[970, 480, 1.05]}>
        <Sheet />
        <MapTitle over="-ss 1.52 before -i · mp4" title="The file keeps them." color={C.amber} o={ep(t, 0.2, 0.8)} />
        <Svg>
          <Tag x={xOf(25)} y={324} text="stored in the file: 75 packets, frames 25 to 99" color={C.dim} size={24} o={ep(t, 0.8, 1.4)} anchor="start" />
          <Strip y={360} h={64} cell={top} reveal={ep(t, 1.0, 2.6)} />
          <Loop cx={gx} cy={392} rx={125} ry={50} p={ep(t, 2.8, 3.6)} color={C.red} seed={9} />
          <Str x1={gx} y1={448} x2={gx} y2={546} p={ep(t, 3.6, 4.4)} color={C.red} sag={0} />
          <Tag x={xOf(40)} y={496} text="what plays: 62 frames, 38 to 99" color={C.dim} size={24} o={ep(t, 4.2, 4.8)} anchor="start" />
          <Strip y={520} h={64} cell={bot} reveal={ep(t, 4.4, 5.8)} />
          <Tag x={gx} y={626} text="skipped by the edit list" color={C.red} size={24} o={ep(t, 4.6, 5.2)} />
        </Svg>
        <Card x={170} y={680} w={820} rot={-0.4} o={ep(t, 5.8, 6.4)} head="elst box, read in Node" color={C.amber} size={26}
          lines={[`media_time ${typed('8320', t, 6.4, 14)} of 16000 per s`, '= 0.52 s skipped at the start']} />
        <Card x={1080} y={680} w={660} rot={0.6} o={ep(t, 7.0, 7.6)} head="ffmpeg obeys it" color={C.green} size={26} lines={['mp4: 62 frames play', 'mkv, no edit list: 75 play']} />
      </Cam>
    </Desk>
  );
};

/* 5. -ss after -i */
const After: React.FC<SceneProps> = ({t, dur}) => {
  const src = (i: number): Cell => (i < 38 ? {stroke: C.line} : i < 50 ? {stroke: C.red, dash: true} : {fill: C.cyanDim, stroke: C.cyan});
  /* output timeline: cell j shows output time j / 25 s; cells 0 to 11 are empty, frame 50 + (j - 12) after that */
  const out = (j: number): Cell | null => (j < 12 ? {hatch: true, stroke: C.red} : j <= 61 ? {fill: C.cyanDim, stroke: C.cyan} : null);
  return (
    <Desk>
      <Cam t={t} dur={dur} from={[940, 480, 1.0]} to={[980, 490, 1.05]}>
        <Sheet />
        <MapTitle over="-ss 1.52 after -i · mkv and mp4" title="It starts too late." color={C.red} o={ep(t, 0.2, 0.8)} />
        <Svg>
          <Strip y={344} h={56} cell={src} reveal={ep(t, 0.8, 2.2)} />
          {KEYS.map((k) => <Pin key={k} x={xOf(k)} y={340} color={k === 50 ? C.red : C.mute} o={1} />)}
          <Pin x={xOf(38)} y={340} color={C.amber} o={ep(t, 2.4, 2.9)} label="asked: 38" labelDy={-28} />
          <Str x1={xOf(38)} y1={340} x2={xOf(50)} y2={340} p={ep(t, 3.0, 3.8)} color={C.red} sag={-50} />
          <Tag x={(xOf(38) + xOf(50)) / 2} y={442} text="12 lost" color={C.red} size={26} o={ep(t, 3.8, 4.4)} />
          <Tag x={X0} y={488} text="the cut, on its own clock (0.00 s at the left)" color={C.dim} size={22} o={ep(t, 4.4, 5.0)} anchor="start" />
          <Strip y={512} h={56} cell={out} from={0} to={61} reveal={ep(t, 4.6, 5.8)} keys={false} />
          <Loop cx={X0 + 6 * PX} cy={541} rx={118} ry={40} p={ep(t, 5.8, 6.6)} color={C.red} seed={11} />
          <Tag x={X0} y={622} text="0.00 to 0.48 s: nothing" color={C.red} size={24} o={ep(t, 6.2, 6.8)} anchor="start" />
          <Tag x={X0 + 12 * PX} y={660} text="first frame (source 50) at 0.48 s" color={C.cyan} size={24} o={ep(t, 6.4, 7.0)} anchor="start" />
        </Svg>
        <Big x={1290} y={620} value="0.48 s" caption={'before the first frame'} color={C.red} o={ep(t, 6.8, 7.4)} size={130} w={470} />
        <Card x={170} y={700} w={540} rot={-0.6} o={ep(t, 7.2, 7.8)} head="mp4" color={C.amber} size={24} lines={['empty edit, 480 of 1000 per s']} />
        <Card x={760} y={700} w={500} rot={0.5} o={ep(t, 7.8, 8.4)} head="mkv" color={C.amber} size={24} lines={['first block at 0.48 s']} />
      </Cam>
    </Desk>
  );
};

/* 6. The rule */
const Rule: React.FC<SceneProps> = ({t, dur}) => {
  const rows = [
    {ss: '0.48', q: 12, extra: 12, miss: 13},
    {ss: '1.52', q: 38, extra: 13, miss: 12},
    {ss: '1.96', q: 49, extra: 24, miss: 1},
  ];
  const PX2 = 26, bx = 620;
  return (
    <Desk>
      <Cam t={t} dur={dur} from={[960, 470, 1.0]} to={[960, 480, 1.05]}>
        <Sheet />
        <MapTitle over="One keyframe window = 25 frames" title="Extra plus missing is 25." color={C.amber} o={ep(t, 0.2, 0.8)} />
        <Svg>
          {rows.map((r, k) => {
            const y = 370 + k * 105, o0 = 0.8 + k * 1.2;
            const start = r.q - r.extra; // keyframe before
            const cell = (i: number): Cell => (i < r.extra ? {fill: C.red, stroke: C.red} : {fill: 'none', stroke: C.amber, dash: true});
            return (
              <g key={k}>
                <Tag x={150} y={y + 42} text={`-ss ${r.ss}`} color={C.text} size={32} o={ep(t, o0, o0 + 0.5)} anchor="start" />
                <Strip y={y} h={56} cell={cell} from={0} to={24} x0={bx} px={PX2} keys={false} reveal={ep(t, o0 + 0.3, o0 + 1.1)} />
                <line x1={bx} x2={bx} y1={y - 10} y2={y + 66} stroke={C.text} strokeWidth={3} opacity={ep(t, o0, o0 + 0.5)} />
                <line x1={bx + 25 * PX2} x2={bx + 25 * PX2} y1={y - 10} y2={y + 66} stroke={C.text} strokeWidth={3} opacity={ep(t, o0, o0 + 0.5)} />
                <Pin x={bx + r.extra * PX2} y={y - 6} color={C.amber} o={ep(t, o0 + 0.6, o0 + 1.1)} />
                <Tag x={bx + 25 * PX2 + 40} y={y + 42} text={`${r.extra} + ${r.miss} = ${r.extra + r.miss}`} color={C.text} size={32} o={ep(t, o0 + 1.0, o0 + 1.5)} anchor="start" />
              </g>
            );
          })}
          <Tag x={bx} y={344} text="keyframe before" color={C.mute} size={20} o={ep(t, 1.0, 1.6)} anchor="start" />
          <Tag x={bx + 25 * PX2} y={344} text="keyframe after" color={C.mute} size={20} o={ep(t, 1.0, 1.6)} anchor="end" />
        </Svg>
        <Card x={170} y={710} w={620} rot={-0.6} o={ep(t, 4.8, 5.4)} head="Before -i" color={C.red} size={25} lines={['red: extra frames at the start']} h={104} />
        <Card x={830} y={710} w={520} rot={0.5} o={ep(t, 5.4, 6.0)} head="After -i" color={C.amber} size={25} lines={['dashed: asked, but missing']} h={104} />
        <Card x={1390} y={710} w={360} rot={-0.4} o={ep(t, 6.4, 7.0)} head="Re-encode" color={C.green} size={25} lines={['62 frames, no gap']} h={104} />
      </Cam>
    </Desk>
  );
};

/* 7. What to check */
const Close: React.FC<SceneProps> = ({t, dur}) => (
  <Desk>
    <Cam t={t} dur={dur} from={[960, 470, 1.0]} to={[960, 480, 1.04]}>
      <Sheet />
      <MapTitle over="What to check" title="Read the first frame." color={C.cyan} o={ep(t, 0.2, 0.8)} />
      <Svg>
        <Str x1={960} y1={430} x2={430} y2={500} p={ep(t, 2.2, 3.0)} color={C.cyan} sag={20} />
        <Str x1={960} y1={430} x2={960} y2={500} p={ep(t, 3.2, 4.0)} color={C.green} sag={0} />
        <Str x1={960} y1={430} x2={1490} y2={500} p={ep(t, 4.2, 5.0)} color={C.amber} sag={20} />
        <Pin x={960} y={430} color={C.red} o={ep(t, 1.6, 2.2)} />
      </Svg>
      <Card x={170} y={500} w={520} rot={-0.8} o={ep(t, 2.6, 3.2)} head="Check" color={C.cyan} lines={['first frame time', 'first frame number', 'of every cut']} />
      <Card x={700} y={500} w={520} rot={0.6} o={ep(t, 3.6, 4.2)} head="To land exactly" color={C.green} lines={['cut on a keyframe,', 'or re-encode', '(62 frames, no gap)']} />
      <Card x={1230} y={500} w={520} rot={-0.5} o={ep(t, 4.6, 5.2)} head="Not tested" color={C.amber} size={24} lines={['audio, B-frames, players,', 'real footage, other builds', 'than ffmpeg 6.1.1']} />
      <div style={{position: 'absolute', left: 150, top: 760, width: 1620, textAlign: 'center', fontFamily: F.mono, fontSize: 26, color: C.mute, opacity: ep(t, 6.0, 6.6)}}>FFmpeg Reality Checks · episode 58 · fixture and tests in the description</div>
    </Cam>
  </Desk>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, map: MapScene, before: Before, mp4: Mp4, after: After, rule: Rule, close: Close};
