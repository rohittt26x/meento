import { PrismaClient } from "@prisma/client";
import { TokenStatus, EventType } from "../types";

export interface StateTransitionResult {
  success: boolean;
  error?: string;
  previousStatus?: TokenStatus;
  newStatus?: TokenStatus;
}

// Strict valid state transitions map
const VALID_TRANSITIONS: Record<TokenStatus, TokenStatus[]> = {
  WAITING: ["CALLED", "CANCELLED"],
  CALLED: ["SERVING", "NO_SHOW", "CANCELLED"],
  SERVING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: ["WAITING"], // Allows optional re-queueing if customer appeals
};

export function canTransition(current: TokenStatus, next: TokenStatus): boolean {
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

export class QueueStateMachine {
  constructor(private prisma: PrismaClient) {}

  /**
   * Atomically calls the next waiting token in the queue for a specific counter and staff member.
   * Prevents race conditions where two counters simultaneously pick up the same token.
   */
  async callNextToken(
    queueId: string,
    counterId: string,
    staffId: string
  ): Promise<{ token: any; error?: string }> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Verify counter status
      const counter = await tx.serviceCounter.findUnique({
        where: { id: counterId },
      });
      if (!counter) {
        throw new Error("Service counter not found");
      }
      if (counter.status === "CLOSED") {
        throw new Error("Cannot call customer to a closed counter");
      }

      // Check if counter is already actively serving an unfinished token
      const activeCurrentToken = await tx.queueEntry.findFirst({
        where: {
          counterId,
          status: { in: ["CALLED", "SERVING"] },
        },
      });
      if (activeCurrentToken) {
        throw new Error(
          `Counter ${counter.counterNumber} is already handling token ${activeCurrentToken.formattedCode}. Complete or release it first.`
        );
      }

      // 2. Atomically find the highest priority / oldest waiting customer
      const nextWaiting = await tx.queueEntry.findFirst({
        where: {
          queueId,
          status: "WAITING",
        },
        orderBy: [{ priority: "desc" }, { tokenNumber: "asc" }],
      });

      if (!nextWaiting) {
        return { token: null, error: "No waiting customers in this queue" };
      }

      // 3. Transition to CALLED
      const now = new Date();
      const updatedToken = await tx.queueEntry.update({
        where: { id: nextWaiting.id },
        data: {
          status: "CALLED",
          counterId: counter.id,
          calledAt: now,
        },
      });

      // Update counter status to BUSY
      await tx.serviceCounter.update({
        where: { id: counter.id },
        data: {
          status: "BUSY",
          currentStaffId: staffId,
        },
      });

      // 4. Log Audit Event
      await tx.queueEvent.create({
        data: {
          queueEntryId: updatedToken.id,
          eventType: "CALLED",
          counterId: counter.id,
          staffId,
          details: `Called to Counter ${counter.counterNumber} (${counter.name})`,
        },
      });

      // 5. Trigger notification
      await tx.notification.create({
        data: {
          queueEntryId: updatedToken.id,
          userId: updatedToken.userId,
          title: `Token ${updatedToken.formattedCode} Called!`,
          message: `Please proceed immediately to Counter ${counter.counterNumber} (${counter.name}).`,
        },
      });

      return { token: updatedToken };
    });
  }

  /**
   * Starts service for a called customer when they reach the counter
   */
  async startServing(
    tokenId: string,
    counterId: string,
    staffId: string
  ): Promise<{ token: any; error?: string }> {
    return await this.prisma.$transaction(async (tx) => {
      const token = await tx.queueEntry.findUnique({
        where: { id: tokenId },
      });
      if (!token) throw new Error("Token not found");

      if (!canTransition(token.status as TokenStatus, "SERVING")) {
        throw new Error(
          `Invalid state transition: Cannot move from ${token.status} to SERVING`
        );
      }

      const now = new Date();
      const updated = await tx.queueEntry.update({
        where: { id: tokenId },
        data: {
          status: "SERVING",
          servedAt: now,
          counterId,
        },
      });

      await tx.queueEvent.create({
        data: {
          queueEntryId: tokenId,
          eventType: "SERVING_STARTED",
          counterId,
          staffId,
          details: "Customer arrived at desk; service initiated",
        },
      });

      return { token: updated };
    });
  }

  /**
   * Completes service for a customer and writes immutable ServiceRecord for analytics & ETA
   */
  async completeService(
    tokenId: string,
    counterId: string,
    staffId: string,
    notes?: string
  ): Promise<{ token: any; durationSeconds: number }> {
    return await this.prisma.$transaction(async (tx) => {
      const token = await tx.queueEntry.findUnique({
        where: { id: tokenId },
      });
      if (!token) throw new Error("Token not found");

      if (!canTransition(token.status as TokenStatus, "COMPLETED")) {
        throw new Error(
          `Invalid state transition: Cannot move from ${token.status} to COMPLETED`
        );
      }

      const now = new Date();
      const startedAt = token.servedAt || token.calledAt || now;
      const durationSeconds = Math.max(
        15,
        Math.round((now.getTime() - new Date(startedAt).getTime()) / 1000)
      );

      const updated = await tx.queueEntry.update({
        where: { id: tokenId },
        data: {
          status: "COMPLETED",
          completedAt: now,
        },
      });

      // Free up the counter
      await tx.serviceCounter.update({
        where: { id: counterId },
        data: {
          status: "OPEN",
        },
      });

      // Create permanent service record
      await tx.serviceRecord.create({
        data: {
          queueEntryId: tokenId,
          counterId,
          staffId,
          durationSeconds,
          startedAt: new Date(startedAt),
          completedAt: now,
          notes: notes || "Service successfully resolved",
        },
      });

      // Audit event
      await tx.queueEvent.create({
        data: {
          queueEntryId: tokenId,
          eventType: "COMPLETED",
          counterId,
          staffId,
          details: `Service completed in ${Math.round(durationSeconds / 60)} minutes (${durationSeconds}s)`,
        },
      });

      return { token: updated, durationSeconds };
    });
  }

  /**
   * Marks a called customer as No-Show if they failed to arrive
   */
  async markNoShow(
    tokenId: string,
    counterId: string,
    staffId: string,
    reason?: string
  ): Promise<{ token: any }> {
    return await this.prisma.$transaction(async (tx) => {
      const token = await tx.queueEntry.findUnique({
        where: { id: tokenId },
      });
      if (!token) throw new Error("Token not found");

      if (!canTransition(token.status as TokenStatus, "NO_SHOW")) {
        throw new Error(
          `Invalid state transition: Cannot mark ${token.status} token as NO_SHOW`
        );
      }

      const updated = await tx.queueEntry.update({
        where: { id: tokenId },
        data: {
          status: "NO_SHOW",
          cancellationReason: reason || "Customer did not appear at counter",
        },
      });

      // Release counter back to OPEN
      await tx.serviceCounter.update({
        where: { id: counterId },
        data: {
          status: "OPEN",
        },
      });

      await tx.queueEvent.create({
        data: {
          queueEntryId: tokenId,
          eventType: "NO_SHOW",
          counterId,
          staffId,
          details: reason || "Customer did not appear after multiple calls",
        },
      });

      return { token: updated };
    });
  }

  /**
   * Cancels a customer's token (self-service or administrative)
   */
  async cancelToken(
    tokenId: string,
    reason: string = "Cancelled by user"
  ): Promise<{ token: any }> {
    return await this.prisma.$transaction(async (tx) => {
      const token = await tx.queueEntry.findUnique({
        where: { id: tokenId },
      });
      if (!token) throw new Error("Token not found");

      if (!canTransition(token.status as TokenStatus, "CANCELLED")) {
        throw new Error(
          `Cannot cancel token with current status: ${token.status}`
        );
      }

      const updated = await tx.queueEntry.update({
        where: { id: tokenId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
      });

      // If it was assigned to a counter, free the counter
      if (token.counterId) {
        await tx.serviceCounter.update({
          where: { id: token.counterId },
          data: { status: "OPEN" },
        });
      }

      await tx.queueEvent.create({
        data: {
          queueEntryId: tokenId,
          eventType: "CANCELLED",
          details: reason,
        },
      });

      return { token: updated };
    });
  }
}
