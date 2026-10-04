const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a repaired road image directly to Cloudinary.
 *
 * @param {File} file - Image selected by the contractor
 * @returns {Promise<object>} Cloudinary upload response
 */
export const uploadRepairImage = async (file) => {
  if (!file) {
    throw new Error("No repair image selected.");
  }

  if (!CLOUD_NAME) {
    throw new Error("Cloudinary cloud name is missing.");
  }

  if (!UPLOAD_PRESET) {
    throw new Error("Cloudinary upload preset is missing.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please select a valid image file.");
  }

  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const uploadUrl =
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  console.log("Uploading repaired image to Cloudinary...");
  console.log("Cloud name:", CLOUD_NAME);
  console.log("Upload preset:", UPLOAD_PRESET);
  console.log("File:", file.name);

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Cloudinary upload failed:", data);

    throw new Error(
      data?.error?.message ||
        "Cloudinary image upload failed."
    );
  }

  console.log("Cloudinary upload successful.");
  console.log("Secure URL:", data.secure_url);

  return data;
};