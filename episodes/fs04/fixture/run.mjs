// Usage: node episodes/fs04/fixture/run.mjs [outdir]   (default: ./out/fs04)   Runs the fl04 fixture and writes its evidence.json.
process.argv[2] ??= 'out/fs04';
await import('../../fl04/fixture/run.mjs');
