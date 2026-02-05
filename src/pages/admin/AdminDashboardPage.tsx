import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../state/auth";
import { Storage } from "../../data/storage";
import type { Task, User } from "../../data/types";
type TabKey = "approvals" | "users" | "tasks" | "assign" | "sheets";
type AddEmpForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
};
type UserEdit = {
  name: string;
  email: string;
  phone: string;
  role: User["role"];
  status: User["status"];
};
export function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) return <Navigate to="/login" replace />;
  const isAdmin = user.role === "admin";
  const isManager = user.role === "manager";
  const isPriv = isAdmin || isManager;
  if (!isPriv) return <Navigate to="/me" replace />;
  const [tab, setTab] = useState<TabKey>("users");
  
  // APPROVALS_RESTORED_V1
  // (Approvals helpers inserted to match the Approvals JSX below)
  const safeUser = user as NonNullable<typeof user>;

  const [users, setUsers] = useState<User[]>(() => Storage.getUsers());
  const [approvalsMsg, setApprovalsMsg] = useState<string>("");

  const reloadUsers = () => {
    setUsers(Storage.getUsers());
  };

  // Detect statuses from your union by using string literals already used elsewhere in app.
  // If your app uses different status strings, just adjust these 3 constants.
  const APPROVAL_PENDING = "pending" as User["status"];
  const APPROVAL_APPROVED = "approved" as User["status"];
  const APPROVAL_REJECTED = "rejected" as User["status"];

  const pendingUsers = useMemo(() => {
    const all = users.filter((u) => u.status === APPROVAL_PENDING);
    if (isAdmin) return all;
    // Managers only see pending employees they created
    return all.filter((u) => (u.createdBy || "") === safeUser.id);
  }, [users, isAdmin, safeUser.id]);

  const approveUser = (id: string) => {
    setUsers((prev) => {
      const nextUsers = prev.map((u) => (u.id === id ? { ...u, status: APPROVAL_APPROVED } : u));
      Storage.saveUsers(nextUsers);
      return nextUsers;
    });
    setApprovalsMsg("✅ Approved.");
    setTimeout(() => setApprovalsMsg(""), 1600);
  };

  const rejectUser = (id: string) => {
    setUsers((prev) => {
      const nextUsers = prev.map((u) => (u.id === id ? { ...u, status: APPROVAL_REJECTED } : u));
      Storage.saveUsers(nextUsers);
      return nextUsers;
    });
    setApprovalsMsg("🗑️ Rejected.");
    setTimeout(() => setApprovalsMsg(""), 1600);
  };

