import { useEffect, useMemo, useState } from "react";
import { subscribeToDetections } from "../firebase/detectionService";

const classify = (item) => {
  const size = Math.max(
    Number(item?.lengthCm) || 0,
    Number(item?.widthCm) || 0
  );

  if (size <= 20) return "Small";
  if (size <= 50) return "Medium";
  if (size <= 70) return "Large";
  return "Huge";
};

const severityClass = (severity) => {
  const value = String(severity || "").toLowerCase();

  if (value === "high") return "huge";
  if (value === "medium") return "active";
  if (value === "low") return "completed";

  return "completed";
};

export default function Potholes() {
  const [detections, setDetections] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToDetections((data) => {
      setDetections(
        Array.isArray(data) ? data : []
      );
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const filtered = useMemo(
    () =>
      detections.filter((detection) => {
        const searchable = [
          detection?.detectionId,
          detection?.firebaseKey,
          detection?.severity,
          detection?.device,
          detection?.latitude,
          detection?.longitude,
          detection?.trackId,
          detection?.timestamp,
        ]
          .map((value) => String(value ?? ""))
          .join(" ")
          .toLowerCase();

        return searchable.includes(
          query.toLowerCase()
        );
      }),
    [detections, query]
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>AI Detections</h2>
          <p>
            Live road-damage detections received from field devices
          </p>
        </div>

        <input
          className="search-input"
          placeholder="Search detections..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Detection Records</h3>
            <p>
              {filtered.length} of {detections.length} live detections
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Classification</th>
                <th>Severity</th>
                <th>Location</th>
                <th>Dimensions</th>
                <th>Confidence</th>
                <th>Device</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((detection) => (
                <tr key={detection.firebaseKey}>
                  <td>
                    <strong>
                      {detection.detectionId || detection.firebaseKey}
                    </strong>
                  </td>

                  <td>
                    <span className="status-badge completed">
                      {classify(detection)}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`status-badge ${severityClass(
                        detection.severity
                      )}`}
                    >
                      {detection.severity || "-"}
                    </span>
                  </td>

                  <td>
                    {detection.latitude ?? "-"},{" "}
                    {detection.longitude ?? "-"}
                  </td>

                  <td>
                    {detection.lengthCm ?? "-"} ×{" "}
                    {detection.widthCm ?? "-"} ×{" "}
                    {detection.depthCm ?? "-"} cm
                  </td>

                  <td>
                    {detection.confidence != null
                      ? `${(
                          Number(detection.confidence) * 100
                        ).toFixed(1)}%`
                      : "-"}
                  </td>

                  <td>
                    {detection.device || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!filtered.length && (
            <div className="empty-state">
              No live AI detections found.
            </div>
          )}
        </div>
      </section>
    </>
  );
}