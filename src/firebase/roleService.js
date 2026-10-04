import { get, ref } from "firebase/database";
import realtimeDb from "./realtimeDatabase";

export const getUserProfile = async (uid) => {
  if (!uid) return null;

  const snapshot = await get(
    ref(realtimeDb, `users/${uid}`)
  );

  if (!snapshot.exists()) return null;

  return {
    uid,
    ...snapshot.val(),
  };
};