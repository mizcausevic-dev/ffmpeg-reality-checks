import React from 'react';
import {C, F} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import {Head, Mid} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff93/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
   Production style: technical mini-documentary. Specimen plates with thin double rules, hex dumps with the key bytes circled,
   numbered callouts, exploded track diagrams drawn to scale, a calm slow push-in. Local components only; palette lab. */


/* Byte dumps copied from evidence.json (fixture/run.mjs): real file offsets, 16 bytes a row, keys are indexes into bytes. */
const hx = (s: string) => s.split(' ');
const HEX = {
  ctts: {start: 4473, bytes: hx('00 00 01 20 63 74 74 73 00 00 00 00 00 00 00 22 00 00 00 01 00 00 04 00 00 00 00 01 00 00 08 00 00 00 00 02 00 00 02 00 00 00 00 01 00 00 08 00')},
  elst: {start: 4051, bytes: hx('00 00 00 1c 65 6c 73 74 00 00 00 00 00 00 00 01 00 00 07 d0 00 00 04 00 00 01 00 00 00 00 03 b6')},
};
/* The first 12 packets of bf2.mp4 in file order (type of the picture, pts, dts in seconds), and the first 8 packets of the three files. */
const ORDER = [['I', 0, -0.08], ['P', 0.12, -0.04], ['B', 0.04, 0], ['B', 0.08, 0.04], ['P', 0.24, 0.08], ['B', 0.16, 0.12], ['B', 0.2, 0.16], ['P', 0.36, 0.2], ['B', 0.28, 0.24], ['B', 0.32, 0.28], ['P', 0.48, 0.32], ['B', 0.4, 0.36]] as [string, number, number][];
const PK: Record<string, [number, number | null][]> = {
  mp4: [[0, -0.08], [0.12, -0.04], [0.04, 0], [0.08, 0.04], [0.24, 0.08], [0.16, 0.12], [0.2, 0.16], [0.36, 0.2]],
  mkv: [[0, null], [0.12, null], [0.04, 0], [0.08, 0.04], [0.24, 0.08], [0.16, 0.12], [0.2, 0.16], [0.36, 0.2]],
  neg: [[0, -0.04], [0.12, 0], [0.04, 0.04], [0.08, 0.08], [0.24, 0.12], [0.16, 0.16], [0.2, 0.2], [0.36, 0.24]],
};
/* The first 10 decoded frames of bf2.mp4 in presentation order: type, pts, dts of the frame's own packet, pkt_dts on the frame, best effort, showinfo pts. */
const FRAMES = [['I', 0, -0.08, 0, 0, 0], ['B', 0.04, 0, 0.04, 0.04, 0.04], ['B', 0.08, 0.04, 0.08, 0.08, 0.08], ['P', 0.12, -0.04, 0.12, 0.12, 0.12], ['B', 0.16, 0.12, 0.16, 0.16, 0.16], ['B', 0.2, 0.16, 0.2, 0.2, 0.2], ['P', 0.24, 0.08, 0.24, 0.24, 0.24], ['B', 0.28, 0.24, 0.28, 0.28, 0.28]] as [string, number, number, number, number, number][];
const f2 = (v: number | null) => (v === null ? 'N/A' : v === 0 ? '0.00' : v.toFixed(2));
/* colors are read when a scene renders (the lab palette is applied per composition), never at import time */
const typeCol = (ty: string): [string, string] => (ty === 'I' ? [C.cyanDim, C.cyan] : ty === 'P' ? [C.amberDim, C.amber] : [C.greenDim, C.green]);
/* ---------- local components (SVG, flat, no gradients, no glow) ---------- */
type TxProps = {x: number; y: number; s?: number; c?: string; w?: number; a?: 'start' | 'middle' | 'end'; f?: 'sans' | 'mono' | 'display'; ls?: number; o?: number; children: React.ReactNode};
const Tx: React.FC<TxProps> = ({x, y, s = 24, c = C.text, w = 400, a = 'start', f = 'sans', ls = 0, o = 1, children}) => (
  <text x={x} y={y} fontSize={s} fill={c} fontWeight={w} textAnchor={a} fontFamily={F[f]} letterSpacing={ls} opacity={o}>{children}</text>
);

