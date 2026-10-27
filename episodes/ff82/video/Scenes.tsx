import React from 'react';
import {C, F, D} from '../../kit/theme';
import {ep, eio, prog, blink} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Cinematic screen demo. A flat window (a file tree and a terminal, plain chrome, no traffic-light dots) on a dark desk,
 * a slow push-in over the whole scene, commands typed live, the surprising line highlighted in madder, results pinned beside the window on paper cards.
 * Every string and number comes from episodes/ff82/fixture/experiment.mjs (ffmpeg 6.1.1; fade 125 frames, partial 200, levels 170, 25 fps, 160 x 90).
 * Nothing here is measured on any other build.
 */

type Seg = {t: string; c?: string};
type TL = {segs: Seg[]; at: number; cmd?: boolean; cps?: number; band?: string; post?: Seg[]};
const S = (t: string, c?: string): Seg => ({t, c});
const len = (segs: Seg[]) => segs.reduce((a, s) => a + s.t.length, 0);

/* ---------- geometry ---------- */
const WX = 60, WY = 140, WW = 1290, WH = 720, TB = 56, TW = 300, PAD = 24;
const FS = 26, LH = 38;
const TX = WX + TW + PAD, TY = WY + TB + 20, TWD = WW - TW - 2 * PAD, THT = WH - TB - 40;

/* ---------- camera and desk ---------- */
const Desk: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, background: C.dim, overflow: 'hidden'}}>{children}</div>
);
const Cam: React.FC<{lt: number; dur: number; to?: number; ox?: number; oy?: number; children?: React.ReactNode}> = ({lt, dur, to = 1.04, ox = 700, oy = 520, children}) => {
  const s = 1 + (to - 1) * eio(lt, 0, dur);
  return <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: `${ox}px ${oy}px`, transform: `scale(${s})`}}>{children}</div>;
};

/* every character in its own cell of one character width, so punctuation sits centred and a space cannot be mistaken for a colon or a dot */
/* B612 Mono draws . , : ; and the apostrophe towards the left of their cell: nudge them to the middle so a name does not look as if it had a space in it */
const SHIFT: Record<string, string> = {'.': '0.13em', ',': '0.12em', ':': '0.13em', ';': '0.12em', "'": '0.1em'};
const M: React.FC<{s: string; color?: string}> = ({s, color}) => (
  <>{[...s].map((ch, i) => <span key={i} style={{display: 'inline-block', width: '1ch', textAlign: 'center', color, position: 'relative', left: SHIFT[ch] ?? 0}}>{ch}</span>)}</>
);

