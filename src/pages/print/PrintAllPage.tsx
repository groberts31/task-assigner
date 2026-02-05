import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { Storage } from "../../data/storage";
import { useAuth } from "../../state/auth";
import type { User } from "../../data/types";

export function PrintAllPage() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.status !== "active") return <Navigate to="/pending" replace />;
  if (user.role !== "admin") return <Navigate to="/me" replace />;

  const users = Storage.getUsers();
  const tasks = Storage.getTasks();
  const assignments = Storage.getAssignments();

  const employees = users.filter((u: User) => u.role === "employee" && u.status === "active");

  const sheet = useMemo(() => {
    return employees.map((emp) => {
      const empAssignments = assignments
        .filter((a) => a.employeeId === emp.id)
        .map((a) => ({
          ...a,
          task: tasks.find((t) => t.id === a.taskId),
        }))
        .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
      return { emp, empAssignments };
    });
  }, [employees.length, tasks.length, assignments.length]);

  const today = new Date().toLocaleDateString();

  return (
    <div className="container">
      <div className="card">
        <div className="header-bar">
          <div className="brand">Tidal Wave</div>
          <div className="subtitle">All Employees — Assignment Sheets • Printed {today}</div>
        </div>

        <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn-primary" onClick={() => window.print()}>
            Print / Save PDF
          </button>
        </div>

        <hr className="no-print" />

        {sheet.length === 0 ? (
          <p>No active employees.</p>
        ) : (
          sheet.map(({ emp, empAssignments }) => (
            <div key={emp.id} className="print-section" style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <h3 style={{ margin: 0 }}>{emp.name}</h3>
                  <div className="muted" style={{ marginTop: 4 }}>{emp.email}</div>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>Status: {emp.status}</div>
              </div>

              {empAssignments.length === 0 ? (
                <div className="muted" style={{ marginTop: 8 }}>No tasks assigned.</div>
              ) : (
                <table className="table" style={{ marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th style={{ width: "34%" }}>Task</th>
                      <th style={{ width: "18%" }}>Due</th>
                      <th style={{ width: "36%" }}>Notes</th>
                      <th style={{ width: "12%" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empAssignments.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <b>{a.task?.title || "(task missing)"}</b>
                          {a.task?.category && <div className="muted" style={{ marginTop: 2 }}>{a.task.category}</div>}
                          {a.task?.description && <div className="muted" style={{ marginTop: 2 }}>{a.task.description}</div>}
                        </td>
                        <td>{a.dueDate || "—"}</td>
                        <td>{a.notes || "—"}</td>
                        <td>{a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
