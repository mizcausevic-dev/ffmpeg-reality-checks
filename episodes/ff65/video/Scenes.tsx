import React from 'react';
import {C, F, D, W, H} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import {Figure} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff65/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
   Style: fast code. Hard cuts every 2 to 3 seconds with a quick ink wipe, huge monospace code typed live, one counter,
   one punch-line number per cut. Palette lab only, flat fills, square corners, no gradients. */

/* ---------- measured data ---------- */
const PIC = {sec: 5, frames: 125};                 // the picture: 5 s at 25 fps
const SONG = {sec: 3, samples: 144000};            // the song
const G8 = {sec: 8, samples: 384000};              // apad alone, -t 8
const G12 = {sec: 12, samples: 576000};            // apad alone, -t 12
const SHORT = {samples: 238208, want: 240000, miss: 1792, ms: 37};   // -shortest, pcm
const WHOLE = {samples: 240000};                   // whole_dur=5, pad_dur=2, pad_len=96000, whole_len=240000
const WHOLE4 = {samples: 192000};                  // whole_dur=4
const LONG7 = {samples: 336000};                   // 7 s song, whole_dur=5
const LOOP = {frames: 200, sec: 8};                // looped still, apad, -shortest, -t 8
const V43 = {frames: 108, sec: 4.32, samples: 206400, aud: 4.3};  // 4.3 s picture, whole_dur=4.3

/* ---------- cut helpers ---------- */
const cutOf = (t: number, cuts: number[]) => {
  let i = 0;
  for (let k = 0; k < cuts.length; k++) if (t >= cuts[k]) i = k;
  return {i, lt: t - cuts[i]};
};
/* the quick wipe: an ink bar crossing the new cut in 0.3 s */
const Wipe: React.FC<{t: number; cuts: number[]}> = ({t, cuts}) => {
  const {i, lt} = cutOf(t, cuts);
  if (i === 0 || lt > 0.3) return null;
  const bw = 320, x = -bw + (W + bw) * prog(lt, 0, 0.3);
  return <div style={{position: 'absolute', left: x, top: 0, width: bw, height: H, background: C.text}} />;
};

/* ---------- local drawing kit ---------- */
const Svg: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <svg style={{position: 'absolute', left: 0, top: 0}} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
    <defs>
      <pattern id="hatch" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)">
        <rect width="16" height="16" fill={C.redDim} />
        <line x1="0" y1="0" x2="0" y2="16" stroke={C.red} strokeWidth="5" />
      </pattern>
    </defs>
    {children}
  </svg>
);
const Tx: React.FC<{x: number; y: number; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; mono?: boolean; weight?: number; o?: number; children?: React.ReactNode}> = ({x, y, size = 28, color = C.text, anchor = 'start', mono = true, weight = 700, o = 1, children}) => (
  <text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor} fontFamily={mono ? F.mono : F.sans} fontWeight={weight} opacity={o}>{children}</text>
);
type Kind = 'pic' | 'song' | 'pad' | 'ok';
/* read at render time: the palette is applied per render, so C must not be captured at module load */
const fillOf = (k: Kind): string => ({pic: C.text, song: C.cyan, pad: 'url(#hatch)', ok: C.greenDim})[k];
const Bar: React.FC<{x0: number; y: number; from?: number; to: number; pps: number; kind: Kind; h?: number; p?: number}> = ({x0, y, from = 0, to, pps, kind, h = 50, p = 1}) => (
  <rect x={x0 + from * pps} y={y} width={Math.max(0, (to - from) * pps * p)} height={h} fill={fillOf(kind)} stroke={kind === 'pad' ? C.red : kind === 'ok' ? C.green : 'none'} strokeWidth={kind === 'pad' || kind === 'ok' ? 3 : 0} />
);
const Ruler: React.FC<{x0: number; y: number; pps: number; secs: number; o?: number}> = ({x0, y, pps, secs, o = 1}) => (
  <g opacity={o}>
    <line x1={x0} y1={y} x2={x0 + secs * pps} y2={y} stroke={C.mute} strokeWidth={3} />
    {Array.from({length: secs + 1}, (_, s) => (
      <g key={s}>
        <line x1={x0 + s * pps} y1={y} x2={x0 + s * pps} y2={y + 12} stroke={C.mute} strokeWidth={3} />
        <Tx x={x0 + s * pps} y={y + 40} size={22} color={C.dim} anchor="middle" weight={600}>{s}</Tx>
      </g>
    ))}
    <Tx x={x0 + secs * pps + 16} y={y + 40} size={22} color={C.dim} weight={600}>s</Tx>
  </g>
);
const Wall: React.FC<{x: number; y1: number; y2: number; label: string; o?: number}> = ({x, y1, y2, label, o = 1}) => (
  <g opacity={o}>
    <line x1={x} y1={y1} x2={x} y2={y2} stroke={C.red} strokeWidth={8} />
    <Tx x={x} y={y1 - 14} size={34} color={C.red} anchor="middle" weight={800}>{label}</Tx>
  </g>
);
const Lab: React.FC<{y: number; h: number; text: string; sub?: string; color?: string; o?: number}> = ({y, h, text, sub, color = C.text, o = 1}) => (
  <g opacity={o}>
    <Tx x={96} y={y + h / 2 - (sub ? 2 : -10)} size={32} color={color} weight={800}>{text}</Tx>
    {sub && <Tx x={96} y={y + h / 2 + 28} size={22} color={C.dim} weight={500} mono={false}>{sub}</Tx>}
  </g>
);