/* ---------- window chrome: flat title bar, tree pane, terminal pane ---------- */
const Win: React.FC<{title: string; right?: string; children?: React.ReactNode}> = ({title, right = 'ffmpeg 6.1.1', children}) => (
  <div style={{position: 'absolute', left: WX, top: WY, width: WW, height: WH, background: C.text, border: `2px solid ${C.mute}`, boxSizing: 'border-box'}}>
    <div style={{position: 'absolute', left: 0, top: 0, width: WW - 4, height: TB, background: C.mute, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${PAD}px`, boxSizing: 'border-box'}}>
      <span style={{fontFamily: F.mono, fontSize: 24, color: C.text, letterSpacing: 1}}>{title}</span>
      <span style={{fontFamily: F.mono, fontSize: 22, color: C.text, letterSpacing: 1}}>{right}</span>
    </div>
    <div style={{position: 'absolute', left: TW - 2, top: TB, width: 2, height: WH - TB - 4, background: C.dim}} />
    {children}
  </div>
);

/* ---------- file tree ---------- */
type TN = {n: string; d: number; k?: string; dir?: boolean; c?: 'amberDim' | 'mute'; note?: string};
const Tree: React.FC<{items: TN[]; shown?: number; hl?: string; size?: number; lh?: number}> = ({items, shown = 999, hl, size = 22, lh = 29}) => (
  <div style={{position: 'absolute', left: 0, top: TB + 14, width: TW - 4}}>
    {items.slice(0, shown).map((it, i) => {
      const on = hl !== undefined && it.k === hl;
      return (
        <div key={i} style={{height: lh, display: 'flex', alignItems: 'center', paddingLeft: 18 + it.d * 22, background: on ? C.dim : 'transparent', fontFamily: F.mono, fontSize: size, whiteSpace: 'pre', color: it.c ? C[it.c] : it.dir ? C.bg : C.line, fontWeight: it.dir ? 700 : 400}}>
          <M s={it.n} />{it.note ? <span style={{color: C.mute, marginLeft: 8}}>{it.note}</span> : null}
        </div>
      );
    })}
  </div>
);

/* ---------- terminal, typed live ---------- */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const Term: React.FC<{lines: TL[]; lt: number; prompt?: boolean}> = ({lines, lt, prompt = true}) => {
  const cap = Math.floor(THT / LH);
  const vis = lines.filter((l) => lt >= l.at);
  const last = vis[vis.length - 1];
  const typing = !!last && !!last.cmd && (lt - last.at) * (last.cps ?? 46) < len(last.segs) + 3;
  type Item = {l?: TL; live?: boolean};
  const items: Item[] = vis.map((l) => ({l}));
  if (prompt && !typing) items.push({live: true});
  const shown = items.slice(-cap);
  return (
    <div style={{position: 'absolute', left: TW - 2 + PAD, top: TB + 20, width: TWD, height: THT, overflow: 'hidden', fontFamily: F.mono, fontSize: FS}}>
      {shown.map((it, i) => {
        if (it.live) {
          return <div key={'live' + i} style={{height: LH, display: 'flex', alignItems: 'center', whiteSpace: 'pre', color: C.greenDim}}><M s={'$ '} /><span style={{display: 'inline-block', width: 14, height: 26, background: C.bg, opacity: blink(lt, 0, 1.1) ? 1 : 0.15}} /></div>;
        }
        const l = it.l!;
        const cps = l.cps ?? 46;
        const total = len(l.segs);
        const n = l.cmd ? clamp(Math.floor((lt - l.at) * cps), 0, total) : total;
        const done = !l.cmd || n >= total;
        let left = n;
        const parts = l.segs.map((s, j) => { const k = Math.min(left, s.t.length); left -= k; return <span key={j}><M s={s.t.slice(0, k)} color={s.c ?? C.bg} /></span>; });
        const doneAt = l.at + total / cps;
        const post = l.post && lt >= doneAt + 0.12 ? l.post.map((s, j) => <span key={'p' + j} style={{color: s.c ?? C.bg, opacity: ep(lt, doneAt + 0.12, doneAt + 0.3)}}>{s.t}</span>) : null;
        const bandOn = !!l.band && (l.cmd ? lt >= doneAt + 0.1 : true);
        return (
          <div key={i} style={{height: LH, display: 'flex', alignItems: 'center', whiteSpace: 'pre', margin: `0 -${PAD}px`, padding: `0 ${PAD}px`, background: bandOn ? l.band : 'transparent', opacity: l.cmd ? 1 : ep(lt, l.at, l.at + 0.12)}}>
            {parts}
            {l.cmd && !done ? <span style={{display: 'inline-block', width: 14, height: 26, background: C.bg}} /> : null}
            {post}
          </div>
        );
      })}
    </div>
  );
};

/* ---------- pinned paper cards ---------- */
const Pin: React.FC<{x: number; y: number; w: number; h: number; lt: number; at: number; rot?: number; tape?: boolean; children?: React.ReactNode}> = ({x, y, w, h, lt, at, rot = 0, tape = true, children}) => {
  const p = ep(lt, at, at + 0.4);
  if (p <= 0) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, background: C.bg, boxSizing: 'border-box', padding: '26px 26px 20px', opacity: p, transform: `translateY(${(1 - p) * -34}px) rotate(${rot}deg)`, boxShadow: `7px 7px 0 ${C.text}`}}>
      {tape && <div style={{position: 'absolute', left: w / 2 - 54, top: -15, width: 108, height: 30, background: C.amberDim, transform: 'rotate(-2deg)'}} />}
      {children}
    </div>
  );
};
const Lab: React.FC<{text: string; color?: string}> = ({text, color = C.dim}) => (
  <div style={{fontFamily: F.mono, fontSize: 22, letterSpacing: 1.5, color}}>{text}</div>
);
const Big: React.FC<{text: string; color?: string; size?: number}> = ({text, color = C.text, size = 92}) => (
  <div style={{fontFamily: F.display, fontWeight: 900, fontSize: size * D.k * 0.8, lineHeight: 0.98, color, letterSpacing: 1, whiteSpace: 'nowrap'}}>{text}</div>
);
const Txt: React.FC<{text: string; color?: string; size?: number; mono?: boolean; mt?: number}> = ({text, color = C.text, size = 26, mono = false, mt = 8}) => (
  <div style={{fontFamily: mono ? F.mono : F.sans, fontSize: size, lineHeight: 1.3, color, marginTop: mt}}>{text}</div>
);
/* ---------- command builders ---------- */
const bd = (args: string): Seg[] => [S('$ ', C.greenDim), S('ffmpeg ', C.bg), S('… ', C.mute), S('-vf ', C.amberDim), S('blackdetect' + (args ? '=' + args : ''), C.bg), S(' -f null -', C.bg)];
const line = (start: string, end: string, dur: string, at: number, band?: string): TL => ({segs: [S(`… black_start:${start} black_end:${end} black_duration:${dur}`, band ? C.bg : C.line)], at, band});
const none = (at: number, band?: string): TL => ({segs: [S('(nothing printed)', band ? C.bg : C.mute)], at, band});
const out = (text: string, at: number, band?: string, color?: string): TL => ({segs: [S(text, band ? C.bg : color ?? C.line)], at, band});
const cmt = (text: string, at: number, color?: string): TL => ({segs: [S('# ' + text, color ?? C.mute)], at});

/* ---------- the measured clip (episodes/ff82/fixture/experiment.mjs) ---------- */
const FPS_ = 25, NFR = 125, GRAY = 180, BLACK = 16, FADE_AT = 25, FADE_LEN = 50;
const fadeLuma = (k: number) => (k < FADE_AT ? GRAY : k >= FADE_AT + FADE_LEN ? BLACK : Math.round(GRAY - ((GRAY - BLACK) * (k - FADE_AT + 1)) / FADE_LEN));
const lumaAt = (k: number) => (k >= 100 ? GRAY : fadeLuma(k)); // fadeOut: gray again from frame 100
const bound = (pix: number) => Math.floor(16 + 219 * pix + 1e-9);

/* ---------- tree ---------- */
const TREE: TN[] = [
  {n: 'bd/', d: 0, dir: true},
  {n: 'fade.yuv', d: 1, k: 'fade'}, {n: 'fadeEnd.yuv', d: 1, k: 'fadeEnd'}, {n: 'fade.mp4', d: 1, k: 'x264'},
  {n: 'partial.yuv', d: 1, k: 'partial'}, {n: 'levels.yuv', d: 1, k: 'levels'},
];

/* ---------- luma ramp chart: luma of every frame, the pixel bound, the black stretch ---------- */
const Ramp: React.FC<{w: number; h: number; p?: number; th?: number; start?: number; end?: number; ended?: number; marks?: boolean}> = ({w, h, p = 1, th, start, end, marks = false}) => {
  const X = (k: number) => (k / NFR) * w, Y = (v: number) => h - 26 - (v / 200) * (h - 40);
  const n = Math.max(1, Math.round(NFR * p));
  const pts = Array.from({length: n}, (_, k) => `${X(k).toFixed(1)},${Y(lumaAt(k)).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} style={{display: 'block'}}>
      <line x1={0} y1={Y(0)} x2={w} y2={Y(0)} stroke={C.text} strokeWidth={2} />
      {[0, 1, 2, 3, 4, 5].map((s) => <text key={s} x={X(s * FPS_)} y={h - 4} fontSize={17} fontFamily={F.mono} fill={C.dim} textAnchor={s === 0 ? 'start' : s === 5 ? 'end' : 'middle'}>{s}s</text>)}
      {start !== undefined && end !== undefined && <rect x={X(start * FPS_)} y={Y(0) - 12} width={Math.max(0, X(end * FPS_) - X(start * FPS_))} height={12} fill={C.text} />}
      {th !== undefined && <line x1={0} y1={Y(th)} x2={w} y2={Y(th)} stroke={C.red} strokeWidth={2.5} strokeDasharray="8 6" />}
      {th !== undefined && <text x={2} y={Y(th) - 8} fontSize={19} fontFamily={F.mono} fontWeight={700} fill={C.red} textAnchor="start">luma {th}</text>}
      <polyline points={pts} fill="none" stroke={C.cyan} strokeWidth={4} strokeLinejoin="round" />
      {start !== undefined && <line x1={X(start * FPS_)} y1={Y(0)} x2={X(start * FPS_)} y2={Y(0) - 70} stroke={C.red} strokeWidth={3} />}
      {start !== undefined && <text x={X(start * FPS_) - 8} y={Y(0) - 18} fontSize={19} fontFamily={F.mono} fontWeight={700} fill={C.red} textAnchor="end">start {start}</text>}
      {marks && <text x={X(FADE_AT)} y={Y(GRAY) - 10} fontSize={18} fontFamily={F.mono} fill={C.dim}>fade 1.0 to 3.0 s</text>}
    </svg>
  );
};

/* ---------- a picture with some black rows (the partial clip) ---------- */
const Pic: React.FC<{rows: number; w?: number; on?: boolean; label: string; sub: string; color?: string}> = ({rows, w = 128, on = true, label, sub, color}) => {
  const h = (w * 90) / 160;
  return (
    <div style={{width: w, marginRight: 14, marginTop: 10}}>
      <svg width={w} height={h} style={{display: 'block'}}>
        <rect x={0} y={0} width={w} height={h} fill={C.line} />
        <rect x={0} y={0} width={w} height={(h * rows) / 90} fill={C.text} />
        <rect x={1} y={1} width={w - 2} height={h - 2} fill="none" stroke={on ? color ?? C.green : C.mute} strokeWidth={3} />
      </svg>
      <div style={{fontFamily: F.mono, fontSize: 20, fontWeight: 700, color: on ? color ?? C.green : C.mute, marginTop: 4}}>{label}</div>
      <div style={{fontFamily: F.mono, fontSize: 16, color: C.dim}}>{sub}</div>
    </div>
  );
};

/* ---------- flat swatches at known luma levels ---------- */
const Swatches: React.FC<{levels: number[]; th: number; w?: number}> = ({levels, th, w = 62}) => (
  <div style={{display: 'flex', flexWrap: 'wrap', width: 440}}>
    {levels.map((L) => {
      const black = L <= th;
      return (
        <div key={L} style={{width: w, marginRight: 6, marginBottom: 8}}>
          <div style={{width: w, height: 44, background: `rgb(${L},${L},${L})`, boxSizing: 'border-box', border: `3px solid ${black ? C.green : C.red}`}} />
          <div style={{fontFamily: F.mono, fontSize: 19, fontWeight: 700, color: black ? C.green : C.red, textAlign: 'center', marginTop: 2}}>{L}</div>
        </div>
      );
    })}
  </div>
);

const Row: React.FC<{a: string; b: string; c?: string; hot?: boolean; o?: number}> = ({a, b, c, hot = false, o = 1}) => (
  <div style={{display: 'flex', alignItems: 'center', height: 38, borderBottom: `1px solid ${C.line}`, opacity: o, fontFamily: F.mono, fontSize: 21, color: hot ? C.red : C.text, fontWeight: hot ? 700 : 400, whiteSpace: 'nowrap'}}>
    <span style={{width: 160}}>{a}</span><span style={{width: 90}}>{b}</span><span>{c}</span>
  </div>
);

/* 1. The question */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const lines: TL[] = [
    {segs: bd('d=0.5'), at: A(0.06), cmd: true, cps: 36},
    line('2.72', '4', '1.28', A(0.2), C.red),
    cmt('the fade began at 1.0', A(0.34)),
  ];
  return (
    <Desk>
      <Cam lt={t} dur={dur}>
        <Win title="bd  -  terminal">
          <Tree items={TREE} hl="fade" size={24} lh={34} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={150} w={470} h={350} lt={t} at={A(0.22)} rot={-1}>
        <Lab text="luma of every frame" />
        <Ramp w={418} h={250} p={ep(t, A(0.24), A(0.5))} start={2.72} end={4} />
      </Pin>
      <Pin x={1395} y={540} w={470} h={330} lt={t} at={A(0.55)} rot={0.8}>
        <Lab text="three settings decide" />
        {[['pix_th', 'how dark a pixel is'], ['pic_th', 'how many pixels'], ['d', 'for how long']].map(([a, b], i) => (
          <div key={a} style={{display: 'flex', alignItems: 'baseline', marginTop: 16, opacity: ep(t, A(0.58 + i * 0.07), A(0.64 + i * 0.07))}}>
            <span style={{fontFamily: F.mono, fontWeight: 700, fontSize: 30, color: C.red, width: 150}}>{a}</span>
            <span style={{fontFamily: F.sans, fontSize: 25, color: C.text}}>{b}</span>
          </div>
        ))}
      </Pin>
    </Desk>
  );
};

