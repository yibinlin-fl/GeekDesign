"""Add template categories and variable metadata."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260614_0002"
down_revision: str | None = "20260614_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "template_categories",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.add_column("templates", sa.Column("tags", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column(
        "templates",
        sa.Column("style", sa.String(length=100), nullable=False, server_default="modern"),
    )
    op.add_column(
        "templates", sa.Column("variables", sa.JSON(), nullable=False, server_default="[]")
    )
    op.add_column(
        "templates", sa.Column("premium", sa.Boolean(), nullable=False, server_default=sa.false())
    )


def downgrade() -> None:
    op.drop_column("templates", "premium")
    op.drop_column("templates", "variables")
    op.drop_column("templates", "style")
    op.drop_column("templates", "tags")
    op.drop_table("template_categories")
