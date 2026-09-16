import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AdminAuthPayload {
  adminId: string;
  role: "super_admin" | "hr" | "manager";
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminAuthPayload;
    }
  }
}

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  // <img> tags can't set an Authorization header, so screenshot image URLs
  // pass the token as a query param instead - accepted here as a fallback,
  // never as the only path for JSON API calls (those always use the header).
  const queryToken = typeof req.query.token === "string" ? req.query.token : null;

  const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : queryToken;
  if (!token) {
    return res.status(401).json({ error: "Missing admin authorization token" });
  }
  try {
    const payload = jwt.verify(token, env.jwtAdminSecret) as AdminAuthPayload;
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired admin token" });
  }
}

export function requireRole(...roles: AdminAuthPayload["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
