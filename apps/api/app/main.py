from fastapi import FastAPI

app = FastAPI(title="GeekDesign API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
