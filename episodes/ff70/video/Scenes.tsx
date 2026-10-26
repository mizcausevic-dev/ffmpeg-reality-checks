import React from 'react';
import {C, F} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import {Head, Mid, Cmd} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff70/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
   Production style: physical 3D cutaway. CSS 3D (perspective, rotateX, translateZ) planes: the output window, the card, the pixels outside the window as a lower layer,
   exploded stacks. The test card markers (red, lime, blue, yellow in the fixture) are drawn in the palette inks: madder, olive, indigo, ochre. Local components only; palette lab. */

/* Measured data copied from evidence.json (fixture/run.mjs), ffmpeg 6.1.1. "lost" is relative to the same rotation on a 600 by 600 canvas (nothing can be cut there). */
const DATA = {"card":{"w":320,"h":240,"marker":24,"markerArea":576,"pixels":76800},"ctrl":{"identity":{"nonfill":76800,"markers":{"red":576,"lime":576,"blue":576,"yellow":576},"area":76800},"pad":{"black":43200,"nonfill":76800,"area":76800,"out":[400,300]},"crop":{"markers":{"red":0,"lime":0,"blue":0,"yellow":0}}},"ang":[{"deg":15,"def":{"markers":{"red":0,"lime":23,"blue":35,"yellow":0},"lost":8824,"nonfill":69100},"rotw":{"out":[371,315],"markers":{"red":625,"lime":622,"blue":624,"yellow":621},"lost":11,"nonfill":77913,"formula":{"w":371.213,"h":314.644}},"big":{"nonfill":77924,"bbox":[373,317]}},{"deg":30,"def":{"markers":{"red":0,"lime":0,"blue":0,"yellow":0},"lost":13528,"nonfill":64396},"rotw":{"out":[397,368],"markers":{"red":625,"lime":622,"blue":623,"yellow":622},"lost":8,"nonfill":77916,"formula":{"w":397.128,"h":367.846}},"big":{"nonfill":77924,"bbox":[399,370]}},{"deg":45,"def":{"markers":{"red":0,"lime":0,"blue":0,"yellow":0},"lost":15643,"nonfill":62162},"rotw":{"out":[396,396],"markers":{"red":612,"lime":610,"blue":612,"yellow":609},"lost":7,"nonfill":77798,"formula":{"w":395.98,"h":395.98}},"big":{"nonfill":77805,"bbox":[398,398]}},{"deg":60,"def":{"markers":{"red":0,"lime":94,"blue":87,"yellow":0},"lost":16235,"nonfill":61690},"rotw":{"out":[368,397],"markers":{"red":624,"lime":625,"blue":624,"yellow":620},"lost":9,"nonfill":77916,"formula":{"w":367.846,"h":397.128}},"big":{"nonfill":77925,"bbox":[370,400]}},{"deg":90,"def":{"markers":{"red":0,"lime":0,"blue":0,"yellow":0},"lost":19844,"nonfill":58080},"rotw":{"out":[240,320],"markers":{"red":576,"lime":576,"blue":576,"yellow":576},"lost":1124,"nonfill":76800,"formula":{"w":240,"h":320}},"big":{"nonfill":77924,"bbox":[242,322]}}],"sweep":[{"n":388,"lost":111},{"n":389,"lost":91},{"n":390,"lost":73},{"n":391,"lost":57},{"n":392,"lost":43},{"n":393,"lost":31},{"n":394,"lost":21},{"n":395,"lost":13},{"n":396,"lost":7},{"n":397,"lost":3},{"n":398,"lost":1},{"n":399,"lost":0},{"n":400,"lost":0}],"fill":{"white":{"vf":"rotate=45*PI/180:bilinear=0:fillcolor=white","corner":[255,255,255,255],"bytes":307200,"count":14638},"rgba_none":{"vf":"format=rgba,rotate=45*PI/180:bilinear=0:fillcolor=none","corner":[0,0,0,0],"bytes":307200},"rgba_default":{"vf":"format=rgba,rotate=45*PI/180:bilinear=0","corner":[0,0,0,255],"bytes":307200},"yuv":{"vf":"format=yuv420p,rotate=45*PI/180:bilinear=0:fillcolor=none","corner":[0,135,0,255],"bytes":307200},"black":{"vf":"rotate=45*PI/180:bilinear=0","corner":[0,0,0,255],"bytes":307200}},"enc":{"oddSize":[397,368],"oddErr":"width not divisible by 2 (397x368)","evenSize":[398,368],"evenMarkers":{"red":591,"lime":615,"blue":616,"yellow":637}}} as const;


