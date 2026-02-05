import type { Assignment, Task, User } from "./types";

const KEYS = {
  users: "ta_users",
  tasks: "ta_tasks",
  assignments: "ta_assignments",
  session: "ta_session",
} as const;

function read<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const Storage = {
  // USERS
  getUsers(): User[] {
    return read<User[]>(KEYS.users, []);
  },
  saveUsers(users: User[]) {
    write(KEYS.users, users);
  },

  // TASKS
  getTasks(): Task[] {
    return read<Task[]>(KEYS.tasks, []);
  },
  saveTasks(tasks: Task[]) {
    write(KEYS.tasks, tasks);
  },

  // ASSIGNMENTS
  getAssignments(): Assignment[] {
    return read<Assignment[]>(KEYS.assignments, []);
  },
  saveAssignments(a: Assignment[]) {
    write(KEYS.assignments, a);
  },

  // SESSION
  getSession(): { userId: string } | null {
    return read<{ userId: string } | null>(KEYS.session, null);
  },
  setSession(session: { userId: string } | null) {
    if (!session) localStorage.removeItem(KEYS.session);
    else write(KEYS.session, session);
  },
};
