import * as fs from 'fs';
import * as path from 'path';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'child_process';

function runFfmpeg(args: string[]) {
  const ffmpegExe = typeof ffmpegPath === 'string' && ffmpegPath.trim() ? ffmpegPath : null;
  if (!ffmpegExe) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegExe, args, { windowsHide: true });
    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += String(d || '');
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

async function ensureCompressedVideo(params: { inputMp4Path: string; outWebmPath: string; outPosterWebpPath: string }) {
  if (!fs.existsSync(params.inputMp4Path)) {
    return;
  }

  const inStat = fs.statSync(params.inputMp4Path);

  const shouldRebuildWebm = (() => {
    if (!fs.existsSync(params.outWebmPath)) return true;
    const outStat = fs.statSync(params.outWebmPath);
    return outStat.mtimeMs < inStat.mtimeMs;
  })();

  const shouldRebuildPoster = (() => {
    if (!fs.existsSync(params.outPosterWebpPath)) return true;
    const outStat = fs.statSync(params.outPosterWebpPath);
    return outStat.mtimeMs < inStat.mtimeMs;
  })();

  if (shouldRebuildWebm) {
    await runFfmpeg([
      '-y',
      '-i',
      params.inputMp4Path,
      '-map',
      '0:v:0',
      '-map',
      '0:a?',
      '-vf',
      'scale=1280:-2:force_original_aspect_ratio=decrease',
      '-r',
      '30',
      '-c:v',
      'libvpx-vp9',
      '-b:v',
      '0',
      '-crf',
      '36',
      '-row-mt',
      '1',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'libopus',
      '-b:a',
      '96k',
      params.outWebmPath,
    ]);
  }

  if (shouldRebuildPoster) {
    await runFfmpeg([
      '-y',
      '-ss',
      '00:00:01',
      '-i',
      params.inputMp4Path,
      '-frames:v',
      '1',
      '-vf',
      'scale=1280:-2:force_original_aspect_ratio=decrease',
      params.outPosterWebpPath,
    ]);
  }
}

async function main() {
  const videosDir = path.resolve(process.cwd(), 'public', 'videos');
  if (!fs.existsSync(videosDir)) return;

  const inputMp4Path = path.join(videosDir, 'business-hero.mp4');
  const outWebmPath = path.join(videosDir, 'business-hero.webm');
  const outPosterWebpPath = path.join(videosDir, 'business-hero-poster.webp');

  await ensureCompressedVideo({ inputMp4Path, outWebmPath, outPosterWebpPath });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
