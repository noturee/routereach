/**
 * MessagingCenter — Send emails and texts to applicants.
 * Full implementation in Phase 12/13.
 */
import React, { useState } from "react";
import PageLayout from "../components/PageLayout.jsx";

export default function MessagingCenter() {
  const [method, setMethod] = useState("email");

  return (
    <PageLayout title="Messaging Center">
      <section className="section">
        <div className="form-card">
          <div className="form-group">
            <label className="form-label">Applicant</label>
            <input className="form-input" placeholder="Search applicant by name..." disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Template</label>
            <select className="form-select" disabled><option>Select a template...</option></select>
          </div>
          <div className="form-group">
            <label className="form-label">Send Via</label>
            <div className="radio-group">
              {["email","text","both"].map(m => (
                <label key={m} className="radio-label">
                  <input type="radio" name="method" value={m} checked={method===m} onChange={() => setMethod(m)} />
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            {(method === "email" || method === "both") && (
              <><label className="form-label">Subject</label><input className="form-input" disabled placeholder="Email subject..." /></>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea className="form-textarea" rows={6} disabled placeholder="Message body... (Phase 12)" />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" disabled>Send (Phase 12/13)</button>
          </div>
        </div>
      </section>
      <p className="section-coming-soon">Messaging center with SendGrid and Twilio integration coming in Phase 12–13.</p>
    </PageLayout>
  );
}
