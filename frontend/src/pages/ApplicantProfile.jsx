/**
 * ApplicantProfile — Full tabbed profile for a single applicant.
 * Phase 4 implementation: Overview, Status History, Documents.
 * Case Notes (Phase 6), Messages (Phase 12), Meetings (Phase 14) stub tabs.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import ApplicantFormModal from "../components/ApplicantFormModal.jsx";
import StatusUpdateModal from "../components/StatusUpdateModal.jsx";
import WithdrawModal from "../components/WithdrawModal.jsx";
import CaseNoteCard from "../components/CaseNoteCard.jsx";
import CaseNoteFormModal from "../components/CaseNoteFormModal.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import apiClient from "../api/apiClient.js";
import { formatDate, formatDateTime } from "../utils/dateUtils.js";
import { formatPhone, formatRole } from "../utils/formatters.js";

const TABS = ["Overview", "Status History", "Documents", "Case Notes", "Messages", "Meetings"];

export default function ApplicantProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");

  // Status history
  const [history, setHistory]     = useState([]);
  const [historyLoading, setHL]   = useState(false);

  // Documents
  const [docs, setDocs]           = useState([]);
  const [docsLoading, setDL]      = useState(false);

  // Case notes
  const [caseNotes, setCaseNotes]       = useState([]);
  const [caseNotesLoading, setCNL]      = useState(false);
  const [showCaseNoteForm, setShowCNF]  = useState(false);

  // Modals
  const [showEdit, setShowEdit]         = useState(false);
  const [showStatus, setShowStatus]     = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const [flash, setFlash]         = useState("");
  const [flashType, setFlashType] = useState("success");
  const [users, setUsers]         = useState([]);

  const flash$ = (msg, type = "success") => {
    setFlash(msg); setFlashType(type);
    setTimeout(() => setFlash(""), 4000);
  };

  const loadApplicant = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/applicants/${id}`);
      setApplicant(res.data.applicant);
    } catch (err) {
      if (err.response?.status === 404) {
        navigate("/applicants");
      } else {
        flash$("Failed to load applicant.", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { loadApplicant(); }, [loadApplicant]);

  useEffect(() => {
    if (isAdmin) {
      apiClient.get("/users?is_active=true&per_page=200")
        .then((r) => setUsers(r.data.users || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  // Load history when tab selected
  useEffect(() => {
    if (activeTab === "Status History" && applicant && history.length === 0) {
      setHL(true);
      apiClient.get(`/applicants/${id}/status-history`)
        .then((r) => setHistory(r.data.history || []))
        .catch(() => {})
        .finally(() => setHL(false));
    }
  }, [activeTab, applicant, id, history.length]);

  // Load documents when tab selected
  useEffect(() => {
    if (activeTab === "Documents" && applicant && docs.length === 0) {
      setDL(true);
      apiClient.get(`/applicants/${id}/documents`)
        .then((r) => setDocs(r.data.documents || []))
        .catch(() => {})
        .finally(() => setDL(false));
    }
  }, [activeTab, applicant, id, docs.length]);

  // Load case notes when tab selected
  useEffect(() => {
    if (activeTab === "Case Notes" && applicant && caseNotes.length === 0) {
      setCNL(true);
      apiClient.get(`/applicants/${id}/case-notes`)
        .then((r) => setCaseNotes(r.data.case_notes || []))
        .catch(() => {})
        .finally(() => setCNL(false));
    }
  }, [activeTab, applicant, id, caseNotes.length]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleEdit = async (payload) => {
    await apiClient.put(`/applicants/${id}`, payload);
    await loadApplicant();
    setShowEdit(false);
    flash$("Applicant updated.");
  };

  const handleStatusUpdate = async (newStatus, reason, notes) => {
    await apiClient.put(`/applicants/${id}/status`, { new_status: newStatus, reason, notes });
    await loadApplicant();
    // Reset history so it reloads
    setHistory([]);
    setShowStatus(false);
    flash$(`Status updated to "${newStatus}".`);
  };

  const handleMarkComplete = async () => {
    if (!window.confirm("Mark this applicant's file as complete? This will advance their status if needed.")) return;
    try {
      await apiClient.put(`/applicants/${id}/mark-complete`);
      await loadApplicant();
      setHistory([]);
      flash$("Applicant marked complete.");
    } catch (err) {
      flash$(err.response?.data?.error || "Failed.", "error");
    }
  };

  const handleWithdraw = async (withdrawalReason, withdrawnBy) => {
    await apiClient.put(`/applicants/${id}/withdraw`, { withdrawal_reason: withdrawalReason, withdrawn_by: withdrawnBy });
    await loadApplicant();
    setHistory([]);
    setShowWithdraw(false);
    flash$("Applicant withdrawn.");
  };

  const handleDocToggle = async (doc) => {
    try {
      const res = await apiClient.put(`/applicants/${id}/documents/${doc.id}`, {
        is_received: !doc.is_received,
      });
      setDocs((prev) => prev.map((d) => d.id === doc.id ? res.data.document : d));
    } catch {
      flash$("Failed to update document.", "error");
    }
  };

  const handleCaseNoteSave = async (payload) => {
    const res = await apiClient.post(`/applicants/${id}/case-notes`, payload);
    setCaseNotes((prev) => [res.data.case_note, ...prev]);
    setShowCNF(false);
    flash$("Case note saved.");
  };

  const handleCaseNoteDelete = async (noteId) => {
    if (!window.confirm("Delete this case note?")) return;
    try {
      await apiClient.delete(`/case-notes/${noteId}`);
      setCaseNotes((prev) => prev.filter((n) => n.id !== noteId));
      flash$("Case note deleted.");
    } catch (err) {
      flash$(err.response?.data?.error || "Failed to delete.", "error");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageLayout title="Applicant Profile">
        <div className="loading-screen" style={{ minHeight: 200 }}>
          <div className="loading-spinner" />
          <span>Loading applicant…</span>
        </div>
      </PageLayout>
    );
  }

  if (!applicant) return null;

  const canEdit = isAdmin || true; // OA can edit their own applicants (enforced on backend)
  const isWithdrawn = applicant.is_withdrawn;
  const isComplete = applicant.is_complete;
  const docsReceived = docs.filter((d) => d.is_received).length;
  const docsRequired = docs.filter((d) => d.is_required).length;

  return (
    <PageLayout title={`${applicant.first_name} ${applicant.last_name}`}>
      {flash && (
        <div className={`alert alert-${flashType}`} style={{ marginBottom: 16 }}>
          {flash}
        </div>
      )}

      {/* Action Buttons */}
      <div className="profile-actions">
        {canEdit && !isWithdrawn && (
          <button className="btn btn-primary" onClick={() => setShowStatus(true)}>
            🔄 Update Status
          </button>
        )}
        {canEdit && !isComplete && !isWithdrawn && (
          <button className="btn btn-success" onClick={handleMarkComplete}>
            ✅ Mark Complete
          </button>
        )}
        {canEdit && !isWithdrawn && (
          <button className="btn btn-secondary" onClick={() => setShowCNF(true)}>
            📝 Case Note
          </button>
        )}
        {canEdit && (
          <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>
            ✏️ Edit Info
          </button>
        )}
        {canEdit && !isWithdrawn && (
          <button className="btn btn-danger" onClick={() => setShowWithdraw(true)}>
            🚫 Withdraw
          </button>
        )}
        <button className="btn btn-secondary" onClick={() => navigate("/applicants")}>
          ← Back to List
        </button>
      </div>

      {/* Status + Completion Banner */}
      <div className="applicant-profile-banner">
        <div className="applicant-profile-banner-left">
          <div className="applicant-profile-avatar">
            {applicant.first_name[0]}{applicant.last_name[0]}
          </div>
          <div>
            <div className="applicant-profile-name">
              {applicant.first_name} {applicant.last_name}
              {isComplete && <span className="complete-badge">✅ Complete</span>}
              {isWithdrawn && <span className="withdrawn-badge">🚫 Withdrawn</span>}
            </div>
            <div className="applicant-profile-meta">
              {[applicant.city, applicant.state].filter(Boolean).join(", ") || "No address"}
              {applicant.phone && <> · {formatPhone(applicant.phone)}</>}
              {applicant.email && <> · {applicant.email}</>}
            </div>
            <div style={{ marginTop: 6 }}>
              <StatusBadge status={applicant.application_status} />
            </div>
          </div>
        </div>
        <div className="applicant-profile-banner-right">
          <div className="applicant-stat-row">
            <span className="applicant-stat-label">Date Applied</span>
            <span className="applicant-stat-value">{formatDate(applicant.date_applied) || "—"}</span>
          </div>
          <div className="applicant-stat-row">
            <span className="applicant-stat-label">Next Follow-up</span>
            <span className="applicant-stat-value" style={{
              color: applicant.next_follow_up_date && new Date(applicant.next_follow_up_date) < new Date() && !isComplete && !isWithdrawn
                ? "var(--color-red)" : undefined
            }}>
              {formatDate(applicant.next_follow_up_date) || "—"}
            </span>
          </div>
          <div className="applicant-stat-row">
            <span className="applicant-stat-label">Last Contact</span>
            <span className="applicant-stat-value">{formatDate(applicant.last_contact_date) || "—"}</span>
          </div>
          <div className="applicant-stat-row">
            <span className="applicant-stat-label">Assigned OA</span>
            <span className="applicant-stat-value">
              {applicant.assigned_oa
                ? `${applicant.assigned_oa.first_name} ${applicant.assigned_oa.last_name}`
                : "Unassigned"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "tab-btn-active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === "Documents" && docs.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: "0.72rem", color: "var(--color-gray-400)" }}>
                {docsReceived}/{docsRequired}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ────────────────────────────────────────────────── */}
      {activeTab === "Overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Personal Info */}
          <div className="form-card">
            <div className="section-title">Personal Information</div>
            <InfoRow label="Full Name"         value={`${applicant.first_name} ${applicant.last_name}`} />
            <InfoRow label="Phone"             value={formatPhone(applicant.phone)} />
            <InfoRow label="Email"             value={applicant.email} />
            <InfoRow label="Age"               value={applicant.age} />
            <InfoRow label="Date of Birth"     value={formatDate(applicant.date_of_birth)} />
            <InfoRow label="Education"         value={applicant.education_status} />
            <InfoRow label="Trade Interest"    value={applicant.trade_interest} />
          </div>

          {/* Address */}
          <div className="form-card">
            <div className="section-title">Address</div>
            <InfoRow label="Street"    value={applicant.address} />
            <InfoRow label="City"      value={applicant.city} />
            <InfoRow label="County"    value={applicant.county} />
            <InfoRow label="State"     value={applicant.state} />
            <InfoRow label="ZIP Code"  value={applicant.zip_code} />
            <InfoRow label="Timezone"  value={applicant.timezone} />
          </div>

          {/* Program Info */}
          <div className="form-card">
            <div className="section-title">Program Details</div>
            <InfoRow label="Source"           value={applicant.source} />
            <InfoRow label="Referral Source"  value={applicant.referral_source} />
            <InfoRow label="Date Applied"     value={formatDate(applicant.date_applied)} />
            <InfoRow label="Last Contact"     value={formatDate(applicant.last_contact_date)} />
            <InfoRow label="Next Follow-up"   value={formatDate(applicant.next_follow_up_date)} />
            {applicant.is_withdrawn && (
              <>
                <InfoRow label="Withdrawal Reason" value={applicant.withdrawal_reason} />
                <InfoRow label="Withdrawal Date"   value={formatDate(applicant.withdrawal_date)} />
              </>
            )}
          </div>

          {/* Notes */}
          {applicant.notes && (
            <div className="form-card">
              <div className="section-title">Notes</div>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--color-navy-dark)" }}>
                {applicant.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Status History Tab ───────────────────────────────────────────── */}
      {activeTab === "Status History" && (
        <div>
          {historyLoading ? (
            <div className="loading-screen" style={{ minHeight: 120 }}>
              <div className="loading-spinner" />
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📋</span>
              <p>No status history found.</p>
            </div>
          ) : (
            <div className="status-timeline">
              {history.map((h, i) => (
                <div key={h.id} className="status-timeline-item">
                  <div className="status-timeline-dot" />
                  {i < history.length - 1 && <div className="status-timeline-line" />}
                  <div className="status-timeline-content">
                    <div className="status-timeline-header">
                      {h.old_status ? (
                        <>
                          <StatusBadge status={h.old_status} />
                          <span style={{ color: "var(--color-gray-400)", fontSize: "0.85rem" }}> → </span>
                          <StatusBadge status={h.new_status} />
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: "0.8rem", color: "var(--color-gray-400)" }}>Initial: </span>
                          <StatusBadge status={h.new_status} />
                        </>
                      )}
                    </div>
                    {h.status_reason && (
                      <div className="status-timeline-reason">{h.status_reason}</div>
                    )}
                    <div className="status-timeline-meta">
                      {h.changed_by
                        ? `${h.changed_by.first_name} ${h.changed_by.last_name}`
                        : "System"}
                      {" · "}
                      {formatDateTime(h.changed_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Documents Tab ────────────────────────────────────────────────── */}
      {activeTab === "Documents" && (
        <div>
          {docsLoading ? (
            <div className="loading-screen" style={{ minHeight: 120 }}>
              <div className="loading-spinner" />
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 12, fontSize: "0.85rem", color: "var(--color-gray-500)" }}>
                {docsReceived} of {docsRequired} required documents received
              </div>
              {/* Progress bar */}
              {docsRequired > 0 && (
                <div className="doc-progress-bar">
                  <div
                    className="doc-progress-fill"
                    style={{ width: `${Math.round((docsReceived / docsRequired) * 100)}%` }}
                  />
                </div>
              )}
              <div className="doc-checklist">
                {docs.length === 0 ? (
                  <div className="empty-state" style={{ padding: "24px 0" }}>
                    <p>No documents on record.</p>
                  </div>
                ) : (
                  docs.map((doc) => (
                    <div key={doc.id} className={`doc-row ${doc.is_received ? "doc-row-received" : ""}`}>
                      <label className="doc-toggle">
                        <input
                          type="checkbox"
                          checked={doc.is_received}
                          onChange={() => handleDocToggle(doc)}
                        />
                        <span className={`doc-name ${doc.is_received ? "doc-name-done" : ""}`}>
                          {doc.document_name}
                        </span>
                        {doc.is_required && !doc.is_received && (
                          <span className="doc-required-badge">Required</span>
                        )}
                        {doc.is_received && doc.date_received && (
                          <span className="doc-date-received">Received {formatDate(doc.date_received)}</span>
                        )}
                      </label>
                      {doc.notes && (
                        <div className="doc-notes">{doc.notes}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Case Notes Tab ───────────────────────────────────────────────── */}
      {activeTab === "Case Notes" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            {!isWithdrawn && (
              <button className="btn btn-primary" onClick={() => setShowCNF(true)}>
                + New Case Note
              </button>
            )}
          </div>
          {caseNotesLoading ? (
            <div className="loading-screen" style={{ minHeight: 120 }}>
              <div className="loading-spinner" />
            </div>
          ) : caseNotes.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📝</span>
              <p>No case notes yet.</p>
              {!isWithdrawn && (
                <button className="btn btn-primary" onClick={() => setShowCNF(true)}>
                  + Create First Note
                </button>
              )}
            </div>
          ) : (
            <div>
              {caseNotes.map((note) => (
                <CaseNoteCard
                  key={note.id}
                  note={note}
                  onDelete={!note.auto_generated ? () => handleCaseNoteDelete(note.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Messages Tab (Phase 12) ──────────────────────────────────────── */}
      {activeTab === "Messages" && (
        <div className="empty-state">
          <span className="empty-state-icon">💬</span>
          <p>Messaging is available in Phase 12.</p>
        </div>
      )}

      {/* ── Meetings Tab (Phase 14) ──────────────────────────────────────── */}
      {activeTab === "Meetings" && (
        <div className="empty-state">
          <span className="empty-state-icon">📅</span>
          <p>Meetings are available in Phase 14.</p>
        </div>
      )}

      {/* Modals */}
      {showEdit && (
        <ApplicantFormModal
          applicant={applicant}
          users={users}
          isAdmin={isAdmin}
          onSave={handleEdit}
          onClose={() => setShowEdit(false)}
        />
      )}
      {showStatus && (
        <StatusUpdateModal
          applicant={applicant}
          onSave={handleStatusUpdate}
          onClose={() => setShowStatus(false)}
        />
      )}
      {showWithdraw && (
        <WithdrawModal
          applicant={applicant}
          onSave={handleWithdraw}
          onClose={() => setShowWithdraw(false)}
        />
      )}
      {showCaseNoteForm && (
        <CaseNoteFormModal
          applicantId={applicant.id}
          applicantName={`${applicant.first_name} ${applicant.last_name}`}
          onSave={handleCaseNoteSave}
          onClose={() => setShowCNF(false)}
        />
      )}
    </PageLayout>
  );
}

// ── Helper component ──────────────────────────────────────────────────────────

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="info-row">
      <span className="info-row-label">{label}</span>
      <span className="info-row-value">{value}</span>
    </div>
  );
}
