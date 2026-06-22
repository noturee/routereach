"""
OutreachRoute Pro — User Model

Stores all platform users: admins, supervisors, and OA field users.
Passwords are stored as bcrypt hashes — never plain text.
"""

from datetime import datetime, timezone
from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)

    # Role controls what this user can see and do
    # master_admin | national_admin | regional_admin | state_admin | local_admin | oa_user
    role = db.Column(db.String(50), nullable=False, default="oa_user")

    organization_name = db.Column(db.String(255), nullable=True)

    # Geographic scope — stored as comma-separated strings for flexibility
    assigned_region = db.Column(db.String(255), nullable=True)
    assigned_states = db.Column(db.Text, nullable=True)       # e.g. "TX,LA,MS"
    assigned_counties = db.Column(db.Text, nullable=True)
    assigned_cities = db.Column(db.Text, nullable=True)
    assigned_zip_codes = db.Column(db.Text, nullable=True)

    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ────────────────────────────────────────────────────────
    territories = db.relationship(
        "UserTerritory", back_populates="user", cascade="all, delete-orphan"
    )
    applicants = db.relationship(
        "Applicant", foreign_keys="Applicant.assigned_oa_id", back_populates="assigned_oa"
    )
    case_notes = db.relationship("CaseNote", back_populates="user")
    messages_sent = db.relationship("Message", back_populates="sender")
    meetings = db.relationship(
        "Meeting", foreign_keys="Meeting.oa_user_id", back_populates="oa_user"
    )
    visit_logs = db.relationship("VisitLog", back_populates="oa_user")
    routes = db.relationship(
        "Route", foreign_keys="Route.oa_user_id", back_populates="oa_user"
    )
    audit_logs = db.relationship("AuditLog", back_populates="user")
    events = db.relationship("Event", back_populates="oa_user", cascade="all, delete-orphan")

    # ── Password helpers ─────────────────────────────────────────────────────
    def set_password(self, password: str) -> None:
        """Hash and store a password. Never store plain text."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Return True if the provided password matches the stored hash."""
        return check_password_hash(self.password_hash, password)

    # ── Serialization ─────────────────────────────────────────────────────────
    def to_dict(self, include_sensitive=False) -> dict:
        data = {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "full_name": f"{self.first_name} {self.last_name}",
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "organization_name": self.organization_name,
            "assigned_region": self.assigned_region,
            "assigned_states": self.assigned_states,
            "assigned_counties": self.assigned_counties,
            "assigned_cities": self.assigned_cities,
            "assigned_zip_codes": self.assigned_zip_codes,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        return data

    def __repr__(self):
        return f"<User {self.email} [{self.role}]>"
