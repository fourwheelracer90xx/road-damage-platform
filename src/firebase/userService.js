import {
  onValue,
  push,
  ref,
  set,
} from "firebase/database";

import realtimeDb from "./realtimeDatabase";

const now = () => new Date().toISOString();

export const createUserComplaint = async ({
  user,
  area,
  latitude,
  longitude,
  severity,
  depth,
  length,
  width,
  description,
  imageUrl,
  source = "citizen",
}) => {
  if (!user?.uid) {
    throw new Error("User must be logged in.");
  }

  if (!area?.trim()) {
    throw new Error("Area is required.");
  }

  if (
    latitude === "" ||
    longitude === "" ||
    latitude == null ||
    longitude == null
  ) {
    throw new Error("Latitude and longitude are required.");
  }

  const complaintRef = push(ref(realtimeDb, "complaints"));
  const firebaseKey = complaintRef.key;
  const timestamp = now();

  const complaint = {
    ticketId:
      `TICKET-${String(firebaseKey).slice(-6).toUpperCase()}`,
    userId: user.uid,
    userName:
      user.displayName ||
      user.email?.split("@")[0] ||
      "Citizen",
    userEmail: user.email || "",
    contractorId: "",
    contractorName: "",
    source,
    status: "new",
    area: area.trim(),
    latitude: Number(latitude),
    longitude: Number(longitude),
    severity: severity || "Unknown",
    depth: depth === "" || depth == null ? null : Number(depth),
    length: length === "" || length == null ? null : Number(length),
    width: width === "" || width == null ? null : Number(width),
    description: description?.trim() || "",
    imageUrl: imageUrl || "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await set(complaintRef, complaint);

  return { firebaseKey, ...complaint };
};

export const subscribeToUserComplaints = (userId, callback) =>
  onValue(
    ref(realtimeDb, "complaints"),
    (snapshot) => {
      const data = snapshot.val() || {};

      callback(
        Object.entries(data)
          .map(([key, value]) => ({
            firebaseKey: key,
            ...value,
          }))
          .filter((item) => item.userId === userId)
          .sort(
            (a, b) =>
              new Date(b.createdAt || 0) -
              new Date(a.createdAt || 0)
          )
      );
    },
    (error) => {
      console.error("Citizen complaint listener error:", error);
      callback([]);
    }
  );