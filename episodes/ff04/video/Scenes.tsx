import React from 'react';
import {Box, Code, Overline, Pill, Readout, Txt, Big} from '../../kit/Primitives';
import {C, F, M, W} from '../../kit/theme';
import {ep} from '../../kit/anim';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff04/fixture/experiment.mjs (evidence.json from fixture/run.mjs), CRF 23, ffmpeg 6.1.1 / x264 core 164. */
const ROWS = [
  {p: 'ultrafast', bytes: 2245279, ssim: 0.9972},
  {p: 'superfast', bytes: 1479487, ssim: 0.9970},
  {p: 'veryfast', bytes: 834521, ssim: 0.9936},
  {p: 'faster', bytes: 893064, ssim: 0.9950},
  {p: 'fast', bytes: 915130, ssim: 0.9955},
  {p: 'medium', bytes: 904286, ssim: 0.9958},
  {p: 'slow', bytes: 865578, ssim: 0.9957},
  {p: 'slower', bytes: 797106, ssim: 0.9962},
];
const MAX = 2245279;
const CMD = 'ffmpeg -i ref.mp4 -c:v libx264 -preset <name> -crf 23 out.mp4';
const kb = (n: number) => `${Math.round(n / 1000).toLocaleString('en-US')} kB`;

/* 1. The question */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>Same CRF. Slower preset.</Overline>
    <Code x={M} y={210} w={W - 2 * M} lines={[CMD]} hi={[0]} hiColor={C.cyan} size={38} o={ep(t, 0.2, 0.8)} />
    <Big y={450} size={70} color={C.amber} o={ep(t, 2.4, 3.0)}>Better video?</Big>
    <Box x={M} y={620} w={W - 2 * M} h={190} accent={C.cyan} o={ep(t, 4.4, 5.0)}>
      <div style={{fontSize: 32, color: C.text, lineHeight: 1.3}}>"A slower preset will provide better compression (compression is quality per filesize)."</div>
      <div style={{fontSize: 24, color: C.dim, marginTop: 10}}>FFmpeg wiki, Encode/H.264. So we measure size and quality.</div>
    </Box>
  </>
);

/* 2. The test */
const Fixture: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>Synthetic test clips</Overline>
    <Pill x={M} y={220} text="testsrc2 · test pattern" color={C.cyan} o={ep(t, 0.3, 0.9)} />
    <Pill x={M + 620} y={220} text="mandelbrot · zoom" color={C.green} o={ep(t, 0.9, 1.5)} />
    <Txt x={M} y={320} w={W - 2 * M} size={36} color={C.text} o={ep(t, 1.8, 2.4)}>640x360 · 25 fps · 10 s · 250 frames each</Txt>
    <Txt x={M} y={420} w={W - 2 * M} size={36} color={C.dim} o={ep(t, 3.0, 3.6)}>1. A lossless copy of each clip is the reference.</Txt>
    <Txt x={M} y={490} w={W - 2 * M} size={36} color={C.dim} o={ep(t, 4.4, 5.0)}>2. Encode the reference at CRF 23, eight presets.</Txt>
    <Txt x={M} y={560} w={W - 2 * M} size={36} color={C.dim} o={ep(t, 5.8, 6.4)}>3. Score every result against the reference with SSIM.</Txt>
    <Txt x={M} y={700} w={W - 2 * M} size={30} color={C.mute} o={ep(t, 7.2, 7.8)}>ultrafast · superfast · veryfast · faster · fast · medium · slow · slower</Txt>
  </>
);

/* 3. Quality */
const Quality: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>SSIM across all eight presets (1.0 is identical to the reference)</Overline>
    <Txt x={M} y={240} w={800} size={32} color={C.cyan} weight={700} o={ep(t, 0.3, 0.9)}>test pattern</Txt>
    <Txt x={M} y={300} w={820} size={78} color={C.cyan} weight={800} o={ep(t, 0.6, 1.2)}>0.9936 – 0.9972</Txt>
    <Txt x={M} y={400} w={800} size={24} color={C.dim} o={ep(t, 0.9, 1.5)}>LOWEST TO HIGHEST OF EIGHT PRESETS</Txt>
    <Txt x={M + 900} y={240} w={800} size={32} color={C.green} weight={700} o={ep(t, 2.4, 3.0)}>mandelbrot</Txt>
    <Txt x={M + 900} y={300} w={880} size={78} color={C.green} weight={800} o={ep(t, 2.7, 3.3)}>0.9824 – 0.9889</Txt>
    <Txt x={M + 900} y={400} w={800} size={24} color={C.dim} o={ep(t, 3.0, 3.6)}>LOWEST TO HIGHEST OF EIGHT PRESETS</Txt>
    <Txt x={M} y={560} w={W - 2 * M} size={40} color={C.amber} weight={700} o={ep(t, 5.0, 5.6)}>CRF held quality near one level, whichever preset.</Txt>
    <Txt x={M} y={640} w={W - 2 * M} size={32} color={C.dim} o={ep(t, 6.4, 7.0)}>On the test pattern, ultrafast scored highest: 0.9972.</Txt>
  </>
);

