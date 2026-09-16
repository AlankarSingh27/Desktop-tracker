import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1 style={{ fontSize: 18, margin: "0 0 4px" }}>Activity Admin</h1>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 20px" }}>
          Sign in to view the monitoring dashboard.
        </p>

        <label style={{ fontSize: 12, color: "var(--muted)" }}>Email</label>
        <input
          className="form-input"
          style={{ marginTop: 4, marginBottom: 14 }}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label style={{ fontSize: 12, color: "var(--muted)" }}>Password</label>
        <input
          className="form-input"
          style={{ marginTop: 4, marginBottom: 20 }}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="btn" style={{ width: "100%" }} type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        {error && <div className="error-text">{error}</div>}
      </form>
    </div>
  );
}
