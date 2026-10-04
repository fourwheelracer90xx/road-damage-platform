import { useEffect, useMemo, useRef, useState } from "react";
import * as mapboxgl from "mapbox-gl/esm";
import "mapbox-gl/dist/mapbox-gl.css";
import { get, ref, update } from "firebase/database";
import realtimeDb from "../firebase/realtimeDatabase";

const DEMO_CONTRACTOR_TEST_TICKETS = {
  TICKET_001: {
    ticketId: "TICKET-001",
    contractorId: "pKhOoUMr3BWom3oTL0wH018tLgu1",
    contractorName: "Someash Thirunavukkarasu",
    area: "Velachery",
    latitude: 12.9758,
    longitude: 80.2205,
    severity: "Medium",
    length: 51,
    width: 42,
    depth: 7.8,
    volume: 30,
    confidence: 0.94,
    source: "vehicle",
    status: "new",
    imageUrl: "/before-pothole.png",
    createdAt: "2026-10-04T06:00:00.000Z",
    updatedAt: "2026-10-04T06:00:00.000Z",
  },

  TICKET_002: {
    ticketId: "TICKET-002",
    contractorId: "pKhOoUMr3BWom3oTL0wH018tLgu1",
    contractorName: "Someash Thirunavukkarasu",
    area: "Madipakkam",
    latitude: 12.9626,
    longitude: 80.1986,
    severity: "Medium",
    length: 48,
    width: 39,
    depth: 7.1,
    volume: 30,
    confidence: 0.92,
    source: "vehicle",
    status: "new",
    imageUrl: "/before-pothole.png",
    createdAt: "2026-10-04T06:15:00.000Z",
    updatedAt: "2026-10-04T06:15:00.000Z",
  },

  TICKET_003: {
    ticketId: "TICKET-003",
    contractorId: "pKhOoUMr3BWom3oTL0wH018tLgu1",
    contractorName: "Someash Thirunavukkarasu",
    area: "Anna Nagar",
    latitude: 13.0850,
    longitude: 80.2101,
    severity: "Large",
    length: 62,
    width: 55,
    depth: 9.2,
    volume: 30,
    confidence: 0.96,
    source: "vehicle",
    status: "new",
    imageUrl: "/before-pothole.png",
    createdAt: "2026-10-04T06:30:00.000Z",
    updatedAt: "2026-10-04T06:30:00.000Z",
  },

  TICKET_004: {
    ticketId: "TICKET-004",
    contractorId: "pKhOoUMr3BWom3oTL0wH018tLgu1",
    contractorName: "Someash Thirunavukkarasu",
    area: "Thiruvanmiyur",
    latitude: 12.9830,
    longitude: 80.2594,
    severity: "Small",
    length: 18,
    width: 14,
    depth: 3.5,
    volume: 8,
    confidence: 0.93,
    source: "vehicle",
    status: "new",
    imageUrl: "/before-pothole.png",
    createdAt: "2026-10-04T06:45:00.000Z",
    updatedAt: "2026-10-04T06:45:00.000Z",
  },
};


const normalizeStatus = (value) =>
  String(value || "new")
    .toLowerCase()
    .trim()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

