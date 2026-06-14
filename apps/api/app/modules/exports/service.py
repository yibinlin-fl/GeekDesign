from sqlalchemy.orm import Session

from app.db.models import ExportTask
from app.modules.exports.storage import ExportStorage


def complete_export_task(
    database: Session,
    task: ExportTask,
    contents: bytes,
    storage: ExportStorage,
) -> ExportTask:
    output_key = storage.save(task.format, contents)
    task.status = "completed"
    task.output_key = output_key
    task.result_url = f"/exports/{output_key}"
    task.error_message = None
    database.commit()
    database.refresh(task)
    return task


def fail_export_task(database: Session, task: ExportTask, message: str) -> ExportTask:
    task.status = "failed"
    task.error_message = message
    database.commit()
    database.refresh(task)
    return task
