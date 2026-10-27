import React from 'react';
import {C, F, D} from '../../kit/theme';
import {ep} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Physical 3D cutaway. Real CSS 3D (perspective, rotateX and rotateY, layered planes, extruded bars, no WebGL): the Y, U and V planes of a
 * yuv420p frame as exploded slabs, one cell per sample, drawn from the raw frames that ffmpeg wrote. Every number comes from episodes/ff86/fixture/experiment.mjs
 * (base 64x32 gray, card 8x8 with Y 50 U 200 V 60, 16 offsets, ffmpeg 6.1.1), read by a Node box finder and by ffmpeg plane profiles.
 */

/* DATA BEGIN: generated from episodes/ff86/fixture/experiment.mjs, ffmpeg 6.1.1, base 64x32, card 8x8 */
const SLAB: Record<string, {Y: number[][]; U: number[][]; V: number[][]}> = {"d420":{"Y":[[50,50,50,50,50,50,50,50,128,128,128,128,128,128,128,128],[50,50,50,50,50,50,50,50,128,128,128,128,128,128,128,128],[50,50,50,50,50,50,50,50,128,128,128,128,128,128,128,128],[50,50,50,50,50,50,50,50,128,128,128,128,128,128,128,128],[50,50,50,50,50,50,50,50,128,128,128,128,128,128,128,128],[50,50,50,50,50,50,50,50,128,128,128,128,128,128,128,128],[50,50,50,50,50,50,50,50,128,128,128,128,128,128,128,128],[50,50,50,50,50,50,50,50,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128]],"U":[[200,200,200,200,128,128,128,128],[200,200,200,200,128,128,128,128],[200,200,200,200,128,128,128,128],[200,200,200,200,128,128,128,128],[128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128]],"V":[[60,60,60,60,128,128,128,128],[60,60,60,60,128,128,128,128],[60,60,60,60,128,128,128,128],[60,60,60,60,128,128,128,128],[128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128]]},"f444":{"Y":[[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,50,50,50,50,50,50,50,50,128,128,128,128,128,128,128],[128,50,50,50,50,50,50,50,50,128,128,128,128,128,128,128],[128,50,50,50,50,50,50,50,50,128,128,128,128,128,128,128],[128,50,50,50,50,50,50,50,50,128,128,128,128,128,128,128],[128,50,50,50,50,50,50,50,50,128,128,128,128,128,128,128],[128,50,50,50,50,50,50,50,50,128,128,128,128,128,128,128],[128,50,50,50,50,50,50,50,50,128,128,128,128,128,128,128],[128,50,50,50,50,50,50,50,50,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128]],"U":[[146,166,164,166,146,126,128,128],[166,208,204,208,166,124,128,128],[164,204,200,204,164,124,128,128],[166,208,204,208,166,124,128,128],[146,166,164,166,146,126,128,128],[126,124,124,124,126,128,128,128]],"V":[[111,92,94,92,111,130,128,128],[92,52,56,52,92,132,128,128],[94,56,60,56,94,132,128,128],[92,52,56,52,92,132,128,128],[111,92,94,92,111,130,128,128],[130,132,132,132,130,128,128,128]]},"f422":{"Y":[[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[50,50,50,50,50,50,50,50,128,128,128,128,128,128,128,128],[50,50,50,50,50,50,50,50,128,128,128,128,128,128,128,128],[50,50,50,50,50,50,50,50,128,128,128,128,128,128,128,128],[50,50,50,50,50,50,50,50,128,128,128,128,128,128,128,128],[50,50,50,50,50,50,50,50,128,128,128,128,128,128,128,128],[50,50,50,50,50,50,50,50,128,128,128,128,128,128,128,128],[50,50,50,50,50,50,50,50,128,128,128,128,128,128,128,128],[50,50,50,50,50,50,50,50,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128]],"U":[[164,164,164,164,128,128,128,128],[204,204,204,204,128,128,128,128],[200,200,200,200,128,128,128,128],[204,204,204,204,128,128,128,128],[164,164,164,164,128,128,128,128],[124,124,124,124,128,128,128,128]],"V":[[94,94,94,94,128,128,128,128],[56,56,56,56,128,128,128,128],[60,60,60,60,128,128,128,128],[56,56,56,56,128,128,128,128],[94,94,94,94,128,128,128,128],[132,132,132,132,128,128,128,128]]},"e444":{"Y":[[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,50,50,50,50,50,50,50,50,128,128,128,128,128,128,128],[128,50,50,50,50,50,50,50,50,128,128,128,128,128,128,128],[128,50,50,50,50,50,50,50,50,128,128,128,128,128,128,128],[128,50,50,50,50,50,50,50,50,128,128,128,128,128,128,128],[128,50,50,50,50,50,50,50,50,128,128,128,128,128,128,128],[128,50,50,50,50,50,50,50,50,128,128,128,128,128,128,128],[128,50,50,50,50,50,50,50,50,128,128,128,128,128,128,128],[128,50,50,50,50,50,50,50,50,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128]],"U":[[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,200,200,200,200,200,200,200,200,128,128,128,128,128,128,128],[128,200,200,200,200,200,200,200,200,128,128,128,128,128,128,128],[128,200,200,200,200,200,200,200,200,128,128,128,128,128,128,128],[128,200,200,200,200,200,200,200,200,128,128,128,128,128,128,128],[128,200,200,200,200,200,200,200,200,128,128,128,128,128,128,128],[128,200,200,200,200,200,200,200,200,128,128,128,128,128,128,128],[128,200,200,200,200,200,200,200,200,128,128,128,128,128,128,128],[128,200,200,200,200,200,200,200,200,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128]],"V":[[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,60,60,60,60,60,60,60,60,128,128,128,128,128,128,128],[128,60,60,60,60,60,60,60,60,128,128,128,128,128,128,128],[128,60,60,60,60,60,60,60,60,128,128,128,128,128,128,128],[128,60,60,60,60,60,60,60,60,128,128,128,128,128,128,128],[128,60,60,60,60,60,60,60,60,128,128,128,128,128,128,128],[128,60,60,60,60,60,60,60,60,128,128,128,128,128,128,128],[128,60,60,60,60,60,60,60,60,128,128,128,128,128,128,128],[128,60,60,60,60,60,60,60,60,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128],[128,128,128,128,128,128,128,128,128,128,128,128,128,128,128,128]]}}; // region cols 0..15 rows 0..11 of Y, the matching chroma samples, offset x=1 y=1
const YBOX: Record<string, number[][]> = {"d420":[[0,0],[0,0],[2,0],[2,0],[0,0],[0,0],[2,0],[2,0],[0,2],[0,2],[2,2],[2,2],[0,2],[0,2],[2,2],[2,2]],"f444":[[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[3,2],[0,3],[1,3],[2,3],[3,3]],"f422":[[0,0],[0,0],[2,0],[2,0],[0,1],[0,1],[2,1],[2,1],[0,2],[0,2],[2,2],[2,2],[0,3],[0,3],[2,3],[2,3]],"e444":[[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[3,2],[0,3],[1,3],[2,3],[3,3]]}; // luma box origin [x0, y0] for offsets y*4+x
const UBOX: Record<string, number[][]> = {"d420":[[0,0],[0,0],[1,0],[1,0],[0,0],[0,0],[1,0],[1,0],[0,1],[0,1],[1,1],[1,1],[0,1],[0,1],[1,1],[1,1]],"e444":[[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[3,2],[0,3],[1,3],[2,3],[3,3]]}; // chroma box origin
const CLASS: Record<string, number[]> = {"d420":[0,0,1,1,0,0,1,1,2,2,3,3,2,2,3,3],"f444":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],"f422":[0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7],"e444":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]}; // which distinct frame each offset gives
const WRONG: Record<string, number[]> = {"d420":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"f444":[28,44,40,44,44,60,40,60,40,40,48,40,44,60,40,60],"f422":[16,16,16,16,48,48,48,48,32,32,32,32,48,48,48,48],"e444":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}; // card pixels (of 64) with the wrong chroma
const BLEED: Record<string, number[]> = {"d420":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"f444":[32,44,48,60,44,60,56,72,48,56,64,72,60,72,72,84],"f422":[16,16,16,16,32,32,32,32,32,32,32,32,48,48,48,48],"e444":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}; // background pixels that picked up chroma
const NEG: Record<string, number[]> = {"-1":[6,3],"-2":[6,3],"-3":[4,2]}; // x offset -> [luma columns shown, chroma columns shown]
/* DATA END */

type K = 'cyan' | 'amber' | 'red' | 'green' | 'text' | 'bg2' | 'panel' | 'mute' | 'dim' | 'line';
const KEYS: K[] = ['cyan', 'amber', 'red', 'green'];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* ---------- flat blocks and text ---------- */
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

/* ---------- CSS 3D kit (same vocabulary as ff62): Cam carries the rotation, group coordinates x right, y DOWN, z toward the viewer ---------- */
const Cam: React.FC<{cx: number; cy: number; x?: number; y?: number; persp?: number; o?: number; children?: React.ReactNode}> = ({cx, cy, x = 960, y = 540, persp = 2300, o = 1, children}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, perspective: persp, perspectiveOrigin: `${x}px ${y - 100}px`, opacity: o}}>
    <div style={{position: 'absolute', left: x, top: y, width: 0, height: 0, transformStyle: 'preserve-3d', transform: `rotateX(${cx}deg) rotateY(${cy}deg)`}}>{children}</div>
  </div>
);
const Floor: React.FC<{x: number; y: number; z: number; w: number; d: number; bg?: string; border?: string; bw?: number; dash?: boolean; o?: number; children?: React.ReactNode}> = ({x, y, z, w, d, bg = 'transparent', border, bw = 0, dash, o = 1, children}) => (
  <div style={{position: 'absolute', left: x - w / 2, top: y - d / 2, width: w, height: d, transform: `translateZ(${z}px) rotateX(90deg)`, background: bg, opacity: o, boxSizing: 'border-box', border: border ? `${bw}px ${dash ? 'dashed' : 'solid'} ${border}` : undefined}}>{children}</div>
);
/** an extruded box centred at (x, y, z); w along x, h along y (vertical), d along z */
const Box: React.FC<{x: number; y: number; z: number; w: number; h: number; d: number; bg: string; o?: number; children?: React.ReactNode}> = ({x, y, z, w, h, d, bg, o = 1, children}) => {
  const face = (extra: React.CSSProperties, tone: number) => ({position: 'absolute' as const, background: bg, filter: `brightness(${tone})`, opacity: o, boxSizing: 'border-box' as const, ...extra});
  return (
    <div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, transformStyle: 'preserve-3d', transform: `translateZ(${z}px)`}}>
      <div style={face({left: 0, top: 0, width: w, height: h, transform: `translateZ(${d / 2}px)`}, 1)}>{children}</div>
      <div style={face({left: 0, top: 0, width: w, height: h, transform: `translateZ(${-d / 2}px) rotateY(180deg)`}, 0.7)} />
      <div style={face({left: w / 2 - d / 2, top: 0, width: d, height: h, transform: `rotateY(90deg) translateZ(${w / 2}px)`}, 0.8)} />
      <div style={face({left: w / 2 - d / 2, top: 0, width: d, height: h, transform: `rotateY(-90deg) translateZ(${w / 2}px)`}, 0.8)} />
      <div style={face({left: 0, top: h / 2 - d / 2, width: w, height: d, transform: `rotateX(90deg) translateZ(${h / 2}px)`}, 1.12)} />
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