/* slow camera: a push-in and a drift over the scene, applied to the specimen layer only */
const Cam: React.FC<{t: number; z?: number; dx?: number; dy?: number; cy?: number; children: React.ReactNode}> = ({t, z = 0.03, dx = 0, dy = 0, cy = 560, children}) => {
  const p = prog(t, 0, 14);
  return <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: `960px ${cy}px`, transform: `translate(${dx * p}px, ${dy * p}px) scale(${1 + z * p})`}}>{children}</div>;
};
const Layer: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', left: 0, top: 0}}>{children}</svg>
);

/* specimen plate: double hairline frame, registration ticks, a plate number and a file tag above */
const Plate: React.FC<{x: number; y: number; w: number; h: number; no: string; title: string; tag?: string; o?: number}> = ({x, y, w, h, no, title, tag, o = 1}) => (
  <g opacity={o}>
    <Tx x={x} y={y - 16} s={22} c={C.dim} ls={3} f="mono">{`PLATE ${no} · ${title}`}</Tx>
    {tag && <Tx x={x + w} y={y - 16} s={22} c={C.mute} a="end" f="mono">{tag}</Tx>}
    <rect x={x} y={y} width={w} height={h} fill="none" stroke={C.text} strokeWidth={2} />
    <rect x={x + 7} y={y + 7} width={w - 14} height={h - 14} fill="none" stroke={C.mute} strokeWidth={1} />
    {[[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]].map(([cx, cy, sx, sy], i) => (
      <g key={i} stroke={C.mute} strokeWidth={1.5}><line x1={cx + sx * 6} y1={cy} x2={cx + sx * 20} y2={cy} /><line x1={cx} y1={cy + sy * 6} x2={cx} y2={cy + sy * 20} /></g>
    ))}
  </g>
);

const Badge: React.FC<{x: number; y: number; n: number | string; color: string; r?: number; o?: number}> = ({x, y, n, color, r = 15, o = 1}) => (
  <g opacity={o}><circle cx={x} cy={y} r={r} fill={C.bg} stroke={color} strokeWidth={2.5} /><Tx x={x} y={y + r * 0.45} s={r * 1.25} c={color} a="middle" w={700} f="mono">{n}</Tx></g>
);

/* legend beside a dump: numbered items with a title line and mono detail lines */
type LegendItem = {n?: number; color: string; title: string; lines: string[]};
const Legend: React.FC<{x: number; y: number; items: LegendItem[]; s?: number; gap?: number; o?: number | number[]}> = ({x, y, items, s = 24, gap = 26, o = 1}) => {
  let yy = y;
  return (
    <g>
      {items.map((it, i) => {
        const top = yy;
        yy += s + 8 + it.lines.length * (s - 1) + gap;
        const oo = Array.isArray(o) ? o[i] : o;
        return (
          <g key={i} opacity={oo}>
            {it.n !== undefined && <Badge x={x + 15} y={top + s * 0.4} n={it.n} color={it.color} />}
            <Tx x={x + (it.n !== undefined ? 42 : 0)} y={top + s * 0.8} s={s} c={it.color} w={700}>{it.title}</Tx>
            {it.lines.map((l, k) => <Tx key={k} x={x + (it.n !== undefined ? 42 : 0)} y={top + s * 0.8 + (k + 1) * (s - 1) + 4} s={s - 3} c={C.dim} f="mono">{l}</Tx>)}
          </g>
        );
      })}
    </g>
  );
};

