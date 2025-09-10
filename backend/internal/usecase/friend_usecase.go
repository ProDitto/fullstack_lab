package usecase

import (
	"context"
	"errors"

	"chatterbox/internal/domain"
	"chatterbox/internal/repository"

	"github.com/google/uuid"
)

type FriendUsecase interface {
	SendRequest(ctx context.Context, requesterID, recipientID uuid.UUID) error
	RespondToRequest(ctx context.Context, requestID, recipientID uuid.UUID, status domain.FriendRequestStatus) error
	GetPendingRequests(ctx context.Context, userID uuid.UUID) ([]*domain.FriendRequest, error)
	BlockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error
}

type friendUsecase struct {
	repo repository.FriendRepository
}

func NewFriendUsecase(r repository.FriendRepository) FriendUsecase {
	return &friendUsecase{repo: r}
}

func (u *friendUsecase) SendRequest(ctx context.Context, requesterID, recipientID uuid.UUID) error {
	if requesterID == recipientID {
		return domain.ErrBadRequest
	}
	
	areFriends, err := u.repo.AreFriends(ctx, requesterID, recipientID)
	if err != nil {
		return err
	}
	if areFriends {
		return domain.ErrAlreadyFriends
	}

	isBlocked, err := u.repo.IsBlocked(ctx, requesterID, recipientID)
	if err != nil {
		return err
	}
	if isBlocked {
		return domain.ErrBlocked
	}
	
	req := &domain.FriendRequest{
		ID:          uuid.New(),
		RequesterID: requesterID,
		RecipientID: recipientID,
		Status:      domain.StatusPending,
	}
	return u.repo.CreateRequest(ctx, req)
}

func (u *friendUsecase) RespondToRequest(ctx context.Context, requestID, recipientID uuid.UUID, status domain.FriendRequestStatus) error {
	req, err := u.repo.FindRequestByID(ctx, requestID)
	if err != nil {
		return err
	}

	if req.RecipientID != recipientID {
		return domain.ErrForbidden
	}

	if req.Status != domain.StatusPending {
		return domain.ErrFriendRequestInvalid
	}

	if err := u.repo.UpdateRequestStatus(ctx, requestID, status); err != nil {
		return err
	}

	if status == domain.StatusAccepted {
		if err := u.repo.AddFriend(ctx, req.RequesterID, req.RecipientID); err != nil {
			return err
		}
	}

	return nil
}

func (u *friendUsecase) GetPendingRequests(ctx context.Context, userID uuid.UUID) ([]*domain.FriendRequest, error) {
	return u.repo.FindPendingRequests(ctx, userID)
}

func (u *friendUsecase) BlockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	if blockerID == blockedID {
		return domain.ErrBadRequest
	}
	return u.repo.BlockUser(ctx, blockerID, blockedID)
}
