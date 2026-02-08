-- Hourly trend aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS beacon.mv_hourly_trend
ENGINE = SummingMergeTree()
ORDER BY hour
AS
SELECT
    toStartOfHour(timestamp) AS hour,
    count() AS count
FROM beacon.traffic_incidents
GROUP BY hour;

-- Daily trend aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS beacon.mv_daily_trend
ENGINE = SummingMergeTree()
ORDER BY date
AS
SELECT
    toStartOfDay(timestamp) AS date,
    count() AS count,
    countIf(severity IN ('high', 'highest')) AS severe_count
FROM beacon.traffic_incidents
GROUP BY date;

-- Province distribution aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS beacon.mv_province_distribution
ENGINE = SummingMergeTree()
ORDER BY (date, province)
AS
SELECT
    toDate(timestamp) AS date,
    province,
    count() AS count
FROM beacon.traffic_incidents
WHERE province <> ''
GROUP BY date, province;

-- Severity distribution aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS beacon.mv_severity_distribution
ENGINE = SummingMergeTree()
ORDER BY (date, severity)
AS
SELECT
    toDate(timestamp) AS date,
    severity,
    count() AS count
FROM beacon.traffic_incidents
WHERE severity <> ''
GROUP BY date, severity;

-- Cause type distribution aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS beacon.mv_cause_type_distribution
ENGINE = SummingMergeTree()
ORDER BY (date, cause_type)
AS
SELECT
    toDate(timestamp) AS date,
    cause_type,
    count() AS count
FROM beacon.traffic_incidents
WHERE cause_type <> ''
GROUP BY date, cause_type;

-- Top roads aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS beacon.mv_top_roads
ENGINE = SummingMergeTree()
ORDER BY (date, road_name)
AS
SELECT
    toDate(timestamp) AS date,
    road_name,
    count() AS count
FROM beacon.traffic_incidents
WHERE road_name <> ''
GROUP BY date, road_name;
