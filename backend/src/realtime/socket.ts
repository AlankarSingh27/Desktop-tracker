import { Server as IOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

let io: IOServer | null = null;

export function initSocket(httpServer: HTTPServer): IOServer {
  io = new IOServer(httpServer, {
    cors: { origin: env.corsOrigin, credentials: true },
  });

  // dashboard clients must present a valid admin JWT to join the live room
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing auth token"));
    try {
      jwt.verify(token, env.jwtAdminSecret);
      next();
    } catch {
      next(new Error("Invalid auth token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join("dashboard");
    socket.on("disconnect", () => {
      // no-op, room membership cleaned up automatically
    });
  });

  return io;
}

export function getIO(): IOServer | null {
  return io;
}
