package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"sync"

	"github.com/caarlos0/env/v11"
	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/sverdejot/beacon/internal/cache"
	"github.com/sverdejot/beacon/internal/ingester"
	"github.com/sverdejot/beacon/internal/routing"
	"github.com/sverdejot/beacon/internal/shared"
	"github.com/sverdejot/beacon/pkg/datex"
)

func main() {
	// Configure structured JSON logging for production
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	slog.Info("starting ingester service")

	cfg, err := env.ParseAs[config]()
	if err != nil {
		slog.Error("failed to parse config", slog.String("error", err.Error()))
		os.Exit(1)
	}

	slog.Info("configuration loaded",
		slog.String("mqtt_broker", cfg.MQTTBroker),
		slog.String("clickhouse_addr", cfg.ClickHouseAddr),
		slog.String("clickhouse_database", cfg.ClickHouseDatabase),
		slog.String("osrm_url", cfg.OSRMURL),
		slog.String("redis_addr", cfg.RedisAddr),
		slog.String("metrics_port", cfg.MetricsPort),
	)

	// Start metrics server
	go func() {
		http.Handle("/metrics", promhttp.Handler())
		http.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK")) //nolint:errcheck
		})
		slog.Info("starting metrics server", slog.String("port", cfg.MetricsPort))
		if err := http.ListenAndServe(":"+cfg.MetricsPort, nil); err != nil {
			slog.Error("metrics server failed", slog.String("error", err.Error()))
		}
	}()

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	// Connect to ClickHouse
	slog.Info("connecting to clickhouse", slog.String("addr", cfg.ClickHouseAddr))
	ch, err := ingester.NewClickHouseClient(cfg.ClickHouseAddr, cfg.ClickHouseDatabase, cfg.ClickHouseUser, cfg.ClickHousePassword)
	if err != nil {
		slog.Error("failed to connect to clickhouse", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer ch.Close() //nolint:errcheck
	slog.Info("connected to clickhouse")

	// Initialize OSRM
	routeService := routing.NewRouteService(cfg.OSRMURL)
	slog.Info("initialized osrm route service", slog.String("url", cfg.OSRMURL))

	// Connect to Redis/Valkey
	slog.Info("connecting to redis", slog.String("addr", cfg.RedisAddr))
	mapCache, err := cache.NewCache(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		slog.Error("failed to connect to redis", slog.String("error", err.Error()))
		os.Exit(1)
	}
	slog.Info("connected to redis")

	// Connect to MQTT
	slog.Info("connecting to mqtt broker", slog.String("broker", cfg.MQTTBroker))
	opts := mqtt.NewClientOptions().
		AddBroker(cfg.MQTTBroker).
		SetClientID("beacon-ingester")
	client := mqtt.NewClient(opts)

	if tok := client.Connect(); tok.Wait() && tok.Error() != nil {
		slog.Error("failed to connect to mqtt broker", slog.String("error", tok.Error().Error()))
		os.Exit(1)
	}
	slog.Info("connected to mqtt broker")

	// Worker pool for non-blocking MQTT message processing
	const workerCount = 8
	const queueSize = 1024

	type mqttMsg struct {
		topic   string
		payload []byte
	}

	workCh := make(chan mqttMsg, queueSize)

	// Start workers
	var wg sync.WaitGroup
	for i := range workerCount {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			slog.Debug("worker started", slog.Int("worker_id", id))
			for msg := range workCh {
				ingester.WorkerPoolQueueSize.Set(float64(len(workCh)))
				processMessage(msg.topic, msg.payload, ch, mapCache, routeService)
			}
			slog.Debug("worker stopped", slog.Int("worker_id", id))
		}(i)
	}

	tok := client.Subscribe("beacon/#", 1, func(c mqtt.Client, m mqtt.Message) {
		msg := mqttMsg{
			topic:   m.Topic(),
			payload: make([]byte, len(m.Payload())),
		}
		copy(msg.payload, m.Payload())

		select {
		case workCh <- msg:
			ingester.WorkerPoolQueueSize.Set(float64(len(workCh)))
		default:
			ingester.WorkerPoolDropped.Inc()
			slog.Warn("worker pool full, dropping message",
				slog.String("topic", msg.topic),
			)
		}
	})

	if tok.Wait() && tok.Error() != nil {
		slog.Error("failed to subscribe to mqtt topics", slog.String("error", tok.Error().Error()))
		os.Exit(1)
	}
	slog.Info("subscribed to mqtt topics", slog.String("pattern", "beacon/#"))

	<-ctx.Done()
	slog.Info("shutdown signal received, stopping services...")

	client.Disconnect(250)
	slog.Debug("disconnected from mqtt broker")

	close(workCh)
	wg.Wait()
	slog.Debug("worker pool drained")

	mapCache.Close()
	slog.Debug("closed redis connection")

	ch.Close() //nolint:errcheck
	slog.Debug("closed clickhouse connection")

	slog.Info("shutdown complete")
}

