import React from 'react';
import {C, D, F, W} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Deep dive 04, "Frame rate and timestamps" (palette swiss: flat blocks, hairlines, left aligned type on a grid).
 * Every number drawn here is in EV below. EV is produced by sceneNumbers() in episodes/fl04/fixture/experiment.mjs from the live
 * evidence (ffmpeg 6.1.1), and episodes/fl04/test/fl04.test.mjs fails if this block differs from it. Do not edit it by hand.
 * Two numbers come from the published 8.1.2 rows of episodes 5 and 33 (cfr.publishedDefault, loop.published) and are drawn dashed.
 */
/*EV:start*/
const EV: any = {"build":"6.1.1","hook":{"recipeMs":[0,17,33,50,67,83,100,117,133,150,167,183,200,217,233,250,267,283,300,317,333,350,367,383],"passMs":[0,0,33,67,67,67,100,100,133,167,167,167,200,200,233,267,267,267,300,300,333,367,367,367],"frames":900,"distinctRecipe":900,"distinctPass":450},"vfr":{"frames":93,"seconds":5,"gapsMs":[33,67,933],"avgFps":18.5,"baseFps":30,"kept":[0,1,3,4,5,7,8,9,11,12,13,15,16,17,19,20,21,23,24,25,27,28,29,31,32,33,35,36,37,39,40,41,43,44,45,47,48,49,51,52,53,55,56,57,59,87,88,89,91,92,93,95,96,97,99,100,101,103,104,105,107,108,109,111,112,113,115,116,117,119,120,121,123,124,125,127,128,129,131,132,133,135,136,137,139,140,141,143,144,145,147,148,149],"slots":150},"cfr":{"source":93,"passthrough":93,"def":{"frames":150,"dups":57},"cfr30":{"frames":150,"dups":57},"cfr25":{"frames":125,"dups":32},"cfr60":{"frames":300,"dups":207},"distinct":93,"publishedDefault":93},"rflag":{"srcFrames":60,"srcSec":2,"after":{"frames":22,"sec":2.2},"fps":{"frames":20,"sec":2},"before":{"frames":60,"sec":6},"copy":{"fps":30,"sec":2}},"fps1":{"near":[12,37,62,87,112],"up":[0,25,50],"firstAt":0.48,"fps":25,"s60":[1,3,6,8,11,13],"s60Out":48},"setpts":{"picture":5.07,"audio":10,"container":10,"kept":152,"of":300,"keptFirst":[0,1,2,3,5,7,9,11,13],"sec":10},"atempo":{"audio":5,"picture":5.07,"hz":440,"rateAudio":5,"rateHz":880},"loop":{"eq":{"frames":360,"sec":12},"short":{"frames":355,"sec":11.83,"heads":[0,2,3],"audioSec":3.9},"published":{"frames":359,"sec":11.97,"heads":[0,0,1]},"plays":3,"playSec":4},"loop2":{"longAudio":{"audioSec":4.1,"sec":12.3,"hole":0.13,"holes":2},"copy":{"frames":360,"hole":0.1,"holes":2,"soundSec":11.7}},"recipe":{"frames":900,"distinct":900,"gapMin":16,"gapMax":17,"sec":15,"hz":440,"plays":3,"srcFrames":300},"controls":{"rFlag":{"frames":901,"first":[0,0,1]},"noAtempo":{"audio":30,"picture":15},"defaultFps":{"frames":452,"first":[0,1,2,3,5,7,9,11]}}};
/*EV:end*/

const X0 = 120, X1 = 1800, CW = X1 - X0;
const fr = (t: number, dur: number, a: number, b: number) => ep(t, a * dur, b * dur); // reveal between fractions of the scene

