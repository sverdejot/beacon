ALTER TABLE beacon.traffic_incidents
    DROP INDEX IF EXISTS idx_lat;

ALTER TABLE beacon.traffic_incidents
    DROP INDEX IF EXISTS idx_lon;
