# MEENTO: AI-Powered Smart Queue Management System
> **"Ghanto Nahi, Meento."** / *"Because Waiting Shouldn't Waste Time."*  
> **Project-Based Learning (PBL) — Industrial Mentor Review MVP**

---

## 1. Executive Summary

MEENTO is a modern, full-stack, AI-powered smart queue management and virtual token orchestration platform. It replaces outdated physical queues with digital tokens, real-time position tracking, and predictive wait-time estimation.

### Primary Demonstration Venue:
- **Campus**: MIT ADT University, Pune
- **Facility**: MIT ADT Campus Service Centre (`MIT-CSC-01`)
- **Primary Queue**: Student Administration Queue (`MIT-ADMIN-Q`, Prefix: `A`)
- **Desks**: Counter 1 (Admissions & Fees), Counter 2 (Transcripts & Records), Counter 3 (Identity Cards & Verification)

---

## 2. Technology Architecture

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + React 18 | Fully responsive, server and client rendered components |
| **Language** | TypeScript 5 | End-to-end type safety |
| **Styling** | Tailwind CSS + Lucide Icons | Deep Navy (`#0a0f1d`), Brand Blue (`#2563eb`), AI Purple (`#9333ea`), Emerald (`#10b981`), Amber (`#f59e0b`) |
| **ORM** | Prisma ORM 5 | ACID transactions, foreign keys, compound constraints, migrations |
| **Database** | SQLite (Dev) / PostgreSQL (Prod) | Zero-config local execution (`dev.db`) + full PostgreSQL DDL (`DATABASE_SCHEMA.sql`) |
| **Prediction Engine**| Capacity-Weighted EWMA Dynamic Predictor | Testable algorithm modeling desk capacity, rolling service averages, and active elapsed time |
| **Real-Time Sync** | Adaptive Short-Polling & Optimistic UI | 2.5s - 3s automated revalidation cycles |
| **Testing** | Node.js Test Runner (`node:test`, `node:assert`) | 14 unit and integration tests passing |

---

## 3. Quickstart & Local Setup

### Prerequisites
- Node.js 18+ (tested on Node.js v24.13.0)
- npm 9+

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Initialize Database & Seed
```bash
# Push Prisma schema to local SQLite database
npx prisma db push

# Seed realistic MIT ADT demonstration data
npm run prisma:seed
```

### Step 3: Run Automated Tests
```bash
npm test
```
*Executes all 14 unit and integration tests covering the Queue State Machine, concurrency constraints, and AI-ETA mathematical formulas.*

