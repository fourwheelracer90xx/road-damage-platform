// ============================================================
// DETECTION → CONTRACTOR TICKET BRIDGE
// ============================================================
//
// Firebase /detections
//        ↓
// Detect AI detection
//        ↓
// Classify pothole
//        ↓
// Assign contractor
//        ↓
// Create /complaints ticket
//
// IMPORTANT:
// - /detections is never modified.
// - /complaints is the contractor workflow database.
// - Existing tickets are not duplicated.
// ============================================================

import {
  get,
  onValue,
  ref,
  set,
} from "firebase/database";

import realtimeDb from "./realtimeDatabase";


// ============================================================
// TEMPORARY CONTRACTOR ASSIGNMENT
// ============================================================
//
// This is being used for the first end-to-end test.
//
// Later this will be replaced with:
// GPS → Area → Contractor assignment
//

const DEFAULT_CONTRACTOR = {
  contractorId:
    "pKhOoUMr3BWom3oTL0wH018tLgu1",

  contractorName:
    "Someash Thirunavukkarasu",
};


// ============================================================
// NORMALIZE NUMBER
// ============================================================

const toNumber = (value) => {

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;

};


// ============================================================
// NORMALIZE STATUS
// ============================================================

const normalizeStatus = (value) => {

  return String(value || "new")
    .toLowerCase()
    .trim()
    .replace(/-/g, "_")
    .replace(/ /g, "_");

};


// ============================================================
// CLASSIFY POTHOLE
// ============================================================
//
// 0 - 20 cm       → Small
// >20 - 50 cm     → Medium
// >50 - 70 cm     → Large
// >70 cm          → Huge
//
// Classification uses the largest horizontal dimension.
//

const classifyPothole = (detection = {}) => {

  const length = toNumber(
    detection?.length ??
    detection?.length_cm
  );

  const width = toNumber(
    detection?.width ??
    detection?.width_cm
  );

  const size = Math.max(
    length || 0,
    width || 0
  );


  if (size > 70) {
    return "Huge";
  }


  if (size > 50) {
    return "Large";
  }


  if (size > 20) {
    return "Medium";
  }


  return "Small";
};


// ============================================================
// GET AREA
// ============================================================

const getArea = (detection = {}) => {

  return (
    detection?.area ??
    detection?.location?.area ??
    "Unassigned Area"
  );

};


// ============================================================
// GET LATITUDE
// ============================================================

const getLatitude = (detection = {}) => {

  return toNumber(
    detection?.latitude ??
    detection?.lat ??
    detection?.gps?.latitude
  );

};


// ============================================================
// GET LONGITUDE
// ============================================================

const getLongitude = (detection = {}) => {

  return toNumber(
    detection?.longitude ??
    detection?.lng ??
    detection?.lon ??
    detection?.gps?.longitude
  );

};


// ============================================================
// GET IMAGE URL
// ============================================================

const getImageUrl = (detection = {}) => {

  return (
    detection?.imageUrl ??
    detection?.image_url ??
    detection?.before_image ??
    ""
  );

};


// ============================================================
// GENERATE TICKET ID
// ============================================================
//
// The Firebase detection key is used to generate a
// deterministic ticket ID.
//
// Therefore the same detection cannot create multiple
// tickets.
//

const generateTicketId = (detectionKey) => {

  const cleanKey = String(
    detectionKey || "UNKNOWN"
  )
    .replace(
      /[^a-zA-Z0-9_-]/g,
      ""
    )
    .slice(-12);

  return `TICKET-${cleanKey}`;

};


// ============================================================
// BUILD COMPLAINT
// ============================================================

