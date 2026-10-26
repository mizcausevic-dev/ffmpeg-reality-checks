import React from 'react';
import {C, F, D} from '../../kit/theme';
import {ep, eio, prog, blink} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Cinematic screen demo. A believable flat window (a file tree and a terminal, plain chrome, no traffic-light dots) on a dark desk,
 * a slow push-in over the whole scene, commands typed live, the failing line highlighted in madder, results pinned beside the window on paper cards.
 * Every string and number comes from episodes/ff60/fixture/experiment.mjs (ffmpeg 6.1.1, libass 0.17.1, 12 paths x 3 spellings x 6 ways of writing = 216 runs).
 * Nothing here is measured on Windows or on any other build.
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

/* command builders: the -vf argument is shown exactly as the shell receives it; special characters are marked */
const vf = (arg: string, q: string = '"', hc: string = C.redDim, flag = '-vf '): Seg[] => {
  const i = arg.indexOf('=') + 1;
  const head = arg.slice(0, i), name = arg.slice(i);
  const segs: Seg[] = [S('$ ', C.greenDim), S('ffmpeg ', C.bg), S('… ', C.mute), S(flag, C.amberDim), S(q + head, C.bg)];
  let buf = '';
  for (const ch of name) {
    if (":'\\[],;=".includes(ch)) { if (buf) segs.push(S(buf, C.bg)); buf = ''; segs.push(S(ch, hc)); } else buf += ch;
  }
  if (buf) segs.push(S(buf, C.bg));
  segs.push(S(q, C.bg));
  return segs;
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

/* ---------- tree data (the 12 paths, the 3 lookalikes, the safe-name copies) ---------- */
const FULL: TN[] = [
  {n: 'fx/', d: 0, dir: true},
  {n: 'C:/', d: 1, dir: true}, {n: 'sub.srt', d: 2, k: 'dircolon'},
  {n: 'dir with space/', d: 1, dir: true}, {n: 'sub.srt', d: 2, k: 'dirspace'},
  {n: "dir's/", d: 1, dir: true}, {n: 'sub.srt', d: 2, k: 'dirapos'},
  {n: 'dirs/', d: 1, dir: true, c: 'amberDim'}, {n: 'sub.srt', d: 2, k: 'x1', c: 'amberDim'},
  {n: 'a,b.srt', d: 1, k: 'comma'}, {n: 'a:b.srt', d: 1, k: 'colon'}, {n: 'a;b.srt', d: 1, k: 'semicolon'}, {n: 'a=b.srt', d: 1, k: 'equals'},
  {n: 'a[1].srt', d: 1, k: 'bracket'}, {n: 'a\\b.srt', d: 1, k: 'backslash'}, {n: 'ab.srt', d: 1, k: 'x2', c: 'amberDim'},
  {n: "it's.srt", d: 1, k: 'apos'}, {n: 'its.srt', d: 1, k: 'x3', c: 'amberDim'}, {n: 'my subs.srt', d: 1, k: 'space'}, {n: 'sub.srt', d: 1, k: 'plain'},
  {n: 'ref0 .. ref11.srt', d: 1, c: 'mute'},
];

/* 1. The question */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const tree: TN[] = [{n: 'fx/', d: 0, dir: true}, {n: 'a:b.srt', d: 1, k: 'colon'}, {n: "it's.srt", d: 1, k: 'apos'}, {n: 'its.srt', d: 1, k: 'x3', c: 'amberDim'}];
  const hl = t >= A(0.4) ? 'apos' : t >= A(0.04) ? 'colon' : undefined;
  const lines: TL[] = [
    {segs: vf('subtitles=a:b.srt'), at: A(0.03), cmd: true, cps: 40},
    out('Unable to parse option value "b.srt" as image size', A(0.17), C.red),
    {segs: vf("subtitles=it's.srt"), at: A(0.36), cmd: true, cps: 40},
    {segs: plain('echo $?'), at: A(0.5), cmd: true, cps: 14},
    {segs: [S('0', C.bg)], at: A(0.6), band: C.red, post: note('and the subtitles are not the ones you named', C.amberDim)},
  ];
  return (
    <Desk>
      <Cam lt={t} dur={dur}>
        <Win title="fx  -  terminal">
          <Tree items={tree} hl={hl} size={24} lh={34} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={170} w={470} h={190} lt={t} at={A(0.2)} rot={-1.2}>
        <Lab text="a:b.srt" /><Big text="CANNOT OPEN" color={C.red} size={70} /><Txt text="stops with an error" />
      </Pin>
      <Pin x={1395} y={420} w={470} h={210} lt={t} at={A(0.58)} rot={0.9}>
        <Lab text="it's.srt" /><Big text="WRONG FILE" color={C.red} size={70} /><Txt text="exit status 0, no message: the frame is its.srt's" />
      </Pin>
      <Pin x={1395} y={660} w={470} h={210} lt={t} at={A(0.8)} rot={-0.6}>
        <Lab text="the test" /><Big text="216 RUNS" color={C.text} size={70} /><Txt text="12 paths, 3 spellings, 6 ways to write each" size={24} />
      </Pin>
    </Desk>
  );
};

