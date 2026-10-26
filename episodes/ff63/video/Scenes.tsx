import React from 'react';
import {C, F, D, W, H} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Figure, Head, Mid} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff63/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
   Style: illustrated scenario. Flat vector objects only (reels, desk, projector, screen, clock), no faces. Palette lab only. */

/* ---------- measured data ---------- */
const BASE_FRAMES = 125;   // base clip: 5 s at 25 fps
const OV_FRAMES = 50;      // overlay clip: 2 s, counter 0 to 49
const HELD = 75;           // default: frames after the overlay's own 50 on which counter 49 stays
const SHOWN49 = 76;        // counter 49 is on screen on 76 frames in all
const DELAY = 25;          // delayed overlay starts at output frame 25
const DELAY_HELD = 50;     // delayed overlay: frozen frames after its own 50 (counter 49 on 51 frames in all)

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

/* the projected frame, drawn to the true geometry of the fixture: base 96x72, overlay 32x24 at x=56, y=4. */
const Screen: React.FC<{x: number; y: number; w: number; counter: string; ovColor?: string; ovTint?: string; o?: number; fs?: number}> = ({x, y, w, counter, ovColor = C.green, ovTint = C.greenDim, o = 1, fs}) => {
  const h = (w * 72) / 96, k = w / 96;
  return (
    <g opacity={o}>
      <rect x={x} y={y} width={w} height={h} fill={C.cyanDim} stroke={C.text} strokeWidth={5} />
      <rect x={x + 56 * k} y={y + 4 * k} width={32 * k} height={24 * k} fill={ovTint} stroke={ovColor} strokeWidth={4} />
      <Tx x={x + 72 * k} y={y + 16 * k + (fs ?? 14 * k) * 0.36} size={fs ?? 14 * k} anchor="middle" weight={800} color={C.text}>{counter}</Tx>
    </g>
  );
};

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

const Projector: React.FC<{x: number; y: number; o?: number; spin?: number; beam?: [number, number, number, number]}> = ({x, y, o = 1, spin = 0, beam}) => (
  <g opacity={o}>
    {beam && <polygon points={`${x + 300},${y + 65} ${beam[0]},${beam[1]} ${beam[0]},${beam[3]} ${x + 300},${y + 95}`} fill={C.amberDim} opacity={0.55} />}
    <rect x={x} y={y} width={260} height={160} fill={C.panel} stroke={C.text} strokeWidth={5} />
    <rect x={x + 260} y={y + 55} width={44} height={50} fill={C.bg2} stroke={C.text} strokeWidth={5} />
    <Reel cx={x + 70} cy={y - 50} r={50} color={C.cyan} tint={C.cyanDim} tape={0.8} spin={spin} />
    <Reel cx={x + 190} cy={y - 50} r={50} color={C.green} tint={C.greenDim} tape={0.4} spin={spin} />
    <rect x={x + 30} y={y + 110} width={90} height={14} fill={C.line} />
  </g>
);

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

/* a timeline bar drawn to scale: 9 px per output frame, starting at BX */
const BX = 560, K = 9;
const Bar: React.FC<{from: number; to: number; y: number; h?: number; kind: 'base' | 'play' | 'hold' | 'cut'; text?: string; p?: number}> = ({from, to, y, h = 54, kind, text, p = 1}) => {
  const x = BX + from * K, w = (to - from) * K * p;
  const fill = kind === 'base' ? C.cyanDim : kind === 'play' ? C.greenDim : kind === 'hold' ? 'url(#hatch)' : 'none';
  const stroke = kind === 'base' ? C.cyan : kind === 'play' ? C.green : C.red;
  return (
    <g>
      <rect x={x} y={y} width={Math.max(0, w)} height={h} fill={fill} stroke={stroke} strokeWidth={4} strokeDasharray={kind === 'cut' ? '12 9' : undefined} />
      {text && p > 0.97 && (kind === 'hold' ? <rect x={x + 10} y={y + h / 2 - 22} width={text.length * 16.8 + 26} height={44} fill={C.bg} /> : null)}
      {text && p > 0.97 && <Tx x={x + (kind === 'hold' ? 20 : 14)} y={y + h / 2 + 9} size={26} color={C.text} weight={700}>{text}</Tx>}
    </g>
  );
};
const RowLabel: React.FC<{y: number; h?: number; text: string; sub?: string; color?: string; o?: number}> = ({y, h = 54, text, sub, color = C.text, o = 1}) => (
  <g opacity={o}>
    <Tx x={96} y={y + (sub ? h / 2 - 2 : h / 2 + 9)} size={26} color={color} weight={700}>{text}</Tx>
    {sub && <Tx x={96} y={y + h / 2 + 26} size={22} color={C.dim} mono={false} weight={500}>{sub}</Tx>}
  </g>
);
const Axis: React.FC<{y: number; o?: number}> = ({y, o = 1}) => (
  <g opacity={o}>
    <line x1={BX} y1={y} x2={BX + BASE_FRAMES * K} y2={y} stroke={C.mute} strokeWidth={3} />
    {[0, 1, 2, 3, 4, 5].map((s) => (
      <g key={s}>
        <line x1={BX + s * 25 * K - (s === 5 ? 1 : 0)} y1={y} x2={BX + s * 25 * K - (s === 5 ? 1 : 0)} y2={y + 14} stroke={C.mute} strokeWidth={3} />
        <Tx x={BX + s * 25 * K} y={y + 40} size={22} color={C.mute} anchor="middle">{s} s</Tx>
      </g>
    ))}
  </g>
);

