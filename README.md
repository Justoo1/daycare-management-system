# Nkabom Daycare Management API

A comprehensive, multi-tenant Node.js API for managing daycare centers in Ghana. Built with Fastify, TypeScript, and PostgreSQL.

## Features

- **Multi-Tenant Architecture**: Fully isolated data per daycare center
- **User Authentication**: Email/Phone login with JWT, OTP, and MFA support
- **Child Management**: Complete child profiles with medical information and guardians
- **Attendance Tracking**: QR code/NFC check-in, attendance analytics, staff ratios
- **Activity Logging**: Daily activities, meal tracking, nap tracking, developmental milestones
- **Communication**: Real-time messaging, announcements, SMS/Email notifications
- **Billing & Payments**: Invoice generation, mobile money integration (MTN, Vodafone, AirtelTigo)
- **Educational Portfolio**: Developmental assessments and learning activities
- **Staff Management**: Staff profiles, scheduling, performance tracking
- **Analytics & Reporting**: Comprehensive dashboards and reports
- **Ghana-Specific**: Phone number validation, GHS currency, local payment methods, multi-language support

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify 4
- **Language**: TypeScript 5
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: JWT, Bcrypt
- **Validation**: Zod
- **Real-time**: WebSockets (Socket.io)
- **File Storage**: AWS S3 / Cloudinary (configurable)
- **Payments**: Paystack, Stripe, Mobile Money APIs

## Project Structure

```
src/
├── config/              # Configuration files
│   ├── database.ts      # Database connection setup
│   └── environment.ts   # Environment variables
├── controllers/         # Route handlers
│   ├── AuthController.ts
│   ├── ChildController.ts
│   └── ...
├── services/           # Business logic
│   ├── AuthService.ts
│   ├── ChildService.ts
│   ├── AttendanceService.ts
│   └── ...
├── models/            # TypeORM entities
│   ├── User.ts
│   ├── Child.ts
│   ├── Center.ts
│   ├── Attendance.ts
│   └── ...
├── middleware/        # Custom middleware
│   └── tenant.ts      # Multi-tenant isolation
├── utils/            # Helper functions
│   ├── jwt.ts        # JWT utilities
│   ├── validation.ts # Input validation
│   └── response.ts   # Standard responses
├── types/            # TypeScript interfaces
│   └── index.ts
└── index.ts          # Application entry point
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 12 or higher
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd nkabom-daycare-api
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and configure:
- Database credentials
- JWT secret
- Payment gateway keys
- SMS/Email service credentials

4. **Initialize database**
```bash
npm run build
npm start
```

The database tables will be created automatically on first run.

### Development

Start development server with hot reload:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

Output will be in the `dist/` directory.

### Production

```bash
npm run start
```

## API Endpoints

### Authentication

```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login with email/phone
POST   /api/auth/send-otp          # Send OTP for verification
POST   /api/auth/verify-otp        # Verify OTP code
GET    /api/auth/me                # Get current user profile (protected)
PUT    /api/auth/profile           # Update profile (protected)
POST   /api/auth/change-password   # Change password (protected)
```

### Child Management

```
POST   /api/children                          # Create child
GET    /api/children                          # List children (with pagination)
GET    /api/children/:id                      # Get child details
PUT    /api/children/:id                      # Update child
GET    /api/children/search?q=name            # Search children
POST   /api/children/:childId/guardians       # Add guardian
GET    /api/children/:childId/guardians       # List guardians
PUT    /api/guardians/:id                     # Update guardian
POST   /api/children/:childId/enroll          # Enroll to class
POST   /api/children/:childId/withdraw        # Withdraw from center
```

### Attendance Tracking

```
POST   /api/attendance/check-in                           # Check in child
POST   /api/attendance/check-out                          # Check out child
POST   /api/attendance/absence                            # Record absence
GET    /api/attendance/children/:childId?date=2024-01-01 # Get attendance by date
GET    /api/attendance/children/:childId/history          # Attendance history
GET    /api/attendance/children/:childId/pattern?days=30  # Attendance pattern analysis
GET    /api/attendance/summary?date=2024-01-01            # Daily summary
GET    /api/attendance/classes/:classId?date=2024-01-01   # Class attendance
```

### Health & Utility

```
GET    /health         # Health check
GET    /api/version    # API version info
```

## Multi-Tenancy

The API uses header-based tenant identification. Include the following header in all requests:

```
x-tenant-id: <tenant-uuid>
```

Example:
```bash
curl -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
     -H "Authorization: Bearer <jwt-token>" \
     https://api.nkabom.app/api/children
