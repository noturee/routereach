/**
 * WithdrawModal — Withdraw an applicant from the program.
 *
 * Props:
 *   applicant: object
 *   onSave(withdrawalReason, withdrawnBy): function
 *   onClose(): function
 */

import React, { useState } from "react";
import Modal from "./Modal.jsx";

const WITHDRAWAL_REASONS = [
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
];

export default function WithdrawModal({ applicant, onSave, onClose }) {
  const [withdrawnBy, setWithdrawnBy] = useState("Applicant");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!reason) {
      setError("Please select a withdrawal reason.");
      return;
    }

    setSaving(true);
    try {
      await onSave(reason, withdrawnBy);
    } catch (err) {
      setError(err.message || "Failed to withdraw applicant.");
      setSaving(false);
    }
  };

  return (
    <Modal title="Withdraw Applicant" size="sm" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <div
          className="alert alert-warning"
          style={{ marginBottom: 16 }}
        >
          You are about to withdraw <strong>{applicant.first_name} {applicant.last_name}</strong>.
          This action will be logged and cannot be undone without contacting an administrator.
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Withdrawn By</label>
          <div className="radio-group">
            {["Applicant", "OA / Program"].map((opt) => (
              <label key={opt} className="radio-label">
                <input
                  type="radio"
                  value={opt}
                  checked={withdrawnBy === opt}
                  onChange={() => setWithdrawnBy(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Withdrawal Reason *</label>
          <select
            className="form-select"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          >
            <option value="">Select reason...</option>
            {WITHDRAWAL_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-danger" disabled={saving}>
            {saving ? "Withdrawing..." : "Confirm Withdrawal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
