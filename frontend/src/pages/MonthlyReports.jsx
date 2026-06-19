/**
 * MonthlyReports — Generate, edit, preview, and export monthly reports.
 */
import React, { useEffect, useMemo, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import ReportExportButtons from "../components/ReportExportButtons.jsx";
import OutreachAdmissionsMonthlyReportPreview from "../components/reports/OutreachAdmissionsMonthlyReportPreview.jsx";
import apiClient from "../api/apiClient.js";
import { useAuth } from "../auth/AuthContext.jsx";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const STRUCTURED_REPORT_TYPE = "OUTREACH_ADMISSIONS_MONTHLY_REPORT";
const LEGACY_REPORT_TYPE = "LEGACY_MONTHLY_REPORT";
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth();

const LEGACY_SECTION_FIELDS = [
  { key: "summary", title: "Monthly Summary" },
  { key: "applicant_activity", title: "Applicant Activity" },
  { key: "outreach_activity", title: "Outreach Activity" },
  { key: "communication_activity", title: "Communication Activity" },
  { key: "county_breakdown", title: "County Breakdown" },
  { key: "barriers", title: "Barriers" },
  { key: "performance_analysis", title: "Performance Analysis" },
  { key: "next_month_strategy", title: "Next Month Strategy" },
];

const REPORT_TYPE_OPTIONS = [
  {
    value: STRUCTURED_REPORT_TYPE,
    label: "Outreach & Admissions Monthly Report",
    description: "Structured report with editable tables, totals, preview, and Word export.",
  },
  {
    value: LEGACY_REPORT_TYPE,
    label: "Legacy Monthly Report",
    description: "Narrative monthly report using the older freeform sections.",
  },
];

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function emptyLegacyDraft() {
  return LEGACY_SECTION_FIELDS.reduce((draft, section) => {
    draft[section.key] = "";
    return draft;
  }, {});
}

function blankStructuredReport(monthIndex, year, counselor = "") {
  return {
    reportType: STRUCTURED_REPORT_TYPE,
    title: "Outreach & Admissions Monthly Report",
    header: {
      oaCounselor: counselor,
      monthYearReporting: `${MONTHS[monthIndex]} ${year}`,
      center: "",
      countiesCovered: "",
    },
    applicants: [
      {
        id: createId("applicant"),
        applicant: "",
        gender: "",
        age: "",
        trade: "",
        center: "",
        status: "",
      },
    ],
    totals: {
      totalApplicationsSubmitted: 0,
      femaleApplicants: 0,
      maleApplicants: 0,
      centersUtilized: 0,
      centerDistribution: "",
      confirmedArrivals: 0,
      scheduledArrivals: 0,
      applicantInterviews: 0,
      workforceVisitsMeetings: 0,
      schoolOutreachActivities: 0,
      communityCivicEngagementActivities: 0,
      campusVisits: 0,
    },
    addendumGoals: {
      obs: { strategies: "", outcomes: "" },
      partnerCollaboration: { strategies: "", outcomes: "" },
    },
    operationalContext: "",
    familyEngagement: [{ id: createId("family"), date: "", activity: "" }],
    outreachActivities: [{ id: createId("outreach"), date: "", activity: "" }],
    communityServiceVisibility: {
      communityServiceEvents: "",
      marketingVisibility: "",
      tradesBookletQrCodeUsage: "",
      busOrBillboardAdvertising: "",
    },
    strategicRelationshipDevelopment: [],
    upcomingInitiatives: {
      juneInitiatives: "",
      julyInitiatives: "",
      jobCorpsInformationSymposium: "",
    },
    monthlyImpactStatement: "",
  };
}

function safeText(value) {
  return value === null || value === undefined ? "" : String(value);
}

function setNestedValue(source, path, value) {
  const segments = path.split(".");
  const next = Array.isArray(source) ? [...source] : { ...source };
  let cursor = next;

  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      cursor[segment] = value;
      return;
    }

    const existing = cursor[segment];
    cursor[segment] = Array.isArray(existing) ? [...existing] : { ...(existing || {}) };
    cursor = cursor[segment];
  });

  return next;
}

