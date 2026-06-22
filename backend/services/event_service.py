"""
OutreachRoute Pro — Event Service

Handles event management, recurring event generation, and event tracking.
"""

from datetime import datetime, timedelta, timezone, date
from dateutil.rrule import rrule, DAILY, WEEKLY, MONTHLY, YEARLY
from models.event import Event
from extensions import db


class EventService:
    """Service for managing events and recurring event patterns."""

    @staticmethod
    def create_event(
        oa_user_id: int,
        event_name: str,
        event_date: date,
        event_time=None,
        timezone_str: str = "UTC",
        description: str = None,
        is_recurring: bool = False,
        recurrence_frequency: str = None,
        recurrence_days: str = None,
        recurrence_end_date: date = None,
        max_occurrences: int = None,
        event_type: str = None,
        location: str = None,
        event_link: str = None,
        notes: str = None,
        status: str = "scheduled",
    ) -> Event:
        """
        Create a new event.

        Args:
            oa_user_id: ID of the user creating the event
            event_name: Name of the event
            event_date: Date of the event
            event_time: Time of the event (optional)
            timezone_str: Timezone for the event
            description: Event description
            is_recurring: Whether this is a recurring event
            recurrence_frequency: daily, weekly, biweekly, monthly, yearly
            recurrence_days: Comma-separated days for weekly recurrence
            recurrence_end_date: End date for recurring event
            max_occurrences: Maximum number of occurrences for recurring event
            event_type: Category or type of event
            location: Physical or virtual location
            event_link: Link for virtual events
            notes: Additional notes
            status: Event status (scheduled, completed, cancelled)

        Returns:
            Created Event object
        """
        event = Event(
            oa_user_id=oa_user_id,
            event_name=event_name,
            event_date=event_date,
            event_time=event_time,
            timezone=timezone_str,
            description=description,
            is_recurring=is_recurring,
            recurrence_frequency=recurrence_frequency,
            recurrence_days=recurrence_days,
            recurrence_end_date=recurrence_end_date,
            max_occurrences=max_occurrences,
            event_type=event_type,
            location=location,
            event_link=event_link,
            notes=notes,
            status=status,
        )

        db.session.add(event)
        db.session.commit()

        return event

    @staticmethod
    def update_event(event_id: int, **kwargs) -> Event:
        """
        Update an event.

        Args:
            event_id: ID of the event to update
            **kwargs: Fields to update

        Returns:
            Updated Event object
        """
        event = Event.query.get(event_id)
        if not event:
            raise ValueError(f"Event {event_id} not found")

        # Update allowed fields
        allowed_fields = {
            "event_name",
            "description",
            "event_date",
            "event_time",
            "timezone",
            "is_recurring",
            "recurrence_frequency",
            "recurrence_days",
            "recurrence_end_date",
            "max_occurrences",
            "occurrences_count",
            "status",
            "event_type",
            "location",
            "event_link",
            "notes",
        }

        for key, value in kwargs.items():
            if key in allowed_fields:
                setattr(event, key, value)

        db.session.commit()
        return event

    @staticmethod
    def get_event(event_id: int) -> Event:
        """Get a single event by ID."""
        return Event.query.get(event_id)

    @staticmethod
    def get_user_events(
        oa_user_id: int,
        start_date: date = None,
        end_date: date = None,
        event_type: str = None,
        status: str = None,
        include_recurring: bool = True,
    ) -> list:
        """
        Get events for a user with optional filtering.

        Args:
            oa_user_id: ID of the user
            start_date: Filter events from this date
            end_date: Filter events until this date
            event_type: Filter by event type
            status: Filter by event status
            include_recurring: Include recurring events

        Returns:
            List of events
        """
        query = Event.query.filter_by(oa_user_id=oa_user_id)

        if not include_recurring:
            query = query.filter_by(is_recurring=False)

        if event_type:
            query = query.filter_by(event_type=event_type)

        if status:
            query = query.filter_by(status=status)

        if start_date:
            query = query.filter(Event.event_date >= start_date)

        if end_date:
            query = query.filter(Event.event_date <= end_date)

        return query.order_by(Event.event_date, Event.event_time).all()

    @staticmethod
    def get_recurring_events(oa_user_id: int) -> list:
        """Get all recurring events for a user."""
        return Event.query.filter_by(
            oa_user_id=oa_user_id, is_recurring=True
        ).all()

    @staticmethod
    def delete_event(event_id: int) -> bool:
        """Delete an event."""
        event = Event.query.get(event_id)
        if not event:
            raise ValueError(f"Event {event_id} not found")

        db.session.delete(event)
        db.session.commit()
        return True

    @staticmethod
    def generate_recurring_occurrences(
        event: Event, max_instances: int = 12
    ) -> list:
        """
        Generate future occurrences of a recurring event.

        Args:
            event: The recurring Event object
            max_instances: Maximum number of future instances to generate

        Returns:
            List of datetime objects for future occurrences
        """
        if not event.is_recurring or not event.recurrence_frequency:
            return []

        # Map frequency string to dateutil rrule frequency
        frequency_map = {
            "daily": DAILY,
            "weekly": WEEKLY,
            "biweekly": WEEKLY,
            "monthly": MONTHLY,
            "yearly": YEARLY,
        }

        freq = frequency_map.get(event.recurrence_frequency)
        if not freq:
            return []

        # Build start datetime
        start_dt = datetime.combine(event.event_date, event.event_time or datetime.min.time())

        # Handle biweekly as WEEKLY with interval=2
        interval = 2 if event.recurrence_frequency == "biweekly" else 1

        # Handle byweekday for weekly recurrence
        byweekday = None
        if event.recurrence_frequency in ["weekly", "biweekly"] and event.recurrence_days:
            # Parse recurrence_days (e.g., "Monday,Wednesday,Friday")
            days = event.recurrence_days.split(",")
            day_map = {
                "Monday": 0,
                "Tuesday": 1,
                "Wednesday": 2,
                "Thursday": 3,
                "Friday": 4,
                "Saturday": 5,
                "Sunday": 6,
            }
            byweekday = [day_map[day.strip()] for day in days if day.strip() in day_map]

        # Build rrule kwargs
        rrule_kwargs = {
            "dtstart": start_dt,
            "freq": freq,
            "interval": interval,
            "count": max_instances,
        }

        if event.recurrence_end_date:
            rrule_kwargs["until"] = datetime.combine(
                event.recurrence_end_date, datetime.max.time()
            )

        if event.max_occurrences:
            rrule_kwargs["count"] = event.max_occurrences

        if byweekday is not None:
            rrule_kwargs["byweekday"] = byweekday

        # Generate occurrences
        rule = rrule(**rrule_kwargs)
        occurrences = list(rule)

        return occurrences

    @staticmethod
    def mark_completed(event_id: int) -> Event:
        """Mark an event as completed and increment occurrence count."""
        event = EventService.update_event(
            event_id,
            status="completed",
            occurrences_count=Event.query.get(event_id).occurrences_count + 1,
        )
        return event

    @staticmethod
    def cancel_event(event_id: int) -> Event:
        """Cancel an event."""
        return EventService.update_event(event_id, status="cancelled")

    @staticmethod
    def get_upcoming_events(oa_user_id: int, days_ahead: int = 7) -> list:
        """
        Get upcoming events for a user.

        Args:
            oa_user_id: ID of the user
            days_ahead: Number of days to look ahead

        Returns:
            List of upcoming events
        """
        today = date.today()
        future_date = today + timedelta(days=days_ahead)

        return EventService.get_user_events(
            oa_user_id, start_date=today, end_date=future_date, status="scheduled"
        )
