import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Heart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Check,
  RefreshCw,
  Bell,
  BellRing,
  Pill,
  Send,
  Plus,
  X,
  Trash2,
  CheckCheck,
  Sparkles,
  ChevronDown,
  MessageSquare
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

// ─── Quick Template Messages ───────────────────────────────────────────────
const QUICK_TEMPLATES = [
  { label: "Refill Reminder", text: "Your medication is running low. Please visit the clinic or pharmacy to get a refill soon." },
  { label: "Missed Dose Alert", text: "We noticed you missed a scheduled dose today. Please take your medication as soon as possible or contact us for guidance." },
  { label: "Appointment Reminder", text: "This is a reminder about your upcoming doctor appointment. Please ensure you take your medications as prescribed beforehand." },
  { label: "Great Adherence 🎉", text: "Excellent work! Your medication adherence has been outstanding this week. Keep it up!" },
  { label: "General Check-in", text: "Hi! Your doctor would like to check in on how you are feeling with your current medication plan. Please reply or call the clinic." },
];

// ─── Toast Notification ───────────────────────────────────────────────────
function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)", icon: "#10b981" },
    error: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", icon: "#ef4444" },
  };
  const c = colors[type];

  return (
    <div style={{
      position: "fixed", bottom: "28px", right: "28px", zIndex: 9999,
      display: "flex", alignItems: "center", gap: "12px",
      padding: "14px 20px", borderRadius: "14px",
      background: c.bg, border: `1px solid ${c.border}`,
      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      backdropFilter: "blur(12px)",
      animation: "toastSlideIn 0.35s cubic-bezier(0.2,0.8,0.2,1)",
      maxWidth: "360px"
    }}>
      <CheckCircle size={20} style={{ color: c.icon, flexShrink: 0 }} />
      <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", marginLeft: "4px", color: "var(--text-secondary)" }}>
        <X size={15} />
      </button>
    </div>
  );
}

