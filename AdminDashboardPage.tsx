import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../state/auth";
import { Storage } from "../../data/storage";
import type { User, Task, Assignment } from "../../data/types";
import { ViewAssignmentsPdfButton } from "../../components/ViewAssignmentsPdfButton";

/**
 * AdminDashboardPage.tsx
 * - Approve signups
 * - Manage tasks (system + custom)
 * - Assign tasks to employees
 * - Admin "My Assignment Sheet" shows ALL employees + Share PDF per employee
 *
 * Storage compatibility:
 * Some projects have Storage.getUsers() etc; some only have Storage.get(key, def) / set(key,val).
 * This file supports BOTH.
 */

const KEYS = {
  users: "ta_users",
  tasks: "ta_tasks",
  assignments: "ta_assignments",
};

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}

function getUsers(): User[] {
  const S: any = Storage as any;
  if (typeof S.getUsers === "function") return S.getUsers();
  if (typeof S.get === "function") return S.get(KEYS.users, []);
  return safeGet<User[]>(KEYS.users, []);
}

function saveUsers(users: User[]) {
  const S: any = Storage as any;
  if (typeof S.saveUsers === "function") return S.saveUsers(users);
  if (typeof S.set === "function") return S.set(KEYS.users, users);
  safeSet(KEYS.users, users);
}

function getTasks(): Task[] {
  const S: any = Storage as any;
  if (typeof S.getTasks === "function") return S.getTasks();
  if (typeof S.get === "function") return S.get(KEYS.tasks, []);
  return safeGet<Task[]>(KEYS.tasks, []);
}

function saveTasks(tasks: Task[]) {
  const S: any = Storage as any;
  if (typeof S.saveTasks === "function") return S.saveTasks(tasks);
  if (typeof S.set === "function") return S.set(KEYS.tasks, tasks);
  safeSet(KEYS.tasks, tasks);
}

function getAssignments(): Assignment[] {
  const S: any = Storage as any;
  if (typeof S.getAssignments === "function") return S.getAssignments();
  if (typeof S.get === "function") return S.get(KEYS.assignments, []);
  return safeGet<Assignment[]>(KEYS.assignments, []);
}

function saveAssignments(assignments: Assignment[]) {
  const S: any = Storage as any;
  if (typeof S.saveAssignments === "function") return S.saveAssignments(assignments);
  if (typeof S.set === "function") return S.set(KEYS.assignments, assignments);
  safeSet(KEYS.assignments, assignments);
}

