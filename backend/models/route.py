"""
OutreachRoute Pro — Route and RouteStop Models

A Route is a planned outreach trip for a given day.
RouteStops are the individual locations on that route, ordered by stop_order.
"""

from datetime import datetime, timezone
from extensions import db


class Route(db.Model):
    __tablename__ = "routes"

    id = db.Column(db.Integer, primary_key=True)
    route_name = db.Column(db.String(255), nullable=False)
    oa_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    route_date = db.Column(db.Date, nullable=False)
    starting_address = db.Column(db.String(255), nullable=True)

    country = db.Column(db.String(100), default="United States")
    state = db.Column(db.String(100), nullable=True)
    county = db.Column(db.String(100), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    zip_code = db.Column(db.String(10), nullable=True)

    # Status: planned | in_progress | completed | cancelled
    status = db.Column(db.String(50), default="planned")
    notes = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ────────────────────────────────────────────────────────
    oa_user = db.relationship(
        "User", foreign_keys=[oa_user_id], back_populates="routes"
    )
    stops = db.relationship(
        "RouteStop",
        back_populates="route",
        cascade="all, delete-orphan",
        order_by="RouteStop.stop_order",
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "route_name": self.route_name,
            "oa_user_id": self.oa_user_id,
            "route_date": self.route_date.isoformat() if self.route_date else None,
            "starting_address": self.starting_address,
            "state": self.state,
            "county": self.county,
            "city": self.city,
            "zip_code": self.zip_code,
            "status": self.status,
            "notes": self.notes,
            "stops": [s.to_dict() for s in self.stops],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Route {self.route_name} [{self.route_date}]>"


class RouteStop(db.Model):
    __tablename__ = "route_stops"

    id = db.Column(db.Integer, primary_key=True)
    route_id = db.Column(
        db.Integer, db.ForeignKey("routes.id"), nullable=False, index=True
    )
    outreach_location_id = db.Column(
        db.Integer, db.ForeignKey("outreach_locations.id"), nullable=False
    )
    stop_order = db.Column(db.Integer, nullable=False, default=1)
    estimated_arrival_time = db.Column(db.Time, nullable=True)
    completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # ── Relationships ────────────────────────────────────────────────────────
    route = db.relationship("Route", back_populates="stops")
    location = db.relationship("OutreachLocation", back_populates="route_stops")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "route_id": self.route_id,
            "outreach_location_id": self.outreach_location_id,
            "location": self.location.to_dict() if self.location else None,
            "stop_order": self.stop_order,
            "estimated_arrival_time": (
                self.estimated_arrival_time.isoformat()
                if self.estimated_arrival_time
                else None
            ),
            "completed": self.completed,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "notes": self.notes,
        }

    def __repr__(self):
        return f"<RouteStop #{self.stop_order} route={self.route_id}>"
