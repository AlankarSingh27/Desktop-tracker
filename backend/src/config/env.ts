import dotenv from "dotenv";
import type { StringValue } from "ms";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),

  mongoUri: required("MONGO_URI"),

  jwtAdminSecret: required("JWT_ADMIN_SECRET"),
  jwtAgentSecret: required("JWT_AGENT_SECRET"),
  jwtAdminExpiresIn: (process.env.JWT_ADMIN_EXPIRES_IN || "8h" )as StringValue,
  jwtAgentExpiresIn: (process.env.JWT_AGENT_EXPIRES_IN || "30d") as StringValue,

  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "300", 10),

  agentEnrollmentSecret: required("AGENT_ENROLLMENT_SECRET"),

  screenshotUploadDir: process.env.SCREENSHOT_UPLOAD_DIR || "./uploads/screenshots",
  screenshotRetentionDays: parseInt(process.env.SCREENSHOT_RETENTION_DAYS || "30", 10),

  // how long activity data (sessions, metrics, downloads, idle logs) is
  // kept before MongoDB TTL indexes auto-delete it
  dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || "3", 10),
};
