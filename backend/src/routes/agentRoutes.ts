import { Router } from "express";
import { enrollDevice, ingestActivityBatch, agentHeartbeat } from "../controllers/agentController";
import { uploadScreenshot } from "../controllers/screenshotController";
import { agentAuth } from "../middleware/agentAuth";
import { screenshotUpload } from "../config/upload";

const router = Router();

/**
 * @openapi
 * /agent/enroll:
 *   post:
 *     tags: [Agent]
 *     summary: Enroll a desktop agent (first run on a company laptop)
 *     description: >
 *       Requires the enrollment secret distributed only to IT admins, and the
 *       employee must already have consentSignedAt set. Returns a long-lived
 *       agent JWT used for all subsequent agent calls.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [enrollmentSecret, employeeCode, hostname, os, agentVersion, deviceId]
 *             properties:
 *               enrollmentSecret: { type: string }
 *               employeeCode: { type: string }
 *               hostname: { type: string }
 *               os: { type: string }
 *               agentVersion: { type: string }
 *               deviceId: { type: string, description: "Hardware-derived fingerprint generated locally by the agent" }
 *     responses:
 *       200:
 *         description: Enrollment successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agentToken: { type: string }
 *                 employeeId: { type: string }
 *                 deviceMongoId: { type: string }
 *       401:
 *         description: Invalid enrollment secret
 *       403:
 *         description: Employee has not signed monitoring consent
 *       404:
 *         description: Employee not found
 */
router.post("/enroll", enrollDevice);

/**
 * @openapi
 * /agent/activity/batch:
 *   post:
 *     tags: [Agent]
 *     summary: Upload a batch of activity data collected since the last sync
 *     security: [{ AgentBearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActivityBatch'
 *     responses:
 *       202:
 *         description: Batch accepted (partial failures reported but do not fail the request)
 *       401:
 *         description: Unauthenticated agent
 *       403:
 *         description: Device not recognized or deactivated
 *       422:
 *         description: Validation error
 */
router.post("/activity/batch", agentAuth, ingestActivityBatch);

/**
 * @openapi
 * /agent/heartbeat:
 *   post:
 *     tags: [Agent]
 *     summary: Lightweight liveness ping from an enrolled agent
 *     security: [{ AgentBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Acknowledged
 */
router.post("/heartbeat", agentAuth, agentHeartbeat);

/**
 * @openapi
 * /agent/screenshot:
 *   post:
 *     tags: [Agent]
 *     summary: Upload a single periodic screenshot (multipart/form-data)
 *     security: [{ AgentBearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               screenshot: { type: string, format: binary }
 *               capturedAt: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Screenshot stored
 *       401:
 *         description: Unauthenticated agent
 *       403:
 *         description: Device not recognized or deactivated
 *       422:
 *         description: Missing file or invalid type
 */
router.post("/screenshot", agentAuth, screenshotUpload.single("screenshot"), uploadScreenshot);

export default router;
