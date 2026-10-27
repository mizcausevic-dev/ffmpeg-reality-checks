import React from 'react';
import {C, F, D} from '../../kit/theme';
import {ep, eio, prog, blink} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Cinematic screen demo. A believable flat window (a file tree and a terminal, plain chrome, no traffic-light dots) on a dark desk,
 * a slow push-in over the whole scene, commands typed live, the failing line highlighted in madder, results pinned beside the window on paper cards.
 * Every string and number comes from episodes/ff91/fixture/experiment.mjs (ffmpeg 6.1.1): one 100 frame clip at 10 fps with keyframes at frames 0, 17, 21, 46, 58, 79,
 * cut with the segment muxer in mkv, mp4 and ts (27 runs). "read.mjs" and "seg.mjs" stand for the fixture's own readers (ffprobe per file, decoded frames in Node).
 * Nothing here is measured on Windows or on any other build.
 */

type Seg = {t: string; c?: string};
type TL = {segs: Seg[]; at: number; cmd?: boolean; cps?: number; band?: string; post?: Seg[]};
const S = (t: string, c?: string): Seg => ({t, c});
const len = (segs: Seg[]) => segs.reduce((a, s) => a + s.t.length, 0);

/* ---------- geometry ---------- */
const WX = 60, WY = 140, WW = 1290, WH = 720, TB = 56, TW = 300, PAD = 24;
const FS = 21, LH = 34;
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

const plain = (cmd: string): Seg[] => [S('$ ', C.greenDim), S(cmd, C.bg)];
const out = (text: string, at: number, band?: string, color?: string): TL => ({segs: [S(text, band ? C.bg : color ?? C.line)], at, band});
const note = (text: string, c: string): Seg[] => [S('   # ' + text, c)];

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


/* ---------- helpers for this film ---------- */
const GR = (t: string) => S(t, C.greenDim);
const rd = (n: number, first: number, frames: number, secs: number, ext = 'mkv', start?: string) =>
  `seg_${n}.${ext}  frame ${String(first).padStart(2)}  ${String(frames).padStart(2)} frames  ${secs.toFixed(1)} s${start !== undefined ? '  start ' + start : ''}`;
const nodeCmd = (args: string, c = C.amberDim): Seg[] => [S('$ ', C.greenDim), S('node seg.mjs ', C.bg), S(args, c)];
const BASE: TN[] = [{n: 'fx/', d: 0, dir: true}, {n: 'clip.mkv', d: 1, k: 'clip'}, {n: 'every_second.mkv', d: 1, k: 'every'}, {n: 'seg.mjs', d: 1, c: 'mute'}, {n: 'read.mjs', d: 1, c: 'mute'}];
const SEGS = (n: number, ext = 'mkv'): TN[] => Array.from({length: n}, (_, i) => ({n: `seg_${i}.${ext}`, d: 1, k: `seg_${i}.${ext}`}));

/* 1. The question */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const nSeg = Math.min(4, Math.floor(prog(t, A(0.3), A(0.42)) * 4.99));
  const hl = t >= A(0.5) ? 'seg_2.mkv' : undefined;
  const lines: TL[] = [
    {segs: [S('$ ', C.greenDim), S('ffmpeg ', C.bg), S('-i clip.mkv -c copy ', C.bg), S('-f segment -segment_time 2 ', C.amberDim), S('seg_%d.mkv', C.bg)], at: A(0.03), cmd: true, cps: 34},
    {segs: plain('node read.mjs seg_*.mkv'), at: A(0.26), cmd: true, cps: 22},
    out(rd(0, 0, 21, 2.1), A(0.4)), out(rd(1, 21, 25, 2.5), A(0.44)), out(rd(2, 46, 33, 3.3), A(0.5), C.red), out(rd(3, 79, 21, 2.1), A(0.56)),
  ];
  return (
    <Desk>
      <Cam lt={t} dur={dur}>
        <Win title="fx  -  terminal">
          <Tree items={[...BASE.slice(0, 2), ...BASE.slice(3), ...SEGS(4)]} shown={4 + nSeg} hl={hl} size={22} lh={32} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={170} w={470} h={190} lt={t} at={A(0.12)} rot={-1.1}>
        <Lab text="asked for" /><Big text="2 SECONDS" size={70} /><Txt text="a 10 s clip: five segments" />
      </Pin>
      <Pin x={1395} y={420} w={470} h={190} lt={t} at={A(0.46)} rot={0.9}>
        <Lab text="got" /><Big text="4 FILES" color={C.red} size={70} /><Txt text="of 2.1, 2.5, 3.3 and 2.1 s" />
      </Pin>
      <Pin x={1395} y={670} w={470} h={190} lt={t} at={A(0.62)} rot={-0.6}>
        <Lab text="nothing asked for" /><Big text="3.3 S" color={C.red} size={70} /><Txt text="the third segment" />
      </Pin>
    </Desk>
  );
};

