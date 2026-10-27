import React from 'react';
import {C, F} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Mid} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff85/fixture/experiment.mjs (evidence.json from fixture/run.mjs). ffmpeg 6.1.1.
   Production style: editorial collage. Cut-out paper pieces with torn edges (SVG turbulence plus displacement), masking tape, paper grain,
   type printed twice with a small misregistration. The pixel strips are the real decoded pixels: one cell per pixel, filled by the parity of its 8 bit value.
   Local components only; palette lab through C.* keys. */

/*DATA-START*/
const DATA = {"strip":{"default":[[96,96,96,96,96,96,96,96,96,97,96,97,97,97,97,97,97,97,97,97,97,97,97,97,97,98,97,98,98,98,98,98,98,98,98,98,98,98,98,98,98,99,98,99,99,99,99,99,99,99,99,99,99,99,99,99,99,100,99,100,100,100,100,100,100,100,100,100,100,100,100,100,100,101,100,101,101,101,101,101,101,101,101,101,101,101,101,101,101,102,101,102,102,102,102,102,102,102,102,102,102,102,102,102,102,103,102,103,103,103,103,103,103,103,103,103,103,103,103,103,103,104,103,104,104,104,104,104],[96,96,96,96,97,96,97,96,97,96,97,96,97,96,97,96,97,97,97,97,98,97,98,97,98,97,98,97,98,97,98,97,98,98,98,98,99,98,99,98,99,98,99,98,99,98,99,98,99,99,99,99,100,99,100,99,100,99,100,99,100,99,100,99,100,100,100,100,101,100,101,100,101,100,101,100,101,100,101,100,101,101,101,101,102,101,102,101,102,101,102,101,102,101,102,101,102,102,102,102,103,102,103,102,103,102,103,102,103,102,103,102,103,103,103,103,104,103,104,103,104,103,104,103,104,103,104,103],[96,96,96,96,96,96,96,96,96,97,96,97,97,97,97,97,97,97,97,97,97,97,97,97,97,98,97,98,98,98,98,98,98,98,98,98,98,98,98,98,98,99,98,99,99,99,99,99,99,99,99,99,99,99,99,99,99,100,99,100,100,100,100,100,100,100,100,100,100,100,100,100,100,101,100,101,101,101,101,101,101,101,101,101,101,101,101,101,101,102,101,102,102,102,102,102,102,102,102,102,102,102,102,102,102,103,102,103,103,103,103,103,103,103,103,103,103,103,103,103,103,104,103,104,104,104,104,104],[96,96,96,96,97,96,97,96,97,96,97,96,97,96,97,96,97,97,97,97,98,97,98,97,98,97,98,97,98,97,98,97,98,98,98,98,99,98,99,98,99,98,99,98,99,98,99,98,99,99,99,99,100,99,100,99,100,99,100,99,100,99,100,99,100,100,100,100,101,100,101,100,101,100,101,100,101,100,101,100,101,101,101,101,102,101,102,101,102,101,102,101,102,101,102,101,102,102,102,102,103,102,103,102,103,102,103,102,103,102,103,102,103,103,103,103,104,103,104,103,104,103,104,103,104,103,104,103]],"none":[[96,96,96,96,96,96,96,96,96,96,96,96,96,96,96,96,97,97,97,97,97,97,97,97,97,97,97,97,97,97,97,97,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,101,101,101,101,101,101,101,101,101,101,101,101,101,101,101,101,102,102,102,102,102,102,102,102,102,102,102,102,102,102,102,102,103,103,103,103,103,103,103,103,103,103,103,103,103,103,103,103],[96,96,96,96,96,96,96,96,96,96,96,96,96,96,96,96,97,97,97,97,97,97,97,97,97,97,97,97,97,97,97,97,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,101,101,101,101,101,101,101,101,101,101,101,101,101,101,101,101,102,102,102,102,102,102,102,102,102,102,102,102,102,102,102,102,103,103,103,103,103,103,103,103,103,103,103,103,103,103,103,103],[96,96,96,96,96,96,96,96,96,96,96,96,96,96,96,96,97,97,97,97,97,97,97,97,97,97,97,97,97,97,97,97,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,101,101,101,101,101,101,101,101,101,101,101,101,101,101,101,101,102,102,102,102,102,102,102,102,102,102,102,102,102,102,102,102,103,103,103,103,103,103,103,103,103,103,103,103,103,103,103,103],[96,96,96,96,96,96,96,96,96,96,96,96,96,96,96,96,97,97,97,97,97,97,97,97,97,97,97,97,97,97,97,97,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,98,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,101,101,101,101,101,101,101,101,101,101,101,101,101,101,101,101,102,102,102,102,102,102,102,102,102,102,102,102,102,102,102,102,103,103,103,103,103,103,103,103,103,103,103,103,103,103,103,103]]},"lo":384,"modes":{"default":{"md5":"6b3cbff3","distinct":65,"meanRun":5.31,"maxRun":14,"bias":0,"blockMaxErr":0,"rms":0.395,"maxErr":0.75},"auto":{"md5":"6b3cbff3","distinct":65,"meanRun":5.31,"maxRun":14,"bias":0,"blockMaxErr":0,"rms":0.395,"maxErr":0.75},"none":{"md5":"bd08502c","distinct":64,"meanRun":16,"maxRun":16,"bias":-0.375,"blockMaxErr":0.75,"rms":0.468,"maxErr":0.75},"bayer":{"md5":"6b3cbff3","distinct":65,"meanRun":5.31,"maxRun":14,"bias":0,"blockMaxErr":0,"rms":0.395,"maxErr":0.75},"ed":{"md5":"6b3cbff3","distinct":65,"meanRun":5.31,"maxRun":14,"bias":0,"blockMaxErr":0,"rms":0.395,"maxErr":0.75},"a_dither":{"md5":"6b3cbff3","distinct":65,"meanRun":5.31,"maxRun":14,"bias":0,"blockMaxErr":0,"rms":0.395,"maxErr":0.75},"x_dither":{"md5":"6b3cbff3","distinct":65,"meanRun":5.31,"maxRun":14,"bias":0,"blockMaxErr":0,"rms":0.395,"maxErr":0.75},"flag_ed":{"md5":"6b3cbff3","distinct":65,"meanRun":5.31,"maxRun":14,"bias":0,"blockMaxErr":0,"rms":0.395,"maxErr":0.75}},"classes":[["default","auto","bayer","ed","a_dither","x_dither","flag_ed"],["none"]],"rgb8":{"default":{"md5":"bb2be159","distinct":8},"auto":{"md5":"bb2be159","distinct":8},"none":{"md5":"288ec0ca","distinct":4},"bayer":{"md5":"bb2be159","distinct":8},"ed":{"md5":"26ab993b","distinct":8},"a_dither":{"md5":"fb6a5063","distinct":20},"x_dither":{"md5":"5cefcd70","distinct":24},"flag_ed":{"md5":"26ab993b","distinct":8}},"rgb8Classes":[["default","auto","bayer"],["none"],["ed","flag_ed"],["a_dither"],["x_dither"]],"full":{"default":{"distinct":256},"none":{"distinct":256},"ed":{"distinct":256}},"tiles":[[0,0,0,0],[0,0,1,0],[0,1,1,0],[1,1,1,0]],"tileUp":[0,64,128,192],"control":{"distinct":256,"mismatches":0}} as const;
/*DATA-END*/

