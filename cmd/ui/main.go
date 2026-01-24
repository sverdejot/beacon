package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/sverdejot/beacon/internal/dashboard"
	"github.com/sverdejot/beacon/internal/ui"
	"github.com/sverdejot/beacon/pkg/datex"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

const (
	localBroker     = "tcp://localhost:1883"
	defaultHttpPort = "8081"
	defaultOsrmUrl  = "http://localhost:5000"

	// ClickHouse defaults
	defaultClickHouseAddr     = "localhost:9000"
	defaultClickHouseDatabase = "beacon"
	defaultClickHouseUser     = "beacon"
	defaultClickHousePassword = "beacon"

	brokerEnvKey   = "MQTT_BROKER"
	httpPortEnvKey = "HTTP_SERVER_PORT"
	osrmUrlEnvKey  = "OSRM_URL"

	// ClickHouse env keys
	clickHouseAddrEnvKey     = "CLICKHOUSE_ADDR"
	clickHouseDatabaseEnvKey = "CLICKHOUSE_DATABASE"
	clickHouseUserEnvKey     = "CLICKHOUSE_USER"
	clickHousePasswordEnvKey = "CLICKHOUSE_PASSWORD"
)

//go:embed static/index.html
var html []byte

func index(w http.ResponseWriter, _ *http.Request) {
	w.Header().Add("Content-Type", "text/html")
	w.Write(html)
}

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

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
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
	broker := getEnv(brokerEnvKey, localBroker)
	slog.Info(fmt.Sprintf("using [%s] as broker", broker))

	port := getEnv(httpPortEnvKey, defaultHttpPort)
	slog.Info(fmt.Sprintf("using [%s] as http port", port))

	osrmUrl := getEnv(osrmUrlEnvKey, defaultOsrmUrl)
	slog.Info(fmt.Sprintf("using [%s] as OSRM host", osrmUrl))

	// ClickHouse configuration
	chAddr := getEnv(clickHouseAddrEnvKey, defaultClickHouseAddr)
	chDatabase := getEnv(clickHouseDatabaseEnvKey, defaultClickHouseDatabase)
	chUser := getEnv(clickHouseUserEnvKey, defaultClickHouseUser)
	chPassword := getEnv(clickHousePasswordEnvKey, defaultClickHousePassword)
	slog.Info(fmt.Sprintf("using [%s] as ClickHouse address", chAddr))

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	// Initialize ClickHouse repository for dashboard
	dashboardRepo, err := dashboard.NewRepository(chAddr, chDatabase, chUser, chPassword)
	if err != nil {
		slog.Error(fmt.Sprintf("failed to connect to ClickHouse: %s", err))
		os.Exit(1)
	}
	dashboardHandler := dashboard.NewHandler(dashboardRepo)

	routeService := ui.NewRouteService(osrmUrl)

	opts := mqtt.NewClientOptions().
		AddBroker(broker)
	client := mqtt.NewClient(opts)

	if tok := client.Connect(); tok.Wait() && tok.Error() != nil {
		slog.Error(fmt.Sprintf("error connecting to broker %s: %s\n", broker, tok.Error()))
		os.Exit(1)
	}

	ch := locationStream(client, routeService)

	mux := http.NewServeMux()

	// Map streaming routes
	mux.HandleFunc("GET /", index)
	mux.HandleFunc("GET /sse", stream(ch))

	// Dashboard API routes (with CORS for dev server)
	dashboardHandler.RegisterRoutes(mux)

	srv := &http.Server{
		Addr:    ":" + port,
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
		slog.Error(fmt.Sprintf("error listening on port :%s : %s\n", port, err))
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
