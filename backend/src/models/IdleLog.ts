import { Schema, model, Document, Types } from "mongoose";
import { env } from "../config/env";

export interface IIdleLog extends Document {
  employee: Types.ObjectId;
  device: Types.ObjectId;
  idleStart: Date;
  idleEnd: Date;
  durationSec: number;
}

const IdleLogSchema = new Schema<IIdleLog>(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    device: { type: Schema.Types.ObjectId, ref: "Device", required: true },
    idleStart: { type: Date, required: true },
    idleEnd: { type: Date, required: true },
    durationSec: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

IdleLogSchema.index({ employee: 1, idleStart: -1 });
IdleLogSchema.index({ idleStart: 1 }, { expireAfterSeconds: env.dataRetentionDays * 86400 });

export const IdleLog = model<IIdleLog>("IdleLog", IdleLogSchema);
