import React from 'react';
import {C, F, D as DSP} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {VBig, VCmd, VCompare, VLabel, VNote, VPanel, VRows} from '../../kit/V';
import type {SceneProps} from '../../kit/Episode';

/*
 * fs03 "Label or pixels? Why FFmpeg colors shift" (short, 1080x1920, riso palette). Every number drawn here is read from DATA below, which is generated from the
 * live evidence of episodes/fl03/fixture/experiment.mjs (the short measures nothing new). The render engine copies only this file and index.tsx, so the data is
 * embedded: regenerate with `node episodes/fl03/fixture/embed-video-data.mjs`; the test fails on drift.
 * Safe area: x 60..940, y 220..1360 (scenes draw nothing outside it). Colour roles: cyan expected, amber doubt, red failure, green verified, violet lost.
 */

/* BEGIN GENERATED evidence data (node episodes/fl03/fixture/embed-video-data.mjs; do not edit by hand) */
const DATA = {
 "build": "6.1.1",
 "patches": [
  "red",
  "green",
  "blue",
  "gray",
  "black",
  "white"
 ],
 "src": {
  "red": [
   255,
   0,
   0
  ],
  "green": [
   0,
   255,
   0
  ],
  "blue": [
   0,
   0,
   255
  ],
  "gray": [
   128,
   128,
   128
  ]
 },
 "plain": {
  "tag": null,
  "r601": {
   "red": [
    253,
    0,
    0
   ],
   "green": [
    0,
    255,
    0
   ],
   "blue": [
    0,
    0,
    254
   ],
   "gray": [
    128,
    128,
    128
   ]
  },
  "r709": {
   "red": [
    255,
    23,
    0
   ],
   "green": [
    0,
    215,
    0
   ],
   "blue": [
    0,
    14,
    255
   ],
   "gray": [
    128,
    128,
    128
   ]
  },
  "auto": {
   "red": [
    253,
    0,
    0
   ],
   "green": [
    0,
    255,
    0
   ],
   "blue": [
    0,
    0,
    254
   ],
   "gray": [
    128,
    128,
    128
   ]
  },
  "e601": 2,
  "e709": 40,
  "eAuto": 2
 },
 "tagged": {
  "tag": "bt709",
  "r601": {
   "red": [
    232,
    0,
    1
   ],
   "green": [
    19,
    255,
    8
   ],
   "blue": [
    2,
    0,
    243
   ],
   "gray": [
    128,
    128,
    128
   ]
  },
  "r709": {
   "red": [
    254,
    0,
    0
   ],
   "green": [
    0,
    254,
    0
   ],
   "blue": [
    0,
    0,
    254
   ],
   "gray": [
    128,
    128,
    128
   ]
  },
  "auto": {
   "red": [
    254,
    0,
    0
   ],
   "green": [
    0,
    254,
    0
   ],
   "blue": [
    0,
    0,
    254
   ],
   "gray": [
    128,
    128,
    128
   ]
  },
  "e601": 23,
  "e709": 1,
  "eAuto": 1
 },
 "liar": {
  "tag": "bt709",
  "r601": {
   "red": [
    253,
    0,
    0
   ],
   "green": [
    0,
    255,
    0
   ],
   "blue": [
    0,
    0,
    254
   ],
   "gray": [
    128,
    128,
    128
   ]
  },
  "r709": {
   "red": [
    255,
    23,
    0
   ],
   "green": [
    0,
    215,
    0
   ],
   "blue": [
    0,
    14,
    255
   ],
   "gray": [
    128,
    128,
    128
   ]
  },
  "auto": {
   "red": [
    255,
    23,
    0
   ],
   "green": [
    0,
    215,
    0
   ],
   "blue": [
    0,
    14,
    255
   ],
   "gray": [
    128,
    128,
    128
   ]
  },
  "e601": 2,
  "e709": 40,
  "eAuto": 40
 },
 "gray": {
  "gray": {
   "range": "pc",
   "native": [
    76,
    150,
    29
   ],
   "shown": [
    76,
    150,
    29
   ]
  },
  "hue": {
   "range": "tv",
   "native": [
    81,
    145,
    41
   ],
   "shown": [
    76,
    150,
    29
   ]
  }
 },
 "weights": {
  "ccm709": [
   54,
   182,
   18
  ],
  "grayOn709": [
   55,
   183,
   19
  ],
  "ccm601on709": [
   76,
   149,
   29
  ]
 },
 "range": {
  "def": {
   "tag": "unknown",
   "black": 16,
   "white": 235,
   "shownBlack": 0,
   "shownWhite": 255,
   "md5": "3262beb3"
  },
  "pc": {
   "tag": "pc",
   "fmt": "yuvj420p",
   "black": 16,
   "white": 235,
   "shownBlack": 16,
   "shownWhite": 235,
   "md5": "3262beb3"
  },
  "relabelPc": {
   "black": 16,
   "white": 235,
   "shownBlack": 16,
   "shownWhite": 235
  },
  "relabelTv": {
   "shadow": 8,
   "highlight": 247,
   "shownShadow": 0,
   "shownHighlight": 255
  },
  "yuvj": {
   "black": 0,
   "white": 255,
   "tag": "pc"
  }
 },
 "hdr": {
  "nits": [
   0,
   1,
   10,
   50,
   100,
   203,
   600,
   1000,
   4000,
   10000
  ],
  "expected": [
   16,
   48,
   100,
   180,
   235,
   235,
   235,
   235,
   235,
   235
  ],
  "plainY": [
   16,
   48.8,
   81.8,
   112.5,
   127.3,
   143.3,
   168.5,
   180.8,
   213.8,
   235
  ],
  "err": [
   0,
   0.8,
   -18.2,
   -67.5,
   -107.7,
   -91.7,
   -66.5,
   -54.2,
   -21.2,
   0
  ],
  "white100": 127.3,
  "iallY": [
   16,
   48.8,
   81.8,
   112.5,
   127.3,
   143.3,
   168.5,
   180.8,
   213.8,
   235
  ],
  "iallTag": "bt709",
  "iallSame": true,
  "zscaleY": [
   16,
   48,
   100,
   180,
   235,
   255,
   255,
   255,
   255,
   255
  ],
  "hableY": [
   16,
   38,
   73,
   122,
   151,
   182,
   222,
   235,
   254,
   255
  ],
  "srcTrc": "smpte2084"
 },
 "chroma": {
  "p444": {
   "rgb": [
    [
     0,
     0,
     255
    ],
    [
     0,
     0,
     255
    ],
    [
     254,
     0,
     0
    ],
    [
     0,
     0,
     255
    ],
    [
     0,
     0,
     255
    ]
   ],
   "chroma": {
    "y": 81,
    "u": 90,
    "v": 240
   }
  },
  "p422": {
   "rgb": [
    [
     0,
     0,
     254
    ],
    [
     0,
     0,
     254
    ],
    [
     150,
     21,
     149
    ],
    [
     104,
     0,
     103
    ],
    [
     0,
     0,
     254
    ]
   ],
   "chroma": {
    "y": 81,
    "u": 175,
    "v": 167
   }
  },
  "p420": {
   "rgb": [
    [
     0,
     0,
     254
    ],
    [
     0,
     0,
     254
    ],
    [
     150,
     21,
     149
    ],
    [
     104,
     0,
     103
    ],
    [
     0,
     0,
     254
    ]
   ],
   "chroma": {
    "y": 81,
    "u": 175,
    "v": 167
   }
  }
 },
 "bands": {
  "def": {
   "distinct": 65,
   "row0": [
    99,
    100,
    99,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100
   ],
   "row1": [
    100,
    99,
    100,
    99,
    100,
    99,
    100,
    99,
    100,
    100,
    100,
    100,
    101,
    100,
    101,
    100
   ],
   "md5": "6b3cbf",
   "meanRun": 5.305699481865285
  },
  "none": {
   "distinct": 64,
   "row0": [
    99,
    99,
    99,
    99,
    99,
    99,
    99,
    99,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100
   ],
   "row1": [
    99,
    99,
    99,
    99,
    99,
    99,
    99,
    99,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100
   ],
   "md5": "bd0850",
   "maxRun": 16
  },
  "same": [
   "auto",
   "bayer",
   "ed",
   "a_dither",
   "x_dither",
   "flag_ed"
  ],
  "sameMd5": "6b3cbf",
  "rgb8Files": 5
 },
 "labelOnly": {
  "matrix": true,
  "range": true,
  "rangeBsf": true,
  "transfer": true
 },
 "recipe": {
  "command": "ffmpeg -i in.png -vf scale=out_color_matrix=bt709:out_range=tv,format=yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:v libx264 out.mp4",
  "src": {
   "red": [
    255,
    0,
    0
   ],
   "green": [
    0,
    255,
    0
   ],
   "blue": [
    0,
    0,
    255
   ],
   "gray": [
    128,
    128,
    128
   ],
   "black": [
    0,
    0,
    0
   ],
   "white": [
    255,
    255,
    255
   ]
  },
  "tag": {
   "pixFmt": "yuv420p",
   "colorSpace": "bt709",
   "colorPrimaries": "bt709",
   "colorTransfer": "bt709",
   "range": "tv"
  },
  "read709": {
   "patches": {
    "red": [
     254,
     0,
     0
    ],
    "green": [
     0,
     254,
     0
    ],
    "blue": [
     0,
     0,
     254
    ],
    "gray": [
     128,
     128,
     128
    ],
    "black": [
     0,
     0,
     0
    ],
    "white": [
     255,
     255,
     255
    ]
   },
   "worst": 1
  },
  "read601": {
   "patches": {
    "red": [
     232,
     0,
     1
    ],
    "green": [
     19,
     255,
     8
    ],
    "blue": [
     2,
     0,
     243
    ],
    "gray": [
     128,
     128,
     128
    ],
    "black": [
     0,
     0,
     0
    ],
    "white": [
     255,
     255,
     255
    ]
   },
   "worst": 23
  },
  "rawY": {
   "black": 16,
   "white": 235,
   "gray": 126
  },
  "plainErr": 40,
  "plainTag": null
 }
};
/* END GENERATED evidence data */

