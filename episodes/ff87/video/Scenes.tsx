import React from 'react';
import {C, F, D} from '../../kit/theme';
import {ep, eio, rnd} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Johnny Harris desk-and-map. A flat desk, a paper sheet with the clips pinned down to scale, pushpins, string, hand-drawn loops and typed index cards,
 * a slow push-in with camera-like easing. Every mark is drawn from the measured data of episodes/ff87/fixture/experiment.mjs
 * (clips A 320x240, B 160x90, C 320x90, D 160x240 with a 40 px marker; 2 s and 3 s clips at 25 fps; ffmpeg 6.1.1).
 */

/* DATA BEGIN: generated from episodes/ff87/fixture/experiment.mjs, ffmpeg 6.1.1 (marker boxes are [x, y, w, h] in the output frame) */
const ERRS: Record<string, {line: string; status: number}> = {"v_w":{"line":"Input 1 width 160 does not match input 0 width 320.","status":234},"h_h":{"line":"Input 1 height 90 does not match input 0 height 240.","status":234},"v_h":{"line":"Input 1 width 320 does not match input 0 width 160.","status":234},"v_s2r_main":{"line":"Input 1 width 160 does not match input 0 width 320.","status":234}};
const GEO: Record<string, {dim: number[]; a: number[]; b: number[]; black: number}> = {"v_ok":{"dim":[320,330],"a":[140,100,40,40],"b":[140,265,40,40],"black":0},"h_ok":{"dim":[480,240],"a":[140,100,40,40],"b":[380,100,40,40],"black":0},"v_scale":{"dim":[320,420],"a":[140,100,40,40],"b":[120,290,80,80],"black":0},"v_scale2ref":{"dim":[320,420],"a":[140,100,40,40],"b":[120,290,80,80],"black":0},"v_stretch":{"dim":[320,480],"a":[140,100,40,40],"b":[120,307,80,106],"black":0},"v_pad":{"dim":[320,330],"a":[140,100,40,40],"b":[140,265,40,40],"black":14400},"v_box":{"dim":[320,480],"a":[140,100,40,40],"b":[120,320,80,80],"black":19200},"h_scale":{"dim":[746,240],"a":[140,100,40,40],"b":[480,67,106,106],"black":0}};
const LEN: Record<string, {frames: number; dur: number; dim: number[]}> = {"v_default":{"frames":75,"dur":3,"dim":[160,240]},"v_shortest":{"frames":50,"dur":2,"dim":[160,240]},"v_swapped":{"frames":50,"dur":2,"dim":[160,240]},"v_cli":{"frames":75,"dur":3,"dim":[160,240]},"h_default":{"frames":75,"dur":3,"dim":[320,120]},"h_shortest":{"frames":50,"dur":2,"dim":[320,120]}};
/* DATA END */

type Box = number[]; // [x, y, w, h]
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

/* ---------- pushpin, string, loop, card ---------- */
const Pin: React.FC<{x: number; y: number; color?: string; o?: number}> = ({x, y, color = C.red, o = 1}) => {
  const drop = 1 + (1 - o) * 1.6;
  return (
    <g opacity={o}>
      <ellipse cx={x + 4} cy={y + 6} rx={11} ry={5} fill={C.dim} opacity={0.35} />
      <g transform={`translate(${x} ${y - (1 - o) * 30}) scale(${drop})`}>
        <circle r={12} fill={color} stroke={C.text} strokeWidth={2} />
        <circle cx={-4} cy={-4} r={3.5} fill={C.bg2} />
      </g>
    </g>
  );
};
const Str: React.FC<{x1: number; y1: number; x2: number; y2: number; p?: number; color?: string; sag?: number; w?: number}> = ({x1, y1, x2, y2, p = 1, color = C.red, sag = 40, w = 3.5}) => {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + sag;
  return <path d={`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`} stroke={color} strokeWidth={w} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} strokeLinecap="round" />;
};
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
const Svg: React.FC<{children?: React.ReactNode}> = ({children}) => <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>{children}</svg>;
const Tag: React.FC<{x: number; y: number; text: string; color?: string; size?: number; o?: number; anchor?: 'middle' | 'start' | 'end'}> = ({x, y, text, color = C.dim, size = 24, o = 1, anchor = 'middle'}) => <text x={x} y={y} textAnchor={anchor} fontFamily={F.mono} fontSize={size} fontWeight={700} fill={color} opacity={o}>{text}</text>;
const Big: React.FC<{x: number; y: number; value: string; caption: string; color?: string; o?: number; size?: number; w?: number}> = ({x, y, value, caption, color = C.red, o = 1, size = 170, w = 360}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, textAlign: 'center'}}>
    <div style={{fontFamily: F.display, fontWeight: 900, fontSize: size * D.k * 0.8, lineHeight: 0.95, color, letterSpacing: 1, whiteSpace: 'nowrap'}}>{value}</div>
    <div style={{fontFamily: F.mono, fontSize: 24, color: C.dim, marginTop: 6, lineHeight: 1.3, whiteSpace: 'pre'}}>{caption}</div>
  </div>
);
const Defs: React.FC = () => (
  <defs>
    <pattern id="hatch87" width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width={9} height={9} fill={C.bg2} /><line x1={0} y1={0} x2={0} y2={9} stroke={C.red} strokeWidth={3} />
    </pattern>
  </defs>
);

