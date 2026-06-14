from typing import Any

from fastapi.responses import JSONResponse


def success(data: Any = None, message: str = "ok", status_code: int = 200) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": True, "data": data, "message": message},
    )


def error(message: str, status_code: int, details: Any = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "data": details, "message": message},
    )