/* ---------- sample planes ----------
 * One cell per sample. Luma: dark ink where the sample is darker than the gray base (Y 128). Chroma: indigo above the neutral 128, ochre below it, opacity by distance. */
const PW = 400, PH = 300; // footprint of every plane, whatever its sample grid (the picture area is the same)
type Rect = {x: number; y: number; w: number; h: number; color: string; dash?: boolean; sw?: number};
const chromaInk = (v: number) => (v >= 128 ? {c: C.cyan, a: clamp((v - 128) / 72, 0, 1)} : {c: C.amber, a: clamp((128 - v) / 68, 0, 1)});
const Plane: React.FC<{data: number[][]; luma?: boolean; y: number; o?: number; rects?: Rect[]; bars?: boolean}> = ({data, luma = false, y, o = 1, rects = [], bars = false}) => {
  const rows = data.length, cols = data[0].length, cw = PW / cols, ch = PH / rows;
  return (
    <>
      <Floor x={0} y={y} z={0} w={PW} d={PH} bg={C.bg2} o={o}>
        <svg width={PW} height={PH} style={{position: 'absolute', left: 0, top: 0}} shapeRendering="crispEdges">
          {data.map((row, r) => row.map((v, c) => {
            const ink = luma ? {c: C.text, a: clamp((128 - v) / 78, 0, 1)} : chromaInk(v);
            return <rect key={`${r}-${c}`} x={c * cw} y={r * ch} width={cw} height={ch} fill={ink.c} fillOpacity={ink.a} stroke={C.line} strokeWidth={1} />;
          }))}
          {rects.map((q, i) => <rect key={i} x={q.x * cw} y={q.y * ch} width={q.w * cw} height={q.h * ch} fill="none" stroke={q.color} strokeWidth={q.sw ?? 5} strokeDasharray={q.dash ? '14 9' : undefined} />)}
        </svg>
      </Floor>
      {bars && data.map((row, r) => row.map((v, c) => {
        const dev = v - 128, h = Math.abs(dev) * 0.85;
        if (h < 3) return null;
        return <Box key={`${r}-${c}`} x={(c + 0.5) * cw - PW / 2} y={y - h / 2} z={(r + 0.5) * ch - PH / 2} w={cw * 0.66} h={h} d={ch * 0.66} bg={dev > 0 ? C.cyan : C.amber} o={o} />;
      }))}
    </>
  );
};
const SP = 215; // gap between slabs in the exploded stack
const Labels: React.FC<{cx?: number; cy?: number; o?: number; names?: string[]}> = ({o = 1, names = ['Y plane: luma', 'U plane: chroma', 'V plane: chroma']}) => (
  <>
    {names.map((n, i) => (
      <div key={i} style={{position: 'absolute', left: 30, top: [745, 552, 334][i] - 18, width: 330, textAlign: 'right', opacity: o, fontFamily: F.mono, fontSize: 26, color: C.dim, whiteSpace: 'nowrap'}}>{n}</div>
    ))}
  </>
);

