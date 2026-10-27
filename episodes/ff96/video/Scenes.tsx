import React from 'react';
import {C, F} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Mid} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff96/fixture/experiment.mjs (evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
   Production style: illustrated scenario. Flat vector story panels with objects only (reel to reel deck, speaker and knob, dials, a fader, a switch),
   no faces, no gradients; a short storyboard first, then the measured proof drawn on the same objects. Local components only; palette lab through C.* keys. */

type Row = {I: number; LRA: number; pk: number; eI: number; eLRA: number; tp: number; sec: number[]; rate: number | null; samples: number | null};
type Prog = {n: number; pass1: {input_i: string; input_lra: string}; pass1f: {input_i: string; input_lra: string}; types: string[]; rows: Record<string, Row>};
const DATA = {"sec":[-38,-20,-32,-14,-40,-18,-26,-12],"p":{"short":{"n":1689600,"pass1":{"input_i":"-16.46","input_lra":"14.90"},"types":["linear","dynamic"],"pass1f":{"input_i":"-16.46","input_lra":"14.90"},"rows":{"input":{"I":-17.0,"LRA":19.49,"pk":-0.85,"eI":-17,"eLRA":19.5,"tp":-0.8,"sec":[-39.0,-21.0,-33.0,-15.0,-41.0,-19.0,-27.0,-13.0],"rate":null,"samples":null},"ln":{"I":-23.09,"LRA":9.69,"pk":-5.79,"eI":-23.1,"eLRA":9.7,"tp":-5.8,"sec":[-24.3,-23.1,-29.4,-20.5,-44.4,-24.8,-28.8,-19.5],"rate":192000,"samples":6758400},"ln16":{"I":-15.96,"LRA":9.37,"pk":-1.5,"eI":-16,"eLRA":9.4,"tp":-1.5,"sec":[-16.3,-15.3,-23.1,-13.4,-38.0,-17.2,-22.5,-13.0],"rate":192000,"samples":6758400},"ln2":{"I":-24.54,"LRA":19.49,"pk":-8.39,"eI":-24.5,"eLRA":19.5,"tp":-8.4,"sec":[-46.6,-28.6,-40.6,-22.6,-48.6,-26.6,-34.6,-20.6],"rate":48000,"samples":1689600},"ln2f":{"I":-15.74,"LRA":16.66,"pk":-1.5,"eI":-15.7,"eLRA":16.7,"tp":-1.5,"sec":[-38.6,-19.3,-29.7,-12.9,-38.1,-17.2,-22.5,-13.0],"rate":192000,"samples":6758400},"dyn":{"I":-15.93,"LRA":14.56,"pk":-0.49,"eI":-15.9,"eLRA":14.6,"tp":-0.5,"sec":[-39.0,-20.2,-31.0,-12.7,-38.8,-17.8,-26.8,-13.0],"rate":48000,"samples":1689600},"dynt":{"I":-14.19,"LRA":6.65,"pk":-0.47,"eI":-14.2,"eLRA":6.7,"tp":-0.5,"sec":[-19.7,-12.8,-14.9,-12.7,-21.1,-12.7,-13.3,-12.7],"rate":48000,"samples":1689600}}},"long":{"n":6297600,"pass1":{"input_i":"-16.78","input_lra":"20.00"},"types":["linear","dynamic"],"pass1f":{"input_i":"-16.78","input_lra":"20.00"},"rows":{"input":{"I":-16.92,"LRA":20.02,"pk":-0.92,"eI":-16.9,"eLRA":20,"tp":-0.9,"sec":[-39.0,-21.0,-33.0,-15.0,-41.0,-19.0,-27.0,-13.0],"rate":null,"samples":null},"ln":{"I":-23.09,"LRA":16.94,"pk":-3.42,"eI":-23.1,"eLRA":22.5,"tp":-3.4,"sec":[-24.0,-22.2,-27.9,-20.5,-43.2,-25.3,-27.8,-20.2],"rate":null,"samples":null},"ln16":{"I":-15.78,"LRA":8.62,"pk":-1.5,"eI":-15.8,"eLRA":8.6,"tp":-1.5,"sec":[-16.0,-15.0,-21.9,-13.2,-37.1,-17.5,-21.7,-12.9],"rate":null,"samples":null},"ln2":{"I":-24.14,"LRA":20.02,"pk":-8.14,"eI":-24.1,"eLRA":20,"tp":-8.1,"sec":[-46.3,-28.3,-40.3,-22.3,-48.3,-26.3,-34.3,-20.3],"rate":null,"samples":null},"ln2f":{"I":-16.1,"LRA":24.15,"pk":-1.5,"eI":-16.1,"eLRA":24.2,"tp":-1.5,"sec":[-38.4,-16.7,-22.1,-13.3,-37.3,-17.7,-21.9,-13.0],"rate":null,"samples":null},"dyn":{"I":-13.95,"LRA":17.9,"pk":-0.47,"eI":-14,"eLRA":17.9,"tp":-0.5,"sec":[-31.3,-12.7,-24.6,-12.6,-32.8,-12.7,-21.2,-12.8],"rate":null,"samples":null},"dynt":{"I":-14.08,"LRA":8.39,"pk":-0.47,"eI":-14.1,"eLRA":8.4,"tp":-0.5,"sec":[-19.3,-12.7,-14.8,-12.6,-21.1,-12.7,-13.2,-12.6],"rate":null,"samples":null}}}},"ctl":{"node":[-9.024197077836336,-15.044796991115957],"ebur":[-9,-15]}} as unknown as {sec: number[]; p: {short: Prog; long: Prog}; ctl: {node: number[]; ebur: number[]}};
const S = DATA.p.short, L = DATA.p.long;
const spread = (r: Row) => Math.max(...r.sec) - Math.min(...r.sec);
const n1 = (v: number) => v.toFixed(1);

/* ---------- flat drawing helpers ---------- */
type TxProps = {x: number; y: number; s?: number; c?: string; w?: number; a?: 'start' | 'middle' | 'end'; f?: 'sans' | 'mono' | 'display'; ls?: number; o?: number; children: React.ReactNode};
const Tx: React.FC<TxProps> = ({x, y, s = 24, c = C.text, w = 400, a = 'start', f = 'sans', ls = 0, o = 1, children}) => (
  <text x={x} y={y} fontSize={s} fill={c} fontWeight={w} textAnchor={a} fontFamily={F[f]} letterSpacing={ls} opacity={o}>{children}</text>
);
const Layer: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', left: 0, top: 0}}>{children}</svg>
);
/* heading: a small mono kicker and the title, with a thick madder rule */
const Head2: React.FC<{kick: string; title: string; o?: number}> = ({kick, title, o = 1}) => (
  <Layer>
    <g opacity={o}>
      <Tx x={130} y={150} s={22} f="mono" w={700} ls={2} c={C.red}>{kick}</Tx>
      <Tx x={130} y={226} s={82} f="display" w={800} c={C.text}>{title}</Tx>
      <rect x={130} y={246} width={300} height={8} fill={C.red} />
    </g>
  </Layer>
);
/* a story panel: ink frame, flat fill, number tab */
const Frame: React.FC<{x: number; y: number; w: number; h: number; n?: number; title?: string; fill?: string; o?: number; children?: React.ReactNode}> = ({x, y, w, h, n, title, fill = C.bg2, o = 1, children}) => (
  <g opacity={o}>
    <rect x={x} y={y} width={w} height={h} fill={fill} stroke={C.text} strokeWidth={5} />
    {n !== undefined && <g><rect x={x} y={y} width={64} height={52} fill={C.text} /><Tx x={x + 32} y={y + 40} s={40} f="display" w={800} a="middle" c={C.bg}>{n}</Tx></g>}
    {title && <Tx x={x + (n !== undefined ? 84 : 24)} y={y + 38} s={27} f="mono" w={700} c={C.text}>{title}</Tx>}
    {children}
  </g>
);
const Reel: React.FC<{cx: number; cy: number; r: number; rot: number; tape?: number; color?: string}> = ({cx, cy, r, rot, tape = 0.8, color = C.amber}) => (
  <g>
    <circle cx={cx} cy={cy} r={r * tape} fill={color} stroke={C.text} strokeWidth={4} />
    <circle cx={cx} cy={cy} r={r * 0.62} fill={C.bg2} stroke={C.text} strokeWidth={4} />
    {[0, 120, 240].map((a) => <path key={a} d={`M ${cx} ${cy} L ${cx + r * 0.55 * Math.cos(((a + rot) * Math.PI) / 180)} ${cy + r * 0.55 * Math.sin(((a + rot) * Math.PI) / 180)}`} stroke={C.text} strokeWidth={r * 0.2} strokeLinecap="butt" />)}
    <circle cx={cx} cy={cy} r={r * 0.14} fill={C.text} />
  </g>
);
const polar = (cx: number, cy: number, r: number, deg: number) => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)] as const;
/* a half dial: v0 at the left end, v1 at the right end; needles, a target flag and tick labels */
const Dial: React.FC<{cx: number; cy: number; r: number; v0: number; v1: number; step?: number; labels: number[]; needles: {v: number; color: string; o?: number}[]; flag?: number; flagLabel?: string}> = ({cx, cy, r, v0, v1, step = 2, labels, needles, flag, flagLabel}) => {
  const ang = (v: number) => 180 - ((v - v0) / (v1 - v0)) * 180;
  const [ax, ay] = polar(cx, cy, r, 180), [bx, by] = polar(cx, cy, r, 0);
  const ticks: number[] = []; for (let v = v0; v <= v1 + 1e-9; v += step) ticks.push(v);
  return (
    <g>
      <path d={`M ${ax} ${ay} A ${r} ${r} 0 0 1 ${bx} ${by} Z`} fill={C.panel} stroke={C.text} strokeWidth={5} />
      {ticks.map((v) => { const [x1, y1] = polar(cx, cy, r, ang(v)), [x2, y2] = polar(cx, cy, r - (labels.includes(v) ? 26 : 14), ang(v)); return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.text} strokeWidth={labels.includes(v) ? 4 : 2} />; })}
      {labels.map((v) => { const a = ang(v); const end = Math.abs(a - 90) > 80; const [x, y] = end ? [cx + Math.sign(Math.cos((a * Math.PI) / 180)) * (r - 24), cy + 36] : polar(cx, cy, r + 34, a); return <Tx key={v} x={x} y={end ? y : y + 8} s={22} f="mono" w={700} a="middle" c={C.text}>{v}</Tx>; })}
      {flag !== undefined && (() => { const [x, y] = polar(cx, cy, r + 14, ang(flag)), [x1, y1] = polar(cx, cy, r - 4, ang(flag - 0.6)), [x2, y2] = polar(cx, cy, r - 4, ang(flag + 0.6)); return <g><polygon points={`${x},${y} ${x1},${y1} ${x2},${y2}`} fill={C.green} stroke={C.text} strokeWidth={2} />{flagLabel && (() => { const [lx, ly] = polar(cx, cy, r + 44, ang(flag)); return <Tx x={lx} y={ly - 4} s={21} f="mono" w={700} a="middle" c={C.green}>{flagLabel}</Tx>; })()}</g>; })()}
      {needles.map((nd, i) => { const [x, y] = polar(cx, cy, r - 36, ang(nd.v)); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={nd.color} strokeWidth={7} strokeLinecap="round" opacity={nd.o ?? 1} />; })}
      <circle cx={cx} cy={cy} r={16} fill={C.text} />
    </g>
  );
};
const secColor = (v: number) => (v < -32 ? C.cyan : v > -22 ? C.red : C.amber);
/* eight section bars, height from the measured loudness (-50 to -10) */
const Bars: React.FC<{x: number; y: number; vals: readonly number[]; w?: number; gap?: number; h?: number; n?: number; color?: (v: number) => string}> = ({x, y, vals, w = 62, gap = 14, h = 200, n, color = secColor}) => (
  <g>
    {vals.map((v, i) => i < (n ?? vals.length) ? <rect key={i} x={x + i * (w + gap)} y={y - ((v + 50) / 40) * h} width={w} height={((v + 50) / 40) * h} fill={color(v)} stroke={C.text} strokeWidth={3} /> : null)}
    <line x1={x - 10} y1={y} x2={x + vals.length * (w + gap) - gap + 10} y2={y} stroke={C.text} strokeWidth={4} />
  </g>
);

