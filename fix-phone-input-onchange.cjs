const fs = require("fs");

const file = "src/pages/admin/AdminDashboardPage.tsx";
let s = fs.readFileSync(file, "utf8");

// Find the phone input that follows the "Phone (optional)" label and replace ONLY its onChange handler.
const re =
/(<label[^>]*>\s*Phone\s*\(optional\)\s*<\/label>\s*<input[\s\S]*?)(onChange=\{\s*[\s\S]*?\}\s*)([\s\S]*?(?:placeholder=|\/>))/m;

if (!re.test(s)) {
  console.log("❌ Could not locate the Phone (optional) input block to patch.");
  console.log("   Make sure the label text is exactly: Phone (optional)");
  process.exit(1);
}

s = s.replace(re, (match, head, _oldOnChange, tail) => {
  const newOnChange =
`onChange={(ev) => setEditPhone(u, ev.target.value)}
                          `;
  return head + newOnChange + tail;
});

fs.writeFileSync(file, s, "utf8");
console.log("✅ Patched Phone input onChange to use setEditPhone(u, …)");
