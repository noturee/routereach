/**
 * CaseNoteCard — Display a single case note in R.A.P. format.
 *
 * Props:
 *   note: object (case note record)
 *   onDelete?: function — if provided, shows a delete button (manual notes only)
 *   onEdit?: function — if provided, shows an edit button
 */

import React from "react";
import { formatDateTime } from "../utils/dateUtils.js";

export default function CaseNoteCard({ note, onDelete, onEdit }) {
  return (
    <div className={`case-note-card ${note.auto_generated ? "case-note-auto" : "case-note-manual"}`}>
      <div className="case-note-header">
        <span className="case-note-type">{note.note_type || "General Note"}</span>
        <span className="case-note-badge">
          {note.auto_generated ? "Auto" : "Manual"}
        </span>
        <span style={{ flex: 1 }} />
        <span className="case-note-date">{formatDateTime(note.created_at)}</span>
        {note.user && (
          <span className="case-note-author">
            {note.user.first_name} {note.user.last_name}
          </span>
        )}
        {onDelete && (
          <button
            className="btn btn-sm"
            style={{ color: "var(--color-red)", padding: "2px 6px" }}
            onClick={() => onDelete(note.id)}
            title="Delete note"
          >
            🗑
          </button>
        )}
      </div>

      <div className="case-note-body">
        {note.reason && (
          <div className="case-note-section">
            <strong>Reason:</strong> {note.reason}
          </div>
        )}
        {note.action && (
          <div className="case-note-section">
            <strong>Action:</strong> {note.action}
          </div>
        )}
        {note.plan && (
          <div className="case-note-section">
            <strong>Plan:</strong> {note.plan}
          </div>
        )}
        {note.note_body && !note.reason && !note.action && !note.plan && (
          <div className="case-note-section">{note.note_body}</div>
        )}
      </div>
    </div>
  );
}
