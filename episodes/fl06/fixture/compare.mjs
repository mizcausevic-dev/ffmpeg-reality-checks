// Usage: node episodes/fl06/fixture/compare.mjs <evidence-on-build-A.json> <evidence-on-build-B.json>
// Prints, per content and per -pred, whether the two builds wrote the same bytes, and whether the pixels are the same.
import fs from 'node:fs';
import {compareEvidence} from './experiment.mjs';

const [fa, fb] = process.argv.slice(2);
if (!fa || !fb) { console.error('usage: node compare.mjs <evidenceA.json> <evidenceB.json>'); process.exit(1); }
const A = JSON.parse(fs.readFileSync(fa, 'utf8')), B = JSON.parse(fs.readFileSync(fb, 'utf8'));
const c = compareEvidence(A, B);
console.log(`A: ${c.a}\nB: ${c.b}\n`);
console.log(`${'content'.padEnd(24)}${'run'.padEnd(9)}${'bytes A'.padStart(9)}${'bytes B'.padStart(9)}  same bytes  same pixels  same histogram`);
for (const r of c.rows) console.log(`${r.content.padEnd(24)}${r.run.padEnd(9)}${String(r.bytesA).padStart(9)}${String(r.bytesB).padStart(9)}  ${String(r.sameBytes).padEnd(10)}  ${String(r.samePixels).padEnd(11)}  ${r.sameHistogram ? 'yes' : `no: A ${JSON.stringify(r.histA)} B ${JSON.stringify(r.histB)}`}`);
console.log(`\ndecoded pixels identical on both builds, every file: ${c.allPixelsSame}`);
console.log(`explicit -pred files with identical bytes: ${c.explicitSameBytes} of ${c.explicitTotal}${c.explicitDifferent.length ? '; different (first 8): ' + c.explicitDifferent.slice(0, 8).join(', ') : ''}`);
console.log(`explicit -pred files with the same filter histogram: ${c.explicitSameHistogram} of ${c.explicitTotal}`);
console.log(c.filteredDataKnown ? `files whose inflated scanline data (filter bytes included) is identical, explicit modes: ${c.explicitSameFilteredData} of ${c.explicitTotal} (compared where both evidence files carry it: ${c.filteredDataKnown})` : 'inflated scanline md5 is missing in one of the evidence files: re-run run.mjs on that build');
console.log(`default files with identical bytes: ${c.defaultSameBytes} of ${c.defaultTotal}`);
console.log('\nB default vs A explicit modes (which explicit -pred of A has the same bytes as the default of B):');
for (const [n, d] of Object.entries(c.defaultVsExplicit)) console.log(`  ${n.padEnd(24)} B default ${String(d.bytesB).padStart(7)} B, histogram ${JSON.stringify(d.histB)}, same bytes as A: ${d.aExplicitWithSameBytes.join(', ') || 'none of them'}`);
