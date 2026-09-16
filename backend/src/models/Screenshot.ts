import { Schema, model, Document, Types } from "mongoose";

/**
 * Periodic screenshots (not continuous screen recording). Only the file
 * path is stored here - actual image bytes live on disk under
 * UPLOAD_DIR/screenshots and are served through an authenticated route
 * (never a public static path) so images can't be accessed without an
 * admin session.
 */
export interface IScreenshot extends Document {
  employee: Types.ObjectId;
  device: Types.ObjectId;
  filePath: string;
  capturedAt: Date;
  fileSizeBytes: number;
}

const ScreenshotSchema = new Schema<IScreenshot>(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    device: { type: Schema.Types.ObjectId, ref: "Device", required: true },
    filePath: { type: String, required: true },
    capturedAt: { type: Date, required: true },
    fileSizeBytes: { type: Number, required: true },
  },
  { timestamps: true }
);

ScreenshotSchema.index({ employee: 1, capturedAt: -1 });

export const Screenshot = model<IScreenshot>("Screenshot", ScreenshotSchema);
