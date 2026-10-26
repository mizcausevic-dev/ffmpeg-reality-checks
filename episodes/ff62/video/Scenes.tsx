import React from 'react';
import {C, F, D} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Physical 3D cutaway. Real CSS 3D (perspective, rotateX and rotateY, layered planes, extruded boxes, no WebGL): a pixel grid under a floating lens,
 * an exploded stack of the test setup, and bars standing on a floor. Every number comes from episodes/ff62/fixture/experiment.mjs (960x540 card, ffmpeg 6.1.1):
 * 3 speeds x 5 ways of feeding zoompan = 15 runs of 120 frames, read by the centroid of a marker and by the edges of a second marker.
 */

/* evidence */
const CENTRE_D420 = [[1,0.5],[1.51,1],[0.5,1.52],[1.01,2.01],[2.01,0.53],[0.5,0.52],[1.01,1],[2.01,1.56],[0.51,2.01],[1.54,2.01],[2.02,0.54],[0.53,1],[1.55,1.58],[2.02,2],[1.01,2],[1.56,0.56],[2.02,0.98],[1.01,1.6],[1.57,1.6],[2.02,1.99],[1.01,0.57],[1.58,0.97],[0.53,1.63],[1,1.62],[1.59,1.98],[0.54,0.58],[1,0.96],[1.59,0.96],[0.54,1.64],[1,2],[1.6,2],[2.02,0.58],[1,0.95],[1.61,1.65],[2.02,1.64],[1,2.04],[1.62,0.59],[2.03,1],[1,0.99],[1.63,1.65],[2.06,2.09],[0.54,0.58],[1.63,0.58],[2.08,1.03],[0.55,1.66],[1.02,1.64],[2.1,2.12],[0.55,0.57],[1.04,0.56],[1.63,1.05],[0.54,1.65],[1.06,2.16],[1.63,2.15],[2.15,0.56],[1.08,1.08],[1.63,1.08],[2.17,1.64],[0.55,2.18],[1.63,2.18],[2.19,0.54],[0.55,1.11],[1.11,1.1],[1.63,1.62],[0.54,2.2],[1.14,2.2],[1.63,0.52],[2.23,1.13],[0.54,1.12],[1.62,1.61],[2.26,2.22],[0.54,2.22],[1.17,0.5],[1.62,1.14],[2.27,1.14],[1.18,1.65],[1.61,2.23],[2.29,2.23],[0.53,0.48],[1.2,1.15],[1.61,1.14],[0.53,1.68],[1.21,2.23],[1.61,2.23],[2.31,0.5],[0.52,1.16],[1.22,1.15],[1.61,1.72],[2.33,1.71],[1.23,2.23],[1.61,0.54],[2.34,0.53],[0.51,1.15],[1.22,1.74],[1.63,1.74],[2.35,2.22],[0.5,2.22],[1.23,0.55],[2.36,1.14],[0.5,1.14],[1.23,1.77],[1.67,2.22],[2.37,2.22],[0.5,0.57],[1.23,0.56],[1.69,1.13],[2.37,1.78],[0.5,1.78],[1.22,2.27],[1.71,2.27],[2.37,0.59],[1.22,1.13],[1.72,1.12],[2.38,1.79],[0.54,1.79],[1.22,2.32],[1.74,0.6],[2.39,0.59],[0.56,1.15],[1.21,1.15],[1.75,1.8]]; // centre marker, reader 1: measured minus ideal position (x, y) in px, 120 frames, recipe speed, as is
const CENTRE_U8 = [[0.19,0.14],[0.14,0.04],[0.13,0.19],[0.09,0.09],[0.09,0.04],[0.04,0.13],[0.18,0.03],[0.18,0.17],[0.13,0.07],[0.08,0.17],[0.04,0.11],[0.17,0.02],[0.12,0.11],[0.07,0.02],[0.03,0.18],[0.03,0.05],[0.12,0.19],[0.07,0.05],[0.03,0.19],[0.18,0.05],[0.11,0.2],[0.07,0.12],[0.03,0],[0.12,0.13],[0.06,-0.01],[0.03,0.13],[0.12,-0.01],[0.06,0.14],[0.02,-0.01],[0.13,0.15],[0.06,0.23],[0.22,0.08],[0.14,0.24],[0.02,0.09],[0.22,0.24],[0.08,0.09],[0.22,0.25],[0.16,0.02],[0.02,0.18],[0.16,0.03],[0.03,0.18],[0.24,0.04],[0.1,0.11],[0.24,0.26],[0.11,0.12],[0.25,0.19],[0.12,0.05],[0.25,0.19],[0.12,0.26],[0.26,0.13],[0.13,0.2],[0.27,0.06],[0.13,0.2],[0.27,0.27],[0.14,0.14],[0.28,0.21],[0.08,0.08],[0.21,0.14],[0.09,0.27],[0.22,0.09],[0.29,0.21],[0.17,0.28],[0.29,0.09],[0.1,0.21],[0.24,0.27],[0.3,0.15],[0.18,0.21],[0.25,0.27],[0.12,0.16],[0.19,0.22],[0.31,0.27],[0.13,0.16],[0.2,0.21],[0.32,0.27],[0.13,0.1],[0.21,0.21],[0.32,0.26],[0.13,0.11],[0.21,0.16],[0.28,0.21],[0.13,0.11],[0.22,0.16],[0.28,0.2],[0.33,0.25],[0.13,0.1],[0.22,0.16],[0.29,0.2],[0.34,0.24],[0.13,0.1],[0.22,0.15],[0.29,0.19],[0.34,0.23],[0.12,0.1],[0.21,0.14],[0.21,0.19],[0.3,0.23],[0.34,0.1],[0.11,0.14],[0.2,0.18],[0.2,0.22],[0.29,0.09],[0.35,0.13],[0.35,0.18],[0.11,0.17],[0.19,0.23],[0.19,0.09],[0.27,0.12],[0.27,0.17],[0.35,0.24],[0.34,0.25],[0.1,0.08],[0.1,0.12],[0.17,0.18],[0.17,0.18],[0.17,0.26],[0.25,0.07],[0.24,0.07],[0.24,0.12],[0.32,0.21],[0.31,0.21]]; // the same with the card scaled 8x first
const LENS_IDEAL = [0.72,1.44,2.15,2.86,3.57,4.28,4.99,5.69,6.39,7.09,7.79,8.49]; // ideal crop origin, frames 0 to 11 at the recipe speed
const LENS_REAL = [0,0,2,2,2,4,4,4,6,6,6,8]; // the origin the filter really uses (rounded down to even)
const LENS_W_IDEAL = [958.56,957.13,955.7,954.27,952.85,951.44,950.02,948.62,947.21,945.81,944.42,943.03];
const LENS_W = [958,957,955,954,952,951,950,948,947,945,944,943];
const SPEEDS = [0.0005, 0.0015, 0.004];
const SPEED_RMS = [0.75, 1.23, 1.61]; // step error rms in px, as is (yuv420p), by zoom step
const WAYS = ['as is', 'yuv444p first', 'scale 2x', 'scale 4x', 'scale 8x'];
const WAY_RMS = [1.23, 0.69, 0.72, 0.32, 0.18]; // step error rms in px at the recipe speed 0.0015
const WAY_STUTTER = [346, 309, 307, 24, 0]; // steps of 357 that are off by more than half a pixel
const WAY_MP = [0.52, 0.52, 2.07, 8.29, 33.18]; // megapixels of the card that zoompan starts from

