import { useEffect, useRef } from "react";
import * as mapboxgl from "mapbox-gl/esm";
import "mapbox-gl/dist/mapbox-gl.css";

/* =========================================================
   SAFE HTML ESCAPING
   ========================================================= */

const esc = (value) =>
  String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");


/* =========================================================
   NUMBER HELPER
   ========================================================= */

const numberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};


/* =========================================================
   REAL DETECTION FIELD HELPERS
   ========================================================= */

const getLatitude = (item) =>
  numberOrNull(item?.gps?.latitude) ??
  numberOrNull(item?.latitude);

const getLongitude = (item) =>
  numberOrNull(item?.gps?.longitude) ??
  numberOrNull(item?.longitude);

const getLength = (item) =>
  numberOrNull(item?.measurement?.length_cm) ??
  numberOrNull(item?.lengthCm) ??
  numberOrNull(item?.length);

const getWidth = (item) =>
  numberOrNull(item?.measurement?.width_cm) ??
  numberOrNull(item?.widthCm) ??
  numberOrNull(item?.width);

const getDepth = (item) =>
  numberOrNull(item?.measurement?.depth_cm) ??
  numberOrNull(item?.depthCm) ??
  numberOrNull(item?.depth);

const getArea = (item) =>
  numberOrNull(item?.measurement?.area_cm2) ??
  numberOrNull(item?.areaCm2);

const getVolume = (item) =>
  numberOrNull(item?.measurement?.volume_liters) ??
  numberOrNull(item?.volumeLiters);

const getImageUrl = (item) =>
  item?.image?.cloudinary_url ||
  item?.imageUrl ||
  item?.image?.url ||
  "";

const getDetectionId = (item) =>
  item?.detectionId ||
  item?.id ||
  item?.firebaseKey ||
  "Detection";


/* =========================================================
   SIZE CLASSIFICATION
   ========================================================= */

function classify(item) {
  const length = getLength(item) || 0;
  const width = getWidth(item) || 0;
  const size = Math.max(length, width);

  if (size <= 20) {
    return {
      label: "Small",
      range: "0–20 cm",
      color: "#2563eb",
      size,
    };
  }

  if (size <= 50) {
    return {
      label: "Medium",
      range: ">20–50 cm",
      color: "#eab308",
      size,
    };
  }

  if (size <= 70) {
    return {
      label: "Large",
      range: ">50–70 cm",
      color: "#dc2626",
      size,
    };
  }

  return {
    label: "Huge",
    range: ">70 cm",
    color: "#111827",
    size,
  };
}


/* =========================================================
   DATE FORMATTER
   ========================================================= */

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};


/* =========================================================
   ADMIN MAP
   ========================================================= */

