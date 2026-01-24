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
	"github.com/sverdejot/beacon/internal/ui"
	"github.com/sverdejot/beacon/pkg/datex"
)

func stream(ch chan ui.MapLocation) func(w http.ResponseWriter, r *http.Request) {
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

				fmt.Fprintf(w, "data: %s\n\n", data)
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
	slog.Info(fmt.Sprintf("using [%s] as OSRM host", cfg.OSRMURL))
	slog.Info(fmt.Sprintf("using [%s] as ClickHouse address", cfg.ClickHouseAddr))

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	dashboardRepo, err := ui.NewRepository(cfg.ClickHouseAddr, cfg.ClickHouseDatabase, cfg.ClickHouseUser, cfg.ClickHousePassword)
	if err != nil {
		slog.Error(fmt.Sprintf("failed to connect to ClickHouse: %s", err))
		os.Exit(1)
	}
	dashboardHandler := ui.NewHandler(dashboardRepo)

	routeService := ui.NewRouteService(cfg.OSRMURL)

	opts := mqtt.NewClientOptions().
		AddBroker(cfg.MQTTBroker)
	client := mqtt.NewClient(opts)

	if tok := client.Connect(); tok.Wait() && tok.Error() != nil {
		slog.Error(fmt.Sprintf("error connecting to broker %s: %s\n", cfg.MQTTBroker, tok.Error()))
		os.Exit(1)
	}

	ch := locationStream(client, routeService)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /sse", stream(ch))

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

		srv.Shutdown(shutdownCtx)
		client.Disconnect(250)
		dashboardRepo.Close()
	}()

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error(fmt.Sprintf("error listening on port :%s : %s\n", cfg.HTTPPort, err))
		os.Exit(1)
	}
}

func locationStream(client mqtt.Client, rs *ui.RouteService) chan ui.MapLocation {
	ch := make(chan ui.MapLocation, 100)

	tok := client.Subscribe("datex/#", 0, func(c mqtt.Client, m mqtt.Message) {
		slog.Info(fmt.Sprintf("processing message [%d] from topic [%s]", m.MessageID(), m.Topic()))

		var record datex.Record
		if err := json.Unmarshal(m.Payload(), &record); err != nil {
			slog.Error(fmt.Sprintf("error unmarshalling payload from topic %s: %s\n", m.Topic(), err))
			return
		}

		recordType := datex.ExtractRecordType(m.Topic())

		loc := ui.RecordToMapLocation(&record, rs, recordType)
		if loc == nil {
			slog.Error(fmt.Sprintf("unable to convert record to location: %v", record))
			return
		}

		ch <- *loc
	})

	tok.Wait()

	return ch
}
