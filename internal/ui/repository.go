package ui

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/prometheus/client_golang/prometheus"
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

func (r *Repository) observeQuery(queryName string) func() {
	timer := prometheus.NewTimer(ClickHouseQueryDuration.WithLabelValues(queryName))
	return func() {
		timer.ObserveDuration()
	}
}

func (r *Repository) recordQueryError(queryName string) {
	ClickHouseQueryErrors.WithLabelValues(queryName).Inc()
}

func (r *Repository) GetSummary(ctx context.Context) (*Summary, error) {
	defer r.observeQuery("summary")()
	summary := &Summary{}

	err := r.conn.QueryRow(ctx, `
		SELECT toInt32(count()) AS active_count
		FROM beacon.traffic_incidents FINAL
		WHERE end_timestamp = toDateTime(0) OR end_timestamp > now()
	`).Scan(&summary.ActiveIncidents)
	if err != nil {
		r.recordQueryError("summary")
		return nil, fmt.Errorf("failed to get active incidents: %w", err)
	}

	err = r.conn.QueryRow(ctx, `
		SELECT toInt32(count()) AS severe_count
		FROM beacon.traffic_incidents FINAL
		WHERE (end_timestamp = toDateTime(0) OR end_timestamp > now())
		  AND severity IN ('high', 'highest')
	`).Scan(&summary.SevereIncidents)
	if err != nil {
		return nil, fmt.Errorf("failed to get severe incidents: %w", err)
	}

	err = r.conn.QueryRow(ctx, `
		SELECT toInt32(count()) AS todays_total
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today()
	`).Scan(&summary.TodaysTotal)
	if err != nil {
		return nil, fmt.Errorf("failed to get today's total: %w", err)
	}

	// Peak hour today (hour with most incidents)
	err = r.conn.QueryRow(ctx, `
		SELECT 
			toInt32(toHour(timestamp)) AS hour,
			toInt32(count()) AS cnt
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today()
		GROUP BY hour
		ORDER BY cnt DESC
		LIMIT 1
	`).Scan(&summary.PeakHour, &summary.PeakHourCount)
	if err != nil {
		// Not fatal - might be no incidents today
		summary.PeakHour = -1
		summary.PeakHourCount = 0
	}

	return summary, nil
}

