import React from 'react';
import {C, F, D, W, H} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Figure, Head} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff64/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
   Style: illustrated scenario (the brief's live-action style is not possible with synthetic input). Flat vector objects only
   (picture frame, cassette, reels, clock), no faces. Palette lab only. */

/* ---------- measured data (seconds of picture and of song, frames) ---------- */
const SONG = 4.3;
const RE_1FPS = {frames: 4, sec: 4.0};       // -shortest, song re-encoded, 1 fps (also 4.37 and 4.99 s songs give 4 frames)
const COPY_1FPS = {frames: 1, sec: 1.0};     // -c:a copy, 1 fps
const RE_25 = {frames: 107, sec: 4.28};      // -shortest, 25 fps
const COPY_25 = {frames: 105, sec: 4.2};     // -c:a copy, 25 fps
const NONE_25 = {frames: 200, sec: 8.0};     // no stop option, -t 8 guard
const FFLAGS_25 = {frames: 250, sec: 10.0};  // -fflags +shortest
const TDUR_25 = {frames: 108, sec: 4.32};    // -t 4.3

/* ---------- local drawing kit (square corners, flat fills, no gradients) ---------- */
const Svg: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <svg style={{position: 'absolute', left: 0, top: 0}} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
    <defs>
      <pattern id="hatch" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)">
        <rect width="16" height="16" fill={C.redDim} />
        <line x1="0" y1="0" x2="0" y2="16" stroke={C.red} strokeWidth="5" />
      </pattern>
      <marker id="chev" markerWidth="14" markerHeight="14" refX="11" refY="7" orient="auto" markerUnits="userSpaceOnUse"><path d="M1,1 L12,7 L1,13" fill="none" stroke={C.mute} strokeWidth="3" /></marker>
    </defs>
    {children}
  </svg>
);
const Tx: React.FC<{x: number; y: number; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; mono?: boolean; weight?: number; o?: number; children?: React.ReactNode}> = ({x, y, size = 26, color = C.text, anchor = 'start', mono = true, weight = 600, o = 1, children}) => (
  <text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor} fontFamily={mono ? F.mono : F.sans} fontWeight={weight} opacity={o}>{children}</text>
);

/* a film reel: tape disc, six holes, hub. tape in [0,1] is how much film is left on it. */
const Reel: React.FC<{cx: number; cy: number; r: number; color: string; tint: string; tape?: number; spin?: number; o?: number}> = ({cx, cy, r, color, tint, tape = 1, spin = 0, o = 1}) => (
  <g opacity={o}>
    <circle cx={cx} cy={cy} r={r} fill={C.bg2} stroke={color} strokeWidth={6} />
    <circle cx={cx} cy={cy} r={Math.max(r * 0.3, r * 0.9 * tape)} fill={tint} stroke={color} strokeWidth={3} />
    <g transform={`rotate(${spin} ${cx} ${cy})`}>
      {Array.from({length: 6}, (_, i) => {
        const a = (i * Math.PI) / 3;
        return <circle key={i} cx={cx + Math.cos(a) * r * 0.2} cy={cy + Math.sin(a) * r * 0.2} r={r * 0.07} fill={C.bg} />;
      })}
    </g>
    <circle cx={cx} cy={cy} r={r * 0.08} fill={color} />
  </g>
);


const Clock: React.FC<{cx: number; cy: number; r: number; sec: number; color?: string; o?: number}> = ({cx, cy, r, sec, color = C.text, o = 1}) => {
  const a = (sec / 5) * 2 * Math.PI - Math.PI / 2;
  return (
    <g opacity={o}>
      <circle cx={cx} cy={cy} r={r} fill={C.bg2} stroke={color} strokeWidth={5} />
      {Array.from({length: 5}, (_, i) => {
        const b = (i / 5) * 2 * Math.PI - Math.PI / 2;
        return <line key={i} x1={cx + Math.cos(b) * r * 0.78} y1={cy + Math.sin(b) * r * 0.78} x2={cx + Math.cos(b) * r * 0.94} y2={cy + Math.sin(b) * r * 0.94} stroke={C.mute} strokeWidth={4} />;
      })}
      <line x1={cx} y1={cy} x2={cx + Math.cos(a) * r * 0.7} y2={cy + Math.sin(a) * r * 0.7} stroke={color} strokeWidth={6} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill={color} />
    </g>
  );
};


