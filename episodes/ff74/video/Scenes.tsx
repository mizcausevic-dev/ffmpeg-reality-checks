import React from 'react';
import {C, F} from '../../kit/theme';
import {ep, prog, blink} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Fireship style fast code. Hard cuts every 2 to 3 seconds, huge monospace code typed on a flat ink panel,
 * a quick wipe on every cut, one on-screen counter (frames out), one punch-line number per scene.
 * Every cell, tick and number below is drawn from evidence.json written by episodes/ff74/fixture/run.mjs. ffmpeg 6.1.1.
 */

const DATA = {"cases": 80, "runs": [[[0, 49]], [[0, 13], [9, 49]], [[0, 13], [9, 13], [9, 49]], [[0, 13], [9, 13], [9, 13], [9, 49]]], "fps": [{"fps": 10, "frames": 55, "secs": 5.5, "extra": 0.5, "runs": [[0, 13], [9, 49]]}, {"fps": 25, "frames": 55, "secs": 2.2, "extra": 0.2, "runs": [[0, 13], [9, 49]]}, {"fps": 50, "frames": 55, "secs": 1.1, "extra": 0.1, "runs": [[0, 13], [9, 49]]}], "start": [{"s": 0, "from": 0, "to": 4, "frames": 55}, {"s": 1, "from": 0, "to": 4, "frames": 55}, {"s": 2, "from": 1, "to": 5, "frames": 55}, {"s": 10, "from": 9, "to": 13, "frames": 55}, {"s": 48, "from": 47, "to": 49, "frames": 53}], "start10": [[0, 13], [9, 49]], "size100": {"from": 9, "len": 41, "frames": 91}, "time": [{"label": "time=0.4", "from": 0, "frames": 53}, {"label": "start=30:time=0.4", "from": 10, "frames": 53}, {"label": "start=-1:time=0.4", "from": 10, "frames": 53}, {"label": "start=-1:time=0", "from": 0, "frames": 53}, {"label": "start=-1", "from": null, "frames": 50}, {"label": "start=60", "from": null, "frames": 50}, {"label": "size=0:start=10", "from": null, "frames": 50}], "inf": {"frames": 120, "runs": [[0, 13], [9, 13], [9, 13], [9, 13], [9, 13], [9, 13], [9, 13], [9, 13], [9, 13]]}};

const expand = (runs: number[][]) => runs.flatMap(([a, b]) => Array.from({length: b - a + 1}, (_, i) => a + i));
const playsOf = (ids: number[]) => { const seen = new Map<number, number>(); return ids.map((id) => { const k = (seen.get(id) ?? 0) + 1; seen.set(id, k); return k; }); };

/* ---------- layout ---------- */
const X0 = 96, W0 = 1728;

type Shot = {i: number; lt: number; len: number};
const shotOf = (t: number, dur: number, cuts: number[]): Shot => {
  const f = t / dur; let i = 0;
  while (i < cuts.length && f >= cuts[i]) i++;
  const a = i ? cuts[i - 1] : 0, b = i < cuts.length ? cuts[i] : 1;
  return {i, lt: (f - a) * dur, len: (b - a) * dur};
};

const Stage: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <>
    <div style={{position: 'absolute', inset: 0, background: C.bg}} />
    {children}
  </>
);

/** the quick wipe on every cut: an ink slab sweeps across, the cut happens while it covers the frame */
const Wipes: React.FC<{t: number; dur: number; cuts: number[]}> = ({t, dur, cuts}) => (
  <>
    {cuts.map((c, k) => {
      const p = prog(t, c * dur - 0.12, c * dur + 0.12);
      if (p <= 0 || p >= 1) return null;
      const xr = 1920 * ep(p, 0, 0.5), xl = 1920 * Math.pow(prog(p, 0.5, 1), 2);
      return (
        <React.Fragment key={k}>
          <div style={{position: 'absolute', top: 0, bottom: 0, left: xl, width: Math.max(0, xr - xl), background: C.text}} />
          {p < 0.5 ? <div style={{position: 'absolute', top: 0, bottom: 0, left: xr - 22, width: 22, background: C.red}} /> : null}
        </React.Fragment>
      );
    })}
  </>
);

