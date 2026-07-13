import { useEffect, useState } from "react";
import { Search, Calendar, Check, X, Clock, RefreshCw, Info } from "lucide-react";
import api from "../services/api";

function ReminderHistory({ selectedPatientId }) {
  const [schedules, setSchedules] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
      const [schedRes, medRes] = await Promise.all([
        api.get(isDoctor ? `schedules/?patient=${selectedPatientId}` : "schedules/"),
        api.get(isDoctor ? `medicines/?patient=${selectedPatientId}` : "medicines/"),
      ]);

      const patientMeds = isDoctor
        ? medRes.data.filter((m) => m.patient === parseInt(selectedPatientId))
        : medRes.data;
      setMedicines(patientMeds);

      const medIds = patientMeds.map((m) => m.id);
      const patientSchedules = isDoctor
        ? schedRes.data.filter((s) => medIds.includes(s.medicine))
        : schedRes.data;

      // Sort chronologically (newest first)
      patientSchedules.sort(
        (a, b) => new Date(b.scheduled_time) - new Date(a.scheduled_time)
      );

      setSchedules(patientSchedules);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  };

  const getMedicineName = (medId) => {
    const med = medicines.find((m) => m.id === medId);
    return med ? med.medicine_name : "Unknown Medicine";
  };

  const getMedicineDosage = (medId) => {
    const med = medicines.find((m) => m.id === medId);
    return med ? med.dosage : "";
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Filtering logic
  const filteredSchedules = schedules.filter((s) => {
    const medName = getMedicineName(s.medicine).toLowerCase();
    const queryMatch = medName.includes(searchQuery.toLowerCase());
    
    if (statusFilter === "all") return queryMatch;
    return queryMatch && s.status.toLowerCase() === statusFilter.toLowerCase();
  });

  if (isDoctor && !selectedPatientId) {
    return (
      <div className="empty-state glass-card">
        <Calendar className="empty-icon" size={40} />
        <h3>No Patient Selected</h3>
        <p style={{ marginTop: "8px" }}>
          Please select a patient profile from the sidebar to view their compliance history.
        </p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}>
        <div>
          <h1 style={{ fontSize: "28px", margin: "0 0 8px" }}>Adherence & Reminder History</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Review past dose schedules, checklist adherence logs, and response times.
          </p>
        </div>
        <button className="btn btn-outline" onClick={fetchData}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-card"
        style={{
          display: "flex",
          gap: "16px",
          alignItems: "center",
          flexWrap: "wrap",
          padding: "16px 24px",
          textAlign: "left"
        }}
      >
        <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: "40px" }}
            placeholder="Search by medicine name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: 500 }}>
            Filter by Status:
          </label>
          <select
            className="patient-select"
            style={{ minWidth: "130px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Logs</option>
            <option value="pending">Pending</option>
            <option value="taken">Taken</option>
            <option value="missed">Missed</option>
            <option value="skipped">Skipped</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <RefreshCw className="empty-icon animate-spin" size={32} />
          <p>Loading history logs...</p>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="empty-state glass-card">
          <Calendar className="empty-icon" size={40} />
          <h3>No Records Found</h3>
          <p style={{ marginTop: "8px" }}>
            No history logs match your active search filters.
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "15px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-glass)" }}>
                <th style={{ padding: "18px 24px", color: "var(--text-secondary)", fontWeight: 500 }}>Medicine</th>
                <th style={{ padding: "18px 24px", color: "var(--text-secondary)", fontWeight: 500 }}>Dosage</th>
                <th style={{ padding: "18px 24px", color: "var(--text-secondary)", fontWeight: 500 }}>Scheduled Time</th>
                <th style={{ padding: "18px 24px", color: "var(--text-secondary)", fontWeight: 500 }}>Status</th>
                <th style={{ padding: "18px 24px", color: "var(--text-secondary)", fontWeight: 500 }}>Taken At</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid var(--border-glass)",
                    transition: "var(--transition)",
                  }}
                  className="table-row-hover"
                >
                  <td style={{ padding: "16px 24px", fontWeight: 600 }}>{getMedicineName(item.medicine)}</td>
                  <td style={{ padding: "16px 24px", color: "var(--text-secondary)" }}>
                    {getMedicineDosage(item.medicine)}
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Clock size={14} style={{ color: "var(--text-muted)" }} />
                      {formatDateTime(item.scheduled_time)}
                    </div>
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    <span
                      className={`status-badge ${
                        item.status === "Taken"
                          ? "status-taken"
                          : item.status === "Pending"
                          ? "status-pending"
                          : item.status === "Skipped"
                          ? "status-pending"
                          : "status-missed"
                      }`}
                      style={{
                        background: item.status === "Skipped" ? "rgba(245, 158, 11, 0.15)" : "",
                        color: item.status === "Skipped" ? "var(--warning)" : "",
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: "16px 24px", color: "var(--text-secondary)" }}>
                    {item.status === "Taken" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--success)" }}>
                        <Check size={14} />
                        {formatDateTime(item.taken_at)}
                      </div>
                    ) : item.status === "Missed" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--danger)" }}>
                        <X size={14} />
                        Missed Dose
                      </div>
                    ) : item.status === "Skipped" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--warning)" }}>
                        <Info size={14} />
                        Skipped Dose
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>Not taken yet</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ReminderHistory;