type K = 'cyan' | 'amber' | 'red' | 'green' | 'text' | 'bg2' | 'panel' | 'mute' | 'dim' | 'line';
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/* ---------- flat blocks and text (same lab vocabulary as the other films) ---------- */
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

/* ---------- CSS 3D kit ----------
 * Cam: perspective on the page, a zero size group at (x, y) that carries the camera rotation. Everything below it is placed in group coordinates:
 * x to the right, y DOWN (so up is negative), z toward the viewer. Floors lie in the x z plane, Boxes are extruded, Walls stand across the depth, Bill faces the viewer. */
const Cam: React.FC<{cx: number; cy: number; x?: number; y?: number; persp?: number; o?: number; children?: React.ReactNode}> = ({cx, cy, x = 960, y = 540, persp = 2300, o = 1, children}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, perspective: persp, perspectiveOrigin: `${x}px ${y - 100}px`, opacity: o}}>
    <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0, transformStyle: 'preserve-3d', transform: `rotateX(${cx}deg) rotateY(${cy}deg)`}}>{children}</div>
  </div>
);
const Floor: React.FC<{x: number; y: number; z: number; w: number; d: number; bg?: string; border?: string; bw?: number; dash?: boolean; o?: number; children?: React.ReactNode; grid?: number; gridColor?: string}> = ({x, y, z, w, d, bg = 'transparent', border, bw = 0, dash, o = 1, children, grid, gridColor}) => (
  <div style={{position: 'absolute', left: x - w / 2, top: y - d / 2, width: w, height: d, transform: `translateZ(${z}px) rotateX(90deg)`, background: bg, opacity: o, boxSizing: 'border-box', border: border ? `${bw}px ${dash ? 'dashed' : 'solid'} ${border}` : undefined,
    backgroundImage: grid ? `linear-gradient(to right, ${gridColor ?? C.line} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor ?? C.line} 1px, transparent 1px)` : undefined, backgroundSize: grid ? `${grid}px ${grid}px` : undefined}}>{children}</div>
);
const Wall: React.FC<{x: number; y: number; z: number; d: number; h: number; bg: string; o?: number}> = ({x, y, z, d, h, bg, o = 1}) => (
  <div style={{position: 'absolute', left: x - d / 2, top: y - h / 2, width: d, height: h, background: bg, opacity: o, transform: `translateZ(${z}px) rotateY(90deg)`}} />
);
/** an extruded box centred at (x, y, z); w along x, h along y (vertical), d along z */
const Box: React.FC<{x: number; y: number; z: number; w: number; h: number; d: number; bg: string; o?: number; topGrid?: number; children?: React.ReactNode}> = ({x, y, z, w, h, d, bg, o = 1, topGrid, children}) => {
  const face = (extra: React.CSSProperties, tone: number) => ({position: 'absolute' as const, background: bg, filter: `brightness(${tone})`, opacity: o, boxSizing: 'border-box' as const, ...extra});
  return (
    <div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, transformStyle: 'preserve-3d', transform: `translateZ(${z}px)`}}>
      <div style={face({left: 0, top: 0, width: w, height: h, transform: `translateZ(${d / 2}px)`}, 1)}>{children}</div>
      <div style={face({left: 0, top: 0, width: w, height: h, transform: `translateZ(${-d / 2}px) rotateY(180deg)`}, 0.7)} />
      <div style={face({left: w / 2 - d / 2, top: 0, width: d, height: h, transform: `rotateY(90deg) translateZ(${w / 2}px)`}, 0.8)} />
      <div style={face({left: w / 2 - d / 2, top: 0, width: d, height: h, transform: `rotateY(-90deg) translateZ(${w / 2}px)`}, 0.8)} />
      <div style={{...face({left: 0, top: h / 2 - d / 2, width: w, height: d, transform: `rotateX(90deg) translateZ(${h / 2}px)`}, 1.12),
        backgroundImage: topGrid ? `linear-gradient(to right, ${C.text}55 1px, transparent 1px), linear-gradient(to bottom, ${C.text}55 1px, transparent 1px)` : undefined, backgroundSize: topGrid ? `${topGrid}px ${topGrid}px` : undefined}} />
    </div>
  );
};
/** a flat label that always faces the viewer: it undoes the camera rotation */
const Bill: React.FC<{x: number; y: number; z: number; cx: number; cy: number; w?: number; align?: 'left' | 'center' | 'right'; o?: number; children?: React.ReactNode}> = ({x, y, z, cx, cy, w = 400, align = 'center', o = 1, children}) => (
  <div style={{position: 'absolute', left: x - (align === 'center' ? w / 2 : align === 'right' ? w : 0), top: y, width: w, textAlign: align, opacity: o, transform: `translateZ(${z}px) rotateY(${-cy}deg) rotateX(${-cx}deg)`, transformOrigin: align === 'center' ? '50% 100%' : align === 'right' ? '100% 100%' : '0% 100%'}}>{children}</div>
);
const BigNum: React.FC<{text: string; color?: string; size?: number}> = ({text, color = C.text, size = 100}) => (
  <div style={{fontFamily: F.display, fontWeight: 900, fontSize: size * D.k * 0.8, lineHeight: 0.92, color, letterSpacing: 1, whiteSpace: 'nowrap'}}>{text}</div>
);
const Cap: React.FC<{text: string; color?: string; size?: number}> = ({text, color = C.text, size = 26}) => (
  <div style={{fontFamily: F.mono, fontSize: size, letterSpacing: 1, color, whiteSpace: 'nowrap', textTransform: 'none'}}>{text}</div>
);

