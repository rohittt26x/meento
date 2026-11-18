# MEENTO - Relational Database Schema Specification

## 1. Architectural Overview

The MEENTO database is designed as a fully normalized, relational schema adhering to Third Normal Form (3NF). It models the multi-tenant physical operations of smart queue orchestration across businesses, physical venues, queues, service counters, queue entries (digital tokens), audit events, service performance records, and notifications.

### Design Principles:
1. **Relational Integrity & Foreign Keys**: Mandatory `CASCADE` deletes for parent organizational entities and `SET NULL` for audit linkages to preserve historical operational data even if individual accounts are deleted.
2. **Deterministic Token Ordering**: A compound unique constraint on `(queue_id, token_number)` guarantees sequential, non-conflicting token issuance within each queue without cross-tenant collisions.
3. **State Machine Integrity**: Strict token status flow (`WAITING` -> `CALLED` -> `SERVING` -> `COMPLETED`, `WAITING` -> `CANCELLED`, `CALLED` -> `NO_SHOW`).
4. **Historical Immutability**: `service_records` and `queue_events` are append-only historical audit records used for operational intelligence, compliance, and ETA machine-learning training.
5. **Timezone Policy**: All timestamps are stored in UTC (`DateTime` / `TIMESTAMPTZ` in PostgreSQL, ISO 8601 in SQLite) to ensure deterministic synchronization across distributed clients.

---

## 2. Entity Dictionary & Attribute Specifications

### 2.1 `users`
Stores user identities across three roles: `CUSTOMER`, `STAFF`, and `ADMIN`.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY, UUID | Unique user identifier |
| `name` | VARCHAR(255) | NOT NULL | User's full name |
| `email` | VARCHAR(255) | UNIQUE, NULLABLE | Optional for anonymous walk-ins, required for staff/admin |
| `phone` | VARCHAR(20) | NULLABLE | Phone number for SMS/WhatsApp notifications |
| `role` | VARCHAR(20) | NOT NULL, DEFAULT 'CUSTOMER' | Enum: `CUSTOMER`, `STAFF`, `ADMIN` |
| `password_hash`| VARCHAR(255) | NULLABLE | Salted hash for authenticated staff and admin portals |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes**: `idx_users_role (role)`, `idx_users_email (email)`

---

### 2.2 `businesses`
Represents an organization or institutional client operating one or more physical locations.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY, UUID | Business identifier |
| `name` | VARCHAR(255) | NOT NULL | Organization name (e.g., "MIT ADT University") |
| `slug` | VARCHAR(100) | UNIQUE, NOT NULL | URL-safe identifier for public discovery |
| `description` | TEXT | NULLABLE | Business profile and description |
| `contact_email`| VARCHAR(255) | NULLABLE | Administrative contact |
| `contact_phone`| VARCHAR(20) | NULLABLE | Administrative phone |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

---

### 2.3 `venues`
Physical locations owned by a business (e.g. "Campus Service Centre", "Main Canteen", "Engineering Xerox").

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY, UUID | Venue identifier |
| `business_id` | VARCHAR(36) | NOT NULL, FK -> businesses(id) ON DELETE CASCADE | Parent organization |
| `name` | VARCHAR(255) | NOT NULL | Venue name |
| `code` | VARCHAR(50) | UNIQUE, NOT NULL | Machine code (e.g., "MIT-CSC-01") |
| `address` | TEXT | NULLABLE | Physical location / campus building |
| `phone` | VARCHAR(20) | NULLABLE | Local venue desk phone |
| `is_open` | BOOLEAN | NOT NULL, DEFAULT TRUE | Master venue operating toggle |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Registration timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes**: `idx_venues_business_id (business_id)`

---

### 2.4 `staff_memberships`
Associates staff users with specific venues and role privileges.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY, UUID | Membership ID |
| `user_id` | VARCHAR(36) | NOT NULL, FK -> users(id) ON DELETE CASCADE | Staff user reference |
| `venue_id` | VARCHAR(36) | NOT NULL, FK -> venues(id) ON DELETE CASCADE | Assigned venue |
| `role_title` | VARCHAR(100)| NOT NULL, DEFAULT 'Service Executive' | Staff title or position |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Staff activation toggle |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Assignment creation |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update |

**Constraints**: `UNIQUE (user_id, venue_id)`
**Indexes**: `idx_staff_memberships_venue_id (venue_id)`

---

