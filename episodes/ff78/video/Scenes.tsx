import React from 'react';
import {C, F} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import {Head, Mid} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff78/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
   Production style: technical mini-documentary. Specimen plates with thin double rules, hex dumps with the key bytes circled,
   numbered callouts, exploded sample bars drawn to scale, a calm slow push-in. Local components only; palette lab. */

/* Byte dumps copied from evidence.json: real file offsets, 16 bytes a row. */
const HEX = {
  head: {file: 'imp_cbr_tag.mp3', start: 58, bytes: '00 00 00 00 00 00 00 00 49 6e 66 6f 00 00 00 0f 00 00 00 28 00 00 42 ef 00 0c 0c 12 12 18 18 18 1f 1f 25 25 25 2b 2b 31 31 31 38 38 3e 3e 3e 44'.split(' ')},
  lame: {file: 'imp_cbr_tag.mp3', start: 186, bytes: '4c 61 76 63 36 30 2e 33 31 00 00 00 00 00 00 00 00 00 00 00 00 24 05 7c 00 00 00 00 00 00 42 ef 9d 64 ab f7 00 00 00 00 00 00 00 00 00 00 00 00'.split(' ')},
  cut: {file: 'copyBefore5.mp3', start: 186, bytes: '4c 61 76 66 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 de f5 7c 00 00 00 00 00 00 22 48 75 61 f7 0c 00 00 00 00 00 00 00 00 00 00 00 00'.split(' ')},
};
/* Sample axis shared by the strips: 40 frames x 1152 = 46080 samples */
const S = 46080, X0 = 380, X1 = 1640;
const X = (s: number) => X0 + (s / S) * (X1 - X0);
const GAP_POS = (() => { const p: number[] = []; let q = 2000; for (let k = 0; k < 40; k++) { p.push(q); q += 800 + 10 * k; } return p; })();

/* ---------- local components (SVG, flat, no gradients, no glow) ---------- */
type TxProps = {x: number; y: number; s?: number; c?: string; w?: number; a?: 'start' | 'middle' | 'end'; f?: 'sans' | 'mono' | 'display'; ls?: number; o?: number; children: React.ReactNode};
const Tx: React.FC<TxProps> = ({x, y, s = 24, c = C.text, w = 400, a = 'start', f = 'sans', ls = 0, o = 1, children}) => (
  <text x={x} y={y} fontSize={s} fill={c} fontWeight={w} textAnchor={a} fontFamily={F[f]} letterSpacing={ls} opacity={o}>{children}</text>
);

