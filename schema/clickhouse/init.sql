CREATE DATABASE IF NOT EXISTS beacon;

CREATE TABLE IF NOT EXISTS beacon.traffic_incidents (
    id String,
    version Int32,
    timestamp DateTime,
    end_timestamp DateTime,
    province LowCardinality(String),
    record_type LowCardinality(String),
    severity LowCardinality(String),
    probability LowCardinality(String),
    lat Float64,
    lon Float64,
    km Float32,
    cause_type LowCardinality(String),
    cause_subtypes Array(String),
    road_name String,
    road_number String,
    raw_json String,
    location_type LowCardinality(String)
) ENGINE = ReplacingMergeTree(version)
PARTITION BY toYYYYMM(timestamp)
ORDER BY (province, record_type, timestamp, id);
