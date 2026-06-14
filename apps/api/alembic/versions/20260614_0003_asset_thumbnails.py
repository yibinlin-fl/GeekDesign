"""Add asset thumbnail storage key."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260614_0003"
down_revision: str | None = "20260614_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "assets",
        sa.Column("thumbnail_key", sa.String(length=1024), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("assets", "thumbnail_key")