/* slow camera: a push-in and a drift over the scene, applied to the specimen layer only */
const Cam: React.FC<{t: number; z?: number; dx?: number; dy?: number; cy?: number; children: React.ReactNode}> = ({t, z = 0.03, dx = 0, dy = 0, cy = 560, children}) => {
  const p = prog(t, 0, 16);
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

/* dimension line: a span with end ticks and a label above (or below) it */
const Bracket: React.FC<{x1: number; x2: number; y: number; label: string; color: string; p?: number; s?: number; below?: boolean; anchor?: 'start' | 'middle' | 'end'}> = ({x1, x2, y, label, color, p = 1, s = 26, below = false, anchor = 'middle'}) => (
  <g opacity={p > 0 ? 1 : 0}>
    <line x1={x1} y1={y} x2={x1 + (x2 - x1) * p} y2={y} stroke={color} strokeWidth={2.5} />
    <line x1={x1} y1={y - 10} x2={x1} y2={y + 10} stroke={color} strokeWidth={2.5} />
    <line x1={x1 + (x2 - x1) * p} y1={y - 10} x2={x1 + (x2 - x1) * p} y2={y + 10} stroke={color} strokeWidth={2.5} opacity={p > 0.95 ? 1 : 0} />
    <Tx x={anchor === 'start' ? x1 : anchor === 'end' ? x2 : (x1 + x2) / 2} y={below ? y + 34 : y - 14} s={s} c={color} a={anchor} w={700} o={p > 0.7 ? 1 : 0}>{label}</Tx>
  </g>
);

/* an impulse on a baseline: a stem of height h with a dot on top; p draws it up */
const Spike: React.FC<{s: number; y: number; h: number; color: string; p?: number; w?: number}> = ({s, y, h, color, p = 1, w = 4}) => (
  <g opacity={p > 0 ? 1 : 0}>
    <line x1={X(s)} y1={y} x2={X(s)} y2={y - h * p} stroke={color} strokeWidth={w} />
    <circle cx={X(s)} cy={y - h * p} r={w + 2} fill={color} />
  </g>
);
/* a tone burst drawn as its envelope band, from sample a to sample b */
const Burst: React.FC<{a: number; b: number; y: number; h: number; fill: string; stroke: string; p?: number}> = ({a, b, y, h, fill, stroke, p = 1}) => (
  <rect x={X(a)} y={y - h / 2} width={Math.max(0, (X(b) - X(a)) * p)} height={h} fill={fill} stroke={stroke} strokeWidth={2.5} />
);
const SampleAxis: React.FC<{y: number; ticks: number[]; end?: number; o?: number}> = ({y, ticks, end = S, o = 1}) => (
  <g opacity={o}>
    <line x1={X(0)} y1={y} x2={X(end)} y2={y} stroke={C.text} strokeWidth={1.5} />
    {ticks.map((t) => <g key={t}><line x1={X(t)} y1={y} x2={X(t)} y2={y + 10} stroke={C.text} strokeWidth={1.5} /><Tx x={X(t)} y={y + 34} s={20} c={C.dim} a="middle" f="mono">{String(t)}</Tx></g>)}
  </g>
);

/* ---------- scenes ---------- */

/* 1. The ask: one impulse in, where does it come out */
const Ask: React.FC<SceneProps> = ({t}) => {
  const boxes = [{x: 380, label: 'ENCODE', cmd: 'libmp3lame', at: 4.0}, {x: 800, label: 'MP3 FILE', cmd: '40 frames', at: 5.0}, {x: 1220, label: 'DECODE', cmd: 'ffmpeg to s16le', at: 6.0}];
  return (
    <>
      <Head over="One second · 44100 samples" title="Does the sound start on time?" color={C.amber} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.03} dy={-8}>
        <Layer>
          <Plate x={210} y={310} w={1500} h={190} no="01" title="THE SOURCE" tag="imp.wav" o={ep(t, 0.6, 1.2)} />
          <line x1={X(0)} y1={440} x2={X(44100)} y2={440} stroke={C.text} strokeWidth={1.5} opacity={ep(t, 1.0, 1.6)} />
          <Spike s={4410} y={440} h={92} color={C.cyan} p={ep(t, 1.6, 2.4)} />
          <Tx x={X(4410) + 22} y={372} s={26} c={C.cyan} f="mono" w={700} o={ep(t, 2.4, 3.0)}>impulse at sample 4410</Tx>
          <SampleAxis y={440} end={44100} ticks={[0, 11025, 22050, 33075, 44100]} o={ep(t, 1.0, 1.6)} />
          {boxes.map((b, i) => (
            <g key={b.label} opacity={ep(t, b.at, b.at + 0.6)}>
              <rect x={b.x} y={560} width={300} height={78} fill="none" stroke={C.text} strokeWidth={2} />
              <Tx x={b.x + 18} y={594} s={30} c={C.text} f="display" w={800} ls={3}>{b.label}</Tx>
              <Tx x={b.x + 18} y={622} s={21} c={C.dim} f="mono">{b.cmd}</Tx>
              {i < 2 && <g><line x1={b.x + 300} y1={599} x2={b.x + 416} y2={599} stroke={C.text} strokeWidth={2} /><path d={`M${b.x + 416} 599 l-14 -8 l0 16 z`} fill={C.text} /></g>}
            </g>
          ))}
          <Plate x={210} y={690} w={1500} h={160} no="02" title="THE DECODE" tag="where does it land?" o={ep(t, 7.0, 7.6)} />
          <line x1={X(0)} y1={800} x2={X(44100)} y2={800} stroke={C.text} strokeWidth={1.5} opacity={ep(t, 7.4, 8.0)} />
          <line x1={X(4410)} y1={800} x2={X(4410)} y2={730} stroke={C.mute} strokeWidth={3} strokeDasharray="6 6" opacity={ep(t, 8.0, 8.8)} />
          <Tx x={X(4410) + 24} y={768} s={44} c={C.red} f="display" w={900} o={ep(t, 9.0, 9.8)}>? where</Tx>
        </Layer>
      </Cam>
    </>
  );
};

