"""
Pytest configuration and fixtures for JobMaster integration testing.

This module provides:
- base_url fixture for API endpoint
- admin_token fixture for authenticated requests
- test_tenant_id for data isolation
- automatic cleanup after tests
"""

import os
import pytest
import requests
from typing import Generator


# Test constants
TEST_TENANT_ID = "00000000-0000-0000-0000-000000000999"
TEST_USER = "admin"
TEST_PASSWORD = "admin123"


@pytest.fixture(scope="session")
def base_url() -> str:
    """
    Returns the base URL for API requests.
    Can be configured via environment variable TEST_BASE_URL.
    Default: http://localhost:5555
    """
    return os.getenv("TEST_BASE_URL", "http://localhost:5555")


@pytest.fixture(scope="session")
def admin_token(base_url: str) -> str:
    """
    Authenticates and returns admin JWT token.
    This token can be used for protected endpoint testing.
    """
    login_url = f"{base_url}/api/v1/auth/login"
    payload = {
        "username": TEST_USER,
        "password": TEST_PASSWORD
    }
    
    response = requests.post(login_url, json=payload)
    response.raise_for_status()
    
    data = response.json()
    token = data.get("data", {}).get("token")
    
    if not token:
        pytest.fail("Failed to obtain admin token from login response")
    
    return token


@pytest.fixture(scope="function")
def auth_headers(admin_token: str) -> dict:
    """
    Returns headers with authorization token.
    """
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="function")
def test_tenant_id() -> str:
    """
    Returns a unique test tenant ID for data isolation.
    Tests should use this tenant ID to ensure data cleanup.
    """
    return TEST_TENANT_ID


@pytest.fixture(scope="function", autouse=True)
def cleanup_test_data(base_url: str, admin_token: str) -> Generator[None, None, None]:
    """
    Automatically cleans up test data after each test function.
    This fixture runs after every test to ensure clean state.
    
    NOTE: This fixture requires the backend to implement the cleanup endpoint:
    POST /internal/test/cleanup
    Headers: Authorization: Bearer <token>, X-Test-Tenant-ID: <tenant_id>
    
    If the endpoint is not implemented, cleanup will be skipped silently.
    For manual cleanup, use the test_tenant_id fixture to track and remove test data.
    """
    yield  # Let the test run
    
    # TODO: Implement backend cleanup endpoint or use database cleanup script
    # See: docs/testing.md for cleanup implementation guide
    cleanup_url = f"{base_url}/internal/test/cleanup"
    
    try:
        headers = {
            "Authorization": f"Bearer {admin_token}",
            "X-Test-Tenant-ID": TEST_TENANT_ID
        }
        response = requests.post(cleanup_url, headers=headers, timeout=5)
        if response.status_code != 200:
            print(f"Warning: Cleanup endpoint returned {response.status_code}")
    except requests.exceptions.RequestException:
        # Endpoint not implemented - manual cleanup required
        # Consider implementing a database cleanup script for CI/CD
        pass


@pytest.fixture
def api_client(base_url: str):
    """
    Returns a configured requests session for API testing.
    """
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# Pytest hooks for custom reporting
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "auth_required: mark test as requiring authentication"
    )
    config.addinivalue_line(
        "markers", "cleanup: mark test that creates data needing cleanup"
    )


def pytest_collection_modifyitems(config, items):
    """Automatically add markers based on test function names."""
    for item in items:
        # Auto-mark auth tests
        if "auth" in item.nodeid.lower() or "login" in item.nodeid.lower():
            item.add_marker(pytest.mark.auth_required)
        # Auto-mark tests with cleanup
        if "create" in item.nodeid.lower() or "test_" in item.name:
            item.add_marker(pytest.mark.cleanup)