func (r *Repository) GetHourlyTrend(ctx context.Context) ([]HourlyDataPoint, error) {
	defer r.observeQuery("hourly_trend")()
	rows, err := r.conn.Query(ctx, `
		SELECT toStartOfHour(timestamp) AS hour, toInt32(count()) AS count
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= now() - INTERVAL 24 HOUR
		GROUP BY hour
		ORDER BY hour
	`)
	if err != nil {
		r.recordQueryError("hourly_trend")
		return nil, fmt.Errorf("failed to get hourly trend: %w", err)
	}
	defer rows.Close() //nolint:errcheck

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
	defer r.observeQuery("daily_trend")()
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
		r.recordQueryError("daily_trend")
		return nil, fmt.Errorf("failed to get daily trend: %w", err)
	}
	defer rows.Close() //nolint:errcheck

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
		  AND severity <> ''
		GROUP BY severity
		ORDER BY count DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get severity distribution: %w", err)
	}
	defer rows.Close() //nolint:errcheck

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
		  AND cause_type <> ''
		GROUP BY cause_type
		ORDER BY count DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get cause type distribution: %w", err)
	}
	defer rows.Close() //nolint:errcheck

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
		  AND province <> ''
		GROUP BY province
		ORDER BY count DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get province distribution: %w", err)
	}
	defer rows.Close() //nolint:errcheck

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
		SELECT road_name, toInt32(count()) AS count
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today() - INTERVAL 7 DAY
		  AND road_name <> ''
		GROUP BY road_name
		ORDER BY count DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get top roads: %w", err)
	}
	defer rows.Close() //nolint:errcheck

	var data []TopRoad
	for rows.Next() {
		var road TopRoad
		if err := rows.Scan(&road.Road, &road.Count); err != nil {
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
	defer rows.Close() //nolint:errcheck

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
	defer r.observeQuery("heatmap")()
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
		r.recordQueryError("heatmap")
		return nil, fmt.Errorf("failed to get heatmap data: %w", err)
	}
	defer rows.Close() //nolint:errcheck

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
	defer r.observeQuery("active_incidents")()
	rows, err := r.conn.Query(ctx, `
		SELECT
			id,
			timestamp,
			province,
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
		r.recordQueryError("active_incidents")
		return nil, fmt.Errorf("failed to get active incidents: %w", err)
	}
	defer rows.Close() //nolint:errcheck

	var data []ActiveIncident
	for rows.Next() {
		var inc ActiveIncident
		if err := rows.Scan(
			&inc.ID,
			&inc.Timestamp,
			&inc.Province,
			&inc.RoadNumber,
			&inc.Severity,
			&inc.CauseType,
			&inc.DurationMins,
			&inc.Lat,
			&inc.Lon,
		); err != nil {
			return nil, fmt.Errorf("failed to scan active incident row: %w", err)
		}
		inc.RoadName = ""
		data = append(data, inc)
	}

	return data, nil
}

func (r *Repository) GetImpactSummary(ctx context.Context) (*ImpactSummary, error) {
	summary := &ImpactSummary{}

	err := r.conn.QueryRow(ctx, `
		SELECT
			toFloat64(sum(length_meters) / 1000) AS total_km,
			toFloat64(if(countIf(length_meters > 0) > 0, sum(length_meters) / countIf(length_meters > 0) / 1000, 0)) AS avg_km,
			toInt32(countIf(length_meters > 0)) AS incidents_with_km
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today() - INTERVAL 7 DAY
	`).Scan(
		&summary.TotalAffectedKm,
		&summary.AvgAffectedKm,
		&summary.IncidentsWithKm,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get km metrics: %w", err)
	}

	err = r.conn.QueryRow(ctx, `
		SELECT province, toInt32(count()) AS cnt
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today() - INTERVAL 7 DAY
		  AND province <> ''
		GROUP BY province
		ORDER BY cnt DESC
		LIMIT 1
	`).Scan(&summary.TopProvince, &summary.TopProvinceCount)
	if err != nil {
		summary.TopProvince = "N/A"
		summary.TopProvinceCount = 0
	}

	err = r.conn.QueryRow(ctx, `
		SELECT 
			if(road_number <> '', road_number, road_name) AS road,
			toInt32(count()) AS cnt
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today() - INTERVAL 7 DAY
		  AND (road_number <> '' OR road_name <> '')
		GROUP BY road
		ORDER BY cnt DESC
		LIMIT 1
	`).Scan(&summary.TopRoad, &summary.TopRoadCount)
	if err != nil {
		summary.TopRoad = "N/A"
		summary.TopRoadCount = 0
	}

	err = r.conn.QueryRow(ctx, `
		SELECT
			toInt32(count()) AS total,
			toInt32(countIf(
				hasAny(cause_subtypes, [
					'fog', 'rain', 'snowfall', 'frost', 'hail', 'gustyWinds', 'strongWinds',
					'visibilityReduced', 'badWeather', 'smokeHazard', 'flooding', 'avalanches'
				]) OR cause_type = 'poorEnvironment'
			)) AS weather_count
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today() - INTERVAL 7 DAY
	`).Scan(&summary.TotalIncidents, &summary.WeatherIncidents)
	if err != nil {
		return nil, fmt.Errorf("failed to get weather impact: %w", err)
	}

	if summary.TotalIncidents > 0 {
		summary.WeatherImpactPct = float64(summary.WeatherIncidents) / float64(summary.TotalIncidents) * 100
	}

	return summary, nil
}

func (r *Repository) GetDurationDistribution(ctx context.Context) ([]DurationBucket, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT
			multiIf(
				duration_mins < 15, '0-15',
				duration_mins < 30, '15-30',
				duration_mins < 60, '30-60',
				duration_mins < 120, '60-120',
				duration_mins < 240, '120-240',
				'240+'
			) AS bucket,
			toInt32(count()) AS count,
			toFloat64(avg(duration_mins)) AS avg_mins
		FROM (
			SELECT dateDiff('minute', timestamp, end_timestamp) AS duration_mins
			FROM beacon.traffic_incidents FINAL
			WHERE end_timestamp > toDateTime(0)
			  AND end_timestamp > timestamp
			  AND timestamp >= today() - INTERVAL 7 DAY
		)
		GROUP BY bucket
		ORDER BY
			CASE bucket
				WHEN '0-15' THEN 1
				WHEN '15-30' THEN 2
				WHEN '30-60' THEN 3
				WHEN '60-120' THEN 4
				WHEN '120-240' THEN 5
				ELSE 6
			END
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get duration distribution: %w", err)
	}
	defer rows.Close() //nolint:errcheck

	var data []DurationBucket
	for rows.Next() {
		var bucket DurationBucket
		if err := rows.Scan(&bucket.Bucket, &bucket.Count, &bucket.AvgMins); err != nil {
			return nil, fmt.Errorf("failed to scan duration bucket: %w", err)
		}
		data = append(data, bucket)
	}

	return data, nil
}

func (r *Repository) GetRouteAnalysis(ctx context.Context, limit int) ([]RouteIncidentStats, error) {
	if limit <= 0 {
		limit = 20
	}

	rows, err := r.conn.Query(ctx, `
		SELECT
			road_number,
			any(road_name) AS road_name,
			toInt32(count()) AS incident_count,
			toFloat64(avg(
				CASE severity
					WHEN 'highest' THEN 5
					WHEN 'high' THEN 4
					WHEN 'medium' THEN 3
					WHEN 'low' THEN 2
					ELSE 1
				END
			)) AS avg_severity,
			toFloat64(sum(length_meters) / 1000) AS total_length_km,
			groupArray(3)(cause_type) AS common_causes
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today() - INTERVAL 7 DAY
		  AND road_number <> ''
		GROUP BY road_number
		ORDER BY incident_count DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get route analysis: %w", err)
	}
	defer rows.Close() //nolint:errcheck

	var data []RouteIncidentStats
	for rows.Next() {
		var stats RouteIncidentStats
		if err := rows.Scan(
			&stats.RoadNumber,
			&stats.RoadName,
			&stats.IncidentCount,
			&stats.AvgSeverity,
			&stats.TotalLengthKm,
			&stats.CommonCauses,
		); err != nil {
			return nil, fmt.Errorf("failed to scan route stats: %w", err)
		}
		data = append(data, stats)
	}

	return data, nil
}

