import { Request, Response } from "express";
import { z } from "zod";
import { Employee } from "../models/Employee";
import { Device } from "../models/Device";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const createEmployeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  employeeCode: z.string().min(1),
  department: z.string().min(1),
  designation: z.string().optional(),
  hireDate: z.string().datetime(),
});

export const createEmployee = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createEmployeeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.errors.map((e) => e.message).join(", "), 422);
  }
  const employee = await Employee.create({
    ...parsed.data,
    hireDate: new Date(parsed.data.hireDate),
  });
  res.status(201).json({ employee });
});

// Marks that the employee has read & signed the monitoring policy.
// Enrollment of their device is blocked until this is set (see agentController).
export const signConsent = asyncHandler(async (req: Request, res: Response) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new AppError("Employee not found", 404);
  employee.consentSignedAt = new Date();
  await employee.save();
  res.json({ employee });
});

export const listEmployees = asyncHandler(async (req: Request, res: Response) => {
  const { department, isActive } = req.query;
  const filter: Record<string, any> = {};
  if (department) filter.department = department;
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const employees = await Employee.find(filter).sort({ name: 1 });
  const devices = await Device.find({ employee: { $in: employees.map((e) => e._id) } });
  const deviceByEmployee = new Map(devices.map((d) => [d.employee.toString(), d]));

  res.json({
    employees: employees.map((e) => ({
      ...e.toObject(),
      device: deviceByEmployee.get(e._id.toString()) || null,
    })),
  });
});

export const getEmployee = asyncHandler(async (req: Request, res: Response) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new AppError("Employee not found", 404);
  const device = await Device.findOne({ employee: employee._id });
  res.json({ employee, device });
});

export const deactivateEmployee = asyncHandler(async (req: Request, res: Response) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new AppError("Employee not found", 404);
  employee.isActive = false;
  await employee.save();
  await Device.updateMany({ employee: employee._id }, { isActive: false });
  res.json({ employee });
});
