import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import path from "path";
import { env } from "../config/env";

fs.mkdirSync(env.screenshotUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.screenshotUploadDir),
  filename: (req, file, cb) => {
    const unique = crypto.randomBytes(16).toString("hex");
    cb(null, `${Date.now()}-${unique}.jpg`);
  },
});

export const screenshotUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per screenshot
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "image/jpeg" && file.mimetype !== "image/png") {
      return cb(new Error("Only JPEG/PNG screenshots are accepted"));
    }
    cb(null, true);
  },
});
