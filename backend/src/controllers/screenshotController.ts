import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { Types } from "mongoose";
import { Screenshot } from "../models/Screenshot";
import { Device } from "../models/Device";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { env } from "../config/env";

/**
 * Agent uploads one screenshot at a time (multipart/form-data, field name
 * "screenshot"). Multer has already written the file to disk by the time
 * this handler runs - we just record its metadata.
 */
export const uploadScreenshot = asyncHandler(async (req: Request, res: Response) => {
  if (!req.agent) throw new AppError("Unauthenticated agent", 401);
  if (!req.file) throw new AppError("Missing screenshot file", 422);

  const device = await Device.findOne({ deviceId: req.agent.deviceId });
  if (!device || !device.isActive) {
    fs.unlink(req.file.path, () => {});
    throw new AppError("Device not recognized or deactivated", 403);
  }

  const capturedAt = req.body.capturedAt ? new Date(req.body.capturedAt) : new Date();

  const screenshot = await Screenshot.create({
    employee: req.agent.employeeId,
    device: device._id,
    filePath: req.file.filename, // store just the filename, join with configured dir on read
    capturedAt,
    fileSizeBytes: req.file.size,
  });

  res.status(201).json({ id: screenshot._id, capturedAt: screenshot.capturedAt });
});

export const listScreenshots = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = req.params.id;
  if (!Types.ObjectId.isValid(employeeId)) throw new AppError("Invalid employee id", 422);

  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 24 * 3600 * 1000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();

  const screenshots = await Screenshot.find({
    employee: employeeId,
    capturedAt: { $gte: from, $lte: to },
  })
    .sort({ capturedAt: -1 })
    .limit(300)
    .select("_id capturedAt fileSizeBytes");

  res.json({
    screenshots: screenshots.map((s) => ({
      id: s._id,
      capturedAt: s.capturedAt,
      fileSizeBytes: s.fileSizeBytes,
    })),
  });
});

/**
 * Streams the actual image bytes. Gated by adminAuth (see route) so
 * screenshots are never reachable without a valid dashboard session -
 * unlike a plain express.static mount, which would make them guessable
 * and publicly fetchable.
 */
export const getScreenshotImage = asyncHandler(async (req: Request, res: Response) => {
  const screenshot = await Screenshot.findById(req.params.id);
  if (!screenshot) throw new AppError("Screenshot not found", 404);

  const filePath = path.join(env.screenshotUploadDir, screenshot.filePath);
  if (!fs.existsSync(filePath)) throw new AppError("Screenshot file missing on disk", 404);

  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "private, max-age=3600");
  fs.createReadStream(filePath).pipe(res);
});
