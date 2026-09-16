import bcrypt from "bcryptjs";
import { connectDB } from "../config/db";
import { AdminUser } from "../models/AdminUser";
import mongoose from "mongoose";

async function seed() {
  await connectDB();

  const email = process.env.SEED_ADMIN_EMAIL || "admin@company.com";
  const password = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";

  const existing = await AdminUser.findOne({ email });
  if (existing) {
    console.log(`[seed] Admin already exists: ${email}`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    await AdminUser.create({
      name: "Super Admin",
      email,
      passwordHash,
      role: "super_admin",
    });
    console.log(`[seed] Created super_admin -> email: ${email} password: ${password}`);
    console.log("[seed] Change this password after first login.");
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
