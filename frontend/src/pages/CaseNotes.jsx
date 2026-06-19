/**
 * CaseNotes — Global list of all case notes across all applicants.
 * Filterable by note type, auto/manual, and applicant search.
 * Phase 5 implementation.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import CaseNoteCard from "../components/CaseNoteCard.jsx";
import CaseNoteFormModal from "../components/CaseNoteFormModal.jsx";
import apiClient from "../api/apiClient.js";

const NOTE_TYPES = [
  "All Types",
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
  "Status Change",
  "Withdrawal",
  "Application Closure",
];

export default function CaseNotes() {
  const navigate = useNavigate();

  const [notes, setNotes]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const perPage                   = 30;

  const [typeFilter, setTypeFilter]         = useState("All Types");
  const [autoFilter, setAutoFilter]         = useState("all");
  const [applicantSearch, setApplSearch]    = useState("");

  const [showForm, setShowForm]   = useState(false);
  const [applicants, setApplicants] = useState([]);
  const [flash, setFlash]         = useState("");
  const [flashType, setFlashType] = useState("success");

  const flash$ = (msg, type = "success") => {
    setFlash(msg); setFlashType(type);
    setTimeout(() => setFlash(""), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: perPage });
      if (typeFilter !== "All Types") params.set("note_type", typeFilter);
      if (autoFilter === "auto")   params.set("auto_generated", "true");
      if (autoFilter === "manual") params.set("auto_generated", "false");
      const res = await apiClient.get(`/case-notes?${params}`);
      setNotes(res.data.case_notes || []);
      setTotal(res.data.total || 0);
    } catch {
      flash$("Failed to load case notes.", "error");
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, autoFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [typeFilter, autoFilter]);

  useEffect(() => {
    apiClient.get("/applicants?per_page=200")
      .then((res) => setApplicants(res.data.applicants || []))
      .catch(() => setApplicants([]));
  }, []);

  // Client-side filter by applicant name (since API doesn't support it yet)
  const filtered = applicantSearch.trim()
    ? notes.filter((n) => {
        const name = n.applicant
          ? `${n.applicant.first_name} ${n.applicant.last_name}`.toLowerCase()
          : "";
        return name.includes(applicantSearch.trim().toLowerCase());
      })
    : notes;

  const handleDelete = async (noteId) => {
    if (!window.confirm("Delete this case note?")) return;
    try {
      await apiClient.delete(`/case-notes/${noteId}`);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setTotal((t) => t - 1);
      flash$("Case note deleted.");
    } catch (err) {
      flash$(err.response?.data?.error || "Failed to delete.", "error");
    }
  };

  const handleCreate = async (payload) => {
    const res = await apiClient.post("/case-notes", payload);
    await load();
    setShowForm(false);
    flash$("Case note created.");
    return res.data.case_note;
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <PageLayout title="Case Notes">
      {flash && (
        <div className={`alert alert-${flashType}`} style={{ marginBottom: 16 }}>
          {flash}
        </div>
      )}

      {/* Filters */}
      <div className="section-header" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
          <input
            type="search"
            className="form-input search-bar"
            placeholder="Filter by applicant name..."
            value={applicantSearch}
            onChange={(e) => setApplSearch(e.target.value)}
          />
          <select
            className="form-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ minWidth: 180 }}
          >
            {NOTE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select
            className="form-select"
            value={autoFilter}
            onChange={(e) => setAutoFilter(e.target.value)}
          >
            <option value="all">All Notes</option>
            <option value="manual">Manual Only</option>
            <option value="auto">Auto-Generated Only</option>
          </select>
        </div>
        <div className="section-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + New Case Note
          </button>
        </div>
      </div>

      <div style={{ fontSize: "0.83rem", color: "var(--color-gray-500)", marginBottom: 12 }}>
        {total} case note{total !== 1 ? "s" : ""}
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: 200 }}>
          <div className="loading-spinner" />
          <span>Loading case notes…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">📝</span>
          <p>No case notes found.</p>
          {!applicantSearch && typeFilter === "All Types" && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Create First Case Note
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {filtered.map((note) => (
            <div key={note.id} className="case-note-with-applicant">
              {/* Applicant header */}
              {note.applicant && (
                <div
                  className="case-note-applicant-row"
                  onClick={() => navigate(`/applicants/${note.applicant_id}`)}
                >
                  <span className="case-note-applicant-name">
                    {note.applicant.first_name} {note.applicant.last_name}
                  </span>
                  <span className="case-note-applicant-meta">
                    {note.applicant.application_status}
                  </span>
                </div>
              )}
              <CaseNoteCard
                note={note}
                onDelete={!note.auto_generated ? () => handleDelete(note.id) : undefined}
              />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Previous
          </button>
          <span style={{ padding: "5px 12px", fontSize: "0.87rem" }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {showForm && (
        <CaseNoteFormModal
          applicantId={null}
          applicantName={null}
          applicants={applicants}
          onSave={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
    </PageLayout>
  );
}