type Seg = [string, string?];
const codeH = (n: number, size: number) => Math.round(n * size * 1.4 + 62);
/* huge monospace code, typed live; the caret blinks at the end of what is typed */
const Code: React.FC<{y: number; lines: Seg[][]; lt: number; a?: number; b?: number; size?: number; x?: number; w?: number}> = ({y, lines, lt, a = 0.15, b = 2.2, size = 58, x = 96, w = 1728}) => {
  const lens = lines.map((l) => l.reduce((s, [tx]) => s + tx.length, 0));
  const total = lens.reduce((s, n) => s + n, 0);
  const shown = Math.floor(total * prog(lt, a, b));
  let acc = 0, caretLine = 0;
  for (let i = 0; i < lens.length; i++) { if (shown <= acc + lens[i]) { caretLine = i; break; } acc += lens[i]; caretLine = i; }
  const caretOn = lt >= a && (shown < total || Math.floor(lt * 2) % 2 === 0);
  let left = shown;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: codeH(lines.length, size), boxSizing: 'border-box', padding: '30px 36px', background: C.codeBg, border: `3px solid ${C.text}`, fontFamily: F.mono, fontSize: size, lineHeight: 1.4, whiteSpace: 'pre', fontWeight: 700}}>
      {lines.map((l, i) => (
        <div key={i}>
          {l.map(([tx, col], j) => {
            const take = Math.max(0, Math.min(left, tx.length));
            left -= take;
            return <span key={j} style={{color: col ?? C.text}}>{tx.slice(0, take)}</span>;
          })}
          {i === caretLine && caretOn && <span style={{display: 'inline-block', width: size * 0.55, height: size * 0.95, marginLeft: 2, background: C.text, verticalAlign: 'text-bottom'}} />}
        </div>
      ))}
    </div>
  );
};
const P = (s: string): Seg => [s, C.mute];                // prompt
const FL = (s: string): Seg => [s, C.cyan];               // a flag
const VAL = (s: string): Seg => [s, C.amber];             // a value
const BAD = (s: string): Seg => [s, C.red];               // the failing part
const GOOD = (s: string): Seg => [s, C.green];            // the fix