export default function AdminMap({ potholes = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  /* =======================================================
     CREATE MAP
     ======================================================= */

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const token = import.meta.env.VITE_MAPBOX_TOKEN;

    if (!token) {
      console.error(
        "AdminMap: VITE_MAPBOX_TOKEN is missing."
      );
      return;
    }

    const map = new mapboxgl.Map({
      accessToken: token,
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",

      // Chennai starting position.
      // The map will automatically move to the live detections.
      center: [80.2205, 13.01],
      zoom: 11.5,
    });

    map.addControl(
      new mapboxgl.NavigationControl(),
      "top-right"
    );

    map.on("load", () => {
      console.log("ADMIN MAP: Mapbox loaded successfully.");
    });

    map.on("error", (event) => {
      console.error(
        "ADMIN MAP: Mapbox error:",
        event?.error || event
      );
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => {
        marker.remove();
      });

      markersRef.current = [];

      map.remove();
      mapRef.current = null;
    };
  }, []);


  /* =======================================================
     UPDATE LIVE DETECTION MARKERS
     ======================================================= */

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    console.log("========================================");
    console.log("ADMIN MAP — REAL DETECTIONS");
    console.log("DETECTION COUNT:", potholes.length);
    console.log("========================================");


    /* =====================================================
       REMOVE OLD MARKERS
       ===================================================== */

    markersRef.current.forEach((marker) => {
      marker.remove();
    });

    markersRef.current = [];


    /* =====================================================
       VALID GPS DETECTIONS

       IMPORTANT:
       0,0 is the GPS "no fix" position and appears near
       Africa on the map. It must never become a marker.
       ===================================================== */

    const validDetections = potholes.filter((item) => {
      const latitude = getLatitude(item);
      const longitude = getLongitude(item);

      if (
        latitude === null ||
        longitude === null
      ) {
        return false;
      }

      // Ignore invalid GPS origin (0,0).
      if (
        latitude === 0 &&
        longitude === 0
      ) {
        return false;
      }

      // Ignore impossible geographic coordinates.
      if (
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return false;
      }

      return true;
    });


    console.log(
      "VALID GPS DETECTIONS:",
      validDetections.length
    );

    console.log(
      "IGNORED GPS RECORDS:",
      potholes.length - validDetections.length
    );


    if (!validDetections.length) {
      console.warn(
        "ADMIN MAP: No valid GPS detections available."
      );
      return;
    }


    /* =====================================================
       MAP BOUNDS
       ===================================================== */

    const bounds = new mapboxgl.LngLatBounds();


    /* =====================================================
       CREATE MARKERS
       ===================================================== */

    validDetections.forEach((item) => {
      const latitude = getLatitude(item);
      const longitude = getLongitude(item);

      const classification = classify(item);

      const length = getLength(item);
      const width = getWidth(item);
      const depth = getDepth(item);
      const area = getArea(item);
      const volume = getVolume(item);

      const imageUrl = getImageUrl(item);

      const detectionId = getDetectionId(item);

      const severity =
        item?.severity ||
        classification.label;

      const confidence =
        numberOrNull(item?.confidence);

      const device =
        item?.device ||
        "Unknown device";

      const timestamp =
        item?.timestamp ||
        item?.uploaded_at ||
        item?.uploadedAt ||
        null;


      /* ===================================================
         MARKER
         =================================================== */

      const el = document.createElement("div");

      el.className = "admin-map-marker";

      el.style.width = "30px";
      el.style.height = "30px";
      el.style.borderRadius = "50%";
      el.style.background = classification.color;
      el.style.border = "4px solid white";
      el.style.boxShadow =
        "0 3px 12px rgba(0,0,0,0.45)";
      el.style.cursor = "pointer";
      el.style.boxSizing = "border-box";

      el.title =
        `${classification.label} — ${classification.size.toFixed(2)} cm`;


      /* ===================================================
         POPUP IMAGE
         =================================================== */

      const image = imageUrl
        ? `
          <img
            src="${esc(imageUrl)}"
            alt="Road damage detection"
            style="
              width:100%;
              height:180px;
              object-fit:cover;
              border-radius:10px;
              margin-top:12px;
              display:block;
              border:1px solid #e2e8f0;
            "
          />
        `
        : `
          <div
            style="
              margin-top:12px;
              height:100px;
              display:flex;
              align-items:center;
              justify-content:center;
              background:#f8fafc;
              border-radius:10px;
              border:1px dashed #cbd5e1;
              color:#64748b;
              font-size:12px;
            "
          >
            No detection image available
          </div>
        `;


      const confidenceText =
        confidence !== null
          ? `${(confidence * 100).toFixed(1)}%`
          : "-";


      /* ===================================================
         POPUP
         =================================================== */

      const popup = new mapboxgl.Popup({
        offset: 26,
        maxWidth: "390px",
      }).setHTML(`
        <div
          style="
            font-family:Inter,Arial,sans-serif;
            color:#0f172a;
            min-width:300px;
          "
        >

          <div
            style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:10px;
              margin-bottom:8px;
            "
          >
            <strong style="font-size:17px;">
              Road Damage Detection
            </strong>

            <span
              style="
                padding:5px 9px;
                border-radius:999px;
                background:${classification.color};
                color:white;
                font-size:10px;
                font-weight:800;
                white-space:nowrap;
              "
            >
              ${esc(String(severity).toUpperCase())}
            </span>
          </div>


          <div
            style="
              font-size:12px;
              color:#64748b;
              margin-bottom:14px;
            "
          >
            Detection ID:
            <strong style="color:#334155;">
              ${esc(detectionId)}
            </strong>
          </div>


          <div
            style="
              padding:12px;
              background:#f8fafc;
              border-radius:10px;
              margin-bottom:12px;
            "
          >
            <strong
              style="
                display:block;
                font-size:13px;
                margin-bottom:8px;
              "
            >
              Location
            </strong>

            <div
              style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:8px;
                font-size:12px;
              "
            >
              <div>
                <span style="color:#64748b;">
                  Latitude
                </span>
                <br/>
                <strong>
                  ${latitude.toFixed(8)}
                </strong>
              </div>

              <div>
                <span style="color:#64748b;">
                  Longitude
                </span>
                <br/>
                <strong>
                  ${longitude.toFixed(8)}
                </strong>
              </div>
            </div>
          </div>


          <div
            style="
              padding:12px;
              background:#f8fafc;
              border-radius:10px;
              margin-bottom:12px;
            "
          >
            <strong
              style="
                display:block;
                font-size:13px;
                margin-bottom:8px;
              "
            >
              Detection Information
            </strong>

            <div
              style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:10px;
                font-size:12px;
              "
            >
              <div>
                <span style="color:#64748b;">
                  Device
                </span>
                <br/>
                <strong>
                  ${esc(device)}
                </strong>
              </div>

              <div>
                <span style="color:#64748b;">
                  Confidence
                </span>
                <br/>
                <strong>
                  ${confidenceText}
                </strong>
              </div>

              <div>
                <span style="color:#64748b;">
                  Severity
                </span>
                <br/>
                <strong>
                  ${esc(severity)}
                </strong>
              </div>

              <div>
                <span style="color:#64748b;">
                  Classification
                </span>
                <br/>
                <strong>
                  ${classification.label}
                </strong>
              </div>
            </div>
          </div>


          <div
            style="
              padding:12px;
              background:#f8fafc;
              border-radius:10px;
              margin-bottom:12px;
            "
          >
            <strong
              style="
                display:block;
                font-size:13px;
                margin-bottom:8px;
              "
            >
              Measurements
            </strong>

            <div
              style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:10px;
                font-size:12px;
              "
            >
              <div>
                <span style="color:#64748b;">
                  Length
                </span>
                <br/>
                <strong>
                  ${length !== null ? `${length} cm` : "-"}
                </strong>
              </div>

              <div>
                <span style="color:#64748b;">
                  Width
                </span>
                <br/>
                <strong>
                  ${width !== null ? `${width} cm` : "-"}
                </strong>
              </div>

              <div>
                <span style="color:#64748b;">
                  Depth
                </span>
                <br/>
                <strong>
                  ${depth !== null ? `${depth} cm` : "-"}
                </strong>
              </div>

              <div>
                <span style="color:#64748b;">
                  Area
                </span>
                <br/>
                <strong>
                  ${area !== null ? `${area} cm²` : "-"}
                </strong>
              </div>

              <div>
                <span style="color:#64748b;">
                  Volume
                </span>
                <br/>
                <strong>
                  ${volume !== null ? `${volume} L` : "-"}
                </strong>
              </div>

              <div>
                <span style="color:#64748b;">
                  Size Class
                </span>
                <br/>
                <strong>
                  ${classification.size.toFixed(2)} cm
                </strong>
              </div>
            </div>
          </div>


          <div
            style="
              font-size:11px;
              color:#64748b;
              margin-bottom:4px;
            "
          >
            <strong>Detected:</strong>
            ${esc(formatDate(timestamp))}
          </div>

          ${image}

        </div>
      `);


      /* ===================================================
         ADD MARKER
         =================================================== */

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([
          longitude,
          latitude,
        ])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);

      bounds.extend([
        longitude,
        latitude,
      ]);
    });


    /* =====================================================
       AUTO CENTER
       ===================================================== */

    if (validDetections.length === 1) {
      const detection = validDetections[0];

      map.flyTo({
        center: [
          getLongitude(detection),
          getLatitude(detection),
        ],
        zoom: 15,
        duration: 800,
      });

      return;
    }


    map.fitBounds(bounds, {
      padding: {
        top: 100,
        bottom: 100,
        left: 100,
        right: 100,
      },
      maxZoom: 15,
      duration: 800,
    });

  }, [potholes]);


  /* =======================================================
     MAP UI
     ======================================================= */

  return (
    <div className="admin-map-wrap">

      <div
        ref={containerRef}
        className="admin-map"
      />

      <div className="map-legend admin-legend">

        <strong>
          Pothole Size
        </strong>

        <span>
          <i style={{ background: "#2563eb" }} />
          Small · 0–20 cm
        </span>

        <span>
          <i style={{ background: "#eab308" }} />
          Medium · &gt;20–50 cm
        </span>

        <span>
          <i style={{ background: "#dc2626" }} />
          Large · &gt;50–70 cm
        </span>

        <span>
          <i style={{ background: "#111827" }} />
          Huge · &gt;70 cm
        </span>

      </div>

    </div>
  );
}