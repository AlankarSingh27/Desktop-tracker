import Store from "electron-store";
import { AgentConfig, AgentCredentials, ActivityBatch } from "../shared/types";

interface StoreSchema {
  config: AgentConfig | null;
  credentials: AgentCredentials | null;
  // buffered data not yet successfully uploaded (offline resilience)
  pendingQueue: ActivityBatch;
}

const defaults: StoreSchema = {
  config: null,
  credentials: null,
  pendingQueue: { sessions: [], metrics: [], downloads: [], idleLogs: [] },
};

// electron-store persists to disk under the OS-appropriate app data folder,
// e.g. %APPDATA%/emp-tracker-agent/config.json on Windows
export const store = new Store<StoreSchema>({
  name: "agent-store",
  defaults,
  // encrypts the file at rest so the agent token/config isn't plain text
  encryptionKey: "replace-with-a-real-machine-derived-key-in-production",
});

export function getConfig(): AgentConfig | null {
  return store.get("config");
}

export function setConfig(config: AgentConfig): void {
  store.set("config", config);
}

export function getCredentials(): AgentCredentials | null {
  return store.get("credentials");
}

export function setCredentials(creds: AgentCredentials): void {
  store.set("credentials", creds);
}

export function enqueue(batch: Partial<ActivityBatch>): void {
  const current = store.get("pendingQueue");
  store.set("pendingQueue", {
    sessions: [...current.sessions, ...(batch.sessions || [])],
    metrics: [...current.metrics, ...(batch.metrics || [])],
    downloads: [...current.downloads, ...(batch.downloads || [])],
    idleLogs: [...current.idleLogs, ...(batch.idleLogs || [])],
  });
}

export function drainQueue(): ActivityBatch {
  const current = store.get("pendingQueue");
  store.set("pendingQueue", defaults.pendingQueue);
  return current;
}

export function requeue(batch: ActivityBatch): void {
  // put failed-to-upload data back at the front so it's retried next cycle
  enqueue(batch);
}

export function queueSize(): number {
  const q = store.get("pendingQueue");
  return q.sessions.length + q.metrics.length + q.downloads.length + q.idleLogs.length;
}