/* 2. The clip and the two readers */
const Setup: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const lines: TL[] = [
    {segs: [S('$ ', C.greenDim), S('node fixture/run.mjs', C.bg)], at: A(0.06), cmd: true, cps: 26},
    out('fadeOut: 125 frames', A(0.2)),
    out('max |luma read back - luma written| 0', A(0.26)),
    {segs: [S('  frames 0 to 24    luma 180', C.line)], at: A(0.4)},
    {segs: [S('  frames 25 to 74   180 down to 16', C.line)], at: A(0.5)},
    {segs: [S('  frames 75 to 99   luma 16', C.line)], at: A(0.6)},
    {segs: [S('  frames 100 to 124 luma 180', C.line)], at: A(0.7)},
  ];
  return (
    <Desk>
      <Cam lt={t} dur={dur} oy={560}>
        <Win title="bd  -  terminal">
          <Tree items={TREE} hl="fade" size={24} lh={34} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={150} w={470} h={340} lt={t} at={A(0.38)} rot={-0.9}>
        <Lab text="the clip we wrote" />
        <Ramp w={418} h={250} p={ep(t, A(0.4), A(0.78))} marks />
      </Pin>
      <Pin x={1395} y={510} w={470} h={175} lt={t} at={A(0.55)} rot={0.7}>
        <Lab text="reader 1" /><Big text="LOG LINES" size={64} /><Txt text="black_start, end, duration" size={22} mono mt={6} />
      </Pin>
      <Pin x={1395} y={715} w={470} h={165} lt={t} at={A(0.7)} rot={-0.6}>
        <Lab text="reader 2" /><Big text="LUMA SCAN" size={64} /><Txt text="Node, pixel by pixel" size={22} mt={6} />
      </Pin>
    </Desk>
  );
};