/* a card with a typed label and one value, square corners, one ink border */
const Card: React.FC<{x: number; y: number; w: number; h: number; label: string; value: string; sub?: string; color?: string; o?: number; vs?: number; mono?: boolean}> = ({x, y, w, h, label, value, sub, color = C.cyan, o = 1, vs = 50, mono = true}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box', opacity: o, background: C.bg2, border: `3px solid ${color}`, borderLeftWidth: 14, padding: '10px 22px', fontFamily: F.sans}}>
    <div style={{fontSize: 20, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color}}>{label}</div>
    <div style={{fontFamily: mono ? F.mono : F.display, fontSize: vs * (mono ? 1 : D.k), fontWeight: 800, color: C.text, lineHeight: 1.1, marginTop: 4, whiteSpace: 'nowrap'}}>{value}</div>
    {sub && <div style={{fontSize: 24, color: C.dim, marginTop: 4, lineHeight: 1.25}}>{sub}</div>}
  </div>
);
const Note: React.FC<{x: number; y: number; w: number; o?: number; size?: number; color?: string; align?: 'left' | 'center'; mono?: boolean; children?: React.ReactNode}> = ({x, y, w, o = 1, size = 26, color = C.dim, align = 'left', mono = false, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, fontFamily: mono ? F.mono : F.sans, fontSize: size, fontWeight: 500, color, lineHeight: 1.3, textAlign: align, whiteSpace: 'pre-wrap'}}>{children}</div>
);
const Cmd: React.FC<{y: number; text: string; o?: number; size?: number}> = ({y, text, o = 1, size = 34}) => (
  <div style={{position: 'absolute', left: 0, top: y, width: W, display: 'flex', justifyContent: 'center', opacity: o}}>
    <div style={{padding: '14px 32px', background: C.codeBg, border: `3px solid ${C.text}`, fontFamily: F.mono, fontSize: size, color: C.text, whiteSpace: 'pre'}}><span style={{color: C.cyan}}>$ </span>{text}</div>
  </div>
);


/* a picture on a stand: flat grey card in a heavy frame */
const Pic: React.FC<{x: number; y: number; w?: number; o?: number}> = ({x, y, w = 220, o = 1}) => {
  const h = (w * 3) / 4;
  return (
    <g opacity={o}>
      <polyline points={`${x + w * 0.15},${y} ${x + w / 2},${y - 44} ${x + w * 0.85},${y}`} fill="none" stroke={C.mute} strokeWidth={3} />
      <circle cx={x + w / 2} cy={y - 44} r={6} fill={C.text} />
      <rect x={x} y={y} width={w} height={h} fill={C.dim} stroke={C.text} strokeWidth={8} />
      <rect x={x + w * 0.1} y={y + h * 0.1} width={w * 0.8} height={h * 0.8} fill="none" stroke={C.bg2} strokeWidth={2} />
    </g>
  );
};
/* a cassette: label strip and two reels */
const Cassette: React.FC<{x: number; y: number; w?: number; spin?: number; o?: number; label?: string}> = ({x, y, w = 300, spin = 0, o = 1, label = 'song'}) => {
  const h = w * 0.62;
  return (
    <g opacity={o}>
      <rect x={x} y={y} width={w} height={h} fill={C.panel} stroke={C.text} strokeWidth={5} />
      <rect x={x + w * 0.1} y={y + h * 0.1} width={w * 0.8} height={h * 0.3} fill={C.bg2} stroke={C.line} strokeWidth={3} />
      <Tx x={x + w / 2} y={y + h * 0.31} size={Math.max(18, w * 0.09)} anchor="middle" weight={800}>{label}</Tx>
      <Reel cx={x + w * 0.3} cy={y + h * 0.7} r={h * 0.15} color={C.green} tint={C.greenDim} tape={0.7} spin={spin} />
      <Reel cx={x + w * 0.7} cy={y + h * 0.7} r={h * 0.15} color={C.green} tint={C.greenDim} tape={0.5} spin={spin} />
    </g>
  );
};

