import { Router } from "express";
import {
  getLiveStatus,
  getEmployeeSummary,
  getEmployeeTimeline,
  getEmployeeTrend,
  getEmployeeHourlyPattern,
  getProductivityLeaderboard,
  getDownloadFeed,
} from "../controllers/dashboardController";
import { listScreenshots, getScreenshotImage } from "../controllers/screenshotController";
import { adminAuth } from "../middleware/adminAuth";

const router = Router();
router.use(adminAuth);

/**
 * @openapi
 * /admin/dashboard/live:
 *   get:
 *     tags: [Dashboard]
 *     summary: Employees currently online (heartbeat within last 5 minutes)
 *     security: [{ AdminBearerAuth: [] }]
 *     responses:
 *       200: { description: Live status list }
 */
router.get("/live", getLiveStatus);

/**
 * @openapi
 * /admin/dashboard/employees/{id}/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Per-employee productivity summary for a date range
 *     security: [{ AdminBearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: Summary with top apps, keystroke/click totals, idle time, downloads }
 *       404: { description: Employee not found }
 */
router.get("/employees/:id/summary", getEmployeeSummary);

/**
 * @openapi
 * /admin/dashboard/employees/{id}/timeline:
 *   get:
 *     tags: [Dashboard]
 *     summary: Chronological app/browser-tab session timeline for one employee
 *     security: [{ AdminBearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: List of activity sessions, sorted by start time }
 */
router.get("/employees/:id/timeline", getEmployeeTimeline);

/**
 * @openapi
 * /admin/dashboard/employees/{id}/trend:
 *   get:
 *     tags: [Dashboard]
 *     summary: Day-by-day active time trend for the last N days
 *     security: [{ AdminBearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 7, maximum: 30 }
 *     responses:
 *       200: { description: Array of  date, activeSeconds, keystrokes  }
 */
router.get("/employees/:id/trend", getEmployeeTrend);

/**
 * @openapi
 * /admin/dashboard/employees/{id}/hourly:
 *   get:
 *     tags: [Dashboard]
 *     summary: Active seconds bucketed by hour-of-day (0-23)
 *     security: [{ AdminBearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: 24 entries, one per hour, with activeSeconds }
 */
router.get("/employees/:id/hourly", getEmployeeHourlyPattern);

/**
 * @openapi
 * /admin/dashboard/leaderboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Company-wide leaderboard by active seconds in a date range
 *     security: [{ AdminBearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: Top 50 employees by active time }
 */
router.get("/leaderboard", getProductivityLeaderboard);

/**
 * @openapi
 * /admin/dashboard/downloads:
 *   get:
 *     tags: [Dashboard]
 *     summary: Company-wide download activity feed
 *     security: [{ AdminBearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: domain
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of download events (max 500) }
 */
router.get("/downloads", getDownloadFeed);

/**
 * @openapi
 * /admin/dashboard/employees/{id}/screenshots:
 *   get:
 *     tags: [Dashboard]
 *     summary: List periodic screenshots for an employee in a date range
 *     security: [{ AdminBearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: List of screenshot metadata (max 300) }
 */
router.get("/employees/:id/screenshots", listScreenshots);

/**
 * @openapi
 * /admin/dashboard/screenshots/{id}/image:
 *   get:
 *     tags: [Dashboard]
 *     summary: Stream the actual image bytes for one screenshot
 *     security: [{ AdminBearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: JPEG/PNG image
 *         content:
 *           image/jpeg: {}
 *       404: { description: Not found }
 */
router.get("/screenshots/:id/image", getScreenshotImage);

export default router;