const D = DATA as any;

/* ---------------------------------------------------------------- helpers */
const rgb = (p: number[]) => `rgb(${p[0]},${p[1]},${p[2]})`;
const gray = (v: number) => rgb([v, v, v]);
const r0 = Math.round;
const fade = (t: number, a: number, d = 0.6) => ep(t, a, a + d);
const X0 = 60, WD = 880;

const T: React.FC<{x?: number; y: number; w?: number; size?: number; color?: string; align?: 'left' | 'center' | 'right'; mono?: boolean; weight?: number; o?: number; lh?: number; display?: boolean; caps?: boolean; children?: React.ReactNode}> = ({x = X0, y, w = WD, size = 34, color = C.text, align = 'left', mono = false, weight = 600, o = 1, lh = 1.25, display = false, caps = false, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, textAlign: align, fontFamily: display ? F.display : mono ? F.mono : F.sans, fontSize: display ? size * DSP.k : size, fontWeight: weight, lineHeight: lh, color, whiteSpace: 'pre-wrap', letterSpacing: caps ? 4 : display ? DSP.lsNum : 0, textTransform: caps ? 'uppercase' : 'none'}}>{children}</div>
);
const Sw: React.FC<{x: number; y: number; w: number; h: number; fill: string; ring?: string; o?: number; r?: number; children?: React.ReactNode}> = ({x, y, w, h, fill, ring, o = 1, r = 14, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: o, boxSizing: 'border-box', borderRadius: r, background: fill, border: `3px solid ${ring ?? C.text}`, boxShadow: `6px 6px 0 ${ring ?? C.text}33`, overflow: 'hidden'}}>{children}</div>
);
const Pill: React.FC<{x: number; y: number; w: number; h?: number; color?: string; size?: number; o?: number; mono?: boolean; children?: React.ReactNode}> = ({x, y, w, h = 56, color = C.cyan, size = 28, o = 1, mono = true, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: o, boxSizing: 'border-box', padding: '0 14px', borderRadius: h / 2, border: `3px solid ${color}`, background: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono ? F.mono : F.sans, fontWeight: 600, fontSize: size, color: C.text, whiteSpace: 'nowrap'}}>{children}</div>
);

