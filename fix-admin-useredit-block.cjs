const fs = require("fs");

const file = "src/pages/admin/AdminDashboardPage.tsx";
let s = fs.readFileSync(file, "utf8");

// We replace ONLY the helper block between getEditForUser and applyUserEdits.
// This avoids touching your big JSX / tab UI.
const startKey = "const getEditForUser";
const endKey = "const applyUserEdits";

const start = s.indexOf(startKey);
const end = s.indexOf(endKey);

if (start === -1 || end === -1 || end <= start) {
  console.log("❌ Could not find the expected user-edit helper block markers.");
  console.log("   Looking for:", startKey, " ... ", endKey);
  process.exit(1);
}

const before = s.slice(0, start);
const after = s.slice(end); // keep applyUserEdits + everything after

// Clean, valid helper block (supports name/email/role/status/phone edits)
const replacement =
`const getEditForUser = (u: User) => {
    const draft = userEdits[u.id];
    return {
      name: draft?.name ?? u.name ?? "",
      email: draft?.email ?? u.email ?? "",
      role: (draft?.role ?? u.role) as User["role"],
      status: (draft?.status ?? u.status) as User["status"],
      phone: (draft?.phone ?? (u as any).phone ?? ""),
    };
  };

  const setEditForUser = (
    userId: string,
    patch: Partial<{ name: string; email: string; role: User["role"]; status: User["status"]; phone: string }>
  ) => {
    setUserEdits((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] ?? {}),
        ...patch,
      },
    }));
  };

  const setEditRole = (u: User, role: User["role"]) => {
    const cur = getEditForUser(u);
    setEditForUser(u.id, { ...cur, role });
  };

  const setEditStatus = (u: User, status: User["status"]) => {
    const cur = getEditForUser(u);
    setEditForUser(u.id, { ...cur, status });
  };

  const setEditName = (u: User, name: string) => {
    const cur = getEditForUser(u);
    setEditForUser(u.id, { ...cur, name });
  };

  const setEditEmail = (u: User, email: string) => {
    const cur = getEditForUser(u);
    setEditForUser(u.id, { ...cur, email });
  };

  const setEditPhone = (u: User, phone: string) => {
    const cur = getEditForUser(u);
    setEditForUser(u.id, { ...cur, phone });
  };

`;

const newContent = before + replacement + after;

// sanity: ensure we didn't accidentally duplicate markers
if (newContent.indexOf(startKey) === -1 || newContent.indexOf(endKey) === -1) {
  console.log("❌ Replacement sanity check failed (markers missing after rewrite).");
  process.exit(1);
}

fs.writeFileSync(file, newContent, "utf8");
console.log("✅ Replaced broken user-edit helper block in AdminDashboardPage.tsx");