const Title: React.FC<{text: string; color?: string; o?: number}> = ({text, color = C.cyan, o = 1}) => (
  <div style={{position: 'absolute', left: 96, top: 120, opacity: o}}>
    <div style={{fontFamily: F.display, fontSize: 80 * D.k, fontWeight: 800, letterSpacing: D.ls, lineHeight: 1, color: C.text, textTransform: 'uppercase', whiteSpace: 'nowrap'}}>{text}</div>
    <div style={{width: 150, height: 10, background: color, marginTop: 12}} />
  </div>
);
/* the one counter of a scene */
const Counter: React.FC<{label: string; value: string; color?: string; o?: number}> = ({label, value, color = C.cyan, o = 1}) => (
  <div style={{position: 'absolute', left: 1344, top: 124, width: 480, height: 134, boxSizing: 'border-box', opacity: o, background: C.bg2, border: `3px solid ${color}`, borderLeftWidth: 14, padding: '12px 24px', fontFamily: F.sans}}>
    <div style={{fontSize: 20, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color}}>{label}</div>
    <div style={{fontFamily: F.mono, fontSize: 60, fontWeight: 800, color: C.text, lineHeight: 1.15, whiteSpace: 'nowrap'}}>{value}</div>
  </div>
);
const Card: React.FC<{x: number; y: number; w: number; h: number; label: string; value: string; sub?: string; color?: string; o?: number; vs?: number}> = ({x, y, w, h, label, value, sub, color = C.cyan, o = 1, vs = 50}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box', opacity: o, background: C.bg2, border: `3px solid ${color}`, borderLeftWidth: 14, padding: '10px 22px', fontFamily: F.sans}}>
    <div style={{fontSize: 20, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color}}>{label}</div>
    <div style={{fontFamily: F.mono, fontSize: vs, fontWeight: 800, color: C.text, lineHeight: 1.1, marginTop: 4, whiteSpace: 'nowrap'}}>{value}</div>
    {sub && <div style={{fontSize: 24, color: C.dim, marginTop: 4, lineHeight: 1.25}}>{sub}</div>}
  </div>
);
const Note: React.FC<{x: number; y: number; w: number; o?: number; size?: number; color?: string; align?: 'left' | 'center'; mono?: boolean; weight?: number; children?: React.ReactNode}> = ({x, y, w, o = 1, size = 30, color = C.dim, align = 'left', mono = false, weight = 500, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, fontFamily: mono ? F.mono : F.sans, fontSize: size, fontWeight: weight, color, lineHeight: 1.3, textAlign: align, whiteSpace: 'pre-wrap'}}>{children}</div>
);
/* a giant display line, centered */
const Mono: React.FC<{y: number; text: string; size?: number; color?: string; o?: number}> = ({y, text, size = 100, color = C.text, o = 1}) => (
  <div style={{position: 'absolute', left: 0, top: y, width: W, textAlign: 'center', opacity: o, fontFamily: F.mono, fontWeight: 800, fontSize: size, lineHeight: 1.1, color, whiteSpace: 'pre'}}>{text}</div>
);
const Giant: React.FC<{y: number; text: string; size?: number; color?: string; o?: number}> = ({y, text, size = 200, color = C.text, o = 1}) => (
  <div style={{position: 'absolute', left: 0, top: y, width: W, textAlign: 'center', opacity: o, fontFamily: F.display, fontWeight: 900, fontSize: size * D.k, lineHeight: 1, letterSpacing: D.lsNum, color, whiteSpace: 'nowrap'}}>{text}</div>
);
/* a scene = its cuts; the wipe is drawn last */
const Scene: React.FC<{t: number; cuts: number[]; children: (i: number, lt: number) => React.ReactNode}> = ({t, cuts, children}) => {
  const {i, lt} = cutOf(t, cuts);
  return (<>{children(i, lt)}<Wipe t={t} cuts={cuts} /></>);
};

/* ---------- 1. The question ---------- */
const ASK = [0, 2.8, 5.6, 8.4, 11.2, 14.0];
const Ask: React.FC<SceneProps> = ({t}) => (
  <Scene t={t} cuts={ASK}>{(i, lt) => (
    <>
      <Title text="The question" color={C.amber} />
      {i >= 2 && <Counter label="song samples" value={String(Math.round(SONG.samples * (i === 2 ? prog(lt, 0.3, 2.3) : 1)))} />}
      {i === 0 && <Code y={360} lt={lt} a={0.1} b={2.5} size={62} lines={[[P('$ '), ['ffmpeg '], FL('-i '), ['picture.mkv '], FL('-i '), ['song.wav']], [['  '], FL('-af '), VAL('apad '), ['out.mkv']]]} />}
      {i === 0 && <Note x={96} y={650} w={1728} size={36} o={ep(lt, 1.8, 2.4)}>One song, one picture, one filter.</Note>}
      {i === 1 && <Giant y={350} text="Never finishes?" size={190} color={C.red} o={ep(lt, 0, 0.3)} />}
      {i === 1 && <Note x={96} y={700} w={1728} align="center" mono size={36} o={ep(lt, 0.9, 1.5)}>apad pads with silence. Who says when to stop?</Note>}
      {i === 2 && (
        <>
          <Note x={96} y={330} w={864} align="center" mono size={34} color={C.cyan} o={ep(lt, 0, 0.3)}>song</Note>
          <Note x={960} y={330} w={864} align="center" mono size={34} color={C.text} o={ep(lt, 0.5, 0.8)}>picture</Note>
          <div style={{position: 'absolute', left: 96, top: 380, width: 864, textAlign: 'center', fontFamily: F.display, fontWeight: 900, fontSize: 320 * D.k, lineHeight: 1, color: C.cyan, opacity: ep(lt, 0, 0.3)}}>3 s</div>
          <div style={{position: 'absolute', left: 960, top: 380, width: 864, textAlign: 'center', fontFamily: F.display, fontWeight: 900, fontSize: 320 * D.k, lineHeight: 1, color: C.text, opacity: ep(lt, 0.5, 0.8)}}>5 s</div>
          <div style={{position: 'absolute', left: 958, top: 330, width: 4, height: 400, background: C.mute, opacity: ep(lt, 0.4, 0.7)}} />
        </>
      )}
      {i === 3 && (
        <>
          <Giant y={360} text="ffmpeg 6.1.1" size={190} color={C.text} o={ep(lt, 0, 0.3)} />
          <Note x={96} y={690} w={1728} align="center" mono size={36} o={ep(lt, 0.8, 1.4)}>every number in this film is measured on this build</Note>
        </>
      )}
      {i === 4 && (
        <>
          <Code y={360} lt={lt} a={0.1} b={1.7} size={62} lines={[[P('$ '), ['ffmpeg ... '], FL('-af '), VAL('apad '), BAD('-t 8 '), ['out.mkv']]]} />
          <Note x={96} y={600} w={1728} size={36} o={ep(lt, 1.8, 2.4)}>A hard guard on every command, so nothing runs on.</Note>
        </>
      )}
      {i === 5 && <Giant y={400} text="What stops apad?" size={150} color={C.amber} o={ep(lt, 0, 0.3)} />}
    </>
  )}</Scene>
);

