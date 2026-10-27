import React from 'react';
import {C, F, D as DSP, W} from '../../kit/theme';
import {ep} from '../../kit/anim';
import {Head, Mid, Cmd, Verdict} from '../../kit/Sym';
import {Txt, Svg} from '../../kit/Primitives';
import type {SceneProps} from '../../kit/Episode';

/*
 * fl03 "Why do FFmpeg colors shift?" (long, riso palette). Every number drawn here is read from DATA below, which is generated from the live
 * evidence of episodes/fl03/fixture/experiment.mjs (ff17, ff22, ff26, ff44, ff76, ff85 re-run, plus the recipe check). The render engine copies only
 * this file and index.tsx, so the data is embedded: regenerate with `node episodes/fl03/fixture/embed-video-data.mjs`; the test fails on drift.
 * Colour roles: cyan = expected / baseline, amber = doubt, red = surprise or failure, green = verified, violet = lost.
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
const BUILD_OLD = '8.1.2'; // the build the source films recorded (not re-run here); a label, not a measurement

/* ---------------------------------------------------------------- helpers */
type Kids = {children?: React.ReactNode};
const rgb = (p: number[]) => `rgb(${p[0]},${p[1]},${p[2]})`;
const gray = (v: number) => rgb([v, v, v]);
/** limited range luma -> what a screen draws */
const screenGray = (y: number) => gray(Math.max(0, Math.min(255, Math.round(((y - 16) * 255) / 219))));
const r0 = Math.round;
const num = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const fade = (t: number, a: number, d = 0.6) => ep(t, a, a + d);
const near = (a: number[], b: number[], tol = 3) => a.every((v, i) => Math.abs(v - b[i]) <= tol);

