import React from 'react';
import {C, F} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import {Head, Mid} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff84/fixture/experiment.mjs (evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
   Production style: technical mini-documentary. Specimen plates with thin double rules, numbered callouts, a hex dump with the key bytes circled,
   dimension lines drawn to scale, a calm slow push-in. Local components only; palette lab. */

/*DATA-START (generated from evidence.json by fixture/run.mjs; levels in dB relative to the input, 142 tones from 6000 Hz, rounded, floor -100)*/
const FQ: number[] = [6000,6500,7000,7500,8000,8500,9000,9500,10000,10100,10200,10300,10400,10500,10600,10700,10800,10900,11000,11100,11200,11300,11400,11500,11600,11700,11800,11900,12000,12100,12200,12300,12400,12500,12600,12700,12800,12900,13000,13100,13200,13300,13400,13500,13600,13700,13800,13900,14000,14100,14200,14300,14400,14500,14600,14700,14800,14900,15000,15100,15200,15300,15400,15500,15600,15700,15800,15900,16000,16100,16200,16300,16400,16500,16600,16700,16800,16900,17000,17100,17200,17300,17400,17500,17600,17700,17800,17900,18000,18100,18200,18300,18400,18500,18600,18700,18800,18900,19000,19100,19200,19300,19400,19500,19600,19700,19800,19900,20000,20100,20200,20300,20400,20500,20600,20700,20800,20900,21000,21100,21200,21300,21400,21500,21600,21700,21800,21900,22000,22100,22200,22300,22400,22500,22600,22700,22800,22900,23000,23100,23200,23300,23400,23500,23600,23700,23800,23900];
const LV: Record<string, number[]> = {
  mp3_s64: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,-3,-12,-32,-68,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100],
  mp3_s96: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,-1,-20,-47,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100],
  mp3_s128: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,-1,-20,-47,-97,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100],
  mp3_s192: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,-3,-12,-32,-68,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100],
  mp3_s256: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,-20,-47,-97,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100],
  aac_s64: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-92,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100],
  aac_s96: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-44,-95,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100],
  aac_s128: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-43,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100],
  aac_s192: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,-95,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100],
  aac_s256: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-43,-100,-96,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100],
  opus_s128: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,-33,-44,-55,-68,-83,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100],
  opus_c12000: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,-3,-33,-43,-53,-63,-76,-94,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100,-100],
};
const CUT: Record<string, number> = {"mp3_s64":11200,"mp3_s96":15000,"mp3_s128":16500,"mp3_s192":18700,"mp3_s256":19500,"mp3_m32":8000,"mp3_m48":11200,"mp3_m64":16500,"mp3_m96":20200,"mp3_m128":20200,"aac_s64":12000,"aac_s96":15700,"aac_s128":17200,"aac_s192":19500,"aac_s256":21700,"aac_m32":12000,"aac_m48":15700,"aac_m64":17200,"aac_m96":19500,"aac_m128":21700,"opus_s64":20000,"opus_s96":20000,"opus_s128":20000,"opus_s192":20000,"opus_s256":20000,"opus_m32":20000,"opus_m48":20000,"opus_m64":20000,"opus_m96":20000,"opus_m128":20000,"mp3_c16000":15700,"mp3_c20000":19500,"aac_c16000":16500,"aac_c20000":20200,"opus_c8000":7500,"opus_c12000":11900,"opus_cbr64":20000};
const OPUS_HEAD = '4f 67 67 53 00 02 00 00 00 00 00 00 00 00 d9 89 c6 71 00 00 00 00 cc 3c d4 3c 01 13 4f 70 75 73 48 65 61 64 01 02 38 01 80 bb 00 00 00 00 00 4f'.split(' ');
const FIRST = {"mp3_s128":[-0.6,-20.2,-47.3]};
/*DATA-END*/

