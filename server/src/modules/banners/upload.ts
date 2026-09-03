import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';

/**
 * Where uploaded banners live.
 *
 * A Docker named volume is mounted here, so files survive a redeploy the way
 * `pgdata` and `caddy_data` already do. Nothing else in the container persists.
 */
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'banners');

/** 5 MB. Enforced by multer before any bytes reach the disk. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * The formats we accept, and the leading bytes that identify each.
 *
 * GIF and SVG are deliberately absent. SVG is the one that matters: it is an
 * image to a person and a script host to a browser, and serving one from our
 * own origin would run its script there, with our cookies.
 */
const SIGNATURES: { ext: string; matches: (b: Buffer) => boolean }[] = [
  { ext: 'jpg', matches: (b) => b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
  {
    ext: 'png',
    matches: (b) =>
      b.length >= 8
      && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47
      && b[4] === 0x0D && b[5] === 0x0A && b[6] === 0x1A && b[7] === 0x0A,
  },
  {
    ext: 'webp',
    matches: (b) =>
      b.length >= 12
      && b.toString('ascii', 0, 4) === 'RIFF'
      && b.toString('ascii', 8, 12) === 'WEBP',
  },
];

/**
 * Identifies an upload by its content.
 *
 * The filename and the declared MIME type both come from the client and prove
 * nothing — an attacker naming a file `logo.png` is the expected case, not an
 * unusual one. Only the bytes are evidence.
 *
 * Admin authentication is the primary control here. This is the second, for
 * the case where a session has been taken.
 * @param buffer - The uploaded bytes.
 * @returns The file extension to store it under, or null when unrecognised.
 */
export function detectImageType(buffer: Buffer): string | null {
  return SIGNATURES.find((s) => s.matches(buffer))?.ext ?? null;
}

/**
 * Multer, holding the file in memory so its bytes can be inspected before
 * anything is written.
 *
 * Writing first and checking afterwards would mean a window where an
 * unverified file exists on disk, and a cleanup path that has to work even
 * when the process dies mid-request.
 */
export const bannerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

/**
 * Writes a verified upload to the volume under a generated name.
 *
 * The client's filename is never used, not even sanitised. Sanitising is a
 * blocklist, and a generated name has no traversal, no collision and no
 * surprises.
 * @param buffer - The verified bytes.
 * @param ext - The extension from `detectImageType`.
 * @returns The stored filename.
 */
export async function storeBanner(buffer: Buffer, ext: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return filename;
}

/**
 * Removes a stored banner.
 *
 * A missing file is not an error: the row is what matters, and an orphaned
 * delete should not block removing it.
 * @param filename - The stored filename.
 */
export async function deleteBanner(filename: string): Promise<void> {
  try {
    await unlink(path.join(UPLOAD_DIR, filename));
  } catch {
    // Already gone, which is the desired end state.
  }
}