/* ---------- 1. The ask ---------- */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="A short clip over a long one" title="Why does it freeze?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={300} text="overlay=x=56:y=4" o={ep(t, 1.0, 1.6)} />
    <Svg>
      <line x1={240} y1={760} x2={1680} y2={760} stroke={C.text} strokeWidth={7} opacity={ep(t, 1.6, 2.2)} />
      <Reel cx={430} cy={610} r={150} color={C.cyan} tint={C.cyanDim} tape={1} spin={t * 30} o={ep(t, 2.2, 2.9)} />
      <Reel cx={780} cy={670} r={90} color={C.green} tint={C.greenDim} tape={1} spin={t * 45} o={ep(t, 3.6, 4.3)} />
      <Projector x={1000} y={600} spin={t * 40} beam={[1500, 500, 0, 745]} o={ep(t, 5.0, 5.7)} />
      <Screen x={1500} y={500} w={320} counter="0" o={ep(t, 5.4, 6.1)} />
      <Tx x={430} y={796} size={26} anchor="middle" o={ep(t, 2.6, 3.2)} weight={800}>base</Tx>
      <Tx x={430} y={826} size={24} anchor="middle" o={ep(t, 2.6, 3.2)} weight={500}>5 s · 125 frames</Tx>
      <Tx x={780} y={796} size={26} anchor="middle" o={ep(t, 4.0, 4.6)} weight={800}>overlay</Tx>
      <Tx x={780} y={826} size={24} anchor="middle" o={ep(t, 4.0, 4.6)} weight={500}>2 s · 50 frames</Tx>
    </Svg>
    <Note x={0} y={846} w={W} align="center" size={28} o={ep(t, 7.0, 7.6)}>We measure every output frame, on ffmpeg 6.1.1.</Note>
  </>
);