const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const MK = ['red', 'lime', 'blue', 'yellow'] as const;
const mkc = (i: number) => [C.red, C.green, C.cyan, C.amber][i];
const MARKER_AREA = DATA.card.marker * DATA.card.marker;
const ANG = (deg: number) => DATA.ang.find((a) => a.deg === deg)!;

/* ---------- local components ---------- */
type TxProps = {x: number; y: number; s?: number; c?: string; w?: number; a?: 'start' | 'middle' | 'end'; f?: 'sans' | 'mono' | 'display'; ls?: number; o?: number; children: React.ReactNode};
const Tx: React.FC<TxProps> = ({x, y, s = 24, c = C.text, w = 400, a = 'start', f = 'sans', ls = 0, o = 1, children}) => (
  <text x={x} y={y} fontSize={s} fill={c} fontWeight={w} textAnchor={a} fontFamily={F[f]} letterSpacing={ls} opacity={o}>{children}</text>
);
const Layer: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', left: 0, top: 0}}>
    <defs><pattern id="hatch" patternUnits="userSpaceOnUse" width={9} height={9} patternTransform="rotate(45)"><line x1={0} y1={0} x2={0} y2={9} stroke={C.red} strokeWidth={2.2} /></pattern></defs>
    {children}
  </svg>
);
const Badge: React.FC<{x: number; y: number; n: number | string; color: string; r?: number; o?: number}> = ({x, y, n, color, r = 15, o = 1}) => (
  <g opacity={o}><circle cx={x} cy={y} r={r} fill={C.bg} stroke={color} strokeWidth={2.5} /><Tx x={x} y={y + r * 0.45} s={r * 1.25} c={color} a="middle" w={700} f="mono">{n}</Tx></g>
);
/* the 3D stage: a perspective box with a tilted, slowly turning, preserve-3d group at (cx, cy) */
const Stage: React.FC<{cx: number; cy: number; rx?: number; rz?: number; persp?: number; o?: number; children: React.ReactNode}> = ({cx, cy, rx = 58, rz = 0, persp = 1800, o = 1, children}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, perspective: persp, perspectiveOrigin: `${cx}px ${cy}px`, opacity: o}}>
    <div style={{position: 'absolute', left: cx, top: cy, width: 0, height: 0, transformStyle: 'preserve-3d', transform: `rotateX(${rx}deg) rotateZ(${rz}deg)`}}>{children}</div>
  </div>
);
type PlaneProps = {w: number; h: number; z?: number; rot?: number; bg?: string; bd?: string; bw?: number; dash?: boolean; o?: number; clip?: boolean; dx?: number; dy?: number; children?: React.ReactNode};
const Plane: React.FC<PlaneProps> = ({w, h, z = 0, rot = 0, bg = 'transparent', bd = C.text, bw = 2, dash = false, o = 1, clip = false, dx = 0, dy = 0, children}) => (
  <div style={{position: 'absolute', left: dx - w / 2, top: dy - h / 2, width: w, height: h, boxSizing: 'border-box', background: bg, border: bw > 0 ? `${bw}px ${dash ? 'dashed' : 'solid'} ${bd}` : 'none', transform: `translateZ(${z}px) rotateZ(${rot}deg)`, opacity: o, overflow: clip ? 'hidden' : 'visible'}}>{children}</div>
);
/* a thin post standing on the floor plane at (x, y) and rising h px */
const Post: React.FC<{x: number; y: number; h: number; c?: string; o?: number}> = ({x, y, h, c = C.mute, o = 1}) => (
  <div style={{position: 'absolute', left: x - 1, top: y, width: 2, height: Math.max(0, h), background: c, opacity: o, transformOrigin: '50% 0', transform: 'rotateX(90deg)'}} />
);
/* the four corner markers of the card, at scale k */
const Markers: React.FC<{k: number; o?: number}> = ({k, o = 1}) => {
  const m = DATA.card.marker * k;
  const pos = [{left: 0, top: 0}, {right: 0, top: 0}, {left: 0, bottom: 0}, {right: 0, bottom: 0}];
  return <>{pos.map((p, i) => <div key={i} style={{position: 'absolute', width: m, height: m, background: mkc(i), opacity: o, ...p}} />)}</>;
};
/* a card of 320 by 240 at scale k, rotated, with its markers, optionally tinted as "cut" */
const CardBody: React.FC<{k: number; cut?: boolean}> = ({k, cut = false}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: DATA.card.w * k, height: DATA.card.h * k, background: cut ? C.redDim : C.panel, boxSizing: 'border-box', border: `2px solid ${cut ? C.red : C.text}`}}><Markers k={k} o={cut ? 0.7 : 1} /></div>
);
/* the cutaway: the output window (floor), the whole rotated card as a lower madder layer, and the part of the card inside the window as the top layer */
const Cutaway: React.FC<{k: number; ow: number; oh: number; rot: number; o?: number; zCut?: number; zIn?: number; winLabel?: boolean}> = ({k, ow, oh, rot, o = 1, zCut = 84, zIn = 168}) => {
  const cw = DATA.card.w * k, ch = DATA.card.h * k, W = ow * k, H = oh * k;
  return (
    <div style={{transformStyle: 'preserve-3d'}}>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => <Post key={i} x={(sx * W) / 2} y={(sy * H) / 2} h={zIn} />)}
      <Plane w={W} h={H} z={0} bg={C.bg2} bd={C.text} bw={3} dash />
      <Plane w={cw} h={ch} z={zCut} rot={rot} bw={0}><CardBody k={k} cut /></Plane>
      <Plane w={W} h={H} z={zIn} bw={0} clip>
        <div style={{position: 'absolute', left: (W - cw) / 2, top: (H - ch) / 2, width: cw, height: ch, transform: `rotate(${rot}deg)`}}><CardBody k={k} /></div>
      </Plane>
      <Plane w={W} h={H} z={zIn + 1} bd={C.text} bw={3} />
    </div>
  );
};
/* a chip: a marker square filled from the bottom by the fraction that is left */
const Chip: React.FC<{x: number; y: number; i: number; frac: number; s?: number; o?: number}> = ({x, y, i, frac, s = 32, o = 1}) => (
  <g opacity={o}>
    <rect x={x} y={y} width={s} height={s} fill="none" stroke={mkc(i)} strokeWidth={2.5} />
    <rect x={x} y={y + s * (1 - frac)} width={s} height={s * frac} fill={mkc(i)} />
    {frac < 0.05 && <g stroke={C.red} strokeWidth={2.5}><line x1={x + 4} y1={y + 4} x2={x + s - 4} y2={y + s - 4} /><line x1={x + s - 4} y1={y + 4} x2={x + 4} y2={y + s - 4} /></g>}
  </g>
);