/* 3. The default says nothing */
const DefaultD: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const ds = [{d: 0.5, ok: true, at: 0.36}, {d: 1.2, ok: true, at: 0.56}, {d: 1.5, ok: false, at: 0.74}];
  const lines: TL[] = [
    {segs: bd(''), at: A(0.04), cmd: true, cps: 36},
    none(A(0.17), C.red),
    {segs: bd('d=0.5'), at: A(0.3), cmd: true, cps: 36},
    line('2.72', '4', '1.28', A(0.42)),
    {segs: bd('d=1.2'), at: A(0.5), cmd: true, cps: 36},
    line('2.72', '4', '1.28', A(0.62)),
    {segs: bd('d=1.5'), at: A(0.7), cmd: true, cps: 36},
    none(A(0.82), C.red),
  ];
  const bar = (v: number) => (v / 2.4) * 418;
  return (
    <Desk>
      <Cam lt={t} dur={dur}>
        <Win title="bd  -  terminal">
          <Tree items={TREE} hl="fade" size={24} lh={34} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={150} w={470} h={370} lt={t} at={A(0.2)} rot={-0.8}>
        <Lab text="the black against d" />
        <div style={{marginTop: 18}}>
          <div style={{fontFamily: F.mono, fontSize: 19, color: C.dim}}>black in the clip</div>
          <div style={{height: 36, background: C.text, width: bar(1.28) * ep(t, A(0.22), A(0.34)), marginTop: 4}} />
          <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 56 * D.k * 0.8, color: C.text, lineHeight: 1}}>1.28 s</div>
          <div style={{fontFamily: F.mono, fontSize: 19, color: C.dim, marginTop: 6}}>default d</div>
          <div style={{height: 36, background: C.red, width: bar(2) * ep(t, A(0.26), A(0.4)), marginTop: 4}} />
          <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 56 * D.k * 0.8, color: C.red, lineHeight: 1}}>2 s</div>
        </div>
      </Pin>
      <Pin x={1395} y={560} w={470} h={310} lt={t} at={A(0.34)} rot={0.7}>
        <Lab text="printed at each d?" />
        <div style={{marginTop: 10}}>
          <Row a="d" b="printed" c="" />
          <Row a="default 2" b="no" hot o={ep(t, A(0.2), A(0.3))} />
          {ds.map((r) => <Row key={r.d} a={String(r.d)} b={r.ok ? 'yes' : 'no'} c={r.ok ? 'start 2.72' : ''} hot={!r.ok} o={ep(t, A(r.at + 0.12), A(r.at + 0.2))} />)}
        </div>
      </Pin>
    </Desk>
  );
};