/* ---------- a picture to scale: a flat field with one marker ---------- */
const Pic: React.FC<{x: number; y: number; w: number; h: number; s?: number; marker?: Box; fill?: string; o?: number; ink?: boolean; dash?: boolean; stroke?: string}> = ({x, y, w, h, s = 1, marker, fill = C.panel, o = 1, ink = false, dash = false, stroke = C.text}) => (
  <g opacity={o}>
    <rect x={x} y={y} width={w * s} height={h * s} fill={ink ? C.text : fill} stroke={stroke} strokeWidth={3} strokeDasharray={dash ? '10 7' : undefined} />
    {marker && <rect x={x + marker[0] * s} y={y + marker[1] * s} width={marker[2] * s} height={marker[3] * s} fill={C.text} stroke={C.bg} strokeWidth={1} />}
  </g>
);
/* the output of a stack case, drawn from the measured sizes and marker boxes; A is the top (or left) part */
const StackPic: React.FC<{k: string; x: number; y: number; s: number; o?: number; reveal?: number}> = ({k, x, y, s, o = 1, reveal = 1}) => {
  const g = GEO[k]; const [W, H] = g.dim;
  const horizontal = k.startsWith('h_');
  const off = horizontal ? 320 : 240;                       // A is 320 x 240 and comes first
  const bw = horizontal ? W - off : W, bh = horizontal ? H : H - off;
  const bx = horizontal ? x + off * s : x, by = horizontal ? y : y + off * s;
  const bars: {x: number; y: number; w: number; h: number}[] = [];
  if (g.black > 0) {
    if (k === 'v_pad') { const bwid = g.black / (2 * bh); bars.push({x: bx, y: by, w: bwid * s, h: bh * s}, {x: bx + (bw - bwid) * s, y: by, w: bwid * s, h: bh * s}); }
    if (k === 'v_box') { const bhei = g.black / (2 * bw); bars.push({x: bx, y: by, w: bw * s, h: bhei * s}, {x: bx, y: by + (bh - bhei) * s, w: bw * s, h: bhei * s}); }
  }
  return (
    <g opacity={o * reveal}>
      <rect x={x} y={y} width={320 * s} height={240 * s} fill={C.bg2} stroke={C.text} strokeWidth={3} />
      <rect x={bx} y={by} width={bw * s} height={bh * s} fill={C.panel} stroke={C.text} strokeWidth={3} />
      {bars.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={C.text} />)}
      <rect x={x + g.a[0] * s} y={y + g.a[1] * s} width={g.a[2] * s} height={g.a[3] * s} fill={C.text} stroke={C.bg} strokeWidth={1} />
      <rect x={x + g.b[0] * s} y={y + g.b[1] * s} width={g.b[2] * s} height={g.b[3] * s} fill={C.red} stroke={C.bg} strokeWidth={1} />
    </g>
  );
};

