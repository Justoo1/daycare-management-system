# Nkabom Daycare API - Complete Reference

## Base URL
```
http://localhost:3000
or
https://api.nkabom.app (production)
```

## Required Headers

```
x-tenant-id: <UUID>
Authorization: Bearer <JWT_TOKEN>  (for protected endpoints)
Content-Type: application/json
```

## Authentication Endpoints

### Register User
```
POST /api/auth/register

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000

Body:
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+233123456789",
  "password": "SecurePass123!",
  "role": "parent"
}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phoneNumber": "+233123456789",
      "role": "parent",
      "isActive": true,
      "emailVerified": false,
      "phoneVerified": false
    }
  },
  "message": "User registered successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Login
```
POST /api/auth/login

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000

Body:
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

or

{
  "phoneNumber": "+233123456789",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Send OTP
```
POST /api/auth/send-otp

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000

Body:
{
  "phoneNumber": "+233123456789"
}

Response:
{
  "success": true,
  "data": {},
  "message": "OTP sent to your phone",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Verify OTP
```
POST /api/auth/verify-otp

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000

Body:
{
  "phoneNumber": "+233123456789",
  "otp": "123456"
}

Response:
{
  "success": true,
  "data": {},
  "message": "Phone verified successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Get Current User
```
GET /api/auth/me

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "user": { /* current user object */ }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Update Profile
```
PUT /api/auth/profile

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Body:
{
  "firstName": "Jane",
  "profilePhotoUrl": "https://..."
}

Response:
{
  "success": true,
  "data": {
    "user": { /* updated user */ }
  },
  "message": "Profile updated successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Change Password
```
POST /api/auth/change-password

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Body:
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!",
  "confirmPassword": "NewPass456!"
}

Response:
{
  "success": true,
  "data": {},
  "message": "Password changed successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Child Management Endpoints

### Create Child
```
POST /api/children

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Body:
{
  "firstName": "Emma",
  "lastName": "Smith",
  "dateOfBirth": "2021-06-15",
  "gender": "female",
  "bloodType": "O+",
  "allergies": "Peanuts",
  "medicalConditions": "None",
  "dietaryRestrictions": "None",
  "emergencyContactName": "Mary Smith",
  "emergencyContactPhone": "+233987654321",
  "emergencyContactRelationship": "Mother",
  "specialNeeds": "None"
}

Response:
{
  "success": true,
  "data": {
    "child": {
      "id": "uuid",
      "firstName": "Emma",
      "lastName": "Smith",
      "dateOfBirth": "2021-06-15",
      "enrollmentStatus": "enrolled",
      "enrollmentDate": "2024-01-01",
      "isActive": true
    }
  },
  "message": "Child created successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Get Child
```
GET /api/children/:id

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "child": { /* full child object */ }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### List Children (Paginated)
```
GET /api/children?page=1&limit=20

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    { /* child 1 */ },
    { /* child 2 */ }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Update Child
```
PUT /api/children/:id

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Body:
{
  "allergies": "Peanuts, Shellfish"
}

Response:
{
  "success": true,
  "data": {
    "child": { /* updated child */ }
  },
  "message": "Child updated successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Add Guardian
```
POST /api/children/:childId/guardians

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Body:
{
  "firstName": "Mary",
  "lastName": "Smith",
  "email": "mary@example.com",
  "phoneNumber": "+233123456789",
  "relationship": "Mother",
  "isPrimaryGuardian": true,
  "canReceiveSMS": true,
  "canReceiveEmail": true
}

Response:
{
  "success": true,
  "data": {
    "guardian": { /* guardian object */ }
  },
  "message": "Guardian added successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Get Guardians
```
GET /api/children/:childId/guardians

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "guardians": [
      { /* guardian 1 */ },
      { /* guardian 2 */ }
    ]
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Enroll Child to Class
```
POST /api/children/:childId/enroll

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Body:
{
  "classId": "uuid"
}

Response:
{
  "success": true,
  "data": {
    "child": { /* updated child with class */ }
  },
  "message": "Child enrolled successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Withdraw Child
```
POST /api/children/:childId/withdraw

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Body:
{
  "reason": "Relocating to another city"
}

Response:
{
  "success": true,
  "data": {
    "child": { /* updated child */ }
  },
  "message": "Child withdrawn successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Attendance Endpoints

### Check In
```
POST /api/attendance/check-in

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Body:
{
  "childId": "uuid",
  "classId": "uuid",
  "checkInTime": "08:15",
  "temperature": 36.5,
  "healthNotes": "Looks healthy"
}

Response:
{
  "success": true,
  "data": {
    "attendance": {
      "id": "uuid",
      "childId": "uuid",
      "date": "2024-01-01",
      "status": "present",
      "checkInTime": "08:15",
      "isLateArrival": true,
      "lateMinutes": 15
    }
  },
  "message": "Child checked in successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Check Out
```
POST /api/attendance/check-out

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Body:
{
  "childId": "uuid",
  "checkOutTime": "14:30",
  "checkedOutByName": "Mary Smith",
  "checkedOutByRelationship": "Mother"
}

Response:
{
  "success": true,
  "data": {
    "attendance": { /* attendance with checkout info */ }
  },
  "message": "Child checked out successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Record Absence
```
POST /api/attendance/absence

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Body:
{
  "childId": "uuid",
  "date": "2024-01-01",
  "reason": "Sick",
  "notifyParent": true
}

Response:
{
  "success": true,
  "data": {
    "attendance": {
      "id": "uuid",
      "status": "absent",
      "date": "2024-01-01",
      "absenceReason": "Sick",
      "parentNotified": true
    }
  },
  "message": "Absence recorded successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Get Attendance by Date
```
GET /api/attendance/children/:childId?date=2024-01-01

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "attendance": { /* attendance record */ }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Get Attendance History
```
GET /api/attendance/children/:childId/history?page=1&limit=20&startDate=2024-01-01&endDate=2024-01-31

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    { /* attendance 1 */ },
    { /* attendance 2 */ }
  ],
  "pagination": { /* pagination info */ },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Get Daily Summary
```
GET /api/attendance/summary?date=2024-01-01

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "summary": {
      "total": 25,
      "present": 23,
      "absent": 1,
      "late": 1,
      "earlyPickup": 0
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Get Attendance Pattern
```
GET /api/attendance/children/:childId/pattern?days=30

Headers:
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "pattern": {
      "presentDays": 28,
      "absentDays": 2,
      "attendancePercentage": 93.33,
      "lastCheckIn": "2024-01-01T08:15:00.000Z",
      "lastCheckOut": "2024-01-01T14:30:00.000Z"
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Error Responses

### Bad Request (400)
```json
{
  "success": false,
  "error": "Missing required fields",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "error": "Unauthorized - Invalid or expired token",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": "Child not found",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "Internal server error",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Auth required |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource doesn't exist |
| 422 | Validation Error - Invalid data |
| 500 | Server Error - Internal error |

## Rate Limiting

Not currently implemented. Will be added in future versions.

## Pagination

All list endpoints support pagination:

```
GET /api/children?page=1&limit=20

Query Parameters:
- page: Page number (default: 1)
- limit: Items per page (default: 20, max: 100)
```

Response includes:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Field Validation

### Phone Number
- Format: `+233XXXXXXXXX` or `0XXXXXXXXX`
- Ghana numbers only (starts with 233 or 0)

### Email
- Standard email format (RFC 5322)

### Password
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*)

### UUID
- Standard UUID v4 format

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@test.com",
    "phoneNumber": "+233123456789",
    "password": "SecurePass123!",
    "role": "parent"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "email": "john@test.com",
    "password": "SecurePass123!"
  }'
```

### Authenticated Request
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## Additional Resources

- [README.md](./README.md) - Project overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture
- [SETUP.md](./SETUP.md) - Installation and deployment guide
