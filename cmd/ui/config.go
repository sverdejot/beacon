package main

type config struct {
	MQTTBroker         string `env:"MQTT_BROKER"          envDefault:"tcp://localhost:1883"`
	HTTPPort           string `env:"HTTP_SERVER_PORT"     envDefault:"8081"`
	OSRMURL            string `env:"OSRM_URL"             envDefault:"http://localhost:5000"`
	ClickHouseAddr     string `env:"CLICKHOUSE_ADDR"      envDefault:"localhost:9000"`
	ClickHouseDatabase string `env:"CLICKHOUSE_DATABASE"  envDefault:"beacon"`
	ClickHouseUser     string `env:"CLICKHOUSE_USER"      envDefault:"beacon"`
	ClickHousePassword string `env:"CLICKHOUSE_PASSWORD"  envDefault:"beacon"`
}
