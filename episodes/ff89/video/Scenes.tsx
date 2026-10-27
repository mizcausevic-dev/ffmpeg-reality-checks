import React from 'react';
import {C, F, D, W, H} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Head} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff89/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
   Style: illustrated scenario. Flat vector objects only (reels, desk, crates, screens), no faces. Palette lab only.
   The card is drawn to the fixture's geometry: 8 columns of alpha 0, 36, 73, 109, 146, 182, 219, 255 and 4 rows of color
   (orange, indigo, lime, paper white; drawn with the nearest ink of the palette), over a checkerboard that stands for "nothing behind it". */

/* ---------- measured data ---------- */
const SRC = [0, 36, 73, 109, 146, 182, 219, 255];       // the alpha of the 8 columns, as written
const PRORES = [0, 36, 73, 110, 147, 183, 220, 255];    // ProRes 4444 decoded as rgba
const VPX = [0, 36, 73, 109, 147, 183, 220, 255];       // VP9 and VP8 through the libvpx decoder, and the pixel format conversion alone

type RowK = 'amber' | 'cyan' | 'green' | 'bg';
const ROWS: RowK[] = ['amber', 'cyan', 'green', 'bg'];

/* ---------- local drawing kit (square corners, flat fills, no gradients) ---------- */
const Svg: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <svg style={{position: 'absolute', left: 0, top: 0}} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
    <defs>
      <pattern id="chk" patternUnits="userSpaceOnUse" width="24" height="24">
        <rect width="24" height="24" fill={C.bg2} />
        <rect width="12" height="12" fill={C.panel} />
        <rect x="12" y="12" width="12" height="12" fill={C.panel} />
      </pattern>
      <marker id="chev" markerWidth="14" markerHeight="14" refX="11" refY="7" orient="auto" markerUnits="userSpaceOnUse"><path d="M1,1 L12,7 L1,13" fill="none" stroke={C.mute} strokeWidth="3" /></marker>
    </defs>
    {children}
  </svg>
);
const Tx: React.FC<{x: number; y: number; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; mono?: boolean; weight?: number; o?: number; children?: React.ReactNode}> = ({x, y, size = 26, color = C.text, anchor = 'start', mono = true, weight = 600, o = 1, children}) => (
  <text x={x} y={y} fontSize={size} fill={color} textAnchor={anchor} fontFamily={mono ? F.mono : F.sans} fontWeight={weight} opacity={o}>{children}</text>
);

/* a film reel (same drawing as the other illustrated films) */
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

