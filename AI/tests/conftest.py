"""Pytest fixtures and configuration."""

import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure app is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app


@pytest.fixture
def client():
    """Provides a TestClient instance for API tests."""
    return TestClient(app)