```

## Authentication

### Login Flow

1. User logs in with email/phone and password
2. Server returns JWT token valid for 24 hours
3. Include token in Authorization header: `Authorization: Bearer <token>`

### Protected Routes

Add `{ preHandler: fastify.authenticate }` to route handlers that require authentication.

### OTP Verification

1. Call `/api/auth/send-otp` with phone number
2. User receives OTP via SMS
3. Call `/api/auth/verify-otp` with OTP code
4. Phone number is marked as verified

## Ghana-Specific Features

### Phone Number Format
Ghana phone numbers must follow the format: `+233XXXXXXXXX` or `0XXXXXXXXX`

The API automatically validates and normalizes phone numbers.

### Currency
Default currency is GHS (Ghana Cedis). Configure in `.env`:
```
DEFAULT_CURRENCY=GHS
```

### Payment Methods
Supported payment gateways:
- **Mobile Money**: MTN, Vodafone, AirtelTigo
- **Cards**: Paystack, Stripe
- **Bank Transfer**: Manual tracking
- **Cash**: Point of sale recording

### Holidays & Compliance
- Ghana Education Service reporting compliance
- Local holidays calendar support
- Staff-to-child ratio compliance (Ghana standards)

## Deployment

### Docker

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

Build and run:
```bash
docker build -t nkabom-api .
docker run -p 3000:3000 --env-file .env nkabom-api
```

### Environment Variables

```
PORT=3000
NODE_ENV=production

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<secure-password>
DB_NAME=nkabom_daycare

JWT_SECRET=<very-secure-random-string>
JWT_EXPIRY=24h

TENANT_HEADER=x-tenant-id

# AWS S3
S3_BUCKET=nkabom-files
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>

# Twilio (SMS)
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid (Email)
SENDGRID_API_KEY=<key>
SENDGRID_FROM_EMAIL=noreply@nkabom.app

# Paystack (Payments)
PAYSTACK_PUBLIC_KEY=<key>
PAYSTACK_SECRET_KEY=<key>

# Mobile Money
MTN_API_KEY=<key>
MTN_API_USER=<user>
```

## Error Handling

The API returns standardized error responses:

```json
{
  "success": false,
  "error": "Error description",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

Common status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

## Rate Limiting

Rate limiting can be enabled using `@fastify/rate-limit` plugin (not yet implemented).

## Security

### Best Practices

- Always use HTTPS in production
- Rotate JWT secrets regularly
- Use strong database passwords
- Enable CORS only for trusted origins
- Validate all user inputs
- Use helmet for security headers
- Keep dependencies updated

### Data Protection

- Passwords hashed with Bcrypt
- End-to-end encryption for sensitive messages (future)
- Data encrypted at rest (configure in database)
- SSL/TLS in transit
- GDPR-compliant data retention

## Testing

Tests not yet implemented. To add:

```bash
npm install --save-dev jest @types/jest ts-jest
```

Run tests:
```bash
npm test
```

## Monitoring

### Logging

Configure logging level in environment:
```
NODE_ENV=development  # Enables request logging
```

### Health Check

```bash
curl http://localhost:3000/health
```

## Contributing

1. Follow TypeScript and code style guidelines
2. Create feature branches from `main`
3. Write descriptive commit messages
4. Ensure all tests pass before pushing
5. Create pull requests with detailed descriptions

## License

MIT

## Support

For support, email support@nkabom.app or create an issue in the repository.

## Roadmap

### Phase 1 (Current)
- ✅ User authentication and multi-tenancy
- ✅ Child management and enrollment
- ✅ Attendance tracking
- 🚧 Daily activity logging
- 🚧 Messaging and announcements

### Phase 2
- Educational portfolio
- Staff management
- Billing and payments
- Analytics and reporting
- Mobile app (parents)

### Phase 3
- Offline capabilities
- Video calls
- Advanced analytics
- AI-powered insights
- Teacher mobile app

## Changelog

### 0.1.0 (Current)
- Initial API setup with multi-tenant architecture
- Authentication system with JWT and OTP
- Child management module
- Attendance tracking module
- Core data models