const buildComplaint = (
  detectionKey,
  detection
) => {

  const latitude =
    getLatitude(detection);

  const longitude =
    getLongitude(detection);


  const length =
    toNumber(
      detection?.length ??
      detection?.length_cm
    );


  const width =
    toNumber(
      detection?.width ??
      detection?.width_cm
    );


  const depth =
    toNumber(
      detection?.depth ??
      detection?.depth_cm
    );


  const volume =
    toNumber(
      detection?.volume ??
      detection?.volume_liters
    );


  const confidence =
    toNumber(
      detection?.confidence
    );


  const severity =
    classifyPothole(detection);


  const ticketId =
    generateTicketId(
      detectionKey
    );


  const area =
    getArea(detection);


  return {

    // ========================================================
    // TICKET IDENTITY
    // ========================================================

    ticketId,

    detectionId:
      detection?.id ??
      detectionKey,

    firebaseDetectionKey:
      detectionKey,


    // ========================================================
    // CONTRACTOR ASSIGNMENT
    // ========================================================

    contractorId:
      DEFAULT_CONTRACTOR.contractorId,

    contractorName:
      DEFAULT_CONTRACTOR.contractorName,


    // ========================================================
    // WORKFLOW
    // ========================================================

    status: "new",

    source:
      detection?.source ??
      detection?.device ??
      "AI Detection",


    // ========================================================
    // LOCATION
    // ========================================================

    area,

    latitude,

    longitude,


    // ========================================================
    // POTHOLE CLASSIFICATION
    // ========================================================

    severity,

    confidence,


    // ========================================================
    // DIMENSIONS
    // ========================================================

    length,

    width,

    depth,

    volume,


    // ========================================================
    // ORIGINAL IMAGE
    // ========================================================

    imageUrl:
      getImageUrl(detection),


    // ========================================================
    // ORIGINAL DETECTION INFORMATION
    // ========================================================

    device:
      detection?.device ??
      "Unknown",

    speed:
      toNumber(
        detection?.speed ??
        detection?.speed_kmh
      ),

    timestamp:
      detection?.timestamp ??
      null,

    uploadedAt:
      detection?.uploadedAt ??
      detection?.uploaded_at ??
      null,


    // ========================================================
    // WORKFLOW TIMESTAMPS
    // ========================================================

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),

    acceptedAt:
      null,

    repairStartedAt:
      null,

    completedAt:
      null,


    // ========================================================
    // REPAIR DATA
    // ========================================================

    repairedImageUrl:
      "",

    repairDescription:
      "",


    // ========================================================
    // PERFORMANCE DATA
    // ========================================================

    responseTimeSeconds:
      null,

    repairDurationSeconds:
      null,

    totalResolutionSeconds:
      null,

  };

};


// ============================================================
// CHECK WHETHER TICKET ALREADY EXISTS
// ============================================================

const ticketAlreadyExists = async (
  detectionKey
) => {

  const ticketId =
    generateTicketId(
      detectionKey
    );


  const ticketRef =
    ref(
      realtimeDb,
      `complaints/${ticketId}`
    );


  const snapshot =
    await get(ticketRef);


  return snapshot.exists();

};


// ============================================================
// CREATE ONE TICKET
// ============================================================

