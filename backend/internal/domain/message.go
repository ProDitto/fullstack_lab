package domain

import (
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
)

const MaxMessageLength = 500

type MessageStatus string

const (
	MessageStatusSent      MessageStatus = "sent"
	MessageStatusDelivered MessageStatus = "delivered"
	MessageStatusSeen      MessageStatus = "seen"
)

type Message struct {
	ID          uuid.UUID
	SenderID    uuid.UUID
	RecipientID *uuid.UUID
	GroupID     *uuid.UUID
	Content     string
	Status      MessageStatus
	CreatedAt   time.Time
}

func (m *Message) Validate() error {
	if m.RecipientID == nil && m.GroupID == nil {
		return ErrValidation // Must have a recipient or a group
	}
	if m.RecipientID != nil && m.GroupID != nil {
		return ErrValidation // Cannot be both a direct message and a group message
	}
	if utf8.RuneCountInString(m.Content) > MaxMessageLength || utf8.RuneCountInString(m.Content) == 0 {
		return ErrValidation
	}
	return nil
}