/* 1. The question: three slabs rise, the request is drawn on each, nothing else is known yet */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const cx = -34, cy = -16 + t * 0.6;
  const L = (a: number) => ep(t, A(a), A(a) + 0.6);
  const lift = (a: number) => (1 - L(a)) * 90;
  const req: Rect = {x: 1, y: 1, w: 8, h: 8, color: C.cyan, dash: true};
  const reqC: Rect = {x: 0.5, y: 0.5, w: 4, h: 4, color: C.cyan, dash: true};
  return (
    <Page>
      <Cam cx={cx} cy={cy} x={640} y={730}>
        <Plane data={SLAB.d420.Y.map((r) => r.map(() => 128))} luma y={0 + lift(0.02)} o={L(0.02)} rects={[req]} />
        <Plane data={SLAB.d420.U.map((r) => r.map(() => 128))} y={-SP + lift(0.12)} o={L(0.12)} rects={[reqC]} />
        <Plane data={SLAB.d420.V.map((r) => r.map(() => 128))} y={-2 * SP + lift(0.22)} o={L(0.22)} rects={[reqC]} />
      </Cam>
      <Labels o={L(0.3)} />
      <Tag text="cells: samples. dashed: where the card was asked for" color={C.dim} x={90} y={138} size={24} o={ep(t, A(0.04), A(0.12))} />
      <Blk x={1180} y={150} w={680} h={230} k="cyan" o={ep(t, A(0.34), A(0.4))} dy={(1 - ep(t, A(0.34), A(0.4))) * 40}>
        <Tag text="the request" y={18} x={26} size={22} />
        <Giant text="x 1   y 1" size={140} x={0} y={70} w={680} />
      </Blk>
      <Blk x={1180} y={410} w={680} h={210} k="text" o={ep(t, A(0.48), A(0.54))} dy={(1 - ep(t, A(0.48), A(0.54))) * 40}>
        <Tag text="the frame" y={16} x={26} size={22} />
        <Line text={'Y: 64 x 32 samples\nU and V: 32 x 16 samples each\none chroma sample covers 2 x 2 luma'} x={26} y={58} size={29} color={C.bg} w={630} />
      </Blk>
      <Blk x={1180} y={650} w={680} h={220} k="amber" o={ep(t, A(0.62), A(0.68))} dy={(1 - ep(t, A(0.62), A(0.68))) * 40}>
        <Tag text="the card" y={16} x={26} size={22} />
        <Line text={'8 x 8, Y 50, U 200, V 60\n16 offsets: x and y from 0 to 3\nbuild: ffmpeg 6.1.1'} x={26} y={58} size={29} color={C.bg} w={630} />
      </Blk>
    </Page>
  );
};

