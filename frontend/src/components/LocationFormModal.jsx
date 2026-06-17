/**
 * LocationFormModal — Create or edit an outreach location.
 *
 * Props:
 *   location: object|null — null = create mode
 *   users: array — active users for OA assignment (admin only)
 *   isAdmin: bool
 *   onSave(payload): function
 *   onClose(): function
 */

import React, { useState, useEffect } from "react";
import Modal from "./Modal.jsx";

const LOCATION_TYPES = [
  "Library","Workforce Office","Community Center","Apartment Complex",
  "School","High School","College","Trade School","Shelter","Food Pantry",
  "Church / Faith-Based Organization","Community Store","Barbershop / Salon",
  "Laundromat","Youth Program","Reentry Program","Housing Organization",
  "Health Clinic","Government Office","Nonprofit Organization",
  "Public Housing Site","Event Location","Employer","Other",
];

const LOCATION_STATUSES = [
  { value: "active",            label: "Active" },
  { value: "inactive",          label: "Inactive" },
  { value: "do_not_visit",      label: "Do Not Visit" },
  { value: "pending_approval",  label: "Pending Approval" },
];

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

const empty = () => ({
  location_name: "", location_type: "", address: "", city: "", state: "",
  county: "", zip_code: "", contact_person: "", contact_title: "",
  contact_phone: "", contact_email: "", marketing_allowed: true,
  assigned_oa_id: "", status: "active", next_follow_up_date: "", notes: "",
});

export default function LocationFormModal({ location, users = [], isAdmin, onSave, onClose }) {
  const editing = !!location;
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (location) {
      setForm({
        location_name:       location.location_name || "",
        location_type:       location.location_type || "",
        address:             location.address || "",
        city:                location.city || "",
        state:               location.state || "",
        county:              location.county || "",
        zip_code:            location.zip_code || "",
        contact_person:      location.contact_person || "",
        contact_title:       location.contact_title || "",
        contact_phone:       location.contact_phone || "",
        contact_email:       location.contact_email || "",
        marketing_allowed:   location.marketing_allowed ?? true,
        assigned_oa_id:      location.assigned_oa_id ?? "",
        status:              location.status || "active",
        next_follow_up_date: location.next_follow_up_date || "",
        notes:               location.notes || "",
      });
    }
  }, [location]);

  const set = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.location_name.trim()) {
      setError("Location name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.assigned_oa_id) delete payload.assigned_oa_id;
      else payload.assigned_oa_id = parseInt(payload.assigned_oa_id, 10);
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") payload[k] = null;
      });
      payload.marketing_allowed = form.marketing_allowed;
      await onSave(payload);
    } catch (err) {
      setError(err.message || "Failed to save location.");
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? "Edit Location" : "Add Location"} size="lg" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Location info */}
        <div className="form-section-label">Location Information</div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Location Name *</label>
            <input className="form-input" value={form.location_name} onChange={set("location_name")} required />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={form.location_type} onChange={set("location_type")}>
              <option value="">Select type...</option>
              {LOCATION_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={set("status")}>
              {LOCATION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Address */}
        <div className="form-section-label" style={{ marginTop: 16 }}>Address</div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Street Address</label>
            <input className="form-input" value={form.address} onChange={set("address")} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">City</label>
            <input className="form-input" value={form.city} onChange={set("city")} />
          </div>
          <div className="form-group">
            <label className="form-label">County</label>
            <input className="form-input" value={form.county} onChange={set("county")} />
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <select className="form-select" value={form.state} onChange={set("state")}>
              <option value="">Select...</option>
              {US_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">ZIP Code</label>
            <input className="form-input" value={form.zip_code} onChange={set("zip_code")} maxLength={10} />
          </div>
        </div>

        {/* Contact */}
        <div className="form-section-label" style={{ marginTop: 16 }}>Contact</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Contact Person</label>
            <input className="form-input" value={form.contact_person} onChange={set("contact_person")} />
          </div>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" value={form.contact_title} onChange={set("contact_title")} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Contact Phone</label>
            <input className="form-input" type="tel" value={form.contact_phone} onChange={set("contact_phone")} />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Email</label>
            <input className="form-input" type="email" value={form.contact_email} onChange={set("contact_email")} />
          </div>
        </div>

        {/* Assignment & options */}
        <div className="form-section-label" style={{ marginTop: 16 }}>Assignment & Settings</div>
        <div className="form-row">
          {isAdmin && users.length > 0 && (
            <div className="form-group">
              <label className="form-label">Assigned OA</label>
              <select className="form-select" value={form.assigned_oa_id} onChange={set("assigned_oa_id")}>
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Next Follow-up Date</label>
            <input className="form-input" type="date" value={form.next_follow_up_date} onChange={set("next_follow_up_date")} />
          </div>
          <div className="form-group" style={{ justifyContent: "flex-end" }}>
            <label className="radio-label" style={{ paddingTop: 28 }}>
              <input type="checkbox" checked={form.marketing_allowed} onChange={set("marketing_allowed")} />
              Marketing Allowed
            </label>
          </div>
        </div>

        <div className="form-row" style={{ marginTop: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={3} value={form.notes} onChange={set("notes")} />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : editing ? "Save Changes" : "Add Location"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
