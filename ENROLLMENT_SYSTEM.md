# Advanced Enrollment System Documentation

## Overview
The Nkabom Daycare API features a comprehensive enrollment management system with application workflow, waitlist management, and bulk operations.

**Version:** 0.2.1
**Last Updated:** December 5, 2025

---

## Table of Contents
- [Enrollment Status Flow](#enrollment-status-flow)
- [API Endpoints](#api-endpoints)
- [Enrollment Workflow](#enrollment-workflow)
- [Waitlist Management](#waitlist-management)
- [Bulk Operations](#bulk-operations)
- [Analytics & Reporting](#analytics--reporting)
- [Usage Examples](#usage-examples)

---

## Enrollment Status Flow

The system supports 7 enrollment statuses:

```
PENDING → APPROVED → ENROLLED
   ↓         ↓           ↓
REJECTED  WAITLIST   WITHDRAWN
   ↓         ↓           ↓
       INACTIVE
```

### Status Definitions

| Status | Description | Active |
|--------|-------------|--------|
| **PENDING** | Application submitted, awaiting review | No |
| **APPROVED** | Application approved, ready for enrollment | No |
| **ENROLLED** | Currently enrolled in the center | Yes |
| **WAITLIST** | On waitlist, awaiting available spot | No |
| **WITHDRAWN** | Withdrawn from center | No |
| **REJECTED** | Application rejected | No |
| **INACTIVE** | Temporarily inactive (e.g., on leave) | No |

---

## API Endpoints

### Total Enrollment Endpoints: 16

### 1. Basic Enrollment Management

#### Create Child (Submit Application)
```http
POST /api/children
Authorization: Bearer <token>
x-tenant-id: <tenant-id>
```

**Request Body:**
```json
{
  "firstName": "Kwame",
  "lastName": "Mensah",
  "dateOfBirth": "2021-03-15",
  "gender": "male",
  "bloodType": "O+",
  "allergies": "None",
  "medicalConditions": "None",
  "dietaryRestrictions": "None",
  "emergencyContactName": "Ama Mensah",
  "emergencyContactPhone": "+233244123456",
  "emergencyContactRelationship": "Mother",
  "specialNeeds": "None"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "child": {
      "id": "uuid",
      "firstName": "Kwame",
      "lastName": "Mensah",
      "enrollmentStatus": "pending",
      "applicationDate": "2025-12-05T10:00:00Z",
      "isActive": false
    }
  },
  "message": "Child created successfully"
}
```

#### Enroll Child to Class
```http
POST /api/children/:childId/enroll
```

**Request Body:**
```json
{
  "classId": "class-uuid"
}
```

#### Withdraw Child
```http
POST /api/children/:childId/withdraw
```

**Request Body:**
```json
{
  "reason": "Relocating to another city"
}
```

---

### 2. Application Workflow

#### Approve Application
```http
POST /api/children/:childId/approve
Authorization: Bearer <token>
x-tenant-id: <tenant-id>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "child": {
      "id": "uuid",
      "enrollmentStatus": "approved",
      "approvalDate": "2025-12-05T10:00:00Z",
      "approvedBy": "director-user-id"
    }
  },
  "message": "Application approved successfully"
}
```

#### Reject Application
```http
POST /api/children/:childId/reject
```

**Request Body:**
```json
{
  "reason": "Incomplete documentation"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "child": {
      "id": "uuid",
      "enrollmentStatus": "rejected",
      "rejectionReason": "Incomplete documentation"
    }
  },
  "message": "Application rejected successfully"
}
```

---

### 3. Waitlist Management

#### Add Child to Waitlist
```http
POST /api/children/:childId/waitlist
```

**Request Body (Optional):**
```json
{
  "classId": "class-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "child": {
      "id": "uuid",
      "enrollmentStatus": "waitlist",
      "waitlistPosition": 5,
      "waitlistAddedDate": "2025-12-05T10:00:00Z"
    }
  },
  "message": "Child added to waitlist successfully"
}
```

#### Get Waitlist for Center
```http
GET /api/children/waitlist
```

**Response:**
```json
{
  "success": true,
  "data": {
    "children": [
      {
        "id": "uuid-1",
        "firstName": "Kwame",
        "lastName": "Mensah",
        "waitlistPosition": 1,
        "waitlistAddedDate": "2025-12-01T10:00:00Z",
        "guardians": [...]
      },
      {
        "id": "uuid-2",
        "firstName": "Akosua",
        "lastName": "Boateng",
        "waitlistPosition": 2,
        "waitlistAddedDate": "2025-12-02T11:00:00Z",
        "guardians": [...]
      }
    ],
    "count": 2
  }
}
```

#### Promote from Waitlist
```http
POST /api/children/:childId/promote
```

**Request Body:**
```json
{
  "classId": "class-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "child": {
      "id": "uuid",
      "enrollmentStatus": "enrolled",
      "enrollmentDate": "2025-12-05T10:00:00Z",
      "classId": "class-uuid",
      "isActive": true,
      "waitlistPosition": null
    }
  },
  "message": "Child promoted from waitlist successfully"
}
```

**Note:** When a child is promoted, all remaining waitlist positions are automatically updated.

---

### 4. Query & Filtering

#### Get Pending Applications
```http
GET /api/children/pending
```

**Response:**
```json
{
  "success": true,
  "data": {
    "children": [
      {
        "id": "uuid",
        "firstName": "Kwame",
        "lastName": "Mensah",
        "enrollmentStatus": "pending",
        "applicationDate": "2025-12-05T10:00:00Z",
        "guardians": [...]
      }
    ],
    "count": 1
  }
}
```

#### Get Children by Enrollment Status
```http
GET /api/children?status=enrolled
GET /api/children?status=pending
GET /api/children?status=waitlist
```

---

### 5. Bulk Operations

#### Bulk Approve Applications
```http
POST /api/children/bulk-approve
```

**Request Body:**
```json
{
  "childIds": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "children": [...],
    "count": 3
  },
  "message": "Applications approved successfully"
}
```

**Validation:**
- All children must be in PENDING status
- All children must belong to the tenant
- Returns error if any child not found or not in pending status

#### Bulk Enroll Children
```http
POST /api/children/bulk-enroll
```

**Request Body:**
```json
{
  "enrollments": [
    { "childId": "uuid-1", "classId": "class-uuid-a" },
    { "childId": "uuid-2", "classId": "class-uuid-a" },
    { "childId": "uuid-3", "classId": "class-uuid-b" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "children": [...],
    "count": 3
  },
  "message": "Children enrolled successfully"
}
```

---

### 6. Analytics & Reporting

#### Get Enrollment Statistics
```http
GET /api/children/enrollment-stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalEnrolled": 45,
      "totalPending": 8,
      "totalWaitlist": 12,
      "totalApproved": 3,
      "totalWithdrawn": 5,
      "totalRejected": 2,
      "totalInactive": 1
    }
  }
}
```

---

## Enrollment Workflow

### Standard Enrollment Flow

```
1. Parent submits application
   POST /api/children
   → Status: PENDING
   → isActive: false

2. Admin reviews and approves
   POST /api/children/:id/approve
   → Status: APPROVED
   → approvalDate set
   → approvedBy set

3. Admin enrolls to class
   POST /api/children/:id/enroll
   → Status: ENROLLED
   → enrollmentDate set
   → isActive: true
```

### Waitlist Flow

```
1. Parent submits application
   POST /api/children
   → Status: PENDING

2. No spots available
   POST /api/children/:id/waitlist
   → Status: WAITLIST
   → waitlistPosition calculated
   → waitlistAddedDate set

3. Spot becomes available
   POST /api/children/:id/promote
   → Status: ENROLLED
   → enrollmentDate set
   → isActive: true
   → waitlistPosition cleared
   → Other positions auto-updated
```

### Rejection Flow

```
1. Parent submits application
   POST /api/children
   → Status: PENDING

2. Admin reviews and rejects
   POST /api/children/:id/reject
   → Status: REJECTED
   → rejectionReason set
```

---

## Waitlist Management

### Features
- **Automatic Position Tracking:** Positions are automatically assigned based on order
- **Position Re-calculation:** When a child is promoted, all positions are updated
- **Class-Specific Waitlists:** Optional class assignment for targeted waitlists
- **FIFO Queue:** First-in, first-out based on `waitlistAddedDate`

### Best Practices

1. **Regular Monitoring:**
   ```bash
   GET /api/children/waitlist
   ```
   Check waitlist daily for available promotions

2. **Class Capacity Check:**
   ```bash
   GET /api/classes/:id/capacity
   ```
   Verify available spots before promotion

3. **Notify Parents:**
   Use SMS notification when promoting from waitlist:
   ```bash
   POST /api/notifications/custom-sms
   {
     "phoneNumber": "+233244123456",
     "message": "Good news! A spot is now available for [child name]."
   }
   ```

---

## Bulk Operations

### Use Cases

#### 1. Batch Approval
When reviewing multiple applications at once:
```bash
POST /api/children/bulk-approve
{
  "childIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

#### 2. New Class Setup
When creating a new class and enrolling multiple children:
```bash
POST /api/children/bulk-enroll
{
  "enrollments": [
    { "childId": "uuid-1", "classId": "new-class-uuid" },
    { "childId": "uuid-2", "classId": "new-class-uuid" },
    { "childId": "uuid-3", "classId": "new-class-uuid" }
  ]
}
```

#### 3. Class Transfer
Moving children from one class to another:
```bash
# First, bulk enroll to new class
POST /api/children/bulk-enroll
{
  "enrollments": [
    { "childId": "uuid-1", "classId": "target-class-uuid" },
    { "childId": "uuid-2", "classId": "target-class-uuid" }
  ]
}
```

---

## Analytics & Reporting

### Enrollment Dashboard Data

```javascript
// Get comprehensive enrollment stats
const stats = await fetch('/api/children/enrollment-stats');

// Sample Dashboard Display
Total Children: 76
├─ Enrolled: 45 (59.2%)
├─ Pending Review: 8 (10.5%)
├─ Waitlist: 12 (15.8%)
├─ Approved (Pending Enrollment): 3 (3.9%)
├─ Withdrawn: 5 (6.6%)
├─ Rejected: 2 (2.6%)
└─ Inactive: 1 (1.3%)
```

### Recommended Reports

1. **Daily Pending Applications:**
   ```bash
   GET /api/children/pending
   ```

2. **Waitlist Report:**
   ```bash
   GET /api/children/waitlist
   ```

3. **Enrollment Trends:**
   ```bash
   GET /api/children?page=1&limit=100
   # Filter by enrollmentDate in your application
   ```

---

## Usage Examples

### Example 1: Complete Enrollment Process

```javascript
// 1. Create child application
const application = await fetch('/api/children', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'x-tenant-id': 'tenant-id',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    firstName: 'Kwame',
    lastName: 'Mensah',
    dateOfBirth: '2021-03-15',
    gender: 'male'
  })
});

const { child } = await application.json();
// child.enrollmentStatus === 'pending'

// 2. Approve application
await fetch(`/api/children/${child.id}/approve`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'x-tenant-id': 'tenant-id'
  }
});

// 3. Enroll to class
await fetch(`/api/children/${child.id}/enroll`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'x-tenant-id': 'tenant-id',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    classId: 'class-uuid'
  })
});
```

### Example 2: Waitlist Management

```javascript
// Check class capacity
const capacity = await fetch('/api/classes/class-uuid/capacity');
const { capacityInfo } = await capacity.json();

