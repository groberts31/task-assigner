import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Storage } from "../data/storage";
import { useAuth } from "../state/auth";
export function EmployeeAssignmentsPage() {
  const { user } = useAuth();

  const tasks = Storage.getTasks();
  const assignments = Storage.getAssignments();

  const myAssignments = useMemo(() => {
    if (!user) return [];
    return assignments
      .filter((a) => a.employeeId === user.id)
      .map((a) => ({
        ...a,
        task: tasks.find((t) => t.id === a.taskId),
      }))
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  }, [user, tasks.length, assignments.length]);

  if (!user) return null;

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>My Assignment Sheet</h2>
            <div className="muted" style={{ fontSize: 13 }}>Logged in as {user.email}</div>
          </div>

          {/* VERY VISIBLE PRINT BUTTON */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/print/me">
              <button className="btn-primary">Print / Save PDF</button>
            </Link>
          </div>
        </div>

        <hr />

        {myAssignments.length === 0 ? (
          <p>No tasks assigned yet.</p>
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
              {myAssignments.map((a) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.task?.title || "(task missing)"}</b>
                    {a.task?.description && (
                      <div><small className="muted">{a.task.description}</small></div>
                    )}
                  </td>
                  <td>{a.dueDate || "—"}</td>
                  <td>{a.notes || "—"}</td>
                  <td>{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* SECOND PRINT BUTTON (cannot miss) */}
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <Link to="/print/me">
            <button className="btn-ghost">Print / Save PDF</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
