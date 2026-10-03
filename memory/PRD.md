# HR-Go — Crew Transportation & Shuttle Service (Internal Ops Platform)

**Company:** PT Harmoni Rute Indonesia · **Brand:** HR-Go · **Tagline:** "The Better Way to Go"
**Design:** Premium corporate aviation — Navy #061B3A, White, Cool Gray, Steel Gray · Montserrat + Inter.

## Original Problem Statement
Internal operational app with exactly THREE roles (OWNER, ADMIN, DRIVER), no customer login.
Backend-enforced role-based permissions, owner dashboards, user management, admin-work override
with audit trail, driver customer-contact + WhatsApp pre-filled messages, WhatsApp invoice sending
(daily + monthly) with editable DB-stored templates.

## Architecture
- **Backend:** FastAPI + MongoDB (motor), JWT auth (pyjwt + passlib/bcrypt). UUID string ids, `_id` excluded.
  Server-side role guard `require(*roles)` → 403. Owner seeded idempotently from `backend/.env`.
  Collections: users, customers, vehicles, routes, trips, invoices, whatsapp_templates, settings, audit_logs.
- **Frontend:** Expo Router groups `(owner)/(admin)/(driver)` with a custom phosphor-icon tab bar.
  TanStack Query for data, SecureStore token, theme tokens in `src/theme.ts`.

## Roles & Routing
- OWNER → `(owner)/dashboard` — full access + user management + settings + audit.
- ADMIN → `(admin)/dashboard` — operations, trips, invoices, limited audit.
- DRIVER → `(driver)/trips` — own assigned trips only, contact + status workflow.

## Implemented (2026-10-03)
- Auth: login by username/email/phone, JWT, change-password, 403 enforcement, last-owner protection.
- Owner dashboard (Business/Operations/Customers/Financial metrics + quick actions + manage grid).
- Admin dashboard. Driver home/history/profile.
- User Management: list + role/status filters; create/edit Admin & Driver; reset password; activate/deactivate/suspend.
- Trips: create/edit, assign driver+vehicle, status workflow, cancel, owner-override audit (old→new + reason), timeline.
- Driver trip detail: customer contact card, CALL + WhatsApp (time-based pagi/siang/malam + driver + vehicle, 5 templates), NAVIGATE, accept/decline, status flow, contact logging.
- Customers / Vehicles / Routes management. Reports.
- Invoices: daily (select trips) + monthly (period consolidation), detail, payment status, discount edit (FINANCIAL audit), WhatsApp deep-link send + send-history, PDF (reportlab, `?token=`).
- WhatsApp templates: DB-stored, versioned, editable with live preview + reset-to-default; admin-edit gated by settings.
- Audit logs: OWNER full; ADMIN restricted (no SECURITY/USER/sensitive). System Settings / company profile (owner-editable).
- Seeded demo data: owner (mhafidhal), admin (andi), 3 drivers, 3 customers, 4 vehicles, 5 trips, invoice template, settings.

## Test Status
Testing agent iteration_1: 58/60 backend pass; 2 minor PATCH partial-update bugs (vehicles/routes) FIXED & verified.
Frontend flows verified on mobile viewport (login, owner dashboard, driver trip + WhatsApp sheet).

## Backlog / Next
- P1: Profile photo upload (Emergent object storage) for Admin/Driver.
- P1: Real-time GPS/location sharing & request (currently contact-log + navigate only).
- P2: Additional approved WhatsApp templates management UI (multi-template CRUD).
- P2: WhatsApp Business API phase-2 (automated send + PDF attach).
- P2: Split server.py into domain modules.
