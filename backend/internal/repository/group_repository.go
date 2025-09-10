package repository

import (
	"context"

	"chatterbox/internal/domain"
	"github.com/google/uuid"
)

type GroupRepository interface {
	Create(ctx context.Context, group *domain.Group) error
	FindByID(ctx context.Context, id uuid.UUID) (*domain.Group, error)
	FindBySlug(ctx context.Context, slug string) (*domain.Group, error)
	Delete(ctx context.Context, groupID uuid.UUID) error
	AddMember(ctx context.Context, groupID, userID uuid.UUID) error
	RemoveMember(ctx context.Context, groupID, userID uuid.UUID) error
	IsMember(ctx context.Context, groupID, userID uuid.UUID) (bool, error)
	MemberCount(ctx context.Context, groupID uuid.UUID) (int, error)
	GetMemberIDs(ctx context.Context, groupID uuid.UUID) ([]uuid.UUID, error)
}
