package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/sverdejot/beacon/internal/shared"
	"github.com/sverdejot/beacon/pkg/datex"
	"github.com/valkey-io/valkey-go"
)

const (
	mapIncidentsKey = "map:incidents"
	defaultTTL      = 24 * time.Hour
)

type Cache struct {
	client valkey.Client
}

func NewCache(addr, password string, db int) (*Cache, error) {
	opts := valkey.ClientOption{
		InitAddress: []string{addr},
		SelectDB:    db,
	}
	if password != "" {
		opts.Password = password
	}

	client, err := valkey.NewClient(opts)
	if err != nil {
		return nil, fmt.Errorf("failed to create valkey client: %w", err)
	}

	req := client.B().
		Ping().
		Build()
	if err := client.Do(context.Background(), req).Error(); err != nil {
		return nil, fmt.Errorf("failed to connect to valkey: %w", err)
	}

	return &Cache{client: client}, nil
}

func (c *Cache) Close() {
	c.client.Close()
}

func (c *Cache) StoreMapLocation(ctx context.Context, loc *shared.MapLocation, validity *datex.Validity) error {
	data, err := json.Marshal(loc)
	if err != nil {
		return fmt.Errorf("failed to marshal location: %w", err)
	}

	ttl := c.calculateTTL(validity)

	req := c.client.B().
		Hset().
		Key(mapIncidentsKey).
		FieldValue().
		FieldValue(loc.ID, string(data)).
		Build()

	if err := c.client.Do(ctx, req).Error(); err != nil {
		return fmt.Errorf("failed to store location: %w", err)
	}

	expireKey := fmt.Sprintf("map:incident:%s:expire", loc.ID)
	req = c.client.B().
		Set().
		Key(expireKey).
		Value(loc.ID).
		Ex(ttl).
		Build()

	if err := c.client.Do(ctx, req).Error(); err != nil {
		return fmt.Errorf("failed to set expiration: %w", err)
	}

	return nil
}

func (c *Cache) GetMapLocation(ctx context.Context, id string) (*shared.MapLocation, error) {
	req := c.client.B().
		Hget().
		Key(mapIncidentsKey).
		Field(id).
		Build()

	result, err := c.client.Do(ctx, req).ToString()
	if err != nil {
		return nil, fmt.Errorf("failed to get location: %w", err)
	}

	var loc shared.MapLocation
	if err := json.Unmarshal([]byte(result), &loc); err != nil {
		return nil, fmt.Errorf("failed to unmarshal location: %w", err)
	}

	return &loc, nil
}

func (c *Cache) RemoveMapLocation(ctx context.Context, id string) error {
	req := c.client.B().
		Hdel().
		Key(mapIncidentsKey).
		Field(id).
		Build()

	if err := c.client.Do(ctx, req).Error(); err != nil {
		return fmt.Errorf("failed to remove location: %w", err)
	}

	expireKey := fmt.Sprintf("map:incident:%s:expire", id)
	req = c.client.B().
		Del().
		Key(expireKey).
		Build()

	c.client.Do(ctx, req) //nolint:errcheck

	return nil
}

func (c *Cache) GetAllMapLocations(ctx context.Context) ([]shared.MapLocation, error) {
	// clean up expired incidents
	if err := c.cleanupExpired(ctx); err != nil {
		slog.Warn(fmt.Sprintf("failed to cleanup expired incidents: %v", err))
	}

	req := c.client.B().
		Hgetall().
		Key(mapIncidentsKey).
		Build()

	result, err := c.client.Do(ctx, req).
		AsStrMap()

	if err != nil {
		return nil, fmt.Errorf("failed to get locations: %w", err)
	}

	locations := make([]shared.MapLocation, 0, len(result))
	for _, v := range result {
		var loc shared.MapLocation
		if err := json.Unmarshal([]byte(v), &loc); err != nil {
			continue // skip invalid entries
		}
		locations = append(locations, loc)
	}

	return locations, nil
}

func (c *Cache) calculateTTL(validity *datex.Validity) time.Duration {
	if validity == nil || validity.EndTime == nil {
		return defaultTTL
	}

	ttl := time.Until(*validity.EndTime)
	if ttl <= 0 {
		return time.Minute
	}

	if ttl > defaultTTL {
		return defaultTTL
	}

	return ttl
}

// cleanupExpired removes incidents whose expiration keys have expired
func (c *Cache) cleanupExpired(ctx context.Context) error {
	req := c.client.B().
		Hkeys().
		Key(mapIncidentsKey).
		Build()

	ids, err := c.client.Do(ctx, req).
		AsStrSlice()

	if err != nil {
		return err
	}

	for _, id := range ids {
		expireKey := fmt.Sprintf("map:incident:%s:expire", id)
		req = c.client.B().
			Exists().
			Key(expireKey).
			Build()

		exists, err := c.client.Do(ctx, req).
			AsInt64()

		if err != nil {
			continue
		}

		if exists == 0 {
			req = c.client.B().
				Hdel().
				Key(mapIncidentsKey).
				Field(id).
				Build()
			c.client.Do(ctx, req) //nolint:errcheck
		}
	}

	return nil
}
