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

const STATE_NAME_TO_ABBR = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS",
  Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA",
  Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT",
  Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
  "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
  Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA",
  "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
};

function normalizeState(input) {
  if (!input) return input;
  const raw = String(input).trim();
  if (!raw) return null;
  if (raw.length === 2) return raw.toUpperCase();
  return STATE_NAME_TO_ABBR[raw] || raw;
}

function pickAddressPart(address, keys) {
  for (const key of keys) {
    if (address?.[key]) return address[key];
  }
  return "";
}

function mapNominatimToForm(result) {
  const address = result?.address || {};
  const houseNumber = pickAddressPart(address, ["house_number"]);
  const road = pickAddressPart(address, ["road", "pedestrian", "footway", "street"]);
  const street = [houseNumber, road].filter(Boolean).join(" ").trim();

  return {
    address: street || result?.display_name || "",
    city: pickAddressPart(address, ["city", "town", "village", "hamlet", "municipality"]),
    county: pickAddressPart(address, ["county", "state_district"]),
    state: normalizeState(pickAddressPart(address, ["state", "region"])),
    zip_code: pickAddressPart(address, ["postcode"]),
    latitude: result?.lat != null ? parseFloat(result.lat) : null,
    longitude: result?.lon != null ? parseFloat(result.lon) : null,
  };
}

const empty = () => ({
  location_name: "", location_type: "", address: "", city: "", state: "",
  county: "", zip_code: "", contact_person: "", contact_title: "",
  contact_phone: "", contact_email: "", marketing_allowed: true,
  assigned_oa_id: "", status: "active", next_follow_up_date: "", notes: "",
  latitude: null, longitude: null,
});

export default function LocationFormModal({ location, users = [], isAdmin, onSave, onClose }) {
  const editing = !!location;
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [autoAddressBusy, setAutoAddressBusy] = useState(false);
  const [autoAddressMessage, setAutoAddressMessage] = useState("");

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
        latitude:            location.latitude ?? null,
        longitude:           location.longitude ?? null,
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
      payload.state = normalizeState(payload.state);
      if (!payload.assigned_oa_id) delete payload.assigned_oa_id;
      else payload.assigned_oa_id = parseInt(payload.assigned_oa_id, 10);
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") payload[k] = null;
      });
      payload.marketing_allowed = form.marketing_allowed;
      await onSave(payload);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to save location.");
      setSaving(false);
    }
  };

  const applyAddressResult = (mapped) => {
    setForm((prev) => ({
      ...prev,
      address: mapped.address || prev.address,
      city: mapped.city || prev.city,
      county: mapped.county || prev.county,
      state: mapped.state || prev.state,
      zip_code: mapped.zip_code || prev.zip_code,
      latitude: Number.isFinite(mapped.latitude) ? mapped.latitude : prev.latitude,
      longitude: Number.isFinite(mapped.longitude) ? mapped.longitude : prev.longitude,
    }));
  };

  const handleAutoAddressFromCurrentLocation = async () => {
    setAutoAddressMessage("");
    if (!navigator.geolocation) {
      setAutoAddressMessage("Auto address is not supported in this browser.");
      return;
    }

    setAutoAddressBusy(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const params = new URLSearchParams({
        format: "jsonv2",
        lat: String(lat),
        lon: String(lon),
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Address lookup failed.");
      }

      const result = await response.json();
      const mapped = {
        ...mapNominatimToForm(result),
        latitude: lat,
        longitude: lon,
      };
      applyAddressResult(mapped);
      setAutoAddressMessage("Address auto-filled from your current location.");
    } catch (err) {
      setAutoAddressMessage(err?.message || "Could not auto-fill address from current location.");
    } finally {
      setAutoAddressBusy(false);
    }
  };

  const handleAutoAddressFromLookup = async () => {
    setAutoAddressMessage("");
    const query = [form.location_name, form.address, form.city, form.state, form.zip_code]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (!query) {
      setAutoAddressMessage("Enter a location name, street, or city/state first.");
      return;
    }

    setAutoAddressBusy(true);
    try {
      const params = new URLSearchParams({
        q: query,
        format: "jsonv2",
        addressdetails: "1",
        limit: "1",
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Address lookup failed.");
      }

      const results = await response.json();
      if (!Array.isArray(results) || !results.length) {
        setAutoAddressMessage("No matching address found.");
        return;
      }

      const mapped = mapNominatimToForm(results[0]);
      applyAddressResult(mapped);
      setAutoAddressMessage("Address auto-filled from lookup result.");
    } catch (err) {
      setAutoAddressMessage(err?.message || "Could not auto-fill address from lookup.");
    } finally {
      setAutoAddressBusy(false);
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
        <div className="form-row" style={{ marginBottom: 8 }}>
          <div className="form-group" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAutoAddressFromLookup}
              disabled={saving || autoAddressBusy}
            >
              {autoAddressBusy ? "Looking up..." : "Auto-Fill Address"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAutoAddressFromCurrentLocation}
              disabled={saving || autoAddressBusy}
            >
              Use Current Location
            </button>
            {autoAddressMessage && (
              <span style={{ fontSize: "0.85rem", color: "var(--color-gray-500)" }}>{autoAddressMessage}</span>
            )}
            {Number.isFinite(form.latitude) && Number.isFinite(form.longitude) && (
              <span style={{ fontSize: "0.8rem", color: "var(--color-gray-500)" }}>
                Coords saved: {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
              </span>
            )}
          </div>
        </div>
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
