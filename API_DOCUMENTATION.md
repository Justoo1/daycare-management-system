# Nkabom Daycare API Documentation

## Overview
The Nkabom Daycare API is a comprehensive multi-tenant daycare management system designed for Ghana. It provides features for child care tracking, staff management, educational portfolio, analytics, and reporting.

**Version:** 0.3.0

---

## Interactive API Documentation

Once the server is running, you can access the interactive API documentation at:

**Swagger UI:** `http://localhost:3000/documentation`

The interactive documentation allows you to:
- Browse all 172+ API endpoints organized by category
- View detailed request/response schemas
- Test endpoints directly from your browser
- Authenticate with JWT tokens
- See example requests and responses

---

## Authentication

Most endpoints require JWT authentication. To use protected endpoints:

1. **Register or Login** to get a JWT token
2. **Copy the token** from the response
3. In Swagger UI, click the **"Authorize"** button at the top
4. Enter your token in the format: `Bearer {your-token-here}`
5. Click **"Authorize"** to apply the token to all requests

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/send-otp` - Send OTP to phone number
- `POST /api/auth/verify-otp` - Verify OTP code
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/profile` - Update profile (protected)
- `POST /api/auth/change-password` - Change password (protected)

---

## Multi-Tenancy

This API uses multi-tenancy to support multiple organizations. Each request to protected endpoints should include:

**Header:** `x-tenant-id: {your-tenant-id}`

You get your tenant ID when you register your organization.

---

## API Endpoint Categories

### 1. **Authentication** (7 endpoints)
User authentication and authorization

### 2. **Tenants** (3 endpoints)
Multi-tenant organization management

### 3. **Children** (15 endpoints)
Child profile and enrollment management

### 4. **Guardians** (3 endpoints)
Guardian and family management

### 5. **Attendance** (8 endpoints)
Child attendance tracking and check-in/out

### 6. **Activities** (11 endpoints)
Daily activity logging (meals, naps, learning, etc.)

### 7. **Notifications** (8 endpoints)
SMS notifications via Arkesel (Ghana-focused)

### 8. **File Uploads** (7 endpoints)
Photo, document, and media uploads to AWS S3

### 9. **Centers** (8 endpoints)
Daycare center management

### 10. **Classes** (10 endpoints)
Classroom management and capacity tracking

### 11. **Milestones** (8 endpoints)
Child developmental milestone tracking

### 12. **Assessments** (7 endpoints)
Child assessments and evaluations

### 13. **Progress Reports** (8 endpoints)
Educational progress reporting

### 14. **Staff** (12 endpoints)
Staff profile and employment management

### 15. **Certifications** (13 endpoints)
Staff certification and qualification tracking

### 16. **Shifts** (14 endpoints)
Staff shift scheduling and management

### 17. **Staff Attendance** (14 endpoints)
Staff attendance and time tracking

### 18. **Analytics** (7 endpoints)
Advanced analytics and insights
- Attendance trends and patterns
- Enrollment demographics
- Staff performance metrics
- Dashboard summaries

### 19. **Reports** (6 endpoints)
Report generation and management
- Custom report builder
- Attendance reports
- Enrollment reports
- Staff reports

**Total: 172+ API endpoints**

---

## Quick Start

### 1. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### 2. Access Documentation

Open your browser and navigate to:
```
http://localhost:3000/documentation
```

### 3. Test the API

1. Register a tenant organization
2. Register a user account
3. Login to get your JWT token
4. Use the token in the "Authorize" section
5. Start making API calls!

---

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-12-06T10:30:00.000Z"
}
```

---

## Analytics Endpoints

### Attendance Analytics
- `GET /api/analytics/attendance/trends` - Get attendance trends over time
- `GET /api/analytics/attendance/by-class` - Get attendance by class

**Query Parameters:**
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)
- `groupBy` (optional): Group by `day`, `week`, or `month`

### Enrollment Analytics
- `GET /api/analytics/enrollment/trends` - Get enrollment trends
- `GET /api/analytics/enrollment/demographics` - Get age/gender distribution
- `GET /api/analytics/enrollment/retention` - Get retention rate

### Staff Analytics
- `GET /api/analytics/staff` - Get staff performance metrics

### Dashboard
- `GET /api/analytics/dashboard` - Get comprehensive dashboard summary

---

## Report Generation

### Generate Custom Report
`POST /api/reports/generate`

**Request Body:**
```json
{
  "reportType": "attendance",
  "reportName": "Monthly Attendance Report",
  "startDate": "2025-12-01",
  "endDate": "2025-12-31",
  "filters": {
    "centerId": "uuid-here",
    "classId": "uuid-here"
  },
  "format": "json"
}
```

**Report Types:**
- `attendance` - Attendance reports
- `enrollment` - Enrollment reports
- `staff` - Staff reports
- `financial` - Financial reports (coming soon)
- `custom` - Custom reports

**Formats:**
- `json` - JSON format
- `csv` - CSV format (coming soon)
- `pdf` - PDF format (coming soon)
- `excel` - Excel format (coming soon)

---

## Ghana-Specific Features

### SMS Notifications (Arkesel)
The API integrates with Arkesel for SMS notifications, supporting Ghanaian phone numbers.

**Endpoints:**
- `POST /api/notifications/send-otp` - Send OTP
- `POST /api/notifications/check-in` - Check-in notification
- `POST /api/notifications/check-out` - Check-out notification
- `POST /api/notifications/daily-report` - Daily report notification
- `POST /api/notifications/payment-reminder` - Payment reminder
- `POST /api/notifications/emergency-broadcast` - Emergency broadcast

---

## Environment Configuration

Required environment variables:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-password
DATABASE_NAME=nkabom_daycare

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name

# Arkesel SMS
ARKESEL_API_KEY=your-api-key
ARKESEL_SENDER_ID=YourName

# Server
PORT=3000
NODE_ENV=development
```

---

## Rate Limits

Currently, there are no rate limits implemented. This will be added in a future version.

---

## Support

For issues or questions:
- GitHub: [nkabom-daycare-api](https://github.com/nkabom/nkabom-daycare-api)
- Email: support@nkabom.com

---

## License

MIT License

---

**Happy Coding!** 🚀