/* 2. The test and the two readers */
const Setup: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const shown = Math.floor(prog(t, A(0.04), A(0.5)) * FULL.length);
  const lines: TL[] = [
    {segs: plain('cat "my subs.srt"'), at: A(0.05), cmd: true, cps: 28},
    out('1', A(0.14)), out('00:00:00,000 --> 00:00:02,000', A(0.16)), out('FILE NUMBER 02', A(0.18)),
    {segs: plain('cat ab.srt'), at: A(0.28), cmd: true, cps: 22},
    out('1', A(0.35)), out('00:00:00,000 --> 00:00:02,000', A(0.37)), {segs: [S('DECOY AB', C.amberDim)], at: A(0.39)},
    {segs: plain('ls ref*.srt | wc -l'), at: A(0.55), cmd: true, cps: 24},
    out('12', A(0.64)),
  ];
  return (
    <Desk>
      <Cam lt={t} dur={dur} oy={560}>
        <Win title="fx  -  terminal">
          <Tree items={FULL} shown={shown} size={21} lh={29} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={160} w={470} h={210} lt={t} at={A(0.44)} rot={-1}>
        <Lab text="reader 1" /><Big text="129600" size={78} /><Txt text="bytes of the decoded frame, compared one by one in Node" size={24} />
      </Pin>
      <Pin x={1395} y={420} w={470} h={210} lt={t} at={A(0.58)} rot={0.8}>
        <Lab text="reader 2" /><Big text="26743289" size={78} /><Txt text="start of the framemd5 of the same frame, from ffmpeg" size={24} />
      </Pin>
      <Pin x={1395} y={680} w={470} h={190} lt={t} at={A(0.8)} rot={-0.7}>
        <Lab text="controls" /><Txt text="no subtitles: 0 pixels burned" mono size={20} mt={10} /><Txt text="safe names: 1124 to 1163" mono size={20} mt={6} /><Txt text="lookalikes (amber): other text" mono size={20} mt={6} />
      </Pin>
    </Desk>
  );
};

/* 3. Written as is */
type Row = {id: string; name: string; res: 'ok' | 'error' | 'wrong'; msg?: string[]; arg: string};
const ROWS: Row[] = [
  {id: 'plain', name: 'sub.srt', res: 'ok', arg: 'subtitles=sub.srt'},
  {id: 'space', name: 'my subs.srt', res: 'ok', arg: 'subtitles=my subs.srt'},
  {id: 'dirspace', name: 'dir with space/sub.srt', res: 'ok', arg: 'subtitles=dir with space/sub.srt'},
  {id: 'colon', name: 'a:b.srt', res: 'error', arg: 'subtitles=a:b.srt', msg: ['Unable to parse option value "b.srt" as image size']},
  {id: 'bracket', name: 'a[1].srt', res: 'error', arg: 'subtitles=a[1].srt', msg: ['Trailing garbage after a filter: .srt']},
  {id: 'comma', name: 'a,b.srt', res: 'error', arg: 'subtitles=a,b.srt', msg: ["No such filter: 'b.srt'"]},
  {id: 'semicolon', name: 'a;b.srt', res: 'error', arg: 'subtitles=a;b.srt', msg: ["No such filter: 'b.srt'"]},
  {id: 'equals', name: 'a=b.srt', res: 'error', arg: 'subtitles=a=b.srt', msg: ["Error applying option 'a' to filter", "  'subtitles': Option not found"]},
  {id: 'dircolon', name: 'C:/sub.srt', res: 'error', arg: 'subtitles=C:/sub.srt', msg: ['Unable to parse option value "/sub.srt" as image size']},
  {id: 'apos', name: "it's.srt", res: 'wrong', arg: "subtitles=it's.srt"},
  {id: 'backslash', name: 'a\\b.srt', res: 'wrong', arg: 'subtitles=a\\b.srt'},
  {id: 'dirapos', name: "dir's/sub.srt", res: 'wrong', arg: "subtitles=dir's/sub.srt"},
];
const RES_COL = {ok: ['greenDim', 'green'], error: ['redDim', 'red'], wrong: ['red', 'bg']} as const;
const RES_TXT = {ok: 'OK', error: 'ERROR', wrong: 'WRONG FILE'} as const;