/* 1. The question */
const Ask: React.FC<SceneProps> = ({t}) => {
  const rot = lerp(0, 45, ep(t, 2.4, 8.0));
  const names = ['top left', 'top right', 'bottom left', 'bottom right'];
  return (
    <>
      <Head over="Rotate by 45 degrees" title="Where did the corners go?" color={C.red} o={ep(t, 0.2, 0.8)} />
      <Stage cx={1000} cy={600} rx={56} rz={-10 + t * 0.5} o={ep(t, 0.6, 1.4)}>
        <Cutaway k={1.25} ow={DATA.card.w} oh={DATA.card.h} rot={rot} />
      </Stage>
      <Layer>
        <g opacity={ep(t, 1.4, 2.2)}>
          <Tx x={210} y={330} s={22} c={C.dim} f="mono" ls={2}>THE CARD</Tx>
          <Tx x={210} y={364} s={26} c={C.text} f="mono" w={700}>{`${DATA.card.w} x ${DATA.card.h}`}</Tx>
          <Tx x={210} y={394} s={22} c={C.dim} f="mono">{`${DATA.card.w * DATA.card.h} pixels`}</Tx>
          {MK.map((m, i) => <g key={m}><rect x={210} y={430 + i * 44} width={26} height={26} fill={mkc(i)} /><Tx x={250} y={451 + i * 44} s={22} c={C.text} f="mono">{names[i]}</Tx></g>)}
          <Tx x={210} y={622} s={22} c={C.dim} f="mono">{`${DATA.card.marker} x ${DATA.card.marker} = ${MARKER_AREA} px each`}</Tx>
        </g>
        <g opacity={ep(t, 8.6, 9.4)}>
          <rect x={1480} y={330} width={26} height={26} fill={C.bg2} stroke={C.text} strokeWidth={2.5} strokeDasharray="6 4" />
          <Tx x={1518} y={351} s={22} c={C.text} f="mono">the output</Tx>
          <Tx x={1480} y={382} s={22} c={C.dim} f="mono">{`${DATA.card.w} x ${DATA.card.h} by default`}</Tx>
          <rect x={1480} y={430} width={26} height={26} fill={C.redDim} stroke={C.red} strokeWidth={2.5} />
          <Tx x={1518} y={451} s={22} c={C.red} f="mono">outside it</Tx>
        </g>
      </Layer>
      <Cmd y={846} text="-vf rotate=PI/4" color={C.cyan} size={32} o={ep(t, 6.0, 6.8)} />
    </>
  );
};