function deriveApplicantTotals(applicants) {
  const validRows = (applicants || []).filter((row) => safeText(row.applicant).trim());
  const centers = validRows.map((row) => safeText(row.center).trim()).filter(Boolean);
  const femaleCount = validRows.filter((row) => safeText(row.gender).trim().toLowerCase().startsWith("f")).length;
  const maleCount = validRows.filter((row) => safeText(row.gender).trim().toLowerCase().startsWith("m")).length;
  const centerCounts = centers.reduce((accumulator, center) => {
    accumulator[center] = (accumulator[center] || 0) + 1;
    return accumulator;
  }, {});

  return {
    totalApplicationsSubmitted: validRows.length,
    femaleApplicants: femaleCount,
    maleApplicants: maleCount,
    centersUtilized: Object.keys(centerCounts).length,
    centerDistribution: Object.entries(centerCounts)
      .map(([center, count]) => `${center}: ${count}`)
      .join("\n"),
  };
}

function syncDerivedTotals(reportData) {
  return {
    ...reportData,
    totals: {
      ...reportData.totals,
      ...deriveApplicantTotals(reportData.applicants),
    },
  };
}

function normalizeStructuredReportData(reportData, monthIndex, year, counselor = "") {
  const blank = blankStructuredReport(monthIndex, year, counselor);
  if (!reportData || typeof reportData !== "object") {
    return blank;
  }

  const merged = {
    ...blank,
    ...reportData,
    header: {
      ...blank.header,
      ...(reportData.header || {}),
      monthYearReporting: reportData?.header?.monthYearReporting || `${MONTHS[monthIndex]} ${year}`,
    },
    totals: {
      ...blank.totals,
      ...(reportData.totals || {}),
    },
    addendumGoals: {
      obs: {
        ...blank.addendumGoals.obs,
        ...(reportData.addendumGoals?.obs || {}),
      },
      partnerCollaboration: {
        ...blank.addendumGoals.partnerCollaboration,
        ...(reportData.addendumGoals?.partnerCollaboration || {}),
      },
    },
    communityServiceVisibility: {
      ...blank.communityServiceVisibility,
      ...(reportData.communityServiceVisibility || {}),
    },
    upcomingInitiatives: {
      ...blank.upcomingInitiatives,
      ...(reportData.upcomingInitiatives || {}),
    },
  };

  merged.applicants = Array.isArray(reportData.applicants) && reportData.applicants.length
    ? reportData.applicants.map((row, index) => ({
        id: row.id || createId(`applicant-${index}`),
        applicant: safeText(row.applicant),
        gender: safeText(row.gender),
        age: safeText(row.age),
        trade: safeText(row.trade),
        center: safeText(row.center),
        status: safeText(row.status),
      }))
    : blank.applicants;

  merged.familyEngagement = Array.isArray(reportData.familyEngagement) && reportData.familyEngagement.length
    ? reportData.familyEngagement.map((row, index) => ({
        id: row.id || createId(`family-${index}`),
        date: safeText(row.date),
        activity: safeText(row.activity),
      }))
    : blank.familyEngagement;

  merged.outreachActivities = Array.isArray(reportData.outreachActivities) && reportData.outreachActivities.length
    ? reportData.outreachActivities.map((row, index) => ({
        id: row.id || createId(`outreach-${index}`),
        date: safeText(row.date),
        activity: safeText(row.activity),
      }))
    : blank.outreachActivities;

  merged.strategicRelationshipDevelopment = Array.isArray(reportData.strategicRelationshipDevelopment)
    ? reportData.strategicRelationshipDevelopment.map((item) => safeText(item)).filter(Boolean)
    : safeText(reportData.strategicRelationshipDevelopment)
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);

  return syncDerivedTotals(merged);
}

function reportLabel(report) {
  const monthLabel = MONTHS[(report.month || 1) - 1] || `Month ${report.month}`;
  const baseLabel = report.display_name || `${monthLabel} ${report.year}`;
  const typeLabel = report.report_type === STRUCTURED_REPORT_TYPE ? "Structured" : "Legacy";
  return `${baseLabel} · ${typeLabel}`;
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function filenameFromDisposition(disposition, fallbackName) {
  if (!disposition) {
    return fallbackName;
  }

  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition);
  return decodeURIComponent(match?.[1] || match?.[2] || fallbackName);
}