/* ---------- 1. the question: panels 1 and 2 ---------- */
const Ask: React.FC<SceneProps> = ({t}) => {
  const rot = t * 55, nb = Math.round(8 * ep(t, 2.4, 7.0));
  const knob = -55 + 125 * (0.5 - 0.5 * Math.cos(Math.max(0, t - 4) * 1.1));
  const wave = 0.5 - 0.5 * Math.cos(Math.max(0, t - 4) * 1.1);
  const inp = S.rows.input.sec;
  const kp = polar(1620, 540, 78, 90 - knob);
  return (
    <>
      <Head2 kick="A STORY IN FOUR PANELS" title="A hand on the knob." o={ep(t, 0.2, 0.9)} />
      <Layer>
        <Frame x={130} y={290} w={830} h={540} n={1} title="the tape" o={ep(t, 0.8, 1.6)}>
          <Reel cx={290} cy={640} r={96} rot={rot} tape={0.86} />
          <Reel cx={780} cy={640} r={96} rot={rot} tape={0.55} />
          <path d={`M 290 544 L 340 470 L 730 470 L 780 544`} fill="none" stroke={C.text} strokeWidth={5} />
          <Bars x={236} y={456} vals={inp} n={nb} h={130} w={58} gap={14} />
          <Tx x={236} y={806} s={22} f="mono" w={700} c={C.cyan} o={ep(t, 7.0, 7.8)}>quiet interview</Tx>
          <Tx x={866} y={806} s={22} f="mono" w={700} a="end" c={C.red} o={ep(t, 7.0, 7.8)}>loud intro</Tx>
          <rect x={150} y={746} width={790} height={10} fill={C.text} />
        </Frame>
        <Frame x={990} y={290} w={800} h={540} n={2} title="the knob" o={ep(t, 3.4, 4.2)}>
          <rect x={1050} y={380} width={330} height={370} fill={C.panel} stroke={C.text} strokeWidth={5} />
          <circle cx={1215} cy={600} r={118} fill={C.bg2} stroke={C.text} strokeWidth={5} />
          <circle cx={1215} cy={600} r={64 + 18 * wave} fill={C.text} />
          <circle cx={1215} cy={450} r={30} fill={C.bg2} stroke={C.text} strokeWidth={5} />
          {[0, 1, 2].map((k) => <path key={k} d={`M ${1400 + k * 34} ${560 - (14 + 22 * wave) * (1 + k * 0.5)} A ${30 + k * 20} ${(14 + 22 * wave) * (1 + k * 0.5) * 2} 0 0 1 ${1400 + k * 34} ${640 + (14 + 22 * wave) * (1 + k * 0.5)}`} fill="none" stroke={C.red} strokeWidth={5} opacity={0.35 + 0.65 * wave} />)}
          <circle cx={1620} cy={540} r={96} fill={C.bg2} stroke={C.text} strokeWidth={6} />
          {Array.from({length: 9}, (_, k) => { const a = 90 - (-65 + 16 * k); const [x1, y1] = polar(1620, 540, 110, a), [x2, y2] = polar(1620, 540, 124, a); return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.text} strokeWidth={4} />; })}
          <line x1={1620} y1={540} x2={kp[0]} y2={kp[1]} stroke={C.red} strokeWidth={10} strokeLinecap="round" />
          <circle cx={1620} cy={540} r={14} fill={C.text} />
          <Tx x={1620} y={716} s={25} f="mono" w={700} a="middle" c={C.text}>up, down, up</Tx>
        </Frame>
        <g opacity={ep(t, 9.4, 10.4)}>
          <rect x={130} y={856} width={1660} height={64} fill={C.text} />
          <Tx x={960} y={902} s={44} f="display" w={800} a="middle" c={C.bg}>which filter hits a target, and which evens out quiet and loud?</Tx>
        </g>
      </Layer>
    </>
  );
};

