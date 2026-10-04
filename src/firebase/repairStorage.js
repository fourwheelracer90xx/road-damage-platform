import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";

import app from "./config";

import {
  uploadRepairImage,
} from "./cloudinaryService";

const storage = getStorage(app);

/* =========================================================
   CONTRACTOR REPAIR IMAGE
   =========================================================
   Contractor repaired images are now uploaded to Cloudinary.
   The Cloudinary upload preset places them in:

   after_images/
========================================================= */

export const uploadRepairProofImage = async (
  file,
  contractorUid,
  ticketId
) => {
  if (!file) {
    throw new Error(
      "Please select a repaired road image."
    );
  }

  if (!file.type?.startsWith("image/")) {
    throw new Error(
      "Only image files are allowed."
    );
  }

  console.log("========================================");
  console.log("REPAIR IMAGE UPLOAD");
  console.log("Contractor:", contractorUid);
  console.log("Ticket:", ticketId);
  console.log("File:", file.name);
  console.log(
    "Size:",
    `${(file.size / 1024 / 1024).toFixed(2)} MB`
  );
  console.log("Type:", file.type);
  console.log(
    "Destination: Cloudinary / after_images"
  );
  console.log("========================================");

  try {
    const result =
      await uploadRepairImage(file);

    if (!result?.secure_url) {
      throw new Error(
        "Cloudinary did not return an image URL."
      );
    }

    console.log(
      "========================================"
    );
    console.log(
      "REPAIR IMAGE UPLOAD SUCCESS"
    );
    console.log(
      "Cloudinary URL:",
      result.secure_url
    );
    console.log(
      "Public ID:",
      result.public_id
    );
    console.log(
      "========================================"
    );

    return result.secure_url;

  } catch (error) {

    console.error(
      "========================================"
    );

    console.error(
      "REPAIR IMAGE UPLOAD FAILED"
    );

    console.error(error);

    console.error(
      "========================================"
    );

    throw new Error(
      error?.message ||
        "Failed to upload repaired image to Cloudinary."
    );
  }
};


/* =========================================================
   CITIZEN COMPLAINT IMAGE
   =========================================================

   KEEPING THE EXISTING CITIZEN UPLOAD WORKFLOW INTACT.

   We are NOT changing this yet because our current task is
   the contractor repair workflow.
========================================================= */

const uploadImage = async (
  file,
  path
) => {

  if (!file) {
    throw new Error(
      "Please select an image."
    );
  }

  if (!file.type?.startsWith("image/")) {
    throw new Error(
      "Only image files are allowed."
    );
  }

  const safeName =
    file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

  const fileRef =
    storageRef(
      storage,
      `${path}/${Date.now()}-${safeName}`
    );

  await uploadBytes(
    fileRef,
    file
  );

  return getDownloadURL(
    fileRef
  );
};


/* =========================================================
   CITIZEN COMPLAINT IMAGE EXPORT
========================================================= */

export const uploadComplaintImage = (
  file,
  userUid
) =>
  uploadImage(
    file,
    `citizenComplaints/${userUid}`
  );