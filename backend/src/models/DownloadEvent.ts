import { Schema, model, Document, Types } from "mongoose";
import { env } from "../config/env";

export interface IDownloadEvent extends Document {
  employee: Types.ObjectId;
  device: Types.ObjectId;
  filename: string;
  fileSizeBytes?: number;
  sourceUrl?: string;
  sourceDomain?: string;
  mimeType?: string;
  downloadedAt: Date;
}

const DownloadEventSchema = new Schema<IDownloadEvent>(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    device: { type: Schema.Types.ObjectId, ref: "Device", required: true },
    filename: { type: String, required: true },
    fileSizeBytes: { type: Number },
    sourceUrl: { type: String },
    sourceDomain: { type: String, index: true },
    mimeType: { type: String },
    downloadedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

DownloadEventSchema.index({ employee: 1, downloadedAt: -1 });
DownloadEventSchema.index({ downloadedAt: 1 }, { expireAfterSeconds: env.dataRetentionDays * 86400 });

export const DownloadEvent = model<IDownloadEvent>("DownloadEvent", DownloadEventSchema);
