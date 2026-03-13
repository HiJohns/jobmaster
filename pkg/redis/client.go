package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type Client struct {
	client *redis.Client
}

func NewClient(host, password string, db int) (*Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     host,
		Password: password,
		DB:       db,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	return &Client{client: client}, nil
}

func (c *Client) Close() error {
	return c.client.Close()
}

const (
	tenantBlacklistPrefix = "blacklist:tenant:"
	tokenVersionPrefix    = "token:version:"
)

func (c *Client) AddTenantToBlacklist(tenantUUID uuid.UUID, duration time.Duration) error {
	ctx := context.Background()
	key := tenantBlacklistPrefix + tenantUUID.String()
	return c.client.Set(ctx, key, "1", duration).Err()
}

func (c *Client) IsTenantBlacklisted(tenantUUID uuid.UUID) (bool, error) {
	ctx := context.Background()
	key := tenantBlacklistPrefix + tenantUUID.String()
	result, err := c.client.Exists(ctx, key).Result()
	if err != nil {
		return false, err
	}
	return result > 0, nil
}

func (c *Client) RemoveTenantFromBlacklist(tenantUUID uuid.UUID) error {
	ctx := context.Background()
	key := tenantBlacklistPrefix + tenantUUID.String()
	return c.client.Del(ctx, key).Err()
}

func (c *Client) IncrementTokenVersion(tenantUUID uuid.UUID) (int64, error) {
	ctx := context.Background()
	key := tokenVersionPrefix + tenantUUID.String()
	return c.client.Incr(ctx, key).Result()
}

func (c *Client) GetTokenVersion(tenantUUID uuid.UUID) (int64, error) {
	ctx := context.Background()
	key := tokenVersionPrefix + tenantUUID.String()
	result, err := c.client.Get(ctx, key).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return result, err
}
