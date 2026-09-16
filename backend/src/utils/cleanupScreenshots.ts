import fs from "fs";
import path from "path";
import { Screenshot } from "../models/Screenshot";
import { env } from "../config/env";

/**
 * Screenshots have TWO parts: the DB record (auto-deleted by MongoDB's TTL
 * index) and the actual JPEG file on disk (which TTL indexes cannot touch).
 * This job finds screenshots older than the retention window, deletes their
 * file, then removes the DB record - keeping disk usage from growing
 * unbounded even though TTL alone would eventually orphan the files.
 */
export async function cleanupExpiredScreenshots(): Promise<void> {
  const cutoff = new Date(Date.now() - env.screenshotRetentionDays * 24 * 3600 * 1000);

  const expired = await Screenshot.find({ capturedAt: { $lt: cutoff } }).select("_id filePath");
  if (expired.length === 0) return;

  let deletedFiles = 0;
  for (const shot of expired) {
    const fullPath = path.join(env.screenshotUploadDir, shot.filePath);
    try {
      await fs.promises.unlink(fullPath);
      deletedFiles++;
    } catch {
      // file already gone or never existed - fine, still remove the record
    }
  }

  await Screenshot.deleteMany({ _id: { $in: expired.map((s) => s._id) } });
  console.log(
    `[cleanup] Removed ${expired.length} expired screenshot records (${deletedFiles} files deleted from disk)`
  );
}

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // run every 6 hours

export function startScreenshotCleanupJob(): void {
  cleanupExpiredScreenshots().catch((err) => console.error("[cleanup] initial run failed:", err));
  setInterval(() => {
    cleanupExpiredScreenshots().catch((err) => console.error("[cleanup] run failed:", err));
  }, CLEANUP_INTERVAL_MS);
}
