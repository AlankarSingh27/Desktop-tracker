import { Router } from "express";
import agentRoutes from "./agentRoutes";
import adminAuthRoutes from "./adminAuthRoutes";
import employeeRoutes from "./employeeRoutes";
import dashboardRoutes from "./dashboardRoutes";

const router = Router();

router.use("/agent", agentRoutes);
router.use("/admin/auth", adminAuthRoutes);
router.use("/admin/employees", employeeRoutes);
router.use("/admin/dashboard", dashboardRoutes);

export default router;
