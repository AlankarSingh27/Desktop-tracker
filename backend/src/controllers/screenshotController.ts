import { Request, Response } from "express";
import { Types } from "mongoose";
import { Screenshot } from "../models/Screenshot";
import { Device } from "../models/Device";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { cloudinary } from "../config/cloudinary";

/**
 * Agent uploads one screenshot at a time (multipart/form-data, field name
 * "screenshot"). Multer holds the file in memory (see config/upload.ts) -
 * we stream that buffer straight to Cloudinary, under an "authenticated"
 * delivery type so the resulting asset is NOT publicly reachable by a
 * guessed URL, only via a signed URL we generate for a logged-in admin.
 */
export const uploadScreenshot = asyncHandler(async (req: Request, res: Response) => {
  if (!req.agent) throw new AppError("Unauthenticated agent", 401);
  if (!req.file) throw new AppError("Missing screenshot file", 422);

  const device = await Device.findOne({ deviceId: req.agent.deviceId });
  if (!device || !device.isActive) {
    throw new AppError("Device not recognized or deactivated", 403);
  }

  const capturedAt = req.body.capturedAt ? new Date(req.body.capturedAt) : new Date();

  const uploadResult = await new Promise<{ public_id: string; bytes: number }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        type: "authenticated", // not publicly accessible without a signed URL
        folder: "emp-tracker/screenshots",
      },
      (err, result) => {
        if (err || !result) return reject(err || new Error("Cloudinary upload failed"));
        resolve({ public_id: result.public_id, bytes: result.bytes });
      }
    );
    stream.end(req.file!.buffer);
  });

  const screenshot = await Screenshot.create({
    employee: req.agent.employeeId,
    device: device._id,
    cloudinaryPublicId: uploadResult.public_id,
    capturedAt,
    fileSizeBytes: uploadResult.bytes,
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
 * Redirects to a short-lived signed Cloudinary URL. Gated by adminAuth (see
 * route) so screenshots are never reachable without a valid dashboard
 * session - the underlying Cloudinary asset itself is also non-public
 * (type: "authenticated"), so even a leaked Cloudinary URL without a valid
 * signature won't load the image.
 */
export const getScreenshotImage = asyncHandler(async (req: Request, res: Response) => {
  const screenshot = await Screenshot.findById(req.params.id);
  if (!screenshot) throw new AppError("Screenshot not found", 404);

  const signedUrl = cloudinary.url(screenshot.cloudinaryPublicId, {
    resource_type: "image",
    type: "authenticated",
    sign_url: true,
    secure: true,
    expires_at: Math.floor(Date.now() / 1000) + 300, // link valid 5 minutes
  });

  res.redirect(302, signedUrl);
});
