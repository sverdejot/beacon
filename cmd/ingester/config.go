package main

type config struct {
	MQTTBroker         string `env:"MQTT_BROKER"         envDefault:"tcp://localhost:1883"`
	ClickHouseAddr     string `env:"CLICKHOUSE_ADDR"     envDefault:"localhost:9000"`
	ClickHouseDatabase string `env:"CLICKHOUSE_DATABASE" envDefault:"beacon"`
	ClickHouseUser     string `env:"CLICKHOUSE_USER"     envDefault:"default"`
	ClickHousePassword string `env:"CLICKHOUSE_PASSWORD" envDefault:""`
	OSRMURL            string `env:"OSRM_URL"            envDefault:"http://localhost:5000"`
	RedisAddr          string `env:"REDIS_ADDR"          envDefault:"localhost:6379"`
	RedisPassword      string `env:"REDIS_PASSWORD"      envDefault:""`
	RedisDB            int    `env:"REDIS_DB"            envDefault:"0"`
	MetricsPort        string `env:"METRICS_PORT"        envDefault:"9091"`
}
