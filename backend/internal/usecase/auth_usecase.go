package usecase

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"chatterbox/internal/domain"
	"chatterbox/internal/repository"
	"chatterbox/internal/util"
)

type OTPStore interface {
	GenerateAndStore(email string) (string, error)
	Validate(email, otp string) error
}

type AuthUsecase interface {
	Login(ctx context.Context, email, password string) (string, string, *domain.User, error)
	RefreshToken(ctx context.Context, refreshToken string) (string, string, error)
	RequestPasswordReset(ctx context.Context, email string) (string, error)
	ResetPassword(ctx context.Context, email, otp, newPassword string) error
}

type authUsecase struct {
	userRepo   repository.UserRepository
	hasher     util.PasswordHasher
	tokenManager *util.TokenManager
	otpStore   OTPStore
}

func NewAuthUsecase(userRepo repository.UserRepository, hasher util.PasswordHasher, tokenManager *util.TokenManager, otpStore OTPStore) AuthUsecase {
	return &authUsecase{
		userRepo:   userRepo,
		hasher:     hasher,
		tokenManager: tokenManager,
		otpStore:   otpStore,
	}
}

func (u *authUsecase) Login(ctx context.Context, email, password string) (string, string, *domain.User, error) {
	user, err := u.userRepo.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return "", "", nil, domain.ErrInvalidCredentials
		}
		return "", "", nil, err
	}

	if err := u.hasher.Compare(user.PasswordHash, password); err != nil {
		return "", "", nil, domain.ErrInvalidCredentials
	}

	accessToken, err := u.tokenManager.GenerateAccessToken(user.ID)
	if err != nil {
		return "", "", nil, err
	}

	refreshToken, err := u.tokenManager.GenerateRefreshToken(user.ID)
	if err != nil {
		return "", "", nil, err
	}

	return accessToken, refreshToken, user, nil
}


func (u *authUsecase) RefreshToken(ctx context.Context, refreshToken string) (string, string, error) {
	claims, err := u.tokenManager.VerifyRefreshToken(refreshToken)
	if err != nil {
		return "", "", err
	}

	_, err = u.userRepo.FindByID(ctx, claims.UserID)
	if err != nil {
		return "", "", domain.ErrUnauthorized
	}

	newAccessToken, err := u.tokenManager.GenerateAccessToken(claims.UserID)
	if err != nil {
		return "", "", err
	}
	
	newRefreshToken, err := u.tokenManager.GenerateRefreshToken(claims.UserID)
	if err != nil {
		return "", "", err
	}

	return newAccessToken, newRefreshToken, nil
}

func (u *authUsecase) RequestPasswordReset(ctx context.Context, email string) (string, error) {
	user, err := u.userRepo.FindByEmail(ctx, email)
	if err != nil {
		// Don't leak whether the user exists. Return nil error but no OTP.
		slog.Info("Password reset requested for non-existent user", "email", email)
		return "", nil // Return success to the handler
	}

	otp, err := u.otpStore.GenerateAndStore(user.Email)
	if err != nil {
		return "", err
	}

	// In a real app, you would send the OTP via email here.
	// e.g., emailService.SendPasswordResetOTP(user.Email, otp)
	slog.Info("Generated OTP for user", "email", user.Email, "otp", otp)

	return otp, nil
}

func (u *authUsecase) ResetPassword(ctx context.Context, email, otp, newPassword string) error {
	if len(newPassword) < 8 {
		return fmt.Errorf("%w: password must be at least 8 characters", domain.ErrValidation)
	}

	user, err := u.userRepo.FindByEmail(ctx, email)
	if err != nil {
		return domain.ErrOTPInvalid // User not found, but return generic OTP error
	}

	if err := u.otpStore.Validate(email, otp); err != nil {
		return err
	}

	hashedPassword, err := u.hasher.Hash(newPassword)
	if err != nil {
		return err
	}
	
	user.PasswordHash = hashedPassword
	return u.userRepo.Update(ctx, user)
}
