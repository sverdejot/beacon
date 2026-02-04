package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"time"

	"github.com/caarlos0/env/v11"
	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/sverdejot/beacon/internal/cache"
	"github.com/sverdejot/beacon/internal/shared"
	"github.com/sverdejot/beacon/internal/api"
	"github.com/sverdejot/beacon/pkg/datex"
)

func stream(updateCh chan shared.MapLocation, deleteCh chan string) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		clientIP := r.RemoteAddr
		slog.InfoContext(ctx, "sse client connected",
			slog.String("client_ip", clientIP),
			slog.String("user_agent", r.UserAgent()),
		)

		api.SSEConnectionsTotal.Inc()
		api.SSEConnectionsActive.Inc()
		defer func() {
			api.SSEConnectionsActive.Dec()
			slog.DebugContext(ctx, "sse client disconnected", slog.String("client_ip", clientIP))
		}()

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		rc := http.NewResponseController(w)
		for {
			select {
			case <-ctx.Done():
				return
			case loc := <-updateCh:
				data, err := json.Marshal(loc)
				if err != nil {
					slog.ErrorContext(ctx, "failed to marshal sse update event",
						slog.String("incident_id", loc.ID),
						slog.String("error", err.Error()),
					)
					continue
				}

				fmt.Fprintf(w, "event: update\ndata: %s\n\n", data) //nolint:errcheck
				api.SSEEventsTotal.WithLabelValues("update").Inc()
				err = rc.Flush()
				if err != nil {
					slog.DebugContext(ctx, "sse flush failed, client likely disconnected",
						slog.String("client_ip", clientIP),
						slog.String("error", err.Error()),
					)
					return
				}
			case id := <-deleteCh:
				deleteData := map[string]string{"id": id}
				data, err := json.Marshal(deleteData)
				if err != nil {
					slog.ErrorContext(ctx, "failed to marshal sse delete event",
						slog.String("incident_id", id),
						slog.String("error", err.Error()),
					)
					continue
				}

				fmt.Fprintf(w, "event: delete\ndata: %s\n\n", data) //nolint:errcheck
				api.SSEEventsTotal.WithLabelValues("delete").Inc()
				err = rc.Flush()
				if err != nil {
					slog.DebugContext(ctx, "sse flush failed, client likely disconnected",
						slog.String("client_ip", clientIP),
						slog.String("error", err.Error()),
					)
					return
				}
			}
		}
	}
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func metricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(rw, r)

		duration := time.Since(start).Seconds()
		endpoint := r.URL.Path
		method := r.Method
		status := strconv.Itoa(rw.statusCode)

		api.HTTPRequestsTotal.WithLabelValues(method, endpoint, status).Inc()
		api.HTTPRequestDuration.WithLabelValues(method, endpoint).Observe(duration)
	})
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	slog.Info("starting api service")

	cfg, err := env.ParseAs[config]()
	if err != nil {
		slog.Error("failed to parse config", slog.String("error", err.Error()))
		os.Exit(1)
	}

	slog.Info("configuration loaded",
		slog.String("mqtt_broker", cfg.MQTTBroker),
		slog.String("http_port", cfg.HTTPPort),
		slog.String("metrics_port", cfg.MetricsPort),
		slog.String("clickhouse_addr", cfg.ClickHouseAddr),
		slog.String("redis_addr", cfg.RedisAddr),
	)

	go func() {
		metricsMux := http.NewServeMux()
		metricsMux.Handle("/metrics", promhttp.Handler())
		metricsMux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK")) //nolint:errcheck
		})
		slog.Info("starting metrics server", slog.String("port", cfg.MetricsPort))
		if err := http.ListenAndServe(":"+cfg.MetricsPort, metricsMux); err != nil {
			slog.Error("metrics server failed", slog.String("error", err.Error()))
		}
	}()

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	slog.Info("connecting to clickhouse", slog.String("addr", cfg.ClickHouseAddr))
	dashboardRepo, err := api.NewRepository(cfg.ClickHouseAddr, cfg.ClickHouseDatabase, cfg.ClickHouseUser, cfg.ClickHousePassword)
	if err != nil {
		slog.Error("failed to connect to clickhouse", slog.String("error", err.Error()))
		os.Exit(1)
	}
	slog.Info("connected to clickhouse")

	slog.Info("connecting to redis", slog.String("addr", cfg.RedisAddr))
	mapCache, err := cache.NewCache(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		slog.Error("failed to connect to redis", slog.String("error", err.Error()))
		os.Exit(1)
	}
	slog.Info("connected to redis")

	dashboardHandler := api.NewHandler(dashboardRepo, mapCache)

	slog.Info("connecting to mqtt broker", slog.String("broker", cfg.MQTTBroker))
	opts := mqtt.NewClientOptions().
		AddBroker(cfg.MQTTBroker)
	client := mqtt.NewClient(opts)

	if tok := client.Connect(); tok.Wait() && tok.Error() != nil {
		slog.Error("failed to connect to mqtt broker", slog.String("error", tok.Error().Error()))
		os.Exit(1)
	}
	slog.Info("connected to mqtt broker")

	updateCh, deleteCh := locationStream(client, mapCache)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /sse", stream(updateCh, deleteCh))
	mux.HandleFunc("GET /api/map/incidents", mapIncidents(mapCache))
	dashboardHandler.RegisterRoutes(mux)

	srv := &http.Server{
		Addr:    ":" + cfg.HTTPPort,
		Handler: metricsMiddleware(cors(mux)),
	}

	go func() {
		<-ctx.Done()
		slog.Info("shutdown signal received, stopping services...",
			slog.Duration("timeout", 5*time.Second),
		)

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer shutdownCancel()

		srv.Shutdown(shutdownCtx) //nolint:errcheck
		slog.Debug("http server stopped")

		client.Disconnect(250)
		slog.Debug("disconnected from mqtt broker")

		dashboardRepo.Close() //nolint:errcheck
		slog.Debug("closed clickhouse connection")

		mapCache.Close()
		slog.Debug("closed redis connection")

		slog.Info("shutdown complete")
	}()

	slog.Info("starting http server", slog.String("port", cfg.HTTPPort))
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("http server failed", slog.String("error", err.Error()))
		os.Exit(1)
	}
}

