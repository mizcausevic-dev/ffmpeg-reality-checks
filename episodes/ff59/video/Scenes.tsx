import React from 'react';
import {C, F, D} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Fireship fast code. Hard cuts every 2 to 3 seconds, huge monospace code with typewriter reveals, one on-screen counter,
 * a quick wipe at every cut, one punch-line number per beat. Flat ink screen, light tints of the lab inks (the Dim keys) as the accents.
 * Every number is measured by episodes/ff59/fixture/experiment.mjs (clip A: I-frames at 0, 25, 50, 75; clip B: 0, 10, 40, 41). ffmpeg 6.1.1.
 */

const SEL = 'select=eq(pict_type\\,I)';
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/* ---------- screen, beats, wipe ---------- */
const Dark: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, background: C.text, overflow: 'hidden'}}>{children}</div>
);
const even = (dur: number, n: number) => Array.from({length: n}, (_, k) => (k * dur) / n);
const beatOf = (t: number, starts: number[]) => { let i = 0; for (let k = 0; k < starts.length; k++) if (t >= starts[k]) i = k; return {i, lt: t - starts[i]}; };
const Wipe: React.FC<{t: number; starts: number[]}> = ({t, starts}) => {
  const hit = starts.slice(1).find((s) => t >= s && t < s + 0.26);
  if (hit === undefined) return null;
  const p = prog(t, hit, hit + 0.26);
  return <div style={{position: 'absolute', top: 0, height: 1080, width: 260, left: lerp(-260, 1920, p), background: C.amberDim}} />;
};
const Cue: React.FC<{text: string; o?: number}> = ({text, o = 1}) => (
  <div style={{position: 'absolute', left: 140, top: 150, opacity: o, fontFamily: F.mono, fontSize: 32, letterSpacing: 3, textTransform: 'uppercase', color: C.line}}>{text}</div>
);

/* ---------- code ---------- */
type Seg = {t: string; c?: string};
const Code: React.FC<{lines: Seg[][]; lt: number; x?: number; y: number; size?: number; cps?: number; delay?: number}> = ({lines, lt, x = 140, y, size = 62, cps = 46, delay = 0.15}) => {
  let left = Math.max(0, Math.floor((lt - delay) * cps));
  return (
    <div style={{position: 'absolute', left: x, top: y, fontFamily: F.mono, fontSize: size, lineHeight: 1.32, color: C.bg, whiteSpace: 'pre'}}>
      {lines.map((l, i) => {
        const parts = l.map((s, j) => {
          const n = Math.min(left, s.t.length); left -= n;
          return <span key={j} style={{color: s.c ?? C.bg}}>{s.t.slice(0, n)}</span>;
        });
        return <div key={i} style={{height: size * 1.32}}>{parts}</div>;
      })}
    </div>
  );
};

/* ---------- counter (the one on-screen counter of a scene) ---------- */
const Counter: React.FC<{label: string; value: number; color: string; x?: number; y?: number; size?: number; o?: number}> = ({label, value, color, x = 1480, y = 130, size = 150, o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, width: 300, textAlign: 'right', opacity: o}}>
    <div style={{fontFamily: F.mono, fontSize: 24, letterSpacing: 4, textTransform: 'uppercase', color: C.line}}>{label}</div>
    <div style={{fontFamily: F.display, fontWeight: 900, fontSize: size * D.k * 0.8, lineHeight: 0.95, color, letterSpacing: 1}}>{Math.round(value)}</div>
  </div>
);
const Punch: React.FC<{value: string; sub?: string; color?: string; size?: number; y?: number; o?: number; subSize?: number}> = ({value, sub, color = C.redDim, size = 520, y = 190, o = 1, subSize = 54}) => (
  <div style={{position: 'absolute', left: 0, top: y, width: 1920, textAlign: 'center', opacity: o}}>
    <div style={{fontFamily: F.display, fontWeight: 900, fontSize: size * D.k * 0.8, lineHeight: 0.92, color, letterSpacing: 2, whiteSpace: 'nowrap'}}>{value}</div>
    {sub && <div style={{fontFamily: F.mono, fontSize: subSize, color: C.bg, marginTop: 10, letterSpacing: 2}}>{sub}</div>}
  </div>
);
const Line: React.FC<{y: number; text: string; color?: string; size?: number; o?: number; x?: number; align?: 'left' | 'center'; mono?: boolean; w?: number}> = ({y, text, color = C.bg, size = 44, o = 1, x = 140, align = 'left', mono = true, w = 1640}) => (
  <div style={{position: 'absolute', left: align === 'center' ? 0 : x, width: align === 'center' ? 1920 : w, top: y, textAlign: align, opacity: o, fontFamily: mono ? F.mono : F.display, fontSize: mono ? size : size * D.k, color, lineHeight: 1.25, whiteSpace: 'pre', fontWeight: mono ? 500 : 800}}>{text}</div>
);

