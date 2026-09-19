"""FastAPI application entrypoint for PS-9 AI Service."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder

from app.config import settings
from app.utils.logger import logger
from app.routes.health import router as health_router
from app.routes.classification import router as classification_router
from app.routes.duplicate_detection import router as duplicate_router
from app.services.embedding_service import embedding_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan lifecycle events."""
    logger.info("==================================================")
    logger.info(f"Starting {settings.AI_SERVICE_NAME} v{settings.AI_SERVICE_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT} | Host: {settings.HOST}:{settings.PORT}")
    logger.info(f"Loaded Model: {settings.AI_MODEL_NAME}")
    logger.info(f"Embedding Model: {settings.EMBEDDING_MODEL_NAME}")
    logger.info(f"CORS Allowed Origins: {settings.cors_origins}")
    logger.info("==================================================")

    # Load the sentence embedding model at startup (done once)
    try:
        embedding_service.load_model()
        logger.info("Sentence embedding model ready for duplicate detection.")
    except Exception as e:
        logger.error(
            f"Failed to load embedding model: {e}. "
            f"Duplicate detection endpoints will return 503 until resolved."
        )

    yield
    logger.info(f"Shutting down {settings.AI_SERVICE_NAME} gracefully...")


app = FastAPI(
    title="PS-9 Intelligent Emergency Response — AI Service",
    description=(
        "Dedicated Python/FastAPI AI Service providing real-time Incident Classification, "
        "Severity Evaluation, Priority Determination, and Explainability for PS-9 Emergency Command Platform."
    ),
    version=settings.AI_SERVICE_VERSION,
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
    # Convert error dicts to json-safe representations
    clean_errors = []
    for err in exc.errors():
        clean_err = {
            "type": err.get("type"),
            "loc": list(err.get("loc", [])),
            "msg": str(err.get("msg", "")),
        }
        clean_errors.append(clean_err)

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "Validation Error",
            "details": clean_errors,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal Server Error",
            "message": str(exc),
        },
    )


# Mount Routers
app.include_router(health_router)
app.include_router(classification_router)
app.include_router(duplicate_router)


@app.get("/")
def root():
    return {
        "service": settings.AI_SERVICE_NAME,
        "version": settings.AI_SERVICE_VERSION,
        "status": "online",
        "docs": "/docs",
        "health": "/health",
        "classificationEndpoint": "/api/v1/classify-incident",
        "duplicateCheckEndpoint": "/api/v1/incidents/duplicate-check",
        "findDuplicatesEndpoint": "/api/v1/incidents/find-duplicates",
        "clusterEndpoint": "/api/v1/incidents/cluster",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=(settings.ENVIRONMENT == "development"),
    )