/* hex dump: real file offsets, 16 bytes a row, an ascii column, key bytes circled and numbered. reveal types the bytes in, circ draws the circles */
type HexKey = {from: number; len: number; color: string; n: number};
const printable = (b: string) => { const v = parseInt(b, 16); return v >= 0x20 && v < 0x7f ? String.fromCharCode(v) : '.'; };
const Hex: React.FC<{x: number; y: number; start: number; bytes: string[]; keys: HexKey[]; fs?: number; reveal?: number; circ?: number; o?: number}> = ({x, y, start, bytes, keys, fs = 24, reveal = 1, circ = 1, o = 1}) => {
  const cw = fs * 1.55, rh = fs * 1.85, offW = fs * 4.8 + fs * 1.2, asciiX = offW + 16 * cw + fs, cell = fs * 1.2;
  const rows = Math.ceil(bytes.length / 16);
  const shown = Math.round(reveal * bytes.length);
  const keyOf = (i: number) => keys.find((k) => i >= k.from && i < k.from + k.len);
  return (
    <g opacity={o} transform={`translate(${x} ${y})`}>
      {Array.from({length: rows}, (_, r) => (
        <g key={r}>
          <Tx x={0} y={r * rh + fs} s={fs} c={C.mute} f="mono">{(start + r * 16).toString(16).padStart(8, '0')}</Tx>
          {bytes.slice(r * 16, r * 16 + 16).map((b, c) => {
            const i = r * 16 + c, k = keyOf(i);
            return (
              <g key={c} opacity={i < shown ? 1 : 0}>
                <Tx x={offW + c * cw} y={r * rh + fs} s={fs} c={k ? k.color : C.dim} w={k ? 700 : 400} f="mono">{b}</Tx>
                <Tx x={asciiX + c * fs * 0.62} y={r * rh + fs} s={fs} c={C.mute} f="mono">{printable(b)}</Tx>
              </g>
            );
          })}
        </g>
      ))}
      {keys.map((k, ki) =>
        Array.from({length: rows}, (_, r) => {
          const a = Math.max(k.from, r * 16), b = Math.min(k.from + k.len, (r + 1) * 16) - 1;
          if (a > b) return null;
          const rx = offW + (a % 16) * cw - 3, ry = r * rh - 2, rw = (b - a) * cw + cell + 6, rhh = fs * 1.3;
          const first = a === k.from;
          const left = k.n % 2 === 1;
          return (
            <g key={`${ki}-${r}`} opacity={circ > 0 ? 1 : 0}>
              <rect x={rx} y={ry} width={rw} height={rhh} rx={rhh / 2} fill="none" stroke={k.color} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - circ} />
              {first && <Badge x={left ? rx + 4 : rx + rw - 4} y={ry - 3} n={k.n} color={k.color} r={11} o={circ > 0.8 ? 1 : 0} />}
            </g>
          );
        }),
      )}
    </g>
  );
};

/* time axis with ticks */
const Axis: React.FC<{x0: number; x1: number; y: number; t0: number; t1: number; ticks: number[]; o?: number}> = ({x0, x1, y, t0, t1, ticks, o = 1}) => {
  const X = (t: number) => x0 + ((t - t0) / (t1 - t0)) * (x1 - x0);
  return (
    <g opacity={o}>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={C.text} strokeWidth={1.5} />
      {ticks.map((t) => (
        <g key={t}><line x1={X(t)} y1={y} x2={X(t)} y2={y + 10} stroke={C.text} strokeWidth={1.5} /><Tx x={X(t)} y={y + 36} s={22} c={C.dim} a="middle" f="mono">{`${t} s`}</Tx></g>
      ))}
    </g>
  );
};

/* dimension line: a span with end ticks and a label above it */
const Bracket: React.FC<{x1: number; x2: number; y: number; label: string; color: string; p?: number; s?: number; below?: boolean}> = ({x1, x2, y, label, color, p = 1, s = 26, below = false}) => (
  <g opacity={p > 0 ? 1 : 0}>
    <line x1={x1} y1={y} x2={x1 + (x2 - x1) * p} y2={y} stroke={color} strokeWidth={2.5} />
    <line x1={x1} y1={y - 10} x2={x1} y2={y + 10} stroke={color} strokeWidth={2.5} />
    <line x1={x1 + (x2 - x1) * p} y1={y - 10} x2={x1 + (x2 - x1) * p} y2={y + 10} stroke={color} strokeWidth={2.5} opacity={p > 0.95 ? 1 : 0} />
    <Tx x={(x1 + x2) / 2} y={below ? y + 34 : y - 14} s={s} c={color} a="middle" w={700} o={p > 0.7 ? 1 : 0}>{label}</Tx>
  </g>
);

/* a track bar on the time axis */
const Bar: React.FC<{x1: number; x2: number; y: number; h?: number; fill: string; stroke: string; label: string; p?: number; textColor?: string; s?: number}> = ({x1, x2, y, h = 52, fill, stroke, label, p = 1, textColor = C.text, s = 24}) => (
  <g>
    <rect x={x1} y={y} width={Math.max(0, (x2 - x1) * p)} height={h} fill={fill} stroke={stroke} strokeWidth={2.5} />
    <Tx x={x1 + 16} y={y + h / 2 + s * 0.35} s={s} c={textColor} w={700} o={p > 0.85 ? 1 : 0}>{label}</Tx>
  </g>
);