/* ---------------------------------------------------------------- 1. ask */
const Ask: React.FC<SceneProps> = ({t}) => (
  <>
    <VLabel kind="over" text="Same file, different color" y={232} color={C.amber} o={fade(t, 0.2)} />
    <VLabel kind="head" text="Label or pixels?" y={282} maxLines={1} o={fade(t, 0.3)} />
    <Sw x={X0} y={470} w={380} h={300} fill={rgb(D.src.green)} o={fade(t, 1)} />
    <T x={440} y={560} w={120} size={80} align="center" color={C.mute} o={fade(t, 3)}>{'→'}</T>
    <Sw x={560} y={470} w={380} h={300} fill={rgb(D.plain.r709.green)} ring={C.red} o={fade(t, 3)} />
    <VBig value={String(D.src.green[1])} label="Pure green" x={X0} y={800} w={380} h={230} accent={C.dim} max={150} o={fade(t, 1.4)} />
    <VBig value={String(D.plain.r709.green[1])} label="One command later" x={560} y={800} w={380} h={230} accent={C.red} color={C.red} max={150} o={fade(t, 3.4)} />
    <VNote text="Is the file wrong, or only its label?" tone="doubt" y={1090} size={40} o={fade(t, 6)} />
    <VNote text="Two readers, synthetic clips." tone="info" y={1220} size={36} o={fade(t, 9)} />
  </>
);