/* the test card: 4 rows of color x 8 columns of alpha over a checkerboard. levels = the alpha of each column, null = every column opaque. */
const AlphaCard: React.FC<{x: number; y: number; w: number; h: number; levels: number[] | null; o?: number; stroke?: string; sw?: number; labels?: boolean; labelSize?: number}> = ({x, y, w, h, levels, o = 1, stroke = C.text, sw = 5, labels = false, labelSize = 22}) => {
  const cw = w / 8, rh = h / 4;
  return (
    <g opacity={o}>
      <rect x={x} y={y} width={w} height={h} fill="url(#chk)" />
      {ROWS.map((rk, r) => Array.from({length: 8}, (_, c) => (
        <rect key={`${r}-${c}`} x={x + c * cw} y={y + r * rh} width={cw} height={rh} fill={C[rk]} fillOpacity={levels ? levels[c] / 255 : 1} stroke={rk === 'bg' ? C.line : 'none'} strokeWidth={rk === 'bg' ? 1 : 0} strokeOpacity={levels ? levels[c] / 255 : 1} />
      )))}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={stroke} strokeWidth={sw} />
      {labels && SRC.map((a, c) => <Tx key={c} x={x + c * cw + cw / 2} y={y + h + labelSize + 12} size={labelSize} anchor="middle" color={C.dim} weight={600}>{a}</Tx>)}
    </g>
  );
};
/* one row of 8 cells, the first color row only, drawn in a given ink */
const Strip: React.FC<{x: number; y: number; cw?: number; ch?: number; levels: number[] | null; ink?: string; o?: number; nums?: boolean; numColor?: string}> = ({x, y, cw = 50, ch = 60, levels, ink = C.amber, o = 1, nums = false, numColor = C.dim}) => (
  <g opacity={o}>
    <rect x={x} y={y} width={cw * 8} height={ch} fill="url(#chk)" />
    {Array.from({length: 8}, (_, c) => <rect key={c} x={x + c * cw} y={y} width={cw} height={ch} fill={ink} fillOpacity={levels ? levels[c] / 255 : 1} />)}
    <rect x={x} y={y} width={cw * 8} height={ch} fill="none" stroke={C.text} strokeWidth={4} />
    {nums && Array.from({length: 8}, (_, c) => <Tx key={c} x={x + c * cw + cw / 2} y={y + ch + 24} size={19} anchor="middle" color={numColor} weight={600}>{levels ? levels[c] : 255}</Tx>)}
  </g>
);
const Crate: React.FC<{x: number; y: number; w: number; h: number; label: string; sub?: string; color?: string; o?: number}> = ({x, y, w, h, label, sub, color = C.text, o = 1}) => (
  <g opacity={o}>
    <rect x={x} y={y} width={w} height={h} fill={C.panel} stroke={color} strokeWidth={5} />
    <rect x={x} y={y} width={w} height={14} fill={color} />
    <Tx x={x + w / 2} y={y + h / 2 + (sub ? 2 : 10)} size={34} anchor="middle" weight={800} color={C.text}>{label}</Tx>
    {sub && <Tx x={x + w / 2} y={y + h / 2 + 34} size={22} anchor="middle" weight={500} color={C.dim}>{sub}</Tx>}
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

/* ---------- 1. The ask ---------- */
const CHIPS = ['PNG in mkv', 'FFV1 in mkv', 'QT Animation', 'ProRes 4444', 'ProRes default', 'ProRes HQ', 'VP9 in webm', 'VP9, lossy', 'VP9, yuv420p', 'VP9 in mp4', 'VP8 in webm', 'H.264 in mp4', 'H.264, yuva420p'];
const Ask: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  return (
    <>
      <Head over="A clip with a see through background" title="Does it stay see through?" o={ep(t, A(0.02), A(0.07))} />
      <Svg>
        <line x1={100} y1={790} x2={640} y2={790} stroke={C.text} strokeWidth={7} opacity={ep(t, A(0.08), A(0.14))} />
        <Reel cx={260} cy={640} r={130} color={C.cyan} tint={C.cyanDim} tape={1} spin={t * 30} o={ep(t, A(0.12), A(0.2))} />
        <Reel cx={520} cy={700} r={80} color={C.green} tint={C.greenDim} tape={0.7} spin={t * 45} o={ep(t, A(0.16), A(0.24))} />
        <Tx x={390} y={846} size={24} anchor="middle" weight={500} color={C.dim} o={ep(t, A(0.2), A(0.28))}>the clip</Tx>
        <line x1={660} y1={600} x2={760} y2={600} stroke={C.mute} strokeWidth={4} markerEnd="url(#chev)" opacity={ep(t, A(0.24), A(0.3))} />
        <AlphaCard x={780} y={400} w={440} h={330} levels={SRC} o={ep(t, A(0.26), A(0.34))} labels labelSize={20} />
        <Tx x={1000} y={806} size={24} anchor="middle" weight={500} color={C.dim} o={ep(t, A(0.3), A(0.38))}>8 alpha levels, 8 frames</Tx>
        <line x1={1240} y1={565} x2={1290} y2={565} stroke={C.mute} strokeWidth={4} markerEnd="url(#chev)" opacity={ep(t, A(0.36), A(0.42))} />
      </Svg>
      {CHIPS.map((c, i) => {
        const col = i % 2, row = Math.floor(i / 2), o = ep(t, A(0.42 + i * 0.03), A(0.48 + i * 0.03));
        return (
          <div key={c} style={{position: 'absolute', left: 1310 + col * 270, top: 340 + row * 62, width: 254, height: 50, boxSizing: 'border-box', border: `3px solid ${C.text}`, background: C.bg2, opacity: o, fontFamily: F.mono, fontSize: 21, fontWeight: 600, color: C.text, lineHeight: '44px', textAlign: 'center', whiteSpace: 'nowrap'}}>{c}</div>
        );
      })}
      <Note x={96} y={880} w={1728} align="center" size={26} o={ep(t, A(0.84), A(0.92))}>One 64 x 48 card, 13 encodes, two ways to read each back, on ffmpeg 6.1.1.</Note>
    </>
  );
};