/* ---------- 2. The test clip and two readers ---------- */
const SRC = [0, 2.7, 5.4, 8.1, 10.8, 13.5, 16.2];
const Source: React.FC<SceneProps> = ({t}) => {
  const {i, lt} = cutOf(t, SRC);
  const counter = i <= 1 ? {label: 'picture frames', value: String(Math.round(PIC.frames * (i === 0 ? 0 : prog(lt, 0.2, 1.9))))}
    : i <= 3 ? {label: 'song samples', value: String(Math.round(SONG.samples * (i === 2 ? 0 : prog(lt, 0.2, 1.9))))}
      : i === 6 ? {label: 'file seconds', value: `${PIC.sec.toFixed(3)} s`} : null;
  return (
    <Scene t={t} cuts={SRC}>{(k, l) => (
      <>
        <Title text="The test clip" color={C.cyan} />
        {counter && <Counter {...counter} color={i === 6 ? C.green : C.cyan} />}
        {k === 0 && (<><Note x={96} y={310} w={900} size={32} mono color={C.dim} o={ep(l, 0, 0.4)}>picture: a flat clip, 96x72</Note>
          <Code y={380} lt={l} a={0.1} b={2.2} size={50} lines={[[FL('-f lavfi -i ')], [VAL('color=c=0x303030:s=96x72:r=25:d=5')]]} /></>)}
        {k === 1 && <Figure y={360} value="125 frames" caption="5 s at 25 fps" size={230} color={C.cyan} o={ep(l, 0, 0.3)} />}
        {k === 2 && (<><Note x={96} y={310} w={900} size={32} mono color={C.dim} o={ep(l, 0, 0.4)}>song: a 440 Hz tone, 48000 Hz</Note>
          <Code y={380} lt={l} a={0.1} b={2.2} size={50} lines={[[FL('-f lavfi -i ')], [VAL('sine=frequency=440:sample_rate=48000:duration=3')]]} /></>)}
        {k === 3 && <Figure y={360} value="144000 samples" caption="3 s of tone" size={200} color={C.cyan} o={ep(l, 0, 0.3)} />}
        {k === 4 && (
          <>
            <Card x={260} y={330} w={1400} h={170} label="Reader 1" value="ffprobe packets" sub="the end of the picture and of the audio, from packet times" color={C.cyan} vs={58} o={ep(l, 0, 0.3)} />
            <Card x={260} y={540} w={1400} h={170} label="Reader 2" value="decoded frames + samples" sub="frame md5 lines and raw samples, counted in Node" color={C.amber} vs={58} o={ep(l, 0.9, 1.2)} />
          </>
        )}
        {k === 5 && (<><Note x={96} y={310} w={900} size={32} mono color={C.green} o={ep(l, 0, 0.4)}>control: the same command, no apad</Note>
          <Code y={380} lt={l} a={0.1} b={2.0} size={56} lines={[[P('$ '), ['ffmpeg '], FL('-i '), ['picture.mkv '], FL('-i '), ['song.wav']], [['  out.mkv']]]} /></>)}
        {k === 6 && (
          <Svg>
            <Lab y={420} h={52} text="picture" sub="125 frames" o={ep(l, 0, 0.3)} />
            <Bar x0={500} y={420} to={PIC.sec} pps={230} kind="pic" h={52} p={ep(l, 0.1, 0.8)} />
            <Lab y={520} h={52} text="song" sub="144000 samples" o={ep(l, 0.5, 0.8)} />
            <Bar x0={500} y={520} to={SONG.sec} pps={230} kind="song" h={52} p={ep(l, 0.6, 1.3)} />
            <Tx x={500 + SONG.sec * 230 + 22} y={558} size={30} color={C.cyan} o={ep(l, 1.2, 1.7)}>audio ends at 3.000 s</Tx>
            <line x1={500 + PIC.sec * 230} y1={390} x2={500 + PIC.sec * 230} y2={640} stroke={C.green} strokeWidth={5} strokeDasharray="10 10" opacity={ep(l, 1.4, 1.9)} />
            <Tx x={500 + PIC.sec * 230} y={372} size={30} color={C.green} anchor="middle" o={ep(l, 1.4, 1.9)}>file 5.000 s</Tx>
            <Ruler x0={500} y={680} pps={230} secs={5} o={ep(l, 0.2, 0.7)} />
          </Svg>
        )}
      </>
    )}</Scene>
  );
};