if (capacityInfo.isFull) {
  // Add to waitlist
  await fetch(`/api/children/${childId}/waitlist`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer token',
      'x-tenant-id': 'tenant-id',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      classId: 'class-uuid'
    })
  });
}

// Later, when spot opens
const waitlist = await fetch('/api/children/waitlist');
const { children } = await waitlist.json();

// Promote first child on waitlist
const firstChild = children[0];
await fetch(`/api/children/${firstChild.id}/promote`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'x-tenant-id': 'tenant-id',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    classId: 'class-uuid'
  })
});
```

### Example 3: Bulk Approval Workflow

```javascript
// Get pending applications
const pending = await fetch('/api/children/pending');
const { children } = await pending.json();

// Select children to approve
const approvedIds = children
  .filter(child => meetsApprovalCriteria(child))
  .map(child => child.id);

// Bulk approve
await fetch('/api/children/bulk-approve', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'x-tenant-id': 'tenant-id',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    childIds: approvedIds
  })
});

// Bulk enroll to classes
const enrollments = approvedIds.map(childId => ({
  childId,
  classId: determineClassForChild(childId)
}));

await fetch('/api/children/bulk-enroll', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'x-tenant-id': 'tenant-id',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ enrollments })
});
```

---

## Field Reference

### Child Model - Enrollment Fields

| Field | Type | Description |
|-------|------|-------------|
| `enrollmentStatus` | Enum | Current enrollment status |
| `enrollmentDate` | Date | Date child was enrolled |
| `withdrawalDate` | Date | Date child was withdrawn |
| `withdrawalReason` | String | Reason for withdrawal |
| `applicationDate` | Date | Date application was submitted |
| `approvalDate` | Date | Date application was approved |
| `approvedBy` | String | User ID who approved application |
| `rejectionReason` | String | Reason for application rejection |
| `waitlistPosition` | Number | Position in waitlist (1-based) |
| `waitlistAddedDate` | Date | Date added to waitlist |

---

## Security & Permissions

All enrollment endpoints require:
- **Authentication:** Valid JWT token
- **Tenant Context:** `x-tenant-id` header
- **Multi-tenant Isolation:** All queries scoped to tenant

### Recommended Role Permissions

| Action | Roles |
|--------|-------|
| Submit Application | PARENT |
| Approve/Reject | DIRECTOR, CENTER_OWNER |
| Enroll to Class | DIRECTOR, CENTER_OWNER, STAFF |
| Add to Waitlist | DIRECTOR, CENTER_OWNER, STAFF |
| Promote from Waitlist | DIRECTOR, CENTER_OWNER |
| Bulk Operations | DIRECTOR, CENTER_OWNER |
| View Statistics | ALL |

---

## Migration Notes

If you have existing children created before this update:

```sql
-- All existing children are automatically set to PENDING status
-- with applicationDate set to createdAt

-- To bulk migrate existing children to ENROLLED:
UPDATE children
SET enrollment_status = 'enrolled',
    enrollment_date = created_at,
    is_active = true
WHERE enrollment_status = 'pending';
```

---

## Summary

**Total New Enrollment Features:**
- ✅ 7 enrollment statuses (was 4)
- ✅ Application approval/rejection workflow
- ✅ Waitlist position tracking with auto-updates
- ✅ Bulk approve and bulk enroll operations
- ✅ Enrollment statistics and analytics
- ✅ 10 new enrollment endpoints (was 2)
- ✅ Complete audit trail (application, approval, enrollment dates)

**Next Phase Enhancements:**
- Email notifications for status changes
- Automated waitlist promotion
- Payment integration with enrollment
- Custom enrollment forms
- Document upload requirements
- Enrollment reports and exports

---

**Documentation Version:** 1.0
**API Version:** 0.2.1
**Last Updated:** December 5, 2025