/* ---------- local components ---------- */
type TxProps = {x: number; y: number; s?: number; c?: string; w?: number; a?: 'start' | 'middle' | 'end'; f?: 'sans' | 'mono' | 'display'; ls?: number; o?: number; children: React.ReactNode};
const Tx: React.FC<TxProps> = ({x, y, s = 24, c = C.text, w = 400, a = 'start', f = 'sans', ls = 0, o = 1, children}) => (
  <text x={x} y={y} fontSize={s} fill={c} fontWeight={w} textAnchor={a} fontFamily={F[f]} letterSpacing={ls} opacity={o}>{children}</text>
);
/* type printed twice: a madder plate a few pixels off register under the ink plate */
const Reg: React.FC<TxProps & {dx?: number; dy?: number; plate?: string}> = ({dx = 4, dy = 3, plate = C.red, o = 1, ...p}) => (
  <g>
    <Tx {...p} x={p.x + dx} y={p.y + dy} c={plate} o={0.55 * o} />
    <Tx {...p} o={o} />
  </g>
);
const TORN = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const Layer: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', left: 0, top: 0}}>
    <defs>
      {TORN.map((s) => (
        <filter key={s} id={`torn${s}`} x="-6%" y="-8%" width="112%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.026 0.045" numOctaves={3} seed={s * 7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={15} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      ))}
      <filter id="grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={4} result="t" />
        <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 -0.5" result="a" />
        <feFlood floodColor={C.text} result="f" />
        <feComposite in="f" in2="a" operator="in" />
      </filter>
    </defs>
    {children}
    <rect x={0} y={0} width={1920} height={1080} filter="url(#grain)" opacity={0.4} />
  </svg>
);
const Paper: React.FC<{x: number; y: number; w: number; h: number; rot?: number; seed?: number; fill?: string; under?: string; o?: number; children?: React.ReactNode}> = ({x, y, w, h, rot = 0, seed = 1, fill = C.bg2, under = C.line, o = 1, children}) => (
  <g opacity={o} transform={`translate(${x} ${y}) rotate(${rot} ${w / 2} ${h / 2})`}>
    <rect x={6} y={8} width={w} height={h} fill={under} filter={`url(#torn${(seed % 9) + 1})`} />
    <rect width={w} height={h} fill={fill} filter={`url(#torn${seed})`} />
    {children}
  </g>
);
const Tape: React.FC<{x: number; y: number; rot?: number; w?: number; h?: number; o?: number}> = ({x, y, rot = 0, w = 120, h = 36, o = 1}) => {
  const z = h / 4;
  const pts = `0,0 ${w},0 ${w - 6},${z} ${w},${2 * z} ${w - 6},${3 * z} ${w},${h} 0,${h} 6,${3 * z} 0,${2 * z} 6,${z}`;
  return <g opacity={o} transform={`translate(${x} ${y}) rotate(${rot}) translate(${-w / 2} ${-h / 2})`}><polygon points={pts} fill={C.amberDim} opacity={0.85} stroke={C.amber} strokeWidth={1} /></g>;
};
/* title: a kicker label and the title on taped slips, set twice off register */
const Title: React.FC<{kick: string; title: string; color: string; o?: number; seed?: number}> = ({kick, title, color, o = 1, seed = 1}) => {
  const w = Math.round(title.length * 37 + 110), x = 960 - w / 2;
  return (
    <Layer>
      <g opacity={o}>
        <Paper x={x} y={170} w={w} h={104} rot={-0.6} seed={seed} fill={C.bg2}>
          <Reg x={w / 2} y={82} s={90} w={800} a="middle" f="display" ls={0.4} c={C.text} dx={5} dy={3}>{title}</Reg>
        </Paper>
        <Paper x={x - 18} y={124} w={kick.length * 15 + 56} h={42} rot={-2} seed={seed + 2} fill={C.panel}>
          <Tx x={28} y={29} s={22} f="mono" w={700} ls={2} c={color}>{kick}</Tx>
        </Paper>
        <Tape x={x + w - 26} y={178} rot={32} w={96} h={32} />
      </g>
    </Layer>
  );
};
/* the real decoded pixels: one cell per pixel, rows 0 to 3, pixels 0 to 127; the fill is the parity of the 8 bit value, so a flat band is one solid block */
const PixelStrip: React.FC<{x: number; y: number; rows: readonly (readonly number[])[]; cw?: number; ch?: number; p?: number; o?: number}> = ({x, y, rows, cw = 10.5, ch = 14, p = 1, o = 1}) => {
  const n = Math.round(128 * p);
  return (
    <g opacity={o}>
      {rows.map((row, r) => row.slice(0, n).map((v, i) => <rect key={`${r}-${i}`} x={x + i * cw} y={y + r * ch} width={cw + 0.4} height={ch + 0.4} fill={v % 2 ? C.amber : C.cyan} />))}
      <rect x={x} y={y} width={128 * cw} height={4 * ch} fill="none" stroke={C.text} strokeWidth={2} />
    </g>
  );
};
/* the 2 x 2 dither cell: a filled dot is a pixel that stepped up one level */
const Cell: React.FC<{x: number; y: number; bits: readonly number[]; r?: number; o?: number}> = ({x, y, bits, r = 20, o = 1}) => (
  <g opacity={o}>
    <rect x={x - 6} y={y - 6} width={r * 4 + 12} height={r * 4 + 12} fill="none" stroke={C.text} strokeWidth={2} />
    {bits.map((b, i) => <circle key={i} cx={x + r + (i % 2) * 2 * r} cy={y + r + Math.floor(i / 2) * 2 * r} r={b ? r * 0.86 : r * 0.3} fill={b ? C.red : C.mute} />)}
  </g>
);
/* a labelled slip with a fingerprint */
const Slip: React.FC<{x: number; y: number; w?: number; label: string; hash: string; color: string; rot?: number; seed?: number; o?: number; fill?: string}> = ({x, y, w = 360, label, hash, color, rot = 0, seed = 1, o = 1, fill = C.bg2}) => (
  <Paper x={x} y={y} w={w} h={64} rot={rot} seed={seed} fill={fill} o={o}>
    <rect x={0} y={0} width={10} height={64} fill={color} />
    <Tx x={26} y={29} s={20} f="mono" w={700} c={C.text}>{label}</Tx>
    <Tx x={26} y={52} s={19} f="mono" c={C.dim}>{`md5 ${hash}`}</Tx>
  </Paper>
);
const f1 = (v: number) => v.toFixed(1);