/* ---------------------------------------------------------------- 2. rig */
const Rig: React.FC<SceneProps> = ({t}) => {
  const tag = D.recipe.tag;
  return (
    <>
      <VLabel kind="over" text="Two readers" y={232} color={C.amber} o={fade(t, 0.2)} />
      <VPanel y={290} h={400} color={C.cyan} o={fade(t, 0.8)}>
        <T x={32} y={24} w={800} size={26} caps color={C.cyan} weight={700}>Reader one · the label</T>
        <T x={32} y={76} w={800} size={30} mono color={C.dim}>ffprobe</T>
        <T x={32} y={134} w={820} size={38} mono lh={1.5}>{`pix_fmt=${tag.pixFmt}\ncolor_space=${D.plain.tag ?? 'unknown'}\ncolor_range=${D.range.def.tag}`}</T>
        <T x={32} y={330} w={820} size={30} color={C.dim}>Prints what the file says.</T>
      </VPanel>
      <VPanel y={730} h={400} color={C.amber} o={fade(t, 2.4)}>
        <T x={32} y={24} w={800} size={26} caps color={C.amber} weight={700}>Reader two · the pixels</T>
        <T x={32} y={76} w={800} size={30} mono color={C.dim}>decode, read the values</T>
        <T x={32} y={134} w={820} size={38} mono lh={1.5}>{`green, decoded ${D.plain.auto.green.join(',')}\nas 709        ${D.plain.r709.green.join(',')}`}</T>
        <T x={32} y={330} w={820} size={30} color={C.dim}>Reports what a decoder gives.</T>
      </VPanel>
      <VNote text="Each reader first sees a real effect." tone="ok" tag="Control first" y={1170} size={36} o={fade(t, 5)} />
      <T y={1300} size={30} mono color={C.mute} o={fade(t, 7)}>{`ffmpeg ${D.build}`}</T>
    </>
  );
};

