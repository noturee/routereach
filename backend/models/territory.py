"""
OutreachRoute Pro — Territory Model

Territories represent geographic areas (state, county, city, ZIP).
Users are assigned to territories via the UserTerritory join table.
"""

from datetime import datetime, timezone
from extensions import db


class Territory(db.Model):
    __tablename__ = "territories"

    id = db.Column(db.Integer, primary_key=True)
    territory_name = db.Column(db.String(255), nullable=False)

    # Type: national | regional | state | county | city | zip
    territory_type = db.Column(db.String(50), nullable=False, default="county")

    country = db.Column(db.String(100), default="United States")
    region = db.Column(db.String(100), nullable=True)        # e.g. Southeast
    state = db.Column(db.String(100), nullable=True)
    county = db.Column(db.String(100), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    zip_code = db.Column(db.String(10), nullable=True)

    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ────────────────────────────────────────────────────────
    user_territories = db.relationship(
        "UserTerritory", back_populates="territory", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "territory_name": self.territory_name,
            "territory_type": self.territory_type,
            "country": self.country,
            "region": self.region,
            "state": self.state,
            "county": self.county,
            "city": self.city,
            "zip_code": self.zip_code,
            "created_by_user_id": self.created_by_user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Territory {self.territory_name} [{self.territory_type}]>"


class UserTerritory(db.Model):
    """Join table linking users to their assigned territories."""
    __tablename__ = "user_territories"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    territory_id = db.Column(db.Integer, db.ForeignKey("territories.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # ── Relationships ────────────────────────────────────────────────────────
    user = db.relationship("User", back_populates="territories")
    territory = db.relationship("Territory", back_populates="user_territories")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "territory_id": self.territory_id,
            "territory": self.territory.to_dict() if self.territory else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
