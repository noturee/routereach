"""
OutreachRoute Pro — Flask Extension Instances

Extensions are instantiated here without an app and later bound
to the app in create_app() via the init_app() pattern.
This avoids circular imports.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

# Shared database instance used across all models
db = SQLAlchemy()

# JWT manager for token creation and validation
jwt = JWTManager()

# Database migration manager (Flask-Migrate wraps Alembic)
migrate = Migrate()
