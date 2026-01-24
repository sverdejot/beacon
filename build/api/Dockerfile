FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o api ./cmd/api

FROM alpine:3.23
WORKDIR /app
COPY --from=builder /app/api /app/api
CMD ["/app/api"]
