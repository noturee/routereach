"""
OutreachRoute Pro — Application Configuration

Reads all settings from environment variables.
Never hardcode secrets — use .env for local dev and AWS Secrets Manager for production.
"""

import os
from datetime import timedelta


class Config:
    """Base configuration — shared across all environments."""

    # ── Flask ────────────────────────────────────────────────────────────────
    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-secret-CHANGE-IN-PRODUCTION"
    DEBUG = False
    TESTING = False

    # ── Database ─────────────────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or (
        "postgresql://postgres:postgres@localhost:5432/outreachroutepro"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

    # ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or "jwt-secret-CHANGE-IN-PRODUCTION"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173")

    # ── Google Maps ───────────────────────────────────────────────────────────
    GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "")

    # ── Email ─────────────────────────────────────────────────────────────────
    EMAIL_PROVIDER = os.environ.get("EMAIL_PROVIDER", "sendgrid")  # sendgrid | ses
    SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
    FROM_EMAIL = os.environ.get("FROM_EMAIL", "")

    # Amazon SES (alternative to SendGrid)
    AWS_SES_REGION = os.environ.get("AWS_SES_REGION", "us-east-1")

    # ── Twilio SMS ────────────────────────────────────────────────────────────
    TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "")

    # ── AWS ───────────────────────────────────────────────────────────────────
    AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
    S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME", "outreachroutepro-uploads")

    # ── File Uploads ──────────────────────────────────────────────────────────
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload
    ALLOWED_UPLOAD_EXTENSIONS = {"xlsx", "xls", "csv"}


class DevelopmentConfig(Config):
    """Development environment — verbose logging, debug mode enabled."""
    DEBUG = True


class TestingConfig(Config):
    """Testing environment — uses in-memory SQLite to avoid touching real DB."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)


class ProductionConfig(Config):
    """Production environment — strict security, no debug output."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")

    # In production, CORS_ORIGINS must be explicitly set
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "")

    # Require secrets to be set via environment in production
    @classmethod
    def validate(cls):
        required = ["SECRET_KEY", "JWT_SECRET_KEY", "DATABASE_URL"]
        missing = [k for k in required if not os.environ.get(k)]
        if missing:
            raise EnvironmentError(
                f"Missing required environment variables: {', '.join(missing)}"
            )


# ── Config selector ───────────────────────────────────────────────────────────
config_by_env = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
