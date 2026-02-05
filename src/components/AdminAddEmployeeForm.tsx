import { useState } from "react";
import { Storage } from "../data/storage";
import type { User } from "../data/types";
import { useAuth } from "../state/auth";

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function AdminAddEmployeeForm({ onAfterCreate }: { onAfterCreate: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
  };

  const create = () => {
    setStatusMsg(null);

    const n = name.trim();
    const e = email.trim().toLowerCase();
    const p = password;

    if (!n) return setStatusMsg("Name is required.");
    if (!e || !e.includes("@")) return setStatusMsg("A valid email is required.");
    if (!p || p.length < 4) return setStatusMsg("Password must be at least 4 characters (MVP).");
    if (!user) return setStatusMsg("Not logged in.");

    const users = Storage.getUsers() as User[];
    const exists = users.some((u) => (u.email || "").toLowerCase() === e);
    if (exists) return setStatusMsg("That email already exists. Use a different email.");

    const now = new Date().toISOString();

    const newEmployee: User = {
      id: id("u"),
      name: n,
      email: e,
      password: p,
      role: "employee",
      status: "active",
      createdAt: now,
      createdBy: user.id,
    } as any;

    Storage.saveUsers([newEmployee, ...users]);
    reset();
    setStatusMsg("Employee created and set to ACTIVE.");
    onAfterCreate();
  };

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <h4 style={{ marginTop: 0, marginBottom: 8 }}>Add Employee (Manual)</h4>
      <div className="muted" style={{ marginBottom: 10 }}>
        Creates an active employee account immediately (MVP local storage).
      </div>

      <div className="row" style={{ gap: 12 }}>
        <div className="col">
          <label>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Jordan Smith" />
        </div>

        <div className="col">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g., jordan@tidalwave.com" />
        </div>

        <div className="col">
          <label>Temporary password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Set a temp password" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn-primary" onClick={create}>
          Create Employee
        </button>
        <button className="btn-ghost" onClick={reset}>
          Clear
        </button>
        {statusMsg && (
          <div className="muted" style={{ fontSize: 12 }}>
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  );
}
