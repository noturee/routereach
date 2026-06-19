/**
 * MessagingCenter — Send emails and texts to applicants.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import DataTable from "../components/DataTable.jsx";
import apiClient from "../api/apiClient.js";
import { formatDate } from "../utils/dateUtils.js";

const MESSAGE_COLUMNS = [
  { key: "created_at_fmt", label: "Sent" },
  { key: "message_type", label: "Type" },
  { key: "delivery_status", label: "Status" },
  { key: "subject", label: "Subject" },
  { key: "preview", label: "Message" },
];

export default function MessagingCenter() {
  const [method, setMethod] = useState("email");
  const [applicants, setApplicants] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    applicant_id: "",
    template_id: "",
    subject: "",
    message_body: "",
  });

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiClient.get("/applicants?per_page=200"),
      apiClient.get("/message-templates"),
      apiClient.get("/messages"),
    ])
      .then(([appRes, templateRes, msgRes]) => {
        setApplicants(appRes.data.applicants || []);
        setTemplates(templateRes.data.templates || []);
        setMessages(msgRes.data.messages || []);
      })
      .catch(() => {
        setApplicants([]);
        setTemplates([]);
        setMessages([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onTemplateChange = (templateId) => {
    setForm((prev) => ({ ...prev, template_id: templateId }));
    const template = templates.find((t) => String(t.id) === String(templateId));
    if (!template) return;
    setForm((prev) => ({
      ...prev,
      template_id: templateId,
      subject: template.subject || prev.subject,
      message_body: template.body || prev.message_body,
    }));
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.applicant_id) {
      setError("Please select an applicant.");
      return;
    }
    if (!form.message_body.trim()) {
      setError("Message body is required.");
      return;
    }

    const endpointMap = {
      email: "/messages/send-email",
      text: "/messages/send-text",
      both: "/messages/send-both",
    };

    setSending(true);
    try {
      await apiClient.post(endpointMap[method], {
        applicant_id: Number(form.applicant_id),
        subject: form.subject?.trim() || undefined,
        message_body: form.message_body.trim(),
      });

      setSuccess("Message sent and recorded successfully.");
      setForm((prev) => ({ ...prev, message_body: "", subject: prev.subject || "" }));
      const refreshed = await apiClient.get("/messages");
      setMessages(refreshed.data.messages || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const rows = useMemo(
    () =>
      messages.map((msg) => ({
        ...msg,
        created_at_fmt: formatDate(msg.created_at),
        subject: msg.subject || "-",
        preview: msg.message_body?.slice(0, 90) || "-",
      })),
    [messages]
  );

  return (
    <PageLayout title="Messaging Center">
      <section className="section">
        <form className="form-card" onSubmit={sendMessage}>
          {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 12 }}>{success}</div>}

          <div className="form-group">
            <label className="form-label">Applicant</label>
            <select
              className="form-select"
              value={form.applicant_id}
              onChange={(e) => setForm((prev) => ({ ...prev, applicant_id: e.target.value }))}
              required
            >
              <option value="">Select applicant...</option>
              {applicants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name_original || `${a.first_name || ""} ${a.last_name || ""}`.trim() || `Applicant #${a.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Template</label>
            <select
              className="form-select"
              value={form.template_id}
              onChange={(e) => onTemplateChange(e.target.value)}
            >
              <option value="">No template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.template_name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Send Via</label>
            <div className="radio-group">
              {["email", "text", "both"].map((m) => (
                <label key={m} className="radio-label">
                  <input
                    type="radio"
                    name="method"
                    value={m}
                    checked={method === m}
                    onChange={() => setMethod(m)}
                  />
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {(method === "email" || method === "both") && (
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                className="form-input"
                placeholder="Email subject"
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea
              className="form-textarea"
              rows={6}
              placeholder="Type your message"
              value={form.message_body}
              onChange={(e) => setForm((prev) => ({ ...prev, message_body: e.target.value }))}
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={sending || loading || applicants.length === 0}>
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </section>

      <section className="section">
        <h3 className="section-title">Recent Messages</h3>
        <DataTable
          columns={MESSAGE_COLUMNS}
          rows={rows}
          emptyMessage={loading ? "Loading messages..." : "No messages yet."}
        />
      </section>
    </PageLayout>
  );
}