/* 4. pix_th */
const PIX = [{p: 0, s: 2.96, a: 0.04}, {p: 0.05, s: 2.84, a: 0.2}, {p: 0.1, s: 2.72, a: 0.36}, {p: 0.2, s: 2.44, a: 0.54}, {p: 0.5, s: 1.64, a: 0.72}];
const PixTh: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const lines: TL[] = [];
  PIX.forEach((r) => {
    lines.push({segs: bd(`pix_th=${r.p}:d=0.5`), at: A(r.a), cmd: true, cps: 40});
    lines.push(line(String(r.s), '4', (4 - r.s).toFixed(2).replace(/0+$/, '').replace(/\.$/, ''), A(r.a + 0.1), r.p === 0.1 ? C.red : undefined));
  });
  const cur = [...PIX].reverse().find((r) => t >= A(r.a + 0.1)) ?? null;
  return (
    <Desk>
      <Cam lt={t} dur={dur} oy={560}>
        <Win title="bd  -  terminal">
          <Tree items={TREE} hl="fade" size={24} lh={34} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={150} w={470} h={290} lt={t} at={A(0.06)} rot={-0.8}>
        <Lab text="black at or below luma" />
        <Big text="16 + 219 x P" size={74} />
        <Txt text={cur ? `pix_th ${cur.p}: luma <= ${bound(cur.p)}` : 'P is pix_th'} size={23} mono mt={10} />
        <Txt text="not 10 percent of 255 (25)" size={22} color={C.red} mt={10} />
      </Pin>
      <Pin x={1395} y={480} w={470} h={390} lt={t} at={A(0.3)} rot={0.7}>
        <Lab text="luma and first black frame" />
        <Ramp w={418} h={300} th={cur ? bound(cur.p) : undefined} start={cur ? cur.s : undefined} end={cur ? 4 : undefined} />
      </Pin>
    </Desk>
  );
};