/* ---------------------------------------------------------------- small swiss parts */
const Over: React.FC<{text: string; y?: number; color?: string; o?: number}> = ({text, y = 112, color = C.red, o = 1}) => (
  <div style={{position: 'absolute', left: X0, top: y, display: 'flex', alignItems: 'center', gap: 16, opacity: o, fontFamily: F.mono, fontSize: 24, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: C.dim}}>
    <div style={{width: 18, height: 18, background: color}} />{text}
  </div>
);
const Title: React.FC<{text: string; y?: number; size?: number; o?: number; color?: string}> = ({text, y = 150, size = 80, o = 1, color = C.text}) => (
  <div style={{position: 'absolute', left: X0, top: y, width: CW, opacity: o, fontFamily: F.display, fontWeight: 800, fontSize: size * D.k, letterSpacing: D.ls, lineHeight: 1.04, color}}>{text}</div>
);
const Rule: React.FC<{y: number; x?: number; w?: number; color?: string; h?: number; o?: number}> = ({y, x = X0, w = CW, color = C.text, h = 3, o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, background: color, opacity: o}} />
);
const Txt: React.FC<{x: number; y: number; w?: number; size?: number; color?: string; weight?: number; mono?: boolean; align?: 'left' | 'right' | 'center'; o?: number; lh?: number; display?: boolean; children: React.ReactNode}> = ({x, y, w = 600, size = 28, color = C.dim, weight = 500, mono = false, align = 'left', o = 1, lh = 1.25, display = false, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, textAlign: align, fontFamily: display ? F.display : mono ? F.mono : F.sans, fontSize: display ? size * D.k : size, fontWeight: display ? 800 : weight, letterSpacing: display ? D.lsNum : 0, lineHeight: lh, color, whiteSpace: 'pre-wrap'}}>{children}</div>
);
/** A flat stat block: coloured bar on top, small caps label, big value, one line of detail. */
const Stat: React.FC<{x: number; y: number; w: number; label: string; value: string; sub?: string; color?: string; size?: number; o?: number}> = ({x, y, w, label, value, sub, color = C.cyan, size = 84, o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o}}>
    <div style={{height: 8, background: color}} />
    <div style={{marginTop: 14, fontFamily: F.mono, fontSize: 20, fontWeight: 700, letterSpacing: 3, textTransform: /=|\s-\w/.test(label) ? 'none' : 'uppercase', color}}>{label}</div>
    <div style={{fontFamily: F.display, fontWeight: 900, fontSize: size * D.k, letterSpacing: D.lsNum, lineHeight: 1.0, color: C.text, whiteSpace: 'nowrap', marginTop: 4}}>{value}</div>
    {sub && <div style={{fontFamily: F.sans, fontSize: 26, fontWeight: 500, color: C.dim, lineHeight: 1.25, marginTop: 6, whiteSpace: 'pre-wrap'}}>{sub}</div>}
  </div>
);
/** Monospace command block. `hi` pieces are painted in the accent colour. */
const Cmd: React.FC<{x?: number; y: number; w?: number; lines: string[]; hi?: string[]; color?: string; size?: number; o?: number}> = ({x = X0, y, w = CW, lines, hi = [], color = C.cyan, size = 30, o = 1}) => {
  const paint = (s: string) => {
    let parts: React.ReactNode[] = [s];
    hi.forEach((h, k) => { parts = parts.flatMap((p, i) => (typeof p === 'string' ? p.split(h).flatMap((seg, j, arr) => (j < arr.length - 1 ? [seg, <span key={`${k}-${i}-${j}`} style={{color, fontWeight: 800}}>{h}</span>] : [seg])) : [p])); });
    return parts;
  };
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, boxSizing: 'border-box', background: C.codeBg, borderLeft: `10px solid ${color}`, padding: '18px 28px', fontFamily: F.mono, fontSize: size, lineHeight: 1.45, color: C.text, whiteSpace: 'pre'}}>
      {lines.map((l, i) => <div key={i}><span style={{color: C.mute}}>{i === 0 ? '$ ' : '  '}</span>{paint(l)}</div>)}
    </div>
  );
};
/** Horizontal bar with a text on its right. */
const Bar: React.FC<{x: number; y: number; w: number; h?: number; color: string; text?: string; o?: number; dashed?: boolean; hatch?: boolean; textColor?: string; size?: number}> = ({x, y, w, h = 56, color, text, o = 1, dashed = false, hatch = false, textColor, size = 30}) => (
  <>
    <div style={{position: 'absolute', left: x, top: y, width: Math.max(2, w), height: h, boxSizing: 'border-box', opacity: o, background: dashed ? 'transparent' : hatch ? `repeating-linear-gradient(135deg, ${color} 0 8px, ${C.bg} 8px 14px)` : color, border: dashed ? `4px dashed ${color}` : hatch ? `3px solid ${color}` : 'none'}} />
    {text && <div style={{position: 'absolute', left: x + w + 18, top: y, height: h, display: 'flex', alignItems: 'center', opacity: o, fontFamily: F.display, fontWeight: 800, fontSize: size * D.k, letterSpacing: D.lsNum / 2, color: textColor ?? C.text, whiteSpace: 'nowrap'}}>{text}</div>}
  </>
);
/** A numbered chip; `stack` raises it above the chips that share its timestamp. */
const Chip: React.FC<{x: number; y: number; w: number; h: number; n: number | string; color: string; fill?: string; o?: number}> = ({x, y, w, h, n, color, fill, o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box', opacity: o, border: `3px solid ${color}`, background: fill ?? C.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: Math.min(22, h * 0.5), fontWeight: 700, color: C.text}}>{n}</div>
);

/**
 * Timestamp strip: each chip is one frame, drawn at its presentation time (ms). Frames that share a time stack up.
 * `bad` colours the stacked chips as the failure; otherwise every chip takes `color`.
 */
const TimeStrip: React.FC<{ms: number[]; x: number; y: number; w: number; t1: number; chip: number; color: string; bad?: boolean; p?: number; axis?: boolean; maxStack?: number}> = ({ms, x, y, w, t1, chip, color, bad = false, p = 1, axis = true, maxStack = 3}) => {
  const px = w / t1;
  const seen: Record<number, number> = {};
  const size: Record<number, number> = {};
  ms.forEach((m) => { size[m] = (size[m] ?? 0) + 1; });
  const shown = Math.floor(p * ms.length + 0.001);
  const base = y + maxStack * (chip + 4); // axis line
  return (
    <>
      {axis && <div style={{position: 'absolute', left: x, top: base + 2, width: w, height: 3, background: C.text}} />}
      {axis && [0, 100, 200, 300, 400].filter((m) => m <= t1).map((m) => (
        <React.Fragment key={m}>
          <div style={{position: 'absolute', left: x + m * px - 1, top: base + 2, width: 3, height: 14, background: C.text}} />
          <div style={{position: 'absolute', left: x + m * px - 40, top: base + 20, width: 80, textAlign: 'center', fontFamily: F.mono, fontSize: 20, color: C.dim}}>{m} ms</div>
        </React.Fragment>
      ))}
      {ms.map((m, i) => {
        const k = seen[m] ?? 0; seen[m] = k + 1;
        if (i >= shown) return null;
        const shared = size[m] > 1;
        const col = bad && shared ? C.red : color;
        return <Chip key={i} x={x + m * px - chip / 2} y={base - (k + 1) * (chip + 4)} w={chip} h={chip} n={i} color={col} fill={bad && shared ? C.redDim : undefined} />;
      })}
    </>
  );
};

/* ---------------------------------------------------------------- 1. hook */
const Hook: React.FC<SceneProps> = ({t, dur}) => {
  const H = EV.hook, V = EV.vfr, L = EV.rflag, S = EV.setpts, K = EV.cfr;
  return (
    <>
      <Over text="Speed up 2x, loop 3x, keep every frame" o={ep(t, 0.1, 0.6)} />
      <Title text="Same frames. Half the timestamps." size={78} o={ep(t, 0.2, 0.9)} />
      <Txt x={X0} y={262} w={900} mono size={24} color={C.green} o={fr(t, dur, 0.1, 0.16)}>-vf setpts=0.5*PTS,fps=60</Txt>
      <Txt x={1380} y={246} w={420} display size={86} align="right" color={C.green} o={fr(t, dur, 0.1, 0.16)}>{H.distinctRecipe}</Txt>
      <Txt x={1380} y={338} w={420} size={22} mono align="right" o={fr(t, dur, 0.1, 0.16)}>distinct timestamps</Txt>
      <TimeStrip ms={H.recipeMs} x={X0 + 20} y={300} w={1180} t1={400} chip={42} color={C.green} p={fr(t, dur, 0.12, 0.34)} axis={false} maxStack={1} />
      <Rule y={374} color={C.line} h={2} />
      <Txt x={X0} y={386} w={900} mono size={24} color={C.red} o={fr(t, dur, 0.36, 0.42)}>-fps_mode passthrough</Txt>
      <Txt x={1380} y={400} w={420} display size={86} align="right" color={C.red} o={fr(t, dur, 0.36, 0.42)}>{H.distinctPass}</Txt>
      <Txt x={1380} y={492} w={420} size={22} mono align="right" o={fr(t, dur, 0.36, 0.42)}>distinct timestamps</Txt>
      <TimeStrip ms={H.passMs} x={X0 + 20} y={436} w={1180} t1={400} chip={42} color={C.cyan} bad p={fr(t, dur, 0.38, 0.62)} />
      <Txt x={X0} y={680} w={1500} size={28} color={C.dim} o={fr(t, dur, 0.64, 0.7)}>The first 24 of {H.frames} frames, drawn at their real presentation times. Frames that share a time stack up.</Txt>
      <Rule y={744} color={C.line} h={2} o={fr(t, dur, 0.7, 0.74)} />
      <Stat x={X0} y={770} w={500} label="Variable to constant" value={`${V.frames} → ${K.def.frames}`} sub="frames in, frames out" color={C.cyan} size={64} o={fr(t, dur, 0.72, 0.78)} />
      <Stat x={X0 + 590} y={770} w={500} label="Dash r before the input" value={`${L.srcFrames} frames, ${L.before.sec} s`} sub={`not ${L.srcSec} s`} color={C.amber} size={64} o={fr(t, dur, 0.78, 0.84)} />
      <Stat x={X0 + 1180} y={770} w={500} label="Speed up" value={`${S.picture} vs ${S.audio} s`} sub="picture against sound" color={C.red} size={64} o={fr(t, dur, 0.84, 0.9)} />
    </>
  );
};

/* ---------------------------------------------------------------- 2. method */
const Method: React.FC<{} & SceneProps> = ({t, dur}) => {
  const grays = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <>
      <Over text="How we measure" o={ep(t, 0.1, 0.6)} />
      <Title text="Every frame carries its own code." o={ep(t, 0.2, 0.9)} />
      {grays.map((n) => (
        <div key={n} style={{position: 'absolute', left: X0 + n * 205, top: 290, width: 185, height: 130, boxSizing: 'border-box', border: `3px solid ${C.text}`, background: `hsl(0,0%,${22 + n * 9}%)`, opacity: fr(t, dur, 0.06 + n * 0.012, 0.12 + n * 0.012), display: 'flex', alignItems: 'flex-end', padding: 10, fontFamily: F.mono, fontSize: 28, fontWeight: 700, color: n < 4 ? C.bg : C.text}}>{n}</div>
      ))}
      <Txt x={X0} y={436} w={1500} size={26} o={fr(t, dur, 0.2, 0.26)}>{EV.recipe.srcFrames} frames, {EV.recipe.srcFrames} different codes: the luma and chroma of each frame say which one it is.</Txt>
      <Rule y={500} color={C.line} h={2} o={fr(t, dur, 0.26, 0.3)} />
      <Stat x={X0} y={530} w={780} label="Reader 1" value="ffprobe" sub={'packet timestamps and durations,\ncontainer length'} color={C.cyan} size={72} o={fr(t, dur, 0.3, 0.38)} />
      <Stat x={X0 + 900} y={530} w={780} label="Reader 2" value="a decode" sub={'frame md5, decoded frame code, timestamps,\nsample count, pitch'} color={C.cyan} size={72} o={fr(t, dur, 0.4, 0.48)} />
      <Rule y={748} color={C.line} h={2} o={fr(t, dur, 0.5, 0.54)} />
      <Stat x={X0} y={774} w={780} label="Control" value="a known positive" sub="each chapter proves the readers can see the effect" color={C.green} size={44} o={fr(t, dur, 0.54, 0.6)} />
      <Stat x={X0 + 900} y={774} w={780} label="Build" value={`ffmpeg ${EV.build}`} sub="every number is measured here" color={C.amber} size={44} o={fr(t, dur, 0.62, 0.68)} />
    </>
  );
};

