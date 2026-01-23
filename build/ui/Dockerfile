FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o ui ./cmd/ui

FROM alpine:3.23
WORKDIR /app
COPY --from=builder /app/ui /app/ui
CMD ["/app/ui"]
