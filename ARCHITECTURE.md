# Nkabom Daycare API - Architecture Documentation

## Overview

This document describes the architecture, design patterns, and technical decisions for the Nkabom Daycare Management API.

## Architecture Principles

### 1. Multi-Tenancy by Default
- Every entity has a `tenantId` field for complete data isolation
- Tenant ID is extracted from request headers and used in all database queries
- Middleware ensures tenant context is available throughout the request lifecycle

### 2. Layered Architecture
```
Request → Middleware → Controller → Service → Repository → Database
           (Validation & Auth)  (Logic)      (Data Access)
```

### 3. Separation of Concerns
- **Controllers**: Handle HTTP requests/responses
- **Services**: Contain business logic
- **Models**: Define database schema
- **Middleware**: Handle cross-cutting concerns (auth, tenancy, validation)

## Database Schema

### Core Entities

#### 1. **Center** (Multi-tenant container)
```typescript
- id: UUID (Primary Key)
- tenantId: UUID (Foreign Key)
- name: String
- registrationNumber: String
- operatingHours: Time Range
- monthlyTuition: Decimal
- staffRatios: JSON (infant, toddler, preschool)
- capacity: Integer
```

**Relationships:**
- 1:N with Users
- 1:N with Children
- 1:N with Classes

#### 2. **User** (Staff & Parent accounts)
```typescript
- id: UUID
- tenantId: UUID
- email: String (Unique per tenant)
- phoneNumber: String (Unique per tenant, Ghana format)
- passwordHash: String (Bcrypt)
- role: Enum (admin, center_owner, director, teacher, parent, staff)
- mfaEnabled: Boolean
- otpCode: String (For verification)
- otpExpiresAt: Timestamp
```

**Indexes:**
- (tenantId, email) - Unique
- (tenantId, phoneNumber) - Unique
- (tenantId) - For tenant queries

#### 3. **Child**
```typescript
- id: UUID
- tenantId: UUID
- centerId: UUID
- firstName, lastName: String
- dateOfBirth: Date
- enrollmentStatus: Enum (enrolled, waitlist, withdrawn, inactive)
- enrollmentDate: Date
- medicalInfo: (bloodType, allergies, conditions)
- dietaryRestrictions: String
- emergencyContacts: JSON
- class: FK to Class
```

**Methods:**
- `getAgeInMonths()`: Calculates current age
- `getAgeGroup()`: Returns 'infant', 'toddler', or 'preschool'

#### 4. **Guardian**
```typescript
- id: UUID
- childId: UUID
- relationship: String
- contactInfo: (email, phone, address, work)
- priority: Integer (1=primary)
- authorizedPickup: Boolean
- notificationPreferences: (SMS, Email, Push)
```

#### 5. **Class**
```typescript
- id: UUID
- centerId: UUID
- name: String
- ageGroup: String
- capacity: Integer
- room: String
- teachers: M:N with User
```

**Methods:**
- `isFull()`: Check capacity
- `getAvailableCapacity()`: Available slots

#### 6. **Attendance**
```typescript
- id: UUID
- childId: UUID
- date: Date
- status: Enum (present, absent, late, early_pickup)
- checkInTime: Time
- checkOutTime: Time
- temperature: Decimal (Health screening)
- lateMinutes: Integer
- earlyMinutes: Integer
```

**Indexes:**
- (tenantId, childId, date) - For daily queries
- (tenantId, classId, date) - For class rosters

#### 7. **ActivityLog**
```typescript
- id: UUID
- childId: UUID
- date: Date
- time: Time
- activityType: String (meal, nap, diaper, learning, play, medication)
- activityData: JSON (specific to type)
- photoUrls: String[] (CDN URLs)
- mood: String
- parentNotified: Boolean
- isVisibleToParents: Boolean
```

#### 8. **Message**
```typescript
- id: UUID
- senderId: UUID
- recipientId: UUID (optional for group messages)
- conversationId: UUID
- messageType: Enum (text, voice, image, file)
- content: String
- translatedContent: String (auto-translated)
- attachmentUrls: String[]
- isRead: Boolean
- reactions: JSON { userId, emoji }[]
- isEmergency: Boolean
```

#### 9. **Invoice**
```typescript
- id: UUID
- childId: UUID
- invoiceNumber: String (Unique)
- invoiceDate: Date
- dueDate: Date
- paidDate: Date (optional)
- amountBreakdown: (tuition, meals, activities, discounts, lateFees)
- totalAmount: Decimal
- amountPaid: Decimal
- status: Enum (pending, partial, paid, overdue)
```

#### 10. **Payment**
```typescript
- id: UUID
- invoiceId: UUID
- referenceNumber: String (Unique)
- amount: Decimal
- paymentMethod: String (mobile_money, bank_transfer, card, cash)
- mobileMoneyProvider: String (mtn, vodafone, airteltigo)
- status: Enum (pending, processing, completed, failed, refunded)
- receiptUrl: String
```

## Multi-Tenancy Implementation

### Request Flow

1. **Header Extraction**
   ```typescript
   const tenantId = request.headers['x-tenant-id'];
   ```

2. **Validation**
   - Verify tenant ID is valid UUID
   - Return 400 if missing or invalid

3. **Context Attachment**
   ```typescript
   request.tenant = {
     tenantId,
     userId,
     role,
     permissions
   };
   ```

4. **Query Filtering**
   ```typescript
   // All queries automatically include tenantId filter
   User.find({ tenantId, ...otherFilters })
   ```

### Data Isolation Guarantees

- **Row-level Security**: Every query filters by `tenantId`
- **No Cross-tenant Joins**: Relationships don't cross tenant boundaries
- **Audit Trail**: All modifications logged per tenant
- **Backup Strategy**: Tenants can be backed up independently

