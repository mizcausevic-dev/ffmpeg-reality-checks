import React from 'react';
import {C, F, D} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Fireship fast code. Hard cuts every 2 to 3 seconds, huge monospace code with typewriter reveals, one on-screen counter,
 * a quick wipe at every cut, one punch-line number per beat. Flat ink screen, light tints of the lab inks (the Dim keys) as the accents.
 * Every number is measured by episodes/ff79/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
 */

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
const Counter: React.FC<{label: string; text: string; color: string; x?: number; y?: number; size?: number; o?: number}> = ({label, text, color, x = 1280, y = 130, size = 150, o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, width: 500, textAlign: 'right', opacity: o}}>
    <div style={{fontFamily: F.mono, fontSize: 24, letterSpacing: 4, textTransform: 'uppercase', color: C.line}}>{label}</div>
    <div style={{fontFamily: F.display, fontWeight: 900, fontSize: size * D.k * 0.8, lineHeight: 0.95, color, letterSpacing: 1}}>{text}</div>
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

/* ---------- ruler: source samples on a line, ticks every 960 (one Opus packet), drawn to scale ---------- */
const Ruler: React.FC<{from: number; to: number; y: number; marks: {at: number; label: string; color: string; up?: boolean; o?: number}[]; request?: number; o?: number}> = ({from, to, y, marks, request, o = 1}) => {
  const X = (s: number) => 200 + ((s - from) / (to - from)) * 1520;
  const ticks: number[] = []; for (let k = Math.ceil(from / 960); k * 960 <= to; k++) ticks.push(k * 960);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: o}}>
      <line x1={X(from)} y1={y} x2={X(to)} y2={y} stroke={C.bg} strokeWidth={3} />
      {ticks.map((s) => <g key={s}><line x1={X(s)} y1={y - 18} x2={X(s)} y2={y + 18} stroke={C.bg} strokeWidth={3} /><text x={X(s)} y={y + 64} textAnchor="middle" fontFamily={F.mono} fontSize={34} fill={C.line}>{s}</text></g>)}
      {request !== undefined && <g><line x1={X(request)} y1={y - 150} x2={X(request)} y2={y + 18} stroke={C.amberDim} strokeWidth={4} strokeDasharray="12 8" /><text x={X(request)} y={y - 166} textAnchor="middle" fontFamily={F.mono} fontSize={36} fontWeight={700} fill={C.amberDim}>asked: 24000</text></g>}
      {marks.map((m, i) => (
        <g key={i} opacity={m.o ?? 1}>
          <line x1={X(m.at)} y1={y - 90} x2={X(m.at)} y2={y} stroke={m.color} strokeWidth={10} />
          <circle cx={X(m.at)} cy={y - 90} r={16} fill={m.color} />
          <text x={X(m.at)} y={y + 130} textAnchor="middle" fontFamily={F.mono} fontSize={40} fontWeight={700} fill={m.color}>{m.label}</text>
        </g>
      ))}
    </svg>
  );
};

