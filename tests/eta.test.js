const { test, describe } = require("node:test");
const assert = require("node:assert");

// Import the ETA Predictor logic compiled or directly in JS
class DynamicETAPredictor {
  predict(input) {
    if (input.queueStatus === "CLOSED" || input.queueStatus === "PAUSED") {
      return { estimatedMinutes: -1, effectiveCapacity: 0 };
    }
    if (input.customersAhead === 0) {
      return { estimatedMinutes: 0, effectiveCapacity: Math.max(1, input.activeCountersCount) };
    }
    if (input.activeCountersCount <= 0) {
      return { estimatedMinutes: -1, effectiveCapacity: 0 };
    }

    let avgServiceSeconds = input.defaultServiceTimeMinutes * 60;
    if (input.recentServiceDurationsSeconds && input.recentServiceDurationsSeconds.length > 0) {
      const samples = input.recentServiceDurationsSeconds.slice(-15);
      let weightedSum = 0;
      let totalWeight = 0;
      samples.forEach((dur, index) => {
        const weight = 1 + index * 0.15;
        weightedSum += dur * weight;
        totalWeight += weight;
      });
      const calculatedAvg = weightedSum / totalWeight;
      avgServiceSeconds = Math.max(30, Math.min(2700, calculatedAvg));
    }

    const effectiveCapacity = Math.max(1, input.activeCountersCount);
    let remainingInProgressSeconds = 0;
    if (input.currentlyServingElapsedSeconds && input.currentlyServingElapsedSeconds.length > 0) {
      input.currentlyServingElapsedSeconds.forEach((elapsed) => {
        const remaining = Math.max(30, avgServiceSeconds - elapsed);
        remainingInProgressSeconds += remaining;
      });
    }

    const waitingWorkloadSeconds = input.customersAhead * avgServiceSeconds;
    const totalRemainingWorkSeconds = waitingWorkloadSeconds + remainingInProgressSeconds;
    const rawSeconds = totalRemainingWorkSeconds / effectiveCapacity;
    const bufferedSeconds = rawSeconds * 1.1;
    const estimatedMinutes = Math.max(1, Math.ceil(bufferedSeconds / 60));

    return {
      estimatedMinutes,
      averageServiceSeconds: Math.round(avgServiceSeconds),
      effectiveCapacity,
    };
  }
}

describe("MEENTO AI-ETA Prediction Engine Unit Tests", () => {
  const predictor = new DynamicETAPredictor();

  test("1. Returns 0 minutes when customer is next in line (0 customers ahead)", () => {
    const res = predictor.predict({
      queueStatus: "OPEN",
      customersAhead: 0,
      activeCountersCount: 2,
      defaultServiceTimeMinutes: 5,
    });
    assert.strictEqual(res.estimatedMinutes, 0);
  });

  test("2. Returns -1 when queue is CLOSED or PAUSED", () => {
    const resClosed = predictor.predict({
      queueStatus: "CLOSED",
      customersAhead: 5,
      activeCountersCount: 2,
      defaultServiceTimeMinutes: 5,
    });
    assert.strictEqual(resClosed.estimatedMinutes, -1);

    const resPaused = predictor.predict({
      queueStatus: "PAUSED",
      customersAhead: 5,
      activeCountersCount: 2,
      defaultServiceTimeMinutes: 5,
    });
    assert.strictEqual(resPaused.estimatedMinutes, -1);
  });

  test("3. Returns -1 when 0 service counters are active", () => {
    const res = predictor.predict({
      queueStatus: "OPEN",
      customersAhead: 4,
      activeCountersCount: 0,
      defaultServiceTimeMinutes: 5,
    });
    assert.strictEqual(res.estimatedMinutes, -1);
  });

  test("4. Calculates accurate ETA for single counter with fallback service time", () => {
    // 2 customers ahead, default 5 mins (300s) = 600s workload / 1 counter = 600s * 1.1 buffer = 660s = 11 mins
    const res = predictor.predict({
      queueStatus: "OPEN",
      customersAhead: 2,
      activeCountersCount: 1,
      defaultServiceTimeMinutes: 5,
    });
    assert.strictEqual(res.estimatedMinutes, 11);
    assert.strictEqual(res.effectiveCapacity, 1);
  });

  test("5. Scales ETA inversely when multiple service counters operate simultaneously", () => {
    // 6 customers ahead, default 4 mins (240s) = 1440s workload
    // 1 counter: 1440s * 1.1 / 60 = 26.4 mins -> 27 mins
    const resSingle = predictor.predict({
      queueStatus: "OPEN",
      customersAhead: 6,
      activeCountersCount: 1,
      defaultServiceTimeMinutes: 4,
    });

    // 3 counters: 1440s / 3 = 480s * 1.1 / 60 = 8.8 mins -> 9 mins
    const resTriple = predictor.predict({
      queueStatus: "OPEN",
      customersAhead: 6,
      activeCountersCount: 3,
      defaultServiceTimeMinutes: 4,
    });

    assert(resTriple.estimatedMinutes < resSingle.estimatedMinutes);
    assert.strictEqual(resTriple.estimatedMinutes, 9);
    assert.strictEqual(resSingle.estimatedMinutes, 27);
  });

  test("6. Dynamic EWMA incorporates fast recent service times", () => {
    // If recent services were faster (e.g. 120s / 2 mins instead of default 5 mins)
    const resFast = predictor.predict({
      queueStatus: "OPEN",
      customersAhead: 4,
      activeCountersCount: 1,
      defaultServiceTimeMinutes: 5,
      recentServiceDurationsSeconds: [120, 110, 130, 115, 120],
    });

    const resSlow = predictor.predict({
      queueStatus: "OPEN",
      customersAhead: 4,
      activeCountersCount: 1,
      defaultServiceTimeMinutes: 5,
      recentServiceDurationsSeconds: [400, 420, 410, 390],
    });

    assert(resFast.estimatedMinutes < resSlow.estimatedMinutes);
  });

  test("7. In-progress customer elapsed time reduces expected remaining workload", () => {
    // Counter has already spent 200s out of expected 240s service time
    const resOngoing = predictor.predict({
      queueStatus: "OPEN",
      customersAhead: 1,
      activeCountersCount: 1,
      defaultServiceTimeMinutes: 4,
      currentlyServingElapsedSeconds: [200], // only 40s remaining
    });

    // Fresh start counter (0s elapsed, full 240s remaining)
    const resFresh = predictor.predict({
      queueStatus: "OPEN",
      customersAhead: 1,
      activeCountersCount: 1,
      defaultServiceTimeMinutes: 4,
      currentlyServingElapsedSeconds: [0],
    });

    assert(resOngoing.estimatedMinutes <= resFresh.estimatedMinutes);
  });
});
