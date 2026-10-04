import { useEffect, useMemo, useRef } from "react";
import * as mapboxgl from "mapbox-gl/esm";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const DEFAULT_CENTER = [80.2205, 12.9758];

const normalizeStatus = (value) =>
  String(value || "new")
    .toLowerCase()
    .trim()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

const statusMeta = (status) => {
  const normalized = normalizeStatus(status);

  if (
    normalized === "completed" ||
    normalized === "resolved" ||
    normalized === "closed"
  ) {
    return {
      label: "Completed",
      color: "#16a34a",
    };
  }

  if (
    normalized === "in_progress" ||
    normalized === "active" ||
    normalized === "accepted" ||
    normalized === "repairing"
  ) {
    return {
      label: "In Progress",
      color: "#2563eb",
    };
  }

  return {
    label: "New",
    color: "#dc2626",
  };
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const validCoordinates = (ticket) => {
  const latitude = toNumber(
    ticket?.latitude ??
      ticket?.lat ??
      ticket?.gps?.latitude ??
      ticket?.location?.latitude
  );

  const longitude = toNumber(
    ticket?.longitude ??
      ticket?.lng ??
      ticket?.lon ??
      ticket?.gps?.longitude ??
      ticket?.location?.longitude
  );

  if (latitude === null || longitude === null) {
    return null;
  }

  if (latitude === 0 && longitude === 0) {
    return null;
  }

  if (latitude < -90 || latitude > 90) {
    return null;
  }

  if (longitude < -180 || longitude > 180) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
};

const escapeHtml = (value) => {
  if (value === null || value === undefined) return "-";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

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

const popupHtml = (ticket) => {
  const coordinates = validCoordinates(ticket);
  const meta = statusMeta(ticket.status);

  const ticketId =
    ticket.ticketId ||
    ticket.id ||
    ticket.firebaseKey ||
    "Ticket";

  const area =
    ticket.area ||
    ticket.location?.area ||
    "Road damage location";

  const image =
    ticket.imageUrl ||
    ticket.image_url ||
    ticket.beforeImageUrl ||
    "";

  const repairedImage =
    ticket.repairedImageUrl ||
    ticket.repairImageUrl ||
    "";

  return `
    <div style="
      width:320px;
      font-family:Arial,sans-serif;
      color:#0f172a;
    ">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        margin-bottom:12px;
      ">
        <div>
          <div style="
            font-size:18px;
            font-weight:800;
            margin-bottom:3px;
          ">
            ${escapeHtml(ticketId)}
          </div>

          <div style="
            font-size:12px;
            color:#64748b;
          ">
            ${escapeHtml(area)}
          </div>
        </div>

        <span style="
          background:${meta.color};
          color:white;
          padding:5px 9px;
          border-radius:999px;
          font-size:11px;
          font-weight:700;
          white-space:nowrap;
        ">
          ${meta.label}
        </span>
      </div>

      <div style="
        border-top:1px solid #e2e8f0;
        padding-top:10px;
      ">

        <div style="
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:8px;
          font-size:12px;
        ">

          <div>
            <strong>Severity</strong><br/>
            ${escapeHtml(ticket.severity || "-")}
          </div>

          <div>
            <strong>Source</strong><br/>
            ${escapeHtml(ticket.source || "-")}
          </div>

          <div>
            <strong>Length</strong><br/>
            ${escapeHtml(ticket.length ?? "-")} cm
          </div>

          <div>
            <strong>Width</strong><br/>
            ${escapeHtml(ticket.width ?? "-")} cm
          </div>

          <div>
            <strong>Depth</strong><br/>
            ${escapeHtml(ticket.depth ?? "-")} cm
          </div>

          <div>
            <strong>Confidence</strong><br/>
            ${
              ticket.confidence !== undefined &&
              ticket.confidence !== null
                ? `${Number(ticket.confidence) * 100}%`
                : "-"
            }
          </div>

          <div>
            <strong>Latitude</strong><br/>
            ${coordinates ? coordinates.latitude : "-"}
          </div>

          <div>
            <strong>Longitude</strong><br/>
            ${coordinates ? coordinates.longitude : "-"}
          </div>

          <div>
            <strong>Volume</strong><br/>
            ${
              ticket.volumeLiters ??
              ticket.volume ??
              "-"
            } L
          </div>

          <div>
            <strong>Contractor</strong><br/>
            ${escapeHtml(ticket.contractorName || "-")}
          </div>

        </div>

        <div style="
          margin-top:10px;
          padding-top:10px;
          border-top:1px solid #e2e8f0;
          font-size:11px;
          color:#64748b;
        ">
          <strong>Ticket raised:</strong>
          ${escapeHtml(formatDate(ticket.createdAt))}
        </div>

        ${
          ticket.repairStartedAt
            ? `
              <div style="
                margin-top:5px;
                font-size:11px;
                color:#64748b;
              ">
                <strong>Repair started:</strong>
                ${escapeHtml(formatDate(ticket.repairStartedAt))}
              </div>
            `
            : ""
        }

        ${
          ticket.completedAt
            ? `
              <div style="
                margin-top:5px;
                font-size:11px;
                color:#64748b;
              ">
                <strong>Completed:</strong>
                ${escapeHtml(formatDate(ticket.completedAt))}
              </div>
            `
            : ""
        }

        ${
          ticket.description
            ? `
              <div style="
                margin-top:10px;
                padding:8px;
                background:#f8fafc;
                border-radius:8px;
                font-size:12px;
              ">
                <strong>Description</strong><br/>
                ${escapeHtml(ticket.description)}
              </div>
            `
            : ""
        }

        ${
          ticket.repairDescription
            ? `
              <div style="
                margin-top:10px;
                padding:8px;
                background:#f0fdf4;
                border-radius:8px;
                font-size:12px;
              ">
                <strong>Repair Description</strong><br/>
                ${escapeHtml(ticket.repairDescription)}
              </div>
            `
            : ""
        }

        ${
          image
            ? `
              <div style="margin-top:12px;">
                <div style="
                  font-size:11px;
                  font-weight:700;
                  margin-bottom:5px;
                ">
                  Before Repair
                </div>

                <img
                  src="${escapeHtml(image)}"
                  alt="Before repair"
                  style="
                    width:100%;
                    height:130px;
                    object-fit:cover;
                    border-radius:8px;
                    border:1px solid #e2e8f0;
                  "
                  onerror="this.style.display='none'"
                />
              </div>
            `
            : ""
        }

        ${
          repairedImage
            ? `
              <div style="margin-top:12px;">
                <div style="
                  font-size:11px;
                  font-weight:700;
                  margin-bottom:5px;
                ">
                  After Repair
                </div>

                <img
                  src="${escapeHtml(repairedImage)}"
                  alt="After repair"
                  style="
                    width:100%;
                    height:130px;
                    object-fit:cover;
                    border-radius:8px;
                    border:1px solid #bbf7d0;
                  "
                  onerror="this.style.display='none'"
                />
              </div>
            `
            : ""
        }

      </div>
    </div>
  `;
};

export default function ContractorMap({
  tickets = [],
  height = 340,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const validTickets = useMemo(() => {
    return tickets
      .map((ticket) => {
        const coordinates = validCoordinates(ticket);

        if (!coordinates) {
          return null;
        }

        return {
          ticket,
          coordinates,
        };
      })
      .filter(Boolean);
  }, [tickets]);

  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    if (!MAPBOX_TOKEN) {
      console.error(
        "ContractorMap: VITE_MAPBOX_TOKEN is missing."
      );
      return;
    }

    if (mapRef.current) {
      return;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: DEFAULT_CENTER,
      zoom: 10.5,
      accessToken: MAPBOX_TOKEN,
    });

    map.addControl(
      new mapboxgl.NavigationControl(),
      "top-right"
    );

    map.on("load", () => {
      map.resize();
    });

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();

      markersRef.current.forEach((marker) => {
        marker.remove();
      });

      markersRef.current = [];

      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    markersRef.current.forEach((marker) => {
      marker.remove();
    });

    markersRef.current = [];

    if (!validTickets.length) {
      map.flyTo({
        center: DEFAULT_CENTER,
        zoom: 10.5,
        essential: true,
      });

      return;
    }

    const bounds = new mapboxgl.LngLatBounds();

    validTickets.forEach(
      ({ ticket, coordinates }) => {
        const meta = statusMeta(ticket.status);

        const markerElement =
          document.createElement("div");

        markerElement.style.width = "32px";
        markerElement.style.height = "32px";
        markerElement.style.borderRadius = "50%";
        markerElement.style.background = meta.color;
        markerElement.style.border =
          "3px solid white";
        markerElement.style.boxShadow =
          "0 3px 12px rgba(0,0,0,.30)";
        markerElement.style.cursor = "pointer";
        markerElement.style.display = "flex";
        markerElement.style.alignItems = "center";
        markerElement.style.justifyContent =
          "center";
        markerElement.style.color = "white";
        markerElement.style.fontWeight = "800";
        markerElement.style.fontSize = "14px";

        markerElement.innerHTML =
          meta.label === "Completed"
            ? "✓"
            : meta.label === "In Progress"
              ? "◷"
              : "!";

        const popup =
          new mapboxgl.Popup({
            offset: 20,
            maxWidth: "360px",
            closeButton: true,
            closeOnClick: false,
          }).setHTML(
            popupHtml(ticket)
          );

        const marker =
          new mapboxgl.Marker({
            element: markerElement,
            anchor: "center",
          })
            .setLngLat([
              coordinates.longitude,
              coordinates.latitude,
            ])
            .setPopup(popup)
            .addTo(map);

        markersRef.current.push(marker);

        bounds.extend([
          coordinates.longitude,
          coordinates.latitude,
        ]);
      }
    );

    if (validTickets.length === 1) {
      const only =
        validTickets[0].coordinates;

      map.flyTo({
        center: [
          only.longitude,
          only.latitude,
        ],
        zoom: 14.5,
        essential: true,
      });
    } else {
      map.fitBounds(bounds, {
        padding: 70,
        maxZoom: 14,
        duration: 700,
      });
    }

    setTimeout(() => {
      map.resize();
    }, 100);
  }, [validTickets]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        minHeight: height,
        overflow: "hidden",
        borderRadius: "12px",
      }}
    >
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: height,
        }}
      />

      {!validTickets.length && (
        <div
          style={{
            position: "absolute",
            left: "16px",
            bottom: "16px",
            background: "white",
            padding: "10px 13px",
            borderRadius: "9px",
            boxShadow:
              "0 4px 18px rgba(15,23,42,.15)",
            fontSize: "12px",
            color: "#64748b",
          }}
        >
          No assigned tickets with valid GPS
          coordinates.
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: "14px",
          bottom: "14px",
          background: "white",
          borderRadius: "10px",
          padding: "10px 12px",
          boxShadow:
            "0 4px 18px rgba(15,23,42,.16)",
          zIndex: 2,
          fontSize: "12px",
        }}
      >
        <strong
          style={{
            display: "block",
            marginBottom: "7px",
          }}
        >
          Ticket Status
        </strong>

        <div style={{ marginBottom: "5px" }}>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#dc2626",
              marginRight: "7px",
            }}
          />
          New
        </div>

        <div style={{ marginBottom: "5px" }}>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#2563eb",
              marginRight: "7px",
            }}
          />
          In Progress
        </div>

        <div>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#16a34a",
              marginRight: "7px",
            }}
          />
          Completed
        </div>
      </div>
    </div>
  );
}