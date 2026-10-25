# FFmpeg Reality Checks

Short narrated technical explainers about what FFmpeg commands actually do, each backed by a runnable synthetic fixture and regression tests.

- Fixtures and tests need Node 22+, `ffmpeg` and `ffprobe` on PATH. No dependencies, no network.
- Films are built by the shared render engine ([web-reality-checks](https://github.com/mizcausevic-dev/web-reality-checks), `tools/ship.mjs`): `node tools/ship.mjs --series ../ffmpeg-reality-checks ff01` (add `--upload` for a private YouTube upload).
- Series plan and measured results: [SERIES_OUTLINE.md](SERIES_OUTLINE.md)
- Episode 01 (`-c copy` seeking): `node episodes/ff01/fixture/run.mjs` then `node --test episodes/ff01/test/ff01.test.mjs`

## Episode 01 result (ffmpeg 6.1.1 on Linux; the same table on 8.1.2 on Windows)

```
You asked for 3 s starting at 7.5 s. Source keyframes at 0, 5, 10, 15 s.

variant                first frame  starts at  frames  seconds  packets in file
input_seek_copy        188          7.52s      75      3        138
output_seek_copy       250          10s        13      0.52     13
input_seek_reencode    188          7.52s      74      2.96     74
```

Limits: results are for two ffmpeg builds and one synthetic H.264 source. Players that ignore MP4 edit lists were not tested.

License for code: MIT (see LICENSE). Narration audio, thumbnails and film assets are not covered by the code license.
