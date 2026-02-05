import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../state/auth";
import { Storage } from "../../data/storage";
import type { Task, User } from "../../data/types";
type TabKey = "approvals" | "users" | "tasks" | "assign" | "sheets";

const LS_ASSIGNMENTS_KEY = "tw_assignments";
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
  
  // -----------------------------
  // SHEETS (restored)
  // -----------------------------
  type AssignmentRow = {
    id: string;
    employeeId: string;
    taskIds: string[];
    createdAt: string;
    createdBy?: string;
  };

  const ASSIGNMENTS_KEY = "ta_assignments";

  const readAssignments = (): AssignmentRow[] => {
    try {
      const raw = localStorage.getItem(ASSIGNMENTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((x) => x && typeof x === "object")
        .map((x) => ({
          id: String((x as any).id ?? ""),
          employeeId: String((x as any).employeeId ?? ""),
          taskIds: Array.isArray((x as any).taskIds) ? (x as any).taskIds.map(String) : [],
          createdAt: String((x as any).createdAt ?? new Date().toISOString()),
          createdBy: (x as any).createdBy ? String((x as any).createdBy) : undefined,
        }))
        .filter((x) => x.id && x.employeeId);
    } catch {
      return [];
    }
  };

  const [sheetsEmployeeId, setSheetsEmployeeId] = useState<string>("__ALL__");
  

  // ----------------------------
  // ASSIGN WORKFLOW STATE
  // ----------------------------
  const [assignEmployeeId, setAssignEmployeeId] = useState<string>("");
  const [assignSelected, setAssignSelected] = useState<Record<string, boolean>>({});
  const [assignMsg, setAssignMsg] = useState<string>("");

  const visibleTasks: any[] = (tasks as any[]) ?? [];

  const toggleTask = (taskId: string) => {
    setAssignSelected((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const clearSelectedTasks = () => {
    setAssignSelected({});
    setAssignMsg("");
  };

  const handleAssign = () => {
    try {
      const selectedTaskIds = Object.keys(assignSelected).filter((id) => assignSelected[id]);

      if (!assignEmployeeId) {
        setAssignMsg("Please select an employee first.");
        return;
      }
      if (selectedTaskIds.length === 0) {
        setAssignMsg("Select at least one task to assign.");
        return;
      }

      const KEY = "tw_assignments";
      const existing = JSON.parse(localStorage.getItem(KEY) || "[]");

      const id =
        (globalThis.crypto && "randomUUID" in globalThis.crypto)
          ? (globalThis.crypto as any).randomUUID()
          : String(Date.now());

      const record = {
        id,
        employeeId: assignEmployeeId,
        taskIds: selectedTaskIds,
        createdAt: new Date().toISOString(),
        createdBy: (user as any)?.id || "unknown",
      };



      // Save to localStorage (always)
      existing.unshift(record);
      localStorage.setItem(KEY, JSON.stringify(existing));

      // ALSO save via Storage helper if your app has it (won't error if missing)
      try {
        (Storage as any).saveAssignments?.(existing);
      } catch {}

      // ✅ Clear the form + selections (what you asked for)
      setAssignSelected({});
      setAssignEmployeeId("");
      setAssignMsg(`Assigned ${selectedTaskIds.length} task(s). Refreshing...`);

      // ✅ Refresh page so UI re-reads assignments and selections are gone
      setTimeout(() => window.location.reload(), 150);
    } catch (e: any) {
      setAssignMsg(e?.message || "Failed to assign.");
    }
  };

const [sheetsMsg, setSheetsMsg] = useState<string>("");
  const [assignments, setAssignments] = useState<AssignmentRow[]>(() => readAssignments());

  const reloadSheets = () => {
    setAssignments(readAssignments());
    setSheetsMsg("Refreshed.");
    setTimeout(() => setSheetsMsg(""), 1200);
  };

  const taskTitleById = (taskId: string) => {
    try {
      // @ts-ignore - tasks exists in your dashboard when Tasks/Assign are restored
      const t = (tasks || []).find((x: any) => x.id === taskId);
      return t?.title || "Unknown task";
    } catch {
      return "Unknown task";
    }
  };

  const assignmentsByEmployee = (employeeId: string) => {
    return assignments
      .filter((a) => a.employeeId === employeeId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  };



  // Employees visible to this dashboard
  const visibleEmployees = useMemo(() => {
    // @ts-ignore
    const allUsers = (users || []) as any[];
    const employees = allUsers.filter((u) => u.role === "employee");

    if (isAdmin) return employees;

    const meId = user?.id || "";
    return employees.filter((u) => (u.createdBy || "") === meId);
  }, [isAdmin, user?.id
    // @ts-ignore
    , users]);



  // Remove one assignment by id (updates localStorage + state)
  const removeAssignment = (id: string) => {
    try {
      const next = (assignments || []).filter((a: any) => a?.id !== id);
      localStorage.setItem(LS_ASSIGNMENTS_KEY, JSON.stringify(next));
      setAssignments(next);
      try { (setAssignMsg as any)?.("Assignment removed."); } catch {}
    } catch (e: any) {
      try { (setAssignMsg as any)?.(e?.message || "Failed to remove assignment."); } catch {}
    }
  };


  // Lookup employee/user by id (used by Assignments table so we show name instead of id)
  const employeeById = (id: string) => users.find((u) => u.id === id);

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
    <h3 style={{ marginTop: 0 }}>Assign Tasks</h3>

    <label>Employee</label>
    <select
      style={{ width: "100%", marginBottom: 12 }}
      value={assignEmployeeId}
      onChange={(e) => setAssignEmployeeId(e.target.value)}
    >
      <option value="">Select employee…</option>
      {visibleEmployees.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name} ({e.email})
        </option>
      ))}
    </select>

    <div style={{ marginBottom: 12 }}>
      <strong>Select Tasks</strong>

      <div style={{ marginTop: 8 }}>
        {visibleTasks.length === 0 ? (
          <div className="muted">No tasks available.</div>
        ) : (
          visibleTasks.map((t: any) => {
            const checked = !!assignSelected[t.id];

            return (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  padding: "6px 8px",
                  marginBottom: 4,
                  borderRadius: 6,
                  background: checked ? "rgba(90,200,250,0.12)" : "transparent",
                  border: checked
                    ? "1px solid rgba(90,200,250,0.5)"
                    : "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer"
                }}
                onClick={() => toggleTask(t.id)}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleTask(t.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: 14, height: 14 }}
                />

                <div style={{ flex: 1, fontSize: 13 }}>
                  <strong>{t.title}</strong>
                  {t.category && (
                    <span className="muted"> • {t.category}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>

    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <button className="btn-primary" onClick={handleAssign}>
        Assign Selected
      </button>

                <hr style={{ margin: "14px 0" }} />

                <h4 style={{ marginTop: 0 }}>Assignments (latest)</h4>

                {assignments.length === 0 ? (
                  <div className="muted" style={{ fontSize: 13 }}>
                    No assignments yet.
                  </div>
                ) : (
                  <table className="table" style={{ marginTop: 10 }}>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Tasks</th>
                        <th>Created</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a: any) => (
                        <tr key={a.id}>
                          <td className="muted">{(employeeById(a.employeeId)?.name ?? a.employeeId)}</td>
                          <td>{(a.taskIds || []).length} task(s)</td>
                          <td className="muted">{a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}</td>
                          <td style={{ textAlign: "right" }}>
                            <button className="btn-danger" onClick={() => removeAssignment(a.id)}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}


      <button className="btn-ghost" onClick={clearSelectedTasks}>
        Clear
      </button>
    </div>

    {assignMsg && (
      <div className="muted" style={{ marginTop: 10 }}>
        {assignMsg}
      </div>
    )}
  </div>
)}

      
      {tab === "sheets" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Sheets</h3>
          <div className="muted" style={{ fontSize: 13, marginTop: 6, marginBottom: 12 }}>
            Per-employee sheets + all-employees view. Data is loaded from local storage.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
            <label style={{ minWidth: 120 }}>Employee</label>
            <select
              value={sheetsEmployeeId}
              onChange={(e) => setSheetsEmployeeId(e.target.value)}
              style={{ maxWidth: 420, width: "100%" }}
            >
              <option value="__ALL__">All employees</option>
              {visibleEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.email})
                </option>
              ))}
            </select>

            <button className="btn-ghost" onClick={() => reloadSheets()}>
              Refresh
            </button>

            <button className="btn-primary" onClick={() => window.print()}>
              Print
            </button>
          </div>

          {sheetsMsg && (
            <div className="muted" style={{ fontSize: 13, padding: "8px 0" }}>
              {sheetsMsg}
            </div>
          )}

          <div style={{ display: "grid", gap: 14 }}>
            {sheetsEmployeeId === "__ALL__" ? (
              <div className="card" style={{ padding: 14 }}>
                <h4 style={{ marginTop: 0 }}>All Employees</h4>
                <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                  Shows a summary per employee, then their assignment rows.
                </div>

                {visibleEmployees.length === 0 ? (
                  <div className="muted">No employees found for this profile.</div>
                ) : (
                  visibleEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        paddingTop: 12,
                        marginTop: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 800 }}>{emp.name}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {emp.email}
                            {emp.phone ? " • " + emp.phone : ""}
                          </div>
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          Assignments: {assignmentsByEmployee(emp.id).length}
                        </div>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        {assignmentsByEmployee(emp.id).length === 0 ? (
                          <div className="muted" style={{ fontSize: 13 }}>
                            No assignments yet.
                          </div>
                        ) : (
                          <table className="table">
                            <thead>
                              <tr>
                                <th style={{ width: 180 }}>Date</th>
                                <th>Tasks</th>
                                <th style={{ width: 120 }}>Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {assignmentsByEmployee(emp.id).map((a) => (
                                <tr key={a.id}>
                                  <td className="muted">{new Date(a.createdAt).toLocaleString()}</td>
                                  <td>{a.taskIds.map((id) => taskTitleById(id)).join(", ")}</td>
                                  <td className="muted">{a.createdBy === "system" ? "System" : "Custom"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="card" style={{ padding: 14 }}>
                {(() => {
                  const emp = visibleEmployees.find((x) => x.id === sheetsEmployeeId);
                  if (!emp) return <div className="muted">Employee not found.</div>;
                  const rows = assignmentsByEmployee(emp.id);

                  return (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div>
                          <h4 style={{ margin: 0 }}>{emp.name}</h4>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {emp.email}
                            {emp.phone ? " • " + emp.phone : ""}
                          </div>
                        </div>
                        <div className="muted" style={{ fontSize: 12 }}>Assignments: {rows.length}</div>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        {rows.length === 0 ? (
                          <div className="muted" style={{ fontSize: 13 }}>
                            No assignments yet for this employee.
                          </div>
                        ) : (
                          <table className="table">
                            <thead>
                              <tr>
                                <th style={{ width: 180 }}>Date</th>
                                <th>Tasks</th>
                                <th style={{ width: 120 }}>Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((a) => (
                                <tr key={a.id}>
                                  <td className="muted">{new Date(a.createdAt).toLocaleString()}</td>
                                  <td>{a.taskIds.map((id) => taskTitleById(id)).join(", ")}</td>
                                  <td className="muted">{a.createdBy === "system" ? "System" : "Custom"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
</div>
  );
}
