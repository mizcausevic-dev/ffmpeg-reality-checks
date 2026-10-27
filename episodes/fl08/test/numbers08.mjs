// Helpers shared by the fl08 and fs08 tests: which numbers may a script speak or caption.
// A number is allowed when it appears in the evidence of a fresh run, in evidence.json (ffmpeg 6.1.1) or in evidence-v8.json (ffmpeg 8.1.2).
import fs from 'node:fs';
import path from 'node:path';
import {spokenNumbers, evidenceNumbers} from '../../fl01/test/numbers.mjs';

export const EP = path.join(import.meta.dirname, '..');
export const readJson = (f) => JSON.parse(fs.readFileSync(path.join(EP, f), 'utf8'));
// version labels (and "ten bit") that the number parser would read as numbers
const STRUCTURAL = ['eight point one point two', 'eight point zero', 'deep dive eight', 'short eight', 'ten bit'];
export const spoken = (s) => spokenNumbers(STRUCTURAL.reduce((a, p) => a.split(p).join(' '), s.toLowerCase()));
export const knownNumbers = (fresh = {}) => { const s = evidenceNumbers(fresh); for (const f of ['evidence.json', 'evidence-v8.json']) if (fs.existsSync(path.join(EP, f))) evidenceNumbers(readJson(f), s); return s; };
export const checkScript = (sc, known) => {
  const bad = [];
  for (const s of sc.scenes) for (const n of spoken(s.narration)) if (!known.has(n.value)) bad.push(`${s.id}: "${n.words}" = ${n.value}`);
  for (const s of sc.scenes) for (const c of s.captions) for (const m of c.replace(/\b(?:6\.1\.1|8\.1\.2|8\.0)\b|yuva420p/g, ' ').matchAll(/\d+(?:\.\d+)?/g)) if (!known.has(Number(m[0]))) bad.push(`${s.id} caption: ${m[0]}`);
  return bad;
};
// The distribution kit: numbers outside the evidence, plus the limits.
export const checkKit = (md, known) => {
  const body = md.replace(/<!-- chapters:start -->[\s\S]*?<!-- chapters:end -->/, '').replace(/^#+ .*$/gm, '').replace(/ffmpeg 6\.1\.1|6\.1\.1|8\.1\.2|8\.0|10-bit|github\.com\S+|yuva420p|^\d+\. /gm, ' ');
  return [...new Set([...body.matchAll(/(?<![\w.])\d+(?:\.\d+)?(?![\w])/g)].map((m) => Number(m[0])).filter((n) => !known.has(n)))];
};
