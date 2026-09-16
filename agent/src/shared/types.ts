export interface ActivitySessionPayload {
  category: "app" | "browser_tab";
  appName: string;
  windowTitle: string;
  url?: string;
  domain?: string;
  startTime: string; // ISO
  endTime: string; // ISO
  durationSec: number;
}

export interface ActivityMetricPayload {
  bucketStart: string; // ISO, start of 1-min bucket
  keystrokeCount: number;
  mouseClickCount: number;
  mouseDistancePx: number;
  activeSeconds: number;
}

export interface DownloadEventPayload {
  filename: string;
  fileSizeBytes?: number;
  sourceUrl?: string;
  sourceDomain?: string;
  mimeType?: string;
  downloadedAt: string; // ISO
}

export interface IdleLogPayload {
  idleStart: string; // ISO
  idleEnd: string; // ISO
  durationSec: number;
}

export interface ActivityBatch {
  sessions: ActivitySessionPayload[];
  metrics: ActivityMetricPayload[];
  downloads: DownloadEventPayload[];
  idleLogs: IdleLogPayload[];
}

export interface AgentConfig {
  serverBaseUrl: string;
  employeeCode: string;
  enrollmentSecret: string;
}

export interface AgentCredentials {
  agentToken: string;
  employeeId: string;
  deviceMongoId: string;
  deviceId: string;
}

// Message shape sent from the browser extension to the local agent bridge server
export interface ExtensionEvent {
  type: "tab_activity" | "download";
  payload: any;
}
