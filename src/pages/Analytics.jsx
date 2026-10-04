import { useEffect, useMemo, useState } from "react";
import { subscribeToDetections } from "../firebase/detectionService";
import { subscribeToReports } from "../firebase/reportService";

const normalizeSeverity = (value) => {
  const severity = String(value || "")
    .trim()
    .toUpperCase();

  if (severity === "HIGH") return "HIGH";
  if (severity === "MEDIUM") return "MEDIUM";
  if (severity === "LOW") return "LOW";

  return "UNKNOWN";
};

const classifyDetection = (item) => {
  const size = Math.max(
    Number(item?.lengthCm) || 0,
    Number(item?.widthCm) || 0
  );

  if (size > 70) return "Huge";
  if (size > 50) return "Large";
  if (size > 20) return "Medium";

  return "Small";
};

export default function Analytics() {
  const [detections, setDetections] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const unsubscribeDetections =
      subscribeToDetections((data) => {
        setDetections(
          Array.isArray(data) ? data : []
        );
      });

    const unsubscribeReports =
      subscribeToReports((data) => {
        setReports(
          Array.isArray(data) ? data : []
        );
      });

    return () => {
      unsubscribeDetections();
      unsubscribeReports();
    };
  }, []);

  const data = useMemo(() => {
    const high = detections.filter(
      (item) =>
        normalizeSeverity(item?.severity) === "HIGH"
    ).length;

    const medium = detections.filter(
      (item) =>
        normalizeSeverity(item?.severity) === "MEDIUM"
    ).length;

    const low = detections.filter(
      (item) =>
        normalizeSeverity(item?.severity) === "LOW"
    ).length;

    const huge = detections.filter(
      (item) =>
        classifyDetection(item) === "Huge"
    ).length;

    const averageRepair =
      reports.length
        ? Math.round(
            reports.reduce(
              (sum, report) =>
                sum +
                (Number(
                  report?.repairDurationSeconds
                ) || 0),
              0
            ) / reports.length
          )
        : 0;

    return {
      total: detections.length,
      high,
      medium,
      low,
      huge,
      reports: reports.length,
      averageRepair,
    };
  }, [detections, reports]);

  return (
    <>
      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="page-heading">
        <div>
          <h2>Analytics</h2>

          <p>
            Live AI road-damage detection and
            repair-performance indicators
          </p>
        </div>

        <div className="live-pill">
          <span />
          FIREBASE LIVE
        </div>
      </div>

      {/* =====================================================
          STATISTICS
          ===================================================== */}

      <div className="stats-grid">

        <div className="stat-card">
          <div className="stat-icon blue">#</div>

          <div>
            <span>Total AI Detections</span>
            <strong>{data.total}</strong>
          </div>
        </div>


        <div className="stat-card">
          <div className="stat-icon orange">!</div>

          <div>
            <span>High Severity</span>
            <strong>{data.high}</strong>
          </div>
        </div>


        <div className="stat-card">
          <div className="stat-icon blue">●</div>

          <div>
            <span>Medium Severity</span>
            <strong>{data.medium}</strong>
          </div>
        </div>


        <div className="stat-card">
          <div className="stat-icon green">✓</div>

          <div>
            <span>Low Severity</span>
            <strong>{data.low}</strong>
          </div>
        </div>


        <div className="stat-card">
          <div className="stat-icon dark">!</div>

          <div>
            <span>Huge &gt;70 cm</span>
            <strong>{data.huge}</strong>
          </div>
        </div>


        <div className="stat-card">
          <div className="stat-icon purple">R</div>

          <div>
            <span>Repair Reports</span>
            <strong>{data.reports}</strong>
          </div>
        </div>

      </div>


      {/* =====================================================
          CRITICAL ROAD DAMAGE
          ===================================================== */}

      {data.huge > 0 && (
        <section className="panel">

          <div className="panel-heading">

            <div>

              <h3>
                Critical Road Damage Alert
              </h3>

              <p>
                {data.huge} detection
                {data.huge === 1 ? "" : "s"} exceed the
                70 cm immediate-response threshold.
              </p>

            </div>


            <span className="status-badge huge">
              IMMEDIATE RESPONSE
            </span>

          </div>


          {/* =================================================
              COUNCILLOR DETAILS
              ================================================= */}

          <div
            style={{
              marginTop: "24px",
              padding: "22px 24px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >

              <div>

                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "8px",
                  }}
                >
                  Councillor Details
                </div>


                <h3
                  style={{
                    margin: 0,
                    fontSize: "21px",
                    color: "#0f172a",
                  }}
                >
                  J.K. Manikandan
                </h3>


                <p
                  style={{
                    margin:
                      "5px 0 0 0",
                    color: "#475569",
                    fontSize: "14px",
                  }}
                >
                  Councillor — Ward 186
                </p>

              </div>


              <div
                style={{
                  padding:
                    "7px 12px",
                  borderRadius: "999px",
                  background: "#fee2e2",
                  color: "#b91c1c",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                }}
              >
                IMMEDIATE RESPONSE
              </div>

            </div>


            {/* CONTACT DETAILS */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
                marginTop: "20px",
              }}
            >

              <div
                style={{
                  background: "#ffffff",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "14px 16px",
                }}
              >

                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#64748b",
                    marginBottom: "5px",
                  }}
                >
                  PHONE
                </div>

                <div
                  style={{
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  9445467186
                </div>

                <div
                  style={{
                    marginTop: "3px",
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  9841066761
                </div>

              </div>


              <div
                style={{
                  background: "#ffffff",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "14px 16px",
                }}
              >

                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#64748b",
                    marginBottom: "5px",
                  }}
                >
                  EMAIL
                </div>

                <div
                  style={{
                    fontWeight: 700,
                    color: "#2563eb",
                    wordBreak:
                      "break-word",
                  }}
                >
                  ward186@chennaicorporaion.gov.in
                </div>

              </div>

            </div>


            {/* ALERT MESSAGE */}

            <div
              style={{
                marginTop: "18px",
                padding:
                  "13px 15px",
                background: "#fff7ed",
                border:
                  "1px solid #fed7aa",
                borderRadius: "10px",
                color: "#9a3412",
                fontSize: "13px",
                lineHeight: "1.5",
              }}
            >
              A pothole exceeding 70 cm has been
              detected and requires immediate
              municipal attention.
            </div>

          </div>

        </section>
      )}


      {/* =====================================================
          REPAIR PERFORMANCE
          ===================================================== */}

      <section className="panel">

        <h3>
          Repair Performance
        </h3>

        <p>
          Average repair duration across generated
          reports:

          <strong>
            {" "}

            {data.averageRepair
              ? `${Math.round(
                  data.averageRepair / 60
                )} minutes`
              : "No completed repairs yet"}

          </strong>
        </p>

      </section>

    </>
  );
}