import React from 'react';
import {C, F, D} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Fireship fast code. Hard cuts every 2 to 3 seconds, huge monospace code with typewriter reveals, one on-screen counter,
 * a quick wipe at every cut, one punch-line number per beat. Flat ink screen, light tints of the lab inks (the Dim keys) as the accents.
 * Every number is measured by episodes/ff92/fixture/experiment.mjs (ffmpeg 6.1.1, libx264, -g 250, a 300 frame clip with hard cuts at 60, 130 and 210).
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

/* ---------- timeline of the 300 frames: cuts as red ticks, keyframes filled, I frames that are not keyframes hollow ---------- */
const TX0 = 160, TW = 1600, NF = 300, TPX = TW / NF;
const fx = (f: number) => TX0 + f * TPX;
const CUTS = [60, 130, 210];
const Timeline: React.FC<{y: number; idr?: number[]; hollow?: number[]; cuts?: boolean; reveal?: number; labels?: boolean; h?: number}> = ({y, idr = [], hollow = [], cuts = true, reveal = 1, labels = true, h = 150}) => (
  <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
    <rect x={TX0} y={y + h / 2 - 8} width={TW * reveal} height={16} fill={C.mute} />
    {cuts && CUTS.map((c) => fx(c) / 1 <= TX0 + TW * reveal && (
      <g key={c}>
        <rect x={fx(c) - 3} y={y - 20} width={6} height={h + 40} fill={C.redDim} />
        {labels && <text x={fx(c)} y={y - 34} textAnchor="middle" fontFamily={F.mono} fontSize={34} fontWeight={700} fill={C.redDim}>{c}</text>}
      </g>
    ))}
    {idr.map((f) => fx(f) <= TX0 + TW * reveal && (
      <g key={'k' + f}>
        <rect x={fx(f) - 5} y={y} width={10} height={h} fill={C.amberDim} />
        {labels && <text x={fx(f)} y={y + h + 44} textAnchor="middle" fontFamily={F.mono} fontSize={36} fontWeight={700} fill={C.amberDim}>{f}</text>}
      </g>
    ))}
    {hollow.map((f) => fx(f) <= TX0 + TW * reveal && (
      <g key={'h' + f}>
        <rect x={fx(f) - 16} y={y + 10} width={32} height={h - 20} fill="none" stroke={C.bg} strokeWidth={5} strokeDasharray="10 7" />
        {labels && <text x={fx(f)} y={y + h + 44} textAnchor="middle" fontFamily={F.mono} fontSize={36} fontWeight={700} fill={C.bg}>{f}</text>}
      </g>
    ))}
    <text x={TX0} y={y + h + 90} fontFamily={F.mono} fontSize={26} fill={C.line}>frame 0</text>
    <text x={TX0 + TW} y={y + h + 90} textAnchor="end" fontFamily={F.mono} fontSize={26} fill={C.line}>frame 299</text>
  </svg>
);

