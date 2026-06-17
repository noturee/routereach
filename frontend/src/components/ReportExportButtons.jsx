/**
 * ReportExportButtons — PDF, Excel, CSV export button group.
 *
 * Props:
 *   onExportPdf: function
 *   onExportExcel: function
 *   onExportCsv: function
 *   loading: boolean (optional)
 */

import React from "react";

export default function ReportExportButtons({
  onExportPdf,
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