/* ---------- 1. the question ---------- */
const Ask: React.FC<SceneProps> = ({t}) => {
  const X0 = 300, X1 = 1620, YB = 590, YT = 400, PX = 128;
  const sx = (x: number) => X0 + (x / PX) * (X1 - X0);
  const v10 = (x: number) => DATA.lo + (x >> 2);
  const sy = (v: number) => YB - ((v - DATA.lo) / 32) * (YB - YT);
  const p = ep(t, 1.6, 6.0);
  const n10 = Math.round(32 * p), n8 = Math.round(8 * p);
  const d10 = Array.from({length: n10}, (_, k) => `${k ? 'L' : 'M'} ${sx(k * 4)} ${sy(v10(k * 4))} L ${sx(k * 4 + 4)} ${sy(v10(k * 4))}`).join(' ');
  const d8 = Array.from({length: n8}, (_, k) => { const x0 = k * 16, lv = (v10(x0) >> 2) << 2; return `${k ? 'L' : 'M'} ${sx(x0)} ${sy(lv)} L ${sx(x0 + 16)} ${sy(lv)}`; }).join(' ');
  return (
    <>
      <Title kick="ten bit in, eight bit out" title="Does the gradient band?" color={C.red} o={ep(t, 0.2, 0.9)} seed={1} />
      <Layer>
        <Paper x={220} y={310} w={1480} h={330} rot={-0.3} seed={2} o={ep(t, 1.0, 1.8)}>
          <Tx x={30} y={44} s={22} f="mono" w={700} c={C.cyan}>10 bit ramp: one level every 4 pixels</Tx>
          <Tx x={30} y={78} s={22} f="mono" w={700} c={C.red}>no dither, 6.1.1: one level every 16 pixels</Tx>
        </Paper>
        <path d={d10} fill="none" stroke={C.cyan} strokeWidth={3.5} />
        <path d={d8} fill="none" stroke={C.red} strokeWidth={6} />
        <g opacity={ep(t, 6.4, 7.2)}>
          <Tx x={X0} y={620} s={20} f="mono" c={C.dim}>pixel 0</Tx>
          <Tx x={X1} y={620} s={20} f="mono" c={C.dim} a="end">pixel 127, of 1023</Tx>
        </g>
        <g opacity={ep(t, 8.2, 9.2)}>
          <Paper x={620} y={690} w={680} h={72} rot={0.8} seed={3} fill={C.panel}>
            <Tx x={340} y={48} s={32} f="mono" w={700} a="middle" c={C.cyan}>-vf format=yuv420p</Tx>
          </Paper>
          <Tape x={640} y={694} rot={-20} w={90} h={30} />
        </g>
        <g opacity={ep(t, 11.0, 12.0)}>
          <Paper x={1330} y={680} w={330} h={104} rot={-1.4} seed={4} fill={C.amberDim}>
            <Reg x={165} y={72} s={64} w={800} a="middle" f="display" c={C.text} dx={4} dy={3}>? ? ?</Reg>
          </Paper>
        </g>
        <Tx x={960} y={836} s={22} f="mono" a="middle" c={C.dim} o={ep(t, 13.0, 13.8)}>does it dither, and do sws_dither and error_diffusion matter?</Tx>
      </Layer>
    </>
  );
};