/* 2. The card, the readers, the controls */
const Source: React.FC<SceneProps> = ({t}) => {
  const lift = ep(t, 2.0, 4.0) * 90;
  const k = 1.1, w = DATA.card.w * k, h = DATA.card.h * k, m = DATA.card.marker * k;
  const corners = [[-w / 2 + m / 2, -h / 2 + m / 2], [w / 2 - m / 2, -h / 2 + m / 2], [-w / 2 + m / 2, h / 2 - m / 2], [w / 2 - m / 2, h / 2 - m / 2]];
  const row = (y: number, n: number | string, color: string, title: string, lines: string[], when: number) => (
    <g opacity={ep(t, when, when + 0.7)}>
      <Badge x={1090} y={y + 8} n={n} color={color} r={17} />
      <Tx x={1124} y={y + 14} s={27} c={C.text} f="mono" w={700}>{title}</Tx>
      {lines.map((l, i) => <Tx key={i} x={1124} y={y + 46 + i * 30} s={22} c={C.dim} f="mono">{l}</Tx>)}
    </g>
  );
  return (
    <>
      <Head over="Two readers · one control" title="The test card." color={C.cyan} o={ep(t, 0.2, 0.8)} />
      <Stage cx={600} cy={600} rx={58} rz={-14 + t * 0.4} o={ep(t, 0.6, 1.4)}>
        <Plane w={w} h={h} z={0} bg={C.panel} bd={C.text} bw={3} />
        {corners.map(([cx, cy], i) => <Post key={`p${i}`} x={cx} y={cy} h={lift} />)}
        {corners.map(([cx, cy], i) => <Plane key={i} w={m} h={m} z={lift} dx={cx} dy={cy} bg={mkc(i)} bd={C.text} bw={1.5} />)}
      </Stage>
      <Layer>
        <Tx x={600} y={846} s={22} c={C.dim} a="middle" f="mono" o={ep(t, 3.6, 4.4)}>{`${DATA.card.w} x ${DATA.card.h} gray card, four ${DATA.card.marker} x ${DATA.card.marker} markers, ${MARKER_AREA} px each`}</Tx>
        {row(310, 1, C.cyan, 'Node, decoded pixels', ['pixels that are not fill', 'pixels near each marker color'], 4.4)}
        {row(430, 2, C.cyan, 'ffmpeg, signalstats', ['YAVG / 128 x width x height', 'the surviving area of a gray card'], 7.4)}
        {row(550, '=', C.green, 'control: rotate 0', [`${DATA.ctrl.identity.nonfill} pixels, ${DATA.ctrl.identity.markers.red} per marker`, `ffmpeg area ${DATA.ctrl.identity.area}`], 10.4)}
        {row(670, '+', C.red, 'known positives', [`pad 40 and 30: ${DATA.ctrl.pad.black} black pixels, area ${DATA.ctrl.pad.area}`, `crop 30 px a side: markers ${MK.map((m) => DATA.ctrl.crop.markers[m]).join(' ')}`], 13.4)}
      </Layer>
    </>
  );
};

