import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import logoPng from "../assets/tidalwave-logo.png";

type Row = {
  title: string;
  category: string;
  description: string;
  dueDate: string;
  notes: string;
  status: string;
};

type PdfArgs = {
  businessName: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  rows: Row[];
  logoDataUrl?: string;
  workDateLabel?: string;
};

function clamp(str: string | undefined, fallback = "—") {
  const s = (str || "").trim();
  return s.length ? s : fallback;
}

function statusLabel(s: string) {
  const x = (s || "").toLowerCase();
  if (x === "in_progress") return "In Progress";
  if (x === "done") return "Done";
  if (x === "assigned") return "Assigned";
  return s || "Assigned";
}

async function toDataUrl(assetUrl: string): Promise<string> {
  const res = await fetch(assetUrl);
  const blob = await res.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

/* ================= PDF ================= */

function buildProfessionalPdfBlob(args: PdfArgs) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const margin = 48;
  const contentW = pageW - margin * 2;

  const headerH = 130;
  const footerH = 42;

  const tableX = margin;
  const tableW = contentW;

  const colTask = Math.round(tableW * 0.50);
  const colDue = Math.round(tableW * 0.14);
  const colStatus = Math.round(tableW * 0.14);
  const colNotes = tableW - colTask - colDue - colStatus;

  const cols = [
    { label: "Task", w: colTask },
    { label: "Due", w: colDue },
    { label: "Status", w: colStatus },
    { label: "Notes", w: colNotes },
  ];

  const generatedText = `Generated: ${new Date().toLocaleString()}`;

  const line = (x1: number, y1: number, x2: number, y2: number) =>
    doc.line(x1, y1, x2, y2);

  /* ---------- Header ---------- */

  const drawHeader = (pageNum: number) => {
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, pageW, headerH, "F");

    if (args.logoDataUrl) {
      try {
        doc.addImage(args.logoDataUrl, "PNG", margin, 18, 120, 44);
      } catch {}
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(args.businessName, margin + 140, 38);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Assignment Sheet", margin + 140, 58);

    doc.setFontSize(10);
    doc.text(`Page ${pageNum}`, pageW - margin, 44, { align: "right" });
    doc.text(generatedText, pageW - margin, 60, { align: "right" });

    doc.roundedRect(margin, 72, contentW, 32, 8, 8);

    doc.setFont("helvetica", "bold");
    doc.text("Employee:", margin + 12, 88);
    doc.text("Email:", margin + 12, 102);

    doc.setFont("helvetica", "normal");
    doc.text(clamp(args.employeeName), margin + 78, 88);
    doc.text(clamp(args.employeeEmail), margin + 78, 102);

    doc.roundedRect(margin, 112, contentW, 26, 8, 8);

    doc.setFont("helvetica", "bold");
    doc.text("Work Date:", margin + 12, 130);

    doc.setFont("helvetica", "normal");
    doc.text(clamp(args.workDateLabel), margin + 80, 130);

    line(margin, headerH + 6, pageW - margin, headerH + 6);
  };

  /* ---------- Footer ---------- */

  const drawFooter = (p: number, total: number) => {
    const y = pageH - footerH + 18;

    line(margin, pageH - footerH, pageW - margin, pageH - footerH);

    doc.setFontSize(9);
    doc.text("Tidal Wave Car Wash • Internal Use", margin, y);
    doc.text(`Page ${p} of ${total}`, pageW - margin, y, { align: "right" });
  };

  /* ---------- Table Header ---------- */

  const drawTableHeader = (y: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(tableX, y, tableW, 26, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    let x = tableX;

    for (const c of cols) {
      doc.text(c.label, x + 8, y + 17);
      x += c.w;
    }

    // Outer border top
    doc.setDrawColor(180);
    doc.rect(tableX, y, tableW, 26);
  };

  /* ---------- Helpers ---------- */

  const wrap = (text: string, w: number) =>
    doc.splitTextToSize(text, w - 16);

  const rowHeight = (cells: string[][]) => {
    const max = Math.max(...cells.map((c) => c.length));
    return Math.max(26, max * 13 + 12);
  };

  /* ---------- Render ---------- */

  let page = 1;
  drawHeader(page);

  let y = headerH + 20;

  drawTableHeader(y);
  y += 26;

  const tableStartY = y - 26; // start of full table

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  if (args.rows.length === 0) {
    doc.text("No assignments for this date.", margin, y + 20);
  } else {
    args.rows.forEach((r, idx) => {
      const taskText =
        `${idx + 1}. ${clamp(r.title)}\n${clamp(r.category)} • ${clamp(r.description, "")}`.trim();

      const task = wrap(taskText, colTask);
      const due = wrap(clamp(r.dueDate), colDue);
      const status = wrap(statusLabel(r.status), colStatus);
      const notes = wrap(clamp(r.notes), colNotes);

      const h = rowHeight([task, due, status, notes]);

      if (y + h > pageH - footerH - 10) {
        // Draw outer border before page break
        doc.setDrawColor(160);
        doc.rect(tableX, tableStartY, tableW, y - tableStartY);

        doc.addPage();
        page++;

        drawHeader(page);
        y = headerH + 20;

        drawTableHeader(y);
        y += 26;
      }

      doc.setFillColor(idx % 2 ? 252 : 255, idx % 2 ? 252 : 255, 255);
      doc.rect(tableX, y, tableW, h, "F");

      let vx = tableX;

      // Column separators
      for (let i = 0; i < cols.length - 1; i++) {
        vx += cols[i].w;
        line(vx, y, vx, y + h);
      }

      let x = tableX + 8;
      const ty = y + 14;

      doc.text(task, x, ty, { maxWidth: colTask - 16 });
      x += colTask;

      doc.text(due, x, ty, { maxWidth: colDue - 16 });
      x += colDue;

      doc.setFont("helvetica", "bold");
      doc.text(status, x, ty, { maxWidth: colStatus - 16 });
      doc.setFont("helvetica", "normal");

      x += colStatus;

      doc.text(notes, x, ty, { maxWidth: colNotes - 16 });

      y += h;
    });
  }

  // Draw final outer border
  doc.setDrawColor(160);
  doc.rect(tableX, tableStartY, tableW, y - tableStartY);

  const total = doc.getNumberOfPages();

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(i, total);
  }

  return doc.output("blob");
}

