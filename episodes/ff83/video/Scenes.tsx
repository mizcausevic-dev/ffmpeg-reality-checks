import React from 'react';
import {C, F, D} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Fireship fast code. Hard cuts every 2 to 3 seconds, huge monospace code with typewriter reveals, one on-screen counter per scene,
 * a quick wipe at every cut, one punch-line number per beat. Flat ink screen, light tints of the lab inks (the Dim keys) as the accents.
 * Every number is measured by episodes/ff83/fixture/experiment.mjs on ffmpeg 6.1.1: a 12 s tone at 48000 Hz with five gaps
 * (A 1.0 to 3.5 s and B 4.5 to 5.0 s digital zero; C, D, E noise with peaks of -49.1, -53.9 and -66.2 dBFS), read from the printed report and from the raw samples.
 */

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/* ---------- screen, beats, wipe (as ff59) ---------- */
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
  <div style={{position: 'absolute', left: 140, top: 150, opacity: o, fontFamily: F.mono, fontSize: 32, letterSpacing: 3, color: C.line}}>{text}</div>
);

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

/* ---------- the clip, drawn from the measured data ---------- */
// peak level of each 0.1 s block (dBFS, read from the raw samples): the tone is -6.0, A and B are digital zero (drawn at the -80 floor)
const GAPS = [
  {id: 'A', s: 1.0, e: 3.5, db: -80}, {id: 'B', s: 4.5, e: 5.0, db: -80}, {id: 'C', s: 6.0, e: 7.0, db: -49.1}, {id: 'D', s: 8.0, e: 9.0, db: -53.9}, {id: 'E', s: 10.0, e: 11.0, db: -66.2},
];
const TONE_DB = -6;
const levelOf = (b: number) => { const t = b / 10 + 0.05; for (const g of GAPS) if (t >= g.s && t < g.e) return g.db; return TONE_DB; };
const CX = 140, CW = 1640, TOP = 300, PX = 6; // 0 dBFS at TOP, 6 px per dB, floor -80 dBFS at TOP + 480
const X = (t: number) => CX + (t * CW) / 12;
const Y = (db: number) => TOP + -db * PX;

const Chart: React.FC<{thr?: number | null; found?: string[] | null; focus?: string[]; reveal?: number; thrLabel?: string; showDb?: boolean; ids?: boolean}> = ({thr = null, found = null, focus, reveal = 1, thrLabel, showDb = false, ids = true}) => {
  const bw = CW / 120;
  const inFocus = (b: number) => !focus || focus.some((id) => { const g = GAPS.find((q) => q.id === id)!; const t = b / 10 + 0.05; return t >= g.s && t < g.e; });
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      {Array.from({length: 120}, (_, b) => {
        if (b / 120 > reveal) return null;
        const lev = levelOf(b), tone = lev === TONE_DB;
        const h = Math.max(5, (lev + 80) * PX);
        const silent = thr !== null && lev < thr;
        const fill = thr === null ? (tone ? C.line : C.amberDim) : silent ? C.greenDim : tone ? C.line : C.redDim;
        const dim = !tone && !inFocus(b);
        return <rect key={b} x={CX + b * bw + 1} y={TOP + 480 - h} width={bw - 2.4} height={h} fill={fill} opacity={dim ? 0.35 : 1} />;
      })}
      {Array.from({length: 7}, (_, k) => <text key={k} x={X(k * 2)} y={806} textAnchor="middle" fontFamily={F.mono} fontSize={24} fill={C.line}>{k * 2}</text>)}
      <line x1={CX} x2={CX + CW} y1={TOP + 484} y2={TOP + 484} stroke={C.mute} strokeWidth={2} />
      {showDb && GAPS.filter((g) => g.db > -80 && (!focus || focus.includes(g.id))).map((g) => (
        <text key={g.id} x={X((g.s + g.e) / 2)} y={Y(g.db) + 36} textAnchor="middle" fontFamily={F.mono} fontSize={30} fontWeight={700} fill={C.text}>{g.db.toFixed(1)}</text>
      ))}
      {thr !== null && (() => {
        const y = Y(thr);
        return (
          <g>
            <line x1={CX} x2={CX + CW} y1={y} y2={y} stroke={C.bg} strokeWidth={4} strokeDasharray="18 10" />
            {thrLabel && <text x={X(1) + 16} y={y - 16} fontFamily={F.mono} fontSize={34} fontWeight={700} fill={C.bg}>{thrLabel}</text>}
          </g>
        );
      })()}
      {ids && GAPS.map((g) => {
        const isFound = found ? found.includes(g.id) : null;
        const w = (g.e - g.s) * (CW / 12) - 4;
        return (
          <g key={g.id}>
            <rect x={X(g.s) + 2} y={820} width={w} height={50} fill={isFound ? C.greenDim : 'none'} stroke={isFound === null ? C.line : isFound ? C.greenDim : C.redDim} strokeWidth={3} />
            <text x={X(g.s) + 2 + w / 2} y={858} textAnchor="middle" fontFamily={F.display} fontWeight={900} fontSize={42} fill={isFound ? C.text : isFound === null ? C.line : C.redDim}>{g.id}</text>
          </g>
        );
      })}
    </svg>
  );
};