/* 3. The default size */
const Default: React.FC<SceneProps> = ({t}) => {
  const rows = [15, 30, 45, 60, 90].map((d) => ANG(d));
  return (
    <>
      <Head over="Default output size" title="Four corners, gone." color={C.red} o={ep(t, 0.2, 0.8)} />
      <Stage cx={570} cy={610} rx={58} rz={-8 + t * 0.35} o={ep(t, 0.6, 1.4)}>
        <Cutaway k={1.2} ow={DATA.card.w} oh={DATA.card.h} rot={45} />
      </Stage>
      <Layer>
        <g opacity={ep(t, 2.0, 2.8)}><Tx x={570} y={832} s={22} c={C.text} a="middle" f="mono" w={700}>45 degrees, output 320 x 240</Tx><Tx x={570} y={864} s={21} c={C.red} a="middle" f="mono">madder: card pixels outside the window</Tx></g>
        <g opacity={ep(t, 2.4, 3.0)}>
          <Tx x={1090} y={316} s={21} c={C.dim} f="mono" ls={2}>ANGLE</Tx><Tx x={1240} y={316} s={21} c={C.dim} f="mono" ls={2}>MARKERS KEPT</Tx><Tx x={1700} y={316} s={21} c={C.dim} a="end" f="mono" ls={2}>PIXELS CUT</Tx>
          <line x1={1090} y1={330} x2={1700} y2={330} stroke={C.text} strokeWidth={2} />
        </g>
        {rows.map((r, i) => {
          const y = 346 + i * 92, o = ep(t, 3.4 + i * 1.6, 4.2 + i * 1.6), hot = r.deg === 45;
          return (
            <g key={r.deg} opacity={o}>
              {hot && <rect x={1076} y={y - 6} width={640} height={84} fill="none" stroke={C.red} strokeWidth={3} />}
              <Tx x={1096} y={y + 52} s={48} c={C.text} f="display" w={800}>{`${r.deg}°`}</Tx>
              {MK.map((m, j) => <Chip key={m} x={1240 + j * 52} y={y + 18} i={j} frac={Math.min(1, r.def.markers[m] / MARKER_AREA)} />)}
              <Tx x={1700} y={y + 52} s={32} c={hot ? C.red : C.text} a="end" f="mono" w={700}>{String(r.def.lost)}</Tx>
            </g>
          );
        })}
        <Tx x={1090} y={826} s={21} c={C.dim} f="mono" o={ep(t, 12.0, 12.8)}>{`cut = missing from the same rotation on a 600 x 600 canvas (45 degrees: ${ANG(45).big.nonfill})`}</Tx>
      </Layer>
    </>
  );
};

