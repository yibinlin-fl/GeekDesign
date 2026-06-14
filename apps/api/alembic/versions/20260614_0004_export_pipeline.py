"""Add export pipeline task fields."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260614_0004"
down_revision: str | None = "20260614_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "export_tasks",
        "project_id",
        existing_type=sa.String(length=64),
        nullable=False,
    )
    op.create_foreign_key(
        "fk_export_tasks_project_id",
        "export_tasks",
        "projects",
        ["project_id"],
        ["id"],
    )
    op.add_column(
        "export_tasks", sa.Column("options", sa.JSON(), nullable=False, server_default="{}")
    )
    op.add_column("export_tasks", sa.Column("output_key", sa.String(length=1024), nullable=True))
    op.add_column("export_tasks", sa.Column("error_message", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("export_tasks", "error_message")
    op.drop_column("export_tasks", "output_key")
    op.drop_column("export_tasks", "options")
    op.drop_constraint("fk_export_tasks_project_id", "export_tasks", type_="foreignkey")
    op.alter_column("export_tasks", "project_id", existing_type=sa.String(length=64), nullable=True)
