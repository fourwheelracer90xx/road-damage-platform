import { useEffect, useState } from "react";
import { get, ref } from "firebase/database";
import realtimeDb from "../firebase/realtimeDatabase";
import { subscribeToComplaints } from "../firebase/realtimeService";

export default function Contractors() {
  const [contractors, setContractors] = useState([]);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const load = async () => {
      const snapshot = await get(ref(realtimeDb, "users"));
      const data = snapshot.val() || {};
      setContractors(
        Object.entries(data)
          .map(([uid, value]) => ({ uid, ...value }))
          .filter((x) => x.role === "contractor")
      );
    };
    load().catch(console.error);
    return subscribeToComplaints(setTickets);
  }, []);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Contractors</h2>
          <p>Contractor profiles and current assignments</p>
        </div>
      </div>

      <section className="panel">
        <div className="contractor-directory">
          {contractors.map((c) => {
            const assigned = tickets.filter(
              (t) => t.contractorId === c.uid
            );

            return (
              <article className="directory-card" key={c.uid}>
                <div className="avatar">{(c.name || c.email || "C").charAt(0).toUpperCase()}</div>
                <div>
                  <h3>{c.name || c.displayName || "Contractor"}</h3>
                  <p>{c.email || "-"}</p>
                  <span>{assigned.length} assigned ticket{assigned.length === 1 ? "" : "s"}</span>
                </div>
              </article>
            );
          })}

          {!contractors.length && (
            <div className="empty-state">No contractor users found under /users.</div>
          )}
        </div>
      </section>
    </>
  );
}