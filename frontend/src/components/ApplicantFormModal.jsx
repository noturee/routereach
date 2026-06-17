/**
 * ApplicantFormModal — Create or edit an applicant record.
 *
 * Props:
 *   applicant: object|null — null for create mode, object for edit mode
 *   users: array — list of active users (for assigned OA selector, admin only)
 *   isAdmin: bool
 *   onSave(data): function
 *   onClose(): function
 */

import React, { useState, useEffect } from "react";
import Modal from "./Modal.jsx";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

const APPLICATION_STATUSES = [
  "New Application","Contact Attempted","Contact Made","Interview Scheduled",
  "Interview Completed","Application Incomplete","Missing Documents",
  "Health Questionnaire Pending","Background Check Pending",
  "Background Check Cleared","Complete Application","Ready for Campus Review",
  "Sent to Campus","Accepted","Arrival Scheduled","Arrived",
  "Paused / Holding","Reapply Later",
];

const SOURCES = [
  "Word of Mouth","Social Media","School Outreach","Community Event",
  "Job Fair","Partner Organization","Website","Referral","Other",
];

const EDUCATION_OPTIONS = [
  "High School Diploma","GED","Some College","Associate Degree",
  "Bachelor's Degree","No Diploma","Currently Enrolled","Other",
];

const empty = () => ({
  first_name: "", last_name: "", phone: "", email: "",
  age: "", date_of_birth: "", address: "", city: "",
  state: "", county: "", zip_code: "", timezone: "",
  trade_interest: "", education_status: "", application_status: "New Application",
  assigned_oa_id: "", source: "", referral_source: "", date_applied: "",
  next_follow_up_date: "", notes: "",
});

export default function ApplicantFormModal({ applicant, users = [], isAdmin, onSave, onClose }) {
  const editing = !!applicant;
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (applicant) {
      setForm({
        first_name: applicant.first_name || "",
        last_name: applicant.last_name || "",
        phone: applicant.phone || "",
        email: applicant.email || "",
        age: applicant.age ?? "",
        date_of_birth: applicant.date_of_birth || "",
        address: applicant.address || "",
        city: applicant.city || "",
        state: applicant.state || "",
        county: applicant.county || "",
        zip_code: applicant.zip_code || "",
        timezone: applicant.timezone || "",
        trade_interest: applicant.trade_interest || "",
        education_status: applicant.education_status || "",
        application_status: applicant.application_status || "New Application",
        assigned_oa_id: applicant.assigned_oa_id ?? "",
        source: applicant.source || "",
        referral_source: applicant.referral_source || "",
        date_applied: applicant.date_applied || "",
        next_follow_up_date: applicant.next_follow_up_date || "",
        notes: applicant.notes || "",
      });
    }
  }, [applicant]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First name and last name are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.age === "" || payload.age === null) delete payload.age;
      else payload.age = parseInt(payload.age, 10);
      if (!payload.assigned_oa_id) delete payload.assigned_oa_id;
      else payload.assigned_oa_id = parseInt(payload.assigned_oa_id, 10);
      // Empty strings → null
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") payload[k] = null;
      });
      await onSave(payload);
    } catch (err) {
      setError(err.message || "Failed to save applicant.");
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? "Edit Applicant" : "Add Applicant"}
      size="lg"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Personal Info */}
        <div className="form-section-label">Personal Information</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">First Name *</label>
            <input className="form-input" value={form.first_name} onChange={set("first_name")} required />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name *</label>
            <input className="form-input" value={form.last_name} onChange={set("last_name")} required />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={set("phone")} placeholder="(555) 555-5555" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={set("email")} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Age</label>
            <input className="form-input" type="number" min="14" max="99" value={form.age} onChange={set("age")} />
          </div>
          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input className="form-input" type="date" value={form.date_of_birth} onChange={set("date_of_birth")} />
          </div>
          <div className="form-group">
            <label className="form-label">Education Status</label>
            <select className="form-select" value={form.education_status} onChange={set("education_status")}>
              <option value="">Select...</option>
              {EDUCATION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>

        {/* Address */}
        <div className="form-section-label" style={{ marginTop: 16 }}>Address</div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Street Address</label>
            <input className="form-input" value={form.address} onChange={set("address")} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">City</label>
            <input className="form-input" value={form.city} onChange={set("city")} />
          </div>
          <div className="form-group">
            <label className="form-label">County</label>
            <input className="form-input" value={form.county} onChange={set("county")} />
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <select className="form-select" value={form.state} onChange={set("state")}>
              <option value="">Select...</option>
              {US_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">ZIP Code</label>
            <input className="form-input" value={form.zip_code} onChange={set("zip_code")} maxLength={10} />
          </div>
        </div>

        {/* Program Info */}
        <div className="form-section-label" style={{ marginTop: 16 }}>Program & Assignment</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Trade Interest</label>
            <input className="form-input" value={form.trade_interest} onChange={set("trade_interest")} placeholder="e.g. Welding, HVAC" />
          </div>
          <div className="form-group">
            <label className="form-label">Application Status</label>
            <select className="form-select" value={form.application_status} onChange={set("application_status")}>
              {APPLICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Source</label>
            <select className="form-select" value={form.source} onChange={set("source")}>
              <option value="">Select...</option>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Referral Source</label>
            <input className="form-input" value={form.referral_source} onChange={set("referral_source")} />
          </div>
        </div>
        {isAdmin && users.length > 0 && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Assigned OA</label>
              <select className="form-select" value={form.assigned_oa_id} onChange={set("assigned_oa_id")}>
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} — {u.role}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="form-section-label" style={{ marginTop: 16 }}>Timeline</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date Applied</label>
            <input className="form-input" type="date" value={form.date_applied} onChange={set("date_applied")} />
          </div>
          <div className="form-group">
            <label className="form-label">Next Follow-up Date</label>
            <input className="form-input" type="date" value={form.next_follow_up_date} onChange={set("next_follow_up_date")} />
          </div>
        </div>

        {/* Notes */}
        <div className="form-row" style={{ marginTop: 16 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={3} value={form.notes} onChange={set("notes")} />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : editing ? "Save Changes" : "Add Applicant"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
