import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
import { getConfig, getCredentials, setCredentials } from "./localStore";
import { getDeviceId, getHostname, getOsLabel } from "./deviceId";
import { ActivityBatch } from "../shared/types";

const AGENT_VERSION = "1.0.0";

function client(): AxiosInstance {
  const config = getConfig();
  if (!config) throw new Error("Agent is not configured yet (missing serverBaseUrl)");
  return axios.create({ baseURL: `${config.serverBaseUrl}/api`, timeout: 15000 });
}

/**
 * Enrolls this device with the backend. Safe to call repeatedly - the
 * server treats a known deviceId as a re-enrollment (refreshes lastSeenAt).
 */
export async function enrollDevice(): Promise<void> {
  const config = getConfig();
  if (!config) throw new Error("Missing agent config - run setup first");

  const res = await client().post("/agent/enroll", {
    enrollmentSecret: config.enrollmentSecret,
    employeeCode: config.employeeCode,
    hostname: getHostname(),
    os: getOsLabel(),
    agentVersion: AGENT_VERSION,
    deviceId: getDeviceId(),
  });

  setCredentials({
    agentToken: res.data.agentToken,
    employeeId: res.data.employeeId,
    deviceMongoId: res.data.deviceMongoId,
    deviceId: getDeviceId(),
  });
}

export async function sendHeartbeat(): Promise<void> {
  const creds = getCredentials();
  if (!creds) return;
  await client().post(
    "/agent/heartbeat",
    {},
    { headers: { Authorization: `Bearer ${creds.agentToken}` } }
  );
}

/**
 * Uploads a batch. Throws on network/auth failure so the caller can
 * re-queue the data instead of losing it.
 */
export async function uploadBatch(batch: ActivityBatch): Promise<void> {
  const creds = getCredentials();
  if (!creds) throw new Error("Device not enrolled yet");

  await client().post("/agent/activity/batch", batch, {
    headers: { Authorization: `Bearer ${creds.agentToken}` },
  });
}

/**
 * Uploads one screenshot as multipart/form-data. Failures are swallowed by
 * the caller (screenshots are best-effort, not queued/retried like other
 * activity data - losing one snapshot occasionally isn't critical).
 */
export async function uploadScreenshot(jpegBuffer: Buffer, capturedAt: Date): Promise<void> {
  const creds = getCredentials();
  if (!creds) throw new Error("Device not enrolled yet");

  const form = new FormData();
  form.append("screenshot", jpegBuffer, {
    filename: `screenshot-${Date.now()}.jpg`,
    contentType: "image/jpeg",
  });
  form.append("capturedAt", capturedAt.toISOString());

  await client().post("/agent/screenshot", form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${creds.agentToken}`,
    },
    maxBodyLength: 10 * 1024 * 1024,
  });
}
