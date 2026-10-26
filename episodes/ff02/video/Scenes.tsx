import React from 'react';
import {Box, Code, Log, Overline, Pill, Readout, Txt, Big} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep, step} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff02/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). */
const EV = {
  frames: 50, size: '320x180',
  defProfile: 'High 4:4:4 Predictive', defPix: 'yuv444p',
  fixProfile: 'High', fixPix: 'yuv420p',
};
const CMD = 'ffmpeg -framerate 25 -i f%03d.png -c:v libx264 -crf 18 out.mp4';
const CMD_FIX = 'ffmpeg -framerate 25 -i f%03d.png -c:v libx264 -crf 18 -pix_fmt yuv420p out.mp4';

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>The command</Overline>
    <Code x={M} y={210} w={W - 2 * M} lines={[CMD]} hi={[0]} hiColor={C.cyan} size={42} o={ep(t, 0.2, 0.8)} />
    <Pill x={M} y={420} text="PNG frames" color={C.cyan} o={ep(t, 1.0, 1.5)} />
    <Txt x={M + 250} y={418} w={120} size={44} color={C.dim} o={ep(t, 1.3, 1.8)}>→</Txt>
    <Pill x={M + 340} y={420} text="out.mp4" color={C.green} o={ep(t, 1.6, 2.1)} />
    <Big y={640} size={64} color={C.amber} o={ep(t, 3.0, 3.6)}>What did FFmpeg put in the file?</Big>
    <Txt x={M} y={760} w={W - 2 * M} size={34} color={C.dim} o={ep(t, 4.4, 5.0)}>We will not guess. We will ask ffprobe.</Txt>
  </>
);

/* 2. The fixture */
const SW = ['#e0443a', '#f5b63d', '#5fe08a', '#3dd6f5', '#a78bfa', '#f3ede3'];
const Fixture: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>Synthetic test frames</Overline>
    <Txt x={M} y={200} w={W - 2 * M} size={40} color={C.text} o={ep(t, 0.2, 0.8)}>{EV.frames} PNG frames · {EV.size} · RGB</Txt>
    {SW.map((c, i) => (
      <div key={i} style={{position: 'absolute', left: M + i * 190, top: 300, width: 170, height: 96, borderRadius: 10, background: `${c}55`, border: `3px solid ${c}`, boxSizing: 'border-box', opacity: ep(t, 0.8 + i * 0.15, 1.3 + i * 0.15), fontFamily: F.mono, fontSize: 22, color: C.text, padding: '10px 12px'}}>f{String(i + 1).padStart(3, '0')}.png</div>
    ))}
    <Txt x={M + 6 * 190} y={330} w={400} size={28} color={C.mute} o={ep(t, 1.9, 2.4)}>… f050.png</Txt>
    <Code x={M} y={470} w={W - 2 * M} lines={[CMD]} size={38} o={ep(t, 2.8, 3.4)} title="The whole command" />
    <Pill x={M} y={680} text="no -pix_fmt" color={C.amber} o={ep(t, 4.2, 4.8)} />
    <Txt x={M + 300} y={680} w={1000} size={32} color={C.dim} o={ep(t, 4.6, 5.2)}>PNG stores red, green and blue for every pixel.</Txt>
  </>
);

/* 3. What ffprobe says */
const Default: React.FC<SceneProps> = ({t}) => {
  const lines = [
    {t: '$ ffprobe -show_entries stream=profile,pix_fmt out.mp4', c: C.mute},
    {t: `profile=${EV.defProfile}`, c: C.red},
    {t: `pix_fmt=${EV.defPix}`, c: C.red},
  ];
  return (
    <>
      <Overline y={150} color={C.red}>Default, RGB input</Overline>
      <Log x={M} y={210} w={W - 2 * M} lines={lines} shown={1 + Math.floor(ep(t, 0.8, 3.2) * 3)} size={40} title="ffprobe" />
      <Readout x={M} y={520} w={760} label="profile" value="4:4:4" color={C.red} o={ep(t, 3.4, 4.0)} />
      <Readout x={M + 840} y={520} w={760} label="pixel format" value={EV.defPix} color={C.red} o={ep(t, 3.8, 4.4)} />
      <Txt x={M} y={800} w={W - 2 * M} size={36} color={C.amber} o={ep(t, 5.6, 6.2)}>Nobody asked for that. The default follows the input.</Txt>
    </>
  );
};

