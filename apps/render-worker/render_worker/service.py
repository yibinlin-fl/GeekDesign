from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol


@dataclass(frozen=True)
class ExportJob:
    id: str
    project_id: str
    format: str
    options: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ExportResult:
    task_id: str
    status: str
    output_key: str | None = None
    error_message: str | None = None


class Renderer(Protocol):
    def render_pdf(self, render_url: str) -> bytes: ...

    def render_png(self, render_url: str) -> bytes: ...


class Storage(Protocol):
    def save(self, format_name: str, contents: bytes) -> str: ...


class RenderWorker:
    """Processes one export job; queue claiming and task updates stay adapter-owned."""

    def __init__(self, renderer: Renderer, storage: Storage, web_base_url: str):
        self.renderer = renderer
        self.storage = storage
        self.web_base_url = web_base_url.rstrip("/")

    def process(self, job: ExportJob) -> ExportResult:
        render_url = f"{self.web_base_url}/render/{job.project_id}"
        try:
            if job.format == "pdf":
                contents = self.renderer.render_pdf(render_url)
            elif job.format == "png":
                contents = self.renderer.render_png(render_url)
            else:
                raise ValueError(f'Unsupported export format "{job.format}"')
            output_key = self.storage.save(job.format, contents)
            return ExportResult(job.id, "completed", output_key=output_key)
        except (
            Exception
        ) as exc:  # Worker boundary records failures instead of crashing the queue.
            return ExportResult(job.id, "failed", error_message=str(exc))


class PlaywrightRenderer:
    """Headless renderer used by the worker for PDF and future high-resolution PNG."""

    def render_pdf(self, render_url: str) -> bytes:
        with self._page(render_url) as page:
            box = page.locator('[data-render-ready="true"]').bounding_box()
            if not box:
                raise RuntimeError("Render page has no measurable design area")
            return page.pdf(
                print_background=True,
                width=f"{box['width']}px",
                height=f"{box['height']}px",
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
            )

    def render_png(self, render_url: str) -> bytes:
        with self._page(render_url) as page:
            return page.locator('canvas[aria-label="Server render canvas"]').screenshot(
                type="png"
            )

    def _page(self, render_url: str):
        from playwright.sync_api import sync_playwright

        return _PageContext(sync_playwright(), render_url)


class _PageContext:
    def __init__(self, playwright_context, render_url: str):
        self.playwright_context = playwright_context
        self.render_url = render_url

    def __enter__(self):
        self.playwright = self.playwright_context.__enter__()
        self.browser = self.playwright.chromium.launch()
        self.page = self.browser.new_page()
        self.page.goto(self.render_url, wait_until="networkidle")
        self.page.locator('[data-render-ready="true"]').wait_for()
        return self.page

    def __exit__(self, exc_type, exc, traceback):
        self.browser.close()
        self.playwright_context.__exit__(exc_type, exc, traceback)


class LocalExportStorage:
    def __init__(self, root: str | Path):
        self.root = Path(root).resolve()

    def save(self, format_name: str, contents: bytes) -> str:
        from uuid import uuid4

        key = f"{uuid4().hex}.{format_name}"
        path = (self.root / key).resolve()
        if self.root not in path.parents:
            raise ValueError("Invalid export path")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(contents)
        return key