/* ---------- 3. apad alone ---------- */
const NEVER = [0, 2.7, 5.4, 8.1, 10.8, 13.5, 15.8];
const Never: React.FC<SceneProps> = ({t}) => {
  const {i, lt} = cutOf(t, NEVER);
  const g = i <= 2 ? 8 : 12;
  const run = i === 1 || i === 4 ? prog(lt, 0.2, 2.3) : 1;
  const counter = i === 1 || i === 4 ? `${(g * run).toFixed(3)} s` : i === 2 || i === 5 ? `${g.toFixed(3)} s` : null;
  const bars = (guard: number, p: number, l: number) => (
    <Svg>
      <Lab y={420} h={50} text="picture" sub="125 frames" />
      <Bar x0={560} y={420} to={PIC.sec} pps={100} kind="pic" />
      <Lab y={520} h={50} text="audio" sub="song, then silence" />
      <Bar x0={560} y={520} to={SONG.sec} pps={100} kind="song" p={Math.min(1, p * guard / SONG.sec)} />
      <Bar x0={560} y={520} from={SONG.sec} to={guard * p} pps={100} kind="pad" />
      <Wall x={560 + guard * 100} y1={380} y2={600} label={`-t ${guard}`} o={ep(l, 0, 0.5)} />
      <Ruler x0={560} y={640} pps={100} secs={12} />
    </Svg>
  );
  return (
    <Scene t={t} cuts={NEVER}>{(k, l) => (
      <>
        <Title text="No stop set" color={C.red} />
        {counter && <Counter label="output" value={counter} color={C.red} />}
        {k === 0 && <Code y={360} lt={l} a={0.1} b={2.3} size={60} lines={[[P('$ '), ['ffmpeg '], FL('-i '), ['picture.mkv '], FL('-i '), ['song.wav']], [['  '], FL('-af '), VAL('apad '), BAD('-t 8 '), ['out.mkv']]]} />}
        {k === 1 && bars(8, run, l)}
        {k === 2 && <Figure y={370} value="384000" caption="samples: the 8 s guard stopped it at 8.000 s" size={250} color={C.red} o={ep(l, 0, 0.3)} />}
        {k === 3 && <Code y={360} lt={l} a={0.1} b={2.3} size={60} lines={[[P('$ '), ['ffmpeg '], FL('-i '), ['picture.mkv '], FL('-i '), ['song.wav']], [['  '], FL('-af '), VAL('apad '), BAD('-t 12 '), ['out.mkv']]]} />}
        {k === 4 && bars(12, run, l)}
        {k === 5 && <Figure y={330} value="12 s" caption="576000 samples, the picture is still 125 frames" size={340} color={C.red} o={ep(l, 0, 0.3)} />}
        {k === 6 && (
          <>
            <Note x={96} y={330} w={1728} size={34} align="center" o={ep(l, 0, 0.4)}>the file is as long as the number after dash t</Note>
            <Mono y={420} text="-t 8  =  8.000 s" size={120} color={C.text} o={ep(l, 0.3, 0.7)} />
            <Mono y={600} text="-t 12  =  12.000 s" size={120} color={C.red} o={ep(l, 1.1, 1.5)} />
          </>
        )}
      </>
    )}</Scene>
  );
};

