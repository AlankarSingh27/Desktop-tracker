import { Schema, model, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IAdminUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: "super_admin" | "hr" | "manager";
  comparePassword(candidate: string): Promise<boolean>;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["super_admin", "hr", "manager"], default: "manager" },
  },
  { timestamps: true }
);

AdminUserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const AdminUser = model<IAdminUser>("AdminUser", AdminUserSchema);
