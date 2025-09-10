package repository

import (
	"context"

	"chatterbox/internal/domain"

	"github.com/google/uuid"
)

type MessageRepository interface {
	StoreUnsent(ctx context.Context, msg *domain.Message) error
	DeleteSent(ctx context.Context, msgID uuid.UUID) error
	FindPendingForUser(ctx context.Context, userID uuid.UUID, cursor string, limit int) ([]*domain.Message, string, error)
}
