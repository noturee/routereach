/**
 * TerritoryFormModal — Create or Edit a territory.
 *
 * Props:
 *   mode: 'create' | 'edit'
 *   territory: existing territory object (required for edit)
 *   onSave: (territory) => void
 *   onClose: () => void
 */

import React, { useState, useEffect } from "react";
import Modal from "./Modal.jsx";
import apiClient from "../api/apiClient.js";

const TERRITORY_TYPES = [
  { value: "national", label: "National" },
  { value: "regional", label: "Regional" },
  { value: "state", label: "State" },
  { value: "county", label: "County" },
  { value: "city", label: "City" },
  { value: "zip", label: "ZIP Code" },
];

const US_REGIONS = [
  "Northeast", "Southeast", "Midwest", "Southwest", "West",
  "Pacific Northwest", "Mountain West", "Mid-Atlantic", "Great Plains", "Great Lakes",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC","PR","VI","GU","MP","AS",
];

const EMPTY_FORM = {
  territory_name: "",
  territory_type: "county",
  region: "",
  state: "",
  county: "",
  city: "",
  zip_code: "",
};

export default function TerritoryFormModal({ mode, territory, onSave, onClose }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit && territory) {
      setForm({
        territory_name: territory.territory_name || "",
        territory_type: territory.territory_type || "county",
        region: territory.region || "",
        state: territory.state || "",
        county: territory.county || "",
        city: territory.city || "",
        zip_code: territory.zip_code || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError("");
  }, [mode, territory, isEdit]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.territory_name.trim()) {
      return setError("Territory name is required.");
    }

    setLoading(true);
    const payload = {
      territory_name: form.territory_name.trim(),
      territory_type: form.territory_type,
      region: form.region.trim() || null,
      state: form.state.trim() || null,
      county: form.county.trim() || null,
      city: form.city.trim() || null,
      zip_code: form.zip_code.trim() || null,
    };

    try {
      let response;
      if (isEdit) {
        response = await apiClient.put(`/territories/${territory.id}`, payload);
      } else {
        response = await apiClient.post("/territories", payload);
      }
      onSave(response.data.territory);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save territory.");
    } finally {
      setLoading(false);
    }
  };

  const showStateField = ["state", "county", "city", "zip"].includes(form.territory_type);
  const showCountyField = ["county", "city", "zip"].includes(form.territory_type);
  const showCityField = ["city", "zip"].includes(form.territory_type);
  const showZipField = form.territory_type === "zip";
  const showRegionField = ["regional", "national"].includes(form.territory_type);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? `Edit — ${territory?.territory_name}` : "Create Territory"}
      size="md"
    >
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Territory Name *</label>
          <input
            className="form-input"
            value={form.territory_name}
            onChange={set("territory_name")}
            placeholder="e.g. Harris County, TX"
            disabled={loading}
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Territory Type *</label>
          <select className="form-select" value={form.territory_type} onChange={set("territory_type")} disabled={loading}>
            {TERRITORY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {showRegionField && (
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Region</label>
            <select className="form-select" value={form.region} onChange={set("region")} disabled={loading}>
              <option value="">— Select Region —</option>
              {US_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        )}

        {showStateField && (
          <div className="form-row" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">State</label>
              <select className="form-select" value={form.state} onChange={set("state")} disabled={loading}>
                <option value="">— Select State —</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {showCountyField && (
              <div className="form-group">
                <label className="form-label">County</label>
                <input
                  className="form-input"
                  value={form.county}
                  onChange={set("county")}
                  placeholder="e.g. Harris"
                  disabled={loading}
                />
              </div>
            )}
          </div>
        )}

        {showCityField && (
          <div className="form-row" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                className="form-input"
                value={form.city}
                onChange={set("city")}
                placeholder="e.g. Houston"
                disabled={loading}
              />
            </div>
            {showZipField && (
              <div className="form-group">
                <label className="form-label">ZIP Code</label>
                <input
                  className="form-input"
                  value={form.zip_code}
                  onChange={set("zip_code")}
                  placeholder="e.g. 77001"
                  maxLength={10}
                  disabled={loading}
                />
              </div>
            )}
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Territory"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
