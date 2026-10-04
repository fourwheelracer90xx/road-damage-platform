import {
  get,
  onValue,
  ref,
  update,
  set,
} from "firebase/database";

import realtimeDb from "./realtimeDatabase";

/*
=========================================================
IMPORTANT
=========================================================

THE CONTRACTOR DASHBOARD USES ONLY:

/compliants

DO NOT CHANGE THIS TO /complaints
=========================================================
*/

const TICKETS_PATH = "compliants";

const ticketsRef = ref(
  realtimeDb,
  TICKETS_PATH
);


/*
=========================================================
HELPERS
=========================================================
*/

const normalizeStatus = (value) => {
  return String(value || "new")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
};


const normalizeId = (value) => {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
};


const nowIso = () => {
  return new Date().toISOString();
};


const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};


/*
=========================================================
NORMALIZE ONE FIREBASE TICKET
=========================================================
*/

const normalizeTicket = (
  firebaseKey,
  raw = {}
) => {

  return {

    /*
    Firebase key
    Example:
    TICKET_002
    */
    firebaseKey,

    /*
    Display ticket ID
    Example:
    TICKET-001
    */
    ticketId:
      raw.ticketId ??
      raw.id ??
      firebaseKey,

    contractorId:
      String(
        raw.contractorId ?? ""
      ).trim(),

    contractorName:
      raw.contractorName ??
      "",

    area:
      raw.area ??
      "",

    source:
      raw.source ??
      "unknown",

    status:
      normalizeStatus(
        raw.status
      ),

    latitude:
      toNumber(
        raw.latitude ??
        raw.gps?.latitude
      ),

    longitude:
      toNumber(
        raw.longitude ??
        raw.gps?.longitude
      ),

    severity:
      raw.severity ??
      raw.class ??
      "Unknown",

    length:
      toNumber(
        raw.length ??
        raw.length_cm
      ),

    width:
      toNumber(
        raw.width ??
        raw.width_cm
      ),

    depth:
      toNumber(
        raw.depth ??
        raw.depth_cm
      ),

    volumeLiters:
      toNumber(
        raw.volumeLiters ??
        raw.volume_liters ??
        raw.volume
      ),

    confidence:
      toNumber(
        raw.confidence
      ),

    speedKmh:
      toNumber(
        raw.speedKmh ??
        raw.speed_kmh
      ),

    imageUrl:
      raw.imageUrl ??
      raw.image_url ??
      "",

    repairedImageUrl:
      raw.repairedImageUrl ??
      raw.repairImageUrl ??
      "",

    description:
      raw.description ??
      "",

    repairDescription:
      raw.repairDescription ??
      "",

    createdAt:
      raw.createdAt ??
      null,

    updatedAt:
      raw.updatedAt ??
      null,

    acceptedAt:
      raw.acceptedAt ??
      null,

    repairStartedAt:
      raw.repairStartedAt ??
      null,

    completedAt:
      raw.completedAt ??
      null,

    responseTimeSeconds:
      toNumber(
        raw.responseTimeSeconds
      ),

    repairDurationSeconds:
      toNumber(
        raw.repairDurationSeconds
      ),

    totalResolutionSeconds:
      toNumber(
        raw.totalResolutionSeconds
      ),

    potholeId:
      raw.potholeId ??
      "",

    detectionId:
      raw.detectionId ??
      "",

    raw,
  };
};


/*
=========================================================
SUBSCRIBE TO CONTRACTOR TICKETS
=========================================================

READS ONLY:

/compliants

NOT:

/complaints
=========================================================
*/

