package domain

import (
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
)

const (
	MaxGroupNameLength = 20
	MinGroupNameLength = 8
	MaxGroupSlugLength = 20
	MinGroupSlugLength = 8
	MaxGroupMembers    = 50
)

type Group struct {
	ID        uuid.UUID
	Name      string
	Slug      string
	OwnerID   uuid.UUID
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (g *Group) Validate() error {
	if utf8.RuneCountInString(g.Name) < MinGroupNameLength || utf8.RuneCountInString(g.Name) > MaxGroupNameLength {
		return ErrValidation
	}
	if utf8.RuneCountInString(g.Slug) < MinGroupSlugLength || utf8.RuneCountInString(g.Slug) > MaxGroupSlugLength {
		return ErrValidation
	}
	return nil
}