/* 2. The clip and the three readers */
const Setup: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const lines: TL[] = [
    {segs: plain('node read.mjs clip.mkv'), at: A(0.04), cmd: true, cps: 24},
    out('100 frames, 10 a second, 10.0 s', A(0.16)),
    out('frame n has luma 16 + 2n', A(0.2)),
    out('keyframes at frames   0 17 21 46 58 79', A(0.28), undefined, C.amberDim),
    out('keyframes at seconds  0 1.7 2.1 4.6 5.8 7.9', A(0.32), undefined, C.amberDim),
    {segs: plain('node read.mjs every_second.mkv'), at: A(0.5), cmd: true, cps: 26},
    out('100 frames, 10 a second, 10.0 s', A(0.62)),
    out('keyframes at frames   0 10 20 30 40 50 60 70 80 90', A(0.66), undefined, C.greenDim),
  ];
  return (
    <Desk>
      <Cam lt={t} dur={dur} oy={560}>
        <Win title="fx  -  terminal">
          <Tree items={BASE} hl={t >= A(0.5) ? 'every' : 'clip'} size={22} lh={32} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={160} w={470} h={210} lt={t} at={A(0.3)} rot={-1}>
        <Lab text="reader 1" /><Big text="FFPROBE" size={78} /><Txt text="on every segment: start_time, the key flag of the first packet" size={24} />
      </Pin>
      <Pin x={1395} y={420} w={470} h={210} lt={t} at={A(0.44)} rot={0.8}>
        <Lab text="reader 2" /><Big text="FRAMES" size={78} /><Txt text="decoded, named by luma, joined in order in Node" size={24} />
      </Pin>
      <Pin x={1395} y={680} w={470} h={190} lt={t} at={A(0.6)} rot={-0.7}>
        <Lab text="the muxer's claim" /><Big text="LIST.CSV" size={70} /><Txt text="start and end of every segment, as the muxer wrote them" size={22} />
      </Pin>
    </Desk>
  );
};

