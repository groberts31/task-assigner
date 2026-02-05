import { useMemo, useState } from "react";
import { Storage } from "../data/storage";
import type { User } from "../data/types";

/**
 * ShareAssignmentsButton
 * - Tries native share sheet (Web Share API) if available
 * - Falls back to "Copy to clipboard"
 *
 * Includes: title, category, description, due date, notes, status.
 */
export function ShareAssignmentsButton({
  employeeId,
  label = "Share",
  className = "btn-ghost",
}: {
  employeeId: string | null | undefined;
  label?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<string | null>(null);

  const payload = useMemo(() => {
    if (!employeeId) return null;

    const users = Storage.getUsers();
    const tasks = Storage.getTasks();
    const assignments = Storage.getAssignments();

    const emp = users.find((u: User) => u.id === employeeId);
    if (!emp) return null;

    const rows = assignments
      .filter((a) => a.employeeId === employeeId)
      .map((a) => {
        const t = tasks.find((x) => x.id === a.taskId);
        return {
          title: t?.title || "(task missing)",
          category: t?.category || "—",
          description: t?.description || "—",
          dueDate: a.dueDate || "—",
          notes: a.notes || "—",
          status: a.status,
        };
      })
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

    const today = new Date().toLocaleDateString();

    const textLines: string[] = [];
    textLines.push("Tidal Wave Car Wash — Assignment Sheet");
    textLines.push(`Employee: ${emp.name} (${emp.email})`);
    textLines.push(`Shared: ${today}`);
    textLines.push("");

    if (rows.length === 0) {
      textLines.push("No tasks assigned.");
    } else {
      rows.forEach((r, idx) => {
        textLines.push(`Task ${idx + 1}: ${r.title}`);
        textLines.push(`  Category: ${r.category}`);
        textLines.push(`  Description: ${r.description}`);
        textLines.push(`  Due: ${r.dueDate}`);
        textLines.push(`  Notes: ${r.notes}`);
        textLines.push(`  Status: ${r.status}`);
        textLines.push("");
      });
    }

    const text = textLines.join("\n");

    return {
      title: "Tidal Wave Car Wash — Assignment Sheet",
      text,
    };
  }, [employeeId]);

  async function doShare() {
    setStatus(null);

    if (!payload) {
      setStatus("Select an employee first.");
      return;
    }

    // Native share (works best on iOS and some browsers)
    try {
      const shareData: any = { title: payload.title, text: payload.text };

      if (navigator.share && (navigator as any).canShare?.(shareData)) {
        await navigator.share(shareData);
        setStatus("Shared.");
        return;
      }
    } catch {
      // fall back
    }

    // Clipboard fallback (most reliable on desktop)
    try {
      await navigator.clipboard.writeText(payload.text);
      setStatus("Copied assignment sheet to clipboard.");
      return;
    } catch {
      // Final fallback
      try {
        // eslint-disable-next-line no-alert
        window.prompt("Copy the assignment sheet below:", payload.text);
        setStatus("Copy dialog opened.");
        return;
      } catch {
        setStatus("Unable to share on this browser.");
      }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
      <button
        className={className}
        onClick={doShare}
        disabled={!employeeId}
        title="Share employee assignment sheet"
        style={{ display: "inline-flex", gap: 10, alignItems: "center" }}
      >
        <span aria-hidden>⇪</span>
        <span>{label}</span>
      </button>

      {status && (
        <div className="muted" style={{ fontSize: 12, maxWidth: 560, textAlign: "right" }}>
          {status}
        </div>
      )}
    </div>
  );
}