/* ---------- scenes ---------- */

/* 1. The ask: decode order against screen order */
const Ask: React.FC<SceneProps> = ({t}) => {
  const x0 = 290, cw = 108, top = 442, bot = 592, w = 84, h = 56;
  const slotX = (s: number) => x0 + s * cw;
  const readers = ['ffprobe packets', 'ffprobe frames', 'showinfo filter', 'container bytes'];
  return (
    <>
      <Head over="50 frames · 2 B-frames" title="Two times on every packet." color={C.amber} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.028} dy={-8}>
        <Layer>
          <Plate x={210} y={320} w={1500} h={420} no="01" title="DECODE ORDER, SCREEN ORDER" tag="bf2.mp4" o={ep(t, 0.6, 1.2)} />
          <Tx x={236} y={374} s={22} c={C.dim} f="mono" o={ep(t, 1.0, 1.6)}>file order: each packet with its dts</Tx>
          <Tx x={236} y={712} s={22} c={C.dim} f="mono" o={ep(t, 2.4, 3.0)}>screen order: slots of 0.04 s, labelled by pts</Tx>
          {ORDER.map(([ty, pts, dts], i) => {
            const slot = Math.round(pts / 0.04), o = ep(t, 1.2 + i * 0.16, 1.8 + i * 0.16), o2 = ep(t, 3.4 + i * 0.12, 4.2 + i * 0.12);
            const [fill, stroke] = typeCol(ty);
            return (
              <g key={i}>
                <g opacity={o}>
                  <rect x={slotX(i)} y={top} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={2.5} />
                  <Tx x={slotX(i) + w / 2} y={top + 39} s={32} c={stroke} a="middle" f="display" w={800}>{ty}</Tx>
                  <Tx x={slotX(i) + w / 2} y={top - 12} s={20} c={i === 0 ? C.red : C.dim} a="middle" f="mono" w={i === 0 ? 700 : 400}>{f2(dts)}</Tx>
                </g>
                <line x1={slotX(i) + w / 2} y1={top + h} x2={slotX(slot) + w / 2} y2={bot} stroke={C.mute} strokeWidth={1.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - o2} />
                <g opacity={o2}>
                  <rect x={slotX(slot)} y={bot} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={2.5} />
                  <Tx x={slotX(slot) + w / 2} y={bot + 39} s={32} c={stroke} a="middle" f="display" w={800}>{ty}</Tx>
                  <Tx x={slotX(slot) + w / 2} y={bot + h + 26} s={20} c={C.dim} a="middle" f="mono">{f2(pts)}</Tx>
                </g>
              </g>
            );
          })}
          {readers.map((r, i) => (
            <g key={r} opacity={ep(t, 6.4 + i * 0.9, 7.0 + i * 0.9)}>
              <rect x={210 + i * 380} y={784} width={360} height={64} fill="none" stroke={C.text} strokeWidth={1.5} />
              <rect x={210 + i * 380} y={784} width={360} height={7} fill={C.cyan} />
              <Tx x={230 + i * 380} y={826} s={25} c={C.text} f="mono">{r}</Tx>
            </g>
          ))}
        </Layer>
      </Cam>
    </>
  );
};

