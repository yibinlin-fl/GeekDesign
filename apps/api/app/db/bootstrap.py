"""Create the local SQLite database and seed starter templates."""

from app.db import models as _models  # noqa: F401
from app.db.base import Base
from app.db.init_db import seed_templates
from app.db.session import SessionLocal, engine


def bootstrap_database() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as database:
        seed_templates(database)


if __name__ == "__main__":
    bootstrap_database()
    print("GeekDesign local database is ready.")