### Step 4: Start the Development Server
```bash
npm run dev
```
Open your browser at [http://localhost:3000](http://localhost:3000).

---

## 4. Live Mentor Demonstration Sequence

To demonstrate the full customer-to-staff end-to-end workflow to your industrial mentor:

1. **Open Landing Page** (`http://localhost:3000`)
   - Notice the live statistics: Currently Waiting, Completed Today, Active Desks.
   - Point out the MIT ADT Campus Service Centre live status widget.

2. **Step 1 — Customer Joins Queue** (`/queues` or `/join/[queueId]`)
   - Click **"Join a Queue"** -> Select **"Student Administration Queue"**.
   - Enter Customer Name (e.g. `Rohit Shinde`) and Mobile Number.
   - Click **"Join Queue & Issue Token"**.
   - An ACID database transaction allocates the next sequential token (e.g., `A-108`).

3. **Step 2 — Customer Live Token View** (`/token/[tokenId]`)
   - Observe the digital token card with:
     - Prominent Token Code (`A-108`)
     - Real-time Position Ahead (e.g. `3 ahead`)
     - Dynamic Estimated Wait Time (`~8 mins`) calculated by the AI-ETA engine.
     - Live sync indicator auto-polling every 3 seconds.

4. **Step 3 — Staff Counter Desk** (`/staff`)
   - In a second browser window or tab, open `/staff` (or use the top bar to switch to **"Staff Desk 1"**).
   - See the active waiting list in real-time.
   - Click **"CALL NEXT CUSTOMER"**.
   - Staff atomically calls the next waiting token.
   - Token state transitions from `WAITING` to `CALLED`.
   - In the customer window, observe the live page immediately transition and trigger the **"IT'S YOUR TURN!"** banner with sound alert.

5. **Step 4 — Start & Complete Consultation**
   - At the staff desk, click **"Student Arrived (Start)"** -> State changes to `SERVING`.
   - Click **"Complete Service & Free Desk"** -> State transitions to `COMPLETED`.
   - The backend records the duration in `service_records`, frees the desk back to `OPEN`, and triggers future ETA optimization.
   - The customer window displays **"Service Completed - Thank you!"**.

6. **Step 5 — Central Admin & Analytics** (`/admin`)
   - Switch to **"Admin Ops"**.
   - View updated KPI metrics: Completed count increased, rolling average service duration updated.
   - Click **"Get QR Poster"** on any queue to reveal the printable QR code poster ready for campus doors.
   - Click **"Reset Data"** in the top bar to restore the database to standard demo state at any time.

---

## 5. Project Directory Structure

```
├── app/
│   ├── layout.tsx                  # Root layout with DemoNavbar and theme metadata
│   ├── globals.css                 # Tailwind CSS styles and custom animations
│   ├── page.tsx                    # Landing page with hero and live campus hub
│   ├── queues/page.tsx             # Campus queues discovery directory
│   ├── join/[queueId]/page.tsx     # Mobile QR queue join form & printable poster
│   ├── token/[id]/page.tsx         # Customer live token tracking & dynamic ETA view
│   ├── staff/page.tsx              # Staff counter desk (Call Next, Start, Complete, No-Show)
│   ├── admin/page.tsx              # Admin operational telemetry, analytics & QR generator
│   ├── history/page.tsx            # Customer queue history lookup
│   └── api/                        # REST API Routes
│       ├── auth/                   # Login, Me, Demo role switcher
│       ├── queues/                 # List, Details, Join, Live Status, QR generator
│       ├── tokens/                 # Token tracking, Cancel, History
│       ├── counters/               # List, Call-next, Serve, Complete, No-show
│       └── admin/                  # Dashboard summary, Analytics, Reset-demo
├── components/
│   └── DemoNavbar.tsx              # Navigation bar with quick demo role-switcher
├── lib/
│   ├── prisma.ts                   # Prisma client singleton
│   ├── types.ts                    # Domain models, Enums, API interfaces
│   ├── auth/jwt.ts                 # JWT signing and verification
│   ├── queue/stateMachine.ts       # Strict queue state machine with atomic transactions
│   ├── eta/etaEngine.ts            # Capacity-weighted EWMA dynamic wait-time predictor
│   └── qr/qrGenerator.ts           # QR code generation utility
├── prisma/
│   ├── schema.prisma               # Normalized relational schema (SQLite dev)
│   └── seed.js                     # Seed script with realistic MIT ADT demonstration records
├── tests/
│   ├── eta.test.js                 # Unit tests for ETA prediction engine
│   └── queue.test.js               # Integration tests for Queue state machine & concurrency
├── DATABASE_SCHEMA.md              # Complete 3NF relational database specification
├── ER_DIAGRAM.md                   # Mermaid Entity-Relationship diagram
├── DATABASE_SCHEMA.sql             # Production PostgreSQL 14+ DDL migrations
├── API_DOCUMENTATION.md            # Comprehensive REST API endpoint contract
├── ARCHITECTURE.md                 # System architecture & engineering specification
└── README.md                       # Project manual & mentor demonstration guide
```

---

## 6. Deliverables Reference

- **Database Specification**: [DATABASE_SCHEMA.md](file:///d:/PBL/DATABASE_SCHEMA.md)
- **Entity Relationship Diagram**: [ER_DIAGRAM.md](file:///d:/PBL/ER_DIAGRAM.md)
- **PostgreSQL DDL Migration**: [DATABASE_SCHEMA.sql](file:///d:/PBL/DATABASE_SCHEMA.sql)
- **API Documentation**: [API_DOCUMENTATION.md](file:///d:/PBL/API_DOCUMENTATION.md)
- **Architecture Specification**: [ARCHITECTURE.md](file:///d:/PBL/ARCHITECTURE.md)
