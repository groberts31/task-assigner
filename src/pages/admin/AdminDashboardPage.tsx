import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../state/auth";
import type { User } from "../../data/types";

type TabKey = "approvals" | "users" | "tasks" | "assign" | "sheets";

type TaskItem = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  defaultDurationMins?: number;
  createdBy: "system" | "user";
  createdAt: string;
};

type AssignmentLog = {
  id: string;
  createdAt: string;
  assignedBy: string;     // user.id
  employeeId: string;     // employee user.id
  taskIds: string[];
};

const LS_TASKS_KEY = "twe_tasks_v1";
const LS_ASSIGNMENTS_KEY = "twe_assignments_v1";
const LS_USERS_KEY_GUESS = "twe_users_v1"; // fallback only (your app may use a different key)

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function seedTasks(): TaskItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: uid("task"),
      title: "Open checklist + assign stations",
      description: "Confirm staffing plan, lane coverage, and team assignments for the shift.",
      category: "Operations",
      defaultDurationMins: 10,
      createdBy: "system",
      createdAt: now,
    },
    {
      id: uid("task"),
      title: "Inspect tunnel + safety walk",
      description: "Walk the line, check safety cones/signage, and confirm equipment is clear.",
      category: "Safety",
      defaultDurationMins: 15,
      createdBy: "system",
      createdAt: now,
    },
    {
      id: uid("task"),
      title: "Customer greeting focus",
      description: "Reinforce greeting, upsell script, and conversion goals for the hour.",
      category: "Sales",
      defaultDurationMins: 10,
      createdBy: "system",
      createdAt: now,
    },
  ];
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;

  const isAdmin = user.role === "admin";
  const isManager = user.role === "manager";
  const isPriv = isAdmin || isManager;

  if (!isPriv) return <Navigate to="/me" replace />;

  const [tab, setTab] = useState<TabKey>("tasks");

  // ---------------------------
  // USERS (for employee picker)
  // ---------------------------
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // We try to read from Storage if it exists (runtime),
    // otherwise fall back to a guessed localStorage key.
    let loaded: User[] = [];

    try {
      // @ts-ignore
      if (typeof Storage !== "undefined" && Storage?.getUsers) {
        // @ts-ignore
        loaded = Storage.getUsers();
      }
    } catch {
      // ignore
    }

    if (!loaded || loaded.length === 0) {
      loaded = safeJsonParse<User[]>(localStorage.getItem(LS_USERS_KEY_GUESS), []);
    }

    setUsers(Array.isArray(loaded) ? loaded : []);
  }, []);

  const visibleEmployees = useMemo(() => {
    const allEmps = users.filter((u) => u.role === "employee");
    if (isAdmin) return allEmps;

    // Manager: if createdBy exists, only show employees created by this manager.
    // If createdBy isn't used in your app yet, we gracefully fall back to "all employees"
    // so Assign doesn't look empty.
    const anyHasCreatedBy = allEmps.some((e: any) => !!e.createdBy);
    if (!anyHasCreatedBy) return allEmps;

    return allEmps.filter((e: any) => (e.createdBy || "") === user.id);
  }, [users, isAdmin, user.id]);

  // ---------------------------
  // TASKS
  // ---------------------------
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskMsg, setTaskMsg] = useState<string>("");

  const [taskForm, setTaskForm] = useState<{
    id: string | null;
    title: string;
    description: string;
    category: string;
    defaultDurationMins: string;
  }>({
    id: null,
    title: "",
    description: "",
    category: "",
    defaultDurationMins: "",
  });

  useEffect(() => {
    const loaded = safeJsonParse<TaskItem[]>(localStorage.getItem(LS_TASKS_KEY), []);
    if (loaded && loaded.length > 0) setTasks(loaded);
    else {
      const seeded = seedTasks();
      setTasks(seeded);
      localStorage.setItem(LS_TASKS_KEY, JSON.stringify(seeded));
    }
  }, []);

  useEffect(() => {
    // persist tasks
    localStorage.setItem(LS_TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const resetTaskForm = () => {
    setTaskForm({ id: null, title: "", description: "", category: "", defaultDurationMins: "" });
  };

  const saveTask = () => {
    setTaskMsg("");
    const title = taskForm.title.trim();
    if (!title) {
      setTaskMsg("Task title is required.");
      return;
    }

    const minsRaw = taskForm.defaultDurationMins.trim();
    const mins = minsRaw ? Number(minsRaw) : undefined;
    const minsOk = minsRaw
      ? typeof mins === "number" && Number.isFinite(mins) && mins >= 0
      : true;
    if (!minsOk) {
      setTaskMsg("Default duration must be a number (minutes).");
      return;
    }

    const payload: Omit<TaskItem, "id"> & { id?: string } = {
      title,
      description: taskForm.description.trim() || undefined,
      category: taskForm.category.trim() || undefined,
      defaultDurationMins: typeof mins === "number" ? mins : undefined,
      createdBy: "user",
      createdAt: new Date().toISOString(),
    };

    if (taskForm.id) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskForm.id ? { ...t, ...payload, id: t.id } : t))
      );
      setTaskMsg("Task updated.");
    } else {
      const next: TaskItem = { id: uid("task"), ...payload };
      setTasks((prev) => [next, ...prev]);
      setTaskMsg("Task added.");
    }

    resetTaskForm();
    // Small auto-clear so it doesn't hang around forever
    setTimeout(() => setTaskMsg(""), 1800);
  };

  const editTask = (t: TaskItem) => {
    setTaskMsg("");
    setTaskForm({
      id: t.id,
      title: t.title || "",
      description: t.description || "",
      category: t.category || "",
      defaultDurationMins: typeof t.defaultDurationMins === "number" ? String(t.defaultDurationMins) : "",
    });
  };

  const deleteTask = (id: string) => {
    setTaskMsg("");
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (taskForm.id === id) resetTaskForm();
    setTaskMsg("Task removed.");
    setTimeout(() => setTaskMsg(""), 1800);
  };

  // ---------------------------
  // ASSIGN
  // ---------------------------
  const [assignEmployeeId, setAssignEmployeeId] = useState<string>("");
  const [assignSelected, setAssignSelected] = useState<Record<string, boolean>>({});
  const [assignMsg, setAssignMsg] = useState<string>("");

  const [assignments, setAssignments] = useState<AssignmentLog[]>(() =>
    safeJsonParse<AssignmentLog[]>(localStorage.getItem(LS_ASSIGNMENTS_KEY), [])
  );

  useEffect(() => {
    localStorage.setItem(LS_ASSIGNMENTS_KEY, JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    // preselect first employee if none selected
    if (!assignEmployeeId && visibleEmployees.length > 0) {
      setAssignEmployeeId(visibleEmployees[0].id);
    }
  }, [assignEmployeeId, visibleEmployees]);

  const visibleTasks = useMemo(() => {
    // You can add filtering later; for now show all tasks.
    return tasks;
  }, [tasks]);

  const toggleTask = (id: string) => {
    setAssignSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const clearSelectedTasks = () => setAssignSelected({});

  const handleAssign = () => {
    setAssignMsg("");
    if (!assignEmployeeId) {
      setAssignMsg("Pick an employee first.");
      return;
    }

    const taskIds = Object.entries(assignSelected)
      .filter(([, on]) => !!on)
      .map(([id]) => id);

    if (taskIds.length === 0) {
      setAssignMsg("Select at least one task.");
      return;
    }

    const entry: AssignmentLog = {
      id: uid("asgn"),
      createdAt: new Date().toISOString(),
      assignedBy: user.id,
      employeeId: assignEmployeeId,
      taskIds,
    };

    setAssignments((prev) => [entry, ...prev]);
    clearSelectedTasks();
    setAssignMsg("Assigned!");
    setTimeout(() => setAssignMsg(""), 1800);
  };

  const removeAssignment = (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  const employeeById = (id: string) => users.find((u) => u.id === id);
  const taskById = (id: string) => tasks.find((t) => t.id === id);

  // Compact card styles (so the checkbox containers aren't huge)
  const compactRow: React.CSSProperties = {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    padding: "8px 10px",
    borderRadius: 10,
    marginBottom: 8,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.02)",
    cursor: "pointer",
    transition: "all 120ms ease",
  };
  const compactRowCheckedBorder = "1px solid rgba(90, 200, 250, 0.55)";
  const compactRowCheckedBg = "rgba(90, 200, 250, 0.10)";

  const smallCheckbox: React.CSSProperties = {
    width: 14,
    height: 14,
    marginTop: 2,
    flex: "0 0 auto",
  };

  const compactTitle: React.CSSProperties = {
    fontWeight: 800,
    fontSize: 13,
    lineHeight: 1.1,
    marginBottom: 3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const compactMetaRow: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    marginTop: 2,
  };

  const compactBadge: React.CSSProperties = {
    display: "inline-flex",
    padding: "1px 7px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
  };

  const compactHelper: React.CSSProperties = {
    fontSize: 11,
    opacity: 0.80,
  };

  // ---------------------------
  // UI
  // ---------------------------
  const title = useMemo(() => (isAdmin ? "Admin Dashboard" : "Manager Dashboard"), [isAdmin]);

  return (
    <div className="container" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>{title}</h2>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Tasks + Assign restored. (Approvals/Users/Sheets can be restored next.)
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn-ghost" onClick={() => navigate("/schedule")}>Schedule</button>
            <button className="btn-ghost" onClick={() => navigate("/me")}>My Tasks</button>
          </div>
        </div>

        <hr style={{ marginTop: 14, marginBottom: 14 }} />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className={tab === "approvals" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("approvals")}>
            Approvals
          </button>
          <button className={tab === "users" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("users")}>
            Users
          </button>
          <button className={tab === "tasks" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("tasks")}>
            Tasks
          </button>
          <button className={tab === "assign" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("assign")}>
            Assign
          </button>
          <button className={tab === "sheets" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("sheets")}>
            Sheets
          </button>
        </div>
      </div>

      {tab === "approvals" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Pending sign-ups</h3>
          <div className="muted" style={{ fontSize: 13 }}>(Next) Restore approvals table + approve/deny.</div>
        </div>
      )}

      {tab === "users" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>User management</h3>
          <div className="muted" style={{ fontSize: 13 }}>(Next) Restore users table + phone edit + role change + remove.</div>
        </div>
      )}

      {tab === "tasks" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{taskForm.id ? "Edit task" : "Add a new task"}</h3>

          <label>Title</label>
          <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />

          <label>Description</label>
          <textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />

          <label>Category</label>
          <input
            value={taskForm.category}
            onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
            placeholder="Operations, Inventory, Customer..."
          />

          <label>Default duration (minutes)</label>
          <input
            value={taskForm.defaultDurationMins}
            onChange={(e) => setTaskForm({ ...taskForm, defaultDurationMins: e.target.value })}
            placeholder="e.g., 30"
          />

          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={saveTask}>
              {taskForm.id ? "Save changes" : "Add task"}
            </button>
            <button className="btn-ghost" onClick={resetTaskForm}>
              Clear
            </button>
          </div>

          {taskMsg && (
            <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
              {taskMsg}
            </div>
          )}

          <hr style={{ marginTop: 16, marginBottom: 12 }} />

          <h3 style={{ marginTop: 0 }}>Task database</h3>

          {tasks.length === 0 ? (
            <div className="muted">No tasks yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Category</th>
                  <th>Duration</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td style={{ maxWidth: 520 }}>
                      <b>{t.title}</b>
                      {t.description && (
                        <div>
                          <small className="muted">{t.description}</small>
                        </div>
                      )}
                    </td>
                    <td>{t.category || "—"}</td>
                    <td>{typeof t.defaultDurationMins === "number" ? `${t.defaultDurationMins}m` : "—"}</td>
                    <td className="muted">{t.createdBy === "system" ? "System" : "Custom"}</td>
                    <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn-ghost" onClick={() => editTask(t)}>Edit</button>
                      <button className="btn-danger" onClick={() => deleteTask(t.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "assign" && (
        <div className="row">
          <div className="col">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Assign tasks</h3>

              <label>Employee</label>
              <select value={assignEmployeeId} onChange={(e) => setAssignEmployeeId(e.target.value)}>
                {visibleEmployees.map((e) => (
                  <option value={e.id} key={e.id}>
                    {e.name} ({e.email})
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button className="btn-primary" onClick={handleAssign}>
                  Assign Selected
                </button>
                <button className="btn-ghost" onClick={clearSelectedTasks}>
                  Clear Selection
                </button>
              </div>

              {assignMsg && (
                <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
                  {assignMsg}
                </div>
              )}

              <hr style={{ marginTop: 16, marginBottom: 12 }} />

              <div className="muted" style={{ fontSize: 13, padding: "6px 0" }}>
                Select tasks (click row to toggle). Selected rows highlight.
              </div>

              {visibleTasks.length === 0 ? (
                <div className="muted">No tasks found. Add tasks in the Tasks tab first.</div>
              ) : (
                <div>
                  {visibleTasks.map((t) => {
                    const checked = !!assignSelected[t.id];
                    const rowStyle: React.CSSProperties = {
                      ...compactRow,
                      border: checked ? compactRowCheckedBorder : compactRow.border,
                      background: checked ? compactRowCheckedBg : compactRow.background,
                    };

                    return (
                      <div
                        key={t.id}
                        style={rowStyle}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleTask(t.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") toggleTask(t.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTask(t.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={smallCheckbox}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={compactTitle} title={t.title}>
                            {t.title}
                          </div>

                          <div style={compactMetaRow}>
                            <span style={compactBadge}>{t.category || "Uncategorized"}</span>

                            {typeof t.defaultDurationMins === "number" && (
                              <span className="muted" style={compactHelper}>
                                {t.defaultDurationMins} min
                              </span>
                            )}

                            <span className="muted" style={compactHelper}>
                              {t.createdBy === "system" ? "System" : "Custom"}
                            </span>
                          </div>

                          {t.description && (
                            <div className="muted" style={{ fontSize: 11, marginTop: 6, lineHeight: 1.2 }}>
                              {t.description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="col">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Assignment log</h3>
              <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                Stored locally (key: {LS_ASSIGNMENTS_KEY}). You can remove entries to test the remove flow.
              </div>

              {assignments.length === 0 ? (
                <div className="muted">No assignments yet.</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Employee</th>
                      <th>Tasks</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => {
                      const emp = employeeById(a.employeeId);
                      const taskTitles = a.taskIds
                        .map((id) => taskById(id)?.title || "Unknown task")
                        .filter(Boolean);

                      return (
                        <tr key={a.id}>
                          <td className="muted">{new Date(a.createdAt).toLocaleString()}</td>
                          <td>{emp ? emp.name : a.employeeId}</td>
                          <td style={{ maxWidth: 520 }}>
                            {taskTitles.map((t: string, idx: number) => (
                              <div key={idx}>
                                <small>{t}</small>
                              </div>
                            ))}
                          </td>
                          <td>
                            <button className="btn-danger" onClick={() => removeAssignment(a.id)}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "sheets" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Sheets</h3>
          <div className="muted" style={{ fontSize: 13 }}>(Next) Restore employee sheets export.</div>
        </div>
      )}
    </div>
  );
}
