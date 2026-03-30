# Nkabom Daycare — MVP Plan

> **Goal:** A fully functional daycare management app that centers can deploy, staff can use daily,
> and parents can trust — with the platform generating revenue from day one through center subscriptions.

---

## What the MVP Must Deliver

For a center to run their daily operations on Nkabom, they need:

1. Enroll children and assign them to classes
2. Track who arrived and who left each day (with safe pickup verification)
3. Log what each child did during the day (meals, naps, activities)
4. Alert parents in real-time when something happens
5. Let parents check on their child from the app
6. Pay for using the platform (so you earn revenue)

Everything else — school fees, video calls, advanced analytics, messaging — can wait.

---

## MVP Feature Checklist

### Group 1 — Already Complete (no work needed)

These are fully working and should be tested end-to-end before launch:

- [x] Multi-tenant architecture & RBAC
- [x] Authentication (login, OTP, JWT)
- [x] Child profiles with medical info, allergies, enrollment workflow
- [x] Guardian/parent account creation
- [x] Manual check-in / check-out
- [x] Health screening on check-in
- [x] Secure OTP checkout verification
- [x] Daily activity logging (meals, naps, diapers, learning, outdoor play, medication)
- [x] Mood tracking
- [x] Developmental milestones
- [x] Progress reports
- [x] Class management
- [x] Staff management (CRUD, roles, permissions)
- [x] Center dashboard summary (numbers)
- [x] Parent dashboard (attendance, activities, milestones, reports)
- [x] QR code generation per child

---

### Group 2 — Must Complete for MVP

These are partially built or not started, and are **required** before the app is usable.

---

#### MVP-1: Wire Up SMS Notifications (Arkesel)
**Status:** Service written, gateway not connected
**Why it's required:** Parents need to know when their child arrives and leaves. Without this, the app has no real-time value for parents. Also required for OTP checkout to work reliably.

**What to build:**
- Connect `NotificationService` to Arkesel API using env key
- Send SMS on: child check-in, child check-out, OTP for pickup
- Send SMS on: any activity log (configurable per center — optional at launch)
- Test with a real Ghana number

**Scope:** Backend only (service layer already exists)

---

#### MVP-2: Complete QR Code Scanner (Frontend)
**Status:** Generation done; scanner UI incomplete
**Why it's required:** Centers want to scan parent QR codes for fast check-in/out. Without the scanner, QR codes are useless and the pickup flow is manual only.

**What to build:**
- Complete the QR scanner screen using `expo-camera` or `expo-barcode-scanner`
- On scan success: call check-in or checkout API
- Handle "unauthorized person" case — show alert
- Integrate with OTP checkout modal (already built)

**Scope:** Frontend only

---

#### MVP-3: Password Reset Flow
**Status:** Not started
**Why it's required:** Staff and parents will forget their password. Without reset, they are locked out permanently, which creates a support burden and makes the app feel unfinished.

**What to build:**
- `POST /api/auth/forgot-password` — accepts phone number, sends OTP via SMS
- `POST /api/auth/reset-password` — accepts OTP + new password
- Frontend: "Forgot password?" link on login screen → phone entry → OTP screen → new password

**Scope:** Backend + Frontend

---

#### MVP-4: Push Notifications (Expo/Firebase FCM)
**Status:** Not started
**Why it's required:** SMS alone is not enough. Parents need in-app push alerts for real-time updates (check-in, activities, pickup). This is the core of the parent experience.

**What to build:**
- Register device push token on login (`expo-notifications`)
- Store push token on user record in the database
- On check-in/out: send push notification to parent
- On incident (when built): send urgent push alert
- Notification permission request on first launch

**Scope:** Backend (store tokens, send via Expo Push API) + Frontend (register tokens, handle notifications)

---

#### MVP-5: Incident & Health Reports
**Status:** Not started
**Why it's required:** A child gets injured or falls sick every week in a daycare. Without a formal incident log, centers have legal exposure and parents have no record. This is a basic operational requirement, not a feature add-on.

**What to build:**

**Backend:**
- New model: `IncidentReport` (child, type: injury/sickness/other, description, body_part, action_taken, logged_by, logged_at, parent_notified)
- `POST /api/incidents` — log new incident
- `GET /api/incidents?childId=&date=` — list incidents
- `GET /api/incidents/:id` — single incident detail
- On create: trigger SMS + push notification to parent immediately

**Frontend:**
- "Log Incident" button on child detail screen
- Incident form (type, description, body part, action taken)
- Incident history list on child profile
- Parent can view incidents from their dashboard

**Scope:** Backend + Frontend (new feature)

---

#### MVP-6: Allergy & Dietary Alert on Meal Logging
**Status:** Not started
**Why it's required:** If a teacher logs a meal containing a food a child is allergic to, the app must warn them. This is a safety requirement. The allergy data is already stored on the child model.