/* 2. Readers and the control */
const Source: React.FC<SceneProps> = ({t}) => {
  const readers = [
    {n: 'READER 1', name: 'ffprobe', l1: 'packets: pts, dts', l2: 'frames; showinfo', at: 1.0},
    {n: 'READER 2', name: 'the bytes', l1: 'mp4: stts, ctts, elst', l2: 'mkv: block times', at: 2.4},
    {n: 'CONTROL', name: 'no B-frames', l1: 'libx264 with -bf 0', l2: 'same 50 frames', at: 3.8},
  ];
  const rows = Array.from({length: 8}, (_, i) => i * 0.04);
  return (
    <>
      <Head over="Two readers · one control" title="Without B-frames, one time." o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.026} dy={-6}>
        <Layer>
          {readers.map((r, i) => {
            const x = 210 + i * 510, o = ep(t, r.at, r.at + 0.7);
            return (
              <g key={r.n} opacity={o}>
                <rect x={x} y={296} width={480} height={170} fill="none" stroke={C.text} strokeWidth={1.5} />
                <rect x={x} y={296} width={480} height={8} fill={i === 2 ? C.green : C.cyan} />
                <Tx x={x + 22} y={340} s={21} c={C.dim} f="mono" ls={3}>{r.n}</Tx>
                <Tx x={x + 22} y={398} s={54} c={C.text} f="display" w={800}>{r.name}</Tx>
                <Tx x={x + 22} y={432} s={22} c={i === 2 ? C.green : C.cyan} f="mono">{r.l1}</Tx>
                <Tx x={x + 22} y={458} s={22} c={i === 2 ? C.green : C.cyan} f="mono">{r.l2}</Tx>
              </g>
            );
          })}
          <Plate x={210} y={548} w={1500} h={250} no="02" title="THE CONTROL, FIRST 8 PACKETS" tag="bf0.mp4" o={ep(t, 5.0, 5.6)} />
          <Tx x={246} y={620} s={26} c={C.dim} f="mono" o={ep(t, 5.4, 6.0)}>pts</Tx>
          <Tx x={246} y={682} s={26} c={C.dim} f="mono" o={ep(t, 5.8, 6.4)}>dts</Tx>
          <Tx x={246} y={744} s={26} c={C.dim} f="mono" o={ep(t, 6.2, 6.8)}>pts = dts</Tx>
          {rows.map((v, i) => {
            const cx = 520 + i * 150, o = ep(t, 6.0 + i * 0.25, 6.6 + i * 0.25);
            return (
              <g key={i} opacity={o}>
                <Tx x={cx} y={620} s={34} c={C.cyan} a="middle" f="mono" w={700}>{f2(v)}</Tx>
                <Tx x={cx} y={682} s={34} c={C.cyan} a="middle" f="mono" w={700}>{f2(v)}</Tx>
                <Tx x={cx} y={744} s={34} c={C.green} a="middle" f="mono" w={700}>=</Tx>
              </g>
            );
          })}
          <Tx x={960} y={846} s={34} c={C.green} a="middle" f="mono" w={700} o={ep(t, 9.6, 10.4)}>50 of 50 packets: dts = pts, in mp4 and in mkv</Tx>
        </Layer>
      </Cam>
    </>
  );
};

/* 3. The first dts is negative */
const Negative: React.FC<SceneProps> = ({t}) => {
  const tMin = -0.12, tMax = 0.4, x0 = 300, x1 = 1700, X = (s: number) => x0 + ((s - tMin) / (tMax - tMin)) * (x1 - x0);
  const yD = 430, yP = 560;
  const first8 = PK.mp4.map(([p, d]) => [p, d as number]);
  return (
    <>
      <Head over="mp4 · -bf 2" title="Decoded before it exists." color={C.red} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.026} dy={-6}>
        <Layer>
          <Tx x={270} y={yD + 8} s={34} c={C.cyan} a="end" f="display" w={800} ls={4} o={ep(t, 0.8, 1.4)}>DTS</Tx>
          <Tx x={270} y={yP + 8} s={34} c={C.amber} a="end" f="display" w={800} ls={4} o={ep(t, 0.8, 1.4)}>PTS</Tx>
          <line x1={X(0)} y1={yD - 66} x2={X(0)} y2={yP + 78} stroke={C.text} strokeWidth={2} strokeDasharray="7 6" opacity={ep(t, 1.2, 1.8)} />
          <Tx x={X(0) + 12} y={yD - 72} s={22} c={C.text} f="mono" o={ep(t, 1.4, 2.0)}>time zero: format start_time 0.00 s</Tx>
          <Axis x0={x0} x1={x1} y={yP + 78} t0={tMin} t1={tMax} ticks={[]} o={ep(t, 0.6, 1.2)} />
          {[-0.08, 0, 0.08, 0.16, 0.24, 0.32, 0.4].map((s) => (
            <g key={s} opacity={ep(t, 0.8, 1.4)}><line x1={X(s)} y1={yP + 78} x2={X(s)} y2={yP + 88} stroke={C.text} strokeWidth={1.5} /><Tx x={X(s)} y={yP + 118} s={22} c={C.dim} a="middle" f="mono">{f2(s)}</Tx></g>
          ))}
          {first8.map(([p, d], i) => {
            const o = ep(t, 2.2 + i * 0.5, 2.8 + i * 0.5), neg = d < 0;
            return (
              <g key={i} opacity={o}>
                <line x1={X(d)} y1={yD + 22} x2={X(p)} y2={yP - 22} stroke={neg ? C.red : C.mute} strokeWidth={neg ? 2.5 : 1.5} />
                <rect x={X(d) - 22} y={yD - 22} width={44} height={44} fill={neg ? C.redDim : C.cyanDim} stroke={neg ? C.red : C.cyan} strokeWidth={2.5} />
                <Tx x={X(d)} y={yD + 8} s={22} c={C.text} a="middle" f="mono" w={700}>{i + 1}</Tx>
                <rect x={X(p) - 22} y={yP - 22} width={44} height={44} fill={C.amberDim} stroke={C.amber} strokeWidth={2.5} />
                <Tx x={X(p)} y={yP + 8} s={22} c={C.text} a="middle" f="mono" w={700}>{i + 1}</Tx>
              </g>
            );
          })}
          <Bracket x1={X(-0.08)} x2={X(0)} y={yD - 112} label="-0.08 s: 2 frames" color={C.red} p={ep(t, 5.4, 6.4)} s={26} />
          <Tx x={300} y={736} s={26} c={C.dim} o={ep(t, 7.0, 7.6)}>numbers: packets in file order. dts steps +0.04 s each; pts jumps: 0, 0.12, 0.04, 0.08, 0.24</Tx>
          <Tx x={300} y={800} s={30} c={C.red} f="mono" w={700} o={ep(t, 8.0, 8.8)}>first pts 0.00 s · first dts -0.08 s · start_time 0.00 s</Tx>
          <Tx x={300} y={846} s={26} c={C.mute} f="mono" o={ep(t, 9.4, 10.0)}>50 packets: dts rises one frame each time, never passes pts, pts is not monotonic in file order</Tx>
        </Layer>
      </Cam>
    </>
  );
};

