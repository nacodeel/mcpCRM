from fastapi import FastAPI

from app.core.config import Settings


def setup_telemetry(app: FastAPI, settings: Settings) -> None:
    # Placeholder for OpenTelemetry/Sentry/Prometheus integration.
    # Keep this file as the single observability wiring point.
    _ = (app, settings)
