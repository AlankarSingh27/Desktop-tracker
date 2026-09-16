import { Schema, model, Document, Types } from "mongoose";
import { env } from "../config/env";

/**
 * IMPORTANT PRIVACY NOTE:
 * This stores only aggregated COUNTS bucketed per minute - never actual key
 * values, never typed text/content. This is intentional: capturing real
 * keystroke content is a keylogger and is not something this system does.
 */
export interface IActivityMetric extends Document {
  employee: Types.ObjectId;
  device: Types.ObjectId;
  bucketStart: Date; // start of the 1-minute bucket
  keystrokeCount: number;
  mouseClickCount: number;
  mouseDistancePx: number;
  activeSeconds: number; // seconds within this bucket the user was not idle
}

const ActivityMetricSchema = new Schema<IActivityMetric>(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    device: { type: Schema.Types.ObjectId, ref: "Device", required: true },
    bucketStart: { type: Date, required: true },
    keystrokeCount: { type: Number, default: 0, min: 0 },
    mouseClickCount: { type: Number, default: 0, min: 0 },
    mouseDistancePx: { type: Number, default: 0, min: 0 },
    activeSeconds: { type: Number, default: 0, min: 0, max: 60 },
  },
  { timestamps: true }
);

ActivityMetricSchema.index({ employee: 1, bucketStart: -1 });
// prevent duplicate buckets from retried/duplicate batch uploads
ActivityMetricSchema.index({ employee: 1, device: 1, bucketStart: 1 }, { unique: true });
// TTL cleanup
ActivityMetricSchema.index({ bucketStart: 1 }, { expireAfterSeconds: env.dataRetentionDays * 86400 });

export const ActivityMetric = model<IActivityMetric>("ActivityMetric", ActivityMetricSchema);