/* ---------- 2. Four boxes ---------- */
const PW = 400, PH = 440, PY = 262, PG = 40, PX0 = (W - (4 * PW + 3 * PG)) / 2;
const CAPS = ['mp4: it comes out solid. The transparent column is orange, the color that was underneath.', 'webm: the file holds the alpha. The default decode returns it opaque.', 'ProRes 4444: see through, 8 levels back.', 'ProRes HQ: solid. The encoder warns and drops it.'];
const Story: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  const panel = (i: number) => {
    const x = PX0 + i * (PW + PG), o = ep(t, A(0.05 + i * 0.2), A(0.1 + i * 0.2));
    const title = ['mp4 · H.264', 'webm · VP9', 'mov · ProRes 4444', 'mov · ProRes HQ'][i];
    return (
      <g key={i} opacity={o} transform={`translate(${x} ${PY})`}>
        <rect width={PW} height={PH} fill={C.bg2} stroke={C.text} strokeWidth={5} />
        <rect width={56} height={56} fill={C.text} />
        <Tx x={28} y={40} size={34} color={C.bg} anchor="middle" weight={800}>{i + 1}</Tx>
        <Tx x={72} y={40} size={26} weight={800}>{title}</Tx>
        <Crate x={130} y={80} w={140} h={74} label={['mp4', 'webm', 'mov', 'mov'][i]} />
        <line x1={200} y1={160} x2={200} y2={196} stroke={C.mute} strokeWidth={4} markerEnd="url(#chev)" transform="rotate(0)" />
        {i === 1 ? (
          <g>
            <AlphaCard x={26} y={214} w={168} h={126} levels={null} sw={4} />
            <AlphaCard x={206} y={214} w={168} h={126} levels={VPX} sw={4} />
            <Tx x={110} y={372} size={20} anchor="middle" weight={600}>ffmpeg default</Tx>
            <Tx x={290} y={372} size={20} anchor="middle" weight={600}>libvpx-vp9</Tx>
            <Tx x={110} y={402} size={20} anchor="middle" weight={500} color={C.red}>1 level</Tx>
            <Tx x={290} y={402} size={20} anchor="middle" weight={500} color={C.green}>8 levels</Tx>
          </g>
        ) : (
          <g>
            <AlphaCard x={50} y={214} w={300} h={225 - 20} levels={i === 2 ? PRORES : null} />
          </g>
        )}
      </g>
    );
  };
  return (
    <>
      <Head over="The story, in four boxes" title="One card, four boxes." o={ep(t, A(0.02), A(0.06))} />
      <Svg>
        {[0, 1, 2, 3].map(panel)}
        {[0, 1, 2].map((i) => <line key={i} x1={PX0 + (i + 1) * PW + i * PG + 6} y1={PY + PH / 2} x2={PX0 + (i + 1) * PW + i * PG + PG - 6} y2={PY + PH / 2} stroke={C.mute} strokeWidth={4} markerEnd="url(#chev)" opacity={ep(t, A(0.1 + (i + 1) * 0.2), A(0.15 + (i + 1) * 0.2))} />)}
      </Svg>
      {CAPS.map((c, i) => <Note key={i} x={PX0 + i * (PW + PG)} y={PY + PH + 18} w={PW} size={25} color={C.text} o={ep(t, A(0.12 + i * 0.2), A(0.18 + i * 0.2))}>{c}</Note>)}
    </>
  );
};

