/**
 * StatusUpdateModal — Change an applicant's application status.
 *
 * Props:
 *   applicant: object — current applicant (reads application_status)
 *   onSave(newStatus, reason, notes): function
 *   onClose(): function
 */

import React, { useState } from "react";
import Modal from "./Modal.jsx";

const APPLICATION_STATUSES = [
  "New Application","Contact Attempted","Contact Made","Interview Scheduled",
  "Interview Completed","Application Incomplete","Missing Documents",
  "Health Questionnaire Pending","Background Check Pending",
  "Background Check Cleared","Complete Application","Ready for Campus Review",
  "Sent to Campus","Accepted","Arrival Scheduled","Arrived",
  "Paused / Holding","Reapply Later",
];

export default function StatusUpdateModal({ applicant, onSave, onClose }) {
  const [newStatus, setNewStatus] = useState(applicant.application_status || "");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!newStatus) {
      setError("Please select a new status.");
      return;
    }
    if (newStatus === applicant.application_status) {
      setError("Please choose a different status.");
      return;
    }

    setSaving(true);
    try {
      await onSave(newStatus, reason.trim() || null, notes.trim() || null);
    } catch (err) {
      setError(err.message || "Failed to update status.");
      setSaving(false);
    }
  };

  return (
    <Modal title="Update Application Status" size="md" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Current Status</label>
          <div style={{ padding: "8px 0", fontWeight: 600, color: "var(--color-navy)" }}>
            {applicant.application_status}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">New Status *</label>
          <select
            className="form-select"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            required
          >
            <option value="">Select new status...</option>
            {APPLICATION_STATUSES.filter((s) => s !== applicant.application_status).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Reason / Notes for Change</label>
          <input
            className="form-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Brief reason for status change..."
          />
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Additional Notes</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional additional context..."
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Update Status"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