/* ---------- 2. readers and controls ---------- */
const Rig: React.FC<SceneProps> = ({t}) => (
  <>
    <Title kick="two readers, two controls" title="Who reads the bytes?" color={C.cyan} o={ep(t, 0.2, 0.9)} seed={2} />
    <Layer>
      <g opacity={ep(t, 1.6, 2.6)}>
        <Paper x={190} y={310} w={720} h={250} rot={-0.7} seed={3}>
          <Tx x={28} y={46} s={30} w={700} c={C.cyan}>reader 1: Node</Tx>
          <Tx x={28} y={78} s={21} f="mono" c={C.dim}>the raw Y plane, byte by byte</Tx>
          <Tx x={28} y={122} s={24} f="mono" c={C.text}>distinct values</Tx>
          <Tx x={28} y={156} s={24} f="mono" c={C.text}>run lengths</Tx>
          <Tx x={28} y={190} s={24} f="mono" c={C.text}>error against value/4</Tx>
          <Tx x={28} y={224} s={24} f="mono" c={C.text}>error of each 2 x 2 mean</Tx>
        </Paper>
        <Tape x={470} y={316} rot={-3} w={110} h={32} />
      </g>
      <g opacity={ep(t, 5.0, 6.0)}>
        <Paper x={1010} y={310} w={720} h={250} rot={0.6} seed={4}>
          <Tx x={28} y={46} s={30} w={700} c={C.cyan}>reader 2: ffmpeg</Tx>
          <Tx x={28} y={78} s={21} f="mono" c={C.dim}>a second run over the same file</Tx>
          <Tx x={28} y={122} s={24} f="mono" c={C.text}>framemd5 of the output</Tx>
          <Tx x={28} y={156} s={24} f="mono" c={C.text}>extractplanes=y</Tx>
          <Tx x={28} y={190} s={24} f="mono" c={C.text}>scale with flags=area</Tx>
          <Tx x={28} y={224} s={24} f="mono" c={C.text}>2 x 2 means as gray16le</Tx>
        </Paper>
        <Tape x={1370} y={316} rot={4} w={110} h={32} />
      </g>
      <g opacity={ep(t, 9.6, 10.6)}>
        <Paper x={190} y={600} w={720} h={236} rot={0.5} seed={5} fill={C.greenDim}>
          <Tx x={28} y={46} s={30} w={700} c={C.green}>control: 10 bit to 10 bit</Tx>
          <Reg x={28} y={150} s={96} w={800} f="display" c={C.text}>{`${DATA.control.distinct} levels kept`}</Reg>
          <Tx x={28} y={198} s={21} f="mono" c={C.text}>{`${DATA.control.mismatches} pixels differ from the stimulus`}</Tx>
        </Paper>
        <Tape x={560} y={606} rot={2} w={110} h={32} />
      </g>
      <g opacity={ep(t, 13.2, 14.2)}>
        <Paper x={1010} y={600} w={720} h={236} rot={-0.5} seed={6} fill={C.redDim}>
          <Tx x={28} y={46} s={30} w={700} c={C.red}>known positive: rgb8 output</Tx>
          <Tx x={28} y={100} s={24} f="mono" c={C.text}>the same dither options, a</Tx>
          <Tx x={28} y={134} s={24} f="mono" c={C.text}>destination where they act</Tx>
          <Tx x={28} y={190} s={24} f="mono" w={700} c={C.text}>shown further on</Tx>
        </Paper>
        <Tape x={1400} y={606} rot={-3} w={110} h={32} />
      </g>
    </Layer>
  </>
);

