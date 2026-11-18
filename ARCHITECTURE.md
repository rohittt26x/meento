# MEENTO - System Architecture & Engineering Specification

## 1. Executive Architecture Summary

MEENTO is built as a production-grade, full-stack smart queue management and digital token platform designed to eradicate physical congestion in high-throughput campus and retail environments (Student Administration, Canteens, Xerox centers, and Clinics).

The architecture is layered cleanly across Presentation, API Orchestration, State Machine Business Logic, Algorithmic ETA Inference, and Relational Persistence.

```
+-----------------------------------------------------------------------------------+
|                            CLIENT / PRESENTATION LAYER                            |
|                                                                                   |
|  +--------------------+   +--------------------+   +---------------------------+  |
|  | Customer Mobile UI |   |  Staff Counter UI  |   | Admin Operations Dashboard|  |
|  | - QR Join Page     |   |  - Call Next       |   | - Live Metrics & Controls |  |
|  | - Live Token View  |   |  - Start / Serve   |   | - QR Code Generation      |  |
|  | - ETA & Position   |   |  - Complete/NoShow |   | - Throughput Analytics    |  |
|  +--------------------+   +--------------------+   +---------------------------+  |
+-----------------------------------------|-----------------------------------------+
                                          | HTTP JSON REST API
+-----------------------------------------v-----------------------------------------+
|                              API & CONTROLLER LAYER                               |
|                                                                                   |
|  - Role-Based Access Control Middleware (JWT verification + Role Guards)          |
|  - Request Body Schema Validation & Sanitization                                  |
|  - Centralized Error Handling & Uniform JSON Responses                            |
+-----------------------------------------|-----------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                                                   |
        v                                                                   v
+-------------------------------+                         +---------------------------------+
|   QUEUE STATE MACHINE ENGINE  |                         |    AI-ETA PREDICTION ENGINE     |
|                               |                         |                                 |
| - WAITING -> CALLED           |                         | - Active Service Capacity       |
| - CALLED -> SERVING           |                         | - Rolling Historical Durations  |
| - SERVING -> COMPLETED        |                         | - In-Progress Elapsed Reductions|
| - Atomic DB Transactions      |                         | - Deterministic Variance Buffers|
| - Duplicate Check & Lockout   |                         | - Pluggable ML Model Interface  |
+-------------------------------+                         +---------------------------------+
        |                                                                   |
        +---------------------------------+---------------------------------+
                                          |
+-----------------------------------------v-----------------------------------------+
|                               DATA PERSISTENCE LAYER                              |
|                                                                                   |
|   Prisma ORM (Transactions, Compound Unique Constraints, Cascade Foreign Keys)    |
|   - Local Dev: SQLite Zero-Config Database (`dev.db`)                              |
|   - Production: PostgreSQL 14+ Relational DB with TIMESTAMPTZ & UUID Extensions   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Technology Stack & Decision Rationale

| Layer | Selected Technology | Technical Justification |
|---|---|---|
| **Frontend Framework** | Next.js 14 (App Router) + React 18 | High-performance server-side rendering for public QR join entry points, coupled with reactive client components for live token polling. |
| **Language** | TypeScript 5+ | End-to-end type safety between database models, API payloads, queue states, and UI view models. |
| **Styling** | Tailwind CSS + Lucide React | Tailored visual identity (Deep Navy, Electric Blue, AI Purple, Emerald Green, Amber) with accessible components. |
| **ORM & Schema** | Prisma 5 | Schema-first type-safe query generation, integrated migrations, and ACID transaction support (`prisma.$transaction`). |
| **Database** | SQLite (Dev) / PostgreSQL (Prod) | Zero-dependency immediate local startup for student PBL mentor review without fragile external daemon requirements, mapped 1:1 to production PostgreSQL DDL. |
| **Authentication** | JWT (JSON Web Tokens) + Role Guards | Stateless, secure role-based authentication separating `CUSTOMER`, `STAFF`, and `ADMIN` operations. |
| **QR Engine** | Node `qrcode` | Real-time vector and data-URI generation for physical poster deployment. |

---

## 3. Queue State Machine & Lifecycle

The lifecycle of each customer queue entry (token) strictly enforces the following state transitions:

```
                  [ Customer Scans QR & Joins ]
                                |
                                v
                           +---------+
            +------------> | WAITING | <-------------+
            |              +---------+               |
            |                   |                    |