/* 2. The rig: an exploded stack of the setup, from the base to the two readers */
const Rig: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const cx = -34, cy = -22 + t * 0.5;
  const L = (a: number) => ep(t, A(a), A(a) + 0.5);
  const BWd = 540, BHt = 270, S = BWd / 64; // 1 sample of the base = 8.4 units
  const cardW = 8 * S;
  return (
    <Page>
      <Cam cx={cx} cy={cy} x={850} y={580}>
        <Box x={0} y={-20} z={0} w={6} h={700} d={6} bg={C.mute} o={0.5} />
        {/* 1: the base */}
        <Floor x={0} y={-330 + (1 - L(0.02)) * -120} z={0} w={BWd} d={BHt} bg={C.bg2} border={C.text} bw={4} o={L(0.02)} />
        <Bill x={-300} y={-420} z={60} cx={cx} cy={cy} w={400} align="right" o={L(0.04)}><Cap text="base 64 x 32, flat gray" size={28} /></Bill>
        {/* 2: the card, Y 50 U 200 V 60, three little plates side by side */}
        {[C.text, C.cyan, C.amber].map((c, i) => (
          <Floor key={i} x={-130 + i * 130} y={-170 + (1 - L(0.14 + i * 0.03)) * -100} z={0} w={cardW} d={cardW} bg={c} o={L(0.14 + i * 0.03)} />
        ))}
        <Bill x={-335} y={-250} z={60} cx={cx} cy={cy} w={400} align="right" o={L(0.16)}><Cap text="card 8 x 8: Y 50, U 200, V 60" size={28} /></Bill>
        {/* 3: 16 outputs */}
        {Array.from({length: 16}, (_, i) => (
          <Floor key={i} x={0} y={-30 + i * 9 + (1 - L(0.3)) * -80} z={0} w={BWd} d={BHt} bg={C.panel} border={C.text} bw={2} o={L(0.3) * 0.92} />
        ))}
        <Bill x={-300} y={-60} z={60} cx={cx} cy={cy} w={400} align="right" o={L(0.32)}><Cap text="16 offsets, 16 outputs" size={28} /></Bill>
        {/* 4: the readers */}
        <Floor x={-140} y={280 + (1 - L(0.46)) * -60} z={0} w={240} d={170} bg={C.amber} o={L(0.46)} />
        <Floor x={140} y={280 + (1 - L(0.58)) * -60} z={0} w={240} d={170} bg={C.green} o={L(0.58)} />
        <Bill x={-300} y={250} z={60} cx={cx} cy={cy} w={400} align="right" o={L(0.48)}><Cap text="2 readers" size={28} /></Bill>
      </Cam>
      <Blk x={1180} y={140} w={680} h={190} k="amber" o={ep(t, A(0.44), A(0.52))} dy={(1 - ep(t, A(0.44), A(0.52))) * 40}>
        <Tag text="reader 1" y={16} x={26} />
        <Line text="the box of the card in Y, U and V, and the center of its color" x={26} y={62} size={30} color={C.bg} w={630} />
      </Blk>
      <Blk x={1180} y={350} w={680} h={190} k="green" o={ep(t, A(0.56), A(0.64))} dy={(1 - ep(t, A(0.56), A(0.64))) * 40}>
        <Tag text="reader 2" y={16} x={26} />
        <Line text="ffmpeg extractplanes, row and column profiles, a checksum of every frame" x={26} y={62} size={30} color={C.bg} w={630} />
      </Blk>
      <Blk x={1180} y={560} w={680} h={310} k="text" o={ep(t, A(0.7), A(0.78))} dy={(1 - ep(t, A(0.7), A(0.78))) * 40}>
        <Tag text="controls" y={16} x={26} />
        <Line text={'control: even offsets, where the card\nmust land exactly\nknown positive: yuv444p to the end,\nwhere every offset must be exact'} x={26} y={62} size={30} color={C.bg} w={630} />
        <Line text="overlay=x=1:y=1" x={26} y={236} size={26} mono color={C.amberDim} w={640} bold />
      </Blk>
    </Page>
  );
};

