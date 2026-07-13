import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import MedicineForm from "./components/MedicineForm";
import MedicineList from "./components/MedicineList";
import ReminderHistory from "./components/ReminderHistory";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import api from "./services/api";

function AppContent() {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("access_token");
    if (storedUser && token) {
      return JSON.parse(storedUser);
    }
    return null;
  });
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [loading, setLoading] = useState(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("access_token");
    if (storedUser && token) {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role === "Doctor") return true;
    }
    return false;
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role === "Doctor") {
      fetchPatients();
    }

    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  async function fetchPatients(selectId = null) {
    try {
      const response = await api.get("patients/");
      const data = response.data;
      setPatients(data);
      
      if (data.length > 0) {
        if (selectId) {
          setSelectedPatientId(selectId.toString());
        } else {
          const storedPatientId = localStorage.getItem("selected_patient_id");
          const exists = data.some(p => p.id.toString() === storedPatientId);
          if (storedPatientId && exists) {
            setSelectedPatientId(storedPatientId);
          } else {
            setSelectedPatientId(data[0].id.toString());
            localStorage.setItem("selected_patient_id", data[0].id.toString());
          }
        }
      } else {
        setSelectedPatientId(null);
      }
    } catch (err) {
      console.error("Error fetching patients list:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientChanged = async () => {
    if (user?.role === "Doctor") {
      await fetchPatients();
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    if (userData.role === "Doctor") {
      fetchPatients();
    } else {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("selected_patient_id");
    setUser(null);
    setPatients([]);
    setSelectedPatientId(null);
    navigate("/login");
  };

  const handlePatientSelect = (id) => {
    setSelectedPatientId(id);
    localStorage.setItem("selected_patient_id", id);
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Loading medicine environment...</p>
      </div>
    );
  }

  const isAuthenticated = !!user;
  const isDoctor = user?.role === "Doctor";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {isAuthenticated && (
        <Sidebar
          selectedPatientId={selectedPatientId}
          setSelectedPatientId={handlePatientSelect}
          patients={patients}
          onLogout={handleLogout}
          user={user}
        />
      )}

      <main style={{ flex: 1, padding: "32px", overflowY: "auto", height: "100vh" }}>
        <Routes>
          <Route
            path="/login"
            element={!isAuthenticated ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/register"
            element={!isAuthenticated ? <Register onRegisterSuccess={handleLoginSuccess} /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/forgot-password"
            element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/dashboard" />}
          />

          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                isDoctor ? <DoctorDashboard selectedPatientId={selectedPatientId} patients={patients} /> : <PatientDashboard />
              ) : <Navigate to="/login" />
            }
          />
          <Route
            path="/medicines"
            element={isAuthenticated ? <MedicineList selectedPatientId={selectedPatientId} /> : <Navigate to="/login" />}
          />
          <Route
            path="/add"
            element={
              isAuthenticated && isDoctor ? (
                <MedicineForm
                  selectedPatientId={selectedPatientId}
                  onMedicineAdded={() => navigate("/dashboard")}
                />
              ) : (
                <Navigate to={isAuthenticated ? "/dashboard" : "/login"} />
              )
            }
          />
          <Route
            path="/history"
            element={isAuthenticated ? <ReminderHistory selectedPatientId={selectedPatientId} /> : <Navigate to="/login" />}
          />
          <Route
            path="/profile"
            element={
              isAuthenticated ? (
                <Profile onPatientChanged={handlePatientChanged} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;