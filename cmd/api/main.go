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
	"github.com/sverdejot/beacon/internal/ui"
	"github.com/sverdejot/beacon/pkg/datex"
)

func stream(updateCh chan shared.MapLocation, deleteCh chan string) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		slog.InfoContext(ctx, "client connected")

		ui.SSEConnectionsTotal.Inc()
		ui.SSEConnectionsActive.Inc()
		defer ui.SSEConnectionsActive.Dec()

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		rc := http.NewResponseController(w)
		for {
			select {
			case <-r.Context().Done():
				return
			case loc := <-updateCh:
				data, err := json.Marshal(loc)
				if err != nil {
					slog.ErrorContext(ctx, fmt.Sprintf("error marshaling event at stream: %s", err))
					continue
				}

				fmt.Fprintf(w, "event: update\ndata: %s\n\n", data) //nolint:errcheck
				ui.SSEEventsTotal.WithLabelValues("update").Inc()
				err = rc.Flush()
				if err != nil {
					slog.ErrorContext(ctx, fmt.Sprintf("error sending event through sse (client may have closed): %s", err))
					return
				}
			case id := <-deleteCh:
				deleteData := map[string]string{"id": id}
				data, err := json.Marshal(deleteData)
				if err != nil {
					slog.ErrorContext(ctx, fmt.Sprintf("error marshaling delete event: %s", err))
					continue
				}

				fmt.Fprintf(w, "event: delete\ndata: %s\n\n", data) //nolint:errcheck
				ui.SSEEventsTotal.WithLabelValues("delete").Inc()
				err = rc.Flush()
				if err != nil {
					slog.ErrorContext(ctx, fmt.Sprintf("error sending delete event through sse (client may have closed): %s", err))
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

		ui.HTTPRequestsTotal.WithLabelValues(method, endpoint, status).Inc()
		ui.HTTPRequestDuration.WithLabelValues(method, endpoint).Observe(duration)
	})
}

func main() {
	cfg, err := env.ParseAs[config]()
	if err != nil {
		slog.Error(fmt.Sprintf("failed to parse config: %s", err))
		os.Exit(1)
	}

	go func() {
		metricsMux := http.NewServeMux()
		metricsMux.Handle("/metrics", promhttp.Handler())
		metricsMux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK")) //nolint:errcheck
		})
		slog.Info(fmt.Sprintf("starting metrics server on :%s", cfg.MetricsPort))
		if err := http.ListenAndServe(":"+cfg.MetricsPort, metricsMux); err != nil {
			slog.Error(fmt.Sprintf("metrics server failed: %s", err))
		}
	}()

	slog.Info(fmt.Sprintf("using [%s] as broker", cfg.MQTTBroker))
	slog.Info(fmt.Sprintf("using [%s] as http port", cfg.HTTPPort))
	slog.Info(fmt.Sprintf("using [%s] as ClickHouse address", cfg.ClickHouseAddr))
	slog.Info(fmt.Sprintf("using [%s] as Redis address", cfg.RedisAddr))

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	dashboardRepo, err := ui.NewRepository(cfg.ClickHouseAddr, cfg.ClickHouseDatabase, cfg.ClickHouseUser, cfg.ClickHousePassword)
	if err != nil {
		slog.Error(fmt.Sprintf("failed to connect to ClickHouse: %s", err))
		os.Exit(1)
	}
	dashboardHandler := ui.NewHandler(dashboardRepo)

	mapCache, err := cache.NewCache(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		slog.Error(fmt.Sprintf("failed to connect to Redis: %s", err))
		os.Exit(1)
	}
	slog.Info("connected to Redis")

	opts := mqtt.NewClientOptions().
		AddBroker(cfg.MQTTBroker)
	client := mqtt.NewClient(opts)

	if tok := client.Connect(); tok.Wait() && tok.Error() != nil {
		slog.Error(fmt.Sprintf("error connecting to broker %s: %s\n", cfg.MQTTBroker, tok.Error()))
		os.Exit(1)
	}

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
		slog.Info("shutting down. 5secs timeout until all connections are closed")

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer shutdownCancel()

		srv.Shutdown(shutdownCtx) //nolint:errcheck
		client.Disconnect(250)
		dashboardRepo.Close() //nolint:errcheck
		mapCache.Close()
	}()

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error(fmt.Sprintf("error listening on port :%s : %s\n", cfg.HTTPPort, err))
		os.Exit(1)
	}
}

func mapIncidents(mapCache *cache.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ui.MapIncidentsRequests.Inc()

		locations, err := mapCache.GetAllMapLocations(r.Context())
		if err != nil {
			slog.Error(fmt.Sprintf("failed to get map incidents: %s", err))
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "failed to get incidents"}) //nolint:errcheck
			return
		}

		ui.MapIncidentsCount.Set(float64(len(locations)))
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"data": locations}) //nolint:errcheck
	}
}

func locationStream(client mqtt.Client, mapCache *cache.Cache) (chan shared.MapLocation, chan string) {
	updateCh := make(chan shared.MapLocation, 100)
	deleteCh := make(chan string, 100)

	tok := client.Subscribe("beacon/+/+/situations/#", 0, func(c mqtt.Client, m mqtt.Message) {
		slog.Info(fmt.Sprintf("processing update [%d] from topic [%s]", m.MessageID(), m.Topic()))
		ui.MQTTStreamMessagesTotal.WithLabelValues("update").Inc()

		var record datex.Record
		if err := json.Unmarshal(m.Payload(), &record); err != nil {
			slog.Error(fmt.Sprintf("error unmarshalling payload from topic %s: %s\n", m.Topic(), err))
			return
		}

		ctx := context.Background()
		loc, err := mapCache.GetMapLocation(ctx, record.ID)
		if err != nil {
			// rc: ingester hasn't stored yet, retry after small delay
			time.Sleep(100 * time.Millisecond)
			loc, err = mapCache.GetMapLocation(ctx, record.ID)
		}

		if err != nil {
			slog.Error(fmt.Sprintf("failed to get location from cache: %s", err))
			return
		}

		updateCh <- *loc
	})
	tok.Wait()

	tok = client.Subscribe("beacon/+/+/deletions/#", 0, func(c mqtt.Client, m mqtt.Message) {
		slog.Info(fmt.Sprintf("processing deletion [%d] from topic [%s]", m.MessageID(), m.Topic()))
		ui.MQTTStreamMessagesTotal.WithLabelValues("deletion").Inc()

		var deletion datex.DeletionEvent
		if err := json.Unmarshal(m.Payload(), &deletion); err != nil {
			slog.Error(fmt.Sprintf("error unmarshalling deletion from topic %s: %s\n", m.Topic(), err))
			return
		}

		deleteCh <- deletion.ID
	})
	tok.Wait()

	return updateCh, deleteCh
}