/* 2. Readers and the control */
const Source: React.FC<SceneProps> = ({t}) => {
  const readers = [
    {n: 'READER 1', name: 'the decoder', l1: 'ffmpeg to s16le', l2: 'Node: peak and onset', at: 1.0},
    {n: 'READER 2', name: 'the bytes', l1: 'Node walks every frame', l2: 'reads the Info and Xing tag', at: 2.4},
    {n: 'READER 3', name: 'ffprobe', l1: 'start_time and duration', l2: 'of the same file', at: 3.8},
  ];
  return (
    <>
      <Head over="Two signals · one control" title="Known positions in." o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.028} dy={-6}>
        <Layer>
          {readers.map((r, i) => {
            const x = 210 + i * 510, o = ep(t, r.at, r.at + 0.7);
            return (
              <g key={r.n} opacity={o}>
                <rect x={x} y={296} width={480} height={170} fill="none" stroke={C.text} strokeWidth={1.5} />
                <rect x={x} y={296} width={480} height={8} fill={C.cyan} />
                <Tx x={x + 22} y={340} s={21} c={C.dim} f="mono" ls={3}>{r.n}</Tx>
                <Tx x={x + 22} y={398} s={54} c={C.text} f="display" w={800}>{r.name}</Tx>
                <Tx x={x + 22} y={432} s={22} c={C.cyan} f="mono">{r.l1}</Tx>
                <Tx x={x + 22} y={458} s={22} c={C.cyan} f="mono">{r.l2}</Tx>
              </g>
            );
          })}
          <Plate x={210} y={548} w={1500} h={310} no="03" title="THE CONTROL: WAV THROUGH PCM" tag="44100 samples out" o={ep(t, 5.0, 5.6)} />
          <Tx x={240} y={612} s={26} c={C.text} f="display" w={800} ls={3} o={ep(t, 5.6, 6.2)}>IMPULSE</Tx>
          <line x1={X(0)} y1={650} x2={X(44100)} y2={650} stroke={C.text} strokeWidth={1.5} opacity={ep(t, 5.6, 6.2)} />
          <Spike s={4410} y={650} h={62} color={C.cyan} p={ep(t, 6.2, 7.0)} />
          <Tx x={X(4410) + 22} y={606} s={25} c={C.green} f="mono" w={700} o={ep(t, 7.2, 7.8)}>peak at 4410, value 29000</Tx>
          <Tx x={240} y={752} s={26} c={C.text} f="display" w={800} ls={3} o={ep(t, 7.8, 8.4)}>TONE</Tx>
          <line x1={X(0)} y1={776} x2={X(44100)} y2={776} stroke={C.text} strokeWidth={1.5} opacity={ep(t, 7.8, 8.4)} />
          <Burst a={4410} b={39690} y={776} h={44} fill={C.cyanDim} stroke={C.cyan} p={ep(t, 8.4, 9.6)} />
          <Tx x={X(4410) + 22} y={736} s={25} c={C.green} f="mono" w={700} o={ep(t, 9.8, 10.4)}>1 kHz from sample 4410 to 39690</Tx>
          <SampleAxis y={806} end={44100} ticks={[0, 11025, 22050, 33075, 44100]} o={ep(t, 5.6, 6.2)} />
        </Layer>
      </Cam>
    </>
  );
};