### 2.5 `service_counters`
Physical or virtual desks within a venue where services are rendered.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY, UUID | Counter identifier |
| `venue_id` | VARCHAR(36) | NOT NULL, FK -> venues(id) ON DELETE CASCADE | Parent venue |
| `counter_number`| INT | NOT NULL | Sequential counter index within venue (1, 2, 3...) |
| `name` | VARCHAR(100)| NOT NULL | Counter label (e.g., "Counter 1: Admissions") |
| `description` | TEXT | NULLABLE | Counter service specialization |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'OPEN' | Enum: `OPEN`, `BUSY`, `CLOSED` |
| `current_staff_id` | VARCHAR(36) | NULLABLE, FK -> users(id) ON DELETE SET NULL | Currently logged-in counter executive |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Setup timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update |

**Constraints**: `UNIQUE (venue_id, counter_number)`
**Indexes**: `idx_service_counters_venue_id (venue_id)`

---

### 2.6 `queues`
Defines an active waiting line configured for a venue with custom service expectations.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY, UUID | Queue identifier |
| `venue_id` | VARCHAR(36) | NOT NULL, FK -> venues(id) ON DELETE CASCADE | Parent venue |
| `name` | VARCHAR(255) | NOT NULL | Queue name (e.g. "Student Admin Queue") |
| `code` | VARCHAR(50) | UNIQUE, NOT NULL | Public routing code (e.g. "MIT-ADMIN-Q") |
| `description` | TEXT | NULLABLE | Service summary shown to joining students |
| `prefix` | VARCHAR(10) | NOT NULL, DEFAULT 'Q' | Token prefix letter (e.g. 'A' -> A-101) |
| `max_capacity` | INT | NOT NULL, DEFAULT 100 | Queue throttle limit |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'OPEN' | Enum: `OPEN`, `PAUSED`, `CLOSED` |
| `estimated_service_time_minutes` | INT | NOT NULL, DEFAULT 5 | Baseline service duration in minutes |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Queue initialization |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update |

**Indexes**: `idx_queues_venue_id (venue_id)`

---

### 2.7 `queue_entries`
The core persistent token record issued to a customer joining a queue.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY, UUID | Token entry unique identifier |
| `queue_id` | VARCHAR(36) | NOT NULL, FK -> queues(id) ON DELETE CASCADE | Target queue |
| `user_id` | VARCHAR(36) | NULLABLE, FK -> users(id) ON DELETE SET NULL | Linked user if logged in |
| `token_number` | INT | NOT NULL | Sequential integer (1, 2, 3...) per queue |
| `formatted_code` | VARCHAR(20) | NOT NULL | Display code (e.g., "A-101") |
| `customer_name`| VARCHAR(255) | NOT NULL | Customer name provided at join time |
| `customer_phone`| VARCHAR(20) | NOT NULL | Customer contact for live alerts |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'WAITING' | Enum: `WAITING`, `CALLED`, `SERVING`, `COMPLETED`, `CANCELLED`, `NO_SHOW` |
| `counter_id` | VARCHAR(36) | NULLABLE, FK -> service_counters(id) | Assigned counter when called |
| `joined_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Token issue timestamp |
| `called_at` | TIMESTAMPTZ | NULLABLE | Timestamp when counter pressed "Call Next" |
| `served_at` | TIMESTAMPTZ | NULLABLE | Timestamp when customer arrived at counter |
| `completed_at` | TIMESTAMPTZ | NULLABLE | Timestamp when counter completed service |
| `cancelled_at` | TIMESTAMPTZ | NULLABLE | Timestamp if cancelled by customer |
| `cancellation_reason` | TEXT | NULLABLE | Self-reported cancellation reason |
| `priority` | INT | NOT NULL, DEFAULT 0 | Priority tier (0 = normal, 1 = urgent/faculty) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation record timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update |

**Constraints**: `UNIQUE (queue_id, token_number)`
**Indexes**:
- `idx_queue_entries_queue_status (queue_id, status)`: Primary query index for live waiting lists and position count.
- `idx_queue_entries_phone (customer_phone)`: Prevents multiple active tokens and speeds up customer lookup.

---

### 2.8 `queue_events`
Audit trail of lifecycle state transitions for queue entries.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY, UUID | Event log identifier |
| `queue_entry_id`| VARCHAR(36) | NOT NULL, FK -> queue_entries(id) ON DELETE CASCADE | Subject token |
| `event_type` | VARCHAR(30) | NOT NULL | Enum: `JOINED`, `CALLED`, `SERVING_STARTED`, `COMPLETED`, `CANCELLED`, `NO_SHOW` |
| `counter_id` | VARCHAR(36) | NULLABLE | Associated counter identifier |
| `staff_id` | VARCHAR(36) | NULLABLE | Staff user executing the transition |
| `details` | TEXT | NULLABLE | JSON or text audit details |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Event timestamp |

**Indexes**: `idx_queue_events_entry (queue_entry_id)`

---

### 2.9 `service_records`
Immutable analytics record created upon each completed customer consultation.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY, UUID | Record identifier |
| `queue_entry_id`| VARCHAR(36) | UNIQUE, NOT NULL, FK -> queue_entries(id) ON DELETE CASCADE | Subject token |
| `counter_id` | VARCHAR(36) | NOT NULL, FK -> service_counters(id) | Serving counter |
| `staff_id` | VARCHAR(36) | NOT NULL, FK -> users(id) | Serving staff executive |
| `duration_seconds`| INT | NOT NULL | Exact duration in seconds (`completed_at` - `served_at`) |
| `started_at` | TIMESTAMPTZ | NOT NULL | When customer began service |
| `completed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When transaction finished |
| `notes` | TEXT | NULLABLE | Resolution or counter notes |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Entry timestamp |

