package model

import (
	"testing"
)

func TestJSONBMap_Scan(t *testing.T) {
	tests := []struct {
		name    string
		src     interface{}
		wantErr bool
	}{
		{
			name:    "nil input",
			src:     nil,
			wantErr: false,
		},
		{
			name:    "empty bytes",
			src:     []byte("{}"),
			wantErr: false,
		},
		{
			name:    "valid JSON bytes",
			src:     []byte(`{"key": "value"}`),
			wantErr: false,
		},
		{
			name:    "string type - was BUG now fixed",
			src:     `{"key": "value"}`,
			wantErr: false, // Fixed: now handles string type
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			j := make(JSONBMap)
			err := j.Scan(tt.src)
			if (err != nil) != tt.wantErr {
				t.Errorf("JSONBMap.Scan() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// TestJSONBMapScan_StringBug specifically tests the bug case
func TestJSONBMapScan_StringBug(t *testing.T) {
	j := make(JSONBMap)

	// This is what PostgreSQL driver returns in some cases
	err := j.Scan(`{"test": "data"}`)
	if err != nil {
		t.Errorf("BUG NOT FIXED: %v", err)
	}

	// Verify the data was parsed correctly
	if v, ok := j["test"]; !ok || v != "data" {
		t.Errorf("Expected test=data, got %v", v)
	}
	t.Log("BUG FIXED: string type now handled correctly")
}
