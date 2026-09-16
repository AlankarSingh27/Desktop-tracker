import multer from "multer";

// memoryStorage: the file buffer is held in RAM only, then streamed to
// Cloudinary and discarded - never written to local disk, so it survives
// restarts/redeploys on platforms with ephemeral filesystems (e.g. Render).
export const screenshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per screenshot
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "image/jpeg" && file.mimetype !== "image/png") {
      return cb(new Error("Only JPEG/PNG screenshots are accepted"));
    }
    cb(null, true);
  },
});
