# Sprint Plan — Nkabom Daycare MVP

## Context
The MVP plan defines 7 features that must be completed before the app is usable for real daycare centers. Group 1 (18 features) is already complete. This plan breaks the 7 remaining MVP features into 4 focused sprints, respecting the build order in MVP_PLAN.md because certain features unblock others (SMS → OTP reliability; Push Notifications → Incident Alerts). Estimated total: 3–4 weeks of focused work.

---

## Sprint 1 — Communication Foundation (Days 1–5)
**Goal:** Make the app reliable for staff and parents from day one.

### MVP-1: Wire Up SMS Notifications (Arkesel)
**Scope:** Backend only (`src/services/NotificationService.ts`)

**Tasks:**
1. Verify `ARKESEL_API_KEY` env var is wired in `src/config/environment.ts`
2. Implement `sendSms(to, message)` in `NotificationService` using Arkesel REST API
3. Trigger SMS from `AttendanceController` on check-in and check-out
4. Trigger SMS from `PendingCheckout` flow on OTP generation
5. Add optional per-center toggle: `smsNotificationsEnabled` on Center model
6. Test with a real Ghana number (manually via script or unit test with mock)

**Key files:**
- `src/services/NotificationService.ts`
- `src/controllers/AttendanceController.ts`
- `src/config/environment.ts`

---

### MVP-3: Password Reset Flow
**Scope:** Backend + Frontend

**Backend tasks:**
1. Add `POST /api/auth/forgot-password` — accept phone number, generate OTP, send via Arkesel (depends on MVP-1 SMS being wired first)
2. Add `POST /api/auth/reset-password` — accept OTP + new password, validate OTP expiry, hash and save
3. Store OTP temporarily (add `passwordResetOtp` + `passwordResetExpiry` columns to `User` entity, or use a separate in-memory/Redis cache)
4. Rate-limit both endpoints

**Frontend tasks:**
1. Add "Forgot password?" link on login screen → `(auth)/forgot-password.tsx`
2. Phone entry screen → calls `POST /api/auth/forgot-password`
3. OTP verification screen (reuse existing OTP component)
4. New password screen → calls `POST /api/auth/reset-password`
5. On success: redirect to login

**Key files:**
- `src/controllers/AuthController.ts`
- `src/models/User.ts`
- `nkabom-app/app/(auth)/login.tsx`
- `nkabom-app/app/(auth)/forgot-password.tsx` (new)

**Verification:**
- Reset a test account password via phone number end-to-end
- Confirm OTP expires after 10 minutes
- Confirm invalid OTP returns 400

---

## Sprint 2 — Fast Check-in & Safety (Days 6–9)
**Goal:** Enable QR-based check-in and protect allergic children. Both are frontend-only — can be parallelized.

### MVP-2: QR Code Scanner
**Scope:** Frontend only

**Tasks:**
1. Complete scanner screen at `nkabom-app/app/attendance/qr-scanner.tsx` using `expo-barcode-scanner`
2. On scan success: parse child/guardian ID from QR payload, call `POST /api/attendance/checkin` or `POST /api/attendance/checkout`
3. Handle "unauthorized person" case: show alert modal with reason
4. Integrate OTP checkout modal (already built) when scanning triggers checkout flow
5. Show success/failure feedback (toast or modal)
6. Test on Android and iOS devices

**Key files:**
- `nkabom-app/app/attendance/qr-scanner.tsx`
- `nkabom-app/hooks/` (any attendance hook)

---

### MVP-6: Allergy & Dietary Alert on Meal Logging
**Scope:** Frontend only — 1 day effort

**Tasks:**
1. In the meal logging form screen (find in `nkabom-app/app/activities/`), fetch child allergies from the child object already in state
2. If `child.allergies` or `child.dietaryRestrictions` is non-empty, render a visible red/orange banner above the form: "⚠️ This child has known allergies: [list]"
3. Do not block submission — warn only

**Key files:**
- `nkabom-app/app/activities/` (meal log screen)
- Child type definition in `nkabom-app/types/`

**Verification:**
- Log into staff account, open activity log for a child with allergies → banner must appear
- Open activity log for a child without allergies → no banner

---

## Sprint 3 — Real-time Alerts & Incident Tracking (Days 10–17)
**Goal:** Give parents real-time visibility and give centers legal protection. Push notifications must be done before incidents because incidents trigger them.

### MVP-4: Push Notifications (Expo/Firebase FCM)
**Scope:** Backend + Frontend

**Backend tasks:**
1. Add `pushToken` column to `User` entity
2. Add `POST /api/users/push-token` endpoint — save token for authenticated user
3. Create `PushNotificationService` using Expo Push API (`https://exp.host/--/api/v2/push/send`)
4. Trigger push on: check-in, check-out, incident creation (MVP-5 will call this)
5. Gracefully handle invalid/expired tokens

**Frontend tasks:**
1. On app launch (after login), call `expo-notifications` to request permission
2. Get Expo push token and call `POST /api/users/push-token`
3. Configure `Notifications.setNotificationHandler` for foreground notifications
4. Handle notification tap → navigate to relevant screen (child detail or activity)

