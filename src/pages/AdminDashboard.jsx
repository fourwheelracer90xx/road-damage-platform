import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AdminMap from "../components/AdminMap";

import {
  subscribeToDetections,
} from "../firebase/detectionService";

import {
  subscribeToReports,
} from "../firebase/reportService";


/* =========================================================
   DATE FORMAT
   ========================================================= */

const formatDate = (value) => {

  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
};


/* =========================================================
   SEVERITY NORMALIZATION
   ========================================================= */

const normalizeSeverity = (
  value
) => {

  const severity =
    String(
      value || ""
    )
      .trim()
      .toUpperCase();

  if (
    severity === "HIGH"
  ) {
    return "HIGH";
  }

  if (
    severity === "MEDIUM"
  ) {
    return "MEDIUM";
  }

  if (
    severity === "LOW"
  ) {
    return "LOW";
  }

  return "UNKNOWN";
};


/* =========================================================
   SIZE CLASSIFICATION
   ========================================================= */

const classifyDetection = (
  detection
) => {

  const length =
    Number(
      detection?.lengthCm
    ) || 0;

  const width =
    Number(
      detection?.widthCm
    ) || 0;

  const size =
    Math.max(
      length,
      width
    );


  if (size > 70) {
    return "Huge";
  }

  if (size > 50) {
    return "Large";
  }

  if (size > 20) {
    return "Medium";
  }

  return "Small";
};


/* =========================================================
   MAIN ADMIN DASHBOARD
   ========================================================= */

