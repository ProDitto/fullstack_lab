package api

import (
	"time"

	"github.com/google/uuid"
)

// Auth DTOs
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	User         *UserDTO  `json:"user"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken"`
}

type RequestOTPRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	Email       string `json:"email"`
	OTP         string `json:"otp"`
	NewPassword string `json:"newPassword"`
}

// User DTOs
type UserDTO struct {
	ID                uuid.UUID `json:"id"`
	Email             string    `json:"email"`
	ProfilePictureURL *string   `json:"profilePictureUrl"`
}

type UpdateUserProfileRequest struct {
	Email *string `json:"email"`
}

// Group DTOs
type CreateGroupRequest struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type GroupDTO struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	OwnerID   uuid.UUID `json:"ownerId"`
	CreatedAt time.Time `json:"createdAt"`
}

type AddGroupMemberRequest struct {
	UserID uuid.UUID `json:"userId"`
}

// Friend DTOs
type SendFriendRequest struct {
	RecipientID uuid.UUID `json:"recipientId"`
}

type UpdateFriendRequest struct {
	Status string `json:"status"` // "accepted" or "rejected"
}

type BlockUserRequest struct {
	UserID uuid.UUID `json:"userId"`
}

// Message DTOs
type MessageDTO struct {
	ID          uuid.UUID  `json:"id"`
	SenderID    uuid.UUID  `json:"senderId"`
	RecipientID *uuid.UUID `json:"recipientId,omitempty"`
	GroupID     *uuid.UUID `json:"groupId,omitempty"`
	Content     string     `json:"content"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type PaginatedMessagesResponse struct {
	Messages   []MessageDTO `json:"messages"`
	NextCursor string        `json:"nextCursor"`
}

// Websocket Message DTOs
type WebsocketMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type NewMessagePayload struct {
	TempID      string     `json:"tempId"` // Temporary ID from client
	RecipientID *uuid.UUID `json:"recipientId,omitempty"`
	GroupID     *uuid.UUID `json:"groupId,omitempty"`
	Content     string     `json:"content"`
}

type MessageSentAckPayload struct {
	TempID    string    `json:"tempId"`
	MessageID uuid.UUID `json:"messageId"`
	CreatedAt time.Time `json:"createdAt"`
}

type AckPayload struct {
	MessageID uuid.UUID `json:"messageId"`
	Status    string    `json:"status"` // "delivered" or "seen"
	UserID    uuid.UUID `json:"userId"`
}
