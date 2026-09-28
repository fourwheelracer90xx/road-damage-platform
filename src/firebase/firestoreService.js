import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import db from "./firestore";

export const addTestPothole = async () => {
  const potholeData = {
    latitude: 13.0067,
    longitude: 80.2206,

    severity: "high",

    depth: 8.5,
    width: 120,
    length: 180,

    volume: 0,

    source: "test",

    status: "detected",

    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, "potholes"),
    potholeData
  );

  return docRef.id;
};

export const getPotholes = async () => {
  const snapshot = await getDocs(
    collection(db, "potholes")
  );

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};