/* ---------- 2. Four panels ---------- */
const PW = 400, PH = 420, PY = 290, PG = 40, PX0 = (W - (4 * PW + 3 * PG)) / 2;
const panels = [
  {time: '', counter: '', cap: 'Base 5 s, overlay 2 s. Two reels on a desk.', frame: ''},
  {time: '1.00 s', counter: '25', cap: 'At 1.00 s the overlay shows counter 25.', frame: 'frame 25'},
  {time: '2.00 s', counter: '49', cap: 'At 2.00 s the small reel is empty. Counter 49 was its last frame.', frame: 'frame 50'},
  {time: '4.00 s', counter: '49', cap: 'At 4.00 s the screen still shows counter 49.', frame: 'frame 100'},
];
const Story: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="The story, in four panels" title="Counter 49 stays." o={ep(t, 0.2, 0.8)} />
    <Svg>
      {panels.map((p, i) => {
        const x = PX0 + i * (PW + PG), o = ep(t, 1.0 + i * 2.2, 1.7 + i * 2.2);
        const sec = i === 1 ? 1 : i === 2 ? 2 : 4;
        const col = i === 3 ? C.red : C.green;
        return (
          <g key={i} opacity={o} transform={`translate(${x} ${PY})`}>
            <rect width={PW} height={PH} fill={C.bg2} stroke={C.text} strokeWidth={5} />
            <rect width={56} height={56} fill={C.text} />
            <Tx x={28} y={40} size={34} color={C.bg} anchor="middle" weight={800}>{i + 1}</Tx>
            {p.time && <Tx x={PW - 20} y={42} size={34} anchor="end" weight={800}>{p.time}</Tx>}
            {i === 0 ? (
              <g>
                <line x1={30} y1={350} x2={370} y2={350} stroke={C.text} strokeWidth={6} />
                <Reel cx={135} cy={255} r={95} color={C.cyan} tint={C.cyanDim} tape={1} spin={t * 30} />
                <Reel cx={300} cy={300} r={50} color={C.green} tint={C.greenDim} tape={1} spin={t * 45} />
                <Tx x={135} y={392} size={26} anchor="middle">5 s</Tx>
                <Tx x={300} y={392} size={26} anchor="middle">2 s</Tx>
              </g>
            ) : (
              <g>
                <Screen x={40} y={84} w={320} counter={p.counter} ovColor={col} ovTint={i === 3 ? C.redDim : C.greenDim} fs={40} />
                <Clock cx={86} cy={352} r={40} sec={sec} color={i === 3 ? C.red : C.text} />
                <Tx x={150} y={362} size={26} color={C.dim}>{p.frame}</Tx>
                {i === 2 && <Reel cx={338} cy={352} r={36} color={C.green} tint={C.greenDim} tape={0} />}
              </g>
            )}
          </g>
        );
      })}
      {[0, 1, 2].map((i) => <line key={i} x1={PX0 + (i + 1) * PW + i * PG + 6} y1={PY + PH / 2} x2={PX0 + (i + 1) * PW + i * PG + PG - 6} y2={PY + PH / 2} stroke={C.mute} strokeWidth={4} markerEnd="url(#chev)" opacity={ep(t, 1.0 + (i + 1) * 2.2, 1.7 + (i + 1) * 2.2)} />)}
    </Svg>
    {panels.map((p, i) => <Note key={i} x={PX0 + i * (PW + PG)} y={PY + PH + 22} w={PW} size={26} color={C.text} o={ep(t, 1.4 + i * 2.2, 2.1 + i * 2.2)}>{p.cap}</Note>)}
  </>
);

/* ---------- 3. The fixture and the readers ---------- */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Synthetic clips · lossless · 25 fps" title="A pixel names its frame." o={ep(t, 0.2, 0.8)} />
    <Svg>
      <g opacity={ep(t, 1.0, 1.7)}>
        <rect x={150} y={290} width={480} height={360} fill={C.cyanDim} stroke={C.text} strokeWidth={5} />
        <rect x={150 + 56 * 5} y={290 + 4 * 5} width={160} height={120} fill={C.greenDim} stroke={C.green} strokeWidth={4} />
        <Tx x={170} y={630} size={24} color={C.text} weight={500}>base 96 x 72</Tx>
        <Tx x={150 + 56 * 5 + 80} y={290 + 4 * 5 + 70} size={28} color={C.green} anchor="middle" weight={800}>32 x 24</Tx>
      </g>
      <g opacity={ep(t, 2.2, 2.9)}>
        <line x1={150} y1={680} x2={430} y2={680} stroke={C.red} strokeWidth={4} />
        <line x1={150} y1={670} x2={150} y2={690} stroke={C.red} strokeWidth={4} />
        <line x1={430} y1={670} x2={430} y2={690} stroke={C.red} strokeWidth={4} />
        <Tx x={290} y={716} size={26} color={C.red} anchor="middle" weight={700}>x = 56, y = 4</Tx>
      </g>
    </Svg>
    <Note x={150} y={750} w={560} size={26} mono color={C.text} o={ep(t, 3.0, 3.6)}>{'base frame n: luma 16 + n\noverlay frame m: luma 186 + m'}</Note>
    <Card x={800} y={290} w={1020} h={146} label="Control" value="base 2 s: 50 frames" sub="every counter once, no freeze" color={C.green} o={ep(t, 4.4, 5.0)} />
    <Card x={800} y={456} w={1020} h={146} label="Reader 1" value="crop hashes" sub="framemd5 of the overlay square, against the source clips" color={C.cyan} o={ep(t, 6.0, 6.6)} />
    <Card x={800} y={622} w={1020} h={146} label="Reader 2" value="raw pixels" sub="mean luma and chroma of the square, in Node" color={C.amber} o={ep(t, 7.4, 8.0)} />
    <Note x={800} y={790} w={1020} size={26} o={ep(t, 8.8, 9.4)}>Base 125 frames (5 s). Overlay 50 frames (2 s).</Note>
  </>
);

