FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o ingester ./cmd/ingester

FROM alpine:3.23
WORKDIR /app
COPY --from=builder /app/ingester /app/ingester
CMD ["/app/ingester"]