## Authentication & Authorization

### JWT Token Structure

```json
{
  "userId": "uuid",
  "tenantId": "uuid",
  "role": "teacher|parent|admin",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Role-Based Access Control

```typescript
enum UserRole {
  SUPER_ADMIN,      // Full system access
  CENTER_OWNER,     // Own center access
  DIRECTOR,         // Center management
  TEACHER,          // Class & child management
  STAFF,            // Limited operations
  PARENT            // View own children
}
```

### Permission Model

Permissions are derived from roles:
- **Super Admin**: All endpoints
- **Center Owner**: Center management, staff management, billing
- **Director**: Operational tasks, reports
- **Teacher**: Daily activities, attendance
- **Staff**: Limited daily operations
- **Parent**: View own child data

Implementation via middleware:
```typescript
export async function requireRole(roles: UserRole[]) {
  return async (request, reply) => {
    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
  };
}
```

## Service Architecture

### Authentication Service
- User registration and login
- OTP generation and verification
- Password hashing and verification
- MFA support (future)

### Child Service
- CRUD operations for children
- Guardian management
- Enrollment status tracking
- Age-based classification

### Attendance Service
- Check-in/check-out recording
- Attendance analytics
- Staff-to-child ratio monitoring
- Absence tracking

### Activity Log Service
- Daily activity logging
- Photo/media management
- Mood tracking
- Parent notification

### Payment Service (Future)
- Invoice generation
- Payment processing
- Reconciliation
- Report generation

### Messaging Service (Future)
- Real-time messaging via WebSockets
- Message translation
- Read receipts
- Push notifications

## API Response Format

### Success Response

```json
{
  "success": true,
  "data": { /* entity data */ },
  "message": "Operation successful",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ /* array of entities */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Detailed error message",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Data Flow Patterns

### Create Child Flow
```
POST /api/children
  ↓
Controller validates input
  ↓
Service creates child entity
  ↓
Database saves entity
  ↓
Return created child with ID
```

### Check-In Flow
```
POST /api/attendance/check-in
  ↓
Verify child exists
  ↓
Check if already checked in today
  ↓
Create/update attendance record
  ↓
Check if late arrival
  ↓
Notify parent (async)
  ↓
Return attendance record
```

### Daily Report Generation Flow
```
GET /api/activities/daily-report?childId=X&date=2024-01-01
  ↓
Fetch all activities for the date
  ↓
Aggregate by type (meals, naps, activities)
  ↓
Include mood and observations
  ↓
Return structured report
```

## Scalability Considerations

### Database Optimization
- **Indexes**: On frequently queried columns (tenantId, childId, date)
- **Partitioning**: By tenantId for large deployments
- **Query Optimization**: Use SELECT specific columns, not *
- **Connection Pooling**: PostgreSQL connection pool

### Caching Strategy
- **Redis Cache** (Future):
  - User sessions
  - Attendance summaries
  - Child profiles
  - Invalidation on updates

### Load Balancing
- Horizontal scaling via stateless services
- Session storage in Redis (not in-memory)
- Database connection pooling
- CDN for static assets

### Rate Limiting (Future)
- Per-tenant rate limits
- Per-user rate limits
- API key-based throttling

## Ghana-Specific Implementation

### Phone Number Handling
```typescript
// Validation
const ghanaRegex = /^(\+233|0)[1-9]\d{8}$/;

// Normalization
'0123456789' → '+233123456789'
'+233123456789' → '+233123456789'
'233123456789' → '+233123456789'
```

### Currency & Formatting
```typescript
// Default currency: GHS
price = amount.toFixed(2) + ' GHS'

// Example: 150.00 GHS
```

### Payment Integration
```
User selects payment method
  ↓
[Mobile Money] [Bank] [Card] [Cash]
  ↓
Vendor-specific flow
  ↓
Webhook callback
  ↓
Update invoice status
  ↓
Send receipt
```

### Multi-Language Support
```typescript
// Supported: English, Twi, Ga, Ewe
// UI translation via i18n
// Message auto-translation via translation API
```

## Testing Strategy

### Unit Tests
- Service layer logic
- Utility functions
- Validation rules

### Integration Tests
- API endpoints
- Database operations
- Multi-tenant isolation

### E2E Tests
- Complete user flows
- Payment processing
- Reporting

## Deployment Architecture

### Production Stack
```
Load Balancer (nginx)
  ↓
API Servers (Node.js x3)
  ↓
Database (PostgreSQL + Replica)
  ↓
Cache (Redis)
  ↓
File Storage (S3)
```

### Environment Strategy
- **Development**: Local Docker setup
- **Staging**: Mirror production
- **Production**: High availability

### Monitoring & Logging
- Application logs → CloudWatch/ELK
- Database logs → CloudWatch
- Performance metrics → Datadog
- Error tracking → Sentry

## Security Architecture

### Input Validation
- Zod schemas for all inputs
- SQL injection prevention via ORM
- XSS prevention (no direct HTML output)

### Output Sanitization
- No sensitive data in logs
- Password hashes never returned
- OTP codes never logged

### API Security
- HTTPS/TLS required
- CORS configured
- Helmet security headers
- Rate limiting (future)
- API key management (future)

### Database Security
- Connection encryption
- Password hashing (Bcrypt)
- Data encryption at rest (future)
- Regular backups

## Future Enhancements

### Phase 2
- Real-time WebSocket connections for messaging
- File upload and media management
- Advanced analytics and dashboards
- Integration with payment gateways

### Phase 3
- Machine learning for attendance patterns
- Predictive analytics
- Mobile app for teachers
- Video streaming for check-in
- AI-powered developmental insights

## References

- [Fastify Documentation](https://www.fastify.io/)
- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