/* 1. The question: a pixel grid under a floating box. The ideal outline never moves; the measured box does, frame by frame, from the real tracks. */
const CELL = 46;
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const cx = -54, cy = -12 + t * 0.5;
  const fps = 8;
  const n = Math.min(119, Math.floor(Math.max(0, t - A(0.1)) * fps) + 3);
  const e = CENTRE_D420[n];
  const u = CENTRE_U8[n];
  const show = ep(t, 0, 0.5);
  const showEnd = ep(t, A(0.66), A(0.74));
  const sw = (a: number[]) => `x ${a[0] >= 0 ? '+' : ''}${a[0].toFixed(1)}  y ${a[1] >= 0 ? '+' : ''}${a[1].toFixed(1)} px`;
  return (
    <Page>
      <Cam cx={cx} cy={cy} x={690} y={590} o={show}>
        <Floor x={0} y={0} z={0} w={21 * CELL} d={15 * CELL} bg={C.bg2} grid={CELL} gridColor={C.line} />
        <Floor x={0} y={-1} z={0} w={9 * CELL} d={9 * CELL} border={C.cyan} bw={8} dash />
        <Box x={e[0] * CELL} y={-22} z={e[1] * CELL} w={9 * CELL} h={44} d={9 * CELL} bg={C.red} topGrid={CELL} o={1 - showEnd} />
        <Box x={u[0] * CELL} y={-22} z={u[1] * CELL} w={9 * CELL} h={44} d={9 * CELL} bg={C.green} topGrid={CELL} o={showEnd} />
        
      </Cam>
      <Tag text="1 cell = 1 pixel of the output" color={C.dim} x={90} y={140} size={26} o={ep(t, A(0.05), A(0.12))} />
      <Blk x={1260} y={150} w={600} h={250} k="cyan" o={ep(t, A(0.04), A(0.1))}>
        <Tag text="a perfect zoom: the centre marker" y={18} x={26} size={22} />
        <Giant text="0 px" size={150} x={0} y={78} w={600} />
      </Blk>
      <Blk x={1260} y={430} w={600} h={250} k="red" o={ep(t, A(0.14), A(0.2))}>
        <Tag text="zoompan, as is: step error rms" y={18} x={26} size={22} />
        <Giant text="1.22 px" size={150} x={0} y={78} w={600} />
      </Blk>
      <Line text={`frame ${n + 1} of 120: ${sw(e)}`} x={1260} y={712} size={28} mono w={620} color={C.text} o={ep(t, A(0.2), A(0.26)) * (1 - showEnd)} />
      <Line text={`frame ${n + 1} of 120, scale 8x first: ${sw(u)}`} x={1260} y={712} size={26} mono w={620} color={C.green} o={showEnd} />
      <Line text="the centre of a centred zoom: it should stay where it is" x={1260} y={780} size={30} w={600} color={C.text} o={ep(t, A(0.3), A(0.36))} />
    </Page>
  );
};