/* ================= BUTTON ================= */

export function ViewAssignmentsPdfButton({
  employeeId,
  employeeName,
  employeeEmail,
  rows,
  className = "btn-ghost",
  label = "View PDF",
}: {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  rows: Row[];
  className?: string;
  label?: string;
}) {
  const [status, setStatus] = useState<string | null>(null);

  const hasRows = rows && rows.length > 0;

  const fileName = useMemo(() => {
    const safe = (employeeName || "Employee").replace(/[^a-z0-9]+/gi, "_");
    return `TidalWave_Assignments_${safe}_${employeeId.slice(-6)}.pdf`;
  }, [employeeName, employeeId]);

  async function onView() {
    setStatus(null);

    if (!hasRows) {
      setStatus("No assignments.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    const chosen = (prompt("Work Date (YYYY-MM-DD):", today) || "").trim();

    if (!chosen) return;

    const filtered = rows.filter(
      (r) => (r.dueDate || "").trim() === chosen
    );

    if (filtered.length === 0) {
      setStatus(`No assignments for ${chosen}.`);
      return;
    }

    try {
      const logoDataUrl = await toDataUrl(logoPng);

      const blob = buildProfessionalPdfBlob({
        businessName: "Tidal Wave Car Wash",
        employeeId,
        employeeName,
        employeeEmail,
        rows: filtered,
        logoDataUrl,
        workDateLabel: chosen,
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 60000);

      setStatus(`Opened PDF for ${chosen}`);
    } catch {
      setStatus("PDF generation failed.");
    }
  }

  if (!hasRows) return null;

  return (
    <div
      className="no-print"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: "flex-end",
      }}
    >
      <button className={className} onClick={onView}>
        📄 {label}
      </button>

      {status && (
        <div className="muted" style={{ fontSize: 12, textAlign: "right" }}>
          {status}
        </div>
      )}
    </div>
  );
}
