// Episode 73 fixture: "drawtext shows the wrong text: what do %, : and ' do?"
// Synthetic input only: a black 768x64 gray frame from lavfi, one drawtext with a monospace font (fontsize 40, white), one frame out.
// ffmpeg runs without a shell (arguments go straight to the program), so the filter string is exactly what the case table says.
// The font is copied to the work directory as font.ttf and ffmpeg runs there, so no path ever needs escaping.
//
// Four strings are tested, each as the text the film wants to see on screen:
//   percent   100%       colon   12:30       apostrophe   it's       backslash   a\b
// Each is written after `text=` with 0 to 9 backslashes in front of the special character (for the backslash target: 0 to 9 backslashes in all), bare and inside single quotes
// (apostrophe: the quote is closed, the backslashes and the apostrophe are written, then the quote is reopened), with and without expansion=none.
//
// Readers (what was drawn):
//   reader 1  ffmpeg framemd5 of the output frame, compared with the framemd5 of a reference frame of the decoded text, drawn through the clean route
//             (textfile with expansion=none, which no parser touches). Equal hashes mean the frame is exactly that text.
//   reader 2  Node on the raw gray pixels: the frame is cut into one cell per character, and each cell is matched against a reference sheet
//             (one line per character, drawn 32 times so each position has its own sub-pixel phase). It decodes the text with no list of candidates.
// Known positive: 150 random strings through the clean route decode back exactly. Known negatives: an untouched frame decodes to nothing,
// and `its` is told apart from `it's`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ffmpegVersion} from '../../../tools/ff.mjs';

export const W = 768, H = 64, FONT_SIZE = 40, BASE_Y = 44;
export const FONTS = [
  ...(process.env.FRC_FONT ? [process.env.FRC_FONT] : []),
  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', '/usr/share/fonts/dejavu/DejaVuSansMono.ttf', '/usr/share/fonts/TTF/DejaVuSansMono.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf', '/usr/share/fonts/liberation-mono/LiberationMono-Regular.ttf',
  '/System/Library/Fonts/Menlo.ttc', 'C:/Windows/Fonts/consola.ttf', 'C:/Windows/Fonts/cour.ttf',
];
export const findFont = () => FONTS.find((f) => fs.existsSync(f)) ?? null;
export const buildOf = (versionLine) => (/version 6\./.test(versionLine) ? 'v6' : /version 8\./.test(versionLine) ? 'v8' : 'other');
export const haveDrawtext = () => {
  const f = spawnSync('ffmpeg', ['-hide_banner', '-filters'], {encoding: 'utf8'});
  return f.status === 0 && /\sdrawtext\s/.test(f.stdout);
};

const bsl = (n) => '\\'.repeat(n);
export const TARGETS = {
  percent: {text: '100%', special: '%'},
  colon: {text: '12:30', special: ':'},
  apostrophe: {text: "it's", special: "'"},
  backslash: {text: 'a\\b', special: '\\'},
};
// what goes after `text=` for target t, style (bare or quoted) and n backslashes in front of the special character
export const typed = (t, style, n) => {
  const [pre, post] = TARGETS[t].text.split(TARGETS[t].special);
  if (t === 'apostrophe') return style === 'bare' ? `${pre}${bsl(n)}'${post}` : `'${pre}'${bsl(n)}''${post}'`;
  const mid = t === 'backslash' ? bsl(n) : bsl(n) + TARGETS[t].special; // for the backslash target n is the whole count written
  return style === 'bare' ? `${pre}${mid}${post}` : `'${pre}${mid}${post}'`;
};

