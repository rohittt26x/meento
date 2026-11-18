export type Role = "CUSTOMER" | "STAFF" | "ADMIN";

export type TokenStatus =
  | "WAITING"
  | "CALLED"
  | "SERVING"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type QueueStatus = "OPEN" | "PAUSED" | "CLOSED";

export type CounterStatus = "OPEN" | "BUSY" | "CLOSED";

export type EventType =
  | "JOINED"
  | "CALLED"
  | "SERVING_STARTED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface UserSession {
  userId: string;
  name: string;
  email: string | null;
  role: Role;
  venueId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface QueueLiveStatus {
  queueId: string;
  queueName: string;
  queueCode: string;
  prefix: string;
  status: QueueStatus;
  waitingCount: number;
  servingCount: number;
  completedTodayCount: number;
  activeCountersCount: number;
  currentServingTokens: {
    counterNumber: number;
    counterName: string;
    tokenCode: string;
    customerName: string;
    servedAt: string | null;
  }[];
  currentlyCalledTokens: {
    counterNumber: number;
    counterName: string;
    tokenCode: string;
    customerName: string;
    calledAt: string | null;
  }[];
  averageWaitMinutes: number;
}

export interface CustomerTokenView {
  tokenId: string;
  tokenNumber: number;
  formattedCode: string;
  customerName: string;
  customerPhone: string;
  status: TokenStatus;
  priority: number;
  joinedAt: string;
  calledAt: string | null;
  servedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  assignedCounter: {
    id: string;
    number: number;
    name: string;
  } | null;
  queue: {
    id: string;
    name: string;
    code: string;
    prefix: string;
    venueName: string;
    venueAddress: string | null;
  };
  positionAhead: number; // 0 if called or serving
  estimatedWaitMinutes: number;
  currentlyServingCode: string | null;
}