/* a time bar drawn to scale: pps pixels per second from x0. kind: song (olive), pic (indigo, cut into cells), miss (dashed madder: time with no picture), over (hatched madder: picture past the song) */
const Tbar: React.FC<{x0: number; y: number; from?: number; to: number; pps: number; kind: 'song' | 'pic' | 'miss' | 'over'; cells?: number; h?: number; text?: string; p?: number}> = ({x0, y, from = 0, to, pps, kind, cells = 0, h = 46, text, p = 1}) => {
  const x = x0 + from * pps, w = Math.max(0, (to - from) * pps * p);
  const fill = kind === 'song' ? C.greenDim : kind === 'pic' ? C.cyanDim : kind === 'over' ? 'url(#hatch)' : 'none';
  const stroke = kind === 'song' ? C.green : kind === 'pic' ? C.cyan : C.red;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={4} strokeDasharray={kind === 'miss' ? '10 8' : undefined} />
      {cells > 1 && p > 0.97 && Array.from({length: cells - 1}, (_, i) => <line key={i} x1={x + ((i + 1) * w) / cells} y1={y} x2={x + ((i + 1) * w) / cells} y2={y + h} stroke={C.cyan} strokeWidth={2} />)}
      {text && p > 0.97 && <Tx x={x + 12} y={y + h / 2 + 9} size={24} weight={700}>{text}</Tx>}
    </g>
  );
};
const Lab: React.FC<{y: number; h?: number; text: string; sub?: string; color?: string; o?: number}> = ({y, h = 46, text, sub, color = C.text, o = 1}) => (
  <g opacity={o}>
    <Tx x={96} y={y + (sub ? h / 2 - 2 : h / 2 + 9)} size={26} color={color} weight={700}>{text}</Tx>
    {sub && <Tx x={96} y={y + h / 2 + 26} size={22} color={C.dim} mono={false} weight={500}>{sub}</Tx>}
  </g>
);
const Ruler: React.FC<{x0: number; y: number; pps: number; secs: number; o?: number}> = ({x0, y, pps, secs, o = 1}) => (
  <g opacity={o}>
    <line x1={x0} y1={y} x2={x0 + secs * pps} y2={y} stroke={C.mute} strokeWidth={3} />
    {Array.from({length: secs + 1}, (_, s) => (
      <g key={s}>
        <line x1={x0 + s * pps} y1={y} x2={x0 + s * pps} y2={y + 14} stroke={C.mute} strokeWidth={3} />
        <Tx x={x0 + s * pps} y={y + 40} size={22} color={C.mute} anchor="middle">{s} s</Tx>
      </g>
    ))}
  </g>
);