/* ---------- 3. the default ---------- */
const Default: React.FC<SceneProps> = ({t}) => {
  const m = DATA.modes.default;
  return (
    <>
      <Title kick="format=yuv420p, nothing else" title="It already dithers." color={C.green} o={ep(t, 0.2, 0.9)} seed={3} />
      <Layer>
        <Paper x={250} y={300} w={1420} h={160} rot={-0.3} seed={4} o={ep(t, 1.0, 1.8)}>
          <Tx x={30} y={36} s={20} f="mono" c={C.dim}>decoded pixels 0 to 127, rows 0 to 3: indigo even value, ochre odd value</Tx>
        </Paper>
        <PixelStrip x={285} y={348} rows={DATA.strip.default} p={ep(t, 1.8, 5.0)} />
        <g opacity={ep(t, 5.6, 6.4)}>
          <Tx x={285} y={434} s={20} f="mono" c={C.cyan}>band edges are speckled, not cut</Tx>
        </g>
        <Paper x={250} y={520} w={640} h={330} rot={0.5} seed={5} fill={C.panel} o={ep(t, 6.4, 7.2)}>
          <Tx x={30} y={42} s={24} f="mono" w={700} c={C.red}>the dither cell is 2 x 2</Tx>
          {[1, 2, 3].map((k) => (
            <g key={k} opacity={ep(t, 7.4 + k * 1.3, 8.2 + k * 1.3)}>
              <Cell x={46 + (k - 1) * 200} y={92} bits={DATA.tiles[k]} />
              <Tx x={46 + (k - 1) * 200 + 40} y={226} s={22} f="mono" a="middle" c={C.text}>{`100.${['25', '5', '75'][k - 1]}`}</Tx>
              <Tx x={46 + (k - 1) * 200 + 40} y={256} s={20} f="mono" a="middle" c={C.dim}>{`${k} of 4 up`}</Tx>
            </g>
          ))}
          <Tx x={30} y={304} s={20} f="mono" c={C.dim}>flat 10 bit tiles, one pattern repeated</Tx>
        </Paper>
        <Tape x={290} y={526} rot={-24} w={90} h={30} />
        <g opacity={ep(t, 12.0, 13.0)}>
          <Paper x={960} y={520} w={710} h={330} rot={-0.4} seed={6}>
            <Reg x={30} y={106} s={96} w={800} f="display" c={C.text}>{`${m.distinct} values`}</Reg>
            <Tx x={30} y={146} s={22} f="mono" c={C.dim}>not 64: one level past the last band</Tx>
            <Reg x={30} y={232} s={96} w={800} f="display" c={C.text}>{`${m.meanRun.toFixed(1)} px runs`}</Reg>
            <Tx x={30} y={272} s={22} f="mono" c={C.dim}>mean run in row 0, instead of 16</Tx>
            <Tx x={30} y={314} s={26} f="mono" w={700} c={C.green}>{`2 x 2 mean error ${m.blockMaxErr.toFixed(3)}`}</Tx>
          </Paper>
          <Tape x={1320} y={526} rot={4} w={110} h={32} />
        </g>
      </Layer>
    </>
  );
};

