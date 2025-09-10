package usecase

import (
	"context"
	"errors"

	"chatterbox/internal/domain"
	"chatterbox/internal/repository"

	"github.com/google/uuid"
)

type GroupUsecase interface {
	CreateGroup(ctx context.Context, name, slug string, ownerID uuid.UUID) (*domain.Group, error)
	JoinGroup(ctx context.Context, slug string, userID uuid.UUID) error
	AddMember(ctx context.Context, slug string, adderID, newMemberID uuid.UUID) error
	RemoveMember(ctx context.Context, slug string, removerID, memberID uuid.UUID) error
}

type groupUsecase struct {
	groupRepo  repository.GroupRepository
	friendRepo repository.FriendRepository
}

func NewGroupUsecase(g repository.GroupRepository, f repository.FriendRepository) GroupUsecase {
	return &groupUsecase{groupRepo: g, friendRepo: f}
}

func (u *groupUsecase) CreateGroup(ctx context.Context, name, slug string, ownerID uuid.UUID) (*domain.Group, error) {
	group := &domain.Group{
		ID:      uuid.New(),
		Name:    name,
		Slug:    slug,
		OwnerID: ownerID,
	}

	if err := group.Validate(); err != nil {
		return nil, err
	}

	if err := u.groupRepo.Create(ctx, group); err != nil {
		if errors.Is(err, domain.ErrConflict) {
			return nil, fmt.Errorf("%w: group name or slug already exists", domain.ErrConflict)
		}
		return nil, err
	}
	return group, nil
}

func (u *groupUsecase) JoinGroup(ctx context.Context, slug string, userID uuid.UUID) error {
	group, err := u.groupRepo.FindBySlug(ctx, slug)
	if err != nil {
		return err
	}

	isMember, err := u.groupRepo.IsMember(ctx, group.ID, userID)
	if err != nil {
		return err
	}
	if isMember {
		return domain.ErrUserAlreadyInGroup
	}

	count, err := u.groupRepo.MemberCount(ctx, group.ID)
	if err != nil {
		return err
	}
	if count >= domain.MaxGroupMembers {
		return domain.ErrGroupIsFull
	}

	return u.groupRepo.AddMember(ctx, group.ID, userID)
}

func (u *groupUsecase) AddMember(ctx context.Context, slug string, adderID, newMemberID uuid.UUID) error {
	group, err := u.groupRepo.FindBySlug(ctx, slug)
	if err != nil {
		return err
	}

	isMember, err := u.groupRepo.IsMember(ctx, group.ID, adderID)
	if err != nil {
		return err
	}
	if !isMember {
		return domain.ErrForbidden
	}

	areFriends, err := u.friendRepo.AreFriends(ctx, adderID, newMemberID)
	if err != nil {
		return err
	}
	if !areFriends {
		return domain.ErrBadRequest // Can only add friends
	}

	return u.JoinGroup(ctx, slug, newMemberID) // Reuse join logic
}

func (u *groupUsecase) RemoveMember(ctx context.Context, slug string, removerID, memberID uuid.UUID) error {
	group, err := u.groupRepo.FindBySlug(ctx, slug)
	if err != nil {
		return err
	}

	// Only owner can remove other members. Members can remove themselves (leave).
	if removerID != group.OwnerID && removerID != memberID {
		return domain.ErrNotGroupOwner
	}

	isMember, err := u.groupRepo.IsMember(ctx, group.ID, memberID)
	if err != nil {
		return err
	}
	if !isMember {
		return domain.ErrUserNotInGroup
	}

	if err := u.groupRepo.RemoveMember(ctx, group.ID, memberID); err != nil {
		return err
	}

	// Check if group should be deleted
	count, err := u.groupRepo.MemberCount(ctx, group.ID)
	if err != nil {
		return err
	}
	if count == 0 {
		return u.groupRepo.Delete(ctx, group.ID)
	}

	return nil
}
