package domain

import (
	"time"

	"github.com/google/uuid"
)

type FriendRequestStatus string

const (
	StatusPending   FriendRequestStatus = "pending"
	StatusAccepted  FriendRequestStatus = "accepted"
	StatusRejected  FriendRequestStatus = "rejected"
	StatusCancelled FriendRequestStatus = "cancelled"
)

type FriendRequest struct {
	ID          uuid.UUID
	RequesterID uuid.UUID
	RecipientID uuid.UUID
	Status      FriendRequestStatus
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
