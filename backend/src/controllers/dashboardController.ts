import { Request, Response } from "express";
import { Types } from "mongoose";
import { ActivitySession } from "../models/ActivitySession";
import { ActivityMetric } from "../models/ActivityMetric";
import { DownloadEvent } from "../models/DownloadEvent";
import { IdleLog } from "../models/IdleLog";
import { Device } from "../models/Device";
import { Employee } from "../models/Employee";
import { asyncHandler, AppError } from "../middleware/errorHandler";

function parseRange(req: Request) {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 24 * 3600 * 1000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    throw new AppError("Invalid from/to date", 422);
  }
  return { from, to };
}

/** Employees currently considered "online" (agent heartbeat within last 5 min) */
export const getLiveStatus = asyncHandler(async (req: Request, res: Response) => {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const devices = await Device.find({ lastSeenAt: { $gte: cutoff }, isActive: true }).populate(
    "employee",
    "name email department"
  );
  res.json({
    onlineCount: devices.length,
    devices: devices.map((d) => ({
      employee: d.employee,
      deviceId: d.deviceId,
      hostname: d.hostname,
      lastSeenAt: d.lastSeenAt,
    })),
  });
});

/** Per-employee summary: active time, top apps, keystroke/mouse totals, idle time */
export const getEmployeeSummary = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = req.params.id;
  if (!Types.ObjectId.isValid(employeeId)) throw new AppError("Invalid employee id", 422);

  const employee = await Employee.findById(employeeId);
  if (!employee) throw new AppError("Employee not found", 404);

  const { from, to } = parseRange(req);
  const empObjId = new Types.ObjectId(employeeId);

  const [topApps, metricsAgg, idleAgg, downloadsCount] = await Promise.all([
    ActivitySession.aggregate([
      { $match: { employee: empObjId, startTime: { $gte: from, $lte: to } } },
      { $group: { _id: "$appName", totalSeconds: { $sum: "$durationSec" } } },
      { $sort: { totalSeconds: -1 } },
      { $limit: 10 },
    ]),
    ActivityMetric.aggregate([
      { $match: { employee: empObjId, bucketStart: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: null,
          totalKeystrokes: { $sum: "$keystrokeCount" },
          totalClicks: { $sum: "$mouseClickCount" },
          totalActiveSeconds: { $sum: "$activeSeconds" },
        },
      },
    ]),
    IdleLog.aggregate([
      { $match: { employee: empObjId, idleStart: { $gte: from, $lte: to } } },
      { $group: { _id: null, totalIdleSeconds: { $sum: "$durationSec" } } },
    ]),
    DownloadEvent.countDocuments({ employee: empObjId, downloadedAt: { $gte: from, $lte: to } }),
  ]);

  const activity = metricsAgg[0] || { totalKeystrokes: 0, totalClicks: 0, totalActiveSeconds: 0 };
  const totalIdleSeconds = idleAgg[0]?.totalIdleSeconds || 0;

  // simple productivity score: active time as a % of (active + idle) time.
  // Doesn't count time the agent wasn't running at all (e.g. laptop off) -
  // only compares active vs measured-idle within tracked periods.
  const trackedSeconds = activity.totalActiveSeconds + totalIdleSeconds;
  const productivityScore =
    trackedSeconds > 0 ? Math.round((activity.totalActiveSeconds / trackedSeconds) * 100) : null;

  res.json({
    employee: { id: employee._id, name: employee.name, department: employee.department },
    range: { from, to },
    topApps: topApps.map((a) => ({ appName: a._id, totalSeconds: a.totalSeconds })),
    activity,
    totalIdleSeconds,
    productivityScore,
    downloadsCount,
  });
});

