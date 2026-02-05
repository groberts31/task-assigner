import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";

type Row = {
  title: string;
  category: string;
  description: string;
  dueDate: string;
  notes: string;
  status: string;
};

function buildPdfBlob(args: {
  businessName: string;
  employeeName: string;
  employeeEmail: string;
  rows: Row[];
}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - margin * 2;

  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(args.businessName, margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Assignment Sheet • Generated ${new Date().toLocaleString()}`, margin, y);
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Employee: ${args.employeeName}`, margin, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Email: ${args.employeeEmail}`, margin, y);
  y += 18;

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

  args.rows.forEach((r, idx) => {
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

    doc.setDrawColor(210);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  });

  return doc.output("blob");
}

export function ViewAssignmentsPdfButton({
  employeeName,
  employeeEmail,
  rows,
  className = "btn-ghost",
  label = "View PDF",
}: {
  employeeName: string;
  employeeEmail: string;
  rows: Row[];
  className?: string;
  label?: string;
}) {
  const [status, setStatus] = useState<string | null>(null);

  const hasRows = rows && rows.length > 0;

  const fileName = useMemo(() => {
    const safeName = (employeeName || "Employee")
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "");
    return `TidalWave_Assignments_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`;
  }, [employeeName]);

  async function onView() {
    setStatus(null);

    if (!hasRows) {
      setStatus("No assignments to export.");
      return;
    }

    try {
      const blob = buildPdfBlob({
        businessName: "Tidal Wave Car Wash",
        employeeName,
        employeeEmail,
        rows,
      });

      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank", "noopener,noreferrer");

      if (!w) {
        setStatus("Popup blocked — allow popups to view PDF.");
        return;
      }

      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setStatus(`Opened ${fileName}`);
    } catch {
      setStatus("Could not generate PDF.");
    }
  }

  // Only show button if there are assignments (your requirement)
  if (!hasRows) return null;

  return (
    <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
      <button
        className={className}
        onClick={onView}
        title="Generate and open a PDF preview for this employee"
        style={{ display: "inline-flex", gap: 10, alignItems: "center" }}
      >
        <span aria-hidden>📄</span>
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