/* ---------- 4. The default ---------- */
const Hold: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="The default, measured" title="Counter 49 holds for 3 s." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Svg>
      <RowLabel y={290} text="base" sub="125 frames" o={ep(t, 0.9, 1.4)} />
      <Bar from={0} to={BASE_FRAMES} y={290} kind="base" text="5 s, 125 frames" p={ep(t, 1.0, 2.0)} />
      <RowLabel y={380} text="overlay file" sub="50 frames" o={ep(t, 2.2, 2.7)} />
      <Bar from={0} to={OV_FRAMES} y={380} kind="play" text="2 s, 50 frames" p={ep(t, 2.3, 3.2)} />
      <RowLabel y={470} h={70} text="in the output" sub="default, 125 frames" color={C.red} o={ep(t, 3.6, 4.1)} />
      <Bar from={0} to={OV_FRAMES} y={470} h={70} kind="play" text="counter 0 to 49" p={ep(t, 3.7, 4.5)} />
      <Bar from={OV_FRAMES} to={BASE_FRAMES} y={470} h={70} kind="hold" text={`counter 49 held, ${HELD} frames`} p={ep(t, 4.6, 5.8)} />
      <Axis y={575} o={ep(t, 1.0, 1.6)} />
      <Clock cx={330} cy={760} r={90} sec={4} color={C.red} o={ep(t, 6.2, 6.8)} />
      <Screen x={1460} y={660} w={288} counter="49" ovColor={C.red} ovTint={C.redDim} fs={44} o={ep(t, 6.2, 6.8)} />
    </Svg>
    <Figure y={650} value={`${HELD} frames`} caption={`counter 49 on ${SHOWN49} frames`} size={120} color={C.red} o={ep(t, 5.8, 6.6)} />
  </>
);

/* ---------- 5. Ending everything ---------- */
const EndAll: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Two ways to stop at the overlay" title="The freeze goes. So does the base." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Svg>
      <RowLabel y={290} text="base" sub="125 frames" o={ep(t, 0.9, 1.4)} />
      <Bar from={0} to={BASE_FRAMES} y={290} kind="base" text="5 s, 125 frames" p={ep(t, 1.0, 1.8)} />
      <RowLabel y={380} text="eof_action=endall" sub="output" color={C.amber} o={ep(t, 2.4, 2.9)} />
      <Bar from={0} to={OV_FRAMES} y={380} kind="play" text="2 s, 50 frames" p={ep(t, 2.5, 3.3)} />
      <Bar from={OV_FRAMES} to={BASE_FRAMES} y={380} kind="cut" text={`${HELD} base frames cut`} p={ep(t, 3.4, 4.2)} />
      <RowLabel y={470} text="shortest=1" sub="output" color={C.amber} o={ep(t, 4.6, 5.1)} />
      <Bar from={0} to={OV_FRAMES} y={470} kind="play" text="2 s, 50 frames" p={ep(t, 4.7, 5.5)} />
      <Bar from={OV_FRAMES} to={BASE_FRAMES} y={470} kind="cut" text={`${HELD} base frames cut`} p={ep(t, 5.6, 6.4)} />
      <Axis y={575} o={ep(t, 1.0, 1.6)} />
      <Clock cx={330} cy={760} r={90} sec={2} color={C.amber} o={ep(t, 6.6, 7.2)} />
    </Svg>
    <Figure y={650} value="50 frames" caption={`2 s · the base loses ${HELD} frames, 3 s`} size={120} color={C.amber} o={ep(t, 6.4, 7.2)} />
  </>
);

