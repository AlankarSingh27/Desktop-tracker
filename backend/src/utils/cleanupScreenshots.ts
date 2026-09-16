import { Screenshot } from "../models/Screenshot";
import { cloudinary } from "../config/cloudinary";
import { env } from "../config/env";

/**
 * Deletes both the Cloudinary asset and the DB record for screenshots
 * older than the retention window. Deliberately not using a Mongo TTL
 * index for this collection (see Screenshot.ts) - this job is the only
 * thing that removes screenshots, so the Cloudinary asset never outlives
 * the DB record that references it.
 */
export async function cleanupExpiredScreenshots(): Promise<void> {
  const cutoff = new Date(Date.now() - env.screenshotRetentionDays * 24 * 3600 * 1000);

  const expired = await Screenshot.find({ capturedAt: { $lt: cutoff } }).select(
    "_id cloudinaryPublicId"
  );
  if (expired.length === 0) return;

  let deletedAssets = 0;
  for (const shot of expired) {
    try {
      await cloudinary.uploader.destroy(shot.cloudinaryPublicId, {
        resource_type: "image",
        type: "authenticated",
      });
      deletedAssets++;
    } catch (err) {
      // asset already gone or Cloudinary hiccup - still remove the DB
      // record below so we don't retry forever on a permanently-broken ref
      console.error(`[cleanup] Failed to delete Cloudinary asset ${shot.cloudinaryPublicId}:`, err);
    }
  }

  await Screenshot.deleteMany({ _id: { $in: expired.map((s) => s._id) } });
  console.log(
    `[cleanup] Removed ${expired.length} expired screenshot records (${deletedAssets} Cloudinary assets deleted)`
  );
}

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // run every 6 hours

export function startScreenshotCleanupJob(): void {
  cleanupExpiredScreenshots().catch((err) => console.error("[cleanup] initial run failed:", err));
  setInterval(() => {
    cleanupExpiredScreenshots().catch((err) => console.error("[cleanup] run failed:", err));
  }, CLEANUP_INTERVAL_MS);
}
