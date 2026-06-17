/**
 * OutreachRoute Pro — Frontend Permission Utilities
 *
 * These mirror the backend permission rules so the UI can hide/show
 * elements based on the current user's role.
 * The backend always re-validates — these are UI helpers only.
 */

const ADMIN_ROLES = new Set([
  "master_admin",
  "national_admin",
  "regional_admin",
  "state_admin",
  "local_admin",
]);

/**
 * Return true if the user has any admin-level role.
 */
export function isAdmin(user) {
  return user ? ADMIN_ROLES.has(user.role) : false;
}

/**
 * Return true if the user is a master admin.
 */
export function isMasterAdmin(user) {
  return user?.role === "master_admin";
}

/**
 * Return true if the user can manage other users (create/edit/deactivate).
 */
export function canManageUsers(user) {
  return isAdmin(user);
}

/**
 * Return true if the user can view the team performance dashboard.
 */
export function canViewTeamPerformance(user) {
  return isAdmin(user);
}

/**
 * Return true if the user can manage territory assignments.
 */
export function canManageTerritories(user) {
  return isAdmin(user);
}

/**
 * Return true if the user can view a given applicant.
 * Admins see all; OA users only see assigned applicants.
 */
export function canViewApplicant(user, applicant) {
  if (!user || !applicant) return false;
  if (isAdmin(user)) return true;
  return applicant.assigned_oa_id === user.id;
}

/**
 * Return true if the user can edit a given applicant's record.
 */
export function canEditApplicant(user, applicant) {
  return canViewApplicant(user, applicant);
}