/* 3. No tag: 1105 late */
const Raw: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {mode: 'constant 128 kbit/s', imp: 5515, tone: 5515, at: 9.2},
    {mode: 'variable quality 2', imp: 5515, tone: 5515, at: 10.0},
  ];
  return (
    <>
      <Head over="Tag switched off" title="1105 samples late." color={C.red} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.026} dy={-6}>
        <Layer>
          <Plate x={210} y={308} w={1500} h={356} no="04" title="SOURCE AND DECODE ON ONE AXIS" tag="imp_cbr_raw.mp3" o={ep(t, 0.6, 1.2)} />
          <Tx x={240} y={372} s={22} c={C.cyan} f="mono" w={700} o={ep(t, 1.0, 1.6)}>source</Tx>
          <line x1={X(0)} y1={392} x2={X(44100)} y2={392} stroke={C.text} strokeWidth={1.5} opacity={ep(t, 1.0, 1.6)} />
          <Spike s={4410} y={392} h={52} color={C.cyan} p={ep(t, 1.4, 2.0)} />
          <Tx x={240} y={472} s={22} c={C.red} f="mono" w={700} o={ep(t, 2.6, 3.2)}>decode</Tx>
          <line x1={X(0)} y1={492} x2={X(46080)} y2={492} stroke={C.text} strokeWidth={1.5} opacity={ep(t, 2.6, 3.2)} />
          <line x1={X(4410)} y1={338} x2={X(4410)} y2={492} stroke={C.mute} strokeWidth={1.5} strokeDasharray="5 5" opacity={ep(t, 3.0, 3.6)} />
          <Spike s={5515} y={492} h={52} color={C.red} p={ep(t, 3.2, 4.0)} />
          <line x1={X(5515)} y1={440} x2={X(5515)} y2={492} stroke={C.red} strokeWidth={1.5} strokeDasharray="5 5" opacity={ep(t, 4.0, 4.4)} />
          <Bracket x1={X(4410)} x2={X(5515)} y={522} label="1105 samples" color={C.red} p={ep(t, 4.2, 5.2)} s={26} anchor="start" below />
          <Tx x={X(5515) + 22} y={448} s={25} c={C.red} f="mono" w={700} o={ep(t, 4.6, 5.2)}>impulse at 5515</Tx>
          <Tx x={240} y={608} s={22} c={C.cyan} f="mono" w={700} o={ep(t, 5.6, 6.0)}>tone</Tx>
          <Burst a={4410} b={39690} y={600} h={22} fill={C.cyanDim} stroke={C.cyan} p={ep(t, 5.6, 6.4)} />
          <Burst a={5515} b={40795} y={636} h={22} fill={C.redDim} stroke={C.red} p={ep(t, 6.4, 7.4)} />
          <Tx x={X(40795) + 20} y={644} s={22} c={C.red} f="mono" w={700} o={ep(t, 7.4, 8.0)}>+1105</Tx>
          <Tx x={X(44100)} y={378} s={22} c={C.dim} a="end" f="mono" o={ep(t, 7.6, 8.2)}>source ends 44100</Tx>
          <Tx x={X(46080)} y={476} s={22} c={C.red} a="end" f="mono" w={700} o={ep(t, 7.6, 8.2)}>decode ends 46080</Tx>
          <line x1={210} y1={702} x2={1710} y2={702} stroke={C.text} strokeWidth={2} opacity={ep(t, 8.4, 9.0)} />
          <g opacity={ep(t, 8.6, 9.2)}>
            {[['ENCODE', 240], ['IMPULSE AT', 760], ['TONE FROM', 1010], ['SHIFT', 1260], ['SAMPLES OUT', 1450]].map(([h, x]) => <Tx key={h as string} x={x as number} y={738} s={20} c={C.dim} f="mono" ls={2}>{h as string}</Tx>)}
          </g>
          {rows.map((r, i) => {
            const y = 780 + i * 46, o = ep(t, r.at, r.at + 0.6);
            return (
              <g key={r.mode} opacity={o}>
                <Tx x={240} y={y} s={26} c={C.text}>{r.mode}</Tx>
                <Tx x={760} y={y} s={26} c={C.red} f="mono" w={700}>{r.imp}</Tx>
                <Tx x={1010} y={y} s={26} c={C.red} f="mono" w={700}>{r.tone}</Tx>
                <Tx x={1260} y={y} s={26} c={C.red} f="mono" w={700}>+1105</Tx>
                <Tx x={1450} y={y} s={26} c={C.red} f="mono" w={700}>46080</Tx>
              </g>
            );
          })}
        </Layer>
      </Cam>
    </>
  );
};

