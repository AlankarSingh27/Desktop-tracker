import { Router } from "express";
import {
  createEmployee,
  signConsent,
  listEmployees,
  getEmployee,
  deactivateEmployee,
} from "../controllers/employeeController";
import { adminAuth, requireRole } from "../middleware/adminAuth";

const router = Router();
router.use(adminAuth);

/**
 * @openapi
 * /admin/employees:
 *   get:
 *     tags: [Employees]
 *     summary: List employees (optionally filtered)
 *     security: [{ AdminBearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: List of employees with their enrolled device (if any)
 *   post:
 *     tags: [Employees]
 *     summary: Create a new employee record
 *     security: [{ AdminBearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, employeeCode, department, hireDate]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               employeeCode: { type: string }
 *               department: { type: string }
 *               designation: { type: string }
 *               hireDate: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Employee created
 */
router.get("/", listEmployees);
router.post("/", requireRole("super_admin", "hr"), createEmployee);

/**
 * @openapi
 * /admin/employees/{id}:
 *   get:
 *     tags: [Employees]
 *     summary: Get a single employee with their device
 *     security: [{ AdminBearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Employee details }
 *       404: { description: Not found }
 */
router.get("/:id", getEmployee);

/**
 * @openapi
 * /admin/employees/{id}/consent:
 *   post:
 *     tags: [Employees]
 *     summary: Record that the employee has signed the monitoring consent/policy
 *     description: Device enrollment for this employee is blocked until this is called.
 *     security: [{ AdminBearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Consent recorded }
 *       404: { description: Not found }
 */
router.post("/:id/consent", requireRole("super_admin", "hr"), signConsent);

/**
 * @openapi
 * /admin/employees/{id}/deactivate:
 *   post:
 *     tags: [Employees]
 *     summary: Deactivate an employee and their devices (e.g. on offboarding)
 *     security: [{ AdminBearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Employee deactivated }
 *       404: { description: Not found }
 */
router.post("/:id/deactivate", requireRole("super_admin", "hr"), deactivateEmployee);

export default router;
