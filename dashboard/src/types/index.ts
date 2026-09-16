export interface Employee {
  _id: string;
  name: string;
  email: string;
  employeeCode: string;
  department: string;
  designation?: string;
  hireDate: string;
  consentSignedAt: string | null;
  isActive: boolean;
  device?: Device | null;
}

export interface Device {
  _id: string;
  deviceId: string;
  hostname: string;
  os: string;
  agentVersion: string;
  lastSeenAt: string | null;
  isActive: boolean;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "hr" | "manager";
}

export interface LiveDeviceStatus {
  employee: { _id: string; name: string; email: string; department: string };
  deviceId: string;
  hostname: string;
  lastSeenAt: string;
}

export interface EmployeeSummary {
  employee: { id: string; name: string; department: string };
  range: { from: string; to: string };
  topApps: { appName: string; totalSeconds: number }[];
  activity: {
    totalKeystrokes: number;
    totalClicks: number;
    totalActiveSeconds: number;
  };
  totalIdleSeconds: number;
  productivityScore: number | null;
  downloadsCount: number;
}

export interface ActivitySessionRecord {
  _id: string;
  category: "app" | "browser_tab";
  appName: string;
  windowTitle: string;
  url?: string;
  domain?: string;
  startTime: string;
  endTime: string;
  durationSec: number;
}

export interface LeaderboardEntry {
  employeeId: string;
  name: string;
  department: string;
  totalActiveSeconds: number;
  totalKeystrokes: number;
  totalIdleSeconds: number;
  productivityScore: number | null;
}

export interface DownloadRecord {
  _id: string;
  employee: { _id: string; name: string; department: string };
  filename: string;
  fileSizeBytes?: number;
  sourceUrl?: string;
  sourceDomain?: string;
  downloadedAt: string;
}

export interface ScreenshotRecord {
  id: string;
  capturedAt: string;
  fileSizeBytes: number;
}