const statusInfo = (value) => {
  const status = normalizeStatus(value);
  if (["completed", "resolved", "closed"].includes(status)) {
    return { key: "completed", label: "Completed", color: "#16a34a" };
  }
  if (["in_progress", "active", "accepted", "repairing"].includes(status)) {
    return { key: "in_progress", label: "In Progress", color: "#2563eb" };
  }
  return { key: "new", label: "New", color: "#dc2626" };
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const duration = (start, end) => {
  const a = new Date(start || 0).getTime();
  const b = new Date(end || 0).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || !a || !b || b < a) return "-";
  const seconds = Math.floor((b - a) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const toTicketArray = (value) => {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).map(([firebaseKey, ticket]) => ({
    ...(ticket || {}),
    firebaseKey,
  }));
};

function MapPanel({ tickets, selectedTicket, onSelect }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return undefined;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return undefined;

    const map = new mapboxgl.Map({
      accessToken: token,
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [80.2461, 12.9654],
      zoom: 12.5,
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      const validTickets = tickets.filter((ticket) => {
        const lat = Number(
          ticket.latitude ??
          ticket.lat ??
          ticket.gps?.latitude ??
          ticket.gps?.lat ??
          ticket.location?.latitude ??
          ticket.location?.lat
        );
        const lng = Number(
          ticket.longitude ??
          ticket.lng ??
          ticket.lon ??
          ticket.gps?.longitude ??
          ticket.gps?.lng ??
          ticket.location?.longitude ??
          ticket.location?.lng
        );
        return Number.isFinite(lat) && Number.isFinite(lng);
      });

      validTickets.forEach((ticket) => {
        const lat = Number(
          ticket.latitude ??
          ticket.lat ??
          ticket.gps?.latitude ??
          ticket.gps?.lat ??
          ticket.location?.latitude ??
          ticket.location?.lat
        );
        const lng = Number(
          ticket.longitude ??
          ticket.lng ??
          ticket.lon ??
          ticket.gps?.longitude ??
          ticket.gps?.lng ??
          ticket.location?.longitude ??
          ticket.location?.lng
        );
        const info = statusInfo(ticket.status);

        const el = document.createElement("button");
        el.type = "button";
        el.title = ticket.ticketId || ticket.firebaseKey || "Ticket";
        el.style.width = "30px";
        el.style.height = "30px";
        el.style.borderRadius = "50%";
        el.style.border = "4px solid white";
        el.style.background = info.color;
        el.style.boxShadow = "0 3px 12px rgba(15,23,42,.28)";
        el.style.cursor = "pointer";

        el.addEventListener("click", () => onSelect(ticket));

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);

        markersRef.current.push(marker);
      });

      if (validTickets.length === 1) {
        const ticket = validTickets[0];
        const lat = Number(
          ticket.latitude ??
          ticket.lat ??
          ticket.gps?.latitude ??
          ticket.gps?.lat ??
          ticket.location?.latitude ??
          ticket.location?.lat
        );
        const lng = Number(
          ticket.longitude ??
          ticket.lng ??
          ticket.lon ??
          ticket.gps?.longitude ??
          ticket.gps?.lng ??
          ticket.location?.longitude ??
          ticket.location?.lng
        );
        map.flyTo({ center: [lng, lat], zoom: 14, duration: 700 });
      } else if (validTickets.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        validTickets.forEach((ticket) => {
          const lat = Number(
            ticket.latitude ?? ticket.lat ?? ticket.gps?.latitude ?? ticket.gps?.lat ??
            ticket.location?.latitude ?? ticket.location?.lat
          );
          const lng = Number(
            ticket.longitude ?? ticket.lng ?? ticket.lon ?? ticket.gps?.longitude ??
            ticket.gps?.lng ?? ticket.location?.longitude ?? ticket.location?.lng
          );
          bounds.extend([lng, lat]);
        });
        map.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 700 });
      }
    };

    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);

    return () => map.off("load", draw);
  }, [tickets, onSelect]);

  if (!import.meta.env.VITE_MAPBOX_TOKEN) {
    return (
      <div style={{ ...styles.map, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", color: "#64748b", padding: 30 }}>
          <strong>Mapbox token missing</strong>
          <p style={{ marginBottom: 0 }}>Add VITE_MAPBOX_TOKEN to .env.local.</p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} style={styles.map} />;
}

// ALL FOUR DEMO TICKETS USE THE SAME latest report PDF during demonstration.\nconst LOCAL_REPORT_PATH = `${import.meta.env.BASE_URL}REPORT-LATEST.pdf`;

const openLocalReport = () => {
  window.open(LOCAL_REPORT_PATH, "_blank", "noopener,noreferrer");
};

function ContractorDashboard({ user, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [section, setSection] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const contractorUid = user?.uid || "";


  const ensureDemoTickets = async () => {
    const missing = {};

    for (const [key, ticket] of Object.entries(DEMO_CONTRACTOR_TEST_TICKETS)) {
      const ticketRef = ref(realtimeDb, `compliants/${key}`);
      const snapshot = await get(ticketRef);

      // Demo mode: always keep the four presentation tickets in NEW state.
      // This guarantees all four appear in the New Tickets column on refresh.
      missing[key] = {
        ...ticket,
        status: "new",
        updatedAt: new Date().toISOString(),
      };
    }

    if (Object.keys(missing).length > 0) {
      await update(ref(realtimeDb, "compliants"), missing);
    }
  };

  const loadCompliants = async () => {
    setLoading(true);
    setError("");
    try {
      // Demo-only seed: ensure TICKET_003 and TICKET_004 exist in /compliants.
      // Contractor still reads /compliants only; this does not use admin realtime data.
      await ensureDemoTickets();

      // CONTRACTOR SOURCE OF TRUTH: /compliants ONLY.
      // This is a one-time read intentionally; contractor does NOT use realtime data.
      const snapshot = await get(ref(realtimeDb, "compliants"));
      const allTickets = toTicketArray(snapshot.exists() ? snapshot.val() : {});

      // IMPORTANT: Contractor workspace is driven exclusively by /compliants.
      // Do not filter against /complaints, /detections, or realtime admin data.
      // For the demo/workflow portal, every record present under /compliants
      // is available to the contractor workspace.
      const contractorTickets = allTickets;

      console.log("CONTRACTOR /compliants records:", contractorTickets);
      console.log("CONTRACTOR /compliants count:", contractorTickets.length);

      setTickets(contractorTickets);
      setSelectedTicket((current) => {
        if (!current) return contractorTickets[0] || null;
        return contractorTickets.find((ticket) => ticket.firebaseKey === current.firebaseKey) || current;
      });
    } catch (err) {
      console.error("Contractor /compliants read failed:", err);
      setError(err?.message || "Unable to load contractor complaints.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompliants();
  }, [contractorUid]);

  const counts = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        const key = statusInfo(ticket.status).key;
        acc[key] += 1;
        acc.total += 1;
        return acc;
      },
      { new: 0, in_progress: 0, completed: 0, total: 0 }
    );
  }, [tickets]);

  const updateTicket = async (ticket, patch) => {
    if (!ticket?.firebaseKey) return;
    await update(ref(realtimeDb, `compliants/${ticket.firebaseKey}`), patch);
    setTickets((current) =>
      current.map((item) =>
        item.firebaseKey === ticket.firebaseKey ? { ...item, ...patch } : item
      )
    );
    setSelectedTicket((current) =>
      current?.firebaseKey === ticket.firebaseKey ? { ...current, ...patch } : current
    );
  };

  const startRepair = async (ticket) => {
    setSaving(true);
    setError("");
    const now = new Date().toISOString();
    try {
      await updateTicket(ticket, {
        status: "in progress",
        acceptedAt: ticket.acceptedAt || now,
        repairStartedAt: ticket.repairStartedAt || now,
        updatedAt: now,
      });
      setSection("active");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to start repair.");
    } finally {
      setSaving(false);
    }
  };

  const completeRepair = async (ticket) => {
    if (!ticket?.firebaseKey) return;

    setSaving(true);
    setError("");

    const now = new Date().toISOString();
    const startedAt = ticket.repairStartedAt || ticket.acceptedAt || now;
    const raisedAt = ticket.createdAt || now;

    try {
      // No image upload and no report generation from the UI.
      // The demonstration always uses the single fixed PDF in /public.
      await updateTicket(ticket, {
        status: "completed",
        repairStartedAt: startedAt,
        completedAt: now,
        updatedAt: now,
      });

      setSelectedTicket({ ...ticket, status: "completed", repairStartedAt: startedAt, completedAt: now });
      setSection("completed");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to complete repair.");
    } finally {
      setSaving(false);
    }
  };


  const downloadReport = () => {
    // The demo uses one fixed PDF report for every ticket.
    openLocalReport();
  };


  const current = selectedTicket || tickets[0] || null;
  const currentStatus = statusInfo(current?.status);

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.logo}>RD</div>
          <div>
            <div style={styles.brandTitle}>Road Damage</div>
            <div style={styles.brandSub}>Intelligence Platform</div>
          </div>
        </div>

        <div style={styles.roleBadge}>CONTRACTOR PORTAL</div>

        <nav style={styles.nav}>
          {[
            ["dashboard", "Dashboard"],
            ["map", "Assigned Map"],
            ["new", "New Tickets"],
            ["active", "Repair Queue"],
            ["completed", "Completed"],
            ["reports", "Repair Reports"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              style={{ ...styles.navButton, ...(section === key ? styles.navActive : {}) }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarBottom}>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Signed in as</div>
          <div style={{ color: "white", fontWeight: 700, marginTop: 4 }}>
            {user?.displayName || "Contractor"}
          </div>
          <button type="button" onClick={onLogout} style={styles.logout}>Sign Out</button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <div style={styles.kicker}>CONTRACTOR WORKSPACE</div>
            <h1 style={styles.h1}>
              {section === "map" ? "Assigned Road Damage Map" :
                section === "new" ? "New Complaint Tickets" :
                section === "active" ? "In Progress Repairs" :
                section === "completed" ? "Completed Repairs" :
                section === "reports" ? "Repair Reports" :
                "Contractor Dashboard"}
            </h1>
            <p style={styles.subtitle}>Data source: Firebase <strong>/compliants</strong> — one-time contractor view.</p>
          </div>
          <button type="button" onClick={loadCompliants} style={styles.refresh}>Refresh Complaints</button>
        </header>

        {error && <div style={styles.error}>{error}</div>}

        {loading ? (
          <div style={styles.loading}>Loading contractor complaints from /compliants...</div>
        ) : section === "reports" ? (
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.h2}>Repair Report</h2>
                <p style={styles.muted}>
                  One fixed demonstration report is used for all contractor tickets.
                </p>
              </div>
              <button type="button" onClick={openLocalReport} style={styles.primary}>
                Open Latest PDF Report
              </button>
            </div>

            <div style={styles.reportFixed}>
              <div style={styles.reportFixedIcon}>PDF</div>
              <div>
                <strong>REPORT-LATEST.pdf</strong>
                <p style={styles.muted}>
                  Fixed report supplied in the public folder. No image upload or
                  report generation is required during the demonstration.
                </p>
              </div>
            </div>

            <button type="button" onClick={openLocalReport} style={styles.primary}>
              Open PDF Report
            </button>
          </section>
        ) : section === "map" ? (
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.h2}>Assigned Complaint Map</h2>
                <p style={styles.muted}>Only records from <strong>/compliants</strong> are shown. Map coordinates are read directly from each ticket.</p>
              </div>
              <Legend />
            </div>
            <MapPanel tickets={tickets} selectedTicket={current} onSelect={setSelectedTicket} />
            {current && <TicketDetail ticket={current} />}
          </section>
        ) : (
          <>
            <div style={styles.statsGrid}>
              <Stat label="New" value={counts.new} color="#dc2626" />
              <Stat label="In Progress" value={counts.in_progress} color="#2563eb" />
              <Stat label="Completed" value={counts.completed} color="#16a34a" />
              <Stat label="Total Tickets" value={counts.total} color="#0f172a" />
            </div>

            {section === "dashboard" && (
              <div style={styles.dashboardGrid}>
                <section style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div><h2 style={styles.h2}>Assigned Tickets</h2><p style={styles.muted}>Loaded from /compliants.</p></div>
                    <Legend />
                  </div>
                  <TicketList tickets={tickets} onSelect={setSelectedTicket} />
                </section>
                <section style={styles.card}>
                  <div style={styles.cardHeader}><div><h2 style={styles.h2}>Selected Ticket</h2><p style={styles.muted}>Contractor action panel.</p></div></div>
                  {current ? <ActionPanel ticket={current} saving={saving} onStart={startRepair} onComplete={completeRepair} /> : <div style={styles.empty}>No assigned complaints found in /compliants.</div>}
                </section>
              </div>
            )}

            {section === "new" && <section style={styles.card}><div style={styles.cardHeader}><div><h2 style={styles.h2}>New Complaint Tickets</h2><p style={styles.muted}>Status is read directly from /compliants.</p></div></div><TicketList tickets={tickets.filter(t => statusInfo(t.status).key === "new")} onSelect={setSelectedTicket} /></section>}
            {section === "active" && (
              <section style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h2 style={styles.h2}>Repair Queue</h2>
                    <p style={styles.muted}>
                      Select any of the four assigned tickets to start or complete its repair.
                    </p>
                  </div>
                  <Legend />
                </div>

                <RepairQueue
                  tickets={tickets}
                  selectedTicket={current}
                  onSelect={setSelectedTicket}
                />

                {current && (
                  <div style={{ marginTop: 18 }}>
                    <ActionPanel
                      ticket={current}
                      saving={saving}
                      onStart={startRepair}
                      onComplete={completeRepair}
                    />
                  </div>
                )}
              </section>
            )}
            {section === "completed" && <section style={styles.card}><div style={styles.cardHeader}><div><h2 style={styles.h2}>Completed Repairs</h2><p style={styles.muted}>Only tickets with Completed status are shown here.</p></div></div><TicketList tickets={tickets.filter(t => statusInfo(t.status).key === "completed")} onSelect={setSelectedTicket} /></section>}
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, color }) {
  return <div style={styles.stat}><div style={{ ...styles.statDot, background: color }} /><div><div style={styles.muted}>{label}</div><strong style={styles.statValue}>{value}</strong></div></div>;
}

function Legend() {
  return <div style={styles.legend}><span><i style={{ background: "#dc2626" }} /> New</span><span><i style={{ background: "#2563eb" }} /> In Progress</span><span><i style={{ background: "#16a34a" }} /> Completed</span></div>;
}

function TicketList({ tickets, onSelect }) {
  if (!tickets.length) return <div style={styles.empty}>No tickets in this section.</div>;
  return <div style={{ display: "grid", gap: 12 }}>{tickets.map((ticket) => {
    const info = statusInfo(ticket.status);
    return <button key={ticket.firebaseKey} type="button" onClick={() => onSelect(ticket)} style={styles.ticketRow}>
      <div style={{ ...styles.statusBar, background: info.color }} />
      <div style={{ flex: 1, textAlign: "left" }}><strong>{ticket.ticketId || ticket.firebaseKey}</strong><div style={styles.muted}>{ticket.area || "Unknown area"}</div></div>
      <div style={styles.ticketMeta}><span style={{ ...styles.badge, color: info.color, borderColor: `${info.color}55`, background: `${info.color}12` }}>{info.label}</span><span>{ticket.severity || "-"}</span></div>
    </button>;
  })}</div>;
}

function TicketDetail({ ticket }) {
  return <div style={styles.detailCard}><div style={styles.cardHeader}><div><h3 style={{ margin: 0 }}>{ticket.ticketId || ticket.firebaseKey}</h3><p style={styles.muted}>{ticket.area || "Road damage"}</p></div><span style={{ ...styles.badge, color: statusInfo(ticket.status).color }}>{statusInfo(ticket.status).label}</span></div><div style={styles.detailGrid}>{[
    ["Latitude", ticket.latitude], ["Longitude", ticket.longitude], ["Severity", ticket.severity], ["Length", ticket.length ? `${ticket.length} cm` : "-"], ["Width", ticket.width ? `${ticket.width} cm` : "-"], ["Depth", ticket.depth ? `${ticket.depth} cm` : "-"], ["Confidence", ticket.confidence ?? "-"], ["Raised", formatDate(ticket.createdAt)],
  ].map(([label, value]) => <div key={label}><span style={styles.muted}>{label}</span><strong>{value ?? "-"}</strong></div>)}</div></div>;
}

function ActionPanel({ ticket, saving, onStart, onComplete }) {
  const info = statusInfo(ticket.status);
  const isNew = info.key === "new";
  const isActive = info.key === "in_progress";
  const isCompleted = info.key === "completed";

  return (
    <div>
      <TicketDetail ticket={ticket} />

      <div style={styles.workflowPanel}>
        <div style={styles.workflowTitle}>Repair Workflow</div>

        <div style={styles.workflowSteps}>
          <span style={{ ...styles.workflowStep, ...(isNew ? styles.workflowNew : {}) }}>
            1. New
          </span>
          <span style={{ ...styles.workflowArrow }}>→</span>
          <span style={{ ...styles.workflowStep, ...(isActive ? styles.workflowActive : {}) }}>
            2. In Progress
          </span>
          <span style={{ ...styles.workflowArrow }}>→</span>
          <span style={{ ...styles.workflowStep, ...(isCompleted ? styles.workflowCompleted : {}) }}>
            3. Completed
          </span>
        </div>

        {isNew && (
          <button
            type="button"
            disabled={saving}
            onClick={() => onStart(ticket)}
            style={styles.primary}
          >
            {saving ? "Starting Repair..." : "Start Repair"}
          </button>
        )}

        {isActive && (
          <div style={styles.activeRepairBox}>
            <div>
              <strong>Repair in progress</strong>
              <p style={styles.muted}>
                No image upload is required. Complete the repair when the physical work is finished.
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => onComplete(ticket)}
              style={styles.success}
            >
              {saving ? "Completing..." : "Mark Repair Completed"}
            </button>
          </div>
        )}

        {isCompleted && (
          <div style={styles.completedBox}>
            ✓ Repair completed. The same fixed PDF report is available for every ticket.
            <div style={{ marginTop: 10 }}>
              <button type="button" onClick={openLocalReport} style={styles.primary}>
                Open Latest PDF Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RepairQueue({ tickets, selectedTicket, onSelect }) {
  if (!tickets.length) {
    return <div style={styles.empty}>No assigned tickets found.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {tickets.map((ticket) => {
        const info = statusInfo(ticket.status);
        const selected = selectedTicket?.firebaseKey === ticket.firebaseKey;

        return (
          <button
            key={ticket.firebaseKey}
            type="button"
            onClick={() => onSelect(ticket)}
            style={{
              ...styles.ticketRow,
              border: selected ? "2px solid #2563eb" : "1px solid #e2e8f0",
              background: selected ? "#eff6ff" : "white",
            }}
          >
            <div style={{ ...styles.statusBar, background: info.color }} />

            <div style={{ flex: 1, textAlign: "left" }}>
              <strong>{ticket.ticketId || ticket.firebaseKey}</strong>
              <div style={styles.muted}>
                {ticket.area || "Unknown area"} · {ticket.severity || "-"}
              </div>
            </div>

            <div style={styles.ticketMeta}>
              <span
                style={{
                  ...styles.badge,
                  color: info.color,
                  borderColor: `${info.color}55`,
                  background: `${info.color}12`,
                }}
              >
                {info.label}
              </span>
              {info.key === "new" && <span style={styles.selectHint}>Select to repair</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}


const styles = {
  shell: { minHeight: "100vh", display: "flex", background: "#f1f5f9", color: "#0f172a", fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  sidebar: { width: 250, background: "#0f172a", color: "white", padding: 22, display: "flex", flexDirection: "column", boxSizing: "border-box", position: "sticky", top: 0, height: "100vh" },
  brand: { display: "flex", gap: 12, alignItems: "center", marginBottom: 24 },
  logo: { width: 42, height: 42, borderRadius: 12, background: "#2563eb", display: "grid", placeItems: "center", fontWeight: 900 },
  brandTitle: { fontWeight: 800, fontSize: 15 }, brandSub: { color: "#94a3b8", fontSize: 11, marginTop: 2 },
  roleBadge: { border: "1px solid #334155", borderRadius: 999, padding: "8px 10px", color: "#93c5fd", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textAlign: "center", marginBottom: 18 },
  nav: { display: "grid", gap: 6 }, navButton: { border: 0, background: "transparent", color: "#cbd5e1", textAlign: "left", padding: "11px 12px", borderRadius: 9, cursor: "pointer", fontSize: 14 }, navActive: { background: "#1e293b", color: "white", fontWeight: 700 },
  sidebarBottom: { marginTop: "auto", borderTop: "1px solid #1e293b", paddingTop: 16 }, logout: { width: "100%", marginTop: 14, padding: "9px 12px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#e2e8f0", cursor: "pointer" },
  main: { flex: 1, minWidth: 0, padding: "28px 32px 50px" }, header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, marginBottom: 22 }, kicker: { color: "#2563eb", fontWeight: 800, fontSize: 11, letterSpacing: ".1em" }, h1: { margin: "5px 0 4px", fontSize: 28 }, h2: { margin: 0, fontSize: 19 }, subtitle: { margin: 0, color: "#64748b", fontSize: 13 }, muted: { color: "#64748b", fontSize: 13 }, refresh: { border: "1px solid #cbd5e1", background: "white", padding: "10px 14px", borderRadius: 9, cursor: "pointer", fontWeight: 700 }, error: { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: 12, borderRadius: 10, marginBottom: 16 }, loading: { background: "white", padding: 40, borderRadius: 14, textAlign: "center", color: "#64748b" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginBottom: 16 }, stat: { background: "white", border: "1px solid #e2e8f0", borderRadius: 13, padding: 18, display: "flex", gap: 12, alignItems: "center" }, statDot: { width: 11, height: 11, borderRadius: "50%" }, statValue: { display: "block", fontSize: 25, marginTop: 2 }, dashboardGrid: { display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(320px,.8fr)", gap: 16 }, card: { background: "white", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20, boxShadow: "0 5px 20px rgba(15,23,42,.04)" }, cardHeader: { display: "flex", justifyContent: "space-between", gap: 15, alignItems: "center", marginBottom: 16 }, legend: { display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#475569" }, legendItem: {}, legendDot: {}, legend: { display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#475569" },
  map: { width: "100%", height: 430, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" }, detailCard: { marginTop: 14, padding: 16, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12 }, detailGrid: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 }, detailGridItem: {}, badge: { display: "inline-flex", alignItems: "center", border: "1px solid", borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 800 }, ticketRow: { width: "100%", border: "1px solid #e2e8f0", background: "white", borderRadius: 11, padding: 13, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }, statusBar: { width: 5, alignSelf: "stretch", borderRadius: 999 }, ticketMeta: { display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#64748b" }, empty: { padding: 35, textAlign: "center", color: "#64748b", border: "1px dashed #cbd5e1", borderRadius: 10 }, primary: { border: 0, background: "#2563eb", color: "white", padding: "11px 15px", borderRadius: 9, cursor: "pointer", fontWeight: 800 }, success: { border: 0, background: "#16a34a", color: "white", padding: "11px 15px", borderRadius: 9, cursor: "pointer", fontWeight: 800 }, repairForm: { display: "grid", gap: 14, marginTop: 16 }, label: { fontWeight: 700, fontSize: 13, color: "#334155" }, textarea: { display: "block", width: "100%", minHeight: 100, marginTop: 7, border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }, preview: { width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, border: "1px solid #e2e8f0" }, completedBox: { marginTop: 16, padding: 13, background: "#dcfce7", color: "#166534", borderRadius: 9 }, reportGrid: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 16 }, reportImageLabel: { fontSize: 12, color: "#64748b", marginBottom: 7 }, reportImage: { width: "100%", height: 250, objectFit: "cover", borderRadius: 10, border: "1px solid #e2e8f0" }, imageFallback: { height: 250, display: "grid", placeItems: "center", background: "#f8fafc", borderRadius: 10, color: "#64748b" }, reportDetails: { gridColumn: "1 / -1", borderTop: "1px solid #e2e8f0", paddingTop: 10 }, detailRow: { display: "grid", gridTemplateColumns: "180px 1fr", gap: 15, padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 },
};


export default ContractorDashboard;
