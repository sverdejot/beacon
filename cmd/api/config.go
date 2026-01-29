package main

type config struct {
	MQTTBroker         string `env:"MQTT_BROKER"          envDefault:"tcp://localhost:1883"`
	HTTPPort           string `env:"HTTP_SERVER_PORT"     envDefault:"8081"`
	MetricsPort        string `env:"METRICS_PORT"         envDefault:"9092"`
	ClickHouseAddr     string `env:"CLICKHOUSE_ADDR"      envDefault:"localhost:9000"`
	ClickHouseDatabase string `env:"CLICKHOUSE_DATABASE"  envDefault:"beacon"`
	ClickHouseUser     string `env:"CLICKHOUSE_USER"      envDefault:"beacon"`
	ClickHousePassword string `env:"CLICKHOUSE_PASSWORD"  envDefault:"beacon"`
	RedisAddr          string `env:"REDIS_ADDR"           envDefault:"localhost:6379"`
	RedisPassword      string `env:"REDIS_PASSWORD"       envDefault:""`
	RedisDB            int    `env:"REDIS_DB"             envDefault:"0"`
}
