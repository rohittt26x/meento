# MEENTO - API Documentation & REST Interface Specification

All API endpoints accept and return `application/json`.
Dates and timestamps follow the ISO 8601 standard in UTC (e.g. `2026-10-14T14:30:00.000Z`).

---

## 1. Authentication & Session Endpoints

### `POST /api/auth/login`
Authenticates a user and returns a signed JWT bearer token.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "priya.sharma@mitadt.edu.in",
    "password": "demo_staff1_hashed_pw"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "u-123",
      "name": "Priya Sharma",
      "email": "priya.sharma@mitadt.edu.in",
      "role": "STAFF"
    }
  }
  ```

### `POST /api/auth/demo-switch`
Convenient session switcher designed for live mentor evaluation to instantly test role-based permissions without manual password entry.
- **Access**: Public (Demo Mode)
- **Request Body**:
  ```json
  {
    "role": "STAFF", // "CUSTOMER" | "STAFF" | "ADMIN"
    "counterNumber": 1
  }
  ```
- **Response (200 OK)**: Returns new JWT token and associated user profile.

### `GET /api/auth/me`
Retrieves current session identity and role permissions.
- **Access**: Authenticated (`Authorization: Bearer <token>`)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "u-123",
      "name": "Priya Sharma",
      "role": "STAFF"
    }
  }
  ```

---

## 2. Queue Endpoints

### `GET /api/queues`
Retrieves all queues with live waiting counters and venue metadata.
- **Access**: Public
- **Query Params**: `venueId` (optional)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "q-admin-01",
        "name": "Student Administration Queue",
        "code": "MIT-ADMIN-Q",
        "prefix": "A",
        "status": "OPEN",
        "estimatedServiceTimeMinutes": 4,
        "waitingCount": 3,
        "activeCountersCount": 2,
        "venue": {
          "name": "MIT ADT Campus Service Centre",
          "code": "MIT-CSC-01"
        }
      }
    ]
  }
  ```

### `GET /api/queues/[id]`
Detailed information and operating parameters for a single queue.
- **Access**: Public

### `POST /api/queues/[id]/join`
Enrolls a customer into the queue and issues a unique digital token.
- **Access**: Public (Customer)
- **Request Body**:
  ```json
  {
    "customerName": "Rohit Shinde",
    "customerPhone": "+91 98220 44556"
  }
  ```
- **Validation**:
  - `customerName`: Minimum 2 characters.
  - `customerPhone`: Valid phone format.
  - Rejects if queue status is `CLOSED` or `PAUSED`.
  - Rejects if customer already has an active (`WAITING`, `CALLED`, `SERVING`) token in the same queue.
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "tokenId": "tok-789",
      "tokenNumber": 108,
      "formattedCode": "A-108",
      "status": "WAITING",
      "positionAhead": 3,
      "estimatedWaitMinutes": 8,
      "joinedAt": "2026-10-14T14:35:00.000Z"
    }
  }
  ```

### `GET /api/queues/[id]/status`
Real-time short-polling status feed for queue monitors and counter displays.
- **Access**: Public
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "queueId": "q-admin-01",
      "queueName": "Student Administration Queue",
      "status": "OPEN",
      "waitingCount": 3,
      "servingCount": 1,
      "completedTodayCount": 14,
      "activeCountersCount": 2,
      "currentServingTokens": [
        {
          "counterNumber": 1,
          "counterName": "Counter 1: Admissions",
          "tokenCode": "A-103",
          "customerName": "Tanvi Joshi",
          "servedAt": "2026-10-14T14:28:00.000Z"
        }
      ],
      "currentlyCalledTokens": [
        {
          "counterNumber": 2,
          "counterName": "Counter 2: Transcripts",
          "tokenCode": "A-104",
          "customerName": "Aditya Shinde",
          "calledAt": "2026-10-14T14:32:00.000Z"
        }
      ]
    }
  }
  ```

### `GET /api/queues/[id]/qr`
Generates high-resolution QR code Data-URI pointing to the mobile joining URL.
- **Access**: Public

---

## 3. Customer Token Endpoints

### `GET /api/tokens/[id]`
Live polling endpoint for customer mobile view. Provides real-time position, dynamic AI-ETA, and current desk assignment.
- **Access**: Public (Token ID UUID acts as bearer secret)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "tokenId": "tok-789",
      "tokenNumber": 105,
      "formattedCode": "A-105",
      "status": "WAITING",
      "customerName": "Rohit Shinde",
      "positionAhead": 0,
      "estimatedWaitMinutes": 2,
      "currentlyServingCode": "A-103",
      "assignedCounter": null,
      "queue": {
        "name": "Student Administration Queue",
        "venueName": "MIT ADT Campus Service Centre"
      }
    }
  }
  ```

### `POST /api/tokens/[id]/cancel`
Allows a customer to cancel their waiting token.
- **Access**: Public (or Customer Token Owner)
- **Request Body**:
  ```json
  {
    "reason": "Lecture began early"
  }
  ```
- **Response (200 OK)**: Updates status to `CANCELLED` and recalculates remaining queue positions.

---

## 4. Staff Counter Operations

### `GET /api/counters`
Lists all counters in the venue with their current status and active tokens.
- **Access**: Authenticated (`STAFF` or `ADMIN`)

### `POST /api/counters/[id]/call-next`
Calls the next eligible waiting token to the specified counter desk.
- **Access**: Authenticated (`STAFF` or `ADMIN`)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Called token A-105 to Counter 1",
    "token": {
      "id": "tok-789",
      "formattedCode": "A-105",
      "customerName": "Rohit Shinde",
      "status": "CALLED"
    }
  }
  ```

### `POST /api/counters/[id]/serve`
Marks a called customer as actively `SERVING` upon arrival at desk.
- **Access**: Authenticated (`STAFF` or `ADMIN`)

### `POST /api/counters/[id]/complete`
Concludes consultation, logs exact duration in `service_records`, frees counter to `OPEN`.
- **Access**: Authenticated (`STAFF` or `ADMIN`)
- **Request Body**:
  ```json
  {
    "notes": "Student bonafide documents verified and sealed."
  }
  ```

### `POST /api/counters/[id]/no-show`
Marks customer as `NO_SHOW` if absent after repeated calls.
- **Access**: Authenticated (`STAFF` or `ADMIN`)

---

## 5. Admin & Analytics Endpoints

### `GET /api/admin/dashboard`
Aggregated operational telemetry: Total waiting, active counters, today's throughput, average wait times.
- **Access**: Authenticated (`ADMIN`)

### `GET /api/admin/analytics`
Time-series service analytics, counter distribution breakdown, and average service durations.
- **Access**: Authenticated (`ADMIN`)

### `POST /api/admin/reset-demo`
Restores database to standard demo seed state for live mentor demonstration.
- **Access**: Authenticated (`ADMIN`)
