/**
 * Meetings — Schedule and manage virtual meetings.
 */
import React, { useEffect, useMemo, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import DataTable from "../components/DataTable.jsx";
import apiClient from "../api/apiClient.js";
import { formatDate } from "../utils/dateUtils.js";

const COLUMNS = [
  { key: "applicant_name", label: "Applicant" },
  { key: "meeting_title", label: "Title" },
  { key: "meeting_type", label: "Type" },
  { key: "meeting_date_fmt", label: "Date" },
  { key: "meeting_time", label: "Time" },
  { key: "platform", label: "Platform" },
  { key: "status", label: "Status" },
];

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    participant_type: "applicant",
    applicant_id: "",
    partner_contact_name: "",
    partner_organization: "",
    contact_email: "",
    contact_phone: "",
    meeting_title: "",
    meeting_type: "Initial interview",
    meeting_date: "",
    meeting_time: "",
    platform: "zoom",
    status: "scheduled",
    meeting_link: "",
    notes: "",
  });

  const applicantById = useMemo(() => {
    const map = new Map();
    applicants.forEach((a) => map.set(a.id, a));
    return map;
  }, [applicants]);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiClient.get("/meetings"),
      apiClient.get("/applicants?per_page=200"),
    ])
      .then(([mRes, aRes]) => {
        setMeetings(mRes.data.meetings || []);
        setApplicants(aRes.data.applicants || []);
      })
      .catch(() => {
        setMeetings([]);
        setApplicants([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => (
    meetings.map((m) => {
      const applicant = applicantById.get(m.applicant_id);
      const applicant_name = applicant
        ? (applicant.full_name_original || `${applicant.first_name || ""} ${applicant.last_name || ""}`.trim())
        : `Applicant #${m.applicant_id}`;
      return {
        ...m,
        applicant_name,
        meeting_date_fmt: formatDate(m.meeting_date),
        platform: m.platform || "-",
        meeting_time: m.meeting_time ? m.meeting_time.slice(0, 5) : "-",
      };
    })
  ), [meetings, applicantById]);

  const createMeeting = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        meeting_time: form.meeting_time || null,
        meeting_link: form.meeting_link || null,
        notes: form.notes || null,
      };

      if (form.participant_type === "applicant") {
        payload.applicant_id = Number(form.applicant_id);
      } else {
        delete payload.applicant_id;
      }

      await apiClient.post("/meetings", payload);
      setShowForm(false);
      setForm({
        participant_type: "applicant",
        applicant_id: "",
        partner_contact_name: "",
        partner_organization: "",
        contact_email: "",
        contact_phone: "",
        meeting_title: "",
        meeting_type: "Initial interview",
        meeting_date: "",
        meeting_time: "",
        platform: "zoom",
        status: "scheduled",
        meeting_link: "",
        notes: "",
      });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create meeting.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (meetingId, status) => {
    await apiClient.put(`/meetings/${meetingId}`, { status });
    load();
  };

  const completeMeeting = async (meetingId) => {
    await apiClient.put(`/meetings/${meetingId}/complete`, {});
    load();
  };

  const deleteMeeting = async (meetingId) => {
    if (!window.confirm("Delete this meeting?")) return;
    await apiClient.delete(`/meetings/${meetingId}`);
    load();
  };

  return (
    <PageLayout title="Meetings">
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Scheduled Meetings</h2>
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Close" : "+ Schedule Meeting"}
          </button>
        </div>

        {showForm && (
          <form className="form-card" onSubmit={createMeeting} style={{ marginBottom: 12 }}>
            {error && <div className="alert alert-error" style={{ marginBottom: 10 }}>{error}</div>}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Meeting With</label>
                <select className="form-select" value={form.participant_type} onChange={(e) => setForm((f) => ({ ...f, participant_type: e.target.value }))}>
                  <option value="applicant">Applicant</option>
                  <option value="partner">Business Partner / Community Organization</option>
                </select>
              </div>
            </div>

            {form.participant_type === "applicant" ? (
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Applicant</label>
                  <select className="form-select" value={form.applicant_id} onChange={(e) => setForm((f) => ({ ...f, applicant_id: e.target.value }))} required>
                    <option value="">Select applicant...</option>
                    {applicants.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name_original || `${a.first_name || ""} ${a.last_name || ""}`.trim() || `Applicant #${a.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Contact Name</label>
                  <input className="form-input" value={form.partner_contact_name} onChange={(e) => setForm((f) => ({ ...f, partner_contact_name: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Organization</label>
                  <input className="form-input" value={form.partner_organization} onChange={(e) => setForm((f) => ({ ...f, partner_organization: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.contact_phone} onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} />
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Title</label>
                <input className="form-input" value={form.meeting_title} onChange={(e) => setForm((f) => ({ ...f, meeting_title: e.target.value }))} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Type</label>
                <input className="form-input" value={form.meeting_type} onChange={(e) => setForm((f) => ({ ...f, meeting_type: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={form.meeting_date} onChange={(e) => setForm((f) => ({ ...f, meeting_date: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Time</label>
                <input className="form-input" type="time" value={form.meeting_time} onChange={(e) => setForm((f) => ({ ...f, meeting_time: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Platform</label>
                <select className="form-select" value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}>
                  <option value="zoom">Zoom</option>
                  <option value="teams">Teams</option>
                  <option value="google_meet">Google Meet</option>
                  <option value="phone">Phone</option>
                  <option value="in_person">In Person</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Meeting Link (optional)</label>
              <input className="form-input" value={form.meeting_link} onChange={(e) => setForm((f) => ({ ...f, meeting_link: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Create Meeting"}</button>
            </div>
          </form>
        )}

        <DataTable columns={COLUMNS} rows={rows} loading={loading} emptyMessage={loading ? "Loading meetings..." : "No meetings scheduled."} />

        {rows.length > 0 && (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {rows.map((row) => (
              <div key={row.id} className="form-card" style={{ padding: 10 }}>
                <strong>{row.meeting_title}</strong> · {row.applicant_name}
                <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {row.status !== "completed" && (
                    <button className="btn btn-sm btn-success" onClick={() => completeMeeting(row.id)}>Mark Completed</button>
                  )}
                  {row.status !== "cancelled" && (
                    <button className="btn btn-sm btn-secondary" onClick={() => updateStatus(row.id, "cancelled")}>Cancel</button>
                  )}
                  {row.status !== "rescheduled" && (
                    <button className="btn btn-sm btn-secondary" onClick={() => updateStatus(row.id, "rescheduled")}>Reschedule</button>
                  )}
                  <button className="btn btn-sm btn-danger" onClick={() => deleteMeeting(row.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageLayout>
  );
}
