package ingester

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

const (
	batchSize     = 100
	flushInterval = 5 * time.Second
)

type ClickHouseClient struct {
	conn          driver.Conn
	batch         []Incident
	batchMu       sync.Mutex
	batchSize     int
	flushInterval time.Duration
}

func NewClickHouseClient(addr, database, user, password string) (*ClickHouseClient, error) {
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{addr},
		Auth: clickhouse.Auth{
			Database: database,
			Username: user,
			Password: password,
		},
		Settings: clickhouse.Settings{
			"max_execution_time": 60,
		},
		DialTimeout:     10 * time.Second,
		ConnMaxLifetime: time.Hour,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to clickhouse: %w", err)
	}

	if err := conn.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ping clickhouse: %w", err)
	}

	client := &ClickHouseClient{
		conn:          conn,
		batch:         make([]Incident, 0, batchSize),
		batchSize:     batchSize,
		flushInterval: flushInterval,
	}

	go client.periodicFlush()

	return client, nil
}

func (c *ClickHouseClient) Insert(inc *Incident) {
	c.batchMu.Lock()
	c.batch = append(c.batch, *inc)
	shouldFlush := len(c.batch) >= c.batchSize
	c.batchMu.Unlock()

	if shouldFlush {
		c.Flush()
	}
}

func (c *ClickHouseClient) Flush() {
	c.batchMu.Lock()
	if len(c.batch) == 0 {
		c.batchMu.Unlock()
		return
	}
	toInsert := c.batch
	c.batch = make([]Incident, 0, 100)
	c.batchMu.Unlock()

	ctx := context.Background()
	batch, err := c.conn.PrepareBatch(ctx, `
		INSERT INTO traffic_incidents (
			id, version, timestamp, end_timestamp, province, record_type,
			severity, probability, lat, lon, km, cause_type, cause_subtypes,
			road_name, road_number, raw_json, location_type,
			name, direction, length_meters, to_lat, to_lon, to_km,
			municipality, autonomous_community, delay_minutes, mobility, road_destination
		)
	`)
	if err != nil {
		slog.Error(fmt.Sprintf("failed to prepare batch: %s", err))
		return
	}

	for _, inc := range toInsert {
		var endTs time.Time
		if inc.EndTimestamp != nil {
			endTs = *inc.EndTimestamp
		}

		var km float32
		if inc.Km != nil {
			km = *inc.Km
		}

		var toKm float32
		if inc.ToKm != nil {
			toKm = *inc.ToKm
		}

		subtypes := inc.CauseSubtypes
		if subtypes == nil {
			subtypes = []string{}
		}

		err := batch.Append(
			inc.ID,
			inc.Version,
			inc.Timestamp,
			endTs,
			inc.Province,
			inc.RecordType,
			inc.Severity,
			inc.Probability,
			inc.Lat,
			inc.Lon,
			km,
			inc.CauseType,
			subtypes,
			inc.RoadName,
			inc.RoadNumber,
			inc.RawJSON,
			inc.LocationType,
			inc.Name,
			inc.Direction,
			inc.LengthMeters,
			inc.ToLat,
			inc.ToLon,
			toKm,
			inc.Municipality,
			inc.AutonomousCommunity,
			inc.DelayMinutes,
			inc.Mobility,
			inc.RoadDestination,
		)
		if err != nil {
			slog.Error(fmt.Sprintf("failed to append to batch: %s", err))
		}
	}

	if err := batch.Send(); err != nil {
		slog.Error(fmt.Sprintf("failed to send batch: %s", err))
		return
	}

	slog.Info(fmt.Sprintf("inserted %d incidents into clickhouse", len(toInsert)))
}

func (c *ClickHouseClient) periodicFlush() {
	ticker := time.NewTicker(c.flushInterval)
	for range ticker.C {
		c.Flush()
	}
}

func (c *ClickHouseClient) Close() error {
	c.Flush()
	return c.conn.Close()
}

func (c *ClickHouseClient) SetEndTimestamp(id string, endTime time.Time) error {
	query := `
		ALTER TABLE traffic_incidents
		UPDATE end_timestamp = ?
		WHERE id = ? AND (end_timestamp = toDateTime('1970-01-01 00:00:00') OR end_timestamp > ?)
	`
	return c.conn.Exec(context.Background(), query, endTime, id, endTime)
}