/* ---------- 3. The card and the readers ---------- */
const Setup: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  return (
    <>
      <Head over="Synthetic card · 64 x 48 · 8 frames" title="The card, and who reads it." o={ep(t, A(0.02), A(0.07))} />
      <Svg>
        <AlphaCard x={110} y={300} w={640} h={420} levels={SRC} o={ep(t, A(0.08), A(0.16))} labels labelSize={24} />
        <Tx x={430} y={792} size={24} anchor="middle" weight={500} color={C.dim} o={ep(t, A(0.14), A(0.22))}>alpha of each column, 4 rows of color</Tx>
        <Tx x={430} y={830} size={24} anchor="middle" weight={500} color={C.dim} o={ep(t, A(0.14), A(0.22))}>the color under alpha 0 is the card color</Tx>
      </Svg>
      <Card x={860} y={290} w={960} h={136} label="Picture reader 1" value="raw rgba" sub="ffmpeg decodes, Node counts every alpha value" color={C.cyan} o={ep(t, A(0.24), A(0.32))} vs={44} />
      <Card x={860} y={434} w={960} h={136} label="Picture reader 2" value="PNG files, decoded in Node" sub="and alphaextract: the alpha plane in its own format" color={C.amber} o={ep(t, A(0.36), A(0.44))} vs={44} />
      <Card x={860} y={578} w={960} h={136} label="File reader" value="ffprobe, then bytes in Node" sub="pix_fmt and tags; WebM alpha blocks, ProRes alpha_info, PNG color type" color={C.green} o={ep(t, A(0.5), A(0.58))} vs={44} />
      <Card x={860} y={722} w={960} h={136} label="Control" value="PNG, FFV1, QuickTime: exact" sub="all 8 levels, every color, so the readers can see alpha" color={C.red} o={ep(t, A(0.66), A(0.74))} vs={44} />
      <Note x={96} y={886} w={1728} align="center" size={26} o={ep(t, A(0.82), A(0.9))}>The two picture readers agree on every decode.</Note>
    </>
  );
};

/* ---------- 4. What keeps it ---------- */
type KRow = {name: string; sub: string; lv: number[]; verdict: string; ev: string; k: 'green' | 'amber'};
const KEEP: KRow[] = [
  {name: 'PNG in mkv', sub: '-c:v png', lv: SRC, verdict: 'exact', ev: 'RGBA PNG pictures, type 6, in 8 of 8 packets', k: 'green'},
  {name: 'FFV1 in mkv', sub: '-c:v ffv1, pix_fmt bgra', lv: SRC, verdict: 'exact', ev: 'ffprobe pix_fmt bgra', k: 'green'},
  {name: 'QuickTime Animation', sub: '-c:v qtrle in mov, pix_fmt argb', lv: SRC, verdict: 'exact', ev: 'ffprobe pix_fmt argb', k: 'green'},
  {name: 'ProRes 4444', sub: '-profile:v 4444 -pix_fmt yuva444p10le', lv: PRORES, verdict: 'within 1', ev: 'alpha_info 2 and 4:4:4 in 8 of 8 frame headers', k: 'amber'},
  {name: 'ProRes, no profile', sub: 'prores_ks with an rgba input', lv: PRORES, verdict: 'within 1', ev: 'the same file size as 4444, alpha_info 2', k: 'amber'},
];
const Keep: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur, y0 = 300, rh = 108;
  return (
    <>
      <Head over="Alpha comes back" title="Five that keep it." color={C.green} o={ep(t, A(0.02), A(0.07))} />
      <Svg>
        {KEEP.map((r, i) => {
          const o = ep(t, A(0.1 + i * 0.12), A(0.17 + i * 0.12)), y = y0 + i * rh;
          return (
            <g key={r.name} opacity={o}>
              <Tx x={96} y={y + 26} size={28} weight={800}>{r.name}</Tx>
              <Tx x={96} y={y + 60} size={20} weight={500} color={C.dim} mono>{r.sub}</Tx>
              <Strip x={720} y={y} cw={52} ch={56} levels={r.lv} nums numColor={r.k === 'green' ? C.dim : C.amber} />
              <rect x={1180} y={y} width={190} height={56} fill={r.k === 'green' ? C.green : C.amber} />
              <Tx x={1275} y={y + 38} size={30} anchor="middle" weight={800} color={C.bg2}>{r.verdict}</Tx>
              <Tx x={1396} y={y + 38} size={22} weight={500} color={C.text} mono={false}>{r.ev.length > 40 ? r.ev.slice(0, r.ev.lastIndexOf(' ', 40)) : r.ev}</Tx>
              {r.ev.length > 40 && <Tx x={1396} y={y + 66} size={22} weight={500} color={C.text} mono={false}>{r.ev.slice(r.ev.lastIndexOf(' ', 40) + 1)}</Tx>}
            </g>
          );
        })}
      </Svg>
      <Note x={96} y={870} w={1728} align="center" size={26} o={ep(t, A(0.78), A(0.88))}>ProRes 110, 147, 183, 220 are one above the source. The pixel format conversion alone moves 147, 183, 220.</Note>
    </>
  );
};

