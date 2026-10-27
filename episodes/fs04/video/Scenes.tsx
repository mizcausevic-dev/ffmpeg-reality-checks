import React from 'react';
import {C, D, F} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {VBig, VCmd, VCompare, VLabel, VNote, VPanel, VRows, VStrip} from '../../kit/V';
import type {SceneProps} from '../../kit/Episode';

/*
 * Short 04, "Frame rate and timestamps" (vertical, palette swiss). Nothing new is measured here: every number below is in EV,
 * produced by sceneNumbers() in episodes/fl04/fixture/experiment.mjs from the live evidence of the long film (ffmpeg 6.1.1).
 * episodes/fs04/test/fs04.test.mjs fails if this block differs from it. Do not edit it by hand.
 * The 8.1.2 number (loop.published) comes from the published row of episode 33.
 */
/*EV:start*/
const EV: any = {"build":"6.1.1","hook":{"recipeMs":[0,17,33,50,67,83,100,117,133,150,167,183,200,217,233,250,267,283,300,317,333,350,367,383],"passMs":[0,0,33,67,67,67,100,100,133,167,167,167,200,200,233,267,267,267,300,300,333,367,367,367],"frames":900,"distinctRecipe":900,"distinctPass":450},"vfr":{"frames":93,"seconds":5,"gapsMs":[33,67,933],"avgFps":18.5,"baseFps":30,"kept":[0,1,3,4,5,7,8,9,11,12,13,15,16,17,19,20,21,23,24,25,27,28,29,31,32,33,35,36,37,39,40,41,43,44,45,47,48,49,51,52,53,55,56,57,59,87,88,89,91,92,93,95,96,97,99,100,101,103,104,105,107,108,109,111,112,113,115,116,117,119,120,121,123,124,125,127,128,129,131,132,133,135,136,137,139,140,141,143,144,145,147,148,149],"slots":150},"cfr":{"source":93,"passthrough":93,"def":{"frames":150,"dups":57},"cfr30":{"frames":150,"dups":57},"cfr25":{"frames":125,"dups":32},"cfr60":{"frames":300,"dups":207},"distinct":93,"publishedDefault":93},"rflag":{"srcFrames":60,"srcSec":2,"after":{"frames":22,"sec":2.2},"fps":{"frames":20,"sec":2},"before":{"frames":60,"sec":6},"copy":{"fps":30,"sec":2}},"fps1":{"near":[12,37,62,87,112],"up":[0,25,50],"firstAt":0.48,"fps":25,"s60":[1,3,6,8,11,13],"s60Out":48},"setpts":{"picture":5.07,"audio":10,"container":10,"kept":152,"of":300,"keptFirst":[0,1,2,3,5,7,9,11,13],"sec":10},"atempo":{"audio":5,"picture":5.07,"hz":440,"rateAudio":5,"rateHz":880},"loop":{"eq":{"frames":360,"sec":12},"short":{"frames":355,"sec":11.83,"heads":[0,2,3],"audioSec":3.9},"published":{"frames":359,"sec":11.97,"heads":[0,0,1]},"plays":3,"playSec":4},"loop2":{"longAudio":{"audioSec":4.1,"sec":12.3,"hole":0.13,"holes":2},"copy":{"frames":360,"hole":0.1,"holes":2,"soundSec":11.7}},"recipe":{"frames":900,"distinct":900,"gapMin":16,"gapMax":17,"sec":15,"hz":440,"plays":3,"srcFrames":300},"controls":{"rFlag":{"frames":901,"first":[0,0,1]},"noAtempo":{"audio":30,"picture":15},"defaultFps":{"frames":452,"first":[0,1,2,3,5,7,9,11]}}};
/*EV:end*/

const fr = (t: number, dur: number, a: number, b: number) => ep(t, a * dur, b * dur);

