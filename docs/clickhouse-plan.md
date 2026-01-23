# ClickHouse Integration Plan for Beacon

## Overview

ClickHouse is a **column-oriented analytical database** designed for:
- **Fast reads** on large datasets (billions of rows)
- **Real-time analytics** with sub-second query response
- **Time-series data** (perfect for traffic events with timestamps)
- **Aggregations** (counts, averages, percentiles) at scale

## Architecture

```
┌─────────────┐     MQTT      ┌─────────────┐
│    Feed     │──────────────▶│     UI      │──────▶ Browser
│  (Kotlin)   │               │    (Go)     │
└─────────────┘               └──────┬──────┘
                                     │
                              MQTT   │
                                     ▼
                              ┌─────────────┐
                              │ ClickHouse  │◀──── Analytics queries
                              │  Consumer   │
                              └─────────────┘
```

A new service (or an addition to the UI service) subscribes to MQTT and inserts events into ClickHouse.

## Use Cases

| Use Case | Example Query |
|----------|---------------|
| **Historical analysis** | "Show all accidents on A-3 last month" |
| **Trends** | "What's the busiest hour for incidents in Madrid?" |
| **Heatmaps** | "Aggregate incident counts by province per day" |
| **Anomaly detection** | "Alert when incidents spike 3x above average" |
| **Duration tracking** | "Average time to clear vehicle obstructions" |
| **Dashboards** | Grafana or similar connected to ClickHouse |

## Why ClickHouse (vs Alternatives)

| Feature | ClickHouse | PostgreSQL | InfluxDB |
|---------|------------|------------|----------|
| Analytical queries | Excellent | Slower at scale | Time-series only |
| SQL support | Full SQL | Full SQL | InfluxQL/Flux |
| Insert speed | Very fast (batched) | Moderate | Fast |
| Storage efficiency | High (columnar) | Moderate | High |
| Learning curve | Moderate | Easy | Moderate |

## Data Mapping

Your MQTT messages contain fields that map well to ClickHouse:

- **id, version** — deduplication keys
- **timestamps** (startTime, endTime) — time-series indexing
- **location** (lat, lon, province, km) — geospatial grouping
- **severity, type, subtypes** — categorical aggregations
- **record_type** (from topic) — partitioning key

## Proposed Table Schema

```sql
CREATE TABLE traffic_incidents (
    id String,
    version UInt32,
    timestamp DateTime,
    end_timestamp Nullable(DateTime),
    province LowCardinality(String),
    record_type LowCardinality(String),
    severity LowCardinality(String),
    probability LowCardinality(String),
    lat Float64,
    lon Float64,
    km Nullable(Float32),
    cause_type LowCardinality(String),
    cause_subtypes Array(String),
    road_name Nullable(String),
    road_number Nullable(String),
    raw_json String  -- store full JSON for flexibility
) ENGINE = ReplacingMergeTree(version)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (province, record_type, timestamp, id);
```

### Schema Notes

- **ReplacingMergeTree**: Handles updates when same incident gets new version
- **LowCardinality**: Optimizes storage for columns with few distinct values
- **PARTITION BY month**: Efficient for time-range queries and data retention
- **ORDER BY**: Optimized for common query patterns (filter by province/type, then time)

## Implementation Options

### Option A: Extend UI Service (Go)
- Add ClickHouse client to existing Go service
- Reuse MQTT subscription logic
- Pros: Less infrastructure, shared code
- Cons: Mixes concerns, harder to scale independently

### Option B: New Dedicated Service (Go)
- Standalone service subscribing to MQTT
- Single responsibility: ingest to ClickHouse
- Pros: Clean separation, independent scaling
- Cons: Another service to maintain

### Option C: New Dedicated Service (Kotlin)
- Keep all data processing in Kotlin ecosystem
- Pros: Consistent with Feed service
- Cons: Duplicates MQTT subscription patterns

**Recommendation**: Option B (dedicated Go service) for clean separation while reusing Go patterns from UI service.

## Docker Compose Addition

```yaml
  clickhouse:
    image: clickhouse/clickhouse-server:latest
    ports:
      - "8123:8123"  # HTTP interface
      - "9000:9000"  # Native interface
    volumes:
      - clickhouse_data:/var/lib/clickhouse
      - ./clickhouse/init:/docker-entrypoint-initdb.d
    environment:
      CLICKHOUSE_DB: beacon
      CLICKHOUSE_USER: beacon
      CLICKHOUSE_PASSWORD: beacon

  ingester:
    build: ./ingester
    depends_on:
      - mqtt
      - clickhouse
    environment:
      MQTT_BROKER: tcp://mqtt:1883
      CLICKHOUSE_URL: clickhouse:9000
      CLICKHOUSE_DATABASE: beacon
```

## Example Queries

### Incidents per province (last 24h)
```sql
SELECT
    province,
    count() as incident_count
FROM traffic_incidents
WHERE timestamp > now() - INTERVAL 1 DAY
GROUP BY province
ORDER BY incident_count DESC;
```

### Hourly incident trend
```sql
SELECT
    toStartOfHour(timestamp) as hour,
    record_type,
    count() as incidents
FROM traffic_incidents
WHERE timestamp > now() - INTERVAL 7 DAY
GROUP BY hour, record_type
ORDER BY hour;
```

### Average incident duration by type
```sql
SELECT
    record_type,
    avg(dateDiff('minute', timestamp, end_timestamp)) as avg_duration_minutes
FROM traffic_incidents
WHERE end_timestamp IS NOT NULL
GROUP BY record_type;
```

## Next Steps

1. Add ClickHouse to docker-compose.yml
2. Create init SQL script with table schema
3. Create `ingester/` Go service with:
   - MQTT subscriber (reuse patterns from `ui/`)
   - ClickHouse batch inserter
   - Health check endpoint
4. Add Grafana for visualization (optional)