/* ---------- 5. What loses it ---------- */
type LRow = {name: string; sub: string; ev: string};
const LOSE: LRow[] = [
  {name: 'H.264 in mp4', sub: '-c:v libx264 -crf 0', ev: 'pix_fmt yuv444p, no alpha plane'},
  {name: 'H.264, yuva420p asked', sub: '-pix_fmt yuva420p', ev: 'replaced by yuv420p, exit status 0'},
  {name: 'ProRes HQ', sub: '-profile:v 3', ev: 'alpha_info 0 in 8 of 8 headers, warning'},
  {name: 'VP9 in mp4', sub: 'even the libvpx-vp9 decoder', ev: 'no alpha_mode, exit status 0'},
  {name: 'VP9, yuv420p asked', sub: '-pix_fmt yuv420p in webm', ev: '0 alpha blocks in the file'},
];
const Lose: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur, y0 = 290, rh = 92;
  return (
    <>
      <Head over="Alpha does not come back" title="Five that lose it." color={C.red} o={ep(t, A(0.02), A(0.07))} />
      <Svg>
        {LOSE.map((r, i) => {
          const o = ep(t, A(0.1 + i * 0.11), A(0.16 + i * 0.11)), y = y0 + i * rh;
          return (
            <g key={r.name} opacity={o}>
              <Tx x={96} y={y + 24} size={26} weight={800}>{r.name}</Tx>
              <Tx x={96} y={y + 54} size={20} weight={500} color={C.dim}>{r.sub}</Tx>
              <Strip x={640} y={y} cw={44} ch={54} levels={null} />
              <Tx x={1022} y={y + 38} size={34} weight={800} color={C.red}>1 level</Tx>
              <Tx x={1190} y={y + 36} size={24} weight={500} color={C.text} mono={false}>{r.ev}</Tx>
            </g>
          );
        })}
        <g opacity={ep(t, A(0.72), A(0.8))}>
          <rect x={96} y={790} width={90} height={60} fill={C.amber} stroke={C.text} strokeWidth={4} />
          <Tx x={204} y={816} size={24} weight={800}>229, 139, 90</Tx>
          <Tx x={204} y={844} size={20} weight={500} color={C.dim} mono={false}>what the transparent orange becomes</Tx>
          <rect x={900} y={790} width={90} height={60} fill={C.mute} stroke={C.text} strokeWidth={4} />
          <Tx x={1008} y={816} size={24} weight={800}>128, 128, 128</Tx>
          <Tx x={1008} y={844} size={20} weight={500} color={C.dim} mono={false}>what a player should show behind it</Tx>
        </g>
      </Svg>
    </>
  );
};