/** Day-by-day active seconds for the last N days (for a trend line chart) */
export const getEmployeeTrend = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = req.params.id;
  if (!Types.ObjectId.isValid(employeeId)) throw new AppError("Invalid employee id", 422);

  const days = Math.min(30, parseInt(String(req.query.days || "7"), 10));
  const from = new Date(Date.now() - days * 24 * 3600 * 1000);
  const empObjId = new Types.ObjectId(employeeId);

  const rows = await ActivityMetric.aggregate([
    { $match: { employee: empObjId, bucketStart: { $gte: from } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$bucketStart" } },
        activeSeconds: { $sum: "$activeSeconds" },
        keystrokes: { $sum: "$keystrokeCount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    days,
    trend: rows.map((r) => ({
      date: r._id,
      activeSeconds: r.activeSeconds,
      keystrokes: r.keystrokes,
    })),
  });
});

/** Active seconds bucketed by hour-of-day (0-23), to see peak activity hours */
export const getEmployeeHourlyPattern = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = req.params.id;
  if (!Types.ObjectId.isValid(employeeId)) throw new AppError("Invalid employee id", 422);
  const { from, to } = parseRange(req);
  const empObjId = new Types.ObjectId(employeeId);

  const rows = await ActivityMetric.aggregate([
    { $match: { employee: empObjId, bucketStart: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: { $hour: "$bucketStart" },
        activeSeconds: { $sum: "$activeSeconds" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // fill in every hour 0-23 even if no data, so the chart axis is complete
  const byHour = new Map(rows.map((r) => [r._id, r.activeSeconds]));
  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    activeSeconds: byHour.get(hour) || 0,
  }));

  res.json({ range: { from, to }, hourly });
});

/** Timeline of app/window sessions for one employee (for a detail view / gantt-style chart) */
export const getEmployeeTimeline = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = req.params.id;
  if (!Types.ObjectId.isValid(employeeId)) throw new AppError("Invalid employee id", 422);
  const { from, to } = parseRange(req);

  const sessions = await ActivitySession.find({
    employee: employeeId,
    startTime: { $gte: from, $lte: to },
  })
    .sort({ startTime: 1 })
    .limit(2000);

  res.json({ sessions });
});

/** Company-wide leaderboard: most active employees by active seconds in range */
export const getProductivityLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = parseRange(req);

  const leaderboard = await ActivityMetric.aggregate([
    { $match: { bucketStart: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: "$employee",
        totalActiveSeconds: { $sum: "$activeSeconds" },
        totalKeystrokes: { $sum: "$keystrokeCount" },
      },
    },
    { $sort: { totalActiveSeconds: -1 } },
    { $limit: 50 },
    {
      $lookup: {
        from: "employees",
        localField: "_id",
        foreignField: "_id",
        as: "employee",
      },
    },
    { $unwind: "$employee" },
    {
      $lookup: {
        from: "idlelogs",
        let: { empId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$employee", "$$empId"] }, idleStart: { $gte: from, $lte: to } } },
          { $group: { _id: null, totalIdleSeconds: { $sum: "$durationSec" } } },
        ],
        as: "idle",
      },
    },
    {
      $project: {
        _id: 0,
        employeeId: "$employee._id",
        name: "$employee.name",
        department: "$employee.department",
        totalActiveSeconds: 1,
        totalKeystrokes: 1,
        totalIdleSeconds: { $ifNull: [{ $arrayElemAt: ["$idle.totalIdleSeconds", 0] }, 0] },
      },
    },
  ]);

  const withScore = leaderboard.map((e) => {
    const tracked = e.totalActiveSeconds + e.totalIdleSeconds;
    return {
      ...e,
      productivityScore: tracked > 0 ? Math.round((e.totalActiveSeconds / tracked) * 100) : null,
    };
  });

  res.json({ range: { from, to }, leaderboard: withScore });
});

/** Company-wide download activity feed, filterable by domain */
export const getDownloadFeed = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = parseRange(req);
  const filter: Record<string, any> = { downloadedAt: { $gte: from, $lte: to } };
  if (req.query.domain) filter.sourceDomain = req.query.domain;

  const downloads = await DownloadEvent.find(filter)
    .populate("employee", "name department")
    .sort({ downloadedAt: -1 })
    .limit(500);

  res.json({ downloads });
});