export function subscribeToContractorTickets(
  contractorUid,
  callback
) {

  console.log(
    "======================================"
  );

  console.log(
    "CONTRACTOR DASHBOARD TICKET SERVICE"
  );

  console.log(
    "READING FIREBASE NODE:"
  );

  console.log(
    "/compliants"
  );

  console.log(
    "CONTRACTOR UID:",
    contractorUid
  );

  console.log(
    "======================================"
  );


  if (!contractorUid) {

    console.error(
      "Contractor UID missing."
    );

    callback([]);

    return () => {};
  }


  return onValue(
    ticketsRef,

    (snapshot) => {

      const data =
        snapshot.val() || {};


      console.log(
        "--------------------------------------"
      );

      console.log(
        "REAL CONTRACTOR TICKET DATA"
      );

      console.log(
        data
      );


      /*
      Convert Firebase object to array
      */

      const allTickets =
        Object.entries(
          data
        ).map(
          ([firebaseKey, raw]) =>
            normalizeTicket(
              firebaseKey,
              raw
            )
        );


      console.log(
        "ALL /compliants TICKETS:",
        allTickets
      );


      /*
      ====================================================
      CONTRACTOR MATCH
      ====================================================

      We normalize BOTH IDs.

      This removes hidden spaces/case problems.
      */

      const loggedInId =
        normalizeId(
          contractorUid
        );


      const contractorTickets =
        allTickets.filter(
          (ticket) => {

            const ticketId =
              normalizeId(
                ticket.contractorId
              );


            const matched =
              ticketId ===
              loggedInId;


            console.log(
              "TICKET:",
              ticket.ticketId,
              "| Firebase:",
              ticket.firebaseKey,
              "| Ticket Contractor:",
              ticket.contractorId,
              "| Logged Contractor:",
              contractorUid,
              "| MATCH:",
              matched
            );


            return matched;
          }
        );


      /*
      ====================================================
      RESULT
      ====================================================
      */

      console.log(
        "======================================"
      );

      console.log(
        "CONTRACTOR TICKETS FROM /compliants:"
      );

      console.log(
        contractorTickets
      );

      console.log(
        "TOTAL:",
        contractorTickets.length
      );

      console.log(
        "======================================"
      );


      callback(
        contractorTickets
      );

    },

    (error) => {

      console.error(
        "ERROR READING /compliants:",
        error
      );

      callback([]);

    }
  );
}


/*
=========================================================
START REPAIR

NEW → IN_PROGRESS
=========================================================
*/

export async function startContractorTicket(
  ticket,
  contractorUid,
  contractorName = ""
) {

  if (!ticket) {
    throw new Error(
      "Ticket is required."
    );
  }


  if (!ticket.firebaseKey) {
    throw new Error(
      "Firebase ticket key is missing."
    );
  }


  const startedAt =
    nowIso();


  const createdAt =
    ticket.createdAt ||
    startedAt;


  const responseTimeSeconds =
    Math.max(
      0,
      Math.floor(
        (
          new Date(
            startedAt
          ).getTime() -
          new Date(
            createdAt
          ).getTime()
        ) / 1000
      )
    );


  const updates = {

    status:
      "in_progress",

    acceptedAt:
      startedAt,

    repairStartedAt:
      startedAt,

    acceptedBy:
      contractorUid,

    contractorId:
      contractorUid,

    contractorName:
      contractorName ||
      ticket.contractorName ||
      "",

    responseTimeSeconds,

    updatedAt:
      startedAt,
  };


  await update(
    ref(
      realtimeDb,
      `${TICKETS_PATH}/${ticket.firebaseKey}`
    ),
    updates
  );


  return {
    ...ticket,
    ...updates,
  };
}


/*
=========================================================
COMPLETE REPAIR

IN_PROGRESS → COMPLETED

AND CREATE:

/reports/REPORT-XXXX
=========================================================
*/

