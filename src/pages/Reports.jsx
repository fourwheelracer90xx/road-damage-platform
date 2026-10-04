import { useEffect, useState } from "react";
import { subscribeToReports } from "../firebase/reportService";

const date = (v) => v ? new Date(v).toLocaleString("en-IN") : "-";

export default function Reports() {
  const [reports, setReports] = useState([]);

  useEffect(() => subscribeToReports(setReports), []);

  const cumulative = () => {
    const win = window.open("", "_blank", "width=1000,height=800");
    if (!win) return;

    const rows = reports.map(r => `
      <tr>
        <td>${r.ticketId || "-"}</td>
        <td>${r.area || "-"}</td>
        <td>${r.contractorName || "-"}</td>
        <td>${r.severity || "-"}</td>
        <td>${date(r.completedAt)}</td>
      </tr>
    `).join("");

    win.document.write(`
      <html><head><title>Road Damage Cumulative Report</title>
      <style>
        body{font-family:Arial;padding:40px;color:#0f172a}
        table{width:100%;border-collapse:collapse}
        th,td{padding:10px;border:1px solid #ddd;text-align:left}
        th{background:#f1f5f9}
      </style></head>
      <body>
      <h1>Road Damage Cumulative Report</h1>
      <p>Generated: ${date(new Date().toISOString())}</p>
      <p>Total completed reports: ${reports.length}</p>
      <table><thead><tr><th>Ticket</th><th>Area</th><th>Contractor</th><th>Severity</th><th>Completed</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='5'>No reports.</td></tr>"}</tbody></table>
      <br><button onclick="window.print()">Print / Save as PDF</button>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Repair Reports</h2>
          <p>Complete repair history and evidence</p>
        </div>
        <button className="primary-button" disabled={!reports.length} onClick={cumulative}>
          Generate Cumulative Report
        </button>
      </div>

      <div className="report-grid">
        {reports.map((r) => (
          <article className="report-card" key={r.firebaseKey}>
            <div className="report-card-top">
              <strong>{r.ticketId}</strong>
              <span className="status-badge completed">Completed</span>
            </div>
            <p>{r.area || "-"}</p>
            <div className="report-meta">
              <span>Contractor: {r.contractorName || "-"}</span>
              <span>Raised: {date(r.ticketRaisedAt)}</span>
              <span>Started: {date(r.repairStartedAt)}</span>
              <span>Completed: {date(r.completedAt)}</span>
            </div>
            <div className="before-after-grid compact">
              <div>{r.originalImageUrl && <img src={r.originalImageUrl} alt="Before repair" />}</div>
              <div>{r.repairedImageUrl && <img src={r.repairedImageUrl} alt="After repair" />}</div>
            </div>
          </article>
        ))}
        {!reports.length && <div className="empty-state full-width">No repair reports yet.</div>}
      </div>
    </>
  );
}