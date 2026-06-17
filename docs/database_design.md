# Database Design

## 15 Core Tables

| Table | Purpose |
|---|---|
| `users` | All platform users with roles and geographic scope |
| `territories` | Geographic areas (state/county/city/ZIP) |
| `user_territories` | Join table linking users to territories |
| `applicants` | Core applicant records with full address + status |
| `applicant_documents` | Document checklist per applicant |
| `application_status_history` | Immutable log of every status change |
| `case_notes` | R.A.P. notes (manual + auto-generated) |
| `outreach_locations` | Libraries, community centers, apartment complexes, etc. |
| `visit_logs` | Records of outreach visits to locations |
| `routes` | Planned outreach routes |
| `route_stops` | Individual stops on a route (ordered) |
| `messages` | Email/SMS message history |
| `message_templates` | Reusable message templates with merge tags |
| `meetings` | Virtual meetings with applicants |
| `performance_metrics` | Monthly metrics per OA user |
| `monthly_reports` | Narrative monthly reports |
| `audit_logs` | Immutable action log for all significant events |

## Key Relationships

- `users` → `applicants` (one OA has many assigned applicants)
- `applicants` → `applicant_documents` (one applicant has many docs)
- `applicants` → `application_status_history` (full status timeline)
- `applicants` → `case_notes` (full activity log)
- `outreach_locations` → `visit_logs` (visit history per location)
- `routes` → `route_stops` → `outreach_locations` (stops on a route)
- `users` → `user_territories` → `territories` (geographic scope)

## Geographic Fields

Every major record supports:
`country`, `region`, `state`, `county`, `city`, `zip_code`, `latitude`, `longitude`, `timezone`

This enables national filtering, map display, and territory-scoped reporting.
