"""
OutreachRoute Pro — Flask Application Entry Point

Creates and configures the Flask application using the app factory pattern.
All extensions and route blueprints are registered here.
"""

from flask import Flask, jsonify
from flask_cors import CORS
from config import config_by_env
from extensions import db, jwt, migrate
import os


def create_app(config_name=None):
    """Application factory — create and configure a Flask app instance."""
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_env[config_name])

    # ── Extensions ──────────────────────────────────────────────────────────
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}},
        supports_credentials=True,
    )

    # ── Import models so Flask-Migrate can detect them ───────────────────────
    with app.app_context():
        from models import (  # noqa: F401
            user,
            territory,
            applicant,
            applicant_report,
            applicant_document,
            application_status_history,
            outreach_location,
            visit_log,
            route,
            route_stop,
            message,
            message_template,
            meeting,
            case_note,
            performance_metric,
            monthly_report,
            audit_log,
            event,
        )

    # ── Route Blueprints ─────────────────────────────────────────────────────
    from routes.auth_routes import auth_bp
    from routes.user_routes import user_bp
    from routes.territory_routes import territory_bp
    from routes.applicant_routes import applicant_bp
    from routes.upload_routes import upload_bp
    from routes.location_routes import location_bp
    from routes.visit_log_routes import visit_log_bp
    from routes.route_routes import route_bp
    from routes.messaging_routes import messaging_bp
    from routes.meeting_routes import meeting_bp
    from routes.case_note_routes import case_note_bp
    from routes.report_routes import report_bp
    from routes.monthly_report_routes import monthly_report_bp
    from routes.performance_routes import performance_bp
    from routes.form_104_routes import form_104_bp
    from routes.event_routes import event_routes

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(user_bp, url_prefix="/api/users")
    app.register_blueprint(territory_bp, url_prefix="/api/territories")
    app.register_blueprint(applicant_bp, url_prefix="/api/applicants")
    app.register_blueprint(upload_bp, url_prefix="/api/uploads")
    app.register_blueprint(location_bp, url_prefix="/api/locations")
    app.register_blueprint(visit_log_bp, url_prefix="/api/visit-logs")
    app.register_blueprint(route_bp, url_prefix="/api/routes")
    app.register_blueprint(messaging_bp, url_prefix="/api")
    app.register_blueprint(meeting_bp, url_prefix="/api/meetings")
    app.register_blueprint(case_note_bp, url_prefix="/api")
    app.register_blueprint(report_bp, url_prefix="/api/reports")
    app.register_blueprint(monthly_report_bp, url_prefix="/api/monthly-reports")
    app.register_blueprint(performance_bp, url_prefix="/api/performance")
    app.register_blueprint(form_104_bp, url_prefix="/api")
    app.register_blueprint(event_routes)

    # ── Health Check ─────────────────────────────────────────────────────────
    @app.route("/api/health")
    def health_check():
        """Health check endpoint for load balancers and deployment monitoring."""
        return jsonify({"status": "ok", "app": "OutreachRoute Pro", "version": "1.0.0"})

    # ── JWT Error Handlers ────────────────────────────────────────────────────
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"error": "Authorization token is required."}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": "Invalid authorization token."}), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Authorization token has expired."}), 401

    # ── Global Error Handlers ─────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"error": "Method not allowed."}), 405

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({"error": "An internal server error occurred."}), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