/* 3. Plain overlay: a floor of 16 tiles, one per offset asked for, colored by the frame it really gives */
const Plain: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const cx = -50, cy = -14 + t * 0.4;
  const T = 175;
  const nWrong = Math.max(...WRONG.d420);
  return (
    <Page>
      <Cam cx={cx} cy={cy} x={640} y={535}>
        <Floor x={0} y={0} z={0} w={4 * T + 60} d={4 * T + 60} bg={C.bg2} />
        {Array.from({length: 16}, (_, i) => {
          const x = i % 4, y = Math.floor(i / 4);
          const g = ep(t, A(0.04) + i * 0.1, A(0.04) + i * 0.1 + 0.6);
          const [lx, ly] = YBOX.d420[i];
          const col = KEYS[CLASS.d420[i]];
          const h = 34 * g;
          return (
            <React.Fragment key={i}>
              <Box x={(x - 1.5) * T} y={-h / 2} z={(y - 1.5) * T} w={T - 14} h={Math.max(h, 1)} d={T - 14} bg={C[col]} />
              <Floor x={(x - 1.5) * T} y={-h - 1} z={(y - 1.5) * T} w={T - 14} d={T - 14} o={g}>
                <div style={{position: 'absolute', left: 0, top: 22, width: T - 14, textAlign: 'center', fontFamily: F.mono, fontSize: 20, color: C.bg, opacity: 0.85}}>{`ask ${x},${y}`}</div>
                <div style={{position: 'absolute', left: 0, top: 70, width: T - 14, textAlign: 'center', fontFamily: F.mono, whiteSpace: 'nowrap', fontWeight: 700, fontSize: 26, color: C.bg}}>{`get ${lx},${ly}`}</div>
              </Floor>
            </React.Fragment>
          );
        })}
      </Cam>
      <Tag text="tile: offset asked, place got. same color: same frame" color={C.dim} x={90} y={138} size={22} o={ep(t, A(0.04), A(0.12))} />
      <Blk x={1260} y={160} w={600} h={220} k="red" o={ep(t, A(0.5), A(0.56))} dy={(1 - ep(t, A(0.5), A(0.56))) * 40}>
        <Giant text="16 to 4" size={112} x={0} y={22} w={600} />
        <Line text="offsets asked for, frames got" x={20} y={150} size={28} color={C.bg} w={560} align="center" />
      </Blk>
      <Blk x={1260} y={400} w={600} h={220} k="green" o={ep(t, A(0.6), A(0.66))} dy={(1 - ep(t, A(0.6), A(0.66))) * 40}>
        <Giant text={`${nWrong} px`} size={112} x={0} y={22} w={600} />
        <Line text="with the wrong color: luma and chroma move together" x={20} y={146} size={28} color={C.bg} w={560} align="center" />
      </Blk>
      <Blk x={1260} y={640} w={600} h={220} k="amber" o={ep(t, A(0.7), A(0.76))} dy={(1 - ep(t, A(0.7), A(0.76))) * 40}>
        <Giant text="1 px" size={112} x={0} y={22} w={600} />
        <Line text="the largest miss, in x and in y" x={20} y={150} size={28} color={C.bg} w={560} align="center" />
      </Blk>
    </Page>
  );
};