/* 2. The card and the two readers: an exploded stack of the setup */
const Setup: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const cx = -34, cy = -22 + t * 0.5;
  const L = (a: number) => ep(t, A(a), A(a) + 0.5);
  const markers = [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75], [0.5, 0.15]];
  return (
    <Page>
      <Cam cx={cx} cy={cy} x={740} y={540}>
        <Box x={0} y={-20} z={0} w={6} h={640} d={6} bg={C.mute} o={0.5} />
        {/* 1: the card */}
        <Floor x={0} y={-300 + (1 - L(0.02)) * -120} z={0} w={540} d={304} bg={C.bg2} grid={14} gridColor={C.mute} border={C.text} bw={4} o={L(0.02)}>
          {markers.map((m, i) => <div key={i} style={{position: 'absolute', left: m[0] * 540 - 10, top: m[1] * 304 - 10, width: 20, height: 20, background: i < 3 ? C.text : C.cyan}} />)}
        </Floor>
        <Bill x={-340} y={-400} z={60} cx={cx} cy={cy} w={400} align="right" o={L(0.04)}><Cap text="test card" size={30} /></Bill>
        {/* 2: the lens */}
        <Floor x={40} y={-110 + (1 - L(0.16)) * -100} z={0} w={420} d={236} border={C.amber} bw={10} o={L(0.16)}>
          <div style={{position: 'absolute', left: 210 - 1, top: 0, width: 2, height: 236, background: C.amber}} />
          <div style={{position: 'absolute', left: 0, top: 118 - 1, width: 420, height: 2, background: C.amber}} />
        </Floor>
        <Bill x={-340} y={-150} z={60} cx={cx} cy={cy} w={400} align="right" o={L(0.18)}><Cap text="zoompan lens" size={30} /></Bill>
        {/* 3: 120 frames */}
        {[0, 1, 2, 3, 4, 5].map((i) => <Floor key={i} x={0} y={80 + i * 14 + (1 - L(0.3)) * -80} z={0} w={540} d={304} bg={C.panel} border={C.text} bw={2} o={L(0.3) * 0.92} />)}
        <Bill x={-340} y={60} z={60} cx={cx} cy={cy} w={400} align="right" o={L(0.32)}><Cap text="120 output frames" size={30} /></Bill>
        {/* 4: the readers */}
        <Floor x={-140} y={270 + (1 - L(0.46)) * -60} z={0} w={240} d={170} bg={C.amber} o={L(0.46)} />
        <Floor x={140} y={270 + (1 - L(0.58)) * -60} z={0} w={240} d={170} bg={C.green} o={L(0.58)} />
        <Bill x={-340} y={250} z={60} cx={cx} cy={cy} w={400} align="right" o={L(0.48)}><Cap text="2 readers" size={30} /></Bill>
        
      </Cam>
      <Blk x={1180} y={140} w={680} h={210} k="amber" o={ep(t, A(0.44), A(0.52))} dy={(1 - ep(t, A(0.44), A(0.52))) * 40}>
        <Tag text="reader 1" y={16} />
        <Line text="the centre of each marker: pixels above the grid level, weighted" x={28} y={62} size={30} color={C.bg} w={620} />
      </Blk>
      <Blk x={1180} y={370} w={680} h={210} k="green" o={ep(t, A(0.56), A(0.64))} dy={(1 - ep(t, A(0.56), A(0.64))) * 40}>
        <Tag text="reader 2" y={16} />
        <Line text="the edges of a second marker: half level crossings, left and right, top and bottom" x={28} y={62} size={30} color={C.bg} w={620} />
      </Blk>
      <Blk x={1180} y={600} w={680} h={300} k="text" o={ep(t, A(0.7), A(0.78))} dy={(1 - ep(t, A(0.7), A(0.78))) * 40}>
        <Tag text="controls" y={16} />
        <Line text={'a known pan of 0.25 px a frame\na known jitter of exactly 1 px\nzoompan with no zoom\nzoompan with a fixed zoom of 1.25'} x={28} y={62} size={30} color={C.bg} w={620} />
        <Line text="z = min(zoom + 0.0015, 1.5), 120 frames" x={28} y={236} size={26} mono color={C.amberDim} w={640} bold />
      </Blk>
    </Page>
  );
};