const Counter: React.FC<{value: string; label?: string; color?: string; vsize?: number}> = ({value, label = 'FRAMES OUT', color, vsize = 84}) => (
  <div style={{position: 'absolute', left: 1444, top: 124, width: 380, height: 104, boxSizing: 'border-box', border: `4px solid ${C.text}`, background: C.bg2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px'}}>
    <div style={{fontFamily: F.mono, fontSize: 22, color: C.dim, letterSpacing: 1.5}}>{label}</div>
    <div style={{fontFamily: F.display, fontWeight: 800, fontSize: vsize, lineHeight: 1, color: color ?? C.text, whiteSpace: 'nowrap'}}>{value}</div>
  </div>
);

const Prompt: React.FC<{text: string}> = ({text}) => (
  <div style={{position: 'absolute', left: X0, top: 150, fontFamily: F.mono, fontSize: 28, color: C.dim, whiteSpace: 'pre'}}>
    <span style={{color: C.amber}}>$ </span>{text}
  </div>
);

const Panel: React.FC<{y: number; h: number; fill?: string; children?: React.ReactNode}> = ({y, h, fill, children}) => (
  <div style={{position: 'absolute', left: X0, top: y, width: W0, height: h, background: fill ?? C.text}}>{children}</div>
);

/* ---------- typed code ---------- */
type Seg = [string, string?, string?]; // text, colour, background block
type Ln = {segs: Seg[]; at: number; size: number; y: number; cps?: number; strike?: boolean; x?: number};
const Lines: React.FC<{lines: Ln[]; lt: number}> = ({lines, lt}) => {
  const active = lines.reduce((a, l, i) => (lt >= l.at ? i : a), -1);
  return (
    <>
      {lines.map((l, i) => {
        if (lt < l.at) return null;
        let n = Math.floor((lt - l.at) * (l.cps ?? 46));
        return (
          <div key={i} style={{position: 'absolute', left: l.x ?? 40, top: l.y, fontFamily: F.mono, fontSize: l.size, lineHeight: 1.15, whiteSpace: 'pre', color: C.bg, textDecoration: l.strike ? 'line-through' : undefined}}>
            {l.segs.map((g, k) => {
              const txt = g[0].slice(0, Math.max(0, n)); n -= g[0].length;
              if (!txt) return null;
              return <span key={k} style={{color: g[1] ?? C.bg, background: g[2], boxShadow: g[2] ? `0 0 0 0.1em ${g[2]}` : undefined}}>{txt}</span>;
            })}
            {i === active && blink(lt, 0, 0.7) ? <span style={{display: 'inline-block', width: '0.5em', height: '0.82em', background: C.bg, marginLeft: 3, verticalAlign: '-0.08em'}} /> : null}
          </div>
        );
      })}
    </>
  );
};

/* ---------- frame cells ---------- */
const playColor = (k: number) => [C.bg2, C.amber, C.red, C.cyan][Math.min(k, 4) - 1];
const playText = (k: number) => (k === 1 ? C.text : C.bg);

const Cell: React.FC<{x: number; y: number; w: number; h: number; fill: string; color: string; label: string; size: number; border?: string; bw?: number}> = ({x, y, w, h, fill, color, label, size, border, bw = 3}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box', background: fill, border: `${bw}px solid ${border ?? C.text}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: size, fontWeight: 700, color, lineHeight: 1}}>{label}</div>
);

/** the output ids as cells, popped in one by one, coloured by how many times that frame has played so far */
const IdStrip: React.FC<{ids: number[]; x: number; y: number; cols: number; cw: number; ch: number; stride: number; rowStride: number; lt: number; t0: number; per: number; size: number; flat?: boolean}> = ({ids, x, y, cols, cw, ch, stride, rowStride, lt, t0, per, size, flat}) => {
  const pl = playsOf(ids);
  return (
    <>
      {ids.map((id, i) => {
        if (lt < t0 + i * per) return null;
        const k = flat ? Math.min(pl[i], 2) : pl[i];
        return <Cell key={i} x={x + (i % cols) * stride} y={y + Math.floor(i / cols) * rowStride} w={cw} h={ch} fill={playColor(k)} color={playText(k)} label={String(id)} size={size} />;
      })}
    </>
  );
};
const shown = (lt: number, t0: number, per: number, n: number) => Math.max(0, Math.min(n, Math.floor((lt - t0) / per) + 1));

const Legend: React.FC<{x: number; y: number; items: [string, string][]; size?: number}> = ({x, y, items, size = 30}) => (
  <div style={{position: 'absolute', left: x, top: y, display: 'flex', gap: 44, fontFamily: F.mono, fontSize: size, color: C.text, alignItems: 'center'}}>
    {items.map(([col, txt]) => (
      <div key={txt} style={{display: 'flex', alignItems: 'center', gap: 14}}>
        <div style={{width: size, height: size, background: col, border: `3px solid ${C.text}`, boxSizing: 'border-box'}} />
        <span>{txt}</span>
      </div>
    ))}
  </div>
);

const PunchShot: React.FC<{value: string; sub: string; fill: string; lt: number; vsize?: number}> = ({value, sub, fill, lt, vsize = 380}) => (
  <Panel y={250} h={600} fill={fill}>
    <div style={{position: 'absolute', left: 60, top: 40, fontFamily: F.display, fontWeight: 800, fontSize: vsize, lineHeight: 1, color: C.bg, whiteSpace: 'nowrap', transformOrigin: '0 0', transform: `scale(${1 + 0.07 * (1 - ep(lt, 0, 0.3))})`}}>{value}</div>
    <div style={{position: 'absolute', left: 64, top: 480, right: 60, fontFamily: F.sans, fontWeight: 500, fontSize: 44, lineHeight: 1.25, color: C.bg}}>{sub}</div>
  </Panel>
);

const fmt = (x: number) => String(x);
const loopCmd = (n: number, size = 5, start = 10) => `loop=loop=${n}:size=${size}:start=${start}`;

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const cuts = [0.18, 0.42, 0.7];
  const s = shotOf(t, dur, cuts);
  const SRC = Array.from({length: 50}, (_, i) => i);
  const nCells = shown(s.lt, 0.1, 0.045, 50);
  return (
    <Stage>
      <Prompt text="ffmpeg -i counter.mkv -vf ..." />
      <Counter label="FRAMES IN" value={s.i === 0 ? '0' : s.i === 1 ? String(nCells) : '50'} />
      {s.i === 0 ? (
        <Panel y={250} h={560}>
          <Lines lt={s.lt} lines={[
            {segs: [['loop=loop=2:size=5:start=10']], at: 0.1, size: 76, y: 60},
            {segs: [['size', C.amberDim], ['    frames or seconds'], ['?', C.bg, C.red]], at: 1.0, size: 56, y: 240},
            {segs: [['loop=2', C.amberDim], ['  two plays or three'], ['?', C.bg, C.red]], at: 1.7, size: 56, y: 340},
          ]} />
        </Panel>
      ) : null}
      {s.i === 1 ? (
        <>
          {SRC.map((id, i) => {
            if (s.lt < 0.1 + i * 0.045) return null;
            const y = 16 + id;
            return (
              <div key={id} style={{position: 'absolute', left: X0 + (i % 10) * 172, top: 262 + Math.floor(i / 10) * 120, width: 164, height: 108, background: `rgb(${y},${y},${y})`, color: C.bg, fontFamily: F.mono, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                <div style={{fontSize: 46, fontWeight: 700, lineHeight: 1}}>{id}</div>
                <div style={{fontSize: 24, marginTop: 6, opacity: 0.85}}>Y {y}</div>
              </div>
            );
          })}
        </>
      ) : null}
      {s.i === 2 ? (
        <Panel y={250} h={560}>
          <Lines lt={s.lt} lines={[
            {segs: [['reader 1  ', C.amberDim], ['Y plane, id = luma - 16']], at: 0.1, size: 46, y: 60},
            {segs: [['reader 2  ', C.amberDim], ['framemd5, hash to frame']], at: 0.8, size: 46, y: 160},
            {segs: [['control   ', C.amberDim], ['trim and concat, no loop']], at: 1.5, size: 46, y: 260},
            {segs: [['grid      ', C.amberDim], [`${DATA.cases} cases, loop N, size M, start S`]], at: 2.2, size: 46, y: 360},
          ]} />
        </Panel>
      ) : null}
      {s.i === 3 ? <PunchShot value="50" sub="frames in. Every one names itself: id = luma - 16." fill={C.text} lt={s.lt} /> : null}
      <Wipes t={t} dur={dur} cuts={cuts} />
    </Stage>
  );
};

/* 2. Two plays or three */
const Plays: React.FC<{t: number; dur: number}> = ({t, dur}) => {
  const cuts = [0.13, 0.26, 0.39, 0.54, 0.78];
  const s = shotOf(t, dur, cuts);
  const n = s.i;
  const ids = n < 4 ? expand(DATA.runs[n]) : [];
  const nShow = n < 4 ? shown(s.lt, 0.05, 0.022, ids.length) : 0;
  const pl = playsOf(ids);
  const maxPlay = pl.length ? Math.max(...pl) : 1;
  return (
    <Stage>
      <Prompt text="ffmpeg -i counter.mkv -vf ..." />
      <Counter value={n < 4 ? String(nShow) : String(DATA.runs.length ? expand(DATA.runs[2]).length : 0)} />
      {n < 4 ? (
        <>
          <Panel y={250} h={150}>
            <Lines lt={s.lt} lines={[{segs: [['loop=loop='], [String(n), C.bg, C.red], [':size=5:start=10']], at: 0.0, size: 64, y: 40, cps: 80}]} />
          </Panel>
          <IdStrip ids={ids.slice(0, nShow)} x={X0} y={440} cols={33} cw={48} ch={92} stride={52.4} rowStride={104} lt={99} t0={0} per={0} size={27} />
          <Legend x={X0} y={690} items={([[playColor(1), '1 play'], [playColor(2), '2 plays'], [playColor(3), '3 plays'], [playColor(4), '4 plays']] as [string, string][]).slice(0, maxPlay)} />
          <div style={{position: 'absolute', left: X0, top: 760, fontFamily: F.mono, fontSize: 40, color: C.text, whiteSpace: 'pre', opacity: ep(s.lt, 1.2, 1.5)}}>
            frames 9 to 13: <b style={{color: n === 2 ? C.red : C.text}}>{n + 1} {n ? 'plays' : 'play'}</b>   out: {50 + 5 * n} frames
          </div>
        </>
      ) : null}
      {s.i === 4 ? (
        <Panel y={250} h={560}>
          <Lines lt={s.lt} lines={[0, 1, 2, 3].map((k) => ({
            segs: [[`loop=${k}`, k === 2 ? C.bg : C.amberDim, k === 2 ? C.red : undefined], [`   ${50 + 5 * k} frames   ${k + 1} ${k ? 'plays' : 'play'}`]] as Seg[],
            at: 0.1 + k * 0.45, size: 64, y: 50 + k * 120,
          }))} />
        </Panel>
      ) : null}
      {s.i === 5 ? <PunchShot value="3 plays" sub="loop=2: frames 9 to 13 play three times. Loop counts the extra plays." fill={C.red} lt={s.lt} /> : null}
      <Wipes t={t} dur={dur} cuts={cuts} />
    </Stage>
  );
};

/* 3. Frames or seconds */
const SCALE = 220; // px per second, the same for every row
const Size: React.FC<SceneProps> = ({t, dur}) => {
  const cuts = [0.2, 0.58, 0.8];
  const s = shotOf(t, dur, cuts);
  return (
    <Stage>
      <Prompt text="ffmpeg -i counter.mkv -vf ..." />
      <Counter value={s.i === 2 ? String(DATA.size100.frames) : '55'} />
      {s.i === 0 ? (
        <Panel y={250} h={560}>
          <Lines lt={s.lt} lines={[
            {segs: [['size=5']], at: 0.1, size: 150, y: 40, cps: 20},
            {segs: [['5 frames', C.amberDim]], at: 0.9, size: 90, y: 250},
            {segs: [['not 5 seconds', C.mute]], at: 1.5, size: 60, y: 400, strike: true},
          ]} />
        </Panel>
      ) : null}
      {s.i === 1 ? (
        <>
          {DATA.fps.map((f, r) => {
            const y = 268 + r * 170;
            const o = prog(s.lt, 0.15 + r * 0.55, 0.15 + r * 0.55 + 0.6);
            const ids = expand(f.runs);
            const tick = SCALE / f.fps;
            const pl = playsOf(ids);
            const bw = ids.length * tick;
            return (
              <React.Fragment key={f.fps}>
                <div style={{position: 'absolute', left: X0, top: y - 4, width: 190, fontFamily: F.mono, fontWeight: 700, fontSize: 40, color: C.text, lineHeight: 1}}>{f.fps} fps</div>
                <div style={{position: 'absolute', left: X0, top: y + 48, width: 190, fontFamily: F.mono, fontSize: 28, color: C.dim, lineHeight: 1}}>{f.secs} s</div>
                <div style={{position: 'absolute', left: 300, top: y, width: bw * o, height: 90, overflow: 'hidden'}}>
                  {ids.map((id, i) => (
                    <div key={i} style={{position: 'absolute', left: i * tick, top: 0, width: Math.max(1, tick - 1), height: 90, background: id >= 9 && id <= 13 ? (pl[i] === 1 ? C.cyan : C.amber) : C.line}} />
                  ))}
                </div>
                <div style={{position: 'absolute', left: 300 + bw + 22, top: y + 18, fontFamily: F.mono, fontWeight: 700, fontSize: 44, color: C.amber, whiteSpace: 'nowrap', opacity: ep(s.lt, 0.75 + r * 0.55, 1.05 + r * 0.55), lineHeight: 1}}>+{f.extra} s</div>
              </React.Fragment>
            );
          })}
          <Legend x={300} y={730} items={[[C.cyan, 'frames 9 to 13, first play'], [C.amber, 'the same five, repeated']]} size={28} />
          <div style={{position: 'absolute', left: 300, top: 790, width: SCALE * 6, height: 3, background: C.text}} />
          {[0, 1, 2, 3, 4, 5, 6].map((k) => (
            <React.Fragment key={k}>
              <div style={{position: 'absolute', left: 300 + k * SCALE - 1, top: 790, width: 3, height: 14, background: C.text}} />
              <div style={{position: 'absolute', left: 300 + k * SCALE - 20, top: 810, width: 40, textAlign: 'center', fontFamily: F.mono, fontSize: 24, color: C.dim}}>{k}s</div>
            </React.Fragment>
          ))}
        </>
      ) : null}
      {s.i === 2 ? (
        <>
          <Panel y={250} h={130}>
            <Lines lt={s.lt} lines={[{segs: [['loop=loop=1:'], ['size=100', C.bg, C.red], [':start=10']], at: 0.05, size: 64, y: 30, cps: 60}]} />
          </Panel>
          {Array.from({length: 50}, (_, id) => (
            s.lt < 0.4 + id * 0.02 ? null : <Cell key={id} x={X0 + (id % 25) * 69} y={420 + Math.floor(id / 25) * 104} w={64} h={92} fill={id >= DATA.size100.from ? C.amber : C.bg2} color={id >= DATA.size100.from ? C.bg : C.text} label={String(id)} size={30} />
          ))}
          <div style={{position: 'absolute', left: X0, top: 650, fontFamily: F.mono, fontSize: 44, color: C.text, whiteSpace: 'pre', opacity: ep(s.lt, 1.6, 1.9)}}>
            <b style={{color: C.amber}}>{DATA.size100.len} frames</b> repeat, not 100
          </div>
          <div style={{position: 'absolute', left: X0, top: 720, fontFamily: F.mono, fontSize: 44, color: C.text, whiteSpace: 'pre', opacity: ep(s.lt, 2.1, 2.4)}}>
            {DATA.size100.frames} frames out
          </div>
        </>
      ) : null}
      {s.i === 3 ? <PunchShot value="5 frames" sub="size counts frames: 0.5 s, 0.2 s and 0.1 s at 10, 25 and 50 fps." fill={C.text} lt={s.lt} /> : null}
      <Wipes t={t} dur={dur} cuts={cuts} />
    </Stage>
  );
};

/* 4. The off by one */
const Start: React.FC<SceneProps> = ({t, dur}) => {
  const cuts = [0.14, 0.34, 0.56, 0.8];
  const s = shotOf(t, dur, cuts);
  const out = expand(DATA.start10);
  const outShow = out.slice(6, 6 + 15);
  const pl = playsOf(out).slice(6, 6 + 15);
  return (
    <Stage>
      <Prompt text="ffmpeg -i counter.mkv -vf ..." />
      <Counter value="55" />
      {s.i === 0 ? (
        <Panel y={250} h={560}>
          <Lines lt={s.lt} lines={[
            {segs: [['start=10']], at: 0.05, size: 150, y: 50, cps: 30},
            {segs: [['repeats frame 9', C.bg, C.red]], at: 0.6, size: 90, y: 270, cps: 40},
            {segs: [['not frame 10', C.mute]], at: 1.2, size: 60, y: 430, strike: true, cps: 40},
          ]} />
        </Panel>
      ) : null}
      {s.i === 1 ? (
        <>
          <div style={{position: 'absolute', left: X0, top: 258, fontFamily: F.mono, fontSize: 28, color: C.dim}}>source frames</div>
          {Array.from({length: 10}, (_, i) => 6 + i).map((id, i) => (
            <Cell key={id} x={X0 + i * 108} y={340} w={100} h={100} fill={id >= 9 && id <= 13 ? C.bg2 : C.bg2} color={C.text} label={String(id)} size={40} border={id === 10 ? C.cyan : id >= 9 && id <= 13 ? C.red : C.text} bw={id === 10 || (id >= 9 && id <= 13) ? 6 : 3} />
          ))}
          <div style={{position: 'absolute', left: X0 + 4 * 108 - 20, top: 296, fontFamily: F.mono, fontWeight: 700, fontSize: 28, color: C.cyan, whiteSpace: 'nowrap', opacity: ep(s.lt, 0.3, 0.6)}}>start=10 ▼</div>
          <div style={{position: 'absolute', left: X0 + 3 * 108, top: 454, width: 5 * 108 - 8, height: 8, background: C.red, opacity: ep(s.lt, 0.9, 1.1)}} />
          <div style={{position: 'absolute', left: X0 + 3 * 108, top: 470, fontFamily: F.mono, fontSize: 30, color: C.red, fontWeight: 700, whiteSpace: 'nowrap', opacity: ep(s.lt, 1.0, 1.3)}}>looped: 9 to 13</div>
          <div style={{position: 'absolute', left: X0, top: 548, fontFamily: F.mono, fontSize: 28, color: C.dim}}>output frames</div>
          {outShow.map((id, i) => (
            s.lt < 1.2 + i * 0.06 ? null : <Cell key={i} x={X0 + i * 108} y={590} w={100} h={100} fill={playColor(pl[i])} color={playText(pl[i])} label={String(id)} size={40} />
          ))}
          <div style={{position: 'absolute', left: X0 + 8 * 108, top: 704, fontFamily: F.mono, fontSize: 30, color: C.amber, fontWeight: 700, whiteSpace: 'nowrap', opacity: ep(s.lt, 2.1, 2.3)}}>second play</div>
        </>
      ) : null}
      {s.i === 2 ? (
        <Panel y={250} h={560}>
          <Lines lt={s.lt} lines={DATA.start.map((r, k) => ({
            segs: [[`start=${r.s}`, r.s <= 1 ? C.bg : C.amberDim, r.s <= 1 ? C.red : undefined], [' '.repeat(10 - `start=${r.s}`.length) + `repeats ${r.from} to ${r.to}`]] as Seg[],
            at: 0.05 + k * 0.4, size: 62, y: 36 + k * 104, cps: 60,
          }))} />
        </Panel>
      ) : null}
      {s.i === 3 ? (
        <Panel y={250} h={560}>
          <Lines lt={s.lt} lines={[
            {segs: [['control: no loop filter', C.amberDim]], at: 0.05, size: 46, y: 40, cps: 70},
            {segs: [['built to repeat from 9    '], ['both readers: 9', C.bg, C.green]], at: 0.5, size: 42, y: 150, cps: 70},
            {segs: [['built to repeat from 10   '], ['both readers: 10', C.bg, C.green]], at: 0.95, size: 42, y: 240, cps: 70},
            {segs: [['loop filter, start=10     ', C.amberDim], ['both readers: 9', C.bg, C.red]], at: 1.4, size: 42, y: 350, cps: 70},
            {segs: [[`${DATA.cases} of ${DATA.cases} cases agree`, C.bg, C.green]], at: 1.9, size: 46, y: 460, cps: 90},
          ]} />
        </Panel>
      ) : null}
      {s.i === 4 ? <PunchShot value="frame 9" sub="start=10 loops from frame 9. Start counts from 1 on this build." fill={C.red} lt={s.lt} /> : null}
      <Wipes t={t} dur={dur} cuts={cuts} />
    </Stage>
  );
};

/* 5. Time and the defaults */
const Time: React.FC<SceneProps> = ({t, dur}) => {
  const cuts = [0.2, 0.45, 0.75];
  const s = shotOf(t, dur, cuts);
  const row = (label: string, from: number | null, cond: (i: number) => boolean, y: number, fillOn: string, at: number) => (
    <React.Fragment key={label}>
      <div style={{position: 'absolute', left: X0, top: y - 38, fontFamily: F.mono, fontSize: 30, color: C.text, whiteSpace: 'nowrap', opacity: ep(s.lt, at, at + 0.3)}}>{label}</div>
      {Array.from({length: 16}, (_, i) => (
        s.lt < at + i * 0.03 ? null : <Cell key={i} x={X0 + i * 106} y={y} w={100} h={80} fill={cond(i) ? fillOn : C.bg2} color={cond(i) ? C.bg : C.dim} label={String(i)} size={30} />
      ))}
    </React.Fragment>
  );
  return (
    <Stage>
      <Prompt text="ffmpeg -i counter.mkv -vf ..." />
      <Counter value="53" />
      {s.i === 0 ? (
        <Panel y={250} h={560}>
          <Lines lt={s.lt} lines={[
            {segs: [['time=0.4']], at: 0.1, size: 140, y: 40, cps: 24},
            {segs: [['0.4 s x 25 fps = frame 10', C.amberDim]], at: 1.0, size: 60, y: 250, cps: 40},
            {segs: [['no off by one here', C.bg, C.green]], at: 1.9, size: 60, y: 350, cps: 40},
          ]} />
        </Panel>
      ) : null}
      {s.i === 1 ? (
        <Panel y={250} h={600}>
          <Lines lt={s.lt} lines={DATA.time.map((r, k) => ({
            segs: [[r.label, k === 0 ? C.bg : C.amberDim, k === 0 ? C.red : undefined], [' '.repeat(20 - r.label.length) + (r.from === null ? `no loop, ${r.frames} frames` : `from frame ${r.from}`)]] as Seg[],
            at: 0.1 + k * 0.32, size: 46, y: 32 + k * 78,
          }))} />
        </Panel>
      ) : null}
      {s.i === 2 ? (
        <>
          {row('start=0, the default: true from frame 0', 0, () => true, 296, C.amber, 0.1)}
          {row('time=0.4: true from frame 10', 10, (i) => i >= 10, 444, C.cyan, 0.9)}
          {row('the loop begins at the earlier one: frame 0', 0, (i) => i === 0, 592, C.red, 1.8)}
        </>
      ) : null}
      {s.i === 3 ? <PunchShot value="frame 0" sub="time alone changes nothing: start defaults to 0, so the loop already began." fill={C.red} lt={s.lt} /> : null}
      <Wipes t={t} dur={dur} cuts={cuts} />
    </Stage>
  );
};

/* 6. Loop minus one */
const Infinite: React.FC<SceneProps> = ({t, dur}) => {
  const cuts = [0.22, 0.46, 0.72];
  const s = shotOf(t, dur, cuts);
  const ids = expand(DATA.inf.runs).slice(0, 66);
  const pl = playsOf(expand(DATA.inf.runs)).slice(0, 66);
  const secs = Math.min(3, Math.max(0, s.lt - 0.6));
  return (
    <Stage>
      <Prompt text="ffmpeg -i counter.mkv -vf ..." />
      {s.i === 0 ? <Counter value={String(Math.min(DATA.inf.frames, Math.floor(prog(s.lt, 1.0, 3.2) * DATA.inf.frames)))} /> : null}
      {s.i === 1 ? <Counter value={String(DATA.inf.frames)} /> : null}
      {s.i === 2 ? <Counter value="no end" vsize={48} color={C.red} /> : null}
      {s.i === 3 ? <Counter value={String(DATA.inf.frames)} color={C.green} /> : null}
      {s.i === 0 ? (
        <Panel y={250} h={540}>
          <Lines lt={s.lt} lines={[
            {segs: [['loop=loop='], ['-1', C.bg, C.red], [':size=5:start=10']], at: 0.1, size: 76, y: 50},
            {segs: [['-frames:v 120', C.amberDim]], at: 1.0, size: 76, y: 200},
            {segs: [['the guard that stops it', C.mute]], at: 1.8, size: 48, y: 380},
          ]} />
        </Panel>
      ) : null}
      {s.i === 1 ? (
        <>
          {ids.map((id, i) => (
            s.lt < 0.1 + i * 0.03 ? null : <Cell key={i} x={X0 + (i % 33) * 52.4} y={290 + Math.floor(i / 33) * 108} w={48} h={96} fill={pl[i] === 1 ? C.bg2 : C.amber} color={pl[i] === 1 ? C.text : C.bg} label={String(id)} size={27} />
          ))}
          <Legend x={X0} y={540} items={[[playColor(1), 'first play'], [playColor(2), 'repeat']]} />
          <div style={{position: 'absolute', left: X0, top: 640, fontFamily: F.mono, fontSize: 44, color: C.text, whiteSpace: 'pre', opacity: ep(s.lt, 2.2, 2.5)}}>
            0 to 13, then 9 to 13 again and again
          </div>
          <div style={{position: 'absolute', left: X0, top: 710, fontFamily: F.mono, fontSize: 44, color: C.text, whiteSpace: 'pre', opacity: ep(s.lt, 2.7, 3.0)}}>
            <b>{DATA.inf.frames} frames</b>, then the guard stops it
          </div>
        </>
      ) : null}
      {s.i === 2 ? (
        <Panel y={250} h={560}>
          <Lines lt={s.lt} lines={[
            {segs: [['no guard, run for 3 seconds', C.amberDim]], at: 0.05, size: 48, y: 36},
            {segs: [['... -vf loop=loop=-1:size=5:start=10 -f null -']], at: 0.5, size: 40, y: 110, cps: 60},
          ]} />
          <div style={{position: 'absolute', left: 40, top: 180, fontFamily: F.display, fontWeight: 800, fontSize: 270, lineHeight: 1, color: C.bg}}>{secs.toFixed(1)} s</div>
          {secs >= 3 ? <div style={{position: 'absolute', left: 1040, top: 250, fontFamily: F.display, fontWeight: 800, fontSize: 170, lineHeight: 1, color: C.bg, background: C.red, padding: '10px 28px'}}>KILLED</div> : null}
          <div style={{position: 'absolute', left: 40, top: 490, fontFamily: F.mono, fontSize: 44, color: C.bg, opacity: ep(s.lt, 3.6, 3.9)}}>still running. It never reached an end.</div>
        </Panel>
      ) : null}
      {s.i === 3 ? <PunchShot value="120 frames" sub="with the guard. Without it the loop never ends." fill={C.green} lt={s.lt} /> : null}
      <Wipes t={t} dur={dur} cuts={cuts} />
    </Stage>
  );
};

/* 7. What to write */
const Close: React.FC<SceneProps> = ({t, dur}) => {
  const cuts = [0.34];
  const s = shotOf(t, dur, cuts);
  return (
    <Stage>
      <Prompt text="ffmpeg 6.1.1, one lossless counter clip" />
      {s.i === 0 ? (
        <Panel y={250} h={560}>
          <Lines lt={s.lt} lines={[
            {segs: [['loop=N     ', C.amberDim], ['N extra plays']], at: 0.1, size: 54, y: 40},
            {segs: [['size=M     ', C.amberDim], ['M frames, at most']], at: 0.9, size: 54, y: 150},
            {segs: [['start=S    ', C.amberDim], ['begins at frame S-1']], at: 1.7, size: 54, y: 260},
            {segs: [['time=T     ', C.amberDim], ['needs start=-1']], at: 2.5, size: 54, y: 370},
            {segs: [['loop=-1    ', C.amberDim], ['needs -frames:v']], at: 3.3, size: 54, y: 480},
          ]} />
        </Panel>
      ) : null}
      {s.i === 1 ? (
        <Panel y={250} h={560}>
          <Lines lt={s.lt} lines={[
            {segs: [['not tested', C.bg, C.red]], at: 0.1, size: 56, y: 40},
            {segs: [['ffmpeg 8.1.2, the PC build']], at: 0.9, size: 52, y: 160},
            {segs: [['aloop, the audio filter']], at: 1.5, size: 52, y: 250},
            {segs: [['real footage, variable frame rate']], at: 2.1, size: 52, y: 340},
            {segs: [['sizes above 100 frames']], at: 2.7, size: 52, y: 430},
          ]} />
        </Panel>
      ) : null}
      <Wipes t={t} dur={dur} cuts={cuts} />
    </Stage>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, plays: Plays, size: Size, start: Start, time: Time, infinite: Infinite, close: Close};