/* 4. Where the minus comes from */
const Bytes: React.FC<SceneProps> = ({t}) => {
  const kCtts: HexKey[] = [{from: 20, len: 4, color: C.red, n: 1}];
  const kElst: HexKey[] = [{from: 20, len: 4, color: C.red, n: 2}];
  return (
    <>
      <Head over="mp4 · box bytes" title="The file never says minus." color={C.amber} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.024} dy={-6}>
        <Layer>
          <Plate x={210} y={318} w={1500} h={186} no="03" title="CTTS: COMPOSITION OFFSETS" tag="bf2.mp4" o={ep(t, 0.6, 1.2)} />
          <Hex x={250} y={348} start={HEX.ctts.start} bytes={HEX.ctts.bytes} keys={kCtts} reveal={ep(t, 1.2, 2.6)} circ={ep(t, 2.8, 3.6)} o={ep(t, 0.6, 1.2)} />
          <Legend x={1290} y={350} s={22} gap={16} items={[{n: 1, color: C.red, title: 'first offset', lines: ['0400 = 1024 ticks', 'timescale 12800 = 0.08 s']}]} o={[ep(t, 3.4, 4.0)]} />
          <Plate x={210} y={550} w={1500} h={150} no="04" title="ELST: EDIT LIST" tag="bf2.mp4" o={ep(t, 4.2, 4.8)} />
          <Hex x={250} y={580} start={HEX.elst.start} bytes={HEX.elst.bytes} keys={kElst} reveal={ep(t, 4.8, 5.8)} circ={ep(t, 6.0, 6.8)} o={ep(t, 4.2, 4.8)} />
          <Legend x={1290} y={582} s={22} gap={16} items={[{n: 2, color: C.red, title: 'media time', lines: ['0400 = 1024 ticks', 'play from tick 1024']}]} o={[ep(t, 7.0, 7.6)]} />
          <Tx x={250} y={764} s={32} c={C.green} f="mono" w={700} o={ep(t, 8.0, 8.8)}>stored dts 0 - 1024 = -1024 ticks = -0.08 s</Tx>
          <Tx x={250} y={814} s={28} c={C.text} f="mono" o={ep(t, 9.6, 10.4)}>ignore the edit list: first dts 0.00 s, first pts 0.08 s</Tx>
          <Tx x={250} y={860} s={26} c={C.mute} f="mono" o={ep(t, 10.4, 11.0)}>stored decode times: 50 samples, all 0 or more</Tx>
        </Layer>
      </Cam>
    </>
  );
};