/* 3. The wobble: bars standing on a floor, one per zoom speed, as is */
const Wobble: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const cx = -22, cy = -16 + t * 0.4;
  const U = 210;
  const xs = [-340, 0, 340];
  return (
    <Page>
      <Cam cx={cx} cy={cy} x={700} y={680}>
        <Floor x={0} y={0} z={0} w={1180} d={480} bg={C.bg2} grid={40} gridColor={C.line} />
        {SPEED_RMS.map((v, i) => {
          const g = ep(t, A(0.06) + i * 0.5, A(0.06) + i * 0.5 + 0.8);
          const h = Math.max(2, v * U * g);
          return (
            <React.Fragment key={i}>
              <Box x={xs[i]} y={-h / 2} z={0} w={190} h={h} d={190} bg={i === 1 ? C.red : C.amber} />
              <Bill x={xs[i]} y={-h - 150} z={0} cx={cx} cy={cy} w={360} o={g}>
                <BigNum text={`${v.toFixed(2)} px`} color={i === 1 ? C.red : C.amber} size={80} />
              </Bill>
              <Bill x={xs[i]} y={50} z={250} cx={cx} cy={cy} w={360} o={ep(t, A(0.06), A(0.14))}>
                <Cap text={`zoom + ${SPEEDS[i]}`} size={26} />
              </Bill>
            </React.Fragment>
          );
        })}
      </Cam>
      <Line text="step error, zoompan as is, yuv420p: px rms" x={90} y={134} size={28} mono color={C.dim} w={900} o={ep(t, 0, 0.3)} />
      <Blk x={1340} y={150} w={520} h={260} k="red" o={ep(t, A(0.4), A(0.48))} dy={(1 - ep(t, A(0.4), A(0.48))) * 40}>
        <Giant text="346 / 357" size={96} x={0} y={30} w={520} />
        <Line text="steps move by more than half a pixel at the recipe speed" x={20} y={150} size={28} color={C.bg} w={480} align="center" />
      </Blk>
      <Blk x={1340} y={440} w={520} h={240} k="amber" o={ep(t, A(0.56), A(0.64))} dy={(1 - ep(t, A(0.56), A(0.64))) * 40}>
        <Giant text="3.5 px" size={110} x={0} y={24} w={520} />
        <Line text="the farthest a marker strays from a perfect zoom" x={20} y={140} size={28} color={C.bg} w={480} align="center" />
      </Blk>
      <Blk x={1340} y={710} w={520} h={190} k="text" o={ep(t, A(0.72), A(0.8))} dy={(1 - ep(t, A(0.72), A(0.8))) * 40}>
        <Tag text="the centre marker alone" y={16} size={22} />
        <Line text="1.22 px rms, 111 of 119 steps over half a pixel" x={26} y={66} size={30} color={C.bg} w={470} bold />
      </Blk>
    </Page>
  );
};

