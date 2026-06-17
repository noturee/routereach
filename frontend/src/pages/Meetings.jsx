/**
 * Meetings — Schedule and manage virtual meetings.
 * Full implementation in Phase 14.
 */
import React from "react";
import PageLayout from "../components/PageLayout.jsx";
import DataTable from "../components/DataTable.jsx";

const COLUMNS = [
  { key: "applicant", label: "Applicant", render: (r) => r.applicant?.full_name || "—" },
  { key: "meeting_title", label: "Title" },
  { key: "meeting_type", label: "Type" },
  { key: "meeting_date", label: "Date" },
  { key: "meeting_time", label: "Time" },
  { key: "platform", label: "Platform" },
  { key: "status", label: "Status" },
];

export default function Meetings() {
  return (
    <PageLayout title="Meetings">
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Scheduled Meetings</h2>
          <button className="btn btn-primary" disabled>+ Schedule Meeting (Phase 14)</button>
        </div>
        <DataTable columns={COLUMNS} rows={[]} emptyMessage="No meetings scheduled. Meeting scheduler coming in Phase 14." />
      </section>
    </PageLayout>
  );
}
