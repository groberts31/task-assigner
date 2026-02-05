import { useEffect, useMemo, useState } from "react";
import type { Shift } from "../../data/scheduleStorage";

type EmployeeOption = { id: string; name: string; email: string };

export function ShiftEditorModal(props: {
  open: boolean;
  mode: "create" | "edit" | "view";
  isAdmin: boolean;

  employees: EmployeeOption[];

  // For create: prefilled start/end; For edit/view: the shift to edit/view
  initialStart?: string;
  initialEnd?: string;
  shift?: Shift;

  onClose: () => void;
  onCreate: (input: { employeeId: string; title: string; start: string; end: string }) => void;
  onUpdate: (shift: Shift) => void;
  onDelete: (shiftId: string) => void;
}) {
  const {
    open,
    mode,
    isAdmin,
    employees,
    initialStart,
    initialEnd,
    shift,
    onClose,
    onCreate,
    onUpdate,
    onDelete,
  } = props;

  const readOnly = mode === "view" || !isAdmin;

  const defaultEmployeeId = useMemo(() => employees[0]?.id || "", [employees]);

  const [employeeId, setEmployeeId] = useState<string>(shift?.employeeId || defaultEmployeeId);
  const [title, setTitle] = useState<string>(shift?.title || "Work Shift");
  const [start, setStart] = useState<string>(shift?.start || initialStart || "");
  const [end, setEnd] = useState<string>(shift?.end || initialEnd || "");

  useEffect(() => {
    // When modal opens or shift changes, reset fields
    if (!open) return;

    setEmployeeId(shift?.employeeId || defaultEmployeeId);
    setTitle(shift?.title || "Work Shift");
    setStart(shift?.start || initialStart || "");
    setEnd(shift?.end || initialEnd || "");
  }, [open, shift?.id, defaultEmployeeId, initialStart, initialEnd]);

  if (!open) return null;

  const headerText =
    mode === "create" ? "Create Shift" : mode === "edit" ? "Edit Shift" : "Shift Details";

  const canSave = !!employeeId && !!title.trim() && !!start && !!end;

  const employee = employees.find((e) => e.id === employeeId);

  return (
    <div
      className="no-print"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50,
      }}
      onMouseDown={(e) => {
        // click outside closes
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "min(760px, 100%)",
          borderRadius: 18,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ marginTop: 0, marginBottom: 6 }}>{headerText}</h2>
          <button className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="muted" style={{ marginBottom: 12 }}>
          {readOnly ? "View only" : "Make changes and save"}
        </div>

        <div className="row" style={{ gap: 16 }}>
          <div className="col">
            <label>Employee</label>
            <select
              value={employeeId}
              disabled={readOnly || mode === "edit"} // lock employee on edit (optional)
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.email})
                </option>
              ))}
            </select>

            {employee && (
              <div className="muted" style={{ marginTop: 6 }}>
                Selected: <b>{employee.name}</b> • {employee.email}
              </div>
            )}
          </div>

          <div className="col">
            <label>Shift title</label>
            <input
              value={title}
              disabled={readOnly}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning Shift"
            />

            <div className="row" style={{ gap: 12, marginTop: 10 }}>
              <div className="col">
                <label>Start</label>
                <input
                  value={start}
                  disabled={readOnly}
                  onChange={(e) => setStart(e.target.value)}
                  placeholder="ISO string"
                />
              </div>
              <div className="col">
                <label>End</label>
                <input
                  value={end}
                  disabled={readOnly}
                  onChange={(e) => setEnd(e.target.value)}
                  placeholder="ISO string"
                />
              </div>
            </div>

            <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              Tip: these fields store ISO datetime strings from the calendar selection.
            </div>
          </div>
        </div>

        <hr />

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          {/* Left side: delete only for admin + edit mode */}
          <div>
            {isAdmin && mode === "edit" && shift && (
              <button
                className="btn-danger"
                onClick={() => {
                  if (!confirm("Delete this shift?")) return;
                  onDelete(shift.id);
                  onClose();
                }}
              >
                Delete
              </button>
            )}
          </div>

          {/* Right side actions */}
          <div style={{ display: "flex", gap: 10 }}>
            {!readOnly && mode === "create" && (
              <button
                className="btn-primary"
                disabled={!canSave}
                onClick={() => {
                  if (!canSave) return;
                  onCreate({ employeeId, title: title.trim(), start, end });
                  onClose();
                }}
              >
                Create
              </button>
            )}

            {!readOnly && mode === "edit" && shift && (
              <button
                className="btn-primary"
                disabled={!canSave}
                onClick={() => {
                  if (!canSave) return;
                  onUpdate({ ...shift, title: title.trim(), start, end, employeeId });
                  onClose();
                }}
              >
                Save changes
              </button>
            )}

            <button className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