/* ---------- 6. The one that hides it ---------- */
const Webm: React.FC<SceneProps> = ({t, dur}) => {
  const A = (f: number) => f * dur;
  return (
    <>
      <Head over="VP9 in webm" title="Stored, then thrown away." color={C.red} o={ep(t, A(0.02), A(0.07))} />
      <Svg>
        {/* the file: 8 frames, each a Block and a BlockAdditional */}
        <Tx x={96} y={310} size={22} weight={700} color={C.dim} o={ep(t, A(0.06), A(0.12))}>IN THE FILE</Tx>
        {Array.from({length: 8}, (_, i) => {
          const o = ep(t, A(0.1 + i * 0.03), A(0.15 + i * 0.03));
          return (
            <g key={i} opacity={o}>
              <rect x={96 + i * 72} y={330} width={62} height={70} fill={C.cyanDim} stroke={C.cyan} strokeWidth={3} />
              <rect x={96 + i * 72} y={410} width={62} height={34} fill={C.amberDim} stroke={C.amber} strokeWidth={3} />
            </g>
          );
        })}
        <Tx x={96} y={482} size={22} weight={600} color={C.cyan} o={ep(t, A(0.3), A(0.36))}>8 Blocks: the picture</Tx>
        <Tx x={96} y={514} size={22} weight={600} color={C.amber} o={ep(t, A(0.3), A(0.36))}>8 BlockAdditional: the alpha, 179 bytes</Tx>
        {/* decoders */}
        <Tx x={820} y={310} size={22} weight={700} color={C.dim} o={ep(t, A(0.36), A(0.42))}>DECODED, ALPHA PER COLUMN</Tx>
        <g opacity={ep(t, A(0.4), A(0.48))}>
          <Strip x={820} y={340} cw={48} ch={56} levels={null} nums />
          <Tx x={1260} y={372} size={30} weight={800} color={C.red}>1 level</Tx>
          <Tx x={1260} y={404} size={22} weight={500} mono={false}>ffmpeg native VP9 decoder</Tx>
        </g>
        <g opacity={ep(t, A(0.52), A(0.6))}>
          <Strip x={820} y={450} cw={48} ch={56} levels={VPX} nums numColor={C.green} />
          <Tx x={1260} y={482} size={30} weight={800} color={C.green}>8 levels</Tx>
          <Tx x={1260} y={514} size={22} weight={500} mono={false}>libvpx-vp9 decoder, within 1</Tx>
        </g>
      </Svg>
      <Card x={96} y={560} w={640} h={140} label="ffprobe says" value="pix_fmt yuv420p" sub="and, in the tags, alpha_mode 1" color={C.amber} o={ep(t, A(0.62), A(0.7))} vs={44} />
      <Card x={820} y={600} w={500} h={140} label="Asked yuv420p" value="0 alpha blocks" sub="-pix_fmt yuv420p removes them" color={C.red} o={ep(t, A(0.7), A(0.78))} vs={40} />
      <Card x={1340} y={600} w={480} h={140} label="VP8 in webm" value="same, 8 of 8" sub="auto-alt-ref on: an error, no file" color={C.amber} o={ep(t, A(0.78), A(0.86))} vs={40} />
      <Note x={96} y={730} w={640} size={24} o={ep(t, A(0.86), A(0.94))}>A tool that trusts pix_fmt calls this clip opaque.</Note>
    </>
  );
};

/* ---------- 7. Close ---------- (the scene runs past the narration into the end card: times here are seconds) */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="What to do" title="Check the alpha, not the label." color={C.cyan} o={ep(t, 0.2, 0.8)} />
    <Svg>
      <AlphaCard x={130} y={360} w={420} h={300} levels={VPX} o={ep(t, 0.6, 1.4)} />
      <Tx x={340} y={714} size={22} anchor="middle" weight={500} color={C.dim} o={ep(t, 1.4, 2.2)}>no codec at all, only the pixel format</Tx>
      <Tx x={340} y={744} size={22} anchor="middle" weight={500} color={C.dim} o={ep(t, 1.4, 2.2)}>conversion: 146, 182, 219 come back +1</Tx>
    </Svg>
    <Card x={660} y={290} w={1160} h={134} label="Into an opaque format" value="overlay on a color first" sub="then H.264: within 1 of the exact composite" color={C.cyan} o={ep(t, 5.4, 6.2)} vs={44} />
    <Card x={660} y={444} w={1160} h={134} label="Keep alpha" value="PNG · FFV1 · ProRes 4444" sub="QuickTime Animation too; 8 levels back" color={C.green} o={ep(t, 8.4, 9.2)} vs={44} />
    <Card x={660} y={598} w={1160} h={134} label="For the web" value="VP9 in webm, libvpx-vp9 to read" sub="never -pix_fmt yuv420p; 4:2:0 moves colors up to 14 levels" color={C.amber} o={ep(t, 11.0, 11.8)} vs={44} />
    <Note x={96} y={790} w={1728} align="center" size={28} o={ep(t, 13.6, 14.4)}>Not tested: other builds, real footage, browsers, editors.</Note>
    <Note x={96} y={840} w={1728} align="center" size={28} color={C.mute} o={ep(t, 14.4, 15.2)}>FFmpeg Reality Checks · episode 89 · fixture and tests in the description</Note>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, story: Story, setup: Setup, keep: Keep, lose: Lose, webm: Webm, close: Close};
