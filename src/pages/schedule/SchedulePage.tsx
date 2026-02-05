import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

import "./schedule.css";

import { ScheduleStorage } from "../../data/scheduleStorage";
import type { Shift } from "../../data/scheduleStorage";
import { Storage } from "../../data/storage";
import { useAuth } from "../../state/auth";
import { ScheduleTemplates, templateToShifts, alignToWeekStart } from "../../data/scheduleTemplates";
import { useIsMobile } from "../../hooks/useIsMobile";

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function clampIsoEnd(startIso: string, endIso: string) {
  // guard against accidental end before start
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return endIso;
  if (e <= s) {
    const d = new Date(s);
    d.setMinutes(d.getMinutes() + 60);
    return d.toISOString();
  }
  return endIso;
}

function inWeek(iso: string, weekStart: Date) {
  const d = new Date(iso);
  const ws = new Date(weekStart);
  const we = new Date(weekStart);
  we.setDate(we.getDate() + 7);
  return d >= ws && d < we;
}

export function SchedulePage() {
  const { user } = useAuth();
  const isMobile = useIsMobile(820);

  // Force rerender when we mutate storage
  const [tick, setTick] = useState(0);

  // ---------------- Template Apply UI state ----------------
  const [templateId, setTemplateId] = useState<string>(ScheduleTemplates[0]?.id || "");
  const [templateDate, setTemplateDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [templateEmployeeIds, setTemplateEmployeeIds] = useState<string[]>([]);
  const [templateMode, setTemplateMode] = useState<"append" | "replace_selected" | "replace_all">("append");

  // ---------------- Add/Edit shift modal state ----------------
  const [editing, setEditing] = useState<Shift | null>(null);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formNotes, setFormNotes] = useState("");

  if (!user) return null;

  const isPriv = user.role === "admin" || user.role === "manager";

  // Employee list shown in schedule
  const employees = useMemo(() => {
    const all = Storage.getUsers().filter((u) => u.role === "employee" && u.status === "active");
    // If not admin/manager, only show the logged-in employee
    if (!isPriv) return all.filter((e) => e.id === user.id);
    return all;
  }, [tick, user.id, user.role]);

  const shifts = useMemo(() => {
    const raw = ScheduleStorage.getAll();
    // If not admin/manager, hide other employees
    if (!isPriv) return raw.filter((s) => s.employeeId === user.id);
    return raw;
  }, [tick, isPriv, user.id]);

  const events = useMemo(() => {
    return shifts.map((s) => ({
      id: s.id,
      title: s.title,
      start: s.start,
      end: s.end,
      extendedProps: {
        employeeId: s.employeeId,
        location: s.location || "",
        notes: s.notes || "",
      },
    }));
  }, [shifts]);

  const openCreateFromSelection = (selectInfo: any) => {
    const startIso = selectInfo.startStr;
    const endIso = selectInfo.endStr;

    setEditing(null);
    setFormEmployeeId(employees[0]?.id || "");
    setFormTitle("Shift");
    setFormStart(startIso);
    setFormEnd(clampIsoEnd(startIso, endIso));
    setFormLocation("");
    setFormNotes("");
  };

  const openEditFromEventClick = (clickInfo: any) => {
    const id = String(clickInfo.event.id);
    const found = ScheduleStorage.getAll().find((x) => x.id === id);
    if (!found) return;

    setEditing(found);
    setFormEmployeeId(found.employeeId);
    setFormTitle(found.title);
    setFormStart(found.start);
    setFormEnd(found.end);
    setFormLocation(found.location || "");
    setFormNotes(found.notes || "");
  };

  const saveShift = () => {
    if (!formEmployeeId) return alert("Pick an employee.");
    if (!formTitle.trim()) return alert("Enter a title.");
    if (!formStart) return alert("Start time missing.");
    if (!formEnd) return alert("End time missing.");

    const now = new Date().toISOString();

    const next: Shift = {
      id: editing?.id || makeId("shift"),
      employeeId: formEmployeeId,
      title: formTitle.trim(),
      start: formStart,
      end: clampIsoEnd(formStart, formEnd),
      location: formLocation.trim() || undefined,
      notes: formNotes.trim() || undefined,
      createdAt: editing?.createdAt || now,
      updatedAt: now,
    };

    if (editing) ScheduleStorage.update(next);
    else ScheduleStorage.add(next);

    // close modal
    setEditing(null);
    setFormEmployeeId("");
    setFormTitle("");
    setFormStart("");
    setFormEnd("");
    setFormLocation("");
    setFormNotes("");

    setTick((x) => x + 1);
  };

  const deleteShift = () => {
    if (!editing) return;
    if (!confirm("Delete this shift?")) return;
    ScheduleStorage.remove(editing.id);
    setEditing(null);
    setTick((x) => x + 1);
  };

  // Replace shifts for a week
  const clearWeek = (weekStart: Date, employeeIds: string[] | "ALL") => {
    const all = ScheduleStorage.getAll();
    const next = all.filter((sh) => {
      if (!inWeek(sh.start, weekStart)) return true;
      if (employeeIds === "ALL") return false;
      return !employeeIds.includes(sh.employeeId);
    });
    ScheduleStorage.setAll(next);
  };

  const applyTemplate = () => {
    if (!isPriv) return;

    const tmpl = ScheduleTemplates.find((x) => x.id === templateId);
    if (!tmpl) return alert("Template not found.");

    const activeEmpIds = employees.map((e) => e.id);
    const selected = templateEmployeeIds.length ? templateEmployeeIds : (activeEmpIds.slice(0, 1));

    if (!selected.length) return alert("Select at least one employee.");

    const weekStart = alignToWeekStart(new Date(templateDate + "T00:00:00"));
    const newShifts = templateToShifts(tmpl, weekStart, selected);

    if (templateMode === "replace_all") {
      clearWeek(weekStart, "ALL");
    } else if (templateMode === "replace_selected") {
      clearWeek(weekStart, selected);
    }

    const existing = ScheduleStorage.getAll();
    ScheduleStorage.setAll([...newShifts, ...existing]);
    setTick((x) => x + 1);
  };

  const onEventDrop = (arg: any) => {
    // drag event
    const id = String(arg.event.id);
    const all = ScheduleStorage.getAll();
    const found = all.find((x) => x.id === id);
    if (!found) return;

    const next: Shift = {
      ...found,
      start: arg.event.start?.toISOString() || found.start,
      end: arg.event.end?.toISOString() || found.end,
      updatedAt: new Date().toISOString(),
    };

    ScheduleStorage.update(next);
    setTick((x) => x + 1);
  };

  const onEventResize = (arg: any) => {
    // resize event
    const id = String(arg.event.id);
    const all = ScheduleStorage.getAll();
    const found = all.find((x) => x.id === id);
    if (!found) return;

    const next: Shift = {
      ...found,
      start: arg.event.start?.toISOString() || found.start,
      end: arg.event.end?.toISOString() || found.end,
      updatedAt: new Date().toISOString(),
    };

    ScheduleStorage.update(next);
    setTick((x) => x + 1);
  };

  const viewName = isMobile ? "timeGridDay" : "timeGridWeek";

  return (
    <div className="container schedule-wrap">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Schedule</h2>
        <div className="muted" style={{ marginBottom: 10 }}>
          Tap & drag to create shifts. Click a shift to edit.
        </div>

        {isPriv && (
          <div className="card schedule-calendar-inner" style={{ marginBottom: 12 }}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Template Apply</h3>
            <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
              Apply a weekly schedule template to one or more employees.
            </div>

            <div className="row" style={{ gap: 12 }}>
              <div className="col">
                <label>Template</label>
                <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                  {ScheduleTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col">
                <label>Week of (any date in that week)</label>
                <input type="date" value={templateDate} onChange={(e) => setTemplateDate(e.target.value)} />
              </div>

              <div className="col">
                <label>Mode</label>
                <select value={templateMode} onChange={(e) => setTemplateMode(e.target.value as any)}>
                  <option value="append">Append (do not delete existing)</option>
                  <option value="replace_selected">Replace week (selected employees only)</option>
                  <option value="replace_all">Replace week (all employees)</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label>Select employees</label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {employees.map((emp) => {
                  const checked = templateEmployeeIds.includes(emp.id);
                  return (
                    <label key={emp.id} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setTemplateEmployeeIds((prev) => {
                            const set = new Set(prev);
                            if (on) set.add(emp.id);
                            else set.delete(emp.id);
                            return Array.from(set);
                          });
                        }}
                      />
                      <span>
                        <b>{emp.name}</b> <span className="muted">({emp.email})</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                <button className="btn-primary" onClick={applyTemplate}>
                  Apply Template
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="schedule-calendar-inner">
          <FullCalendar
            key={viewName}  // important: ensures correct initialView on mobile
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={viewName}
            headerToolbar={{
              left: isMobile ? "prev,next" : "prev,next today",
              center: "title",
              right: isMobile ? "timeGridDay,timeGridWeek" : "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            slotDuration={"00:30:00"}
            slotLabelInterval={"00:30:00"}
            nowIndicator={true}
            selectable={true}
            selectMirror={true}
            editable={true}
            events={events}
            select={openCreateFromSelection}
            eventClick={openEditFromEventClick}
            eventDrop={onEventDrop}
            eventResize={onEventResize}
            height="auto"
          />
        </div>
      </div>

      {/* Modal (simple) */}
      {(formStart && formEnd) && (
        <div className="no-print" style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          zIndex: 9999
        }}>
          <div className="card" style={{ width: "min(720px, 96vw)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>
                {editing ? "Edit Shift" : "Create Shift"}
              </h3>
              <button className="btn-ghost" onClick={() => {
                setEditing(null);
                setFormStart("");
                setFormEnd("");
              }}>Close</button>
            </div>

            <div className="row" style={{ gap: 12 }}>
              <div className="col">
                <label>Employee</label>
                <select value={formEmployeeId} onChange={(e) => setFormEmployeeId(e.target.value)}>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.email})</option>
                  ))}
                </select>
              </div>

              <div className="col">
                <label>Title</label>
                <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              </div>
            </div>

            <div className="row" style={{ gap: 12 }}>
              <div className="col">
                <label>Start (ISO)</label>
                <input value={formStart} onChange={(e) => setFormStart(e.target.value)} />
              </div>
              <div className="col">
                <label>End (ISO)</label>
                <input value={formEnd} onChange={(e) => setFormEnd(e.target.value)} />
              </div>
            </div>

            <div className="row" style={{ gap: 12 }}>
              <div className="col">
                <label>Location</label>
                <input value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="Optional" />
              </div>
              <div className="col">
                <label>Notes</label>
                <input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-primary" onClick={saveShift}>
                  {editing ? "Save Changes" : "Add Shift"}
                </button>
                {editing && (
                  <button className="btn-danger" onClick={deleteShift}>Delete</button>
                )}
              </div>

              <button className="btn-ghost" onClick={() => {
                setEditing(null);
                setFormStart("");
                setFormEnd("");
              }}>
                Done
              </button>
            </div>

            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              Tip: FullCalendar will still let you drag and resize shifts after saving.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
