"""
OutreachRoute Pro — Permission Helpers

Functions to check whether a user has permission to access a given record.
These are the backend enforcement layer — frontend also enforces via permissions.js.
"""

from models.user import User


ADMIN_ROLES = {"master_admin", "national_admin", "regional_admin", "state_admin", "local_admin"}


def is_admin(user: User) -> bool:
    """Return True if the user has any admin-level role."""
    return user.role in ADMIN_ROLES


def can_view_applicant(user: User, applicant) -> bool:
    """
    Return True if the user is allowed to view the given applicant.
    - Admins can see all applicants in their geographic scope.
    - OA users can only see applicants assigned to them.
    """
    if is_admin(user):
        return True
    return applicant.assigned_oa_id == user.id


def can_edit_applicant(user: User, applicant) -> bool:
    """Return True if the user can edit this applicant record."""
    if is_admin(user):
        return True
    return applicant.assigned_oa_id == user.id


def can_manage_users(user: User) -> bool:
    """Return True if the user can create/edit/deactivate other users."""
    return is_admin(user)


def can_view_all_territory(user: User) -> bool:
    """Return True if the user has master or national admin access."""
    return user.role in {"master_admin", "national_admin"}
