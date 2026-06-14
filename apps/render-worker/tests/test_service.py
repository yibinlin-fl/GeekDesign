from render_worker import SERVICE_NAME, ExportJob, RenderWorker


class FakeRenderer:
    def render_pdf(self, render_url: str) -> bytes:
        assert render_url.endswith("/render/project_1")
        return b"%PDF-smoke"

    def render_png(self, render_url: str) -> bytes:
        assert render_url.endswith("/render/project_1")
        return b"\x89PNG-smoke"


class FakeStorage:
    def save(self, format_name: str, contents: bytes) -> str:
        assert contents
        return f"exports/result.{format_name}"


def test_service_name() -> None:
    assert SERVICE_NAME == "geekdesign-render-worker"


def test_pdf_export_smoke() -> None:
    result = RenderWorker(FakeRenderer(), FakeStorage(), "http://web").process(
        ExportJob(id="task_pdf", project_id="project_1", format="pdf")
    )

    assert result.status == "completed"
    assert result.output_key == "exports/result.pdf"


def test_png_export_smoke() -> None:
    result = RenderWorker(FakeRenderer(), FakeStorage(), "http://web").process(
        ExportJob(id="task_png", project_id="project_1", format="png")
    )

    assert result.status == "completed"
    assert result.output_key == "exports/result.png"


def test_unsupported_export_is_recorded_as_failed() -> None:
    result = RenderWorker(FakeRenderer(), FakeStorage(), "http://web").process(
        ExportJob(id="task_pptx", project_id="project_1", format="pptx")
    )

    assert result.status == "failed"
    assert "Unsupported export format" in (result.error_message or "")