/* ---------- 4. -shortest ---------- */
const SH = [0, 2.7, 5.4, 8.1, 11.6, 14.0];
const Shortest: React.FC<SceneProps> = ({t}) => {
  const {i, lt} = cutOf(t, SH);
  const counter = i === 3 ? `${Math.round(SHORT.samples * prog(lt, 0.2, 2.6))}` : i >= 4 ? String(SHORT.samples) : null;
  const rows = [{fps: 25, frames: 125}, {fps: 30, frames: 150}, {fps: 1, frames: 5}];
  return (
    <Scene t={t} cuts={SH}>{(k, l) => (
      <>
        <Title text="One option" color={C.amber} />
        {counter && <Counter label="audio samples" value={counter} color={C.amber} />}
        {k === 0 && <Code y={360} lt={l} a={0.1} b={2.3} size={60} lines={[[P('$ '), ['ffmpeg '], FL('-i '), ['picture.mkv '], FL('-i '), ['song.wav']], [['  '], FL('-af '), VAL('apad '), FL('-shortest '), ['out.mkv']]]} />}
        {k === 1 && (
          <Svg>
            {rows.map((r, j) => {
              const y = 340 + j * 130, a = 0.1 + j * 0.5;
              return (
                <g key={r.fps}>
                  <Lab y={y} h={60} text={`${r.fps} fps`} sub={`${r.frames} frames`} o={ep(l, a, a + 0.3)} />
                  <Bar x0={420} y={y} to={PIC.sec} pps={220} kind="ok" h={60} p={ep(l, a, a + 0.6)} />
                  <Tx x={420 + PIC.sec * 220 + 22} y={y + 42} size={36} color={C.green} weight={800} o={ep(l, a + 0.4, a + 0.8)}>5.000 s</Tx>
                </g>
              );
            })}
          </Svg>
        )}
        {k === 2 && <Figure y={370} value="5.000 s" caption="the same file length at 25, 30 and 1 fps" size={250} color={C.green} o={ep(l, 0, 0.3)} />}
        {k === 3 && (
          <Svg>
            <Lab y={330} h={50} text="wanted" sub="240000 samples" o={ep(l, 0, 0.3)} />
            <Bar x0={440} y={330} to={5} pps={220} kind="song" p={ep(l, 0, 0.6)} />
            <Lab y={420} h={50} text="got" sub="238208 samples" color={C.red} o={ep(l, 0.5, 0.8)} />
            <Bar x0={440} y={420} to={SHORT.samples / 48000} pps={220} kind="song" p={ep(l, 0.6, 1.4)} />
            <Bar x0={440} y={420} from={SHORT.samples / 48000} to={5} pps={220} kind="pad" p={ep(l, 1.3, 1.7)} />
            <Tx x={440} y={540} size={26} color={C.dim} weight={600} mono={false} o={ep(l, 1.6, 2.0)}>last 0.1 s, drawn 36 times wider:</Tx>
            <rect x={440} y={560} width={0.1 * 8000} height={44} fill={C.text} opacity={ep(l, 1.8, 2.2) * 0.12} />
            <Bar x0={440} y={560} to={SHORT.samples / 48000 - 4.9} pps={8000} kind="song" p={ep(l, 1.8, 2.6)} />
            <Bar x0={440} y={560} from={SHORT.samples / 48000 - 4.9} to={0.1} pps={8000} kind="pad" p={ep(l, 2.4, 2.9)} />
            <Tx x={440} y={640} size={22} color={C.dim} weight={600} o={ep(l, 2.0, 2.4)}>4.90 s</Tx>
            <Tx x={440 + 800} y={640} size={22} color={C.dim} weight={600} anchor="end" o={ep(l, 2.0, 2.4)}>5.00 s</Tx>
            <Tx x={440 + (SHORT.samples / 48000 - 4.9) * 8000 - 8} y={650} size={26} color={C.red} weight={800} anchor="end" o={ep(l, 2.6, 3.0)}>audio stops</Tx>
          </Svg>
        )}
        {k === 4 && <Figure y={370} value="-1792" caption="samples missing: 37 ms of audio" size={270} color={C.red} o={ep(l, 0, 0.3)} />}
        {k === 5 && (
          <>
            {[{l: '25 fps', v: '238208'}, {l: '30 fps', v: '238208'}, {l: '1 fps', v: '238208'}, {l: 'aac, 25 fps', v: '239616'}].map((c, j) => (
              <Card key={c.l} x={96 + j * 438} y={400} w={410} h={190} label={c.l} value={c.v} sub="samples decoded" color={j === 3 ? C.amber : C.red} vs={56} o={ep(l, 0.1 + j * 0.45, 0.4 + j * 0.45)} />
            ))}
            <Note x={96} y={640} w={1728} size={32} align="center" o={ep(l, 2.0, 2.6)}>of 240000 asked for; pcm in mkv, aac in mp4</Note>
          </>
        )}
      </>
    )}</Scene>
  );
};

