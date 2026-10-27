// Shared by the fl06 and fs06 film tests: spoken-number parsing, the set of numbers the two evidence files (plus the derived scene data) contain,
// and script / distribution readers. No ffmpeg needed: everything reads the saved evidence-6.1.1.json and evidence-8.1.2.json.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sceneData} from '../fixture/scene-data.mjs';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const episodes = path.resolve(here, '..', '..');
export const rd = (...p) => fs.readFileSync(path.join(episodes, ...p), 'utf8');
export const json = (...p) => JSON.parse(rd(...p));

const UNITS = {zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19};
const TENS = {twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90};
const DIGIT = {zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9'};

// the two build names are spoken as "six point one point one" and "eight point one point two"; the series and episode labels are structural
export const BUILD_PHRASES = ['six point one point one', 'eight point one point two'];
export const STRUCTURAL = ['deep dive six', 'short six', 'eight point zero', 'ffmpeg eight', 'ffmpeg 8'];

// "four thousand four hundred ten" -> 4410, "six point five" -> 6.5. Punctuation ends a number.
export function spokenNumbers(text) {
  const out = [];
  let t = text.toLowerCase();
  for (const p of [...BUILD_PHRASES, ...STRUCTURAL]) t = t.split(p).join(' ');
  for (const phrase of t.split(/[.,:;!?()]/)) {
    let total = 0, cur = 0, active = false, frac = null;
    const flush = () => { if (active) out.push(Number(`${total + cur}${frac !== null ? '.' + frac : ''}`)); total = 0; cur = 0; active = false; frac = null; };
    for (const w of phrase.split(/\s+/).filter(Boolean)) {
      if (frac !== null && w in DIGIT) { frac += DIGIT[w]; continue; }
      if (w in UNITS) { if (frac !== null) flush(); cur += UNITS[w]; active = true; }
      else if (w in TENS) { cur += TENS[w]; active = true; }
      else if (w === 'hundred' && active) cur = (cur || 1) * 100;
      else if (w === 'thousand' && active) { total += (cur || 1) * 1000; cur = 0; }
      else if (w === 'point' && active) frac = '';
      else flush();
    }
    flush();
  }
  return out;
}

// every number in the objects (leaves and numbers inside short strings), both signs, with a 3 decimal rounding
export function evidenceNumbers(...objs) {
  const set = new Set();
  const add = (v) => { if (Number.isFinite(v)) { set.add(Math.abs(v)); set.add(Math.round(Math.abs(v) * 1000) / 1000); } };
  const walk = (v) => {
    if (typeof v === 'number') add(v);
    else if (typeof v === 'string') { if (v.length < 400) for (const m of v.matchAll(/\d+(?:\.\d+)?/g)) add(Number(m[0])); }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  objs.forEach(walk);
  return set;
}

export const ev6 = () => json('fl06', 'evidence-6.1.1.json');
export const ev8 = () => json('fl06', 'evidence-8.1.2.json');
/** Every number a script, caption or description may state: both evidence files and the scene data derived from them (percent changes, counts). */
export const knownNumbers = () => evidenceNumbers(ev6(), ev8(), sceneData());

export function captionNumbers(text) {
  return [...text.replace(/ffmpeg \d+\.\d+\.\d+/gi, ' ').replace(/\b\d+\.\d+\.\d+\b/g, ' ').matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, '')));
}

export const SMALL = 10; // spoken whole numbers up to ten are prose ("two builds", "four questions"); everything else must be in the evidence
export function unknownNumbers(script) {
  const have = knownNumbers(), bad = [];
  const ok = (n) => (Number.isInteger(n) && n <= SMALL) || have.has(n) || have.has(Math.round(n * 1000) / 1000);
  for (const s of script.scenes) {
    for (const n of spokenNumbers(s.narration)) if (!ok(n)) bad.push(`${s.id} narration: ${n}`);
    for (const c of s.captions) for (const n of captionNumbers(c)) if (!ok(n)) bad.push(`${s.id} caption "${c}": ${n}`);
  }
  return bad;
}

export const wordCount = (script) => script.scenes.reduce((a, s) => a + s.narration.trim().split(/\s+/).filter(Boolean).length, 0);
// seconds: words at 148 per minute plus the engine's lead (0.6 s) and tail (end card seconds + 0.5, or 10.5 s for the long film's default end card); and the engine's own estimate (2.55 words per second)
export function durations(script) {
  const w = wordCount(script), lead = 0.6, tail = (script.endCard?.seconds ?? 10) + 0.5;
  return {words: w, speech148: (w / 148) * 60, total148: (w / 148) * 60 + lead + tail, engine: w / 2.55 + lead + tail};
}
export const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/** The `scenes` map keys of a Scenes.tsx (handles `a: A, b: speed(B, 1.2)` and one key per line). */
export function mapKeys(src) {
  const m = src.match(/export const scenes[^=]*=\s*\{([\s\S]*?)\n?\};\s*$/m);
  if (!m) throw new Error('no scenes map');
  const body = m[1].replace(/speed\(\s*(\w+)\s*,\s*[\d.]+\s*\)/g, '$1');
  return [...body.matchAll(/(?:^|[,{\s])([a-z0-9]+):\s*\w+/g)].map((x) => x[1]);
}
