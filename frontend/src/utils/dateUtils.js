/**
 * OutreachRoute Pro — Date Utilities
 * Formatting helpers for displaying dates and times throughout the app.
 */

/**
 * Format an ISO date string (YYYY-MM-DD) to a readable format.
 * Example: "2024-06-15" → "Jun 15, 2024"
 */
export function formatDate(isoString) {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return isoString;
  }
}

/**
 * Format an ISO datetime string to a readable date + time.
 * Example: "2024-06-15T14:30:00Z" → "Jun 15, 2024 at 2:30 PM"
 */
export function formatDateTime(isoString) {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    }).replace(",", " at");
  } catch {
    return isoString;
  }
}

/**
 * Return "X days ago", "today", "in X days" relative to today.
 */
export function relativeDate(isoString) {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = date - today;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays > 1) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  } catch {
    return isoString;
  }
}

/**
 * Return true if the date is in the past (overdue).
 */
export function isOverdue(isoString) {
  if (!isoString) return false;
  try {
    const date = new Date(isoString + "T00:00:00");
    return date < new Date();
  } catch {
    return false;
  }
}

/**
 * Return the current month and year as a display string.
 * Example: "June 2024"
 */
export function currentMonthLabel() {
  return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