/* ---------- 5. Ask for a length ---------- */
const WH = [0, 2.7, 5.4, 8.1, 10.8, 13.5, 16.2];
const Whole: React.FC<SceneProps> = ({t}) => {
  const {i, lt} = cutOf(t, WH);
  const counter = i === 4 ? `${Math.round(WHOLE4.samples * prog(lt, 0.2, 2.3))}` : i === 5 ? String(WHOLE4.samples) : i === 6 ? `${Math.round(LONG7.samples * prog(lt, 0.2, 2.3))}` : null;
  const four = [
    [[FL('-af '), VAL('apad=whole_dur=5')]],
    [[FL('-af '), VAL('apad=pad_dur=2')]],
    [[FL('-af '), VAL('apad=pad_len=96000')]],
    [[FL('-af '), VAL('apad=whole_len=240000')]],
  ] as Seg[][][];
  return (
    <Scene t={t} cuts={WH}>{(k, l) => (
      <>
        <Title text="A length" color={C.green} />
        {counter && <Counter label="audio samples" value={counter} color={C.green} />}
        {k === 0 && <Code y={360} lt={l} a={0.1} b={2.3} size={60} lines={[[P('$ '), ['ffmpeg '], FL('-i '), ['picture.mkv '], FL('-i '), ['song.wav']], [['  '], FL('-af '), GOOD('apad=whole_dur=5 '), ['out.mkv']]]} />}
        {k === 1 && <Figure y={360} value="240000" caption="samples: exactly 5.000 s of audio" size={260} color={C.green} o={ep(l, 0, 0.3)} />}
        {k === 2 && (
          <>
            {four.map((line, j) => (
              <React.Fragment key={j}>
                <Code y={310 + j * 142} w={1000} lt={l} a={0.1 + j * 0.55} b={0.1 + j * 0.55 + 0.5} size={44} lines={line} />
                <Note x={1150} y={324 + j * 142} w={680} size={52} mono weight={800} color={C.green} o={ep(l, 0.7 + j * 0.55, 1.0 + j * 0.55)}>240000</Note>
              </React.Fragment>
            ))}
          </>
        )}
        {k === 3 && <Code y={380} lt={l} a={0.1} b={1.8} size={54} lines={[[P('$ '), ['ffmpeg ... '], FL('-af '), VAL('apad=whole_dur=4 '), ['out.mkv']]]} />}
        {k === 4 && (
          <Svg>
            <Lab y={420} h={50} text="picture" sub="5 s, 125 frames" />
            <Bar x0={560} y={420} to={PIC.sec} pps={130} kind="pic" />
            <Lab y={520} h={50} text="audio" sub="192000 samples" color={C.green} />
            <Bar x0={560} y={520} to={SONG.sec} pps={130} kind="song" p={ep(l, 0.1, 0.8)} />
            <Bar x0={560} y={520} from={SONG.sec} to={4} pps={130} kind="ok" p={ep(l, 0.7, 1.3)} />
            <Tx x={560 + 4 * 130 + 20} y={556} size={32} color={C.green} weight={800} o={ep(l, 1.3, 1.8)}>4.000 s</Tx>
            <Ruler x0={560} y={640} pps={130} secs={7} />
          </Svg>
        )}
        {k === 5 && <Code y={360} lt={l} a={0.1} b={2.3} size={60} lines={[[P('$ '), ['ffmpeg '], FL('-i '), ['picture.mkv '], FL('-i '), VAL('song_7.wav')], [['  '], FL('-af '), VAL('apad=whole_dur=5 '), ['out.mkv']]]} />}
        {k === 6 && (
          <Svg>
            <Lab y={420} h={50} text="picture" sub="5 s, 125 frames" />
            <Bar x0={560} y={420} to={PIC.sec} pps={130} kind="pic" />
            <Lab y={520} h={50} text="7 s song" sub="336000 samples" color={C.green} />
            <Bar x0={560} y={520} to={7} pps={130} kind="song" p={ep(l, 0.1, 1.0)} />
            <line x1={560 + 5 * 130} y1={390} x2={560 + 5 * 130} y2={600} stroke={C.green} strokeWidth={5} strokeDasharray="10 10" />
            <Tx x={560 + 5 * 130} y={372} size={28} color={C.green} anchor="middle" weight={800}>whole_dur 5</Tx>
            <Tx x={560 + 7 * 130 + 20} y={556} size={32} color={C.green} weight={800} o={ep(l, 1.2, 1.7)}>not cut</Tx>
            <Ruler x0={560} y={640} pps={130} secs={7} />
          </Svg>
        )}
      </>
    )}</Scene>
  );
};

