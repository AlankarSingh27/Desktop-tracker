import http from "http";
import { createApp } from "./app";
import { connectDB } from "./config/db";
import { initSocket } from "./realtime/socket";
import { env } from "./config/env";
import { startScreenshotCleanupJob } from "./utils/cleanupScreenshots";

async function main() {
  await connectDB();

  const app = createApp();
  const httpServer = http.createServer(app);

  initSocket(httpServer);
  startScreenshotCleanupJob();

  httpServer.listen(env.port, () => {
    console.log(`[server] Listening on http://localhost:${env.port}`);
    console.log(`[server] Swagger docs -> http://localhost:${env.port}/api-docs`);
    console.log(`[server] Data retention: ${env.dataRetentionDays} days (activity), ${env.screenshotRetentionDays} days (screenshots)`);
  });
}

main().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});
