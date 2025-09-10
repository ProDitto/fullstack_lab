package domain

import "errors"

var (
	ErrNotFound            = errors.New("requested item not found")
	ErrConflict            = errors.New("item already exists")
	ErrInvalidCredentials  = errors.New("invalid credentials")
	ErrUnauthorized        = errors.New("unauthorized")
	ErrForbidden           = errors.New("forbidden")
	ErrBadRequest          = errors.New("bad request")
	ErrValidation          = errors.New("validation failed")
	ErrTokenInvalid        = errors.New("token is invalid")
	ErrTokenExpired        = errors.New("token has expired")
	ErrInternalServer      = errors.New("internal server error")
	ErrUserAlreadyInGroup  = errors.New("user is already in the group")
	ErrUserNotInGroup      = errors.New("user is not in the group")
	ErrNotGroupOwner       = errors.New("only the group owner can perform this action")
	ErrGroupIsFull         = errors.New("group has reached its maximum capacity")
	ErrFriendRequestInvalid= errors.New("invalid friend request")
	ErrAlreadyFriends      = errors.New("users are already friends")
	ErrBlocked             = errors.New("action is blocked by user")
	ErrOTPInvalid          = errors.New("invalid or expired OTP")
	ErrRateLimitExceeded   = errors.New("rate limit exceeded")
)