// ─── Notification Drawer ─────────────────────────────────────────────────
function NotificationDrawer({ isOpen, onClose, notifications, onSend, onDelete, onMarkAllRead, sending }) {
  const [message, setMessage] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [filter, setFilter] = useState("all"); // all | unread | read
  const textareaRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filtered = notifications.filter(n => {
    if (filter === "unread") return !n.is_read;
    if (filter === "read") return n.is_read;
    return true;
  });

  const handleTemplate = (text) => {
    setMessage(text);
    setShowTemplates(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    onSend(message, () => setMessage(""));
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.25)",
            backdropFilter: "blur(2px)", zIndex: 1000,
            animation: "fadeIn 0.2s ease"
          }}
        />
      )}

      {/* Drawer Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: "420px",
        maxWidth: "100vw", zIndex: 1001,
        background: "var(--bg-card)",
        borderLeft: "1px solid var(--border-glass)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.1)",
        display: "flex", flexDirection: "column",
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.35s cubic-bezier(0.2,0.8,0.2,1)"
      }}>

        {/* Drawer Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--border-glass)",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "linear-gradient(135deg, var(--primary), var(--success))",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <BellRing size={18} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Notifications</h2>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                  {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                title="Mark all as read"
                style={{
                  background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.2)",
                  borderRadius: "8px", padding: "6px 10px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "5px",
                  fontSize: "12px", color: "var(--primary)", fontWeight: 500
                }}
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
            <button onClick={onClose} style={{
              background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "8px",
              padding: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <X size={16} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Send Message Section */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-glass)", background: "rgba(13,148,136,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "10px" }}>
            <MessageSquare size={14} style={{ color: "var(--primary)" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Send a Message</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ position: "relative" }}>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message to the patient..."
                rows={3}
                style={{
                  width: "100%", padding: "10px 12px",
                  borderRadius: "10px", resize: "none",
                  background: "var(--bg-deep)",
                  border: "1px solid var(--border-glass)",
                  color: "var(--text-primary)", fontFamily: "inherit",
                  fontSize: "13px", lineHeight: 1.5, outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "var(--primary)"}
                onBlur={e => e.target.style.borderColor = "var(--border-glass)"}
              />
            </div>

            {/* Quick Templates */}
            <div style={{ marginTop: "8px", marginBottom: "10px" }}>
              <button
                type="button"
                onClick={() => setShowTemplates(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "12px", color: "var(--primary)", fontWeight: 500, padding: 0
                }}
              >
                <Sparkles size={12} />
                Quick Templates
                <ChevronDown size={12} style={{ transform: showTemplates ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
              </button>

              {showTemplates && (
                <div style={{
                  marginTop: "8px", display: "flex", flexDirection: "column", gap: "5px",
                  animation: "toastSlideIn 0.2s ease"
                }}>
                  {QUICK_TEMPLATES.map((t, i) => (
                    <button
                      key={i} type="button" onClick={() => handleTemplate(t.text)}
                      style={{
                        textAlign: "left", background: "rgba(13,148,136,0.05)",
                        border: "1px solid rgba(13,148,136,0.12)", borderRadius: "8px",
                        padding: "7px 10px", cursor: "pointer", fontSize: "12px",
                        color: "var(--text-primary)", fontWeight: 500,
                        transition: "all 0.15s"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(13,148,136,0.1)"; e.currentTarget.style.borderColor = "rgba(13,148,136,0.25)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(13,148,136,0.05)"; e.currentTarget.style.borderColor = "rgba(13,148,136,0.12)"; }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={sending || !message.trim()}
              style={{
                width: "100%", padding: "10px",
                background: "linear-gradient(135deg, var(--primary), var(--success))",
                border: "none", borderRadius: "10px", cursor: sending || !message.trim() ? "not-allowed" : "pointer",
                color: "white", fontWeight: 600, fontSize: "14px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
                opacity: sending || !message.trim() ? 0.6 : 1,
                transition: "opacity 0.2s, transform 0.15s",
              }}
              onMouseEnter={e => { if (!sending && message.trim()) e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <Send size={14} />
              {sending ? "Sending..." : "Send Notification"}
            </button>
          </form>
        </div>

        {/* Filter Tabs */}
        <div style={{
          padding: "12px 24px",
          borderBottom: "1px solid var(--border-glass)",
          display: "flex", gap: "6px"
        }}>
          {[
            { key: "all", label: "All" },
            { key: "unread", label: "Unread" },
            { key: "read", label: "Read" }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                padding: "5px 14px", borderRadius: "20px", fontSize: "12px",
                fontWeight: filter === tab.key ? 600 : 400,
                cursor: "pointer", border: "none",
                background: filter === tab.key ? "var(--primary)" : "rgba(0,0,0,0.05)",
                color: filter === tab.key ? "white" : "var(--text-secondary)",
                transition: "all 0.2s"
              }}
            >
              {tab.label}
              {tab.key === "unread" && unreadCount > 0 && (
                <span style={{
                  marginLeft: "5px", background: filter === tab.key ? "rgba(255,255,255,0.3)" : "var(--primary)",
                  color: "white", borderRadius: "10px", padding: "1px 6px", fontSize: "10px", fontWeight: 700
                }}>{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <Bell size={36} style={{ color: "var(--border-glass)", display: "block", margin: "0 auto 12px" }} />
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                {filter === "unread" ? "No unread notifications." : "No notifications yet."}
              </p>
            </div>
          ) : (
            filtered.map((notif) => (
              <div
                key={notif.id}
                style={{
                  padding: "12px 14px", borderRadius: "12px",
                  background: notif.is_read ? "rgba(0,0,0,0.02)" : "rgba(13,148,136,0.05)",
                  border: `1px solid ${notif.is_read ? "var(--border-glass)" : "rgba(13,148,136,0.15)"}`,
                  transition: "all 0.2s",
                  position: "relative"
                }}
              >
                {!notif.is_read && (
                  <span style={{
                    position: "absolute", top: "14px", right: "42px",
                    width: "7px", height: "7px", borderRadius: "50%",
                    background: "var(--primary)", display: "inline-block"
                  }} />
                )}
                <p style={{
                  margin: "0 0 8px", fontSize: "13px", lineHeight: "1.5",
                  color: "var(--text-primary)",
                  paddingRight: "20px"
                }}>
                  {notif.message}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {new Date(notif.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{
                      fontSize: "10px", padding: "2px 8px", borderRadius: "20px", fontWeight: 600,
                      background: notif.is_read ? "rgba(16,185,129,0.1)" : "rgba(13,148,136,0.1)",
                      color: notif.is_read ? "var(--success)" : "var(--primary)"
                    }}>
                      {notif.is_read ? "Read" : "Unread"}
                    </span>
                    <button
                      onClick={() => onDelete(notif.id)}
                      title="Delete notification"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        padding: "3px", borderRadius: "5px",
                        color: "var(--text-muted)",
                        transition: "color 0.15s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--danger)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Dashboard Component ────────────────────────────────────────────
function DoctorDashboard({ selectedPatientId }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Notification states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sentNotifications, setSentNotifications] = useState([]);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedPatientId]);

  const showToast = (message, type = "success") => {
    setToast({ message, type, id: Date.now() });
  };

  async function fetchData() {
    if (!selectedPatientId) return;
    setLoading(true);
    try {
      const statsResponse = await api.get(`dashboard/?patient=${selectedPatientId}`);
      setStats(statsResponse.data);

      const [schedulesResponse, medicinesResponse, notifsResponse] = await Promise.all([
        api.get(`schedules/?patient=${selectedPatientId}`),
        api.get(`medicines/?patient=${selectedPatientId}`),
        api.get(`notifications/?patient=${selectedPatientId}`)
      ]);

      setMedicines(medicinesResponse.data);
      setSentNotifications(notifsResponse.data);

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

  async function fetchNotifications() {
    if (!selectedPatientId) return;
    try {
      const res = await api.get(`notifications/?patient=${selectedPatientId}`);
      setSentNotifications(res.data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const handleAction = async (scheduleId, newStatus) => {
    setActionLoading(scheduleId);
    try {
      await api.patch(`schedules/${scheduleId}/`, { status: newStatus });
      await fetchData();
    } catch (err) {
      console.error(`Error updating schedule to ${newStatus}:`, err);
      alert("Failed to record dose action. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendNotification = async (message, clearFn) => {
    if (!message.trim() || !selectedPatientId) return;
    setSendingNotif(true);
    try {
      await api.post("notifications/", { patient: selectedPatientId, message });
      clearFn?.();
      showToast("✉️ Notification sent to patient successfully!");
      await fetchNotifications();
    } catch (err) {
      console.error("Error sending notification:", err);
      showToast("Failed to send notification. Try again.", "error");
    } finally {
      setSendingNotif(false);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await api.delete(`notifications/${id}/`);
      setSentNotifications(prev => prev.filter(n => n.id !== id));
      showToast("Notification deleted.");
    } catch (err) {
      console.error("Error deleting notification:", err);
      showToast("Failed to delete notification.", "error");
    }
  };

  const handleMarkAllRead = async () => {
    const unread = sentNotifications.filter(n => !n.is_read);
    try {
      await Promise.all(unread.map(n => api.patch(`notifications/${n.id}/`, { is_read: true })));
      setSentNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      showToast("All notifications marked as read.");
    } catch (err) {
      console.error("Error marking notifications:", err);
    }
  };

  const unreadCount = sentNotifications.filter(n => !n.is_read).length;

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  if (!selectedPatientId) {
    return (
      <div className="empty-state glass-card" style={{ textAlign: "center" }}>
        <Activity className="empty-icon" size={40} />
        <h3>No Profile Selected</h3>
        <p style={{ marginTop: "8px" }}>
          Please select or register a patient profile in the sidebar to initialize the analytics dashboard.
        </p>
      </div>
    );
  }

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
      legend: { display: false },
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
        min: 0, max: 100,
        grid: { color: "rgba(255, 255, 255, 0.04)" },
        ticks: { color: "#9ca3af", font: { family: "Outfit" } }
      }
    }
  };

  const weeklyChartData = {
    labels: stats?.charts?.weekly?.map(w => w.day) || [],
    datasets: [{
      fill: true, label: "Adherence %",
      data: stats?.charts?.weekly?.map(w => w.adherence) || [],
      borderColor: "rgb(139, 92, 246)",
      backgroundColor: "rgba(139, 92, 246, 0.08)",
      tension: 0.4,
      pointBackgroundColor: "rgb(139, 92, 246)",
      pointHoverRadius: 6,
    }]
  };

  const monthlyChartData = {
    labels: stats?.charts?.monthly?.map(m => m.week) || [],
    datasets: [{
      label: "Compliance %",
      data: stats?.charts?.monthly?.map(m => m.adherence) || [],
      backgroundColor: "rgba(16, 185, 129, 0.65)",
      borderColor: "rgb(16, 185, 129)",
      borderWidth: 1, borderRadius: 8,
    }]
  };

  return (
    <div className="page-container" style={{ textAlign: "left" }}>
      {/* ── Keyframe Styles ── */}
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes bellRing {
          0%,100% { transform: rotate(0deg); }
          20%      { transform: rotate(-15deg); }
          40%      { transform: rotate(15deg); }
          60%      { transform: rotate(-10deg); }
          80%      { transform: rotate(10deg); }
        }
        .bell-btn:hover .bell-icon { animation: bellRing 0.5s ease; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div>
          <h1 style={{ fontSize: "28px", margin: "0 0 4px" }}>Dashboard Overview</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Real-time compliance monitoring, medication stocks, and actionable daily checklist.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="btn btn-primary" onClick={() => navigate("/add")} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={14} /> Add Medicine
          </button>

          {/* ── Bell Notification Button ── */}
          <button
            className="bell-btn"
            onClick={() => setDrawerOpen(true)}
            title="Notifications"
            style={{
              position: "relative",
              background: unreadCount > 0
                ? "linear-gradient(135deg, rgba(13,148,136,0.12), rgba(16,185,129,0.08))"
                : "rgba(0,0,0,0.04)",
              border: unreadCount > 0 ? "1px solid rgba(13,148,136,0.3)" : "1px solid var(--border-glass)",
              borderRadius: "12px", padding: "9px 12px",
              cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
              transition: "all 0.25s", fontFamily: "inherit", fontWeight: 600,
              fontSize: "14px", color: unreadCount > 0 ? "var(--primary)" : "var(--text-secondary)",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(13,148,136,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            {unreadCount > 0 ? <BellRing size={18} className="bell-icon" /> : <Bell size={18} className="bell-icon" />}
            Notifications
            {unreadCount > 0 && (
              <span style={{
                background: "var(--danger)", color: "white",
                borderRadius: "50%", minWidth: "20px", height: "20px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 700,
                boxShadow: "0 2px 6px rgba(239,68,68,0.4)",
                animation: "toastSlideIn 0.3s ease"
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <button className="btn btn-outline" onClick={fetchData} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Metrics Cards ── */}
      <div className="dashboard-grid">
        <div className="glass-card metric-card">
          <div className="metric-icon-wrapper metric-success"><CheckCircle size={24} /></div>
          <div className="metric-info">
            <span className="metric-value">{stats?.adherence_percentage}%</span>
            <span className="metric-label">Adherence Score</span>
          </div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-icon-wrapper metric-primary"><Heart size={24} /></div>
          <div className="metric-info">
            <span className="metric-value">{stats?.total_medicines}</span>
            <span className="metric-label">Active Therapies</span>
          </div>
        </div>
        <div className="glass-card metric-card">
          <div className={`metric-icon-wrapper ${stats?.refill_alerts?.length > 0 ? "metric-danger" : "metric-warning"}`}>
            <AlertTriangle size={24} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{stats?.refill_alerts?.length}</span>
            <span className="metric-label">Refill Warnings</span>
          </div>
        </div>
        <div className="glass-card metric-card">
          <div className="metric-icon-wrapper metric-warning"><Clock size={24} /></div>
          <div className="metric-info">
            <span className="metric-value">{stats?.today_doses}</span>
            <span className="metric-label font-sans">Today's Doses</span>
          </div>
        </div>
      </div>

      {/* ── Refill Alert Banner ── */}
      {stats?.refill_alerts?.length > 0 && (
        <div style={{
          background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)",
          borderRadius: "16px", padding: "16px 20px",
          display: "flex", alignItems: "center", gap: "12px",
          color: "var(--danger)", marginBottom: "8px"
        }}>
          <AlertTriangle size={20} />
          <div>
            <strong>Refill Needed:</strong> The stock for{" "}
            {stats.refill_alerts.map(a => `${a.medicine_name} (${a.remaining_pills} left)`).join(", ")}{" "}
            is running low.
          </div>
        </div>
      )}

      {/* ── Main Sections ── */}
      <div className="dashboard-sections">
        {/* Today's Checklist */}
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
                  <div key={item.id} className={`schedule-item ${isTaken ? "taken" : isMissed ? "missed" : "pending"}`}>
                    <div className="schedule-med-info">
                      <div className="schedule-time-badge">{formatTime(item.scheduled_time)}</div>
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
                          <button className="btn btn-success" onClick={() => handleAction(item.id, "Taken")} disabled={actionLoading === item.id}>
                            <Check size={14} /> Take
                          </button>
                          <button className="btn btn-outline" style={{ borderColor: "rgba(245, 158, 11, 0.2)", color: "var(--warning)" }} onClick={() => handleAction(item.id, "Skipped")} disabled={actionLoading === item.id}>
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

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Active Medicines */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Pill size={18} style={{ color: "var(--primary)" }} /> Active Therapies
            </h3>
            {medicines.length === 0 ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "12px" }}>No active medications found for this profile.</p>
                <button className="btn btn-primary" onClick={() => navigate("/add")} style={{ display: "inline-flex", alignItems: "center", gap: "6px", margin: "0 auto" }}>
                  <Plus size={14} /> Add Medicine
                </button>
              </div>
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

          {/* Notification Summary Card */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                <BellRing size={18} style={{ color: "var(--primary)" }} /> Notification History
              </h3>
              <button
                onClick={() => setDrawerOpen(true)}
                style={{
                  background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.2)",
                  borderRadius: "8px", padding: "5px 12px",
                  cursor: "pointer", fontSize: "12px", color: "var(--primary)", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: "5px", transition: "all 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(13,148,136,0.14)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(13,148,136,0.08)"}
              >
                <Send size={11} /> Send & View All
              </button>
            </div>
            {sentNotifications.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>No notifications sent to this patient yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "200px", overflowY: "auto" }}>
                {sentNotifications.slice(0, 5).map((notif) => (
                  <div key={notif.id} style={{ padding: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glass)", borderRadius: "10px" }}>
                    <p style={{ margin: "0 0 6px 0", fontSize: "13px", color: "var(--text-primary)", lineHeight: "1.4" }}>{notif.message}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                        {new Date(notif.created_at).toLocaleDateString()}
                      </span>
                      <span className={`status-badge ${notif.is_read ? "status-taken" : "status-missed"}`} style={{ fontSize: "10px", padding: "2px 8px" }}>
                        {notif.is_read ? "Read" : "Unread"}
                      </span>
                    </div>
                  </div>
                ))}
                {sentNotifications.length > 5 && (
                  <button onClick={() => setDrawerOpen(true)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--primary)", fontSize: "12px", fontWeight: 600, padding: "4px"
                  }}>
                    + {sentNotifications.length - 5} more — View all
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Weekly Chart */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>Weekly Adherence Trends</h3>
            <div style={{ height: "180px", position: "relative" }}>
              <Line data={weeklyChartData} options={chartOptions} />
            </div>
          </div>

          {/* Monthly Chart */}
          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>Monthly Performance</h3>
            <div style={{ height: "180px", position: "relative" }}>
              <Bar data={monthlyChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Notification Drawer ── */}
      <NotificationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        notifications={sentNotifications}
        onSend={handleSendNotification}
        onDelete={handleDeleteNotification}
        onMarkAllRead={handleMarkAllRead}
        sending={sendingNotif}
      />

      {/* ── Toast ── */}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default DoctorDashboard;
