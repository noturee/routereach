# Product Requirements — OutreachRoute Pro

## Overview
OutreachRoute Pro is a national web-based platform for outreach, admissions, applicant tracking, territory management, route planning, and performance reporting. It serves Outreach Associates (OAs) who recruit applicants into skilled trade training programs, and the administrators who manage and report on them.

## User Roles
See [user_roles.md](user_roles.md) — six roles from `master_admin` to `oa_user`.

## Core Modules

### 1. Authentication & User Management (Phase 2)
JWT auth, registration, role-based access, user profile management.

### 2. Territory Management (Phase 3)
Assign geographic territories to OA users (national/state/county/city/ZIP levels).

### 3. Applicant Tracking (Phases 4–5)
Full applicant lifecycle from New Application through Arrived status.
24 application statuses, document checklist, status history log.

### 4. Case Notes (Phase 6)
R.A.P. note format (Reason, Action, Plan) + auto-generated status change notes.

### 5. Applicant Upload (Phase 7)
Bulk import from XLSX/CSV. Column mapping. Validation. Error reporting.

### 6. Outreach Locations (Phase 8)
Location database: libraries, workforce offices, community centers, apartment complexes, schools, faith-based organizations, etc.

### 7. Visit Logs (Phase 9)
Track marketing visits to outreach locations: materials left, contacts made, follow-up needed.

### 8. Outreach Map (Phase 10)
Google Maps integration. View applicants and locations on a national map. Color-coded by status.

### 9. Route Planning (Phase 11)
Plan and manage daily outreach routes. Auto-sort stops by proximity. Google Maps directions link.

### 10. Messaging Center (Phase 12)
Send email and SMS to applicants from the platform. Track delivery status.

### 11. Email/SMS Automation (Phase 13)
SendGrid + Twilio integration. Opt-out handling. Message template merge tags.

### 12. Meetings (Phase 14)
Schedule and track virtual meetings with applicants. Google Meet / Zoom / Teams support.

### 13. Performance Metrics (Phase 15)
Auto-computed monthly metrics per OA. Conversion rates, averages, activity counts.

### 14. Reports (Phase 16)
14 reports. PDF, Excel, CSV export.

### 15. Monthly Reports (Phase 17)
Narrative monthly report with 8 sections. Admin review workflow.

### 16. Team Performance (Phase 18)
Admin dashboard comparing all OAs on key metrics.

### 17. Settings & Administration (Phase 19)
User management, territory management, org settings, audit log viewer.

### 18. AWS Deployment (Phase 20)
ECS Fargate, RDS, S3, CloudFront, ALB, Route 53.

## Non-Functional Requirements
- All API endpoints authenticated via JWT
- Passwords hashed (Werkzeug bcrypt)
- All secrets in environment variables
- CORS restricted to configured origins
- Input validated on both frontend and backend
- SMS always includes opt-out footer
- Full audit log for all data mutations
