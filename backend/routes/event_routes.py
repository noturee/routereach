"""
OutreachRoute Pro — Event Routes

API endpoints for managing events and recurring event tracking.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date
from services.event_service import EventService
from models.event import Event
from extensions import db


event_routes = Blueprint("events", __name__)


# ─ Create Event ────────────────────────────────────────────────────────────
@event_routes.route("/events", methods=["POST"])
@jwt_required()
def create_event():
    """
    Create a new event.

    Request body:
    {
        "event_name": str,
        "event_date": "YYYY-MM-DD",
        "event_time": "HH:MM:SS" (optional),
        "timezone": str (default: "UTC"),
        "description": str (optional),
        "is_recurring": bool,
        "recurrence_frequency": "daily|weekly|biweekly|monthly|yearly" (optional),
        "recurrence_days": "Monday,Wednesday,Friday" (optional),
        "recurrence_end_date": "YYYY-MM-DD" (optional),
        "max_occurrences": int (optional),
        "event_type": str (optional),
        "location": str (optional),
        "event_link": str (optional),
        "notes": str (optional)
    }
    """
    try:
        data = request.json or {}
        current_user_id = get_jwt_identity()

        # Validate required fields
        required = ["event_name", "event_date"]
        for field in required:
            if not data.get(field):
                return (
                    jsonify({"error": f"Missing required field: {field}"}),
                    400,
                )

        # Parse dates
        event_date = datetime.strptime(data["event_date"], "%Y-%m-%d").date()

        event_time = None
        if data.get("event_time"):
            event_time = datetime.strptime(data["event_time"], "%H:%M:%S").time()

        recurrence_end_date = None
        if data.get("recurrence_end_date"):
            recurrence_end_date = datetime.strptime(
                data["recurrence_end_date"], "%Y-%m-%d"
            ).date()

        # Create event
        event = EventService.create_event(
            oa_user_id=int(current_user_id),
            event_name=data.get("event_name"),
            event_date=event_date,
            event_time=event_time,
            timezone_str=data.get("timezone", "UTC"),
            description=data.get("description"),
            is_recurring=data.get("is_recurring", False),
            recurrence_frequency=data.get("recurrence_frequency"),
            recurrence_days=data.get("recurrence_days"),
            recurrence_end_date=recurrence_end_date,
            max_occurrences=data.get("max_occurrences"),
            event_type=data.get("event_type"),
            location=data.get("location"),
            event_link=data.get("event_link"),
            notes=data.get("notes"),
        )

        return jsonify(event.to_dict()), 201

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to create event: {str(e)}"}), 500


# ─ Get Event ───────────────────────────────────────────────────────────────
@event_routes.route("/events/<int:event_id>", methods=["GET"])
@jwt_required()
def get_event(event_id: int):
    """Get a single event by ID."""
    try:
        event = EventService.get_event(event_id)
        if not event:
            return jsonify({"error": "Event not found"}), 404

        return jsonify(event.to_dict()), 200

    except Exception as e:
        return jsonify({"error": f"Failed to retrieve event: {str(e)}"}), 500


# ─ Get User Events ─────────────────────────────────────────────────────────
@event_routes.route("/events", methods=["GET"])
@jwt_required()
def get_user_events():
    """
    Get events for the current user with optional filtering.

    Query parameters:
    - start_date: "YYYY-MM-DD" (optional)
    - end_date: "YYYY-MM-DD" (optional)
    - event_type: str (optional)
    - status: "scheduled|completed|cancelled" (optional)
    - recurring_only: bool (optional, default: false)
    """
    try:
        current_user_id = get_jwt_identity()

        # Parse optional date parameters
        start_date = None
        end_date = None
        if request.args.get("start_date"):
            start_date = datetime.strptime(
                request.args.get("start_date"), "%Y-%m-%d"
            ).date()
        if request.args.get("end_date"):
            end_date = datetime.strptime(
                request.args.get("end_date"), "%Y-%m-%d"
            ).date()

        event_type = request.args.get("event_type")
        status = request.args.get("status")
        include_recurring = request.args.get("recurring_only", "false").lower() != "true"

        events = EventService.get_user_events(
            oa_user_id=int(current_user_id),
            start_date=start_date,
            end_date=end_date,
            event_type=event_type,
            status=status,
            include_recurring=include_recurring,
        )

        return (
            jsonify([event.to_dict() for event in events]),
            200,
        )

    except Exception as e:
        return jsonify({"error": f"Failed to retrieve events: {str(e)}"}), 500


# ─ Get Upcoming Events ─────────────────────────────────────────────────────
@event_routes.route("/events/upcoming", methods=["GET"])
@jwt_required()
def get_upcoming_events():
    """
    Get upcoming events for the current user.

    Query parameters:
    - days: int (default: 7)
    """
    try:
        current_user_id = get_jwt_identity()
        days_ahead = int(request.args.get("days", 7))

        events = EventService.get_upcoming_events(
            oa_user_id=int(current_user_id), days_ahead=days_ahead
        )

        return jsonify([event.to_dict() for event in events]), 200

    except Exception as e:
        return jsonify({"error": f"Failed to retrieve upcoming events: {str(e)}"}), 500


# ─ Get Recurring Events ────────────────────────────────────────────────────
@event_routes.route("/events/recurring", methods=["GET"])
@jwt_required()
def get_recurring_events():
    """Get all recurring events for the current user."""
    try:
        current_user_id = get_jwt_identity()

        events = EventService.get_recurring_events(oa_user_id=int(current_user_id))

        return jsonify([event.to_dict() for event in events]), 200

    except Exception as e:
        return jsonify({"error": f"Failed to retrieve recurring events: {str(e)}"}), 500


# ─ Get Recurring Event Occurrences ─────────────────────────────────────────
@event_routes.route("/events/<int:event_id>/occurrences", methods=["GET"])
@jwt_required()
def get_event_occurrences(event_id: int):
    """
    Get future occurrences of a recurring event.

    Query parameters:
    - max_instances: int (default: 12)
    """
    try:
        event = EventService.get_event(event_id)
        if not event:
            return jsonify({"error": "Event not found"}), 404

        if not event.is_recurring:
            return jsonify({"error": "Event is not recurring"}), 400

        max_instances = int(request.args.get("max_instances", 12))
        occurrences = EventService.generate_recurring_occurrences(event, max_instances)

        return (
            jsonify(
                {
                    "event_id": event_id,
                    "event_name": event.event_name,
                    "is_recurring": True,
                    "occurrences": [
                        {
                            "datetime": occ.isoformat(),
                            "date": occ.date().isoformat(),
                            "time": occ.time().isoformat(),
                        }
                        for occ in occurrences
                    ],
                    "total_occurrences": len(occurrences),
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": f"Failed to generate occurrences: {str(e)}"}), 500


# ─ Update Event ────────────────────────────────────────────────────────────
@event_routes.route("/events/<int:event_id>", methods=["PUT"])
@jwt_required()
def update_event(event_id: int):
    """
    Update an event.

    Request body: Any event fields to update
    """
    try:
        event = EventService.get_event(event_id)
        if not event:
            return jsonify({"error": "Event not found"}), 404

        data = request.json or {}

        # Parse dates if provided
        if "event_date" in data and data["event_date"]:
            data["event_date"] = datetime.strptime(
                data["event_date"], "%Y-%m-%d"
            ).date()

        if "event_time" in data and data["event_time"]:
            data["event_time"] = datetime.strptime(
                data["event_time"], "%H:%M:%S"
            ).time()

        if "recurrence_end_date" in data and data["recurrence_end_date"]:
            data["recurrence_end_date"] = datetime.strptime(
                data["recurrence_end_date"], "%Y-%m-%d"
            ).date()

        # Update event
        updated_event = EventService.update_event(event_id, **data)

        return jsonify(updated_event.to_dict()), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to update event: {str(e)}"}), 500


# ─ Mark Event as Completed ────────────────────────────────────────────────
@event_routes.route("/events/<int:event_id>/complete", methods=["POST"])
@jwt_required()
def mark_event_completed(event_id: int):
    """Mark an event as completed."""
    try:
        event = EventService.get_event(event_id)
        if not event:
            return jsonify({"error": "Event not found"}), 404

        completed_event = EventService.mark_completed(event_id)

        return jsonify(completed_event.to_dict()), 200

    except Exception as e:
        return jsonify({"error": f"Failed to mark event as completed: {str(e)}"}), 500


# ─ Cancel Event ────────────────────────────────────────────────────────────
@event_routes.route("/events/<int:event_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_event(event_id: int):
    """Cancel an event."""
    try:
        event = EventService.get_event(event_id)
        if not event:
            return jsonify({"error": "Event not found"}), 404

        cancelled_event = EventService.cancel_event(event_id)

        return jsonify(cancelled_event.to_dict()), 200

    except Exception as e:
        return jsonify({"error": f"Failed to cancel event: {str(e)}"}), 500


# ─ Delete Event ────────────────────────────────────────────────────────────
@event_routes.route("/events/<int:event_id>", methods=["DELETE"])
@jwt_required()
def delete_event(event_id: int):
    """Delete an event."""
    try:
        event = EventService.get_event(event_id)
        if not event:
            return jsonify({"error": "Event not found"}), 404

        EventService.delete_event(event_id)

        return jsonify({"message": "Event deleted successfully"}), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to delete event: {str(e)}"}), 500
