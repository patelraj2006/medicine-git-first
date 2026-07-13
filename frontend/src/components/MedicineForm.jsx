import { useState } from "react";
import { Sparkles, Save, Info, Calendar, Clock, Clipboard } from "lucide-react";
import api from "../services/api";

function MedicineForm({ selectedPatientId, onMedicineAdded }) {
  const [formData, setFormData] = useState(() => ({
    medicine_name: "",
    dosage: "",
    frequency: "Once Daily",
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reminder_time: "09:00",
    notes: "",
    total_pills: 30,
    remaining_pills: 30,
    refill_threshold: 5,
  }));

  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleChange = (e) => {
    const value = e.target.type === "number" ? parseInt(e.target.value) || 0 : e.target.value;
    const name = e.target.name;
    const newFormData = { ...formData, [name]: value };

    if (name === "frequency") {
      let times = "09:00";
      if (value === "Twice Daily") times = "09:00,21:00";
      else if (value === "Three Times Daily") times = "09:00,14:00,21:00";
      newFormData.reminder_time = times;
    }

    setFormData(newFormData);
  };

  const handleAiExtract = async () => {
    if (!aiText.trim()) {
      setMessage({ type: "error", text: "Please enter some prescription text first." });
      return;
    }

    setAiLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await api.post("extract-medication/", { text: aiText });
      const data = response.data;
      
      const duration = data.duration || 7;
      const start = new Date();
      const end = new Date();
      end.setDate(start.getDate() + duration);

      let extractedFreq = "Once Daily";
      if (data.frequency === 2 || data.frequency === "Twice Daily") extractedFreq = "Twice Daily";
      else if (data.frequency === 3 || data.frequency === "Three Times Daily") extractedFreq = "Three Times Daily";
      else if (data.frequency === "Weekly") extractedFreq = "Weekly";

      setFormData({
        medicine_name: data.medicine_name || "",
        dosage: data.dosage || "",
        frequency: extractedFreq,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        reminder_time: data.reminder_time || (extractedFreq === "Twice Daily" ? "09:00,21:00" : extractedFreq === "Three Times Daily" ? "09:00,14:00,21:00" : "09:00"),
        notes: data.timing ? `Timing instruction: ${data.timing}` : "",
        total_pills: 30,
        remaining_pills: 30,
        refill_threshold: 5,
      });

      setMessage({
        type: "success",
        text: "✨ Prescription parameters extracted! Verify and save details below.",
      });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to extract prescription. Please fill manually." });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {  
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!selectedPatientId) {
      setMessage({ type: "error", text: "Please select or create a patient profile in the sidebar first." });
      return;
    }

    try {
      const payload = {
        patient: parseInt(selectedPatientId),
        ...formData,
      };

      await api.post("medicines/", payload);
      setMessage({ type: "success", text: "💊 Medication and schedules added successfully!" });
      
      // Reset form
      setFormData({
        medicine_name: "",
        dosage: "",
        frequency: "Once Daily",
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reminder_time: "09:00",
        notes: "",
        total_pills: 30,
        remaining_pills: 30,
        refill_threshold: 5,
      });
      setAiText("");
      if (onMedicineAdded) onMedicineAdded();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to save medication. Check backend connections." });
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ textAlign: "left" }}>
        <h1 style={{ fontSize: "28px", margin: "0 0 8px" }}>Schedule a New Medication</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Register a medication therapy plan using AI natural language inputs or manual configurations.
        </p>
      </div>

      {message.text && (
        <div
          style={{
            background: message.type === "success" ? "var(--success-glow)" : "var(--danger-glow)",
            color: message.type === "success" ? "var(--success)" : "var(--danger)",
            padding: "14px 18px",
            borderRadius: "14px",
            fontSize: "14px",
            textAlign: "left",
            border: `1px solid ${message.type === "success" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Info size={16} />
          {message.text}
        </div>
      )}

      {/* AI Assistant Card */}
      <div className="glass-card ai-copilot-card" style={{ textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={{ fontSize: "18px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={18} style={{ color: "var(--primary)" }} />
            AI Prescription Extractor
          </h2>
          <span className="ai-pill-badge">Copilot</span>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "16px" }}>
          Type a medication note (e.g. <i>"I take Paracetamol 500mg twice daily after food for 5 days"</i>) to automatically parse the fields.
        </p>
        <div className="form-group" style={{ marginBottom: "12px" }}>
          <textarea
            className="form-control"
            placeholder="Type note instructions here..."
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleAiExtract}
          disabled={aiLoading}
        >
          {aiLoading ? "Extracting..." : "Extract with AI"}
        </button>
      </div>

      {/* Main Form */}
      <div className="glass-card" style={{ textAlign: "left" }}>
        <h2 style={{ fontSize: "18px", marginBottom: "20px" }}>Medication Setup Form</h2>
        
        {!selectedPatientId && (
          <div
            style={{
              padding: "16px",
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              borderRadius: "12px",
              color: "var(--warning)",
              fontSize: "14px",
              marginBottom: "20px"
            }}
          >
            ⚠️ <strong>Notice:</strong> Please select or create a patient profile in the sidebar before saving.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Row 1: Name and Dosage */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div className="form-group">
              <label>Medicine Name</label>
              <input
                type="text"
                name="medicine_name"
                required
                className="form-control"
                placeholder="e.g. Paracetamol"
                value={formData.medicine_name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Dosage</label>
              <input
                type="text"
                name="dosage"
                required
                className="form-control"
                placeholder="e.g. 500mg or 1 pill"
                value={formData.dosage}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Row 2: Frequency and Reminder Times */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div className="form-group">
              <label>Frequency</label>
              <select
                name="frequency"
                className="form-control"
                value={formData.frequency}
                onChange={handleChange}
              >
                <option value="Once Daily">Once Daily</option>
                <option value="Twice Daily">Twice Daily</option>
                <option value="Three Times Daily">Three Times Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Custom Schedule">Custom Schedule</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={14} /> Reminder Time(s) (Comma separated, HH:MM format)
              </label>
              <input
                type="text"
                name="reminder_time"
                required
                className="form-control"
                placeholder="e.g. 08:00,20:00"
                value={formData.reminder_time}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Row 3: Start and End Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Calendar size={14} /> Start Date
              </label>
              <input
                type="date"
                name="start_date"
                required
                className="form-control"
                value={formData.start_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Calendar size={14} /> End Date
              </label>
              <input
                type="date"
                name="end_date"
                required
                className="form-control"
                value={formData.end_date}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Row 4: Stocks and Thresholds */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div className="form-group">
              <label>Total Pills</label>
              <input
                type="number"
                name="total_pills"
                required
                min="1"
                className="form-control"
                value={formData.total_pills}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Remaining Pills</label>
              <input
                type="number"
                name="remaining_pills"
                required
                min="0"
                className="form-control"
                value={formData.remaining_pills}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Refill Warn Threshold</label>
              <input
                type="number"
                name="refill_threshold"
                required
                min="1"
                className="form-control"
                value={formData.refill_threshold}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Row 5: Notes */}
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Clipboard size={14} /> Notes / Instructions
            </label>
            <textarea
              name="notes"
              className="form-control"
              placeholder="e.g. Take after meals, store in cool dry place."
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          <div className="form-actions" style={{ marginTop: "24px" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!selectedPatientId}
              style={{ paddingLeft: "24px", paddingRight: "24px" }}
            >
              <Save size={16} />
              Save Medication & Generate Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MedicineForm;