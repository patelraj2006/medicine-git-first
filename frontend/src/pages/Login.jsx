import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Key, User, Info } from "lucide-react";
import api from "../services/api";

function Login({ onLoginSuccess }) {
  const [formData, setFormData] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return { 
      username: params.get("username") || "", 
      password: params.get("password") || "" 
    };
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
      const response = await api.post("auth/login/", formData);
      const { access, refresh, user } = response.data;
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("user", JSON.stringify(user));

      onLoginSuccess(user);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Invalid username or password. Please try again.");
    } finally {
      setLoading(false);
    }   
  };
  
  return (
    <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "460px" }}>

        {/* ── Login Card ── */}
        <div className="glass-card" style={{ padding: "40px 32px" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ display: "inline-flex", padding: "12px", borderRadius: "50%", background: "var(--primary-glow)", color: "var(--primary)", marginBottom: "16px" }}>
              <Heart size={32} fill="currentColor" />
            </div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 8px" }}>Welcome to medicine</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              Your AI-powered medicine reminder &amp; adherence tracker.
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
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              <Info size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <User size={14} /> Username
              </label>
              <input
                id="login-username"
                type="text"
                name="username"
                required
                className="form-control"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div className="form-group" style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
                  <Key size={14} /> Password
                </label>
                <Link to="/forgot-password" style={{ fontSize: "13px", color: "var(--primary)", textDecoration: "none" }}>
                  Forgot Password?
                </Link>
              </div>
              <input
                id="login-password"
                type="password"
                name="password"
                required
                className="form-control"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "12px", borderRadius: "12px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "24px", fontSize: "14px", color: "var(--text-secondary)" }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