/** Frame chips at their presentation time (ms); frames that share a time stack up. Safe area: x 60..940. */
const TimeStrip: React.FC<{ms: number[]; y: number; t1: number; color: string; bad?: boolean; p?: number; maxStack?: number; o?: number}> = ({ms, y, t1, color, bad = false, p = 1, maxStack = 1, o = 1}) => {
  const x = 100, w = 800, chip = 56, px = w / t1;
  const size: Record<number, number> = {}, seen: Record<number, number> = {};
  ms.forEach((m) => { size[m] = (size[m] ?? 0) + 1; });
  const shown = Math.floor(p * ms.length + 0.001);
  const base = y + maxStack * (chip + 4);
  return (
    <div style={{opacity: o}}>
      <div style={{position: 'absolute', left: x - 20, top: base + 2, width: w + 40, height: 3, background: C.text}} />
      {[0, 100, 200].filter((m) => m <= t1).map((m) => (
        <React.Fragment key={m}>
          <div style={{position: 'absolute', left: x + m * px - 1, top: base + 2, width: 3, height: 14, background: C.text}} />
          <div style={{position: 'absolute', left: x + m * px - 70, top: base + 20, width: 140, whiteSpace: 'nowrap', textAlign: 'center', fontFamily: F.mono, fontSize: 22, color: C.dim}}>{m} ms</div>
        </React.Fragment>
      ))}
      {ms.map((m, i) => {
        const k = seen[m] ?? 0; seen[m] = k + 1;
        if (i >= shown) return null;
        const shared = size[m] > 1, col = bad && shared ? C.red : color;
        return <div key={i} style={{position: 'absolute', left: x + m * px - chip / 2, top: base - (k + 1) * (chip + 4), width: chip, height: chip, boxSizing: 'border-box', border: `3px solid ${col}`, background: bad && shared ? C.redDim : C.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: 22, fontWeight: 700, color: C.text}}>{i}</div>;
      })}
    </div>
  );
};

/* 1. hook: the two strips */
const Hook: React.FC<SceneProps> = ({t, dur}) => {
  const H = EV.hook;
  return (
    <>
      <VLabel kind="over" text="Speed up 2x, loop 3x" y={230} o={ep(t, 0.1, 0.6)} />
      <VLabel kind="head" text="Same frames. Half the timestamps." y={274} size={78} maxLines={2} o={ep(t, 0.2, 0.9)} />
      <VLabel kind="over" text="Every frame, its own time" y={470} color={C.green} o={fr(t, dur, 0.1, 0.16)} />
      <TimeStrip ms={H.recipeMs.slice(0, 12)} y={516} t1={200} color={C.green} p={fr(t, dur, 0.12, 0.34)} o={fr(t, dur, 0.1, 0.16)} />
      <VBig value={`${H.distinctRecipe}`} y={650} h={150} label="distinct timestamps" accent={C.green} align="left" max={170} o={fr(t, dur, 0.14, 0.2)} />
      <VLabel kind="over" text="Passthrough · frames share a time" y={820} color={C.red} o={fr(t, dur, 0.38, 0.44)} />
      <TimeStrip ms={H.passMs.slice(0, 12)} y={866} t1={200} color={C.cyan} bad maxStack={3} p={fr(t, dur, 0.4, 0.62)} o={fr(t, dur, 0.38, 0.44)} />
      <VBig value={`${H.distinctPass}`} y={1140} h={170} label="distinct timestamps" accent={C.red} align="left" max={170} o={fr(t, dur, 0.5, 0.58)} />
    </>
  );
};

/* 2. method */
const Method: React.FC<SceneProps> = ({t, dur}) => (
  <>
    <VLabel kind="over" text="How we measure" y={230} o={ep(t, 0.1, 0.6)} />
    <VLabel kind="head" text="Every frame has a code." y={274} size={78} maxLines={2} o={ep(t, 0.2, 0.9)} />
    <VStrip n={8} y={470} h={240} cur={-1} kept={(i) => i % 2 === 1} label={(i) => String(i)} o={fr(t, dur, 0.1, 0.2)} />
    <VPanel y={760} h={250} color={C.cyan} o={fr(t, dur, 0.24, 0.32)} />
    <VLabel kind="over" text="Reader 1" y={786} x={96} w={800} o={fr(t, dur, 0.28, 0.36)} />
    <VLabel kind="head" text="ffprobe" y={830} x={96} w={800} size={74} maxLines={1} o={fr(t, dur, 0.28, 0.36)} />
    <VLabel kind="body" text="timestamps and durations" y={930} x={96} w={800} size={34} maxLines={1} o={fr(t, dur, 0.3, 0.38)} />
    <VPanel y={1040} h={250} color={C.cyan} o={fr(t, dur, 0.44, 0.52)} />
    <VLabel kind="over" text="Reader 2" y={1066} x={96} w={800} o={fr(t, dur, 0.48, 0.56)} />
    <VLabel kind="head" text="a decode" y={1110} x={96} w={800} size={74} maxLines={1} o={fr(t, dur, 0.48, 0.56)} />
    <VLabel kind="body" text="md5, codes, samples, pitch" y={1210} x={96} w={800} size={34} maxLines={1} o={fr(t, dur, 0.5, 0.58)} />
  </>
);

