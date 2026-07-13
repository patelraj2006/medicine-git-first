import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Phone, Key, Info, CheckCircle } from "lucide-react";
import api from "../services/api";

function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await api.post("auth/request-otp/", { phone });
      setSuccess(response.data.message || "OTP sent successfully");
      setStep(2);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to send OTP. Please check your mobile number.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await api.post("auth/reset-password/", {
        phone,
        otp,
        new_password: newPassword,
      });
      setSuccess(response.data.message || "Password reset successfully");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to reset password. Check your OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "460px" }}>
        <div className="glass-card" style={{ padding: "40px 32px" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ display: "inline-flex", padding: "12px", borderRadius: "50%", background: "var(--primary-glow)", color: "var(--primary)", marginBottom: "16px" }}>
              <Heart size={32} fill="currentColor" />
            </div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 8px" }}>Forgot Password</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              {step === 1 ? "Enter your mobile number to receive an OTP." : "Enter the OTP and your new password."}
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

          {success && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "var(--success-glow)",
                color: "var(--success)",
                padding: "12px 16px",
                borderRadius: "12px",
                fontSize: "14px",
                marginBottom: "20px",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              <CheckCircle size={16} />
              {success}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOTP}>
              <div className="form-group" style={{ marginBottom: "24px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Phone size={14} /> Mobile Number
                </label>
                <input
                  id="forgot-phone"
                  type="text"
                  required
                  className="form-control"
                  placeholder="Enter your registered mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", padding: "12px", borderRadius: "12px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
                disabled={loading}
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Info size={14} /> OTP
                </label>
                <input
                  id="forgot-otp"
                  type="text"
                  required
                  className="form-control"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: "24px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Key size={14} /> New Password
                </label>
                <input
                  id="forgot-new-password"
                  type="password"
                  required
                  className="form-control"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", padding: "12px", borderRadius: "12px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
                disabled={loading}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          <div style={{ textAlign: "center", marginTop: "24px", fontSize: "14px", color: "var(--text-secondary)" }}>
            Remembered your password?{" "}
            <Link to="/login" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>
              Log in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
