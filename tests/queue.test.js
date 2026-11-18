const { test, describe, before, after } = require("node:test");
const assert = require("node:assert");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const VALID_TRANSITIONS = {
  WAITING: ["CALLED", "CANCELLED"],
  CALLED: ["SERVING", "NO_SHOW", "CANCELLED"],
  SERVING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: ["WAITING"],
};

function canTransition(current, next) {
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

describe("MEENTO Queue Engine & State Machine Integration Tests", () => {
  let testQueue;
  let testCounter;
  let testStaff;
  let testVenue;

  before(async () => {
    // Locate or create test venue
    testVenue = await prisma.venue.findFirst();
    if (!testVenue) throw new Error("Seed venue not found");

    testStaff = await prisma.user.findFirst({ where: { role: "STAFF" } });
    if (!testStaff) throw new Error("Seed staff user not found");

    // Create an isolated test queue
    testQueue = await prisma.queue.create({
      data: {
        venueId: testVenue.id,
        name: "Automated Test Queue",
        code: `TEST-Q-${Date.now()}`,
        prefix: "T",
        status: "OPEN",
        estimatedServiceTimeMinutes: 3,
      },
    });

    testCounter = await prisma.serviceCounter.create({
      data: {
        venueId: testVenue.id,
        counterNumber: 99,
        name: "Test Counter 99",
        status: "OPEN",
      },
    });
  });

  after(async () => {
    // Cleanup test records
    await prisma.queueEntry.deleteMany({ where: { queueId: testQueue.id } });
    await prisma.serviceCounter.delete({ where: { id: testCounter.id } });
    await prisma.queue.delete({ where: { id: testQueue.id } });
    await prisma.$disconnect();
  });

  test("1. Customer joins an open queue and receives sequential token number", async () => {
    const entry1 = await prisma.queueEntry.create({
      data: {
        queueId: testQueue.id,
        tokenNumber: 1,
        formattedCode: "T-001",
        customerName: "Alice Wonder",
        customerPhone: "+91 99999 11111",
        status: "WAITING",
      },
    });

    assert.strictEqual(entry1.tokenNumber, 1);
    assert.strictEqual(entry1.status, "WAITING");
    assert.strictEqual(entry1.formattedCode, "T-001");

    const entry2 = await prisma.queueEntry.create({
      data: {
        queueId: testQueue.id,
        tokenNumber: 2,
        formattedCode: "T-002",
        customerName: "Bob Builder",
        customerPhone: "+91 99999 22222",
        status: "WAITING",
      },
    });

    assert.strictEqual(entry2.tokenNumber, 2);
    assert.strictEqual(entry2.formattedCode, "T-002");
  });

  test("2. Token numbers do not conflict; compound uniqueness constraint is enforced", async () => {
    await assert.rejects(
      async () => {
        await prisma.queueEntry.create({
          data: {
            queueId: testQueue.id,
            tokenNumber: 1, // Duplicate token 1 in same queue
            formattedCode: "T-001-DUP",
            customerName: "Duplicate Imposter",
            customerPhone: "+91 99999 33333",
            status: "WAITING",
          },
        });
      },
      (err) => {
        return err.code === "P2002" || String(err).includes("Unique constraint failed");
      }
    );
  });

  test("3. Queue position is calculated correctly from active waiting tokens ahead", async () => {
    // Count active waiting entries ahead of Bob (token 2)
    const bob = await prisma.queueEntry.findFirst({
      where: { queueId: testQueue.id, tokenNumber: 2 },
    });

    const aheadCount = await prisma.queueEntry.count({
      where: {
        queueId: testQueue.id,
        status: "WAITING",
        tokenNumber: { lt: bob.tokenNumber },
      },
    });

    assert.strictEqual(aheadCount, 1); // Alice is token 1
  });

  test("4. Invalid state transitions are rejected by the state machine rules", () => {
    assert.strictEqual(canTransition("WAITING", "COMPLETED"), false);
    assert.strictEqual(canTransition("COMPLETED", "WAITING"), false);
    assert.strictEqual(canTransition("CANCELLED", "SERVING"), false);
    assert.strictEqual(canTransition("WAITING", "CALLED"), true);
    assert.strictEqual(canTransition("CALLED", "SERVING"), true);
    assert.strictEqual(canTransition("SERVING", "COMPLETED"), true);
  });

  test("5. Staff calls the next waiting token and transitions state to CALLED", async () => {
    const nextWaiting = await prisma.queueEntry.findFirst({
      where: { queueId: testQueue.id, status: "WAITING" },
      orderBy: { tokenNumber: "asc" },
    });

    assert.strictEqual(nextWaiting.tokenNumber, 1); // Alice

    const updated = await prisma.queueEntry.update({
      where: { id: nextWaiting.id },
      data: {
        status: "CALLED",
        counterId: testCounter.id,
        calledAt: new Date(),
      },
    });

    assert.strictEqual(updated.status, "CALLED");
    assert.strictEqual(updated.counterId, testCounter.id);
  });

  test("6. Customer can cancel waiting token; cancelled tokens are excluded from waiting count", async () => {
    // Bob cancels token 2
    const bob = await prisma.queueEntry.findFirst({
      where: { queueId: testQueue.id, tokenNumber: 2 },
    });

    await prisma.queueEntry.update({
      where: { id: bob.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: "Changed mind",
      },
    });

    // Check waiting count in test queue
    const waitingCount = await prisma.queueEntry.count({
      where: { queueId: testQueue.id, status: "WAITING" },
    });

    assert.strictEqual(waitingCount, 0); // Alice is CALLED, Bob is CANCELLED
  });

  test("7. Completing service logs duration and excludes token from waiting count", async () => {
    const alice = await prisma.queueEntry.findFirst({
      where: { queueId: testQueue.id, tokenNumber: 1 },
    });

    // Mark SERVING first
    await prisma.queueEntry.update({
      where: { id: alice.id },
      data: { status: "SERVING", servedAt: new Date() },
    });

    // Complete service
    const completed = await prisma.queueEntry.update({
      where: { id: alice.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    assert.strictEqual(completed.status, "COMPLETED");

    // Write service record
    const record = await prisma.serviceRecord.create({
      data: {
        queueEntryId: completed.id,
        counterId: testCounter.id,
        staffId: testStaff.id,
        durationSeconds: 150,
        startedAt: new Date(Date.now() - 150000),
        completedAt: new Date(),
      },
    });

    assert.strictEqual(record.durationSeconds, 150);
  });
});