/* 4. The tag: first frame bytes */
const Tag: React.FC<SceneProps> = ({t}) => {
  const k1: HexKey[] = [{from: 8, len: 4, color: C.red, n: 1}, {from: 16, len: 4, color: C.red, n: 2}];
  const k2: HexKey[] = [{from: 0, len: 9, color: C.amber, n: 3}, {from: 21, len: 3, color: C.red, n: 4}];
  return (
    <>
      <Head over="Tag on · the default" title="The first frame holds no sound." color={C.amber} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.024} dy={-4}>
        <Layer>
          <Plate x={210} y={308} w={1500} h={190} no="05" title="THE FIRST FRAME, 417 BYTES" tag="imp_cbr_tag.mp3 · from offset 58" o={ep(t, 0.6, 1.2)} />
          <Hex x={246} y={346} fs={22} start={HEX.head.start} bytes={HEX.head.bytes} keys={k1} reveal={ep(t, 1.2, 3.0)} circ={ep(t, 3.2, 4.2)} o={ep(t, 0.6, 1.2)} />
          <Legend x={1290} y={338} s={21} gap={8} items={[
            {n: 1, color: C.red, title: 'Info (Xing if VBR)', lines: ['49 6e 66 6f']},
            {n: 2, color: C.red, title: 'frames', lines: ['00 00 00 28 = 40']},
          ]} o={[ep(t, 4.0, 4.6), ep(t, 4.6, 5.2)]} />
          <Tx x={1290} y={458} s={19} c={C.dim} f="mono" o={ep(t, 5.0, 5.6)}>frame header ff fb 90 c0:</Tx>
          <Tx x={1290} y={481} s={19} c={C.dim} f="mono" o={ep(t, 5.0, 5.6)}>layer III, 128k, 44100 Hz, mono</Tx>
          <Plate x={210} y={590} w={1500} h={190} no="06" title="THE ENCODER FIELDS" tag="same frame · from offset 186" o={ep(t, 5.8, 6.4)} />
          <Hex x={246} y={628} fs={22} start={HEX.lame.start} bytes={HEX.lame.bytes} keys={k2} reveal={ep(t, 6.4, 8.0)} circ={ep(t, 8.2, 9.2)} o={ep(t, 5.8, 6.4)} />
          <Legend x={1290} y={620} s={21} gap={12} items={[
            {n: 3, color: C.amber, title: 'encoder string', lines: ['4c 61 76 63 = Lavc']},
            {n: 4, color: C.red, title: 'delay and padding', lines: ['0x240 = 576 delay', '0x57c = 1404 padding']},
          ]} o={[ep(t, 9.0, 9.6), ep(t, 9.6, 10.2)]} />
          <Tx x={246} y={832} s={30} c={C.green} f="mono" w={700} o={ep(t, 11.0, 11.8)}>decode: impulse at 4410, 44100 samples</Tx>
          <Tx x={246} y={868} s={22} c={C.dim} f="mono" o={ep(t, 11.6, 12.2)}>ffprobe start_time 0.025057 s = 1105 / 44100</Tx>
        </Layer>
      </Cam>
    </>
  );
};

