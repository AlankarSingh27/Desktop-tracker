import { api } from "./client";
import {
  Employee,
  AdminProfile,
  LiveDeviceStatus,
  EmployeeSummary,
  ActivitySessionRecord,
  LeaderboardEntry,
  DownloadRecord,
  ScreenshotRecord,
} from "../types";

export async function login(email: string, password: string) {
  const res = await api.post<{ token: string; admin: AdminProfile }>("/admin/auth/login", {
    email,
    password,
  });
  return res.data;
}

export async function fetchMe() {
  const res = await api.get<{ admin: AdminProfile }>("/admin/auth/me");
  return res.data.admin;
}

export async function listEmployees(params?: { department?: string; isActive?: boolean }) {
  const res = await api.get<{ employees: Employee[] }>("/admin/employees", { params });
  return res.data.employees;
}

export async function createEmployee(payload: {
  name: string;
  email: string;
  employeeCode: string;
  department: string;
  designation?: string;
  hireDate: string;
}) {
  const res = await api.post<{ employee: Employee }>("/admin/employees", payload);
  return res.data.employee;
}

export async function signConsent(employeeId: string) {
  const res = await api.post<{ employee: Employee }>(`/admin/employees/${employeeId}/consent`);
  return res.data.employee;
}

export async function deactivateEmployee(employeeId: string) {
  const res = await api.post<{ employee: Employee }>(`/admin/employees/${employeeId}/deactivate`);
  return res.data.employee;
}

export async function getLiveStatus() {
  const res = await api.get<{ onlineCount: number; devices: LiveDeviceStatus[] }>(
    "/admin/dashboard/live"
  );
  return res.data;
}

export async function getEmployeeSummary(employeeId: string, from?: string, to?: string) {
  const res = await api.get<EmployeeSummary>(`/admin/dashboard/employees/${employeeId}/summary`, {
    params: { from, to },
  });
  return res.data;
}

export async function getEmployeeTimeline(employeeId: string, from?: string, to?: string) {
  const res = await api.get<{ sessions: ActivitySessionRecord[] }>(
    `/admin/dashboard/employees/${employeeId}/timeline`,
    { params: { from, to } }
  );
  return res.data.sessions;
}

export async function getEmployeeTrend(employeeId: string, days = 7) {
  const res = await api.get<{ days: number; trend: { date: string; activeSeconds: number; keystrokes: number }[] }>(
    `/admin/dashboard/employees/${employeeId}/trend`,
    { params: { days } }
  );
  return res.data;
}

export async function getEmployeeHourlyPattern(employeeId: string, from?: string, to?: string) {
  const res = await api.get<{ hourly: { hour: number; activeSeconds: number }[] }>(
    `/admin/dashboard/employees/${employeeId}/hourly`,
    { params: { from, to } }
  );
  return res.data;
}

export async function getLeaderboard(from?: string, to?: string) {
  const res = await api.get<{ leaderboard: LeaderboardEntry[] }>("/admin/dashboard/leaderboard", {
    params: { from, to },
  });
  return res.data.leaderboard;
}

export async function getDownloadFeed(from?: string, to?: string, domain?: string) {
  const res = await api.get<{ downloads: DownloadRecord[] }>("/admin/dashboard/downloads", {
    params: { from, to, domain },
  });
  return res.data.downloads;
}

export async function getScreenshots(employeeId: string, from?: string, to?: string) {
  const res = await api.get<{ screenshots: ScreenshotRecord[] }>(
    `/admin/dashboard/employees/${employeeId}/screenshots`,
    { params: { from, to } }
  );
  return res.data.screenshots;
}

export function screenshotImageUrl(screenshotId: string): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem("admin_token");
  // token passed as query param since <img> tags can't set Authorization
  // headers - the backend still validates it via adminAuth
  return `${base}/admin/dashboard/screenshots/${screenshotId}/image?token=${token}`;
}
