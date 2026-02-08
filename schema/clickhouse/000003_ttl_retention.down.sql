ALTER TABLE beacon.traffic_incidents
    MODIFY TTL timestamp + INTERVAL 100 YEAR;
