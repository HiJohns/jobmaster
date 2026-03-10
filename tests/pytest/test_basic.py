"""
Basic API endpoint tests using pytest.

This module tests:
- /health endpoint (public)
- /api/v1/ping or similar public endpoints
- Authentication flows
"""

import pytest
import requests


class TestPublicEndpoints:
    """Tests for public endpoints that don't require authentication."""

    def test_health_endpoint(self, base_url: str):
        """Test that /health returns 200 OK."""
        response = requests.get(f"{base_url}/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"

    def test_health_response_time(self, base_url: str):
        """Test that /health responds within reasonable time."""
        response = requests.get(f"{base_url}/health", timeout=5)
        assert response.status_code == 200
        # Response time is implicitly checked by the timeout


class TestAuthentication:
    """Tests for authentication endpoints."""

    @pytest.mark.parametrize("username,password,expected_status", [
        ("admin", "admin123", 200),  # Valid credentials
        ("admin", "wrongpassword", 401),  # Wrong password
        ("nonexistent", "admin123", 401),  # Wrong username
        ("", "admin123", 400),  # Missing username
        ("admin", "", 400),  # Missing password
    ])
    def test_login_scenarios(self, base_url: str, username: str, password: str, expected_status: int):
        """Test various login scenarios using parametrize."""
        payload = {}
        if username:
            payload["username"] = username
        if password:
            payload["password"] = password
        
        response = requests.post(
            f"{base_url}/api/v1/auth/login",
            json=payload if payload else None
        )
        
        assert response.status_code == expected_status

    def test_login_success_structure(self, base_url: str):
        """Test that successful login returns expected fields."""
        payload = {
            "username": "admin",
            "password": "admin123"
        }
        
        response = requests.post(f"{base_url}/api/v1/auth/login", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "data" in data
        assert "token" in data["data"]
        assert "user_id" in data["data"]
        assert "username" in data["data"]
        assert data["data"]["username"] == "admin"

    def test_login_token_validity(self, base_url: str, admin_token: str):
        """Test that login token can be used for authenticated requests."""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Try to access a protected endpoint
        response = requests.get(
            f"{base_url}/api/v1/users",
            headers=headers
        )
        
        # Should not return 401 (token should be valid)
        assert response.status_code != 401


class TestProtectedEndpoints:
    """Tests for protected endpoints requiring authentication."""

    def test_access_without_token(self, base_url: str):
        """Test that accessing protected endpoint without token returns 401."""
        endpoints = [
            "/api/v1/users",
            "/api/v1/organizations",
            "/api/v1/workorders",
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{base_url}{endpoint}")
            assert response.status_code == 401, f"{endpoint} should require authentication"

    @pytest.mark.parametrize("invalid_token", [
        "invalid_token",
        "Bearer invalid",
        "Bearer ",
        "",
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid",  # Malformed JWT
    ])
    def test_access_with_invalid_token(self, base_url: str, invalid_token: str):
        """Test that invalid tokens are rejected."""
        headers = {"Authorization": invalid_token} if invalid_token else {}
        
        response = requests.get(
            f"{base_url}/api/v1/users",
            headers=headers
        )
        
        assert response.status_code == 401

    def test_refresh_token_success(self, base_url: str, auth_headers: dict):
        """Test that token refresh endpoint works with valid token."""
        response = requests.post(
            f"{base_url}/api/v1/auth/refresh",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "token" in data["data"]


class TestOrganizationEndpoints:
    """Tests for organization management endpoints."""

    def test_list_organizations(self, base_url: str, auth_headers: dict):
        """Test listing organizations."""
        response = requests.get(
            f"{base_url}/api/v1/organizations",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_get_organization_tree(self, base_url: str, auth_headers: dict):
        """Test getting organization tree structure."""
        response = requests.get(
            f"{base_url}/api/v1/organizations/tree",
            headers=auth_headers
        )
        
        assert response.status_code == 200


class TestUserEndpoints:
    """Tests for user management endpoints."""

    def test_list_users(self, base_url: str, auth_headers: dict):
        """Test listing users."""
        response = requests.get(
            f"{base_url}/api/v1/users",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    @pytest.mark.parametrize("user_data,expected_status", [
        # Valid user data
        ({
            "username": "testuser",
            "password": "testpass123",
            "email": "test@example.com",
            "role": "STORE"
        }, 201),
        # Missing required fields
        ({
            "username": "testuser2"
        }, 400),
        # Invalid role
        ({
            "username": "testuser3",
            "password": "testpass123",
            "role": "INVALID_ROLE"
        }, 400),
    ])
    def test_create_user_scenarios(
        self, base_url: str, auth_headers: dict, 
        user_data: dict, expected_status: int
    ):
        """Test user creation with various scenarios."""
        response = requests.post(
            f"{base_url}/api/v1/users",
            headers=auth_headers,
            json=user_data
        )
        
        assert response.status_code == expected_status


class TestWorkOrderEndpoints:
    """Tests for work order endpoints."""

    def test_list_workorders(self, base_url: str, auth_headers: dict):
        """Test listing work orders."""
        response = requests.get(
            f"{base_url}/api/v1/workorders",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
