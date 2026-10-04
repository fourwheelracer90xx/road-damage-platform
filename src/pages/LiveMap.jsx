import { useEffect, useState } from "react";
import { subscribeToDetections } from "../firebase/detectionService";
import AdminMap from "../components/AdminMap";

export default function LiveMap() {
  const [detections, setDetections] = useState([]);

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

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Live Map</h2>
          <p>
            Real-time geographic visualization of AI road-damage detections
          </p>
        </div>

        <div className="live-pill">
          <span />
          FIREBASE LIVE
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Live Road Damage Map</h3>
            <p>
              {detections.length} live AI detection
              {detections.length === 1 ? "" : "s"} received from field devices.
            </p>
          </div>
        </div>

        <AdminMap potholes={detections} />
      </section>
    </>
  );
}