"""
OutreachRoute Pro — Application Constants

Central location for all status codes, type lists, and lookup values.
Used in models, routes, services, and validators to ensure consistency.
"""

# ── User Roles ─────────────────────────────────────────────────────────────────
USER_ROLES = [
    "master_admin",
    "national_admin",
    "regional_admin",
    "state_admin",
    "local_admin",
    "oa_user",
]

# ── Application Statuses ───────────────────────────────────────────────────────
APPLICATION_STATUSES = [
    "New Application",
    "Contact Attempted",
    "Contact Made",
    "Interview Scheduled",
    "Interview Completed",
    "Application Incomplete",
    "Missing Documents",
    "Health Questionnaire Pending",
    "Background Check Pending",
    "Background Check Cleared",
    "Complete Application",
    "Ready for Campus Review",
    "Sent to Campus",
    "Accepted",
    "Arrival Scheduled",
    "Arrived",
    "Withdrawn by Applicant",
    "Withdrawn by OA / Program",
    "Closed - No Response",
    "Closed - Incomplete",
    "Closed - Not Eligible",
    "Closed - Court / Legal Pending",
    "Paused / Holding",
    "Reapply Later",
]

# ── Withdrawal Reasons ─────────────────────────────────────────────────────────
WITHDRAWAL_REASONS = [
    "No longer interested",
    "Unable to contact",
    "Obtained employment",
    "Started school elsewhere",
    "Moved out of area",
    "Court or legal issue",
    "Incomplete documents",
    "Parent or guardian did not consent",
    "Health or accommodation concern pending",
    "Applicant requested closure",
    "Transportation concern",
    "Housing instability",
    "Technology access issue",
    "Other",
]

# ── Required Documents ─────────────────────────────────────────────────────────
DOCUMENT_CHECKLIST = [
    "Photo ID",
    "Social Security Card",
    "Birth Certificate",
    "Proof of Income",
    "High School Diploma",
    "Transcript",
    "GED Documentation",
    "IEP / 504 Plan",
    "Letter of Disposition",
    "Court Fine / Payment Letter",
    "Guardian Email",
    "Health Questionnaire",
    "Signed Consent Forms",
    "Release of Records",
    "McKinney-Vento Documentation",
    "Other",
]

# ── Outreach Location Types ────────────────────────────────────────────────────
LOCATION_TYPES = [
    "Library",
    "Workforce Office",
    "Community Center",
    "Apartment Complex",
    "School",
    "High School",
    "College",
    "Trade School",
    "Shelter",
    "Food Pantry",
    "Church / Faith-Based Organization",
    "Community Store",
    "Barbershop / Salon",
    "Laundromat",
    "Youth Program",
    "Reentry Program",
    "Housing Organization",
    "Health Clinic",
    "Government Office",
    "Nonprofit Organization",
    "Public Housing Site",
    "Event Location",
    "Employer",
    "Other",
]

# ── Marketing Types ────────────────────────────────────────────────────────────
MARKETING_TYPES = [
    "Flyers",
    "Door Tags",
    "Lawn Signs",
    "Postcards",
    "QR Cards",
    "Business Cards",
    "Table Setup",
    "Presentation",
    "Info Session",
    "Email Follow-Up",
    "Phone Call",
    "Text Follow-Up",
    "Partner Meeting",
    "Referral Packet",
    "Social Media Share",
    "Community Event",
    "Other",
]

# ── Case Note Types ────────────────────────────────────────────────────────────
CASE_NOTE_TYPES = [
    "Initial Contact",
    "Contact Attempt",
    "Interview Completed",
    "Missing Document Request",
    "Document Received",
    "Health Questionnaire Reminder",
    "Background Check Update",
    "Virtual Meeting Scheduled",
    "No Show",
    "Withdrawal",
    "Application Closure",
    "Campus Referral",
    "Arrival Update",
    "General Note",
]

# ── Meeting Types ──────────────────────────────────────────────────────────────
MEETING_TYPES = [
    "Initial interview",
    "Document review",
    "Parent/guardian meeting",
    "Trade discussion",
    "Application completion",
    "Health questionnaire assistance",
    "Campus referral review",
    "Re-engagement appointment",
]

# ── Message Delivery Statuses ──────────────────────────────────────────────────
MESSAGE_DELIVERY_STATUSES = ["pending", "sent", "delivered", "failed"]

# ── Route Statuses ─────────────────────────────────────────────────────────────
ROUTE_STATUSES = ["planned", "in_progress", "completed", "cancelled"]

# ── Location Statuses ──────────────────────────────────────────────────────────
LOCATION_STATUSES = ["active", "inactive", "do_not_visit", "pending_approval"]

# ── Meeting Statuses ───────────────────────────────────────────────────────────
MEETING_STATUSES = ["scheduled", "completed", "no_show", "cancelled", "rescheduled"]

# ── US Regions ─────────────────────────────────────────────────────────────────
US_REGIONS = [
    "Northeast",
    "Southeast",
    "Midwest",
    "Southwest",
    "West",
    "Pacific Northwest",
    "Mountain West",
    "Mid-Atlantic",
    "Great Plains",
    "Great Lakes",
]

# ── US States (abbreviations) ──────────────────────────────────────────────────
US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    "DC", "PR", "VI", "GU", "MP", "AS",
]