/* ---------- local components (SVG, flat, no gradients, no glow) ---------- */
type TxProps = {x: number; y: number; s?: number; c?: string; w?: number; a?: 'start' | 'middle' | 'end'; f?: 'sans' | 'mono' | 'display'; ls?: number; o?: number; children: React.ReactNode};
const Tx: React.FC<TxProps> = ({x, y, s = 24, c = C.text, w = 400, a = 'start', f = 'sans', ls = 0, o = 1, children}) => (
  <text x={x} y={y} fontSize={s} fill={c} fontWeight={w} textAnchor={a} fontFamily={F[f]} letterSpacing={ls} opacity={o}>{children}</text>
);
const Cam: React.FC<{t: number; z?: number; dx?: number; dy?: number; cy?: number; children: React.ReactNode}> = ({t, z = 0.03, dx = 0, dy = 0, cy = 560, children}) => {
  const p = prog(t, 0, 14);
  return <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: `960px ${cy}px`, transform: `translate(${dx * p}px, ${dy * p}px) scale(${1 + z * p})`}}>{children}</div>;
};
const Layer: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', left: 0, top: 0}}>{children}</svg>
);
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

/* spectrum: level (dB against the input) over frequency, one measured point per tone. The curve ends where the level falls through the floor. */
const F0 = 6000, F1 = 24000, DB0 = 6, DB1 = -80;
type Curve = {lv: number[]; color: string; width?: number; dash?: string; p?: number};
const Spec: React.FC<{x: number; y: number; w: number; h: number; curves: Curve[]; o?: number; xt?: number[]}> = ({x, y, w, h, curves, o = 1, xt = [8, 12, 16, 20, 24]}) => {
  const X = (f: number) => x + ((f - F0) / (F1 - F0)) * w;
  const Y = (d: number) => y + ((DB0 - d) / (DB0 - DB1)) * h;
  return (
    <g opacity={o}>
      {[0, -20, -40, -60, -80].map((d) => (
        <g key={d}><line x1={x} y1={Y(d)} x2={x + w} y2={Y(d)} stroke={C.line} strokeWidth={d === 0 ? 2 : 1} /><Tx x={x - 12} y={Y(d) + 8} s={21} c={C.dim} a="end" f="mono">{String(d)}</Tx></g>
      ))}
      {xt.map((k) => (
        <g key={k}><line x1={X(k * 1000)} y1={y + h} x2={X(k * 1000)} y2={y + h + 10} stroke={C.text} strokeWidth={1.5} /><Tx x={X(k * 1000)} y={y + h + 36} s={22} c={C.dim} a="middle" f="mono">{`${k} kHz`}</Tx></g>
      ))}
      <Tx x={x - 12} y={y - 14} s={20} c={C.mute} a="end" f="mono">dB</Tx>
      <line x1={x} y1={y} x2={x} y2={y + h} stroke={C.text} strokeWidth={1.5} />
      <line x1={x} y1={y + h} x2={x + w} y2={y + h} stroke={C.text} strokeWidth={1.5} />
      {curves.map((c, ci) => {
        const pts: string[] = [];
        for (let i = 0; i < FQ.length; i++) {
          if (X(FQ[i]) > x + (c.p ?? 1) * w) break;
          const v = c.lv[i];
          pts.push(`${X(FQ[i]).toFixed(1)},${Y(Math.max(v, DB1)).toFixed(1)}`);
          if (v <= DB1) break;
        }
        return <polyline key={ci} points={pts.join(' ')} fill="none" stroke={c.color} strokeWidth={c.width ?? 3.5} strokeDasharray={c.dash} strokeLinejoin="round" />;
      })}
    </g>
  );
};
const specX = (x: number, w: number, f: number) => x + ((f - F0) / (F1 - F0)) * w;
const specY = (y: number, h: number, d: number) => y + ((DB0 - d) / (DB0 - DB1)) * h;

/* hex dump (as ff68): offsets, 16 bytes a row, ascii column, key bytes circled and numbered */
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
              {first && <Badge x={left ? rx + 6 : rx + rw - 6} y={ry + rhh + 14} n={k.n} color={k.color} r={11} o={circ > 0.8 ? 1 : 0} />}
            </g>
          );
        }),
      )}
    </g>
  );
};

const kHz = (f: number) => (f / 1000).toFixed(1);
const NAMES = {mp3: 'libmp3lame', aac: 'aac', opus: 'libopus'} as const;
const BR = [64, 96, 128, 192, 256];