/* 4. The size it needs */
const Size: React.FC<SceneProps> = ({t}) => {
  const a = ANG(45), g = ep(t, 2.0, 5.5);
  const ow = lerp(DATA.card.w, a.rotw.out[0], g), oh = lerp(DATA.card.h, a.rotw.out[1], g);
  const maxLost = Math.max(...DATA.sweep.map((s) => s.lost));
  return (
    <>
      <Head over="The size it needs" title="Make room for the card." color={C.green} o={ep(t, 0.2, 0.8)} />
      <Stage cx={540} cy={620} rx={58} rz={-8 + t * 0.3} o={ep(t, 0.6, 1.4)}>
        <Cutaway k={0.92} ow={ow} oh={oh} rot={45} />
      </Stage>
      <Layer>
        <Tx x={540} y={846} s={22} c={C.dim} a="middle" f="mono" o={ep(t, 5.6, 6.2)}>{`window ${Math.round(ow)} x ${Math.round(oh)}`}</Tx>
        <g opacity={ep(t, 5.8, 6.6)}>
          <Tx x={1060} y={312} s={24} c={C.text} f="mono" w={700}>{`320 x cos 45 + 240 x sin 45 = ${a.rotw.formula.w}`}</Tx>
          <Tx x={1060} y={346} s={24} c={C.text} f="mono" w={700}>{`320 x sin 45 + 240 x cos 45 = ${a.rotw.formula.h}`}</Tx>
          <Tx x={1060} y={380} s={22} c={C.green} f="mono" w={700}>{`rotw, roth: ${a.rotw.out[0]} x ${a.rotw.out[1]}, markers ${MK.map((m) => a.rotw.markers[m]).join(' ')}`}</Tx>
        </g>
        <g opacity={ep(t, 8.6, 9.4)}>
          <Tx x={1060} y={436} s={21} c={C.dim} f="mono" ls={2}>SQUARE CANVAS</Tx><Tx x={1700} y={436} s={21} c={C.dim} a="end" f="mono" ls={2}>PIXELS CUT</Tx>
        </g>
        {DATA.sweep.map((s, i) => {
          const y = 448 + i * 27, o = ep(t, 9.0 + i * 0.35, 9.6 + i * 0.35), isR = s.n === a.rotw.out[0], zero = s.lost === 0;
          const col = isR ? C.amber : zero ? C.green : C.red;
          return (
            <g key={s.n} opacity={o}>
              <Tx x={1060} y={y + 19} s={21} c={isR ? C.amber : C.text} f="mono" w={isR ? 700 : 400}>{`${s.n}`}</Tx>
              <rect x={1130} y={y + 3} width={Math.max(2, (s.lost / maxLost) * 380)} height={20} fill={col} opacity={zero ? 1 : 0.85} />
              <Tx x={1130 + Math.max(2, (s.lost / maxLost) * 380) + 10} y={y + 19} s={21} c={col} f="mono" w={700}>{`${s.lost}${isR ? '  rotw' : ''}`}</Tx>
            </g>
          );
        })}
        <Tx x={1060} y={826} s={21} c={C.dim} f="mono" o={ep(t, 14.0, 14.8)}>the 1 px sampling border is why 399 is the first zero</Tx>
      </Layer>
    </>
  );
};

/* a pixel grid inset: the last Y columns and the chroma blocks that pair them */
const ChromaInset: React.FC<{x: number; y: number; cols: number[]; ok: boolean; o?: number}> = ({x, y, cols, ok, o = 1}) => {
  const cw = 54;
  return (
    <g opacity={o}>
      {cols.map((c, i) => <g key={c}><rect x={x + i * cw} y={y} width={cw} height={40} fill={C.panel} stroke={C.text} strokeWidth={1.5} /><Tx x={x + i * cw + cw / 2} y={y + 26} s={19} c={C.text} a="middle" f="mono">{c}</Tx></g>)}
      {[0, 2].filter((s) => s < cols.length).map((s) => {
        const full = s + 1 < cols.length;
        return <g key={s}><rect x={x + s * cw} y={y + 50} width={full ? cw * 2 : cw} height={26} fill={full ? C.greenDim : 'url(#hatch)'} stroke={full ? C.green : C.red} strokeWidth={2} />{full && <Tx x={x + s * cw + cw} y={y + 69} s={17} c={C.green} a="middle" f="mono" w={700}>U V</Tx>}</g>;
      })}
      <Tx x={x} y={y + 108} s={21} c={ok ? C.green : C.red} f="mono" w={700}>{ok ? 'every chroma block has two columns' : 'the last column has no partner'}</Tx>
    </g>
  );
};

