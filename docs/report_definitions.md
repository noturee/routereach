# Report Definitions

All reports are accessible under `/reports` (admin) or filtered by territory for OA users.

## 1. Applicant Summary Report
Who: All roles | Filter: Date range, state, county, OA
Columns: Name, Status, Assigned OA, Trade, Date Applied, Last Contact, Next Follow-Up, Days in Status

## 2. Missing Documents Report
Who: All roles
Columns: Applicant Name, Missing Documents, Status, Assigned OA, Days Pending

## 3. Withdrawn Applicants Report
Columns: Name, Withdrawal Reason, Date, Trade, OA

## 4. Application Conversion Rate Report
Shows funnel: New → Contacted → Interviewed → Complete → Referred → Arrived
Average days at each stage

## 5. OA Activity Report (Admin Only)
Per OA: Contacts, Interviews, Complete Apps, Arrivals, Visits, Routes, Messages

## 6. Outreach Locations Summary
Columns: Location Name, Type, City, State, Last Visit, Next Follow-Up, OA

## 7. Partner Visit Activity Report
Filters: Location type, state, date range

## 8. Monthly Route Performance Report
Per user: Routes completed, stops per route, avg completion rate

## 9. Communication Log Report
All messages sent; filter by type (email/SMS), date, status

## 10. Meetings & Appointments Report
Scheduled vs completed vs no-shows; by user and month

## 11. Status Trend Report
Monthly counts by application status over a configurable time window

## 12. Trade Interest Distribution
Count of applicants per trade, by state/region

## 13. Performance Comparison Report (Admin Only)
Side-by-side metrics for multiple OA users

## 14. Geographical Heatmap Data
Applicant density by ZIP, city, county — used by map view

---

All reports support:
- **PDF export** (via ReportLab on the backend)
- **Excel export** (via openpyxl)
- **CSV export** (via pandas)