/* ---------- 4. dither off ---------- */
const Bar: React.FC<{x: number; y: number; w: number; label: string; v: number; max: number; color: string; shown: string; p: number}> = ({x, y, w, label, v, max, color, shown, p}) => (
  <g>
    <Tx x={x} y={y - 8} s={20} f="mono" c={C.dim}>{label}</Tx>
    <rect x={x} y={y} width={Math.max(3, (Math.abs(v) / max) * w * p)} height={26} fill={color} stroke={C.text} strokeWidth={1.5} />
    <Tx x={x + Math.max(3, (Math.abs(v) / max) * w * p) + 12} y={y + 22} s={22} f="mono" w={700} c={C.text} o={p > 0.9 ? 1 : 0}>{shown}</Tx>
  </g>
);
const None: React.FC<SceneProps> = ({t}) => {
  const d = DATA.modes.default, n = DATA.modes.none;
  const p1 = ep(t, 10.4, 12.0);
  return (
    <>
      <Title kick="sws_dither=none" title="Dither off: 64 bands." color={C.red} o={ep(t, 0.2, 0.9)} seed={4} />
      <Layer>
        <Paper x={250} y={300} w={1420} h={176} rot={0.3} seed={5} o={ep(t, 1.0, 1.8)}>
          <Tx x={30} y={36} s={20} f="mono" c={C.dim}>same pixels, rows 0 to 3: every band is one solid block of 16</Tx>
        </Paper>
        <PixelStrip x={285} y={348} rows={DATA.strip.none} p={ep(t, 1.8, 5.0)} />
        <g opacity={ep(t, 5.6, 6.4)}>
          <Tx x={285} y={434} s={20} f="mono" c={C.red}>6.1.1: every level is value / 4, floored</Tx>
        </g>
        <Paper x={250} y={520} w={760} h={330} rot={-0.4} seed={6} fill={C.panel} o={ep(t, 6.8, 7.6)}>
          <Tx x={30} y={42} s={24} f="mono" w={700} c={C.red}>default against none</Tx>
          <Bar x={30} y={96} w={420} label="default: mean run in row 0 (px)" v={d.meanRun} max={16} color={C.greenDim} shown={f1(d.meanRun)} p={ep(t, 8.0, 9.4)} />
          <Bar x={30} y={150} w={420} label="none" v={n.meanRun} max={16} color={C.redDim} shown={f1(n.meanRun)} p={ep(t, 8.6, 10.0)} />
          <Bar x={30} y={228} w={420} label="default: 2 x 2 mean error (levels)" v={d.blockMaxErr} max={0.75} color={C.greenDim} shown={d.blockMaxErr.toFixed(3)} p={p1} />
          <Bar x={30} y={282} w={420} label="none" v={n.blockMaxErr} max={0.75} color={C.redDim} shown={n.blockMaxErr.toFixed(3)} p={ep(t, 11.0, 12.4)} />
          </Paper>
        <Tape x={290} y={526} rot={-24} w={90} h={30} />
        <g opacity={ep(t, 13.0, 14.0)}>
          <Paper x={1060} y={520} w={610} h={330} rot={0.5} seed={7}>
            <Reg x={30} y={106} s={96} w={800} f="display" c={C.text}>{`${n.distinct} values`}</Reg>
            <Tx x={30} y={146} s={22} f="mono" c={C.dim}>6.1.1 runs of 16. 8.1.2 rounds: 65 values</Tx>
            <Reg x={30} y={232} s={96} w={800} f="display" c={C.red} plate={C.text}>{`${n.bias.toFixed(3)}`}</Reg>
            <Tx x={30} y={272} s={22} f="mono" c={C.dim}>6.1.1 floored. 8.1.2 rounded: +0.125</Tx>
            <Tx x={30} y={314} s={26} f="mono" w={700} c={C.red}>one byte per band</Tx>
          </Paper>
          <Tape x={1400} y={526} rot={4} w={110} h={32} />
        </g>
      </Layer>
    </>
  );
};

