import { Router } from "express";
import { adminLogin, adminMe } from "../controllers/adminAuthController";
import { adminAuth } from "../middleware/adminAuth";
import { authRateLimiter } from "../middleware/rateLimiter";

const router = Router();

/**
 * @openapi
 * /admin/auth/login:
 *   post:
 *     tags: [Admin Auth]
 *     summary: Log in to the admin dashboard
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 admin:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string }
 *                     email: { type: string }
 *                     role: { type: string, enum: [super_admin, hr, manager] }
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", authRateLimiter, adminLogin);

/**
 * @openapi
 * /admin/auth/me:
 *   get:
 *     tags: [Admin Auth]
 *     summary: Get the currently authenticated admin's profile
 *     security: [{ AdminBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Admin profile
 *       401:
 *         description: Unauthenticated
 */
router.get("/me", adminAuth, adminMe);

export default router;
