package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
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
        w.Header().Set("Content-Type", "text/event-stream")
        w.Header().Set("Cache-Control", "no-cache")
        w.Header().Set("Connection", "keep-alive")

        rc := http.NewResponseController(w)
        for {
            select {
            case <-r.Context().Done():
                return
            case loc := <-ch:
                data, _ := json.Marshal(loc)
                fmt.Fprintf(w, "data: %s\n\n", data)
                err := rc.Flush()
                if err != nil {
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
    port := defaultHttpPort
    if envHttpPort := os.Getenv(httpPortEnvKey); envHttpPort != "" {
        port = envHttpPort
    }
    osrmUrl := defaultOsrmUrl
    if envOsrmUrl := os.Getenv(osrmUrlEnvKey); envOsrmUrl != "" {
        osrmUrl = envOsrmUrl
    }

    ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
    defer cancel()

    routeService := NewRouteService(osrmUrl)

    opts := mqtt.NewClientOptions().
        AddBroker(broker)
    client := mqtt.NewClient(opts)

    if tok := client.Connect(); tok.Wait() && tok.Error() != nil {
        fmt.Fprintf(os.Stderr, "error connecting to broker %s: %s\n", broker, tok.Error())
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

        shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer shutdownCancel()

        srv.Shutdown(shutdownCtx)
        client.Disconnect(250)
    }()

    if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        fmt.Fprintf(os.Stderr, "error listening on port :8081: %s\n", err)
        os.Exit(1)
    }
}

func locationStream(client mqtt.Client, rs *RouteService) chan MapLocation {
    ch := make(chan MapLocation, 100)

    tok := client.Subscribe("datex/#", 0, func(c mqtt.Client, m mqtt.Message) {
        var payload Record
        if err := json.Unmarshal(m.Payload(), &payload); err != nil {
            fmt.Fprintf(os.Stderr, "error unmarshalling payload from topic %s: %s\n", m.Topic(), err)
            return
        }

        loc := payload.ToMapLocation(rs)
        if loc == nil {
            return
        }

        ch<-*loc
    })

    tok.Wait()

    return ch
}

