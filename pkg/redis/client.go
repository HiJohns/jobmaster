package redis

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

var (
	DefaultClient *Client
	mu            sync.RWMutex
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

// SetDefaultClient sets the global default redis client
func SetDefaultClient(client *Client) {
	mu.Lock()
	defer mu.Unlock()
	DefaultClient = client
}

// GetDefaultClient gets the global default redis client
func GetDefaultClient() *Client {
	mu.RLock()
	defer mu.RUnlock()
	return DefaultClient
}

func (c *Client) Close() error {
	return c.client.Close()
}

const (
	tenantBlacklistPrefix = "blacklist:tenant:"
	tokenVersionPrefix    = "token:version:"
	orgTreeCachePrefix    = "org:tree:"
	sessionRefreshPrefix  = "session:refresh:"
	slaMonitorPrefix      = "sla:"
	cacheTTL              = 10 * time.Minute
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

// GetOrgTreeCache retrieves organization tree from cache
func (c *Client) GetOrgTreeCache(tenantID uuid.UUID) (string, error) {
	ctx := context.Background()
	key := orgTreeCachePrefix + tenantID.String()
	return c.client.Get(ctx, key).Result()
}

// SetOrgTreeCache stores organization tree in cache
func (c *Client) SetOrgTreeCache(tenantID uuid.UUID, data string, ttl time.Duration) error {
	ctx := context.Background()
	key := orgTreeCachePrefix + tenantID.String()
	return c.client.Set(ctx, key, data, ttl).Err()
}

// InvalidateOrgTreeCache removes organization tree from cache
func (c *Client) InvalidateOrgTreeCache(tenantID uuid.UUID) error {
	ctx := context.Background()
	key := orgTreeCachePrefix + tenantID.String()
	return c.client.Del(ctx, key).Err()
}

// SetUserRefreshFlag marks a user for session refresh via Redis
func (c *Client) SetUserRefreshFlag(userSub string) error {
	ctx := context.Background()
	key := sessionRefreshPrefix + userSub
	// Set flag with 1 hour TTL
	return c.client.Set(ctx, key, "1", 1*time.Hour).Err()
}

// GetUserRefreshFlag checks if a user needs session refresh
func (c *Client) GetUserRefreshFlag(userSub string) (bool, error) {
	ctx := context.Background()
	key := sessionRefreshPrefix + userSub
	result, err := c.client.Exists(ctx, key).Result()
	if err != nil {
		return false, err
	}
	return result > 0, nil
}

// ClearUserRefreshFlag removes the session refresh flag
func (c *Client) ClearUserRefreshFlag(userSub string) error {
	ctx := context.Background()
	key := sessionRefreshPrefix + userSub
	return c.client.Del(ctx, key).Err()
}

// SetSLAMonitor sets SLA monitoring key with TTL
func (c *Client) SetSLAMonitor(tenantID, orderID uuid.UUID, data string, ttl time.Duration) error {
	ctx := context.Background()
	key := fmt.Sprintf("%s%s:%s", slaMonitorPrefix, tenantID.String(), orderID.String())
	return c.client.Set(ctx, key, data, ttl).Err()
}

// GetSLAMonitor retrieves SLA monitoring data
func (c *Client) GetSLAMonitor(tenantID, orderID uuid.UUID) (string, error) {
	ctx := context.Background()
	key := fmt.Sprintf("%s%s:%s", slaMonitorPrefix, tenantID.String(), orderID.String())
	return c.client.Get(ctx, key).Result()
}

// DeleteSLAMonitor removes SLA monitoring key
func (c *Client) DeleteSLAMonitor(tenantID, orderID uuid.UUID) error {
	ctx := context.Background()
	key := fmt.Sprintf("%s%s:%s", slaMonitorPrefix, tenantID.String(), orderID.String())
	return c.client.Del(ctx, key).Err()
}

// GetSLATTL gets remaining TTL for SLA monitor key
func (c *Client) GetSLATTL(tenantID, orderID uuid.UUID) (time.Duration, error) {
	ctx := context.Background()
	key := fmt.Sprintf("%s%s:%s", slaMonitorPrefix, tenantID.String(), orderID.String())
	return c.client.TTL(ctx, key).Result()
}
