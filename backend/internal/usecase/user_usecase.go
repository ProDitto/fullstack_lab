package usecase

import (
	"context"
	"errors"
	"fmt"
	"mime/multipart"

	"chatterbox/internal/domain"
	"chatterbox/internal/repository"
	"chatterbox/internal/util"

	"github.com/google/uuid"
)

type AvatarStorage interface {
	Save(userID uuid.UUID, file multipart.File) (string, error)
}


type UserUsecase interface {
	Register(ctx context.Context, email, password string) (*domain.User, error)
	GetProfile(ctx context.Context, userID uuid.UUID) (*domain.User, error)
	UpdateProfilePicture(ctx context.Context, userID uuid.UUID, file multipart.File) (string, error)
}

type userUsecase struct {
	repo   repository.UserRepository
	hasher util.PasswordHasher
	avatarStorage AvatarStorage
}

func NewUserUsecase(repo repository.UserRepository, hasher util.PasswordHasher, avatarStorage AvatarStorage) UserUsecase {
	return &userUsecase{repo: repo, hasher: hasher, avatarStorage: avatarStorage}
}

func (u *userUsecase) Register(ctx context.Context, email, password string) (*domain.User, error) {
	if len(password) < 8 {
		return nil, fmt.Errorf("%w: password must be at least 8 characters", domain.ErrValidation)
	}

	existingUser, err := u.repo.FindByEmail(ctx, email)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}
	if existingUser != nil {
		return nil, domain.ErrConflict
	}

	hashedPassword, err := u.hasher.Hash(password)
	if err != nil {
		return nil, err
	}

	user := &domain.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: hashedPassword,
	}

	if err := u.repo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (u *userUsecase) GetProfile(ctx context.Context, userID uuid.UUID) (*domain.User, error) {
	return u.repo.FindByID(ctx, userID)
}


func (u *userUsecase) UpdateProfilePicture(ctx context.Context, userID uuid.UUID, file multipart.File) (string, error) {
	user, err := u.repo.FindByID(ctx, userID)
	if err != nil {
		return "", err
	}
	
	url, err := u.avatarStorage.Save(userID, file)
	if err != nil {
		return "", err
	}
	
	user.ProfilePictureURL = &url
	if err := u.repo.Update(ctx, user); err != nil {
		return "", err
	}

	return url, nil
}
