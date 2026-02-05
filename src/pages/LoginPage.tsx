import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth";

function landingPath(role: string | undefined) {
  if (role === "admin" || role === "manager") return "/admin";
  return "/me";
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Prefill (dev convenience). Change/remove later.
  const [email, setEmail] = useState("admin@tidalwave.local");
  const [password, setPassword] = useState("Admin123!");

  const [errMsg, setErrMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length > 0 && !busy;
  }, [email, password, busy]);

  useEffect(() => {
    if (user) {
      navigate(landingPath(user.role), { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setErrMsg("");

    const e = email.trim().toLowerCase();
    const p = password;

    if (!e || !p) {
      setErrMsg("Please enter both email and password.");
      return;
    }

    try {
      setBusy(true);

      // Your auth ctx should expose login(email, password)
      const res: any = await login(e, p);

      // If login returns { ok: false, message }, show message
      if (res && res.ok === false) {
        setErrMsg(res.message || "Login failed. Please check your credentials.");
        return;
      }

      // If your auth updates user asynchronously, this redirect may be redundant,
      // but it's safe and makes UX feel instant.
      navigate(landingPath((res?.user?.role as string) || user?.role), { replace: true });
    } catch (err: any) {
      setErrMsg(err?.message || "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 28 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        {/* Left splash panel */}
        <div
          style={{
            borderRadius: 18,
            padding: 22,
            background:
              "linear-gradient(135deg, rgba(20,25,40,0.95), rgba(10,12,18,0.92))",
            border: "1px solid rgba(255,255,255,0.08)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: -200,
              background:
                "radial-gradient(circle at 20% 20%, rgba(80,120,255,0.28), transparent 55%), radial-gradient(circle at 80% 40%, rgba(0,220,180,0.18), transparent 55%), radial-gradient(circle at 60% 90%, rgba(255,180,0,0.16), transparent 55%)",
              filter: "blur(0px)",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="app-logo-wrap" aria-label="Logo" title="Tidal Wave Car Wash">
                {/* Uses /public/logo.webp as you set in TopBar */}
                <img className="app-logo" src="/logo.webp" alt="Tidal Wave Logo" />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: 0.2 }}>
                  TWE Daily Checklist
                </div>
                <div style={{ color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
                  Assign tasks • Track completion • Build better shifts
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
              <div style={{ fontWeight: 900, marginBottom: 8, color: "#fff" }}>What you can do:</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Create employee task checklists (per shift / per day)</li>
                <li>Managers manage only their employees; Admin can manage all</li>
                <li>Generate clean PDFs for assignments</li>
                <li>Run weekly schedules inside the Schedule page</li>
              </ul>
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 14,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              <div style={{ fontWeight: 900, color: "#fff" }}>Tip:</div>
              <div style={{ marginTop: 4 }}>
                Press <b>Return</b> to login after typing your password.
              </div>
            </div>
          </div>
        </div>

        {/* Right login card */}
        <div
          style={{
            borderRadius: 18,
            padding: 18,
            background: "rgba(10, 12, 18, 0.88)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 18, color: "#fff" }}>Log in</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
            Enter your credentials to continue.
          </div>

          <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
            <label style={{ display: "block", marginTop: 10, fontSize: 13, opacity: 0.9 }}>
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              placeholder="you@company.com"
              style={{ width: "100%", marginTop: 6 }}
            />

            <label style={{ display: "block", marginTop: 12, fontSize: 13, opacity: 0.9 }}>
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              style={{ width: "100%", marginTop: 6 }}
            />

            {errMsg && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(255,60,60,0.12)",
                  border: "1px solid rgba(255,60,60,0.25)",
                  color: "#ffb3b3",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                {errMsg}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={!canSubmit}
              style={{ width: "100%", marginTop: 14 }}
            >
              {busy ? "Logging in..." : "Login"}
            </button>

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <Link to="/" className="btn-ghost" style={{ flex: 1, textAlign: "center" }}>
                Back
              </Link>
              <Link to="/signup" className="btn-ghost" style={{ flex: 1, textAlign: "center" }}>
                Sign up
              </Link>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, textAlign: "center" }}>
              Admin must approve new accounts before dashboard access.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