/* ---------------------------------------------------------------- 3. variable frame rate */
const Vfr: React.FC<SceneProps> = ({t, dur}) => {
  const V = EV.vfr;
  const px = CW / V.slots;
  const kept: number[] = V.kept;
  const keptSet = new Set(kept);
  const base = 540;
  // the gaps worth naming: first one-frame step, first two-frame step, the longest one
  let longest = {a: 0, b: 0}; kept.forEach((n, i) => { if (i && n - kept[i - 1] > longest.b - longest.a) longest = {a: kept[i - 1], b: n}; });
  const brackets = [{a: 0, b: 1, label: `${V.gapsMs[0]} ms`, color: C.cyan}, {a: 1, b: 3, label: `${V.gapsMs[1]} ms`, color: C.amber}, {a: longest.a, b: longest.b, label: `${V.gapsMs[2]} ms`, color: C.red}];
  const shown = Math.floor(fr(t, dur, 0.08, 0.4) * V.slots);
  return (
    <>
      <Over text="Chapter 1 · variable frame rate" o={ep(t, 0.1, 0.6)} />
      <Title text="A phone style clip: the clock is uneven." o={ep(t, 0.2, 0.9)} />
      {Array.from({length: V.slots}, (_, n) => n < shown && (
        <div key={n} style={{position: 'absolute', left: X0 + n * px, top: keptSet.has(n) ? base - 150 : base - 40, width: Math.max(3, px - 2), height: keptSet.has(n) ? 150 : 40, background: keptSet.has(n) ? C.cyan : 'transparent', border: keptSet.has(n) ? 'none' : `2px solid ${C.line}`, boxSizing: 'border-box'}} />
      ))}
      <Rule y={base + 4} h={3} />
      {[0, 1, 2, 3, 4, 5].map((s) => (<React.Fragment key={s}><div style={{position: 'absolute', left: X0 + s * 30 * px - 1, top: base + 4, width: 3, height: 16, background: C.text}} /><Txt x={X0 + s * 30 * px - 50} y={base + 26} w={100} align="center" mono size={22}>{s} s</Txt></React.Fragment>))}
      {brackets.map((b, i) => {
        const o = fr(t, dur, 0.42 + i * 0.07, 0.48 + i * 0.07);
        const x1 = X0 + b.a * px + px / 2, x2 = X0 + b.b * px + px / 2;
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: x1, top: base - 214 + i * 0, width: x2 - x1, height: 24, boxSizing: 'border-box', borderTop: `4px solid ${b.color}`, borderLeft: `4px solid ${b.color}`, borderRight: `4px solid ${b.color}`, opacity: o}} />
            <Txt x={i < 2 ? X0 - 4 + i * 150 : (x1 + x2) / 2 - 80} y={base - 262} w={160} align={i < 2 ? 'left' : 'center'} display size={40} color={b.color} o={o}>{b.label}</Txt>
          </React.Fragment>
        );
      })}
      <Txt x={X0} y={base + 70} w={900} size={24} o={fr(t, dur, 0.4, 0.5)}>Solid: frames the clip has. Hollow: slots the clip lost.</Txt>
      <Rule y={680} color={C.line} h={2} o={fr(t, dur, 0.6, 0.64)} />
      <Stat x={X0} y={710} w={500} label="Frames" value={`${V.frames}`} sub={`over ${V.seconds} seconds`} color={C.cyan} size={84} o={fr(t, dur, 0.62, 0.7)} />
      <Stat x={X0 + 590} y={710} w={500} label="Base rate" value={`${V.baseFps} fps`} sub="what ffprobe calls r_frame_rate" color={C.green} size={84} o={fr(t, dur, 0.7, 0.78)} />
      <Stat x={X0 + 1180} y={710} w={500} label="Average" value={`${V.avgFps} fps`} sub="frames divided by seconds" color={C.red} size={84} o={fr(t, dur, 0.78, 0.86)} />
    </>
  );
};

/* ---------------------------------------------------------------- 4. constant frame rate */
const Cfr: React.FC<SceneProps> = ({t, dur}) => {
  const K = EV.cfr;
  const x0 = 640, scale = 700 / 160; // px per frame, up to 160
  const rows = [
    {label: 'the clip', sub: 'variable', pic: K.source, dup: 0, color: C.cyan},
    {label: '-fps_mode passthrough', sub: 'keeps the gaps', pic: K.passthrough, dup: 0, color: C.green},
    {label: 'no rate option', sub: `ffmpeg ${EV.build}`, pic: K.distinct, dup: K.def.dups, color: C.red},
    {label: '-fps_mode cfr -r 30', sub: `ffmpeg ${EV.build}`, pic: K.distinct, dup: K.cfr30.dups, color: C.red},
    {label: 'no rate option', sub: 'ffmpeg 8.1.2, published', pic: K.publishedDefault, dup: 0, color: C.amber, dashed: true},
  ];
  return (
    <>
      <Over text="Chapter 1 · constant frame rate" o={ep(t, 0.1, 0.6)} />
      <Title text="Say nothing about the rate, get copies." o={ep(t, 0.2, 0.9)} />
      {rows.map((r, i) => {
        const y = 290 + i * 108;
        const o = fr(t, dur, 0.08 + i * 0.1, 0.16 + i * 0.1);
        const p = fr(t, dur, 0.1 + i * 0.1, 0.22 + i * 0.1);
        return (
          <React.Fragment key={i}>
            <Txt x={X0} y={y - 2} w={500} mono size={26} color={C.text} weight={700} o={o}>{r.label}</Txt>
            <Txt x={X0} y={y + 32} w={500} size={22} o={o}>{r.sub}</Txt>
            <Bar x={x0} y={y} w={r.pic * scale * p} h={64} color={r.color === C.red ? C.cyan : r.color} dashed={r.dashed} o={o} text={r.dup ? undefined : `${r.pic} frames`} />
            {r.dup > 0 && <Bar x={x0 + r.pic * scale * p} y={y} w={r.dup * scale * p} h={64} color={C.red} hatch o={o} text={`${r.pic + r.dup} frames: ${r.dup} duplicates`} />}
          </React.Fragment>
        );
      })}
      <Rule y={840} color={C.line} h={2} o={fr(t, dur, 0.7, 0.74)} />
      <Txt x={X0} y={856} w={1680} size={30} color={C.green} weight={700} o={fr(t, dur, 0.74, 0.8)}>{K.distinct} distinct pictures in every variant. Hatched: copies of a picture that already exists.</Txt>
    </>
  );
};

