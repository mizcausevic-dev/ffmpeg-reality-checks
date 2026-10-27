// The numbers the two films draw (fl03 long, fs03 short), read from the live evidence of runExperiment().
// The render engine copies only video/Scenes.tsx and video/index.tsx of an episode, so a scene cannot import this fixture at render time.
// embed-video-data.mjs therefore writes this object into the generated block of both Scenes.tsx files, and the test fails when a block no longer
// matches the live evidence. Nothing a scene draws as a measured number is typed by hand.

const PATCHES4 = ['red', 'green', 'blue', 'gray'];
const OFFSETS = ['-2', '-1', '0', '1', '2'];
const pick = (patches, names = PATCHES4) => Object.fromEntries(names.map((k) => [k, patches[k]]));
const first = (v) => (Array.isArray(v) ? v[0] : v);

export function videoData(ev) {
  const e17 = ev.ff17.encodes;
  const read = (enc) => ({
    tag: e17[enc].tag.colorSpace ?? null,
    r601: pick(e17[enc].read.bt601.patches),
    r709: pick(e17[enc].read.bt709.patches),
    auto: pick(e17[enc].read.auto.patches),
    e601: e17[enc].read.bt601.worstError,
    e709: e17[enc].read.bt709.worstError,
    eAuto: e17[enc].read.auto.worstError,
  });
  const g = ev.ff76.patches;
  const gray3 = (src, method, kind) => ['red', 'green', 'blue'].map((p) => first(g[src][method][kind][p]));
  const f26 = ev.ff26.cases;
  const pa = (k, p) => f26[k].patches[p];
  const h = ev.ff44;
  const vline = (fmt) => ({rgb: OFFSETS.map((o) => ev.ff22.runs[`vline_${fmt}`].rgb[o]), chroma: ev.ff22.runs[`vline_${fmt}`].chroma});
  const modes = ev.ff85.modes;
  const short = (m) => modes[m].md5.slice(0, 6);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const rc = ev.recipe;
  return {
    build: /ffmpeg version (\d+(?:\.\d+)*)/.exec(ev.ffmpeg)?.[1] ?? 'unknown',
    patches: Object.keys(rc.source),
    // matrix and tag (ff17)
    src: pick(ev.ff17.source),
    plain: read('default'),
    tagged: read('tagged709'),
    liar: read('liar'),
    // gray (ff76): stored numbers and what the screen shows, red green blue
    gray: {
      gray: {range: g.rgb.gray.range, native: gray3('rgb', 'gray', 'native'), shown: gray3('rgb', 'gray', 'shown')},
      hue: {range: g.rgb.hue.range, native: gray3('rgb', 'hue', 'native'), shown: gray3('rgb', 'hue', 'shown')},
    },
    weights: {
      ccm709: gray3('rgb', 'ccm709', 'shown'),
      grayOn709: gray3('hd', 'gray', 'shown'),
      ccm601on709: gray3('hd', 'ccm601', 'shown'),
    },
    // range (ff26)
    range: {
      def: {tag: f26.default.color_range, black: pa('default', 'black').rawY, white: pa('default', 'white').rawY, shownBlack: pa('default', 'black').shownByTag, shownWhite: pa('default', 'white').shownByTag, md5: f26.default.rawMd5.slice(0, 8)},
      pc: {tag: f26.pc_tag.color_range, fmt: f26.pc_tag.pix_fmt, black: pa('pc_tag', 'black').rawY, white: pa('pc_tag', 'white').rawY, shownBlack: pa('pc_tag', 'black').shownByTag, shownWhite: pa('pc_tag', 'white').shownByTag, md5: f26.pc_tag.rawMd5.slice(0, 8)},
      relabelPc: {black: pa('relabel_pc', 'black').rawY, white: pa('relabel_pc', 'white').rawY, shownBlack: pa('relabel_pc', 'black').shownByTag, shownWhite: pa('relabel_pc', 'white').shownByTag},
      relabelTv: {shadow: pa('relabel_tv', 'shadow').rawY, highlight: pa('relabel_tv', 'highlight').rawY, shownShadow: pa('relabel_tv', 'shadow').shownByTag, shownHighlight: pa('relabel_tv', 'highlight').shownByTag},
      yuvj: {black: pa('yuvj', 'black').rawY, white: pa('yuvj', 'white').rawY, tag: f26.yuvj.color_range},
    },
    // HDR (ff44), ten patches by nit level
    hdr: {
      nits: h.nits,
      expected: h.expected,
      plainY: h.hdr.pix.y,
      err: h.hdr.pix.sum.err,
      white100: h.hdr.pix.sum.white100,
      iallY: h.hdr.csIall.y,
      iallTag: h.hdr.csIall.tags.color_space,
      iallSame: same(h.hdr.csIall.y, h.hdr.pix.y),
      zscaleY: h.hdr.zsPlain.y,
      hableY: h.hdr.zsHable.y,
      srcTrc: h.srcTags.hdr.color_transfer,
    },
    // chroma (ff22): one pixel wide red line on blue, five pixels across the line (offsets -2 to 2)
    chroma: {p444: vline('yuv444p'), p422: vline('yuv422p'), p420: vline('yuv420p')},
    // dither (ff85)
    bands: {
      def: {distinct: modes.default.distinct, row0: modes.default.row0, row1: modes.default.row1, md5: short('default'), meanRun: modes.default.meanRun},
      none: {distinct: modes.none.distinct, row0: modes.none.row0, row1: modes.none.row1, md5: short('none'), maxRun: modes.none.maxRun},
      same: ev.ff85.classes.find((c) => c.includes('default')).filter((m) => m !== 'default'),
      sameMd5: short('default'),
      rgb8Files: ev.ff85.rgb8Classes.length,
    },
    // the verdict of the film
    labelOnly: ev.labelOnly,
    // the recipe, on a fresh card of six patches
    recipe: {
      command: rc.command,
      src: rc.source,
      tag: rc.encodes.recipe.tag,
      read709: {patches: rc.encodes.recipe.read.bt709.patches, worst: rc.encodes.recipe.read.bt709.worstError},
      read601: {patches: rc.encodes.recipe.read.bt601.patches, worst: rc.encodes.recipe.read.bt601.worstError},
      rawY: rc.encodes.recipe.rawY,
      plainErr: rc.encodes.plain.read.bt709.worstError,
      plainTag: rc.encodes.plain.tag.colorSpace ?? null,
    },
  };
}

export const BEGIN = '/* BEGIN GENERATED evidence data (node episodes/fl03/fixture/embed-video-data.mjs; do not edit by hand) */';
export const END = '/* END GENERATED evidence data */';
export const block = (data) => `${BEGIN}\nconst DATA = ${JSON.stringify(data, null, 1)};\n${END}`;
/** The data object embedded in a Scenes.tsx source, or null when there is no block. */
export function readBlock(src) {
  const a = src.indexOf(BEGIN), b = src.indexOf(END);
  if (a < 0 || b < a) return null;
  const body = src.slice(a + BEGIN.length, b);
  const m = /^\s*const DATA = ([\s\S]*);\s*$/.exec(body);
  return m ? JSON.parse(m[1]) : null;
}