/* 1. The question: two clips pinned to the sheet, to scale, and the command typed on a card */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const cmd = 'ffmpeg -i a.mp4 -i b.mp4\n  -filter_complex vstack out.mp4';
  return (
    <Desk>
      <Cam t={t} dur={dur} from={[960, 480, 1.0]} to={[960, 490, 1.05]}>
        <Sheet />
        <MapTitle over="Two clips, one stack" title="Why won't it stack?" o={ep(t, A(0.02), A(0.08))} />
        <Svg>
          <Defs />
          <Pic x={190} y={340} w={320} h={240} marker={[140, 100, 40, 40]} o={ep(t, A(0.08), A(0.16))} />
          <Pic x={190} y={600} w={160} h={90} marker={[60, 25, 40, 40]} o={ep(t, A(0.16), A(0.24))} />
          <Pin x={190} y={340} o={ep(t, A(0.1), A(0.16))} /><Pin x={190} y={600} o={ep(t, A(0.18), A(0.24))} />
          <Tag x={530} y={470} text="A  320 x 240" color={C.dim} size={26} anchor="start" o={ep(t, A(0.12), A(0.2))} />
          <Tag x={370} y={655} text="B  160 x 90" color={C.dim} size={26} anchor="start" o={ep(t, A(0.2), A(0.28))} />
          <Str x1={770} y1={470} x2={1010} y2={420} p={ep(t, A(0.34), A(0.42))} color={C.cyan} sag={-30} w={3} />
          <Str x1={600} y1={650} x2={1010} y2={450} p={ep(t, A(0.4), A(0.48))} color={C.amber} sag={30} w={3} />
        </Svg>
        <Card x={1010} y={340} w={760} rot={-0.5} o={ep(t, A(0.3), A(0.38))} head="Command" color={C.amber} size={26} h={150}
          lines={(`$ ${typed(cmd, t, A(0.38), 30)}${t > A(0.38) && t < A(0.38) + 2.2 ? '|' : ''}`).split('\n')} />
        <Card x={1010} y={560} w={760} rot={0.5} o={ep(t, A(0.58), A(0.66))} head="Three questions" color={C.red} size={28}
          lines={['what does ffmpeg say?', 'what fixes it?', 'what does shortest=1 change?']} />
      </Cam>
    </Desk>
  );
};

/* 2. The rig: four sources to scale, the readers and the control */
const Rig: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const srcs: {n: string; w: number; h: number; m: Box; x: number}[] = [
    {n: 'A', w: 320, h: 240, m: [140, 100, 40, 40], x: 170}, {n: 'B', w: 160, h: 90, m: [60, 25, 40, 40], x: 540},
    {n: 'C', w: 320, h: 90, m: [140, 25, 40, 40], x: 760}, {n: 'D', w: 160, h: 240, m: [60, 100, 40, 40], x: 1130},
  ];
  const y0 = 330;
  return (
    <Desk>
      <Cam t={t} dur={dur} from={[950, 480, 1.0]} to={[980, 480, 1.05]}>
        <Sheet />
        <MapTitle over="Four synthetic clips" title="Same marker, different frames." color={C.green} o={ep(t, A(0.02), A(0.08))} />
        <Svg>
          {srcs.map((s, i) => (
            <g key={s.n}>
              <Pic x={s.x} y={y0} w={s.w} h={s.h} marker={s.m} o={ep(t, A(0.08 + i * 0.07), A(0.14 + i * 0.07))} />
              <Pin x={s.x} y={y0} o={ep(t, A(0.1 + i * 0.07), A(0.16 + i * 0.07))} />
              <Tag x={s.x + (s.w * 0.5)} y={y0 + s.h + 36} text={`${s.n}  ${s.w} x ${s.h}`} color={C.dim} size={24} o={ep(t, A(0.12 + i * 0.07), A(0.2 + i * 0.07))} />
            </g>
          ))}
          <Str x1={1310} y1={y0 + 120} x2={1430} y2={y0 + 60} p={ep(t, A(0.46), A(0.54))} color={C.green} sag={-20} w={3} />
          <Tag x={1450} y={y0 + 56} text="markers: 40 x 40" color={C.text} size={24} anchor="start" o={ep(t, A(0.5), A(0.58))} />
        </Svg>
        <Card x={170} y={640} w={520} rot={-0.8} o={ep(t, A(0.5), A(0.58))} head="Reader 1" color={C.cyan} size={25} lines={['ffprobe: size, frame count', 'framemd5 of every frame', 'cropdetect on the B part']} />
        <Card x={720} y={640} w={500} rot={0.6} o={ep(t, A(0.62), A(0.7))} head="Reader 2" color={C.amber} size={25} lines={['Node, decoded pixels:', 'bytes = frames x w x h x 1.5', 'boxes of the white marker']} />
        <Card x={1250} y={640} w={500} rot={-0.5} o={ep(t, A(0.74), A(0.82))} head="Control" color={C.green} size={25} lines={['A over C: same width', 'A beside D: same height', 'both stack fine']} />
      </Cam>
    </Desk>
  );
};