export function AdminDashboardPage() {
  const { user } = useAuth();

  // Guard (admin only)
  if (!user) return <Navigate to="/login" replace />;
  if (user.status !== "active") return <Navigate to="/pending" replace />;
  if (user.role !== "admin") return <Navigate to="/me" replace />;

  // Tabs
  type Tab = "assign" | "all" | "tasks" | "approvals";
  const [tab, setTab] = useState<Tab>("assign");

  // Local refresh trigger (so we can re-read storage after mutations)
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  // Source data (re-read when tick changes)
  const users = useMemo(() => getUsers(), [tick]);
  const tasks = useMemo(() => getTasks(), [tick]);
  const assignments = useMemo(() => getAssignments(), [tick]);

  // Derived
  const employees = useMemo(() => {
    return users
      .filter((u) => u.role === "employee" && u.status === "active")
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [users]);

  const pendingUsers = useMemo(() => {
    return users
      .filter((u) => u.status === "pending")
      .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  }, [users]);

  // -------------------------
  // ASSIGN TAB STATE
  // -------------------------
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id ?? "");
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id ?? "");
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>("");

  // Ensure selections stay valid when data changes
  useMemo(() => {
    if (!employees.find((e) => e.id === selectedEmployeeId)) {
      setSelectedEmployeeId(employees[0]?.id ?? "");
    }
    if (!tasks.find((t) => t.id === selectedTaskId)) {
      setSelectedTaskId(tasks[0]?.id ?? "");
    }
  }, [employees, tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) || null;

  const currentAssignmentsForSelected = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return assignments
      .filter((a) => a.employeeId === selectedEmployeeId)
      .map((a) => {
        const t = tasks.find((x) => x.id === a.taskId);
        return {
          ...a,
          taskTitle: t?.title || "(task missing)",
          taskCategory: t?.category || "—",
          taskDescription: t?.description || "—",
        };
      })
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  }, [assignments, tasks, selectedEmployeeId]);

  // -------------------------
  // TASKS TAB STATE
  // -------------------------
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Helpers: detect system tasks (createdBy === "system")
  const isSystemTask = (t: Task) => (t as any).createdBy === "system";

  // -------------------------
  // ACTIONS
  // -------------------------
  function approveUser(userId: string) {
    const updated = users.map((u) => (u.id === userId ? { ...u, status: "active" as const } : u));
    saveUsers(updated);
    refresh();
  }

  function denyUser(userId: string) {
    const updated = users.filter((u) => u.id !== userId);
    saveUsers(updated);
    refresh();
  }

  function addAssignment() {
    if (!selectedEmployeeId || !selectedTaskId) return;

    const newA: Assignment = {
      id: uid("a"),
      employeeId: selectedEmployeeId,
      taskId: selectedTaskId,
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      notes: notes || "",
      status: "assigned",
      createdAt: new Date().toISOString(),
    };

    saveAssignments([...assignments, newA]);
    setNotes("");
    refresh();
  }

  function removeAssignment(assignmentId: string) {
    const updated = assignments.filter((a) => a.id !== assignmentId);
    saveAssignments(updated);
    refresh();
  }

  function setAssignmentStatus(assignmentId: string, status: Assignment["status"]) {
    const updated = assignments.map((a) => (a.id === assignmentId ? { ...a, status } : a));
    saveAssignments(updated);
    refresh();
  }

  function startEditTask(t: Task) {
    setEditingTaskId(t.id);
    setTaskTitle(t.title || "");
    setTaskCategory((t as any).category || "");
    setTaskDescription((t as any).description || "");
    setTab("tasks");
  }

  function cancelEditTask() {
    setEditingTaskId(null);
    setTaskTitle("");
    setTaskCategory("");
    setTaskDescription("");
  }

  function saveTask() {
    if (!taskTitle.trim()) return;

    // If editing existing
    if (editingTaskId) {
      const updated = tasks.map((t) =>
        t.id === editingTaskId
          ? ({
              ...t,
              title: taskTitle.trim(),
              category: taskCategory.trim() || "General",
              description: taskDescription.trim() || "",
            } as Task)
          : t
      );
      saveTasks(updated);
      cancelEditTask();
      refresh();
      return;
    }

    // Create new custom task
    const newTask: Task = {
      id: uid("t"),
      title: taskTitle.trim(),
      category: taskCategory.trim() || "General",
      description: taskDescription.trim() || "",
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    } as any;

    saveTasks([...tasks, newTask]);
    cancelEditTask();
    refresh();
  }

  function deleteTask(taskId: string) {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    if (isSystemTask(t)) return; // block system deletes

    // Also remove any assignments tied to this task
    const updatedTasks = tasks.filter((x) => x.id !== taskId);
    const updatedAssignments = assignments.filter((a) => a.taskId !== taskId);

    saveTasks(updatedTasks);
    saveAssignments(updatedAssignments);
    refresh();
  }

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="container">
      <div className="card">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>Admin Dashboard</h2>
            <div className="muted">
              Manage approvals, tasks, assignments, and share employee PDFs.
            </div>
          </div>

          <div className="no-print" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Link to="/print/all">
              <button className="btn-ghost">Print All</button>
            </Link>
          </div>
        </div>

        <hr />

        {/* Tab Buttons */}
        <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className={tab === "assign" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("assign")}>
            Assign
          </button>
          <button className={tab === "all" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("all")}>
            My Assignment Sheet (All Employees)
          </button>
          <button className={tab === "tasks" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("tasks")}>
            Tasks
          </button>
          <button className={tab === "approvals" ? "btn-primary" : "btn-ghost"} onClick={() => setTab("approvals")}>
            Approvals{" "}
            {pendingUsers.length > 0 && <span className="badge" style={{ marginLeft: 6 }}>{pendingUsers.length}</span>}
          </button>
        </div>

        <hr />

        {/* -----------------------------
            TAB: ASSIGN
           ----------------------------- */}
        {tab === "assign" && (
          <div className="row">
            {/* Left: Assign controls */}
            <div className="col">
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Assign Task</h3>

                <label>Employee</label>
                <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} — {e.email}
                    </option>
                  ))}
                </select>

                <label>Task</label>
                <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)}>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} {(t as any).category ? `— ${(t as any).category}` : ""}
                    </option>
                  ))}
                </select>

                <div className="row">
                  <div className="col">
                    <label>Due date</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                  <div className="col">
                    <label>Status</label>
                    <input value="assigned" disabled />
                  </div>
                </div>

                <label>Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Extra instructions..." />

                <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn-primary" onClick={addAssignment} disabled={!selectedEmployeeId || !selectedTaskId}>
                    Add Assignment
                  </button>
                  <button className="btn-ghost" onClick={() => setNotes("")}>
                    Clear Notes
                  </button>
                </div>

                {selectedEmployee && (
                  <div style={{ marginTop: 12 }} className="muted">
                    Assigning for <b>{selectedEmployee.name}</b>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Current assignments (for selected employee) */}
            <div className="col">
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Current Assignments</h3>

                {currentAssignmentsForSelected.length === 0 ? (
                  <div className="muted">No assignments yet for this employee.</div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Due</th>
                        <th>Notes</th>
                        <th>Status</th>
                        <th className="no-print">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentAssignmentsForSelected.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <b>{a.taskTitle}</b>
                            <div>
                              <small className="muted">
                                {a.taskCategory} {a.taskDescription !== "—" ? `• ${a.taskDescription}` : ""}
                              </small>
                            </div>
                          </td>
                          <td>{a.dueDate || "—"}</td>
                          <td>{a.notes || "—"}</td>
                          <td>
                            <select
                              className="no-print"
                              value={a.status}
                              onChange={(e) => setAssignmentStatus(a.id, e.target.value as any)}
                            >
                              <option value="assigned">assigned</option>
                              <option value="in_progress">in_progress</option>
                              <option value="done">done</option>
                            </select>
                            <div className="muted2" style={{ fontSize: 12 }}>
                              {a.status}
                            </div>
                          </td>
                          <td className="no-print">
                            <button className="btn-danger" onClick={() => removeAssignment(a.id)}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Share PDF only here (bottom-right under Current Assignments) */}
                <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                  <ShareAssignmentsPdfButton employeeId={selectedEmployeeId} className="btn-primary" />
                </div>

                <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                  Share PDF generates a PDF for the selected employee and opens the share sheet when supported.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -----------------------------
            TAB: ALL EMPLOYEES (Admin "My Sheet")
           ----------------------------- */}
        {tab === "all" && (
          <div>
            <h3 style={{ marginTop: 0 }}>All Employees — Assignment Sheets</h3>
            <div className="muted" style={{ marginBottom: 12 }}>
              Each employee’s assignments are listed with a Share PDF button.
            </div>

            {employees.length === 0 ? (
              <div className="card">No active employees found.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {employees.map((emp) => {
                  const empAssignments = assignments
                    .filter((a) => a.employeeId === emp.id)
                    .map((a) => {
                      const t = tasks.find((x) => x.id === a.taskId);
                      return {
                        ...a,
                        taskTitle: t?.title || "(task missing)",
                        taskCategory: (t as any)?.category || "—",
                        taskDescription: (t as any)?.description || "—",
                      };
                    })
                    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

                  return (
                    <div key={emp.id} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                        <div>
                          <h3 style={{ marginTop: 0, marginBottom: 6 }}>{emp.name}</h3>
                          <div className="muted" style={{ fontSize: 13 }}>{emp.email}</div>
                        </div>
                        <div className="badge">Employee</div>
                      </div>

                      <hr />

                      {empAssignments.length === 0 ? (
                        <div className="muted">No assignments for this employee.</div>
                      ) : (
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Task</th>
                              <th>Due</th>
                              <th>Notes</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {empAssignments.map((a) => (
                              <tr key={a.id}>
                                <td>
                                  <b>{a.taskTitle}</b>
                                  <div>
                                    <small className="muted">
                                      {a.taskCategory} {a.taskDescription !== "—" ? `• ${a.taskDescription}` : ""}
                                    </small>
                                  </div>
                                </td>
                                <td>{a.dueDate || "—"}</td>
                                <td>{a.notes || "—"}</td>
                                <td>{a.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {/* Share PDF button per employee (bottom-right) */}
                      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                        <ShareAssignmentsPdfButton employeeId={emp.id} className="btn-primary" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* -----------------------------
            TAB: TASKS
           ----------------------------- */}
        {tab === "tasks" && (
          <div className="row">
            {/* Left: Task editor */}
            <div className="col">
              <div className="card">
                <h3 style={{ marginTop: 0 }}>{editingTaskId ? "Edit Task" : "Add Task"}</h3>
                <div className="muted" style={{ marginBottom: 10 }}>
                  System tasks can’t be deleted. Custom tasks can be edited and removed.
                </div>

                <label>Title</label>
                <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task name..." />

                <label>Category</label>
                <input value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)} placeholder="Customer, Maintenance..." />

                <label>Description</label>
                <textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder="What to do, quality standard, etc..." />

                <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn-primary" onClick={saveTask} disabled={!taskTitle.trim()}>
                    {editingTaskId ? "Save Changes" : "Add Task"}
                  </button>
                  <button className="btn-ghost" onClick={cancelEditTask}>
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Task list */}
            <div className="col">
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Task Library</h3>

                {tasks.length === 0 ? (
                  <div className="muted">No tasks found.</div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Category</th>
                        <th>Type</th>
                        <th className="no-print">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <b>{t.title}</b>
                            {(t as any).description && (
                              <div>
                                <small className="muted">{(t as any).description}</small>
                              </div>
                            )}
                          </td>
                          <td>{(t as any).category || "—"}</td>
                          <td>{isSystemTask(t) ? "system" : "custom"}</td>
                          <td className="no-print">
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <button className="btn-ghost" onClick={() => startEditTask(t)}>
                                Edit
                              </button>
                              <button className="btn-danger" onClick={() => deleteTask(t.id)} disabled={isSystemTask(t)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -----------------------------
            TAB: APPROVALS
           ----------------------------- */}
        {tab === "approvals" && (
          <div>
            <h3 style={{ marginTop: 0 }}>Pending Approvals</h3>
            <div className="muted" style={{ marginBottom: 12 }}>
              Approve staff accounts to activate access.
            </div>

            {pendingUsers.length === 0 ? (
              <div className="card">No pending approvals.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th className="no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((u) => (
                    <tr key={u.id}>
                      <td><b>{u.name}</b></td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>{u.createdAt || "—"}</td>
                      <td className="no-print">
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button className="btn-primary" onClick={() => approveUser(u.id)}>
                            Approve
                          </button>
                          <button className="btn-danger" onClick={() => denyUser(u.id)}>
                            Deny
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