/* ---------------------------------------------------------------- 3. matrix */
const Matrix: React.FC<SceneProps> = ({t}) => (
  <>
    <VLabel kind="over" text="Reality check · matrix" y={232} color={C.amber} o={fade(t, 0.2)} />
    <VPanel y={290} h={450} color={C.cyan} o={fade(t, 0.6)}>
      <T x={32} y={22} w={800} size={26} caps color={C.cyan} weight={700}>The plain command</T>
      <Pill x={32} y={76} w={400} h={54} color={C.cyan} size={26} o={fade(t, 1.2)}>{`tag: ${D.plain.tag ?? 'none'}`}</Pill>
      <Pill x={452} y={76} w={400} h={54} color={C.amber} size={26} o={fade(t, 1.6)}>pixels: BT.601</Pill>
      <Sw x={32} y={170} w={250} h={140} fill={rgb(D.src.green)} o={fade(t, 2.4)} />
      <T x={290} y={200} w={100} size={64} align="center" color={C.mute} o={fade(t, 3.4)}>{'→'}</T>
      <Sw x={400} y={170} w={250} h={140} fill={rgb(D.plain.r709.green)} ring={C.red} o={fade(t, 3.4)} />
      <T x={32} y={324} w={250} size={40} mono weight={700} align="center" o={fade(t, 2.4)}>{D.src.green.join(',')}</T>
      <T x={400} y={324} w={250} size={40} mono weight={700} align="center" color={C.red} o={fade(t, 3.4)}>{D.plain.r709.green.join(',')}</T>
      <T x={32} y={384} w={820} size={28} color={C.dim} o={fade(t, 3.4)}>Read as BT.709, green falls.</T>
    </VPanel>
    <VPanel y={790} h={430} color={C.red} o={fade(t, 6)}>
      <T x={32} y={22} w={800} size={30} mono weight={700}>-colorspace bt709</T>
      <Pill x={32} y={76} w={400} h={54} color={C.cyan} size={26} o={fade(t, 6.6)}>{`tag: ${D.liar.tag}`}</Pill>
      <Pill x={452} y={76} w={400} h={54} color={C.amber} size={26} o={fade(t, 7)}>pixels: BT.601</Pill>
      <T x={32} y={160} w={400} size={26} caps color={C.dim} weight={700} o={fade(t, 8)}>Worst error</T>
      <T x={32} y={196} w={400} size={150} display color={C.red} o={fade(t, 8)}>{D.liar.eAuto}</T>
      <T x={440} y={226} w={410} size={34} color={C.text} o={fade(t, 8.6)} lh={1.3}>Tagged, but the pixels did not change.</T>
    </VPanel>
    <VNote text="A tag that disagrees with the pixels." tone="fail" y={1262} size={34} o={fade(t, 10)} />
  </>
);

