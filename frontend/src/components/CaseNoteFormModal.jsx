/**
 * CaseNoteFormModal — Create a manual R.A.P. case note for an applicant.
 *
 * Props:
 *   applicantId: number
 *   applicantName: string — displayed in the modal header
 *   onSave(note): function — called with the saved note object
 *   onClose(): function
 */

import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";

const NOTE_TYPES = [
  "General Note",
  "Initial Contact",
  "Contact Attempt",
  "Interview Completed",
  "Missing Document Request",
  "Document Received",
  "Health Questionnaire Reminder",
  "Background Check Update",
  "Virtual Meeting Scheduled",
  "No Show",
  "Campus Referral",
  "Arrival Update",
];

export default function CaseNoteFormModal({ applicantId, applicantName, applicants = [], onSave, onClose }) {
  const [noteType, setNoteType] = useState("General Note");
  const [selectedApplicantId, setSelectedApplicantId] = useState(applicantId || "");
  const [reason,   setReason]   = useState("");
  const [action,   setAction]   = useState("");
  const [plan,     setPlan]     = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    setSelectedApplicantId(applicantId || "");
  }, [applicantId]);

  const selectedApplicant = applicants.find((candidate) => String(candidate.id) === String(selectedApplicantId));
  const currentApplicantName = applicantName
    || selectedApplicant?.full_name_original
    || `${selectedApplicant?.first_name || ""} ${selectedApplicant?.last_name || ""}`.trim()
    || (applicantId ? `Applicant #${applicantId}` : "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!reason.trim() && !action.trim() && !plan.trim()) {
      setError("Please fill in at least one of Reason, Action, or Plan.");
      return;
    }

    if (!applicantId && !selectedApplicantId) {
      setError("Please select an applicant.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        applicant_id: applicantId || Number(selectedApplicantId),
        note_type: noteType,
        reason:    reason.trim()  || null,
        action:    action.trim()  || null,
        plan:      plan.trim()    || null,
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to save case note.");
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`New Case Note${applicantName ? ` — ${applicantName}` : ""}`}
      size="md"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        {applicantId ? (
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Applicant *</label>
            <input className="form-input" value={currentApplicantName} readOnly />
          </div>
        ) : (
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Applicant *</label>
            <select
              className="form-select"
              value={selectedApplicantId}
              onChange={(e) => setSelectedApplicantId(e.target.value)}
            >
              <option value="">Select applicant...</option>
              {applicants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name_original || `${a.first_name || ""} ${a.last_name || ""}`.trim() || `Applicant #${a.id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Note Type</label>
          <select
            className="form-select"
            value={noteType}
            onChange={(e) => setNoteType(e.target.value)}
          >
            {NOTE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div
          className="rap-hint"
          style={{
            background: "var(--color-blue-light)",
            borderRadius: "var(--border-radius-sm)",
            padding: "8px 12px",
            fontSize: "0.8rem",
            color: "#1e40af",
            marginBottom: 16,
          }}
        >
          <strong>R.A.P. Format:</strong> Reason (why contact occurred) → Action (what was done) → Plan (next steps)
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">
            <span className="rap-label">R</span> Reason
            <span className="form-label-hint"> — Why was contact made / what prompted this note?</span>
          </label>
          <textarea
            className="form-textarea"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Applicant called to ask about required documents for enrollment..."
          />
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">
            <span className="rap-label">A</span> Action
            <span className="form-label-hint"> — What action was taken?</span>
          </label>
          <textarea
            className="form-textarea"
            rows={3}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. Explained document checklist. Sent list via email. Updated status to Missing Documents..."
          />
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">
            <span className="rap-label">P</span> Plan
            <span className="form-label-hint"> — What is the plan going forward?</span>
          </label>
          <textarea
            className="form-textarea"
            rows={3}
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="e.g. Follow up in 3 days if documents not received. Schedule interview once complete..."
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Case Note"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
