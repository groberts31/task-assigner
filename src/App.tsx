import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./state/auth";
import type { ReactNode } from "react";
import { TopBar } from "./components/TopBar";

import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { PendingApprovalPage } from "./pages/PendingApprovalPage";
import { EmployeeAssignmentsPage } from "./pages/EmployeeAssignmentsPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { SchedulePage } from "./pages/schedule/SchedulePage";
import { SplashPage } from "./pages/SplashPage";

function Protected({ children }: { children: ReactNode }) {
  const { user, hydrated } = useAuth();
  if (!hydrated) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PrivOnly({ children }: { children: ReactNode }) {
  const { user, hydrated } = useAuth();
  if (!hydrated) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin" && user.role !== "manager") return <Navigate to="/me" replace />;
  return <>{children}</>;
}

function Landing() {
  const { user, hydrated } = useAuth();
  if (!hydrated) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.status !== "active") return <Navigate to="/pending" replace />;
  if (user.role === "admin" || user.role === "manager") return <Navigate to="/admin" replace />;
  return <Navigate to="/me" replace />;
}

export default function App() {
  return (
    <>
      <TopBar />
      <Routes>
      <Route path="/" element={<SplashPage />} />
        <Route path="/" element={<Landing />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/pending" element={<PendingApprovalPage />} />

        <Route
          path="/me"
          element={
            <Protected>
              <EmployeeAssignmentsPage />
            </Protected>
          }
        />

        <Route
          path="/admin"
          element={
            <PrivOnly>
              <AdminDashboardPage />
            </PrivOnly>
          }
        />

        <Route
          path="/schedule"
          element={
            <Protected>
              <SchedulePage />
            </Protected>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