/* ---------- 1. The ask ---------- */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="A still image and a song" title="Which one is longer?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={292} text="ffmpeg -loop 1 -i still.png -i song.wav -shortest" size={30} o={ep(t, 1.0, 1.6)} />
    <Svg>
      <Pic x={420} y={470} w={260} o={ep(t, 2.0, 2.7)} />
      <Cassette x={1000} y={450} w={360} spin={t * 40} o={ep(t, 3.2, 3.9)} />
      <Tx x={550} y={715} size={26} anchor="middle" o={ep(t, 2.4, 3.0)} weight={800}>still.png</Tx>
      <Tx x={1180} y={715} size={26} anchor="middle" o={ep(t, 3.6, 4.2)} weight={800}>song.wav</Tx>
      <Lab y={758} text="picture" o={ep(t, 4.6, 5.1)} />
      <Tbar x0={560} y={758} to={SONG} pps={200} kind="pic" p={ep(t, 4.8, 5.8)} />
      <rect x={560 + SONG * 200} y={758} width={360} height={46} fill="none" stroke={C.cyan} strokeWidth={4} strokeDasharray="10 8" opacity={ep(t, 5.4, 6.0)} />
      <Tx x={560 + SONG * 200 + 20} y={790} size={24} color={C.cyan} o={ep(t, 5.6, 6.2)}>loops forever</Tx>
      <Lab y={818} text="song" o={ep(t, 6.2, 6.7)} />
      <Tbar x0={560} y={818} to={SONG} pps={200} kind="song" text="4.3 s" p={ep(t, 6.3, 7.3)} />
    </Svg>
  </>
);

/* ---------- 2. Four panels ---------- */
const PW = 400, PH = 420, PY = 290, PG = 40, PX0 = (W - (4 * PW + 3 * PG)) / 2;
const story = [
  {tag: '', cap: 'A still picture and a song, 4.3 s long.'},
  {tag: '-shortest', cap: 'Song re-encoded, 1 frame a second: 4 frames, the picture ends at 4.0 s.'},
  {tag: '-c:a copy', cap: 'Song copied: 1 frame, the picture ends at 1.0 s.'},
  {tag: '-bf 0', cap: 'Song copied, no B-frames: 4 frames again.'},
];
const Story: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="The story, in four panels" title="The picture ends early." o={ep(t, 0.2, 0.8)} />
    <Svg>
      {story.map((p, i) => {
        const x = PX0 + i * (PW + PG), o = ep(t, 1.0 + i * 1.8, 1.7 + i * 1.8);
        const pps = 79, bx = 30;
        const frames = i === 2 ? COPY_1FPS.frames : RE_1FPS.frames;
        const secs = i === 2 ? COPY_1FPS.sec : RE_1FPS.sec;
        const col = i === 2 ? C.red : C.green;
        return (
          <g key={i} opacity={o} transform={`translate(${x} ${PY})`}>
            <rect width={PW} height={PH} fill={C.bg2} stroke={C.text} strokeWidth={5} />
            <rect width={56} height={56} fill={C.text} />
            <Tx x={28} y={40} size={34} color={C.bg} anchor="middle" weight={800}>{i + 1}</Tx>
            {p.tag && <Tx x={PW - 20} y={40} size={30} anchor="end" weight={800}>{p.tag}</Tx>}
            {i === 0 ? (
              <g>
                <Pic x={50} y={170} w={150} />
                <Cassette x={225} y={150} w={150} spin={t * 40} />
                <Tx x={125} y={320} size={24} anchor="middle">picture</Tx>
                <Tx x={300} y={320} size={24} anchor="middle">song 4.3 s</Tx>
              </g>
            ) : (
              <g>
                <Tx x={bx} y={140} size={24} color={C.dim} weight={500}>song 4.3 s</Tx>
                <Tbar x0={bx} y={152} to={SONG} pps={pps} kind="song" h={44} />
                <Tx x={bx} y={236} size={24} color={C.dim} weight={500}>picture {secs.toFixed(1)} s</Tx>
                <Tbar x0={bx} y={248} to={secs} pps={pps} kind="pic" cells={frames} h={44} />
                <Tbar x0={bx} y={248} from={secs} to={SONG} pps={pps} kind="miss" h={44} />
                <Tx x={bx} y={350} size={30} color={col} weight={800}>{frames} {frames === 1 ? 'frame' : 'frames'}</Tx>
                {i === 2 && <Tx x={bx} y={386} size={24} color={C.red} weight={700}>3.3 s with no picture</Tx>}
                {i === 1 && <Tx x={bx} y={386} size={24} color={C.amber} weight={700}>0.3 s short</Tx>}
                {i === 3 && <Tx x={bx} y={386} size={24} color={C.green} weight={700}>0.3 s short</Tx>}
              </g>
            )}
          </g>
        );
      })}
      {[0, 1, 2].map((i) => <line key={i} x1={PX0 + (i + 1) * PW + i * PG + 6} y1={PY + PH / 2} x2={PX0 + (i + 1) * PW + i * PG + PG - 6} y2={PY + PH / 2} stroke={C.mute} strokeWidth={4} markerEnd="url(#chev)" opacity={ep(t, 1.0 + (i + 1) * 1.8, 1.7 + (i + 1) * 1.8)} />)}
    </Svg>
    {story.map((p, i) => <Note key={i} x={PX0 + i * (PW + PG)} y={PY + PH + 22} w={PW} size={26} color={C.text} o={ep(t, 1.4 + i * 1.8, 2.1 + i * 1.8)}>{p.cap}</Note>)}
  </>
);

