package ingester

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/prometheus/client_golang/prometheus"
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
	cancel        context.CancelFunc
	done          chan struct{}
}

func NewClickHouseClient(addr, database, user, password string) (*ClickHouseClient, error) {
	slog.Debug("creating clickhouse client",
		slog.String("addr", addr),
		slog.String("database", database),
	)

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

	ctx, cancel := context.WithCancel(context.Background())
	client := &ClickHouseClient{
		conn:          conn,
		batch:         make([]Incident, 0, batchSize),
		batchSize:     batchSize,
		flushInterval: flushInterval,
		cancel:        cancel,
		done:          make(chan struct{}),
	}

	go client.periodicFlush(ctx)

	slog.Info("clickhouse client initialized",
		slog.Int("batch_size", batchSize),
		slog.Duration("flush_interval", flushInterval),
	)

	return client, nil
}

func (c *ClickHouseClient) Insert(ctx context.Context, inc *Incident) {
	c.batchMu.Lock()
	c.batch = append(c.batch, *inc)
	shouldFlush := len(c.batch) >= c.batchSize
	ClickHousePendingBatch.Set(float64(len(c.batch)))
	c.batchMu.Unlock()

	if shouldFlush {
		c.Flush(ctx)
	}
}

func (c *ClickHouseClient) Flush(ctx context.Context) {
	c.batchMu.Lock()
	if len(c.batch) == 0 {
		c.batchMu.Unlock()
		return
	}
	toInsert := c.batch
	c.batch = make([]Incident, 0, 100)
	ClickHousePendingBatch.Set(0)
	c.batchMu.Unlock()

	timer := prometheus.NewTimer(ClickHouseFlushDuration)
	defer timer.ObserveDuration()

	ClickHouseBatchSize.Observe(float64(len(toInsert)))

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
		slog.ErrorContext(ctx, "failed to prepare clickhouse batch",
			slog.String("error", err.Error()),
			slog.Int("batch_size", len(toInsert)),
		)
		ClickHouseErrors.WithLabelValues("prepare_batch").Inc()
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
			slog.ErrorContext(ctx, "failed to append incident to batch",
				slog.String("incident_id", inc.ID),
				slog.String("error", err.Error()),
			)
			ClickHouseErrors.WithLabelValues("append").Inc()
		}
	}

	if err := batch.Send(); err != nil {
		slog.ErrorContext(ctx, "failed to send batch to clickhouse",
			slog.String("error", err.Error()),
			slog.Int("batch_size", len(toInsert)),
		)
		ClickHouseErrors.WithLabelValues("send").Inc()
		return
	}

	ClickHouseInserts.Add(float64(len(toInsert)))
	slog.InfoContext(ctx, "batch inserted to clickhouse", slog.Int("count", len(toInsert)))
}

func (c *ClickHouseClient) periodicFlush(ctx context.Context) {
	defer close(c.done)
	ticker := time.NewTicker(c.flushInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			c.Flush(context.Background())
		}
	}
}

func (c *ClickHouseClient) Close() error {
	slog.Debug("closing clickhouse client, stopping periodic flush")
	c.cancel()
	<-c.done
	slog.Debug("periodic flush stopped, flushing remaining batch")
	c.Flush(context.Background())
	return c.conn.Close()
}

func (c *ClickHouseClient) SetEndTimestamp(ctx context.Context, id string, endTime time.Time) error {
	slog.DebugContext(ctx, "setting end timestamp for incident",
		slog.String("incident_id", id),
		slog.Time("end_time", endTime),
	)

	query := `
		ALTER TABLE traffic_incidents
		UPDATE end_timestamp = ?
		WHERE id = ? AND (end_timestamp = toDateTime('1970-01-01 00:00:00') OR end_timestamp > ?)
	`
	err := c.conn.Exec(ctx, query, endTime, id, endTime)
	if err != nil {
		slog.ErrorContext(ctx, "failed to set end timestamp",
			slog.String("incident_id", id),
			slog.String("error", err.Error()),
		)
		ClickHouseErrors.WithLabelValues("update").Inc()
	}
	return err
}
