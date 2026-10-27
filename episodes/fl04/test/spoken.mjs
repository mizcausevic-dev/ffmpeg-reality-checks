// Helpers shared by the fl04 and fs04 tests: turn spoken number words into numbers, and list the numbers the evidence can support.
const UNITS = {zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19};
const TENS = {twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90};
const isWord = (w) => w in UNITS || w in TENS || w === 'hundred';

// "a hundred fifty two" -> 152, "zero point four eight" -> 0.48, "thirty seven, sixty two" -> 37, 62. Commas end a number. Version words (six point one point one) are returned as strings.
export function spokenNumbers(text) {
  const versions = [];
  const t = text.toLowerCase().replace(/(six|eight) point one point (one|two)/g, (m, a, b) => { versions.push(`${a === 'six' ? 6 : 8}.1.${b === 'one' ? 1 : 2}`); return ' VERSION '; });
  const out = [...versions];
  const toks = t.replace(/[.:;?!]/g, ' , ').replace(/,/g, ' , ').split(/\s+/).filter(Boolean).map((w) => w.replace(/[^a-z,]/g, ''));
  for (let i = 0; i < toks.length;) {
    const w = toks[i];
    if (w === 'a' && toks[i + 1] === 'hundred') { i++; continue; }
    if (!isWord(w)) { i++; continue; }
    let value = 0, cur = 0, last = null;                       // last: 'unit' | 'tens' | 'hundred'
    let j = i;
    for (; j < toks.length; j++) {
      const x = toks[j];
      if (x in UNITS && UNITS[x] < 10 && (last === null || last === 'hundred' || last === 'tens')) { cur += UNITS[x]; last = 'unit'; }
      else if (x in UNITS && UNITS[x] >= 10 && (last === null || last === 'hundred')) { cur += UNITS[x]; last = 'unit10'; }
      else if (x in TENS && (last === null || last === 'hundred')) { cur += TENS[x]; last = 'tens'; }
      else if (x === 'hundred' && (last === 'unit' || last === null)) { cur = (cur || 1) * 100; last = 'hundred'; }
      else break;
    }
    value = cur;
    if (toks[j] === 'point') {                                   // decimals are read digit by digit
      let frac = '', k = j + 1;
      while (k < toks.length && toks[k] in UNITS && UNITS[toks[k]] < 10) { frac += UNITS[toks[k]]; k++; }
      if (frac) { value = Number(`${value}.${frac}`); j = k; }
    }
    out.push(value);
    i = j;
  }
  return out;
}

const roundTo = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
// every number the evidence holds (arrays: first 12 entries, the ones the films show), at 0, 1, 2 and 3 decimals, plus the numbers inside command strings
export function evidenceNumbers(ev, extraCommands = [], derived = []) {
  const set = new Set();
  const add = (x) => { if (Number.isFinite(x)) for (const d of [0, 1, 2, 3]) set.add(roundTo(x, d)); };
  const walk = (v, key) => {
    if (typeof v === 'number') add(v);
    else if (typeof v === 'string') { if (key === 'command' || key === 'select') for (const m of v.matchAll(/\d+(?:\.\d+)?/g)) set.add(Number(m[0])); for (const m of v.matchAll(/(?<![\d.])\d+(?:\.\d+)?(?=\s*(?:fps|ms|s)\b)/g)) set.add(Number(m[0])); }
    else if (Array.isArray(v)) v.slice(0, 12).forEach((x) => walk(x, key));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(ev);
  derived.forEach(add);
  for (const c of extraCommands) for (const m of c.matchAll(/\d+(?:\.\d+)?/g)) set.add(Number(m[0]));
  return set;
}
// small counts that describe the structure of the film (five chapters, two readers, three plays, one third), not measurements
export const STRUCTURAL = new Set([1, 2, 3, 4, 5]);

export function digitNumbers(text) {
  return [...text.replace(/\d+\.\d+\.\d+/g, ' ').matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}
