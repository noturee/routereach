#!/usr/bin/env sh
set -eu

# If application tables already exist but alembic state is missing,
# stamp to the last pre-Form-104 revision before running upgrades.
if [ "$(python3 - <<'PY'
from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    conn = db.session.connection()

    has_users = conn.execute(text("select to_regclass('public.users') is not null")).scalar()
    has_alembic_table = conn.execute(text("select to_regclass('public.alembic_version') is not null")).scalar()

    has_alembic_row = False
    if has_alembic_table:
        result = conn.execute(text("select count(*) from alembic_version")).scalar()
        has_alembic_row = bool(result)

    print("1" if (has_users and not has_alembic_row) else "0")
PY
)" = "1" ]; then
  echo "[migrate] Existing schema detected without alembic_version. Stamping c2d3e4f6a7b8..."
  flask db stamp c2d3e4f6a7b8
fi

echo "[migrate] Running flask db upgrade..."
flask db upgrade
