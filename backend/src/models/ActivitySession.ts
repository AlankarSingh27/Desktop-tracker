import { Schema, model, Document, Types } from "mongoose";
import { env } from "../config/env";

/**
 * One record = one continuous period of focus on a single app/window/tab.
 * url/pageTitle are populated only when the source is the browser extension.
 * We NEVER store keystroke content here - see ActivityMetric for counts only.
 */
export interface IActivitySession extends Document {
  employee: Types.ObjectId;
  device: Types.ObjectId;
  category: "app" | "browser_tab";
  appName: string;
  windowTitle: string;
  url?: string; // only set for category === 'browser_tab'
  domain?: string;
  startTime: Date;
  endTime: Date;
  durationSec: number;
}

const ActivitySessionSchema = new Schema<IActivitySession>(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    device: { type: Schema.Types.ObjectId, ref: "Device", required: true },
    category: { type: String, enum: ["app", "browser_tab"], required: true },
    appName: { type: String, required: true },
    windowTitle: { type: String, default: "" },
    url: { type: String },
    domain: { type: String, index: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationSec: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

ActivitySessionSchema.index({ employee: 1, startTime: -1 });
ActivitySessionSchema.index({ employee: 1, appName: 1, startTime: -1 });
// TTL: MongoDB automatically deletes documents once startTime is older
// than DATA_RETENTION_DAYS - no cron job needed for this collection.
ActivitySessionSchema.index({ startTime: 1 }, { expireAfterSeconds: env.dataRetentionDays * 86400 });

export const ActivitySession = model<IActivitySession>("ActivitySession", ActivitySessionSchema);
