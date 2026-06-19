import React from "react";

function safeText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function renderLines(value) {
  const lines = safeText(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return <p className="report-empty">No content yet.</p>;
  }

  return (
    <ul className="report-bullet-list">
      {lines.map((line, index) => (
        <li key={`${line}-${index}`}>{line}</li>
      ))}
    </ul>
  );
}

function SectionCard({ title, children, muted = false }) {
  return (
    <section className={`report-preview-card ${muted ? "report-preview-card-muted" : ""}`}>
      <h3 className="report-preview-card-title">{title}</h3>
      {children}
    </section>
  );
}

function FieldGrid({ items }) {
  return (
    <div className="report-field-grid">
      {items.map((item) => (
        <div key={item.label} className="report-field-pill">
          <span>{item.label}</span>
          <strong>{item.value || "—"}</strong>
        </div>
      ))}
    </div>
  );
}

function SimpleTable({ headers, rows, emptyMessage = "No rows yet." }) {
  return (
    <div className="report-table-wrap">
      <table className="report-preview-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${headers[0]}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`}>{cell || ""}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length} className="report-empty-cell">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function OutreachAdmissionsMonthlyReportPreview({ reportData }) {
  const header = reportData?.header || {};
  const applicants = Array.isArray(reportData?.applicants) ? reportData.applicants : [];
  const familyEngagement = Array.isArray(reportData?.familyEngagement) ? reportData.familyEngagement : [];
  const outreachActivities = Array.isArray(reportData?.outreachActivities) ? reportData.outreachActivities : [];
  const relationships = Array.isArray(reportData?.strategicRelationshipDevelopment)
    ? reportData.strategicRelationshipDevelopment
    : [];
  const totals = reportData?.totals || {};
  const goals = reportData?.addendumGoals || {};
  const visibility = reportData?.communityServiceVisibility || {};
  const initiatives = reportData?.upcomingInitiatives || {};

  return (
    <div className="report-preview-shell">
      <div className="report-preview-header">
        <div>
          <p className="report-eyebrow">Structured monthly report</p>
          <h2 className="report-preview-title">Outreach & Admissions Monthly Report</h2>
          <p className="report-preview-subtitle">
            Preview the report exactly as it will be saved, reopened, and exported.
          </p>
        </div>
        <FieldGrid
          items={[
            { label: "OA Counselor", value: header.oaCounselor },
            { label: "Reporting Period", value: header.monthYearReporting },
            { label: "Center", value: header.center },
            { label: "Counties Covered", value: header.countiesCovered },
          ]}
        />
      </div>

      <div className="report-preview-grid">
        <SectionCard title="Applicant Breakdown">
          <SimpleTable
            headers={["Applicant", "Gender", "Age", "Trade", "Center", "Status"]}
            rows={applicants.map((row) => [
              safeText(row.applicant),
              safeText(row.gender),
              safeText(row.age),
              safeText(row.trade),
              safeText(row.center),
              safeText(row.status),
            ])}
          />
        </SectionCard>

        <SectionCard title="Monthly Totals">
          <FieldGrid
            items={[
              { label: "Applications Submitted", value: totals.totalApplicationsSubmitted },
              { label: "Female Applicants", value: totals.femaleApplicants },
              { label: "Male Applicants", value: totals.maleApplicants },
              { label: "Centers Utilized", value: totals.centersUtilized },
              { label: "Confirmed Arrivals", value: totals.confirmedArrivals },
              { label: "Scheduled Arrivals", value: totals.scheduledArrivals },
              { label: "Applicant Interviews", value: totals.applicantInterviews },
              { label: "Workforce Visits / Meetings", value: totals.workforceVisitsMeetings },
              { label: "School Outreach Activities", value: totals.schoolOutreachActivities },
              { label: "Community / Civic Activities", value: totals.communityCivicEngagementActivities },
              { label: "Campus Visits", value: totals.campusVisits },
            ]}
          />
          <div className="report-inline-block">
            <h4>Center Distribution</h4>
            <p className="report-preformatted">{safeText(totals.centerDistribution) || "No center distribution yet."}</p>
          </div>
        </SectionCard>

        <SectionCard title="Addendum Goals - OBS">
          <div className="report-inline-block">
            <h4>Strategies</h4>
            {renderLines(goals?.obs?.strategies)}
          </div>
          <div className="report-inline-block">
            <h4>Outcomes</h4>
            {renderLines(goals?.obs?.outcomes)}
          </div>
        </SectionCard>

        <SectionCard title="Addendum Goals - Partner Collaboration">
          <div className="report-inline-block">
            <h4>Strategies</h4>
            {renderLines(goals?.partnerCollaboration?.strategies)}
          </div>
          <div className="report-inline-block">
            <h4>Outcomes</h4>
            {renderLines(goals?.partnerCollaboration?.outcomes)}
          </div>
        </SectionCard>

        <SectionCard title="Operational Context">
          <p className="report-preformatted">{safeText(reportData?.operationalContext) || "No operational context yet."}</p>
        </SectionCard>

        <SectionCard title="Applicant & Family Engagement">
          <SimpleTable
            headers={["Date", "Activity"]}
            rows={familyEngagement.map((row) => [safeText(row.date), safeText(row.activity)])}
          />
        </SectionCard>

        <SectionCard title="Outreach & Admissions Activities">
          <SimpleTable
            headers={["Date", "Activity"]}
            rows={outreachActivities.map((row) => [safeText(row.date), safeText(row.activity)])}
          />
        </SectionCard>

        <SectionCard title="Community Service & Visibility">
          <FieldGrid
            items={[
              { label: "Community Service Events", value: visibility.communityServiceEvents },
              { label: "Marketing Visibility", value: visibility.marketingVisibility },
              { label: "Trades Booklet QR Code", value: visibility.tradesBookletQrCodeUsage },
              { label: "Bus / Billboard Advertising", value: visibility.busOrBillboardAdvertising },
            ]}
          />
        </SectionCard>

        <SectionCard title="Strategic Relationship Development">
          {renderLines(relationships.join("\n"))}
        </SectionCard>

        <SectionCard title="Upcoming Initiatives">
          <FieldGrid
            items={[
              { label: "June Initiatives", value: initiatives.juneInitiatives },
              { label: "July Initiatives", value: initiatives.julyInitiatives },
              { label: "Information Symposium", value: initiatives.jobCorpsInformationSymposium },
            ]}
          />
        </SectionCard>

        <SectionCard title="Monthly Impact Statement" muted>
          <p className="report-preformatted">{safeText(reportData?.monthlyImpactStatement) || "No impact statement yet."}</p>
        </SectionCard>
      </div>
    </div>
  );
}
