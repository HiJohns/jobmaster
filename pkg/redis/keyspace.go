package redis

import (
	"context"
	"fmt"
	"strings"

	"github.com/redis/go-redis/v9"
)

type KeyspaceSubscriber struct {
	client *redis.Client
}

func NewKeyspaceSubscriber(client *redis.Client) *KeyspaceSubscriber {
	return &KeyspaceSubscriber{client: client}
}

func (k *KeyspaceSubscriber) SubscribeExpiredKeys(ctx context.Context, callback func(key string)) error {
	pubsub := k.client.PSubscribe(ctx, "__keyevent@*__:expired")
	defer pubsub.Close()

	ch := pubsub.Channel()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case msg := <-ch:
			if msg != nil && strings.HasPrefix(msg.Payload, "sla:") {
				callback(msg.Payload)
			}
		}
	}
}

func EnableKeyspaceNotifications(client *redis.Client) error {
	ctx := context.Background()
	return client.ConfigSet(ctx, "notify-keyspace-events", "Ex").Err()
}

type SLAExpiredEvent struct {
	TenantID string
	OrderID  string
}

func ParseSLAExpiredKey(key string) (*SLAExpiredEvent, error) {
	parts := strings.Split(key, ":")
	if len(parts) < 3 {
		return nil, fmt.Errorf("invalid SLA key format: %s", key)
	}

	return &SLAExpiredEvent{
		TenantID: parts[1],
		OrderID:  parts[2],
	}, nil
}
