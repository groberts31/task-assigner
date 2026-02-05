import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Storage } from "../../data/storage";
import type { User } from "../../data/types";
import { useAuth } from "../../state/auth";
import { ShareAssignmentsButton } from "../../components/ShareAssignmentsButton";

export function AdminSharePage() {
  const { user } = useAuth();

  // Admin-only protection
  if (!user) return <Navigate to="/login" replace />;
  if (user.status !== "active") return <Navigate to="/pending" replace />;
  if (user.role !== "admin") return <Navigate to="/me" replace />;

  const employees = useMemo(() => {
    return Storage.getUsers()
      .filter((u: User) => u.role === "employee" && u.status === "active")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const [employeeId, setEmployeeId] = useState<string>(
    employees[0]?.id ?? ""
  );

  const employee = employees.find((e) => e.id === employeeId);

  return (
    <div className="container">
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ marginTop: 0 }}>
              Share Assignment Sheet
            </h2>

            <div className="muted">
              Select an employee and share their full task list.
            </div>
          </div>

          <ShareAssignmentsButton
            employeeId={employeeId || null}
            label="Share (Mac-style)"
            className="btn-primary"
          />
        </div>

        <hr />

        <div className="row">
          <div className="col">
            <label>Employee</label>

            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} — {e.email}
                </option>
              ))}
            </select>

            <div style={{ marginTop: 12 }} className="muted">
              {employee ? (
                <>
                  Sharing tasks for{" "}
                  <b>{employee.name}</b>
                </>
              ) : (
                "No employee selected."
              )}
            </div>
          </div>

          <div className="col">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>How it works</h3>

              <ul style={{ marginTop: 8 }}>
                <li>Uses native share sheet when supported</li>
                <li>Otherwise copies to clipboard</li>
                <li>Includes all task details</li>
                <li>Ready for Messages, Mail, Notes, etc.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
