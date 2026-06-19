import React, { useState } from "react";
import {
  generateForm104,
  updateForm104,
  downloadForm104Pdf,
} from "../../services/form104Service";
import "../../styles/form104.css";

type Props = {
  applicantId: number;
  createdBy?: string;
};

export default function Form104Preview({ applicantId, createdBy }: Props) {
  const [reportId, setReportId] = useState<number | null>(null);
  const [content, setContent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleGenerate() {
    setLoading(true);

    try {
      const result = await generateForm104(applicantId, createdBy);
      setReportId(result.report_id);
      setContent(result.content);
    } catch (error) {
      console.error("Failed to generate Form 1-04", error);
      alert("Unable to generate Form 1-04. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!reportId || !content) return;

    setSaving(true);

    try {
      const result = await updateForm104(reportId, content);
      setContent(result.content);
      alert("Form 1-04 saved successfully.");
    } catch (error) {
      console.error("Failed to save Form 1-04", error);
      alert("Unable to save Form 1-04.");
    } finally {
      setSaving(false);
    }
  }

  function updateHeaderField(label: string, value: string) {
    setContent((prev: any) => ({
      ...prev,
      header: {
        ...prev.header,
        [label]: value,
      },
    }));
  }

  function updateSectionText(section: string, value: string) {
    setContent((prev: any) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: value,
      },
    }));
  }

  function updateNestedSection(section: string, label: string, value: string) {
    setContent((prev: any) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: {
          ...prev.sections[section],
          [label]: value,
        },
      },
    }));
  }

  return (
    <div className="report-preview">
      <div className="report-actions">
        <button onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate Form 1-04"}
        </button>

        {content && (
          <>
            <button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>

            <button
              onClick={() => reportId && downloadForm104Pdf(reportId)}
              disabled={!reportId}
            >
              Download PDF
            </button>
          </>
        )}
      </div>

      {content && (
        <div className="form-104-document">
          <h1>{content.title}</h1>

          <section>
            {Object.entries(content.header).map(([label, value]: any) => (
              <div key={label} className="form-row">
                <label>{label}</label>
                <input
                  value={value || ""}
                  onChange={(e) => updateHeaderField(label, e.target.value)}
                />
              </div>
            ))}
          </section>

          <section>
            <h2>A. APPLICANT HISTORY</h2>
            <textarea
              rows={10}
              value={content.sections["A. APPLICANT HISTORY"] || ""}
              onChange={(e) =>
                updateSectionText("A. APPLICANT HISTORY", e.target.value)
              }
            />
          </section>

          <section>
            <h2>B. GOALS</h2>
            {Object.entries(content.sections["B. GOALS"]).map(
              ([label, value]: any) => (
                <div key={label}>
                  <label>{label}</label>
                  <textarea
                    rows={4}
                    value={value || ""}
                    onChange={(e) =>
                      updateNestedSection("B. GOALS", label, e.target.value)
                    }
                  />
                </div>
              )
            )}
          </section>

          <section>
            <h2>C. NEEDS</h2>
            {Object.entries(content.sections["C. NEEDS"]).map(
              ([label, value]: any) => (
                <div key={label}>
                  <label>{label}</label>
                  <textarea
                    rows={4}
                    value={value || ""}
                    onChange={(e) =>
                      updateNestedSection("C. NEEDS", label, e.target.value)
                    }
                  />
                </div>
              )
            )}
          </section>
        </div>
      )}
    </div>
  );
}
