/**
 * MonthlyReports — Generate and export monthly reports.
 * Full implementation in Phase 17.
 */
import React, { useState } from "react";
import PageLayout from "../components/PageLayout.jsx";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const currentYear = new Date().getFullYear();

export default function MonthlyReports() {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(currentYear);

  return (
    <PageLayout title="Monthly Reports">
      <section className="section">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Month</label>
            <select className="form-select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Year</label>
            <select className="form-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[currentYear, currentYear-1, currentYear-2].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group form-group-align-end">
            <button className="btn btn-primary" disabled>Generate Report (Phase 17)</button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="report-sections-preview">
          {["Monthly Summary","Applicant Activity","Communication Activity","Outreach Activity","County Breakdown","Barriers","Performance Analysis","Next Month Strategy"].map(s => (
            <div key={s} className="report-section-block">
              <h3 className="report-section-title">{s}</h3>
              <textarea className="form-textarea" rows={4} placeholder={`${s} will auto-fill from system data in Phase 17...`} disabled />
            </div>
          ))}
        </div>
      </section>
      <p className="section-coming-soon">Auto-generated monthly reports with editable narratives coming in Phase 17.</p>
    </PageLayout>
  );
}
