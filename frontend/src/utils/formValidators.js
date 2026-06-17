/**
 * Frontend form validation helpers.
 * Mirrors the backend validators.py rules.
 */

export function validate_email_format(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Password must be at least 8 characters, include one uppercase,
 * one lowercase, and one digit.
 */
export function validate_password_strength(password) {
  if (!password || password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

export function validate_phone_format(phone) {
  if (!phone) return true; // optional field
  return /^\+?[\d\s\-().]{7,20}$/.test(phone.trim());
}
