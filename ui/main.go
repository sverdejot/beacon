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
	"strings"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

const (
    localBroker = "tcp://localhost:1883"
    defaultHttpPort = "8081"
    defaultOsrmUrl = "http://localhost:5000"

    brokerEnvKey = "MQTT_BROKER"
    httpPortEnvKey = "HTTP_SERVER_PORT"
    osrmUrlEnvKey = "OSRM_URL"
)

//go:embed static/index.html
var html []byte

func index(w http.ResponseWriter, _ *http.Request) {
    w.Header().Add("Content-Type", "text/html")
    w.Write(html)
}

func stream(ch chan MapLocation) func(w http.ResponseWriter, r *http.Request) {
    return func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        slog.InfoContext(ctx, fmt.Sprintf("client connected"))
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
                    slog.ErrorContext(ctx, fmt.Sprintf("error marhshaling event at stream: %s", err))
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

func main() {
    broker := localBroker
    if envBroker := os.Getenv(brokerEnvKey); envBroker != "" {
        broker = envBroker
    }
    slog.Info(fmt.Sprintf("using [%s] as broker", broker))
    port := defaultHttpPort
    if envHttpPort := os.Getenv(httpPortEnvKey); envHttpPort != "" {
        port = envHttpPort
    }
    slog.Info(fmt.Sprintf("using [%s] as http port", port))

    osrmUrl := defaultOsrmUrl
    if envOsrmUrl := os.Getenv(osrmUrlEnvKey); envOsrmUrl != "" {
        osrmUrl = envOsrmUrl
    }
    slog.Info(fmt.Sprintf("using [%s] as OSRM host", port))

    ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
    defer cancel()

    routeService := NewRouteService(osrmUrl)

    opts := mqtt.NewClientOptions().
        AddBroker(broker)
    client := mqtt.NewClient(opts)

    if tok := client.Connect(); tok.Wait() && tok.Error() != nil {
        slog.Error(fmt.Sprintf("error connecting to broker %s: %s\n", broker, tok.Error()))
        os.Exit(1)
    }

    ch := locationStream(client, routeService)

    mux := http.NewServeMux()
    mux.HandleFunc("/", index)
    mux.HandleFunc("/sse", stream(ch))

    srv := &http.Server{
        Addr:    ":" + port,
        Handler: mux,
    }

    go func() {
        <-ctx.Done()
        slog.Info(fmt.Sprintf("shutting down. 5secs timeout until all connections are closed"))

        shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer shutdownCancel()

        srv.Shutdown(shutdownCtx)
        client.Disconnect(250)
    }()

    if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        slog.Error(fmt.Sprintf("error listening on port :%s : %s\n", broker, err))
        os.Exit(1)
    }
}

func locationStream(client mqtt.Client, rs *RouteService) chan MapLocation {
    ch := make(chan MapLocation, 100)

    tok := client.Subscribe("datex/#", 0, func(c mqtt.Client, m mqtt.Message) {
        slog.Info(fmt.Sprintf("processing message [%d] from topic [%s]", m.MessageID(), m.Topic()))

        var payload Record
        if err := json.Unmarshal(m.Payload(), &payload); err != nil {
            slog.Error(fmt.Sprintf("error unmarshalling payload from topic %s: %s\n", m.Topic(), err))
            return
        }

        recordType := extractRecordType(m.Topic())

        loc := payload.ToMapLocation(rs, recordType)
        if loc == nil {
            slog.Error(fmt.Sprintf("unable to convert record to location: %v", payload))
            return
        }

        ch<-*loc
    })

    tok.Wait()

    return ch
}

// datex/situations/{province}/{record_type} || datex/situations/{province}/causes/{cause_type}
func extractRecordType(topic string) string {
    parts := strings.Split(topic, "/")
    if len(parts) < 4 {
        return ""
    }
    return strings.Join(parts[3:], "/")
}

