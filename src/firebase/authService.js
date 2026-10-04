import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import auth from "./auth";

export const loginUser = async (email, password) => {
  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );
  return credential.user;
};

export const logoutUser = async () => {
  await signOut(auth);
};