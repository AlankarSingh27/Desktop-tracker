import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AgentAuthPayload {
  deviceId: string;
  employeeId: string;
}

declare global {
  namespace Express {
    interface Request {
      agent?: AgentAuthPayload;
    }
  }
}

export function agentAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing agent authorization token" });
  }
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, env.jwtAgentSecret) as AgentAuthPayload;
    req.agent = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired agent token" });
  }
}
