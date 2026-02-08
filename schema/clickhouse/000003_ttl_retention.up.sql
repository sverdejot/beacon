ALTER TABLE beacon.traffic_incidents
    MODIFY TTL timestamp + INTERVAL 12 MONTH;
