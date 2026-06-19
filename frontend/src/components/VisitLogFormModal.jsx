/**
 * VisitLogFormModal — Log or edit an outreach visit.
 *
 * Props:
 *   log: object|null           — null = create mode
 *   locationId: number|null    — pre-fill location (from LocationProfile)
 *   locationName: string|null  — display name when pre-filled
 *   locations: array           — all locations for selector (when no locationId)
 *   users: array               — OA users (admin only)
 *   isAdmin: bool
 *   onSave(payload): async function
 *   onClose(): function
 */

import React, { useState, useEffect } from "react";
import Modal from "./Modal.jsx";

const MARKETING_TYPES = [
  "Flyers","Door Tags","Lawn Signs","Postcards","QR Cards","Business Cards",
  "Table Setup","Presentation","Info Session","Email Follow-Up","Phone Call",
  "Text Follow-Up","Partner Meeting","Referral Packet","Social Media Share",
  "Community Event","Other",
];

const today = () => new Date().toISOString().slice(0, 10);

const empty = (locationId) => ({
  outreach_location_id: locationId || "",
  visit_date:           today(),
  oa_user_id:           "",
  marketing_type:       "",
  materials_left:       "",
  quantity_left:        "",
  contact_person_met:   "",
  partner_contact_made: false,
  follow_up_needed:     false,
  next_follow_up_date:  "",
  visit_notes:          "",
});

export default function VisitLogFormModal({
  log, locationId, locationName, locations = [], users = [], isAdmin, onSave, onClose,
}) {
  const editing = !!log;
  const [form, setForm]     = useState(empty(locationId));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (log) {
      setForm({
        outreach_location_id: log.outreach_location_id || "",
        visit_date:           log.visit_date || today(),
        oa_user_id:           log.oa_user_id || "",
        marketing_type:       log.marketing_type || "",
        materials_left:       log.materials_left || "",
        quantity_left:        log.quantity_left ?? "",
        contact_person_met:   log.contact_person_met || "",
        partner_contact_made: log.partner_contact_made || false,
        follow_up_needed:     log.follow_up_needed || false,
        next_follow_up_date:  log.next_follow_up_date || "",
        visit_notes:          log.visit_notes || "",
      });
    }
  }, [log]);

  const set = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.outreach_location_id) {
      setError("Please select a location.");
      return;
    }
    if (!form.visit_date) {
      setError("Visit date is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.oa_user_id)  delete payload.oa_user_id;
      else payload.oa_user_id = parseInt(payload.oa_user_id, 10);
      payload.outreach_location_id = parseInt(payload.outreach_location_id, 10);
      if (payload.quantity_left !== "" && payload.quantity_left !== null)
        payload.quantity_left = parseInt(payload.quantity_left, 10);
      else delete payload.quantity_left;
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") payload[k] = null;
      });
      payload.partner_contact_made = form.partner_contact_made;
      payload.follow_up_needed     = form.follow_up_needed;
      await onSave(payload);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to save.");
      setSaving(false);
    }
  };

  const lockedLocation = !!locationId;
  const hasSelectableLocations = lockedLocation || locations.length > 0;

  return (
    <Modal title={editing ? "Edit Visit Log" : "Log Outreach Visit"} size="lg" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Location & Date */}
        <div className="form-section-label">Visit Details</div>
        {!hasSelectableLocations && (
          <div className="alert alert-error" style={{ marginBottom: 12 }}>
            No active locations are available to log a visit.
          </div>
        )}
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Location *</label>
            {lockedLocation ? (
              <div className="form-input" style={{ background: "#f5f5f5", color: "#666", cursor: "default" }}>
                {locationName || `Location #${locationId}`}
              </div>
            ) : (
              <select className="form-select" value={form.outreach_location_id} onChange={set("outreach_location_id")} required disabled={!hasSelectableLocations}>
                <option value="">Select location...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.location_name} — {l.city}, {l.state}</option>
                ))}
              </select>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Visit Date *</label>
            <input className="form-input" type="date" value={form.visit_date} onChange={set("visit_date")} required />
          </div>
        </div>

        {/* OA assignment (admin only) */}
        {isAdmin && users.length > 0 && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Outreach Associate</label>
              <select className="form-select" value={form.oa_user_id} onChange={set("oa_user_id")}>
                <option value="">Myself</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Marketing */}
        <div className="form-section-label" style={{ marginTop: 16 }}>Marketing Activity</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Marketing Type</label>
            <select className="form-select" value={form.marketing_type} onChange={set("marketing_type")}>
              <option value="">Select type...</option>
              {MARKETING_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Materials Left</label>
            <input className="form-input" value={form.materials_left} onChange={set("materials_left")} placeholder="e.g. Flyers, brochures" />
          </div>
          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input className="form-input" type="number" min="0" value={form.quantity_left} onChange={set("quantity_left")} placeholder="0" />
          </div>
        </div>

        {/* Contact */}
        <div className="form-section-label" style={{ marginTop: 16 }}>Contact</div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Contact Person Met</label>
            <input className="form-input" value={form.contact_person_met} onChange={set("contact_person_met")} placeholder="Name / title" />
          </div>
          <div className="form-group" style={{ justifyContent: "flex-end" }}>
            <label className="radio-label" style={{ paddingTop: 28 }}>
              <input type="checkbox" checked={form.partner_contact_made} onChange={set("partner_contact_made")} />
              Partner Contact Made
            </label>
          </div>
        </div>

        {/* Follow-up */}
        <div className="form-section-label" style={{ marginTop: 16 }}>Follow-up</div>
        <div className="form-row">
          <div className="form-group" style={{ alignItems: "center" }}>
            <label className="radio-label" style={{ paddingTop: 28 }}>
              <input type="checkbox" checked={form.follow_up_needed} onChange={set("follow_up_needed")} />
              Follow-up Needed
            </label>
          </div>
          {form.follow_up_needed && (
            <div className="form-group">
              <label className="form-label">Follow-up Date</label>
              <input className="form-input" type="date" value={form.next_follow_up_date} onChange={set("next_follow_up_date")} />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="form-row" style={{ marginTop: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Visit Notes</label>
            <textarea className="form-textarea" rows={3} value={form.visit_notes} onChange={set("visit_notes")} placeholder="Observations, outcomes, next steps..." />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !hasSelectableLocations}>
            {saving ? "Saving..." : editing ? "Save Changes" : "Log Visit"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