/* 4. The usual fix: luma exact, chroma smeared. Bars stand on the U and V slabs: height is distance from the neutral 128 */
const Fix: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const cx = -34, cy = -18 + t * 0.5;
  const L = (a: number) => ep(t, A(a), A(a) + 0.6);
  const d = SLAB.f444;
  const lo = Math.min(...WRONG.f444), hi = Math.max(...WRONG.f444), blo = Math.min(...BLEED.f444), bhi = Math.max(...BLEED.f444);
  const frames = new Set(CLASS.f444).size;
  return (
    <Page>
      <Cam cx={cx} cy={cy} x={640} y={730}>
        <Plane data={d.Y} luma y={0} o={L(0.02)} rects={[{x: 1, y: 1, w: 8, h: 8, color: C.cyan, dash: true, sw: 4}, {x: 1, y: 1, w: 8, h: 8, color: C.green, sw: 3}]} />
        <Plane data={d.U} y={-SP} o={L(0.14)} bars rects={[{x: 0.5, y: 0.5, w: 4, h: 4, color: C.cyan, dash: true, sw: 4}]} />
        <Plane data={d.V} y={-2 * SP} o={L(0.3)} bars rects={[{x: 0.5, y: 0.5, w: 4, h: 4, color: C.cyan, dash: true, sw: 4}]} />
      </Cam>
      <Labels o={L(0.4)} />
      <Tag text="bar height: distance from neutral 128. indigo above, ochre below" color={C.dim} x={90} y={138} size={22} o={ep(t, A(0.04), A(0.12))} />
      <Blk x={1180} y={150} w={680} h={250} k="red" o={ep(t, A(0.46), A(0.52))} dy={(1 - ep(t, A(0.46), A(0.52))) * 40}>
        <Giant text={`${lo} to ${hi} of 64`} size={92} x={0} y={30} w={680} />
        <Line text="card pixels with the wrong color, over the 16 offsets" x={26} y={150} size={29} color={C.bg} w={630} align="center" />
      </Blk>
      <Blk x={1180} y={430} w={680} h={220} k="amber" o={ep(t, A(0.58), A(0.64))} dy={(1 - ep(t, A(0.58), A(0.64))) * 40}>
        <Giant text={`${blo} to ${bhi}`} size={112} x={0} y={24} w={680} />
        <Line text="gray pixels around the card that picked up color" x={26} y={132} size={29} color={C.bg} w={630} align="center" />
      </Blk>
      <Blk x={1180} y={680} w={680} h={190} k="green" o={ep(t, A(0.7), A(0.76))} dy={(1 - ep(t, A(0.7), A(0.76))) * 40}>
        <Giant text={`${frames} frames`} size={104} x={0} y={18} w={680} />
        <Line text="luma is exact at every odd offset" x={26} y={120} size={29} color={C.bg} w={630} align="center" />
      </Blk>
    </Page>
  );
};

