// Frame renderer: draws a scene frame-by-frame on a headless canvas and pipes
// raw RGBA straight into ffmpeg (libx264, yuv420p). No PNG round-trip.
import { spawn } from 'node:child_process';
import { makeCanvas } from './canvas.mjs';
import { ffmpegPath } from './ffmpeg.mjs';
import { sceneInfo, frameInfo } from './info.mjs';

export { sceneInfo };

export async function renderVideo({
  scene, seconds, out, fps = 30, width = 1920, height = 1080, seed = 1, bpm = 112,
  options = {}, crf = 17, preset = 'slow', onProgress = null, state: givenState = null,
}) {
  const frames = Math.max(1, Math.round(seconds * fps));
  const info = sceneInfo({ scene, width, height, fps, seconds, seed, bpm, options });
  const state = givenState || scene.init(info);
  const { canvas, ctx } = makeCanvas(width, height);

  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${width}x${height}`, '-r', String(fps), '-i', '-',
    '-an', '-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-pix_fmt', 'yuv420p',
    '-tune', 'animation', '-profile:v', 'high', '-level', '4.2', '-g', String(fps * 2), '-movflags', '+faststart', '-r', String(fps),
    out,
  ];
  const ff = spawn(ffmpegPath(), args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  ff.stderr.on('data', (d) => (err += d));
  const done = new Promise((resolve, reject) => {
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${err.slice(-1500)}`))));
  });

  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    const t = i / fps;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    scene.draw(ctx, t, state, frameInfo(info, t, i));
    ctx.restore();
    const buf = canvas.data(); // RGBA, premultiplied — backgrounds are opaque so this is exact
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (onProgress && (i % fps === 0 || i === frames - 1)) onProgress(i + 1, frames, (Date.now() - started) / 1000);
  }
  ff.stdin.end();
  await done;
  return { out, frames, seconds: frames / fps, state, info, renderSeconds: (Date.now() - started) / 1000 };
}

// One still frame as a PNG buffer (thumbnails, tests, docs)
export function renderStill({ scene, t = 0, width = 1280, height = 720, seconds = 30, seed = 1, bpm = 112, options = {}, fps = 30, state: givenState = null }) {
  const info = sceneInfo({ scene, width, height, fps, seconds, seed, bpm, options });
  const state = givenState || scene.init(info);
  const { canvas, ctx } = makeCanvas(width, height);
  scene.draw(ctx, t, state, frameInfo(info, t, Math.round(t * fps)));
  return { png: canvas.toBuffer('image/png'), state, canvas, ctx, info };
}
