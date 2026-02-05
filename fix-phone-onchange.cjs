const fs = require("fs");

const file = "src/pages/admin/AdminDashboardPage.tsx";
const lines = fs.readFileSync(file, "utf8").split("\n");

// Find the phone input line
const phoneValueIdx = lines.findIndex((l) => l.includes('value={e.phone') || l.includes('value={e.phone || ""}'));
if (phoneValueIdx === -1) {
  console.log("⚠️ Could not find the phone input line (value={e.phone...}). No changes made.");
  process.exit(1);
}

// Walk upward a bit to find the onChange start line inside that <input ...>
let start = -1;
for (let i = phoneValueIdx; i >= Math.max(0, phoneValueIdx - 25); i--) {
  if (lines[i].includes("onChange={")) { start = i; break; }
}
if (start === -1) {
  console.log("⚠️ Found phone input, but could not find onChange={ above it. No changes made.");
  process.exit(1);
}

// Walk downward to find the end of the onChange attribute.
// We will stop when we hit a line that includes "placeholder=" or "/>" (end of input).
let end = -1;
for (let i = start; i <= Math.min(lines.length - 1, phoneValueIdx + 40); i++) {
  if (lines[i].includes("placeholder=") || lines[i].includes("/>")) { end = i - 1; break; }
}
if (end === -1) {
  console.log("⚠️ Found onChange start, but could not find where the input continues (placeholder or />). No changes made.");
  process.exit(1);
}

// Build indentation from the original onChange line
const indent = (lines[start].match(/^(\s*)/) || ["", ""])[1];

// Replacement onChange block (clean + safe)
const replacement = [
  `${indent}onChange={(ev) =>`,
  `${indent}  setUserEdits((prev) => ({`,
  `${indent}    ...prev,`,
  `${indent}    [u.id]: {`,
  `${indent}      ...(prev[u.id] ?? getEditForUser(u)),`,
  `${indent}      phone: ev.target.value,`,
  `${indent}    },`,
  `${indent}  }))`,
  `${indent}}`
];

// Replace the old lines from start..end with replacement
lines.splice(start, end - start + 1, ...replacement);

fs.writeFileSync(file, lines.join("\n"), "utf8");
console.log("✅ Rewrote the phone input onChange block safely.");
