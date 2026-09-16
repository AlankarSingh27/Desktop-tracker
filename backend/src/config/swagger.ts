import swaggerJSDoc from "swagger-jsdoc";
import { env } from "./env";

const swaggerDefinition: swaggerJSDoc.OAS3Definition = {
  openapi: "3.0.3",
  info: {
    title: "Employee Activity Tracker API",
    version: "1.0.0",
    description:
      "API for a consent-based employee activity monitoring system on company-owned devices. " +
      "Tracks app/window usage, browser tab URLs, download events, idle time, and aggregated " +
      "keystroke/mouse COUNTS only. Raw keystroke content is never captured or transmitted.",
    contact: { name: "IT / HR Admin" },
  },
  servers: [
    { url: `http://localhost:${env.port}/api`, description: "Local dev server" },
  ],
  components: {
    securitySchemes: {
      AdminBearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT obtained from POST /api/admin/auth/login",
      },
      AgentBearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT obtained from POST /api/agent/enroll",
      },
    },
    schemas: {
      Employee: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          employeeCode: { type: "string" },
          department: { type: "string" },
          designation: { type: "string" },
          hireDate: { type: "string", format: "date-time" },
          consentSignedAt: { type: "string", format: "date-time", nullable: true },
          isActive: { type: "boolean" },
        },
      },
      Device: {
        type: "object",
        properties: {
          _id: { type: "string" },
          employee: { type: "string" },
          deviceId: { type: "string" },
          hostname: { type: "string" },
          os: { type: "string" },
          agentVersion: { type: "string" },
          lastSeenAt: { type: "string", format: "date-time", nullable: true },
          isActive: { type: "boolean" },
        },
      },
      ActivitySession: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["app", "browser_tab"] },
          appName: { type: "string" },
          windowTitle: { type: "string" },
          url: { type: "string", format: "uri" },
          domain: { type: "string" },
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time" },
          durationSec: { type: "number" },
        },
      },
      ActivityMetric: {
        type: "object",
        description: "Aggregated per-minute counts only - no raw key content.",
        properties: {
          bucketStart: { type: "string", format: "date-time" },
          keystrokeCount: { type: "integer" },
          mouseClickCount: { type: "integer" },
          mouseDistancePx: { type: "number" },
          activeSeconds: { type: "number" },
        },
      },
      DownloadEvent: {
        type: "object",
        properties: {
          filename: { type: "string" },
          fileSizeBytes: { type: "number" },
          sourceUrl: { type: "string", format: "uri" },
          sourceDomain: { type: "string" },
          mimeType: { type: "string" },
          downloadedAt: { type: "string", format: "date-time" },
        },
      },
      IdleLog: {
        type: "object",
        properties: {
          idleStart: { type: "string", format: "date-time" },
          idleEnd: { type: "string", format: "date-time" },
          durationSec: { type: "number" },
        },
      },
      ActivityBatch: {
        type: "object",
        properties: {
          sessions: { type: "array", items: { $ref: "#/components/schemas/ActivitySession" } },
          metrics: { type: "array", items: { $ref: "#/components/schemas/ActivityMetric" } },
          downloads: { type: "array", items: { $ref: "#/components/schemas/DownloadEvent" } },
          idleLogs: { type: "array", items: { $ref: "#/components/schemas/IdleLog" } },
        },
      },
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
      },
    },
  },
  security: [],
};

export const swaggerSpec = swaggerJSDoc({
  swaggerDefinition,
  // JSDoc @openapi comments live in the route files
  apis: ["./src/routes/*.ts", "./dist/routes/*.js"],
});