**What to build:**
- When a staff member opens the meal logging form for a child, fetch the child's allergies
- Show a visible banner/warning if the child has any known allergies or dietary restrictions
- This is a frontend-only change (data already exists)

**Scope:** Frontend only (read from existing child.allergies field)

---

#### MVP-7: Center Subscription Payment (Paystack)
**Status:** Service partially built; full checkout flow incomplete
**Why it's required:** This is how you earn revenue. Centers need to pay for app access. Without this, the platform has no monetization.

**What to build:**

**Backend:**
- Complete Paystack checkout initiation: `POST /api/subscriptions/pay` → returns Paystack payment URL
- Paystack webhook: `POST /api/subscriptions/webhook` → on payment success, activate/renew subscription
- Trial period enforcement: new tenants get 30 days free, then blocked until they pay
- Grace period: 7 days after expiry before access is blocked
- `GET /api/subscriptions/status` — current plan, expiry date, days remaining

**Frontend (center owner / admin):**
- Subscription screen showing: current plan, expiry date, "Renew / Upgrade" button
- On tap: open Paystack payment via WebView or in-app browser
- On return: refresh subscription status
- Expired subscription banner with "Pay Now" prompt

**Scope:** Backend + Frontend

---

### Group 3 — Complete After MVP (Next Phase)

These improve the experience but are not blockers for launch:

| Feature | Priority | Reason |
|---|---|---|
| School fees & parent billing | High | Large revenue feature — build in Phase 2 |
| Daily photo upload (end-to-end) | High | Parents love photos; ImageKit already integrated |
| In-app messaging (staff ↔ parent) | Medium | Nice communication channel |
| Attendance chart / trend UI | Medium | Directors want to see patterns |
| Offline mode + sync | Medium | For areas with poor internet |
| Multi-language UI | High | Key differentiator in Ghana market |
| Milestone certificate / shareable card | Medium | Viral feature for parent engagement |
| Waiting list auto-notification | Low | Quality of life |
| Advanced analytics dashboard | Low | Post-growth |
| Biometric login | Low | Premium UX |

---

## MVP Build Order

Build in this sequence to unblock dependencies:

```
1. Arkesel SMS (MVP-1)          ← unblocks OTP checkout reliability
2. Password Reset (MVP-3)       ← unblocks staff/parent self-service
3. QR Scanner (MVP-2)           ← unblocks fast check-in flow
4. Allergy Alert (MVP-6)        ← quick frontend win (1 day)
5. Push Notifications (MVP-4)   ← required before incident alerts
6. Incident Reports (MVP-5)     ← depends on push notifications
7. Center Subscription (MVP-7)  ← last, so centers can pay before go-live
```

---

## Pre-Launch Checklist

Before going live with the first center:

### Backend
- [ ] Arkesel API key configured and SMS sending tested with real Ghana numbers
- [ ] Paystack webhook endpoint secured and tested
- [ ] Rate limiting configured on auth endpoints
- [ ] Environment variables documented in `.env.example`
- [ ] Database migrations run cleanly on fresh install
- [ ] All API endpoints return consistent error formats

### Frontend
- [ ] QR scanner tested on Android and iOS
- [ ] Push notification permission flow tested
- [ ] Subscription expiry screen tested (with a test expired account)
- [ ] Parent login → view child's day → end-to-end flow tested
- [ ] Staff login → check-in child → log activity → checkout → end-to-end flow tested
- [ ] Allergy warning visible when logging a meal for an allergic child

### Operations
- [ ] At least one center owner / director account seeded for testing
- [ ] At least 3 children with guardians set up for demo
- [ ] Arkesel account funded
- [ ] Paystack account verified and live keys configured
- [ ] Subscription plan prices confirmed and set

---

## Subscription Pricing (Suggested)

> Adjust based on your market research.

| Plan | Price (GHS/month) | Centers | Children | Staff |
|---|---|---|---|---|
| Starter | 150 | 1 | Up to 30 | Up to 5 |
| Growth | 350 | 1 | Up to 100 | Up to 15 |
| Professional | 700 | Up to 3 | Unlimited | Unlimited |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited |

All plans: 30-day free trial, no credit card required to start.

---

## MVP Summary

| Group | Count | Effort |
|---|---|---|
| Already complete | 18 features | Test & verify only |
| Must build for MVP | 7 features | 3-4 weeks of focused work |
| Phase 2 (post-launch) | 10+ features | Ongoing |

The 7 MVP features to build, in plain terms:
1. **SMS** — tell parents when their child arrives and leaves
2. **QR Scanner** — fast check-in/out with a phone camera
3. **Password Reset** — so people don't get locked out
4. **Push Notifications** — real-time alerts on parents' phones
5. **Incident Reports** — log injuries and illnesses, notify parents instantly
6. **Allergy Warning** — warn teachers before they log a dangerous meal
7. **Center Subscription Payment** — collect your app fees via Paystack

---

*Last updated: 2026-03-26*
