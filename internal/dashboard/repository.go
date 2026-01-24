package dashboard

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

type Repository struct {
	conn driver.Conn
}

func NewRepository(addr, database, user, password string) (*Repository, error) {
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

	return &Repository{conn: conn}, nil
}

func (r *Repository) Close() error {
	return r.conn.Close()
}

func (r *Repository) GetSummary(ctx context.Context) (*Summary, error) {
	summary := &Summary{}

	// Active incidents: end_timestamp is zero or in the future
	err := r.conn.QueryRow(ctx, `
		SELECT toInt32(count()) AS active_count
		FROM beacon.traffic_incidents FINAL
		WHERE end_timestamp = toDateTime(0) OR end_timestamp > now()
	`).Scan(&summary.ActiveIncidents)
	if err != nil {
		return nil, fmt.Errorf("failed to get active incidents: %w", err)
	}

	// severe incidents (active)
	err = r.conn.QueryRow(ctx, `
		SELECT toInt32(count()) AS severe_count
		FROM beacon.traffic_incidents FINAL
		WHERE (end_timestamp = toDateTime(0) OR end_timestamp > now())
		  AND severity IN ('high', 'highest')
	`).Scan(&summary.SevereIncidents)
	if err != nil {
		return nil, fmt.Errorf("failed to get severe incidents: %w", err)
	}

	// total (today)
	err = r.conn.QueryRow(ctx, `
		SELECT toInt32(count()) AS todays_total
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today()
	`).Scan(&summary.TodaysTotal)
	if err != nil {
		return nil, fmt.Errorf("failed to get today's total: %w", err)
	}

	// avg duration (completed incidents in last 7 days)
	err = r.conn.QueryRow(ctx, `
		SELECT toFloat64(if(count() > 0, avg(dateDiff('minute', timestamp, end_timestamp)), 0)) AS avg_duration
		FROM beacon.traffic_incidents FINAL
		WHERE end_timestamp > toDateTime(0)
		  AND end_timestamp != timestamp
		  AND timestamp >= today() - INTERVAL 7 DAY
	`).Scan(&summary.AvgDurationMins)
	if err != nil {
		return nil, fmt.Errorf("failed to get avg duration: %w", err)
	}

	return summary, nil
}

func (r *Repository) GetHourlyTrend(ctx context.Context) ([]HourlyDataPoint, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT toStartOfHour(timestamp) AS hour, toInt32(count()) AS count
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= now() - INTERVAL 24 HOUR
		GROUP BY hour
		ORDER BY hour
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get hourly trend: %w", err)
	}
	defer rows.Close()

	var data []HourlyDataPoint
	for rows.Next() {
		var dp HourlyDataPoint
		if err := rows.Scan(&dp.Hour, &dp.Count); err != nil {
			return nil, fmt.Errorf("failed to scan hourly row: %w", err)
		}
		data = append(data, dp)
	}

	return data, nil
}

func (r *Repository) GetDailyTrend(ctx context.Context) ([]DailyDataPoint, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT
			toStartOfDay(timestamp) AS date,
			toInt32(count()) AS count,
			toInt32(countIf(severity IN ('high', 'highest'))) AS severe_count
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today() - INTERVAL 30 DAY
		GROUP BY date
		ORDER BY date
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get daily trend: %w", err)
	}
	defer rows.Close()

	var data []DailyDataPoint
	for rows.Next() {
		var dp DailyDataPoint
		if err := rows.Scan(&dp.Date, &dp.Count, &dp.SevereCount); err != nil {
			return nil, fmt.Errorf("failed to scan daily row: %w", err)
		}
		data = append(data, dp)
	}

	return data, nil
}

func (r *Repository) GetSeverityDistribution(ctx context.Context) ([]DistributionItem, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT severity, toInt32(count()) AS count
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today() - INTERVAL 7 DAY
		  AND severity != ''
		GROUP BY severity
		ORDER BY count DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get severity distribution: %w", err)
	}
	defer rows.Close()

	var data []DistributionItem
	for rows.Next() {
		var item DistributionItem
		if err := rows.Scan(&item.Label, &item.Count); err != nil {
			return nil, fmt.Errorf("failed to scan severity row: %w", err)
		}
		data = append(data, item)
	}

	return data, nil
}

func (r *Repository) GetCauseTypeDistribution(ctx context.Context) ([]DistributionItem, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT cause_type, toInt32(count()) AS count
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today() - INTERVAL 7 DAY
		  AND cause_type != ''
		GROUP BY cause_type
		ORDER BY count DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get cause type distribution: %w", err)
	}
	defer rows.Close()

	var data []DistributionItem
	for rows.Next() {
		var item DistributionItem
		if err := rows.Scan(&item.Label, &item.Count); err != nil {
			return nil, fmt.Errorf("failed to scan cause type row: %w", err)
		}
		data = append(data, item)
	}

	return data, nil
}

