import {
  onValue,
  ref,
} from "firebase/database";

import realtimeDb from "./realtimeDatabase";

const normalizeReport = (firebaseKey, report = {}) => ({
  firebaseKey,
  ...report,
});

export const subscribeToReports = (callback) =>
  onValue(
    ref(realtimeDb, "reports"),
    (snapshot) => {
      const data = snapshot.val() || {};
      callback(
        Object.entries(data)
          .map(([key, value]) =>
            normalizeReport(key, value)
          )
          .sort(
            (a, b) =>
              new Date(b.completedAt || b.generatedAt || 0) -
              new Date(a.completedAt || a.generatedAt || 0)
          )
      );
    },
    (error) => {
      console.error("Report listener error:", error);
      callback([]);
    }
  );

export const subscribeToContractorReports = (
  contractorId,
  callback
) =>
  subscribeToReports((reports) => {
    callback(
      reports.filter(
        (report) =>
          report.contractorId === contractorId
      )
    );
  });

export const subscribeToUserReports = (
  userId,
  callback
) =>
  subscribeToReports((reports) => {
    callback(
      reports.filter(
        (report) => report.userId === userId
      )
    );
  });