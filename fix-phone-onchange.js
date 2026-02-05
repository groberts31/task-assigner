const fs = require("fs");
const p = "src/pages/admin/AdminDashboardPage.tsx";
let s = fs.readFileSync(p, "utf8");

const re = /onChange=\{\(ev\)\s*=>\s*setUserEdits\(\(prev\)\s*=>\s*\(\{\s*\.\.\.prev,\s*\[u\.id\]:\s*\{\s*\.\.\.getEditForUser\(u\),\s*phone:\s*ev\.target\.value,[\s\S]*?\}\s*\}\)\s*\)\s*\)\s*\}\s*\}\s*/m;

const replacement =
`onChange={(ev) =>
                          setUserEdits((prev) => ({
                            ...prev,
                            [u.id]: {
                              ...(prev[u.id] ?? getEditForUser(u)),
                              phone: ev.target.value,
                            },
                          }))
                        }`;

if (!re.test(s)) {
  console.log("⚠️ Could not find the exact broken phone onChange block to replace. No changes made.");
  process.exit(1);
}

s = s.replace(re, replacement);
fs.writeFileSync(p, s, "utf8");
console.log("✅ Fixed phone onChange block in AdminDashboardPage.tsx");
