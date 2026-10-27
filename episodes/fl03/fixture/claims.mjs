// Spoken numbers of the two cuts (fl03 and fs03) and the evidence each one comes from.
// A claim is a phrase as the narrator says it ("two fifteen"), the number it stands for, and one or more getters that read that number from the live
// evidence. A narration passes when every number word in it is accounted for by a claim, a build/format label (BT six oh one, four two zero, ten bit)
// or a structural count (reader one, six source films). Exact values hold on ffmpeg 6.1.1 only; the tests apply them on that build.
import fs from 'node:fs';

const NUMBER_WORDS = new Set('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand oh point'.split(' '));
export const tokens = (text) => text.toLowerCase().replace(/[,.:;?!]/g, ' | ').split(/\s+/).filter(Boolean);

// numbers that name a format, a matrix, a standard or a build, not a measurement
export const LABELS = [
  'six oh one', 'seven oh nine', 'four two zero', 'four four four', 'two thousand twenty', 'ten bit', 'eight bit', 'r g b eight',
  'six point one point one', 'six point one',
  'eight point one point two', // build named by the source films (their tests ran on it); not re-run in this container
];
// counts that describe how the film is built, not what was measured
export const STRUCTURE = [
  'one plain ffmpeg command', 'one question', 'one command', 'reader one', 'reader two', 'two controls', 'two readers', 'one pixel wide',
  'one false alarm', 'six source films', 'one pattern', 'next two',
];

const P = (ev, name, c) => ev.ff17.encodes[name].read;
const f17 = (ev, enc, reading, patch, ch) => ev.ff17.encodes[enc].read[reading].patches[patch][ch];
const f76 = (ev, src, m, kind, patch, i = 0) => ev.ff76.patches[src][m][kind][patch][i];
const f26 = (ev, k, p) => ev.ff26.cases[k].patches[p];
const f44 = (ev, kind, k) => ev[ 'ff44' ][kind][k];
const rec = (ev, k) => ev.recipe.encodes[k];
const flag = (cmd) => Number(/video_full_range_flag=(\d)/.exec(cmd)[1]);

// claim(phrase, value, getters[, opts]); getters return a number or an array of numbers; opts.scenes limits the claim to those scene ids
const claim = (phrase, value, gets, opts = {}) => ({phrase, value, gets: Array.isArray(gets) ? gets : [gets], ...opts});