/* 3. The error: two stacks to scale, with the missing part hatched, and the exact lines */
const Err: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const vx = 200, vy = 300, hx = 880, hy = 300;
  return (
    <Desk>
      <Cam t={t} dur={dur} from={[940, 480, 1.0]} to={[990, 480, 1.05]}>
        <Sheet />
        <MapTitle over="vstack and hstack" title="One side must match." color={C.red} o={ep(t, A(0.02), A(0.08))} />
        <Svg>
          <Defs />
          <Pic x={vx} y={vy} w={320} h={240} marker={[140, 100, 40, 40]} o={ep(t, A(0.08), A(0.14))} />
          <Pic x={vx} y={vy + 240} w={160} h={90} marker={[60, 25, 40, 40]} o={ep(t, A(0.12), A(0.18))} />
          <rect x={vx + 160} y={vy + 240} width={160} height={90} fill="url(#hatch87)" stroke={C.red} strokeWidth={3} opacity={ep(t, A(0.22), A(0.3))} />
          <Tag x={vx + 240} y={vy + 372} text="missing: 160 wide" color={C.red} size={24} o={ep(t, A(0.26), A(0.34))} />
          <Pic x={hx} y={hy} w={320} h={240} marker={[140, 100, 40, 40]} o={ep(t, A(0.14), A(0.2))} />
          <Pic x={hx + 320} y={hy} w={160} h={90} marker={[60, 25, 40, 40]} o={ep(t, A(0.18), A(0.24))} />
          <rect x={hx + 320} y={hy + 90} width={160} height={150} fill="url(#hatch87)" stroke={C.red} strokeWidth={3} opacity={ep(t, A(0.3), A(0.38))} />
          <Tag x={hx + 400} y={hy + 302} text="missing: 150 tall" color={C.red} size={24} o={ep(t, A(0.34), A(0.42))} />
          <Loop cx={vx + 240} cy={vy + 285} rx={108} ry={56} p={ep(t, A(0.36), A(0.46))} color={C.red} seed={4} />
          <Loop cx={hx + 400} cy={hy + 165} rx={100} ry={98} p={ep(t, A(0.44), A(0.54))} color={C.red} seed={8} />
          <Tag x={1400} y={vy + 40} text="A over C works:" color={C.green} size={24} anchor="start" o={ep(t, A(0.74), A(0.8))} />
          <Tag x={1400} y={vy + 76} text={`${GEO.v_ok.dim[0]} x ${GEO.v_ok.dim[1]}, heights differ`} color={C.green} size={24} anchor="start" o={ep(t, A(0.74), A(0.8))} />
        </Svg>
        <Card x={170} y={700} w={800} rot={-0.4} o={ep(t, A(0.5), A(0.58))} head="vstack" color={C.red} size={24} h={130}
          lines={[ERRS.v_w.line.split(' does not match ')[0] + ' does not match', ERRS.v_w.line.split(' does not match ')[1]]} />
        <Card x={1000} y={700} w={760} rot={0.5} o={ep(t, A(0.6), A(0.68))} head="hstack" color={C.red} size={24} h={130}
          lines={[ERRS.h_h.line.split(' does not match ')[0] + ' does not match', ERRS.h_h.line.split(' does not match ')[1]]} />
        <Big x={1400} y={420} value={`${ERRS.v_w.status}`} caption={'exit status, Linux\nno file written'} color={C.red} o={ep(t, A(0.66), A(0.74))} size={120} w={330} />
      </Cam>
    </Desk>
  );
};