/* ---------- 2. two meters: panels 3 and 4 ---------- */
const Method: React.FC<SceneProps> = ({t}) => {
  const a = S.rows.input.sec, ro = ep(t, 3.0, 7.0), c = DATA.ctl;
  return (
    <>
      <Head2 kick="PANELS 3 AND 4" title="Two meters, one program." o={ep(t, 0.2, 0.9)} />
      <Layer>
        <Frame x={130} y={290} w={880} h={520} n={3} title="the program, eight sections" o={ep(t, 0.8, 1.6)}>
          <Tx x={170} y={380} s={23} f="mono" w={700} c={C.text}>short: 4 s each</Tx>
          <Bars x={170} y={560} vals={a} n={Math.round(8 * ro)} h={150} w={74} gap={12} />
          <Tx x={170} y={620} s={23} f="mono" w={700} c={C.text} o={ep(t, 6.0, 6.8)}>long: 16 s each (same levels, same order)</Tx>
          <rect x={170} y={650} width={a.length * 86 - 12} height={44} fill={C.panel} stroke={C.text} strokeWidth={3} opacity={ep(t, 6.0, 6.8)} />
          {a.map((v, i) => <rect key={i} x={170 + i * 86} y={650} width={74} height={44} fill={secColor(v)} stroke={C.text} strokeWidth={3} opacity={ep(t, 6.0 + i * 0.1, 6.8 + i * 0.1)} />)}
          <Tx x={170} y={744} s={22} f="mono" c={C.dim} o={ep(t, 8.0, 8.8)}>-38 -20 -32 -14 -40 -18 -26 -12 dB RMS</Tx>
          <Tx x={170} y={778} s={22} f="mono" c={C.dim} o={ep(t, 8.0, 8.8)}>0.4 s of silence between sections</Tx>
        </Frame>
        <Frame x={1040} y={290} w={750} h={520} n={4} title="two meters, a sine as control" o={ep(t, 9.6, 10.4)}>
          <Dial cx={1230} cy={620} r={140} v0={-20} v1={0} step={2} labels={[-20, -10, 0]} needles={[{v: c.ebur[0], color: C.cyan}]} />
          <Dial cx={1600} cy={620} r={140} v0={-20} v1={0} step={2} labels={[-20, -10, 0]} needles={[{v: c.node[0], color: C.red}]} />
          <Tx x={1230} y={672} s={24} f="mono" w={700} a="middle" c={C.cyan}>ebur128</Tx>
          <Tx x={1600} y={672} s={24} f="mono" w={700} a="middle" c={C.red}>Node meter</Tx>
          <Tx x={1230} y={716} s={24} f="mono" a="middle" c={C.text}>{n1(c.ebur[0])}</Tx>
          <Tx x={1600} y={716} s={24} f="mono" a="middle" c={C.text}>{c.node[0].toFixed(2)}</Tx>
          <Tx x={1415} y={772} s={21} f="mono" a="middle" c={C.dim} o={ep(t, 13.0, 13.8)}>{`6 dB lower: ${n1(c.ebur[1])} and ${c.node[1].toFixed(2)}`}</Tx>
        </Frame>
      </Layer>
    </>
  );
};

