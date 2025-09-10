package repository

import (
	"context"

	"chatterbox/internal/domain"
	"github.com/google/uuid"
)

type FriendRepository interface {
	CreateRequest(ctx context.Context, req *domain.FriendRequest) error
	UpdateRequestStatus(ctx context.Context, requestID uuid.UUID, status domain.FriendRequestStatus) error
	FindRequestByID(ctx context.Context, requestID uuid.UUID) (*domain.FriendRequest, error)
	FindPendingRequests(ctx context.Context, userID uuid.UUID) ([]*domain.FriendRequest, error)
	AddFriend(ctx context.Context, userID1, userID2 uuid.UUID) error
	BlockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error
	UnblockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error
	AreFriends(ctx context.Context, userID1, userID2 uuid.UUID) (bool, error)
	IsBlocked(ctx context.Context, userID1, userID2 uuid.UUID) (bool, error)
}