/* 5. Odd sizes */
const Odd: React.FC<SceneProps> = ({t}) => {
  const [ow, oh] = DATA.enc.oddSize, [ew, eh] = DATA.enc.evenSize;
  const stack = (cx: number, w: number, h: number, color: string, tint: string, when: number) => {
    const k = 0.62, o = ep(t, when, when + 0.8), sp = ep(t, when + 0.4, when + 2.2), zu = 70 * sp, zv = 140 * sp;
    return (
      <Stage cx={cx} cy={500} rx={60} rz={-10} o={o}>
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => <Post key={i} x={(sx * w * k) / 2} y={(sy * h * k) / 2} h={zv} o={sp} />)}
        <Plane w={w * k} h={h * k} z={0} bg={tint} bd={color} bw={3} />
        <Plane w={(w / 2) * k} h={(h / 2) * k} z={zu} bg={C.bg2} bd={color} bw={3} />
        <Plane w={(w / 2) * k} h={(h / 2) * k} z={zv} bg={C.bg2} bd={color} bw={3} />
      </Stage>
    );
  };
  const lab = (cx: number, color: string, w: number, h: number, when: number) => (
    <g opacity={ep(t, when + 1.2, when + 2.0)}>
      <Tx x={cx} y={668} s={22} c={color} a="middle" f="mono" w={700}>{`Y ${w} x ${h}`}</Tx>
      <Tx x={cx} y={696} s={22} c={color} a="middle" f="mono" w={700}>{`U and V ${w / 2} x ${h / 2}`}</Tx>
    </g>
  );
  return (
    <>
      <Head over="Odd sizes" title="Chroma wants even sizes." color={C.red} o={ep(t, 0.2, 0.8)} />
      {stack(500, ow, oh, C.red, C.redDim, 1.0)}
      {stack(1380, ew, eh, C.green, C.greenDim, 8.0)}
      <Layer>
        <Tx x={500} y={310} s={26} c={C.red} a="middle" f="mono" w={700} o={ep(t, 1.0, 1.8)}>{`rotw at 30 degrees: ${ow} x ${oh}`}</Tx>
        {lab(500, C.red, ow, oh, 1.0)}
        <ChromaInset x={372} y={724} cols={[395, 396, ow]} ok={false} o={ep(t, 3.4, 4.2)} />
        <g opacity={ep(t, 5.4, 6.2)}>
          <rect x={210} y={862} width={620} height={44} fill={C.redDim} />
          <Tx x={222} y={892} s={21} c={C.red} f="mono" w={700}>{DATA.enc.oddErr}</Tx>
        </g>
        <Tx x={1380} y={310} s={26} c={C.green} a="middle" f="mono" w={700} o={ep(t, 8.0, 8.8)}>{`ceil(rotw / 2) * 2: ${ew} x ${eh}`}</Tx>
        {lab(1380, C.green, ew, eh, 8.0)}
        <ChromaInset x={1252} y={724} cols={[ew - 3, ew - 2, ew - 1, ew].slice(1)} ok o={ep(t, 10.0, 10.8)} />
        <Tx x={1252} y={896} s={21} c={C.dim} f="mono" o={ep(t, 11.6, 12.4)}>{`markers kept: ${MK.map((m) => DATA.enc.evenMarkers[m]).join(' ')}`}</Tx>
      </Layer>
    </>
  );
};

