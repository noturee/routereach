/**
 * OutreachRoute Pro — Formatting Utilities
 * Helpers for displaying numbers, rates, names, and contact info.
 */

/**
 * Format a decimal rate (0–1) as a percentage string.
 * Example: 0.674 → "67.4%"
 */
export function formatRate(value) {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format a phone number for display.
 * Example: "5551234567" → "(555) 123-4567"
 */
export function formatPhone(phone) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  }
  return phone;
}

/**
 * Truncate a string to a max length, appending "..." if truncated.
 */
export function truncate(str, maxLength = 60) {
  if (!str) return "—";
  return str.length <= maxLength ? str : str.slice(0, maxLength).trimEnd() + "...";
}

/**
 * Format a role key as a display label.
 * Example: "master_admin" → "Master Admin"
 */
export function formatRole(role) {
  const labels = {
    master_admin: "Master Admin",
    national_admin: "National Admin",
    regional_admin: "Regional Admin",
    state_admin: "State Admin",
    local_admin: "Local Admin",
    oa_user: "OA User",
  };
  return labels[role] || role;
}

/**
 * Format a number with commas.
 * Example: 1234567 → "1,234,567"
 */
export function formatNumber(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-US");
}

/**
 * Return initials from a first and last name.
 * Example: "John", "Doe" → "JD"
 */
export function initials(firstName, lastName) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}