/* ---------- 3. the target ---------- */
const Target: React.FC<SceneProps> = ({t}) => {
  const cards: {x: number; title: string; sub: string; id: string; flag?: number; flagLabel?: string; at: number}[] = [
    {x: 130, title: 'loudnorm', sub: 'defaults, one pass', id: 'ln', flag: -24, flagLabel: 'target -24', at: 1.0},
    {x: 710, title: 'loudnorm to -16', sub: 'one pass', id: 'ln16', flag: -16, flagLabel: 'target -16', at: 6.6},
    {x: 1290, title: 'dynaudnorm', sub: 'defaults, no target', id: 'dyn', at: 11.4},
  ];
  return (
    <>
      <Head2 kick="THE TARGET" title="Where does it land?" o={ep(t, 0.2, 0.9)} />
      <Layer>
        {cards.map((c) => {
          const o = ep(t, c.at, c.at + 0.8), nd = ep(t, c.at + 0.8, c.at + 2.6);
          const vs = S.rows[c.id].I, vl = L.rows[c.id].I;
          return (
            <g key={c.id}>
              <Frame x={c.x} y={300} w={500} h={520} title={c.title} o={o}>
                <Tx x={c.x + 24} y={76 + 300} s={21} f="mono" c={C.dim}>{c.sub}</Tx>
                <Dial cx={c.x + 250} cy={640} r={200} v0={-30} v1={-10} step={2} labels={[-30, -20, -10]} flag={c.flag} flagLabel={c.flagLabel} needles={[{v: -30 + (vs + 30) * nd, color: C.cyan}, {v: -30 + (vl + 30) * nd, color: C.red}]} />
                <Tx x={c.x + 250} y={716} s={30} f="mono" w={700} a="middle" c={C.text} o={nd > 0.95 ? 1 : 0}>{`${n1(vs)}  ${n1(vl)}`}</Tx>
                <Tx x={c.x + 250} y={774} s={21} f="mono" a="middle" c={C.dim} o={nd > 0.95 ? 1 : 0}>LUFS, both programs</Tx>
              </Frame>
            </g>
          );
        })}
        <g opacity={ep(t, 16.0, 16.8)}>
          <rect x={130} y={836} width={14} height={14} fill={C.cyan} /><Tx x={156} y={850} s={21} f="mono" c={C.text}>sections of 4 s</Tx>
          <rect x={400} y={836} width={14} height={14} fill={C.red} /><Tx x={426} y={850} s={21} f="mono" c={C.text}>sections of 16 s</Tx>
        </g>
      </Layer>
    </>
  );
};

