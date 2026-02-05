export type Role = "admin" | "manager" | "employee";
export type UserStatus = "pending" | "active" | "disabled";

export type User = {
id: string;
  name: string;
  email: string;
  phone?: string;
  password: string; // MVP ONLY (not secure)
  role: Role;
  status: UserStatus;
  createdAt: string;
  createdBy?: string; // userId of creator (admin/manager) // ISO
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  defaultDurationMins?: number;
  createdBy: "system" | string; // userId
  createdAt: string;
  updatedAt?: string;
};

export type Assignment = {
  id: string;
  employeeId: string;
  taskId: string;
  dueDate?: string; // YYYY-MM-DD
  notes?: string;
  status: "assigned" | "done";
  createdAt: string;
};
