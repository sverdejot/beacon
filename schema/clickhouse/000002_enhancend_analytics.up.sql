ALTER TABLE beacon.traffic_incidents
    ADD COLUMN IF NOT EXISTS name String DEFAULT '',
    ADD COLUMN IF NOT EXISTS direction LowCardinality(String) DEFAULT '',
    ADD COLUMN IF NOT EXISTS length_meters Float32 DEFAULT 0,
    ADD COLUMN IF NOT EXISTS to_lat Float64 DEFAULT 0,
    ADD COLUMN IF NOT EXISTS to_lon Float64 DEFAULT 0,
    ADD COLUMN IF NOT EXISTS to_km Float32 DEFAULT 0,
    ADD COLUMN IF NOT EXISTS municipality LowCardinality(String) DEFAULT '',
    ADD COLUMN IF NOT EXISTS autonomous_community LowCardinality(String) DEFAULT '',
    ADD COLUMN IF NOT EXISTS delay_minutes Float32 DEFAULT 0,
    ADD COLUMN IF NOT EXISTS mobility LowCardinality(String) DEFAULT '',
    ADD COLUMN IF NOT EXISTS road_destination String DEFAULT '';