/* ---------- 3. Sources and readers ---------- */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic input · 48000 Hz tones" title="One picture, four songs." o={ep(t, 0.2, 0.8)} />
    <Svg>
      <Pic x={120} y={350} w={170} o={ep(t, 0.9, 1.5)} />
      <Tx x={205} y={525} size={24} anchor="middle" o={ep(t, 1.2, 1.8)}>still.png</Tx>
      <Tx x={205} y={556} size={22} anchor="middle" color={C.dim} weight={500} o={ep(t, 1.2, 1.8)}>96 x 72, flat</Tx>
      {[4.0, 4.3, 4.37, 4.99].map((s, i) => (
        <g key={s}>
          <Tbar x0={360} y={300 + i * 78} to={s} pps={100} kind="song" h={46} p={ep(t, 1.6 + i * 0.5, 2.4 + i * 0.5)} />
          <Tx x={360 + s * 100 + 18} y={300 + i * 78 + 33} size={28} weight={700} o={ep(t, 2.4 + i * 0.5, 3.0 + i * 0.5)}>{s.toFixed(s === 4 ? 1 : s === 4.3 ? 1 : 2)} s</Tx>
        </g>
      ))}
    </Svg>
    <Note x={360} y={640} w={560} size={24} o={ep(t, 4.2, 4.8)}>Each song is 192000, 206400, 209760 and 239520 samples.</Note>
    <Card x={1000} y={290} w={820} h={146} label="Control" value="4.0 s: 100 frames" sub="25 fps, picture and song equal" color={C.green} o={ep(t, 5.0, 5.6)} />
    <Card x={1000} y={456} w={820} h={146} label="Reader 1" value="ffprobe packets" sub="end of the picture, end of the song" color={C.cyan} o={ep(t, 6.4, 7.0)} />
    <Card x={1000} y={622} w={820} h={146} label="Reader 2" value="decoded frames" sub="frames and samples counted in Node" color={C.amber} o={ep(t, 7.8, 8.4)} />
  </>
);

