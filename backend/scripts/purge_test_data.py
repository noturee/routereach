"""Purge test applicants and outreach locations.

Default mode is dry-run: prints what would be deleted.
Use --apply to commit deletions.

Examples:
  python scripts/purge_test_data.py
  python scripts/purge_test_data.py --apply
  python scripts/purge_test_data.py --owner "Charisma DeZonie" --name "Julian Boyd" --name "Kiza Roge" --apply
    python scripts/purge_test_data.py --locations-only --apply
"""

from __future__ import annotations

import argparse
import re
from typing import Iterable

from app import create_app
from extensions import db
from models.applicant import Applicant
from models.outreach_location import OutreachLocation
from models.user import User


TEST_MARKERS = (
    "test",
    "demo",
    "dummy",
    "sample",
    "fake",
    "qa",
    "asdf",
    "qwerty",
)

MARKER_REGEX = re.compile(r"\b(" + "|".join(TEST_MARKERS) + r")\b", re.IGNORECASE)


def _norm(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()


def _has_test_marker(values: Iterable[object]) -> bool:
    for value in values:
        text = _norm(value)
        if text and MARKER_REGEX.search(text):
            return True
    return False


def _resolve_owner_ids(owner: str | None) -> set[int]:
    if not owner:
        return set()

    owner_key = _norm(owner)
    users = User.query.all()
    ids: set[int] = set()
    for user in users:
        full_name = _norm(f"{user.first_name} {user.last_name}")
        if owner_key in {full_name, _norm(user.email)}:
            ids.add(user.id)
    return ids


def _explicit_name_set(names: list[str]) -> set[str]:
    return {_norm(n) for n in names if _norm(n)}


def _match_applicant(applicant: Applicant, owner_ids: set[int], explicit_names: set[str]) -> tuple[bool, str]:
    full_name = _norm(f"{applicant.first_name} {applicant.last_name}")

    if full_name in explicit_names:
        return True, "explicit-name"

    if _has_test_marker(
        [
            applicant.first_name,
            applicant.middle_name,
            applicant.last_name,
            applicant.full_name_original,
            applicant.email,
            applicant.phone,
            applicant.address,
            applicant.city,
            applicant.state,
            applicant.county,
            applicant.zip_code,
            applicant.source,
            applicant.import_source,
            applicant.referral_source,
            applicant.tracking_number,
            applicant.notes,
        ]
    ):
        return True, "test-marker"

    if owner_ids and applicant.assigned_oa_id in owner_ids and _has_test_marker([
        applicant.notes,
        applicant.source,
        applicant.import_source,
        applicant.referral_source,
    ]):
        return True, "owner-linked-test-marker"

    return False, ""
def _match_location(
    location: OutreachLocation,
    owner_ids: set[int],
    explicit_location_names: set[str],
) -> tuple[bool, str]:
    if _norm(location.location_name) in explicit_location_names:
        return True, "explicit-location-name"

    if _has_test_marker(
        [
            location.location_name,
            location.location_type,
            location.address,
            location.city,
            location.state,
            location.county,
            location.zip_code,
            location.contact_person,
            location.contact_title,
            location.contact_email,
            location.contact_phone,
            location.notes,
        ]
    ):
        return True, "test-marker"

    if owner_ids and (
        location.created_by_user_id in owner_ids or location.assigned_oa_id in owner_ids
    ) and _has_test_marker([location.notes, location.location_name]):
        return True, "owner-linked-test-marker"

    return False, ""


def main() -> int:
    parser = argparse.ArgumentParser(description="Purge test applicants and outreach locations")
    parser.add_argument("--apply", action="store_true", help="Actually delete matched records")
    parser.add_argument(
        "--locations-only",
        action="store_true",
        help="Only match and delete outreach locations",
    )
    parser.add_argument(
        "--owner",
        default=None,
        help="Optional owner match by full name or email (example: 'Charisma DeZonie')",
    )
    parser.add_argument(
        "--name",
        action="append",
        default=[],
        help="Explicit applicant full name to include (can be repeated)",
    )
    parser.add_argument(
        "--location-name",
        action="append",
        default=[],
        help="Explicit location name to include (can be repeated)",
    )
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        owner_ids = _resolve_owner_ids(args.owner)
        explicit_names = _explicit_name_set(args.name)
        explicit_location_names = _explicit_name_set(args.location_name)

        applicants = [] if args.locations_only else Applicant.query.all()
        locations = OutreachLocation.query.all()

        applicants_to_delete: list[tuple[Applicant, str]] = []
        for applicant in applicants:
            matched, reason = _match_applicant(applicant, owner_ids, explicit_names)
            if matched:
                applicants_to_delete.append((applicant, reason))

        locations_to_delete: list[tuple[OutreachLocation, str]] = []
        for location in locations:
            matched, reason = _match_location(location, owner_ids, explicit_location_names)
            if matched:
                locations_to_delete.append((location, reason))

        print("=== Test Data Cleanup Preview ===")
        print(f"Owner filter: {args.owner or 'none'}")
        print(f"Matched applicants: {len(applicants_to_delete)}")
        for applicant, reason in applicants_to_delete:
            print(
                f"  applicant id={applicant.id} name={applicant.first_name} {applicant.last_name} reason={reason}"
            )

        print(f"Matched locations: {len(locations_to_delete)}")
        for location, reason in locations_to_delete:
            print(f"  location id={location.id} name={location.location_name} reason={reason}")

        if not args.apply:
            print("Dry-run only. Re-run with --apply to commit deletions.")
            return 0

        for applicant, _ in applicants_to_delete:
            db.session.delete(applicant)

        for location, _ in locations_to_delete:
            db.session.delete(location)

        db.session.commit()
        print("Deletion committed.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