/* 3. Real lengths */
const LROWS = [
  {req: '2', vals: ['2.1', '2.5', '3.3', '2.1'], big: 2, ctl: false},
  {req: '3', vals: ['4.6', '3.3', '2.1'], big: 0, ctl: false},
  {req: '5', vals: ['5.8', '4.2'], big: 0, ctl: false},
  {req: '2', vals: ['2.0', '2.0', '2.0', '2.0', '2.0'], big: -1, ctl: true},
];
const Lengths: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const lines: TL[] = [
    {segs: nodeCmd('-segment_time 2'), at: A(0.03), cmd: true, cps: 30},
    out(rd(0, 0, 21, 2.1), A(0.11)), out(rd(1, 21, 25, 2.5), A(0.13)), out(rd(2, 46, 33, 3.3), A(0.15), C.red), out(rd(3, 79, 21, 2.1), A(0.17)),
    {segs: nodeCmd('-segment_time 3'), at: A(0.28), cmd: true, cps: 30},
    out(rd(0, 0, 46, 4.6), A(0.36), C.red), out(rd(1, 46, 33, 3.3), A(0.38)), out(rd(2, 79, 21, 2.1), A(0.4)),
    {segs: nodeCmd('-segment_time 5'), at: A(0.52), cmd: true, cps: 30},
    out(rd(0, 0, 58, 5.8), A(0.6), C.red), out(rd(1, 58, 42, 4.2), A(0.62)),
    {segs: [S('$ ', C.greenDim), S('node seg.mjs ', C.bg), S('-segment_time 2 ', C.amberDim), S('every_second.mkv', C.greenDim)], at: A(0.72), cmd: true, cps: 30},
    ...[0, 1, 2, 3, 4].map((i) => ({segs: [S(rd(i, i * 20, 20, 2.0), C.greenDim)], at: A(0.82 + i * 0.02)} as TL)),
  ];
  const rowAt = [0.16, 0.39, 0.61, 0.84].map(A);
  return (
    <Desk>
      <Cam lt={t} dur={dur} oy={560}>
        <Win title="fx  -  terminal">
          <Tree items={[...BASE.slice(0, 4), ...BASE.slice(4)]} size={22} lh={32} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={150} w={470} h={720} lt={t} at={A(0.1)} rot={0.5}>
        <Lab text="real lengths, in seconds" />
        {LROWS.map((r, i) => (
          <div key={i} style={{marginTop: 22, opacity: t >= rowAt[i] ? 1 : 0, borderBottom: `1px solid ${C.line}`, paddingBottom: 12}}>
            <div style={{fontFamily: F.mono, fontSize: 21, color: C.dim, whiteSpace: 'nowrap'}}>{r.ctl ? 'asked 2 s, even keyframes' : `asked ${r.req} s, uneven keyframes`}</div>
            <div style={{display: 'flex', gap: 14, marginTop: 6}}>
              {r.vals.map((v, j) => (
                <span key={j} style={{fontFamily: F.display, fontWeight: 900, fontSize: 52 * D.k * 0.8, lineHeight: 1, color: r.ctl ? C.green : j === r.big || (i === 1 && j === 0) || (i === 2 && j === 0) ? C.red : C.text}}>{v}</span>
              ))}
            </div>
          </div>
        ))}
        <Txt text="a cut waits for the first keyframe at or after the next multiple of the request" size={22} mt={22} color={C.text} />
      </Pin>
    </Desk>
  );
};

/* 4. -segment_times */
const Times: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const lines: TL[] = [
    {segs: nodeCmd('-segment_times 2,3,5'), at: A(0.04), cmd: true, cps: 24},
    out(rd(0, 0, 21, 2.1), A(0.18)), out(rd(1, 21, 25, 2.5), A(0.24)),
    {segs: [S(rd(2, 46, 12, 1.2), C.bg)], at: A(0.34), band: C.red, post: [S('   # asked 3, got 4.6', C.bg)]},
    out(rd(3, 58, 42, 4.2), A(0.46)),
    out('# cut at the first keyframe at or after each time', A(0.6), undefined, C.mute),
    out('#   2 -> 2.1     3 -> 4.6     5 -> 5.8', A(0.64), undefined, C.mute),
  ];
  return (
    <Desk>
      <Cam lt={t} dur={dur}>
        <Win title="fx  -  terminal">
          <Tree items={[...BASE, ...SEGS(4)]} shown={5 + Math.min(4, Math.floor(prog(t, A(0.16), A(0.5)) * 4.99))} hl={t >= A(0.34) ? 'seg_2.mkv' : undefined} size={22} lh={32} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={160} w={470} h={190} lt={t} at={A(0.2)} rot={-1}>
        <Lab text="asked 2 s" /><Big text="2.1 S" size={70} /><Txt text="the first keyframe at or after 2.0" size={24} />
      </Pin>
      <Pin x={1395} y={410} w={470} h={220} lt={t} at={A(0.36)} rot={0.9}>
        <Lab text="asked 3 s" /><Big text="4.6 S" color={C.red} size={70} /><Txt text="no keyframe in between: the segment before it is 2.5 s" size={24} />
      </Pin>
      <Pin x={1395} y={690} w={470} h={170} lt={t} at={A(0.5)} rot={-0.7}>
        <Lab text="asked 5 s" /><Big text="5.8 S" size={70} /><Txt text="the last one is 4.2 s" size={24} />
      </Pin>
    </Desk>
  );
};

