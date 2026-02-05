import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";

/**
 * Reads from Storage if present, otherwise falls back to localStorage keys.
 * This makes the component resilient even if Storage helpers differ.
 */
function safeRead<T>(preferred: (() => T) | null, fallbackKey: string, fallbackDefault: T): T {
  try {
    if (preferred) return preferred();
  } catch {
    // ignore
  }
  try {
    const raw = localStorage.getItem(fallbackKey);
    if (!raw) return fallbackDefault;
    return JSON.parse(raw) as T;
  } catch {
    return fallbackDefault;
  }
}

type AnyTask = { id: string; title: string; description?: string; category?: string };
type AnyAssignment = { id: string; employeeId: string; taskId: string; dueDate?: string; notes?: string; status: string };
type AnyUser = { id: string; name: string; email: string; role: string; status: string };

async function shareFileOrFallback(file: File) {
  // Best path: native file share sheet (works great on iOS Safari; varies on desktop)
  try {
    const navAny = navigator as any;
    if (navigator.share && navAny.canShare?.({ files: [file] })) {
      await navigator.share({
        title: "Tidal Wave Car Wash — Assignment Sheet",
        text: "Assignment sheet PDF attached.",
        files: [file],
      });
      return { ok: true, mode: "native-share" as const };
    }
  } catch {
    // fall through
  }

  // Fallback: download the file
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return { ok: true, mode: "download" as const };
}

function buildPdfBlob(args: {
  businessName: string;
  employeeName: string;
  employeeEmail: string;
  rows: Array<{
    title: string;
    category: string;
    description: string;
    dueDate: string;
    notes: string;
    status: string;
  }>;
}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - margin * 2;

  let y = 56;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(args.businessName, margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const dateStr = new Date().toLocaleString();
  doc.text(`Assignment Sheet • Generated ${dateStr}`, margin, y);
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Employee: ${args.employeeName}`, margin, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Email: ${args.employeeEmail}`, margin, y);
  y += 18;

  // Divider
  doc.setDrawColor(180);
  doc.setLineWidth(1);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  if (args.rows.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("No tasks assigned.", margin, y);
    return doc.output("blob");
  }

  // Task blocks
  args.rows.forEach((r, idx) => {
    // page break protection
    if (y > 720) {
      doc.addPage();
      y = 56;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${idx + 1}. ${r.title}`, margin, y);
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const meta = `Category: ${r.category}   •   Due: ${r.dueDate}   •   Status: ${r.status}`;
    const metaLines = doc.splitTextToSize(meta, contentW);
    doc.text(metaLines, margin, y);
    y += metaLines.length * 12 + 6;

    const descLines = doc.splitTextToSize(`Description: ${r.description}`, contentW);
    doc.text(descLines, margin, y);
    y += descLines.length * 12 + 6;

    const notesLines = doc.splitTextToSize(`Notes: ${r.notes}`, contentW);
    doc.text(notesLines, margin, y);
    y += notesLines.length * 12 + 10;

    // Light divider between tasks
    doc.setDrawColor(210);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  });

  return doc.output("blob");
}

export function ShareAssignmentsPdfButton({
  employeeId,
  className = "btn-ghost",
}: {
  employeeId: string | null | undefined;
  className?: string;
}) {
  const [status, setStatus] = useState<string | null>(null);

  const data = useMemo(() => {
    if (!employeeId) return null;

    // Try to use Storage helpers if they exist
    const StorageAny = (globalThis as any).Storage || null;

    const users = safeRead<AnyUser[]>(
      StorageAny?.getUsers ? () => StorageAny.getUsers() : null,
      "ta_users",
      []
    );

    const tasks = safeRead<AnyTask[]>(
      StorageAny?.getTasks ? () => StorageAny.getTasks() : null,
      "ta_tasks",
      []
    );

    const assignments = safeRead<AnyAssignment[]>(
      StorageAny?.getAssignments ? () => StorageAny.getAssignments() : null,
      "ta_assignments",
      []
    );

    const emp = users.find((u) => u.id === employeeId);
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
          status: a.status || "assigned",
        };
      })
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

    return {
      employeeName: emp.name || "Employee",
      employeeEmail: emp.email || "",
      rows,
    };
  }, [employeeId]);

  async function onSharePdf() {
    setStatus(null);

    if (!data || !employeeId) {
      setStatus("Select an employee first.");
      return;
    }

    try {
      const blob = buildPdfBlob({
        businessName: "Tidal Wave Car Wash",
        employeeName: data.employeeName,
        employeeEmail: data.employeeEmail,
        rows: data.rows,
      });

      const safeName = data.employeeName.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
      const fileName = `TidalWave_Assignments_${safeName || "Employee"}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;

      const file = new File([blob], fileName, { type: "application/pdf" });

      const result = await shareFileOrFallback(file);

      if (result.mode === "native-share") {
        setStatus("Share sheet opened (PDF attached).");
      } else {
        setStatus("PDF downloaded (attach it in Messages/Mail/Apps).");
      }
    } catch (e) {
      setStatus("Could not generate/share PDF on this device.");
    }
  }

  async function copyEmailText() {
    if (!data) return;
    const lines: string[] = [];
    lines.push("Tidal Wave Car Wash — Assignment Sheet");
    lines.push(`Employee: ${data.employeeName} (${data.employeeEmail})`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push("");
    data.rows.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.title}`);
      lines.push(`   Category: ${r.category}`);
      lines.push(`   Description: ${r.description}`);
      lines.push(`   Due: ${r.dueDate}`);
      lines.push(`   Notes: ${r.notes}`);
      lines.push(`   Status: ${r.status}`);
      lines.push("");
    });

    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied full assignment details (paste into email/message).");
    } catch {
      setStatus("Clipboard not available.");
    }
  }

  const disabled = !employeeId;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <button
          className={className}
          onClick={onSharePdf}
          disabled={disabled}
          title="Generate a PDF and share it using the native share sheet (or download if not supported)."
          style={{ display: "inline-flex", gap: 10, alignItems: "center" }}
        >
          <span aria-hidden>📄</span>
          <span>Share PDF</span>
        </button>

        <button
          className="btn-ghost"
          onClick={copyEmailText}
          disabled={disabled}
          title="Copies all assignment details so you can paste into email or messaging apps."
          style={{ display: "inline-flex", gap: 10, alignItems: "center" }}
        >
          <span aria-hidden>📋</span>
          <span>Copy Details</span>
        </button>
      </div>

      {status && (
        <div className="muted" style={{ fontSize: 12, maxWidth: 680, textAlign: "right" }}>
          {status}
        </div>
      )}
    </div>
  );
}
