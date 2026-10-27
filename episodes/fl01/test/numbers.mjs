// Helpers shared by the fl01 and fs01 tests: turn the number words in a narration into numbers, and collect every
// number that appears in an evidence object. A script may only speak numbers that the evidence contains.
const ONES = {zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19};
const TENS = {twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90};
const isNum = (w) => w in ONES || w in TENS || w === 'hundred' || w === 'point';

// structural phrases that are not measurements (reader one, five things, version label, codec name)
export const STRUCTURAL = ['reader one', 'reader two', 'five things', 'deep dive one', 'short one', 'six point one point one', 'x two six four', 'part one', 'one idea'];

// integer part: "one hundred thirty eight", "one eighty eight" (hundreds digit then two-digit number), "two twenty five", "three fourteen", "twenty five"
function intPart(ws) {
  if (!ws.length) return 0;
  let n = 0, i = 0;
  if (ws.includes('hundred')) {
    const h = ws.indexOf('hundred');
    n = (h === 0 ? 1 : small(ws.slice(0, h))) * 100;
    return n + small(ws.slice(h + 1));
  }
  // pair style: digit followed by a 10..99 number
  if (ws.length >= 2 && ONES[ws[0]] >= 1 && ONES[ws[0]] <= 9 && (ws[1] in TENS || (ws[1] in ONES && ONES[ws[1]] >= 10))) return ONES[ws[0]] * 100 + small(ws.slice(1));
  return small(ws);
}
function small(ws) { let n = 0; for (const w of ws) n += w in ONES ? ONES[w] : w in TENS ? TENS[w] : 0; return n; }

export function spokenNumbers(narration) {
  let text = narration.toLowerCase();
  for (const p of STRUCTURAL) text = text.split(p).join(' ');
  text = text.replace(/(\w+) and a half/g, '$1 point five');
  const toks = text.match(/[a-z]+|[.,;:?!]/g) ?? [];
  const out = []; let run = [];
  const flush = () => {
    if (!run.length) return;
    const pi = run.indexOf('point');
    const ip = pi < 0 ? run : run.slice(0, pi), dp = pi < 0 ? [] : run.slice(pi + 1);
    const i = intPart(ip);
    out.push({words: run.join(' '), value: dp.length ? Number(`${i}.${dp.map((w) => ONES[w]).join('')}`) : i});
    run = [];
  };
  for (const w of toks) { if (isNum(w)) run.push(w); else flush(); }
  flush();
  return out;
}

// every number anywhere in an object, plus its 2-decimal rounding
export function evidenceNumbers(obj, set = new Set()) {
  if (typeof obj === 'number' && Number.isFinite(obj)) { set.add(obj); set.add(Math.round(obj * 100) / 100); }
  else if (Array.isArray(obj)) obj.forEach((x) => evidenceNumbers(x, set));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach((x) => evidenceNumbers(x, set));
  return set;
}