/* 5. Half way, and the comparison: standing bars of distinct frames for the four setups */
const Half: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const cx = -24, cy = -16 + t * 0.4;
  const U = 16;
  const names = ['plain overlay', 'format=yuv422', 'format=yuv444', 'yuv444p to end'];
  const keys = ['d420', 'f422', 'f444', 'e444'];
  const col: K[] = ['red', 'amber', 'amber', 'green'];
  const xs = [-405, -135, 135, 405];
  const wrong = keys.map((k) => `${Math.min(...WRONG[k])} to ${Math.max(...WRONG[k])}`.replace(/^0 to 0$/, '0'));
  return (
    <Page>
      <Cam cx={cx} cy={cy} x={700} y={680}>
        <Floor x={0} y={0} z={0} w={1240} d={440} bg={C.bg2} />
        {keys.map((k, i) => {
          const n = new Set(CLASS[k]).size;
          const at = A(0.06) + i * (dur * 0.1);
          const g = ep(t, at, at + 0.8);
          const h = Math.max(2, n * U * 1.2 * g);
          return (
            <React.Fragment key={k}>
              <Box x={xs[i]} y={-h / 2} z={0} w={170} h={h} d={170} bg={C[col[i]]} />
              <Bill x={xs[i]} y={-h - 130} z={0} cx={cx} cy={cy} w={300} o={g}><BigNum text={String(n)} color={C[col[i]]} size={96} /></Bill>
              <Floor x={xs[i]} y={-1} z={150} w={262} d={110} o={ep(t, at, at + 0.4)}>
                <div style={{position: 'absolute', left: 0, top: 6, width: 262, textAlign: 'center', fontFamily: F.mono, fontSize: 24, fontWeight: 700, color: C.text, whiteSpace: 'nowrap'}}>{names[i]}</div>
                <div style={{position: 'absolute', left: 0, top: 50, width: 262, textAlign: 'center', fontFamily: F.mono, fontSize: 22, color: C.dim, whiteSpace: 'nowrap', opacity: ep(t, A(0.5) + i * 0.3, A(0.5) + i * 0.3 + 0.5)}}>{`wrong: ${wrong[i]}`}</div>
              </Floor>
            </React.Fragment>
          );
        })}
      </Cam>
      <Tag text="distinct frames from the 16 offsets" color={C.dim} x={90} y={138} size={24} o={ep(t, 0, 0.3)} />
      <Blk x={1380} y={170} w={480} h={250} k="amber" o={ep(t, A(0.56), A(0.62))} dy={(1 - ep(t, A(0.56), A(0.62))) * 40}>
        <Tag text="the middle road" y={16} x={22} size={22} />
        <Line text={'format=yuv422: y exact, x still\nrounds down to even.\nchroma smeared in y only.'} x={22} y={62} size={28} color={C.bg} w={440} />
      </Blk>
      <Blk x={1380} y={450} w={480} h={200} k="text" o={ep(t, A(0.68), A(0.74))} dy={(1 - ep(t, A(0.68), A(0.74))) * 40}>
        <Tag text="wrong = card pixels, of 64" y={16} x={22} size={20} />
        <Line text="the count of card pixels whose chroma is off by more than 2 levels" x={22} y={58} size={28} color={C.bg} w={440} />
      </Blk>
    </Page>
  );
};