/* 4. The integer lens: the ideal crop origin glides, the real one waits and jumps */
const Lens: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const cx = -46, cy = -14 + Math.sin(t * 0.5) * 3;
  const CW = 66, COLS = 13;
  const f = Math.min(11.999, prog(t, A(0.1), A(0.8)) * 12);
  const cur = Math.floor(f), fr = f - cur, mv = ep(fr, 0, 0.3);
  const prev = Math.max(0, cur - 1);
  const ideal = lerp(LENS_IDEAL[prev], LENS_IDEAL[cur], mv);
  const real = lerp(LENS_REAL[prev], LENS_REAL[cur], mv);
  const X0 = -(COLS * CW) / 2;
  return (
    <Page>
      <Cam cx={cx} cy={cy} x={640} y={640}>
        <Floor x={0} y={0} z={0} w={COLS * CW} d={4 * CW} bg={C.bg2} grid={CW} gridColor={C.mute} />
        {Array.from({length: COLS}, (_, c) => (
          <Bill key={c} x={X0 + (c + 0.5) * CW} y={-10} z={2 * CW + 30} cx={cx} cy={cy} w={CW}><Cap text={String(c)} size={26} color={C.dim} /></Bill>
        ))}
        <Wall x={X0 + ideal * CW} y={-130} z={0} d={4 * CW + 40} h={260} bg={C.cyan} o={0.55} />
        <Wall x={X0 + real * CW} y={-130} z={0} d={4 * CW + 40} h={260} bg={C.amber} o={0.8} />
        <Bill x={X0 + ideal * CW} y={-410} z={-2 * CW} cx={cx} cy={cy} w={400} o={ep(t, A(0.1), A(0.16))}><Cap text={`ideal origin ${LENS_IDEAL[cur].toFixed(2)}`} color={C.cyan} size={28} /></Bill>
        <Bill x={X0 + real * CW} y={-330} z={-2 * CW} cx={cx} cy={cy} w={400} o={ep(t, A(0.1), A(0.16))}><Cap text={`real origin ${LENS_REAL[cur]}`} color={C.amber} size={28} /></Bill>
      </Cam>
      <div style={{position: 'absolute', left: 1180, top: 130, width: 690}}>
        <div style={{display: 'flex', fontFamily: F.mono, fontSize: 24, color: C.dim, letterSpacing: 1, padding: '0 14px 6px'}}>
          <span style={{width: 70}}>n</span><span style={{width: 150}}>ideal x</span><span style={{width: 120}}>real x</span><span style={{width: 150}}>ideal w</span><span>real w</span>
        </div>
        {LENS_IDEAL.map((v, i) => (
          <div key={i} style={{display: 'flex', fontFamily: F.mono, fontSize: 26, padding: '5px 14px', background: i === cur ? C.amber : 'transparent', color: i === cur ? C.bg : C.text, opacity: ep(t, A(0.04) + i * 0.05, A(0.04) + i * 0.05 + 0.3)}}>
            <span style={{width: 70}}>{i}</span><span style={{width: 150}}>{v.toFixed(2)}</span><span style={{width: 120}}>{LENS_REAL[i]}</span><span style={{width: 150}}>{LENS_W_IDEAL[i].toFixed(2)}</span><span>{LENS_W[i]}</span>
          </div>
        ))}
      </div>
      <Blk x={1180} y={640} w={330} h={250} k="green" o={ep(t, A(0.82), A(0.88))}>
        <Tag text="model vs 15 runs" y={14} size={20} x={20} />
        <Giant text="0.16 px" size={84} x={0} y={62} w={330} />
        <Line text="the worst miss" x={0} y={160} size={26} color={C.bg} w={330} align="center" />
      </Blk>
      <Blk x={1540} y={640} w={330} h={250} k="red" o={ep(t, A(0.88), A(0.94))}>
        <Tag text="wrong alignment" y={14} size={20} x={20} />
        <Giant text="1.0 to 1.3" size={70} x={0} y={66} w={330} />
        <Line text="px off, rms" x={0} y={160} size={26} color={C.bg} w={330} align="center" />
      </Blk>
    </Page>
  );
};

