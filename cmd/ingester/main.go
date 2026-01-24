package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/signal"

	"github.com/caarlos0/env/v11"
	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/sverdejot/beacon/internal/cache"
	"github.com/sverdejot/beacon/internal/ingester"
	"github.com/sverdejot/beacon/internal/shared"
	"github.com/sverdejot/beacon/internal/routing"
	"github.com/sverdejot/beacon/pkg/datex"
)

func main() {
	cfg, err := env.ParseAs[config]()
	if err != nil {
		slog.Error(fmt.Sprintf("failed to parse config: %s", err))
		os.Exit(1)
	}

	slog.Info(fmt.Sprintf("connecting to MQTT broker: %s", cfg.MQTTBroker))
	slog.Info(fmt.Sprintf("connecting to ClickHouse: %s/%s", cfg.ClickHouseAddr, cfg.ClickHouseDatabase))
	slog.Info(fmt.Sprintf("using OSRM at: %s", cfg.OSRMURL))
	slog.Info(fmt.Sprintf("using Redis at: %s", cfg.RedisAddr))

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	ch, err := ingester.NewClickHouseClient(cfg.ClickHouseAddr, cfg.ClickHouseDatabase, cfg.ClickHouseUser, cfg.ClickHousePassword)
	if err != nil {
		slog.Error(fmt.Sprintf("failed to connect to clickhouse: %s", err))
		os.Exit(1)
	}
	defer ch.Close() //nolint:errcheck
	slog.Info("connected to ClickHouse")

	routeService := routing.NewRouteService(cfg.OSRMURL)
	slog.Info("initialized OSRM route service")

	mapCache, err := cache.NewCache(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		slog.Error(fmt.Sprintf("failed to connect to Redis: %s", err))
		os.Exit(1)
	}
	slog.Info("connected to Redis")

	opts := mqtt.NewClientOptions().
		AddBroker(cfg.MQTTBroker).
		SetClientID("beacon-ingester")
	client := mqtt.NewClient(opts)

	if tok := client.Connect(); tok.Wait() && tok.Error() != nil {
		slog.Error(fmt.Sprintf("failed to connect to MQTT broker: %s", tok.Error()))
		os.Exit(1)
	}
	slog.Info("connected to MQTT broker")

	tok := client.Subscribe("beacon/#", 1, func(c mqtt.Client, m mqtt.Message) {
		slog.Info(fmt.Sprintf("received message [%d] from topic [%s]", m.MessageID(), m.Topic()))

		var record datex.Record
		rawJSON := string(m.Payload())
		if err := json.Unmarshal(m.Payload(), &record); err != nil {
			slog.Error(fmt.Sprintf("failed to unmarshal message: %s", err))
			return
		}

		eventType := datex.ExtractEventType(m.Topic())

		// Compute MapLocation with OSRM route
		loc := shared.RecordToMapLocation(&record, routeService, eventType)
		if loc != nil {
			// Store in Valkey cache for map UI
			if err := mapCache.StoreMapLocation(context.Background(), loc, record.Validity); err != nil {
				slog.Error(fmt.Sprintf("failed to store location in cache: %s", err))
			}
		}

		// Create incident with polyline for ClickHouse
		incident := ingester.RecordToIncidentWithRoute(&record, m.Topic(), rawJSON, loc)
		ch.Insert(incident)
	})

	if tok.Wait() && tok.Error() != nil {
		slog.Error(fmt.Sprintf("failed to subscribe: %s", tok.Error()))
		os.Exit(1)
	}
	slog.Info("subscribed to beacon/# topics")

	<-ctx.Done()
	slog.Info("shutting down...")

	client.Disconnect(250)
	mapCache.Close()
	ch.Close() //nolint:errcheck

	slog.Info("shutdown complete")
}