/* 5. The arithmetic: an exploded bar drawn to scale */
const Sum: React.FC<SceneProps> = ({t}) => {
  const frames = Array.from({length: 41}, (_, k) => k * 1152);
  const zl = {x0: 240, x1: 860}, zr = {x0: 1060, x1: 1680};
  const ZL = (s: number) => zl.x0 + (s / 1105) * (zl.x1 - zl.x0);
  const ZR = (s: number) => zr.x0 + (s / 1404) * (zr.x1 - zr.x0);
  const pb = ep(t, 1.4, 3.4);
  return (
    <>
      <Head over="Header against decoder" title="Four numbers add up." color={C.green} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.024} dy={-4}>
        <Layer>
          <Tx x={X(0)} y={300} s={22} c={C.dim} f="mono" o={ep(t, 0.6, 1.2)}>40 frames x 1152 = 46080 decoded samples</Tx>
          {frames.map((f, k) => <line key={k} x1={X(f)} y1={316} x2={X(f)} y2={336} stroke={C.mute} strokeWidth={1.5} opacity={ep(t, 0.8 + k * 0.02, 1.2 + k * 0.02)} />)}
          <rect x={X(0)} y={340} width={(X(1105) - X(0))} height={74} fill={C.redDim} stroke={C.red} strokeWidth={2.5} opacity={ep(t, 2.4, 3.0)} />
          <rect x={X(1105)} y={340} width={(X(45205) - X(1105)) * pb} height={74} fill={C.greenDim} stroke={C.green} strokeWidth={2.5} opacity={pb > 0 ? 1 : 0} />
          <rect x={X(45205)} y={340} width={X(46080) - X(45205)} height={74} fill={C.amberDim} stroke={C.amber} strokeWidth={2.5} opacity={ep(t, 3.4, 4.0)} />
          <Tx x={(X(1105) + X(45205)) / 2} y={390} s={34} c={C.text} a="middle" f="display" w={800} ls={2} o={ep(t, 3.0, 3.6)}>44100 SAMPLES OF SOUND</Tx>
          <Tx x={X(0)} y={462} s={24} c={C.red} w={700} f="mono" o={ep(t, 3.0, 3.6)}>1105 skipped</Tx>
          <Tx x={X(46080)} y={462} s={24} c={C.amber} a="end" w={700} f="mono" o={ep(t, 3.8, 4.4)}>875 trimmed</Tx>
          <SampleAxis y={420} ticks={[]} o={0} />
          {/* leader lines from the two ends to the zoom bars */}
          <g opacity={ep(t, 5.0, 5.6)}>
            <line x1={X(0)} y1={472} x2={zl.x0} y2={560} stroke={C.mute} strokeWidth={1.5} strokeDasharray="5 5" />
            <line x1={X(1105)} y1={472} x2={zl.x1} y2={560} stroke={C.mute} strokeWidth={1.5} strokeDasharray="5 5" />
            <line x1={X(45205)} y1={472} x2={ZR(0)} y2={560} stroke={C.mute} strokeWidth={1.5} strokeDasharray="5 5" />
            <line x1={X(46080)} y1={472} x2={ZR(875)} y2={560} stroke={C.mute} strokeWidth={1.5} strokeDasharray="5 5" />
          </g>
          {/* left zoom: 1105 = 576 + 529 */}
          <g opacity={ep(t, 5.4, 6.0)}>
            <rect x={ZL(0)} y={566} width={ZL(576) - ZL(0)} height={56} fill={C.cyanDim} stroke={C.cyan} strokeWidth={2.5} />
            <rect x={ZL(576)} y={566} width={ZL(1105) - ZL(576)} height={56} fill={C.amberDim} stroke={C.amber} strokeWidth={2.5} />
            <Tx x={(ZL(0) + ZL(576)) / 2} y={602} s={26} c={C.text} a="middle" f="mono" w={700}>576</Tx>
            <Tx x={(ZL(576) + ZL(1105)) / 2} y={602} s={26} c={C.text} a="middle" f="mono" w={700}>529</Tx>
          </g>
          <Tx x={(ZL(0) + ZL(576)) / 2} y={660} s={21} c={C.cyan} a="middle" f="mono" o={ep(t, 6.2, 6.8)}>delay field</Tx>
          <Tx x={(ZL(576) + ZL(1105)) / 2} y={660} s={21} c={C.amber} a="middle" f="mono" o={ep(t, 6.6, 7.2)}>528 + 1</Tx>
          <Tx x={(ZL(576) + ZL(1105)) / 2} y={684} s={21} c={C.amber} a="middle" f="mono" o={ep(t, 6.6, 7.2)}>decoder</Tx>
          {/* right zoom: 1404 = 875 + 529 */}
          <g opacity={ep(t, 7.4, 8.0)}>
            <rect x={ZR(0)} y={566} width={ZR(875) - ZR(0)} height={56} fill={C.amberDim} stroke={C.amber} strokeWidth={2.5} />
            <rect x={ZR(875)} y={566} width={ZR(1404) - ZR(875)} height={56} fill={C.amberDim} stroke={C.amber} strokeWidth={2.5} strokeDasharray="7 5" />
            <Tx x={(ZR(0) + ZR(875)) / 2} y={602} s={26} c={C.text} a="middle" f="mono" w={700}>875</Tx>
            <Tx x={(ZR(875) + ZR(1404)) / 2} y={602} s={26} c={C.text} a="middle" f="mono" w={700}>529</Tx>
          </g>
          <Tx x={(ZR(0) + ZR(875)) / 2} y={660} s={21} c={C.amber} a="middle" f="mono" o={ep(t, 8.2, 8.8)}>trimmed</Tx>
          <Tx x={(ZR(875) + ZR(1404)) / 2} y={660} s={21} c={C.amber} a="middle" f="mono" o={ep(t, 8.6, 9.2)}>decoder</Tx>
          <Tx x={zr.x1} y={710} s={22} c={C.cyan} a="end" f="mono" w={700} o={ep(t, 9.0, 9.6)}>padding field 1404</Tx>
          <line x1={210} y1={742} x2={1710} y2={742} stroke={C.mute} strokeWidth={1} opacity={ep(t, 9.8, 10.4)} />
          <Tx x={240} y={786} s={30} c={C.text} f="mono" w={700} o={ep(t, 10.0, 10.6)}>46080 - 1105 - 875 = 44100</Tx>
          <Tx x={240} y={832} s={30} c={C.green} f="mono" w={700} o={ep(t, 11.0, 11.6)}>header alone: 46080 - 576 - 1404 = 44100</Tx>
        </Layer>
      </Cam>
    </>
  );
};