/* 5. What helps: five bars on plates whose area is the megapixels of the card that zoompan starts from */
const Fix: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const cx = -24, cy = -14 + t * 0.35;
  const U = 230;
  const xs = [-440, -220, 0, 220, 450];
  const col: K[] = ['red', 'amber', 'amber', 'green', 'green'];
  return (
    <Page>
      <Cam cx={cx} cy={cy} x={730} y={690}>
        <Floor x={0} y={0} z={0} w={1260} d={520} bg={C.bg2} grid={40} gridColor={C.line} />
        {WAY_RMS.map((v, i) => {
          const at = A(0.04) + i * (dur * 0.1);
          const g = ep(t, at, at + 0.7);
          const h = Math.max(2, v * U * g);
          const plate = 36 * Math.sqrt(WAY_MP[i]);
          return (
            <React.Fragment key={i}>
              <Floor x={xs[i]} y={-1} z={0} w={plate} d={plate} bg={C.panel} border={C.text} bw={3} o={g} />
              <Box x={xs[i]} y={-h / 2 - 2} z={0} w={70} h={h} d={70} bg={C[col[i]]} />
              <Bill x={xs[i]} y={-h - 140} z={0} cx={cx} cy={cy} w={250} o={g}><BigNum text={v.toFixed(2)} color={C[col[i]]} size={70} /></Bill>
              <Bill x={xs[i]} y={-6} z={290} cx={cx} cy={cy} w={250} o={g}><Cap text={WAYS[i]} size={24} /></Bill>
            </React.Fragment>
          );
        })}
      </Cam>
      <Line text="step error at the recipe speed, px rms. plate area: pixels of the card" x={90} y={134} size={26} mono color={C.dim} w={1250} o={ep(t, 0, 0.3)} />
      <Blk x={1400} y={170} w={460} h={230} k="green" o={ep(t, A(0.7), A(0.76))} dy={(1 - ep(t, A(0.7), A(0.76))) * 40}>
        <Giant text="0 / 357" size={96} x={0} y={26} w={460} />
        <Line text="steps over half a pixel with scale 8x (24 with 4x, 309 with 444)" x={20} y={132} size={26} color={C.bg} w={420} align="center" />
      </Blk>
      <Blk x={1400} y={430} w={460} h={240} k="red" o={ep(t, A(0.8), A(0.86))} dy={(1 - ep(t, A(0.8), A(0.86))) * 40}>
        <Giant text="64 x" size={110} x={0} y={20} w={460} />
        <Line text="the pixels: 7680 x 4320 from 960 x 540. And still not zero." x={20} y={130} size={26} color={C.bg} w={420} align="center" />
      </Blk>
      <Blk x={1400} y={700} w={460} h={190} k="text" o={ep(t, A(0.88), A(0.94))} dy={(1 - ep(t, A(0.88), A(0.94))) * 40}>
        <Tag text="2x is no better than 444" y={14} size={20} x={20} />
        <Line text="0.72 against 0.69, and 444 costs one line" x={20} y={58} size={28} color={C.bg} w={420} bold />
      </Blk>
    </Page>
  );
};