/* 5. Decoded frames */
const Frames: React.FC<SceneProps> = ({t}) => {
  const cols = [
    {h: 'FRAME', x: 250, a: 'start' as const}, {h: 'PTS', x: 520, a: 'end' as const}, {h: 'OWN PACKET DTS', x: 880, a: 'end' as const},
    {h: 'FRAME PKT_DTS', x: 1180, a: 'end' as const}, {h: 'BEST EFFORT', x: 1450, a: 'end' as const}, {h: 'SHOWINFO PTS', x: 1690, a: 'end' as const},
  ];
  return (
    <>
      <Head over="ffprobe frames · showinfo" title="A frame is not its packet." color={C.red} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.022} dy={-4}>
        <Layer>
          <Plate x={210} y={330} w={1500} h={490} no="05" title="FIRST 8 DECODED FRAMES, SCREEN ORDER" tag="bf2.mp4" o={ep(t, 0.6, 1.2)} />
          {cols.map((c) => <Tx key={c.h} x={c.x} y={386} s={22} c={C.dim} a={c.a} f="mono" ls={1} o={ep(t, 1.0, 1.6)}>{c.h}</Tx>)}
          <line x1={236} y1={400} x2={1684} y2={400} stroke={C.text} strokeWidth={1.5} opacity={ep(t, 1.0, 1.6)} />
          {FRAMES.map(([ty, pts, own, pd, be, si], i) => {
            const y = 448 + i * 46, o = ep(t, 1.6 + i * 0.4, 2.2 + i * 0.4), [, stroke] = typeCol(ty);
            return (
              <g key={i} opacity={o}>
                <Tx x={250} y={y} s={28} c={stroke} f="mono" w={700}>{`${i + 1}  ${ty}`}</Tx>
                <Tx x={520} y={y} s={28} c={C.text} a="end" f="mono">{f2(pts)}</Tx>
                <Tx x={880} y={y} s={28} c={C.red} a="end" f="mono" w={700}>{f2(own)}</Tx>
                <Tx x={1180} y={y} s={28} c={C.cyan} a="end" f="mono">{f2(pd)}</Tx>
                <Tx x={1450} y={y} s={28} c={C.green} a="end" f="mono">{f2(be)}</Tx>
                <Tx x={1690} y={y} s={28} c={C.green} a="end" f="mono">{f2(si)}</Tx>
              </g>
            );
          })}
          <Tx x={960} y={866} s={28} c={C.red} a="middle" f="mono" w={700} o={ep(t, 6.2, 7.0)}>frame pkt_dts differs from its own packet dts: 48 of 48</Tx>
        </Layer>
      </Cam>
    </>
  );
};