func (r *Repository) GetDirectionAnalysis(ctx context.Context) ([]DirectionStats, error) {
	var total int32
	err := r.conn.QueryRow(ctx, `
		SELECT toInt32(count())
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today() - INTERVAL 7 DAY
		  AND direction <> ''
	`).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to get direction total: %w", err)
	}

	rows, err := r.conn.Query(ctx, `
		SELECT
			direction,
			toInt32(count()) AS incident_count
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today() - INTERVAL 7 DAY
		  AND direction <> ''
		GROUP BY direction
		ORDER BY incident_count DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get direction analysis: %w", err)
	}
	defer rows.Close() //nolint:errcheck

	var data []DirectionStats
	for rows.Next() {
		var stats DirectionStats
		if err := rows.Scan(&stats.Direction, &stats.IncidentCount); err != nil {
			return nil, fmt.Errorf("failed to scan direction stats: %w", err)
		}
		if total > 0 {
			stats.Percentage = float64(stats.IncidentCount) / float64(total) * 100
		}
		data = append(data, stats)
	}

	return data, nil
}

func (r *Repository) GetRushHourComparison(ctx context.Context) ([]RushHourStats, error) {
	rows, err := r.conn.Query(ctx, `
		SELECT
			multiIf(
				toHour(timestamp) IN (7, 8, 9), 'morning_rush',
				toHour(timestamp) IN (17, 18, 19, 20), 'evening_rush',
				'off_peak'
			) AS period,
			toInt32(count()) AS incident_count,
			toFloat64(avg(
				CASE severity
					WHEN 'highest' THEN 5
					WHEN 'high' THEN 4
					WHEN 'medium' THEN 3
					WHEN 'low' THEN 2
					ELSE 1
				END
			)) AS avg_severity,
			toFloat64(if(
				countIf(end_timestamp > toDateTime(0) AND end_timestamp > timestamp) > 0,
				avgIf(dateDiff('minute', timestamp, end_timestamp), end_timestamp > toDateTime(0) AND end_timestamp > timestamp),
				0
			)) AS avg_duration
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today() - INTERVAL 7 DAY
		GROUP BY period
		ORDER BY
			CASE period
				WHEN 'morning_rush' THEN 1
				WHEN 'evening_rush' THEN 2
				ELSE 3
			END
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get rush hour comparison: %w", err)
	}
	defer rows.Close() //nolint:errcheck

	var data []RushHourStats
	for rows.Next() {
		var stats RushHourStats
		if err := rows.Scan(&stats.Period, &stats.IncidentCount, &stats.AvgSeverity, &stats.AvgDuration); err != nil {
			return nil, fmt.Errorf("failed to scan rush hour stats: %w", err)
		}
		data = append(data, stats)
	}

	return data, nil
}