/* 6. Exact to the end, and the left edge: the stack in 4:4:4, then three cards cut by the edge */
const Exact: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const cx = -34, cy = -18 + t * 0.5;
  const L = (a: number) => ep(t, A(a), A(a) + 0.6);
  const d = SLAB.e444;
  const box: Rect = {x: 1, y: 1, w: 8, h: 8, color: C.green, sw: 4};
  const ask: Rect = {x: 1, y: 1, w: 8, h: 8, color: C.cyan, dash: true, sw: 3};
  const negs = ['-1', '-2', '-3'];
  const CS = 36; // cell size of the strips
  return (
    <Page>
      <Cam cx={cx} cy={cy} x={630} y={730}>
        <Plane data={d.Y} luma y={0} o={L(0.02)} rects={[ask, box]} />
        <Plane data={d.U} y={-SP} o={L(0.12)} rects={[ask, box]} />
        <Plane data={d.V} y={-2 * SP} o={L(0.22)} rects={[ask, box]} />
      </Cam>
      <Labels o={L(0.3)} names={['Y plane', 'U plane', 'V plane']} />
      <Tag text="green: where the card is. dashed: asked. they coincide" color={C.dim} x={90} y={138} size={22} o={ep(t, A(0.04), A(0.12))} />
      <Blk x={1100} y={150} w={760} h={190} k="green" o={ep(t, A(0.36), A(0.42))} dy={(1 - ep(t, A(0.36), A(0.42))) * 40}>
        <Giant text="16 of 16" size={110} x={0} y={18} w={760} />
        <Line text="offsets exact in Y, U and V, in both readers" x={26} y={118} size={29} color={C.bg} w={710} align="center" />
      </Blk>
      <Blk x={1100} y={370} w={760} h={500} k="text" o={ep(t, A(0.5), A(0.56))} dy={(1 - ep(t, A(0.5), A(0.56))) * 40}>
        <Tag text="past the left edge, plain overlay" y={16} x={26} size={22} />
        {negs.map((k, i) => {
          const [wy, wu] = NEG[k];
          const start = wy - 8; // where the card really starts
          const ox = 250, y0 = 96 + i * 124;
          return (
            <React.Fragment key={k}>
              <div style={{position: 'absolute', left: 26, top: y0 + 4, fontFamily: F.mono, fontWeight: 700, fontSize: 30, color: C.bg}}>{`x ${k}`}</div>
              <div style={{position: 'absolute', left: 26, top: y0 + 44, fontFamily: F.mono, fontSize: 24, color: C.bg}}>{`${wy} of 8 columns`}</div>
              <svg width={470} height={100} style={{position: 'absolute', left: 250, top: y0 - 4}}>
                {Array.from({length: 8}, (_, c) => {
                  const cell = start + c; // column in the picture, negative = off screen
                  return <rect key={c} x={190 + cell * CS} y={20} width={CS} height={CS} fill={C.bg} fillOpacity={cell >= 0 ? 1 : 0.22} stroke={C.bg} strokeWidth={1.5} strokeDasharray={cell >= 0 ? undefined : '5 4'} />;
                })}
                <line x1={190} y1={4} x2={190} y2={84} stroke={C.red} strokeWidth={5} />
                <text x={190 + 8} y={80} fontFamily={F.mono} fontSize={22} fill={C.bg}>{`chroma ${wu} of 4`}</text>
              </svg>
            </React.Fragment>
          );
        })}
      </Blk>
    </Page>
  );
};

/* 7. What to do: three tilted cards in a fan, and the not tested list */
const Close: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * Math.max(8, dur - 10.5); // the end card owns the last seconds
  const cx = -10, cy = -16 + Math.sin(t * 0.4) * 2;
  const items: {k: K; head: string; sub: string; at: number}[] = [
    {k: 'green', head: 'even x and y', sub: 'exact in all planes, nothing blurred', at: 0.04},
    {k: 'amber', head: 'or stay in yuv444p', sub: 'convert to yuv420p once, at the encode', at: 0.22},
    {k: 'red', head: 'odd x or y in yuv420p', sub: 'rounded down to even, with no message', at: 0.4},
  ];
  return (
    <Page>
      <Cam cx={cx} cy={cy} x={640} y={610} persp={2600}>
        {items.map((it, i) => {
          const p = ep(t, A(it.at), A(it.at) + 0.5);
          return (
            <Box key={i} x={0} y={-290 + i * 250 + (1 - p) * -40} z={-i * 70} w={1060} h={210} d={46} bg={C[it.k]} o={p}>
              <div style={{position: 'absolute', left: 36, top: 26, fontFamily: F.sans, fontWeight: 700, fontSize: 52, color: C.bg, whiteSpace: 'nowrap'}}>{it.head}</div>
              <div style={{position: 'absolute', left: 36, top: 112, fontFamily: F.sans, fontSize: 32, color: C.bg, whiteSpace: 'nowrap'}}>{it.sub}</div>
            </Box>
          );
        })}
      </Cam>
      <Blk x={1300} y={170} w={560} h={330} k="dim" o={ep(t, A(0.6), A(0.68))} dy={(1 - ep(t, A(0.6), A(0.68))) * 40}>
        <Tag text="not tested" y={18} />
        <Line text={'other builds, real footage,\nother pixel formats,\nscaled or alpha overlays'} x={28} y={70} size={32} color={C.bg} w={500} />
      </Blk>
      <Blk x={1300} y={530} w={560} h={300} k="text" o={ep(t, A(0.74), A(0.82))} dy={(1 - ep(t, A(0.74), A(0.82))) * 40}>
        <Tag text="the sign of it" y={18} />
        <Line text="if two offsets give the same bytes, one of them was rounded: 16 offsets, 4 frames" x={28} y={70} size={30} color={C.bg} w={500} bold />
      </Blk>
    </Page>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, rig: Rig, plain: Plain, fix: Fix, half: Half, exact: Exact, close: Close};
