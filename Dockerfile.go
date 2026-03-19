//go:build ignore

package main

// Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH:-amd64} go build -ldflags="-w -s" -o api ./cmd/api

# Final stage
FROM alpine:3.19

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /app/api /app/api
COPY --from=builder /app/config.yaml.example /app/config.yaml.example

EXPOSE 5555

ENV GIN_MODE=release

ENTRYPOINT ["/app/api"]