export const CLAIMS = [
  // ask
  claim('two fifty five', 255, [(ev) => ev.ff17.source.green[1]], {scenes: ['ask', 'matrix']}),
  claim('two fifteen', 215, [(ev) => f17(ev, 'default', 'bt709', 'green', 1)], {scenes: ['ask', 'matrix']}),
  claim('six experiments', 6, [(ev) => ['ff17', 'ff22', 'ff26', 'ff44', 'ff76', 'ff85'].filter((k) => ev[k]).length]),
  // rig
  // matrix
  claim('twenty three', 23, [(ev) => f17(ev, 'default', 'bt709', 'red', 1)], {scenes: ['matrix']}),
  // tag
  claim('within one level', 1, [(ev) => ev.ff17.encodes.tagged709.read.auto.worstError, (ev) => ev.ff17.encodes.tagged709.read.bt709.worstError], {scenes: ['tag']}),
  claim('twenty three', 23, [(ev) => ev.ff17.encodes.tagged709.read.bt601.worstError], {scenes: ['tag']}),
  claim('forty', 40, [(ev) => ev.ff17.encodes.liar.read.auto.worstError], {scenes: ['tag', 'matrix']}),
  // gray
  claim('seventy six', 76, [(ev) => f76(ev, 'rgb', 'gray', 'native', 'red'), (ev) => f76(ev, 'rgb', 'hue', 'shown', 'red')], {scenes: ['gray']}),
  claim('one fifty', 150, [(ev) => f76(ev, 'rgb', 'gray', 'native', 'green'), (ev) => f76(ev, 'rgb', 'hue', 'shown', 'green'), (ev) => ev.ff22.runs.vline_yuv420p.rgb[0][0]], {scenes: ['gray', 'chroma']}),
  claim('twenty nine', 29, [(ev) => f76(ev, 'rgb', 'gray', 'native', 'blue'), (ev) => f76(ev, 'rgb', 'hue', 'shown', 'blue')], {scenes: ['gray']}),
  claim('s equals zero', 0, [(ev) => Number(/s=(\d)/.exec(ev.ff76.patches.rgb.hue.graph)[1])], {scenes: ['gray']}),
  claim('eighty one', 81, [(ev) => f76(ev, 'rgb', 'hue', 'native', 'red')], {scenes: ['gray']}),
  claim('one forty five', 145, [(ev) => f76(ev, 'rgb', 'hue', 'native', 'green')], {scenes: ['gray']}),
  claim('forty one', 41, [(ev) => f76(ev, 'rgb', 'hue', 'native', 'blue')], {scenes: ['gray']}),
  // weights
  claim('fifty four', 54, [(ev) => f76(ev, 'rgb', 'ccm709', 'shown', 'red')], {scenes: ['weights']}),
  claim('one eighty two', 182, [(ev) => f76(ev, 'rgb', 'ccm709', 'shown', 'green')], {scenes: ['weights', 'hdrfix']}),
  claim('eighteen', 18, [(ev) => f76(ev, 'rgb', 'ccm709', 'shown', 'blue')], {scenes: ['weights']}),
  claim('fifty five', 55, [(ev) => f76(ev, 'hd', 'gray', 'shown', 'red')], {scenes: ['weights']}),
  claim('one eighty three', 183, [(ev) => f76(ev, 'hd', 'gray', 'shown', 'green')], {scenes: ['weights', 'gray']}),
  claim('one forty nine', 149, [(ev) => f76(ev, 'hd', 'ccm601', 'shown', 'green'), (ev) => ev.ff22.runs.vline_yuv420p.rgb[0][2]], {scenes: ['weights', 'gray', 'chroma']}),
  claim('thirty four', 34, [(ev) => f76(ev, 'hd', 'gray', 'shown', 'green') - f76(ev, 'hd', 'ccm601', 'shown', 'green')], {scenes: ['weights', 'gray']}),
  // range
  claim('sixteen', 16, [(ev) => f26(ev, 'default', 'black').rawY, (ev) => f26(ev, 'pc_tag', 'black').rawY, (ev) => f26(ev, 'pc_tag', 'black').shownByTag], {scenes: ['range']}),
  claim('two thirty five', 235, [(ev) => f26(ev, 'default', 'white').rawY], {scenes: ['range']}),
  // flags
  claim('flag to one', 1, [(ev) => flag(ev.ff26.cases.relabel_pc.command)], {scenes: ['flags']}),
  claim('black shows sixteen', 16, [(ev) => f26(ev, 'relabel_pc', 'black').shownByTag], {scenes: ['flags']}),
  claim('to zero on full bytes', 0, [(ev) => flag(ev.ff26.cases.relabel_tv.command)], {scenes: ['flags']}),
  claim('eight', 8, [(ev) => ev.ff26.source.patches.shadow.rgb, (ev) => f26(ev, 'relabel_tv', 'shadow').rawY], {scenes: ['flags']}),
  claim('two forty seven', 247, [(ev) => ev.ff26.source.patches.highlight.rgb, (ev) => f26(ev, 'relabel_tv', 'highlight').rawY], {scenes: ['flags']}),
  claim('zero and two fifty five', [0, 255], [
    (ev) => [f26(ev, 'relabel_tv', 'shadow').shownByTag, f26(ev, 'relabel_tv', 'highlight').shownByTag],
    (ev) => [f26(ev, 'yuvj', 'black').rawY, f26(ev, 'yuvj', 'white').rawY],
  ], {scenes: ['flags']}),
  // hdr
  claim('hundred', 100, [(ev) => ev.ff44.nits[4]], {scenes: ['ask', 'hdr', 'hdrfix']}),
  claim('one twenty seven', 127, [(ev) => Math.round(ev.ff44.hdr.pix.y[4])], {scenes: ['ask', 'hdr']}),
  claim('two thirty five', 235, [(ev) => ev.ff44.expected[4]], {scenes: ['ask', 'hdr']}),
  claim('fifty', 50, [(ev) => ev.ff44.nits[3]], {scenes: ['hdr']}),
  claim('sixty seven point five', 67.5, [(ev) => -ev.ff44.hdr.pix.sum.err[3]], {scenes: ['hdr']}),
  // hdrfix
  claim('two hundred three', 203, [(ev) => ev.ff44.nits[5]], {scenes: ['hdrfix']}),
  claim('two fifty five', 255, [(ev) => ev.ff44.hdr.zsPlain.y[5], (ev) => ev.ff44.hdr.zsPlain.y[9]], {scenes: ['hdrfix']}),
  claim('one eighty two', 182, [(ev) => Math.round(ev.ff44.hdr.zsHable.y[5])], {scenes: ['hdrfix']}),
  // chroma
  claim('crf zero', 0, [(ev) => Number(/-crf (\d+)/.exec(ev.ff22.runs.vline_yuv420p.command)[1])], {scenes: ['chroma']}),
  claim('twenty one', 21, [(ev) => ev.ff22.runs.vline_yuv420p.rgb[0][1]], {scenes: ['chroma']}),
  claim('eighty one', 81, [(ev) => Math.round(ev.ff22.runs.vline_yuv420p.chroma.y)], {scenes: ['chroma']}),
  // bands
  claim('sixty five', 65, [(ev) => ev.ff85.modes.default.distinct], {scenes: ['bands']}),
  claim('sixty four', 64, [(ev) => ev.ff85.modes.none.distinct], {scenes: ['bands']}),
  claim('sixteen', 16, [(ev) => ev.ff85.modes.none.maxRun, (ev) => ev.ff85.modes.none.meanRun], {scenes: ['bands']}),
  claim('six other spellings', 6, [(ev) => ev.ff85.classes.find((c) => c.includes('default')).length - 1], {scenes: ['bands']}),
  claim('one checksum', 1, [(ev) => new Set(ev.ff85.classes.find((c) => c.includes('default')).map((m) => ev.ff85.modes[m].md5)).size], {scenes: ['bands']}),
  claim('five different files', 5, [(ev) => ev.ff85.rgb8Classes.length], {scenes: ['bands']}),
  // verdict
  claim('three times', 3, [(ev) => ['matrix', 'range', 'transfer'].filter((k) => ev.labelOnly[k]).length], {scenes: ['verdict']}),
  claim('three commands', 3, [(ev) => ['matrix', 'range', 'transfer'].filter((k) => ev.labelOnly[k]).length], {scenes: ['verdict']}),
  // recipe
  claim('three tags', 3, [(ev) => ENCODE_TAGS(ev)], {scenes: ['recipe']}),
  claim('six patches', 6, [(ev) => Object.keys(ev.recipe.source).length], {scenes: ['recipe']}),
  claim('worst error one', 1, [(ev) => rec(ev, 'recipe').read.auto.worstError, (ev) => rec(ev, 'recipe').read.bt709.worstError], {scenes: ['recipe']}),
  claim('twenty three', 23, [(ev) => rec(ev, 'recipe').read.bt601.worstError], {scenes: ['recipe']}),
  claim('sixteen', 16, [(ev) => rec(ev, 'recipe').rawY.black, (ev) => rec(ev, 'recipe').stats.black.min], {scenes: ['recipe']}),
  claim('two thirty five', 235, [(ev) => rec(ev, 'recipe').rawY.white, (ev) => rec(ev, 'recipe').stats.white.max], {scenes: ['recipe']}),
  claim('forty', 40, [(ev) => rec(ev, 'plain').read.bt709.worstError], {scenes: ['recipe']}),
  // cheat
  claim('sixteen or zero', [16, 0], [(ev) => [f26(ev, 'default', 'black').rawY, f26(ev, 'yuvj', 'black').rawY]], {scenes: ['cheat']}),
];
function ENCODE_TAGS(ev) { return (ev.recipe.command.match(/-colorspace|-color_primaries|-color_trc/g) ?? []).length; }