/* 4. Size: bytes per preset on the test pattern */
const Size: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>File size at CRF 23 · test pattern · presets from fastest to slowest</Overline>
    {ROWS.map((r, i) => {
      const o = ep(t, 0.4 + i * 0.5, 0.9 + i * 0.5), y = 215 + i * 76;
      const up = i > 2 && i < 7; // faster to slow: bigger than veryfast
      const col = i === 0 ? C.red : up ? C.amber : C.green;
      return (
        <React.Fragment key={r.p}>
          <Txt x={M} y={y} w={230} size={30} color={C.text} weight={600} o={o}>{r.p}</Txt>
          <div style={{position: 'absolute', left: M + 250, top: y + 4, width: 1000 * (r.bytes / MAX), height: 40, borderRadius: 6, background: `${col}cc`, opacity: o}} />
          <Txt x={M + 270 + 1000 * (r.bytes / MAX)} y={y} w={380} size={28} color={col} weight={700} o={o}>{kb(r.bytes)}</Txt>
          <Txt x={M + 1500} y={y + 2} w={260} size={24} color={C.dim} o={o}>SSIM {r.ssim.toFixed(4)}</Txt>
        </React.Fragment>
      );
    })}
    <Txt x={M} y={840} w={W - 2 * M} size={34} color={C.amber} weight={700} o={ep(t, 6.0, 6.6)}>veryfast is smaller than faster, fast, medium and slow.</Txt>
  </>
);

/* 5. Time */
const Time: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150} color={C.amber}>Encode time, slower divided by ultrafast</Overline>
    <Txt x={M + 560} y={230} w={520} size={28} color={C.cyan} weight={700} align="center" o={ep(t, 0.4, 0.9)}>test pattern</Txt>
    <Txt x={M + 1180} y={230} w={520} size={28} color={C.green} weight={700} align="center" o={ep(t, 0.4, 0.9)}>mandelbrot</Txt>
    <Txt x={M} y={330} w={520} size={32} color={C.text} weight={600} o={ep(t, 0.8, 1.4)}>ffmpeg 6.1.1 (Linux)</Txt>
    <Readout x={M + 560} y={300} w={520} label="times as long" value="5.7x" color={C.cyan} o={ep(t, 1.0, 1.6)} />
    <Readout x={M + 1180} y={300} w={520} label="times as long" value="5.3x" color={C.green} o={ep(t, 1.4, 2.0)} />
    <Txt x={M} y={520} w={520} size={32} color={C.text} weight={600} o={ep(t, 2.8, 3.4)}>ffmpeg 8.1.2 (Windows)</Txt>
    <Readout x={M + 560} y={490} w={520} label="times as long" value="6.3x" color={C.cyan} o={ep(t, 3.0, 3.6)} />
    <Readout x={M + 1180} y={490} w={520} label="times as long" value="5.0x" color={C.green} o={ep(t, 3.4, 4.0)} />
    <Txt x={M} y={720} w={W - 2 * M} size={36} color={C.amber} weight={700} o={ep(t, 5.0, 5.6)}>Same shape in size on mandelbrot: veryfast beat medium.</Txt>
    <Txt x={M} y={790} w={W - 2 * M} size={28} color={C.dim} o={ep(t, 6.2, 6.8)}>Times are from two different machines, so compare ratios, not seconds.</Txt>
  </>
);

/* 6. What the wiki says */
const Wiki: React.FC<SceneProps> = ({t}) => (
  <>
    <Overline y={150}>The claim, tested</Overline>
    <Box x={M} y={210} w={W - 2 * M} h={190} accent={C.cyan} o={ep(t, 0.3, 0.9)}>
      <div style={{fontSize: 32, color: C.text, lineHeight: 1.3}}>"Similarly, for constant quality encoding, you will simply save bitrate by choosing a slower preset."</div>
      <div style={{fontSize: 24, color: C.dim, marginTop: 10}}>FFmpeg wiki, Encode/H.264</div>
    </Box>
    <Pill x={M} y={480} text="held" color={C.green} o={ep(t, 2.4, 3.0)} />
    <Txt x={M + 190} y={482} w={1400} size={34} color={C.text} o={ep(t, 2.8, 3.4)}>ultrafast to veryfast, and medium to slower, on both clips.</Txt>
    <Pill x={M} y={580} text="not at every step" color={C.amber} o={ep(t, 4.4, 5.0)} />
    <Txt x={M + 430} y={582} w={1200} size={34} color={C.text} o={ep(t, 4.8, 5.4)}>faster, fast, medium and slow all came out bigger than veryfast.</Txt>
    <Txt x={M} y={740} w={W - 2 * M} size={30} color={C.dim} o={ep(t, 6.4, 7.0)}>Two synthetic clips. Two builds: x264 core 164 and 165. Same shape.</Txt>
  </>
);

/* 7. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Big y={190} size={78} o={ep(t, 0.2, 0.9)}>CRF holds the quality.</Big>
    <Big y={290} size={78} color={C.amber} o={ep(t, 0.8, 1.5)}>The preset trades time for size.</Big>
    <Txt x={M} y={470} w={W - 2 * M} size={40} color={C.text} o={ep(t, 1.8, 2.4)}>Not in a straight line. Measure your own footage.</Txt>
    <Txt x={M} y={720} w={W - 2 * M} size={30} color={C.dim} o={ep(t, 3.4, 4.0)}>Not tested here: other x264 versions, other content, hardware encoders.</Txt>
    <Txt x={M} y={830} w={W - 2 * M} size={34} color={C.dim} o={ep(t, 3.8, 4.4)}>FFmpeg Reality Checks · episode 4 · fixture and tests in the description</Txt>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, fixture: Fixture, quality: Quality, size: Size, time: Time, wiki: Wiki, close: Close};
