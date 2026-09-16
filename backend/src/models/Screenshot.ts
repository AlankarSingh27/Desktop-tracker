import { Schema, model, Document, Types } from "mongoose";

/**
 * Periodic screenshots (not continuous screen recording). The actual image
 * lives in Cloudinary under an "authenticated" delivery type - not a plain
 * public URL - so it can only be viewed via a signed URL we generate
 * on-demand for a logged-in admin (see screenshotController.getScreenshotImage).
 * We only store the Cloudinary public_id here, never a direct public link.
 */
export interface IScreenshot extends Document {
  employee: Types.ObjectId;
  device: Types.ObjectId;
  cloudinaryPublicId: string;
  capturedAt: Date;
  fileSizeBytes: number;
}

const ScreenshotSchema = new Schema<IScreenshot>(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    device: { type: Schema.Types.ObjectId, ref: "Device", required: true },
    cloudinaryPublicId: { type: String, required: true },
    capturedAt: { type: Date, required: true },
    fileSizeBytes: { type: Number, required: true },
  },
  { timestamps: true }
);

ScreenshotSchema.index({ employee: 1, capturedAt: -1 });
// NOTE: deliberately NOT using a TTL index here (unlike the other models).
// A TTL index would delete the Mongo document automatically, but Cloudinary
// asset deletion needs cloudinaryPublicId from that same document - if TTL
// deletes it first, the remote image becomes an orphan that's never cleaned
// up. Cleanup is instead handled entirely by the scheduled job in
// cleanupScreenshots.ts, which deletes the Cloudinary asset and the DB
// record together, atomically enough for this purpose.

export const Screenshot = model<IScreenshot>("Screenshot", ScreenshotSchema);