/* ---------- 5. the other options ---------- */
const Same: React.FC<SceneProps> = ({t}) => {
  const names = ['auto', 'bayer', 'ed', 'a_dither', 'x_dither', 'flag_ed'] as const;
  const say: Record<string, string> = {auto: 'sws_dither=auto', bayer: 'sws_dither=bayer', ed: 'sws_dither=ed', a_dither: 'sws_dither=a_dither', x_dither: 'sws_dither=x_dither', flag_ed: 'flags=+error_diffusion'};
  const hash = DATA.modes.default.md5;
  return (
    <>
      <Title kick="seven spellings" title="One output." color={C.amber} o={ep(t, 0.2, 0.9)} seed={5} />
      <Layer>
        <Slip x={210} y={320} w={470} label="format=yuv420p" hash={hash} color={C.cyan} rot={-0.8} seed={1} o={ep(t, 1.0, 1.8)} />
        {names.map((k, i) => {
          const o = ep(t, 2.2 + i * 1.0, 3.0 + i * 1.0);
          return <Slip key={k} x={210 + (i % 2) * 0} y={408 + i * 74} w={470} label={say[k]} hash={DATA.modes[k].md5} color={C.cyan} rot={i % 2 ? 0.7 : -0.6} seed={(i % 6) + 2} o={o} />;
        })}
        {names.map((k, i) => (
          <path key={k} d={`M 690 ${440 + i * 74} L 930 ${515}`} stroke={C.green} strokeWidth={3} fill="none" strokeDasharray="2 7" strokeLinecap="round" opacity={ep(t, 3.0 + i * 1.0, 3.8 + i * 1.0)} />
        ))}
        <path d="M 690 352 L 930 515" stroke={C.green} strokeWidth={3} fill="none" strokeDasharray="2 7" strokeLinecap="round" opacity={ep(t, 1.6, 2.4)} />
        <g opacity={ep(t, 8.0, 9.0)}>
          <Paper x={930} y={420} w={640} h={190} rot={0.6} seed={8} fill={C.greenDim}>
            <Tx x={30} y={52} s={24} f="mono" w={700} c={C.text}>one checksum for seven</Tx>
            <Reg x={30} y={140} s={90} w={800} f="display" c={C.text} plate={C.green}>{hash}</Reg>
          </Paper>
          <Tape x={1000} y={426} rot={-6} w={110} h={32} />
        </g>
        <g opacity={ep(t, 10.6, 11.6)}>
          <Slip x={930} y={670} w={640} label="sws_dither=none" hash={DATA.modes.none.md5} color={C.red} rot={0.8} seed={9} fill={C.redDim} />
          <Tx x={930} y={772} s={22} f="mono" c={C.red}>the only spelling that changes the bytes</Tx>
        </g>
        <Tx x={930} y={842} s={22} f="mono" c={C.dim} o={ep(t, 12.4, 13.2)}>ffmpeg framemd5 gives the same checksums</Tx>
      </Layer>
    </>
  );
};

