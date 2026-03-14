#!/bin/bash
# Migration runner for goose

# Check if goose is installed
if ! command -v goose &> /dev/null; then
    echo "goose is not installed. Installing..."
    go install github.com/pressly/goose/v3/cmd/goose@latest
fi

# Run migrations
echo "Running migrations..."
goose -dir ./migrations postgres "postgresql://jobmaster:jobmaster_dev_password@localhost:5432/jobmaster?sslmode=disable" up
