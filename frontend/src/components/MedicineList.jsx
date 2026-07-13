import { useEffect, useState } from "react";
import { Pill, ShieldCheck, AlertTriangle, RefreshCw, Search, Trash2, Edit3, Calendar, Clock } from "lucide-react";
import api from "../services/api";

function MedicineList({ selectedPatientId }) {
  const [medicines, setMedicines] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Edit Modal State
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const isDoctor = user?.role === "Doctor";

  useEffect(() => {
    fetchData();
  }, [selectedPatientId]);

  async function fetchData() {
    if (isDoctor && !selectedPatientId) return;
    setLoading(true);
    try {
      const [medRes, schedRes] = await Promise.all([
        api.get(isDoctor ? `medicines/?patient=${selectedPatientId}` : "medicines/"),
        api.get(isDoctor ? `schedules/?patient=${selectedPatientId}` : "schedules/"),
      ]);

      const patientMeds = isDoctor
        ? medRes.data.filter((m) => m.patient === parseInt(selectedPatientId))
        : medRes.data;
      setMedicines(patientMeds);
      setSchedules(schedRes.data);
    } catch (err) {
      console.error("Error fetching medications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this medication? All generated schedules and logs will be permanently deleted.")) {
      return;
    }
    
    try {
      await api.delete(`medicines/${id}/`);
      fetchData();
    } catch (err) {
      console.error("Error deleting medication:", err);
      alert("Failed to delete medication. Check network connections.");
    }
  };

  const handleEditClick = (medicine) => {
    setEditingMedicine(medicine);
    setEditFormData({ ...medicine });
    setEditError("");
  };

  const handleEditChange = (e) => {
    const value = e.target.type === "number" ? parseInt(e.target.value) || 0 : e.target.value;
    setEditFormData({
      ...editFormData,
      [e.target.name]: value,
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError("");

    try {
      await api.put(`medicines/${editingMedicine.id}/`, editFormData);
      setEditingMedicine(null);
      fetchData();
    } catch (err) {
      console.error("Error updating medication:", err);
      setEditError("Failed to update medication details. Ensure all fields are filled.");
    } finally {
      setEditLoading(false);
    }
  };

  // Filter medicines by search query
  const filteredMedicines = medicines.filter((m) =>
    m.medicine_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isDoctor && !selectedPatientId) {
    return (
      <div className="empty-state glass-card">
        <Pill className="empty-icon" size={40} />
        <h3>No Patient Selected</h3>
        <p style={{ marginTop: "8px" }}>
          Please select or register a patient profile in the sidebar to view active medications.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="empty-state">
        <RefreshCw className="empty-icon animate-spin" size={32} />
        <p>Loading medications...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}>
        <div>
          <h1 style={{ fontSize: "28px", margin: "0 0 8px" }}>Active Medications</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            List of all current therapies, dosage guidelines, pill stocks, and schedules.
          </p>
        </div>
        <button className="btn btn-outline" onClick={fetchData}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-card" style={{ display: "flex", alignItems: "center", padding: "16px 24px", position: "relative" }}>
        <input
          type="text"
          className="form-control"
          style={{ paddingLeft: "40px" }}
          placeholder="Search medicines by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Search
          size={18}
          style={{
            position: "absolute",
            left: "38px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
          }}
        />
      </div>

      {/* Medicines Grid */}
      {filteredMedicines.length === 0 ? (
        <div className="empty-state glass-card">
          <Pill className="empty-icon" size={40} />
          <h3>No Medications Found</h3>
          <p style={{ marginTop: "8px" }}>
            Add new medication schedules using the "Add Medicine" page.
          </p>
        </div>
      ) : (
        <div className="medicine-grid">
          {filteredMedicines.map((medicine) => {
            const medSchedules = schedules.filter((s) => s.medicine === medicine.id);
            const totalDoses = medSchedules.length;
            const takenDoses = medSchedules.filter((s) => s.status === "Taken").length;
            
            const needsRefill = medicine.remaining_pills <= medicine.refill_threshold;

            return (
              <div key={medicine.id} className="glass-card med-card" style={{ textAlign: "left" }}>
                <div className="med-header">
                  <div className="med-title">
                    <h3>{medicine.medicine_name}</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{medicine.dosage}</p>
                  </div>
                  <div className="med-badge">
                    <Pill size={14} style={{ color: "var(--primary)", verticalAlign: "middle", marginRight: "4px" }} />
                    {medicine.dosage}
                  </div>
                </div>

                <div className="med-details-grid">
                  <div className="med-detail-item">
                    <span className="med-detail-label">Frequency</span>
                    <span className="med-detail-value">{medicine.frequency}</span>
                  </div>
                  <div className="med-detail-item">
                    <span className="med-detail-label">Dose Times</span>
                    <span className="med-detail-value" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={medicine.reminder_time}>
                      {medicine.reminder_time}
                    </span>
                  </div>
                  <div className="med-detail-item">
                    <span className="med-detail-label">Dose Slots</span>
                    <span className="med-detail-value">{totalDoses} slots</span>
                  </div>
                  <div className="med-detail-item">
                    <span className="med-detail-label">Taken Doses</span>
                    <span className="med-detail-value" style={{ color: "var(--success)" }}>
                      {takenDoses} taken
                    </span>
                  </div>
                </div>

                {medicine.notes && (
                  <div style={{ padding: "8px 12px", background: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--border-glass)", borderRadius: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
                    <strong>Note:</strong> {medicine.notes}
                  </div>
                )}

                {/* Refill Stocks Alert */}
                {needsRefill ? (
                  <div className="refill-alert">
                    <AlertTriangle size={16} />
                    <span>
                      Refill alert! ({medicine.remaining_pills} left / threshold {medicine.refill_threshold})
                    </span>
                  </div>
                ) : (
                  <div className="refill-ok">
                    <ShieldCheck size={16} />
                    <span>Stock OK ({medicine.remaining_pills} remaining pills)</span>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: "10px", marginTop: "8px", borderTop: "1px solid var(--border-glass)", paddingTop: "12px" }}>
                  <button className="btn btn-outline" style={{ flex: 1, padding: "6px" }} onClick={() => handleEditClick(medicine)}>
                    <Edit3 size={14} /> Edit
                  </button>
                  <button className="btn btn-outline" style={{ borderColor: "rgba(239, 68, 68, 0.2)", color: "var(--danger)", flex: 1, padding: "6px" }} onClick={() => handleDelete(medicine.id)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Medication Modal */}
      {editingMedicine && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h2>Edit Medication Details</h2>
              <button className="btn btn-outline btn-icon-only" style={{ borderRadius: "50%" }} onClick={() => setEditingMedicine(null)}>✕</button>
            </div>

            {editError && (
              <div style={{ color: "var(--danger)", background: "var(--danger-glow)", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", marginBottom: "16px" }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ textAlign: "left" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
                <div className="form-group">
                  <label>Medicine Name</label>
                  <input
                    type="text"
                    name="medicine_name"
                    required
                    className="form-control"
                    value={editFormData.medicine_name || ""}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="form-group">
                  <label>Dosage</label>
                  <input
                    type="text"
                    name="dosage"
                    required
                    className="form-control"
                    value={editFormData.dosage || ""}
                    onChange={handleEditChange}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
                <div className="form-group">
                  <label>Frequency</label>
                  <select
                    name="frequency"
                    className="form-control"
                    value={editFormData.frequency || "Once Daily"}
                    onChange={handleEditChange}
                  >
                    <option value="Once Daily">Once Daily</option>
                    <option value="Twice Daily">Twice Daily</option>
                    <option value="Three Times Daily">Three Times Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Custom Schedule">Custom Schedule</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}><Clock size={14} /> Dose Times (Comma separated)</label>
                  <input
                    type="text"
                    name="reminder_time"
                    required
                    className="form-control"
                    value={editFormData.reminder_time || ""}
                    onChange={handleEditChange}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}><Calendar size={14} /> Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    required
                    className="form-control"
                    value={editFormData.start_date || ""}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}><Calendar size={14} /> End Date</label>
                  <input
                    type="date"
                    name="end_date"
                    required
                    className="form-control"
                    value={editFormData.end_date || ""}
                    onChange={handleEditChange}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div className="form-group">
                  <label>Total Pills</label>
                  <input
                    type="number"
                    name="total_pills"
                    required
                    className="form-control"
                    value={editFormData.total_pills || 30}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="form-group">
                  <label>Remaining Pills</label>
                  <input
                    type="number"
                    name="remaining_pills"
                    required
                    className="form-control"
                    value={editFormData.remaining_pills || 30}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="form-group">
                  <label>Refill Warn Threshold</label>
                  <input
                    type="number"
                    name="refill_threshold"
                    required
                    className="form-control"
                    value={editFormData.refill_threshold || 5}
                    onChange={handleEditChange}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label>Notes</label>
                <textarea
                  name="notes"
                  className="form-control"
                  value={editFormData.notes || ""}
                  onChange={handleEditChange}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setEditingMedicine(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default MedicineList;