/* ---------------------------------------------------------------- 5. -r before and after */
const RFlag: React.FC<SceneProps> = ({t, dur}) => {
  const L = EV.rflag;
  const x0 = 640, px = 900 / 6.4; // seconds to pixels
  const rows = [
    {label: 'source clip', sub: `${L.srcFrames} frames`, frames: L.srcFrames, sec: L.srcSec, color: C.cyan},
    {label: '-r 10 after -i', sub: 'drops frames', frames: L.after.frames, sec: L.after.sec, color: C.amber},
    {label: '-vf fps=10', sub: 'the exact way', frames: L.fps.frames, sec: L.fps.sec, color: C.green},
    {label: '-r 10 before -i', sub: 'relabels the clock', frames: L.before.frames, sec: L.before.sec, color: C.red},
  ];
  return (
    <>
      <Over text="Chapter 2 · dash r, before or after" o={ep(t, 0.1, 0.6)} />
      <Title text="After: frames. Before: the clock." o={ep(t, 0.2, 0.9)} />
      {rows.map((r, i) => {
        const y = 290 + i * 122;
        const o = fr(t, dur, 0.08 + i * 0.12, 0.16 + i * 0.12);
        const p = fr(t, dur, 0.1 + i * 0.12, 0.26 + i * 0.12);
        const w = r.sec * px * p;
        return (
          <React.Fragment key={i}>
            <Txt x={X0} y={y} w={500} mono size={28} color={C.text} weight={700} o={o}>{r.label}</Txt>
            <Txt x={X0} y={y + 36} w={500} size={22} o={o}>{r.sub}</Txt>
            <div style={{position: 'absolute', left: x0, top: y, width: w, height: 70, background: C.bg2, border: `3px solid ${r.color}`, boxSizing: 'border-box', opacity: o, overflow: 'hidden'}}>
              {Array.from({length: r.frames}, (_, k) => <div key={k} style={{position: 'absolute', left: (k + 0.5) * (r.sec * px / r.frames) - 1.5, top: 8, width: 3, height: 50, background: r.color}} />)}
            </div>
            <Txt x={x0 + w + 18} y={y + 8} w={420} display size={38} color={C.text} o={o * (p > 0.9 ? 1 : 0)}>{r.frames} frames · {r.sec} s</Txt>
          </React.Fragment>
        );
      })}
      {[0, 2, 4, 6].map((s) => (<React.Fragment key={s}><div style={{position: 'absolute', left: x0 + s * px - 1, top: 770, width: 3, height: 14, background: C.text}} /><Txt x={x0 + s * px - 40} y={790} w={80} align="center" mono size={22}>{s} s</Txt></React.Fragment>))}
      <Rule y={768} x={x0} w={6 * px} h={3} />
      <Txt x={X0} y={860} w={1500} size={26} o={fr(t, dur, 0.8, 0.86)}>With -c copy, -r before -i changes nothing: {L.copy.fps} fps, {L.copy.sec} s.</Txt>
    </>
  );
};