func mapIncidents(mapCache *cache.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		api.MapIncidentsRequests.Inc()

		locations, err := mapCache.GetAllMapLocations(ctx)
		if err != nil {
			slog.ErrorContext(ctx, "failed to get map incidents from cache", slog.String("error", err.Error()))
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "failed to get incidents"}) //nolint:errcheck
			return
		}

		api.MapIncidentsCount.Set(float64(len(locations)))
		slog.DebugContext(ctx, "serving map incidents", slog.Int("count", len(locations)))

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"data": locations}) //nolint:errcheck
	}
}

func locationStream(client mqtt.Client, mapCache *cache.Cache) (chan shared.MapLocation, chan string) {
	updateCh := make(chan shared.MapLocation, 100)
	deleteCh := make(chan string, 100)

	tok := client.Subscribe("beacon/+/+/situations/#", 0, func(c mqtt.Client, m mqtt.Message) {
		ctx := context.Background()
		topic := m.Topic()
		api.MQTTStreamMessagesTotal.WithLabelValues("update").Inc()

		slog.DebugContext(ctx, "received situation update for streaming",
			slog.Uint64("message_id", uint64(m.MessageID())),
			slog.String("topic", topic),
		)

		var record datex.Record
		if err := json.Unmarshal(m.Payload(), &record); err != nil {
			slog.ErrorContext(ctx, "failed to unmarshal situation for streaming",
				slog.String("topic", topic),
				slog.String("error", err.Error()),
			)
			return
		}

		loc, err := mapCache.GetMapLocation(ctx, record.ID)
		if err != nil {
			slog.DebugContext(ctx, "cache miss, retrying after delay", slog.String("incident_id", record.ID))
			time.Sleep(100 * time.Millisecond)
			loc, err = mapCache.GetMapLocation(ctx, record.ID)
		}

		if err != nil {
			slog.WarnContext(ctx, "failed to get location from cache for streaming",
				slog.String("incident_id", record.ID),
				slog.String("error", err.Error()),
			)
			return
		}

		updateCh <- *loc
	})
	tok.Wait()
	slog.Info("subscribed to situation updates", slog.String("pattern", "beacon/+/+/situations/#"))

	tok = client.Subscribe("beacon/+/+/deletions/#", 0, func(c mqtt.Client, m mqtt.Message) {
		ctx := context.Background()
		topic := m.Topic()
		api.MQTTStreamMessagesTotal.WithLabelValues("deletion").Inc()

		slog.DebugContext(ctx, "received deletion for streaming",
			slog.Uint64("message_id", uint64(m.MessageID())),
			slog.String("topic", topic),
		)

		var deletion datex.DeletionEvent
		if err := json.Unmarshal(m.Payload(), &deletion); err != nil {
			slog.ErrorContext(ctx, "failed to unmarshal deletion for streaming",
				slog.String("topic", topic),
				slog.String("error", err.Error()),
			)
			return
		}

		deleteCh <- deletion.ID
	})
	tok.Wait()
	slog.Info("subscribed to deletions", slog.String("pattern", "beacon/+/+/deletions/#"))

	return updateCh, deleteCh
}