**Indexes**:
- `idx_service_records_counter (counter_id)`
- `idx_service_records_staff (staff_id)`
- `idx_service_records_completed (completed_at)`: Optimizes time-series analytics and rolling average calculations.

---

### 2.10 `notifications`
Customer dispatch notices triggered when tokens change status (e.g., token called to counter).

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY, UUID | Notification identifier |
| `queue_entry_id`| VARCHAR(36) | NOT NULL, FK -> queue_entries(id) ON DELETE CASCADE | Associated token |
| `user_id` | VARCHAR(36) | NULLABLE, FK -> users(id) | Recipient user |
| `title` | VARCHAR(255) | NOT NULL | Brief headline (e.g. "It's your turn!") |
| `message` | TEXT | NOT NULL | Guidance (e.g., "Token A-103 please report to Counter 2") |
| `is_read` | BOOLEAN | NOT NULL, DEFAULT FALSE | Read state indicator |
| `sent_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Time alert was dispatched |

**Indexes**: `idx_notifications_entry (queue_entry_id)`, `idx_notifications_user (user_id)`

---

## 3. Cardinality & Relationship Matrix

| Entity 1 | Entity 2 | Cardinality | Foreign Key Owner | On Delete Action |
|---|---|---|---|---|
| `Business` | `Venue` | 1 to Many | `Venue.business_id` | `CASCADE` |
| `Venue` | `Queue` | 1 to Many | `Queue.venue_id` | `CASCADE` |
| `Venue` | `ServiceCounter` | 1 to Many | `ServiceCounter.venue_id` | `CASCADE` |
| `Venue` | `StaffMembership`| 1 to Many | `StaffMembership.venue_id`| `CASCADE` |
| `User` | `StaffMembership`| 1 to Many | `StaffMembership.user_id` | `CASCADE` |
| `User` | `ServiceCounter` | 1 to Many | `ServiceCounter.current_staff_id` | `SET NULL` |
| `Queue` | `QueueEntry` | 1 to Many | `QueueEntry.queue_id` | `CASCADE` |
| `User` | `QueueEntry` | 1 to Many | `QueueEntry.user_id` | `SET NULL` |
| `ServiceCounter`| `QueueEntry` | 1 to Many | `QueueEntry.counter_id` | `SET NULL` |
| `QueueEntry` | `QueueEvent` | 1 to Many | `QueueEvent.queue_entry_id` | `CASCADE` |
| `QueueEntry` | `ServiceRecord` | 1 to 1 | `ServiceRecord.queue_entry_id` | `CASCADE` |
| `QueueEntry` | `Notification` | 1 to Many | `Notification.queue_entry_id` | `CASCADE` |

---

## 4. Normalization Proof (3NF)

1. **First Normal Form (1NF)**:
   - All attribute values are atomic (e.g., separate columns for phone, name, statuses).
   - No repeating groups or arrays stored in single columns.
   - Each table possesses a designated unique primary key (`id` UUID).

2. **Second Normal Form (2NF)**:
   - All tables are in 1NF.
   - Every non-key attribute is fully functionally dependent on the primary key, with compound keys (such as `(queue_id, token_number)`) strictly enforced via unique constraints rather than partial functional dependencies.

3. **Third Normal Form (3NF)**:
   - All tables are in 2NF.
   - No transitive dependencies exist. For example, venue names are not duplicated in `queue_entries`; tokens only hold `queue_id`, from which `venue_id` and `business_id` can be unambiguously resolved via foreign key traversals.