export const createTicketFromDetection =
  async (
    detectionKey,
    detection
  ) => {

    try {

      // ------------------------------------------------------
      // VALIDATION
      // ------------------------------------------------------

      if (!detectionKey) {

        console.warn(
          "Detection ticket bridge: missing detection key."
        );

        return null;

      }


      if (!detection) {

        console.warn(
          "Detection ticket bridge: detection data is empty."
        );

        return null;

      }


      // ------------------------------------------------------
      // DUPLICATE CHECK
      // ------------------------------------------------------

      const exists =
        await ticketAlreadyExists(
          detectionKey
        );


      if (exists) {

        console.log(
          "Ticket already exists for detection:",
          detectionKey
        );

        return null;

      }


      // ------------------------------------------------------
      // BUILD TICKET
      // ------------------------------------------------------

      const complaint =
        buildComplaint(
          detectionKey,
          detection
        );


      // ------------------------------------------------------
      // FIREBASE TICKET LOCATION
      // ------------------------------------------------------

      const ticketRef =
        ref(
          realtimeDb,
          `complaints/${complaint.ticketId}`
        );


      // ------------------------------------------------------
      // WRITE TICKET
      // ------------------------------------------------------

      await set(
        ticketRef,
        complaint
      );


      // ------------------------------------------------------
      // SUCCESS LOG
      // ------------------------------------------------------

      console.log(
        "========================================"
      );

      console.log(
        "NEW CONTRACTOR TICKET CREATED"
      );

      console.log(
        "Ticket ID:",
        complaint.ticketId
      );

      console.log(
        "Detection ID:",
        complaint.detectionId
      );

      console.log(
        "Contractor:",
        complaint.contractorName
      );

      console.log(
        "Contractor UID:",
        complaint.contractorId
      );

      console.log(
        "Area:",
        complaint.area
      );

      console.log(
        "Severity:",
        complaint.severity
      );

      console.log(
        "GPS:",
        complaint.latitude,
        complaint.longitude
      );

      console.log(
        "========================================"
      );


      return complaint;


    } catch (error) {

      console.error(
        "Failed to create contractor ticket:",
        error
      );

      return null;

    }

  };


// ============================================================
// PROCESS ALL EXISTING DETECTIONS
// ============================================================
//
// Useful during testing.
//
// When the bridge starts, existing /detections records
// are converted into /complaints if they don't already
// have a corresponding ticket.
//

export const processExistingDetections =
  async () => {

    try {

      const detectionsRef =
        ref(
          realtimeDb,
          "detections"
        );


      const snapshot =
        await get(
          detectionsRef
        );


      if (!snapshot.exists()) {

        console.log(
          "No detections found."
        );

        return;

      }


      const detections =
        snapshot.val();


      const keys =
        Object.keys(
          detections
        );


      console.log(
        "Existing detections:",
        keys.length
      );


      for (
        const detectionKey of keys
      ) {

        await createTicketFromDetection(
          detectionKey,
          detections[detectionKey]
        );

      }


    } catch (error) {

      console.error(
        "Failed to process existing detections:",
        error
      );

    }

  };


// ============================================================
// START REALTIME DETECTION → TICKET BRIDGE
// ============================================================
//
// Watches:
//
// /detections
//
// Whenever Firebase data changes:
//
// /detections
//      ↓
// process detection records
//      ↓
// create missing /complaints tickets
//
// ============================================================

export const startDetectionTicketBridge =
  () => {

    console.log(
      "========================================"
    );

    console.log(
      "STARTING DETECTION → TICKET BRIDGE"
    );

    console.log(
      "Watching Firebase /detections..."
    );

    console.log(
      "========================================"
    );


    const detectionsRef =
      ref(
        realtimeDb,
        "detections"
      );


    const unsubscribe =
      onValue(
        detectionsRef,

        async (snapshot) => {

          try {

            // ------------------------------------------------
            // NO DETECTIONS
            // ------------------------------------------------

            if (
              !snapshot.exists()
            ) {

              console.log(
                "No detections available yet."
              );

              return;

            }


            // ------------------------------------------------
            // GET DETECTIONS
            // ------------------------------------------------

            const detections =
              snapshot.val();


            const keys =
              Object.keys(
                detections
              );


            console.log(
              "Detection records received:",
              keys.length
            );


            // ------------------------------------------------
            // CREATE MISSING TICKETS
            // ------------------------------------------------

            for (
              const detectionKey of keys
            ) {

              await createTicketFromDetection(
                detectionKey,
                detections[detectionKey]
              );

            }


          } catch (error) {

            console.error(
              "Detection ticket bridge error:",
              error
            );

          }

        },

        // ----------------------------------------------------
        // FIREBASE LISTENER ERROR
        // ----------------------------------------------------

        (error) => {

          console.error(
            "Firebase /detections listener error:",
            error
          );

        }

      );


    return unsubscribe;

  };