/* ---------- 4. -shortest with a re-encoded song ---------- */
const GAPS = [{s: 4.3, gap: 0.3, label: '-0.30 s'}, {s: 4.37, gap: 0.37, label: '-0.37 s'}, {s: 4.99, gap: 0.99, label: '-0.99 s'}];
const Rule: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Song re-encoded, never longer" title="Floor, not round." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Svg>
      {GAPS.map((g, i) => {
        const y = 285 + i * 118, a = 1.0 + i * 1.6;
        return (
          <g key={g.s}>
            <Lab y={y + 24} h={46} text={`${g.s} s song`} sub={`1 fps · ${RE_1FPS.frames} frames`} o={ep(t, a, a + 0.5)} />
            <Tbar x0={560} y={y} to={g.s} pps={200} kind="song" h={38} p={ep(t, a, a + 0.8)} />
            <Tbar x0={560} y={y + 46} to={RE_1FPS.sec} pps={200} kind="pic" cells={RE_1FPS.frames} h={38} p={ep(t, a + 0.4, a + 1.2)} />
            <Tbar x0={560} y={y + 46} from={RE_1FPS.sec} to={g.s} pps={200} kind="miss" h={38} p={ep(t, a + 1.0, a + 1.4)} />
            <Tx x={560 + g.s * 200 + 24} y={y + 76} size={30} color={C.amber} weight={800} o={ep(t, a + 1.2, a + 1.7)}>{g.label}</Tx>
          </g>
        );
      })}
      <Lab y={655} h={38} text="4.3 s song" sub={`25 fps · ${RE_25.frames} frames`} o={ep(t, 6.2, 6.7)} />
      <Tbar x0={560} y={655} to={SONG} pps={200} kind="song" h={38} p={ep(t, 6.2, 7.0)} />
      <Tbar x0={560} y={701} to={RE_25.sec} pps={200} kind="pic" h={38} p={ep(t, 6.6, 7.4)} />
      <Tx x={560 + SONG * 200 + 24} y={731} size={30} color={C.amber} weight={800} o={ep(t, 7.4, 7.9)}>-0.02 s</Tx>
    </Svg>
    <Note x={96} y={800} w={1728} align="center" mono size={32} color={C.text} o={ep(t, 8.2, 8.8)}>frames = floor(song length x frame rate)</Note>
  </>
);

/* ---------- 5. A copied song ---------- */
const Copy: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Song copied, 1 frame a second" title="One frame of four." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Svg>
      <Lab y={270} h={44} text="song" sub="4.3 s" o={ep(t, 0.9, 1.4)} />
      <Tbar x0={560} y={270} to={SONG} pps={200} kind="song" h={44} p={ep(t, 1.0, 1.8)} />
      <Lab y={350} h={44} text="re-encoded" sub="4 frames" o={ep(t, 2.0, 2.5)} />
      <Tbar x0={560} y={350} to={RE_1FPS.sec} pps={200} kind="pic" cells={4} h={44} p={ep(t, 2.1, 2.9)} />
      <Lab y={430} h={44} text="-c:a copy" sub="1 frame" color={C.red} o={ep(t, 3.2, 3.7)} />
      <Tbar x0={560} y={430} to={COPY_1FPS.sec} pps={200} kind="pic" cells={1} h={44} p={ep(t, 3.3, 3.9)} />
      <Tbar x0={560} y={430} from={COPY_1FPS.sec} to={SONG} pps={200} kind="miss" h={44} p={ep(t, 3.8, 4.6)} />
      <Tx x={560 + SONG * 200 + 24} y={462} size={28} color={C.red} weight={800} o={ep(t, 4.4, 4.9)}>3.3 s with no picture</Tx>
      <Lab y={510} h={44} text="-c:a copy -bf 0" sub="4 frames" color={C.green} o={ep(t, 5.2, 5.7)} />
      <Tbar x0={560} y={510} to={RE_1FPS.sec} pps={200} kind="pic" cells={4} h={44} p={ep(t, 5.3, 6.1)} />
      <Lab y={590} h={44} text="-c:a copy, ffv1" sub="4 frames" color={C.green} o={ep(t, 6.4, 6.9)} />
      <Tbar x0={560} y={590} to={RE_1FPS.sec} pps={200} kind="pic" cells={4} h={44} p={ep(t, 6.5, 7.3)} />
    </Svg>
    <Figure y={695} value="1 s of 4.3 s" caption="25 fps: 105 of 107 frames" size={104} color={C.red} o={ep(t, 7.6, 8.4)} />
  </>
);

