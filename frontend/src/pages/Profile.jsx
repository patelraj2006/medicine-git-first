import { useState, useEffect } from "react";
import { User, Plus, Trash2, Link2 } from "lucide-react";
import api from "../services/api";

function Profile({ onPatientChanged }) {
  const [profile, setProfile] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
  });
  
  const [patients, setPatients] = useState([]);
  const [newPatient, setNewPatient] = useState({ full_name: "", email: "", phone: "" });
  
  const [loading, setLoading] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [patientMessage, setPatientMessage] = useState({ type: "", text: "" });

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [activePatientLink, setActivePatientLink] = useState({ name: "", url: "", username: "" });
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = (p) => {
    const username = p.patient_username || (p.email.split('@')[0] + p.id);
    const loginUrl = `${window.location.origin}/login?username=${encodeURIComponent(username)}&password=Patient123!`;
    setActivePatientLink({
      name: p.full_name,
      url: loginUrl,
      username: username
    });
    setShowLinkModal(true);
    setCopied(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(activePatientLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link: ", err);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchPatients();
  }, []);

  async function fetchProfile() {
    try {
      const response = await api.get("auth/profile/");
      setProfile({
        email: response.data.email || "",
        first_name: response.data.first_name || "",
        last_name: response.data.last_name || "",
        password: "",
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchPatients() {
    try {
      const response = await api.get("patients/");
      setPatients(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      await api.put("auth/profile/", profile);
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setProfile(prev => ({ ...prev, password: "" }));
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to update profile details." });
    } finally {
      setLoading(false);
    }
  };

  const handlePatientChange = (e) => {
    setNewPatient({ ...newPatient, [e.target.name]: e.target.value });
  };

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    setPatientLoading(true);
    setPatientMessage({ type: "", text: "" });

    try {
      await api.post("patients/", newPatient);
      setPatientMessage({ type: "success", text: "Patient profile created successfully!" });
      setNewPatient({ full_name: "", email: "", phone: "" });
      fetchPatients();
      if (onPatientChanged) onPatientChanged();
    } catch (err) {
      console.error(err);
      setPatientMessage({ type: "error", text: "Failed to create profile. Email must be unique." });
    } finally {
      setPatientLoading(false);
    }
  };

  const handleDeletePatient = async (id) => {
    if (!confirm("Are you sure you want to delete this patient profile? All associated medicines and schedules will be permanently deleted.")) {
      return;
    }

    try {
      await api.delete(`patients/${id}/`);
      fetchPatients();
      if (onPatientChanged) onPatientChanged();
    } catch (err) {
      console.error(err);
      alert("Failed to delete patient profile.");
    }
  };

  return (
    <div className="page-container" style={{ textAlign: "left" }}>
      <div>
        <h1 style={{ fontSize: "28px", margin: "0 0 8px" }}>Profile & Patient Settings</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Manage your account credentials, security details, and registered patient profiles.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginTop: "12px" }}>
        
        {/* Left Side: Account Info */}
        <div className="glass-card">
          <h2 style={{ fontSize: "18px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <User size={18} style={{ color: "var(--primary)" }} />
            Account Security Settings
          </h2>

          {message.text && (
            <div
              style={{
                background: message.type === "success" ? "var(--success-glow)" : "var(--danger-glow)",
                color: message.type === "success" ? "var(--success)" : "var(--danger)",
                padding: "12px 16px",
                borderRadius: "12px",
                fontSize: "14px",
                marginBottom: "20px",
                border: `1px solid ${message.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
              }}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleProfileSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  className="form-control"
                  value={profile.first_name}
                  onChange={handleProfileChange}
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  className="form-control"
                  value={profile.last_name}
                  onChange={handleProfileChange}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                required
                className="form-control"
                value={profile.email}
                onChange={handleProfileChange}
              />
            </div>

            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label>New Password (Leave blank to keep current)</label>
              <input
                type="password"
                name="password"
                className="form-control"
                placeholder="••••••••"
                value={profile.password}
                onChange={handleProfileChange}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Updating..." : "Save Credentials"}
            </button>
          </form>
        </div>

        {/* Right Side: Patients profiles */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Add Patient */}
          <div className="glass-card">
            <h2 style={{ fontSize: "18px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Plus size={18} style={{ color: "var(--primary)" }} />
              Add Managed Profile
            </h2>

            {patientMessage.text && (
              <div
                style={{
                  background: patientMessage.type === "success" ? "var(--success-glow)" : "var(--danger-glow)",
                  color: patientMessage.type === "success" ? "var(--success)" : "var(--danger)",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  marginBottom: "20px",
                  border: `1px solid ${patientMessage.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
                }}
              >
                {patientMessage.text}
              </div>
            )}

            <form onSubmit={handlePatientSubmit}>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label>Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="e.g. Sarah Doe"
                  className="form-control"
                  value={newPatient.full_name}
                  onChange={handlePatientChange}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="sarah@example.com"
                  className="form-control"
                  value={newPatient.email}
                  onChange={handlePatientChange}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="+1 555-9012"
                  className="form-control"
                  value={newPatient.phone}
                  onChange={handlePatientChange}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={patientLoading} style={{ width: "100%", justifyContent: "center" }}>
                {patientLoading ? "Creating..." : "Add Profile"}
              </button>
            </form>
          </div>

          {/* Managed Patients List */}
          <div className="glass-card">
            <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Managed Profiles</h2>
            {patients.length === 0 ? (
              <div className="empty-state" style={{ padding: "20px 0" }}>
                <p>No patient profiles registered under this account.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {patients.map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glass)" }}>
                    <div>
                      <h4 style={{ fontWeight: 600 }}>{p.full_name}</h4>
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{p.email} | {p.phone}</p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn btn-outline btn-icon-only"
                        title="Generate Login Link"
                        style={{ borderColor: "rgba(16, 185, 129, 0.2)", color: "var(--success)" }}
                        onClick={() => handleGenerateLink(p)}
                      >
                        <Link2 size={16} />
                      </button>
                      <button
                        className="btn btn-outline btn-icon-only"
                        style={{ borderColor: "rgba(239, 68, 68, 0.2)", color: "var(--danger)" }}
                        onClick={() => handleDeletePatient(p.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Magic Login Link Modal */}
      {showLinkModal && (
        <div className="modal-backdrop" style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div className="glass-card" style={{
            width: "90%",
            maxWidth: "500px",
            padding: "28px",
            background: "rgba(20, 25, 38, 0.95)",
            border: "1px solid var(--border-glass)",
            borderRadius: "16px",
            textAlign: "left"
          }}>
            <h3 style={{ margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: "10px", fontSize: "20px", fontWeight: 700 }}>
              <Link2 size={22} style={{ color: "var(--success)" }} /> Magic Login Link
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.5", marginBottom: "20px" }}>
              Share this pre-configured link with <strong>{activePatientLink.name}</strong> to allow them to bypass manual credential input and log in directly to their patient portal.
            </p>

            <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-glass)", borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Username:</span>
                <strong style={{ color: "var(--text-primary)" }}>{activePatientLink.username}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Password:</span>
                <strong style={{ color: "var(--text-primary)" }}>Patient123!</strong>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "8px" }}>Generated Link</label>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  readOnly
                  value={activePatientLink.url}
                  className="form-control"
                  style={{ flex: 1, background: "rgba(255, 255, 255, 0.05)", cursor: "text", fontSize: "13px" }}
                  onClick={(e) => e.target.select()}
                />
                <button
                  onClick={handleCopyLink}
                  className={`btn ${copied ? "btn-success" : "btn-primary"}`}
                  style={{ minWidth: "100px", justifyContent: "center" }}
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowLinkModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
