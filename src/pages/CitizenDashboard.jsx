import { useEffect, useState } from "react";
import {
  createUserComplaint,
  subscribeToUserComplaints,
} from "../firebase/userService";
import { uploadComplaintImage } from "../firebase/repairStorage";
import { subscribeToUserReports } from "../firebase/reportService";

const statusLabel = (value) => {
  const s = String(value || "new").toLowerCase().replace(/-/g, "_").replace(/ /g, "_");
  if (s === "in_progress") return "In Progress";
  if (s === "completed") return "Completed";
  return "New";
};

export default function CitizenDashboard({ user, onLogout }) {
  const [section, setSection] = useState("home");
  const [complaints, setComplaints] = useState([]);
  const [reports, setReports] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    area: "",
    latitude: "",
    longitude: "",
    description: "",
  });

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToUserComplaints(user.uid, setComplaints);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToUserReports(user.uid, setReports);
  }, [user?.uid]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      let imageUrl = "";

      if (file) {
        imageUrl = await uploadComplaintImage(file, user.uid);
      }

      await createUserComplaint({
        user,
        ...form,
        severity: "Unknown",
        imageUrl,
        source: "citizen",
      });

      setForm({
        area: "",
        latitude: "",
        longitude: "",
        description: "",
      });
      setFile(null);
      setMessage("Complaint submitted successfully.");
      setSection("complaints");
    } catch (e) {
      setError(e.message || "Unable to submit complaint.");
    } finally {
      setBusy(false);
    }
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setMessage("Current location captured.");
      },
      () => setError("Unable to access your location.")
    );
  };

  return (
    <div className="citizen-shell">
      <header className="citizen-header">
        <div>
          <div className="brand-title">Road Damage</div>
          <div className="brand-subtitle">Citizen Reporting Portal</div>
        </div>
        <div className="topbar-user">
          <div className="avatar">{(user?.email || "C").charAt(0).toUpperCase()}</div>
          <div className="topbar-user-text">
            <strong>{user?.displayName || user?.email}</strong>
            <span>Citizen</span>
          </div>
          <button className="logout-button" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <main className="citizen-content">
        <div className="citizen-nav">
          {[
            ["home", "Overview"],
            ["report", "Report Road Damage"],
            ["complaints", "My Complaints"],
            ["reports", "Repair Reports"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={section === key ? "active" : ""}
              onClick={() => setSection(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {message && <div className="success-banner">{message}</div>}
        {error && <div className="error-banner">{error}</div>}

        {section === "home" && (
          <>
            <div className="page-heading">
              <div>
                <h1>Welcome</h1>
                <p>Report road damage and track the repair process.</p>
              </div>
            </div>

            <div className="stats-grid four">
              <div className="stat-card"><div className="stat-icon blue">#</div><div><span>Submitted</span><strong>{complaints.length}</strong></div></div>
              <div className="stat-card"><div className="stat-icon orange">!</div><div><span>New</span><strong>{complaints.filter(x => statusLabel(x.status) === "New").length}</strong></div></div>
              <div className="stat-card"><div className="stat-icon blue">◷</div><div><span>In Progress</span><strong>{complaints.filter(x => statusLabel(x.status) === "In Progress").length}</strong></div></div>
              <div className="stat-card"><div className="stat-icon green">✓</div><div><span>Completed</span><strong>{complaints.filter(x => statusLabel(x.status) === "Completed").length}</strong></div></div>
            </div>

            <section className="panel citizen-callout">
              <h2>See a pothole?</h2>
              <p>Take a photo, capture the location and submit a complaint.</p>
              <button className="primary-button" onClick={() => setSection("report")}>
                Report Road Damage
              </button>
            </section>
          </>
        )}

        {section === "report" && (
          <section className="panel">
            <div className="page-heading">
              <div>
                <h2>Report Road Damage</h2>
                <p>Provide the location, description and optional image.</p>
              </div>
            </div>

            <form onSubmit={submit} className="form-card">
              <div className="form-grid">
                <label>
                  Area *
                  <input
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    placeholder="e.g. Anna Nagar"
                    required
                  />
                </label>

                <label>
                  Latitude *
                  <input
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    required
                  />
                </label>

                <label>
                  Longitude *
                  <input
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    required
                  />
                </label>

                <div className="location-button-cell">
                  <button type="button" className="secondary-button" onClick={locate}>
                    Use My Current Location
                  </button>
                </div>
              </div>

              <label>
                Description
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the road damage..."
                />
              </label>

              <label>
                Photo / Video
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>

              <button className="primary-button" disabled={busy}>
                {busy ? "Submitting..." : "Submit Complaint"}
              </button>
            </form>
          </section>
        )}

        {section === "complaints" && (
          <section className="panel">
            <div className="page-heading">
              <div><h2>My Complaints</h2><p>Track the status of your submitted road-damage complaints.</p></div>
            </div>

            <div className="ticket-grid">
              {complaints.map((item) => (
                <article className="ticket-card" key={item.firebaseKey}>
                  <div className="ticket-card-top">
                    <div><span className="eyebrow">COMPLAINT</span><h3>{item.ticketId}</h3></div>
                    <span className={`status-badge ${String(item.status).replace("-", "_")}`}>
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <div className="ticket-location">
                    <strong>{item.area || "-"}</strong>
                    <span>{item.latitude}, {item.longitude}</span>
                  </div>
                  <p>{item.description || "No description provided."}</p>
                  {item.imageUrl && <img className="ticket-image" src={item.imageUrl} alt="Reported damage" />}
                  <div className="ticket-time">
                    Submitted: {item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : "-"}
                  </div>
                  {item.contractorName && <div className="ticket-time">Contractor: {item.contractorName}</div>}
                </article>
              ))}
              {!complaints.length && <div className="empty-state full-width">No complaints submitted yet.</div>}
            </div>
          </section>
        )}

        {section === "reports" && (
          <section className="panel">
            <div className="page-heading">
              <div><h2>Repair Reports</h2><p>Completed reports related to your complaints.</p></div>
            </div>

            <div className="report-grid">
              {reports.map((report) => (
                <article className="report-card" key={report.firebaseKey}>
                  <div className="report-card-top">
                    <strong>{report.ticketId}</strong>
                    <span className="status-badge completed">Completed</span>
                  </div>
                  <p>{report.area || "-"}</p>
                  <div className="report-meta">
                    <span>Severity: {report.severity || "-"}</span>
                    <span>Completed: {report.completedAt ? new Date(report.completedAt).toLocaleString("en-IN") : "-"}</span>
                  </div>
                  <div className="before-after-grid compact">
                    <div>{report.originalImageUrl && <img src={report.originalImageUrl} alt="Before repair" />}</div>
                    <div>{report.repairedImageUrl && <img src={report.repairedImageUrl} alt="After repair" />}</div>
                  </div>
                </article>
              ))}
              {!reports.length && <div className="empty-state full-width">No completed repair reports yet.</div>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}