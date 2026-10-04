import {
  onValue,
  ref,
} from "firebase/database";

import realtimeDb from "./realtimeDatabase";


/*
=========================================================
NORMALIZE SEVERITY
=========================================================
*/

const normalizeSeverity = (severity) => {
  const value = String(
    severity || ""
  )
    .trim()
    .toUpperCase();

  if (value === "LOW") {
    return "LOW";
  }

  if (value === "MEDIUM") {
    return "MEDIUM";
  }

  if (value === "HIGH") {
    return "HIGH";
  }

  return "UNKNOWN";
};


/*
=========================================================
NORMALIZE ONE DETECTION
=========================================================
*/

export const normalizeDetection = (
  firebaseKey,
  data
) => {

  const detection =
    data || {};

  const gps =
    detection.gps || {};

  const measurement =
    detection.measurement || {};

  const image =
    detection.image || {};

  return {

    /*
    ---------------------------------------------
    FIREBASE IDENTIFIERS
    ---------------------------------------------
    */

    firebaseKey,

    detectionId:
      detection.id ||
      firebaseKey,

    trackId:
      detection.track_id ??
      null,


    /*
    ---------------------------------------------
    DEVICE
    ---------------------------------------------
    */

    device:
      detection.device ||
      "Unknown Device",


    /*
    ---------------------------------------------
    IMAGE
    ---------------------------------------------
    */

    imageUrl:
      image.cloudinary_url ||
      "",

    localImagePath:
      image.local_path ||
      "",


    /*
    ---------------------------------------------
    AI INFORMATION
    ---------------------------------------------
    */

    confidence:
      Number.isFinite(
        Number(detection.confidence)
      )
        ? Number(detection.confidence)
        : null,

    severity:
      normalizeSeverity(
        detection.severity
      ),


    /*
    ---------------------------------------------
    GPS
    ---------------------------------------------
    */

    latitude:
      gps.latitude ??
      null,

    longitude:
      gps.longitude ??
      null,

    altitude:
      gps.altitude ??
      null,

    satellites:
      gps.satellites ??
      null,

    speed:
      gps.speed ??
      null,


    /*
    ---------------------------------------------
    MEASUREMENTS
    ---------------------------------------------
    */

    areaCm2:
      measurement.area_cm2 ??
      null,

    lengthCm:
      measurement.length_cm ??
      null,

    widthCm:
      measurement.width_cm ??
      null,

    depthCm:
      measurement.depth_cm ??
      null,

    distanceM:
      measurement.distance_m ??
      null,

    volumeLiters:
      measurement.volume_liters ??
      null,


    /*
    ---------------------------------------------
    BOUNDING BOX
    ---------------------------------------------
    */

    bbox:
      detection.bbox ||
      null,


    /*
    ---------------------------------------------
    TIMING
    ---------------------------------------------
    */

    timestamp:
      detection.timestamp ||
      null,


    /*
    ---------------------------------------------
    ORIGINAL DATA
    ---------------------------------------------
    
    Keep this available so we don't lose anything
    that the AI pipeline sends in the future.
    */

    raw:
      detection,

  };

};


/*
=========================================================
SUBSCRIBE TO REAL-TIME DETECTIONS
=========================================================
*/

export const subscribeToDetections = (
  callback
) => {

  const detectionsRef =
    ref(
      realtimeDb,
      "detections"
    );


  return onValue(
    detectionsRef,

    (snapshot) => {

      const data =
        snapshot.val() ||
        {};


      const detections =
        Object.entries(data)
          .map(
            ([firebaseKey, value]) =>
              normalizeDetection(
                firebaseKey,
                value
              )
          )
          .sort(
            (a, b) => {

              const timeA =
                new Date(
                  a.timestamp || 0
                ).getTime();

              const timeB =
                new Date(
                  b.timestamp || 0
                ).getTime();

              return (
                timeB -
                timeA
              );

            }
          );


      console.log(
        "========================================"
      );

      console.log(
        "REAL-TIME DETECTIONS"
      );

      console.log(
        "COUNT:",
        detections.length
      );

      console.log(
        detections
      );

      console.log(
        "========================================"
      );


      callback(
        detections
      );

    },

    (error) => {

      console.error(
        "Detection listener error:",
        error
      );

      callback([]);

    }
  );

};


/*
=========================================================
SUBSCRIBE TO THE LATEST DETECTION ONLY
=========================================================

This is useful later if we want a small
"Latest Detection" card.
*/

export const subscribeToLatestDetection = (
  callback
) => {

  return subscribeToDetections(
    (detections) => {

      callback(
        detections.length > 0
          ? detections[0]
          : null
      );

    }
  );

};