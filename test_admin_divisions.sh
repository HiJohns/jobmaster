#!/bin/bash

# Start the server in background
DEMO_MODE=true go run ./cmd/api/main.go > /tmp/server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test list provinces (level 1)
echo "=== Testing List Provinces ==="
curl -s http://localhost:5555/api/v1/admin-divisions | jq '.'

# Test import sample data
echo -e "\n=== Importing Sample Data ==="
go run scripts/import_admin_divisions.go data/admin_divisions_sample.json

# Test list provinces again
echo -e "\n=== Testing List After Import ==="
curl -s http://localhost:5555/api/v1/admin-divisions | jq '.'

# Test get specific division
echo -e "\n=== Testing Get Specific Division ==="
# Note: This will fail if no data was imported, which is expected
curl -s http://localhost:5555/api/v1/admin-divisions/00000000-0000-0000-0000-000000000000 | jq '.'

# Test list cities under a province (would need actual UUID)
echo -e "\n=== Testing List Cities ==="
curl -s "http://localhost:5555/api/v1/admin-divisions?level=2" | jq '.'

# Stop server
kill $SERVER_PID 2>/dev/null

echo "Test completed!"