/* one plate: five measured curves, revealed one after the other, each with a numbered callout at its cliff and a legend line */
const FiveCurves: React.FC<{t: number; fmt: 'mp3' | 'aac'; at: number; gap: number; color: string; ghost?: string}> = ({t, fmt, at, gap, color, ghost}) => {
  const px = 300, py = 358, pw = 1000, ph = 380;
  return (
    <>
      <Plate x={210} y={310} w={1500} h={470} no={fmt === 'mp3' ? '03' : '04'} title={`${NAMES[fmt]} · stereo · ${BR[0]} to ${BR[4]} kbit/s`} tag="decoded, 151 tones" o={ep(t, 0.2, 0.8)} />
      <Spec x={px} y={py} w={pw} h={ph} o={ep(t, 0.4, 1.0)} curves={[
        ...(ghost ? [{lv: LV[ghost], color: C.mute, width: 3, dash: '8 7', p: ep(t, at + gap * 5 + 0.6, at + gap * 5 + 2.2)}] : []),
        ...BR.map((k, i) => ({lv: LV[`${fmt}_s${k}`], color, p: ep(t, at + gap * i, at + gap * i + 1.3)})),
      ]} />
      {BR.map((k, i) => {
        const c = CUT[`${fmt}_s${k}`], o = ep(t, at + gap * i + 1.1, at + gap * i + 1.7);
        const bx = specX(px, pw, c), by = specY(py, ph, 0) - 30;
        return (
          <g key={k}>
            <Badge x={bx} y={by} n={i + 1} color={C.red} o={o} />
            <g opacity={o}>
              <Tx x={1368} y={382 + i * 74} s={23} c={C.dim} f="mono">{`${k} kbit/s`}</Tx>
              <Tx x={1368} y={422 + i * 74} s={42} c={C.text} f="display" w={800}>{`${kHz(c)} kHz`}</Tx>
              <Badge x={1340} y={374 + i * 74} n={i + 1} color={C.red} r={13} />
            </g>
          </g>
        );
      })}
    </>
  );
};

/* ---------- scenes ---------- */

/* 1. The ask: one staircase, three encoders, two readers */
const Ask: React.FC<SceneProps> = ({t}) => {
  const ticks = Array.from({length: 151}, (_, k) => (k < 3 ? [1000, 2000, 4000][k] : k < 11 ? 6000 + (k - 3) * 500 : 10000 + (k - 11) * 100));
  const X = (f: number) => 270 + (f / 24000) * 1380;
  const boxes = [
    {x: 210, w: 270, l1: 'STIMULUS', l2: '151 tones', l3: '0.25 s each', c: C.cyan, at: 4.2},
    {x: 563, w: 420, l1: 'ENCODER', l2: 'libmp3lame · aac · libopus', l3: '64 to 256 kbit/s', c: C.red, at: 5.2},
    {x: 1066, w: 290, l1: 'DECODER', l2: 'back to float wav', l3: '', c: C.cyan, at: 6.2},
    {x: 1439, w: 271, l1: 'READERS', l2: 'Node · ffmpeg', l3: 'two methods', c: C.green, at: 7.2},
  ];
  return (
    <>
      <Head over="Three encoders · two readers" title="Where does the top go?" color={C.amber} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.028} dy={-8}>
        <Layer>
          <Plate x={210} y={330} w={1500} h={250} no="01" title="THE STIMULUS, ONE TICK PER TONE" tag="stim.wav · stereo · 48000 Hz" o={ep(t, 0.6, 1.2)} />
          {ticks.map((f, k) => <line key={k} x1={X(f)} y1={430} x2={X(f)} y2={510} stroke={C.cyan} strokeWidth={f >= 10000 ? 2 : 3} opacity={ep(t, 1.0 + k * 0.012, 1.3 + k * 0.012)} />)}
          {[[1000, '1 kHz'], [12000, '12 kHz'], [23900, '23.9 kHz']].map(([f, l]) => (
            <g key={String(l)} opacity={ep(t, 3.0, 3.6)}><line x1={X(Number(f))} y1={510} x2={X(Number(f))} y2={532} stroke={C.text} strokeWidth={1.5} /><Tx x={X(Number(f))} y={562} s={22} c={C.dim} a="middle" f="mono">{String(l)}</Tx></g>
          ))}
          {boxes.map((b, i) => (
            <g key={b.l1} opacity={ep(t, b.at, b.at + 0.7)}>
              <rect x={b.x} y={650} width={b.w} height={150} fill="none" stroke={C.text} strokeWidth={1.5} />
              <rect x={b.x} y={650} width={b.w} height={8} fill={b.c} />
              <Tx x={b.x + 18} y={700} s={22} c={C.dim} f="mono" ls={3}>{b.l1}</Tx>
              <Tx x={b.x + 18} y={742} s={22} c={C.text} f="mono" w={700}>{b.l2}</Tx>
              <Tx x={b.x + 18} y={776} s={22} c={C.dim} f="mono">{b.l3}</Tx>
              {i < 3 && <path d={`M ${b.x + b.w + 8} 725 L ${boxes[i + 1].x - 10} 725 M ${boxes[i + 1].x - 22} 715 L ${boxes[i + 1].x - 10} 725 L ${boxes[i + 1].x - 22} 735`} stroke={C.mute} strokeWidth={2} fill="none" />}
            </g>
          ))}
        </Layer>
      </Cam>
      <Mid y={836} size={28} color={C.dim} o={ep(t, 9.0, 9.8)}>How much of the top of the spectrum survives at 64, 96, 128, 192 and 256 kbit/s?</Mid>
    </>
  );
};