/* 3. variable to constant */
const Vfr: React.FC<SceneProps> = ({t, dur}) => {
  const K = EV.cfr, V = EV.vfr;
  return (
    <>
      <VLabel kind="over" text="Lie one · constant frame rate" y={230} o={ep(t, 0.1, 0.6)} />
      <VCompare y={290} h={660} a={{label: `In · ${V.seconds} s`, value: `${V.frames}`, sub: 'frames, uneven gaps', color: C.cyan, o: fr(t, dur, 0.1, 0.2)}} b={{label: 'Out · no rate option', value: `${K.def.frames}`, sub: `${K.def.dups} are duplicates`, color: C.red, o: fr(t, dur, 0.3, 0.4)}} mid="→" midColor={C.red} midO={fr(t, dur, 0.28, 0.36)} />
      <VNote y={1000} tone="ok" tag="Fix" text={`-fps_mode passthrough keeps ${K.passthrough}`} size={36} maxLines={2} o={fr(t, dur, 0.55, 0.65)} />
    </>
  );
};

/* 4. dash r */
const RFlag: React.FC<SceneProps> = ({t, dur}) => {
  const L = EV.rflag;
  return (
    <>
      <VLabel kind="over" text="Lie two · dash r" y={230} o={ep(t, 0.1, 0.6)} />
      <VRows y={290} h={900} max={L.srcFrames} p={fr(t, dur, 0.1, 0.5)} rows={[
        {label: 'source clip', value: L.srcFrames, text: `${L.srcFrames} frames · ${L.srcSec} s`, color: C.cyan},
        {label: '-r 10 after -i', value: L.after.frames, text: `${L.after.frames} frames · ${L.after.sec} s`, color: C.amber},
        {label: 'fps=10, exact', value: L.fps.frames, text: `${L.fps.frames} frames · ${L.fps.sec} s`, color: C.green},
        {label: '-r 10 before -i', value: L.before.frames, text: `${L.before.frames} frames · ${L.before.sec} s`, color: C.red},
      ]} />
    </>
  );
};

/* 5. fps=1 */
const Fps1: React.FC<SceneProps> = ({t, dur}) => {
  const F1 = EV.fps1;
  return (
    <>
      <VLabel kind="over" text="Lie three · one frame a second" y={230} o={ep(t, 0.1, 0.6)} />
      <VStrip n={26} y={290} h={400} cur={F1.near[0]} kept={(i) => i === 0} o={fr(t, dur, 0.08, 0.2)} />
      <VBig value={`${F1.firstAt} s`} y={740} h={330} label={`frame ${F1.near[0]} comes first`} sub="not frame 0" accent={C.red} o={fr(t, dur, 0.3, 0.42)} />
      <VNote y={1110} tone="ok" tag="Fix" text={`round=up keeps ${F1.up.join(', ')}`} size={36} maxLines={2} o={fr(t, dur, 0.6, 0.7)} />
    </>
  );
};

/* 6. setpts */
const Setpts: React.FC<SceneProps> = ({t, dur}) => {
  const S = EV.setpts, A = EV.atempo;
  return (
    <>
      <VLabel kind="over" text="Lie four · speed up" y={230} o={ep(t, 0.1, 0.6)} />
      <VRows y={280} h={330} max={S.audio} p={fr(t, dur, 0.1, 0.35)} rows={[
        {label: 'picture', value: S.picture, text: `${S.picture} s`, color: C.red},
        {label: 'audio, untouched', value: S.audio, text: `${S.audio} s`, color: C.amber},
      ]} />
      <VLabel kind="over" text="Now fix the sound" y={680} color={C.green} o={fr(t, dur, 0.45, 0.52)} />
      <VRows y={730} h={330} max={S.audio} p={fr(t, dur, 0.5, 0.75)} o={fr(t, dur, 0.45, 0.52)} rows={[
        {label: 'picture', value: A.picture, text: `${A.picture} s`, color: C.green},
        {label: 'audio', value: A.audio, text: `${A.audio} s`, color: C.green},
      ]} />
      <VNote y={1110} tone="ok" tag="Pitch" text={`still ${A.hz} Hz`} size={38} maxLines={1} o={fr(t, dur, 0.78, 0.86)} />
    </>
  );
};