function RowEditor({ row, fields, onChange, onRemove, removeDisabled }) {
  return (
    <div className="report-row-editor">
      {fields.map((field) => (
        <label key={field.key} className="report-field">
          <span>{field.label}</span>
          {field.multiline ? (
            <textarea
              className="form-textarea"
              rows={field.rows || 2}
              value={row[field.key] || ""}
              onChange={(event) => onChange(row.id, field.key, event.target.value)}
            />
          ) : (
            <input
              className="form-input"
              value={row[field.key] || ""}
              onChange={(event) => onChange(row.id, field.key, event.target.value)}
            />
          )}
        </label>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => onRemove(row.id)} disabled={removeDisabled}>
        Remove
      </button>
    </div>
  );
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="section-header section-header-spread">
      <div>
        <h3 className="section-title">{title}</h3>
        {description && <p className="section-description">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export default function MonthlyReports() {
  const { user } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [reportType, setReportType] = useState(STRUCTURED_REPORT_TYPE);
  const [reports, setReports] = useState([]);
  const [activeReportId, setActiveReportId] = useState(null);
  const [structuredReport, setStructuredReport] = useState(blankStructuredReport(currentMonth, currentYear));
  const [legacyDraft, setLegacyDraft] = useState(emptyLegacyDraft());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const activeReport = useMemo(
    () => reports.find((report) => report.id === activeReportId) || null,
    [reports, activeReportId]
  );

  useEffect(() => {
    setLoading(true);
    apiClient
      .get(`/monthly-reports?year=${year}`)
      .then((response) => setReports(response.data.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => {
    if (!activeReport) {
      setStructuredReport(blankStructuredReport(month, year, user ? `${user.first_name} ${user.last_name}` : ""));
      setLegacyDraft(emptyLegacyDraft());
      return;
    }

    setMonth(Math.max(0, (activeReport.month || 1) - 1));
    setYear(activeReport.year || currentYear);
    setReportType(activeReport.report_type || STRUCTURED_REPORT_TYPE);

    if (activeReport.report_type === STRUCTURED_REPORT_TYPE) {
      setStructuredReport(
        normalizeStructuredReportData(
          activeReport.report_data,
          (activeReport.month || 1) - 1,
          activeReport.year || currentYear,
          activeReport.report_data?.header?.oaCounselor || ""
        )
      );
    } else {
      const nextLegacy = emptyLegacyDraft();
      LEGACY_SECTION_FIELDS.forEach((section) => {
        nextLegacy[section.key] = activeReport[section.key] || "";
      });
      setLegacyDraft(nextLegacy);
    }
  }, [activeReport, month, year, user]);

  useEffect(() => {
    if (activeReportId || reportType !== STRUCTURED_REPORT_TYPE) {
      return;
    }

    setStructuredReport((previous) => ({
      ...previous,
      header: {
        ...previous.header,
        monthYearReporting: `${MONTHS[month]} ${year}`,
      },
    }));
  }, [activeReportId, month, year, reportType]);

  const activeIsStructured = (activeReport?.report_type || reportType) === STRUCTURED_REPORT_TYPE;

  const generateReport = async () => {
    setError("");
    setStatusMessage("");
    try {
      const response = await apiClient.post("/monthly-reports/generate", {
        month: month + 1,
        year,
        report_type: reportType,
        oa_counselor: user ? `${user.first_name} ${user.last_name}` : "",
      });
      const generated = response.data.report;
      setStatusMessage("Report generated successfully.");
      setActiveReportId(generated.id);
      await apiClient.get(`/monthly-reports?year=${year}`).then((response) => setReports(response.data.reports || []));
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Failed to generate report.");
    }
  };

  const saveReport = async () => {
    if (!activeReportId) {
      return;
    }

    setSaving(true);
    setError("");
    setStatusMessage("");
    try {
      if (activeIsStructured) {
        await apiClient.put(`/monthly-reports/${activeReportId}`, {
          report_type: STRUCTURED_REPORT_TYPE,
          report_data: structuredReport,
          territory: structuredReport.header.center,
        });
      } else {
        await apiClient.put(`/monthly-reports/${activeReportId}`, {
          report_type: LEGACY_REPORT_TYPE,
          ...legacyDraft,
        });
      }
      setStatusMessage("Report saved successfully.");
      const response = await apiClient.get(`/monthly-reports?year=${year}`);
      setReports(response.data.reports || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Failed to save report.");
    } finally {
      setSaving(false);
    }
  };

  const exportReportFile = async (suffix, mime, fallbackExtension) => {
    if (!activeReportId) {
      return;
    }

    try {
      const response = await apiClient.get(`/monthly-reports/${activeReportId}/export-${suffix}`, {
        responseType: "blob",
      });
      const fallbackName = `monthly_report_${year}_${String(month + 1).padStart(2, "0")}.${fallbackExtension}`;
      const fileName = filenameFromDisposition(
        response.headers?.["content-disposition"] || response.headers?.["Content-Disposition"],
        fallbackName
      );
      downloadBlob(new Blob([response.data], { type: mime }), fileName);
      setStatusMessage(`Exported ${fileName}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.error || `Failed to export ${suffix.toUpperCase()}.`);
    }
  };

  const updateStructuredField = (path, value) => {
    setStructuredReport((previous) => setNestedValue(previous, path, value));
  };

  const updateApplicantRow = (rowId, field, value) => {
    setStructuredReport((previous) => syncDerivedTotals({
      ...previous,
      applicants: previous.applicants.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    }));
  };

  const addApplicantRow = () => {
    setStructuredReport((previous) => syncDerivedTotals({
      ...previous,
      applicants: [
        ...previous.applicants,
        {
          id: createId("applicant"),
          applicant: "",
          gender: "",
          age: "",
          trade: "",
          center: "",
          status: "",
        },
      ],
    }));
  };

  const removeApplicantRow = (rowId) => {
    setStructuredReport((previous) => syncDerivedTotals({
      ...previous,
      applicants: previous.applicants.filter((row) => row.id !== rowId) || previous.applicants,
    }));
  };

  const updateActivityRow = (collection, rowId, field, value) => {
    setStructuredReport((previous) => ({
      ...previous,
      [collection]: previous[collection].map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    }));
  };

  const addActivityRow = (collection, prefix) => {
    setStructuredReport((previous) => ({
      ...previous,
      [collection]: [
        ...previous[collection],
        {
          id: createId(prefix),
          date: "",
          activity: "",
        },
      ],
    }));
  };

  const removeActivityRow = (collection, rowId, prefix) => {
    setStructuredReport((previous) => ({
      ...previous,
      [collection]: previous[collection].filter((row) => row.id !== rowId) || [{ id: createId(prefix), date: "", activity: "" }],
    }));
  };

  const updateLegacyField = (field, value) => {
    setLegacyDraft((previous) => ({ ...previous, [field]: value }));
  };

  const structuredEditor = (
    <section className="section report-structured-shell">
      <SectionHeader
        title="Structured report editor"
        description="Edit the tables, totals, and narrative sections before saving the report."
        action={
          <button type="button" className="btn btn-primary" onClick={saveReport} disabled={!activeReportId || saving}>
            {saving ? "Saving..." : "Save Report"}
          </button>
        }
      />

      <div className="report-editor-grid">
        <div className="report-editor-card">
          <h3 className="report-preview-card-title">Header</h3>
          <div className="report-field-stack">
            {[
              ["header.oaCounselor", "OA Counselor", "input"],
              ["header.monthYearReporting", "Month/Year Reporting", "input"],
              ["header.center", "Center", "input"],
              ["header.countiesCovered", "Counties Covered", "textarea"],
            ].map(([path, label, type]) => (
              <label key={path} className="report-field">
                <span>{label}</span>
                {type === "textarea" ? (
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={path.split(".").reduce((acc, key) => acc?.[key], structuredReport) || ""}
                    onChange={(event) => updateStructuredField(path, event.target.value)}
                    disabled={!activeReportId || loading}
                  />
                ) : (
                  <input
                    className="form-input"
                    value={path.split(".").reduce((acc, key) => acc?.[key], structuredReport) || ""}
                    onChange={(event) => updateStructuredField(path, event.target.value)}
                    disabled={!activeReportId || loading}
                  />
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="report-editor-card">
          <h3 className="report-preview-card-title">Totals</h3>
          <div className="report-totals-grid">
            {[
              ["totalApplicationsSubmitted", "Applications Submitted"],
              ["femaleApplicants", "Female Applicants"],
              ["maleApplicants", "Male Applicants"],
              ["centersUtilized", "Centers Utilized"],
              ["confirmedArrivals", "Confirmed Arrivals"],
              ["scheduledArrivals", "Scheduled Arrivals"],
              ["applicantInterviews", "Applicant Interviews"],
              ["workforceVisitsMeetings", "Workforce Visits / Meetings"],
              ["schoolOutreachActivities", "School Outreach Activities"],
              ["communityCivicEngagementActivities", "Community / Civic Activities"],
              ["campusVisits", "Campus Visits"],
            ].map(([field, label]) => (
              <label key={field} className="report-field">
                <span>{label}</span>
                <input
                  className="form-input"
                  value={structuredReport.totals[field] ?? ""}
                  onChange={(event) => setStructuredReport((previous) => ({
                    ...previous,
                    totals: {
                      ...previous.totals,
                      [field]: event.target.value,
                    },
                  }))}
                />
              </label>
            ))}
          </div>
          <label className="report-field" style={{ marginTop: 12 }}>
            <span>Center Distribution</span>
            <textarea
              className="form-textarea"
              rows={4}
              value={structuredReport.totals.centerDistribution}
              onChange={(event) => setStructuredReport((previous) => ({
                ...previous,
                totals: {
                  ...previous.totals,
                  centerDistribution: event.target.value,
                },
              }))}
            />
          </label>
        </div>

        <div className="report-editor-card report-editor-card-wide">
          <SectionHeader
            title="Applicant breakdown"
            description="Add or remove applicant rows. Key totals recalculate from the table automatically."
            action={<button type="button" className="btn btn-secondary" onClick={addApplicantRow}>Add Applicant</button>}
          />
          <div className="report-row-list">
            {structuredReport.applicants.map((row) => (
              <RowEditor
                key={row.id}
                row={row}
                onChange={updateApplicantRow}
                onRemove={removeApplicantRow}
                removeDisabled={structuredReport.applicants.length === 1}
                fields={[
                  { key: "applicant", label: "Applicant" },
                  { key: "gender", label: "Gender" },
                  { key: "age", label: "Age" },
                  { key: "trade", label: "Trade" },
                  { key: "center", label: "Center" },
                  { key: "status", label: "Status" },
                ]}
              />
            ))}
          </div>
        </div>

        <div className="report-editor-card">
          <SectionHeader title="Addendum goals - OBS" action={null} />
          <label className="report-field">
            <span>Strategies</span>
            <textarea
              className="form-textarea"
              rows={4}
              value={structuredReport.addendumGoals.obs.strategies}
              onChange={(event) => updateStructuredField("addendumGoals.obs.strategies", event.target.value)}
            />
          </label>
          <label className="report-field">
            <span>Outcomes</span>
            <textarea
              className="form-textarea"
              rows={4}
              value={structuredReport.addendumGoals.obs.outcomes}
              onChange={(event) => updateStructuredField("addendumGoals.obs.outcomes", event.target.value)}
            />
          </label>
        </div>

        <div className="report-editor-card">
          <SectionHeader title="Addendum goals - Partner collaboration" action={null} />
          <label className="report-field">
            <span>Strategies</span>
            <textarea
              className="form-textarea"
              rows={4}
              value={structuredReport.addendumGoals.partnerCollaboration.strategies}
              onChange={(event) => updateStructuredField("addendumGoals.partnerCollaboration.strategies", event.target.value)}
            />
          </label>
          <label className="report-field">
            <span>Outcomes</span>
            <textarea
              className="form-textarea"
              rows={4}
              value={structuredReport.addendumGoals.partnerCollaboration.outcomes}
              onChange={(event) => updateStructuredField("addendumGoals.partnerCollaboration.outcomes", event.target.value)}
            />
          </label>
        </div>

        <div className="report-editor-card report-editor-card-wide">
          <label className="report-field">
            <span>Operational Context</span>
            <textarea
              className="form-textarea"
              rows={5}
              value={structuredReport.operationalContext}
              onChange={(event) => updateStructuredField("operationalContext", event.target.value)}
            />
          </label>
        </div>

        <div className="report-editor-card report-editor-card-wide">
          <SectionHeader
            title="Applicant & family engagement"
            action={<button type="button" className="btn btn-secondary" onClick={() => addActivityRow("familyEngagement", "family")}>Add Row</button>}
          />
          <div className="report-row-list">
            {structuredReport.familyEngagement.map((row) => (
              <RowEditor
                key={row.id}
                row={row}
                onChange={(rowId, field, value) => updateActivityRow("familyEngagement", rowId, field, value)}
                onRemove={(rowId) => removeActivityRow("familyEngagement", rowId, "family")}
                removeDisabled={structuredReport.familyEngagement.length === 1}
                fields={[
                  { key: "date", label: "Date" },
                  { key: "activity", label: "Activity", multiline: true, rows: 3 },
                ]}
              />
            ))}
          </div>
        </div>

        <div className="report-editor-card report-editor-card-wide">
          <SectionHeader
            title="Outreach & admissions activities"
            action={<button type="button" className="btn btn-secondary" onClick={() => addActivityRow("outreachActivities", "outreach")}>Add Row</button>}
          />
          <div className="report-row-list">
            {structuredReport.outreachActivities.map((row) => (
              <RowEditor
                key={row.id}
                row={row}
                onChange={(rowId, field, value) => updateActivityRow("outreachActivities", rowId, field, value)}
                onRemove={(rowId) => removeActivityRow("outreachActivities", rowId, "outreach")}
                removeDisabled={structuredReport.outreachActivities.length === 1}
                fields={[
                  { key: "date", label: "Date" },
                  { key: "activity", label: "Activity", multiline: true, rows: 3 },
                ]}
              />
            ))}
          </div>
        </div>

        <div className="report-editor-card">
          <label className="report-field">
            <span>Community Service Events</span>
            <textarea
              className="form-textarea"
              rows={4}
              value={structuredReport.communityServiceVisibility.communityServiceEvents}
              onChange={(event) => updateStructuredField("communityServiceVisibility.communityServiceEvents", event.target.value)}
            />
          </label>
          <label className="report-field">
            <span>Marketing Visibility</span>
            <textarea
              className="form-textarea"
              rows={4}
              value={structuredReport.communityServiceVisibility.marketingVisibility}
              onChange={(event) => updateStructuredField("communityServiceVisibility.marketingVisibility", event.target.value)}
            />
          </label>
        </div>

        <div className="report-editor-card">
          <label className="report-field">
            <span>Trades Booklet QR Code Usage</span>
            <textarea
              className="form-textarea"
              rows={4}
              value={structuredReport.communityServiceVisibility.tradesBookletQrCodeUsage}
              onChange={(event) => updateStructuredField("communityServiceVisibility.tradesBookletQrCodeUsage", event.target.value)}
            />
          </label>
          <label className="report-field">
            <span>Bus or Billboard Advertising</span>
            <textarea
              className="form-textarea"
              rows={4}
              value={structuredReport.communityServiceVisibility.busOrBillboardAdvertising}
              onChange={(event) => updateStructuredField("communityServiceVisibility.busOrBillboardAdvertising", event.target.value)}
            />
          </label>
        </div>

        <div className="report-editor-card report-editor-card-wide">
          <label className="report-field">
            <span>Strategic Relationship Development</span>
            <textarea
              className="form-textarea"
              rows={4}
              value={structuredReport.strategicRelationshipDevelopment.join("\n")}
              onChange={(event) => updateStructuredField(
                "strategicRelationshipDevelopment",
                event.target.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
              )}
              placeholder="Enter one partner or organization per line"
            />
          </label>
        </div>

        <div className="report-editor-card">
          <label className="report-field">
            <span>June Initiatives</span>
            <textarea
              className="form-textarea"
              rows={4}
              value={structuredReport.upcomingInitiatives.juneInitiatives}
              onChange={(event) => updateStructuredField("upcomingInitiatives.juneInitiatives", event.target.value)}
            />
          </label>
          <label className="report-field">
            <span>July Initiatives</span>
            <textarea
              className="form-textarea"
              rows={4}
              value={structuredReport.upcomingInitiatives.julyInitiatives}
              onChange={(event) => updateStructuredField("upcomingInitiatives.julyInitiatives", event.target.value)}
            />
          </label>
        </div>

        <div className="report-editor-card">
          <label className="report-field">
            <span>Job Corps Information Symposium</span>
            <textarea
              className="form-textarea"
              rows={4}
              value={structuredReport.upcomingInitiatives.jobCorpsInformationSymposium}
              onChange={(event) => updateStructuredField("upcomingInitiatives.jobCorpsInformationSymposium", event.target.value)}
            />
          </label>
          <label className="report-field">
            <span>Monthly Impact Statement</span>
            <textarea
              className="form-textarea"
              rows={5}
              value={structuredReport.monthlyImpactStatement}
              onChange={(event) => updateStructuredField("monthlyImpactStatement", event.target.value)}
            />
          </label>
        </div>
      </div>
    </section>
  );

  const legacyEditor = (
    <section className="section report-structured-shell">
      <SectionHeader
        title="Legacy monthly report editor"
        description="These are the older freeform sections retained for existing reports."
        action={
          <button type="button" className="btn btn-primary" onClick={saveReport} disabled={!activeReportId || saving}>
            {saving ? "Saving..." : "Save Report"}
          </button>
        }
      />
      <div className="report-sections-preview">
        {LEGACY_SECTION_FIELDS.map((section) => (
          <div key={section.key} className="report-section-block">
            <h3 className="report-section-title">{section.title}</h3>
            <textarea
              className="form-textarea"
              rows={4}
              value={legacyDraft[section.key] || ""}
              onChange={(event) => updateLegacyField(section.key, event.target.value)}
              disabled={!activeReportId || loading}
            />
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <PageLayout title="Monthly Reports">
      <section className="section report-workbench">
        <div className="section-header section-header-spread">
          <div>
            <h2 className="section-title">Build and save a monthly report</h2>
            <p className="section-description">
              Generate a structured Outreach & Admissions report or open a legacy narrative report, then edit, preview, and export it.
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setActiveReportId(null)}>
            Start New Draft
          </button>
        </div>

        <div className="form-row report-control-grid">
          <div className="form-group">
            <label className="form-label">Month</label>
            <select className="form-select" value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {MONTHS.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Year</label>
            <select className="form-select" value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {[currentYear, currentYear - 1, currentYear - 2].map((optionYear) => (
                <option key={optionYear} value={optionYear}>
                  {optionYear}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Report Type</label>
            <select className="form-select" value={reportType} onChange={(event) => setReportType(event.target.value)}>
              {REPORT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group form-group-align-end">
            <button type="button" className="btn btn-primary" onClick={generateReport} disabled={loading}>
              {loading ? "Loading..." : "Generate Report"}
            </button>
          </div>
        </div>

        <div className="report-type-help-grid">
          {REPORT_TYPE_OPTIONS.map((option) => (
            <div key={option.value} className={`report-type-card ${reportType === option.value ? "report-type-card-active" : ""}`}>
              <strong>{option.label}</strong>
              <p>{option.description}</p>
            </div>
          ))}
        </div>

        <div className="form-row" style={{ marginTop: 12 }}>
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Existing Reports</label>
            <select
              className="form-select"
              value={activeReportId || ""}
              onChange={(event) => setActiveReportId(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">Select a report...</option>
              {reports.map((report) => (
                <option key={report.id} value={report.id}>
                  {reportLabel(report)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group form-group-align-end" style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-secondary" onClick={saveReport} disabled={!activeReportId || saving}>
              {saving ? "Saving..." : "Save Report"}
            </button>
            <ReportExportButtons
              onExportPdf={() => exportReportFile("pdf", "application/pdf", "pdf")}
              onExportWord={() => exportReportFile("word", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx")}
              onExportExcel={() => exportReportFile("excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx")}
              onExportCsv={() => exportReportFile("csv", "text/csv", "csv")}
              loading={!activeReportId}
            />
          </div>
        </div>

        {statusMessage && <div className="alert alert-success" style={{ marginTop: 10 }}>{statusMessage}</div>}
        {error && <div className="alert alert-error" style={{ marginTop: 10 }}>{error}</div>}
      </section>

      {activeReportId ? (activeIsStructured ? structuredEditor : legacyEditor) : (
        <section className="section" style={{ marginTop: 16 }}>
          <p className="section-description">
            Generate a report to start editing, or choose an existing report to reopen it.
          </p>
        </section>
      )}

      {activeReportId && activeIsStructured && (
        <section className="section" style={{ marginTop: 16 }}>
          <OutreachAdmissionsMonthlyReportPreview reportData={structuredReport} />
        </section>
      )}
    </PageLayout>
  );
}
