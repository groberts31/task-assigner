export type Shift = {
  id: string;
  employeeId: string;
  title: string;
  start: string;     // ISO
  end: string;       // ISO
  location?: string; // optional
  notes?: string;    // optional
  createdAt: string; // ISO
  updatedAt?: string; // ISO
};

const KEY = "task_assigner_schedule_shifts_v1";

function read(): Shift[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Shift[];
  } catch {
    return [];
  }
}

function writeAll(all: Shift[]) {
  localStorage.setItem(KEY, JSON.stringify(all));
}

export const ScheduleStorage = {
  getAll(): Shift[] {
    return read();
  },

  setAll(next: Shift[]) {
    writeAll(next);
  },

  add(shift: Shift) {
    const all = read();
    writeAll([shift, ...all]);
  },

  update(next: Shift) {
    const all = read();
    const updated = all.map((s) => (s.id === next.id ? next : s));
    writeAll(updated);
  },

  remove(id: string) {
    const all = read();
    writeAll(all.filter((s) => s.id !== id));
  },

  clear() {
    localStorage.removeItem(KEY);
  },
};
