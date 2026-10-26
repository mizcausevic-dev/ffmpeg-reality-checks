import React from 'react';
import {C} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Cmd, Duel, Figure, Halo, Head, Mid, Row, Verdict} from '../../kit/Sym';
import type {SceneProps} from '../../kit/Episode';

/* Every number below is measured by episodes/ff38/fixture/experiment.mjs (see evidence.json from fixture/run.mjs). ffmpeg 6.1.1. */

/* 1. The ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={540} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="After scaling" title="Stretched or squished?" o={ep(t, 0.2, 0.8)} />
    <Cmd y={320} text="ffmpeg -i in.mp4 -vf scale=1280:720 out.mp4" hi="scale=1280:720" size={34} o={ep(t, 1.0, 1.6)} />
    <Duel y={470} h={270}
      left={{label: 'SAR · pixel shape', value: 'SAR', sub: 'width : height of one pixel', color: C.cyan, o: ep(t, 2.4, 3.1), valueSize: 80}}
      right={{label: 'DAR · picture shape', value: 'DAR', sub: 'width : height as displayed', color: C.amber, o: ep(t, 3.6, 4.3), valueSize: 80}}
      mid="" midO={0} />
    <Mid y={790} size={30} color={C.dim} o={ep(t, 5.2, 5.8)}>Displayed width = stored width x SAR</Mid>
  </>
);

/* 2. Test card and readers */
const Source: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Anamorphic test card" title="A stored ellipse." o={ep(t, 0.2, 0.8)} />
    <Row y={290} h={210} cw={400} gap={32} valueSize={52} items={[
      {label: 'Stored', value: '720x576', sub: 'SAR 64:45 · DAR 16:9', color: C.cyan, o: ep(t, 0.9, 1.5)},
      {label: 'Shape in pixels', value: '269x383', sub: 'width / height 0.70', color: C.amber, o: ep(t, 2.0, 2.6)},
      {label: 'Shown, SAR honored', value: '1024x576', sub: 'shape 383 wide: round', color: C.green, o: ep(t, 3.4, 4.0)},
    ]} />
    <Row y={560} h={190} cw={400} gap={32} valueSize={46} items={[
      {label: 'Reader 1', value: 'ffprobe', sub: 'SAR, DAR, size', color: C.cyan, o: ep(t, 5.4, 6.0)},
      {label: 'Reader 2', value: 'raw pixels', sub: 'measured shape', color: C.amber, o: ep(t, 6.2, 6.8)},
      {label: 'Reader 3', value: 'pasp box', sub: 'parsed from the mp4', color: C.green, o: ep(t, 7.0, 7.6)},
    ]} />
    <Mid y={800} size={28} color={C.mute} o={ep(t, 8.4, 9.0)}>Control: a 640x360 square-pixel card with a 199x199 circle.</Mid>
  </>
);

/* 3. scale rewrites SAR */
const Scale: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={520} color={C.green} o={ep(t, 0.2, 1.4)} />
    <Head over="Scale to 1280x720" title="The SAR is not carried over." color={C.green} o={ep(t, 0.2, 0.8)} />
    <Cmd y={290} text="ffmpeg -i anam.mp4 -vf scale=1280:720 out.mp4" hi="scale=1280:720" size={30} o={ep(t, 0.9, 1.5)} />
    <Duel y={410} h={300}
      left={{label: 'Source', value: '64:45', sub: 'SAR · 720x576 · DAR 16:9', color: C.cyan, o: ep(t, 2.0, 2.7), valueSize: 100}}
      right={{label: 'Output', value: '1:1', sub: 'SAR · 1280x720 · DAR 16:9\npixels 478x479, a circle', color: C.green, o: ep(t, 3.4, 4.1), valueSize: 100}}
      mid="to" midO={ep(t, 3.0, 3.6)} />
    <Mid y={745} size={28} color={C.mute} o={ep(t, 5.2, 5.8)}>Control: 640x360 square card scaled to 640x720: SAR 2:1, pixels 199x398, DAR 16:9.</Mid>
    <Verdict y={830} text="scale keeps the DAR, and rewrites the SAR" color={C.green} o={ep(t, 6.6, 7.2)} size={34} />
  </>
);

