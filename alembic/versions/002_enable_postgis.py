"""Enable postgis extension.

Revision ID: 002_enable_postgis
Revises: 001_initial_schema
Create Date: 2026-07-19 19:30:00.000000
"""

from alembic import op

revision = "002_enable_postgis"
down_revision = "001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS postgis;")