/* ---------- 6. When it is longer ---------- */
const Longer: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {l: '-shortest', sub: `${RE_25.frames} frames`, sec: RE_25.sec, c: C.green},
    {l: '-t 4.3', sub: `${TDUR_25.frames} frames`, sec: TDUR_25.sec, c: C.amber},
    {l: 'no stop option', sub: `${NONE_25.frames} frames · -t 8`, sec: NONE_25.sec, c: C.red},
    {l: '-fflags +shortest', sub: `${FFLAGS_25.frames} frames`, sec: FFLAGS_25.sec, c: C.red},
  ];
  return (
    <>
      <Head over="Picture longer than the song" title="Only if you let it run." color={C.red} o={ep(t, 0.2, 0.8)} />
      <Svg>
        <Lab y={270} h={44} text="song" sub="4.3 s" o={ep(t, 0.9, 1.4)} />
        <Tbar x0={560} y={270} to={SONG} pps={100} kind="song" h={44} p={ep(t, 1.0, 1.7)} />
        {rows.map((r, i) => {
          const y = 350 + i * 90, a = 2.0 + i * 1.8;
          return (
            <g key={r.l}>
              <Lab y={y} h={44} text={r.l} sub={r.sub} color={r.c} o={ep(t, a, a + 0.5)} />
              <Tbar x0={560} y={y} to={Math.min(r.sec, SONG)} pps={100} kind="pic" h={44} p={ep(t, a + 0.1, a + 0.9)} />
              {r.sec > SONG && <Tbar x0={560} y={y} from={SONG} to={r.sec} pps={100} kind="over" h={44} p={ep(t, a + 0.8, a + 1.5)} />}
              <Tx x={560 + r.sec * 100 + 20} y={y + 31} size={28} color={r.c} weight={800} o={ep(t, a + 1.2, a + 1.7)}>{r.sec.toFixed(r.sec === 4.32 || r.sec === 4.28 ? 2 : 1)} s</Tx>
            </g>
          );
        })}
        <Ruler x0={560} y={730} pps={100} secs={10} o={ep(t, 1.0, 1.6)} />
        <line x1={560 + SONG * 100} y1={262} x2={560 + SONG * 100} y2={725} stroke={C.green} strokeWidth={3} strokeDasharray="8 8" opacity={ep(t, 1.6, 2.2)} />
      </Svg>
      <Note x={96} y={820} w={1728} align="center" size={26} o={ep(t, 8.8, 9.4)}>25 fps, song 4.3 s. Every command also carried a hard -t, so nothing could run on.</Note>
    </>
  );
};

/* ---------- 7. Close ---------- */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="What to check" title="Count the frames." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Svg>
      <Pic x={150} y={400} w={200} o={ep(t, 0.8, 1.4)} />
      <Cassette x={140} y={590} w={220} spin={t * 40} o={ep(t, 1.2, 1.8)} />
    </Svg>
    <Card x={560} y={290} w={1260} h={138} label="Song re-encoded" value="-shortest" sub="never longer, up to one frame period short" color={C.green} o={ep(t, 1.4, 2.0)} vs={44} />
    <Card x={560} y={448} w={1260} h={138} label="Song copied" value="-c:a copy -bf 0" sub="without -bf 0 the picture can end seconds early" color={C.red} o={ep(t, 2.6, 3.2)} vs={44} />
    <Card x={560} y={606} w={1260} h={138} label="Runs on" value="-fflags +shortest" sub="10 s of picture for a 4.3 s song" color={C.amber} o={ep(t, 3.8, 4.4)} vs={44} />
    <Note x={96} y={776} w={1728} align="center" size={28} o={ep(t, 5.0, 5.6)}>Not tested: other encoders, containers and songs, real images, players, builds other than ffmpeg 6.1.1.</Note>
    <Note x={96} y={826} w={1728} align="center" size={28} color={C.mute} o={ep(t, 5.6, 6.2)}>FFmpeg Reality Checks · episode 64 · fixture and tests in the description</Note>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, story: Story, source: Source, rule: Rule, copy: Copy, longer: Longer, close: Close};
