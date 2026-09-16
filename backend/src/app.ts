import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import apiRouter from "./routes/index";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

export function createApp(): Application {
  const app = express();

  // Helmet's default Cross-Origin-Resource-Policy is "same-origin", which
  // blocks the dashboard (a different origin) from loading screenshot
  // <img> tags served from this API. Since this is an internal admin tool
  // behind its own auth, cross-origin resource loading here is expected.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
  app.use(apiRateLimiter);

  // Swagger UI - interactive API docs + "try it out" console
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "Employee Tracker API Docs",
    })
  );
  // raw OpenAPI JSON, useful for generating client SDKs / Postman import
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  app.get("/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
