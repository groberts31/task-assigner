import type { Shift } from "./scheduleStorage";

export type ScheduleTemplateItem = {
  title: string;
  // 0..6 relative to week start (Sunday)
  dayOffset: number;
  startTime: string; // "08:00"
  endTime: string;   // "16:30"
};

export type ScheduleTemplate = {
  id: string;
  name: string;
  items: ScheduleTemplateItem[];
};

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function toIsoAtDay(weekStart: Date, dayOffset: number, hhmm: string) {
  const [hh, mm] = hhmm.split(":").map((x) => Number(x));
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d.toISOString();
}

// Align a date to the START of its week (Sunday 00:00 local)
export function alignToWeekStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return d;
}

// Build shifts for a given week for one or more employees.
// Each template item becomes a shift for EACH selected employee.
export function templateToShifts(
  template: ScheduleTemplate,
  weekStart: Date,
  employeeIds: string[]
): Shift[] {
  const createdAt = new Date().toISOString();

  const out: Shift[] = [];
  for (const empId of employeeIds) {
    for (const it of template.items) {
      const start = toIsoAtDay(weekStart, it.dayOffset, it.startTime);
      const end = toIsoAtDay(weekStart, it.dayOffset, it.endTime);

      out.push({
        id: makeId("shift"),
        employeeId: empId,
        title: it.title,
        start,
        end,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }
  return out;
}

// Starter templates (edit these later in UI if you want)
export const ScheduleTemplates: ScheduleTemplate[] = [
  {
    id: "tmpl_open_close",
    name: "Open + Close (Daily)",
    items: [
      { title: "Opening Shift", dayOffset: 1, startTime: "08:00", endTime: "12:00" },
      { title: "Closing Shift", dayOffset: 1, startTime: "12:00", endTime: "18:00" },
    ],
  },
  {
    id: "tmpl_full_week_9_5",
    name: "Full Week (9–5)",
    items: [
      { title: "Shift", dayOffset: 1, startTime: "09:00", endTime: "17:00" },
      { title: "Shift", dayOffset: 2, startTime: "09:00", endTime: "17:00" },
      { title: "Shift", dayOffset: 3, startTime: "09:00", endTime: "17:00" },
      { title: "Shift", dayOffset: 4, startTime: "09:00", endTime: "17:00" },
      { title: "Shift", dayOffset: 5, startTime: "09:00", endTime: "17:00" },
    ],
  },
  {
    id: "tmpl_weekend_heavy",
    name: "Weekend Heavy (Sat/Sun)",
    items: [
      { title: "Shift", dayOffset: 6, startTime: "09:00", endTime: "18:00" },
      { title: "Shift", dayOffset: 0, startTime: "09:00", endTime: "18:00" },
    ],
  },
];
