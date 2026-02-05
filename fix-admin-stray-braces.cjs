const fs = require("fs");

const file = "src/pages/admin/AdminDashboardPage.tsx";
let s = fs.readFileSync(file, "utf8");

const before = s;

// Fix the most common corrupted closure seen in your errors:
// "} }));"  (or variants with spaces)
s = s.replace(/\}\s*\}\s*\)\s*\)\s*;?/g, "}))");

// Also fix a variant that sometimes shows up after auto-edits:
// "} }));}" (extra brace at end)
s = s.replace(/\}\s*\}\s*\)\s*\)\s*\}\s*;?/g, "}))");

if (s === before) {
  console.log("⚠️ No stray '}}))' style corruption found. No changes made.");
  process.exit(1);
}

fs.writeFileSync(file, s, "utf8");
console.log("✅ Removed stray brace/paren corruption in AdminDashboardPage.tsx");