/* 2. Two readers and two controls */
const Rig: React.FC<{t: number}> = ({t}) => {
  const px = 300, pw = 900;
  const flat = FQ.map(() => 0);
  return (
    <>
      <Head over="Two readers · two controls" title="Can the readers see a cutoff?" o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.022} dy={-4}>
        <Layer>
          <Plate x={210} y={300} w={1500} h={232} no="02" title="CONTROL · NO ENCODER" tag="stim.wav read back" o={ep(t, 0.6, 1.2)} />
          <Spec x={px} y={332} w={pw} h={142} o={ep(t, 0.8, 1.4)} xt={[8, 16, 24]} curves={[{lv: flat, color: C.green, p: ep(t, 1.4, 3.4)}]} />
          <Badge x={specX(px, pw, 23900)} y={332 - 8} n={1} color={C.green} o={ep(t, 3.4, 4.0)} />
          <g opacity={ep(t, 3.6, 4.2)}>
            <Tx x={1260} y={386} s={40} c={C.green} f="display" w={800}>23900 Hz</Tx>
            <Tx x={1260} y={422} s={22} c={C.dim} f="mono">Node and ffmpeg: every tone</Tx>
            <Tx x={1260} y={450} s={22} c={C.dim} f="mono">at 0 dB, none missing</Tx>
          </g>
          <Plate x={210} y={582} w={1500} h={250} no="03" title="KNOWN POSITIVE · LIBOPUS WITH CUTOFF 12000" tag="out.opus" o={ep(t, 6.0, 6.6)} />
          <Spec x={px} y={614} w={pw} h={160} o={ep(t, 6.2, 6.8)} xt={[8, 12, 16, 24]} curves={[{lv: LV.opus_c12000, color: C.cyan, p: ep(t, 6.8, 8.6)}]} />
          <Badge x={specX(px, pw, CUT.opus_c12000)} y={614 - 8} n={1} color={C.red} o={ep(t, 8.6, 9.2)} />
          <g opacity={ep(t, 9.0, 9.6)}>
            <Tx x={1260} y={668} s={40} c={C.red} f="display" w={800}>{`${CUT.opus_c12000} Hz`}</Tx>
            <Tx x={1260} y={704} s={22} c={C.dim} f="mono">Node: 11900 Hz</Tx>
            <Tx x={1260} y={732} s={22} c={C.dim} f="mono">ffmpeg: 12000 Hz</Tx>
            <Tx x={1260} y={760} s={22} c={C.dim} f="mono">asked for 12000</Tx>
          </g>
        </Layer>
      </Cam>
      <Mid y={846} size={26} color={C.dim} o={ep(t, 11.0, 11.8)}>passes = within 3 dB of the 1 kHz tone</Mid>
    </>
  );
};