/* 5. -reset_timestamps */
const SROWS = [
  {label: 'default, mkv', vals: ['0', '4.6', '7.9'], c: 'text'},
  {label: 'reset 1, mkv and mp4', vals: ['0', '0', '0'], c: 'green'},
  {label: 'reset 1, ts', vals: ['1.4', '1.4', '1.4'], c: 'red'},
  {label: 'list.csv, any of them', vals: ['0', '4.6', '7.9'], c: 'text'},
];
const Reset: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const lines: TL[] = [
    {segs: nodeCmd('-segment_time 3'), at: A(0.03), cmd: true, cps: 30},
    out(rd(0, 0, 46, 4.6, 'mkv', '0'), A(0.1)), out(rd(1, 46, 33, 3.3, 'mkv', '4.6'), A(0.12)), out(rd(2, 79, 21, 2.1, 'mkv', '7.9'), A(0.14)),
    {segs: nodeCmd('-segment_time 3 -reset_timestamps 1'), at: A(0.24), cmd: true, cps: 30},
    out(rd(0, 0, 46, 4.6, 'mkv', '0'), A(0.34)), out(rd(1, 46, 33, 3.3, 'mkv', '0'), A(0.36)), out(rd(2, 79, 21, 2.1, 'mkv', '0'), A(0.38)),
    {segs: nodeCmd('-segment_time 3 -reset_timestamps 1 --ts'), at: A(0.48), cmd: true, cps: 30},
    out(rd(0, 0, 46, 4.6, 'ts', '1.4'), A(0.6), C.red), out(rd(1, 46, 33, 3.3, 'ts', '1.4'), A(0.62), C.red), out(rd(2, 79, 21, 2.1, 'ts', '1.4'), A(0.64), C.red),
    {segs: plain('cat list.csv'), at: A(0.72), cmd: true, cps: 14},
    out('seg_0.ts,0.000000,4.600000', A(0.8)), out('seg_1.ts,4.600000,7.900000', A(0.83)), out('seg_2.ts,7.900000,10.000000', A(0.86)),
  ];
  const rowAt = [0.14, 0.38, 0.64, 0.86].map(A);
  return (
    <Desk>
      <Cam lt={t} dur={dur} oy={560}>
        <Win title="fx  -  terminal">
          <Tree items={BASE} size={22} lh={32} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={150} w={470} h={720} lt={t} at={A(0.08)} rot={0.4}>
        <Lab text="start_time of each segment" />
        {SROWS.map((r, i) => (
          <div key={i} style={{marginTop: 22, opacity: t >= rowAt[i] ? 1 : 0, borderBottom: `1px solid ${C.line}`, paddingBottom: 12}}>
            <div style={{fontFamily: F.mono, fontSize: 21, color: C.dim, whiteSpace: 'nowrap'}}>{r.label}</div>
            <div style={{display: 'flex', gap: 22, marginTop: 6}}>
              {r.vals.map((v, j) => <span key={j} style={{fontFamily: F.display, fontWeight: 900, fontSize: 58 * D.k * 0.8, lineHeight: 1, color: C[r.c as 'text']}}>{v}</span>)}
            </div>
          </div>
        ))}
        <Txt text="the list stays on the source clock, and its second column is an end time, not a length" size={22} mt={22} color={C.text} />
      </Pin>
    </Desk>
  );
};

