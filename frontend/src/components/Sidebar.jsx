import { useNavigate, useLocation } from "react-router-dom";
import { Activity, Heart, Plus, Calendar, User, LogOut, PlusCircle } from "lucide-react";

function Sidebar({
  selectedPatientId,
  setSelectedPatientId,
  patients,
  onLogout,
  user
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const isDoctor = user?.role === "Doctor";

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: <Activity size={20} /> },
    { name: "Medications", path: "/medicines", icon: <Heart size={20} /> },
    // Only show Add Medicine if the user is a doctor
    ...(isDoctor ? [{ name: "Add Medicine", path: "/add", icon: <Plus size={20} /> }] : []),
    { name: "Adherence Logs", path: "/history", icon: <Calendar size={20} /> },
    { name: "Profile Settings", path: "/profile", icon: <User size={20} /> },
  ];

  return (
    <aside
      style={{
        width: "260px",
        background: "var(--bg-card)",
        borderRight: "1px solid var(--border-glass)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        textAlign: "left",
      }}
    >
      {/* Brand Section */}
      <div
        style={{
          padding: "24px",
          borderBottom: "1px solid var(--border-glass)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, var(--primary), var(--success))",
            padding: "8px",
            borderRadius: "12px",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Heart fill="currentColor" size={22} />
        </div>
        <span
          style={{
            fontSize: "22px",
            fontWeight: 700,
            background: "linear-gradient(135deg, var(--primary), var(--success))",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          medicine
        </span>
      </div>

      {/* Patient Selector Profile Widget - Only for Doctors */}
      {isDoctor && (
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-glass)" }}>
          <label
            style={{
              fontSize: "12px",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              fontWeight: 600,
              display: "block",
              marginBottom: "8px",
              letterSpacing: "0.5px"
            }}
          >
            Viewing Profile
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <select
              className="patient-select"
              style={{ flex: 1, minWidth: "0" }}
              value={selectedPatientId || ""}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            >
              <option value="" disabled>
                Select Profile...
              </option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary btn-icon-only"
              title="Manage Profiles"
              onClick={() => navigate("/profile")}
              style={{ width: "38px", height: "38px", minWidth: "38px" }}
            >
              <PlusCircle size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav style={{ flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`tab-btn ${isActive ? "active" : ""}`}
              style={{
                width: "100%",
                justifyContent: "flex-start",
                padding: "12px 16px",
                borderRadius: "12px",
                border: "1px solid transparent",
              }}
            >
              {item.icon}
              <span style={{ marginLeft: "12px" }}>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Logged in User / Logout Widget */}
      <div
        style={{
          padding: "20px 24px",
          borderTop: "1px solid var(--border-glass)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div style={{ overflow: "hidden", marginRight: "12px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user ? `${user.first_name || user.username}` : "Account"}
          </h4>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Active Session</span>
        </div>
        <button
          className="btn btn-outline btn-icon-only"
          onClick={onLogout}
          title="Sign Out"
          style={{ borderColor: "rgba(239, 68, 68, 0.2)", color: "var(--danger)", borderRadius: "10px" }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