const Tag: React.FC<{x: number; y: number; w?: number; color?: string; size?: number; o?: number; align?: 'left' | 'center' | 'right'} & Kids> = ({x, y, w = 600, color = C.cyan, size = 20, o = 1, align = 'left', children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, textAlign: align, fontFamily: F.sans, fontSize: size, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color, whiteSpace: 'nowrap'}}>{children}</div>
);
const Card: React.FC<{x: number; y: number; w: number; h: number; color?: string; o?: number; fill?: string; dashed?: boolean} & Kids> = ({x, y, w, h, color = C.line, o = 1, fill, dashed = false, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: o, boxSizing: 'border-box', borderRadius: 18, background: fill ?? C.bg2, border: `3px ${dashed ? 'dashed' : 'solid'} ${color}`, boxShadow: dashed ? 'none' : `6px 6px 0 ${color}33`}}>{children}</div>
);
const Sw: React.FC<{x: number; y: number; w: number; h: number; fill: string; ring?: string; o?: number; r?: number} & Kids> = ({x, y, w, h, fill, ring, o = 1, r = 12, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: o, boxSizing: 'border-box', borderRadius: r, background: fill, border: `3px solid ${ring ?? C.text}`, boxShadow: `5px 5px 0 ${ring ?? C.text}33`, overflow: 'hidden'}}>{children}</div>
);
const Pill: React.FC<{x: number; y: number; w?: number; h?: number; color?: string; fill?: string; size?: number; o?: number; mono?: boolean; align?: 'left' | 'center'} & Kids> = ({x, y, w, h = 44, color = C.cyan, fill, size = 24, o = 1, mono = true, align = 'center', children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: o, boxSizing: 'border-box', padding: '0 16px', borderRadius: h / 2, border: `2.5px solid ${color}`, background: fill ?? `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: align === 'center' ? 'center' : 'flex-start', fontFamily: mono ? F.mono : F.sans, fontWeight: 600, fontSize: size, color: C.text, whiteSpace: 'nowrap'}}>{children}</div>
);
const Line: React.FC<{x1: number; y1: number; x2: number; y2: number; color?: string; width?: number; dashed?: boolean; o?: number}> = ({x1, y1, x2, y2, color = C.mute, width = 3, dashed = false, o = 1}) => (
  <svg style={{position: 'absolute', left: 0, top: 0, opacity: o, pointerEvents: 'none'}} width={W} height={1080}>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeDasharray={dashed ? '12 9' : undefined} strokeLinecap="round" />
  </svg>
);
const Big: React.FC<{x: number; y: number; w?: number; size?: number; color?: string; align?: 'left' | 'center' | 'right'; o?: number} & Kids> = ({x, y, w = 400, size = 64, color = C.text, align = 'left', o = 1, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, opacity: o, textAlign: align, fontFamily: F.display, fontSize: size * DSP.k, lineHeight: 1.05, letterSpacing: DSP.lsNum, color, whiteSpace: 'nowrap'}}>{children}</div>
);

/* ---------------------------------------------------------------- 1. ask */
const Ask: React.FC<SceneProps> = ({t}) => {
  const cols = [360, 960, 1560];
  const strip = (c: {rgb: number[][]}) => (
    <div style={{position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center'}}>
      {c.rgb.map((p, i) => <div key={i} style={{width: 26, height: '100%', background: rgb(p)}} />)}
    </div>
  );
  const blue = D.chroma.p444.rgb[0];
  const sz = 210;
  const pair = (cx: number, a: number, title: string, before: React.ReactNode, after: React.ReactNode, vb: string, va: string, sb: string, sa: string, color: string) => (
    <>
      <Tag x={cx - 260} y={262} w={520} align="center" color={C.dim} o={fade(t, a)}>{title}</Tag>
      <Sw x={cx - 260} y={310} w={sz} h={sz} fill={C.bg2} o={fade(t, a)}>{before}</Sw>
      <Txt x={cx - 40} y={310 + sz / 2 - 38} w={80} size={64} align="center" color={C.mute} o={fade(t, a + 1.6)}>{'\u2192'}</Txt>
      <Sw x={cx + 50} y={310} w={sz} h={sz} fill={C.bg2} ring={color} o={fade(t, a + 1.8)}>{after}</Sw>
      <Big x={cx - 260} y={546} w={sz} size={44} align="center" o={fade(t, a)}>{vb}</Big>
      <Big x={cx + 50} y={546} w={sz} size={44} align="center" color={color} o={fade(t, a + 1.8)}>{va}</Big>
      <Txt x={cx - 280} y={610} w={sz + 40} size={22} mono align="center" color={C.dim} o={fade(t, a)}>{sb}</Txt>
      <Txt x={cx + 30} y={610} w={sz + 40} size={22} mono align="center" color={C.dim} o={fade(t, a + 1.8)}>{sa}</Txt>
    </>
  );
  const fill = (c: string) => <div style={{position: 'absolute', inset: 0, background: c}} />;
  return (
    <>
      <Head over="Three shifts, one question" title="Label or pixels?" color={C.amber} o={ep(t, 0.2, 0.8)} />
      {pair(cols[0], 1.0, 'Pure green', fill(rgb(D.src.green)), fill(rgb(D.plain.r709.green)),
        `G ${D.src.green[1]}`, `G ${D.plain.r709.green[1]}`, D.src.green.join(', '), D.plain.r709.green.join(', '), C.red)}
      {pair(cols[1], 4.8, 'A thin red line', <div style={{position: 'absolute', inset: 0, background: rgb(blue)}}>{strip(D.chroma.p444)}</div>, <div style={{position: 'absolute', inset: 0, background: rgb(blue)}}>{strip(D.chroma.p420)}</div>,
        'red', 'purple', D.chroma.p444.rgb[2].join(', '), D.chroma.p420.rgb[2].join(', '), C.red)}
      {pair(cols[2], 8.6, `A ${D.hdr.nits[4]} nit white`, fill(screenGray(D.hdr.expected[4])), fill(screenGray(D.hdr.plainY[4])),
        `Y ${D.hdr.expected[4]}`, `Y ${r0(D.hdr.plainY[4])}`, 'SDR white', 'HDR, plain cmd', C.red)}
      <Verdict y={760} text="Six experiments re-run on synthetic clips, then one command checked." color={C.cyan} size={32} o={fade(t, 12.5)} />
    </>
  );
};

/* ---------------------------------------------------------------- 2. rig */
const Rig: React.FC<{t: number} & Partial<SceneProps>> = ({t}) => {
  const tag = D.recipe.tag;
  return (
    <>
      <Head over="Two readers" title="Label and pixels" o={ep(t, 0.2, 0.8)} />
      <Card x={760} y={262} w={400} h={110} color={C.text} o={fade(t, 0.8)}>
        <Txt x={0} y={20} w={400} size={36} mono align="center" color={C.text} weight={700}>out.mp4</Txt>
        <Txt x={0} y={66} w={400} size={22} mono align="center" color={C.dim}>{tag.pixFmt} · libx264</Txt>
      </Card>
      <Line x1={860} y1={374} x2={500} y2={450} color={C.cyan} o={fade(t, 1.6)} />
      <Line x1={1060} y1={374} x2={1420} y2={450} color={C.amber} o={fade(t, 1.6)} />
      <Card x={96} y={450} w={760} h={306} color={C.cyan} o={fade(t, 2.0)}>
        <Tag x={28} y={22} color={C.cyan}>Reader one · the label</Tag>
        <Txt x={28} y={66} size={26} mono color={C.dim}>ffprobe -show_streams</Txt>
        <Txt x={28} y={112} w={700} size={30} mono color={C.text} lh={1.5}>{`pix_fmt=${tag.pixFmt}\ncolor_space=${D.plain.tag ?? 'unknown'}\ncolor_range=${D.range.def.tag}`}</Txt>
        <Txt x={28} y={256} w={700} size={24} color={C.dim}>Prints what the file says it is.</Txt>
      </Card>
      <Card x={1064} y={450} w={760} h={306} color={C.amber} o={fade(t, 3.0)}>
        <Tag x={28} y={22} color={C.amber}>Reader two · the pixels</Tag>
        <Txt x={28} y={66} size={26} mono color={C.dim}>decode to rgb24, read the values</Txt>
        <Txt x={28} y={112} w={700} size={30} mono color={C.text} lh={1.5}>{`green, as decoded  ${D.plain.auto.green.join(', ')}\ngreen, read as 709  ${D.plain.r709.green.join(', ')}`}</Txt>
        <Txt x={28} y={256} w={700} size={24} color={C.dim}>Reports what a decoder gives back.</Txt>
      </Card>
      <Pill x={96} y={786} w={760} color={C.green} size={22} mono={false} o={fade(t, 5.5)}>{`Control: a file tagged ${D.tagged.tag} shows the tag`}</Pill>
      <Pill x={1064} y={786} w={760} color={C.green} size={22} mono={false} o={fade(t, 6.5)}>{`Control: the default reads ${D.plain.e709} off under 709`}</Pill>
      <Mid y={846} size={26} color={C.mute} mono o={fade(t, 8)}>{`ffmpeg ${D.build}`}</Mid>
    </>
  );
};

/* ---------------------------------------------------------------- 3. matrix */
const Matrix: React.FC<SceneProps> = ({t}) => {
  const names = ['red', 'green', 'blue', 'gray'];
  const x0 = 470, cw = 330, gap = 24;
  const rows = [
    {label: 'Source', sub: 'what we put in', color: C.text, data: D.src, a: 1.4},
    {label: 'Read as BT.601', sub: 'matches the pixels', color: C.cyan, data: D.plain.r601, a: 5},
    {label: 'Read as BT.709', sub: 'what the plain file gets', color: C.red, data: D.plain.r709, a: 9},
  ];
  return (
    <>
      <Head over="Reality check one · matrix" title="Same bytes, two readings" o={ep(t, 0.2, 0.8)} />
      <Cmd y={236} text="ffmpeg -i in.png -c:v libx264 -pix_fmt yuv420p out.mp4" size={26} hi="-pix_fmt yuv420p" o={fade(t, 0.6)} />
      {names.map((n, i) => <Tag key={n} x={x0 + i * (cw + gap)} y={334} w={cw} align="center" color={C.dim} o={fade(t, 1.2)}>{n}</Tag>)}
      {rows.map((r, ri) => {
        const y = 370 + ri * 148;
        return (
          <React.Fragment key={r.label}>
            <Txt x={96} y={y + 20} w={340} size={30} weight={700} color={r.color} o={fade(t, r.a)}>{r.label}</Txt>
            <Txt x={96} y={y + 62} w={340} size={22} color={C.dim} o={fade(t, r.a)}>{r.sub}</Txt>
            {names.map((n, i) => {
              const p: number[] = r.data[n];
              const bad = ri === 2 && !near(p, D.src[n], 8);
              const ring = ri === 2 ? (bad ? C.red : C.green) : C.text;
              const x = x0 + i * (cw + gap);
              return (
                <React.Fragment key={n}>
                  <Sw x={x + (cw - 190) / 2} y={y} w={190} h={84} fill={rgb(p)} ring={ring} o={fade(t, r.a + 0.15 * i)} />
                  <Txt x={x} y={y + 92} w={cw} size={24} mono align="center" weight={bad ? 700 : 500} color={bad ? C.red : C.dim} o={fade(t, r.a + 0.15 * i)}>{p.join(', ')}</Txt>
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
      <Verdict y={822} text={`Green ${D.src.green[1]} to ${D.plain.r709.green[1]}. Red gains ${D.plain.r709.red[1]} in green. Gray does not move.`} color={C.red} size={30} o={fade(t, 11.5)} />
    </>
  );
};

/* ---------------------------------------------------------------- 4. tag */
const Tagged: React.FC<SceneProps> = ({t}) => {
  const cards = [
    {title: 'Converted and tagged', cmd: 'out_color_matrix=bt709 + tags', top: ['Label', D.tagged.tag], bottom: ['Pixels', 'BT.709'], match: true, err: D.tagged.eAuto, px: D.tagged.auto.green, a: 1.0},
    {title: 'The same file', cmd: 'a decoder that assumes BT.601', top: ['Reader assumes', 'BT.601'], bottom: ['Pixels', 'BT.709'], match: false, err: D.tagged.e601, px: D.tagged.r601.green, a: 5.5},
    {title: 'A label only', cmd: '-colorspace bt709', top: ['Label', D.liar.tag], bottom: ['Pixels', 'BT.601'], match: false, err: D.liar.eAuto, px: D.liar.auto.green, a: 10},
  ];
  return (
    <>
      <Head over="Reality check one · tag" title="Does the tag match the pixels?" o={ep(t, 0.2, 0.8)} />
      {cards.map((c, i) => {
        const x = 96 + i * 592, col = c.match ? C.green : C.red;
        const o = fade(t, c.a);
        return (
          <React.Fragment key={i}>
            <Card x={x} y={262} w={544} h={548} color={col} o={o}>
              <Tag x={28} y={22} w={490} color={col}>{c.title}</Tag>
              <Txt x={28} y={62} w={490} size={24} mono color={C.dim}>{c.cmd}</Txt>
              <Txt x={28} y={126} w={200} size={20} weight={700} color={C.mute}>{c.top[0].toUpperCase()}</Txt>
              <Pill x={28} y={154} w={488} h={54} color={C.cyan} size={28}>{c.top[1]}</Pill>
              <Big x={28} y={216} w={488} size={44} align="center" color={col}>{c.match ? '=' : '≠'}</Big>
              <Txt x={28} y={292} w={200} size={20} weight={700} color={C.mute}>{c.bottom[0].toUpperCase()}</Txt>
              <Pill x={28} y={320} w={488} h={54} color={C.amber} size={28}>{c.bottom[1]}</Pill>
              <Sw x={28} y={404} w={150} h={96} fill={rgb(c.px)} ring={col} />
              <Txt x={14} y={506} w={178} size={20} mono align="center" color={C.dim}>{c.px.join(', ')}</Txt>
              <Txt x={200} y={408} w={320} size={22} weight={700} color={C.mute}>WORST ERROR</Txt>
              <Big x={200} y={436} w={320} size={92} color={col}>{c.err}</Big>
            </Card>
          </React.Fragment>
        );
      })}
      <Mid y={836} size={28} color={C.dim} o={fade(t, 13)}>{'A tag that disagrees with the pixels is worse than no tag.'}</Mid>
    </>
  );
};

/* ---------------------------------------------------------------- 5. gray */
const GrayScene: React.FC<SceneProps> = ({t}) => {
  const cols = [C.red, C.green, C.cyan];
  const names = ['red', 'green', 'blue'];
  const panels = [
    {x: 96, key: 'gray', cmd: 'format=gray', sub: `stores full range · ${D.gray.gray.range}`, a: 1.2},
    {x: 990, key: 'hue', cmd: 'hue=s=0', sub: `stores limited range · ${D.gray.hue.range}`, a: 5.5},
  ];
  const src = [D.src.red, D.src.green, D.src.blue];
  return (
    <>
      <Head over="Reality check two · gray" title="Same picture, other numbers" o={ep(t, 0.2, 0.8)} />
      {panels.map((p) => {
        const g = D.gray[p.key];
        return (
          <React.Fragment key={p.key}>
            <Card x={p.x} y={250} w={834} h={520} color={C.cyan} o={fade(t, p.a)}>
              <Txt x={28} y={20} size={36} mono weight={700} color={C.text}>{p.cmd}</Txt>
              <Txt x={28} y={68} size={24} color={C.dim}>{p.sub}</Txt>
              {names.map((n, i) => (
                <React.Fragment key={n}>
                  <Sw x={28} y={118 + i * 74} w={64} h={52} fill={rgb(src[i])} ring={C.line} o={fade(t, p.a + 0.4 + 0.3 * i)} r={8} />
                  <div style={{position: 'absolute', left: 112, top: 126 + i * 74, width: (g.native[i] / 255) * 560, height: 38, borderRadius: 8, background: cols[i], opacity: fade(t, p.a + 0.4 + 0.3 * i)}} />
                  <Txt x={112 + (g.native[i] / 255) * 560 + 14} y={124 + i * 74} size={32} mono weight={700} color={C.text} o={fade(t, p.a + 0.4 + 0.3 * i)}>{g.native[i]}</Txt>
                </React.Fragment>
              ))}
              <Tag x={28} y={352} color={C.dim} o={fade(t, p.a + 2)}>stored in the file</Tag>
              <div style={{position: 'absolute', left: 28, top: 392, width: 778, height: 2, background: C.line}} />
              <Tag x={28} y={410} color={C.green} o={fade(t, p.a + 2.4)}>on a screen</Tag>
              {names.map((n, i) => (
                <React.Fragment key={n}>
                  <Sw x={28 + i * 190} y={446} w={170} h={50} fill={gray(g.shown[i])} ring={C.green} o={fade(t, p.a + 2.4 + 0.3 * i)} />
                  <Txt x={28 + i * 190} y={448} w={170} size={30} mono weight={700} align="center" color={g.shown[i] > 120 ? C.bg : C.capText || C.bg2} o={fade(t, p.a + 2.4 + 0.3 * i)}>{g.shown[i]}</Txt>
                </React.Fragment>
              ))}
            </Card>
          </React.Fragment>
        );
      })}
      <Mid y={796} size={28} color={C.dim} o={fade(t, 11)}>The screen stretches limited range back, so both look the same.</Mid>
    </>
  );
};

/* ---------------------------------------------------------------- 6. weights */
const Weights: React.FC<SceneProps> = ({t}) => {
  const names = ['red', 'green', 'blue'];
  const src = [D.src.red, D.src.green, D.src.blue];
  const series = [
    {key: 'ccm709', label: 'Mixer, 709 weights', color: C.cyan},
    {key: 'grayOn709', label: 'format=gray on a 709 file', color: C.green},
    {key: 'ccm601on709', label: 'Mixer, 601 weights', color: C.red},
  ];
  const base = 760, k = 1.55, bw = 92, bg = 14, gw = 3 * bw + 2 * bg, gg = 130, x0 = 190;
  const gx = (gi: number) => x0 + gi * (gw + gg);
  const yOf = (v: number) => base - v * k;
  const gDiff = D.weights.grayOn709[1] - D.weights.ccm601on709[1];
  return (
    <>
      <Head over="Reality check two · weights" title="Which weights turn color into gray?" o={ep(t, 0.2, 0.8)} />
      <Line x1={x0 - 30} y1={base} x2={x0 + 3 * gw + 2 * gg + 30} y2={base} color={C.mute} width={3} />
      {names.map((n, gi) => (
        <React.Fragment key={n}>
          {series.map((s, si) => {
            const v: number = D.weights[s.key][gi];
            const a = 1.2 + si * 2.2 + gi * 0.25;
            const h = v * k * ep(t, a, a + 0.9);
            return (
              <React.Fragment key={s.key}>
                <div style={{position: 'absolute', left: gx(gi) + si * (bw + bg), top: base - h, width: bw, height: h, borderRadius: '8px 8px 0 0', background: s.color, boxShadow: `5px 5px 0 ${s.color}44`}} />
                <Txt x={gx(gi) + si * (bw + bg) - 10} y={base - h - 40} w={bw + 20} size={28} mono weight={700} align="center" color={C.text} o={fade(t, a + 0.6, 0.4)}>{v}</Txt>
              </React.Fragment>
            );
          })}
          <Sw x={gx(gi) + gw / 2 - 40} y={base + 18} w={80} h={40} fill={rgb(src[gi])} ring={C.line} r={8} />
          <Tag x={gx(gi)} y={base + 66} w={gw} align="center" color={C.dim} size={20}>{n} patch</Tag>
        </React.Fragment>
      ))}
      {/* the gap on the green group */}
      <Line x1={gx(1) + gw + 16} y1={yOf(D.weights.grayOn709[1])} x2={gx(1) + gw + 16} y2={yOf(D.weights.ccm601on709[1])} color={C.red} width={5} o={fade(t, 7.5)} />
      <Txt x={gx(1) + gw + 34} y={yOf((D.weights.grayOn709[1] + D.weights.ccm601on709[1]) / 2) - 30} w={260} size={30} weight={700} color={C.red} o={fade(t, 7.5)} lh={1.2}>{`${gDiff} levels\noff in green`}</Txt>
      {/* legend */}
      {series.map((s, si) => (
        <React.Fragment key={s.key}>
          <div style={{position: 'absolute', left: 1450, top: 292 + si * 56, width: 28, height: 28, borderRadius: 6, background: s.color}} />
          <Txt x={1492} y={290 + si * 56} w={340} size={si === 1 ? 22 : 24} weight={600} color={C.text} mono={si === 1}>{s.label}</Txt>
        </React.Fragment>
      ))}
    </>
  );
};

/* ---------------------------------------------------------------- 7. range */
const Range: React.FC<SceneProps> = ({t}) => {
  const bx = 520, bw = 1180, k = bw / 255;
  const rowsDef = [
    {y: 260, a: 1.2, title: 'The default', sub: `range tag: ${D.range.def.tag}`, tagColor: C.cyan, black: D.range.def.black, white: D.range.def.white, sb: D.range.def.shownBlack, sw: D.range.def.shownWhite, note: 'players stretch the limited range back to full', md5: D.range.def.md5, ring: C.green},
    {y: 540, a: 6.2, title: '-color_range pc', sub: `range tag: ${D.range.pc.tag}`, tagColor: C.red, black: D.range.pc.black, white: D.range.pc.white, sb: D.range.pc.shownBlack, sw: D.range.pc.shownWhite, note: 'the tag says full, the bytes did not move', md5: D.range.pc.md5, ring: C.red},
  ];
  return (
    <>
      <Head over="Reality check three · range" title="The tag flips, the bytes stay" o={ep(t, 0.2, 0.8)} />
      {rowsDef.map((r) => {
        const o = fade(t, r.a);
        return (
          <React.Fragment key={r.title}>
            <Txt x={96} y={r.y + 4} w={400} size={r.title.startsWith('-') ? 32 : 36} mono={r.title.startsWith('-')} weight={700} color={C.text} o={o}>{r.title}</Txt>
            <Pill x={96} y={r.y + 62} w={260} h={40} color={r.tagColor} size={22} o={o}>{r.sub}</Pill>
            <div style={{position: 'absolute', left: bx, top: r.y + 30, width: bw, height: 56, borderRadius: 10, background: 'linear-gradient(to right, #000, #fff)', border: `3px solid ${C.text}`, boxSizing: 'border-box', opacity: o}} />
            {/* the 16..235 band */}
            <div style={{position: 'absolute', left: bx + r.black * k, top: r.y + 20, width: (r.white - r.black) * k, height: 76, boxSizing: 'border-box', border: `3px dashed ${C.cyan}`, borderRadius: 6, opacity: o}} />
            <Txt x={bx + r.black * k - 110} y={r.y - 22} w={220} size={26} mono weight={700} align="center" color={C.text} o={fade(t, r.a + 0.8)}>{`black ${r.black}`}</Txt>
            <Txt x={bx + r.white * k - 110} y={r.y - 22} w={220} size={26} mono weight={700} align="center" color={C.text} o={fade(t, r.a + 0.8)}>{`white ${r.white}`}</Txt>
            <Tag x={bx} y={r.y + 108} w={420} color={C.dim} size={18} o={fade(t, r.a + 1.8)}>a player shows</Tag>
            <Sw x={bx + 250} y={r.y + 100} w={80} h={42} fill={gray(r.sb)} ring={r.ring} o={fade(t, r.a + 1.8)} r={8} />
            <Txt x={bx + 342} y={r.y + 106} w={160} size={26} mono weight={700} color={r.ring} o={fade(t, r.a + 1.8)}>{`black ${r.sb}`}</Txt>
            <Sw x={bx + 530} y={r.y + 100} w={80} h={42} fill={gray(r.sw)} ring={r.ring} o={fade(t, r.a + 2.2)} r={8} />
            <Txt x={bx + 622} y={r.y + 106} w={170} size={26} mono weight={700} color={r.ring} o={fade(t, r.a + 2.2)}>{`white ${r.sw}`}</Txt>
            <Txt x={bx + 830} y={r.y + 98} w={350} size={22} color={C.dim} lh={1.25} o={fade(t, r.a + 2.6)}>{r.note}</Txt>
          </React.Fragment>
        );
      })}
      <Pill x={500} y={800} w={920} h={52} color={C.amber} size={26} o={fade(t, 12)}>{`same bytes in both files · md5 ${D.range.def.md5} = ${D.range.pc.md5}`}</Pill>
    </>
  );
};

/* ---------------------------------------------------------------- 8. flags */
const Flags: React.FC<SceneProps> = ({t}) => {
  const R = D.range;
  const mapping = (y: number, name: string, byte: number, shown: number, color: string, a: number) => (
    <>
      <Txt x={26} y={y + 12} w={96} size={26} mono color={C.dim} o={fade(t, a)}>{name}</Txt>
      <Sw x={126} y={y} w={64} h={56} fill={gray(byte)} ring={C.line} r={8} o={fade(t, a)} />
      <Txt x={200} y={y + 10} w={80} size={30} mono weight={700} color={C.text} o={fade(t, a)}>{byte}</Txt>
      <Txt x={284} y={y + 2} w={60} size={44} align="center" color={C.mute} o={fade(t, a + 0.3)}>{'\u2192'}</Txt>
      <Sw x={352} y={y} w={64} h={56} fill={gray(shown)} ring={color} r={8} o={fade(t, a + 0.3)} />
      <Txt x={426} y={y + 10} w={90} size={30} mono weight={700} color={color} o={fade(t, a + 0.3)}>{shown}</Txt>
    </>
  );
  const head = (y: number, a: number) => (
    <>
      <Tag x={126} y={y} w={200} color={C.mute} size={16} o={fade(t, a)}>in the file</Tag>
      <Tag x={352} y={y} w={200} color={C.mute} size={16} o={fade(t, a)}>on screen</Tag>
    </>
  );
  const cw = 560, gap = 24, ch = 470;
  return (
    <>
      <Head over="Reality check three · flags" title="Two controls and the real fix" o={ep(t, 0.2, 0.8)} />
      <Card x={96} y={260} w={cw} h={ch} color={C.amber} o={fade(t, 1)}>
        <Tag x={26} y={22} w={500} color={C.amber}>Control one</Tag>
        <Txt x={26} y={60} w={510} size={25} mono color={C.text} weight={600} lh={1.35}>{'full range flag = 1\non limited bytes'}</Txt>
        <div style={{position: 'absolute', left: 26, top: 140, width: 508, height: 2, background: C.line}} />
        {head(158, 2)}
        {mapping(186, 'black', R.relabelPc.black, R.relabelPc.shownBlack, C.red, 2.4)}
        {mapping(262, 'white', R.relabelPc.white, R.relabelPc.shownWhite, C.red, 3.4)}
        <Txt x={26} y={366} w={510} size={26} color={C.dim} o={fade(t, 4.4)} lh={1.35}>{'The flag moved. The bytes did not.'}</Txt>
      </Card>
      <Card x={96 + cw + gap} y={260} w={cw} h={ch} color={C.amber} o={fade(t, 5.5)}>
        <Tag x={26} y={22} w={500} color={C.amber}>Control two</Tag>
        <Txt x={26} y={60} w={510} size={25} mono color={C.text} weight={600} lh={1.35}>{'full range flag = 0\non full range bytes'}</Txt>
        <div style={{position: 'absolute', left: 26, top: 140, width: 508, height: 2, background: C.line}} />
        {head(158, 6.2)}
        {mapping(186, 'shadow', R.relabelTv.shadow, R.relabelTv.shownShadow, C.red, 6.6)}
        {mapping(262, 'high', R.relabelTv.highlight, R.relabelTv.shownHighlight, C.red, 7.6)}
        <Txt x={26} y={366} w={510} size={26} color={C.dim} o={fade(t, 8.6)} lh={1.35}>{'Shadows and highlights are crushed.'}</Txt>
      </Card>
      <Card x={96 + 2 * (cw + gap)} y={260} w={cw} h={ch} color={C.green} o={fade(t, 9.8)}>
        <Tag x={26} y={22} w={500} color={C.green}>The real fix</Tag>
        <Txt x={26} y={60} w={510} size={25} mono color={C.text} weight={600} lh={1.35}>{'-pix_fmt yuvj420p'}</Txt>
        <div style={{position: 'absolute', left: 26, top: 140, width: 508, height: 2, background: C.line}} />
        {head(158, 10.4)}
        {mapping(186, 'black', R.yuvj.black, R.yuvj.black, C.green, 10.8)}
        {mapping(262, 'white', R.yuvj.white, R.yuvj.white, C.green, 11.8)}
        <Pill x={26} y={354} w={200} h={46} color={C.green} size={24} o={fade(t, 12.4)}>{`tagged ${R.yuvj.tag}`}</Pill>
        <Txt x={26} y={414} w={510} size={24} color={C.dim} o={fade(t, 12.4)}>{'Bytes and tag agree.'}</Txt>
      </Card>
    </>
  );
};

/* ---------------------------------------------------------------- 9. hdr */
const Hdr: React.FC<SceneProps> = ({t}) => {
  const H = D.hdr;
  const base = 790, k = 1.72, gx0 = 150, gw = 160, bw = 66;
  const key = [3, 4];
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  return (
    <>
      <Head over="Reality check four · transfer" title="HDR in, SDR out, wrong place" o={ep(t, 0.2, 0.8)} />
      <Line x1={gx0 - 24} y1={base} x2={gx0 + 10 * gw - 20} y2={base} color={C.mute} width={3} />
      {H.nits.map((n: number, i: number) => {
        const x = gx0 + i * gw;
        const a = 1 + i * 0.35;
        const he = H.expected[i] * k * ep(t, a, a + 0.7);
        const hp = H.plainY[i] * k * ep(t, a + 0.3, a + 1.0);
        const hl = key.includes(i);
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: x, top: base - he, width: bw, height: he, borderRadius: '8px 8px 0 0', background: C.cyan, boxShadow: `4px 4px 0 ${C.cyan}44`}} />
            <div style={{position: 'absolute', left: x + bw + 4, top: base - hp, width: bw, height: hp, borderRadius: '8px 8px 0 0', background: C.red, boxShadow: `4px 4px 0 ${C.red}44`}} />
            <Txt x={x - 8} y={base - he - 32} w={bw + 16} size={19} mono align="center" weight={hl ? 700 : 500} color={C.text} o={fade(t, a + 0.6, 0.4)}>{fmt(H.expected[i])}</Txt>
            <Txt x={x + bw - 4} y={base - hp - 32} w={bw + 16} size={19} mono align="center" weight={hl ? 700 : 500} color={C.red} o={fade(t, a + 0.9, 0.4)}>{fmt(H.plainY[i])}</Txt>
            <Txt x={x - 20} y={base + 14} w={2 * bw + 44} size={24} mono align="center" weight={hl ? 700 : 500} color={hl ? C.text : C.dim}>{n}</Txt>
          </React.Fragment>
        );
      })}
      <Txt x={gx0} y={base + 52} w={1500} size={22} color={C.dim} align="center">nits, the brightness the patch was mastered at</Txt>
      {/* error callouts on the 50 and 100 nit groups */}
      {key.map((i) => (
        <Pill key={i} x={gx0 + i * gw - 14} y={296 + (i === 4 ? 0 : 52)} w={2 * bw + 30} h={44} color={C.red} size={24} o={fade(t, 8.5 + (i - 3) * 1.5)}>{fmt(H.err[i])}</Pill>
      ))}
      <div style={{position: 'absolute', left: 120, top: 276, width: 420}}>
        <div style={{display: 'flex', gap: 24, opacity: fade(t, 2)}}>
          <span style={{display: 'flex', alignItems: 'center', gap: 10, fontFamily: F.sans, fontSize: 24, color: C.text, fontWeight: 600}}><span style={{width: 24, height: 24, borderRadius: 6, background: C.cyan, display: 'inline-block'}} />SDR target</span>
          <span style={{display: 'flex', alignItems: 'center', gap: 10, fontFamily: F.sans, fontSize: 24, color: C.text, fontWeight: 600}}><span style={{width: 24, height: 24, borderRadius: 6, background: C.red, display: 'inline-block'}} />Plain -pix_fmt</span>
        </div>
      </div>
      <Txt x={1100} y={250} w={720} size={30} weight={700} color={C.red} align="right" o={fade(t, 11)}>{`${H.nits[4]} nit white lands at luma ${r0(H.plainY[4])}, not ${H.expected[4]}`}</Txt>
    </>
  );
};

/* ---------------------------------------------------------------- 10. hdrfix */
const HdrFix: React.FC<SceneProps> = ({t}) => {
  const H = D.hdr;
  const x0 = 210, step = 118, base = 800, k = 1.42;
  const px = (i: number) => x0 + i * step;
  const py = (v: number) => base - v * k;
  const series = [
    {name: 'iall', y: H.iallY, color: C.red, a: 1.5},
    {name: 'zscale', y: H.zscaleY, color: C.amber, a: 5.5},
    {name: 'hable', y: H.hableY, color: C.green, a: 10},
  ];
  const pts = (ys: number[]) => ys.map((v, i) => `${px(i)},${py(v)}`).join(' ');
  const i203 = H.nits.indexOf(203);
  const legend = [
    {c: C.red, title: 'colorspace … iall', body: `pixels identical to the plain run, tags now ${H.iallTag}`, a: 1.5},
    {c: C.amber, title: 'zscale', body: `${H.nits[i203]} nits and above all land on ${H.zscaleY[i203]}`, a: 5.5},
    {c: C.green, title: 'zscale + tonemap=hable', body: `${H.nits[i203]} nits sits at ${H.hableY[i203]}`, a: 10},
  ];
  return (
    <>
      <Head over="Reality check four · fixes" title="Three commands, three curves" o={ep(t, 0.2, 0.8)} />
      <Svg>
        <line x1={x0 - 30} y1={base} x2={px(9) + 30} y2={base} stroke={C.mute} strokeWidth={3} />
        {[16, 235].map((v) => <line key={v} x1={x0 - 30} y1={py(v)} x2={px(9) + 30} y2={py(v)} stroke={C.line} strokeWidth={2} strokeDasharray="8 8" />)}
        <polyline points={pts(H.expected)} fill="none" stroke={C.cyan} strokeWidth={4} strokeDasharray="12 9" opacity={fade(t, 0.8)} />
        {series.map((s) => (
          <g key={s.name} opacity={fade(t, s.a)}>
            <polyline points={pts(s.y)} fill="none" stroke={s.color} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
            {s.y.map((v: number, i: number) => <circle key={i} cx={px(i)} cy={py(v)} r={8} fill={C.bg} stroke={s.color} strokeWidth={4} />)}
          </g>
        ))}
      </Svg>
      {H.nits.map((n: number, i: number) => <Txt key={i} x={px(i) - 50} y={base + 14} w={100} size={22} mono align="center" weight={i === i203 ? 700 : 500} color={i === i203 ? C.text : C.dim}>{n}</Txt>)}
      <Txt x={x0 - 30} y={base + 48} w={px(9) - x0 + 60} size={22} color={C.dim} align="center">nits</Txt>
      <Txt x={x0 - 150} y={py(235) - 18} w={110} size={22} mono align="right" color={C.dim}>{H.expected[4]}</Txt>
      <Txt x={x0 - 150} y={py(16) - 18} w={110} size={22} mono align="right" color={C.dim}>{H.expected[0]}</Txt>
      <Pill x={px(i203) - 40} y={py(H.zscaleY[i203]) - 62} w={80} h={40} color={C.amber} size={24} o={fade(t, 7)}>{H.zscaleY[i203]}</Pill>
      <Pill x={px(i203) - 40} y={py(H.hableY[i203]) - 64} w={80} h={40} color={C.green} size={24} o={fade(t, 11.5)}>{H.hableY[i203]}</Pill>
      {legend.map((l, i) => (
        <React.Fragment key={i}>
          <div style={{position: 'absolute', left: 1450, top: 270 + i * 150, width: 8, height: 120, borderRadius: 4, background: l.c, opacity: fade(t, l.a)}} />
          <Txt x={1478} y={268 + i * 150} w={350} size={26} mono weight={700} color={C.text} o={fade(t, l.a)}>{l.title}</Txt>
          <Txt x={1478} y={308 + i * 150} w={350} size={24} color={C.dim} o={fade(t, l.a)} lh={1.3}>{l.body}</Txt>
        </React.Fragment>
      ))}
      <Txt x={1450} y={730} w={380} size={22} color={C.cyan} weight={600} o={fade(t, 0.8)}>dashed: the SDR target</Txt>
    </>
  );
};

/* ---------------------------------------------------------------- 11. chroma */
const Chroma: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {fmt: 'yuv444p', d: D.chroma.p444, note: 'the line stays red', color: C.green, a: 1.2},
    {fmt: 'yuv422p', d: D.chroma.p422, note: 'the line bleeds', color: C.red, a: 4.6},
    {fmt: 'yuv420p', d: D.chroma.p420, note: 'the line bleeds', color: C.red, a: 7.4},
  ];
  const cw = 144, cg = 10, x0 = 380;
  return (
    <>
      <Head over="Reality check five · chroma" title="A red line, one pixel wide" o={ep(t, 0.2, 0.8)} />
      <Tag x={x0} y={248} w={5 * cw + 4 * cg} align="center" color={C.dim} size={18} o={fade(t, 1)}>five pixels across the line</Tag>
      {rows.map((r, ri) => {
        const y = 290 + ri * 150;
        return (
          <React.Fragment key={r.fmt}>
            <Txt x={96} y={y + 24} w={260} size={34} mono weight={700} color={C.text} o={fade(t, r.a)}>{r.fmt}</Txt>
            <Txt x={96} y={y + 70} w={260} size={22} color={r.color} weight={600} o={fade(t, r.a)}>{r.note}</Txt>
            {r.d.rgb.map((p: number[], i: number) => (
              <Sw key={i} x={x0 + i * (cw + cg)} y={y} w={cw} h={118} fill={rgb(p)} ring={i === 2 ? r.color : C.line} o={fade(t, r.a + 0.15 * i)} r={8}>
                <div style={{position: 'absolute', left: 0, right: 0, bottom: 6, textAlign: 'center', fontFamily: F.mono, fontSize: 20, fontWeight: 700, color: '#fff', textShadow: '1px 1px 0 #0008'}}>{p.join(',')}</div>
              </Sw>
            ))}
            <Pill x={1230} y={y + 34} w={310} h={50} color={C.dim} size={26} o={fade(t, r.a + 0.9)}>{`Y ${r0(r.d.chroma.y)}  U ${r.d.chroma.u}  V ${r.d.chroma.v}`}</Pill>
          </React.Fragment>
        );
      })}
      <Txt x={1230} y={250} w={500} size={18} weight={700} color={C.dim} o={fade(t, 1)} >{'LUMA AND COLOR PLANES'}</Txt>
      <Verdict y={760} text={`Brightness stays at Y ${r0(D.chroma.p420.chroma.y)}. The color is shared, and no tag brings it back.`} color={C.violet} size={30} o={fade(t, 11)} />
    </>
  );
};

/* ---------------------------------------------------------------- 12. bands */
const Bands: React.FC<SceneProps> = ({t}) => {
  const B = D.bands;
  const lo = Math.min(...B.def.row0, ...B.def.row1, ...B.none.row0, ...B.none.row1);
  const cell = (v: number, x: number, y: number, o: number) => {
    const hi = v > lo;
    return (
      <div key={`${x}-${y}`} style={{position: 'absolute', left: x, top: y, width: 40, height: 40, boxSizing: 'border-box', opacity: o, borderRadius: 6, border: `2.5px solid ${hi ? C.cyan : C.line}`, background: hi ? `${C.cyan}33` : C.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: 18, fontWeight: 700, color: C.text}}>{v}</div>
    );
  };
  const panel = (x: number, title: string, d: any, sub: string, big: string, color: string, a: number) => (
    <>
      <Card x={x} y={250} w={834} h={350} color={color} o={fade(t, a)}>
        <Txt x={28} y={18} size={32} mono weight={700} color={C.text}>{title}</Txt>
        <Txt x={28} y={64} size={22} color={C.dim}>{sub}</Txt>
      </Card>
      {[d.row0, d.row1].map((row: number[], ri: number) => row.map((v, i) => cell(v, x + 28 + i * 47, 368 + ri * 50, fade(t, a + 0.6 + i * 0.04))))}
      <Txt x={x + 28} y={474} size={20} color={C.mute} o={fade(t, a + 1)}>{'row 0 and row 1, the first 16 pixels'}</Txt>
      <Big x={x + 28} y={504} w={170} size={60} color={color} o={fade(t, a + 1.4)}>{big}</Big>
      <Txt x={x + 28 + 130} y={518} w={560} size={26} color={C.dim} o={fade(t, a + 1.4)}>{'distinct values in the ramp'}</Txt>
    </>
  );
  const chips = ['default', ...B.same];
  return (
    <>
      <Head over="Reality check six · dither" title="Ten bit to eight bit does not band" o={ep(t, 0.2, 0.8)} />
      {panel(96, 'format=yuv420p', B.def, 'dithers on its own: the rows differ', String(B.def.distinct), C.green, 1)}
      {panel(990, 'sws_dither=none', B.none, `truncates: runs of ${B.none.maxRun} pixels, rows equal`, String(B.none.distinct), C.red, 5)}
      <Tag x={96} y={630} w={900} color={C.dim} size={20} o={fade(t, 9)}>seven spellings, one checksum</Tag>
      {chips.map((c, i) => (
        <Pill key={c} x={96 + i * 168} y={668} w={156} h={72} color={C.green} size={20} o={fade(t, 9.2 + i * 0.15)}>
          <span style={{display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2}}><span>{c}</span><span style={{fontWeight: 400, color: C.dim, fontSize: 18}}>{B.sameMd5}</span></span>
        </Pill>
      ))}
      <Pill x={96 + 7 * 168 + 40} y={668} w={156} h={72} color={C.red} size={20} o={fade(t, 11)}>
        <span style={{display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2}}><span>none</span><span style={{fontWeight: 400, color: C.dim, fontSize: 18}}>{B.none.md5}</span></span>
      </Pill>
      <Mid y={780} size={28} color={C.dim} o={fade(t, 12.5)}>{`On rgb8 the same spellings give ${B.rgb8Files} different files, so the readers can see dither.`}</Mid>
    </>
  );
};

/* ---------------------------------------------------------------- 13. verdict */
const VerdictScene: React.FC<SceneProps> = ({t}) => {
  const L = D.labelOnly;
  const nLabel = ['matrix', 'range', 'transfer'].filter((k) => L[k]).length;
  const cols = [
    {title: 'Label only', color: C.amber, big: `${nLabel} of 3`, unit: 'commands', sub: 'pixels identical', items: ['-colorspace bt709', '-color_range pc', 'colorspace … iall'], fix: 'Fix: a tag', a: 1.2},
    {title: 'Wrong place', color: C.red, unit: 'cases', sub: 'pixels moved', items: ['HDR, plain -pix_fmt', 'a 601 mixer on a 709 file'], fix: 'Fix: convert right', a: 5},
    {title: 'Lost', color: C.violet, unit: 'case', sub: 'pixels gone', items: ['4:2:0 chroma'], fix: 'No tag brings it back', a: 8.5},
    {title: 'False alarm', color: C.green, unit: 'case', sub: 'nothing wrong', items: ['10 bit to 8 bit dither'], fix: 'Not the converter', a: 11},
  ];
  const cw = 412, gap = 25;
  return (
    <>
      <Head over="Sorted by what changed" title="Label, place, loss, false alarm" o={ep(t, 0.2, 0.8)} />
      {cols.map((c, i) => {
        const x = 96 + i * (cw + gap);
        const o = fade(t, c.a);
        return (
          <React.Fragment key={c.title}>
            <Card x={x} y={250} w={cw} h={560} color={c.color} o={o}>
              <div style={{position: 'absolute', left: 0, top: 0, width: '100%', height: 96, background: c.color, borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontSize: 38 * DSP.k, color: C.bg, letterSpacing: DSP.lsNum}}>{c.title}</div>
              <Tag x={0} y={118} w={cw} align="center" color={c.color} size={18}>{c.sub}</Tag>
              {c.items.map((it, k) => (
                <Pill key={k} x={22} y={178 + k * 78} w={cw - 44} h={60} color={c.color} size={it.startsWith('-') || it.includes('=') || it.includes('…') ? 22 : 22} mono={it.startsWith('-') || it.includes('…')} o={fade(t, c.a + 0.6 + k * 0.4)}>{it}</Pill>
              ))}
              <Big x={0} y={410} w={cw} size={72} align="center" color={c.color} o={fade(t, c.a + 1.4)}>{c.big ?? c.items.length}</Big>
              <Tag x={0} y={482} w={cw} align="center" color={C.dim} size={16} o={fade(t, c.a + 1.4)}>{c.unit}</Tag>
              <Txt x={0} y={518} w={cw} size={28} weight={700} align="center" color={c.color} o={fade(t, c.a + 1.6)}>{c.fix}</Txt>
            </Card>
          </React.Fragment>
        );
      })}
    </>
  );
};

/* ---------------------------------------------------------------- 14. recipe */
const Recipe: React.FC<SceneProps> = ({t}) => {
  const R = D.recipe;
  const tags = R.tag;
  const names: string[] = D.patches;
  const cmd = R.command.replace(' -vf ', ' \\\n  -vf ').replace(' -colorspace', ' \\\n  -colorspace').replace(' -c:v', ' \\\n  -c:v');
  const sw = (n: string, i: number) => (
    <React.Fragment key={n}>
      <Sw x={96 + i * 176} y={446} w={156} h={46} fill={rgb(R.src[n])} ring={C.line} r={8} o={fade(t, 2 + i * 0.2)} />
      <Tag x={96 + i * 176} y={498} w={156} align="center" color={C.dim} size={16} o={fade(t, 2 + i * 0.2)}>{n}</Tag>
    </React.Fragment>
  );
  return (
    <>
      <Head over="The recipe · web video" title="One command, checked twice" o={ep(t, 0.2, 0.8)} />
      <Cmd y={236} text={cmd} size={22} hi={'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p'} o={fade(t, 0.6)} />
      <Tag x={96} y={414} w={600} color={C.dim} size={18} o={fade(t, 2)}>a fresh card of six patches</Tag>
      {names.map(sw)}
      <Card x={96} y={540} w={560} h={292} color={C.cyan} o={fade(t, 4)}>
        <Tag x={24} y={18} color={C.cyan}>Reader one · ffprobe</Tag>
        <Txt x={24} y={60} w={520} size={25} mono lh={1.5} color={C.text}>{`pix_fmt=${tags.pixFmt}\ncolor_space=${tags.colorSpace}\ncolor_primaries=${tags.colorPrimaries}\ncolor_transfer=${tags.colorTransfer}\ncolor_range=${tags.range}`}</Txt>
      </Card>
      <Card x={680} y={540} w={560} h={292} color={C.green} o={fade(t, 7)}>
        <Tag x={24} y={18} color={C.green}>Reader two · decoded</Tag>
        <Txt x={24} y={58} size={22} color={C.dim}>worst error over six patches</Txt>
        <Big x={24} y={96} w={90} size={88} color={C.green}>{R.read709.worst}</Big>
        <Txt x={120} y={132} w={400} size={26} mono color={C.text}>read as BT.709</Txt>
        <div style={{position: 'absolute', left: 24, top: 196, width: 512, height: 2, background: C.line}} />
        <Txt x={24} y={208} w={70} size={44} mono weight={700} color={C.amber}>{R.read601.worst}</Txt>
        <Txt x={120} y={222} w={400} size={26} mono color={C.dim}>read as BT.601</Txt>
      </Card>
      <Card x={1264} y={540} w={560} h={292} color={C.cyan} o={fade(t, 10)}>
        <Tag x={24} y={18} color={C.cyan}>Raw luma</Tag>
        <Sw x={24} y={62} w={110} h={64} fill={screenGray(R.rawY.black)} ring={C.text} o={fade(t, 10.2)} />
        <Txt x={150} y={74} w={340} size={32} mono weight={700} color={C.text} o={fade(t, 10.2)}>{`black ${R.rawY.black}`}</Txt>
        <Sw x={24} y={142} w={110} h={64} fill={screenGray(R.rawY.white)} ring={C.text} o={fade(t, 10.6)} />
        <Txt x={150} y={154} w={340} size={32} mono weight={700} color={C.text} o={fade(t, 10.6)}>{`white ${R.rawY.white}`}</Txt>
        <Txt x={24} y={226} w={510} size={20} color={C.dim}>limited range, as tagged</Txt>
      </Card>
      <Pill x={96} y={856} w={1728} h={52} color={C.red} size={24} o={fade(t, 13)}>{`Control · the plain command: color_space=${R.plainTag ?? 'unknown'}, read as BT.709, worst error ${R.plainErr}`}</Pill>
    </>
  );
};

/* ---------------------------------------------------------------- 15. cheat */
const Cheat: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {sym: 'Dull greens', fix: 'Check the tag and the pixels together.', chip: <div style={{position: 'absolute', inset: 0, background: rgb(D.plain.r709.green)}} />, c: C.red},
    {sym: 'Gray blacks', fix: `Read the raw luma of black: ${D.range.def.black} or ${D.range.yuvj.black}.`, chip: <div style={{position: 'absolute', inset: 0, background: gray(D.range.def.black)}} />, c: C.red},
    {sym: 'Gray HDR', fix: 'zscale with a tone map.', chip: <div style={{position: 'absolute', inset: 0, background: screenGray(D.hdr.plainY[4])}} />, c: C.red},
    {sym: 'Purple red text', fix: 'Use yuv444p, or accept the bleed.', chip: <div style={{position: 'absolute', inset: 0, background: rgb(D.chroma.p444.rgb[0])}}><div style={{position: 'absolute', left: '34%', width: '32%', top: 0, bottom: 0, background: rgb(D.chroma.p420.rgb[2])}} /></div>, c: C.violet},
    {sym: 'Black and white', fix: 'Say your weights.', chip: <><div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', background: gray(D.weights.grayOn709[1])}} /><div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%', background: gray(D.weights.ccm601on709[1])}} /></>, c: C.amber},
    {sym: 'Banding', fix: 'Not the converter.', chip: <div style={{position: 'absolute', inset: 0, display: 'flex'}}>{Array.from({length: 8}, (_, i) => <div key={i} style={{flex: 1, background: gray(110 + i * 4)}} />)}</div>, c: C.green},
  ];
  return (
    <>
      <Head over="Cheat sheet" title="Symptom, then what to check" o={ep(t, 0.2, 0.8)} />
      {rows.map((r, i) => {
        const y = 250 + i * 108;
        const o = fade(t, 1 + i * 1.5);
        return (
          <React.Fragment key={i}>
            <Card x={96} y={y} w={1728} h={84} color={r.c} o={o}>
              <div style={{position: 'absolute', left: 16, top: 12, width: 100, height: 56, borderRadius: 8, overflow: 'hidden', border: `2.5px solid ${C.text}`, boxSizing: 'border-box'}}>{r.chip}</div>
              <Txt x={146} y={16} w={540} size={40 * DSP.k} color={C.text} weight={700} o={1}><span style={{fontFamily: F.display}}>{r.sym}</span></Txt>
              <Txt x={720} y={22} w={980} size={30} color={C.dim}>{r.fix}</Txt>
            </Card>
          </React.Fragment>
        );
      })}
    </>
  );
};

/* ---------------------------------------------------------------- 16. builds */
const Builds: React.FC<SceneProps> = ({t}) => {
  const rows = [
    {cmd: '-colorspace bt709', a: 'a label only', b: 'also converts'},
    {cmd: '-color_range pc', a: 'a label only', b: 'also converts'},
    {cmd: 'sws_dither=none', a: 'truncates', b: 'rounds'},
  ];
  return (
    <>
      <Head over="Builds differ" title="Same command, other pixels" o={ep(t, 0.2, 0.8)} />
      <Card x={96} y={250} w={1728} h={96} color={C.line} fill={C.panel} o={fade(t, 0.8)}>
        <Tag x={28} y={36} w={500} color={C.dim}>command</Tag>
        <Tag x={544} y={22} w={540} color={C.cyan}>{`ffmpeg ${D.build}`}</Tag>
        <Txt x={544} y={54} w={540} size={22} color={C.dim}>measured in this film</Txt>
        <Tag x={1134} y={22} w={540} color={C.amber}>{`ffmpeg ${BUILD_OLD}`}</Tag>
        <Txt x={1134} y={54} w={540} size={22} color={C.dim}>as recorded in the source films</Txt>
      </Card>
      {rows.map((r, i) => {
        const y = 372 + i * 136;
        const o = fade(t, 2 + i * 2.4);
        return (
          <React.Fragment key={i}>
            <Card x={96} y={y} w={1728} h={112} color={C.line} o={o}>
              <Txt x={28} y={34} w={520} size={32} mono weight={700} color={C.text}>{r.cmd}</Txt>
              <Pill x={544} y={30} w={520} h={52} color={C.cyan} size={26} mono={false}>{r.a}</Pill>
              <Pill x={1134} y={30} w={520} h={52} color={C.amber} size={26} mono={false}>{r.b}</Pill>
            </Card>
          </React.Fragment>
        );
      })}
      <Mid y={796} size={30} color={C.red} weight={700} o={fade(t, 10)}>Run this check on your build.</Mid>
    </>
  );
};

/* ---------------------------------------------------------------- 17. notest */
const NoTest: React.FC<SceneProps> = ({t}) => {
  const items = ['Real footage', 'Real players', 'HLG', 'Dolby Vision', 'Other encoders', 'Scaled output'];
  const cw = 548, gap = 42;
  return (
    <>
      <Head over="Not tested" title="What this film does not cover" color={C.amber} o={ep(t, 0.2, 0.8)} />
      {items.map((it, i) => {
        const x = 96 + (i % 3) * (cw + gap), y = 280 + Math.floor(i / 3) * 190;
        return (
          <Card key={it} x={x} y={y} w={cw} h={150} color={C.amber} dashed o={fade(t, 0.6 + i * 0.35)} fill="transparent">
            <Txt x={0} y={42} w={cw} size={44 * DSP.k} align="center" color={C.text}><span style={{fontFamily: F.display}}>{it}</span></Txt>
          </Card>
        );
      })}
      <Mid y={700} size={30} color={C.dim} o={fade(t, 3.2)}>{'The short cut and the six source films are in the description.'}</Mid>
    </>
  );
};

export const scenes: Record<string, React.FC<SceneProps>> = {
  ask: Ask, rig: Rig as React.FC<SceneProps>, matrix: Matrix, tag: Tagged, gray: GrayScene, weights: Weights, range: Range, flags: Flags,
  hdr: Hdr, hdrfix: HdrFix, chroma: Chroma, bands: Bands, verdict: VerdictScene, recipe: Recipe, cheat: Cheat, builds: Builds, notest: NoTest,
};