// ---- checking ------------------------------------------------------------------------------------------------------------------------
const phrasesIn = (toks, phrase, mark) => {
  const p = tokens(phrase); let n = 0;
  for (let i = 0; i + p.length <= toks.length; i++) if (p.every((w, k) => toks[i + k] === w)) { for (let k = 0; k < p.length; k++) toks[i + k] = mark; n++; i += p.length - 1; }
  return n;
};
// returns {used: [claims matched], uncovered: [number words left]}
export function accountFor(narration, sceneId) {
  const toks = tokens(narration), used = [];
  for (const ph of [...LABELS, ...STRUCTURE].sort((a, b) => tokens(b).length - tokens(a).length)) phrasesIn(toks, ph, '§');
  const mine = CLAIMS.filter((c) => !c.scenes || c.scenes.includes(sceneId)).sort((a, b) => tokens(b.phrase).length - tokens(a.phrase).length);
  for (const c of mine) if (phrasesIn(toks, c.phrase, '§')) used.push(c);
  return {used, uncovered: toks.filter((t) => NUMBER_WORDS.has(t))};
}
export const closeTo = (a, b) => (Array.isArray(b) ? a.length === b.length && a.every((v, i) => closeTo(v, b[i])) : Math.abs(a - b) < 0.05 || Math.round(a) === b);
export const checkClaim = (c, ev) => c.gets.map((g) => ({ok: closeTo(g(ev), c.value), got: g(ev)}));