/* 1. The question */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 6);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="the clip: 12 s, 48000 Hz" /><Chart reveal={ep(lt, 0, 1.6)} /><Line y={215} text="5 gaps" size={64} color={C.bg} o={ep(lt, 1.0, 1.4)} /></>}
      {i === 1 && <><Cue text="the command" />
        <Code lt={lt} y={290} size={78} lines={[[{t: 'ffmpeg -i clip.wav \\'}], [{t: '  -af "'}, {t: 'silencedetect', c: C.amberDim}, {t: '" \\'}], [{t: '  -f null -'}]]} /></>}
      {i === 2 && <><Cue text="expected" /><Punch value="5" sub="gaps in the clip" color={C.greenDim} size={470} y={240} o={ep(lt, 0, 0.2)} /></>}
      {i === 3 && <><Cue text="reported" /><Punch value="1" sub="5  ≠  1" color={C.redDim} size={470} y={240} o={ep(lt, 0, 0.2)} /></>}
      {i === 4 && <><Punch value="IS IT BROKEN?" size={200} color={C.bg} y={380} o={ep(lt, 0, 0.2)} /></>}
      {i === 5 && <><Cue text="the setup" />
        <Line y={330} text="synthetic tone · 12 s" size={64} color={C.bg} o={ep(lt, 0, 0.3)} />
        <Line y={420} text="5 gaps of known length and level" size={64} color={C.bg} o={ep(lt, 0.5, 0.8)} />
        <Line y={510} text="ffmpeg 6.1.1" size={64} color={C.amberDim} o={ep(lt, 1.0, 1.3)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 2. The clip and the readers */
const ClipScene: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 7);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="gap A" /><Chart focus={['A']} /><Line y={215} text="digital zero · 1.0 to 3.5 s · 2.5 s" size={46} color={C.bg} o={ep(lt, 0.1, 0.4)} /></>}
      {i === 1 && <><Cue text="gap B" /><Chart focus={['B']} /><Line y={215} text="digital zero · 4.5 to 5.0 s · 0.5 s" size={46} color={C.bg} o={ep(lt, 0.1, 0.4)} /></>}
      {i === 2 && <><Cue text="gaps C D E: noise" /><Chart focus={['C', 'D', 'E']} showDb /><Line y={215} text="loudest sample, dBFS · 1 s each" size={46} color={C.bg} o={ep(lt, 0.1, 0.4)} /></>}
      {i === 3 && <><Cue text="reader 1" />
        <Code lt={lt} y={300} size={80} cps={40} lines={[[{t: 'what ffmpeg prints', c: C.line}], [{t: 'silence_start: ', c: C.amberDim}, {t: '1'}], [{t: 'silence_end: ', c: C.amberDim}, {t: '3.5'}]]} /></>}
      {i === 4 && <><Cue text="reader 2" />
        <Code lt={lt} y={300} size={80} cps={40} lines={[[{t: 'the raw samples, in Node', c: C.line}], [{t: 'run of ', c: C.line}, {t: '|x| < n'}], [{t: 'at least ', c: C.line}, {t: 'd', c: C.amberDim}, {t: ' long', c: C.line}]]} /></>}
      {i === 5 && <><Cue text="control: a tone, no gap" /><Punch value="0" sub="silences reported · both readers" size={430} y={240} color={C.greenDim} o={ep(lt, 0, 0.2)} /></>}
      {i === 6 && <><Cue text="two readers, one answer" />
        <Line y={330} text="same start and end" size={68} color={C.bg} o={ep(lt, 0, 0.3)} />
        <Line y={430} text="in every ordinary case" size={68} color={C.greenDim} o={ep(lt, 0.8, 1.1)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 3. The default d */
const Duration: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 7);
  const {i, lt} = beatOf(t, starts);
  const cnt = [0, 1, 1, 2, 3, 3, 2][i];
  const found = [[], ['A'], ['A'], ['A', 'E'], ['A', 'B', 'E'], ['A', 'B', 'E'], ['A', 'E']][i];
  return (
    <Dark>
      {i >= 1 && i !== 2 && <Counter label="gaps reported" value={cnt} color={i === 6 ? C.redDim : C.greenDim} />}
      {i === 0 && <><Cue text="the defaults" />
        <Code lt={lt} y={330} size={84} lines={[[{t: 'silencedetect', c: C.amberDim}], [{t: 'n=-60dB:'}, {t: 'd=2', c: C.amberDim}]]} /></>}
      {i === 1 && <><Cue text="d=2: minimum length 2 s" /><Chart thr={-60} found={found} /><Line y={215} text="only A is 2 s or longer" size={46} color={C.bg} o={ep(lt, 0.1, 0.4)} /></>}
      {i === 2 && <><Cue text="the default result" /><Punch value="1 of 5" sub="gaps reported" size={400} y={240} color={C.redDim} o={ep(lt, 0, 0.2)} /></>}
      {i === 3 && <><Cue text="d=1" /><Chart thr={-60} found={found} /><Line y={215} text="d=1: A (2.5 s) and E (1 s)" size={46} color={C.bg} o={ep(lt, 0.1, 0.4)} /></>}
      {i === 4 && <><Cue text="d=0.5" /><Chart thr={-60} found={found} /><Line y={215} text="d=0.5: B (0.5 s) joins" size={46} color={C.bg} o={ep(lt, 0.1, 0.4)} /></>}
      {i === 5 && <><Cue text="B is exactly 0.5 s" />
        <Line y={330} text="0.5 s  >=  d=0.5" size={84} color={C.greenDim} o={ep(lt, 0, 0.3)} />
        <Line y={450} text="a gap as long as d counts" size={56} color={C.bg} o={ep(lt, 0.6, 0.9)} /></>}
      {i === 6 && <><Cue text="d=0.5001" /><Chart thr={-60} found={found} /><Line y={215} text="0.5 s  <  0.5001: B is gone" size={46} color={C.redDim} o={ep(lt, 0.1, 0.4)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 4. The level n */
const Level: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 7);
  const {i, lt} = beatOf(t, starts);
  const thr = [-60, -60, -50, -50, -50, -40, -40][i];
  const found = [['A', 'B', 'E'], ['A', 'B', 'E'], ['A', 'B', 'D', 'E'], ['A', 'B', 'D', 'E'], ['A', 'B', 'D', 'E'], ['A', 'B', 'C', 'D', 'E'], ['A', 'B', 'C', 'D', 'E']][i];
  const cnt = found.length;
  return (
    <Dark>
      {i <= 2 || i === 5 ? <Counter label="gaps reported" value={cnt} color={C.greenDim} /> : null}
      {i === 0 && <><Cue text="n is a level" /><Chart thr={-60} found={found} thrLabel="n = -60 dB" /><Line y={215} text="a sample is silent if |x| < n" size={46} color={C.bg} o={ep(lt, 0.1, 0.4)} /></>}
      {i === 1 && <><Cue text="every sample, not an average" /><Chart thr={-60} found={found} thrLabel="n = -60 dB" /><Line y={215} text="D (-53.9) and C (-49.1) are too loud" size={46} color={C.redDim} o={ep(lt, 0.1, 0.4)} /></>}
      {i === 2 && <><Cue text="n=-50dB" /><Chart thr={-50} found={found} thrLabel="n = -50 dB" /><Line y={215} text="D joins: its loudest sample is -53.9" size={46} color={C.greenDim} o={ep(lt, 0.1, 0.4)} /></>}
      {i === 3 && <><Cue text="gap C at n=-50dB" />
        <Line y={300} text="rms   -53.9 dBFS   below -50" size={62} color={C.greenDim} o={ep(lt, 0, 0.3)} />
        <Line y={400} text="peak  -49.1 dBFS   above -50" size={62} color={C.redDim} o={ep(lt, 0.7, 1.0)} />
        <Line y={540} text="not silent" size={120} mono={false} color={C.redDim} o={ep(lt, 1.4, 1.7)} /></>}
      {i === 4 && <><Cue text="the rule" /><Punch value="PEAK" sub="not average" size={400} y={240} color={C.amberDim} o={ep(lt, 0, 0.2)} /></>}
      {i === 5 && <><Cue text="n=-40dB" /><Chart thr={-40} found={found} thrLabel="n = -40 dB" /><Line y={215} text="C joins: 5 of 5" size={46} color={C.greenDim} o={ep(lt, 0.1, 0.4)} /></>}
      {i === 6 && <><Cue text="the rule" />
        <Code lt={lt} y={320} size={84} lines={[[{t: 'silent  =  ', c: C.line}, {t: '|x| < n', c: C.amberDim}], [{t: 'for each sample', c: C.line}]]} />
        <Line y={560} text="then the run must last d" size={56} color={C.bg} o={ep(lt, 1.0, 1.3)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 5. Spellings and limits */
const Spelling: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 7);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="two spellings" />
        <Code lt={lt} y={300} size={84} lines={[[{t: 'n=0.001'}], [{t: 'n=-60dB'}]]} />
        <Line y={560} text="same report, to the digit" size={56} color={C.greenDim} o={ep(lt, 1.0, 1.3)} /></>}
      {i === 1 && <><Cue text="n=0.00316228 and n=-50dB" />
        <Code lt={lt} y={300} size={84} lines={[[{t: 'n=0.00316228'}], [{t: 'n=-50dB'}]]} />
        <Line y={560} text="same report: A, B, D, E" size={56} color={C.greenDim} o={ep(lt, 1.0, 1.3)} /></>}
      {i === 2 && <><Cue text="n=-50 (no dB)" />
        <Code lt={lt} y={300} size={84} lines={[[{t: 'n=-50', c: C.redDim}]]} />
        <Line y={470} text="out of range [0 - 1.79769e+308]" size={50} color={C.bg} o={ep(lt, 0.7, 1.0)} />
        <Line y={560} text="nonzero exit status. no report." size={50} color={C.redDim} o={ep(lt, 1.2, 1.5)} /></>}
      {i === 3 && <><Cue text="n=0" /><Punch value="0" sub="reported · not even digital zero" size={430} y={240} color={C.redDim} o={ep(lt, 0, 0.2)} /></>}
      {i === 4 && <><Cue text="n=1.5 · 16 bit input" /><Punch value="0" sub="reported · the threshold overflows" size={430} y={240} color={C.redDim} o={ep(lt, 0, 0.2)} /></>}
      {i === 5 && <><Cue text="how it overflows" />
        <Code lt={lt} y={300} size={72} cps={40} lines={[[{t: '1.5 × 32767', c: C.line}], [{t: '= 49150', c: C.bg}], [{t: 'as a 16 bit number', c: C.line}], [{t: '= -16386', c: C.redDim}]]} />
        <Line y={760} text="|x| < -16386 is never true" size={50} color={C.bg} o={ep(lt, 1.8, 2.2)} /></>}
      {i === 6 && <><Cue text="n=1.5 · float input" /><Punch value="12 s" sub="silent · the whole file" size={400} y={240} color={C.amberDim} o={ep(lt, 0, 0.2)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 6. How exact */
const BoundaryCells: React.FC<{lt: number}> = ({lt}) => {
  const vals = [28, 29, 30, 31, 32, 33, 34, 35, 36];
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      {vals.map((v, k) => {
        const silent = v < 32;
        const o = ep(lt, 0.1 + k * 0.1, 0.35 + k * 0.1);
        return (
          <g key={v} opacity={o}>
            <rect x={195 + k * 170} y={380} width={160} height={190} fill={silent ? C.greenDim : 'none'} stroke={silent ? C.greenDim : C.redDim} strokeWidth={4} />
            <text x={195 + k * 170 + 80} y={500} textAnchor="middle" fontFamily={F.display} fontWeight={900} fontSize={110} fill={silent ? C.text : C.redDim}>{v}</text>
            <text x={195 + k * 170 + 80} y={620} textAnchor="middle" fontFamily={F.mono} fontSize={30} fill={silent ? C.greenDim : C.redDim}>{silent ? 'silent' : 'loud'}</text>
          </g>
        );
      })}
    </svg>
  );
};
const Stereo: React.FC<{lt: number}> = ({lt}) => {
  // 400 samples of the tone, exactly as written to the file (amplitude 16384, 440 Hz, 48000 Hz, phase 1 rad)
  const pts = Array.from({length: 400}, (_, i) => `${i * 4 + 190},${400 - Math.round(16384 * Math.sin((2 * Math.PI * 440 * i) / 48000 + 1)) / 16384 * 70}`).join(' ');
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      <text x={140} y={410} fontFamily={F.display} fontWeight={900} fontSize={70} fill={C.bg}>L</text>
      <polyline points={pts} fill="none" stroke={C.line} strokeWidth={3} opacity={ep(lt, 0, 0.4)} />
      <text x={140} y={650} fontFamily={F.display} fontWeight={900} fontSize={70} fill={C.bg}>R</text>
      <line x1={190} x2={1790} y1={640} y2={640} stroke={C.greenDim} strokeWidth={5} opacity={ep(lt, 0.3, 0.7)} />
    </svg>
  );
};
const Exact: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 7);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="the edges" />
        <Code lt={lt} y={300} size={72} cps={75} lines={[[{t: 'ffmpeg   ', c: C.line}, {t: 'silence_start: 1'}], [{t: 'samples  ', c: C.line}, {t: '48000 / 48000 = 1'}], [{t: 'ffmpeg   ', c: C.line}, {t: 'silence_end: 3.5'}], [{t: 'samples  ', c: C.line}, {t: '168000 / 48000 = 3.5'}]]} /></>}
      {i === 1 && <><Cue text="edge error" /><Punch value="0" sub="samples off" size={430} y={240} color={C.greenDim} o={ep(lt, 0, 0.2)} /></>}
      {i === 2 && <><Cue text="16 bit, n=-60dB" /><BoundaryCells lt={lt} /><Line y={215} text="constant samples, 1 s each" size={46} color={C.bg} o={ep(lt, 0.1, 0.4)} /></>}
      {i === 3 && <><Cue text="why 32?" />
        <Code lt={lt} y={300} size={78} cps={40} lines={[[{t: '0.001 × 32767', c: C.line}], [{t: '= 32.767', c: C.bg}], [{t: 'cut to an integer', c: C.line}], [{t: '= 32', c: C.amberDim}, {t: '   |x| < 32', c: C.bg}]]} /></>}
      {i === 4 && <><Cue text="a gap late in a long file" />
        <Line y={330} text="true     123.456771" size={82} color={C.bg} o={ep(lt, 0, 0.3)} />
        <Line y={450} text="printed  123.457" size={82} color={C.amberDim} o={ep(lt, 0.7, 1.0)} />
        <Line y={600} text="6 digits · 11 samples off" size={56} color={C.line} o={ep(lt, 1.4, 1.7)} /></>}
      {i === 5 && <><Cue text="stereo: L plays, R is zero" /><Stereo lt={lt} /><Line y={215} text="silencedetect needs both channels quiet" size={46} color={C.bg} o={ep(lt, 0.1, 0.4)} /><Line y={760} text="reported: 0" size={70} color={C.redDim} o={ep(lt, 0.8, 1.1)} /></>}
      {i === 6 && <><Cue text="mono=1: each channel alone" />
        <Code lt={lt} y={330} size={78} cps={40} lines={[[{t: 'channel: 1 | silence_start: 0', c: C.bg}], [{t: 'channel: 1 | silence_end: 4', c: C.bg}]]} />
        <Line y={560} text="the right channel, 0 to 4 s" size={56} color={C.greenDim} o={ep(lt, 1.2, 1.5)} /></>}
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
        <Code lt={lt} y={300} size={80} lines={[[{t: 'd', c: C.amberDim}, {t: '  = shortest gap you care about'}], [{t: 'n', c: C.amberDim}, {t: '  = above the noise peak'}], [{t: 'then count the list'}]]} /></>}
      {i === 1 && <><Cue text="not the average" /><Punch value="PEAK" sub="of the noise floor" color={C.amberDim} size={400} y={240} o={ep(lt, 0, 0.2)} /></>}
      {i === 2 && <><Cue text="not tested" />
        <Line y={330} text="other builds than ffmpeg 6.1.1" size={56} color={C.bg} o={ep(lt, 0, 0.3)} />
        <Line y={410} text="real recordings" size={56} color={C.bg} o={ep(lt, 0.4, 0.7)} />
        <Line y={490} text="compressed audio" size={56} color={C.bg} o={ep(lt, 0.8, 1.1)} /></>}
      {i >= 3 && <><Cue text="FFmpeg Reality Checks" />
        <Line y={420} text="episode 83" size={100} mono={false} color={C.bg} align="center" o={ep(lt, 0, 0.3)} />
        <Line y={620} text="fixture and tests in the description" size={44} color={C.line} align="center" o={ep(lt, 0.4, 0.7)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, clip: ClipScene, duration: Duration, level: Level, spelling: Spelling, exact: Exact, close: Close};
