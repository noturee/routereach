/**
 * ReportExportButtons — PDF, Excel, CSV export button group.
 *
 * Props:
 *   onExportPdf: function
 *   onExportWord: function
 *   onExportExcel: function
 *   onExportCsv: function
 *   loading: boolean (optional)
 */

import React from "react";

export default function ReportExportButtons({
  onExportPdf,
  onExportWord,
  onExportExcel,
  onExportCsv,
  loading = false,
}) {
  return (
    <div className="export-buttons">
      <button
        className="btn btn-export btn-export-pdf"
        onClick={onExportPdf}
        disabled={loading}
        title="Export as PDF"
      >
        📄 PDF
      </button>
      <button
        className="btn btn-export btn-export-word"
        onClick={onExportWord}
        disabled={loading}
        title="Export as Word"
      >
        📝 Word
      </button>
      <button
        className="btn btn-export btn-export-excel"
        onClick={onExportExcel}
        disabled={loading}
        title="Export as Excel"
      >
        📊 Excel
      </button>
      <button
        className="btn btn-export btn-export-csv"
        onClick={onExportCsv}
        disabled={loading}
        title="Export as CSV"
      >
        📁 CSV
      </button>
    </div>
  );
}
