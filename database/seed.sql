-- OutreachRoute Pro — Seed Data
-- Seeds: initial admin user + message templates
-- Run AFTER schema.sql

-- ── Default Admin User ────────────────────────────────────────────────────────
-- Password: Admin1234!  (bcrypt hash below)
-- CHANGE THIS PASSWORD IMMEDIATELY after first login.
INSERT INTO users (first_name, last_name, email, password_hash, role, organization_name, is_active)
VALUES (
    'System',
    'Admin',
    'admin@outreachroutepro.com',
    -- bcrypt hash of 'Admin1234!'  — generated with werkzeug.security.generate_password_hash
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/ue1QMKaFiznY8Iq5u',
    'master_admin',
    'OutreachRoute Pro',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- ── Message Templates ─────────────────────────────────────────────────────────
INSERT INTO message_templates (template_name, template_type, subject, body, is_active) VALUES

('Missing Documents', 'both',
 'Action Required: Missing Documents for Your Application',
 'Hi [Applicant First Name], this is [OA Name]. Your application is currently missing the following documents: [Missing Documents]. These items are required before your application can move forward. Please send them as soon as possible or contact me if you need help. Reply STOP to opt out.',
 TRUE),

('Application Status Update', 'both',
 'Update on Your Application Status',
 'Hi [Applicant First Name], your application status is currently: [Application Status]. Your next step is: [Next Step]. Please complete this step so your application can continue moving forward. Reply STOP to opt out.',
 TRUE),

('Virtual Meeting Confirmation', 'both',
 'Your Virtual Appointment is Confirmed',
 'Hi [Applicant First Name], your virtual appointment has been scheduled for [Date] at [Time]. Please join using this link: [Meeting Link]. We will review your application status, missing documents, and next steps. Reply STOP to opt out.',
 TRUE),

('No Response Warning', 'both',
 'Important: Your Application Requires a Response',
 'Hi [Applicant First Name], I have attempted to reach you regarding your application. Your application cannot move forward without communication. Please contact me by [Deadline Date] to avoid your application being closed due to no response. Reply STOP to opt out.',
 TRUE),

('Application Closure', 'both',
 'Your Application Has Been Closed',
 'Hi [Applicant First Name], your application is being closed at this time due to [Closure Reason]. You may reapply in the future when you are ready to move forward and provide the required information.',
 TRUE),

('Interview Reminder', 'both',
 'Reminder: Your Interview is Coming Up',
 'Hi [Applicant First Name], this is a reminder that your interview is scheduled for [Date] at [Time]. Please have your documents ready and be available at that time. Contact me if you need to reschedule. Reply STOP to opt out.',
 TRUE),

('Health Questionnaire Reminder', 'both',
 'Action Required: Health Questionnaire',
 'Hi [Applicant First Name], your health questionnaire is still pending. This is a required step in your application process. Please complete it as soon as possible so your application can move forward. Contact me if you need assistance. Reply STOP to opt out.',
 TRUE),

('Background Check Reminder', 'both',
 'Background Check Status Update',
 'Hi [Applicant First Name], your background check is currently in progress. We will notify you as soon as results are received. Please contact us if you have any questions. Reply STOP to opt out.',
 TRUE),

('Campus Referral Update', 'both',
 'Congratulations! Your Application Has Been Referred',
 'Hi [Applicant First Name], congratulations! Your completed application has been sent to the campus for review. You will be contacted with next steps regarding your acceptance status. We look forward to hearing great news! Reply STOP to opt out.',
 TRUE)

ON CONFLICT DO NOTHING;