/* ---------- 6. Two catches ---------- */
const CA = [0, 2.7, 5.4, 8.1, 10.8, 13.5, 16.2];
const Catches: React.FC<SceneProps> = ({t}) => {
  const {i, lt} = cutOf(t, CA);
  const counter = i === 1 ? `${Math.round(LOOP.frames * prog(lt, 0.2, 2.3))}` : i === 2 ? String(LOOP.frames) : i === 5 ? `${Math.round(V43.frames * prog(lt, 0.2, 2.0))}` : i === 6 ? String(V43.frames) : null;
  return (
    <Scene t={t} cuts={CA}>{(k, l) => (
      <>
        <Title text="Two catches" color={C.red} />
        {counter && <Counter label="picture frames" value={counter} color={i <= 2 ? C.red : C.amber} />}
        {k === 0 && <Code y={340} lt={l} a={0.1} b={2.4} size={50} lines={[[P('$ '), ['ffmpeg '], FL('-loop 1 -framerate 25 '), FL('-i '), ['still.png']], [['  '], FL('-i '), ['song.wav '], FL('-af '), VAL('apad '), FL('-shortest '), BAD('-t 8 '), ['out.mkv']]]} />}
        {k === 1 && (
          <Svg>
            <Lab y={420} h={50} text="picture" sub="a looped still: endless" />
            <Bar x0={560} y={420} to={LOOP.sec} pps={100} kind="pic" p={ep(l, 0.1, 2.2)} />
            <Lab y={520} h={50} text="audio" sub="apad: endless" />
            <Bar x0={560} y={520} to={SONG.sec} pps={100} kind="song" p={ep(l, 0.1, 0.8)} />
            <Bar x0={560} y={520} from={SONG.sec} to={LOOP.sec} pps={100} kind="pad" p={ep(l, 0.8, 2.2)} />
            <Wall x={560 + LOOP.sec * 100} y1={380} y2={600} label="-t 8" o={ep(l, 0, 0.4)} />
            <Ruler x0={560} y={640} pps={100} secs={12} />
          </Svg>
        )}
        {k === 2 && <Figure y={370} value="200 frames" caption="8.000 s: dash shortest has nothing to wait for" size={230} color={C.red} o={ep(l, 0, 0.3)} />}
        {k === 3 && <Code y={360} lt={l} a={0.1} b={2.3} size={46} lines={[[P('$ '), ['ffmpeg '], FL('-loop 1 -framerate 25 '), FL('-i '), ['still.png']], [['  '], FL('-i '), ['song.wav '], FL('-af '), GOOD('apad=whole_dur=5 '), FL('-shortest '), ['out.mkv']]]} />}
        {k === 4 && (
          <>
            <Card x={96} y={380} w={560} h={200} label="Picture" value="125 frames" sub="5.000 s" color={C.green} vs={54} o={ep(l, 0, 0.3)} />
            <Card x={680} y={380} w={560} h={200} label="Audio" value="240000" sub="samples" color={C.green} vs={54} o={ep(l, 0.5, 0.8)} />
            <Card x={1264} y={380} w={560} h={200} label="File" value="5.000 s" sub="ended by itself" color={C.green} vs={54} o={ep(l, 1.0, 1.3)} />
          </>
        )}
        {k === 5 && (
          <Svg>
            <Lab y={420} h={50} text="picture" sub="4.3 s asked, 108 frames" />
            <Bar x0={500} y={420} to={V43.sec} pps={230} kind="pic" p={ep(l, 0.1, 0.9)} />
            <Tx x={500 + V43.sec * 230 + 22} y={456} size={32} weight={800} o={ep(l, 0.9, 1.3)}>4.32 s</Tx>
            <Lab y={520} h={50} text="audio" sub="whole_dur=4.3, 206400 samples" color={C.amber} />
            <Bar x0={500} y={520} to={V43.aud} pps={230} kind="song" p={ep(l, 0.5, 1.3)} />
            <Tx x={500 + V43.sec * 230 + 22} y={556} size={32} color={C.amber} weight={800} o={ep(l, 1.3, 1.7)}>4.300 s</Tx>
            <Ruler x0={500} y={640} pps={230} secs={5} />
          </Svg>
        )}
        {k === 6 && <Figure y={370} value="0.02 s" caption="audio shorter than the picture, 206400 samples against 4.32 s" size={280} color={C.amber} o={ep(l, 0, 0.3)} />}
      </>
    )}</Scene>
  );
};

/* ---------- 7. Close ---------- */
const CL = [0, 3.0, 6.0, 9.0, 12.0];
const Close: React.FC<SceneProps> = ({t}) => {
  const {i, lt} = cutOf(t, CL);
  const at = (n: number) => (i > n ? 1 : i === n ? ep(lt, 0, 0.3) : 0);
  return (
    <Scene t={t} cuts={CL}>{() => (
      <>
        <Title text="The check" color={C.cyan} />
        <Card x={96} y={290} w={1728} h={150} label="Give apad a length" value="whole_dur or pad_dur" sub="ends by itself, exactly 240000 samples for 5 s of audio" color={C.green} vs={48} o={at(0)} />
        <Card x={96} y={460} w={1728} h={150} label="Stop with the picture" value="-shortest" sub="the audio is up to 37 ms short: 238208 of 240000 samples" color={C.amber} vs={48} o={at(1)} />
        <Card x={96} y={630} w={1728} h={150} label="Do nothing" value="apad alone runs to the guard" sub="8 s and 12 s from a 3 s song; a looped picture too" color={C.red} vs={48} o={at(2)} />
        <Note x={96} y={806} w={1728} align="center" size={26} o={at(3)}>Not tested: other encoders and containers, real music, players, builds other than ffmpeg 6.1.1.</Note>
        <Note x={96} y={850} w={1728} align="center" size={26} color={C.mute} o={at(3)}>FFmpeg Reality Checks · episode 65 · fixture and tests in the description</Note>
      </>
    )}</Scene>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, never: Never, shortest: Shortest, whole: Whole, catches: Catches, close: Close};
