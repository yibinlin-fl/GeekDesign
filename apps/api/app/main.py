from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.design_document import DesignDocumentValidationError
from app.core.responses import success
from app.modules.assets.router import router as assets_router
from app.modules.exports.router import router as exports_router
from app.modules.projects.router import router as projects_router
from app.modules.templates.router import category_router
from app.modules.templates.router import router as templates_router
from app.modules.users.router import router as users_router

tags_metadata = [
    {"name": "system", "description": "Service health and runtime status."},
    {"name": "projects", "description": "Design project persistence and versions."},
    {"name": "templates", "description": "Reusable design templates."},
    {"name": "assets", "description": "Uploaded asset metadata."},
    {"name": "exports", "description": "Asynchronous render and export tasks."},
    {"name": "users", "description": "Authentication APIs reserved for later."},
]

app = FastAPI(title=settings.app_name, version="0.1.0", openapi_tags=tags_metadata)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=settings.uploads_dir, check_dir=False), name="uploads")
app.mount("/exports", StaticFiles(directory=settings.exports_dir, check_dir=False), name="exports")


@app.exception_handler(DesignDocumentValidationError)
async def design_document_error_handler(
    _request: Request, exc: DesignDocumentValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"success": False, "data": None, "message": str(exc)},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "data": None, "message": str(exc.detail)},
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def request_validation_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "data": {"errors": jsonable_encoder(exc.errors())},
            "message": "Request validation failed",
        },
    )


@app.get("/health", tags=["system"])
def health() -> JSONResponse:
    return success({"status": "ok", "service": settings.app_name})


app.include_router(users_router, prefix=settings.api_prefix)
app.include_router(projects_router, prefix=settings.api_prefix)
app.include_router(category_router, prefix=settings.api_prefix)
app.include_router(templates_router, prefix=settings.api_prefix)
app.include_router(assets_router, prefix=settings.api_prefix)
app.include_router(exports_router, prefix=settings.api_prefix)