/* 4. setsar changes the flag */
const Flag: React.FC<SceneProps> = ({t}) => (
  <>
    <Head over="Flag only, or baked in" title="Two ways to get 1:1." color={C.amber} o={ep(t, 0.2, 0.8)} />
    <Duel y={290} h={330}
      left={{label: 'Flag only', value: 'DAR 5:4', sub: 'setsar=1 · 720x576\nsame pixel hash\nshape shown 0.70 wide', color: C.red, o: ep(t, 0.9, 1.6), valueSize: 90}}
      right={{label: 'Baked in', value: '1024x576', sub: 'scale=iw*sar:ih,setsar=1\nSAR 1:1 · DAR 16:9\ncircle 383x383', color: C.green, o: ep(t, 3.4, 4.1), valueSize: 90}}
      mid="or" midO={ep(t, 3.0, 3.6)} />
    <Mid y={670} size={28} color={C.dim} o={ep(t, 5.6, 6.2)}>scale=iw*sar:ih alone gives the same pixels and SAR 1:1.</Mid>
    <Verdict y={780} text="setsar relabels. scale rebuilds." color={C.amber} o={ep(t, 6.8, 7.4)} size={34} />
  </>
);

/* 5. Order matters */
const Order: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={560} color={C.red} o={ep(t, 0.2, 1.4)} />
    <Head over="Order matters" title="Same pixels, wrong flag." color={C.red} o={ep(t, 0.2, 0.8)} />
    <Cmd y={290} text="ffmpeg -i anam.mp4 -vf setsar=1,scale=1280:720 out.mp4" hi="setsar=1,scale=1280:720" size={28} o={ep(t, 0.9, 1.5)} />
    <Figure y={400} value="0.70" caption="shown width / height of the circle" color={C.red} size={170} o={ep(t, 2.2, 2.9)} />
    <Row y={690} h={170} cw={400} gap={32} valueSize={48} items={[
      {label: 'Pixels', value: '478x479', sub: 'same as plain scale', color: C.cyan, o: ep(t, 4.2, 4.8)},
      {label: 'Flag', value: '45:64', sub: 'SAR · DAR 5:4', color: C.red, o: ep(t, 5.0, 5.6)},
      {label: 'Shown', value: '900x720', sub: 'width x SAR', color: C.amber, o: ep(t, 5.8, 6.4)},
    ]} />
  </>
);

/* 6. Close */
const Close: React.FC<SceneProps> = ({t}) => (
  <>
    <Halo y={470} color={C.cyan} o={ep(t, 0, 1.2)} />
    <Head over="What to check" title="Read the flags after a scale." color={C.cyan} o={ep(t, 0.2, 0.9)} />
    <Duel y={290} h={260}
      left={{label: 'Always', value: 'ffprobe', sub: 'read SAR and DAR after a scale', color: C.green, o: ep(t, 1.4, 2.1), valueSize: 64}}
      right={{label: 'Avoid', value: 'setsar=1', sub: 'before a scale, unless the pixels are square', color: C.red, o: ep(t, 2.4, 3.1), valueSize: 64}}
      mid="" midO={0} />
    <Mid y={610} size={28} color={C.mute} o={ep(t, 3.8, 4.4)}>Not tested: any player, other builds, real footage, other containers and encoders.</Mid>
    <Mid y={700} size={30} color={C.dim} o={ep(t, 4.6, 5.2)}>FFmpeg Reality Checks · episode 38 · fixture and tests in the description</Mid>
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {ask: Ask, source: Source, scale: Scale, flag: Flag, order: Order, close: Close};