/* 4. Scale: two stacks to scale, the marker tells the shape */
const Scale: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const s = 0.9;
  return (
    <Desk>
      <Cam t={t} dur={dur} from={[960, 480, 1.0]} to={[960, 490, 1.05]}>
        <Sheet />
        <MapTitle over="Fix: scale B" title="Fits, or fits and lies." color={C.cyan} o={ep(t, A(0.02), A(0.08))} />
        <Svg>
          <StackPic k="v_scale" x={170} y={300} s={s} reveal={ep(t, A(0.08), A(0.16))} />
          <Tag x={170} y={300 + 420 * s + 40} text="scale to width 320" color={C.dim} size={22} anchor="start" o={ep(t, A(0.14), A(0.2))} />
          <Loop cx={170 + 160 * s} cy={300 + 330 * s} rx={86} ry={86} p={ep(t, A(0.2), A(0.3))} color={C.green} seed={5} />
          <StackPic k="v_stretch" x={640} y={300} s={s} reveal={ep(t, A(0.5), A(0.58))} />
          <Tag x={640} y={300 + 480 * s + 40} text="scale to 320 x 240" color={C.dim} size={22} anchor="start" o={ep(t, A(0.56), A(0.62))} />
          <Loop cx={640 + 160 * s} cy={300 + 360 * s} rx={80} ry={98} p={ep(t, A(0.62), A(0.72))} color={C.red} seed={9} />
        </Svg>
        <Card x={1130} y={310} w={620} rot={0.5} o={ep(t, A(0.3), A(0.38))} head="Marker, scale" color={C.green} size={26}
          lines={[`${GEO.v_scale.b[2]} x ${GEO.v_scale.b[3]}: still a square`, `stack ${GEO.v_scale.dim[0]} x ${GEO.v_scale.dim[1]}`]} />
        <Card x={1130} y={470} w={620} rot={-0.6} o={ep(t, A(0.38), A(0.46))} head="scale2ref" color={C.cyan} size={26}
          lines={['same frames as scale,', 'md5 for md5. but w=main_w', 'is B itself: same error']} />
        <Card x={1130} y={670} w={620} rot={0.4} o={ep(t, A(0.74), A(0.82))} head="Marker, stretched" color={C.red} size={26}
          lines={[`${GEO.v_stretch.b[2]} x ${GEO.v_stretch.b[3]}: not a square`, 'it fits, and it lies']} />
      </Cam>
    </Desk>
  );
};

/* 5. Pad: B stays as it is, or is fitted, and the rest is black */
const Pad: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const s = 1.0;
  return (
    <Desk>
      <Cam t={t} dur={dur} from={[960, 480, 1.0]} to={[950, 490, 1.05]}>
        <Sheet />
        <MapTitle over="Fix: pad B" title="Leave it, or fit it." color={C.amber} o={ep(t, A(0.02), A(0.08))} />
        <Svg>
          <StackPic k="v_pad" x={170} y={300} s={s} reveal={ep(t, A(0.08), A(0.18))} />
          <Tag x={170} y={300 + 330 * s + 40} text="pad B to 320 x 90, no scaling" color={C.dim} size={22} anchor="start" o={ep(t, A(0.16), A(0.22))} />
          <StackPic k="v_box" x={620} y={300} s={s} reveal={ep(t, A(0.42), A(0.52))} />
          <Tag x={620} y={300 + 480 * s + 40} text="fit into 320 x 240, then pad" color={C.dim} size={22} anchor="start" o={ep(t, A(0.5), A(0.56))} />
        </Svg>
        <Card x={1130} y={310} w={620} rot={0.5} o={ep(t, A(0.26), A(0.34))} head="Pad only" color={C.amber} size={26}
          lines={[`marker ${GEO.v_pad.b[2]} x ${GEO.v_pad.b[3]}, same size`, `${GEO.v_pad.black} black pixels`, 'lines up with the A marker']} />
        <Card x={1130} y={520} w={620} rot={-0.5} o={ep(t, A(0.6), A(0.68))} head="Fit and pad" color={C.green} size={26}
          lines={[`marker ${GEO.v_box.b[2]} x ${GEO.v_box.b[3]}, square`, `${GEO.v_box.black} black pixels`]} />
        <Card x={1130} y={700} w={620} rot={0.3} o={ep(t, A(0.78), A(0.86))} head="hstack, same idea" color={C.cyan} size={24}
          lines={[`scale to height 240: ${GEO.h_scale.dim[0]} x ${GEO.h_scale.dim[1]}`]} h={110} />
      </Cam>
    </Desk>
  );
};

