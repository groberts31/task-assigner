import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth";

export function SignupPage() {
  const { signup } = useAuth();
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  
  const [phone, setPhone] = useState("");
const [password, setPassword] = useState("");

  const [role, setRole] = useState<"employee" | "manager">("employee");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="container">
      <div className="auth-shell">
        {/* LEFT: Splash / Brand Panel */}
        <div className="splash-panel">
          <div className="splash-content">
<div className="splash-brand" style={{ alignItems: "center" }}>
  <div className="app-logo-wrap app-logo-lg" title="Tidal Wave Car Wash"><img className="app-logo" 
    src="/logo.webp"
    alt="Tidal Wave Auto Spa"
    style={{
      height: 56,
      width: "auto",
      objectFit: "contain",
    }}
  /></div>

  <span className="badge" style={{ marginLeft: 12 }}>
    Request Access
  </span>
</div>

            <div className="splash-title">
              Create your account.
              <br />
              Get approved.
            </div>

            <div className="splash-subtitle">
              New accounts start in <b>Pending</b>. An admin will approve your sign-up and activate your access.
              Once approved, you’ll see your assignment sheet and print-ready checklist.
            </div>

            <div className="feature-grid">
              <div className="feature">
                <b>🔒 Pending by default</b>
                <small>Helps keep access controlled for staff only.</small>
              </div>
              <div className="feature">
                <b>🧾 Clear task lists</b>
                <small>Employees see exactly what they’ve been assigned.</small>
              </div>
              <div className="feature">
                <b>🖨️ Print-ready</b>
                <small>Turn assignments into a PDF checklist in seconds.</small>
              </div>
              <div className="feature">
                <b>⚡ Fast setup</b>
                <small>Minimal fields now; we can expand later.</small>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <small className="muted">
                Already have an account? Go back to login.
              </small>
            </div>
          </div>
        </div>

        {/* RIGHT: Signup Card */}
        <div className="auth-card">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Sign up</h2>
            <small className="muted">Fill this out to request access. Admin approval is required.</small>

            <label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />

            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@tidalwave.com" />

            


        <label>Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(optional) e.g. 555-123-4567"
        />
              <label>Sign up as</label>
              <select value={role} onChange={(e) => setRole(e.target.value as any)}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
<label>Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="At least 8 characters"
            />

            {msg && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 18,
                  background: "rgba(255, 77, 109, 0.12)",
                  border: "1px solid rgba(255, 77, 109, 0.30)",
                }}
              >
                {msg}
              </div>
            )}

            <div className="auth-actions">
              <button
                className="btn-primary"
                onClick={async () => {
                  setMsg(null);

                  if (!name.trim() || !email.trim() || !password) {
                    setMsg("Please fill out all fields.");
                    return;
                  }

                  const res = await signup({ name: name.trim(), email: email.trim(),
      phone: (phone?.trim() || undefined), password });
                  if (!res.ok) {
                    setMsg(res.message || "Could not sign up.");
                    return;
                  }

                  nav("/login");
                }}
              >
                Create account
              </button>

              <Link to="/login">
                <button className="btn-ghost">Back to login</button>
              </Link>
            </div>

            <hr />

            <small className="muted2">
              After you sign up, ask an admin to approve your account in the Admin Dashboard → Approvals.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