/* 6. The fill color */
const Fill: React.FC<SceneProps> = ({t}) => {
  const k = 0.8, W = DATA.card.w * k, H = DATA.card.h * k;
  const stage = (cx: number, when: number, floor: React.ReactNode, color: string) => (
    <Stage cx={cx} cy={500} rx={58} rz={-8 + t * 0.3} o={ep(t, when, when + 0.8)}>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => <Post key={i} x={(sx * W) / 2} y={(sy * H) / 2} h={110} />)}
      <Plane w={W} h={H} z={0} bw={3} bd={color} bg={C.bg2}>{floor}</Plane>
      <Plane w={W} h={H} z={110} bw={0} clip><div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transform: 'rotate(45deg)'}}><CardBody k={k} /></div></Plane>
      <Plane w={W} h={H} z={111} bw={3} bd={C.text} />
    </Stage>
  );
  const text = (cx: number, when: number, title: string, l1: string, l2: string, color: string) => (
    <g opacity={ep(t, when + 0.8, when + 1.6)}>
      <Tx x={cx} y={706} s={26} c={color} a="middle" f="mono" w={700}>{title}</Tx>
      <Tx x={cx} y={744} s={22} c={C.text} a="middle" f="mono">{l1}</Tx>
      <Tx x={cx} y={776} s={22} c={C.dim} a="middle" f="mono">{l2}</Tx>
    </g>
  );
  const f = DATA.fill;
  const none = (
    <svg width="100%" height="100%" style={{position: 'absolute', left: 0, top: 0}}>
      <defs><pattern id="hatch2" patternUnits="userSpaceOnUse" width={9} height={9} patternTransform="rotate(45)"><line x1={0} y1={0} x2={0} y2={9} stroke={C.mute} strokeWidth={2} /></pattern></defs>
      <rect width="100%" height="100%" fill="url(#hatch2)" />
    </svg>
  );
  return (
    <>
      <Head over="The fill color" title="Transparent needs alpha." color={C.amber} o={ep(t, 0.2, 0.8)} />
      {stage(440, 1.0, null, C.text)}
      {stage(960, 6.4, none, C.cyan)}
      {stage(1480, 10.4, <div style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', background: C.greenDim}} />, C.green)}
      <Layer>
        {text(440, 1.0, 'fillcolor=white', `corner ${f.white.corner.join(' ')}`, `${f.white.count} pixels filled`, C.text)}
        {text(960, 6.4, 'rgba, fillcolor=none', `corner ${f.rgba_none.corner.join(' ')}`, 'alpha 0: transparent', C.cyan)}
        {text(1480, 10.4, 'yuv420p, fillcolor=none', `corner ${f.yuv.corner.slice(0, 3).join(' ')}`, 'no alpha: green', C.green)}
      </Layer>
    </>
  );
};

/* 7. What we measured */
const Close: React.FC<SceneProps> = ({t}) => {
  const a45 = ANG(45);
  const rows = [
    {n: 1, color: C.red, name: 'default size', rule: ['is the input size,', 'the rotated card does not fit'], seen: ['45 degrees: 4 of 4 markers gone', `${a45.def.lost} card pixels cut`]},
    {n: 2, color: C.green, name: 'rotw and roth', rule: ['are width cos plus height sin,', 'rounded to whole pixels'], seen: [`${a45.rotw.out[0]} x ${a45.rotw.out[1]} at 45 degrees`, `markers kept, ${a45.rotw.lost} tip pixels cut`]},
    {n: 3, color: C.amber, name: 'odd results', rule: ['can come out odd,', 'chroma subsampling needs even'], seen: [`${DATA.enc.oddSize[0]} x ${DATA.enc.oddSize[1]}: x264 refuses`, `${DATA.enc.evenSize[0]} x ${DATA.enc.evenSize[1]} works`]},
    {n: 4, color: C.cyan, name: 'fillcolor', rule: ['paints the corners;', 'none needs an alpha format'], seen: [`white: ${DATA.fill.white.count} pixels`, 'rgba none: alpha 0']},
  ];
  return (
    <>
      <Head over="What we measured" title="Four facts about rotate." color={C.cyan} o={ep(t, 0.2, 0.9)} />
      <Layer>
        <line x1={210} y1={300} x2={1710} y2={300} stroke={C.text} strokeWidth={2} opacity={ep(t, 0.8, 1.4)} />
        {rows.map((r, i) => {
          const y = 300 + i * 118, o = ep(t, 1.2 + i * 1.2, 1.9 + i * 1.2);
          return (
            <g key={r.n} opacity={o}>
              <Badge x={238} y={y + 59} n={r.n} color={r.color} r={20} />
              <Tx x={282} y={y + 70} s={42} c={C.text} f="display" w={800}>{r.name}</Tx>
              <Tx x={740} y={y + 52} s={24} c={C.dim}>{r.rule[0]}</Tx>
              <Tx x={740} y={y + 84} s={24} c={C.dim}>{r.rule[1]}</Tx>
              {r.seen.map((s, k) => <Tx key={k} x={1250} y={y + 52 + k * 32} s={22} c={r.color} f="mono" w={700}>{s}</Tx>)}
              <line x1={210} y1={y + 118} x2={1710} y2={y + 118} stroke={C.mute} strokeWidth={1} />
            </g>
          );
        })}
      </Layer>
      <Mid y={800} size={26} color={C.mute} o={ep(t, 7.0, 7.6)}>Not tested: other builds, real footage, other angles and card sizes, other filters.</Mid>
      <Mid y={846} size={26} color={C.dim} o={ep(t, 8.0, 8.6)}>FFmpeg Reality Checks · episode 70 · fixture and tests in the description</Mid>
    </>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, default: Default, size: Size, odd: Odd, fill: Fill, close: Close};