/* 6. Length: frames as cells, 2 s and 3 s inputs, to scale */
const Short: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const X0 = 190, PX = 15, H = 52;
  const row = (y: number, n: number, held: number, color: string, o: number, label: string, lab2?: string) => (
    <g opacity={o}>
      {Array.from({length: n}, (_, i) => <rect key={i} x={X0 + i * PX + 1} y={y} width={PX - 2} height={H} fill={i >= n - held ? 'url(#hatch87)' : color} stroke={i >= n - held ? C.red : C.line} strokeWidth={1.5} />)}
      <Tag x={X0} y={y - 12} text={label} color={C.dim} size={22} anchor="start" />
      {lab2 && <Tag x={X0 + n * PX + 36} y={y + 36} text={lab2} color={C.text} size={26} anchor="start" />}
    </g>
  );
  const dflt = LEN.v_default.frames, sh = LEN.v_shortest.frames, cli = LEN.v_cli.frames;
  return (
    <Desk>
      <Cam t={t} dur={dur} from={[950, 480, 1.0]} to={[980, 485, 1.05]}>
        <Sheet />
        <MapTitle over="One cell per frame, to scale" title="The shorter one is held." color={C.amber} o={ep(t, A(0.02), A(0.08))} />
        <Svg>
          <Defs />
          {row(340, sh, 0, C.cyanDim, ep(t, A(0.08), A(0.16)), 'A: 2 s', `${sh} frames`)}
          {row(430, dflt, 0, C.greenDim, ep(t, A(0.14), A(0.22)), 'B: 3 s', `${dflt} frames`)}
          {row(540, dflt, dflt - sh, C.cyanDim, ep(t, A(0.3), A(0.4)), 'default: output is as long as the longest', `${dflt} frames`)}
          <Loop cx={X0 + (sh + (dflt - sh) / 2) * PX} cy={566} rx={(dflt - sh) * PX * 0.5 + 8} ry={46} p={ep(t, A(0.42), A(0.52))} color={C.red} seed={6} />
          {row(650, sh, 0, C.cyanDim, ep(t, A(0.56), A(0.66)), 'shortest=1: output ends with the shortest', `${sh} frames`)}
          <Tag x={X0} y={770} text={`-shortest (command line): ${cli} frames, no change`} color={C.mute} size={24} anchor="start" o={ep(t, A(0.74), A(0.82))} />
        </Svg>
        <Card x={1240} y={672} w={540} rot={0.4} o={ep(t, A(0.46), A(0.54))} head="Held frame" color={C.red} size={26}
          lines={[`A repeats its last frame`, `for ${dflt - sh} frames`]} />
      </Cam>
    </Desk>
  );
};

/* 7. What to do */
const Close: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * Math.max(8, dur - 10.5); // the end card owns the last seconds
  return (
    <Desk>
      <Cam t={t} dur={Math.max(8, dur - 10.5)} from={[960, 470, 1.0]} to={[960, 480, 1.04]}>
        <Sheet />
        <MapTitle over="What to do" title="Match, then choose." color={C.cyan} o={ep(t, A(0.02), A(0.1))} />
        <Svg>
          <Str x1={960} y1={430} x2={430} y2={500} p={ep(t, A(0.3), A(0.4))} color={C.cyan} sag={20} />
          <Str x1={960} y1={430} x2={960} y2={500} p={ep(t, A(0.42), A(0.52))} color={C.green} sag={0} />
          <Str x1={960} y1={430} x2={1490} y2={500} p={ep(t, A(0.54), A(0.64))} color={C.amber} sag={20} />
          <Pin x={960} y={430} color={C.red} o={ep(t, A(0.2), A(0.28))} />
        </Svg>
        <Card x={170} y={500} w={520} rot={-0.8} o={ep(t, A(0.34), A(0.42))} head="Match" color={C.cyan} lines={['vstack: the widths', 'hstack: the heights', 'the other side may differ']} />
        <Card x={700} y={500} w={520} rot={0.6} o={ep(t, A(0.46), A(0.54))} head="Then choose" color={C.green} lines={['scale: keep the shape', 'stretch: it lies', 'pad: black around']} />
        <Card x={1230} y={500} w={520} rot={-0.5} o={ep(t, A(0.58), A(0.66))} head="Not tested" color={C.amber} size={24} lines={['other builds, real footage,', 'audio, other pixel formats', 'than ffmpeg 6.1.1']} />
        <div style={{position: 'absolute', left: 150, top: 760, width: 1620, textAlign: 'center', fontFamily: F.mono, fontSize: 26, color: C.mute, opacity: ep(t, A(0.74), A(0.82))}}>FFmpeg Reality Checks · episode 87 · fixture and tests in the description</div>
      </Cam>
    </Desk>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, rig: Rig, error: Err, scale: Scale, pad: Pad, short: Short, close: Close};
