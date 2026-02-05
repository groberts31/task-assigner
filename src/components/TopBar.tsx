import { useNavigate } from "react-router-dom";
import { TipsTicker } from "./TipsTicker";
import { useAuth } from "../state/auth";

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const isPriv = user.role === "admin" || user.role === "manager";

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(10, 12, 18, 0.92)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="container" style={{ paddingTop: 12, paddingBottom: 12 }}>
        {/* Ticker inside container so it lines up with content */}
        <div style={{ marginBottom: 10 }}>
          <TipsTicker />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: "space-between",
          }}
        >
          {/* Left side: Logo + Name */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="app-logo-wrap" aria-label="Logo" title="Tidal Wave Car Wash">
              <img className="app-logo" src="/logo.webp" alt="Tidal Wave Logo" />
            </div>

            <div>
              <div style={{ fontWeight: 900, letterSpacing: 0.2, color: "#fff" }}>
                Tidal Wave Car Wash
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, color: "#cfd6ff" }}>
                {user.name} • {user.role}
              </div>
            </div>
          </div>

          {/* Right side: Buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {isPriv ? (
              <button className="btn-ghost" onClick={() => navigate("/admin")}>
                Dashboard
              </button>
            ) : (
              <button className="btn-ghost" onClick={() => navigate("/me")}>
                My Tasks
              </button>
            )}

            <button className="btn-ghost" onClick={() => navigate("/schedule")}>
              Schedule
            </button>

            <button
              className="btn-danger"
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
