export interface ETAPredictionInput {
  queueStatus: "OPEN" | "PAUSED" | "CLOSED";
  customersAhead: number; // Number of eligible waiting customers ahead in queue
  activeCountersCount: number; // Counters in OPEN or BUSY state
  defaultServiceTimeMinutes: number; // Queue configuration fallback (e.g. 5 min)
  recentServiceDurationsSeconds?: number[]; // Observed completed durations (last 10-20 tokens)
  currentlyServingElapsedSeconds?: number[]; // For busy counters, seconds already elapsed on active token
}

export interface ETAPredictionResult {
  estimatedMinutes: number;
  averageServiceSeconds: number;
  effectiveCapacity: number;
  confidenceScore: number; // 0.0 to 1.0 based on sample size and stability
  algorithm: string;
  notes: string;
}

export interface IWaitTimePredictor {
  predict(input: ETAPredictionInput): ETAPredictionResult;
}

/**
 * Baseline Rule-based & EWMA Dynamic Queue Wait Time Predictor
 *
 * Assumptions & Limitations:
 * 1. Counter capacity is modeled homogeneously; staff proficiency variance is smoothed via rolling averages.
 * 2. If all counters are CLOSED or the queue is PAUSED/CLOSED, wait time is marked indefinite (-1).
 * 3. Ongoing consultations deplete remaining work; elapsed service time is subtracted from expected duration.
 * 4. A conservative buffer (15%) is applied to prevent customer dissatisfaction from negative ETA variance.
 */
export class DynamicETAPredictor implements IWaitTimePredictor {
  predict(input: ETAPredictionInput): ETAPredictionResult {
    // Edge case 1: Queue is paused or closed
    if (input.queueStatus === "CLOSED") {
      return {
        estimatedMinutes: -1,
        averageServiceSeconds: input.defaultServiceTimeMinutes * 60,
        effectiveCapacity: 0,
        confidenceScore: 1.0,
        algorithm: "Rule-Based Status Guard",
        notes: "Queue is currently closed. No service in progress.",
      };
    }

    if (input.queueStatus === "PAUSED") {
      return {
        estimatedMinutes: -1,
        averageServiceSeconds: input.defaultServiceTimeMinutes * 60,
        effectiveCapacity: 0,
        confidenceScore: 0.9,
        algorithm: "Rule-Based Status Guard",
        notes: "Queue is temporarily paused by counter administrators.",
      };
    }

    // Edge case 2: You are first in line (0 customers ahead)
    if (input.customersAhead === 0) {
      return {
        estimatedMinutes: 0,
        averageServiceSeconds: input.defaultServiceTimeMinutes * 60,
        effectiveCapacity: Math.max(1, input.activeCountersCount),
        confidenceScore: 0.99,
        algorithm: "Direct Next",
        notes: "You are next in line. Please be ready at the counter.",
      };
    }

    // Edge case 3: No active counters
    if (input.activeCountersCount <= 0) {
      return {
        estimatedMinutes: -1,
        averageServiceSeconds: input.defaultServiceTimeMinutes * 60,
        effectiveCapacity: 0,
        confidenceScore: 0.95,
        algorithm: "Capacity Guard",
        notes: "No service counters are currently active. Waiting for staff login.",
      };
    }

    // Calculate effective average service duration
    let avgServiceSeconds = input.defaultServiceTimeMinutes * 60;
    let confidence = 0.5; // Baseline confidence

    if (
      input.recentServiceDurationsSeconds &&
      input.recentServiceDurationsSeconds.length > 0
    ) {
      // Exponentially weighted moving average (EWMA) prioritizing recent transactions
      const samples = input.recentServiceDurationsSeconds.slice(-15);
      let weightedSum = 0;
      let totalWeight = 0;

      samples.forEach((dur, index) => {
        const weight = 1 + index * 0.15; // newer samples get higher weight
        weightedSum += dur * weight;
        totalWeight += weight;
      });

      const calculatedAvg = weightedSum / totalWeight;
      // Clamp between 30s and 45 mins to prevent extreme anomalies
      avgServiceSeconds = Math.max(30, Math.min(2700, calculatedAvg));
      confidence = Math.min(0.92, 0.5 + samples.length * 0.03);
    }

    // Effective capacity (number of operating desks)
    const effectiveCapacity = Math.max(1, input.activeCountersCount);

    // Remaining work on desks currently in progress
    let remainingInProgressSeconds = 0;
    if (
      input.currentlyServingElapsedSeconds &&
      input.currentlyServingElapsedSeconds.length > 0
    ) {
      input.currentlyServingElapsedSeconds.forEach((elapsed) => {
        // If elapsed exceeds average, assume 30s tail remainder
        const remaining = Math.max(30, avgServiceSeconds - elapsed);
        remainingInProgressSeconds += remaining;
      });
    }

    // Workload of customers ahead in queue
    const waitingWorkloadSeconds = input.customersAhead * avgServiceSeconds;
    const totalRemainingWorkSeconds =
      waitingWorkloadSeconds + remainingInProgressSeconds;

    // Distribute remaining work across available active counters
    const rawSeconds = totalRemainingWorkSeconds / effectiveCapacity;

    // Buffer variance factor (1.10 = +10% buffer to account for transition delay between tokens)
    const bufferedSeconds = rawSeconds * 1.1;

    // Convert to rounded integer minutes (minimum 1 minute if customers are ahead)
    const estimatedMinutes = Math.max(1, Math.ceil(bufferedSeconds / 60));

    return {
      estimatedMinutes,
      averageServiceSeconds: Math.round(avgServiceSeconds),
      effectiveCapacity,
      confidenceScore: Math.round(confidence * 100) / 100,
      algorithm: "Capacity-Weighted EWMA Dynamic Predictor",
      notes: `Estimated based on ${input.customersAhead} ahead across ${effectiveCapacity} active counters.`,
    };
  }
}

// Global default predictor instance
export const defaultETAPredictor = new DynamicETAPredictor();
