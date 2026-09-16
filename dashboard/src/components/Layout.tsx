import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Layout() {
  const { admin, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>Activity Admin</h2>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Live Dashboard
          </NavLink>
          <NavLink to="/employees" className={({ isActive }) => (isActive ? "active" : "")}>
            Employees
          </NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => (isActive ? "active" : "")}>
            Leaderboard
          </NavLink>
          <NavLink to="/downloads" className={({ isActive }) => (isActive ? "active" : "")}>
            Downloads
          </NavLink>
        </nav>
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid var(--panel-border)" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
            {admin?.name} ({admin?.role})
          </div>
          <button className="btn secondary" style={{ width: "100%" }} onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