/* 7. stream_loop */
const Loop: React.FC<SceneProps> = ({t, dur}) => {
  const L = EV.loop;
  return (
    <>
      <VLabel kind="over" text="Lie five · stream loop" y={230} o={ep(t, 0.1, 0.6)} />
      <VCmd y={280} text="ffmpeg -stream_loop 2 -i in.mkv" hi="-stream_loop 2" size={36} o={fr(t, dur, 0.06, 0.14)} />
      <VCompare y={470} h={660} a={{label: `Audio ${L.playSec} s, picture ${L.playSec} s`, value: `${L.eq.frames}`, sub: `frames · ${L.eq.sec} s`, color: C.green, o: fr(t, dur, 0.16, 0.26)}} b={{label: `Audio ${L.short.audioSec} s`, value: `${L.short.frames}`, sub: `frames · ${L.short.sec} s`, color: C.red, o: fr(t, dur, 0.4, 0.5)}} mid="vs" midO={fr(t, dur, 0.38, 0.46)} />
      <VNote y={1170} tone="doubt" tag="8.1.2, published" text={`keeps ${L.published.frames}`} size={34} maxLines={1} o={fr(t, dur, 0.7, 0.8)} />
    </>
  );
};

/* 8. together */
const Together: React.FC<SceneProps> = ({t, dur}) => {
  const H = EV.hook;
  return (
    <>
      <VLabel kind="over" text="Combine them" y={230} o={ep(t, 0.1, 0.6)} />
      <VCmd y={280} text="ffmpeg -stream_loop 2 -i in.mkv -vf setpts=0.5*PTS -af atempo=2 -fps_mode passthrough out.mkv" hi="-fps_mode passthrough" color={C.red} size={34} maxLines={4} o={fr(t, dur, 0.06, 0.14)} />
      <VRows y={560} h={380} max={H.frames} p={fr(t, dur, 0.2, 0.5)} o={fr(t, dur, 0.18, 0.26)} rows={[
        {label: 'frames', value: H.frames, text: `${H.frames} · ${EV.recipe.sec} s`, color: C.cyan},
        {label: 'distinct timestamps', value: H.distinctPass, text: `${H.distinctPass}`, color: C.red},
      ]} />
      <VNote y={1000} tone="fail" tag="Both readers" text="frames share times" size={38} maxLines={1} o={fr(t, dur, 0.6, 0.7)} />
    </>
  );
};

/* 9. recipe */
const Recipe: React.FC<SceneProps> = ({t, dur}) => {
  const R = EV.recipe;
  return (
    <>
      <VLabel kind="over" text="The fix" color={C.green} y={230} o={ep(t, 0.1, 0.6)} />
      <VCmd y={280} text="ffmpeg -stream_loop 2 -i in.mkv -vf setpts=0.5*PTS,fps=60 -af atempo=2 out.mkv" hi={['fps=60', 'atempo=2']} color={C.green} size={36} maxLines={3} o={fr(t, dur, 0.06, 0.14)} />
      <VCompare y={600} h={560} a={{label: 'Frames, in order', value: `${R.frames}`, sub: `${R.sec} s of picture and sound`, color: C.green, o: fr(t, dur, 0.2, 0.3)}} b={{label: 'Distinct timestamps', value: `${R.distinct}`, sub: `gaps of ${R.gapMin} to ${R.gapMax} ms · ${R.hz} Hz`, color: C.green, o: fr(t, dur, 0.4, 0.5)}} mid="=" midColor={C.green} midO={fr(t, dur, 0.4, 0.48)} valueMax={150} />
    </>
  );
};

/* 10. close */
const Close: React.FC<SceneProps> = ({t, dur}) => {
  const Q = EV.controls;
  return (
    <>
      <VLabel kind="over" text="Controls, and what to check" y={230} o={ep(t, 0.1, 0.6)} />
      <VNote y={300} tone="fail" tag="Dash r" text={`-r 60 after -i: ${Q.rFlag.frames} frames`} size={34} maxLines={1} o={fr(t, dur, 0.1, 0.2)} />
      <VNote y={470} tone="fail" tag="Sound alone" text={`No atempo: ${Q.noAtempo.audio} s of sound, ${Q.noAtempo.picture} s of picture`} size={34} maxLines={2} o={fr(t, dur, 0.24, 0.34)} />
      <VNote y={680} tone="fail" tag="Rate" text={`No output rate: ${Q.defaultFps.frames} frames`} size={34} maxLines={1} o={fr(t, dur, 0.38, 0.48)} />
      <VLabel kind="head" text="Name the rate. Check frames, times, lengths." y={880} size={64} maxLines={3} o={fr(t, dur, 0.55, 0.65)} />
      <VNote y={1150} tone="doubt" tag="Not tested" text="other builds, real footage, players" size={32} maxLines={2} o={fr(t, dur, 0.75, 0.85)} />
    </>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {
  hook: Hook, method: Method, vfr: Vfr, rflag: RFlag, fps1: Fps1, setpts: Setpts, loop: Loop, together: Together, recipe: Recipe, close: Close,
};
void D;
