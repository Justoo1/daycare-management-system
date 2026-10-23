# Arkesel SMS Integration - Setup & Testing Guide

## Overview
The Nkabom Daycare API now integrates with Arkesel SMS API for sending notifications to parents and staff in Ghana.

## Features Implemented
1. OTP verification via SMS
2. Attendance check-in/check-out notifications
3. Daily activity report notifications
4. Payment reminders
5. Emergency broadcasts
6. Test SMS endpoint

## Setup Instructions

### 1. Get Arkesel API Credentials
1. Sign up at [Arkesel](https://sms.arkesel.com)
2. Navigate to API Settings
3. Copy your API Key
4. Register a Sender ID (e.g., "Nkabom")

### 2. Configure Environment Variables
Update your `.env` file with your Arkesel credentials:

```env
# Arkesel SMS Configuration
ARKESEL_API_KEY=your-actual-api-key-here
ARKESEL_SENDER_ID=Nkabom
```

### 3. Install Dependencies
The axios package is required for HTTP requests:

```bash
npm install axios
```

## API Endpoints

### Authentication Required
All notification endpoints require:
- JWT token in `Authorization: Bearer <token>` header
- Tenant ID in `x-tenant-id` header

### Available Endpoints

#### 1. Send Test SMS
**POST** `/api/notifications/test-sms`

Send a test SMS to verify your Arkesel integration.

**Request Body:**
```json
{
  "phoneNumber": "+233244123456",
  "message": "Test message from Nkabom Daycare"
}
```

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Test SMS sent successfully"
}
```

#### 2. Send OTP
**POST** `/api/notifications/send-otp`

Send an OTP code to a phone number.

**Request Body:**
```json
{
  "phoneNumber": "+233244123456",
  "otpCode": "123456"
}
```

#### 3. Send Check-In Notification
**POST** `/api/notifications/check-in`

Notify parent when child checks in.

**Request Body:**
```json
{
  "phoneNumber": "+233244123456",
  "childName": "Kwame Asante",
  "time": "8:30 AM"
}
```

#### 4. Send Check-Out Notification
**POST** `/api/notifications/check-out`

Notify parent when child checks out.

**Request Body:**
```json
{
  "phoneNumber": "+233244123456",
  "childName": "Kwame Asante",
  "time": "4:30 PM"
}
```

#### 5. Send Daily Report Notification
**POST** `/api/notifications/daily-report`

Notify parent that daily report is ready.

**Request Body:**
```json
{
  "phoneNumber": "+233244123456",
  "childName": "Kwame Asante"
}
```

#### 6. Send Payment Reminder
**POST** `/api/notifications/payment-reminder`

Send payment reminder to parent.

**Request Body:**
```json
{
  "phoneNumber": "+233244123456",
  "amount": 500.00,
  "dueDate": "2025-12-15"
}
```

#### 7. Send Emergency Broadcast
**POST** `/api/notifications/emergency-broadcast`

Send emergency message to multiple recipients.

**Request Body:**
```json
{
  "phoneNumbers": ["+233244123456", "+233201987654"],
  "message": "Emergency drill at 2 PM today. All children safe."
}
```

#### 8. Check SMS Balance
**GET** `/api/notifications/balance`

Check your Arkesel SMS credit balance.

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": {
      "sms_balance": "1000",
      "currency": "GHS"
    }
  },
  "message": "SMS balance retrieved successfully"
}
```

## Phone Number Format

The service automatically normalizes Ghana phone numbers to international format:

**Supported Formats:**
- `+233244123456` (already formatted)
- `0244123456` (local format)
- `244123456` (without leading 0)
- `233244123456` (without +)

**Output:** Always `+233244123456`

## Integration with Auth Service

The `AuthService` now automatically sends OTP via SMS when `sendPhoneOTP()` is called:

```typescript
// In your code
await authService.sendPhoneOTP(tenantId, phoneNumber);
// OTP is automatically sent via Arkesel SMS
```

The service includes fallback logging for development if SMS sending fails.

## Testing

### Using Postman

1. **Login and get JWT token:**
```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

2. **Test SMS sending:**
```http
POST http://localhost:3000/api/notifications/test-sms
Authorization: Bearer <your-jwt-token>
x-tenant-id: <your-tenant-id>
Content-Type: application/json

{
  "phoneNumber": "+233244123456",
  "message": "Hello from Nkabom Daycare!"
}
```

### Using cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Send test SMS
curl -X POST http://localhost:3000/api/notifications/test-sms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"+233244123456","message":"Test message"}'
```

## Error Handling

The service includes comprehensive error handling:

1. **Invalid API Key:** Returns error with Arkesel API message
2. **Invalid Phone Number:** Normalizes automatically or returns error
3. **Network Errors:** Catches and logs errors
4. **Rate Limiting:** Arkesel handles rate limiting (check their docs)

## Development Mode

In development, if SMS sending fails (e.g., invalid API key), the OTP is logged to console:

```
⚠️  OTP for +233244123456: 123456 (SMS failed, logging for development)
```

This allows testing without valid Arkesel credentials.

## Production Checklist

Before going to production:

- [ ] Replace `ARKESEL_API_KEY` with real API key
- [ ] Register your Sender ID with Arkesel
- [ ] Test SMS delivery to Ghana phone numbers
- [ ] Set up SMS credit monitoring
- [ ] Configure SMS credit low balance alerts
- [ ] Review Arkesel pricing for your volume
- [ ] Enable delivery reports (if needed)

## Arkesel API Documentation

For more details on Arkesel API features:
- [API Documentation](https://developers.arkesel.com/#tag/SMS-V2)
- [Dashboard](https://sms.arkesel.com)

## Cost Considerations

- Arkesel charges per SMS sent
- Typical cost: ~GHS 0.04 - 0.06 per SMS
- Monitor your SMS balance regularly
- Set up low balance alerts
- Consider SMS templates to reduce character count

## Next Steps

1. Configure your Arkesel account
2. Update `.env` with real credentials
3. Test SMS sending to your phone
4. Integrate with attendance and activity logging
5. Set up automatic notifications for key events

## Support

For issues with:
- **This integration:** Contact your development team
- **Arkesel API:** support@arkesel.com
- **SMS not delivering:** Check Arkesel dashboard logs
