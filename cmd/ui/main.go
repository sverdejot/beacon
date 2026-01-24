package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/caarlos0/env/v11"
	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/sverdejot/beacon/internal/cache"
	"github.com/sverdejot/beacon/internal/shared"
	"github.com/sverdejot/beacon/internal/ui"
	"github.com/sverdejot/beacon/pkg/datex"
)

func stream(ch chan shared.MapLocation) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		slog.InfoContext(ctx, "client connected")
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")

		rc := http.NewResponseController(w)
		for {
			select {
			case <-r.Context().Done():
				return
			case loc := <-ch:
				data, err := json.Marshal(loc)
				if err != nil {
					slog.ErrorContext(ctx, fmt.Sprintf("error marshaling event at stream: %s", err))
					continue
				}

				fmt.Fprintf(w, "data: %s\n\n", data) //nolint:errcheck
				err = rc.Flush()
				if err != nil {
					slog.ErrorContext(ctx, fmt.Sprintf("error sending event through sse (client may have closed): %s", err))
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

func main() {
	cfg, err := env.ParseAs[config]()
	if err != nil {
		slog.Error(fmt.Sprintf("failed to parse config: %s", err))
		os.Exit(1)
	}

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

	ch := locationStream(client, mapCache)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /sse", stream(ch))
	mux.HandleFunc("GET /api/map/incidents", mapIncidents(mapCache))

	dashboardHandler.RegisterRoutes(mux)

	srv := &http.Server{
		Addr:    ":" + cfg.HTTPPort,
		Handler: cors(mux),
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
		locations, err := mapCache.GetAllMapLocations(r.Context())
		if err != nil {
			slog.Error(fmt.Sprintf("failed to get map incidents: %s", err))
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "failed to get incidents"}) //nolint:errcheck
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{"data": locations}) //nolint:errcheck
	}
}

func locationStream(client mqtt.Client, mapCache *cache.Cache) chan shared.MapLocation {
	ch := make(chan shared.MapLocation, 100)

	tok := client.Subscribe("datex/#", 0, func(c mqtt.Client, m mqtt.Message) {
		slog.Info(fmt.Sprintf("processing message [%d] from topic [%s]", m.MessageID(), m.Topic()))

		var record datex.Record
		if err := json.Unmarshal(m.Payload(), &record); err != nil {
			slog.Error(fmt.Sprintf("error unmarshalling payload from topic %s: %s\n", m.Topic(), err))
			return
		}

		// Fetch pre-computed MapLocation from Valkey (stored by ingester)
		ctx := context.Background()
		loc, err := mapCache.GetMapLocation(ctx, record.ID)
		if err != nil {
			// Race condition: ingester hasn't stored yet, retry after small delay
			time.Sleep(100 * time.Millisecond)
			loc, err = mapCache.GetMapLocation(ctx, record.ID)
		}

		if err != nil {
			slog.Error(fmt.Sprintf("failed to get location from cache: %s", err))
			return
		}

		ch <- *loc
	})

	tok.Wait()

	return ch
}
