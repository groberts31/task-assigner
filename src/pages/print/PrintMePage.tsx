import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { Storage } from "../../data/storage";
import { useAuth } from "../../state/auth";

export function PrintMePage() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.status !== "active") return <Navigate to="/pending" replace />;

  const tasks = Storage.getTasks();
  const assignments = Storage.getAssignments();

  const myAssignments = useMemo(() => {
    return assignments
      .filter((a) => a.employeeId === user.id)
      .map((a) => ({
        ...a,
        task: tasks.find((t) => t.id === a.taskId),
      }))
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  }, [user.id, tasks.length, assignments.length]);

  const today = new Date().toLocaleDateString();

  return (
    <div className="container">
      <div className="card">
        <div className="header-bar">
          <div className="brand">Tidal Wave</div>
          <div className="subtitle">Employee Assignment Sheet • Printed {today}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{user.name}</div>
            <div className="muted" style={{ marginTop: 2 }}>{user.email}</div>
          </div>

          <div className="no-print" style={{ display: "flex", gap: 10 }}>
            <button className="btn-primary" onClick={() => window.print()}>
              Print / Save PDF
            </button>
          </div>
        </div>

        <hr className="no-print" />

        {myAssignments.length === 0 ? (
          <p>No tasks assigned.</p>
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
              {myAssignments.map((a) => (
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

        <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          Tip: In the print dialog, choose <b>Save as PDF</b>.
        </div>
      </div>
    </div>
  );
}
