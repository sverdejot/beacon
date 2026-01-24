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
	"github.com/sverdejot/beacon/internal/ingester"
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

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	ch, err := ingester.NewClickHouseClient(cfg.ClickHouseAddr, cfg.ClickHouseDatabase, cfg.ClickHouseUser, cfg.ClickHousePassword)
	if err != nil {
		slog.Error(fmt.Sprintf("failed to connect to clickhouse: %s", err))
		os.Exit(1)
	}
	defer ch.Close()
	slog.Info("connected to ClickHouse")

	opts := mqtt.NewClientOptions().
		AddBroker(cfg.MQTTBroker).
		SetClientID("beacon-ingester")
	client := mqtt.NewClient(opts)

	if tok := client.Connect(); tok.Wait() && tok.Error() != nil {
		slog.Error(fmt.Sprintf("failed to connect to MQTT broker: %s", tok.Error()))
		os.Exit(1)
	}
	slog.Info("connected to MQTT broker")

	tok := client.Subscribe("datex/#", 1, func(c mqtt.Client, m mqtt.Message) {
		slog.Info(fmt.Sprintf("received message [%d] from topic [%s]", m.MessageID(), m.Topic()))

		var record datex.Record
		rawJSON := string(m.Payload())
		if err := json.Unmarshal(m.Payload(), &record); err != nil {
			slog.Error(fmt.Sprintf("failed to unmarshal message: %s", err))
			return
		}

		incident := ingester.RecordToIncident(&record, m.Topic(), rawJSON)
		ch.Insert(incident)
	})

	if tok.Wait() && tok.Error() != nil {
		slog.Error(fmt.Sprintf("failed to subscribe: %s", tok.Error()))
		os.Exit(1)
	}
	slog.Info("subscribed to datex/# topics")

	<-ctx.Done()
	slog.Info("shutting down...")

	client.Disconnect(250)
	ch.Close()

	slog.Info("shutdown complete")
}