/* 1. The question */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 6);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="libopus, 64 kbit/s" /><Punch value="312" sub="samples of pre-skip" color={C.amberDim} size={560} y={180} o={ep(lt, 0, 0.2)} /></>}
      {i === 1 && <><Cue text="the question" /><Line y={360} text="what does the decoder" size={84} mono={false} color={C.bg} align="center" o={ep(lt, 0, 0.3)} />
        <Line y={480} text="do with it?" size={84} mono={false} color={C.amberDim} align="center" o={ep(lt, 0.4, 0.7)} /></>}
      {i === 2 && <><Cue text="the command" />
        <Code lt={lt} y={340} size={70} cps={40} lines={[[{t: 'ffmpeg -i click.wav \\'}], [{t: '  -c:a libopus '}, {t: '-b:a 64k', c: C.amberDim}, {t: ' \\'}], [{t: '  out.ogg'}]]} /></>}
      {i === 3 && <><Cue text="the click" /><Punch value="4800" sub="sample position in the source" color={C.cyanDim} size={470} y={190} o={ep(lt, 0, 0.2)} /></>}
      {i === 4 && <><Cue text="we read" />
        <Code lt={lt} y={360} size={78} cps={34} lines={[[{t: 'decode(out.ogg)', c: C.cyanDim}], [{t: '  -> where is the click?'}]]} /></>}
      {i === 5 && <><Cue text="decoded position" /><Punch value="?" sub="4800 + something" color={C.redDim} size={560} y={170} o={ep(lt, 0, 0.2)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 2. One click, three readers */
const Source: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 6);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="the source" /><Punch value="48000" sub="samples · 1.000 s · 48000 Hz" color={C.bg} size={400} y={210} o={ep(lt, 0, 0.2)} /></>}
      {i === 1 && <><Cue text="four files" />
        <Code lt={lt} y={290} size={74} cps={44} lines={[[{t: 'out.ogg', c: C.amberDim}, {t: '    default pages'}], [{t: 'out.ogg', c: C.amberDim}, {t: '    100 ms pages'}], [{t: 'out.mkv', c: C.cyanDim}], [{t: 'out.opus', c: C.amberDim}]]} /></>}
      {i === 2 && <><Cue text="control: wav through pcm" /><Punch value="4800" sub="click stays at 4800 · 48000 samples" color={C.greenDim} size={460} y={190} o={ep(lt, 0, 0.2)} /></>}
      {i === 3 && <><Cue text="reader 1" />
        <Code lt={lt} y={330} size={80} cps={40} lines={[[{t: 'decoded samples', c: C.cyanDim}], [{t: '  find the peak'}]]} /></>}
      {i === 4 && <><Cue text="reader 2" />
        <Code lt={lt} y={330} size={80} cps={40} lines={[[{t: 'file bytes', c: C.cyanDim}], [{t: '  OpusHead, pre-skip'}]]} /></>}
      {i === 5 && <><Cue text="reader 3" />
        <Code lt={lt} y={330} size={80} cps={40} lines={[[{t: 'ffprobe', c: C.cyanDim}], [{t: '  initial_padding'}]]} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 3. The pre-skip bytes */
const HEAD = '4f 70 75 73 48 65 61 64 01 01 38 01 80 bb 00 00 00 00 00'.split(' ');
const Head: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 6);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="OpusHead, 19 bytes" />
        <div style={{position: 'absolute', left: 140, top: 300, fontFamily: F.mono, fontSize: 62, color: C.bg, whiteSpace: 'pre', lineHeight: 1.5}}>
          {[HEAD.slice(0, 8), HEAD.slice(8, 19)].map((row, r) => (
            <div key={r}>{row.map((b, k) => { const idx = r * 8 + k; const shown = Math.floor(Math.max(0, lt - 0.15) * 28) > idx; const key = idx === 10 || idx === 11; return <span key={k} style={{color: key ? C.amberDim : C.bg, fontWeight: key ? 800 : 400, opacity: shown ? 1 : 0}}>{b + ' '}</span>; })}</div>
          ))}
        </div>
        <Line y={560} text="magic · version 1 · 1 channel · [pre-skip] · rate 48000 · gain 0" size={40} color={C.line} o={ep(lt, 1.0, 1.3)} /></>}
      {i === 1 && <><Cue text="bytes 10 and 11" />
        <Code lt={lt} y={330} size={84} lines={[[{t: '38 01', c: C.amberDim}, {t: '  little endian'}], [{t: '0x0138', c: C.amberDim}, {t: ' = '}, {t: '312', c: C.redDim}]]} /></>}
      {i === 2 && <><Cue text="in time" /><Punch value="6.5 ms" sub="312 samples at 48000 Hz" color={C.amberDim} size={400} y={210} o={ep(lt, 0, 0.2)} /></>}
      {i === 3 && <><Cue text="mkv, as well" />
        <Code lt={lt} y={330} size={74} cps={42} lines={[[{t: 'CodecDelay', c: C.cyanDim}, {t: '   6500000 ns'}], [{t: 'SeekPreRoll', c: C.cyanDim}, {t: ' 80000000 ns'}]]} /></>}
      {i === 4 && <><Cue text="ffprobe" />
        <Code lt={lt} y={300} size={70} cps={44} lines={[[{t: 'initial_padding', c: C.cyanDim}, {t: '=312'}], [{t: 'ogg start_time', c: C.cyanDim}, {t: '=0'}], [{t: 'mkv start_time', c: C.cyanDim}, {t: '=-0.007'}]]} /></>}
      {i === 5 && <><Cue text="decoded: all four files" /><Punch value="4800" sub="the click, 48000 samples out" color={C.greenDim} size={460} y={190} o={ep(lt, 0, 0.2)} /></>}
      {i >= 1 && i <= 4 && <Counter label="pre-skip" text="312" color={C.amberDim} />}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 4. Rewrite the field */
