import { useState } from "react";
import { Plus, Activity, Heart, Calendar } from "lucide-react";
import api from "../services/api";

function Navbar({
  activeTab,
  setActiveTab,
  selectedPatientId,
  setSelectedPatientId,
  patients,
  onPatientCreated,
}) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await api.post("patients/", formData);
      onPatientCreated(response.data.id);
      setShowModal(false);
      setFormData({ full_name: "", email: "", phone: "" });
    } catch (err) {
      console.error(err);
      setError("Failed to create patient. Make sure the email is unique.");
    }
  };

  return (
    <>
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">
            <Heart className="heart-icon" fill="currentColor" size={28} />
            <span>medicine</span>
          </div>
        </div>

        <nav className="nav-tabs">
          <button
            className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <Activity size={18} />
            Dashboard
          </button>
          <button
            className={`tab-btn ${activeTab === "medicines" ? "active" : ""}`}
            onClick={() => setActiveTab("medicines")}
          >
            <Heart size={18} />
            Medications
          </button>
          <button
            className={`tab-btn ${activeTab === "add" ? "active" : ""}`}
            onClick={() => setActiveTab("add")}
          >
            <Plus size={18} />
            Add Medicine
          </button>
          <button
            className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <Calendar size={18} />
            Adherence Logs
          </button>
        </nav>

        <div className="patient-control">
          <select
            className="patient-select"
            value={selectedPatientId || ""}
            onChange={(e) => setSelectedPatientId(e.target.value)}
          >
            <option value="" disabled>
              Select Patient...
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary btn-icon-only"
            title="Create New Patient"
            onClick={() => setShowModal(true)}
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Patient Profile</h2>
              <button
                className="btn btn-outline btn-icon-only"
                style={{ borderRadius: "50%" }}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            
            {error && (
              <div
                style={{
                  color: "var(--danger)",
                  background: "var(--danger-glow)",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  marginBottom: "16px",
                  border: "1px solid rgba(239, 68, 68, 0.2)"
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="e.g. John Doe"
                  className="form-control"
                  value={formData.full_name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="e.g. john@example.com"
                  className="form-control"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="e.g. +1 555-0199"
                  className="form-control"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;