/* ---------------------------------------------------------------- 4. range */
const Range: React.FC<SceneProps> = ({t}) => {
  const bx = 60, bw = 880, k = bw / 255;
  const block = (y: number, a: number, title: string, mono: boolean, tagTxt: string, tagColor: string, black: number, white: number, sb: number, sw: number, ring: string) => (
    <>
      <T y={y} w={520} size={mono ? 36 : 40} mono={mono} display={!mono} weight={700} o={fade(t, a)}>{title}</T>
      <Pill x={600} y={y - 2} w={340} h={52} color={tagColor} size={26} o={fade(t, a)}>{tagTxt}</Pill>
      <div style={{position: 'absolute', left: bx, top: y + 130, width: bw, height: 60, borderRadius: 10, background: 'linear-gradient(to right, #000, #fff)', border: `3px solid ${C.text}`, boxSizing: 'border-box', opacity: fade(t, a)}} />
      <div style={{position: 'absolute', left: bx + black * k, top: y + 120, width: (white - black) * k, height: 80, boxSizing: 'border-box', border: `3px dashed ${C.cyan}`, borderRadius: 6, opacity: fade(t, a + 0.4)}} />
      <T x={bx + black * k - 10} y={y + 72} w={260} size={34} mono weight={700} o={fade(t, a + 0.6)}>{`black ${black}`}</T>
      <T x={bx + white * k - 250} y={y + 72} w={260} size={34} mono weight={700} align="right" o={fade(t, a + 0.6)}>{`white ${white}`}</T>
      <T y={y + 224} w={300} size={26} caps color={C.dim} weight={700} o={fade(t, a + 1.4)}>A player shows</T>
      <Sw x={X0} y={y + 262} w={110} h={64} fill={gray(sb)} ring={ring} r={10} o={fade(t, a + 1.4)} />
      <T x={190} y={y + 270} w={300} size={36} mono weight={700} color={ring} o={fade(t, a + 1.4)}>{`black ${sb}`}</T>
      <Sw x={500} y={y + 262} w={110} h={64} fill={gray(sw)} ring={ring} r={10} o={fade(t, a + 1.8)} />
      <T x={630} y={y + 270} w={310} size={36} mono weight={700} color={ring} o={fade(t, a + 1.8)}>{`white ${sw}`}</T>
    </>
  );
  const R = D.range;
  return (
    <>
      <VLabel kind="over" text="Reality check · range" y={232} color={C.amber} o={fade(t, 0.2)} />
      {block(290, 0.8, 'The default', false, `range tag: ${R.def.tag}`, C.cyan, R.def.black, R.def.white, R.def.shownBlack, R.def.shownWhite, C.green)}
      {block(700, 5.5, '-color_range pc', true, `range tag: ${R.pc.tag}`, C.red, R.pc.black, R.pc.white, R.pc.shownBlack, R.pc.shownWhite, C.red)}
      <VNote text={`Same bytes, md5 ${R.def.md5} both times.`} tone="doubt" y={1170} size={36} o={fade(t, 10)} />
    </>
  );
};

/* ---------------------------------------------------------------- 5. hdr */
const Hdr: React.FC<SceneProps> = ({t}) => {
  const H = D.hdr;
  return (
    <>
      <VLabel kind="over" text="Reality check · HDR to SDR" y={232} color={C.amber} o={fade(t, 0.2)} />
      <VRows y={290} h={560} max={255} p={ep(t, 1, 3)} rows={[
        {label: 'SDR white target', value: H.expected[4], text: String(H.expected[4]), color: C.cyan},
        {label: `${H.nits[4]} nit white, plain -pix_fmt`, value: H.plainY[4], text: String(r0(H.plainY[4])), color: C.red, o: fade(t, 2)},
        {label: 'The colorspace filter with iall', value: H.iallY[4], text: String(r0(H.iallY[4])), color: C.amber, o: fade(t, 5)},
      ]} />
      <VNote text={`Same pixels. The tags now say ${H.iallTag}.`} tone="doubt" tag="colorspace relabel" y={940} size={38} o={fade(t, 7)} />
      <VNote text={`${H.nits[4]} nit white lands at luma ${r0(H.plainY[4])}, not ${H.expected[4]}.`} tone="fail" y={1130} size={38} o={fade(t, 3.5)} />
    </>
  );
};

