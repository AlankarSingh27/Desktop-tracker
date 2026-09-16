import { machineIdSync } from "node-machine-id";
import os from "os";
import crypto from "crypto";

/**
 * Produces a stable, unique-per-machine ID that doesn't change across
 * agent reinstalls, so the backend recognizes returning devices.
 * Falls back to a hash of hostname+platform if node-machine-id fails
 * (e.g. on restricted permission environments).
 */
export function getDeviceId(): string {
  try {
    return machineIdSync(true); // true = hashed, not raw hardware ID
  } catch {
    const fallback = `${os.hostname()}-${os.platform()}-${os.arch()}`;
    return crypto.createHash("sha256").update(fallback).digest("hex");
  }
}

export function getHostname(): string {
  return os.hostname();
}

export function getOsLabel(): string {
  return `${os.platform()} ${os.release()}`;
}