func (r *Repository) GetHotspots(ctx context.Context, limit int) ([]Hotspot, error) {
	if limit <= 0 {
		limit = 50
	}

	rows, err := r.conn.Query(ctx, `
		SELECT
			round(lat, 3) AS lat,
			round(lon, 3) AS lon,
			toInt32(count()) AS incident_count,
			toInt32(uniq(toDate(timestamp))) AS recurrence,
			topK(1)(cause_type)[1] AS top_cause,
			toFloat64(avg(
				CASE severity
					WHEN 'highest' THEN 5
					WHEN 'high' THEN 4
					WHEN 'medium' THEN 3
					WHEN 'low' THEN 2
					ELSE 1
				END
			)) AS avg_severity
		FROM beacon.traffic_incidents FINAL
		WHERE timestamp >= today() - INTERVAL 30 DAY
		  AND lat != 0 AND lon != 0
		GROUP BY lat, lon
		HAVING incident_count >= 3 AND recurrence >= 2
		ORDER BY recurrence DESC, incident_count DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get hotspots: %w", err)
	}
	defer rows.Close() //nolint:errcheck

	var data []Hotspot
	for rows.Next() {
		var hotspot Hotspot
		if err := rows.Scan(
			&hotspot.Lat,
			&hotspot.Lon,
			&hotspot.IncidentCount,
			&hotspot.Recurrence,
			&hotspot.TopCause,
			&hotspot.AvgSeverity,
		); err != nil {
			return nil, fmt.Errorf("failed to scan hotspot: %w", err)
		}
		data = append(data, hotspot)
	}

	return data, nil
}

func (r *Repository) GetAnomalies(ctx context.Context) ([]Anomaly, error) {
	var anomalies []Anomaly

	provinceRows, err := r.conn.Query(ctx, `
		WITH
			today_data AS (
				SELECT province, toInt32(count()) AS today_count
				FROM beacon.traffic_incidents FINAL
				WHERE timestamp >= today()
				  AND province <> ''
				GROUP BY province
			),
			baseline_data AS (
				SELECT province, toFloat64(count()) / 7 AS avg_count
				FROM beacon.traffic_incidents FINAL
				WHERE timestamp >= today() - INTERVAL 7 DAY
				  AND timestamp < today()
				  AND province <> ''
				GROUP BY province
			)
		SELECT
			'province' AS dimension,
			t.province AS value,
			t.today_count AS current_count,
			b.avg_count AS baseline_count,
			toFloat64(if(b.avg_count > 0, (t.today_count - b.avg_count) / b.avg_count * 100, 0)) AS deviation
		FROM today_data t
		LEFT JOIN baseline_data b ON t.province = b.province
		WHERE b.avg_count > 0 AND abs((t.today_count - b.avg_count) / b.avg_count) > 0.5
		ORDER BY abs(deviation) DESC
		LIMIT 10
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get province anomalies: %w", err)
	}
	defer provinceRows.Close() //nolint:errcheck

	for provinceRows.Next() {
		var a Anomaly
		if err := provinceRows.Scan(&a.Dimension, &a.Value, &a.CurrentCount, &a.BaselineCount, &a.Deviation); err != nil {
			return nil, fmt.Errorf("failed to scan province anomaly: %w", err)
		}
		a.Severity = classifyAnomaly(a.Deviation)
		anomalies = append(anomalies, a)
	}

	causeRows, err := r.conn.Query(ctx, `
		WITH
			today_data AS (
				SELECT cause_type, toInt32(count()) AS today_count
				FROM beacon.traffic_incidents FINAL
				WHERE timestamp >= today()
				  AND cause_type <> ''
				GROUP BY cause_type
			),
			baseline_data AS (
				SELECT cause_type, toFloat64(count()) / 7 AS avg_count
				FROM beacon.traffic_incidents FINAL
				WHERE timestamp >= today() - INTERVAL 7 DAY
				  AND timestamp < today()
				  AND cause_type <> ''
				GROUP BY cause_type
			)
		SELECT
			'cause_type' AS dimension,
			t.cause_type AS value,
			t.today_count AS current_count,
			b.avg_count AS baseline_count,
			toFloat64(if(b.avg_count > 0, (t.today_count - b.avg_count) / b.avg_count * 100, 0)) AS deviation
		FROM today_data t
		LEFT JOIN baseline_data b ON t.cause_type = b.cause_type
		WHERE b.avg_count > 0 AND abs((t.today_count - b.avg_count) / b.avg_count) > 0.5
		ORDER BY abs(deviation) DESC
		LIMIT 10
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get cause type anomalies: %w", err)
	}
	defer causeRows.Close() //nolint:errcheck

	for causeRows.Next() {
		var a Anomaly
		if err := causeRows.Scan(&a.Dimension, &a.Value, &a.CurrentCount, &a.BaselineCount, &a.Deviation); err != nil {
			return nil, fmt.Errorf("failed to scan cause type anomaly: %w", err)
		}
		a.Severity = classifyAnomaly(a.Deviation)
		anomalies = append(anomalies, a)
	}

	return anomalies, nil
}

func classifyAnomaly(deviation float64) string {
	absDeviation := deviation
	if absDeviation < 0 {
		absDeviation = -absDeviation
	}
	if absDeviation >= 100 {
		return "high"
	}
	if absDeviation >= 50 {
		return "medium"
	}
	return "low"
}