/* ---------------------------------------------------------------- 6. fps=1 */
const Fps1: React.FC<SceneProps> = ({t, dur}) => {
  const F1 = EV.fps1;
  const cell = 44, gap = 6, row = (n: number) => X0 + n * (cell + gap);
  const sec = (y: number, lit: Record<number, string>, label: string, lab2: string, o: number) => (
    <>
      <Txt x={X0} y={y - 40} w={900} mono size={26} color={C.text} weight={700} o={o}>{label}</Txt>
      <Txt x={1100} y={y - 40} w={700} size={26} align="right" o={o}>{lab2}</Txt>
      {[0, 1].map((r) => Array.from({length: 25}, (_, c) => {
        const n = r * 25 + c, col = lit[n];
        return <div key={n} style={{position: 'absolute', left: row(c), top: y + r * (cell + gap), width: cell, height: cell, boxSizing: 'border-box', opacity: o, background: col ?? 'transparent', border: `2px solid ${col ?? C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: 16, fontWeight: 700, color: col ? C.bg : C.mute}}>{n}</div>;
      }))}
    </>
  );
  const near = Object.fromEntries(F1.near.filter((n: number) => n < 50).map((n: number) => [n, C.red]));
  const up = Object.fromEntries(F1.up.filter((n: number) => n < 50).map((n: number) => [n, C.green]));
  return (
    <>
      <Over text="Chapter 3 · which frame does fps keep" o={ep(t, 0.1, 0.6)} />
      <Title text="fps=1 does not take the first frame." o={ep(t, 0.2, 0.9)} />
      {sec(320, near, 'fps=1 · 25 fps clip, frame N has luma N', `kept ${F1.near.slice(0, 3).join(', ')}: first at ${F1.firstAt} s`, fr(t, dur, 0.1, 0.2))}
      {sec(500, up, 'fps=1:round=up', `kept ${F1.up.join(', ')}: the first frame of each second`, fr(t, dur, 0.34, 0.44))}
      <Rule y={680} color={C.line} h={2} o={fr(t, dur, 0.52, 0.56)} />
      <Txt x={X0} y={700} w={900} mono size={26} color={C.text} weight={700} o={fr(t, dur, 0.56, 0.62)}>fps=24 · 60 fps clip</Txt>
      {Array.from({length: 14}, (_, n) => {
        const k = F1.s60.includes(n), zero = n === 0;
        return <div key={n} style={{position: 'absolute', left: X0 + n * 74, top: 748, width: 64, height: 64, boxSizing: 'border-box', opacity: fr(t, dur, 0.58 + n * 0.008, 0.66 + n * 0.008), background: k ? C.amber : 'transparent', border: `3px ${zero ? 'dashed' : 'solid'} ${zero ? C.red : k ? C.amber : C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: 24, fontWeight: 700, color: k ? C.bg : zero ? C.red : C.mute}}>{n}</div>;
      })}
      <Txt x={X0 + 14 * 74 + 20} y={752} w={600} display size={34} color={C.red} o={fr(t, dur, 0.72, 0.8)}>frame 0 is never used</Txt>
      <Txt x={X0 + 14 * 74 + 20} y={800} w={600} size={24} o={fr(t, dur, 0.74, 0.82)}>kept {F1.s60.join(', ')}: steps of 2 and 3</Txt>
    </>
  );
};

/* ---------------------------------------------------------------- 7. setpts */
const Setpts: React.FC<SceneProps> = ({t, dur}) => {
  const S = EV.setpts;
  const x0 = 640, px = 1080 / 10;
  const rows = [
    {label: 'picture', sub: 'after setpts=0.5*PTS', v: S.picture, color: C.red},
    {label: 'audio', sub: 'untouched', v: S.audio, color: C.amber},
    {label: 'container', sub: 'longest stream wins', v: S.container, color: C.mute},
  ];
  return (
    <>
      <Over text="Chapter 4 · speed up with setpts" o={ep(t, 0.1, 0.6)} />
      <Title text="The picture is fast. The sound is not." o={ep(t, 0.2, 0.9)} />
      {rows.map((r, i) => {
        const y = 290 + i * 100;
        const o = fr(t, dur, 0.08 + i * 0.1, 0.16 + i * 0.1);
        const p = fr(t, dur, 0.1 + i * 0.1, 0.24 + i * 0.1);
        return (
          <React.Fragment key={i}>
            <Txt x={X0} y={y} w={500} mono size={28} color={C.text} weight={700} o={o}>{r.label}</Txt>
            <Txt x={X0} y={y + 36} w={500} size={22} o={o}>{r.sub}</Txt>
            <Bar x={x0} y={y} w={r.v * px * p} h={64} color={r.color} o={o} text={`${r.v} s`} />
          </React.Fragment>
        );
      })}
      {[0, 2, 4, 6, 8, 10].map((s) => (<React.Fragment key={s}><div style={{position: 'absolute', left: x0 + s * px - 1, top: 596, width: 3, height: 14, background: C.text}} /><Txt x={x0 + s * px - 40} y={616} w={80} align="center" mono size={22}>{s} s</Txt></React.Fragment>))}
      <Rule y={594} x={x0} w={10 * px} h={3} />
      <Rule y={670} color={C.line} h={2} o={fr(t, dur, 0.5, 0.54)} />
      <Txt x={X0} y={692} w={700} mono size={26} color={C.text} weight={700} o={fr(t, dur, 0.54, 0.6)}>default 30 fps output</Txt>
      {Array.from({length: 14}, (_, n) => {
        const k = S.keptFirst.includes(n);
        return <div key={n} style={{position: 'absolute', left: X0 + n * 70, top: 740, width: 60, height: 60, boxSizing: 'border-box', opacity: fr(t, dur, 0.56 + n * 0.008, 0.64 + n * 0.008), background: k ? C.amber : 'transparent', border: `3px ${k ? 'solid' : 'dashed'} ${k ? C.amber : C.red}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: 22, fontWeight: 700, color: k ? C.bg : C.red}}>{n}</div>;
      })}
      <Txt x={X0 + 14 * 70 + 30} y={724} w={700} display size={64} color={C.text} o={fr(t, dur, 0.7, 0.78)}>{S.kept} of {S.of}</Txt>
      <Txt x={X0 + 14 * 70 + 30} y={800} w={700} size={24} o={fr(t, dur, 0.72, 0.8)}>frames survive: 0 to 3, then every second one</Txt>
    </>
  );
};

/* ---------------------------------------------------------------- 8. atempo */
const Wave: React.FC<{x: number; y: number; w: number; h: number; cycles: number; color: string; p?: number}> = ({x, y, w, h, cycles, color, p = 1}) => {
  const pts = Array.from({length: 241}, (_, i) => { const u = i / 240; return `${(u * w).toFixed(1)},${(h / 2 - Math.sin(u * cycles * 2 * Math.PI) * (h / 2 - 6)).toFixed(1)}`; }).join(' ');
  return (
    <svg style={{position: 'absolute', left: x, top: y}} width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} />
    </svg>
  );
};
const Atempo: React.FC<SceneProps> = ({t, dur}) => {
  const A = EV.atempo, S = EV.setpts;
  const x0 = 640, px = 800 / 10;
  return (
    <>
      <Over text="Chapter 4 · fix the sound" o={ep(t, 0.1, 0.6)} />
      <Title text="atempo=2 moves the sound, not the pitch." o={ep(t, 0.2, 0.9)} />
      <Txt x={X0} y={290} w={500} mono size={28} color={C.text} weight={700} o={fr(t, dur, 0.06, 0.12)}>picture</Txt>
      <Bar x={x0} y={284} w={A.picture * px * fr(t, dur, 0.08, 0.2)} h={56} color={C.green} o={fr(t, dur, 0.06, 0.12)} text={`${A.picture} s`} />
      <Txt x={X0} y={372} w={500} mono size={28} color={C.text} weight={700} o={fr(t, dur, 0.16, 0.22)}>audio with atempo=2</Txt>
      <Bar x={x0} y={366} w={S.audio * px} h={56} color={C.cyan} dashed o={fr(t, dur, 0.16, 0.22) * 0.6} />
      <Bar x={x0} y={366} w={A.audio * px * fr(t, dur, 0.2, 0.34)} h={56} color={C.green} o={fr(t, dur, 0.16, 0.22)} text={`${A.audio} s`} />
      <Txt x={x0 + S.audio * px + 18} y={372} w={400} size={22} o={fr(t, dur, 0.34, 0.4)}>dashed: the old {S.audio} s</Txt>
      <Rule y={470} color={C.line} h={2} o={fr(t, dur, 0.4, 0.44)} />
      <Stat x={X0} y={496} w={780} label={`atempo=2 · ${A.audio} s`} value={`${A.hz} Hz`} sub="same pitch as the source" color={C.green} size={96} o={fr(t, dur, 0.44, 0.52)} />
      <Wave x={X0} y={690} w={780} h={150} cycles={4} color={C.green} p={fr(t, dur, 0.5, 0.66)} />
      <Stat x={X0 + 900} y={496} w={780} label={`asetrate=88200,aresample=44100 · ${A.rateAudio} s`} value={`${A.rateHz} Hz`} sub="twice as high: not what you asked" color={C.amber} size={96} o={fr(t, dur, 0.6, 0.68)} />
      <Wave x={X0 + 900} y={690} w={780} h={150} cycles={8} color={C.amber} p={fr(t, dur, 0.66, 0.82)} />
    </>
  );
};

/* ---------------------------------------------------------------- 9. stream_loop */
const PlayRow: React.FC<{y: number; label: string; sub: string; heads: number[]; frames: number; sec: number; color: string; dashed?: boolean; o: number; p: number; ghost?: boolean}> = ({y, label, sub, heads, frames, sec, color, dashed = false, o, p, ghost = false}) => {
  const x0 = 520, px = 1200 / 12.5, L = EV.loop;
  return (
    <>
      <Txt x={X0} y={y - 4} w={380} mono size={26} color={C.text} weight={700} o={o}>{label}</Txt>
      <Txt x={X0} y={y + 30} w={380} size={22} o={o}>{sub}</Txt>
      {heads.map((h, k) => {
        const start = x0 + k * L.playSec * px;
        const lost = (h / 30) * px;
        return (
          <React.Fragment key={k}>
            <div style={{position: 'absolute', left: start + lost, top: y, width: (L.playSec * px - lost) * p - 4, height: 62, boxSizing: 'border-box', background: dashed ? 'transparent' : color, border: dashed ? `4px dashed ${color}` : 'none', opacity: o}} />
            {h > 0 && <div style={{position: 'absolute', left: start, top: y, width: Math.max(lost, 6), height: 62, background: C.red, opacity: o * (p > 0.9 ? 1 : 0)}} />}
            {h > 0 && <Txt x={start - 30} y={y - 34} w={140} size={20} mono color={C.red} o={o * (p > 0.9 ? 1 : 0)}>{h} lost</Txt>}
          </React.Fragment>
        );
      })}
      <Txt x={x0 + 3 * L.playSec * px + 6} y={y + 8} w={300} display size={32} color={C.text} o={o * (p > 0.9 ? 1 : 0)}>{frames} · {sec} s</Txt>
    </>
  );
};
const Loop: React.FC<SceneProps> = ({t, dur}) => {
  const L = EV.loop, x0 = 520, px = 1200 / 12.5;
  return (
    <>
      <Over text="Chapter 5 · stream loop" o={ep(t, 0.1, 0.6)} />
      <Title text="The loop follows the audio." o={ep(t, 0.2, 0.9)} />
      <Cmd y={246} lines={['ffmpeg -stream_loop 2 -i in.mkv out.mkv']} hi={['-stream_loop 2']} color={C.cyan} size={28} o={fr(t, dur, 0.08, 0.14)} w={900} />
      <PlayRow y={420} label={`audio ${L.playSec} s, picture ${L.playSec} s`} sub="exact" heads={[0, 0, 0]} frames={L.eq.frames} sec={L.eq.sec} color={C.green} o={fr(t, dur, 0.14, 0.22)} p={fr(t, dur, 0.16, 0.3)} />
      <PlayRow y={560} label={`audio ${L.short.audioSec} s · ${EV.build}`} sub="re-encoded" heads={L.short.heads} frames={L.short.frames} sec={L.short.sec} color={C.cyan} o={fr(t, dur, 0.34, 0.42)} p={fr(t, dur, 0.36, 0.5)} />
      <PlayRow y={700} label={`audio ${L.short.audioSec} s · 8.1.2`} sub="published" heads={L.published.heads} frames={L.published.frames} sec={L.published.sec} color={C.amber} dashed o={fr(t, dur, 0.56, 0.64)} p={fr(t, dur, 0.58, 0.72)} />
      {[0, 4, 8, 12].map((s) => (<React.Fragment key={s}><div style={{position: 'absolute', left: x0 + s * px - 1, top: 802, width: 3, height: 14, background: C.text}} /><Txt x={x0 + s * px - 40} y={822} w={80} align="center" mono size={22}>{s} s</Txt></React.Fragment>))}
      <Rule y={800} x={x0} w={12 * px} h={3} />
      <Txt x={X0} y={880} w={1200} size={24} o={fr(t, dur, 0.6, 0.68)}>red: frames lost at the start of a play</Txt>
    </>
  );
};

/* ---------------------------------------------------------------- 10. longer audio and copy */
const Loop2: React.FC<SceneProps> = ({t, dur}) => {
  const L = EV.loop2, P = EV.loop, x0 = 520, px = 1200 / 12.5;
  const blocks = (y: number, step: number, len: number, color: string, hole: number, o: number, p: number) => (
    <>
      {[0, 1, 2].map((k) => (
        <React.Fragment key={k}>
          <div style={{position: 'absolute', left: x0 + k * step * px, top: y, width: (len * px) * p, height: 62, background: color, opacity: o}} />
          {k < 2 && <div style={{position: 'absolute', left: x0 + (k * step + len) * px, top: y - 10, width: Math.max(6, hole * px), height: 82, background: C.red, opacity: o * (p > 0.9 ? 1 : 0)}} />}
        </React.Fragment>
      ))}
    </>
  );
  const o1 = fr(t, dur, 0.1, 0.18), o2 = fr(t, dur, 0.5, 0.58);
  return (
    <>
      <Over text="Chapter 5 · longer audio, and copy" o={ep(t, 0.1, 0.6)} />
      <Title text="Holes at every seam." o={ep(t, 0.2, 0.9)} />
      <Txt x={X0} y={262} w={1680} mono size={28} color={C.text} weight={700} o={o1}>audio {L.longAudio.audioSec} s, re-encoded → {L.longAudio.sec} s</Txt>
      <Txt x={X0} y={340} w={380} mono size={24} o={o1}>picture</Txt>
      {blocks(330, P.playSec + 0.1, P.playSec - 0.1 + 0.0, C.cyan, L.longAudio.hole, o1, fr(t, dur, 0.12, 0.26))}
      <Txt x={X0} y={420} w={380} mono size={24} o={o1}>sound</Txt>
      <div style={{position: 'absolute', left: x0, top: 410, width: L.longAudio.sec * px * fr(t, dur, 0.14, 0.28), height: 62, background: C.green, opacity: o1}} />
      <Txt x={x0 + 1000} y={500} w={400} display size={34} color={C.red} o={o1 * fr(t, dur, 0.28, 0.34)}>picture holes {L.longAudio.hole} s</Txt>
      <Rule y={566} color={C.line} h={2} o={o2} />
      <Txt x={X0} y={590} w={1680} mono size={28} color={C.text} weight={700} o={o2}>audio {EV.loop.short.audioSec} s, -c copy → picture {EV.loop.eq.sec} s, {L.copy.frames} frames</Txt>
      <Txt x={X0} y={668} w={380} mono size={24} o={o2}>picture</Txt>
      <div style={{position: 'absolute', left: x0, top: 658, width: P.eq.sec * px * fr(t, dur, 0.52, 0.66), height: 62, background: C.cyan, opacity: o2}} />
      <Txt x={X0} y={758} w={380} mono size={24} o={o2}>sound</Txt>
      {blocks(748, 4, 3.9, C.green, L.copy.hole, o2, fr(t, dur, 0.54, 0.68))}
      <Txt x={x0 + 1000} y={830} w={500} display size={34} color={C.red} o={o2 * fr(t, dur, 0.68, 0.74)}>sound holes {L.copy.hole} s</Txt>
    </>
  );
};

/* ---------------------------------------------------------------- 11. together */
const Together: React.FC<SceneProps> = ({t, dur}) => {
  const H = EV.hook, R = EV.recipe;
  const x0 = 520, scale = 1180 / 900;
  return (
    <>
      <Over text="Put it together · speed up 2x, loop 3x" o={ep(t, 0.1, 0.6)} />
      <Title text="The obvious command keeps every frame." o={ep(t, 0.2, 0.9)} />
      <Cmd y={246} lines={['ffmpeg -stream_loop 2 -i in.mkv -vf setpts=0.5*PTS', '       -af atempo=2 -fps_mode passthrough out.mkv']} hi={['-fps_mode passthrough']} color={C.red} size={28} o={fr(t, dur, 0.08, 0.14)} />
      <Txt x={X0} y={420} w={380} mono size={26} color={C.text} weight={700} o={fr(t, dur, 0.16, 0.22)}>frames</Txt>
      <Bar x={x0} y={410} w={H.frames * scale * fr(t, dur, 0.18, 0.3)} h={62} color={C.cyan} o={fr(t, dur, 0.16, 0.22)} text={`${H.frames} · ${R.sec} s`} />
      <Txt x={X0} y={510} w={380} mono size={26} color={C.text} weight={700} o={fr(t, dur, 0.34, 0.4)}>distinct timestamps</Txt>
      <Bar x={x0} y={500} w={H.distinctPass * scale * fr(t, dur, 0.36, 0.5)} h={62} color={C.red} o={fr(t, dur, 0.34, 0.4)} text={`${H.distinctPass}`} />
      <Rule y={600} color={C.line} h={2} o={fr(t, dur, 0.5, 0.54)} />
      <TimeStrip ms={H.passMs.slice(0, 12)} x={X0 + 20} y={620} w={760} t1={200} chip={42} color={C.cyan} bad p={fr(t, dur, 0.54, 0.7)} axis={false} />
      <Txt x={920} y={650} w={880} display size={44} color={C.text} o={fr(t, dur, 0.68, 0.74)}>Frames come in groups that share one time.</Txt>
      <Txt x={920} y={730} w={880} size={26} o={fr(t, dur, 0.72, 0.78)}>Order and length are right. A player may drop or merge the frames that share a time. Both readers see the same {H.distinctPass}.</Txt>
    </>
  );
};

/* ---------------------------------------------------------------- 12. recipe */
const Recipe: React.FC<SceneProps> = ({t, dur}) => {
  const R = EV.recipe, H = EV.hook;
  const rows = [
    {k: 'frames', v: `${R.frames}`, d: `in source order: 0 to ${R.srcFrames - 1}, ${R.plays} times`},
    {k: 'timestamps', v: `${R.distinct}`, d: `all distinct · gaps of ${R.gapMin} to ${R.gapMax} ms`},
    {k: 'length', v: `${R.sec} s`, d: 'picture, sound and container'},
    {k: 'pitch', v: `${R.hz} Hz`, d: 'two pitch readers agree'},
  ];
  return (
    <>
      <Over text="The recipe" color={C.green} o={ep(t, 0.1, 0.6)} />
      <Title text="Name the output rate." o={ep(t, 0.2, 0.9)} />
      <Cmd y={246} lines={['ffmpeg -stream_loop 2 -i in.mkv', '       -vf setpts=0.5*PTS,fps=60 -af atempo=2 out.mkv']} hi={['fps=60', 'atempo=2']} color={C.green} size={30} o={fr(t, dur, 0.08, 0.14)} />
      {rows.map((r, i) => (
        <React.Fragment key={i}>
          <Rule y={424 + i * 88} color={C.line} h={2} o={fr(t, dur, 0.16 + i * 0.1, 0.2 + i * 0.1)} />
          <div style={{position: 'absolute', left: X0, top: 436 + i * 88, width: 40, height: 40, background: C.green, opacity: fr(t, dur, 0.18 + i * 0.1, 0.24 + i * 0.1)}} />
          <Txt x={X0 + 64} y={438 + i * 88} w={300} mono size={26} color={C.text} weight={700} o={fr(t, dur, 0.18 + i * 0.1, 0.24 + i * 0.1)}>{r.k}</Txt>
          <Txt x={X0 + 360} y={424 + i * 88} w={420} display size={54} color={C.text} o={fr(t, dur, 0.18 + i * 0.1, 0.24 + i * 0.1)}>{r.v}</Txt>
          <Txt x={X0 + 780} y={440 + i * 88} w={900} size={28} o={fr(t, dur, 0.18 + i * 0.1, 0.24 + i * 0.1)}>{r.d}</Txt>
        </React.Fragment>
      ))}
      <TimeStrip ms={H.recipeMs.slice(0, 18)} x={X0 + 20} y={820} w={1500} t1={300} chip={34} color={C.green} p={fr(t, dur, 0.6, 0.8)} axis={false} maxStack={1} />
      <Txt x={X0} y={884} w={1500} size={24} o={fr(t, dur, 0.7, 0.8)}>The first 18 of {R.frames} frames, at their real times: one frame, one distinct time.</Txt>
    </>
  );
};

/* ---------------------------------------------------------------- 13. controls */
const Controls: React.FC<SceneProps> = ({t, dur}) => {
  const Q = EV.controls;
  const col = (i: number) => X0 + i * 580;
  const o = (i: number) => fr(t, dur, 0.08 + i * 0.2, 0.16 + i * 0.2);
  const p = (i: number) => fr(t, dur, 0.12 + i * 0.2, 0.26 + i * 0.2);
  return (
    <>
      <Over text="Controls · each one breaks one thing" o={ep(t, 0.1, 0.6)} />
      <Title text="The readers catch every near miss." o={ep(t, 0.2, 0.9)} />
      {/* -r 60 */}
      <Rule y={270} x={col(0)} w={520} color={C.red} h={8} o={o(0)} />
      <Txt x={col(0)} y={290} w={520} mono size={26} color={C.text} weight={700} o={o(0)}>-r 60 after -i</Txt>
      <Txt x={col(0)} y={330} w={520} display size={96} color={C.text} o={o(0)}>{Q.rFlag.frames}</Txt>
      <Txt x={col(0)} y={440} w={520} size={26} o={o(0)}>frames, not {EV.recipe.frames}</Txt>
      {Q.rFlag.first.map((n: number, k: number) => <Chip key={k} x={col(0) + k * 82} y={520} w={72} h={72} n={n} color={k === 1 ? C.red : C.cyan} fill={k === 1 ? C.redDim : undefined} o={o(0) * p(0)} />)}
      <Txt x={col(0)} y={608} w={520} size={26} o={o(0) * p(0)}>frame 0 is shown twice</Txt>
      {/* no atempo */}
      <Rule y={270} x={col(1)} w={520} color={C.amber} h={8} o={o(1)} />
      <Txt x={col(1)} y={290} w={520} mono size={26} color={C.text} weight={700} o={o(1)}>without atempo=2</Txt>
      <Txt x={col(1)} y={330} w={520} display size={96} color={C.text} o={o(1)}>{Q.noAtempo.audio} s</Txt>
      <Txt x={col(1)} y={440} w={520} size={26} o={o(1)}>of sound under {Q.noAtempo.picture} s of picture</Txt>
      <Bar x={col(1)} y={520} w={Q.noAtempo.audio * 17 * p(1)} h={30} color={C.amber} o={o(1)} />
      <Bar x={col(1)} y={566} w={Q.noAtempo.picture * 17 * p(1)} h={30} color={C.green} o={o(1)} />
      <Txt x={col(1)} y={608} w={520} size={26} o={o(1) * p(1)}>sound: amber · picture: green</Txt>
      {/* no rate */}
      <Rule y={270} x={col(2)} w={520} color={C.red} h={8} o={o(2)} />
      <Txt x={col(2)} y={290} w={520} mono size={26} color={C.text} weight={700} o={o(2)}>no output rate</Txt>
      <Txt x={col(2)} y={330} w={520} display size={96} color={C.text} o={o(2)}>{Q.defaultFps.frames}</Txt>
      <Txt x={col(2)} y={440} w={520} size={26} o={o(2)}>frames kept of {EV.recipe.frames}</Txt>
      {Array.from({length: 12}, (_, n) => { const k = Q.defaultFps.first.includes(n); return <Chip key={n} x={col(2) + (n % 6) * 86} y={520 + Math.floor(n / 6) * 80} w={76} h={70} n={n} color={k ? C.cyan : C.red} fill={k ? undefined : C.redDim} o={o(2) * p(2)} />; })}
      <Txt x={col(0)} y={730} w={1680} size={30} color={C.green} weight={700} o={fr(t, dur, 0.8, 0.88)}>Each one is caught by a reader: frame md5 and code, packet timestamps, sample count.</Txt>
    </>
  );
};

/* ---------------------------------------------------------------- 14. decide */
const Decide: React.FC<SceneProps> = ({t, dur}) => {
  const V = EV.vfr, L = EV.rflag, F1 = EV.fps1, R = EV.recipe, P = EV.loop;
  const rows = [
    {want: 'Every frame, the real clock', use: '-fps_mode passthrough', saw: `${V.frames} frames kept`, color: C.green},
    {want: 'A constant rate', use: 'name it: -vf fps=…', saw: `${L.fps.frames} frames, not ${L.after.frames}`, color: C.cyan},
    {want: 'One frame per second', use: 'fps=1:round=up', saw: `frames ${F1.up.join(', ')}`, color: C.amber},
    {want: 'Speed up 2x', use: 'setpts=0.5*PTS,fps=60 + atempo=2', saw: `${R.frames} frames, ${R.sec} s`, color: C.red},
    {want: 'Loop', use: 'equal audio and picture length', saw: `${P.eq.frames} frames, ${P.eq.sec} s`, color: C.cyan},
  ];
  return (
    <>
      <Over text="Which command do I use" o={ep(t, 0.1, 0.6)} />
      <Title text="Decide what to keep, then say it." o={ep(t, 0.2, 0.9)} />
      <Txt x={X0} y={262} w={600} mono size={20} o={fr(t, dur, 0.06, 0.12)}>I WANT</Txt>
      <Txt x={X0 + 620} y={262} w={620} mono size={20} o={fr(t, dur, 0.06, 0.12)}>USE</Txt>
      <Txt x={X0 + 1300} y={262} w={380} mono size={20} o={fr(t, dur, 0.06, 0.12)}>MEASURED</Txt>
      {rows.map((r, i) => {
        const o = fr(t, dur, 0.1 + i * 0.12, 0.18 + i * 0.12), y = 296 + i * 118;
        return (
          <React.Fragment key={i}>
            <Rule y={y} color={C.text} h={3} o={o} />
            <div style={{position: 'absolute', left: X0, top: y + 3, width: 12, height: 112, background: r.color, opacity: o}} />
            <Txt x={X0 + 30} y={y + 30} w={570} display size={46} color={C.text} o={o}>{r.want}</Txt>
            <Txt x={X0 + 620} y={y + 34} w={650} mono size={24} color={C.text} weight={700} o={o}>{r.use}</Txt>
            <Txt x={X0 + 1300} y={y + 34} w={380} size={28} o={o}>{r.saw}</Txt>
          </React.Fragment>
        );
      })}
      <Rule y={296 + 5 * 118} color={C.text} h={3} o={fr(t, dur, 0.74, 0.8)} />
    </>
  );
};

/* ---------------------------------------------------------------- 15. cheat sheet */
const Cheat: React.FC<SceneProps> = ({t, dur}) => {
  const tiles = [
    {flag: '-fps_mode passthrough', d: 'keeps every frame and the gaps. Not new timestamps.', color: C.green},
    {flag: 'fps=60', d: 'names the output rate: one frame, one distinct time.', color: C.cyan},
    {flag: '-r before -i', d: 'changes the clock: all frames, a new length.', color: C.red},
    {flag: 'round=up', d: 'the first frame of each second, not the middle.', color: C.amber},
    {flag: 'setpts + atempo', d: 'speed up the picture and the sound together.', color: C.cyan},
    {flag: '-stream_loop', d: 'follows the audio. Match both lengths first.', color: C.red},
  ];
  return (
    <>
      <Over text="Cheat sheet" o={ep(t, 0.1, 0.6)} />
      <Title text="Six flags, one check." o={ep(t, 0.2, 0.9)} />
      {tiles.map((x, i) => {
        const cx = X0 + (i % 3) * 570, cy = 270 + Math.floor(i / 3) * 250, o = fr(t, dur, 0.08 + i * 0.09, 0.16 + i * 0.09);
        return (
          <div key={i} style={{position: 'absolute', left: cx, top: cy, width: 540, opacity: o}}>
            <div style={{height: 10, background: x.color}} />
            <div style={{marginTop: 18, fontFamily: F.mono, fontWeight: 700, fontSize: 31, color: C.text}}>{x.flag}</div>
            <div style={{marginTop: 10, fontFamily: F.sans, fontSize: 27, lineHeight: 1.3, color: C.dim}}>{x.d}</div>
          </div>
        );
      })}
      <Rule y={800} h={3} o={fr(t, dur, 0.7, 0.76)} />
      <Txt x={X0} y={818} w={1680} display size={44} color={C.text} o={fr(t, dur, 0.74, 0.82)}>Check: frame count, distinct timestamps, picture and sound length.</Txt>
    </>
  );
};

/* ---------------------------------------------------------------- 16. limits */
const Limits: React.FC<SceneProps> = ({t, dur}) => (
  <>
    <Over text="What we did not test" o={ep(t, 0.1, 0.6)} />
    <Title text="Where these numbers stop." o={ep(t, 0.2, 0.9)} />
    <Stat x={X0} y={290} w={520} label="Measured" value={`ffmpeg ${EV.build}`} sub="every number on screen, with controls" color={C.green} size={48} o={fr(t, dur, 0.1, 0.18)} />
    <Stat x={X0 + 580} y={290} w={520} label="Published" value="ffmpeg 8.1.2" sub={'two numbers, from episodes 5 and 33\n(drawn dashed)'} color={C.amber} size={48} o={fr(t, dur, 0.2, 0.28)} />
    <Stat x={X0 + 1160} y={290} w={520} label="Not run" value="the recipe on 8.1.2" sub="the PC has not seen it yet" color={C.red} size={48} o={fr(t, dur, 0.3, 0.38)} />
    <Rule y={560} color={C.line} h={2} o={fr(t, dur, 0.42, 0.46)} />
    {[
      ['Variable frame rate input', 'with a speed up'],
      ['Other containers and codecs', 'other speeds, chained atempo'],
      ['Real footage', 'editors and players'],
    ].map((r, i) => (
      <React.Fragment key={i}>
        <Txt x={X0 + i * 570} y={590} w={540} display size={46} color={C.text} o={fr(t, dur, 0.48 + i * 0.1, 0.56 + i * 0.1)}>{r[0]}</Txt>
        <Txt x={X0 + i * 570} y={660} w={540} size={28} o={fr(t, dur, 0.5 + i * 0.1, 0.58 + i * 0.1)}>{r[1]}</Txt>
      </React.Fragment>
    ))}
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {
  hook: Hook, method: Method, vfr: Vfr, cfr: Cfr, rflag: RFlag, fps1: Fps1, setpts: Setpts, atempo: Atempo,
  loop: Loop, loop2: Loop2, together: Together, recipe: Recipe, controls: Controls, decide: Decide, cheat: Cheat, limits: Limits,
};
void W; void prog;
