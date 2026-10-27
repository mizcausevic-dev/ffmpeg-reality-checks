import React from 'react';
import {C, F, D} from '../../kit/theme';
import {ep, prog} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/*
 * Production style: Vox flat graphics. Bold flat blocks of the lab inks, split screens, giant numbers, annotated rulers with the measured value flagged,
 * and labeled bars drawn to scale. Every number comes from episodes/ff94/fixture/experiment.mjs (a 200 Hz tone, ffmpeg 6.1.1, 60 outputs and 4 joins of 100 pieces).
 */
type K = 'cyan' | 'amber' | 'red' | 'green' | 'text' | 'bg2' | 'panel' | 'mute' | 'dim' | 'line';
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/* ---------- flat blocks (colors are read at render time) ---------- */
const Page: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, background: C.bg, overflow: 'hidden'}}>{children}</div>
);
const Blk: React.FC<{x: number; y: number; w: number; h: number; k: K; o?: number; dx?: number; outline?: boolean; children?: React.ReactNode}> = ({x, y, w, h, k, o = 1, dx = 0, outline = false, children}) => (
  <div style={{position: 'absolute', left: x + dx, top: y, width: w, height: h, background: outline ? 'transparent' : C[k], border: outline ? `6px solid ${C[k]}` : 'none', opacity: o, boxSizing: 'border-box'}}>{children}</div>
);
const Tag: React.FC<{text: string; color?: string; x?: number; y?: number; size?: number; w?: number; align?: 'left' | 'center' | 'right'; o?: number; keep?: boolean}> = ({text, color = C.bg, x = 28, y = 22, size = 26, w, align = 'left', o = 1, keep = false}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, textAlign: align, opacity: o, fontFamily: F.mono, fontSize: size, letterSpacing: keep ? 0 : 2, textTransform: keep ? 'none' : 'uppercase', color, whiteSpace: 'nowrap'}}>{text}</div>
);
const Giant: React.FC<{text: string; color?: string; size: number; x: number; y: number; w: number; align?: 'left' | 'center' | 'right'; o?: number}> = ({text, color = C.bg, size, x, y, w, align = 'center', o = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, textAlign: align, opacity: o, fontFamily: F.display, fontWeight: 900, fontSize: size * D.k * 0.8, lineHeight: 0.92, color, letterSpacing: 1, whiteSpace: 'nowrap'}}>{text}</div>
);
const Line: React.FC<{text: string; x: number; y: number; size?: number; color?: string; w?: number; align?: 'left' | 'center' | 'right'; mono?: boolean; o?: number; bold?: boolean}> = ({text, x, y, size = 36, color = C.text, w = 800, align = 'left', mono = false, o = 1, bold = false}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, textAlign: align, opacity: o, fontFamily: mono ? F.mono : F.sans, fontSize: size, fontWeight: bold ? 700 : 400, lineHeight: 1.22, color, whiteSpace: 'pre-wrap'}}>{text}</div>
);
const Svg: React.FC<{children: React.ReactNode}> = ({children}) => <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', left: 0, top: 0}}>{children}</svg>;
const Wipe: React.FC<{t: number; at: number; k?: K}> = ({t, at, k = 'text'}) => {
  if (t < at || t > at + 0.3) return null;
  return <div style={{position: 'absolute', top: 0, height: 1080, width: 300, left: lerp(-300, 1920, prog(t, at, at + 0.3)), background: C[k]}} />;
};
const Arrow: React.FC<{x1: number; y1: number; x2: number; y2: number; p: number; color?: string; sw?: number}> = ({x1, y1, x2, y2, p, color = C.text, sw = 7}) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx = (s: number) => [x2 - Math.cos(a + s) * 28, y2 - Math.sin(a + s) * 28];
  const h1 = hx(0.45), h2 = hx(-0.45);
  return (
    <Svg>
      <path d={`M${x1} ${y1} L${x2} ${y2}`} pathLength={1} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray="1" strokeDashoffset={1 - Math.min(1, p * 1.25)} />
      {p > 0.8 && <path d={`M${h1[0]} ${h1[1]} L${x2} ${y2} L${h2[0]} ${h2[1]}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity={prog(p, 0.8, 1)} />}
    </Svg>
  );
};

/* ---------- labeled bars drawn to scale ---------- */
type BarRow = {label: string; v: number; k: K; text: string};
const Bars: React.FC<{x: number; y: number; unit: number; rows: BarRow[]; rh?: number; t: number; at: number; labelW?: number; size?: number}> = ({x, y, unit, rows, rh = 64, t, at, labelW = 330, size = 28}) => (
  <>
    {rows.map((r, i) => {
      const p = ep(t, at + i * 0.5, at + i * 0.5 + 0.9);
      return (
        <div key={i} style={{position: 'absolute', left: x, top: y + i * rh, height: rh - 10, opacity: p > 0 ? 1 : 0}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: labelW - 16, height: rh - 10, lineHeight: `${rh - 10}px`, textAlign: 'right', fontFamily: F.mono, fontSize: size, color: C.text, whiteSpace: 'nowrap'}}>{r.label}</div>
          <div style={{position: 'absolute', left: labelW, top: 0, width: Math.max(r.v > 0 ? 6 : 0, r.v * unit * p), height: rh - 10, background: C[r.k]}} />
          <div style={{position: 'absolute', left: labelW + r.v * unit * p + 16, top: 0, lineHeight: `${rh - 10}px`, fontFamily: F.display, fontWeight: 900, fontSize: 42 * D.k * 0.8, color: C[r.k], opacity: p > 0.6 ? 1 : 0, whiteSpace: 'nowrap'}}>{r.text}</div>
        </div>
      );
    })}
  </>
);

/* ---------- a ruler of whole samples with the measured counts flagged ---------- */
const Ruler: React.FC<{x0: number; x1: number; y: number; ideal: number; swr: number; soxr: number; title: string; t: number; at: number}> = ({x0, x1, y, ideal, swr, soxr, title, t, at}) => {
  const lo = Math.floor(Math.min(ideal, swr, soxr)) - 1, hi = Math.ceil(Math.max(ideal, swr, soxr)) + 1, X = (v: number) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
  const p = ep(t, at, at + 0.7);
  const marks = Array.from({length: hi - lo + 1}, (_, i) => lo + i);
  return (
    <g opacity={p > 0 ? 1 : 0}>
      <text x={x0 - 40} y={y + 10} fontSize={30} fill={C.text} textAnchor="end" fontFamily={F.mono}>{title}</text>
      <rect x={x0} y={y - 5} width={(x1 - x0) * p} height={10} fill={C.text} />
      {marks.map((m) => (
        <g key={m} opacity={p}>
          <rect x={X(m) - 2} y={y - 16} width={4} height={32} fill={C.text} />
          <text x={X(m)} y={y + 52} fontSize={26} fill={C.dim} textAnchor="middle" fontFamily={F.mono}>{m}</text>
        </g>
      ))}
      <g opacity={ep(t, at + 0.9, at + 1.5)}>
        <circle cx={X(ideal)} cy={y} r={17} fill={C.red} />
        <text x={X(ideal)} y={y - 38} fontSize={28} fill={C.red} textAnchor="middle" fontFamily={F.mono} fontWeight={700}>{`ideal ${Math.round(ideal * 1000) / 1000}`}</text>
      </g>
      {(() => {
        const swrFirst = swr <= soxr, g = swr === soxr ? -12 : 40;
        return (
          <>
            <g opacity={ep(t, at + 1.7, at + 2.3)}>
              <rect x={X(swr) - 36} y={y + 70} width={36} height={12} fill={C.cyan} />
              <text x={swrFirst ? X(swr) + g : X(swr) - g} y={y + 122} fontSize={30} fill={C.cyan} textAnchor={swrFirst ? 'end' : 'start'} fontFamily={F.display} fontWeight={900}>{`aresample ${swr}`}</text>
            </g>
            <g opacity={ep(t, at + 2.5, at + 3.1)}>
              <rect x={X(soxr)} y={y + 70} width={36} height={12} fill={C.green} />
              <text x={swrFirst ? X(soxr) - g : X(soxr) + g} y={y + 122} fontSize={30} fill={C.green} textAnchor={swrFirst ? 'start' : 'end'} fontFamily={F.display} fontWeight={900}>{`soxr ${soxr}`}</text>
            </g>
          </>
        );
      })()}
    </g>
  );
};

/* 1. The question */
const Ask: React.FC<SceneProps> = ({t}) => {
  const slide = (a: number, d: number) => (1 - ep(t, a, a + 0.5)) * d;
  return (
    <Page>
      <Blk x={80} y={170} w={520} h={340} k="cyan" o={ep(t, 0, 0.3)} dx={slide(0, -90)}>
        <Tag text="samples in" y={22} x={30} />
        <Giant text="1000" size={210} x={0} y={78} w={520} />
        <Tag text="at 48000 Hz" y={282} x={0} w={520} align="center" size={28} />
      </Blk>
      <Blk x={700} y={170} w={520} h={340} k="amber" o={ep(t, 0.3, 0.6)}>
        <Tag text="rate ratio" y={22} x={30} />
        <Giant text="x 0.91875" size={118} x={0} y={110} w={520} />
        <Tag text="44100 / 48000" y={282} x={0} w={520} align="center" size={28} />
      </Blk>
      <Blk x={1320} y={170} w={520} h={340} k="red" o={ep(t, 0.6, 0.9)} dx={slide(0.6, 90)}>
        <Tag text="samples out" y={22} x={30} />
        <Giant text="918.75" size={150} x={0} y={96} w={520} />
        <Tag text="not a whole number" y={282} x={0} w={520} align="center" size={28} />
      </Blk>
      <Line text="A sample is whole. So which one comes out?" x={160} y={580} size={58} w={1600} align="center" bold o={ep(t, 3, 3.6)} />
      <Blk x={560} y={700} w={360} h={150} k="mute" o={ep(t, 5, 5.5)}><Giant text="918" size={120} x={0} y={26} w={360} /></Blk>
      <Blk x={1000} y={700} w={360} h={150} k="text" o={ep(t, 5.6, 6.1)}><Giant text="919" size={120} x={0} y={26} w={360} /></Blk>
      <Line text="or" x={920} y={742} size={44} w={80} align="center" color={C.dim} o={ep(t, 5.6, 6.1)} />
      <Wipe t={t} at={4.8} />
    </Page>
  );
};

/* 2. Control: one second */
const Source: React.FC<SceneProps> = ({t}) => {
  const cols = [{a: '48000', b: '44100', n: '44100', k: 'cyan' as K}, {a: '44100', b: '48000', n: '48000', k: 'amber' as K}, {a: '96000', b: '44100', n: '44100', k: 'green' as K}];
  return (
    <Page>
      {cols.map((c, i) => (
        <Blk key={i} x={80 + i * 600} y={150} w={560} h={300} k={c.k} o={ep(t, i * 0.5, i * 0.5 + 0.4)}>
          <Tag text={`${c.a} to ${c.b} Hz`} y={22} x={30} />
          <Giant text={c.n} size={190} x={0} y={70} w={560} />
          <Tag text="samples from 1.000 s" y={246} x={0} w={560} align="center" size={26} />
        </Blk>
      ))}
      <Line text="aresample, -ar and soxr: all exact" x={80} y={476} size={34} color={C.text} w={1700} o={ep(t, 2, 2.6)} bold />
      <Line text="Tone against the ideal sine, in LSB (16-bit units)" x={80} y={546} size={28} mono color={C.dim} w={1700} o={ep(t, 3.4, 4)} />
      <Bars x={80} y={596} unit={1.5} rows={[{label: 'this output', v: 1, k: 'green', text: '1'}, {label: 'one sample late', v: 456, k: 'red', text: '456'}]} t={t} at={4} labelW={330} />
      <Line text="raw bytes = wav data chunk = ffprobe duration_ts, on all 60 outputs" x={80} y={760} size={30} mono color={C.cyan} w={1760} o={ep(t, 7.5, 8.2)} />
      <Wipe t={t} at={3.3} />
    </Page>
  );
};

/* 3. Odd lengths */
const Counts: React.FC<SceneProps> = ({t}) => (
  <Page>
    <Line text="Whole samples out, flagged on a ruler" x={80} y={200} size={32} mono color={C.dim} w={1700} o={ep(t, 0.2, 0.8)} />
    <Svg>
      <Ruler x0={560} x1={1800} y={320} ideal={918.75} swr={919} soxr={919} title="1000 in" t={t} at={2} />
      <Ruler x0={560} x1={1800} y={540} ideal={1881.6} swr={1881} soxr={1882} title="2048 in" t={t} at={8} />
      <Ruler x0={560} x1={1800} y={760} ideal={1088.435} swr={1089} soxr={1088} title="1000 in, 44100 to 48000" t={t} at={13} />
    </Svg>
    <Line text="-ar = aresample: the same samples (md5) in 15 of 15 cases" x={80} y={150} size={28} mono color={C.cyan} w={1700} o={ep(t, 17.5, 18.1)} />
  </Page>
);

/* 4. Twenty samples */
const Tiny: React.FC<SceneProps> = ({t}) => {
  const rows = [['48000 to 44100', '18.375', '0', '18'], ['44100 to 48000', '21.769', '0', '22'], ['96000 to 44100', '9.188', '0', '9']];
  return (
    <Page>
      <Blk x={80} y={150} w={860} h={360} k="red" o={ep(t, 0.2, 0.6)} dx={(1 - ep(t, 0.2, 0.7)) * -100}>
        <Tag keep text="aresample: 20 samples in" y={24} x={30} />
        <Giant text="0" size={250} x={0} y={72} w={860} />
        <Tag text="empty wav, exit code 0" y={312} x={0} w={860} align="center" size={28} />
      </Blk>
      <Blk x={980} y={150} w={860} h={360} k="green" o={ep(t, 1.2, 1.6)} dx={(1 - ep(t, 1.2, 1.7)) * 100}>
        <Tag keep text="soxr: the same 20 samples" y={24} x={30} />
        <Giant text="18" size={250} x={0} y={72} w={860} />
        <Tag text="ideal 18.375" y={312} x={0} w={860} align="center" size={28} />
      </Blk>
      <Line text="direction" x={80} y={560} size={24} mono color={C.dim} w={400} o={ep(t, 3, 3.5)} />
      <Line text="ideal" x={560} y={560} size={24} mono color={C.dim} w={200} o={ep(t, 3, 3.5)} />
      <Line text="aresample" x={900} y={560} size={24} mono color={C.red} w={300} o={ep(t, 3, 3.5)} />
      <Line text="soxr" x={1300} y={560} size={24} mono color={C.green} w={300} o={ep(t, 3, 3.5)} />
      {rows.map((r, i) => (
        <React.Fragment key={i}>
          <Line text={r[0]} x={80} y={606 + i * 76} size={34} mono w={460} o={ep(t, 3.4 + i * 0.7, 4 + i * 0.7)} />
          <Line text={r[1]} x={560} y={606 + i * 76} size={34} mono color={C.dim} w={300} o={ep(t, 3.4 + i * 0.7, 4 + i * 0.7)} />
          <Line text={r[2]} x={900} y={598 + i * 76} size={52} color={C.red} bold w={300} o={ep(t, 3.4 + i * 0.7, 4 + i * 0.7)} />
          <Line text={r[3]} x={1300} y={598 + i * 76} size={52} color={C.green} bold w={300} o={ep(t, 3.4 + i * 0.7, 4 + i * 0.7)} />
        </React.Fragment>
      ))}
      <Wipe t={t} at={2.6} />
    </Page>
  );
};

/* 5. asetrate */
const Rate: React.FC<SceneProps> = ({t}) => (
  <Page>
    <Blk x={80} y={150} w={560} h={250} k="cyan" o={ep(t, 0, 0.4)}>
      <Tag text="in, 48000 Hz" y={22} x={30} />
      <Giant text="48000" size={140} x={0} y={60} w={560} />
      <Tag text="samples" y={204} x={0} w={560} align="center" size={26} />
    </Blk>
    <Blk x={700} y={150} w={560} h={250} k="amber" o={ep(t, 0.6, 1)}>
      <Tag keep text="asetrate=44100" y={22} x={30} />
      <Giant text="48000" size={140} x={0} y={60} w={560} />
      <Tag text="samples, none added or dropped" y={204} x={0} w={560} align="center" size={24} />
    </Blk>
    <Blk x={1320} y={150} w={520} h={250} k="green" o={ep(t, 1.4, 1.8)}>
      <Tag keep text="aresample=44100" y={22} x={30} />
      <Giant text="44100" size={140} x={0} y={60} w={520} />
      <Tag text="samples" y={204} x={0} w={520} align="center" size={26} />
    </Blk>
    <Line text="Duration, seconds" x={80} y={450} size={28} mono color={C.dim} w={900} o={ep(t, 3, 3.6)} />
    <Bars x={80} y={494} unit={640} rows={[{label: 'aresample', v: 1, k: 'green', text: '1.0000 s'}, {label: 'asetrate', v: 1.0884, k: 'amber', text: '1.0884 s'}]} t={t} at={3.6} labelW={260} />
    <Line text="Tone, hertz" x={80} y={640} size={28} mono color={C.dim} w={900} o={ep(t, 7, 7.6)} />
    <Bars x={80} y={684} unit={3.2} rows={[{label: 'aresample', v: 200, k: 'green', text: '200 Hz'}, {label: 'asetrate', v: 183.75, k: 'amber', text: '183.75 Hz'}]} t={t} at={7.6} labelW={260} />
    <Wipe t={t} at={2.8} />
  </Page>
);

/* 6. A hundred pieces */
const Join: React.FC<SceneProps> = ({t}) => {
  const x0 = 130, x1 = 1000, y0 = 700, y1 = 250; // chart: piece index 0..100, extra samples 0..25
  const X = (k: number) => x0 + (k / 100) * (x1 - x0), Y = (v: number) => y0 - (v / 25) * (y0 - y1);
  const drawn = Math.round(100 * ep(t, 2, 9));
  const pts = Array.from({length: drawn + 1}, (_, k) => `${X(k)},${Y((919 - 918.75) * k)}`).join(' ');
  return (
    <Page>
      <Line text="Extra samples after k pieces (919 out each, 918.75 ideal)" x={80} y={150} size={24} mono color={C.dim} w={1000} o={ep(t, 0.2, 0.8)} />
      <Svg>
        <g opacity={ep(t, 0.4, 1)}>
          <line x1={x0} y1={y0} x2={x1} y2={y0} stroke={C.text} strokeWidth={4} />
          <line x1={x0} y1={y0} x2={x0} y2={y1 - 20} stroke={C.text} strokeWidth={4} />
          {[0, 25, 50, 75, 100].map((k) => <g key={k}><line x1={X(k)} y1={y0} x2={X(k)} y2={y0 + 12} stroke={C.text} strokeWidth={3} /><text x={X(k)} y={y0 + 48} fontSize={26} fill={C.dim} textAnchor="middle" fontFamily={F.mono}>{k}</text></g>)}
          {[0, 5, 10, 15, 20, 25].map((v) => <g key={v}><line x1={x0 - 12} y1={Y(v)} x2={x0} y2={Y(v)} stroke={C.text} strokeWidth={3} /><text x={x0 - 22} y={Y(v) + 9} fontSize={26} fill={C.dim} textAnchor="end" fontFamily={F.mono}>{v}</text></g>)}
          <text x={x1} y={y0 + 90} fontSize={26} fill={C.dim} textAnchor="end" fontFamily={F.mono}>pieces joined</text>
        </g>
        <polyline points={pts} fill="none" stroke={C.red} strokeWidth={8} strokeLinejoin="round" />
        <g opacity={ep(t, 23, 23.6)}>
          <line x1={x0} y1={Y(0)} x2={x1} y2={Y(0)} stroke={C.green} strokeWidth={8} />
          <text x={x1 - 10} y={Y(0) - 18} fontSize={28} fill={C.green} textAnchor="end" fontFamily={F.mono} fontWeight={700}>4800-sample pieces: 0</text>
        </g>
        <g opacity={ep(t, 9, 9.6)}>
          <circle cx={X(100)} cy={Y(25)} r={14} fill={C.red} />
          <text x={X(100) - 24} y={Y(25) + 10} fontSize={34} fill={C.red} textAnchor="end" fontFamily={F.display} fontWeight={900}>+25 at 100</text>
        </g>
      </Svg>
      <Blk x={1100} y={170} w={740} h={190} k="red" o={ep(t, 10, 10.5)}>
        <Tag text="100 pieces, each 919" y={20} x={28} />
        <Giant text="91900" size={130} x={0} y={60} w={740} />
      </Blk>
      <Blk x={1100} y={390} w={740} h={190} k="green" o={ep(t, 14.5, 15)}>
        <Tag text="the whole signal at once" y={20} x={28} />
        <Giant text="91875" size={130} x={0} y={60} w={740} />
      </Blk>
      <Blk x={1100} y={610} w={740} h={150} k="amber" o={ep(t, 18, 18.5)}>
        <Tag text="drift" y={18} x={28} />
        <Giant text="25 = 0.567 ms" size={80} x={0} y={64} w={740} />
      </Blk>
      <Line text="tone at the end: 561 us late" x={1100} y={792} size={30} mono color={C.red} w={740} o={ep(t, 20.5, 21.1)} bold />
      <Wipe t={t} at={9.8} />
    </Page>
  );
};

/* 7. What to do */
const Close: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {k: 'green' as K, n: '1', big: 'Resample once', sub: 'on the whole signal: 91875, on time'},
    {k: 'cyan' as K, n: '2', big: 'Or cut at exact ratios', sub: '4800 in gives 4410 out, 100 pieces drift 0'},
    {k: 'red' as K, n: '3', big: 'Count what comes out', sub: 'an ideal of 918.75 gave 919, 1881.6 gave 1881'},
  ];
  return (
    <Page>
      {rows.map((r, i) => (
        <Blk key={i} x={80} y={160 + i * 200} w={1760} h={176} k={r.k} o={ep(t, 0.4 + i * 1.2, 1 + i * 1.2)} dx={(1 - ep(t, 0.4 + i * 1.2, 1.1 + i * 1.2)) * -120}>
          <Giant text={r.n} size={170} x={20} y={14} w={150} />
          <Giant text={r.big} size={92} x={190} y={20} w={1500} align="left" />
          <Tag text={r.sub} y={118} x={196} size={30} />
        </Blk>
      ))}
      <Line text="Not tested: other builds, other tools, stereo, real recordings." x={80} y={780} size={30} color={C.dim} w={1760} o={ep(t, 5.4, 6)} />
    </Page>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, counts: Counts, tiny: Tiny, rate: Rate, join: Join, close: Close};
