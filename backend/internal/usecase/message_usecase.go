package usecase

import (
	"context"
	"time"

	"chatterbox/internal/domain"
	"chatterbox/internal/repository"

	"github.com/google/uuid"
)

type MessageUsecase interface {
	ProcessAndRouteMessage(ctx context.Context, msg *domain.Message) (*domain.Message, error)
	GetPendingMessages(ctx context.Context, userID uuid.UUID, cursor string, limit int) ([]*domain.Message, string, error)
	ConfirmDelivery(ctx context.Context, msgID uuid.UUID) error
}

type messageUsecase struct {
	repo repository.MessageRepository
}

func NewMessageUsecase(r repository.MessageRepository) MessageUsecase {
	return &messageUsecase{repo: r}
}

func (u *messageUsecase) ProcessAndRouteMessage(ctx context.Context, msg *domain.Message) (*domain.Message, error) {
	if err := msg.Validate(); err != nil {
		return nil, err
	}

	msg.ID = uuid.New()
	msg.CreatedAt = time.Now().UTC()
	msg.Status = domain.MessageStatusSent

	if err := u.repo.StoreUnsent(ctx, msg); err != nil {
		return nil, err
	}

	return msg, nil
}

func (u *messageUsecase) GetPendingMessages(ctx context.Context, userID uuid.UUID, cursor string, limit int) ([]*domain.Message, string, error) {
	return u.repo.FindPendingForUser(ctx, userID, cursor, limit)
}

func (u *messageUsecase) ConfirmDelivery(ctx context.Context, msgID uuid.UUID) error {
	return u.repo.DeleteSent(ctx, msgID)
}