func (r *Repository) GetProvinceDistribution(ctx context.Context) ([]DistributionItem, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT province, toInt32(count()) AS count
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today() - INTERVAL 7 DAY
		  AND province != ''
		GROUP BY province
		ORDER BY count DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get province distribution: %w", err)
	}
	defer rows.Close()

	var data []DistributionItem
	for rows.Next() {
		var item DistributionItem
		if err := rows.Scan(&item.Label, &item.Count); err != nil {
			return nil, fmt.Errorf("failed to scan province row: %w", err)
		}
		data = append(data, item)
	}

	return data, nil
}

func (r *Repository) GetTopRoads(ctx context.Context, limit int) ([]TopRoad, error) {
	if limit <= 0 {
		limit = 10
	}

	rows, err := r.conn.Query(ctx, `
		SELECT road_number, road_name, toInt32(count()) AS count
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today() - INTERVAL 7 DAY
		  AND road_number != ''
		GROUP BY road_number, road_name
		ORDER BY count DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get top roads: %w", err)
	}
	defer rows.Close()

	var data []TopRoad
	for rows.Next() {
		var road TopRoad
		if err := rows.Scan(&road.RoadNumber, &road.RoadName, &road.Count); err != nil {
			return nil, fmt.Errorf("failed to scan road row: %w", err)
		}
		data = append(data, road)
	}

	return data, nil
}

func (r *Repository) GetTopSubtypes(ctx context.Context, limit int) ([]TopSubtype, error) {
	if limit <= 0 {
		limit = 20
	}

	var total int32
	err := r.conn.QueryRow(ctx, `
		SELECT toInt32(count())
		FROM beacon.traffic_incidents FINAL
		ARRAY JOIN cause_subtypes AS subtype
		WHERE timestamp >= today() - INTERVAL 7 DAY
	`).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to get total subtypes: %w", err)
	}

	rows, err := r.conn.Query(ctx, `
		SELECT subtype, toInt32(count()) AS count
		FROM beacon.traffic_incidents FINAL
		ARRAY JOIN cause_subtypes AS subtype
		WHERE timestamp >= today() - INTERVAL 7 DAY
		GROUP BY subtype
		ORDER BY count DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get top subtypes: %w", err)
	}
	defer rows.Close()

	var data []TopSubtype
	for rows.Next() {
		var item TopSubtype
		if err := rows.Scan(&item.Subtype, &item.Count); err != nil {
			return nil, fmt.Errorf("failed to scan subtype row: %w", err)
		}
		if total > 0 {
			item.Percentage = float64(item.Count) / float64(total) * 100
		}
		data = append(data, item)
	}

	return data, nil
}

func (r *Repository) GetHeatmapData(ctx context.Context) ([]HeatmapPoint, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT
			round(lat, 2) AS lat,
			round(lon, 2) AS lon,
			toInt32(count()) AS weight
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today() - INTERVAL 7 DAY
		  AND lat != 0 AND lon != 0
		GROUP BY lat, lon
		ORDER BY weight DESC
		LIMIT 1000
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get heatmap data: %w", err)
	}
	defer rows.Close()

	var data []HeatmapPoint
	for rows.Next() {
		var point HeatmapPoint
		if err := rows.Scan(&point.Lat, &point.Lon, &point.Weight); err != nil {
			return nil, fmt.Errorf("failed to scan heatmap row: %w", err)
		}
		data = append(data, point)
	}

	return data, nil
}

func (r *Repository) GetActiveIncidents(ctx context.Context) ([]ActiveIncident, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT
			id,
			timestamp,
			province,
			road_number,
			road_name,
			severity,
			cause_type,
			toFloat64(dateDiff('minute', timestamp, now())) AS duration_mins,
			lat,
			lon
		FROM beacon.traffic_incidents FINAL
		WHERE end_timestamp = toDateTime(0) OR end_timestamp > now()
		ORDER BY timestamp DESC
		LIMIT 100
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get active incidents: %w", err)
	}
	defer rows.Close()

	var data []ActiveIncident
	for rows.Next() {
		var inc ActiveIncident
		if err := rows.Scan(
			&inc.ID,
			&inc.Timestamp,
			&inc.Province,
			&inc.RoadNumber,
			&inc.RoadName,
			&inc.Severity,
			&inc.CauseType,
			&inc.DurationMins,
			&inc.Lat,
			&inc.Lon,
		); err != nil {
			return nil, fmt.Errorf("failed to scan active incident row: %w", err)
		}
		data = append(data, inc)
	}

	return data, nil
}
