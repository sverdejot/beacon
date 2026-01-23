package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/signal"

	"github.com/sverdejot/beacon/internal/ingester"
	"github.com/sverdejot/beacon/pkg/datex"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

const (
	defaultBroker         = "tcp://localhost:1883"
	defaultClickHouseAddr = "localhost:9000"
	defaultClickHouseDB   = "beacon"
	defaultClickHouseUser = "default"
	defaultClickHousePass = ""
)

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	broker := getEnv("MQTT_BROKER", defaultBroker)
	chAddr := getEnv("CLICKHOUSE_ADDR", defaultClickHouseAddr)
	chDB := getEnv("CLICKHOUSE_DATABASE", defaultClickHouseDB)
	chUser := getEnv("CLICKHOUSE_USER", defaultClickHouseUser)
	chPass := getEnv("CLICKHOUSE_PASSWORD", defaultClickHousePass)

	slog.Info(fmt.Sprintf("connecting to MQTT broker: %s", broker))
	slog.Info(fmt.Sprintf("connecting to ClickHouse: %s/%s", chAddr, chDB))

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	ch, err := ingester.NewClickHouseClient(chAddr, chDB, chUser, chPass)
	if err != nil {
		slog.Error(fmt.Sprintf("failed to connect to clickhouse: %s", err))
		os.Exit(1)
	}
	defer ch.Close()
	slog.Info("connected to ClickHouse")

	opts := mqtt.NewClientOptions().
		AddBroker(broker).
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
