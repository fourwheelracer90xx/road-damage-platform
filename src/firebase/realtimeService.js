import {
  onValue,
  ref,
} from "firebase/database";

import realtimeDb from "./realtimeDatabase";

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizePothole = (firebaseKey, raw = {}) => ({
  firebaseKey,
  id: raw.id ?? firebaseKey,
  latitude: toNumber(raw.latitude ?? raw.gps?.latitude),
  longitude: toNumber(raw.longitude ?? raw.gps?.longitude),
  severity: raw.severity ?? raw.class ?? "Unknown",
  confidence: toNumber(raw.confidence),
  length: toNumber(raw.length ?? raw.length_cm),
  width: toNumber(raw.width ?? raw.width_cm),
  depth: toNumber(raw.depth ?? raw.depth_cm),
  volume: toNumber(raw.volume ?? raw.volume_liters),
  imageUrl: raw.imageUrl ?? raw.image_url ?? raw.before_image ?? "",
  source: raw.source ?? raw.device ?? "unknown",
  speed: toNumber(raw.speed ?? raw.speed_kmh),
  status: raw.status ?? "detected",
  timestamp: raw.timestamp ?? null,
  uploadedAt: raw.uploadedAt ?? raw.uploaded_at ?? null,
  missionId: raw.missionId ?? raw.mission_id ?? "",
  droneId: raw.droneId ?? raw.drone_id ?? "",
  raw,
});

const normalizeComplaint = (firebaseKey, raw = {}) => ({
  firebaseKey,
  ticketId: raw.ticketId ?? raw.id ?? firebaseKey,
  potholeId: raw.potholeId ?? "",
  userId: raw.userId ?? raw.reportedBy ?? "",
  userName: raw.userName ?? "",
  userEmail: raw.userEmail ?? "",
  contractorId: raw.contractorId ?? "",
  contractorName: raw.contractorName ?? "",
  source: raw.source ?? "unknown",
  status: String(raw.status ?? "new").toLowerCase().replace(/-/g, "_"),
  area: raw.area ?? "",
  latitude: toNumber(raw.latitude),
  longitude: toNumber(raw.longitude),
  severity: raw.severity ?? "Unknown",
  depth: toNumber(raw.depth),
  length: toNumber(raw.length),
  width: toNumber(raw.width),
  description: raw.description ?? "",
  imageUrl: raw.imageUrl ?? raw.image_url ?? "",
  repairedImageUrl: raw.repairedImageUrl ?? raw.repairImageUrl ?? "",
  repairDescription: raw.repairDescription ?? "",
  createdAt: raw.createdAt ?? null,
  updatedAt: raw.updatedAt ?? null,
  acceptedAt: raw.acceptedAt ?? raw.repairStartedAt ?? null,
  repairStartedAt: raw.repairStartedAt ?? raw.acceptedAt ?? null,
  completedAt: raw.completedAt ?? null,
  responseTimeSeconds: toNumber(raw.responseTimeSeconds),
  repairDurationSeconds: toNumber(raw.repairDurationSeconds),
  totalResolutionSeconds: toNumber(raw.totalResolutionSeconds),
  raw,
});

export const subscribeToPotholes = (callback) =>
  onValue(
    ref(realtimeDb, "Potholes"),
    (snapshot) => {
      const data = snapshot.val() || {};
      callback(
        Object.entries(data).map(([key, value]) =>
          normalizePothole(key, value)
        )
      );
    },
    (error) => {
      console.error("Pothole listener error:", error);
      callback([]);
    }
  );

export const subscribeToComplaints = (callback) =>
  onValue(
    ref(realtimeDb, "complaints"),
    (snapshot) => {
      const data = snapshot.val() || {};
      callback(
        Object.entries(data)
          .map(([key, value]) => normalizeComplaint(key, value))
          .sort(
            (a, b) =>
              new Date(b.createdAt || 0) -
              new Date(a.createdAt || 0)
          )
      );
    },
    (error) => {
      console.error("Complaint listener error:", error);
      callback([]);
    }
  );

export const subscribeToContractorTickets = (
  contractorUid,
  callback
) =>
  subscribeToComplaints((tickets) => {
    callback(
      tickets.filter(
        (ticket) => ticket.contractorId === contractorUid
      )
    );
  });

export { normalizeComplaint, normalizePothole };