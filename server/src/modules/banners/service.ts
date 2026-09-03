import { db } from '../../libs/db';
import { ApiError } from '../../middleware/errorHandler';
import { deleteBanner, detectImageType, storeBanner } from './upload';

export type BannerInput = {
  title: string;
  linkUrl: string;
  position?: number;
  isActive?: boolean;
};

/**
 * Whether a banner may point at this destination.
 *
 * A banner's link is typed by an administrator, so it is trusted more than a
 * visitor's input — but not blindly. Anything other than a same-site path or an
 * https address is refused, which rules out `javascript:` and `data:` as well
 * as turning the homepage into an open redirect through a typo.
 * @param url - The destination as entered.
 * @returns True when the destination is acceptable.
 */
export function isAllowedLink(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  // A same-site path. Rejecting "//host" matters: the browser reads it as a
  // protocol-relative URL to another origin, not as a path.
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }

  try {
    return new URL(trimmed).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Banners for the homepage: active only, in the order an administrator set.
 * @returns The banners to display.
 */
export async function listActiveBanners() {
  return db.banner.findMany({
    where: { isActive: true },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });
}

/**
 * Every banner, including the inactive ones, for the admin screen.
 * @returns All banners in display order.
 */
export async function listAllBanners() {
  return db.banner.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] });
}

/**
 * Stores an uploaded banner.
 *
 * The file is verified by its bytes and written before the row is created, so
 * a row never points at a file that does not exist. The reverse — a file with
 * no row — is recoverable and invisible.
 * @param file - The uploaded file, held in memory by multer.
 * @param input - Title, link, and optional position and active flag.
 * @param dimensions - Width and height, measured by the caller.
 * @returns The created banner.
 */
export async function createBanner(
  file: { buffer: Buffer },
  input: BannerInput,
  dimensions: { width: number; height: number },
) {
  const ext = detectImageType(file.buffer);
  if (!ext) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'File must be a JPEG, PNG or WebP image');
  }
  if (!isAllowedLink(input.linkUrl)) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Link must be a site path or an https URL');
  }

  const filename = await storeBanner(file.buffer, ext);

  try {
    return await db.banner.create({
      data: {
        title: input.title,
        filename,
        linkUrl: input.linkUrl.trim(),
        position: input.position ?? 0,
        isActive: input.isActive ?? true,
        width: dimensions.width,
        height: dimensions.height,
      },
    });
  } catch (err) {
    // The row failed, so the file it would have referenced is an orphan.
    await deleteBanner(filename);
    throw err;
  }
}

/**
 * Updates a banner's title, link, order or visibility. The image is not
 * replaceable — a new image is a new banner, which keeps the file and the row
 * created and destroyed together.
 * @param id - The banner id.
 * @param input - The fields to change.
 * @returns The updated banner.
 */
export async function updateBanner(id: string, input: Partial<BannerInput>) {
  if (input.linkUrl !== undefined && !isAllowedLink(input.linkUrl)) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Link must be a site path or an https URL');
  }

  const existing = await db.banner.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Banner not found');
  }

  return db.banner.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.linkUrl !== undefined && { linkUrl: input.linkUrl.trim() }),
      ...(input.position !== undefined && { position: input.position }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

/**
 * Removes a banner and the file behind it.
 *
 * The file goes second: if it fails, the banner has already stopped being
 * served, which is what the administrator asked for.
 * @param id - The banner id.
 */
export async function removeBanner(id: string): Promise<void> {
  const existing = await db.banner.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, 'NOT_FOUND', 'Banner not found');
  }

  await db.banner.delete({ where: { id } });
  await deleteBanner(existing.filename);
}
