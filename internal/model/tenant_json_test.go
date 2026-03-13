package model

import (
	"encoding/json"
	"testing"
)

// TestTenantJSONSerialization verifies that Tenant serializes to lowercase/snake_case JSON
func TestTenantJSONSerialization(t *testing.T) {
	tenant := Tenant{
		ID:            1,
		Name:          "Test Tenant",
		Code:          "test-code",
		ContactPerson: "John Doe",
		Status:        1,
	}

	data, err := json.Marshal(tenant)
	if err != nil {
		t.Fatalf("Failed to marshal tenant: %v", err)
	}

	// Unmarshal to map to check field names
	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("Failed to unmarshal result: %v", err)
	}

	// Check that fields use lowercase/snake_case naming
	tests := []struct {
		key      string
		expected interface{}
	}{
		{"id", float64(1)},
		{"name", "Test Tenant"},
		{"code", "test-code"},
		{"contact_person", "John Doe"},
		{"status", float64(1)},
	}

	for _, tt := range tests {
		t.Run(tt.key, func(t *testing.T) {
			val, ok := result[tt.key]
			if !ok {
				t.Errorf("Missing expected field '%s'. Got fields: %v", tt.key, getKeys(result))
				// Check if PascalCase version exists (the bug)
				pascalKey := capitalize(tt.key)
				if _, exists := result[pascalKey]; exists {
					t.Logf("BUG: Found PascalCase field '%s' instead of '%s'", pascalKey, tt.key)
				}
			} else if val != tt.expected {
				t.Errorf("Field '%s' = %v, want %v", tt.key, val, tt.expected)
			}
		})
	}
}

func getKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

func capitalize(s string) string {
	if s == "" {
		return s
	}
	// Simple capitalization for test purposes
	switch s {
	case "id":
		return "ID"
	case "name":
		return "Name"
	case "code":
		return "Code"
	case "contact_person":
		return "ContactPerson"
	case "status":
		return "Status"
	case "created_at":
		return "CreatedAt"
	case "updated_at":
		return "UpdatedAt"
	case "deleted_at":
		return "DeletedAt"
	default:
		return s
	}
}
