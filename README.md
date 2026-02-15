# Beacon

<p align="center">
    Live at <a href="https://beacon.sverdejot.dev">https://beacon.sverdejot.dev</a>
</p>

<p align="center">
    <video src="https://github.com/user-attachments/assets/2ad1ce31-9286-427a-88bf-d81cafbdd8c5" width="80%" autoplay loop muted playsinline></video>
</p>

Real-time Spanish traffic incident monitoring system. Beacon ingests live data from Spain's DGT (Dirección General de Tráfico) DATEX II API, computes affected road segments, and serves them through a live map and analytics dashboard.


## Data Sources

- [DGT DATEX II API](https://nap.dgt.es/dataset?tags=datex2&res_format=datex2) — Traffic incident feed for Spain
- [Spain OpenStreetMap data](https://download.geofabrik.de/europe/spain-latest.osm.pbf) — Road network used by OSRM for route computation
- [DATEX II 3.6 XSD schemas](feed/app/src/main/resources/schema/) — Spanish extension schemas used for XML parsing

## Running Locally

### Prerequisites

Install all required tools via [`mise`](https://mise.jdx.dev/):

```bash
mise install
```

This installs Go, Node 20, Kotlin, Gradle, GraalVM, Docker, and other dependencies defined in [`.mise.toml`](.mise.toml).

You also need [Docker](https://docs.docker.com/get-docker/) and Docker Compose.

### OSRM Setup (one-time)

OSRM needs preprocessed routing data for Spain. Run these mise tasks once before starting:

```bash
mise run routing:fetch
mise run routing:extract
mise run routing:partition
mise run routing:customize
```

### Start

```bash
mise start
```

Once running:

| Service   | URL                    |
|-----------|------------------------|
| Dashboard | http://localhost:4321  |
| MQTT UI   | http://localhost:8080  |

## Public MQTT Feed

All traffic incident messages are also published to the [EMQX public broker](https://www.emqx.com/en/mqtt/public-mqtt5-broker) at `broker.emqx.io:1883`. You can subscribe to `beacon/#` to receive live updates.

Messages can be deserialised using the Go structs in [`pkg/datex`](pkg/datex/), installable as:

```bash
go get github.com/sverdejot/beacon/pkg/datex
```

Both the topic format (`beacon/v1/{country}/{region}/{category}/{event_type}`) and the message schema follow [semver](https://semver.org/) — the `v1` segment in the topic will be incremented on breaking changes.

```go
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/signal"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/sverdejot/beacon/pkg/datex"
)

func main() {
	opts := mqtt.NewClientOptions().AddBroker("tcp://broker.emqx.io:1883")
	client := mqtt.NewClient(opts)
	if tok := client.Connect(); tok.Wait() && tok.Error() != nil {
		panic(tok.Error())
	}

	client.Subscribe("beacon/#", 0, func(_ mqtt.Client, msg mqtt.Message) {
		topic := msg.Topic()
		region, eventType := datex.ExtractRegion(topic), datex.ExtractEventType(topic)

		if datex.IsDeletionTopic(topic) {
			var ev datex.DeletionEvent
			json.Unmarshal(msg.Payload(), &ev)
			fmt.Printf("[DEL] %s/%s id=%s\n", region, eventType, ev.ID)
		} else {
			var rec datex.Record
			json.Unmarshal(msg.Payload(), &rec)
			fmt.Printf("[UPD] %s/%s id=%s severity=%s\n", region, eventType, rec.ID, rec.Severity)
		}
	})

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt)
	<-sig
}
```

## Deploying to Kubernetes

The project uses `ArgoCD` with `kustomize``. Each service has its own directory under `manifests/` (api, ingester, feed, dashboard, broker, clickhouse, valkey, osrm).

### Secrets

ClickHouse credentials are stored as a Kubernetes Secret encrypted with [SOPS](https://github.com/getsops/sops) and [AGE](https://github.com/FiloSottile/age). To set up your own:

1. Generate an AGE key pair:

   ```bash
   age-keygen -o age.key
   ```

2. Create the secret file at `manifests/clickhouse/secret.yml`:

   ```yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: clickhouse-credentials
   type: Opaque
   stringData:
     username: your-username
     password: your-password
   ```

3. Encrypt it with SOPS using your AGE public key:

   ```bash
   sops --encrypt --age <your-age-public-key> \
        --encrypted-regex '^(data|stringData)$' \
        --in-place manifests/clickhouse/secret.yml
   ```
4. Apply the secret

    ```bash
    kubectl apply -f manifests/clickhouse/secret.yml
    ```

### ArgoCD Setup

Apply the ApplicationSet to have ArgoCD auto-sync all services:

```bash
kubectl apply -f manifests/application.yml
```

Once applied, ArgoCD watches every directory under `manifests/` and auto-syncs all resources — any change pushed to `main` will be automatically deployed with pruning and self-healing enabled.
