# JobMaster Backend

## Directory Structure

This project follows the [Standard Go Project Layout](https://github.com/golang-standards/project-layout).

### cmd/
Application entry points. Each subdirectory represents a binary.

### internal/
Private application code. Not importable by external projects.
- `models/` - Database models
- `handlers/` - HTTP handlers
- `services/` - Business logic
- `repositories/` - Data access layer

### pkg/
Public libraries that can be imported by other projects.

### api/
API definitions, protocol buffer files, and OpenAPI specs.

## Getting Started

```bash
# Initialize dependencies
go mod tidy

# Run the server
go run cmd/server/main.go
```

## Development

Following Uber Go Style Guide and Google Engineering Practices.

---

*Part of JobMaster (工单匠) - Intelligent Work Order Management System*
