ALTER TABLE beacon.traffic_incidents
    ADD INDEX IF NOT EXISTS idx_lat lat TYPE minmax GRANULARITY 4;

ALTER TABLE beacon.traffic_incidents
    ADD INDEX IF NOT EXISTS idx_lon lon TYPE minmax GRANULARITY 4;