/* ---------- 4. the gap ---------- */
const Gap: React.FC<SceneProps> = ({t}) => {
  const X0 = 210, X1 = 1180, Y0 = 330, Y1 = 780; // x for sections 0..7, y for -10 (top) to -50 (bottom)
  const fx = (k: number) => X0 + (k / 7) * (X1 - X0), fy = (v: number) => Y0 + ((-10 - v) / 40) * (Y1 - Y0);
  const lines: {id: string; name: string; color: string; at: number; dash?: string}[] = [
    {id: 'input', name: 'input', color: C.text, at: 1.6, dash: '10 8'},
    {id: 'ln', name: 'loudnorm', color: C.cyan, at: 5.2},
    {id: 'dyn', name: 'dynaudnorm defaults', color: C.amber, at: 11.0},
    {id: 'dynt', name: 'dynaudnorm f=150:g=5', color: C.green, at: 14.4},
  ];
  return (
    <>
      <Head2 kick="THE GAP" title="Quiet stays quiet." o={ep(t, 0.2, 0.9)} />
      <Layer>
        <Frame x={130} y={280} w={1110} h={560} n={5} title="loudness of each section, dB" o={ep(t, 0.6, 1.4)}>
          {[-20, -30, -40, -50].map((v) => <g key={v}><line x1={X0 - 14} y1={fy(v)} x2={X1 + 14} y2={fy(v)} stroke={C.line} strokeWidth={2} strokeDasharray="6 8" /><Tx x={X0 - 24} y={fy(v) + 7} s={20} f="mono" a="end" c={C.dim}>{v}</Tx></g>)}
          {DATA.sec.map((_, k) => <Tx key={k} x={fx(k)} y={Y1 + 40} s={20} f="mono" a="middle" c={C.dim}>{k + 1}</Tx>)}
          {lines.map((l) => {
            const p = ep(t, l.at, l.at + 2.4), r = S.rows[l.id], pts = r.sec.map((v, k) => `${fx(k)},${fy(v)}`);
            const upto = Math.floor(p * 7), frac = p * 7 - upto;
            const shown = pts.slice(0, upto + 1).join(' ') + (upto < 7 ? ` ${fx(upto) + (fx(upto + 1) - fx(upto)) * frac},${fy(r.sec[upto]) + (fy(r.sec[upto + 1]) - fy(r.sec[upto])) * frac}` : '');
            return (
              <g key={l.id}>
                <polyline points={shown} fill="none" stroke={l.color} strokeWidth={l.id === 'input' ? 5 : 9} strokeDasharray={l.dash} strokeLinejoin="round" strokeLinecap="round" />
                {r.sec.map((v, k) => k <= upto ? <circle key={k} cx={fx(k)} cy={fy(v)} r={9} fill={l.color} /> : null)}
              </g>
            );
          })}
        </Frame>
        {lines.map((l, i) => {
          const r = S.rows[l.id], y = 292 + i * 136, o = ep(t, l.at + 1.8, l.at + 2.6);
          return (
            <g key={l.id} opacity={o}>
              <rect x={1280} y={y} width={510} height={118} fill={C.bg2} stroke={C.text} strokeWidth={5} />
              <rect x={1280} y={y} width={22} height={118} fill={l.color} />
              <Tx x={1322} y={y + 36} s={24} f="mono" w={700} c={C.text}>{l.name}</Tx>
              <Tx x={1322} y={y + 88} s={60} f="display" w={800} c={C.text}>{`gap ${n1(spread(r))}`}</Tx>
              <Tx x={1770} y={y + 88} s={26} f="mono" w={700} a="end" c={C.dim}>{`range ${n1(r.LRA)}`}</Tx>
            </g>
          );
        })}
        <Tx x={130} y={874} s={21} f="mono" c={C.dim} o={ep(t, 18.0, 18.8)}>{`gap = loudest section minus quietest, dB. range = loudness range from 3 s windows, LU. long program, loudnorm: range ${n1(L.rows.ln.LRA)}`}</Tx>
      </Layer>
    </>
  );
};