func processMessage(topic string, payload []byte, ch *ingester.ClickHouseClient, mapCache *cache.Cache, routeService *routing.RouteService) {
	msgCtx := context.Background()

	slog.Debug("processing mqtt message",
		slog.String("topic", topic),
		slog.Int("payload_size", len(payload)),
	)

	if datex.IsDeletionTopic(topic) {
		ingester.MQTTMessagesReceived.WithLabelValues("deletion").Inc()

		var deletion datex.DeletionEvent
		if err := json.Unmarshal(payload, &deletion); err != nil {
			slog.Error("failed to unmarshal deletion message",
				slog.String("topic", topic),
				slog.String("error", err.Error()),
			)
			ingester.MQTTProcessingErrors.Inc()
			return
		}

		slog.Info("processing deletion",
			slog.String("incident_id", deletion.ID),
			slog.Time("deleted_at", deletion.DeletedAt),
		)

		if err := mapCache.RemoveMapLocation(msgCtx, deletion.ID); err != nil {
			slog.Error("failed to remove location from cache",
				slog.String("incident_id", deletion.ID),
				slog.String("error", err.Error()),
			)
		} else {
			slog.Debug("removed incident from cache", slog.String("incident_id", deletion.ID))
		}

		if err := ch.SetEndTimestamp(msgCtx, deletion.ID, deletion.DeletedAt); err != nil {
			slog.Error("failed to set end timestamp in clickhouse",
				slog.String("incident_id", deletion.ID),
				slog.String("error", err.Error()),
			)
		} else {
			slog.Debug("marked incident as ended in clickhouse", slog.String("incident_id", deletion.ID))
		}

		ingester.DeletionsProcessed.Inc()
		return
	}

	ingester.MQTTMessagesReceived.WithLabelValues("situation").Inc()

	var record datex.Record
	rawJSON := string(payload)
	if err := json.Unmarshal(payload, &record); err != nil {
		slog.Error("failed to unmarshal situation message",
			slog.String("topic", topic),
			slog.String("error", err.Error()),
		)
		ingester.MQTTProcessingErrors.Inc()
		return
	}

	eventType := datex.ExtractEventType(topic)

	slog.Debug("processing situation",
		slog.String("incident_id", record.ID),
		slog.String("event_type", eventType),
		slog.String("severity", record.Severity),
	)

	loc := shared.RecordToMapLocation(&record, routeService, eventType)
	if loc != nil {
		if err := mapCache.StoreMapLocation(msgCtx, loc, record.Validity); err != nil {
			slog.Error("failed to store location in cache",
				slog.String("incident_id", record.ID),
				slog.String("error", err.Error()),
			)
		}
	}

	incident := ingester.RecordToIncidentWithRoute(&record, topic, rawJSON, loc)
	ch.Insert(msgCtx, incident)

	slog.Debug("incident processed",
		slog.String("incident_id", record.ID),
		slog.String("province", incident.Province),
		slog.String("event_type", eventType),
	)
}