export class Lab {
  constructor(dir) {
    this.dir = dir; fs.mkdirSync(dir, {recursive: true});
    const font = findFont();
    if (!font) throw new Error('no monospace font found');
    this.fontName = path.basename(font);
    fs.copyFileSync(font, path.join(dir, 'font.ttf'));
    this.runs = 0; this.refCache = new Map();
    this.#calibrate();
  }
  vf(textOpts) { return `drawtext=fontfile=font.ttf:fontsize=${FONT_SIZE}:fontcolor=white:x=0:y=${BASE_Y}-ascent:${textOpts}`; }
  #ff(args) { this.runs++; return spawnSync('ffmpeg', ['-v', 'warning', '-y', ...args], {cwd: this.dir, maxBuffer: 1 << 28}); }
  src(w = W, h = H) { return ['-f', 'lavfi', '-i', `color=c=black:s=${w}x${h}:d=0.04:r=25,format=gray`]; }
  raw(vf, w = W, h = H) { const r = this.#ff([...this.src(w, h), '-vf', vf, '-frames:v', '1', '-f', 'rawvideo', '-']); return {status: r.status, buf: r.stdout, err: String(r.stderr)}; }
  md5(vf) {
    const r = this.#ff([...this.src(), '-vf', vf, '-frames:v', '1', '-f', 'framemd5', '-']);
    const line = String(r.stdout).split(/\r?\n/).find((l) => l && !l.startsWith('#'));
    return line ? line.split(',').pop().trim() : null;
  }
  #calibrate() {
    const plain = this.raw('null');
    this.bg = plain.buf[0]; this.blankMd5 = this.md5('null');
    // advance: ink start of the first and the last of 30 'i' glyphs
    fs.writeFileSync(path.join(this.dir, 't.txt'), 'i'.repeat(30));
    const b = this.raw(this.vf('textfile=t.txt:expansion=none')).buf;
    const cols = []; for (let x = 0; x < W; x++) { let ink = false; for (let y = 0; y < H && !ink; y++) ink = b[y * W + x] !== this.bg; cols.push(ink); }
    const starts = []; cols.forEach((v, x) => { if (v && (x === 0 || !cols[x - 1])) starts.push(x); });
    this.adv = Math.round((starts[starts.length - 1] - starts[0]) / (starts.length - 1));
    this.n = Math.floor(W / this.adv);
    this.c0 = Math.round(this.adv / 8); this.c1 = this.adv - this.c0; // interior columns of a cell (neighbours spill a pixel or two over the edge)
    const chars = []; for (let c = 33; c < 127; c++) chars.push(String.fromCharCode(c));
    this.chars = chars;
    const vfs = chars.map((ch, j) => { fs.writeFileSync(path.join(this.dir, `r${j}.txt`), ch.repeat(this.n)); return `drawtext=fontfile=font.ttf:fontsize=${FONT_SIZE}:fontcolor=white:x=0:y=${j * H}+${BASE_Y}-ascent:textfile=r${j}.txt:expansion=none`; }).join(',');
    const sheet = this.raw(vfs, W, H * chars.length).buf;
    this.refs = chars.map((_, j) => Array.from({length: this.n}, (_, k) => this.#cell(sheet, j * H, k)));
    this.blankCell = Buffer.alloc((this.c1 - this.c0) * H, this.bg);
    this.ambiguousPositions = Array.from({length: this.n}, (_, k) => new Set(this.refs.map((r) => r[k].toString('hex'))).size !== chars.length).filter(Boolean).length;
  }
  #cell(buf, row0, k) {
    const w = this.c1 - this.c0, out = Buffer.alloc(w * H);
    for (let y = 0; y < H; y++) for (let x = this.c0; x < this.c1; x++) out[y * w + x - this.c0] = buf[(row0 + y) * W + k * this.adv + x];
    return out;
  }
  // reader 2: the text in a frame, or null when some cell with ink matches no reference glyph (another font, a half drawn glyph)
  decode(buf) {
    let s = ''; let unknown = false;
    for (let k = 0; k < this.n; k++) {
      const cb = this.#cell(buf, 0, k);
      if (cb.equals(this.blankCell)) { s += ' '; continue; }
      const j = this.refs.findIndex((r) => r[k].equals(cb));
      if (j < 0) { unknown = true; s += '\uFFFD'; } else s += this.chars[j];
    }
    return unknown ? null : s.replace(/ +$/, '');
  }
  ink(buf) { let n = 0; for (let i = 0; i < buf.length; i++) if (buf[i] !== this.bg) n++; return n; }
  // the clean route: the text from a file, expansion off. No filter-graph, option or expansion parser touches it.
  cleanVf(text) { fs.writeFileSync(path.join(this.dir, 'c.txt'), text); return this.vf('textfile=c.txt:expansion=none'); }
  refMd5(text) {
    if (text === '') return this.blankMd5;
    if (!this.refCache.has(text)) this.refCache.set(text, this.md5(this.cleanVf(text)));
    return this.refCache.get(text);
  }
  // run one case: textOpts is exactly what follows `drawtext=fontfile=font.ttf:fontsize=40:fontcolor=white:x=0:y=44-ascent:`
  run(id, group, target, textOpts, extra = {}) {
    const vf = this.vf(textOpts);
    const r = this.raw(vf);
    const m = r.status === 0 ? this.md5(vf) : null;
    const drawn = r.status === 0 ? this.decode(r.buf) : null;
    const warn = r.err.split(/\r?\n/).map((l) => l.replace(/\[[^\]]*\]\s*/g, '').trim()).filter(Boolean)[0] ?? '';
    const out = {id, group, target, textOpts, exit: r.status, warn, ink: r.status === 0 ? this.ink(r.buf) : null, drawn, md5: m, ...extra};
    out.ok = r.status === 0 && drawn !== null && drawn === TARGETS[target]?.text;
    out.blank = r.status === 0 && out.ink === 0;
    out.refMd5 = drawn === null ? null : this.refMd5(drawn);
    out.agree = drawn === null ? null : m === out.refMd5;
    return out;
  }
}

