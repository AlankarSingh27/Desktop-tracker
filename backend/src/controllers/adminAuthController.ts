import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AdminUser } from "../models/AdminUser";
import { env } from "../config/env";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { adminLoginSchema } from "../utils/validators";

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors.map((e) => e.message).join(", "), 422);
  }
  const { email, password } = parsed.data;

  const admin = await AdminUser.findOne({ email });
  if (!admin) throw new AppError("Invalid credentials", 401);

  const valid = await admin.comparePassword(password);
  if (!valid) throw new AppError("Invalid credentials", 401);

  const token = jwt.sign(
    { adminId: admin._id.toString(), role: admin.role },
    env.jwtAdminSecret,
    { expiresIn: env.jwtAdminExpiresIn }
  );

  res.json({
    token,
    admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
  });
});

export const adminMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.admin) throw new AppError("Unauthenticated", 401);
  const admin = await AdminUser.findById(req.admin.adminId).select("-passwordHash");
  if (!admin) throw new AppError("Admin not found", 404);
  res.json({ admin });
});