/* 6. Joined again */
const Join: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const lines: TL[] = [
    {segs: plain('cat seg_*.ts > all.ts'), at: A(0.03), cmd: true, cps: 24},
    {segs: plain('node read.mjs all.ts'), at: A(0.12), cmd: true, cps: 22},
    {segs: [S('100 frames, 0 to 99, in order', C.greenDim)], at: A(0.22)},
    out('the clock jumps back 3 times', A(0.27), C.red),
    {segs: [S('$ ', C.greenDim), S('ffmpeg -f concat -i list.txt -c copy all.mkv', C.bg)], at: A(0.38), cmd: true, cps: 40},
    {segs: plain('node read.mjs all.mkv'), at: A(0.48), cmd: true, cps: 22},
    {segs: [S('100 frames, 0 to 99, in order', C.greenDim)], at: A(0.56)},
    out('the clock runs 0 to 16.6 s, a gap of 4.7 s', A(0.61), C.red),
    {segs: plain('node read.mjs all_reset.mkv'), at: A(0.72), cmd: true, cps: 22},
    {segs: [S('100 frames, 0 to 99, in order', C.greenDim)], at: A(0.8)},
    {segs: [S('the clock runs 0 to 9.9 s, no gap', C.greenDim)], at: A(0.84)},
  ];
  return (
    <Desk>
      <Cam lt={t} dur={dur}>
        <Win title="fx  -  terminal">
          <Tree items={[{n: 'fx/', d: 0, dir: true}, {n: 'seg_*.ts', d: 1}, {n: 'seg_*.mkv', d: 1}, {n: 'list.txt', d: 1, c: 'mute'}, {n: 'all.ts', d: 1, k: 'all.ts'}, {n: 'all.mkv', d: 1, k: 'all.mkv'}, {n: 'all_reset.mkv', d: 1, k: 'all_reset.mkv'}]}
            shown={t >= A(0.72) ? 7 : t >= A(0.4) ? 6 : t >= A(0.05) ? 5 : 4} hl={t >= A(0.72) ? 'all_reset.mkv' : t >= A(0.4) ? 'all.mkv' : 'all.ts'} size={22} lh={32} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={150} w={470} h={190} lt={t} at={A(0.18)} rot={-1}>
        <Lab text="frames joined in Node" /><Big text="27 OF 27" color={C.green} size={64} /><Txt text="runs: 0 to 99, in order, none lost" size={24} />
      </Pin>
      <Pin x={1395} y={385} w={470} h={190} lt={t} at={A(0.3)} rot={0.8}>
        <Lab text="ts bytes, with a reset" /><Big text="3 JUMPS" color={C.red} size={64} /><Txt text="back to 1.4 s at every boundary" size={24} />
      </Pin>
      <Pin x={1395} y={620} w={470} h={250} lt={t} at={A(0.64)} rot={-0.6}>
        <Lab text="mkv, no reset, concat" /><Big text="16.6 S" color={C.red} size={64} /><Txt text="a segment's duration is its end time: 2.1, 4.6, 7.9, 10.0. mp4 and ts report the length" size={22} />
      </Pin>
    </Desk>
  );
};

/* 7. What to do (the last 10.5 s sit under the end card, so everything happens in the first dur - 10.5 s) */
const Close: React.FC<SceneProps> = ({t, dur}) => {
  const D2 = Math.max(12, dur - 10.5);
  const A = (f: number) => f * D2;
  const lines: TL[] = [
    {segs: [S('$ ', C.greenDim), S('node seg.mjs ', C.bg), S('-segment_time 2 ', C.amberDim), S('every_second.mkv', C.greenDim)], at: A(0.04), cmd: true, cps: 28},
    ...[0, 1, 2, 3, 4].map((i) => ({segs: [S(rd(i, i * 20, 20, 2.0), C.greenDim)], at: A(0.18 + i * 0.04)} as TL)),
    out('# keyframes where the cuts should be: 2.0 s, five times', A(0.44), undefined, C.mute),
  ];
  return (
    <Desk>
      <Cam lt={t} dur={D2} oy={540}>
        <Win title="fx  -  terminal">
          <Tree items={BASE} hl="every" size={22} lh={32} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={150} w={470} h={450} lt={t} at={A(0.5)} rot={-0.8}>
        <Lab text="what to do" />
        {['keyframes at the cuts', 'reset for separate files', 'not for ts joined as bytes', 'read every segment'].map((s, i) => (
          <div key={i} style={{display: 'flex', alignItems: 'baseline', marginTop: 16, opacity: ep(t, A(0.52 + i * 0.04), A(0.58 + i * 0.04))}}>
            <span style={{fontFamily: F.display, fontWeight: 900, fontSize: 52 * D.k * 0.8, color: C.green, width: 52}}>{i + 1}</span>
            <span style={{fontFamily: F.sans, fontSize: 27, color: C.text}}>{s}</span>
          </div>
        ))}
      </Pin>
      <Pin x={1395} y={650} w={470} h={220} lt={t} at={A(0.74)} rot={0.7}>
        <Lab text="not tested" color={C.red} />
        {['other builds', 'B frames', 'audio', 'real footage'].map((s, i) => (
          <div key={i} style={{fontFamily: F.sans, fontSize: 25, color: C.text, marginTop: 10, opacity: ep(t, A(0.76 + i * 0.035), A(0.81 + i * 0.035))}}>{s}</div>
        ))}
      </Pin>
    </Desk>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, setup: Setup, lengths: Lengths, times: Times, reset: Reset, join: Join, close: Close};
