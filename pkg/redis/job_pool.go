package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

const (
	jobPoolPrefix = "job_pool:"
	jobLockPrefix = "job_lock:"
)

type JobPool struct {
	client *Client
}

func NewJobPool(client *Client) *JobPool {
	return &JobPool{client: client}
}

func (j *JobPool) AddJobToPool(vendorID uuid.UUID, orderID uuid.UUID) error {
	ctx := context.Background()
	key := fmt.Sprintf("%s%s", jobPoolPrefix, vendorID.String())
	return j.client.client.SAdd(ctx, key, orderID.String()).Err()
}

func (j *JobPool) RemoveJobFromPool(vendorID uuid.UUID, orderID uuid.UUID) error {
	ctx := context.Background()
	key := fmt.Sprintf("%s%s", jobPoolPrefix, vendorID.String())
	return j.client.client.SRem(ctx, key, orderID.String()).Err()
}

func (j *JobPool) GetJobPool(vendorID uuid.UUID) ([]uuid.UUID, error) {
	ctx := context.Background()
	key := fmt.Sprintf("%s%s", jobPoolPrefix, vendorID.String())

	members, err := j.client.client.SMembers(ctx, key).Result()
	if err != nil {
		return nil, err
	}

	var orderIDs []uuid.UUID
	for _, member := range members {
		if id, err := uuid.Parse(member); err == nil {
			orderIDs = append(orderIDs, id)
		}
	}

	return orderIDs, nil
}

func (j *JobPool) TryGrabJob(vendorID uuid.UUID, orderID uuid.UUID, ttl time.Duration) (bool, error) {
	ctx := context.Background()
	lockKey := fmt.Sprintf("%s%s:%s", jobLockPrefix, orderID.String(), vendorID.String())

	success, err := j.client.client.SetNX(ctx, lockKey, "1", ttl).Result()
	if err != nil {
		return false, err
	}

	if success {
		if err := j.AddJobToPool(vendorID, orderID); err != nil {
			j.client.client.Del(ctx, lockKey)
			return false, err
		}
	}

	return success, nil
}

func (j *JobPool) ReleaseJob(vendorID uuid.UUID, orderID uuid.UUID) error {
	ctx := context.Background()
	lockKey := fmt.Sprintf("%s%s:%s", jobLockPrefix, orderID.String(), vendorID.String())

	if err := j.RemoveJobFromPool(vendorID, orderID); err != nil {
		return err
	}

	return j.client.client.Del(ctx, lockKey).Err()
}

func (j *JobPool) IsJobLocked(orderID uuid.UUID) (bool, string, error) {
	ctx := context.Background()
	pattern := fmt.Sprintf("%s%s:*", jobLockPrefix, orderID.String())

	keys, err := j.client.client.Keys(ctx, pattern).Result()
	if err != nil {
		return false, "", err
	}

	if len(keys) > 0 {
		parts := splitLast(keys[0], ':')
		if len(parts) > 0 {
			return true, parts[len(parts)-1], nil
		}
	}

	return false, "", nil
}

func splitLast(s string, sep rune) []string {
	var result []string
	last := 0
	for i, c := range s {
		if c == sep {
			result = append(result, s[last:i])
			last = i + 1
		}
	}
	result = append(result, s[last:])
	return result
}