const title = useMemo(() => (isAdmin ? "Admin Dashboard" : "Manager Dashboard"), [isAdmin]);
  const subtitle = useMemo(
    () =>
      isAdmin
        ? "Full access. (Approvals/Assign/Sheets will be restored next.)"
        : "Manager access. (Approvals/Assign/Sheets will be restored next.)",
    [isAdmin]
  );
  // -----------------------------
  // USERS (restored)
  // -----------------------------
  const visibleUsers = useMemo(() => {
    const all = users || [];
    if (isAdmin) return all;
    // Manager can manage only employees they created
    return all.filter((u) => u.role === "employee" && (u.createdBy || "") === user.id);
  }, [users, isAdmin, user.id]);
  const [addEmp, setAddEmp] = useState<AddEmpForm>({ name: "", email: "", phone: "", password: "" });
  const [userMsg, setUserMsg] = useState<string>("");
  const [userEdits, setUserEdits] = useState<Record<string, UserEdit>>({});
  const getEditForUser = (u: User): UserEdit => {
    const draft = userEdits[u.id];
    return {
      name: (draft?.name ?? u.name) || "",
      email: (draft?.email ?? u.email) || "",
      phone: (draft?.phone ?? u.phone ?? "") || "",
      role: (draft?.role ?? u.role) as User["role"],
      status: (draft?.status ?? u.status) as User["status"],
    };
  };
  const setEditForUser = (userId: string, patch: Partial<UserEdit>) => {
    setUserEdits((prev) => {
      const cur = prev[userId] ?? ({
        name: "",
        email: "",
        phone: "",
        role: "employee",
        status: "active",
      } as any);
      return { ...prev, [userId]: { ...cur, ...patch } };
    });
  };
  const canEditRow = (u: User) => {
    if (isAdmin) return true;
    // manager can edit only employees they created
    return u.role === "employee" && (u.createdBy || "") === user.id;
  };
  const saveUserRow = (u: User) => {
    setUserMsg("");
    const e = getEditForUser(u);
    const nextName = e.name.trim();
    const nextEmail = e.email.trim().toLowerCase();
    const nextPhone = (e.phone || "").trim();
    if (!nextName) return setUserMsg("Name is required.");
    if (!nextEmail) return setUserMsg("Email is required.");
    if (!nextEmail.includes("@")) return setUserMsg("Email looks invalid.");
    // Only admin can change roles
    const safeRole: User["role"] = isAdmin ? e.role : u.role;
    const next = users.map((x) =>
      x.id === u.id
        ? ({
            ...x,
            name: nextName,
            email: nextEmail,
            phone: nextPhone || undefined,
            role: safeRole,
            status: e.status,
          } as any)
        : x
    );
    try {
      Storage.saveUsers(next);
      setUsers(next);
      setUserMsg("User updated.");
      setUserEdits((prev) => {
        const copy = { ...prev };
        delete copy[u.id];
        return copy;
      });
    } catch {
      setUserMsg("Could not save user.");
    }
  };
  const removeUser = (u: User) => {
    setUserMsg("");
    if (u.id === user.id) {
      setUserMsg("You cannot remove yourself.");
      return;
    }
    if (!isAdmin) {
      // manager restriction
      if (!(u.role === "employee" && (u.createdBy || "") === user.id)) {
        setUserMsg("Managers can only remove employees they created.");
        return;
      }
    }
    const ok = window.confirm(`Remove user "${u.name}"?`);
    if (!ok) return;
    const next = users.filter((x) => x.id !== u.id);
    try {
      Storage.saveUsers(next);
      setUsers(next);
      setUserMsg("User removed.");
    } catch {
      setUserMsg("Could not remove user.");
    }
  };
  const addEmployee = () => {
    setUserMsg("");
    const name = addEmp.name.trim();
    const email = addEmp.email.trim().toLowerCase();
    const phone = addEmp.phone.trim();
    const password = addEmp.password;
    if (!name) return setUserMsg("Employee name is required.");
    if (!email) return setUserMsg("Employee email is required.");
    if (!email.includes("@")) return setUserMsg("Employee email looks invalid.");
    if (!password || password.length < 4) return setUserMsg("Password must be at least 4 characters.");
    const dup = users.some((u) => u.email.trim().toLowerCase() === email);
    if (dup) return setUserMsg("That email already exists.");
    const now = new Date().toISOString();
    const id = "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    // createdBy:
    // - admin-created employees: "system"
    // - manager-created employees: manager id
    const createdBy = isAdmin ? "system" : user.id;
    const nextUser: any = {
      id,
      name,
      email,
      password, // NOTE: local demo only (plain text). We'll harden later.
      role: "employee",
      status: "active",
      phone: phone || undefined,
      createdBy,
      createdAt: now,
    };
    const next = [nextUser, ...users];
    try {
      Storage.saveUsers(next as any);
      setUsers(next as any);
      setAddEmp({ name: "", email: "", phone: "", password: "" });
      setUserMsg("Employee added.");
    } catch {
      setUserMsg("Could not add employee.");
    }
  };
  // -----------------------------
  // TASK DATABASE (kept restored)
  // -----------------------------
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      return Storage.getTasks() as Task[];
    } catch {
      return [] as Task[];
    }
  });
  const [taskMsg, setTaskMsg] = useState<string>("");
  const [taskForm, setTaskForm] = useState<{
    id?: string;
    title: string;
    description: string;
    category: string;
    defaultDurationMins: string;
  }>({
    id: undefined,
    title: "",
    description: "",
    category: "",
    defaultDurationMins: "",
  });
  const reloadTasks = () => {
    try {
      const next = Storage.getTasks() as Task[];
      setTasks(next);
      setTaskMsg("");
    } catch {
      setTaskMsg("Could not reload tasks.");
    }
  };
  const resetTaskForm = () => {
    setTaskForm({ id: undefined, title: "", description: "", category: "", defaultDurationMins: "" });
  };
  const editTask = (t: any) => {
    setTaskMsg("");
    setTaskForm({
      id: t.id,
      title: String(t.title || ""),
      description: String(t.description || ""),
      category: String(t.category || ""),
      defaultDurationMins: typeof t.defaultDurationMins === "number" ? String(t.defaultDurationMins) : "",
    });
  };
  const upsertTask = () => {
    setTaskMsg("");
    const title = taskForm.title.trim();
    if (!title) {
      setTaskMsg("Title is required.");
      return;
    }
    const minsRaw = taskForm.defaultDurationMins.trim();
    const mins = minsRaw ? Number(minsRaw) : undefined;
    const minsOk = minsRaw ? Number.isFinite(mins) && (mins as number) >= 0 : true;
    if (!minsOk) {
      setTaskMsg("Duration must be a number (0 or higher).");
      return;
    }
    const now = new Date().toISOString();
    const id = taskForm.id || ("t_" + Math.random().toString(36).slice(2) + Date.now().toString(36));
    const existing: any = (tasks as any[]).find((x) => x.id === id);
    const createdBy = existing?.createdBy ?? (user.role === "admin" ? "system" : user.id);
    const nextTask: any = {
      ...(existing || {}),
      id,
      title,
      description: taskForm.description.trim(),
      category: taskForm.category.trim(),
      defaultDurationMins: minsRaw ? mins : undefined,
      createdBy,
      updatedAt: now,
      createdAt: existing?.createdAt ?? now,
    };
    const next = (tasks as any[]).some((x) => x.id === id)
      ? (tasks as any[]).map((x) => (x.id === id ? nextTask : x))
      : [nextTask, ...(tasks as any[])];
    try {
      Storage.saveTasks(next as any);
      setTasks(next as any);
      setTaskMsg(taskForm.id ? "Task updated." : "Task added.");
      resetTaskForm();
    } catch {
      setTaskMsg("Could not save tasks.");
    }
  };
  const removeTask = (id: string) => {
    setTaskMsg("");
    const t: any = (tasks as any[]).find((x) => x.id === id);
    if (!t) return;
    if (t.createdBy === "system") {
      setTaskMsg("System tasks cannot be deleted.");
      return;
    }
    const next = (tasks as any[]).filter((x) => x.id !== id);
    try {
      Storage.saveTasks(next as any);
      setTasks(next as any);
      setTaskMsg("Task removed.");
      if (taskForm.id === id) resetTaskForm();
    } catch {
      setTaskMsg("Could not remove task.");
    }
  };
  return (
    <div className="container" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>{title}</h2>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              {subtitle}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn-ghost" onClick={() => navigate("/schedule")}>
              Schedule
            </button>
            <button className="btn-ghost" onClick={() => navigate("/me")}>
              My Tasks
            </button>
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
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Pending sign-ups</h3>
            <button className="btn-ghost" onClick={reloadUsers}>
              Refresh
            </button>
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            {isAdmin
              ? "Admins see all pending accounts."
              : "Managers only see pending employees created under their own profile."}
          </div>
          {approvalsMsg && (
            <div className="card" style={{ marginTop: 10, padding: 10 }}>
              {approvalsMsg}
            </div>
          )}
          {pendingUsers.length === 0 ? (
            <div className="muted" style={{ marginTop: 12 }}>No pending accounts.</div>
          ) : (
            <div style={{ marginTop: 12, overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: "nowrap" }}>Name</th>
                    <th style={{ whiteSpace: "nowrap" }}>Email</th>
                    <th style={{ whiteSpace: "nowrap" }}>Phone</th>
                    <th style={{ whiteSpace: "nowrap" }}>Role</th>
                    <th style={{ whiteSpace: "nowrap" }}>Created</th>
                    <th style={{ whiteSpace: "nowrap" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((u: User) => (
                    <tr key={u.id}>
                      <td><b>{u.name}</b></td>
                      <td>{u.email}</td>
                      <td>{u.phone || "—"}</td>
                      <td>{u.role}</td>
                      <td className="muted">{new Date(u.createdAt).toLocaleString()}</td>
                      <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn-primary" onClick={() => approveUser(u.id)}>
                          Approve
                        </button>
                        <button className="btn-danger" onClick={() => rejectUser(u.id)}>
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
{tab === "users" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>User management</h3>
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Admin: manage all users. Manager: manage employees you created. Phone can be added/edited for any user you can manage.
          </div>
          {/* Add Employee */}
          <div className="card" style={{ marginBottom: 14 }}>
            <h4 style={{ marginTop: 0, marginBottom: 8 }}>Add Employee</h4>
            <div className="row" style={{ gap: 12 }}>
              <div className="col">
                <label>Name</label>
                <input value={addEmp.name} onChange={(e) => setAddEmp({ ...addEmp, name: e.target.value })} />
              </div>
              <div className="col">
                <label>Email</label>
                <input value={addEmp.email} onChange={(e) => setAddEmp({ ...addEmp, email: e.target.value })} />
              </div>
            </div>
            <div className="row" style={{ gap: 12, marginTop: 10 }}>
              <div className="col">
                <label>Phone (optional)</label>
                <input
                  value={addEmp.phone}
                  onChange={(e) => setAddEmp({ ...addEmp, phone: e.target.value })}
                  placeholder="(555) 555-5555"
                />
              </div>
              <div className="col">
                <label>Password</label>
                <input
                  type="password"
                  value={addEmp.password}
                  onChange={(e) => setAddEmp({ ...addEmp, password: e.target.value })}
                  placeholder="Temporary password"
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button className="btn-primary" onClick={addEmployee}>
                Add Employee
              </button>
              <button className="btn-ghost" onClick={() => setAddEmp({ name: "", email: "", phone: "", password: "" })}>
                Clear
              </button>
              <button className="btn-ghost" onClick={reloadUsers}>
                Reload
              </button>
            </div>
            {userMsg && (
              <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
                {userMsg}
              </div>
            )}
          </div>
          {/* Users table */}
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 220 }}>Name</th>
                <th style={{ width: 240 }}>Email</th>
                <th style={{ width: 180 }}>Phone</th>
                <th style={{ width: 120 }}>User</th>
                <th style={{ width: 120 }}>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No users visible.
                  </td>
                </tr>
              ) : (
                visibleUsers.map((u) => {
                  const e = getEditForUser(u);
                  const editable = canEditRow(u);
                  const dirty =
                    e.name !== u.name ||
                    e.email !== u.email ||
                    (e.phone || "") !== (u.phone || "") ||
                    (isAdmin ? e.role !== u.role : false) ||
                    e.status !== u.status;
                  return (
                    <tr key={u.id}>
                      <td>
                        <input
                          value={e.name}
                          onChange={(ev) => setEditForUser(u.id, { name: ev.target.value })}
                          disabled={!editable}
                          style={{ width: "100%" }}
                        />
                      </td>
                      <td>
                        <input
                          value={e.email}
                          onChange={(ev) => setEditForUser(u.id, { email: ev.target.value })}
                          disabled={!editable}
                          style={{ width: "100%" }}
                        />
                      </td>
                      <td>
                        <input
                          value={e.phone}
                          onChange={(ev) => setEditForUser(u.id, { phone: ev.target.value })}
                          disabled={!editable}
                          placeholder="(555) 555-5555"
                          style={{ width: "100%" }}
                        />
                      </td>
                      <td>
                        <select
                          value={isAdmin ? e.role : "employee"}
                          onChange={(ev) => setEditForUser(u.id, { role: ev.target.value as User["role"] })}
                          disabled={!isAdmin}
                        >
                          <option value="employee">employee</option>
                          <option value="manager">manager</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={e.status}
                          onChange={(ev) => setEditForUser(u.id, { status: ev.target.value as any })}
                          disabled={!editable}
                        >
                          <option value="active">active</option>
                          <option value="pending">pending</option>
                          <option value="disabled">disabled</option>
                        </select>
                      </td>
                      <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn-primary" disabled={!editable || !dirty} onClick={() => saveUserRow(u)}>
                          Save
                        </button>
                        <button
                          className="btn-ghost"
                          disabled={!editable}
                          onClick={() => {
                            setUserEdits((prev) => {
                              const copy = { ...prev };
                              delete copy[u.id];
                              return copy;
                            });
                          }}
                        >
                          Reset
                        </button>
                        <button className="btn-danger" disabled={!editable} onClick={() => removeUser(u)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {!isAdmin && (
            <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
              Managers only see employees they created.
            </div>
          )}
        </div>
      )}
      {tab === "tasks" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Task database</h3>
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Add/edit tasks here. “System” tasks can be edited but not deleted. Custom tasks can be deleted.
          </div>
          <div className="row" style={{ gap: 14 }}>
            <div className="col">
              <h4 style={{ marginTop: 0 }}>{taskForm.id ? "Edit task" : "Add task"}</h4>
              <label>Title</label>
              <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
              <label>Description</label>
              <textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              />
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
                inputMode="numeric"
              />
              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button className="btn-primary" onClick={upsertTask}>
                  {taskForm.id ? "Save Changes" : "Add Task"}
                </button>
                <button className="btn-ghost" onClick={resetTaskForm}>
                  Clear
                </button>
                <button className="btn-ghost" onClick={reloadTasks}>
                  Reload
                </button>
              </div>
              {taskMsg && (
                <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
                  {taskMsg}
                </div>
              )}
            </div>
            <div className="col">
              <h4 style={{ marginTop: 0 }}>Tasks</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(tasks as any[]).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">
                        No tasks yet.
                      </td>
                    </tr>
                  ) : (
                    (tasks as any[]).map((t) => (
                      <tr key={t.id}>
                        <td style={{ maxWidth: 420 }}>
                          <b>{t.title}</b>
                          {t.description ? (
                            <div className="muted" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.25 }}>
                              {t.description}
                            </div>
                          ) : null}
                          {typeof t.defaultDurationMins === "number" ? (
                            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                              Default: {t.defaultDurationMins} min
                            </div>
                          ) : null}
                        </td>
                        <td>{t.category || "—"}</td>
                        <td>{t.createdBy === "system" ? "System" : "Custom"}</td>
                        <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button className="btn-ghost" onClick={() => editTask(t)}>
                            Edit
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() => removeTask(t.id)}
                            disabled={t.createdBy === "system"}
                            title={t.createdBy === "system" ? "System tasks cannot be deleted" : "Delete task"}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {!isAdmin && (
                <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
                  Managers can manage the task database, but assignment will still be limited to employees you created.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {tab === "assign" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Assign tasks</h3>
          <div className="muted" style={{ fontSize: 13 }}>
            (Placeholder) Next we’ll restore employee dropdown + compact task checklist + highlight selected + “Assign Selected”.
          </div>
        </div>
      )}
      {tab === "sheets" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Sheets</h3>
          <div className="muted" style={{ fontSize: 13 }}>
            (Placeholder) Next we’ll restore per-employee sheets + all-users export.
          </div>
        </div>
      )}
    </div>
  );
}