export default function AdminDashboard() {

  /* -------------------------------------------------------
     REAL AI DETECTIONS
     ------------------------------------------------------- */

  const [
    detections,
    setDetections,
  ] = useState([]);


  /* -------------------------------------------------------
     REPAIR REPORTS
     ------------------------------------------------------- */

  const [
    reports,
    setReports,
  ] = useState([]);


  /* -------------------------------------------------------
     LOADING
     ------------------------------------------------------- */

  const [
    loading,
    setLoading,
  ] = useState(true);


  /* =======================================================
     FIREBASE LISTENERS
     ======================================================= */

  useEffect(() => {

    let detectionsLoaded =
      false;

    let reportsLoaded =
      false;


    const checkLoaded = () => {

      if (
        detectionsLoaded &&
        reportsLoaded
      ) {
        setLoading(false);
      }

    };


    /* -----------------------------------------------------
       REAL-TIME DETECTIONS
       ----------------------------------------------------- */

    const unsubscribeDetections =
      subscribeToDetections(
        (data) => {

          console.log(
            "ADMIN DASHBOARD — REAL DETECTIONS:",
            data
          );

          setDetections(
            Array.isArray(data)
              ? data
              : []
          );

          detectionsLoaded =
            true;

          checkLoaded();

        }
      );


    /* -----------------------------------------------------
       REPAIR REPORTS
       ----------------------------------------------------- */

    const unsubscribeReports =
      subscribeToReports(
        (data) => {

          setReports(
            Array.isArray(data)
              ? data
              : []
          );

          reportsLoaded =
            true;

          checkLoaded();

        }
      );


    /* -----------------------------------------------------
       CLEANUP
       ----------------------------------------------------- */

    return () => {

      unsubscribeDetections();
      unsubscribeReports();

    };

  }, []);


  /* =======================================================
     STATISTICS
     ======================================================= */

  const stats =
    useMemo(() => {

      const high =
        detections.filter(
          (item) =>
            normalizeSeverity(
              item.severity
            ) === "HIGH"
        ).length;


      const medium =
        detections.filter(
          (item) =>
            normalizeSeverity(
              item.severity
            ) === "MEDIUM"
        ).length;


      const low =
        detections.filter(
          (item) =>
            normalizeSeverity(
              item.severity
            ) === "LOW"
        ).length;


      const huge =
        detections.filter(
          (item) =>
            classifyDetection(
              item
            ) === "Huge"
        ).length;


      return {

        total:
          detections.length,

        high,

        medium,

        low,

        huge,

        reports:
          reports.length,

      };

    }, [
      detections,
      reports,
    ]);


  /* =======================================================
     RECENT DETECTIONS
     ======================================================= */

  const recentDetections =
    useMemo(() => {

      return [
        ...detections,
      ]
        .sort(
          (a, b) =>
            new Date(
              b.timestamp || 0
            ) -
            new Date(
              a.timestamp || 0
            )
        )
        .slice(
          0,
          8
        );

    }, [
      detections,
    ]);


  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <>


      {/* =================================================
          HEADER
          ================================================= */}

      <div className="page-heading">

        <div>

          <h2>
            Administrator Dashboard
          </h2>

          <p>
            Real-time AI road-damage
            monitoring and response control
          </p>

        </div>


        <div className="live-pill">

          <span />

          FIREBASE LIVE

        </div>

      </div>


      {/* =================================================
          LOADING
          ================================================= */}

      {loading && (

        <section className="panel">

          <div className="empty-state">

            Connecting to live AI
            detection data...

          </div>

        </section>

      )}


      {/* =================================================
          STATISTICS
          ================================================= */}

      <div className="stats-grid">


        {/* TOTAL */}

        <div className="stat-card">

          <div className="stat-icon blue">
            #
          </div>

          <div>

            <span>
              Total AI Detections
            </span>

            <strong>
              {stats.total}
            </strong>

          </div>

        </div>


        {/* HIGH */}

        <div className="stat-card">

          <div className="stat-icon orange">
            !
          </div>

          <div>

            <span>
              High Severity
            </span>

            <strong>
              {stats.high}
            </strong>

          </div>

        </div>


        {/* MEDIUM */}

        <div className="stat-card">

          <div className="stat-icon blue">
            ●
          </div>

          <div>

            <span>
              Medium Severity
            </span>

            <strong>
              {stats.medium}
            </strong>

          </div>

        </div>


        {/* LOW */}

        <div className="stat-card">

          <div className="stat-icon green">
            ✓
          </div>

          <div>

            <span>
              Low Severity
            </span>

            <strong>
              {stats.low}
            </strong>

          </div>

        </div>


        {/* HUGE */}

        <div className="stat-card">

          <div className="stat-icon dark">
            !
          </div>

          <div>

            <span>
              Huge &gt;70 cm
            </span>

            <strong>
              {stats.huge}
            </strong>

          </div>

        </div>


        {/* REPORTS */}

        <div className="stat-card">

          <div className="stat-icon purple">
            R
          </div>

          <div>

            <span>
              Repair Reports
            </span>

            <strong>
              {stats.reports}
            </strong>

          </div>

        </div>

      </div>


      {/* =================================================
          CRITICAL ALERT
          ================================================= */}

      {stats.huge > 0 && (

        <section className="panel">

          <div className="panel-heading">

            <div>

              <h3>
                Critical Road Damage Alert
              </h3>

              <p>
                Severe pothole detected in{" "}
                <strong>Perungudi</strong>.
                Immediate action is required.
              </p>

            </div>


            <span className="status-badge huge">

              IMMEDIATE RESPONSE

            </span>

          </div>


          {/* =================================================
              PERUNGUDI COUNCILLOR CONTACT
              ================================================= */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              marginTop: "18px",
              padding: "16px 18px",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              background: "#ffffff",
            }}
          >

            <div
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: "#2563eb",
                color: "#ffffff",
                fontSize: "22px",
                fontWeight: 800,
              }}
            >
              JK
            </div>


            <div>

              <h4
                style={{
                  margin: "0 0 4px",
                  fontSize: "18px",
                  color: "#0f172a",
                }}
              >
                J.K. Manikandan
              </h4>


              <p
                style={{
                  margin: "0 0 10px",
                  color: "#64748b",
                  fontSize: "14px",
                }}
              >
                Councillor Ward 186
              </p>


              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  marginTop: "6px",
                  color: "#475569",
                  fontSize: "14px",
                }}
              >
                <span>☎</span>
                <span>
                  9445467186 / 9841066761
                </span>
              </div>


              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  marginTop: "6px",
                  color: "#475569",
                  fontSize: "14px",
                }}
              >
                <span>✉</span>
                <span>
                  ward186@chennaicorporation.gov.in
                </span>
              </div>

            </div>

          </div>

        </section>

      )}


      {/* =================================================
          LIVE MAP
          ================================================= */}

      <section className="panel">

        <div className="panel-heading">

          <div>

            <h3>
              Live Road Damage Map
            </h3>

            <p>
              Real-time AI detections
              received from field devices.
            </p>

          </div>

        </div>


        <AdminMap
          potholes={detections}
        />

      </section>


      {/* =================================================
          RECENT AI DETECTIONS
          ================================================= */}

      <section className="panel">

        <div className="panel-heading">

          <div>

            <h3>
              Recent AI Detections
            </h3>

            <p>
              Live records received from
              Raspberry Pi / field devices.
            </p>

          </div>


          <div
            style={{
              fontSize: "14px",
              color: "#64748b",
            }}
          >

            {detections.length}

            {" "}

            detection
            {detections.length === 1
              ? ""
              : "s"}

          </div>

        </div>


        {recentDetections.length === 0 ? (

          <div className="empty-state">

            No AI detections received.

          </div>

        ) : (

          <div className="activity-list">

            {recentDetections.map(
              (detection) => {

                const severity =
                  normalizeSeverity(
                    detection.severity
                  );


                return (

                  <div
                    className="activity-item"
                    key={
                      detection.firebaseKey
                    }
                  >


                    {/* IMAGE */}

                    {detection.imageUrl ? (

                      <img
                        src={
                          detection.imageUrl
                        }
                        alt="AI detected road damage"
                        style={{
                          width: "72px",
                          height: "72px",
                          objectFit: "cover",
                          borderRadius: "10px",
                          flexShrink: 0,
                        }}
                      />

                    ) : (

                      <div
                        style={{
                          width: "72px",
                          height: "72px",
                          borderRadius: "10px",
                          background:
                            "#f1f5f9",
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "center",
                          color:
                            "#64748b",
                          fontSize:
                            "12px",
                          flexShrink: 0,
                        }}
                      >
                        No image
                      </div>

                    )}


                    {/* DATA */}

                    <div
                      style={{
                        display: "flex",
                        flexDirection:
                          "column",
                        gap: "4px",
                      }}
                    >

                      <strong>

                        {detection.detectionId ||
                          detection.firebaseKey}

                      </strong>


                      <span>

                        Severity:

                        {" "}

                        <strong>
                          {severity}
                        </strong>

                        {" · "}

                        Confidence:

                        {" "}

                        {detection.confidence != null
                          ? `${(
                              detection.confidence *
                              100
                            ).toFixed(1)}%`
                          : "-"}

                      </span>


                      <span>

                        Dimensions:

                        {" "}

                        {detection.lengthCm ??
                          "-"}{" "}

                        ×

                        {" "}

                        {detection.widthCm ??
                          "-"}{" "}

                        ×

                        {" "}

                        {detection.depthCm ??
                          "-"}{" "}

                        cm

                      </span>


                      <span>

                        GPS:

                        {" "}

                        {detection.latitude ??
                          "-"}

                        ,

                        {" "}

                        {detection.longitude ??
                          "-"}

                      </span>


                      <span>

                        Volume:

                        {" "}

                        {detection.volumeLiters ??
                          "-"}{" "}

                        L

                        {" · "}

                        Device:

                        {" "}

                        {detection.device ||
                          "-"}

                      </span>


                      <span>

                        {formatDate(
                          detection.timestamp
                        )}

                      </span>

                    </div>

                  </div>

                );

              }
            )}

          </div>

        )}

      </section>


    </>
  );
}