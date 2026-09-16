import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Employee } from "../models/Employee";
import { Device } from "../models/Device";
import { ActivitySession } from "../models/ActivitySession";
import { ActivityMetric } from "../models/ActivityMetric";
import { DownloadEvent } from "../models/DownloadEvent";
import { IdleLog } from "../models/IdleLog";
import { env } from "../config/env";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { enrollDeviceSchema, activityBatchSchema } from "../utils/validators";
import { getIO } from "../realtime/socket";

/**
 * Enroll a device (first-run of the agent on a company laptop).
 * Requires the enrollment secret which only IT admins distribute during
 * device setup - this prevents random installs from registering.
 */
export const enrollDevice = asyncHandler(async (req: Request, res: Response) => {
  const parsed = enrollDeviceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors.map((e) => e.message).join(", "), 422);
  }
  const { enrollmentSecret, employeeCode, hostname, os, agentVersion, deviceId } = parsed.data;

  if (enrollmentSecret !== env.agentEnrollmentSecret) {
    throw new AppError("Invalid enrollment secret", 401);
  }

  const employee = await Employee.findOne({ employeeCode, isActive: true });
  if (!employee) {
    throw new AppError("Employee not found or inactive", 404);
  }
  if (!employee.consentSignedAt) {
    throw new AppError(
      "Employee has not signed the monitoring consent/policy yet - enrollment blocked",
      403
    );
  }

  let device = await Device.findOne({ deviceId });
  if (device) {
    device.lastSeenAt = new Date();
    device.agentVersion = agentVersion;
    device.isActive = true;
    await device.save();
  } else {
    device = await Device.create({
      employee: employee._id,
      deviceId,
      hostname,
      os,
      agentVersion,
      lastSeenAt: new Date(),
    });
  }

  const token = jwt.sign(
    { deviceId: device.deviceId, employeeId: employee._id.toString() },
    env.jwtAgentSecret,
    { expiresIn: env.jwtAgentExpiresIn }
  );

  res.status(200).json({
    agentToken: token,
    employeeId: employee._id,
    deviceMongoId: device._id,
  });
});

/**
 * Bulk ingest of activity data from an already-enrolled agent.
 * Agent batches locally and POSTs every few minutes to reduce load.
 */
export const ingestActivityBatch = asyncHandler(async (req: Request, res: Response) => {
  if (!req.agent) throw new AppError("Unauthenticated agent", 401);

  const parsed = activityBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors.map((e) => e.message).join(", "), 422);
  }
  const { sessions, metrics, downloads, idleLogs } = parsed.data;

  const device = await Device.findOne({ deviceId: req.agent.deviceId });
  if (!device || !device.isActive) {
    throw new AppError("Device not recognized or deactivated", 403);
  }
  device.lastSeenAt = new Date();
  await device.save();

  const employeeId = req.agent.employeeId;
  const deviceObjId = device._id;

  const results = await Promise.allSettled([
    sessions.length
      ? ActivitySession.insertMany(
          sessions.map((s) => ({
            employee: employeeId,
            device: deviceObjId,
            category: s.category,
            appName: s.appName,
            windowTitle: s.windowTitle,
            url: s.url,
            domain: s.domain,
            startTime: new Date(s.startTime),
            endTime: new Date(s.endTime),
            durationSec: s.durationSec,
          }))
        )
      : Promise.resolve([]),

    metrics.length
      ? ActivityMetric.bulkWrite(
          metrics.map((m) => ({
            updateOne: {
              filter: {
                employee: employeeId,
                device: deviceObjId,
                bucketStart: new Date(m.bucketStart),
              },
              update: {
                $set: {
                  keystrokeCount: m.keystrokeCount,
                  mouseClickCount: m.mouseClickCount,
                  mouseDistancePx: m.mouseDistancePx,
                  activeSeconds: m.activeSeconds,
                },
              },
              upsert: true,
            },
          }))
        )
      : Promise.resolve(null),

    downloads.length
      ? DownloadEvent.insertMany(
          downloads.map((d) => ({
            employee: employeeId,
            device: deviceObjId,
            filename: d.filename,
            fileSizeBytes: d.fileSizeBytes,
            sourceUrl: d.sourceUrl,
            sourceDomain: d.sourceDomain,
            mimeType: d.mimeType,
            downloadedAt: new Date(d.downloadedAt),
          }))
        )
      : Promise.resolve([]),

    idleLogs.length
      ? IdleLog.insertMany(
          idleLogs.map((i) => ({
            employee: employeeId,
            device: deviceObjId,
            idleStart: new Date(i.idleStart),
            idleEnd: new Date(i.idleEnd),
            durationSec: i.durationSec,
          }))
        )
      : Promise.resolve([]),
  ]);

  // notify live dashboard viewers this employee just reported activity
  getIO()?.to("dashboard").emit("agent:activity", {
    employeeId,
    deviceId: device.deviceId,
    at: new Date().toISOString(),
  });

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length) {
    console.error("[ingestActivityBatch] partial failure:", failed);
  }

  res.status(202).json({
    accepted: {
      sessions: sessions.length,
      metrics: metrics.length,
      downloads: downloads.length,
      idleLogs: idleLogs.length,
    },
    partialErrors: failed.length,
  });
});

export const agentHeartbeat = asyncHandler(async (req: Request, res: Response) => {
  if (!req.agent) throw new AppError("Unauthenticated agent", 401);
  await Device.updateOne({ deviceId: req.agent.deviceId }, { lastSeenAt: new Date() });
  res.status(200).json({ ok: true, serverTime: new Date().toISOString() });
});