/* 1. The question */
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 7);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="the setting" /><Punch value="-g 250" size={300} y={250} color={C.amberDim} o={ep(lt, 0, 0.2)} /><Line y={760} text="a keyframe interval of 250 frames" align="center" size={50} color={C.line} o={ep(lt, 0.7, 1.1)} /></>}
      {i === 1 && <><Cue text="the clip" /><Timeline y={380} reveal={ep(lt, 0, 0.8)} /><Line y={760} text="300 frames · 3 hard cuts" align="center" size={56} color={C.bg} o={ep(lt, 0.9, 1.3)} /></>}
      {i === 2 && <><Cue text="you expect" /><Punch value="2" sub="keyframes: 0 and 250" color={C.greenDim} size={470} y={190} o={ep(lt, 0, 0.2)} /></>}
      {i === 3 && <><Cue text="you get" /><Punch value="4" sub="keyframes: 0 60 130 210" color={C.redDim} size={470} y={190} o={ep(lt, 0, 0.2)} /></>}
      {i === 4 && <><Cue text="the cuts are keyframes" /><Punch value="60 130 210" size={220} y={330} color={C.bg} o={ep(lt, 0, 0.2)} /></>}
      {i === 5 && <><Cue text="we measure it" />
        <Code lt={lt} y={330} size={74} cps={34} lines={[[{t: 'x264 · -g 250', c: C.amberDim}], [{t: 'four readers', c: C.cyanDim}, {t: ' · one file'}]]} /></>}
      {i === 6 && <><Cue text="the setup" />
        <Line y={330} text="synthetic clip · 300 frames" size={64} color={C.bg} o={ep(lt, 0, 0.3)} />
        <Line y={420} text="25 per second · hard cuts" size={64} color={C.bg} o={ep(lt, 0.5, 0.8)} />
        <Line y={510} text="ffmpeg 6.1.1" size={64} color={C.amberDim} o={ep(lt, 1.0, 1.3)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 2. The clip and the four readers */
const ClipScene: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 7);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="the clip" /><Timeline y={380} reveal={ep(lt, 0, 0.9)} />
        <Line y={760} text="cuts found in the raw bytes: 60 130 210" align="center" size={50} color={C.line} o={ep(lt, 1.0, 1.4)} /></>}
      {i === 1 && <><Cue text="reader 1" />
        <Code lt={lt} y={300} size={80} cps={40} lines={[[{t: 'ffprobe packets', c: C.cyanDim}], [{t: 'flags = '}, {t: 'K', c: C.amberDim}], [{t: 'the keyframes', c: C.line}]]} /></>}
      {i === 2 && <><Cue text="reader 2" />
        <Code lt={lt} y={300} size={80} cps={40} lines={[[{t: 'ffprobe frames', c: C.cyanDim}], [{t: 'pict_type = '}, {t: 'I', c: C.amberDim}], [{t: 'the I frames', c: C.line}]]} /></>}
      {i === 3 && <><Cue text="reader 3" />
        <Code lt={lt} y={300} size={80} cps={40} lines={[[{t: 'Node reads the bytes', c: C.cyanDim}], [{t: 'NAL type '}, {t: '5', c: C.amberDim}, {t: ' = IDR'}], [{t: 'slice_type = '}, {t: 'I', c: C.amberDim}]]} /></>}
      {i === 4 && <><Cue text="reader 4" />
        <Code lt={lt} y={300} size={80} cps={40} lines={[[{t: 'x264 says', c: C.cyanDim}], [{t: 'frame I:'}, {t: '4', c: C.amberDim}]]} /></>}
      {i === 5 && <><Cue text="control: no cuts" /><Punch value="0 cuts" sub="keyframes: 0 and 250, every setting" size={300} y={230} color={C.greenDim} o={ep(lt, 0, 0.2)} /></>}
      {i === 6 && <><Cue text="four readers, one answer" />
        <Line y={330} text="the same frames, every time" size={68} color={C.bg} o={ep(lt, 0, 0.3)} />
        <Line y={430} text="in all 15 runs" size={68} color={C.greenDim} o={ep(lt, 0.8, 1.1)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 3. Defaults */
const Default: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 5);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="defaults, -g 250" /><Punch value="4" sub="keyframes" color={C.amberDim} size={520} y={180} o={ep(lt, 0, 0.2)} /></>}
      {i === 1 && <><Cue text="where" /><Timeline y={380} idr={[0, 60, 130, 210]} reveal={ep(lt, 0, 1.2)} /><Line y={780} text="every cut, a keyframe" align="center" size={56} color={C.bg} o={ep(lt, 1.2, 1.6)} /></>}
      {i === 2 && <><Cue text="and frame 250?" />
        <Line y={330} text="last keyframe: 210" size={72} color={C.bg} o={ep(lt, 0, 0.3)} />
        <Line y={430} text="next one due: 460" size={72} color={C.amberDim} o={ep(lt, 0.6, 0.9)} />
        <Line y={530} text="clip ends: 299" size={72} color={C.line} o={ep(lt, 1.2, 1.5)} /></>}
      {i === 3 && <><Cue text="the readers" /><Punch value="4 of 4" sub="agree on every frame" color={C.greenDim} size={330} y={230} o={ep(lt, 0, 0.2)} /></>}
      {i === 4 && <><Cue text="the whole file" /><Punch value="78511" sub="bytes on 6.1.1" color={C.bg} size={380} y={230} o={ep(lt, 0, 0.2)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 4. Scenecut off */
const Off: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 7);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="spelling one" />
        <Code lt={lt} y={400} size={100} lines={[[{t: '-sc_threshold 0', c: C.amberDim}]]} /></>}
      {i === 1 && <><Cue text="spelling two" />
        <Code lt={lt} y={400} size={86} lines={[[{t: '-x264-params ', c: C.amberDim}, {t: 'scenecut=0', c: C.amberDim}]]} /></>}
      {i === 2 && <><Cue text="compare the files" /><Punch value="=" sub="the same size, every packet" color={C.greenDim} size={520} y={180} o={ep(lt, 0, 0.2)} /></>}
      {i === 3 && <><Cue text="keyframes" /><Timeline y={380} idr={[0, 250]} reveal={ep(lt, 0, 1.0)} /><Line y={780} text="0 and 250" align="center" size={56} color={C.bg} o={ep(lt, 1.0, 1.4)} /></>}
      {i === 4 && <><Cue text="at the cuts" />
        <Line y={330} text="60   130   210" size={110} color={C.redDim} align="center" o={ep(lt, 0, 0.3)} />
        <Line y={520} text="no keyframe" size={110} mono={false} color={C.bg} align="center" o={ep(lt, 0.7, 1.0)} /></>}
      {i === 5 && <><Cue text="the cost, 8.1.2: +10.6%" /><Punch value="+9%" sub="6.1.1: 85876 against 78511" color={C.redDim} size={440} y={190} o={ep(lt, 0, 0.2)} /></>}
      {i === 6 && <><Cue text="frame 250" />
        <Line y={360} text="a keyframe" size={100} mono={false} color={C.bg} align="center" o={ep(lt, 0, 0.3)} />
        <Line y={500} text="in the middle of a scene" size={100} mono={false} color={C.amberDim} align="center" o={ep(lt, 0.6, 0.9)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 5. keyint_min */
const KeyintMin: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 7);
  const {i, lt} = beatOf(t, starts);
  return (
    <Dark>
      {i === 0 && <><Cue text="spelling one" />
        <Code lt={lt} y={400} size={100} lines={[[{t: '-keyint_min 250', c: C.amberDim}]]} /></>}
      {i === 1 && <><Cue text="spelling two" />
        <Code lt={lt} y={400} size={60} lines={[[{t: '-x264-params ', c: C.amberDim}, {t: 'keyint=250:min-keyint=250', c: C.amberDim}]]} /></>}
      {i === 2 && <><Cue text="I frames" /><Punch value="4" sub="at 0 60 130 210" color={C.amberDim} size={520} y={180} o={ep(lt, 0, 0.2)} /></>}
      {i === 3 && <><Cue text="keyframes, K flag" /><Punch value="2" sub="at 0 and 130" color={C.redDim} size={520} y={180} o={ep(lt, 0, 0.2)} /></>}
      {i === 4 && <><Cue text="60 and 210" /><Timeline y={340} idr={[0, 130]} hollow={[60, 210]} reveal={ep(lt, 0, 0.9)} />
        <Line y={760} text="filled: keyframe   hollow: I frame only" align="center" size={50} color={C.bg} o={ep(lt, 1.0, 1.4)} /></>}
      {i === 5 && <><Cue text="the bytes" />
        <Line y={330} text="NAL type 5:  0 and 130" size={70} color={C.amberDim} o={ep(lt, 0, 0.3)} />
        <Line y={430} text="NAL type 1, slice I:  60 and 210" size={70} color={C.bg} o={ep(lt, 0.8, 1.1)} /></>}
      {i === 6 && <><Cue text="three readers say so" />
        <Line y={330} text="K flag  ·  key_frame  ·  NAL 5" size={68} color={C.bg} o={ep(lt, 0, 0.3)} />
        <Line y={430} text="x264 counts I frames: 4" size={68} color={C.line} o={ep(lt, 0.8, 1.1)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

/* 6. The rule */
const RULE: {min: number; n: number; note: string; col: 'green' | 'amber' | 'red'}[] = [
  {min: 25, n: 4, note: 'the default', col: 'green'},
  {min: 60, n: 4, note: 'the cut at 60 is 60 after 0', col: 'green'},
  {min: 61, n: 3, note: '60 is one frame short', col: 'amber'},
  {min: 126, n: 2, note: '210 is 80 after 130', col: 'red'},
  {min: 250, n: 2, note: 'the same file as 126', col: 'red'},
];
const Rule: React.FC<SceneProps> = ({t, dur}) => {
  const starts = even(dur, 6);
  const {i, lt} = beatOf(t, starts);
  const r = RULE[Math.min(i, 4)];
  const prev = RULE[Math.max(0, Math.min(i, 4) - 1)];
  const shown = i === 0 ? r.n : lerp(prev.n, r.n, ep(lt, 0, 0.3));
  const col = C[(r.col + 'Dim') as 'greenDim'];
  return (
    <Dark>
      <Counter label="keyframes" value={i === 5 ? 4 : shown} color={i === 5 ? C.bg : col} />
      {i <= 4 && <>
        <Cue text="how far from the last keyframe" />
        <Code lt={lt} y={360} size={92} cps={44} lines={[[{t: '-keyint_min '}, {t: String(r.min), c: col}]]} />
        <Line y={520} text={r.note} size={56} color={C.line} o={ep(lt, 0.9, 1.2)} />
        <Punch value={String(r.n)} color={col} size={300} y={600} o={ep(lt, 0.4, 0.6)} />
      </>}
      {i === 5 && <><Cue text="the rule" />
        <Code lt={lt} y={320} size={72} lines={[[{t: 'a cut is a keyframe', c: C.bg}], [{t: 'if frames since the last one', c: C.line}], [{t: '>= min-keyint', c: C.amberDim}]]} />
        <Line y={660} text="and 250 acts as 126" size={50} color={C.line} o={ep(lt, 1.4, 1.8)} /></>}
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
        <Code lt={lt} y={300} size={72} lines={[[{t: '1  -g is a ceiling'}], [{t: '2  count the '}, {t: 'K flags', c: C.amberDim}], [{t: '3  '}, {t: '-sc_threshold 0', c: C.greenDim}, {t: ' for a fixed GOP'}]]} /></>}
      {i === 1 && <><Cue text="expect" /><Punch value="2 not 4" sub="keyframes with min-keyint 250" color={C.amberDim} size={300} y={230} o={ep(lt, 0, 0.2)} /></>}
      {i === 2 && <><Cue text="not tested" />
        <Line y={330} text="other builds than ffmpeg 6.1.1" size={56} color={C.bg} o={ep(lt, 0, 0.3)} />
        <Line y={410} text="other presets · B frames off" size={56} color={C.bg} o={ep(lt, 0.4, 0.7)} />
        <Line y={490} text="real footage" size={56} color={C.bg} o={ep(lt, 0.8, 1.1)} /></>}
      {i >= 3 && <><Cue text="FFmpeg Reality Checks" />
        <Line y={420} text="episode 92" size={100} mono={false} color={C.bg} align="center" o={ep(lt, 0, 0.3)} />
        <Line y={620} text="fixture and tests in the description" size={44} color={C.line} align="center" o={ep(lt, 0.4, 0.7)} /></>}
      <Wipe t={t} starts={starts} />
    </Dark>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, clip: ClipScene, default: Default, off: Off, keyintmin: KeyintMin, rule: Rule, close: Close};