/* ---------- 6. Keeping the base ---------- */
const Pass: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Overlay gone, base kept" title="Three commands, same frames." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Svg>
      {[['eof_action=pass', 1.0], ['repeatlast=0', 2.0], ["enable='lt(t,2)'", 3.0]].map(([l, a], i) => (
        <g key={l as string}>
          <RowLabel y={280 + i * 70} h={54} text={l as string} color={C.green} o={ep(t, a as number, (a as number) + 0.5)} />
          <Bar from={0} to={OV_FRAMES} y={280 + i * 70} kind="play" text={i === 0 ? 'counter 0 to 49' : undefined} p={ep(t, (a as number) + 0.1, (a as number) + 0.8)} />
          <Bar from={OV_FRAMES} to={BASE_FRAMES} y={280 + i * 70} kind="base" text={i === 0 ? `base only, ${HELD} frames` : undefined} p={ep(t, (a as number) + 0.6, (a as number) + 1.2)} />
        </g>
      ))}
      <RowLabel y={520} text="delay 1 s, default" sub="setpts=PTS+1/TB" color={C.red} o={ep(t, 4.8, 5.3)} />
      <Bar from={0} to={DELAY} y={520} kind="base" p={ep(t, 4.9, 5.4)} />
      <Bar from={DELAY} to={DELAY + OV_FRAMES} y={520} kind="play" p={ep(t, 5.2, 5.8)} />
      <Bar from={DELAY + OV_FRAMES} to={BASE_FRAMES} y={520} kind="hold" text={`held ${DELAY_HELD}`} p={ep(t, 5.6, 6.3)} />
      <RowLabel y={600} text="delay 1 s, pass" sub="setpts=PTS+1/TB" color={C.green} o={ep(t, 6.6, 7.1)} />
      <Bar from={0} to={DELAY} y={600} kind="base" p={ep(t, 6.7, 7.2)} />
      <Bar from={DELAY} to={DELAY + OV_FRAMES} y={600} kind="play" p={ep(t, 7.0, 7.6)} />
      <Bar from={DELAY + OV_FRAMES} to={BASE_FRAMES} y={600} kind="base" p={ep(t, 7.4, 8.0)} />
      <Axis y={675} o={ep(t, 1.0, 1.6)} />
      {[['play', 'overlay plays', C.green, C.greenDim], ['base', 'base only', C.cyan, C.cyanDim], ['hold', 'overlay frozen', C.red, 'url(#hatch)']].map(([k, l, s, f], i) => (
        <g key={k as string} opacity={ep(t, 8.2, 8.8)}>
          <rect x={BX + i * 330} y={760} width={50} height={32} fill={f as string} stroke={s as string} strokeWidth={4} />
          <Tx x={BX + i * 330 + 66} y={786} size={24} mono={false} weight={600}>{l as string}</Tx>
        </g>
      ))}
    </Svg>
    <Note x={96} y={820} w={1728} align="center" size={26} o={ep(t, 9.0, 9.6)}>The first three give identical frame hashes. A delayed overlay starts at output frame 25.</Note>
  </>
);

/* ---------- 7. Close ---------- */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="What to check" title="Count the frozen frames." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Svg>
      <Projector x={170} y={420} o={ep(t, 0.8, 1.4)} spin={t * 30} />
      <Clock cx={560} cy={560} r={60} sec={2} o={ep(t, 0.8, 1.4)} />
    </Svg>
    <Card x={800} y={290} w={1020} h={138} label="Default" value="eof_action=repeat" sub="the freeze: counter 49 on 76 frames" color={C.red} o={ep(t, 1.4, 2.0)} vs={44} />
    <Card x={800} y={448} w={1020} h={138} label="Overlay leaves" value="pass · repeatlast=0 · enable" sub="base plays on, 125 frames" color={C.green} o={ep(t, 2.4, 3.0)} vs={44} />
    <Card x={800} y={606} w={1020} h={138} label="Overlay ends all" value="endall · shortest=1" sub="50 frames, the base loses 75" color={C.amber} o={ep(t, 3.4, 4.0)} vs={44} />
    <Note x={96} y={776} w={1728} align="center" size={28} o={ep(t, 4.8, 5.4)}>Not tested: alpha, other overlay options, real footage, builds other than ffmpeg 6.1.1.</Note>
    <Note x={96} y={826} w={1728} align="center" size={28} color={C.mute} o={ep(t, 5.4, 6.0)}>FFmpeg Reality Checks · episode 63 · fixture and tests in the description</Note>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, story: Story, source: Source, hold: Hold, endall: EndAll, pass: Pass, close: Close};