// digits in captions that are not part of a format name, a tag name or a build
export function captionNumbers(line) {
  const t = line.replace(/\b(yuvj?\d+p\d*|bt\.?\d+|rgb8|ffmpeg|ffprobe|ffmpeg 6\.1\.1|6\.1\.1|8\.1\.2|\d+ bit|\d+ x \d+|ff\d+)\b/gi, ' ').replace(/(?:^|\s)-?\w*_?\w+=\S+/g, ' ');
  return (t.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}
export const claimValues = () => new Set(CLAIMS.flatMap((c) => (Array.isArray(c.value) ? c.value : [c.value])));
export const readScript = (dir) => JSON.parse(fs.readFileSync(new URL(`../../${dir}/script.json`, import.meta.url), 'utf8'));

// ---- numbers in the written copy (distribution kit, outline row) ----------------------------------------------------------------------
export function evidenceNumbers(ev) {
  const set = new Set();
  const add = (v) => { if (Number.isFinite(v)) { set.add(v); set.add(Math.abs(v)); set.add(Math.round(v)); set.add(Math.round(v * 10) / 10); } };
  const walk = (v) => {
    if (typeof v === 'number') add(v);
    else if (typeof v === 'string') (v.match(/\d+(?:\.\d+)?/g) ?? []).forEach((x) => add(Number(x)));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(ev);
  for (const x of claimValues()) add(x);
  // counts and format names that the copy spells in digits: yuv 4:2:0 style names are stripped before reading, the rest is listed here
  for (const x of [1, 2, 3, 6, 8, 10]) set.add(x);
  return set;
}
const SOURCE_TITLES = [/FFmpeg's Default Output Is BT\.601, With No Tag/g, /FFmpeg yuv420p Turns a 1-Pixel Red Line Purple/g, /FFmpeg -color_range pc: 6\.1\.1 Relabels Black as 16, 8\.1\.2 Converts/g,
  /FFmpeg HDR to SDR: a Plain Conversion Puts 100 Nit White at 127, Not 235/g, /FFmpeg Black and White: gray and hue Match, the Mixer Follows Its Weights, 8\.1 Changes gray on HD/g,
  /FFmpeg 10-bit to 8-bit Banding: format=yuv420p Already Dithers, Only sws_dither=none Changes It/g];
export function copyNumbers(text) {
  let t = text.replace(/<!-- chapters:start -->[\s\S]*?<!-- chapters:end -->/, ' ').replace(/github\.com\S+/g, ' ');
  for (const re of SOURCE_TITLES) t = t.replace(re, ' ');
  t = t.replace(/\b\d+\.\d+\.\d+\b/g, ' ').replace(/\bBT\.\d+\b/g, ' ').replace(/\b\d{3,4}x\d{3,4}\b/g, ' ').replace(/\b\d+:\d\d\b/g, ' ')
    .replace(/\bfl\d\d\b|\bfs\d\d\b|\bff\d\d\b|\bFL\d\d\b|\bFS\d\d\b/g, ' ').replace(/\b[A-Za-z_-]+\d+[A-Za-z0-9_]*\b/g, ' ')
    .replace(/(?:^|\s)#\w+/g, ' ').replace(/\babout 6 minutes\b/g, ' ').replace(/\b(Tags|Title options|Pinned comment)\s*\([^)]*\)/g, ' ');
  return (t.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}