export function randomControl(lab, count = 150) {
  let x = 12345; const rnd = () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let bad = 0, md5Bad = 0; const sample = [];
  for (let i = 0; i < count; i++) {
    let s = ''; const len = 1 + Math.floor(rnd() * lab.n);
    for (let j = 0; j < len; j++) s += String.fromCharCode(32 + Math.floor(rnd() * 95));
    s = s.replace(/ +$/, ''); if (!s) continue;
    const r = lab.raw(lab.cleanVf(s));
    if (lab.decode(r.buf) !== s) { bad++; if (sample.length < 3) sample.push(s); }
  }
  return {count, mismatches: bad, sample};
}

const GRID_TARGETS = Object.keys(TARGETS);
export function runExperiment(dir) {
  const lab = new Lab(dir);
  const ev = {
    ffmpeg: ffmpegVersion(), font: lab.fontName, canvas: `${W}x${H}`, fontsize: FONT_SIZE, advance: lab.adv, cells: lab.n, glyphs: lab.chars.length,
    ambiguousPositions: lab.ambiguousPositions, background: lab.bg,
    control: {},
    cases: [],
  };
  ev.control.random = randomControl(lab);
  ev.control.untouchedDecodes = lab.decode(lab.raw('null').buf);
  ev.control.untouchedInk = lab.ink(lab.raw('null').buf);
  ev.control.apostropheVsNone = [lab.decode(lab.raw(lab.cleanVf("it's")).buf), lab.decode(lab.raw(lab.cleanVf('its')).buf)];
  ev.control.sameTextSameHash = lab.md5(lab.cleanVf("it's")) === lab.md5(lab.cleanVf("it's"));

  const add = (...a) => { const c = lab.run(...a); ev.cases.push(c); return c; };
  // A. typed the way people type it: one quoted string, nothing escaped
  add('typed-percent', 'typed', 'percent', `text='100%'`);
  add('typed-colon', 'typed', 'colon', `text='12:30'`);
  add('typed-apostrophe', 'typed', 'apostrophe', `text='it's'`);
  add('typed-backslash', 'typed', 'backslash', `text='a\\b'`);
  // B. the grid: 0 to 9 backslashes, bare and quoted, expansion on (the default)
  for (const t of GRID_TARGETS) for (const style of ['bare', 'quoted']) for (let n = 0; n <= 9; n++) add(`grid-${t}-${style}-${n}`, 'grid', t, `text=${typed(t, style, n)}`, {style, bs: n, expansion: 'normal'});
  // C. the same grid with expansion=none (the third parser switched off), 0 to 5 backslashes
  for (const t of GRID_TARGETS) for (const style of ['bare', 'quoted']) for (let n = 0; n <= 5; n++) add(`none-${t}-${style}-${n}`, 'none', t, `text=${typed(t, style, n)}:expansion=none`, {style, bs: n, expansion: 'none'});
  // D. the clean route: textfile, with expansion on and off
  for (const t of GRID_TARGETS) {
    fs.writeFileSync(path.join(dir, `f-${t}.txt`), TARGETS[t].text);
    add(`file-normal-${t}`, 'file', t, `textfile=f-${t}.txt`, {expansion: 'normal'});
    add(`file-none-${t}`, 'file', t, `textfile=f-${t}.txt:expansion=none`, {expansion: 'none'});
  }
  // E. what the percent sign is for, braces, the comma, and the colon mechanism
  add('func-pts', 'extra', 'percent', `text='%{pts}'`);
  add('func-literal', 'extra', 'percent', `text='\\\\%{pts}'`);
  add('func-unknown', 'extra', 'percent', `text='%{nosuch}'`);
  add('braces', 'extra', 'percent', `text='{x} }'`);
  add('comma-bare', 'extra', 'percent', `text=a,b`);
  add('comma-escaped', 'extra', 'percent', `text=a\\,b`);
  add('colon-as-fontfile', 'mechanism', 'colon', `text=12:fontfile=30`);
  add('colon-no-fontfile', 'mechanism', 'colon', `text=12`);
  // the colon case: what else makes the same frame
  const colonBare = ev.cases.find((c) => c.id === 'grid-colon-bare-0');
  ev.colonMechanism = {
    bareMd5: colonBare.md5,
    asFontfileMd5: ev.cases.find((c) => c.id === 'colon-as-fontfile').md5,
    // no fontfile option at all: the default font of this build
    defaultFontMd5: lab.md5(`drawtext=fontsize=${FONT_SIZE}:fontcolor=white:x=0:y=${BASE_Y}-ascent:text=12`),
    // the same two characters in the test font through the clean route
    testFontMd5: lab.refMd5('12'),
  };
  ev.runs = lab.runs;
  return ev;
}