export async function completeContractorTicket(
  ticket,
  {
    contractorUid,
    contractorName = "",
    repairedImageUrl,
    repairDescription,
  } = {}
) {

  if (!ticket) {
    throw new Error(
      "Ticket is required."
    );
  }


  if (!ticket.firebaseKey) {
    throw new Error(
      "Firebase ticket key is missing."
    );
  }


  if (!repairedImageUrl) {
    throw new Error(
      "Repaired image is required."
    );
  }


  if (
    !String(
      repairDescription || ""
    ).trim()
  ) {
    throw new Error(
      "Repair description is required."
    );
  }


  const completedAt =
    nowIso();


  const createdAt =
    ticket.createdAt ||
    completedAt;


  const repairStartedAt =
    ticket.repairStartedAt ||
    ticket.acceptedAt ||
    completedAt;


  const responseTimeSeconds =
    Math.max(
      0,
      Math.floor(
        (
          new Date(
            repairStartedAt
          ).getTime() -
          new Date(
            createdAt
          ).getTime()
        ) / 1000
      )
    );


  const repairDurationSeconds =
    Math.max(
      0,
      Math.floor(
        (
          new Date(
            completedAt
          ).getTime() -
          new Date(
            repairStartedAt
          ).getTime()
        ) / 1000
      )
    );


  const totalResolutionSeconds =
    Math.max(
      0,
      Math.floor(
        (
          new Date(
            completedAt
          ).getTime() -
          new Date(
            createdAt
          ).getTime()
        ) / 1000
      )
    );


  /*
  UPDATE /compliants/<ticket>
  */

  const ticketUpdates = {

    status:
      "completed",

    repairedImageUrl,

    repairDescription:
      String(
        repairDescription
      ).trim(),

    completedAt,

    updatedAt:
      completedAt,

    responseTimeSeconds,

    repairDurationSeconds,

    totalResolutionSeconds,

    contractorId:
      contractorUid,

    contractorName:
      contractorName ||
      ticket.contractorName ||
      "",
  };


  await update(
    ref(
      realtimeDb,
      `${TICKETS_PATH}/${ticket.firebaseKey}`
    ),
    ticketUpdates
  );


  /*
  ======================================================
  CREATE REPORT
  ======================================================
  */

  const reportId =
    `REPORT-${
      ticket.ticketId ||
      ticket.firebaseKey
    }`;


  const report = {

    reportId,

    ticketId:
      ticket.ticketId ||
      ticket.firebaseKey,

    firebaseTicketKey:
      ticket.firebaseKey,

    contractorId:
      contractorUid,

    contractorName:
      contractorName ||
      ticket.contractorName ||
      "",

    area:
      ticket.area ||
      "",

    source:
      ticket.source ||
      "",

    severity:
      ticket.severity ||
      "",

    latitude:
      ticket.latitude ??
      null,

    longitude:
      ticket.longitude ??
      null,

    length:
      ticket.length ??
      null,

    width:
      ticket.width ??
      null,

    depth:
      ticket.depth ??
      null,

    volumeLiters:
      ticket.volumeLiters ??
      null,

    confidence:
      ticket.confidence ??
      null,

    originalImageUrl:
      ticket.imageUrl ||
      "",

    repairedImageUrl,

    repairDescription:
      String(
        repairDescription
      ).trim(),

    ticketRaisedAt:
      createdAt,

    repairStartedAt,

    completedAt,

    responseTimeSeconds,

    repairDurationSeconds,

    totalResolutionSeconds,

    generatedAt:
      completedAt,

    status:
      "completed",
  };


  await set(
    ref(
      realtimeDb,
      `reports/${reportId}`
    ),
    report
  );


  return {
    ticket: {
      ...ticket,
      ...ticketUpdates,
    },

    report,
  };
}


/*
=========================================================
READ SINGLE TICKET
=========================================================
*/

export async function getContractorTicket(
  firebaseKey
) {

  const snapshot =
    await get(
      ref(
        realtimeDb,
        `${TICKETS_PATH}/${firebaseKey}`
      )
    );


  if (!snapshot.exists()) {
    return null;
  }


  return normalizeTicket(
    firebaseKey,
    snapshot.val()
  );
}


/*
=========================================================
GENERIC STATUS UPDATE
=========================================================
*/

export async function updateContractorTicketStatus(
  firebaseKey,
  status,
  extra = {}
) {

  const updates = {

    status:
      normalizeStatus(
        status
      ),

    updatedAt:
      nowIso(),

    ...extra,
  };


  await update(
    ref(
      realtimeDb,
      `${TICKETS_PATH}/${firebaseKey}`
    ),
    updates
  );


  return updates;
}