/* ---------- 5. two traps: panels 5 and 6 ---------- */
const Traps: React.FC<SceneProps> = ({t}) => {
  const rot = t * 70, one = S.n, four = S.rows.ln.samples ?? S.n * 4;
  const W = 520, bw = (v: number) => (v / four) * W;
  const lin = ep(t, 13.6, 14.4);
  return (
    <>
      <Head2 kick="PANELS 5 AND 6" title="Two traps." o={ep(t, 0.2, 0.9)} />
      <Layer>
        <Frame x={130} y={290} w={850} h={530} n={5} title="the rate" o={ep(t, 0.8, 1.6)}>
          <Reel cx={300} cy={470} r={70} rot={rot} tape={0.7} color={C.cyan} />
          <Reel cx={620} cy={470} r={110} rot={rot * 1.6} tape={0.8} color={C.red} />
          <Tx x={300} y={580} s={36} f="display" w={800} a="middle" c={C.text} o={ep(t, 2.0, 2.8)}>48000</Tx>
          <Tx x={620} y={612} s={54} f="display" w={800} a="middle" c={C.red} o={ep(t, 4.0, 4.8)}>192000 Hz</Tx>
          <g opacity={ep(t, 6.0, 7.0)}>
            <Tx x={170} y={672} s={20} f="mono" c={C.dim}>samples written for the same program</Tx>
            <rect x={170} y={690} width={bw(one)} height={22} fill={C.cyan} stroke={C.text} strokeWidth={3} />
            <rect x={170} y={724} width={bw(four)} height={22} fill={C.red} stroke={C.text} strokeWidth={3} />
            <Tx x={170 + W + 14} y={742} s={20} f="mono" w={700} c={C.red}>{`${four}`}</Tx>
            <Tx x={170 + bw(one) + 14} y={708} s={20} f="mono" w={700} c={C.cyan}>{`${one}`}</Tx>
          </g>
          <Tx x={170} y={796} s={22} f="mono" w={700} c={C.green} o={ep(t, 8.0, 8.8)}>+ aresample=48000 brings it back</Tx>
        </Frame>
        <Frame x={1010} y={290} w={780} h={530} n={6} title="the switch" o={ep(t, 9.4, 10.2)}>
          <rect x={1060} y={380} width={300} height={150} fill={C.panel} stroke={C.text} strokeWidth={5} />
          <Tx x={1085} y={440} s={26} f="mono" w={700} c={C.green}>linear</Tx>
          <Tx x={1085} y={500} s={26} f="mono" w={700} c={C.red}>dynamic</Tx>
          <circle cx={1330} cy={420} r={16} fill={C.green} stroke={C.text} strokeWidth={3} />
          <circle cx={1330} cy={490} r={16} fill={C.red} stroke={C.text} strokeWidth={3} />
          <line x1={1250} y1={455} x2={1330} y2={420 + 70 * lin} stroke={C.text} strokeWidth={9} strokeLinecap="round" />
          <circle cx={1250} cy={455} r={14} fill={C.text} />
          <Tx x={1400} y={420} s={23} f="mono" c={C.text}>asked: linear=true</Tx>
          <Tx x={1400} y={456} s={23} f="mono" c={C.dim}>measured_I and the rest</Tx>
          <g opacity={ep(t, 11.0, 11.8)}>
            <Tx x={1060} y={586} s={23} f="mono" w={700} c={C.green}>{`range target 20: ${S.types[0]}`}</Tx>
            <Tx x={1060} y={620} s={22} f="mono" c={C.text}>{`I ${n1(S.rows.ln2.I)}, range ${n1(S.rows.ln2.LRA)} (input ${n1(S.rows.input.LRA)})`}</Tx>
          </g>
          <g opacity={ep(t, 13.6, 14.4)}>
            <Tx x={1060} y={676} s={23} f="mono" w={700} c={C.red}>{`range target 11: ${S.types[1]}`}</Tx>
            <Tx x={1060} y={710} s={22} f="mono" c={C.text}>{`I ${n1(S.rows.ln2f.I)}, range ${n1(S.rows.ln2f.LRA)}`}</Tx>
          </g>
          <g opacity={ep(t, 16.4, 17.2)}>
            <Tx x={1060} y={774} s={21} f="mono" c={C.text}>{`its own meter: ${S.pass1.input_i}, both readers: ${n1(S.rows.input.I)}`}</Tx>
          </g>
        </Frame>
      </Layer>
    </>
  );
};

