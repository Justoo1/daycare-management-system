# Nkabom Daycare — Complete Feature Registry

> This document is the single source of truth for all features in the system.
> Status labels: ✅ Complete | 🔶 Partial | ⏳ Not Started | 🚫 Out of Scope (for now)

---

## Table of Contents

1. [Core Infrastructure](#1-core-infrastructure)
2. [Authentication & User Management](#2-authentication--user-management)
3. [Multi-Tenant & Subscription (SaaS)](#3-multi-tenant--subscription-saas)
4. [Child Management](#4-child-management)
5. [Guardian & Parent Management](#5-guardian--parent-management)
6. [Attendance Tracking](#6-attendance-tracking)
7. [Daily Activity Logging](#7-daily-activity-logging)
8. [Incident & Health Reports](#8-incident--health-reports)
9. [Class Management](#9-class-management)
10. [Staff Management](#10-staff-management)
11. [Educational Portfolio](#11-educational-portfolio)
12. [Parent Dashboard & Experience](#12-parent-dashboard--experience)
13. [Notifications (SMS, Email, Push)](#13-notifications-sms-email-push)
14. [Media & Photo Management](#14-media--photo-management)
15. [Center Subscription & App Payments](#15-center-subscription--app-payments)
16. [School Fees & Parent Billing](#16-school-fees--parent-billing)
17. [Analytics & Reporting](#17-analytics--reporting)
18. [Messaging & Communication](#18-messaging--communication)
19. [Future Enhancements](#19-future-enhancements)

---

## 1. Core Infrastructure

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Multi-tenant architecture | ✅ | ✅ | ✅ Complete | Full row-level isolation per tenant |
| Role-based access control (RBAC) | ✅ | ✅ | ✅ Complete | 6 roles: super_admin, center_owner, director, teacher, staff, parent |
| Granular permissions | ✅ | 🔶 | 🔶 Partial | 35+ permissions on backend; frontend only checks role, not permissions |
| JWT authentication | ✅ | ✅ | ✅ Complete | Tokens with tenant context |
| Input validation (Zod) | ✅ | ✅ | ✅ Complete | All endpoints validated |
| Pagination & search | ✅ | ✅ | ✅ Complete | Consistent across all list endpoints |
| Error handling | ✅ | ✅ | ✅ Complete | Standardized error responses |
| Rate limiting | 🔶 | — | 🔶 Partial | Middleware exists but not configured |
| Structured logging | 🔶 | — | 🔶 Partial | Basic logs only; no log aggregation |

---

## 2. Authentication & User Management

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Email/phone registration | ✅ | ✅ | ✅ Complete | Ghana phone format (+233) supported |
| Email + password login | ✅ | ✅ | ✅ Complete | |
| OTP login (passwordless) | ✅ | ✅ | ✅ Complete | OTP sent via SMS |
| JWT session management | ✅ | ✅ | ✅ Complete | |
| Profile management | ✅ | ✅ | ✅ Complete | |
| Change password | ✅ | ✅ | ✅ Complete | |
| Password reset (via SMS/email) | ⏳ | ⏳ | ⏳ Not Started | Backend logic missing; no reset flow |
| Biometric login (fingerprint/face) | ⏳ | ⏳ | ⏳ Not Started | Expo LocalAuthentication available |
| User invitation flow | 🔶 | 🔶 | 🔶 Partial | Staff/parent creation works; no email invite link |

---

## 3. Multi-Tenant & Subscription (SaaS)

> This covers centers registering on the platform and paying the developer (you) for app access.
> This is separate from school fees parents pay to centers.

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Tenant registration | ✅ | ✅ | ✅ Complete | Org slug + center creation |
| Tenant lookup (by slug/ID) | ✅ | ✅ | ✅ Complete | |
| Subscription plan management | ✅ | 🔶 | 🔶 Partial | Plans defined; frontend screens incomplete |
| Subscription status validation | ✅ | — | ✅ Complete | Middleware blocks expired subscriptions |
| Center pays app fee (Paystack) | 🔶 | 🔶 | 🔶 Partial | PaystackService exists; full billing flow incomplete |
| Trial period handling | 🔶 | ⏳ | 🔶 Partial | Model has trial dates; no enforcement logic |
| Subscription renewal alerts | ⏳ | ⏳ | ⏳ Not Started | Email/SMS reminder before expiry |
| Plan upgrade/downgrade | ⏳ | ⏳ | ⏳ Not Started | |
| Subscription invoice for centers | ⏳ | ⏳ | ⏳ Not Started | Receipt for app fee payment |

---

## 4. Child Management

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Child profiles (CRUD) | ✅ | ✅ | ✅ Complete | Medical info, allergies, dietary restrictions |
| Enrollment workflow | ✅ | ✅ | ✅ Complete | Pending → Approved → Enrolled → Waitlist |
| Bulk enrollment operations | ✅ | 🔶 | 🔶 Partial | Backend supports bulk; frontend is one-at-a-time |
| Class assignment | ✅ | ✅ | ✅ Complete | |
| Class promotion & history | ✅ | 🔶 | 🔶 Partial | Backend tracks history; frontend lacks promotion UI |
| QR code generation (per child) | ✅ | ✅ | ✅ Complete | Unique QR per child for pickup/checkin |
| QR code scanning (check-in/out) | ✅ | 🔶 | 🔶 Partial | Backend handles scan; frontend scanner UI incomplete |
| Child search & filter | ✅ | ✅ | ✅ Complete | |
| Allergy/dietary alert on meal log | ⏳ | ⏳ | ⏳ Not Started | Show warning when logging meal for allergic child |
| Archive/deactivate child | ✅ | 🔶 | 🔶 Partial | Backend supports; no clear UI action |

---

## 5. Guardian & Parent Management

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Create guardian with user account | ✅ | ✅ | ✅ Complete | Auto-creates login credentials |
| Multiple guardians per child | ✅ | ✅ | ✅ Complete | Primary + secondary guardians |
| Link/unlink child to guardian | ✅ | ✅ | ✅ Complete | |
| Resend login credentials | ✅ | 🔶 | 🔶 Partial | Backend endpoint exists; no frontend button |
| Authorized pickup person list | ✅ | 🔶 | 🔶 Partial | Model supports; UI needs improvement |
| Unauthorized pickup alert | ✅ | 🔶 | 🔶 Partial | Component exists; not fully wired |
| Guardian contact management | ✅ | ✅ | ✅ Complete | |

---

## 6. Attendance Tracking

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Manual check-in / check-out | ✅ | ✅ | ✅ Complete | Staff logs arrival/departure |
| QR code check-in (parent scans) | ✅ | 🔶 | 🔶 Partial | Frontend scanner not complete |
| Health screening on check-in | ✅ | ✅ | ✅ Complete | Temperature + health notes |
| Record absence with reason | ✅ | ✅ | ✅ Complete | |
| Secure checkout with OTP | ✅ | ✅ | ✅ Complete | Parent receives OTP to verify pickup |
| Attendance history per child | ✅ | ✅ | ✅ Complete | |
| Daily attendance summary | ✅ | ✅ | ✅ Complete | Class-level and center-level |
| Attendance analytics & patterns | ✅ | 🔶 | 🔶 Partial | Backend has pattern analysis; frontend charts missing |
| Late arrival / early pickup flags | ✅ | 🔶 | 🔶 Partial | Logged but not surfaced clearly in UI |
| Staff attendance tracking | ✅ | 🔶 | 🔶 Partial | Backend complete; frontend screens basic |
| Notify parent on check-in/out | 🔶 | — | 🔶 Partial | Service ready; SMS gateway not connected |

---

## 7. Daily Activity Logging

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Meal logging (breakfast/lunch/snack) | ✅ | ✅ | ✅ Complete | Portion, food type, notes |
| Nap/sleep logging | ✅ | ✅ | ✅ Complete | Start/end time, quality |
| Diaper change logging | ✅ | ✅ | ✅ Complete | |
| Learning activity logging | ✅ | ✅ | ✅ Complete | Activity type, duration, notes |
| Outdoor play logging | ✅ | ✅ | ✅ Complete | |
| Medication administration log | ✅ | ✅ | ✅ Complete | Dosage, time, administered by |
| Mood tracking | ✅ | ✅ | ✅ Complete | Happy, sad, tired, etc. |
| Daily activity report (parent view) | ✅ | 🔶 | 🔶 Partial | Backend generates report; parent-facing UI partial |
| Photo attachment to activity | ✅ | 🔶 | 🔶 Partial | Backend ready; upload flow incomplete |
| Notify parent on new activity log | 🔶 | — | 🔶 Partial | Service ready; gateway not connected |

---

## 8. Incident & Health Reports

> This feature does not exist yet. It is critical for daycare liability and parent trust.

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Log injury/incident | ⏳ | ⏳ | ⏳ Not Started | What happened, body part, treatment given |
| Log sickness report | ⏳ | ⏳ | ⏳ Not Started | Symptoms, action taken |
| Notify parent of incident immediately | ⏳ | ⏳ | ⏳ Not Started | SMS + push alert |
| Director/admin incident review | ⏳ | ⏳ | ⏳ Not Started | Approval/review workflow |
| Incident history per child | ⏳ | ⏳ | ⏳ Not Started | |
| Downloadable incident report PDF | ⏳ | ⏳ | ⏳ Not Started | For parents / authorities |

---

## 9. Class Management

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Create/edit/delete classes | ✅ | ✅ | ✅ Complete | |
| Class capacity tracking | ✅ | ✅ | ✅ Complete | |
| Class roster | ✅ | ✅ | ✅ Complete | |
| Class list with pagination | ✅ | ✅ | ✅ Complete | |
| Staff-to-child ratio live tracker | ⏳ | ⏳ | ⏳ Not Started | Show alert when ratio exceeded |
| Class promotion pipeline | ✅ | 🔶 | 🔶 Partial | Backend complete; no frontend workflow |

---

## 10. Staff Management

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Create staff with user account | ✅ | ✅ | ✅ Complete | |
| Staff profiles (CRUD) | ✅ | ✅ | ✅ Complete | |
| Staff roles & permissions | ✅ | ✅ | ✅ Complete | |
| Assign staff to class | ✅ | 🔶 | 🔶 Partial | Backend supports; UI limited |
| Shift scheduling | ✅ | 🔶 | 🔶 Partial | Backend full; frontend is basic |
| Shift conflict detection | ✅ | — | ✅ Complete | Backend only |
| Staff attendance tracking | ✅ | 🔶 | 🔶 Partial | Check-in/out works; history UI basic |
| Staff certifications tracking | ✅ | 🔶 | 🔶 Partial | Backend complete; frontend ~40% |
| Certification expiry alerts | ✅ | ⏳ | 🔶 Partial | Backend detects expiry; no notification |
| Staff performance analytics | ✅ | ⏳ | 🔶 Partial | Backend metrics; no frontend UI |

---

## 11. Educational Portfolio

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Developmental milestones | ✅ | ✅ | ✅ Complete | Physical, cognitive, social, emotional, language |
| Achieve/mark milestone | ✅ | ✅ | ✅ Complete | |
| Child assessments | ✅ | 🔶 | 🔶 Partial | Backend complete; frontend ~60% |
| Progress reports (quarterly) | ✅ | ✅ | ✅ Complete | Generate and view reports |
| Milestone celebration alert to parent | ⏳ | ⏳ | ⏳ Not Started | "Your child just walked for the first time!" |
| Milestone certificate (PDF/shareable) | ⏳ | ⏳ | ⏳ Not Started | Printable achievement certificate |

---

## 12. Parent Dashboard & Experience

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Parent login & dashboard | ✅ | ✅ | ✅ Complete | |
| View child's daily activities | ✅ | 🔶 | 🔶 Partial | Some screens incomplete |
| View attendance history | ✅ | ✅ | ✅ Complete | |
| View progress reports | ✅ | ✅ | ✅ Complete | |
| View milestones | ✅ | ✅ | ✅ Complete | |
| View daily photo gallery | ✅ | 🔶 | 🔶 Partial | Gallery screen exists; upload flow partial |
| View incident reports | ⏳ | ⏳ | ⏳ Not Started | Requires incident feature to exist first |
| Receive notifications | 🔶 | 🔶 | 🔶 Partial | Service ready; gateways not connected |
| Authorize another pickup person | 🔶 | 🔶 | 🔶 Partial | Backend supports; UI needs work |

---

## 13. Notifications (SMS, Email, Push)

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| SMS via Arkesel | 🔶 | — | 🔶 Partial | Service written; API not connected |
| Email via SendGrid | 🔶 | — | 🔶 Partial | Service written; API key not configured |
| Push notifications (Firebase FCM) | ⏳ | ⏳ | ⏳ Not Started | Expo Push or Firebase needed |
| Notification history | ✅ | 🔶 | 🔶 Partial | Backend tracks; frontend screen basic |
| Check-in/out SMS to parent | 🔶 | — | 🔶 Partial | Trigger exists; SMS not sent |
| Activity logged SMS to parent | 🔶 | — | 🔶 Partial | Trigger exists; SMS not sent |
| Incident alert SMS to parent | ⏳ | — | ⏳ Not Started | Feature not built yet |
| Subscription expiry reminder | ⏳ | — | ⏳ Not Started | |
| Certification expiry reminder to staff | ⏳ | — | ⏳ Not Started | |

---

## 14. Media & Photo Management

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Photo upload (ImageKit/S3) | ✅ | 🔶 | 🔶 Partial | Backend ready; frontend upload validation incomplete |
| Photo gallery per child | ✅ | 🔶 | 🔶 Partial | Screen exists; end-to-end upload not tested |
| Attach photo to activity log | ✅ | 🔶 | 🔶 Partial | Backend ready; UI not complete |
| Photo viewer / lightbox | ✅ | ✅ | ✅ Complete | ImageViewerModal component exists |
| Video upload | ⏳ | ⏳ | ⏳ Not Started | |
| Voice notes | ⏳ | ⏳ | ⏳ Not Started | |

---

## 15. Center Subscription & App Payments

> Centers pay you (the developer) to use the platform. This is the SaaS revenue model.

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Subscription plans definition | ✅ | 🔶 | 🔶 Partial | Plans exist in backend; no plan selector UI |
| Trial period (e.g. 30 days free) | 🔶 | ⏳ | 🔶 Partial | Model has trial dates; no auto-expiry logic |
| Center pays via Paystack (card) | 🔶 | 🔶 | 🔶 Partial | PaystackService exists; full checkout flow not done |
| Subscription auto-renewal | ⏳ | ⏳ | ⏳ Not Started | Webhook from Paystack needed |
| Payment receipt / invoice to center | ⏳ | ⏳ | ⏳ Not Started | |
| Subscription renewal reminder (SMS) | ⏳ | ⏳ | ⏳ Not Started | |
| Grace period after expiry | ⏳ | ⏳ | ⏳ Not Started | e.g. 7-day grace before blocking access |
| Plan upgrade / downgrade | ⏳ | ⏳ | ⏳ Not Started | |

---

## 16. School Fees & Parent Billing

> Deferred — this module will be built after MVP launch.

| Feature | Status | Notes |
|---|---|---|
| Invoice generation for parents | 🚫 Post-MVP | Invoicing model exists but feature is deferred |
| Accept parent payment (cash/bank/mobile money) | 🚫 Post-MVP | |
| Mobile Money integration (MTN/Vodafone/AirtelTigo) | 🚫 Post-MVP | Structure ready |
| Paystack card payment from parents | 🚫 Post-MVP | |
| Payment receipts for parents | 🚫 Post-MVP | |
| Fee balance tracking | 🚫 Post-MVP | |
| Late fee / discount rules | 🚫 Post-MVP | |
| Payment reminders to parents | 🚫 Post-MVP | |

---

## 17. Analytics & Reporting

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Attendance trends (daily/weekly/monthly) | ✅ | 🔶 | 🔶 Partial | Backend ready; no chart UI |
| Enrollment demographics | ✅ | 🔶 | 🔶 Partial | Backend ready; no chart UI |
| Staff performance metrics | ✅ | ⏳ | 🔶 Partial | Backend only |
| Center dashboard summary | ✅ | ✅ | ✅ Complete | Numbers show; no graphs yet |
| Custom report builder | ✅ | 🔶 | 🔶 Partial | Backend supports; UI basic |
| Exportable reports (PDF/CSV) | ⏳ | ⏳ | ⏳ Not Started | |
| Advanced analytics charts | ⏳ | ⏳ | ⏳ Not Started | Post-MVP |

---

## 18. Messaging & Communication

| Feature | Backend | Frontend | Status | Notes |
|---|---|---|---|---|
| Message model / data layer | ✅ | — | ✅ Complete | |
| Staff ↔ Parent direct messaging | ⏳ | ⏳ | ⏳ Not Started | WebSocket integration needed |
| Center-wide announcements | ⏳ | ⏳ | ⏳ Not Started | Broadcast to all parents |
| Read receipts | ⏳ | ⏳ | ⏳ Not Started | |

---

## 19. Future Enhancements

> These are post-MVP ideas that would differentiate the product in the market.

| Feature | Priority | Notes |
|---|---|---|
| Multi-language UI (Twi, Ga, Ewe, English) | High | Large competitive advantage in Ghana |
| Offline mode + background sync | High | Poor connectivity in some areas |
| Video call (parent ↔ teacher) | Medium | High engagement feature |
| AI daily summary for parents | Medium | Auto-generate "Kofi had a great day..." from logs |
| Milestone certificate (shareable image) | Medium | Viral/social sharing potential |
| Parent feedback & ratings | Medium | Center can track service quality |
| Advanced analytics with ML insights | Low | Post-growth feature |
| Parent community feed / noticeboard | Low | Social features |
| Biometric login | Low | Premium UX |
| Waiting list auto-notification | Medium | Notify parent when spot opens |
| Government compliance reports | Medium | Ghana Education Service reporting |

---

*Last updated: 2026-03-26*