/* 5. pic_th */
const PicTh: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const runs = [{p: 0.98, e: '2', d: '1', a: 0.05, hot: true}, {p: 0.97, e: '3', d: '2', a: 0.3, hot: false}, {p: 0.85, e: '5', d: '4', a: 0.52, hot: false}, {p: 0.5, e: '7', d: '6', a: 0.74, hot: false}];
  const lines: TL[] = [];
  runs.forEach((r) => { lines.push({segs: bd(`pic_th=${r.p}:d=0.5`), at: A(r.a), cmd: true, cps: 40}); lines.push(line('1', r.e, r.d, A(r.a + 0.1), r.hot ? C.red : undefined)); });
  const shares = [[90, '1.000'], [88, '0.978'], [86, '0.956'], [81, '0.900'], [72, '0.800'], [54, '0.600']] as const;
  const th = [...runs].reverse().find((r) => t >= A(r.a + 0.1))?.p ?? 1;
  return (
    <Desk>
      <Cam lt={t} dur={dur}>
        <Win title="bd  -  terminal">
          <Tree items={TREE} hl="partial" size={24} lh={34} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={150} w={470} h={410} lt={t} at={A(0.04)} rot={-0.7}>
        <Lab text="share of black pixels" />
        <div style={{display: 'flex', flexWrap: 'wrap', marginTop: 6}}>
          {shares.map(([r, s]) => <Pic key={r} rows={r} w={118} label={s} sub={`${r} rows`} on={Number(s) >= th} color={Number(s) >= th ? C.green : C.mute} />)}
        </div>
        <Txt text={`black at share >= ${th}`} size={22} mono mt={12} />
      </Pin>
      <Pin x={1395} y={620} w={470} h={190} lt={t} at={A(0.2)} rot={0.6}>
        <Lab text="default pic_th 0.98" />
        <Big text="0.978 IS NOT BLACK" size={46} color={C.red} />
        <Txt text="at 0.97 it is" size={24} mt={6} />
      </Pin>
    </Desk>
  );
};