const Raw: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  // command start times follow the narration: 3 ok, 6 errors, 3 wrong
  const starts = [0.04, 0.12, 0.2, 0.33, 0.4, 0.46, 0.52, 0.58, 0.65, 0.72, 0.8, 0.88].map(A);
  const doneAt = starts.map((s, i) => s + 0.55 + (ROWS[i].msg ? 0.25 : 0));
  const lines: TL[] = [];
  ROWS.forEach((r, i) => {
    const wrong = r.res === 'wrong';
    lines.push({segs: vf(r.arg), at: starts[i], cmd: true, cps: 80});
    (r.msg ?? []).forEach((m, j) => lines.push(out(m, starts[i] + 0.5 + j * 0.05, C.red)));
    if (wrong) lines.push(out('exit status 0, nothing printed', starts[i] + 0.5, C.red));
  });
  const nowIdx = Math.max(0, starts.filter((s) => t >= s).length - 1);
  const known = ROWS.filter((_, i) => t >= doneAt[i]);
  const cnt = (k: string) => known.filter((r) => r.res === k).length;
  return (
    <Desk>
      <Cam lt={t} dur={dur} oy={560}>
        <Win title="fx  -  terminal">
          <Tree items={FULL} hl={ROWS[nowIdx].id} size={21} lh={29} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={150} w={470} h={720} lt={t} at={0.15} rot={0.5}>
        <Lab text="the string, written as is" />
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 8}}>
          {(['ok', 'error', 'wrong'] as const).map((k) => (
            <div key={k} style={{width: 140}}>
              <Big text={String(cnt(k))} size={74} color={k === 'ok' ? C.green : C.red} />
              <div style={{fontFamily: F.mono, fontSize: 17, letterSpacing: 1.5, color: C.dim, whiteSpace: 'nowrap'}}>{k === 'wrong' ? 'WRONG FILE' : k.toUpperCase()}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop: 16}}>
          {ROWS.map((r, i) => {
            const on = t >= doneAt[i];
            const bg = C[RES_COL[r.res][0]], fg = C[RES_COL[r.res][1]];
            return (
              <div key={r.id} style={{height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.line}`, opacity: on ? 1 : 0.18}}>
                <span style={{fontFamily: F.mono, fontSize: 21, color: C.text, whiteSpace: 'nowrap'}}><M s={r.name} /></span>
                {on && <span style={{fontFamily: F.mono, fontSize: 17, letterSpacing: 1, background: bg, color: fg, padding: '2px 9px', whiteSpace: 'nowrap'}}>{RES_TXT[r.res]}</span>}
              </div>
            );
          })}
        </div>
        <Txt text="wrong: the frame equals the lookalike's frame, in both readers" size={19} mt={12} color={C.dim} />
      </Pin>
    </Desk>
  );
};

/* 4. Why it breaks */
const Why: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const tree: TN[] = [{n: 'fx/', d: 0, dir: true}, {n: 'a,b.srt', d: 1, k: 'comma'}, {n: 'a:b.srt', d: 1, k: 'colon'}, {n: "it's.srt", d: 1, k: 'apos'}, ...(t < A(0.66) ? [{n: 'its.srt', d: 1, k: 'x3', c: 'amberDim'} as TN] : [])];
  const hl = t >= A(0.58) ? 'apos' : t >= A(0.3) ? 'colon' : 'comma';
  const lines: TL[] = [
    {segs: vf('subtitles=a,b.srt'), at: A(0.04), cmd: true, cps: 36},
    out("No such filter: 'b.srt'", A(0.17), C.red),
    {segs: vf('subtitles=a:b.srt'), at: A(0.3), cmd: true, cps: 36},
    out('Unable to parse option value "b.srt" as image size', A(0.43), C.red),
    {segs: plain('rm its.srt'), at: A(0.56), cmd: true, cps: 16},
    {segs: vf("subtitles=it's.srt"), at: A(0.68), cmd: true, cps: 36},
    out('Unable to open its.srt', A(0.82), C.red),
  ];
  return (
    <Desk>
      <Cam lt={t} dur={dur}>
        <Win title="fx  -  terminal">
          <Tree items={tree} hl={hl} size={24} lh={34} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={150} w={470} h={335} lt={t} at={A(0.1)} rot={-0.8}>
        <Lab text="layer 1: the filter graph" />
        {[[',', "ends the arguments: No such filter"], [';', "same: No such filter"], ['[ ]', 'Trailing garbage after a filter']].map(([ch, tx], i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', marginTop: 12}}>
            <span style={{fontFamily: F.mono, fontWeight: 700, fontSize: 48, color: C.red, width: 96, whiteSpace: 'nowrap', flexShrink: 0}}>{ch}</span>
            <span style={{fontFamily: F.sans, fontSize: 22, color: C.text, lineHeight: 1.25}}>{tx}</span>
          </div>
        ))}
      </Pin>
      <Pin x={1395} y={530} w={470} h={335} lt={t} at={A(0.34)} rot={0.7}>
        <Lab text="layer 2: the options" />
        {[[':', 'starts the next option: b.srt read as an image size'], ["'", 'eaten: its.srt is opened instead'], ['\\', 'eaten: ab.srt is opened instead']].map(([ch, tx], i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', marginTop: 12}}>
            <span style={{fontFamily: F.mono, fontWeight: 700, fontSize: 48, color: C.red, width: 96, whiteSpace: 'nowrap', flexShrink: 0}}>{ch}</span>
            <span style={{fontFamily: F.sans, fontSize: 22, color: C.text, lineHeight: 1.25}}>{tx}</span>
          </div>
        ))}
      </Pin>
    </Desk>
  );
};

/* 5. What fixes it */
const BARS = [
  {label: 'as is', n: 3, c: 'red'}, {label: 'one level of backslashes', n: 3, c: 'red'}, {label: 'quotes', n: 6, c: 'amber'},
  {label: 'two levels', n: 11, c: 'green'}, {label: 'two levels, = escaped too', n: 12, c: 'green'},
];
const Fix: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const tree: TN[] = [{n: 'fx/', d: 0, dir: true}, {n: 'a:b.srt', d: 1, k: 'colon'}, {n: 'a[1].srt', d: 1, k: 'bracket'}, {n: 'a=b.srt', d: 1, k: 'equals'}];
  const hl = t >= A(0.7) ? 'equals' : t >= A(0.22) && t < A(0.3) ? 'bracket' : 'colon';
  const lines: TL[] = [
    {segs: vf('subtitles=a\\:b.srt'), at: A(0.02), cmd: true, cps: 30},
    out('Unable to parse option value "b.srt" as image size', A(0.13), C.red),
    {segs: vf("subtitles='a[1].srt'", '"', C.greenDim), at: A(0.24), cmd: true, cps: 30, post: note('ok', C.greenDim)},
    {segs: vf("subtitles='a:b.srt'"), at: A(0.32), cmd: true, cps: 30},
    out('Unable to parse option value "b.srt" as image size', A(0.43), C.red),
    {segs: vf('subtitles=a\\\\:b.srt', "'"), at: A(0.5), cmd: true, cps: 30},
    out('Unable to open a:b.srt', A(0.62), C.red),
    {segs: vf('subtitles=./a\\\\:b.srt', "'", C.greenDim), at: A(0.72), cmd: true, cps: 30, post: note('ok', C.greenDim)},
    {segs: vf('subtitles=a\\\\=b.srt', "'", C.greenDim), at: A(0.84), cmd: true, cps: 30, post: note('ok', C.greenDim)},
  ];
  const barAt = [0.08, 0.14, 0.34, 0.54, 0.78].map(A);
  return (
    <Desk>
      <Cam lt={t} dur={dur} oy={560}>
        <Win title="fx  -  terminal">
          <Tree items={tree} hl={hl} size={24} lh={34} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={150} w={470} h={720} lt={t} at={0.15} rot={0.4}>
        <Lab text="paths read as the file you meant" />
        <Txt text="12 tested, full path" size={22} mt={4} color={C.dim} />
        {BARS.map((b, i) => {
          const p = ep(t, barAt[i], barAt[i] + 0.8);
          return (
            <div key={b.label} style={{marginTop: 16, opacity: t >= barAt[i] ? 1 : 0.0}}>
              <div style={{fontFamily: F.mono, fontSize: 19, color: C.dim, whiteSpace: 'nowrap'}}>{b.label}</div>
              <div style={{display: 'flex', alignItems: 'center', marginTop: 4}}>
                <div style={{width: 336, height: 34, background: C.panel}}>
                  <div style={{width: (336 * b.n * p) / 12, height: 34, background: C[b.c]}} />
                </div>
                <span style={{fontFamily: F.display, fontWeight: 900, fontSize: 52 * D.k * 0.8, color: C[b.c], marginLeft: 14, lineHeight: 1}}>{Math.round(b.n * p)}</span>
              </div>
            </div>
          );
        })}
        <Txt text="a relative name with a colon: ./ in front lifts two levels from 9 to 11" size={19} mt={18} color={C.text} />
      </Pin>
    </Desk>
  );
};

/* 6. The shell, and what to do (the last 10.5 s sit under the end card, so everything happens in the first dur - 10.5 s) */
const Close: React.FC<SceneProps> = ({t, dur}) => {
  const D2 = Math.max(12, dur - 10.5);
  const A = (f: number) => f * D2;
  const tree: TN[] = [{n: 'fx/', d: 0, dir: true}, {n: 'a:b.srt', d: 1, k: 'colon'}];
  const sh = (q1: string, q2: string, hc: string, at: number): TL => ({segs: [S('$ ', C.greenDim), S('ffmpeg ', C.bg), S('… ', C.mute), S('-vf ', C.amberDim), S(q1 + 'subtitles=/tmp/fx/a', C.bg), S('\\\\:', hc), S('b.srt' + q2, C.bg)], at, cmd: true, cps: 34});
  const lines: TL[] = [
    out('# no quotes', A(0.06), undefined, C.mute),
    sh('', '', C.redDim, A(0.1)),
    out('Unable to parse option value "b.srt" as image size', A(0.22), C.red),
    out('# double quotes', A(0.27), undefined, C.mute),
    sh('"', '"', C.redDim, A(0.31)),
    out('Unable to parse option value "b.srt" as image size', A(0.43), C.red),
    out('# single quotes', A(0.47), undefined, C.mute),
    sh("'", "'", C.greenDim, A(0.51)),
    out('ok: the frame is a:b.srt, nothing else', A(0.63), undefined, C.greenDim),
  ];
  return (
    <Desk>
      <Cam lt={t} dur={D2} oy={540}>
        <Win title="fx  -  terminal">
          <Tree items={tree} hl="colon" size={24} lh={34} />
          <Term lines={lines} lt={t} />
        </Win>
      </Cam>
      <Pin x={1395} y={160} w={470} h={380} lt={t} at={A(0.66)} rot={-0.8}>
        <Lab text="what to do" />
        {['two levels of backslashes', './ before a relative colon', 'single quotes in the shell', 'or copy to a safe name'].map((s, i) => (
          <div key={i} style={{display: 'flex', alignItems: 'baseline', marginTop: 16, opacity: ep(t, A(0.68 + i * 0.03), A(0.73 + i * 0.03))}}>
            <span style={{fontFamily: F.display, fontWeight: 900, fontSize: 52 * D.k * 0.8, color: C.green, width: 52}}>{i + 1}</span>
            <span style={{fontFamily: F.sans, fontSize: 27, color: C.text}}>{s}</span>
          </div>
        ))}
      </Pin>
      <Pin x={1395} y={590} w={470} h={270} lt={t} at={A(0.8)} rot={0.7}>
        <Lab text="not tested" color={C.red} />
        {['Windows paths and cmd.exe', 'other ffmpeg builds', 'other libass versions', 'non ASCII names'].map((s, i) => (
          <div key={i} style={{fontFamily: F.sans, fontSize: 25, color: C.text, marginTop: 10, opacity: ep(t, A(0.82 + i * 0.035), A(0.87 + i * 0.035))}}>{s}</div>
        ))}
      </Pin>
    </Desk>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, setup: Setup, raw: Raw, why: Why, fix: Fix, close: Close};