/* 3. libmp3lame */
const Mp3: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Constant bit rate · stereo" title="mp3 ends between 11.2 and 19.5 kHz." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cam t={t} z={0.022} dy={-4}>
      <Layer>
        <FiveCurves t={t} fmt="mp3" at={1.0} gap={2.0} color={C.cyan} />
      </Layer>
    </Cam>
    <Mid y={806} size={26} color={C.dim} mono o={ep(t, 12.4, 13.0)}>{`128 kbit/s: 16500 Hz ${FIRST.mp3_s128[0]} dB · 16600 Hz ${FIRST.mp3_s128[1]} dB · 16700 Hz ${FIRST.mp3_s128[2]} dB`}</Mid>
  </>
);

/* 4. aac */
const Aac: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Native encoder · stereo" title="aac ends between 12.0 and 21.7 kHz." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cam t={t} z={0.022} dy={-4}>
      <Layer>
        <FiveCurves t={t} fmt="aac" at={0.9} gap={1.5} color={C.cyan} ghost="mp3_s128" />
      </Layer>
    </Cam>
    <Mid y={806} size={26} color={C.dim} mono o={ep(t, 9.2, 9.8)}>dashed: libmp3lame at 128 kbit/s, 16.5 kHz. aac at 128 kbit/s: 17.2 kHz.</Mid>
  </>
);

/* 5. libopus */
const Opus: React.FC<SceneProps> = ({t}) => {
  const px = 300, py = 336, pw = 1000, ph = 200;
  const keys: HexKey[] = [{from: 37, len: 1, color: C.red, n: 1}, {from: 40, len: 4, color: C.red, n: 2}];
  return (
    <>
      <Head over="Same at every bit rate" title="Opus does not move." color={C.green} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.022} dy={-4}>
        <Layer>
          <Plate x={210} y={300} w={1500} h={290} no="05" title="LIBOPUS · FIVE BIT RATES, ONE CURVE" tag="64 · 96 · 128 · 192 · 256 kbit/s" o={ep(t, 0.2, 0.8)} />
          <Spec x={px} y={py} w={pw} h={ph} o={ep(t, 0.4, 1.0)} curves={[{lv: LV.opus_s128, color: C.cyan, p: ep(t, 1.0, 3.0)}]} />
          <Badge x={specX(px, pw, CUT.opus_s128)} y={py - 8} n={1} color={C.red} o={ep(t, 3.0, 3.6)} />
          <g opacity={ep(t, 3.4, 4.0)}>
            <Tx x={1352} y={382} s={52} c={C.text} f="display" w={800}>{`${kHz(CUT.opus_s64)} kHz`}</Tx>
            <Tx x={1352} y={418} s={21} c={C.dim} f="mono">64, 96, 128, 192, 256</Tx>
            <Tx x={1352} y={448} s={21} c={C.dim} f="mono">{`-vbr off at 64: ${kHz(CUT.opus_cbr64)}`}</Tx>
          </g>
          <g opacity={ep(t, 5.4, 6.0)}>
            <Tx x={1352} y={500} s={21} c={C.amber} f="mono" w={700}>64k label spends</Tx>
            <Tx x={1352} y={528} s={21} c={C.dim} f="mono">109.5 kbit/s</Tx>
          </g>
          <Plate x={210} y={654} w={1500} h={211} no="06" title="THE FILE HEADER, FIRST 48 BYTES" tag="e_opus_s128.opus" o={ep(t, 7.0, 7.6)} />
          <Hex x={250} y={690} start={0} bytes={OPUS_HEAD} keys={keys} fs={23} reveal={ep(t, 7.6, 9.4)} circ={ep(t, 9.6, 10.6)} o={ep(t, 7.0, 7.6)} />
          <g opacity={ep(t, 10.6, 11.2)}>
            <Badge x={1260} y={760} n={1} color={C.red} r={13} /><Tx x={1286} y={767} s={22} c={C.dim} f="mono">02 = 2 channels</Tx>
            <Badge x={1260} y={800} n={2} color={C.red} r={13} /><Tx x={1286} y={807} s={22} c={C.dim} f="mono">80 bb 00 00 = 48000 Hz</Tx>
            <Tx x={1260} y={840} s={22} c={C.green} f="mono" w={700}>no cutoff field</Tx>
          </g>
        </Layer>
      </Cam>
    </>
  );
};

