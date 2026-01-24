ALTER TABLE beacon.traffic_incidents
    DROP COLUMN IF EXISTS name,
    DROP COLUMN IF EXISTS direction,
    DROP COLUMN IF EXISTS length_meters,
    DROP COLUMN IF EXISTS to_lat,
    DROP COLUMN IF EXISTS to_lon,
    DROP COLUMN IF EXISTS to_km,
    DROP COLUMN IF EXISTS municipality,
    DROP COLUMN IF EXISTS autonomous_community,
    DROP COLUMN IF EXISTS delay_minutes,
    DROP COLUMN IF EXISTS mobility,
    DROP COLUMN IF EXISTS road_destination;