const Patch: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 7);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="rewrite one field" />
        <Code lt={lt} y={330} size={80} lines={[[{t: 'pre-skip  '}, {t: '312', c: C.amberDim}, {t: ' -> '}, {t: '0', c: C.redDim}], [{t: 'ogg page crc recomputed', c: C.line}]]} /></>}
      {i === 1 && <><Cue text="pre-skip 0: the click" /><Punch value="5112" sub="312 late" color={C.redDim} size={520} y={190} o={ep(lt, 0, 0.2)} /></>}
      {i === 2 && <><Cue text="pre-skip 0: the length" /><Punch value="48312" sub="samples out, not 48000" color={C.redDim} size={380} y={220} o={ep(lt, 0, 0.2)} /></>}
      {i === 3 && <><Cue text="rewrite it again" />
        <Code lt={lt} y={330} size={80} lines={[[{t: 'pre-skip  '}, {t: '312', c: C.amberDim}, {t: ' -> '}, {t: '1000', c: C.cyanDim}]]} /></>}
      {i === 4 && <><Cue text="pre-skip 1000: the click" /><Punch value="4112" sub="688 early" color={C.cyanDim} size={520} y={190} o={ep(lt, 0, 0.2)} /></>}
      {i === 5 && <><Cue text="ogg and mkv, same result (6.1.1)" />
        <Line y={340} text="pre-skip   click   samples out" size={50} color={C.line} o={ep(lt, 0, 0.3)} />
        <Line y={430} text="0          5112    48312" size={64} color={C.redDim} o={ep(lt, 0.3, 0.6)} />
        <Line y={520} text="312        4800    48000" size={64} color={C.greenDim} o={ep(lt, 0.7, 1.0)} />
        <Line y={610} text="1000       4112    47312" size={64} color={C.cyanDim} o={ep(lt, 1.1, 1.4)} /></>}
      {i === 6 && <><Cue text="the rule" />
        <Code lt={lt} y={350} size={74} cps={44} lines={[[{t: 'click = 4800 + 312 - preskip', c: C.amberDim}], [{t: 'the header decides', c: C.bg}]]} /></>}
      {i >= 1 && i <= 5 && <Counter label="header pre-skip" text={i <= 2 ? '0' : '1000'} color={i <= 2 ? C.redDim : C.cyanDim} size={110} />}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 5. Cutting with stream copy */