/* 6. Channels and -cutoff: dimension bars to scale, three phases in one plate */
const Channels: React.FC<SceneProps> = ({t}) => {
  const bx0 = 560, bw = 1080, X = (f: number) => bx0 + ((f - 6000) / 18000) * bw;
  const win = (a: number, b: number) => ep(t, a, a + 0.5) * (1 - ep(t, b, b + 0.5));
  const pairRows = (fmt: 'aac' | 'mp3', at: number, out: number) => (
    <g opacity={1 - ep(t, out, out + 0.5)}>
      {BR.map((k, i) => {
        const cs = CUT[`${fmt}_s${k}`], cm = CUT[`${fmt}_m${k / 2}`], same = cs === cm, a0 = at + i * 0.8, y = 372 + i * 78;
        return (
          <g key={k} opacity={ep(t, a0, a0 + 0.5)}>
            <Tx x={236} y={y + 18} s={23} c={C.text} f="mono">{`stereo ${k}`}</Tx>
            <Tx x={236} y={y + 52} s={23} c={C.dim} f="mono">{`mono ${k / 2}`}</Tx>
            <rect x={X(6000)} y={y} width={(X(cs) - X(6000)) * ep(t, a0, a0 + 0.9)} height={26} fill={C.cyanDim} stroke={C.cyan} strokeWidth={2} />
            <rect x={X(6000)} y={y + 34} width={Math.max(0, X(cm) - X(6000)) * ep(t, a0 + 0.3, a0 + 1.2)} height={26} fill={same ? C.greenDim : C.redDim} stroke={same ? C.green : C.red} strokeWidth={2} />
            <Tx x={X(Math.max(cs, cm)) + 16} y={y + 22} s={24} c={C.cyan} f="mono" o={ep(t, a0 + 0.8, a0 + 1.2)}>{kHz(cs)}</Tx>
            <Tx x={X(Math.max(cs, cm)) + 16} y={y + 56} s={24} c={same ? C.green : C.red} f="mono" o={ep(t, a0 + 1.0, a0 + 1.4)}>{kHz(cm)}</Tx>
          </g>
        );
      })}
    </g>
  );
  const cutRow = (y: number, label: string, w0: number, w1: number, at: number, mark: number) => (
    <g opacity={ep(t, at, at + 0.5)}>
      <Tx x={236} y={y + 18} s={23} c={C.text} f="mono">{label}</Tx>
      <Tx x={236} y={y + 52} s={23} c={C.dim} f="mono">with cutoff 20000</Tx>
      <rect x={X(6000)} y={y} width={(X(w0) - X(6000)) * ep(t, at, at + 0.9)} height={26} fill={C.cyanDim} stroke={C.cyan} strokeWidth={2} />
      <rect x={X(6000)} y={y + 34} width={(X(w1) - X(6000)) * ep(t, at + 0.6, at + 1.6)} height={26} fill={C.greenDim} stroke={C.green} strokeWidth={2} />
      <Tx x={X(w0) + 16} y={y + 22} s={24} c={C.cyan} f="mono" o={ep(t, at + 0.8, at + 1.2)}>{kHz(w0)}</Tx>
      <Tx x={Math.max(X(w1), X(20000)) + 16} y={y + 56} s={24} c={C.green} f="mono" o={ep(t, at + 1.6, at + 2.0) * mark}>{kHz(w1)}</Tx>
    </g>
  );
  return (
    <>
      <Head over="Mono against stereo · and the cutoff option" title="Bits per channel decide." o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.018} dy={-2}>
        <Layer>
          <Plate x={210} y={300} w={1500} h={560} no="07" title="MONO AT K/2 AGAINST STEREO AT K" tag="olive: equal · madder: differs" o={ep(t, 0.2, 0.8)} />
          {[8, 12, 16, 20, 24].map((k) => (
            <g key={k} opacity={ep(t, 0.4, 1.0)}>
              <line x1={X(k * 1000)} y1={340} x2={X(k * 1000)} y2={800} stroke={C.line} strokeWidth={1} />
              <Tx x={X(k * 1000)} y={836} s={21} c={C.dim} a="middle" f="mono">{`${k} kHz`}</Tx>
            </g>
          ))}
          <g opacity={ep(t, 0.5, 1.0) * (1 - ep(t, 12.0, 12.5))}>
            <Tx x={236} y={344} s={22} c={C.mute} f="mono" ls={2}>{t < 6.7 ? 'AAC' : 'LIBMP3LAME'}</Tx>
          </g>
          {pairRows('aac', 1.0, 6.4)}
          <Tx x={X(24000)} y={344} s={26} c={C.green} a="end" f="mono" w={700} o={ep(t, 4.8, 5.4) * (1 - ep(t, 6.4, 6.9))}>5 of 5 pairs equal</Tx>
          {pairRows('mp3', 7.0, 12.0)}
          <Tx x={X(24000)} y={344} s={26} c={C.red} a="end" f="mono" w={700} o={ep(t, 10.4, 11.0) * (1 - ep(t, 12.0, 12.5))}>1 of 5 pairs equal</Tx>
          <g opacity={win(12.4, 99)}>
            <line x1={X(20000)} y1={352} x2={X(20000)} y2={800} stroke={C.amber} strokeWidth={3} strokeDasharray="8 6" />
            <Tx x={X(20000) + 12} y={346} s={23} c={C.amber} f="mono" w={700}>cutoff 20000</Tx>
          </g>
          {cutRow(400, 'libmp3lame 128', CUT.mp3_s128, CUT.mp3_c20000, 12.6, 1)}
          {cutRow(520, 'aac 128', CUT.aac_s128, CUT.aac_c20000, 14.6, 1)}
        </Layer>
      </Cam>
    </>
  );
};