/* 4. 4:4:4 versus 4:2:0 on one 4x2 block of pixels */
const Grid: React.FC<{x: number; y: number; mode: '444' | '420'; o?: number; color: string}> = ({x, y, mode, o = 1, color}) => {
  const cell = 120;
  const dots: {cx: number; cy: number}[] = mode === '444'
    ? Array.from({length: 8}, (_, i) => ({cx: (i % 4) * cell + cell / 2, cy: Math.floor(i / 4) * cell + cell / 2}))
    : [{cx: cell, cy: cell}, {cx: 3 * cell, cy: cell}];
  return (
    <div style={{position: 'absolute', left: x, top: y, width: cell * 4, height: cell * 2, opacity: o}}>
      {Array.from({length: 8}, (_, i) => (
        <div key={i} style={{position: 'absolute', left: (i % 4) * cell, top: Math.floor(i / 4) * cell, width: cell, height: cell, boxSizing: 'border-box', border: `3px solid ${C.line}`, background: C.panel}} />
      ))}
      {dots.map((d, i) => <div key={i} style={{position: 'absolute', left: d.cx - 18, top: d.cy - 18, width: 36, height: 36, borderRadius: 18, background: color, boxShadow: `0 0 20px ${color}88`}} />)}
    </div>
  );
};
const Why: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>Eight pixels, two ways to store color</Overline>
    <Grid x={M} y={260} mode="444" color={C.red} o={ep(t, 0.4, 1.0)} />
    <Grid x={M + 780} y={260} mode="420" color={C.green} o={ep(t, 2.0, 2.6)} />
    <Txt x={M} y={540} w={480} size={34} color={C.red} weight={700} o={ep(t, 1.2, 1.8)}>4:4:4 · 8 color samples</Txt>
    <Txt x={M + 780} y={540} w={480} size={34} color={C.green} weight={700} o={ep(t, 2.8, 3.4)}>4:2:0 · 2 color samples</Txt>
    <Txt x={M + 1400} y={290} w={330} size={26} color={C.dim} o={ep(t, 3.6, 4.2)}>Dots are color samples. Every pixel keeps its own brightness.</Txt>
    <Box x={M} y={650} w={W - 2 * M} h={190} accent={C.amber} o={ep(t, 5.2, 5.8)}>
      <div style={{fontSize: 32, color: C.text, lineHeight: 1.3}}>"These players only support the YUV planar color space with 4:2:0 chroma subsampling for H.264 video."</div>
      <div style={{fontSize: 24, color: C.dim, marginTop: 10}}>FFmpeg wiki, Encode/H.264. We did not test any player.</div>
    </Box>
  </>
);

/* 5. The fix */
const Fix: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150} color={C.green}>One flag</Overline>
    <Code x={M} y={210} w={W - 2 * M} lines={[CMD_FIX]} hi={[0]} hiColor={C.green} size={34} o={ep(t, 0.2, 0.8)} />
    <Readout x={M} y={380} w={560} label="profile" value={EV.fixProfile} color={C.green} o={ep(t, 1.6, 2.2)} />
    <Readout x={M + 640} y={380} w={640} label="pixel format" value={EV.fixPix} color={C.green} o={ep(t, 2.2, 2.8)} />
    <Box x={M} y={640} w={W - 2 * M} h={170} title="Control: the source is already yuv420p" sub="No flag needed. Same result: High, yuv420p. The surprise belongs to RGB input." accent={C.cyan} titleSize={34} o={ep(t, 4.8, 5.5)} />
  </>
);

/* 6. What it costs: PSNR against the original PNG frames, two ffmpeg builds (both measured by fixture/run.mjs) */
const PSNR = [
  {build: 'ffmpeg 6.1.1 (Linux)', full: 37.04, sub: 35.4},
  {build: 'ffmpeg 8.1.2 (Windows)', full: 39.78, sub: 36.99},
];
const Cost: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150} color={C.amber}>Closeness to the original PNG frames (PSNR, higher is closer)</Overline>
    <Txt x={M + 560} y={230} w={560} size={28} color={C.red} weight={700} align="center" o={ep(t, 0.4, 0.9)}>4:4:4 · default</Txt>
    <Txt x={M + 1180} y={230} w={560} size={28} color={C.green} weight={700} align="center" o={ep(t, 0.4, 0.9)}>4:2:0 · -pix_fmt yuv420p</Txt>
    {PSNR.map((r, i) => (
      <React.Fragment key={r.build}>
        <Txt x={M} y={330 + i * 190} w={520} size={32} color={C.text} weight={600} o={ep(t, 0.8 + i * 2.0, 1.4 + i * 2.0)}>{r.build}</Txt>
        <Readout x={M + 560} y={300 + i * 190} w={560} label="decibels" value={r.full.toFixed(2)} color={C.red} o={ep(t, 1.0 + i * 2.0, 1.6 + i * 2.0)} />
        <Readout x={M + 1180} y={300 + i * 190} w={560} label="decibels" value={r.sub.toFixed(2)} color={C.green} o={ep(t, 1.4 + i * 2.0, 2.0 + i * 2.0)} />
      </React.Fragment>
    ))}
    <Txt x={M} y={700} w={W - 2 * M} size={40} color={C.amber} weight={700} o={ep(t, 5.0, 5.6)}>The numbers move with the build. The order does not.</Txt>
    <Txt x={M} y={780} w={W - 2 * M} size={30} color={C.dim} o={ep(t, 6.0, 6.6)}>One synthetic pattern. How visible the difference is depends on your picture.</Txt>
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={190} size={78} o={ep(t, 0.2, 0.9)}>One missing flag.</Big>
    <Big y={290} size={78} color={C.amber} o={ep(t, 0.8, 1.5)}>A different profile.</Big>
    <Code x={M} y={500} w={W - 2 * M} lines={['ffprobe -show_entries stream=profile,pix_fmt out.mp4']} size={34} o={ep(t, 1.8, 2.4)} title="Check before you send the file" />
    <Txt x={M} y={760} w={W - 2 * M} size={30} color={C.dim} o={ep(t, 3.4, 4.0)}>Not tested here: any specific player.</Txt>
    <Txt x={M} y={830} w={W - 2 * M} size={34} color={C.dim} o={ep(t, 3.8, 4.4)}>FFmpeg Reality Checks · episode 2 · fixture and tests in the description</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, fixture: Fixture, default: Default, why: Why, fix: Fix, cost: Cost, close: Close};
