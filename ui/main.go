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

    brokerEnvKey = "MQTT_BROKER"
    httpPortEnvKey = "HTTP_SERVER_PORT"
)

type Record struct {
    Location Location `json:"location"`
}

type Location struct {
    Segment *Segment`json:"linear,omitempty"`
    Single *Single `json:"point,omitempty"`
}

type Segment struct {
    From Point `json:"from"`
    To   Point `json:"to"`
}

type Single struct {
    Point Point`json:"point"`
}

type Point struct {
    Coordinates Coordinates `json:"coordinates"`
}

type Coordinates struct {
    Lat float64 `json:"lat"`
    Lon float64 `json:"lon"`
}

func (c Coordinates) Empty() bool {
    return c.Lat == 0.0 && c.Lon == 0.0
}

func (r Record) GetCoordinates() Coordinates {
    if r.Location.Segment != nil {
        return r.Location.Segment.From.Coordinates
    }
    if r.Location.Single != nil {
        return r.Location.Single.Point.Coordinates
    }
    return Coordinates{}
}

//go:embed static/index.html
var html []byte

func index(w http.ResponseWriter, _ *http.Request) {
    w.Header().Add("Content-Type", "text/html")
    w.Write(html)
}

func stream(ch chan Coordinates) func(w http.ResponseWriter, r *http.Request) {
    return func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "text/event-stream")
        w.Header().Set("Cache-Control", "no-cache")
        w.Header().Set("Connection", "keep-alive")

        rc := http.NewResponseController(w)
        t := time.NewTicker(time.Second)
        defer t.Stop()
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
        port  = envHttpPort
    }

    ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
    defer cancel()

    opts := mqtt.NewClientOptions().
        AddBroker(broker)
    client := mqtt.NewClient(opts)

    if tok := client.Connect(); tok.Wait() && tok.Error() != nil {
        fmt.Fprintf(os.Stderr, "error connecting to broker %s: %s\n", broker, tok.Error())
        os.Exit(1)
    }

    ch := locationStream(client)

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

func locationStream(client mqtt.Client) chan Coordinates {
    ch := make(chan Coordinates, 100)

    tok := client.Subscribe("datex/#", 0, func(c mqtt.Client, m mqtt.Message) {
        var payload Record
        if err := json.Unmarshal(m.Payload(), &payload); err != nil {
            fmt.Fprintf(os.Stderr, "error unmarshalling payload from topic %s: %s\n", m.Topic(), err)
            return
        }

        coords := payload.GetCoordinates()
        if coords.Empty() {
            return
        }

        ch<-coords
    })

    tok.Wait()

    return ch
}

