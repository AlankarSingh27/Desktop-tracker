import { Schema, model, Document, Types } from "mongoose";

export interface IEmployee extends Document {
  name: string;
  email: string;
  employeeCode: string;
  department: string;
  designation?: string;
  hireDate: Date;
  consentSignedAt: Date | null; // must be set before monitoring is considered compliant
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    employeeCode: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    designation: { type: String },
    hireDate: { type: Date, required: true },
    consentSignedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

EmployeeSchema.index({ department: 1 });

export const Employee = model<IEmployee>("Employee", EmployeeSchema);
