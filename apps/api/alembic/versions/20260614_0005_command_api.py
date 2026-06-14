"""Add validated command audit log."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260614_0005"
down_revision: str | None = "20260614_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "command_logs",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("project_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("command_type", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_command_logs_project_id", "command_logs", ["project_id"])
    op.create_index("ix_command_logs_user_id", "command_logs", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_command_logs_user_id", table_name="command_logs")
    op.drop_index("ix_command_logs_project_id", table_name="command_logs")
    op.drop_table("command_logs")