// ---- summaries ----
export const caseOf = (ev, id) => ev.cases.find((c) => c.id === id);
// backslash counts that render the target, for a grid
export const works = (ev, group, target, style) => ev.cases.filter((c) => c.group === group && c.target === target && c.style === style && c.ok).map((c) => c.bs);
export const minBs = (ev, group, target, style) => { const w = works(ev, group, target, style); return w.length ? Math.min(...w) : null; };
// the three-parser model: each parser (filter graph, option list, drawtext expansion) removes one level of backslash.
// d3: backslashes drawtext's own expansion needs to see before the special character (expansion on: % needs 1, a backslash needs 2; off: a backslash needs 1).
// The option parser needs one more in front of a colon or an apostrophe. Written bare, the filter graph parser doubles the count again (and an apostrophe costs one extra).
export const modelMin = (target, expansion, style) => {
  const d3 = expansion === 'none' ? {percent: 0, colon: 0, apostrophe: 0, backslash: 1}[target] : {percent: 1, colon: 0, apostrophe: 0, backslash: 2}[target];
  const l2 = 2 * d3 + (target === 'colon' || target === 'apostrophe' ? 1 : 0);
  if (target === 'apostrophe') return 2 * l2 + 1;
  return style === 'bare' ? 2 * l2 : l2;
};
export const summary = (ev) => {
  const out = {};
  for (const t of GRID_TARGETS) out[t] = {normal: {bare: works(ev, 'grid', t, 'bare'), quoted: works(ev, 'grid', t, 'quoted')}, none: {bare: works(ev, 'none', t, 'bare'), quoted: works(ev, 'none', t, 'quoted')}};
  return out;
};
export const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'frc-ff73-'));