/* ---------------------------------------------------------------- 6. verdict */
const Verdict: React.FC<SceneProps> = ({t}) => {
  const L = D.labelOnly;
  const n = ['matrix', 'range', 'transfer'].filter((k) => L[k]).length;
  const cmds = ['-colorspace bt709', '-color_range pc', 'colorspace … iall'];
  return (
    <>
      <VLabel kind="over" text="Three commands, one pattern" y={232} color={C.amber} o={fade(t, 0.2)} />
      {cmds.map((c, i) => {
        const y = 290 + i * 260;
        const a = 0.8 + i * 1.6;
        return (
          <VPanel key={c} y={y} h={230} color={C.amber} o={fade(t, a)}>
            <T x={32} y={26} w={816} size={36} mono weight={700}>{c}</T>
            <Pill x={32} y={110} w={380} h={64} color={C.amber} size={28} o={fade(t, a + 0.6)}>label: changed</Pill>
            <Pill x={440} y={110} w={408} h={64} color={C.green} size={28} o={fade(t, a + 1.2)}>pixels: identical</Pill>
          </VPanel>
        );
      })}
      <VBig value={`${n} of 3`} label="Label only" sub="A wrong label can be fixed with a tag." y={1090} h={270} accent={C.amber} max={160} o={fade(t, 6)} />
    </>
  );
};

/* ---------------------------------------------------------------- 7. chroma */
const Chroma: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {fmt: 'yuv444p', d: D.chroma.p444, color: C.green, y: 290, a: 0.8},
    {fmt: 'yuv420p', d: D.chroma.p420, color: C.red, y: 620, a: 3.2},
  ];
  const cw = 160, cg = 10;
  return (
    <>
      <VLabel kind="over" text="Lost pixels · chroma" y={232} color={C.violet} o={fade(t, 0.2)} />
      {rows.map((r) => (
        <React.Fragment key={r.fmt}>
          <T y={r.y} w={400} size={38} mono weight={700} o={fade(t, r.a)}>{r.fmt}</T>
          {r.d.rgb.map((p: number[], i: number) => (
            <Sw key={i} x={80 + i * (cw + cg)} y={r.y + 56} w={cw} h={150} fill={rgb(p)} ring={i === 2 ? r.color : C.line} r={10} o={fade(t, r.a + 0.15 * i)} />
          ))}
          <T y={r.y + 224} w={520} size={30} mono color={C.dim} o={fade(t, r.a + 0.8)}>{`Y ${r0(r.d.chroma.y)}  U ${r.d.chroma.u}  V ${r.d.chroma.v}`}</T>
          <T x={560} y={r.y + 224} w={380} size={30} weight={700} align="right" color={r.color} o={fade(t, r.a + 0.8)}>{r.fmt === 'yuv444p' ? 'stays red' : 'turns purple'}</T>
        </React.Fragment>
      ))}
      <VBig value={D.chroma.p420.rgb[2].join(', ')} label="The line, as RGB" y={950} h={200} accent={C.violet} max={110} o={fade(t, 6)} />
      <VNote text={`Brightness stays at ${r0(D.chroma.p420.chroma.y)}. No tag brings the color back.`} tone="fail" y={1190} size={36} o={fade(t, 8)} />
    </>
  );
};

/* ---------------------------------------------------------------- 8. bands */
const Bands: React.FC<SceneProps> = ({t}) => {
  const B = D.bands;
  const chips = ['default', ...B.same];
  return (
    <>
      <VLabel kind="over" text="One false alarm · dither" y={232} color={C.green} o={fade(t, 0.2)} />
      <VCompare y={290} h={600} mid="vs" midColor={C.mute}
        a={{label: 'format=yuv420p', value: String(B.def.distinct), sub: 'values, already dithered', color: C.green, o: fade(t, 0.8)}}
        b={{label: 'sws_dither=none', value: String(B.none.distinct), sub: 'values, flat bands', color: C.red, o: fade(t, 3.4)}} midO={fade(t, 3)} />
      <T y={930} w={880} size={26} caps color={C.dim} weight={700} o={fade(t, 6)}>Seven spellings, one checksum</T>
      {chips.map((c, i) => (
        <Pill key={c} x={X0 + (i % 4) * 224} y={980 + Math.floor(i / 4) * 80} w={208} h={64} color={C.green} size={24} o={fade(t, 6.2 + i * 0.2)}>{c}</Pill>
      ))}
      <Pill x={X0 + 3 * 224} y={980 + 80} w={208} h={64} color={C.red} size={24} o={fade(t, 8)}>none</Pill>
      <VNote text={`Checksum ${B.sameMd5} for all seven, ${B.none.md5} for none.`} tone="ok" y={1180} size={32} o={fade(t, 8.6)} />
    </>
  );
};