/* 6. The edges */
const Edges: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const lines: TL[] = [
    {segs: bd('d=0.2'), at: A(0.04), cmd: true, cps: 40},
    line('0.2', '0.6', '0.4', A(0.12)), line('0.8', '1.2', '0.4', A(0.15)), line('1.4', '1.8', '0.4', A(0.18)), line('2', '2.4', '0.4', A(0.21)), line('2.6', '3', '0.4', A(0.24)),
    cmt('five runs: luma 16 24 32 36 37', A(0.3)),
    {segs: bd('d=0.5'), at: A(0.42), cmd: true, cps: 40},
    line('2.72', '3.96', '1.24', A(0.52), C.red),
    cmt('clip ends at 4.0', A(0.58)),
    {segs: bd('d=0.5'), at: A(0.68), cmd: true, cps: 40},
    line('2.72', '4', '1.28', A(0.78)),
    cmt('after libx264, same start', A(0.84)),
  ];
  const hl = t >= A(0.68) ? 'x264' : t >= A(0.42) ? 'fadeEnd' : 'levels';
  return (
    <Desk>
      <Cam lt={t} dur={dur} oy={560}>
        <Win title="bd  -  terminal">
          <Tree items={TREE} hl={hl} size={24} lh={34} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={150} w={470} h={290} lt={t} at={A(0.1)} rot={-0.8}>
        <Lab text="flat levels, bound 37" />
        <Swatches levels={[16, 24, 32, 36, 37, 38, 39, 40, 48, 64, 100]} th={37} />
        <Txt text="green is black: 37 yes, 38 no" size={22} mt={4} />
      </Pin>
      <Pin x={1395} y={480} w={470} h={190} lt={t} at={A(0.46)} rot={0.7}>
        <Lab text="clip ends inside the black" />
        <Big text="END 3.96" size={74} color={C.red} /><Txt text="one frame before the clip ends" size={24} mt={6} />
      </Pin>
      <Pin x={1395} y={710} w={470} h={160} lt={t} at={A(0.72)} rot={-0.6}>
        <Lab text="after libx264, crf 23" />
        <Big text="START 2.72" size={64} /><Txt text="the same as the raw clip" size={24} mt={6} />
      </Pin>
    </Desk>
  );
};

/* 7. What to check (the last 10.5 s sit under the end card, so everything happens in the first dur - 10.5 s) */
const Close: React.FC<SceneProps> = ({t, dur}) => {
  const D2 = Math.max(12, dur - 10.5);
  const A = (f: number) => f * D2;
  const lines: TL[] = [
    cmt('black starts where luma crosses the bound', A(0.06)),
    {segs: [S('  16 + 219 x pix_th', C.bg)], at: A(0.14)},
    cmt('not where the fade starts', A(0.26)),
    cmt('a black shorter than d prints nothing', A(0.4)),
    cmt('a picture is black at a share of pic_th', A(0.54)),
    {segs: bd('d=0.5'), at: A(0.68), cmd: true, cps: 36},
    line('2.72', '4', '1.28', A(0.8)),
  ];
  return (
    <Desk>
      <Cam lt={t} dur={D2} oy={540}>
        <Win title="bd  -  terminal">
          <Tree items={TREE} hl="fade" size={24} lh={34} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={160} w={470} h={390} lt={t} at={A(0.18)} rot={-0.8}>
        <Lab text="check before you trust it" />
        {['pix_th: the luma bound', 'pic_th: the share of pixels', 'd: against your black'].map((s, i) => (
          <div key={i} style={{display: 'flex', alignItems: 'baseline', marginTop: 20, opacity: ep(t, A(0.2 + i * 0.1), A(0.28 + i * 0.1))}}>
            <span style={{fontFamily: F.display, fontWeight: 900, fontSize: 52 * D.k * 0.8, color: C.green, width: 52}}>{i + 1}</span>
            <span style={{fontFamily: F.sans, fontSize: 26, color: C.text}}>{s}</span>
          </div>
        ))}
      </Pin>
      <Pin x={1395} y={600} w={470} h={260} lt={t} at={A(0.7)} rot={0.7}>
        <Lab text="not tested" color={C.red} />
        {['real footage', 'other encoders', 'other builds'].map((s, i) => (
          <div key={i} style={{fontFamily: F.sans, fontSize: 27, color: C.text, marginTop: 12, opacity: ep(t, A(0.72 + i * 0.05), A(0.78 + i * 0.05))}}>{s}</div>
        ))}
      </Pin>
    </Desk>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, setup: Setup, default: DefaultD, pix: PixTh, pic: PicTh, edges: Edges, close: Close};