/* 6. Same bits, three answers */
const Other: React.FC<SceneProps> = ({t}) => {
  const cols = [
    {key: 'mp4', name: 'bf2.mp4', how: 'stts 0 · ctts +1024 · elst 1024', color: C.cyan, x: 210},
    {key: 'mkv', name: 'bf2.mkv', how: 'block times 0 120 40 80 ms', color: C.red, x: 730},
    {key: 'neg', name: 'bf2neg.mp4', how: 'ctts signed · elst 0', color: C.amber, x: 1250},
  ];
  return (
    <>
      <Head over="Same 50 pictures · 3 files" title="Same bits, three answers." color={C.red} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.024} dy={-4}>
        <Layer>
          {cols.map((c, ci) => {
            const o0 = ep(t, 0.8 + ci * 1.4, 1.5 + ci * 1.4);
            return (
              <g key={c.key} opacity={o0}>
                <rect x={c.x} y={290} width={460} height={470} fill="none" stroke={C.text} strokeWidth={1.5} />
                <rect x={c.x} y={290} width={460} height={8} fill={c.color} />
                <Tx x={c.x + 22} y={340} s={44} c={C.text} f="display" w={800}>{c.name}</Tx>
                <Tx x={c.x + 150} y={392} s={20} c={C.dim} f="mono" a="end">PTS</Tx>
                <Tx x={c.x + 290} y={392} s={20} c={C.dim} f="mono" a="end">DTS</Tx>
                {PK[c.key].slice(0, 6).map(([p, d], i) => (
                  <g key={i} opacity={ep(t, 1.6 + ci * 1.4 + i * 0.15, 2.2 + ci * 1.4 + i * 0.15)}>
                    <Tx x={c.x + 56} y={440 + i * 40} s={22} c={C.mute} f="mono">{i + 1}</Tx>
                    <Tx x={c.x + 150} y={440 + i * 40} s={26} c={C.amber} f="mono" a="end">{f2(p)}</Tx>
                    <Tx x={c.x + 290} y={440 + i * 40} s={26} c={d === null ? C.red : d < 0 ? C.red : C.cyan} f="mono" a="end" w={d === null || d < 0 ? 700 : 400}>{f2(d)}</Tx>
                  </g>
                ))}
                <line x1={c.x + 22} y1={672} x2={c.x + 438} y2={672} stroke={C.mute} strokeWidth={1} />
                <Tx x={c.x + 22} y={706} s={20} c={c.color} f="mono" w={700}>{c.how}</Tx>
                <Tx x={c.x + 22} y={738} s={20} c={C.dim} f="mono">{c.key === 'mkv' ? 'no dts field in the file' : 'dts built from the stored times'}</Tx>
              </g>
            );
          })}
          <Tx x={960} y={826} s={32} c={C.red} a="middle" f="mono" w={700} o={ep(t, 7.8, 8.6)}>first dts: -0.08 s · N/A · -0.04 s</Tx>
          <Tx x={960} y={868} s={26} c={C.mute} a="middle" f="mono" o={ep(t, 8.8, 9.4)}>pts identical in all three; the 50 frame hashes are identical too</Tx>
        </Layer>
      </Cam>
    </>
  );
};

/* 7. What to use */
const Close: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {n: 1, color: C.green, name: 'packet pts', rule: ['when to show the picture;', 'the same in every file'], seen: ['the same 50 times in all 5 files', 'sorted: 0.00 to 1.96 s']},
    {n: 2, color: C.red, name: 'packet dts', rule: ['how the container wrote', 'the decode order'], seen: ['-0.08 s, N/A or -0.04 s', 'for the same pictures']},
    {n: 3, color: C.red, name: 'frame pkt_dts', rule: ['not the dts of the packet', 'the frame came from'], seen: ['differs on 48 of 48', 'none on the last 2']},
    {n: 4, color: C.green, name: 'best effort, showinfo pts', rule: ['a time to show a decoded', 'frame at'], seen: ['= pts on 50 of 50', 'in all 5 files']},
  ];
  return (
    <>
      <Head over="What to use" title="Trust pts. Treat dts as format." color={C.cyan} o={ep(t, 0.2, 0.9)} />
      <Cam t={t} z={0.02} dy={-4}>
        <Layer>
          <line x1={210} y1={300} x2={1710} y2={300} stroke={C.text} strokeWidth={2} opacity={ep(t, 0.8, 1.4)} />
          {rows.map((r, i) => {
            const y = 300 + i * 118, o = ep(t, 1.2 + i * 1.2, 1.9 + i * 1.2);
            return (
              <g key={r.n} opacity={o}>
                <Badge x={238} y={y + 59} n={r.n} color={r.color} r={20} />
                <Tx x={282} y={y + 70} s={r.n === 4 ? 34 : 42} c={C.text} f="display" w={800}>{r.name}</Tx>
                <Tx x={800} y={y + 52} s={24} c={C.dim}>{r.rule[0]}</Tx>
                <Tx x={800} y={y + 84} s={24} c={C.dim}>{r.rule[1]}</Tx>
                {r.seen.map((s, k) => <Tx key={k} x={1290} y={y + 52 + k * 32} s={22} c={r.color} f="mono" w={700}>{s}</Tx>)}
                <line x1={210} y1={y + 118} x2={1710} y2={y + 118} stroke={C.mute} strokeWidth={1} />
              </g>
            );
          })}
        </Layer>
      </Cam>
      <Mid y={800} size={26} color={C.mute} o={ep(t, 7.0, 7.6)}>Not tested: other builds, real footage, other encoders, fragmented mp4.</Mid>
      <Mid y={846} size={26} color={C.dim} o={ep(t, 8.0, 8.6)}>FFmpeg Reality Checks · episode 93 · fixture and tests in the description</Mid>
    </>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, negative: Negative, bytes: Bytes, frames: Frames, other: Other, close: Close};
