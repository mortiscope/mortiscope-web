/**
 * Constant containing mock dashboard metric data to simulate summarized analysis results.
 */
export const mockDashboardMetrics = {
  // The cumulative number of cases registered in the system for the current context.
  totalCases: 15,
  // The aggregate number of objects identified across all processed analysis tasks.
  totalDetections: 1247,
  // The mean statistical probability value representing the accuracy of the detection model.
  averageConfidence: 0.78,
  // A decimal representation of the percentage of detections that have undergone manual verification.
  verificationProgress: 0.65,
  // A breakdown of detected objects categorized by their biological development phase.
  lifeStageDistribution: {
    adult: 45,
    egg: 120,
    instar_1: 312,
    instar_2: 456,
    instar_3: 214,
    pupa: 100,
  },
};
