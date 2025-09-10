package util

import (
	"context"
	// "chatterbox/internal/delivery/http/middleware"

	"github.com/google/uuid"
)

func GetUserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	// userID, ok := ctx.Value(middleware.UserIDKey).(uuid.UUID)
	return userID, ok
}
