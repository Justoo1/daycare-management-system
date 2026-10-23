# Payment System Setup Guide

## Overview

The Nkabom Daycare API now includes a complete payment and billing system integrated with **Paystack** for Ghana. This system supports:

- **Invoice Management**: Generate and track invoices for tuition, meals, activities, and other charges
- **Online Payments**: Card payments and Mobile Money (MTN, Vodafone, AirtelTigo)
- **Manual Payments**: Cash, bank transfer, and check tracking
- **Payment Verification**: Automatic verification via Paystack webhooks
- **Refunds**: Full and partial refund support
- **Financial Reporting**: Revenue tracking, outstanding balances, and payment statistics

---

## Paystack Test Mode Setup

### 1. Get Your Test API Keys

1. Visit [Paystack Dashboard](https://dashboard.paystack.com/)
2. Create an account or log in
3. Go to **Settings** → **API Keys & Webhooks**
4. Copy your **Test Public Key** (starts with `pk_test_`)
5. Copy your **Test Secret Key** (starts with `sk_test_`)

### 2. Configure Environment Variables

Update your `.env` file:

```bash
# Payment Gateway - Paystack (Ghana)
PAYSTACK_PUBLIC_KEY=pk_test_your_actual_public_key_here
PAYSTACK_SECRET_KEY=sk_test_your_actual_secret_key_here
```

### 3. Test Cards (Paystack Provided)

Use these test card numbers in **test mode**:

| Card Type | Card Number | CVV | Expiry | PIN | Result |
|-----------|-------------|-----|--------|-----|--------|
| Verve (Success) | 5060666666666666666 | 123 | 01/99 | 1234 | Success |
| Mastercard (Success) | 5531886652142950 | 564 | 09/32 | - | Success |
| Visa (Success) | 4084084084084081 | 408 | 12/30 | - | Success |
| Verve (Insufficient Funds) | 5060666666666666666 | 123 | 01/99 | 0000 | Failed |

### 4. Test Mobile Money Numbers

For Mobile Money testing in test mode:

```
Phone: 0551234567 (any valid Ghana number format)
Provider: mtn | vodafone | airteltigo
```

---

## API Endpoints

### Invoice Management

#### Create Invoice
```http
POST /api/invoices
Authorization: Bearer {token}

{
  "childId": "uuid",
  "month": 1,
  "year": 2026,
  "tuitionAmount": 500.00,
  "mealFeeAmount": 100.00,
  "activityFeeAmount": 50.00,
  "discount": 50.00,
  "notes": "January 2026 fees",
  "dueDate": "2026-01-31T23:59:59Z"
}
```

#### Get All Invoices
```http
GET /api/invoices?page=1&limit=20&status=pending
Authorization: Bearer {token}
```

#### Get Invoice by ID
```http
GET /api/invoices/{invoiceId}
Authorization: Bearer {token}
```

#### Get Child Invoices
```http
GET /api/invoices/child/{childId}
Authorization: Bearer {token}
```

#### Get Overdue Invoices
```http
GET /api/invoices/overdue?centerId={centerId}
Authorization: Bearer {token}
```

#### Get Invoice Statistics
```http
GET /api/invoices/stats?centerId={centerId}
Authorization: Bearer {token}
```

---

### Payment Processing

#### Initiate Online Payment (Card or Mobile Money)
```http
POST /api/payments/initiate
Authorization: Bearer {token}

{
  "invoiceId": "uuid",
  "email": "parent@example.com",
  "amount": 600.00,
  "paymentMethod": "card",  // or "mobile_money"
  "phone": "0551234567",     // required for mobile_money
  "provider": "mtn"          // required for mobile_money: mtn|vodafone|airteltigo
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "payment": { ... },
    "authorization_url": "https://checkout.paystack.com/xyz",
    "access_code": "xyz123",
    "reference": "PAY-1234567890-ABC"
  }
}
```

#### Verify Payment (After Redirect)
```http
GET /api/payments/verify/{reference}
Authorization: Bearer {token}
```

#### Create Manual Payment (Cash, Bank Transfer)
```http
POST /api/payments
Authorization: Bearer {token}

{
  "invoiceId": "uuid",
  "amount": 600.00,
  "paymentMethod": "cash",
  "cashReceivedBy": "John Doe",
  "paidBy": "Jane Parent",
  "paidByPhone": "0551234567",
  "notes": "Cash payment received"
}
```

#### Get Payment Config (for frontend)
```http
GET /api/payments/config
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "publicKey": "pk_test_xxx",
    "isConfigured": true,
    "supportedMethods": ["card", "mobile_money", "bank_transfer", "cash"],
    "mobileMoneyProviders": ["mtn", "vodafone", "airteltigo"]
  }
}
```

#### Get All Payments
```http
GET /api/payments?page=1&limit=20&status=completed
Authorization: Bearer {token}
```

#### Get Payment Statistics
```http
GET /api/payments/stats?centerId={centerId}
Authorization: Bearer {token}
```

#### Refund Payment
```http
POST /api/payments/{paymentId}/refund
Authorization: Bearer {token}

{
  "refundAmount": 600.00,
  "refundReason": "Child withdrawn from school"
}
```

---

## Webhook Setup (for Production)

### 1. Configure Webhook URL in Paystack Dashboard

1. Go to **Settings** → **API Keys & Webhooks**
2. Add webhook URL: `https://your-api-domain.com/api/payments/webhook`
3. Select events: `charge.success`

### 2. Webhook Verification

The webhook handler automatically verifies the Paystack signature using your secret key. No additional configuration needed.

### 3. Test Webhooks Locally

Use **Paystack CLI** to tunnel webhooks to localhost:

```bash
npm install -g @paystack/cli
paystack webhook listen --endpoint /api/payments/webhook
```

Or use **ngrok**:

```bash
ngrok http 3000
# Use the ngrok URL in Paystack dashboard
```

---

## Testing Payment Flow (Step-by-Step)

### Test Scenario 1: Card Payment

1. **Create a child** (if not exists)
   ```bash
   POST /api/children
   ```

2. **Create an invoice** for the child
   ```bash
   POST /api/invoices
   {
     "childId": "child-uuid",
     "month": 1,
     "year": 2026,
     "tuitionAmount": 500
   }
   ```

3. **Initiate payment**
   ```bash
   POST /api/payments/initiate
   {
     "invoiceId": "invoice-uuid",
     "email": "test@example.com",
     "amount": 500,
     "paymentMethod": "card"
   }
   ```

4. **Open the authorization_url** in browser
5. **Use test card**: `4084084084084081`, CVV: `408`, Expiry: `12/30`
6. **Complete payment**
7. **Verify payment** (backend does this automatically via webhook, or call manually):
   ```bash
   GET /api/payments/verify/{reference}
   ```

8. **Check invoice status** (should be "paid"):
   ```bash
   GET /api/invoices/{invoiceId}
   ```

### Test Scenario 2: Mobile Money Payment

1. Create invoice (same as above)
2. **Initiate mobile money payment**:
   ```bash
   POST /api/payments/initiate
   {
     "invoiceId": "invoice-uuid",
     "email": "test@example.com",
     "amount": 500,
     "paymentMethod": "mobile_money",
     "phone": "0551234567",
     "provider": "mtn"
   }
   ```

3. Follow the same flow as card payment

### Test Scenario 3: Cash Payment

1. Create invoice
2. **Record cash payment**:
   ```bash
   POST /api/payments
   {
     "invoiceId": "invoice-uuid",
     "amount": 500,
     "paymentMethod": "cash",
     "cashReceivedBy": "Staff Name",
     "paidBy": "Parent Name"
   }
   ```
3. Payment is immediately marked as "completed"

---

## Payment Statuses

### Invoice Statuses
- `pending`: Invoice created, no payment received
- `partial`: Partial payment received
- `paid`: Fully paid
- `overdue`: Past due date and unpaid
- `cancelled`: Invoice cancelled

### Payment Statuses
- `pending`: Payment initiated but not completed
- `processing`: Payment being processed by gateway
- `completed`: Payment successful
- `failed`: Payment failed
- `refunded`: Payment refunded

---

## Currency

All amounts are in **Ghana Cedis (GHS)**.

Paystack uses **pesewas** (kobo) internally:
- 1 GHS = 100 pesewas
- The API automatically converts amounts

---

## Security Best Practices

1. **Never expose secret keys** in frontend code
2. **Use environment variables** for API keys
3. **Verify webhook signatures** (handled automatically)
4. **Use HTTPS** in production
5. **Validate amounts** on backend before charging
6. **Log all payment activities** for audit trail

---

## Common Issues & Solutions

### Issue: "Payment gateway not configured"
**Solution**: Ensure `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` are set in `.env`

### Issue: "Invalid signature" on webhook
**Solution**: Verify that the webhook secret matches your Paystack account

### Issue: "Payment verification failed"
**Solution**:
- Check that the reference number is correct
- Ensure payment was completed on Paystack's end
- Check Paystack dashboard for transaction status

### Issue: "Cannot refund payment"
**Solution**:
- Only completed payments can be refunded
- Ensure payment was made via Paystack (not cash)
- Check if payment was already refunded

---

## Production Checklist

- [ ] Replace test keys with live keys in `.env`
- [ ] Configure production webhook URL in Paystack dashboard
- [ ] Enable HTTPS for webhook endpoint
- [ ] Set up monitoring for failed payments
- [ ] Configure email notifications for invoices
- [ ] Set up automated late fee calculation
- [ ] Configure receipt generation (PDF)
- [ ] Test refund flow in production
- [ ] Set up backup payment method
- [ ] Configure payment reconciliation reports

---

## Support

- **Paystack Documentation**: https://paystack.com/docs/
- **Paystack Support**: support@paystack.com
- **API Support**: Check the API logs in `console` for detailed error messages

---

## Test Mode Indicators

When using test mode:
- API keys start with `pk_test_` and `sk_test_`
- Transactions are not real
- Use test cards provided by Paystack
- Webhooks can be tested locally
- All data is in a test environment

**Remember**: Switch to live keys only when ready for production!
