package config

import (
	"time"

	"github.com/kelseyhightower/envconfig"
)

// Config holds the application configuration.
type Config struct {
	Port               int           `envconfig:"PORT" default:"8080"`
	DatabaseURL        string        `envconfig:"DATABASE_URL" required:"true"`
	AccessTokenSecret  string        `envconfig:"ACCESS_TOKEN_SECRET" required:"true"`
	RefreshTokenSecret string        `envconfig:"REFRESH_TOKEN_SECRET" required:"true"`
	AccessTokenTTL     time.Duration `envconfig:"ACCESS_TOKEN_TTL" default:"10m"`
	RefreshTokenTTL    time.Duration `envconfig:"REFRESH_TOKEN_TTL" default:"8h"`
}

// New creates a new Config instance from environment variables.
func New() (*Config, error) {
	var cfg Config
	err := envconfig.Process("", &cfg)
	if err != nil {
		return nil, err
	}
	return &cfg, nil
}