/* 6. Cutting a copy */
const CUTS: {label: string; start: number; note: string; color: 'green' | 'amber' | 'red'; at: number}[] = [
  {label: 're-encode, -ss 0.5', start: 22050, note: 'exact', color: 'green', at: 3.6},
  {label: 'copy, no tag', start: 21935, note: '115 early', color: 'amber', at: 5.0},
  {label: 'copy, tag, -ss before -i', start: 26031, note: '3981 late', color: 'red', at: 6.4},
  {label: 'copy, tag, -ss after -i', start: 27183, note: '5133 late', color: 'red', at: 7.8},
];
const Cut: React.FC<SceneProps> = ({t}) => {
  const k: HexKey[] = [{from: 21, len: 3, color: C.red, n: 1}];
  return (
    <>
      <Head over="Copy the cut · stream copy" title="The cut starts late." color={C.red} o={ep(t, 0.2, 0.8)} />
      <Cam t={t} z={0.022} dy={-4}>
        <Layer>
          <Plate x={210} y={308} w={1500} h={308} no="07" title="WHERE THE DECODE STARTS, IN SOURCE SAMPLES" tag="gaps.mp3 · 40 impulses" o={ep(t, 0.6, 1.2)} />
          {GAP_POS.map((p, i) => <line key={i} x1={X(p)} y1={342} x2={X(p)} y2={360} stroke={C.mute} strokeWidth={2} opacity={ep(t, 1.0 + i * 0.03, 1.4 + i * 0.03)} />)}
          <Tx x={240} y={358} s={20} c={C.dim} f="mono" o={ep(t, 1.0, 1.6)}>impulses</Tx>
          <line x1={X(22050)} y1={366} x2={X(22050)} y2={596} stroke={C.text} strokeWidth={2.5} strokeDasharray="8 6" opacity={ep(t, 2.2, 2.8)} />
          <Tx x={X(22050) - 12} y={394} s={24} c={C.text} a="end" f="mono" w={700} o={ep(t, 2.4, 3.0)}>asked: 22050</Tx>
          {CUTS.map((c, i) => {
            const y = 420 + i * 46, p = ep(t, c.at, c.at + 1.0);
            const col = C[c.color], dim = C[`${c.color}Dim`];
            return (
              <g key={c.label}>
                <Tx x={240} y={y + 25} s={23} c={col} w={700} o={ep(t, c.at - 0.2, c.at + 0.4)}>{c.label}</Tx>
                <rect x={X(c.start)} y={y} width={(X(44100) - X(c.start)) * p} height={34} fill={dim} stroke={col} strokeWidth={2.5} opacity={p > 0 ? 1 : 0} />
                <Tx x={X(c.start) + 14} y={y + 25} s={23} c={C.text} f="mono" w={700} o={p > 0.9 ? 1 : 0}>{`from ${c.start}: ${c.note}`}</Tx>
              </g>
            );
          })}
          <Plate x={210} y={672} w={1500} h={170} no="08" title="THE TAG OF THE COPY" tag="copyBefore5.mp3 · offset 186" o={ep(t, 9.0, 9.6)} />
          <Hex x={246} y={698} fs={22} start={HEX.cut.start} bytes={HEX.cut.bytes} keys={k} reveal={ep(t, 9.6, 10.6)} circ={ep(t, 10.8, 11.6)} o={ep(t, 9.0, 9.6)} />
          <Legend x={1290} y={694} s={21} gap={10} items={[
            {n: 1, color: C.red, title: 'delay and padding', lines: ['0xdef = 3567 delay', '3567 + 529 = 4096 dropped']},
          ]} o={ep(t, 11.4, 12.0)} />
        </Layer>
      </Cam>
    </>
  );
};

