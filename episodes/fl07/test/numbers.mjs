// Helpers shared by the fl07 and fs07 tests: number words in a narration to numbers, and the set of numbers the evidence supports.
const ONES = {zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19};
const TENS = {twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90};
const isNum = (w) => w in ONES || w in TENS || w === 'hundred' || w === 'point';
// structural phrases that are not measurements (reader labels, build and library versions, codec names, series position)
export const STRUCTURAL = ['six point one point one', 'eight point one point two', 'three point eight point two', 'one point seven', 'four point one', 'deep dive seven', 'five questions', 'two readers', 'rav one e', 'ten bit', 'two pass', 'a v one', 'av one'];
function small(ws) { let n = 0; for (const w of ws) n += w in ONES ? ONES[w] : w in TENS ? TENS[w] : 0; return n; }
function intPart(ws) {
  if (!ws.length) return 0;
  if (ws.includes('hundred')) { const h = ws.indexOf('hundred'); return (h === 0 ? 1 : small(ws.slice(0, h))) * 100 + small(ws.slice(h + 1)); }
  if (ws.length >= 2 && ONES[ws[0]] >= 1 && ONES[ws[0]] <= 9 && (ws[1] in TENS || (ws[1] in ONES && ONES[ws[1]] >= 10))) return ONES[ws[0]] * 100 + small(ws.slice(1)); // "one sixty one"
  return small(ws);
}
export function spokenNumbers(narration) {
  let text = narration.toLowerCase();
  for (const p of STRUCTURAL) text = text.split(p).join(' ');
  const toks = text.match(/[a-z]+|[.,;:?!]/g) ?? [];
  const out = []; let run = [];
  const flush = () => {
    if (!run.length) return;
    const pi = run.indexOf('point'), ip = pi < 0 ? run : run.slice(0, pi), dp = pi < 0 ? [] : run.slice(pi + 1);
    const i = intPart(ip);
    out.push({words: run.join(' '), value: dp.length ? Number(`${i}.${dp.map((w) => ONES[w]).join('')}`) : i});
    run = [];
  };
  for (const w of toks) { if (isNum(w)) run.push(w); else flush(); }
  flush();
  return out;
}
// every number anywhere in an object, with its roundings to 0..4 decimals (and thousands rounded, for kilobytes)
export function evidenceNumbers(obj, set = new Set()) {
  if (typeof obj === 'number' && Number.isFinite(obj)) { for (let d = 0; d <= 4; d++) set.add(Math.round(obj * 10 ** d) / 10 ** d); set.add(Math.round(Math.abs(obj) / 1000)); set.add(obj); }
  else if (Array.isArray(obj)) obj.forEach((x) => evidenceNumbers(x, set));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach((x) => evidenceNumbers(x, set));
  return set;
}
