import { Link } from "react-router-dom";

export function SplashPage() {
  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 40 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        {/* Left: Hero */}
        <div
          className="card"
          style={{
            padding: 22,
            borderRadius: 18,
            background:
              "radial-gradient(1200px 600px at 10% 0%, rgba(84,112,255,0.35), rgba(10,12,18,0.92) 55%), rgba(10,12,18,0.92)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                overflow: "hidden",
                background: "rgba(255,255,255,0.08)",
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
              aria-label="Logo"
              title="Tidal Wave Car Wash"
            >
              <img
                src="/logo.webp"
                alt="Tidal Wave Logo"
                style={{ width: "100%", height: "100%", objectFit: "contain", padding: 10 }}
              />
            </div>

            <div>
              <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: 0.2, color: "#fff" }}>
                TWE Daily Checklist
              </div>
              <div style={{ opacity: 0.85, color: "#cfd6ff" }}>
                Daily tasks • Employee assignments • Schedules • Team accountability
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, color: "#fff" }}>
            <div style={{ fontSize: 42, fontWeight: 950, lineHeight: 1.05 }}>
              Run your car wash
              <br />
              like a pro — every shift.
            </div>

            <div style={{ marginTop: 14, maxWidth: 640, fontSize: 15, color: "rgba(255,255,255,0.82)", lineHeight: 1.6 }}>
              Use one dashboard to assign tasks, manage employees, keep schedules organized, and keep your team consistent.
              Designed for fast-paced, multi-role operations.
            </div>

            <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="btn-primary" to="/login" style={{ textDecoration: "none" }}>
                Login
              </Link>
              <Link className="btn-ghost" to="/signup" style={{ textDecoration: "none" }}>
                Sign Up
              </Link>
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              <div style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontWeight: 900, color: "#fff" }}>Assignments</div>
                <div style={{ opacity: 0.8, color: "#cfd6ff", fontSize: 13, marginTop: 4 }}>
                  Pick tasks, send to employees, track completion.
                </div>
              </div>
              <div style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontWeight: 900, color: "#fff" }}>Schedules</div>
                <div style={{ opacity: 0.8, color: "#cfd6ff", fontSize: 13, marginTop: 4 }}>
                  Build weekly schedules and keep shifts clear.
                </div>
              </div>
              <div style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontWeight: 900, color: "#fff" }}>Consistency</div>
                <div style={{ opacity: 0.8, color: "#cfd6ff", fontSize: 13, marginTop: 4 }}>
                  Standardize routines across every day & team.
                </div>
              </div>
            </div>
          </div>

          {/* Decorative glow */}
          <div
            style={{
              position: "absolute",
              right: -120,
              top: -120,
              width: 360,
              height: 360,
              borderRadius: 999,
              background: "radial-gradient(circle at 30% 30%, rgba(84,112,255,0.55), rgba(84,112,255,0) 70%)",
              filter: "blur(2px)",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Right: Quick Start / placeholders */}
        <div
          className="card"
          style={{
            padding: 18,
            borderRadius: 18,
            background: "rgba(10,12,18,0.88)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 16, color: "#fff" }}>Quick Start</div>
          <div style={{ marginTop: 8, color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 1.6 }}>
            Placeholders for later:
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontWeight: 900, color: "#fff" }}>📌 Create your team</div>
              <div style={{ opacity: 0.8, color: "#cfd6ff", fontSize: 13, marginTop: 4 }}>
                Add employees and store phone numbers for quick assignment.
              </div>
            </div>

            <div style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontWeight: 900, color: "#fff" }}>🧾 Build task templates</div>
              <div style={{ opacity: 0.8, color: "#cfd6ff", fontSize: 13, marginTop: 4 }}>
                Standardize tasks for opening, mid-shift, and closing.
              </div>
            </div>

            <div style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontWeight: 900, color: "#fff" }}>🗓️ Schedule the week</div>
              <div style={{ opacity: 0.8, color: "#cfd6ff", fontSize: 13, marginTop: 4 }}>
                Assign shifts and adjust quickly when someone calls out.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="btn-primary" to="/signup" style={{ textDecoration: "none" }}>
              Create Account
            </Link>
            <Link className="btn-ghost" to="/login" style={{ textDecoration: "none" }}>
              Existing User Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