/* 6. What to do: tilted cards in a fan */
const Close: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const cx = -10, cy = -16 + Math.sin(t * 0.4) * 2;
  const items: {k: K; head: string; sub: string; at: number}[] = [
    {k: 'green', head: 'format=yuv444p first', sub: 'cuts the wobble nearly in half, for one line', at: 0.04},
    {k: 'amber', head: 'scale 4x to 8x first', sub: '0.32 and 0.18 px, at 16 and 64 times the pixels', at: 0.22},
    {k: 'red', head: 'expect a floor, not zero', sub: 'the lens is a whole number rectangle', at: 0.4},
  ];
  return (
    <Page>
      <Cam cx={cx} cy={cy} x={640} y={500} persp={2600}>
        {items.map((it, i) => {
          const p = ep(t, A(it.at), A(it.at) + 0.5);
          return (
            <React.Fragment key={i}>
              <Box x={0} y={-290 + i * 250 + (1 - p) * -40} z={-i * 70} w={1060} h={210} d={46} bg={C[it.k]} o={p}>
                <div style={{position: 'absolute', left: 36, top: 26, fontFamily: F.sans, fontWeight: 700, fontSize: 52, color: C.bg, whiteSpace: 'nowrap'}}>{it.head}</div>
                <div style={{position: 'absolute', left: 36, top: 112, fontFamily: F.sans, fontSize: 32, color: C.bg, whiteSpace: 'nowrap'}}>{it.sub}</div>
              </Box>
            </React.Fragment>
          );
        })}
      </Cam>
      <Blk x={1300} y={170} w={560} h={330} k="dim" o={ep(t, A(0.6), A(0.68))} dy={(1 - ep(t, A(0.6), A(0.68))) * 40}>
        <Tag text="not tested" y={18} />
        <Line text={'other builds, real photos,\npans, other scalers,\nthe encoder'} x={28} y={70} size={32} color={C.bg} w={500} />
      </Blk>
      <Blk x={1300} y={530} w={560} h={300} k="text" o={ep(t, A(0.74), A(0.82))} dy={(1 - ep(t, A(0.74), A(0.82))) * 40}>
        <Tag text="the sign of it" y={18} />
        <Line text="when the zoom does not change, zoompan does not move anything: step error 0.00 at zoom 1 and 1.25" x={28} y={70} size={30} color={C.bg} w={500} bold />
      </Blk>
    </Page>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, setup: Setup, wobble: Wobble, lens: Lens, fix: Fix, close: Close};