[ Cancel by Customer ]     [ Staff Calls ]           |
            |                   |                    |
            v                   v                    |
     +-----------+         +--------+                |
     | CANCELLED |         | CALLED |                |
     +-----------+         +--------+                |
                                |                    |
                    +-----------+-----------+        |
                    |                       |        |
            [ Customer Arrives ]    [ No-Show Alert ]|
                    |                       |        |
                    v                       v        |
               +---------+             +---------+   |
               | SERVING |             | NO_SHOW | --+ (Recall if authorized)
               +---------+             +---------+
                    |
           [ Service Completed ]
                    |
                    v
              +-----------+
              | COMPLETED |
              +-----------+
```

### Valid Transition Rules:
- `WAITING` -> `CALLED`: Triggered atomically when an available counter presses "Call Next".
- `CALLED` -> `SERVING`: Triggered when customer presents themselves at the designated counter.
- `SERVING` -> `COMPLETED`: Triggered upon conclusion of service. Generates immutable `ServiceRecord` and triggers ETA retraining.
- `WAITING` -> `CANCELLED`: Permitted self-cancellation by the customer before being called.
- `CALLED` -> `NO_SHOW`: Triggered if customer fails to appear within the grace timeout.
- **Illegal Transitions**: Direct transitions from `WAITING` -> `COMPLETED` or `COMPLETED` -> `WAITING` are strictly rejected by the server-side validator with HTTP 400.

---

## 4. Algorithmic Wait-Time Prediction (AI-ETA Engine)

### 4.1 Mathematical Formulation
Unlike simplistic queue displays that merely multiply position by a constant, Meento computes wait time via dynamic capacity scheduling:

$$\text{ETA}(i) = \frac{\text{Workload Ahead}}{\text{Effective Service Capacity}} + \text{Buffer}$$

Where:
1. **Workload Ahead ($W$)**:
   $$W = (N_{\text{waiting\_ahead}} \times \mu_{\text{service}}) + \sum_{c \in \text{busy counters}} \max(0, \mu_{\text{service}} - \Delta t_{\text{elapsed}, c})$$
   Here $\mu_{\text{service}}$ is the rolling exponentially-weighted moving average (EWMA) of recent completed services in that specific queue. $\Delta t_{\text{elapsed}, c}$ is the time counter $c$ has already spent with the current customer.

2. **Effective Service Capacity ($C$)**:
   $$C = \max(1, N_{\text{active\_open\_counters}})$$
   If 3 counters are actively serving, work depletes roughly 3 times faster.

3. **Calculated Waiting Time ($\text{Minutes}$)**:
   $$\text{ETA} = \left\lceil \frac{W}{C \times 60} \right\rceil$$

### 4.2 Pluggable Future ML Architecture
The calculation is isolated behind the interface `QueuePredictionEngine`:
```typescript
interface QueuePredictionEngine {
  calculateETA(params: ETAParameters): Promise<ETAResult>;
}
```
In future releases, this deterministic heuristic is replaced with a trained regression model (e.g., XGBoost / Random Forest on historical service records, time of day, day of week, staff ID, and service complexity) without altering API route contracts.

---

## 5. Real-Time Synchronization Architecture

To provide robust, zero-configuration local responsiveness without requiring external WebSocket broker setups (such as Redis Pub/Sub), Meento implements an adaptive **Short-Polling & ETag/Timestamp Revalidation Engine**:
- Customer token pages poll `/api/tokens/[id]` every 3 seconds.
- Staff counter pages poll `/api/queues/[id]/status` every 2.5 seconds.
- Payload responses include the queue revision timestamp. If no state change occurred, client render cycles are skipped.
- Counter actions ("Call Next", "Complete") trigger immediate optimistic client updates followed by authoritative server synchronization.

---

## 6. Security Boundaries & Authorization

1. **Authentication**: JWT-based session tokens stored in secure `HttpOnly` cookies / Authorization bearer headers.
2. **Role Boundaries**:
   - `CUSTOMER`: Can only view open queues, join queues, and read/cancel their own active token (`user_id` or session secret match).
   - `STAFF`: Restricted to assigned venue counters. Can execute state transitions (`CALLED`, `SERVING`, `COMPLETED`, `NO_SHOW`).
   - `ADMIN`: Full administrative control over venue operational status, queue configurations, counter definitions, and throughput analytics.
3. **Data Integrity**: Concurrency protection using Prisma transactions prevents race conditions where two simultaneous staff members attempt to call the same waiting customer.