/* 7. Close: the table */
const Close: React.FC<SceneProps> = ({t}) => {
  const rows: ['mp3' | 'aac' | 'opus', string][] = [['mp3', 'libmp3lame'], ['aac', 'aac'], ['opus', 'libopus']];
  return (
    <>
      <Head over="Cutoff frequency · stereo · measured" title="The whole table." o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.02} dy={-4}>
        <Layer>
          <Plate x={210} y={330} w={1500} h={380} no="08" title="HIGHEST TONE WITHIN 3 dB OF THE 1 kHz TONE" tag="Node and ffmpeg agree" o={ep(t, 0.4, 1.0)} />
          {BR.map((k, i) => <Tx key={k} x={690 + i * 222} y={394} s={26} c={C.dim} a="middle" f="mono" o={ep(t, 1.0, 1.6)}>{`${k} kbit/s`}</Tx>)}
          {rows.map(([fmt, name], r) => (
            <g key={fmt} opacity={ep(t, 1.4 + r * 0.8, 2.0 + r * 0.8)}>
              <Tx x={250} y={500 + r * 80} s={32} c={C.text} f="display" w={800} ls={2}>{name}</Tx>
              {BR.map((k, i) => <Tx key={k} x={690 + i * 222} y={500 + r * 80} s={50} c={fmt === 'opus' ? C.green : C.text} a="middle" f="display" w={800}>{kHz(CUT[`${fmt}_s${k}`])}</Tx>)}
            </g>
          ))}
        </Layer>
      </Cam>
      <Mid y={760} size={30} color={C.dim} o={ep(t, 5.0, 5.8)}>To keep the top: raise the bit rate, add -cutoff, or use libopus.</Mid>
      <Mid y={826} size={26} color={C.mute} o={ep(t, 7.0, 7.8)}>Not tested: other builds, real music, other sample rates, variable bit rate modes.</Mid>
    </>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, rig: ({t}) => <Rig t={t} />, mp3: Mp3, aac: Aac, opus: Opus, channels: Channels, close: Close};
