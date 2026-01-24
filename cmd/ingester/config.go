package main

type config struct {
	MQTTBroker         string `env:"MQTT_BROKER"         envDefault:"tcp://localhost:1883"`
	ClickHouseAddr     string `env:"CLICKHOUSE_ADDR"     envDefault:"localhost:9000"`
	ClickHouseDatabase string `env:"CLICKHOUSE_DATABASE" envDefault:"beacon"`
	ClickHouseUser     string `env:"CLICKHOUSE_USER"     envDefault:"default"`
	ClickHousePassword string `env:"CLICKHOUSE_PASSWORD" envDefault:""`
}
