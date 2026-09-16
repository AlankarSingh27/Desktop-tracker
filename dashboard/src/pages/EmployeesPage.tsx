import { useEffect, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { listEmployees, createEmployee, signConsent, deactivateEmployee } from "../api/endpoints";
import { Employee } from "../types";

const emptyForm = { name: "", email: "", employeeCode: "", department: "", hireDate: "" };

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const data = await listEmployees();
      setEmployees(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await createEmployee({
        ...form,
        hireDate: new Date(form.hireDate).toISOString(),
      });
      setForm(emptyForm);
      setShowForm(false);
      refresh();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create employee");
    }
  }

  async function handleConsent(id: string) {
    await signConsent(id);
    refresh();
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this employee and their device?")) return;
    await deactivateEmployee(id);
    refresh();
  }

  return (
    <div>
      <div className="topbar">
        <h1>Employees</h1>
        <button className="btn" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Add Employee"}
        </button>
      </div>

      {showForm && (
        <form className="card" style={{ marginBottom: 24 }} onSubmit={handleCreate}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)" }}>Full Name</label>
              <input
                className="form-input"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)" }}>Email</label>
              <input
                className="form-input"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)" }}>Employee Code</label>
              <input
                className="form-input"
                required
                value={form.employeeCode}
                onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)" }}>Department</label>
              <input
                className="form-input"
                required
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--muted)" }}>Hire Date</label>
              <input
                className="form-input"
                type="date"
                required
                value={form.hireDate}
                onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
              />
            </div>
          </div>
          <button className="btn" type="submit">
            Create Employee
          </button>
          {error && <div className="error-text">{error}</div>}
        </form>
      )}

      <div className="card">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Consent</th>
                <th>Device Enrolled</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp._id}>
                  <td>
                    <Link className="employee-link" to={`/employees/${emp._id}`}>
                      {emp.name}
                    </Link>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{emp.employeeCode}</div>
                  </td>
                  <td>{emp.department}</td>
                  <td>
                    {emp.consentSignedAt ? (
                      <span className="badge online">Signed</span>
                    ) : (
                      <span className="badge pending">Pending</span>
                    )}
                  </td>
                  <td>
                    {emp.device ? (
                      <span className="badge online">{emp.device.hostname}</span>
                    ) : (
                      <span className="badge offline">Not enrolled</span>
                    )}
                  </td>
                  <td>
                    {emp.isActive ? (
                      <span className="badge online">Active</span>
                    ) : (
                      <span className="badge offline">Inactive</span>
                    )}
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    {!emp.consentSignedAt && (
                      <button className="btn secondary" onClick={() => handleConsent(emp._id)}>
                        Mark Consent Signed
                      </button>
                    )}
                    {emp.isActive && (
                      <button className="btn secondary" onClick={() => handleDeactivate(emp._id)}>
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
