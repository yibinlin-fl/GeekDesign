"""Add authentication, soft delete, and project sharing."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260614_0006"
down_revision: str | None = "20260614_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("password_hash", sa.String(length=512), nullable=False, server_default=""),
    )
    op.alter_column("users", "password_hash", server_default=None)
    op.add_column("projects", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("projects", sa.Column("share_token", sa.String(length=128), nullable=True))
    op.add_column(
        "projects",
        sa.Column("share_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_unique_constraint("uq_projects_share_token", "projects", ["share_token"])


def downgrade() -> None:
    op.drop_constraint("uq_projects_share_token", "projects", type_="unique")
    op.drop_column("projects", "share_enabled")
    op.drop_column("projects", "share_token")
    op.drop_column("projects", "deleted_at")
    op.drop_column("users", "password_hash")