/* ---------- 6. what we measured ---------- */
const Close: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {c: C.cyan, k: 'target', a: `loudnorm lands near its target: ${n1(S.rows.ln.I)} for -24, ${n1(S.rows.ln16.I)} and ${n1(L.rows.ln16.I)} for -16`, b: `dynaudnorm has none: ${n1(S.rows.dyn.I)} and ${n1(L.rows.dyn.I)}`},
    {c: C.red, k: 'gap', a: `loudnorm keeps the gap: ${n1(spread(S.rows.input))} in, ${n1(spread(S.rows.ln))} and ${n1(spread(L.rows.ln))} out`, b: `dynaudnorm defaults ${n1(spread(S.rows.dyn))} and ${n1(spread(L.rows.dyn))}, f=150:g=5 ${n1(spread(S.rows.dynt))}`},
    {c: C.amber, k: 'rate', a: 'loudnorm in dynamic mode writes 192000 Hz', b: 'aresample=48000 after it; linear mode keeps 48000'},
    {c: C.green, k: 'two pass', a: 'linear=true keeps the dynamics only if the range target allows', b: `its own pass 1 meter: ${S.pass1.input_i}, readers: ${n1(S.rows.input.I)}`},
    {c: C.red, k: 'the range', a: `two readers differ by 5.6 on one output (22.5 and 16.9)`, b: 'the loudness range number depends on the window and the gate'},
  ];
  return (
    <>
      <Head2 kick="WHAT WE MEASURED" title="Five facts." o={ep(t, 0.2, 0.9)} />
      <Layer>
        {rows.map((r, i) => {
          const y = 290 + i * 104, o = ep(t, 1.0 + i * 1.3, 1.8 + i * 1.3);
          return (
            <g key={r.k} opacity={o}>
              <rect x={130} y={y} width={1660} height={90} fill={C.bg2} stroke={C.text} strokeWidth={5} />
              <rect x={130} y={y} width={190} height={90} fill={r.c} stroke={C.text} strokeWidth={5} />
              <Tx x={225} y={y + 62} s={44} f="display" w={800} a="middle" c={C.bg}>{r.k}</Tx>
              <Tx x={346} y={y + 38} s={25} f="mono" w={700} c={C.text}>{r.a}</Tx>
              <Tx x={346} y={y + 72} s={22} f="mono" c={C.dim}>{r.b}</Tx>
            </g>
          );
        })}
      </Layer>
      <Mid y={846} size={25} color={C.dim} o={ep(t, 8.6, 9.4)}>Not tested: other builds, real speech, stereo, video.</Mid>
    </>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, method: Method, target: Target, gap: Gap, traps: Traps, close: Close};