/* 7. What to check */
const Close: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {n: 1, color: C.red, name: 'no tag', rule: ['the decoder cannot know the delay,', 'it keeps all 46080 samples'], seen: ['impulse and tone 1105 late', 'CBR and VBR alike']},
    {n: 2, color: C.green, name: 'tag', rule: ['skips delay + 529, trims the', 'padding end, 44100 samples'], seen: ['impulse at 4410', 'ffprobe start 0.025057 s']},
    {n: 3, color: C.red, name: 'copy and cut', rule: ['whole frames, and the new tag', 'says delay 3567'], seen: ['3189 to 3981 late before -i', '5133 late after -i']},
    {n: 4, color: C.green, name: 're-encode', rule: ['a new encode writes a fresh', 'delay and padding'], seen: ['starts at 22050, exact', 'tag delay 576, padding 1566']},
  ];
  return (
    <>
      <Head over="What to check" title="Read the delay field." color={C.cyan} o={ep(t, 0.2, 0.9)} />
      <Cam t={t} z={0.02} dy={-4}>
        <Layer>
          <line x1={210} y1={300} x2={1710} y2={300} stroke={C.text} strokeWidth={2} opacity={ep(t, 0.8, 1.4)} />
          {rows.map((r, i) => {
            const y = 300 + i * 118, o = ep(t, 1.2 + i * 1.2, 1.9 + i * 1.2);
            return (
              <g key={r.n} opacity={o}>
                <Badge x={238} y={y + 59} n={r.n} color={r.color} r={20} />
                <Tx x={282} y={y + 70} s={42} c={C.text} f="display" w={800}>{r.name}</Tx>
                <Tx x={760} y={y + 52} s={24} c={C.dim}>{r.rule[0]}</Tx>
                <Tx x={760} y={y + 84} s={24} c={C.dim}>{r.rule[1]}</Tx>
                {r.seen.map((s, k) => <Tx key={k} x={1290} y={y + 52 + k * 32} s={22} c={r.color} f="mono" w={700}>{s}</Tx>)}
                <line x1={210} y1={y + 118} x2={1710} y2={y + 118} stroke={C.mute} strokeWidth={1} />
              </g>
            );
          })}
        </Layer>
      </Cam>
      <Mid y={800} size={26} color={C.mute} o={ep(t, 7.0, 7.6)}>Not tested: other builds, real players, other encoders, real music.</Mid>
      <Mid y={846} size={26} color={C.dim} o={ep(t, 8.0, 8.6)}>FFmpeg Reality Checks · episode 78 · fixture and tests in the description</Mid>
    </>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, raw: Raw, tag: Tag, sum: Sum, cut: Cut, close: Close};