/* ---------------------------------------------------------------- 9. gray */
const GrayScene: React.FC<SceneProps> = ({t}) => {
  const W = D.weights;
  const gap = W.grayOn709[1] - W.ccm601on709[1];
  return (
    <>
      <VLabel kind="over" text="Black and white · green patch" y={232} color={C.amber} o={fade(t, 0.2)} />
      <VRows y={290} h={420} max={255} p={ep(t, 1, 3)} rows={[
        {label: 'format=gray on a BT.709 file', value: W.grayOn709[1], text: String(W.grayOn709[1]), color: C.green},
        {label: 'The 601 mixer', value: W.ccm601on709[1], text: String(W.ccm601on709[1]), color: C.red, o: fade(t, 2)},
      ]} />
      <Sw x={X0} y={770} w={400} h={140} fill={gray(W.grayOn709[1])} ring={C.green} o={fade(t, 3)} />
      <Sw x={540} y={770} w={400} h={140} fill={gray(W.ccm601on709[1])} ring={C.red} o={fade(t, 4)} />
      <VBig value={String(gap)} label="Levels off" sub="Same picture, two grays." y={940} h={290} accent={C.red} max={170} o={fade(t, 6)} />
    </>
  );
};

/* ---------------------------------------------------------------- 10. recipe */
const Recipe: React.FC<SceneProps> = ({t}) => {
  const R = D.recipe;
  const tags = R.tag;
  return (
    <>
      <VLabel kind="over" text="The recipe · web video" y={232} color={C.green} o={fade(t, 0.2)} />
      <VCmd text={R.command} y={284} h={400} size={40} maxLines={8} hi={['scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-colorspace bt709 -color_primaries bt709 -color_trc bt709']} o={fade(t, 0.5)} />
      <VNote text={`${tags.colorSpace}, ${tags.range}`} tone="info" tag="Reader one · ffprobe" y={730} size={40} o={fade(t, 4)} />
      <VNote text={`worst error ${R.read709.worst}`} tone="ok" tag="Reader two · decoded" y={860} size={40} o={fade(t, 6)} />
      <VNote text={`black ${R.rawY.black}, white ${R.rawY.white}`} tone="ok" tag="Raw luma" y={990} size={40} o={fade(t, 8)} />
      <VNote text={`The plain command is off by ${R.plainErr}.`} tone="fail" tag="Control" y={1120} size={40} o={fade(t, 10)} />
    </>
  );
};

/* ---------------------------------------------------------------- 11. notest */
const NoTest: React.FC<SceneProps> = ({t}) => (
  <>
    <VLabel kind="over" text="Check both" y={232} color={C.green} o={fade(t, 0.2)} />
    <Pill x={X0} y={290} w={380} h={110} color={C.cyan} size={44} mono={false} o={fade(t, 0.5)}>the label</Pill>
    <T x={400} y={312} w={200} size={80} align="center" color={C.green} o={fade(t, 1.2)}>+</T>
    <Pill x={560} y={290} w={380} h={110} color={C.amber} size={44} mono={false} o={fade(t, 1)}>the pixels</Pill>
    <VNote text="Real footage, real players, HLG, other encoders." tone="doubt" tag="Not tested" y={500} size={40} o={fade(t, 3)} />
    <VNote text="The test, the source films and the long cut." tone="ok" tag="In the description" y={780} size={40} o={fade(t, 6)} />
  </>
);

export const scenes: Record<string, React.FC<SceneProps>> = {
  ask: Ask, rig: Rig, matrix: Matrix, range: Range, hdr: Hdr, verdict: Verdict, chroma: Chroma, bands: Bands, gray: GrayScene, recipe: Recipe, notest: NoTest,
};
