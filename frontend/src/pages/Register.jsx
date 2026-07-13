import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Key, User, Mail, Info } from "lucide-react";
import api from "../services/api";

function Register({ onRegisterSuccess }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "Doctor",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("auth/register/", formData);
      const { access, refresh, user } = response.data;
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("user", JSON.stringify(user));
      
      onRegisterSuccess(user);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        const errors = err.response.data;
        if (typeof errors === "string") {
          setError(errors);
        } else {
          const firstKey = Object.keys(errors)[0];
          if (Array.isArray(errors[firstKey])) {
            setError(errors[firstKey][0]);
          } else if (typeof errors[firstKey] === "string") {
            setError(errors[firstKey]);
          } else {
            setError("Registration failed. Please check your details.");
          }
        }
      } else {
        setError("Registration failed. Could not connect to the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div className="glass-card" style={{ width: "100%", maxWidth: "440px", padding: "40px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ display: "inline-flex", padding: "12px", borderRadius: "50%", background: "var(--primary-glow)", color: "var(--primary)", marginBottom: "16px" }}>
            <Heart size={32} fill="currentColor" />
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 8px" }}>Create Account</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Register to manage schedules and compliance reports.
          </p>
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--danger-glow)",
              color: "var(--danger)",
              padding: "12px 16px",
              borderRadius: "12px",
              fontSize: "14px",
              marginBottom: "20px",
              border: "1px solid rgba(239, 68, 68, 0.2)"
            }}
          >
            <Info size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                name="first_name"
                className="form-control"
                placeholder="John"
                value={formData.first_name}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                name="last_name"
                className="form-control"
                placeholder="Doe"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <User size={14} /> Username
            </label>
            <input
              type="text"
              name="username"
              required
              className="form-control"
              placeholder="Pick a unique username"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Mail size={14} /> Email Address
            </label>
            <input
              type="email"
              name="email"
              required
              className="form-control"
              placeholder="yourname@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "24px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Key size={14} /> Password
            </label>
            <input
              type="password"
              name="password"
              required
              className="form-control"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "24px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <User size={14} /> Role
            </label>
            <select
              name="role"
              required
              className="form-control"
              value={formData.role || "Doctor"}
              onChange={handleChange}
              style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-glass)", background: "var(--surface-dark)", color: "var(--text)" }}
            >
              <option value="Doctor">I am a Doctor</option>
              <option value="Patient">I am a Patient</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "12px", borderRadius: "12px", display: "flex", justifyContent: "center" }}
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px", fontSize: "14px", color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