const Copy: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 7);
  const {i, lt} = beatOf(t, starts);
  const R = {from: 22080, to: 25920, y: 560};
  return (
    <Dark>
      {i === 0 && <><Cue text="the cut" />
        <Code lt={lt} y={330} size={70} cps={44} lines={[[{t: 'ffmpeg '}, {t: '-ss 0.5', c: C.amberDim}, {t: ' -i in.mkv \\'}], [{t: '  -c copy out.mkv'}]]} /></>}
      {i === 1 && <><Cue text="mkv, -ss before -i" /><Ruler {...R} request={24000} marks={[{at: 23040, label: 'starts 23040: -960', color: C.redDim}]} /></>}
      {i === 2 && <><Cue text="mkv, -ss after -i" /><Ruler {...R} request={24000} marks={[{at: 24000, label: 'starts 24000: exact', color: C.greenDim}]} /></>}
      {i === 3 && <><Cue text="ogg, -ss after -i" /><Ruler {...R} request={24000} marks={[{at: 24960, label: 'starts 24960: +960', color: C.redDim}]} /></>}
      {i === 4 && <><Cue text="one packet" /><Punch value="960" sub="samples = 20 ms: copies land on a packet" color={C.amberDim} size={440} y={200} o={ep(lt, 0, 0.2)} /></>}
      {i === 5 && <><Cue text="ogg, default pages, -ss before -i" /><Punch value="0 cut" sub="48000 samples out · start_time -0.5 s" color={C.redDim} size={340} y={220} o={ep(lt, 0, 0.2)} /></>}
      {i === 6 && <><Cue text="ogg, 100 ms pages, -ss before -i" /><Ruler {...R} request={24000} marks={[{at: 24000, label: 'starts 24000: exact', color: C.greenDim}]} /></>}
      {i >= 1 && i <= 3 && <Counter label="offset, samples" text={i === 1 ? '-960' : i === 2 ? '0' : '+960'} color={i === 2 ? C.greenDim : C.redDim} size={120} />}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 6. Cutting with a re-encode */
const Reenc: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 5);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="re-encode" />
        <Code lt={lt} y={330} size={66} cps={44} lines={[[{t: 'ffmpeg '}, {t: '-ss 0.5', c: C.amberDim}, {t: ' -i in.ogg \\'}], [{t: '  -c:a libopus -b:a 64k out.ogg'}]]} /></>}
      {i === 1 && <><Cue text="first click" /><Punch value="24000" sub="exact · 24000 samples out" color={C.greenDim} size={400} y={210} o={ep(lt, 0, 0.2)} /></>}
      {i === 2 && <><Cue text="the other way" />
        <Code lt={lt} y={340} size={66} cps={44} lines={[[{t: 'ffmpeg -i in.ogg \\'}], [{t: '  -af '}, {t: 'atrim=start=0.5', c: C.amberDim}, {t: ' \\'}], [{t: '  -c:a libopus out.ogg'}]]} /></>}
      {i === 3 && <><Cue text="atrim: first click" /><Punch value="24000" sub="exact again" color={C.greenDim} size={400} y={210} o={ep(lt, 0, 0.2)} /></>}
      {i === 4 && <><Cue text="atrim: the end" /><Punch value="+648" sub="samples decoded past the source end" color={C.redDim} size={420} y={200} o={ep(lt, 0, 0.2)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 7. Close (the last 10 s sit under the end card, so the beats fill the first dur - 10.5 s) */
const Close: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(Math.max(10, dur - 10.5), 5);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="what to do" />
        <Code lt={lt} y={300} size={72} lines={[[{t: '1  read the pre-skip'}], [{t: '2  decode, find the click'}], [{t: '3  compare with the request'}]]} /></>}
      {i === 1 && <><Cue text="expect" /><Punch value="960" sub="samples: one packet, from a copy" color={C.amberDim} size={420} y={200} o={ep(lt, 0, 0.2)} /></>}
      {i === 2 && <><Cue text="on 8.1.2" />
        <Line y={330} text="the mkv patch moves no click" size={56} color={C.bg} o={ep(lt, 0, 0.3)} />
        <Line y={410} text="mkv start_time reads 0" size={56} color={C.bg} o={ep(lt, 0.4, 0.7)} />
        <Line y={490} text="ogg: same as 6.1.1" size={56} color={C.bg} o={ep(lt, 0.8, 1.1)} /></>}
      {i === 3 && <><Cue text="not tested" />
        <Line y={330} text="other builds" size={56} color={C.bg} o={ep(lt, 0, 0.3)} />
        <Line y={410} text="real players · other encoders" size={56} color={C.bg} o={ep(lt, 0.4, 0.7)} />
        <Line y={490} text="real music" size={56} color={C.bg} o={ep(lt, 0.8, 1.1)} /></>}
      {i >= 4 && <><Cue text="FFmpeg Reality Checks" />
        <Line y={420} text="episode 79" size={100} mono={false} color={C.bg} align="center" o={ep(lt, 0, 0.3)} />
        <Line y={620} text="fixture and tests in the description" size={44} color={C.line} align="center" o={ep(lt, 0.4, 0.7)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, head: Head, patch: Patch, copy: Copy, reenc: Reenc, close: Close};