/* ---------- 6. known positive: rgb8 ---------- */
const Positive: React.FC<SceneProps> = ({t}) => {
  const say: Record<string, string> = {default: 'format=rgb8', auto: 'sws_dither=auto', bayer: 'sws_dither=bayer', none: 'sws_dither=none', ed: 'sws_dither=ed', flag_ed: 'flags=+error_diffusion', a_dither: 'sws_dither=a_dither', x_dither: 'sws_dither=x_dither'};
  const groups = DATA.rgb8Classes as readonly (readonly string[])[];
  const cols = [C.cyan, C.red, C.amber, C.green, C.mute];
  return (
    <>
      <Title kick="rgb8 output" title="Five outputs from eight." color={C.red} o={ep(t, 0.2, 0.9)} seed={6} />
      <Layer>
        {groups.map((g, gi) => {
          const x = 200 + (gi % 3) * 520, y = 320 + Math.floor(gi / 3) * 290, o = ep(t, 1.0 + gi * 1.3, 1.8 + gi * 1.3);
          const h = 64 + g.length * 62;
          return (
            <g key={gi} opacity={o}>
              <Paper x={x} y={y} w={470} h={h} rot={gi % 2 ? 0.6 : -0.5} seed={(gi % 7) + 2} fill={C.bg2}>
                <rect x={0} y={0} width={470} height={10} fill={cols[gi]} />
                <Reg x={26} y={48} s={34} w={800} f="display" c={C.text} dx={3} dy={2} plate={cols[gi]}>{`output ${gi + 1}`}</Reg>
                <Tx x={444} y={46} s={20} f="mono" w={700} a="end" c={C.dim}>{`md5 ${DATA.rgb8[g[0]].md5.slice(0, 6)}`}</Tx>
                {g.map((k, i) => <Tx key={k} x={26} y={86 + i * 62 + 22} s={22} f="mono" c={C.text}>{say[k]}</Tx>)}
              </Paper>
            </g>
          );
        })}
        <g opacity={ep(t, 7.6, 8.4)}>
          <Paper x={1236} y={610} w={490} h={230} rot={0.5} seed={9} fill={C.greenDim}>
            <Tx x={30} y={50} s={24} f="mono" w={700} c={C.text}>both readers see it</Tx>
            <Reg x={30} y={128} s={52} w={800} f="display" c={C.text} plate={C.green}>so they are not blind</Reg>
            <Tx x={30} y={170} s={21} f="mono" c={C.dim}>ed equals error_diffusion;</Tx>
            <Tx x={30} y={198} s={21} f="mono" c={C.dim}>a_dither and x_dither stand alone</Tx>
          </Paper>
          <Tape x={1296} y={616} rot={-5} w={110} h={32} />
        </g>
      </Layer>
    </>
  );
};

/* ---------- 7. what we measured ---------- */
const Close: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {c: C.green, k: 'the default', a: `format=yuv420p dithers: ${DATA.modes.default.distinct} values, runs of ${DATA.modes.default.meanRun.toFixed(1)} px`, b: '2 x 2 cell, every block mean equals value/4'},
    {c: C.red, k: 'switched off', a: `sws_dither=none, 6.1.1: ${DATA.modes.none.distinct} bands of 16 px, mean error ${DATA.modes.none.bias.toFixed(3)}`, b: 'floor of value/4; on 8.1.2 it rounds, mean error +0.125'},
    {c: C.amber, k: 'the options', a: 'bayer, ed, a_dither, x_dither, auto, +error_diffusion', b: 'the same bytes as the default on yuv420p'},
    {c: C.cyan, k: 'where they act', a: `rgb8: ${Object.keys(DATA.rgb8).length} spellings, ${DATA.rgb8Classes.length} outputs`, b: 'the readers can see a dither difference'},
    {c: C.green, k: 'no new levels', a: `1024 levels in, ${DATA.full.default.distinct} out: default, none and ed`, b: 'dither mixes two neighbours, it adds none'},
  ];
  return (
    <>
      <Title kick="what we measured" title="Five facts." color={C.cyan} o={ep(t, 0.2, 0.9)} seed={7} />
      <Layer>
        {rows.map((r, i) => {
          const y = 308 + i * 100, o = ep(t, 1.2 + i * 1.4, 2.0 + i * 1.4);
          return (
            <g key={r.k} opacity={o}>
              <Paper x={200} y={y} w={1520} h={84} rot={i % 2 ? 0.25 : -0.25} seed={(i % 6) + 1} fill={i === 4 ? C.greenDim : C.bg2}>
                <rect x={0} y={0} width={14} height={84} fill={r.c} />
                <Reg x={42} y={56} s={42} w={800} f="display" c={C.text} dx={3} dy={2} plate={r.c}>{r.k}</Reg>
                <Tx x={420} y={36} s={24} f="mono" w={700} c={C.text}>{r.a}</Tx>
                <Tx x={420} y={68} s={21} f="mono" c={C.dim}>{r.b}</Tx>
              </Paper>
            </g>
          );
        })}
      </Layer>
      <Mid y={820} size={25} color={C.dim} o={ep(t, 8.6, 9.4)}>Not tested: other builds, real footage, scaled output, x264 encoding.</Mid>
    </>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, rig: Rig, default: Default, none: None, same: Same, positive: Positive, close: Close};
