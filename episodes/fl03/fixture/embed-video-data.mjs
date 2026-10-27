// Usage: node episodes/fl03/fixture/embed-video-data.mjs [evidence.json]
// Writes the generated data block (see video-data.mjs) into episodes/fl03/video/Scenes.tsx and episodes/fs03/video/Scenes.tsx.
// With no argument the six source experiments run live (about a minute); with an evidence.json from fixture/run.mjs it reads that instead.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {videoData, block, BEGIN, END} from './video-data.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let ev;
if (process.argv[2]) ev = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
else {
  const {runExperiment} = await import('./experiment.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frc-fl03-embed-'));
  try { ev = runExperiment(dir); } finally { fs.rmSync(dir, {recursive: true, force: true}); }
}
const text = block(videoData(ev));
for (const ep of ['fl03', 'fs03']) {
  const file = path.join(here, '..', '..', ep, 'video', 'Scenes.tsx');
  const src = fs.readFileSync(file, 'utf8');
  const a = src.indexOf(BEGIN), b = src.indexOf(END);
  if (a < 0 || b < a) throw new Error(`${file} has no generated block (put the BEGIN and END marker lines in first)`);
  fs.writeFileSync(file, src.slice(0, a) + text + src.slice(b + END.length));
  console.log(`embedded ${text.length} characters into ${file}`);
}
