package httptest

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestLogin_Success tests successful login with valid credentials
func TestLogin_Success(t *testing.T) {
	// Note: This test requires the seeded admin user to exist

	payload := map[string]string{
		"username": "admin",
		"password": "admin123",
	}

	w := ExecuteRequest(t, "POST", "/api/v1/auth/login", payload, nil)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := ParseResponse(w, &response)
	assert.NoError(t, err)

	// Check response structure
	data, ok := response["data"].(map[string]interface{})
	assert.True(t, ok, "response should have data field")
	assert.NotEmpty(t, data["token"], "token should be present")
	assert.Equal(t, "admin", data["username"])
	assert.Equal(t, "ADMIN", data["role"])
}

// TestLogin_InvalidCredentials tests login with wrong password
func TestLogin_InvalidCredentials(t *testing.T) {
	payload := map[string]string{
		"username": "admin",
		"password": "wrongpassword",
	}

	w := ExecuteRequest(t, "POST", "/api/v1/auth/login", payload, nil)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]interface{}
	err := ParseResponse(w, &response)
	assert.NoError(t, err)
	assert.Equal(t, float64(401), response["code"])
}

// TestLogin_InvalidUsername tests login with non-existent user
func TestLogin_InvalidUsername(t *testing.T) {
	payload := map[string]string{
		"username": "nonexistentuser",
		"password": "admin123",
	}

	w := ExecuteRequest(t, "POST", "/api/v1/auth/login", payload, nil)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// TestLogin_MissingFields tests login with missing required fields
func TestLogin_MissingFields(t *testing.T) {
	testCases := []struct {
		name     string
		payload  map[string]string
		expected int
	}{
		{
			name:     "missing username",
			payload:  map[string]string{"password": "admin123"},
			expected: http.StatusBadRequest,
		},
		{
			name:     "missing password",
			payload:  map[string]string{"username": "admin"},
			expected: http.StatusBadRequest,
		},
		{
			name:     "empty payload",
			payload:  map[string]string{},
			expected: http.StatusBadRequest,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			w := ExecuteRequest(t, "POST", "/api/v1/auth/login", tc.payload, nil)
			assert.Equal(t, tc.expected, w.Code)
		})
	}
}

// TestProtectedRoute_InvalidToken tests accessing protected routes with invalid token
func TestProtectedRoute_InvalidToken(t *testing.T) {
	testCases := []struct {
		name  string
		token string
	}{
		{
			name:  "invalid token format",
			token: "invalid_token",
		},
		{
			name:  "empty token",
			token: "",
		},
		{
			name:  "malformed bearer token",
			token: "Bearer invalid_token_format",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			w := ExecuteRequestWithAuth(t, "GET", "/api/v1/users", nil, tc.token)
			assert.Equal(t, http.StatusUnauthorized, w.Code)
		})
	}
}

// TestProtectedRoute_MissingToken tests accessing protected routes without token
func TestProtectedRoute_MissingToken(t *testing.T) {
	w := ExecuteRequest(t, "GET", "/api/v1/users", nil, nil)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// TestHealthEndpoint tests the health check endpoint (no auth required)
func TestHealthEndpoint(t *testing.T) {
	w := ExecuteRequest(t, "GET", "/health", nil, nil)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := ParseResponse(w, &response)
	assert.NoError(t, err)
	assert.Equal(t, "ok", response["status"])
}

// TestRefreshToken_Success tests token refresh with valid token
func TestRefreshToken_Success(t *testing.T) {
	// First, login to get a valid token
	loginPayload := map[string]string{
		"username": "admin",
		"password": "admin123",
	}

	loginResp := ExecuteRequest(t, "POST", "/api/v1/auth/login", loginPayload, nil)
	assert.Equal(t, http.StatusOK, loginResp.Code)

	var loginData map[string]interface{}
	ParseResponse(loginResp, &loginData)
	token := loginData["data"].(map[string]interface{})["token"].(string)

	// Now test refresh token endpoint
	w := ExecuteRequestWithAuth(t, "POST", "/api/v1/auth/refresh", nil, token)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := ParseResponse(w, &response)
	assert.NoError(t, err)

	data, ok := response["data"].(map[string]interface{})
	assert.True(t, ok)
	assert.NotEmpty(t, data["token"], "new token should be present")
}

// TestRefreshToken_InvalidToken tests token refresh with invalid token
func TestRefreshToken_InvalidToken(t *testing.T) {
	w := ExecuteRequestWithAuth(t, "POST", "/api/v1/auth/refresh", nil, "invalid_token")
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
