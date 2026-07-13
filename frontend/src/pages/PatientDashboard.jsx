import { useEffect, useState } from "react";
import {
  Heart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Check,
  RefreshCw,
  BellRing,
  MessageSquare,
  Pill
} from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import api from "../services/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function PatientDashboard() {
  const [stats, setStats] = useState(null);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [medicines, setMedicines] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch Dashboard stats from backend API
      const statsResponse = await api.get(`dashboard/`);
      setStats(statsResponse.data);

      // Fetch today's schedules list
      const [schedulesResponse, notifsResponse, medicinesResponse] = await Promise.all([
        api.get(`schedules/`),
        api.get(`notifications/`),
        api.get(`medicines/`)
      ]);
      
      setNotifications(notifsResponse.data);
      setMedicines(medicinesResponse.data);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayItems = schedulesResponse.data.filter((s) => {
        const sDate = new Date(s.scheduled_time);
        return sDate >= today && sDate < tomorrow;
      });

      todayItems.sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
      setTodaySchedules(todayItems);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notifId) => {
    try {
      await api.patch(`notifications/${notifId}/`, {
        is_read: true
      });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleAction = async (scheduleId, newStatus) => {
    setActionLoading(scheduleId);
    try {
      await api.patch(`schedules/${scheduleId}/`, {
        status: newStatus
      });
      // Refresh local data
      await fetchData();
    } catch (err) {
      console.error(`Error updating schedule to ${newStatus}:`, err);
      alert("Failed to record dose action. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && !stats) {
    return (
      <div className="empty-state">
        <RefreshCw className="empty-icon animate-spin" size={32} />
        <p>Loading dashboard analytics...</p>
      </div>
    );
  }

  // Chart configs
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#131926",
        titleFont: { family: "Outfit" },
        bodyFont: { family: "Outfit" },
        borderColor: "rgba(255, 255, 255, 0.08)",
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#9ca3af", font: { family: "Outfit" } }
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: "rgba(255, 255, 255, 0.04)" },
        ticks: { color: "#9ca3af", font: { family: "Outfit" } }
      }
    }
  };

  const weeklyChartData = {
    labels: stats?.charts?.weekly?.map(w => w.day) || [],
    datasets: [
      {
        fill: true,
        label: "Adherence %",
        data: stats?.charts?.weekly?.map(w => w.adherence) || [],
        borderColor: "rgb(139, 92, 246)",
        backgroundColor: "rgba(139, 92, 246, 0.08)",
        tension: 0.4,
        pointBackgroundColor: "rgb(139, 92, 246)",
        pointHoverRadius: 6,
      }
    ]
  };

  const monthlyChartData = {
    labels: stats?.charts?.monthly?.map(m => m.week) || [],
    datasets: [
      {
        label: "Compliance %",
        data: stats?.charts?.monthly?.map(m => m.adherence) || [],
        backgroundColor: "rgba(16, 185, 129, 0.65)",
        borderColor: "rgb(16, 185, 129)",
        borderWidth: 1,
        borderRadius: 8,
      }
    ]
  };

  return (
    <div className="page-container" style={{ textAlign: "left" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div>
          <h1 style={{ fontSize: "28px", margin: "0 0 4px" }}>Dashboard Overview</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Real-time compliance monitoring, medication stocks, and actionable daily checklist.
          </p>
        </div>
        <button className="btn btn-outline" onClick={fetchData}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="dashboard-grid">
        {/* Adherence Rate */}
        <div className="glass-card metric-card">
          <div className="metric-icon-wrapper metric-success">
            <CheckCircle size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{stats?.adherence_percentage}%</span>
            <span className="metric-label">Adherence Score</span>
          </div>
        </div>

        {/* Active Meds */}
        <div className="glass-card metric-card">
          <div className="metric-icon-wrapper metric-primary">
            <Heart size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{stats?.total_medicines}</span>
            <span className="metric-label">Active Therapies</span>
          </div>
        </div>

        {/* Refills Alert */}
        <div className="glass-card metric-card">
          <div className={`metric-icon-wrapper ${stats?.refill_alerts?.length > 0 ? "metric-danger" : "metric-warning"}`}>
            <AlertTriangle size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{stats?.refill_alerts?.length}</span>
            <span className="metric-label">Refill Warnings</span>
          </div>
        </div>

        {/* Total Reminders */}
        <div className="glass-card metric-card">
          <div className="metric-icon-wrapper metric-warning">
            <Clock size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{stats?.today_doses}</span>
            <span className="metric-label font-sans">Today's Doses</span>
          </div>
        </div>
      </div>

      {/* Refill Alerts Banner */}
      {stats?.refill_alerts?.length > 0 && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "16px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "var(--danger)",
            marginBottom: "8px"
          }}
        >
          <AlertTriangle size={20} />
          <div>
            <strong>Refill Needed:</strong> The stock for{" "}
            {stats.refill_alerts.map(a => `${a.medicine_name} (${a.remaining_pills} left)`).join(", ")}{" "}
            is running low.
          </div>
        </div>
      )}

      {/* Doctor Notifications */}
      {notifications.length > 0 && (
        <div className="glass-card" style={{ padding: "24px", marginBottom: "24px" }}>
          <h2 className="section-title" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <MessageSquare size={20} style={{ color: "var(--primary)" }} />
            Messages from Doctor
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "16px",
                  background: notif.is_read ? "var(--bg-card-hover)" : "var(--primary-glow)",
                  border: notif.is_read ? "1px solid var(--border-glass)" : "1px solid var(--border-glow)",
                  borderRadius: "12px"
                }}
              >
                <div style={{ flex: 1, marginRight: "12px" }}>
                  <p style={{ margin: "0 0 8px 0", fontSize: "14px", lineHeight: "1.5", color: "var(--text-primary)" }}>
                    {notif.message}
                  </p>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Sent by Dr. {notif.doctor_name || "Doctor"} on {new Date(notif.created_at).toLocaleDateString()}
                  </span>
                </div>
                {!notif.is_read && (
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                    onClick={() => handleMarkAsRead(notif.id)}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Main Sections */}
      <div className="dashboard-sections">
        {/* Daily Checklist */}
        <div className="glass-card">
          <h2 className="section-title">
            <BellRing size={20} style={{ color: "var(--primary)" }} />
            Today's Checklist Timeline
          </h2>
          
          {todaySchedules.length === 0 ? (
            <div className="empty-state">
              <CheckCircle className="empty-icon" size={36} style={{ color: "var(--success)" }} />
              <h3>All Clear for Today!</h3>
              <p style={{ marginTop: "6px", fontSize: "14px" }}>
                There are no reminders scheduled for today. New schedules will appear as you add medications.
              </p>
            </div>
          ) : (
            <div className="schedule-list">
              {todaySchedules.map((item) => {
                const isTaken = item.status === "Taken";
                const isMissed = item.status === "Missed";
                const isSkipped = item.status === "Skipped";

                return (
                  <div
                    key={item.id}
                    className={`schedule-item ${
                      isTaken ? "taken" : isMissed ? "missed" : "pending"
                    }`}
                  >
                    <div className="schedule-med-info">
                      <div className="schedule-time-badge">
                        {formatTime(item.scheduled_time)}
                      </div>
                      <div className="schedule-med-details">
                        <h3>{item.medicine_name}</h3>
                        <p>{item.dosage}</p>
                      </div>
                    </div>

                    <div className="schedule-actions">
                      {isTaken ? (
                        <span className="status-badge status-taken">Taken</span>
                      ) : isMissed ? (
                        <span className="status-badge status-missed">Missed</span>
                      ) : isSkipped ? (
                        <span className="status-badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--warning)" }}>Skipped</span>
                      ) : (
                        <>
                          <button
                            className="btn btn-success"
                            onClick={() => handleAction(item.id, "Taken")}
                            disabled={actionLoading === item.id}
                          >
                            <Check size={14} /> Take
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ borderColor: "rgba(245, 158, 11, 0.2)", color: "var(--warning)" }}
                            onClick={() => handleAction(item.id, "Skipped")}
                            disabled={actionLoading === item.id}
                          >
                            Skip
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Charts & Compliance */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Active Medicines Mini List */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Pill size={18} style={{ color: "var(--primary)" }} /> Active Therapies
            </h3>
            {medicines.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>No active medications found for this profile.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {medicines.map((med) => (
                  <div key={med.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glass)", borderRadius: "12px" }}>
                    <div>
                      <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 600 }}>{med.medicine_name}</h4>
                      <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>{med.dosage} • {med.frequency}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className={`status-badge ${med.remaining_pills <= med.refill_threshold ? "status-missed" : "status-taken"}`}>
                        {med.remaining_pills} pills left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Adherence Chart */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>
              Weekly Adherence Trends
            </h3>
            <div style={{ height: "180px", position: "relative" }}>
              <Line data={weeklyChartData} options={chartOptions} />
            </div>
          </div>

          {/* Monthly Adherence Chart */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>
              Monthly Performance
            </h3>
            <div style={{ height: "180px", position: "relative" }}>
              <Bar data={monthlyChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientDashboard;
