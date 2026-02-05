import { useAuth } from "../state/auth";

export function PendingApprovalPage() {
  const { user } = useAuth();

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 720, margin: "30px auto" }}>
        <h2 style={{ marginTop: 0 }}>Account status</h2>

        {!user ? (
          <p>You are not logged in.</p>
        ) : user.status === "pending" ? (
          <>
            <p>Your account is <b>pending approval</b> by an admin.</p>
            <p><small className="muted">Ask your admin to approve your sign-up in the Admin Dashboard.</small></p>
          </>
        ) : user.status === "disabled" ? (
          <>
            <p>Your account has been <b>disabled</b> by an admin.</p>
            <p><small className="muted">Contact your administrator.</small></p>
          </>
        ) : (
          <p>Your account is active. Use the navigation links above.</p>
        )}
      </div>
    </div>
  );
}