/* ---------- output strip: one cell per file written, to scale ---------- */
const SRC_COL = (s: number) => [C.cyanDim, C.amberDim, C.greenDim, C.redDim][s];
const Strip: React.FC<{runs: {src: number; count: number}[]; x0?: number; y: number; w: number; h?: number; reveal?: number; labels?: boolean}> = ({runs, x0 = 140, y, w, h = 150, reveal = 1, labels = true}) => {
  const n = runs.reduce((a, r) => a + r.count, 0);
  const cw = w / n;
  let at = 0;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      {runs.map((r, k) => {
        const start = at; at += r.count;
        const cells = [];
        for (let i = 0; i < r.count; i++) { if ((start + i) / n > reveal) break; cells.push(<rect key={i} x={x0 + (start + i) * cw + 0.5} y={y} width={Math.max(1, cw - 1.5)} height={h} fill={SRC_COL(k % 4)} />); }
        return (
          <g key={k}>
            {cells}
            {labels && (start / n <= reveal) && <text x={x0 + (start + r.count / 2) * cw} y={y - 18} textAnchor="middle" fontFamily={F.mono} fontSize={34} fontWeight={700} fill={C.bg}>{`x${r.count}`}</text>}
          </g>
        );
      })}
    </svg>
  );
};

/* 1. The question */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 7);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Punch value="99" sub="files written" y={170} o={ep(lt, 0, 0.2)} /><Line y={800} text="you asked for the keyframes of a clip" align="center" size={44} color={C.line} o={ep(lt, 0.8, 1.2)} /></>}
      {i === 1 && <><Cue text="the command" />
        <Code lt={lt} y={290} size={78} lines={[[{t: 'ffmpeg -i clip.mkv \\'}], [{t: '  -vf "'}, {t: SEL, c: C.amberDim}, {t: '" \\'}], [{t: '  out_%03d.png'}]]} /></>}
      {i === 2 && <><Cue text="expected" /><Punch value="4" sub="keyframes in the clip" color={C.greenDim} size={470} y={190} o={ep(lt, 0, 0.2)} /></>}
      {i === 3 && <><Cue text="written" /><Punch value="99" sub="4  ≠  99" color={C.redDim} size={470} y={190} o={ep(lt, 0, 0.2)} /></>}
      {i === 4 && <><Punch value="IS SELECT BROKEN?" size={200} color={C.bg} y={380} o={ep(lt, 0, 0.2)} /></>}
      {i === 5 && <><Cue text="we measure it" />
        <Code lt={lt} y={360} size={78} cps={34} lines={[[{t: 'for each output file:', c: C.line}], [{t: 'sha256(file)  ', c: C.cyanDim}, {t: '->  which source frame?'}]]} /></>}
      {i === 6 && <><Cue text="the setup" />
        <Line y={330} text="synthetic clip · 100 frames" size={64} color={C.bg} o={ep(lt, 0, 0.3)} />
        <Line y={420} text="a keyframe every second" size={64} color={C.bg} o={ep(lt, 0.5, 0.8)} />
        <Line y={510} text="ffmpeg 6.1.1" size={64} color={C.amberDim} o={ep(lt, 1.0, 1.3)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 2. The clip and the readers */
const ClipScene: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 7);
  const {i, lt} = beatOf(t, starts);
  const KEYS = [0, 25, 50, 75];
  return (
    <Dark>
      {i === 0 && <><Cue text="clip A" /><Punch value="100 frames" size={230} y={190} color={C.bg} o={ep(lt, 0, 0.2)} />
        <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
          {Array.from({length: 100}, (_, k) => { const key = KEYS.includes(k); const p = ep(lt, 0.3 + k * 0.01, 0.6 + k * 0.01); return <rect key={k} x={160 + k * 16 + 1} y={key ? 560 : 590} width={13} height={key ? 130 : 100} fill={key ? C.amberDim : C.line} opacity={p} />; })}
          {KEYS.map((k) => <text key={k} x={160 + k * 16 + 7} y={738} textAnchor="middle" fontFamily={F.mono} fontSize={34} fontWeight={700} fill={C.amberDim} opacity={ep(lt, 1.4, 1.8)}>{k}</text>)}
        </svg></>}
      {i === 1 && <><Cue text="keyframes (I)" /><Punch value="0 25 50 75" size={250} y={250} color={C.amberDim} o={ep(lt, 0, 0.2)} /></>}
      {i === 2 && <><Cue text="reader 1" />
        <Code lt={lt} y={300} size={80} cps={40} lines={[[{t: 'every file written', c: C.line}], [{t: 'sha256', c: C.cyanDim}, {t: '(o_001.png)'}], [{t: '  == ref_025.png', c: C.greenDim}]]} /></>}
      {i === 3 && <><Cue text="reader 2" />
        <Code lt={lt} y={300} size={80} cps={40} lines={[[{t: 'ffmpeg framemd5', c: C.amberDim}, {t: ' per frame', c: C.line}], [{t: 'dup=', c: C.redDim}, {t: '95 drop=0', c: C.line}], [{t: 'same filter, same options', c: C.line}]]} /></>}
      {i === 4 && <><Cue text="control: no select" /><Punch value="100" sub="files written" size={430} y={190} color={C.greenDim} o={ep(lt, 0, 0.2)} /></>}
      {i === 5 && <><Cue text="control: no select" /><Punch value="100" sub="different hashes · dup=0" size={430} y={190} color={C.greenDim} o={ep(lt, 0, 0.2)} /></>}
      {i === 6 && <><Cue text="two readers, one answer" />
        <Line y={330} text="both name the same source frame" size={68} color={C.bg} o={ep(lt, 0, 0.3)} />
        <Line y={430} text="for every file of all 13 cases" size={68} color={C.greenDim} o={ep(lt, 0.8, 1.1)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 3. The default output */
const Default: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 5);
  const {i, lt} = beatOf(t, starts);
  const runs = [{src: 0, count: 24}, {src: 25, count: 25}, {src: 50, count: 25}, {src: 75, count: 25}];
  return (
    <Dark>
      {i === 0 && <><Cue text="default output" /><Punch value={String(Math.round(99 * ep(lt, 0, 2.2)))} sub="files" color={C.redDim} size={520} y={180} /></>}
      {i === 1 && <><Cue text="what is in them" />
        <Punch value="4" sub="different" size={300} y={170} color={C.greenDim} o={ep(lt, 0, 0.2)} />
        <Punch value="95" sub="duplicates" size={300} y={560} color={C.redDim} o={ep(lt, 0.9, 1.1)} /></>}
      {i === 2 && <><Cue text="99 files, drawn to scale" />
        <Strip runs={runs} y={420} w={1640} h={200} reveal={ep(lt, 0.2, 2.6)} />
        <Line y={700} text="x24 + x25 + x25 + x25 = 99" align="center" size={60} color={C.bg} o={ep(lt, 2.6, 3.0)} />
        <Line y={800} text="frames 0, 25, 50, 75" align="center" size={44} color={C.line} o={ep(lt, 2.8, 3.2)} /></>}
      {i === 3 && <><Cue text="select did its job" />
        <Punch value="0" sub="non-keyframes written" size={430} y={200} color={C.greenDim} o={ep(lt, 0, 0.2)} />
        <Line y={800} text="4 of 4 keyframes present, in order" align="center" size={46} color={C.line} o={ep(lt, 0.8, 1.2)} /></>}
      {i === 4 && <><Cue text="so where do 95 come from?" />
        <Line y={360} text="after select." size={120} mono={false} color={C.redDim} align="center" o={ep(lt, 0, 0.3)} />
        <Line y={560} text="dup=95  drop=0  (ffmpeg says so too)" align="center" size={56} color={C.line} o={ep(lt, 0.9, 1.3)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 4. What fixes it */
const Fix: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 7);
  const {i, lt} = beatOf(t, starts);
  const rows: {flag: string; n: number; note: string; ok: boolean}[] = [
    {flag: '-fps_mode vfr', n: 4, note: '0 duplicates', ok: true},
    {flag: '-fps_mode passthrough', n: 4, note: '0 duplicates', ok: true},
    {flag: '-vsync 0', n: 4, note: '-vsync vfr too · deprecated aliases', ok: true},
    {flag: '-fps_mode cfr', n: 99, note: 'the default, written out', ok: false},
    {flag: '-skip_frame nokey', n: 99, note: 'no select at all, same 95', ok: false},
    {flag: 'setpts=N/25/TB', n: 4, note: 'timestamps reset by hand', ok: true},
    {flag: 'the pattern', n: 4, note: '', ok: true},
  ];
  const r = rows[Math.min(i, 5)];
  const prev = rows[Math.max(0, Math.min(i, 5) - 1)];
  const shown = i === 0 ? r.n : lerp(prev.n, r.n, ep(lt, 0, 0.3));
  const col = r.ok ? C.greenDim : C.redDim;
  return (
    <Dark>
      <Counter label="files written" value={i === 6 ? 4 : shown} color={col} />
      {i <= 5 && <>
        <Cue text={r.ok ? 'fixes it' : 'does not fix it'} />
        <Code lt={lt} y={360} size={84} cps={44} lines={[[{t: 'ffmpeg ... '}, {t: r.flag, c: col}]]} />
        <Line y={520} text={r.note} size={56} color={C.line} o={ep(lt, 0.9, 1.2)} />
        <Punch value={String(r.n)} color={col} size={300} y={600} o={ep(lt, 0.4, 0.6)} />
      </>}
      {i === 6 && <><Cue text="the rule" />
        <Code lt={lt} y={320} size={80} lines={[[{t: SEL, c: C.amberDim}], [{t: '-fps_mode vfr', c: C.greenDim}]]} />
        <Line y={560} text="4 files. the 4 keyframes. nothing else." size={56} color={C.bg} o={ep(lt, 1.2, 1.6)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 5. Why it repeats */
const Why: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 7);
  const {i, lt} = beatOf(t, starts);
  const sel = [0, 25, 50, 75];
  const gridX = 160, cw = 16;
  const runsB = [{src: 0, count: 9}, {src: 10, count: 30}, {src: 40, count: 2}, {src: 41, count: 9}];
  const grid = (mode: 'slots' | 'holes' | 'fill') => (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      {Array.from({length: 100}, (_, k) => {
        const s = sel.includes(k);
        const src = k < 25 ? 0 : k < 50 ? 25 : k < 75 ? 50 : 75;
        const fill = SRC_COL(sel.indexOf(src));
        const p = mode === 'fill' ? (s ? 1 : ep(lt, 0.2 + (k % 25) * 0.03, 0.5 + (k % 25) * 0.03)) : 1;
        const on = mode === 'slots' ? false : s || mode === 'fill';
        return <rect key={k} x={gridX + k * cw + 1} y={420} width={cw - 3} height={150} fill={on ? (mode === 'fill' ? fill : C.amberDim) : 'none'} stroke={s ? (mode === 'fill' ? C.bg : C.amberDim) : C.mute} strokeWidth={s && mode === 'fill' ? 3 : 2} opacity={on && !s ? p * 0.85 : 1} />;
      })}
    </svg>
  );
  return (
    <Dark>
      {i === 0 && <><Cue text="the output clock" />{grid('slots')}<Line y={640} text="25 slots every second" align="center" size={64} color={C.bg} o={ep(lt, 0.4, 0.8)} /></>}
      {i === 1 && <><Cue text="select keeps 4 frames" />{grid('holes')}<Line y={640} text="the rest are holes" align="center" size={64} color={C.bg} o={ep(lt, 0.4, 0.8)} /></>}
      {i === 2 && <><Cue text="each hole" />{grid('fill')}<Line y={640} text="filled by the frame before it" align="center" size={64} color={C.redDim} o={ep(lt, 1.2, 1.6)} /></>}
      {i === 3 && <><Cue text="clip B: keyframes at 0, 10, 40, 41" />
        <Strip runs={runsB} y={420} w={1300} h={170} x0={310} reveal={ep(lt, 0.2, 1.8)} />
        <Line y={650} text="x9  x30  x2  x9  =  50 files" align="center" size={64} color={C.bg} o={ep(lt, 1.9, 2.3)} /></>}
      {i === 4 && <><Cue text="clip B, default" /><Punch value="50" sub="files. not 100." size={440} y={190} color={C.redDim} o={ep(lt, 0, 0.2)} /></>}
      {i === 5 && <><Cue text="where it stops" />
        <Line y={340} text="last keyframe: frame 41" size={68} color={C.bg} o={ep(lt, 0, 0.3)} />
        <Line y={440} text="last file: output 49" size={68} color={C.redDim} o={ep(lt, 0.7, 1.0)} />
        <Line y={540} text="clip ends at 99" size={68} color={C.line} o={ep(lt, 1.4, 1.7)} /></>}
      {i === 6 && <><Cue text="clip B, -fps_mode vfr" /><Punch value="4" sub="files, at 0, 10, 40, 41" size={440} y={190} color={C.greenDim} o={ep(lt, 0, 0.2)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 6. Same in a video */
const Mp4: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 5);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="out.mp4, default" />
        <Punch value="99" sub="frames · 3.96 s" size={470} y={190} color={C.redDim} o={ep(lt, 0, 0.2)} /></>}
      {i === 1 && <><Cue text="out.mp4, -fps_mode vfr" />
        <Punch value="4" sub="frames · 3.04 s" size={470} y={190} color={C.greenDim} o={ep(lt, 0, 0.2)} /></>}
      {i === 2 && <><Cue text="same pictures" />
        <Line y={340} text="default: 4 different pictures" size={64} color={C.redDim} o={ep(lt, 0, 0.3)} />
        <Line y={440} text="vfr:     4 different pictures" size={64} color={C.greenDim} o={ep(lt, 0.6, 0.9)} />
        <Line y={560} text="both readers agree" size={50} color={C.line} o={ep(lt, 1.2, 1.5)} /></>}
      {i === 3 && <><Cue text="length of the video, to scale" />
        <Line y={290} text="default" size={50} color={C.line} />
        <div style={{position: 'absolute', left: 140, top: 360, width: 1640 * (3.96 / 4) * ep(lt, 0.2, 1.2), height: 90, background: C.redDim}} />
        <Line y={465} text="3.96 s" size={56} color={C.redDim} o={ep(lt, 1.0, 1.3)} />
        <Line y={580} text="-fps_mode vfr" size={50} color={C.line} />
        <div style={{position: 'absolute', left: 140, top: 650, width: 1640 * (3.04 / 4) * ep(lt, 0.8, 1.8), height: 90, background: C.greenDim}} />
        <Line y={755} text="3.04 s" size={56} color={C.greenDim} o={ep(lt, 1.6, 1.9)} /></>}
      {i === 4 && <><Cue text="the rule" />
        <Code lt={lt} y={320} size={80} lines={[[{t: SEL, c: C.amberDim}], [{t: '-fps_mode vfr', c: C.greenDim}]]} />
        <Line y={640} text="8.1.2: the default mp4 already holds 4 frames" size={44} color={C.amberDim} o={ep(lt, 0.6, 0.9)} />
        <Line y={710} text="8.1.2: image files still repeat" size={44} color={C.amberDim} o={ep(lt, 1.0, 1.3)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 7. Close (the last 10 s sit under the end card, so the beats fill the first dur - 10.5 s) */
const Close: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(Math.max(8, dur - 10.5), 4);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="what to do" />
        <Code lt={lt} y={300} size={80} lines={[[{t: '1  '}, {t: SEL, c: C.amberDim}], [{t: '2  '}, {t: '-fps_mode vfr', c: C.greenDim}], [{t: '3  count the files'}]]} /></>}
      {i === 1 && <><Cue text="expect" /><Punch value="4" sub="not 99" color={C.greenDim} size={470} y={190} o={ep(lt, 0, 0.2)} /></>}
      {i === 2 && <><Cue text="not tested" />
        <Line y={330} text="other builds than ffmpeg 6.1.1" size={56} color={C.bg} o={ep(lt, 0, 0.3)} />
        <Line y={410} text="other muxers · variable frame rate input" size={56} color={C.bg} o={ep(lt, 0.4, 0.7)} />
        <Line y={490} text="real footage" size={56} color={C.bg} o={ep(lt, 0.8, 1.1)} /></>}
      {i >= 3 && <><Cue text="FFmpeg Reality Checks" />
        <Line y={420} text="episode 59" size={100} mono={false} color={C.bg} align="center" o={ep(lt, 0, 0.3)} />
        <Line y={620} text="fixture and tests in the description" size={44} color={C.line} align="center" o={ep(lt, 0.4, 0.7)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, clip: ClipScene, default: Default, fix: Fix, why: Why, mp4: Mp4, close: Close};
