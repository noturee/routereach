/**
 * DataTable — Reusable sortable data table.
 *
 * Props:
 *   columns: Array<{ key: string, label: string, render?: (row) => ReactNode }>
 *   rows: Array<object>
 *   onRowClick: function (optional)
 *   emptyMessage: string (optional)
 *   loading: boolean (optional)
 */

import React, { useState } from "react";

export default function DataTable({
  columns = [],
  rows = [],
  onRowClick,
  emptyMessage = "No records found.",
  loading = false,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey] ?? "";
    const bVal = b[sortKey] ?? "";
    const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (loading) {
    return <div className="table-loading">Loading...</div>;
  }

  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`data-table-th ${col.sortable !== false ? "sortable" : ""}`}
                onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="sort-indicator">{sortDir === "asc" ? " ↑" : " ↓"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="data-table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedRows.map((row, idx) => (
              <tr
                key={row.id ?? idx}
                className={`data-table-row ${onRowClick ? "data-table-row-clickable" : ""}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className="data-table-td">
                    {col.render ? col.render(row) : row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