**Key files:**
- `src/models/User.ts`
- `src/services/PushNotificationService.ts` (new)
- `src/controllers/UserController.ts` or new `NotificationController`
- `nkabom-app/app/_layout.tsx` (register token on launch)

---

### MVP-5: Incident & Health Reports
**Scope:** Backend + Frontend — depends on MVP-4

**Backend tasks:**
1. Create `IncidentReport` entity: `childId`, `tenantId`, `type` (injury/sickness/other), `description`, `bodyPart`, `actionTaken`, `loggedBy`, `loggedAt`, `parentNotified`
2. Add migration or sync
3. `POST /api/incidents` — log incident, trigger SMS + push to parent immediately
4. `GET /api/incidents?childId=&date=` — list incidents (staff/director)
5. `GET /api/incidents/:id` — incident detail

**Frontend tasks:**
1. "Log Incident" button on child detail screen (`nkabom-app/app/children/[id].tsx`)
2. Incident form: type selector, description field, body part field (injury only), action taken field
3. On submit: call `POST /api/incidents`, show confirmation
4. Incident history list on child profile
5. Parent dashboard: show incidents in child activity feed

**Key files:**
- `src/models/IncidentReport.ts` (new)
- `src/controllers/IncidentController.ts` (new)
- `src/index.ts` (register new routes)
- `nkabom-app/app/children/[id].tsx`
- `nkabom-app/app/parent-*/` (parent view)

**Verification:**
- Log incident for a child → parent receives SMS + push notification
- Parent opens app → incident appears in child feed
- Director can view incident list filtered by date

---

## Sprint 4 — Monetization & Launch Readiness (Days 18–25)
**Goal:** Collect revenue and verify the full product is launch-ready.

### MVP-7: Center Subscription Payment (Paystack)
**Scope:** Backend + Frontend

**Backend tasks:**
1. Complete `POST /api/subscriptions/pay` → initialize Paystack transaction, return checkout URL
2. Add `POST /api/subscriptions/webhook` → verify Paystack signature, on success activate/renew subscription
3. Add trial enforcement middleware: new tenants get 30-day free trial; after expiry, non-payment endpoints return 402
4. Add 7-day grace period before hard block
5. `GET /api/subscriptions/status` → return `{ plan, expiresAt, daysRemaining, isActive, isTrial }`

**Frontend tasks:**
1. Subscription screen (center owner/admin): show current plan, expiry, "Renew / Upgrade" button
2. On tap: open Paystack payment via `expo-web-browser` or WebView
3. On return from payment: call `GET /api/subscriptions/status` to refresh
4. Show expired subscription banner with "Pay Now" if `isActive === false`
5. Block non-admin users from core screens when subscription is expired (show paywall)

**Key files:**
- `src/services/SubscriptionService.ts`
- `src/controllers/SubscriptionController.ts`
- `src/middleware/subscriptionGate.ts` (new — enforcement middleware)
- `nkabom-app/app/settings/subscription.tsx` (new or existing)

**Verification:**
- Initiate Paystack payment in test mode → subscription activates
- Set `expiresAt` to past date → paywall appears
- Webhook fires with test payload → subscription renews

---

### Pre-Launch Checklist Verification (End of Sprint 4)
Work through the full pre-launch checklist from MVP_PLAN.md:

**Backend:**
- [ ] Arkesel SMS tested with real Ghana number
- [ ] Paystack webhook secured (verify signature) and tested
- [ ] Rate limiting on auth endpoints (`/forgot-password`, `/reset-password`, `/login`)
- [ ] `.env.example` updated with all new keys (ARKESEL_API_KEY, FCM keys)
- [ ] DB migrations run cleanly on fresh install

**Frontend:**
- [ ] QR scanner tested on Android + iOS
- [ ] Push notification permission flow tested
- [ ] Subscription expiry screen tested
- [ ] Parent end-to-end: login → view child → see activity → see incident
- [ ] Staff end-to-end: login → check-in child → log activity → checkout
- [ ] Allergy warning visible for allergic child in meal log

**Operations:**
- [ ] Seed one center owner + director + 3 children with guardians for demo
- [ ] Arkesel account funded
- [ ] Paystack live keys configured
- [ ] Subscription plan prices confirmed in `src/config/subscriptionPlans.ts`

---

## Sprint Summary

| Sprint | Days | MVPs | Scope |
|--------|------|------|-------|
| Sprint 1 | 1–5 | MVP-1, MVP-3 | Backend + Frontend: SMS + Password Reset |
| Sprint 2 | 6–9 | MVP-2, MVP-6 | Frontend only: QR Scanner + Allergy Alert |
| Sprint 3 | 10–17 | MVP-4, MVP-5 | Backend + Frontend: Push Notifications + Incidents |
| Sprint 4 | 18–25 | MVP-7 + Launch | Backend + Frontend: Subscriptions + Pre-launch QA |

**Total: ~25 working days (5 weeks), or 3–4 weeks with parallel frontend/backend work**

---

## Critical Dependencies

```
SMS (MVP-1) → Password Reset (MVP-3)  [reset OTP sent via SMS]
SMS (MVP-1) → Incident Alerts (MVP-5) [incident notification via SMS]
Push (MVP-4) → Incident Alerts (MVP-5) [incident notification via push]
Subscription (MVP-7) → Launch         [revenue before go-live]
```
